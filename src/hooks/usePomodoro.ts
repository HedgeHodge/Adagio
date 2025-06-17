
"use client";

import type { PomodoroSettings, PomodoroLogEntry, IntervalType, TimeFilter, ChartDataPoint, ActivePomodoroSession, UserPomodoroData } from '@/types/pomodoro';
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
    cleanedSession.shouldLogWork = cleanedSession.shouldLogWork ?? false;
    return cleanedSession as ActivePomodoroSession;
};


export function usePomodoro() {
  const { currentUser, isPremium } = useAuth();
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
        firestorePayload.pomodoroLog = firestorePayload.pomodoroLog.map(entry => cleanLogEntry(entry)).filter(entry => entry !== undefined);
      }

      if (firestorePayload.activeSessions && Array.isArray(firestorePayload.activeSessions)) {
        firestorePayload.activeSessions = firestorePayload.activeSessions.map(session => cleanActiveSession(session)).filter(session => session !== undefined);
      }

      await setDoc(userDocRef, firestorePayload, { merge: true });
    } catch (error) {
      console.error("Error saving data to Firestore:", error);
      // const isOnlyActiveSessions = Object.keys(data).length === 1 && data.activeSessions !== undefined;
      // if (!isOnlyActiveSessions) {
      //    toast({ title: "Sync Error", description: "Could not save some data to cloud.", variant: "destructive" });
      // }
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
      try {
        audioRef.current.load();
      } catch (e) {
        console.warn("Audio preloading may not be supported or failed.", e);
      }
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
                isPremium: isPremium
            });
          }
        } catch (error) {
          console.error("Error loading/syncing data with Firestore:", error);
        }
      }
      setIsDataLoading(false);
    };
    loadData();
  }, [currentUser, isClient, loadDataFromLocalStorage, saveDataToFirestore, isPremium]);


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
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => console.warn("Audio play failed:", error));
    }
  }, []);

  const fetchAndSetQuote = useCallback(async () => {
    if (isFetchingQuote) return;

    setIsFetchingQuote(true); // Set fetching true at the start

    if (!isPremium) {
      setMotivationalQuote({ quote: "Unlock motivational quotes with Adagio Premium!", source: "Adagio App" });
      setIsFetchingQuote(false); // Ensure it's reset
      return;
    }

    setMotivationalQuote(null); // Clear previous quote for premium users
    try {
      const result = await getMotivationalQuote();
      setMotivationalQuote(result);
    } catch (error) {
      console.error("Failed to fetch motivational quote:", error);
      setMotivationalQuote({ quote: "Keep up the great work!", source: "Adagio App" }); // Fallback for premium users on error
    } finally {
      setIsFetchingQuote(false); // Reset in finally block for all paths
    }
  }, [isFetchingQuote, isPremium, setMotivationalQuote]); // getMotivationalQuote is stable from import

  useEffect(() => {
    const anySessionOnBreak = activeSessions.some(
      s => s.currentInterval === 'shortBreak' || s.currentInterval === 'longBreak'
    );

    if (anySessionOnBreak) {
      // Fetch if no quote, or if it's the default upgrade message, and not already fetching.
      const needsFreshQuote = !motivationalQuote || motivationalQuote.source === "Adagio App";
      if (needsFreshQuote && !isFetchingQuote) {
        fetchAndSetQuote();
      }
    }
  }, [activeSessions, isPremium, motivationalQuote, isFetchingQuote, fetchAndSetQuote]);


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
  }, [activeSessions, settings, toast, playNotificationSound, setActiveSessions]);

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
  }, [toast, updateRecentProjects, setActiveSessions]);

  const startTimer = useCallback((sessionId: string) => {
    setActiveSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        let { lastWorkSessionStartTime } = s;
        if (s.currentInterval === 'work') {
          if (s.currentTime === 0 && (lastWorkSessionStartTime === null || s.isRunning === false)) {
            lastWorkSessionStartTime = Date.now();
          } else if (lastWorkSessionStartTime === null && s.isRunning === false) {
            lastWorkSessionStartTime = Date.now() - s.currentTime * 1000;
          }
        }
        return { ...s, isRunning: true, lastWorkSessionStartTime };
      }
      return s;
    }));
  }, [setActiveSessions]);

  const pauseTimer = useCallback((sessionId: string) => {
    setActiveSessions(prev => prev.map(s => s.id === sessionId ? { ...s, isRunning: false } : s));
  }, [setActiveSessions]);

  const resetTimer = useCallback((sessionId: string) => {
    setActiveSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        if (notificationSentRefs.current[s.id]) {
           notificationSentRefs.current[s.id] = { work: false, shortBreak: false, longBreak: false };
        }
        const newLastWorkSessionStartTime = s.currentInterval === 'work' ? null : s.lastWorkSessionStartTime;
        return { ...s, isRunning: false, currentTime: 0, lastWorkSessionStartTime: newLastWorkSessionStartTime, shouldLogWork: false };
      }
      return s;
    }));
  }, [setActiveSessions]);

 const logWorkEntry = useCallback((session: ActivePomodoroSession) => {
    if (!session.lastWorkSessionStartTime) {
      console.warn(`logWorkEntry called for session ${session.id} ('${session.project}') without a valid lastWorkSessionStartTime. Skipping log.`);
      return null;
    }

    const now = Date.now();
    let calculatedDurationMinutes = Math.max(0, Math.round((now - session.lastWorkSessionStartTime) / (1000 * 60)));

    const workSessionISOStartTime = new Date(session.lastWorkSessionStartTime).toISOString();

    const existingEntry = pomodoroLog.find(entry =>
      entry.sessionId === session.id &&
      entry.startTime === workSessionISOStartTime &&
      entry.type === 'work'
    );

    if (existingEntry) {
      console.warn(`Log entry for session ${session.id} ('${session.project}') starting at ${workSessionISOStartTime} already exists (duration: ${existingEntry.duration}m). Skipping duplicate.`);
      return existingEntry;
    }
    
    if (calculatedDurationMinutes <= 0) {
        console.info(`Skipping log for session ${session.id} ('${session.project}') due to zero or negative duration.`);
        return null;
    }

    const newLogEntry: PomodoroLogEntry = {
      id: `${now}-${session.id}-${Math.random().toString(36).substring(2, 7)}`,
      startTime: workSessionISOStartTime,
      endTime: new Date(now).toISOString(),
      type: 'work',
      duration: calculatedDurationMinutes,
      project: session.project,
      sessionId: session.id,
    };

    const cleanedNewLogEntry = cleanLogEntry(newLogEntry);
    setPomodoroLog(prevLog => [cleanedNewLogEntry, ...prevLog]);

    toast({ title: "Work entry logged!", description: `${cleanedNewLogEntry.project || 'Work'}: ${formatTime(cleanedNewLogEntry.duration * 60)}` });
    updateRecentProjects(cleanedNewLogEntry.project);
    return cleanedNewLogEntry;
  }, [pomodoroLog, setPomodoroLog, toast, updateRecentProjects, formatTime]);


  const endCurrentWorkSession = useCallback((sessionId: string) => {
    setActiveSessions(prevSessions =>
      prevSessions.map(s => {
        if (s.id === sessionId && s.currentInterval === 'work' && s.isRunning) {
          if (notificationSentRefs.current[s.id]) {
            notificationSentRefs.current[s.id].work = false;
          }
          // Preserve lastWorkSessionStartTime for logging, mark for logging
          return { ...s, isRunning: false, currentTime: 0, shouldLogWork: true };
        }
        return s;
      })
    );
  }, [setActiveSessions]);

  const switchMode = useCallback((sessionId: string) => {
    setActiveSessions(prevSessions => prevSessions.map(s => {
      if (s.id === sessionId) {
        const updatedSessionBase = { ...s, isRunning: false };
        let nextInterval: IntervalType;
        let newCompletedPomodoros = updatedSessionBase.pomodorosCompletedThisSet;
        let newShouldLogWork = updatedSessionBase.shouldLogWork; // Preserve existing flag
        let newLastWorkSessionStartTime = updatedSessionBase.lastWorkSessionStartTime;

        if (updatedSessionBase.currentInterval === 'work') {
          newShouldLogWork = true; // Flag this work session for logging
          newCompletedPomodoros++;
          nextInterval = (newCompletedPomodoros % settings.pomodorosPerSet === 0) ? 'longBreak' : 'shortBreak';
        } else {
          // Switching from break to work
          nextInterval = 'work';
          newLastWorkSessionStartTime = Date.now(); // New work session starts now
          if (updatedSessionBase.currentInterval === 'longBreak') newCompletedPomodoros = 0;
        }

        if (notificationSentRefs.current[updatedSessionBase.id]) {
           notificationSentRefs.current[updatedSessionBase.id] = { work: false, shortBreak: false, longBreak: false };
        }

        return {
          ...updatedSessionBase,
          currentInterval: nextInterval,
          pomodorosCompletedThisSet: newCompletedPomodoros,
          currentTime: 0, // Reset timer for new interval
          lastWorkSessionStartTime: newLastWorkSessionStartTime,
          shouldLogWork: newShouldLogWork,
        };
      }
      return s;
    }));
  }, [settings.pomodorosPerSet, setActiveSessions]);


  useEffect(() => {
    const sessionsThatNeedLogging = activeSessions.filter(
      s => s.shouldLogWork && s.lastWorkSessionStartTime && s.currentTime === 0 && !s.isRunning
    );

    if (sessionsThatNeedLogging.length > 0) {
      let anyLogAttempted = false;
      sessionsThatNeedLogging.forEach(sessionToLog => {
        const loggedEntry = logWorkEntry(sessionToLog);
        if(loggedEntry !== null) { // if logWorkEntry decided to log (or found existing)
            anyLogAttempted = true;
        } else if (loggedEntry === null && sessionToLog.lastWorkSessionStartTime) {
            // Even if logWorkEntry returned null (e.g. zero duration), we still consumed the 'shouldLogWork' intent
            anyLogAttempted = true;
        }
      });

      if (anyLogAttempted) {
        setActiveSessions(prev =>
          prev.map(s => {
            if (sessionsThatNeedLogging.find(loggedSess => loggedSess.id === s.id)) {
              return { ...s, shouldLogWork: false, lastWorkSessionStartTime: null };
            }
            return s;
          })
        );
      }
    }
  }, [activeSessions, logWorkEntry, setActiveSessions]);


  const removeSession = useCallback((sessionId: string) => {
    let sessionToLogManually: ActivePomodoroSession | undefined;
    const currentSession = activeSessions.find(s => s.id === sessionId);
    const projectNameForToast = currentSession?.project || 'Untitled Session';

    if (currentSession && currentSession.currentInterval === 'work' && currentSession.isRunning && currentSession.lastWorkSessionStartTime && currentSession.currentTime > 0) {
      sessionToLogManually = { ...currentSession, isRunning: false, currentTime: 0, shouldLogWork: false }; // Simulate stopping it first
    }

    setActiveSessions(prevActiveSessions =>
        prevActiveSessions.filter(s => s.id !== sessionId)
    );

    if (sessionToLogManually) {
      logWorkEntry(sessionToLogManually);
    }

    if (timerRefs.current[sessionId]) {
      clearInterval(timerRefs.current[sessionId]!);
      delete timerRefs.current[sessionId];
    }
    if (notificationSentRefs.current[sessionId]) {
        delete notificationSentRefs.current[sessionId];
    }
    toast({title: `Session "${projectNameForToast}" removed`});
  }, [activeSessions, toast, logWorkEntry, setActiveSessions]);


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

