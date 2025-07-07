
"use client";

import type { PomodoroSettings, PomodoroLogEntry, IntervalType, TimeFilter, ChartDataPoint, ActivePomodoroSession, UserPomodoroData, Task } from '@/types/pomodoro';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { getMotivationalQuote, type MotivationalQuoteOutput } from '@/ai/flows/motivational-quote-flow';
import { isToday, isWithinInterval, startOfWeek, endOfWeek, parseISO, startOfMonth, endOfMonth, subDays, isAfter, startOfDay } from 'date-fns';
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
const FREE_USER_LOG_HISTORY_DAYS = 3;

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
  if (cleanedEntry.summary === undefined || cleanedEntry.summary === null || (typeof cleanedEntry.summary === 'string' && cleanedEntry.summary.trim() === '')) {
    delete cleanedEntry.summary;
  }
  if (!cleanedEntry.startTime || !parseISO(cleanedEntry.startTime).getTime()) {
    console.warn('Invalid startTime in log entry, setting to current time as fallback:', cleanedEntry);
    cleanedEntry.startTime = new Date().toISOString();
  }
  if (!cleanedEntry.endTime || !parseISO(cleanedEntry.endTime).getTime()) {
     console.warn('Invalid endTime in log entry, setting to startTime as fallback:', cleanedEntry);
    cleanedEntry.endTime = cleanedEntry.startTime;
  }
  if (typeof cleanedEntry.duration !== 'number' || isNaN(cleanedEntry.duration) || cleanedEntry.duration < 0) {
    cleanedEntry.duration = 0;
  }
  return cleanedEntry as PomodoroLogEntry;
};

