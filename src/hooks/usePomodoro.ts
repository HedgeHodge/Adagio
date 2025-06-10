
"use client";

import type { PomodoroSettings, PomodoroLogEntry, IntervalType, TimeFilter, ChartDataPoint, ActivePomodoroSession } from '@/types/pomodoro';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { getMotivationalQuote, type MotivationalQuoteOutput } from '@/ai/flows/motivational-quote-flow';
import { isToday, isWithinInterval, startOfWeek, endOfWeek, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp, deleteField } from 'firebase/firestore';

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  pomodorosPerSet: 4,
};

const LOCAL_SETTINGS_KEY = 'pomodoroSettings_v2';
const LOCAL_LOG_KEY = 'pomodoroLog_v2';
const LOCAL_ACTIVE_SESSIONS_KEY = 'pomodoroActiveSessions_v2';
const LOCAL_RECENT_PROJECTS_KEY = 'recentProjects_v2';

const MAX_RECENT_PROJECTS = 5;
const ACTIVE_SESSIONS_FIRESTORE_DEBOUNCE_MS = 2500;

interface UserPomodoroData {
  settings?: PomodoroSettings;
  pomodoroLog?: PomodoroLogEntry[];
  activeSessions?: ActivePomodoroSession[];
  recentProjects?: string[];
  lastUpdated?: Timestamp;
}

function parseJSONWithDefault<T>(jsonString: string | null, defaultValue: T): T {
  if (jsonString === null) return defaultValue;
  try {
    const parsed = JSON.parse(jsonString);
    return parsed === null && defaultValue !== null ? defaultValue : parsed;
  } catch (e) {
    console.warn("Failed to parse JSON from localStorage, using default value:", e);
    return defaultValue;
  }
}

const cleanLogEntry = (entry: any): PomodoroLogEntry => {
  const cleanedEntry = { ...entry };
  if (cleanedEntry.project === undefined || cleanedEntry.project === null || (typeof cleanedEntry.project === 'string' && cleanedEntry.project.trim() === '')) {
    delete cleanedEntry.project;
  }
  return cleanedEntry as PomodoroLogEntry;
};

const cleanActiveSession = (session: any): ActivePomodoroSession => {
    const cleanedSession = { ...session };
    cleanedSession.id = cleanedSession.id ?? Date.now().toString();
    cleanedSession.project = cleanedSession.project ?? 'Untitled Session';
    cleanedSession.currentTime = cleanedSession.currentTime ?? 0;
    cleanedSession.isRunning = cleanedSession.isRunning ?? false;
    cleanedSession.currentInterval = cleanedSession.currentInterval ?? 'work';
    cleanedSession.pomodorosCompletedThisSet = cleanedSession.pomodorosCompletedThisSet ?? 0;
    cleanedSession.lastWorkSessionStartTime = cleanedSession.lastWorkSessionStartTime ?? null;
    return cleanedSession as ActivePomodoroSession;
};


