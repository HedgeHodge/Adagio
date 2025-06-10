
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

      // Ensure no undefined top-level fields are sent
      Object.keys(firestorePayload).forEach(key => {
        if (firestorePayload[key] === undefined) {
          firestorePayload[key] = deleteField(); // Or simply delete firestorePayload[key];
        }
      });
      
      if (firestorePayload.pomodoroLog && Array.isArray(firestorePayload.pomodoroLog)) {
        firestorePayload.pomodoroLog = firestorePayload.pomodoroLog.map(entry => {
            const cleaned = cleanLogEntry(entry); // cleanLogEntry already handles empty/undefined project
            // If cleanLogEntry could somehow return an empty object (it shouldn't if ID is always present),
            // you might add: if (Object.keys(cleaned).length === 0) return deleteField();
            return cleaned;
        }).filter(entry => entry !== undefined); 
      }

      if (firestorePayload.activeSessions && Array.isArray(firestorePayload.activeSessions)) {
        firestorePayload.activeSessions = firestorePayload.activeSessions.map(session => {
            const cleaned = cleanActiveSession(session);
            return cleaned;
        }).filter(session => session !== undefined);
      }
      
      await setDoc(userDocRef, firestorePayload, { merge: true });
    } catch (error) {
      console.error("Error saving data to Firestore:", error);
      // Avoid toast for frequent activeSessions saving errors unless it's a broader save operation
      const isOnlyActiveSessions = Object.keys(data).length === 1 && data.activeSessions !== undefined;
      if (!isOnlyActiveSessions) {
         // toast({ title: "Sync Error", description: "Could not save some data to cloud.", variant: "destructive" });
      }
    }
  }, []);


  const loadDataFromLocalStorage = useCallback(() => {
    const localSettings = parseJSONWithDefault(localStorage.getItem(LOCAL_SETTINGS_KEY), DEFAULT_SETTINGS);
    const localLog = parseJSONWithDefault(localStorage.getItem(LOCAL_LOG_KEY), []).map(cleanLogEntry);
    const localActiveSessions = parseJSONWithDefault(localStorage.getItem(LOCAL_ACTIVE_SESSIONS_KEY), []).map(cleanActiveSession);
    const localRecentProjects = parseJSONWithDefault(localStorage.getItem(LOCAL_RECENT_PROJECTS_KEY), []);
    
    return { settings: localSettings, pomodoroLog: localLog, activeSessions: localActiveSessions, recentProjects: localRecentProjects };
  }, []);


  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const audioPath = '/sounds/notification.mp3';
      audioRef.current = new Audio(audioPath);
      // Preload to check if file exists (optional, might cause console error if 404 that you might want to handle)
      // fetch(audioPath).then(response => { if(!response.ok) console.warn(`Audio file not found: ${audioPath}`)})
    }
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
            
            const effectiveSettings = cloudData.settings || localData.settings;
            const effectiveLog = (cloudData.pomodoroLog || localData.pomodoroLog).map(cleanLogEntry);
            const effectiveActiveSessions = (cloudData.activeSessions || localData.activeSessions).map(cleanActiveSession);
            const effectiveRecentProjects = cloudData.recentProjects || localData.recentProjects;

            setSettings(effectiveSettings);
            setPomodoroLog(effectiveLog);
            setActiveSessions(effectiveActiveSessions);
            setRecentProjects(effectiveRecentProjects);
            
            localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(effectiveSettings));
            localStorage.setItem(LOCAL_LOG_KEY, JSON.stringify(effectiveLog));
            localStorage.setItem(LOCAL_ACTIVE_SESSIONS_KEY, JSON.stringify(effectiveActiveSessions));
            localStorage.setItem(LOCAL_RECENT_PROJECTS_KEY, JSON.stringify(effectiveRecentProjects));

          } else {
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
        }
      }
      setIsDataLoading(false);
    };
    loadData();
  }, [currentUser, isClient, loadDataFromLocalStorage, saveDataToFirestore]);


  useEffect(() => {
    if (isClient && !isDataLoading && settings !== DEFAULT_SETTINGS) { 
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessions, isClient, currentUser, persistActiveSessionsToFirestore, isDataLoading]); // persistActiveSessionsToFirestore doesn't need to be in deps as it's stable

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (debouncedSaveActiveSessionsRef.current) {
        clearTimeout(debouncedSaveActiveSessionsRef.current); 
      }
      if (isClient && !isDataLoading && currentUser) {
        // activeSessions state might not be the absolute latest here,
        // so we grab directly from localStorage which is updated more frequently
        const sessionsJSON = localStorage.getItem(LOCAL_ACTIVE_SESSIONS_KEY);
        const sessionsToSave = parseJSONWithDefault(sessionsJSON, []).map(cleanActiveSession);
        if (sessionsToSave.length > 0) { // Only save if there's something to save
            // Note: navigator.sendBeacon is preferred for reliability in beforeunload,
            // but Firestore SDK doesn't use it directly. This is a best-effort save.
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
  }, [activeSessions, settings, toast, playNotificationSound]); // formatTime was removed as it's not directly used here

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
        // Only set/update lastWorkSessionStartTime if it's a work interval
        if (s.currentInterval === 'work') {
          if (s.currentTime === 0 && (lastWorkSessionStartTime === null || s.isRunning === false)) { // Starting fresh or from paused at 0
            lastWorkSessionStartTime = Date.now();
          } else if (lastWorkSessionStartTime === null && s.isRunning === false) { // Resuming a paused work session that wasn't at 0
            lastWorkSessionStartTime = Date.now() - s.currentTime * 1000;
          }
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
        // Only reset lastWorkSessionStartTime if the current interval is 'work'
        const newLastWorkSessionStartTime = s.currentInterval === 'work' ? null : s.lastWorkSessionStartTime;
        return { ...s, isRunning: false, currentTime: 0, lastWorkSessionStartTime: newLastWorkSessionStartTime };
      }
      return s;
    }));
  }, []);
  
  const logWorkEntry = useCallback((session: ActivePomodoroSession, isEndingSession: boolean = false) => {
    const now = Date.now();
    if (session.currentInterval === 'work' && session.lastWorkSessionStartTime && session.currentTime > 0) {
      const newLogEntry: PomodoroLogEntry = {
        id: `${now}-${session.id}-${Math.random().toString(36).substring(2, 7)}`, // Added random suffix
        startTime: new Date(session.lastWorkSessionStartTime).toISOString(),
        endTime: new Date(now).toISOString(),
        type: 'work',
        duration: Math.round(session.currentTime / 60), 
        project: session.project, // Project will be cleaned by cleanLogEntry
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
    setActiveSessions(prevActiveSessions => {
        const sessionToRemove = prevActiveSessions.find(s => s.id === sessionId);
        if (sessionToRemove && sessionToRemove.currentInterval === 'work' && sessionToRemove.isRunning && sessionToRemove.lastWorkSessionStartTime && sessionToRemove.currentTime > 0) {
            logWorkEntry(sessionToRemove, true); 
        }
        return prevActiveSessions.filter(s => s.id !== sessionId);
    });
    
    if (timerRefs.current[sessionId]) {
      clearInterval(timerRefs.current[sessionId]!);
      delete timerRefs.current[sessionId];
    }
    if (notificationSentRefs.current[sessionId]) {
        delete notificationSentRefs.current[sessionId];
    }
    // Accessing the session project name for the toast might be tricky if it's already removed from state
    // Consider finding it from `activeSessions` *before* filtering, or pass project name if needed.
    // For simplicity, using a generic message or finding it before the update.
    const removedSession = activeSessions.find(s => s.id === sessionId); // Find before update
    toast({title: `Session "${removedSession?.project || 'Unknown'}" removed`});
  }, [activeSessions, toast, logWorkEntry]); // activeSessions is a dependency here for finding project name for toast

  const switchMode = useCallback((sessionId: string) => {
    setActiveSessions(prevSessions => prevSessions.map(s => {
      if (s.id === sessionId) {
        const updatedSession = { ...s, isRunning: false }; // Pause before switching
        let nextInterval: IntervalType;
        let newCompletedPomodoros = updatedSession.pomodorosCompletedThisSet;

        if (updatedSession.currentInterval === 'work') {
          logWorkEntry(updatedSession); 
          newCompletedPomodoros++;
          nextInterval = (newCompletedPomodoros % settings.pomodorosPerSet === 0) ? 'longBreak' : 'shortBreak';
          if (!motivationalQuote && !isFetchingQuote) fetchAndSetQuote(); 
        } else { // Switching from a break to work
          nextInterval = 'work';
          if (updatedSession.currentInterval === 'longBreak') newCompletedPomodoros = 0; // Reset count after long break
        }
        
        if (notificationSentRefs.current[updatedSession.id]) {
           notificationSentRefs.current[updatedSession.id] = { work: false, shortBreak: false, longBreak: false };
        }

        return {
          ...updatedSession,
          currentInterval: nextInterval,
          pomodorosCompletedThisSet: newCompletedPomodoros,
          currentTime: 0,
          // Set lastWorkSessionStartTime to now if switching TO work, otherwise keep it (or null it if coming from work)
          lastWorkSessionStartTime: nextInterval === 'work' ? Date.now() : null, 
        };
      }
      return s;
    }));
  }, [logWorkEntry, settings.pomodorosPerSet, motivationalQuote, isFetchingQuote, fetchAndSetQuote]);

  const endCurrentWorkSession = useCallback((sessionId: string) => {
    setActiveSessions(prevSessions => prevSessions.map(s => {
      if (s.id === sessionId && s.currentInterval === 'work' && s.isRunning) {
        logWorkEntry(s, true); 
         if (notificationSentRefs.current[s.id]) {
           notificationSentRefs.current[s.id].work = false;
        }
        return { ...s, isRunning: false, currentTime: 0, lastWorkSessionStartTime: null }; // Ensure LWSST is nulled
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
        id: `${startTime.getTime()}-${idSuffix}-${Math.random().toString(36).substring(2, 7)}`, 
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
      if(!newLog.find(entry => entry.id === tdEntry.id)){ // Still check by ID if you want to avoid exact duplicates
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