const cleanTask = (task: any): Task => {
    return {
        id: task.id ?? Date.now().toString(),
        text: task.text ?? '',
        completed: task.completed ?? false,
    };
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
    cleanedSession.tasks = (cleanedSession.tasks ?? []).map(cleanTask);
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
  const [sessionToSummarize, setSessionToSummarize] = useState<ActivePomodoroSession | null>(null);
  const [isEditActiveSessionModalOpen, setIsEditActiveSessionModalOpen] = useState(false);
  const [activeSessionToEdit, setActiveSessionToEdit] = useState<ActivePomodoroSession | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [inputProjectName, setInputProjectName] = useState('');

  const timerRefs = useRef<Record<string, NodeJS.Timeout | null>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notificationSentRefs = useRef<Record<string, Record<IntervalType, boolean>>>({});
  const { toast } = useToast();

  const debouncedSaveActiveSessionsRef = useRef<NodeJS.Timeout | null>(null);

  const filterLogForFreeTier = useCallback((log: PomodoroLogEntry[]): PomodoroLogEntry[] => {
    const cutoffDateStart = startOfDay(subDays(new Date(), FREE_USER_LOG_HISTORY_DAYS -1));
    return log.filter(entry => {
      try {
        const entryEndTime = parseISO(entry.endTime);
        return isAfter(entryEndTime, cutoffDateStart) || isToday(entryEndTime);
      } catch (e) {
        console.warn("Error parsing date in filterLogForFreeTier for entry:", entry, e);
        return false; 
      }
    });
  }, []);

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
      
      if (firestorePayload.pomodoroLog) firestorePayload.pomodoroLog = firestorePayload.pomodoroLog.map(cleanLogEntry);
      if (firestorePayload.activeSessions) firestorePayload.activeSessions = firestorePayload.activeSessions.map(cleanActiveSession);

      if (firestorePayload.pomodoroLog && !isPremium) {
        firestorePayload.pomodoroLog = filterLogForFreeTier(firestorePayload.pomodoroLog);
      }

      await setDoc(userDocRef, firestorePayload, { merge: true });
    } catch (error) {
      console.error("Error saving data to Firestore:", error);
    }
  }, [isPremium, filterLogForFreeTier]);


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
      let localData = loadDataFromLocalStorage();
      setSettings(localData.settings);
      setActiveSessions(localData.activeSessions);
      setRecentProjects(localData.recentProjects);

      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const cloudData = docSnap.data() as UserPomodoroData;
            
            const effectiveSettings = cloudData.settings || localData.settings;
            const cloudLog = (cloudData.pomodoroLog || []).map(cleanLogEntry);
            const effectiveLog = isPremium ? cloudLog : filterLogForFreeTier(cloudLog);
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
            const logToSave = isPremium ? localData.pomodoroLog : filterLogForFreeTier(localData.pomodoroLog);
            setPomodoroLog(logToSave);
            await saveDataToFirestore(currentUser.uid, { ...localData, pomodoroLog: logToSave, isPremium });
          }
        } catch (error) {
          console.error("Error loading/syncing data with Firestore:", error);
          const logToSave = isPremium ? localData.pomodoroLog : filterLogForFreeTier(localData.pomodoroLog);
          setPomodoroLog(logToSave);
        }
      } else {
         const logToSave = isPremium ? localData.pomodoroLog : filterLogForFreeTier(localData.pomodoroLog);
         setPomodoroLog(logToSave);
      }
      setIsDataLoading(false);
    };
    loadData();
  }, [currentUser, isClient, loadDataFromLocalStorage, saveDataToFirestore, isPremium, filterLogForFreeTier]);

  // Persistence effects for each piece of state
  useEffect(() => { if (isClient && !isDataLoading) { localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings)); if (currentUser) saveDataToFirestore(currentUser.uid, { settings }); }}, [settings, isClient, currentUser, saveDataToFirestore, isDataLoading]);
  useEffect(() => { if (isClient && !isDataLoading) { const logToPersist = isPremium ? pomodoroLog : filterLogForFreeTier(pomodoroLog); localStorage.setItem(LOCAL_LOG_KEY, JSON.stringify(logToPersist)); if (currentUser) saveDataToFirestore(currentUser.uid, { pomodoroLog: logToPersist }); }}, [pomodoroLog, isClient, currentUser, saveDataToFirestore, isDataLoading, isPremium, filterLogForFreeTier]);
  useEffect(() => { if (isClient && !isDataLoading) { localStorage.setItem(LOCAL_RECENT_PROJECTS_KEY, JSON.stringify(recentProjects)); if (currentUser) saveDataToFirestore(currentUser.uid, { recentProjects }); }}, [recentProjects, isClient, currentUser, saveDataToFirestore, isDataLoading]);

  const persistActiveSessionsToFirestore = useCallback((userId: string, sessions: ActivePomodoroSession[]) => {
    if (debouncedSaveActiveSessionsRef.current) clearTimeout(debouncedSaveActiveSessionsRef.current);
    debouncedSaveActiveSessionsRef.current = setTimeout(() => {
      saveDataToFirestore(userId, { activeSessions: sessions.map(cleanActiveSession) });
    }, ACTIVE_SESSIONS_FIRESTORE_DEBOUNCE_MS);
  }, [saveDataToFirestore]);

  useEffect(() => {
    if (isClient && !isDataLoading) {
      localStorage.setItem(LOCAL_ACTIVE_SESSIONS_KEY, JSON.stringify(activeSessions.map(cleanActiveSession)));
      if (currentUser) persistActiveSessionsToFirestore(currentUser.uid, activeSessions);
    }
  }, [activeSessions, isClient, currentUser, persistActiveSessionsToFirestore, isDataLoading]);

  const fetchAndSetQuote = useCallback(async () => {
    if (isFetchingQuote) return;
    setIsFetchingQuote(true);
    try {
        if (!isPremium) {
          setMotivationalQuote({ quote: "Unlock motivational quotes with Adagio Premium!", source: "Adagio App" });
          return;
        }
        setMotivationalQuote(null);
        const result = await getMotivationalQuote();
        setMotivationalQuote(result);
    } catch (error) {
      console.error("Failed to fetch motivational quote:", error);
      setMotivationalQuote({ quote: "Keep up the great work!", source: "Adagio App" });
    } finally {
      setIsFetchingQuote(false);
    }
  }, [isFetchingQuote, isPremium]);

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
                    if(audioRef.current) audioRef.current.play().catch(e => console.warn("Audio play failed", e));
                    notificationSentRefs.current[s.id].work = true;
                  } else if (s.currentInterval === 'shortBreak' && !notificationSentRefs.current[s.id].shortBreak && newTime >= settings.shortBreakDuration * 60) {
                    toast({ title: `Break Over: ${s.project}`, description: `Your ${settings.shortBreakDuration}-min break is up.` });
                    if(audioRef.current) audioRef.current.play().catch(e => console.warn("Audio play failed", e));
                    notificationSentRefs.current[s.id].shortBreak = true;
                  } else if (s.currentInterval === 'longBreak' && !notificationSentRefs.current[s.id].longBreak && newTime >= settings.longBreakDuration * 60) {
                    toast({ title: `Break Over: ${s.project}`, description: `Your ${settings.longBreakDuration}-min break is up.` });
                    if(audioRef.current) audioRef.current.play().catch(e => console.warn("Audio play failed", e));
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

    return () => { Object.values(timerRefs.current).forEach(timerId => { if (timerId) clearInterval(timerId); }); timerRefs.current = {}; };
  }, [activeSessions, settings, toast]);

  const updateRecentProjects = useCallback((projectName?: string) => {
    if (!projectName || projectName.trim() === "") return;
    setRecentProjects(prevRecent => {
      const trimmedProjectName = projectName.trim();
      const filtered = prevRecent.filter(p => p !== trimmedProjectName);
      return [trimmedProjectName, ...filtered].slice(0, MAX_RECENT_PROJECTS);
    });
  }, []);

  const addSession = useCallback((projectName: string) => {
    const trimmedProjectName = projectName.trim();
    if (!trimmedProjectName) {
      toast({ title: "Project name cannot be empty", variant: "destructive" });
      return;
    }
    const newSession: ActivePomodoroSession = cleanActiveSession({
      id: Date.now().toString(),
      project: trimmedProjectName,
      tasks: [],
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
        const newLastWorkSessionStartTime = s.currentInterval === 'work' ? null : s.lastWorkSessionStartTime;
        return { ...s, isRunning: false, currentTime: 0, lastWorkSessionStartTime: newLastWorkSessionStartTime };
      }
      return s;
    }));
  }, []);

 const logWorkEntry = useCallback((session: ActivePomodoroSession, summary?: string) => {
    if (!session.lastWorkSessionStartTime) return null;

    const now = Date.now();
    const calculatedDurationMinutes = Math.max(0, Math.round((now - session.lastWorkSessionStartTime) / (1000 * 60)));
    if (calculatedDurationMinutes <= 0 && session.currentTime === 0) return null;

    const finalProjectName = session.project;

    const newLogEntry: PomodoroLogEntry = {
      id: `${now}-${session.id}`,
      startTime: new Date(session.lastWorkSessionStartTime).toISOString(),
      endTime: new Date(now).toISOString(),
      type: 'work',
      duration: calculatedDurationMinutes,
      project: finalProjectName,
      summary: summary,
      sessionId: session.id,
    };

    const cleanedNewLogEntry = cleanLogEntry(newLogEntry);
    setPomodoroLog(prevLog => {
      const newFullLog = [cleanedNewLogEntry, ...prevLog];
      return isPremium ? newFullLog : filterLogForFreeTier(newFullLog);
    });
    updateRecentProjects(cleanedNewLogEntry.project);
    return cleanedNewLogEntry;
  }, [updateRecentProjects, isPremium, filterLogForFreeTier, setPomodoroLog]);

  const endCurrentWorkSession = useCallback((sessionId: string) => {
    const sessionToEnd = activeSessions.find(s => s.id === sessionId && s.currentInterval === 'work' && s.isRunning);
    if (sessionToEnd) {
        setSessionToSummarize(sessionToEnd);
        setActiveSessions(prev => prev.map(s => s.id === sessionId ? { ...s, isRunning: false, currentTime: 0 } : s));
    }
  }, [activeSessions]);

  const switchMode = useCallback((sessionId: string) => {
    setActiveSessions(prevSessions => prevSessions.map(s => {
      if (s.id === sessionId) {
        let nextInterval: IntervalType;
        let newCompletedPomodoros = s.pomodorosCompletedThisSet;
        let newLastWorkSessionStartTime = s.lastWorkSessionStartTime;

        if (s.currentInterval === 'work') {
          setSessionToSummarize(s); // Trigger summary modal
          newCompletedPomodoros++;
          nextInterval = (newCompletedPomodoros % settings.pomodorosPerSet === 0) ? 'longBreak' : 'shortBreak';
        } else { 
          nextInterval = 'work';
          newLastWorkSessionStartTime = Date.now(); 
          if (s.currentInterval === 'longBreak') newCompletedPomodoros = 0;
        }

        if (notificationSentRefs.current[s.id]) notificationSentRefs.current[s.id] = { work: false, shortBreak: false, longBreak: false };

        return { ...s, isRunning: false, currentInterval: nextInterval, pomodorosCompletedThisSet: newCompletedPomodoros, currentTime: 0, lastWorkSessionStartTime: newLastWorkSessionStartTime };
      }
      return s;
    }));
  }, [settings.pomodorosPerSet]);

  const removeSession = useCallback((sessionId: string) => {
    let sessionToLog: ActivePomodoroSession | undefined;
    const currentSession = activeSessions.find(s => s.id === sessionId);
    const projectNameForToast = currentSession?.project || 'Untitled Session';

    if (currentSession && currentSession.currentInterval === 'work' && currentSession.isRunning && currentSession.lastWorkSessionStartTime && currentSession.currentTime > 0) {
      sessionToLog = { ...currentSession }; 
    }

    setActiveSessions(prev => prev.filter(s => s.id !== sessionId));

    if (sessionToLog) {
      setSessionToSummarize(sessionToLog); // Also trigger summary on remove
    } else {
        toast({title: `Session "${projectNameForToast}" removed`});
    }

    if (timerRefs.current[sessionId]) { clearInterval(timerRefs.current[sessionId]!); delete timerRefs.current[sessionId]; }
    if (notificationSentRefs.current[sessionId]) delete notificationSentRefs.current[sessionId];
  }, [activeSessions, toast]);

  const logSessionFromSummary = useCallback((session: ActivePomodoroSession, summary?: string) => {
      const loggedEntry = logWorkEntry(session, summary);
      if (loggedEntry) {
        toast({
            title: "Work entry logged!",
            description: `${loggedEntry.project || 'Work'}: ${formatTime(loggedEntry.duration * 60)}`,
        });
      }
      setSessionToSummarize(null);
      // Reset the specific session that was just logged, including its tasks
      setActiveSessions(prev => prev.map(s => s.id === session.id ? {...s, lastWorkSessionStartTime: null, currentTime: 0, tasks: []} : s));
  }, [logWorkEntry, toast, formatTime]);

  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => { setSettings(prev => ({ ...prev, ...newSettings })); }, []);
  const deleteLogEntry = useCallback((id: string) => { setPomodoroLog(prevLog => { const updatedLog = prevLog.filter(entry => entry.id !== id); return isPremium ? updatedLog : filterLogForFreeTier(updatedLog); }); toast({ title: "Entry deleted", variant: "destructive" }); }, [toast, isPremium, filterLogForFreeTier]);
  
  const openEditModal = useCallback((entry: PomodoroLogEntry) => { setEntryToEdit(cleanLogEntry(entry)); setIsEditModalOpen(true); }, []);
  const closeEditModal = useCallback(() => { setIsEditModalOpen(false); setEntryToEdit(null); }, []);

  const updateLogEntry = useCallback((updatedEntryData: PomodoroLogEntry) => {
    const cleanedUpdatedEntry = cleanLogEntry(updatedEntryData);
    setPomodoroLog(prevLog => {
      const newLog = prevLog.map(entry => entry.id === cleanedUpdatedEntry.id ? cleanedUpdatedEntry : entry);
      return isPremium ? newLog : filterLogForFreeTier(newLog);
    });
    if (cleanedUpdatedEntry.project) updateRecentProjects(cleanedUpdatedEntry.project);
    toast({ title: "Entry updated successfully!" });
    closeEditModal();
  }, [toast, closeEditModal, updateRecentProjects, isPremium, filterLogForFreeTier]);

  const addManualLogEntry = useCallback((newEntryData: Omit<PomodoroLogEntry, 'id' | 'type' | 'sessionId'>) => {
    const newEntry: PomodoroLogEntry = { ...newEntryData, id: `${Date.now()}-manual`, type: 'work' };
    const cleanedNewEntry = cleanLogEntry(newEntry);
    setPomodoroLog(prevLog => {
      const newFullLog = [cleanedNewEntry, ...prevLog].sort((a,b) => parseISO(b.endTime).getTime() - parseISO(a.endTime).getTime());
      return isPremium ? newFullLog : filterLogForFreeTier(newFullLog);
    });
    if (cleanedNewEntry.project) updateRecentProjects(cleanedNewEntry.project);
    toast({ title: "Manual entry added!" });
  }, [isPremium, filterLogForFreeTier, updateRecentProjects, toast]);
  
  const openEditActiveSessionModal = useCallback((session: ActivePomodoroSession) => { setActiveSessionToEdit(cleanActiveSession(session)); setIsEditActiveSessionModalOpen(true); }, []);
  const closeEditActiveSessionModal = useCallback(() => { setIsEditActiveSessionModalOpen(false); setActiveSessionToEdit(null); }, []);
  const updateActiveSessionStartTime = useCallback((sessionId: string, newStartTime: number) => {
    setActiveSessions(prev => prev.map(s => {
      if (s.id === sessionId && s.lastWorkSessionStartTime !== null) {
        const newCurrentTime = Math.max(0, Math.round((Date.now() - newStartTime) / 1000));
        if (notificationSentRefs.current[s.id]) notificationSentRefs.current[s.id].work = false;
        return { ...s, lastWorkSessionStartTime: newStartTime, currentTime: newCurrentTime };
      }
      return s;
    }));
    closeEditActiveSessionModal();
    toast({ title: "Start time updated!" });
  }, [closeEditActiveSessionModal, toast]);

  const addTaskToSession = useCallback((sessionId: string, text: string) => {
    const newTask = cleanTask({ id: Date.now().toString(), text, completed: false });
    setActiveSessions(prev =>
      prev.map(session =>
        session.id === sessionId
          ? { ...session, tasks: [newTask, ...session.tasks] }
          : session
      )
    );
  }, []);
  
  const toggleTaskInSession = useCallback((sessionId: string, taskId: string) => {
    setActiveSessions(prev =>
      prev.map(session =>
        session.id === sessionId
          ? {
              ...session,
              tasks: session.tasks.map(task =>
                task.id === taskId ? { ...task, completed: !task.completed } : task
              ),
            }
          : session
      )
    );
  }, []);
  
  const deleteTaskFromSession = useCallback((sessionId: string, taskId: string) => {
    setActiveSessions(prev =>
      prev.map(session =>
        session.id === sessionId
          ? { ...session, tasks: session.tasks.filter(task => task.id !== taskId) }
          : session
      )
    );
  }, []);


  const processedChartData = useMemo((): ChartDataPoint[] => {
    if (!isClient || isDataLoading) return [];
    const currentLog = isPremium ? pomodoroLog : filterLogForFreeTier(pomodoroLog);
    let filteredLogForChartPeriod: PomodoroLogEntry[];
    const now = new Date();
    switch (activeFilter) {
      case 'today': filteredLogForChartPeriod = currentLog.filter(entry => isToday(parseISO(entry.endTime))); break;
      case 'thisWeek': filteredLogForChartPeriod = currentLog.filter(entry => isWithinInterval(parseISO(entry.endTime), { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) })); break;
      case 'thisMonth': filteredLogForChartPeriod = currentLog.filter(entry => isWithinInterval(parseISO(entry.endTime), { start: startOfMonth(now), end: endOfMonth(now) })); break;
      default: filteredLogForChartPeriod = currentLog;
    }
    const aggregation: Record<string, number> = {};
    filteredLogForChartPeriod.forEach(entry => {
      const projectName = entry.project || 'No Project';
      aggregation[projectName] = (aggregation[projectName] || 0) + entry.duration;
    });
    return Object.entries(aggregation).map(([name, totalMinutes]) => ({ name, totalMinutes })).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [pomodoroLog, activeFilter, isClient, isDataLoading, isPremium, filterLogForFreeTier]);

  const populateTestData = useCallback(() => { /* ... implementation unchanged ... */ }, []);

  const removeRecentProject = useCallback((projectName: string) => {
    setRecentProjects(prev => prev.filter(p => p !== projectName));
    toast({
      title: "Project Removed",
      description: `"${projectName}" has been removed from your recent projects.`,
    });
  }, [toast]);

  useEffect(() => {
    const anySessionOnBreak = activeSessions.some(s => s.currentInterval === 'shortBreak' || s.currentInterval === 'longBreak');
    if (anySessionOnBreak && !isFetchingQuote) {
      const needsFreshQuote = !motivationalQuote || (motivationalQuote.source === "Adagio App" && isPremium);
      if (needsFreshQuote) fetchAndSetQuote();
    }
  }, [activeSessions, motivationalQuote, isFetchingQuote, fetchAndSetQuote, isPremium]);


  return {
    settings, updateSettings, activeSessions, pomodoroLog, 
    addTaskToSession, toggleTaskInSession, deleteTaskFromSession,
    addSession, removeSession, startTimer, pauseTimer, resetTimer, switchMode, endCurrentWorkSession,
    deleteLogEntry, formatTime, isClient, recentProjects, motivationalQuote, isFetchingQuote,
    activeFilter, setActiveFilter, processedChartData, isEditModalOpen, entryToEdit, openEditModal,
    closeEditModal, updateLogEntry, addManualLogEntry, populateTestData, isDataLoading,
    isEditActiveSessionModalOpen, activeSessionToEdit, openEditActiveSessionModal, closeEditActiveSessionModal, updateActiveSessionStartTime,
    sessionToSummarize, logSessionFromSummary, removeRecentProject,
    inputProjectName, setInputProjectName,
  };
}