export function usePomodoro() {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [activeSessions, setActiveSessions] = useState<ActivePomodoroSession[]>([]);
  const [pomodoroLog, setPomodoroLog] = useState<PomodoroLogEntry[]>([]);
  const [recentProjects, setRecentProjects] = useState<string[]>([]);
  const [motivationalQuote, setMotivationalQuote] = useState<MotivationalQuoteOutput | null>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('today');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<PomodoroLogEntry | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [inputProjectName, setInputProjectName] = useState('');

  const timerRefs = useRef<Record<string, NodeJS.Timeout | null>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notificationSentRefs = useRef<Record<string, Record<IntervalType, boolean>>>({});
  const { toast } = useToast();
  
  const debouncedSaveActiveSessionsRef = useRef<NodeJS.Timeout | null>(null);


  const formatTime = useCallback((timeInSeconds: number): string => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    let formatted = '';
    if (hours > 0) formatted += `${hours.toString().padStart(2, '0')}:`;
    formatted += `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return formatted;
  }, []);

  const saveDataToFirestore = useCallback(async (userId: string, data: Partial<UserPomodoroData>) => {
    if (!userId) return;
    try {
      const userDocRef = doc(db, 'users', userId);
      
      const firestorePayload: { [key: string]: any } = { ...data, lastUpdated: Timestamp.now() };

      Object.keys(firestorePayload).forEach(key => {
        if (firestorePayload[key] === undefined) {
          firestorePayload[key] = deleteField();
        }
      });
      
      if (firestorePayload.pomodoroLog && Array.isArray(firestorePayload.pomodoroLog)) {
        firestorePayload.pomodoroLog = firestorePayload.pomodoroLog.map(entry => {
            const cleaned = cleanLogEntry(entry);
            if (Object.keys(cleaned).length === 0) return deleteField(); // Should not happen with ID
            return cleaned;
        }).filter(entry => entry !== undefined); // Filter out any deleted fields if necessary
      }

      if (firestorePayload.activeSessions && Array.isArray(firestorePayload.activeSessions)) {
        firestorePayload.activeSessions = firestorePayload.activeSessions.map(session => {
            const cleaned = cleanActiveSession(session);
             if (Object.keys(cleaned).length === 0) return deleteField(); // Should not happen
            return cleaned;
        }).filter(session => session !== undefined);
      }
      
      await setDoc(userDocRef, firestorePayload, { merge: true });
    } catch (error) {
      console.error("Error saving data to Firestore:", error);
      if (!(data.activeSessions && Object.keys(data).length === 1)) { // Avoid toast for frequent activeSessions saving errors
        // toast({ title: "Sync Error", description: "Could not save data to cloud.", variant: "destructive" });
      }
    }
  }, [toast]);


  const loadDataFromLocalStorage = useCallback(() => {
    const localSettings = parseJSONWithDefault(localStorage.getItem(LOCAL_SETTINGS_KEY), DEFAULT_SETTINGS);
    const localLog = parseJSONWithDefault(localStorage.getItem(LOCAL_LOG_KEY), []).map(cleanLogEntry);
    const localActiveSessions = parseJSONWithDefault(localStorage.getItem(LOCAL_ACTIVE_SESSIONS_KEY), []).map(cleanActiveSession);
    const localRecentProjects = parseJSONWithDefault(localStorage.getItem(LOCAL_RECENT_PROJECTS_KEY), []);
    
    return { settings: localSettings, pomodoroLog: localLog, activeSessions: localActiveSessions, recentProjects: localRecentProjects };
  }, []);


  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') audioRef.current = new Audio('/sounds/notification.mp3');
  }, []);

  useEffect(() => {
    if (!isClient) return;
    setIsDataLoading(true);
    const loadData = async () => {
      const localData = loadDataFromLocalStorage();
      setSettings(localData.settings);
      setPomodoroLog(localData.pomodoroLog);
      setActiveSessions(localData.activeSessions);
      setRecentProjects(localData.recentProjects);

      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const cloudData = docSnap.data() as UserPomodoroData;
            const cloudLastUpdated = cloudData.lastUpdated?.toMillis();
            
            // Check if local data might be newer (e.g., offline changes)
            // This simple check assumes local saves update a similar timestamp, which we don't have.
            // For now, prioritize cloud if it exists, or merge carefully.
            // A more sophisticated merge would compare timestamps or use a local "dirty" flag.

            setSettings(cloudData.settings || localData.settings);
            setPomodoroLog((cloudData.pomodoroLog || localData.pomodoroLog).map(cleanLogEntry));
            setActiveSessions((cloudData.activeSessions || localData.activeSessions).map(cleanActiveSession));
            setRecentProjects(cloudData.recentProjects || localData.recentProjects);
            
            // Sync merged/cloud data back to local storage
            localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(cloudData.settings || localData.settings));
            localStorage.setItem(LOCAL_LOG_KEY, JSON.stringify((cloudData.pomodoroLog || localData.pomodoroLog).map(cleanLogEntry)));
            localStorage.setItem(LOCAL_ACTIVE_SESSIONS_KEY, JSON.stringify((cloudData.activeSessions || localData.activeSessions).map(cleanActiveSession)));
            localStorage.setItem(LOCAL_RECENT_PROJECTS_KEY, JSON.stringify(cloudData.recentProjects || localData.recentProjects));

          } else {
            // New user in Firestore, save whatever is local (or default)
            await saveDataToFirestore(currentUser.uid, {
                settings: localData.settings,
                pomodoroLog: localData.pomodoroLog,
                activeSessions: localData.activeSessions,
                recentProjects: localData.recentProjects,
            });
          }
        } catch (error) {
          console.error("Error loading/syncing data with Firestore:", error);
          // toast({ title: "Sync Error", description: "Could not sync with cloud. Using local data.", variant: "destructive" });
          // Already loaded local data, so we are good.
        }
      }
      setIsDataLoading(false);
    };
    loadData();
  }, [currentUser, isClient, loadDataFromLocalStorage, saveDataToFirestore, toast]);


  useEffect(() => {
    if (isClient && !isDataLoading && settings !== DEFAULT_SETTINGS) { // Avoid saving defaults if nothing changed
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
      if (currentUser) saveDataToFirestore(currentUser.uid, { settings });
    }
  }, [settings, isClient, currentUser, saveDataToFirestore, isDataLoading]);

  useEffect(() => {
    if (isClient && !isDataLoading) {
      localStorage.setItem(LOCAL_LOG_KEY, JSON.stringify(pomodoroLog.map(cleanLogEntry)));
      if (currentUser) saveDataToFirestore(currentUser.uid, { pomodoroLog: pomodoroLog.map(cleanLogEntry) });
    }
  }, [pomodoroLog, isClient, currentUser, saveDataToFirestore, isDataLoading]);
  
  useEffect(() => {
    if (isClient && !isDataLoading) {
      localStorage.setItem(LOCAL_RECENT_PROJECTS_KEY, JSON.stringify(recentProjects));
      if (currentUser) saveDataToFirestore(currentUser.uid, { recentProjects });
    }
  }, [recentProjects, isClient, currentUser, saveDataToFirestore, isDataLoading]);

  const persistActiveSessionsToFirestore = useCallback((userId: string, sessions: ActivePomodoroSession[]) => {
    if (debouncedSaveActiveSessionsRef.current) {
      clearTimeout(debouncedSaveActiveSessionsRef.current);
    }
    debouncedSaveActiveSessionsRef.current = setTimeout(() => {
      saveDataToFirestore(userId, { activeSessions: sessions.map(cleanActiveSession) });
    }, ACTIVE_SESSIONS_FIRESTORE_DEBOUNCE_MS);
  }, [saveDataToFirestore]);

  useEffect(() => {
    if (isClient && !isDataLoading) {
      localStorage.setItem(LOCAL_ACTIVE_SESSIONS_KEY, JSON.stringify(activeSessions.map(cleanActiveSession)));
      if (currentUser) {
        persistActiveSessionsToFirestore(currentUser.uid, activeSessions);
      }
    }
  }, [activeSessions, isClient, currentUser, persistActiveSessionsToFirestore, isDataLoading]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (debouncedSaveActiveSessionsRef.current) {
        clearTimeout(debouncedSaveActiveSessionsRef.current); 
      }
      if (isClient && !isDataLoading && currentUser) {
        const sessionsJSON = localStorage.getItem(LOCAL_ACTIVE_SESSIONS_KEY);
        const sessionsToSave = parseJSONWithDefault(sessionsJSON, []).map(cleanActiveSession);
        if (sessionsToSave.length > 0) {
          saveDataToFirestore(currentUser.uid, { activeSessions: sessionsToSave });
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (debouncedSaveActiveSessionsRef.current) {
        clearTimeout(debouncedSaveActiveSessionsRef.current);
      }
    };
  }, [isClient, isDataLoading, currentUser, saveDataToFirestore]);

  const playNotificationSound = useCallback(() => {
    audioRef.current?.play().catch(error => console.warn("Audio play failed:", error));
  }, []);

  const fetchAndSetQuote = useCallback(async () => {
    if (isFetchingQuote) return;
    setIsFetchingQuote(true);
    setMotivationalQuote(null);
    try {
      const result = await getMotivationalQuote();
      setMotivationalQuote(result);
    } catch (error) {
      console.error("Failed to fetch motivational quote:", error);
      setMotivationalQuote({ quote: "Keep up the great work!", source: "Adagio App" });
    } finally {
      setIsFetchingQuote(false);
    }
  }, [isFetchingQuote]);

  const updateRecentProjects = useCallback((projectName?: string) => {
    if (!projectName || projectName.trim() === "") return;
    setRecentProjects(prevRecent => {
      const trimmedProjectName = projectName.trim();
      const filtered = prevRecent.filter(p => p !== trimmedProjectName);
      return [trimmedProjectName, ...filtered].slice(0, MAX_RECENT_PROJECTS);
    });
  }, []);

  useEffect(() => {
    activeSessions.forEach(session => {
      if (session.isRunning) {
        if (!timerRefs.current[session.id]) {
          timerRefs.current[session.id] = setInterval(() => {
            setActiveSessions(prevSessions =>
              prevSessions.map(s => {
                if (s.id === session.id && s.isRunning) {
                  const newTime = s.currentTime + 1;
                  if (!notificationSentRefs.current[s.id]) notificationSentRefs.current[s.id] = { work: false, shortBreak: false, longBreak: false };
                  
                  if (s.currentInterval === 'work' && !notificationSentRefs.current[s.id].work && newTime >= settings.workDuration * 60) {
                    toast({ title: `Focus: ${s.project}`, description: `Consider a break. ${settings.workDuration} min done.` });
                    playNotificationSound();
                    notificationSentRefs.current[s.id].work = true;
                  } else if (s.currentInterval === 'shortBreak' && !notificationSentRefs.current[s.id].shortBreak && newTime >= settings.shortBreakDuration * 60) {
                    toast({ title: `Break Over: ${s.project}`, description: `Your ${settings.shortBreakDuration}-min break is up.` });
                    playNotificationSound();
                    notificationSentRefs.current[s.id].shortBreak = true;
                  } else if (s.currentInterval === 'longBreak' && !notificationSentRefs.current[s.id].longBreak && newTime >= settings.longBreakDuration * 60) {
                    toast({ title: `Break Over: ${s.project}`, description: `Your ${settings.longBreakDuration}-min break is up.` });
                    playNotificationSound();
                    notificationSentRefs.current[s.id].longBreak = true;
                  }
                  return { ...s, currentTime: newTime };
                }
                return s;
              })
            );
          }, 1000);
        }
      } else {
        if (timerRefs.current[session.id]) {
          clearInterval(timerRefs.current[session.id]!);
          timerRefs.current[session.id] = null;
        }
      }
    });

    return () => {
      Object.values(timerRefs.current).forEach(timerId => {
        if (timerId) clearInterval(timerId);
      });
      timerRefs.current = {}; 
    };
  }, [activeSessions, settings, toast, playNotificationSound, formatTime]);

  const addSession = useCallback((projectName: string) => {
    const trimmedProjectName = projectName.trim();
    if (!trimmedProjectName) {
      toast({ title: "Project name cannot be empty", variant: "destructive" });
      return;
    }
    const newSession: ActivePomodoroSession = cleanActiveSession({
      id: Date.now().toString(),
      project: trimmedProjectName,
    });
    setActiveSessions(prev => [...prev, newSession]);
    updateRecentProjects(trimmedProjectName);
    setInputProjectName(''); 
    if (!notificationSentRefs.current[newSession.id]) {
        notificationSentRefs.current[newSession.id] = { work: false, shortBreak: false, longBreak: false };
    }
  }, [toast, updateRecentProjects]);

  const startTimer = useCallback((sessionId: string) => {
    setActiveSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        let { lastWorkSessionStartTime } = s;
        if (s.currentInterval === 'work' && s.currentTime === 0 && lastWorkSessionStartTime === null) {
          lastWorkSessionStartTime = Date.now();
        } else if (s.currentInterval === 'work' && lastWorkSessionStartTime === null) {
          lastWorkSessionStartTime = Date.now() - s.currentTime * 1000;
        }
        return { ...s, isRunning: true, lastWorkSessionStartTime };
      }
      return s;
    }));
  }, []);

  const pauseTimer = useCallback((sessionId: string) => {
    setActiveSessions(prev => prev.map(s => s.id === sessionId ? { ...s, isRunning: false } : s));
  }, []);

  const resetTimer = useCallback((sessionId: string) => {
    setActiveSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        if (notificationSentRefs.current[s.id]) {
           notificationSentRefs.current[s.id] = { work: false, shortBreak: false, longBreak: false };
        }
        return { ...s, isRunning: false, currentTime: 0, lastWorkSessionStartTime: s.currentInterval === 'work' ? null : s.lastWorkSessionStartTime };
      }
      return s;
    }));
  }, []);
  
  const logWorkEntry = useCallback((session: ActivePomodoroSession, isEndingSession: boolean = false) => {
    const now = Date.now();
    if (session.currentInterval === 'work' && session.lastWorkSessionStartTime && session.currentTime > 0) {
      const newLogEntry: PomodoroLogEntry = {
        id: `${now}-${session.id}`,
        startTime: new Date(session.lastWorkSessionStartTime).toISOString(),
        endTime: new Date(now).toISOString(),
        type: 'work',
        duration: Math.round(session.currentTime / 60), 
        project: session.project,
        sessionId: session.id,
      };
      
      const cleanedNewLogEntry = cleanLogEntry(newLogEntry);
      setPomodoroLog(prevLog => [cleanedNewLogEntry, ...prevLog]);

      if (!isEndingSession) { 
          toast({ title: "Work entry logged!", description: `${session.project}: ${formatTime(session.currentTime)}` });
      }
      updateRecentProjects(session.project);
      return cleanedNewLogEntry;
    }
    return null;
  }, [toast, updateRecentProjects, formatTime, setPomodoroLog]);

  const removeSession = useCallback((sessionId: string) => {
    const sessionToRemove = activeSessions.find(s => s.id === sessionId);
    if (sessionToRemove && sessionToRemove.currentInterval === 'work' && sessionToRemove.isRunning && sessionToRemove.lastWorkSessionStartTime && sessionToRemove.currentTime > 0) {
        logWorkEntry(sessionToRemove, true); 
    }

    setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    if (timerRefs.current[sessionId]) {
      clearInterval(timerRefs.current[sessionId]!);
      delete timerRefs.current[sessionId];
    }
    if (notificationSentRefs.current[sessionId]) {
        delete notificationSentRefs.current[sessionId];
    }
    toast({title: `Session "${sessionToRemove?.project}" removed`});
  }, [activeSessions, toast, logWorkEntry]);

  const switchMode = useCallback((sessionId: string) => {
    setActiveSessions(prevSessions => prevSessions.map(s => {
      if (s.id === sessionId) {
        const updatedSession = { ...s, isRunning: false };
        let nextInterval: IntervalType;
        let newCompletedPomodoros = updatedSession.pomodorosCompletedThisSet;

        if (updatedSession.currentInterval === 'work') {
          logWorkEntry(updatedSession); // isEndingSession defaults to false, so toast will show
          newCompletedPomodoros++;
          nextInterval = (newCompletedPomodoros % settings.pomodorosPerSet === 0) ? 'longBreak' : 'shortBreak';
          if (!motivationalQuote && !isFetchingQuote) fetchAndSetQuote(); 
        } else {
          nextInterval = 'work';
          if (updatedSession.currentInterval === 'longBreak') newCompletedPomodoros = 0;
        }
        
        if (notificationSentRefs.current[updatedSession.id]) {
           notificationSentRefs.current[updatedSession.id] = { work: false, shortBreak: false, longBreak: false };
        }

        return {
          ...updatedSession,
          currentInterval: nextInterval,
          pomodorosCompletedThisSet: newCompletedPomodoros,
          currentTime: 0,
          lastWorkSessionStartTime: nextInterval === 'work' ? Date.now() : null,
        };
      }
      return s;
    }));
  }, [logWorkEntry, settings.pomodorosPerSet, motivationalQuote, isFetchingQuote, fetchAndSetQuote]);

  const endCurrentWorkSession = useCallback((sessionId: string) => {
    setActiveSessions(prevSessions => prevSessions.map(s => {
      if (s.id === sessionId && s.currentInterval === 'work' && s.isRunning) {
        logWorkEntry(s, true); // Pass true to suppress toast for this specific log action
         if (notificationSentRefs.current[s.id]) {
           notificationSentRefs.current[s.id].work = false; // Reset notification flag
        }
        return { ...s, isRunning: false, currentTime: 0, lastWorkSessionStartTime: null };
      }
      return s;
    }));
  }, [logWorkEntry]);


  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const deleteLogEntry = useCallback((id: string) => {
    setPomodoroLog(prevLog => prevLog.filter(entry => entry.id !== id));
    toast({ title: "Entry deleted", variant: "destructive" });
  }, [toast, setPomodoroLog]);

  const openEditModal = useCallback((entry: PomodoroLogEntry) => {
    setEntryToEdit(cleanLogEntry(entry));
    setIsEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEntryToEdit(null);
  }, []);

  const updateLogEntry = useCallback((updatedEntryData: PomodoroLogEntry) => {
    const cleanedUpdatedEntry = cleanLogEntry(updatedEntryData);
    setPomodoroLog(prevLog => prevLog.map(entry => entry.id === cleanedUpdatedEntry.id ? cleanedUpdatedEntry : entry));
    if (cleanedUpdatedEntry.project) updateRecentProjects(cleanedUpdatedEntry.project);
    toast({ title: "Entry updated successfully!" });
    closeEditModal();
  }, [toast, closeEditModal, updateRecentProjects, setPomodoroLog]);

  const processedChartData = useMemo((): ChartDataPoint[] => {
    if (!isClient) return [];
    const now = new Date();
    let filteredLog: PomodoroLogEntry[];
    switch (activeFilter) {
      case 'today': filteredLog = pomodoroLog.filter(entry => isToday(parseISO(entry.endTime))); break;
      case 'thisWeek': filteredLog = pomodoroLog.filter(entry => isWithinInterval(parseISO(entry.endTime), { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) })); break;
      case 'thisMonth': filteredLog = pomodoroLog.filter(entry => isWithinInterval(parseISO(entry.endTime), { start: startOfMonth(now), end: endOfMonth(now) })); break;
      default: filteredLog = pomodoroLog;
    }
    const aggregation: Record<string, number> = {};
    filteredLog.forEach(entry => {
      const projectName = entry.project || 'No Project';
      aggregation[projectName] = (aggregation[projectName] || 0) + entry.duration;
    });
    return Object.entries(aggregation).map(([name, totalMinutes]) => ({ name, totalMinutes })).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [pomodoroLog, activeFilter, isClient]);

  const createTestDataEntry = (idSuffix: string, baseTime: Date, daysAgo: number, hour: number, minute: number, durationMinutes: number, project?: string, sessionId?:string): PomodoroLogEntry => {
    const startTime = new Date(baseTime);
    startTime.setDate(baseTime.getDate() - daysAgo);
    startTime.setHours(hour, minute, 0, 0);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
    
    const entry: PomodoroLogEntry = { 
        id: `${startTime.getTime()}-${idSuffix}`, 
        startTime: startTime.toISOString(), 
        endTime: endTime.toISOString(), 
        type: 'work', 
        duration: durationMinutes,
        sessionId: sessionId || `test-session-${idSuffix}`
    };
    if (project && project.trim() !== "") {
        entry.project = project.trim();
    }
    return cleanLogEntry(entry);
  };

  const populateTestData = useCallback(() => {
    const now = new Date();
    const testData: PomodoroLogEntry[] = [
      createTestDataEntry('td1', now, 0, 9, 0, 25, 'Project Phoenix', 'session1'), createTestDataEntry('td2', now, 0, 10, 30, 50, 'Project Phoenix', 'session1'), createTestDataEntry('td3', now, 0, 14, 0, 45, undefined, 'session2'), 
      createTestDataEntry('yd1', now, 1, 11, 0, 60, 'Project Chimera', 'session3'), createTestDataEntry('yd2', now, 1, 15, 0, 30, 'Project Phoenix', 'session1'),
      createTestDataEntry('tw1', now, 3, 10, 0, 90, 'Adagio App Dev', 'session4'), createTestDataEntry('tw2', now, 4, 16, 0, 55, 'Client Meeting Prep', 'session5'),
      createTestDataEntry('lw1', now, 8, 9, 30, 120, 'Project Chimera', 'session3'), createTestDataEntry('lw2', now, 10, 14,0, 40, 'Research', 'session6'),
      createTestDataEntry('tm1', now, 15, 13, 0, 75, 'Project Phoenix', 'session1'), createTestDataEntry('tm2', now, 20, 10, 0, 60, 'Adagio App Dev', 'session4'),
      createTestDataEntry('tm3', now, 2, 11, 15, 35, 'Quick Sync', 'session7'), createTestDataEntry('tm4', now, 5, 17, 0, 70, 'Content Creation', 'session8'), createTestDataEntry('tm5', now, 6, 12, 30, 20, 'Bug Fixing', 'session9'),
    ];
    const validTestData = testData.filter(entry => parseISO(entry.endTime) <= now);
    let newLog = [...pomodoroLog];
    let projectsToUpdateToRecent: string[] = [];
    validTestData.forEach(tdEntry => {
      if(!newLog.find(entry => entry.id === tdEntry.id)){
        newLog.unshift(tdEntry);
        if(tdEntry.project) projectsToUpdateToRecent.push(tdEntry.project);
      }
    });
    setPomodoroLog(newLog);
    if (projectsToUpdateToRecent.length > 0) {
      const uniqueNewProjects = [...new Set(projectsToUpdateToRecent)];
      setRecentProjects(prevRecent => {
        const filteredOldRecent = prevRecent.filter(p => !uniqueNewProjects.includes(p));
        return [...uniqueNewProjects, ...filteredOldRecent].slice(0, MAX_RECENT_PROJECTS);
      });
    }
    toast({ title: "Test Data Added", description: `${validTestData.length} sample entries have been added/updated.` });
  }, [toast, pomodoroLog, setPomodoroLog, setRecentProjects]);


  return {
    settings, updateSettings, activeSessions, pomodoroLog,
    addSession, removeSession, 
    startTimer, pauseTimer, resetTimer, switchMode, endCurrentWorkSession, 
    deleteLogEntry, formatTime,
    isClient, recentProjects, motivationalQuote, isFetchingQuote,
    activeFilter, setActiveFilter, processedChartData, isEditModalOpen, entryToEdit, openEditModal,
    closeEditModal, updateLogEntry, populateTestData, isDataLoading,
    inputProjectName, setInputProjectName, 
    updateRecentProjects, 
  };
}

