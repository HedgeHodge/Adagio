
"use client";

import type { PomodoroSettings as TimerSettings, LogEntry, IntervalType, TimeFilter, ChartDataPoint, ActivePomodoroSession as ActiveSession, UserPomodoroData as UserData, Task } from '@/types/pomodoro';
import React, { useState, useEffect, useCallback, useRef, useMemo, startTransition } from 'react';
import { useToast } from "@/hooks/use-toast";
import { getMotivationalQuote, type MotivationalQuoteOutput } from '@/ai/flows/motivational-quote-flow';
import { isToday, isWithinInterval, startOfWeek, endOfWeek, parseISO, startOfMonth, endOfMonth, subDays, isAfter, startOfDay, subWeeks, subMonths, endOfDay } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import type { DateRange } from 'react-day-picker';
import { summarizePeriod } from '@/ai/flows/summarize-period-flow';

const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  timersPerSet: 4,
};

const LOCAL_SETTINGS_KEY = 'timerSettings_v2';
const LOCAL_LOG_KEY = 'log_v2';
const LOCAL_ACTIVE_SESSIONS_KEY = 'activeSessions_v2';
const LOCAL_RECENT_PROJECTS_KEY = 'recentProjects_v2';

const MAX_RECENT_PROJECTS = 5;
const FREE_USER_LOG_HISTORY_DAYS = 3;
const UNDO_TIMEOUT = 5000; // 5 seconds

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

const cleanLogEntry = (entry: any): LogEntry => {
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
  return cleanedEntry as LogEntry;
};

const cleanTask = (task: any): Task => {
    return {
        id: task.id ?? Date.now().toString(),
        text: task.text ?? '',
        completed: task.completed ?? false,
    };
};

const cleanActiveSession = (session: any): ActiveSession => {
    const cleanedSession = { ...session };
    cleanedSession.id = cleanedSession.id ?? Date.now().toString();
    cleanedSession.project = cleanedSession.project ?? 'Untitled Session';
    cleanedSession.currentTime = cleanedSession.currentTime ?? 0;
    cleanedSession.isRunning = cleanedSession.isRunning ?? false;
    cleanedSession.currentInterval = cleanedSession.currentInterval ?? 'work';
    cleanedSession.timersCompletedThisSet = cleanedSession.timersCompletedThisSet ?? 0;
    cleanedSession.lastWorkSessionStartTime = cleanedSession.lastWorkSessionStartTime ?? null;
    cleanedSession.tasks = (cleanedSession.tasks ?? []).map(cleanTask);
    return cleanedSession as ActiveSession;
};

interface SessionToConfirm {
    session: ActiveSession;
    summary?: string;
}

export interface InsightsStatsData {
  totalMinutes: number;
  totalSessions: number;
  averageSessionMinutes: number;
}

export function useTimer() {
  const { currentUser, isPremium } = useAuth();
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [recentProjects, setRecentProjects] = useState<string[]>([]);
  const [motivationalQuote, setMotivationalQuote] = useState<MotivationalQuoteOutput | null>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('thisWeek');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [isEntriesModalOpen, setIsEntriesModalOpen] = useState(false);
  const [selectedChartProject, setSelectedChartProject] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<LogEntry | null>(null);
  const [sessionToSummarize, setSessionToSummarize] = useState<ActiveSession | null>(null);
  const [isEditActiveSessionModalOpen, setIsEditActiveSessionModalOpen] = useState(false);
  const [activeSessionToEdit, setActiveSessionToEdit] = useState<ActiveSession | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [inputProjectName, setInputProjectName] = useState('');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isWipeConfirmOpen, setIsWipeConfirmOpen] = useState(false);
  const [hasExceededFreeLogLimit, setHasExceededFreeLogLimit] = useState(false);
  const [isShortSessionConfirmOpen, setIsShortSessionConfirmOpen] = useState(false);
  const [sessionToConfirm, setSessionToConfirm] = useState<SessionToConfirm | null>(null);

  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [periodSummary, setPeriodSummary] = useState<string | null>(null);
  const [isPeriodSummaryModalOpen, setIsPeriodSummaryModalOpen] = useState(false);
  
  const timerRefs = useRef<Record<string, NodeJS.Timeout | null>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notificationSentRefs = useRef<Record<string, Record<IntervalType, boolean>>>({});
  const { toast } = useToast();

  const filterLogForFreeTier = useCallback((log: LogEntry[]): LogEntry[] => {
    const cutoffDateStart = startOfDay(subDays(new Date(), FREE_USER_LOG_HISTORY_DAYS -1));
    return log.filter((entry: LogEntry) => {
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
  
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Effect for setting up the component and loading initial data
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

  // Load local data on initial mount or when user logs out
  const loadLocalData = useCallback(() => {
    setIsDataLoading(true);
    const localSettings = parseJSONWithDefault(localStorage.getItem(LOCAL_SETTINGS_KEY), DEFAULT_SETTINGS);
    const localLog = parseJSONWithDefault(localStorage.getItem(LOCAL_LOG_KEY), []).map(cleanLogEntry);
    const localActiveSessions = parseJSONWithDefault(localStorage.getItem(LOCAL_ACTIVE_SESSIONS_KEY), []).map(cleanActiveSession);
    const localRecentProjects = parseJSONWithDefault(localStorage.getItem(LOCAL_RECENT_PROJECTS_KEY), []);
    
    setSettings(localSettings);
    const logToUse = isPremium ? localLog : filterLogForFreeTier(localLog);
    setLog(logToUse);
    setActiveSessions(localActiveSessions);
    setRecentProjects(localRecentProjects);

    if (!isPremium) {
      const cutoffDate = startOfDay(subDays(new Date(), FREE_USER_LOG_HISTORY_DAYS - 1));
      setHasExceededFreeLogLimit(localLog.some(entry => isAfter(cutoffDate, parseISO(entry.endTime))));
    } else {
      setHasExceededFreeLogLimit(false);
    }

    setIsDataLoading(false);
  }, [isPremium, filterLogForFreeTier]);

  // Effect for real-time data synchronization with Firestore
  useEffect(() => {
    if (!isClient) return;

    if (!currentUser) {
      loadLocalData();
      return;
    }

    setIsDataLoading(true);
    const userDocRef = doc(db, 'users', currentUser.uid);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      let cloudData: UserData = {};
      
      if (docSnap.exists()) {
        cloudData = docSnap.data() as UserData;
      }
      
      const effectiveSettings = cloudData.settings || DEFAULT_SETTINGS;
      const cloudLog = (cloudData.log || []).map(cleanLogEntry);
      
      if (!isPremium) {
        const cutoffDate = startOfDay(subDays(new Date(), FREE_USER_LOG_HISTORY_DAYS - 1));
        setHasExceededFreeLogLimit(cloudLog.some(entry => isAfter(cutoffDate, parseISO(entry.endTime))));
      } else {
        setHasExceededFreeLogLimit(false);
      }

      const effectiveLog = isPremium ? cloudLog : filterLogForFreeTier(cloudLog);
      const effectiveActiveSessions = (cloudData.activeSessions || []).map(cleanActiveSession);
      const effectiveRecentProjects = cloudData.recentProjects || [];

      // Update React state
      setSettings(effectiveSettings);
      setLog(effectiveLog);
      setActiveSessions(effectiveActiveSessions);
      setRecentProjects(effectiveRecentProjects);

      // Sync to local storage
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(effectiveSettings));
      localStorage.setItem(LOCAL_LOG_KEY, JSON.stringify(cloudLog)); // Store full log locally
      localStorage.setItem(LOCAL_ACTIVE_SESSIONS_KEY, JSON.stringify(effectiveActiveSessions));
      localStorage.setItem(LOCAL_RECENT_PROJECTS_KEY, JSON.stringify(effectiveRecentProjects));
      
      setIsDataLoading(false);
    }, (error) => {
      console.error("Error with Firestore snapshot listener:", error);
      toast({ title: "Sync Error", description: "Could not sync data from the cloud.", variant: "destructive" });
      loadLocalData(); // Fallback to local data on error
    });

    return () => unsubscribe();
  }, [currentUser, isClient, isPremium, loadLocalData, filterLogForFreeTier, toast]);

  const updateFirestore = useCallback(async (data: Partial<UserData>) => {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userDocRef, { ...data, lastUpdated: Timestamp.now() });
    } catch (error) {
       // If doc doesn't exist, create it.
      await setDoc(userDocRef, { ...data, lastUpdated: Timestamp.now() }, { merge: true });
      console.error("Error updating Firestore, attempting to set.", error);
    }
  }, [currentUser]);

  const fetchAndSetQuote = useCallback(async () => {
    if (isFetchingQuote) return;
    setIsFetchingQuote(true);
    try {
        if (!isPremium) {
          setMotivationalQuote({ quote: "Unlock motivational quotes with Premium!", source: "Adagio" });
          return;
        }
        setMotivationalQuote(null);
        const result = await getMotivationalQuote();
        setMotivationalQuote(result);
    } catch (error) {
      console.error("Failed to fetch motivational quote:", error);
      setMotivationalQuote({ quote: "Keep up the great work!", source: "Adagio" });
    } finally {
      setIsFetchingQuote(false);
    }
  }, [isFetchingQuote, isPremium]);

  useEffect(() => {
    activeSessions.forEach(session => {
      if (session.isRunning) {
        if (!timerRefs.current[session.id]) {
          timerRefs.current[session.id] = setInterval(() => {
            startTransition(() => {
              setActiveSessions(prevSessions =>
                prevSessions.map(s => {
                  if (s.id === session.id && s.isRunning) {
                    if (s.lastWorkSessionStartTime === null) return s; // Should not happen if running

                    const now = Date.now();
                    const newTime = Math.round((now - s.lastWorkSessionStartTime) / 1000);

                    if (!notificationSentRefs.current[s.id]) {
                      notificationSentRefs.current[s.id] = { work: false, shortBreak: false, longBreak: false };
                    }

                    if (s.currentInterval === 'work' && !notificationSentRefs.current[s.id].work && newTime >= settings.workDuration * 60) {
                      setTimeout(() => toast({ title: `Focus: ${s.project}`, description: `Consider a break. ${settings.workDuration} min done.` }), 0);
                      if(audioRef.current) audioRef.current.play().catch(e => console.warn("Audio play failed", e));
                      notificationSentRefs.current[s.id].work = true;
                    } else if (s.currentInterval === 'shortBreak' && !notificationSentRefs.current[s.id].shortBreak && newTime >= settings.shortBreakDuration * 60) {
                      setTimeout(() => toast({ title: `Break Over: ${s.project}`, description: `Your ${settings.shortBreakDuration}-min break is up.` }), 0);
                      if(audioRef.current) audioRef.current.play().catch(e => console.warn("Audio play failed", e));
                      notificationSentRefs.current[s.id].shortBreak = true;
                    } else if (s.currentInterval === 'longBreak' && !notificationSentRefs.current[s.id].longBreak && newTime >= settings.longBreakDuration * 60) {
                      setTimeout(() => toast({ title: `Break Over: ${s.project}`, description: `Your ${settings.longBreakDuration}-min break is up.` }), 0);
                      if(audioRef.current) audioRef.current.play().catch(e => console.warn("Audio play failed", e));
                      notificationSentRefs.current[s.id].longBreak = true;
                    }
                    return { ...s, currentTime: newTime };
                  }
                  return s;
                })
              );
            });
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
    const trimmedProjectName = projectName.trim();
    
    setRecentProjects(prev => {
        const updatedRecent = [trimmedProjectName, ...prev.filter(p => p !== trimmedProjectName)].slice(0, MAX_RECENT_PROJECTS);
        updateFirestore({ recentProjects: updatedRecent });
        return updatedRecent;
    });
  }, [updateFirestore]);

  const addSession = useCallback((projectName: string) => {
    const trimmedProjectName = projectName.trim();
    if (!trimmedProjectName) {
      toast({ title: "Project name cannot be empty", variant: "destructive" });
      return;
    }
    const newSession: ActiveSession = cleanActiveSession({
      id: Date.now().toString(),
      project: trimmedProjectName,
      tasks: [],
    });

    const newSessions = [...activeSessions, newSession];
    updateFirestore({ activeSessions: newSessions.map(cleanActiveSession) });

    updateRecentProjects(trimmedProjectName);
    setInputProjectName('');
    if (!notificationSentRefs.current[newSession.id]) {
        notificationSentRefs.current[newSession.id] = { work: false, shortBreak: false, longBreak: false };
    }
  }, [toast, updateRecentProjects, activeSessions, updateFirestore]);

  const startTimer = useCallback((sessionId: string) => {
    const newSessions = activeSessions.map(s => {
      if (s.id === sessionId) {
        let { lastWorkSessionStartTime } = s;
        if (s.currentInterval === 'work') {
          if (s.currentTime === 0 && (lastWorkSessionStartTime === null || s.isRunning === false)) {
            lastWorkSessionStartTime = Date.now();
          } else if (s.isRunning === false) {
            // Adjust start time based on current time to avoid losing progress
            lastWorkSessionStartTime = Date.now() - s.currentTime * 1000;
          }
        }
        return { ...s, isRunning: true, lastWorkSessionStartTime };
      }
      return s;
    });
    updateFirestore({ activeSessions: newSessions.map(cleanActiveSession) });
  }, [activeSessions, updateFirestore]);

  const pauseTimer = useCallback((sessionId: string) => {
    const newSessions = activeSessions.map(s => s.id === sessionId ? { ...s, isRunning: false } : s);
    updateFirestore({ activeSessions: newSessions.map(cleanActiveSession) });
  }, [activeSessions, updateFirestore]);

  const _actuallyLogWorkEntry = useCallback((session: ActiveSession, summary?: string, options: { resetToDefault?: boolean } = {}) => {
    if (!session.lastWorkSessionStartTime) return null;
    
    const now = Date.now();
    const calculatedDurationMinutes = Math.max(0, Math.round((now - session.lastWorkSessionStartTime) / (1000 * 60)));

    const newLogEntry: LogEntry = cleanLogEntry({
      id: `${now}-${session.id}`,
      startTime: new Date(session.lastWorkSessionStartTime).toISOString(),
      endTime: new Date(now).toISOString(),
      type: 'work',
      duration: calculatedDurationMinutes,
      project: session.project,
      summary: summary,
      sessionId: session.id,
    });
    
    updateFirestore({ log: arrayUnion(newLogEntry) as any });
    updateRecentProjects(newLogEntry.project);
    
    toast({
      title: "Work entry logged!",
      description: `${newLogEntry.project || 'Work'}: ${formatTime(newLogEntry.duration * 60)}`,
    });
    
    // Reset the session state after logging
    const newSessions = activeSessions.map(s => {
        if (s.id === session.id) {
            if (options.resetToDefault) {
                return {
                    ...s, 
                    lastWorkSessionStartTime: null, 
                    currentTime: 0, 
                    tasks: [], 
                    isRunning: false,
                    currentInterval: 'work',
                    timersCompletedThisSet: 0, 
                };
            }
            return {...s, lastWorkSessionStartTime: null, currentTime: 0, tasks: [], isRunning: false};
        }
        return s;
    });
    updateFirestore({ activeSessions: newSessions.map(cleanActiveSession) });
  }, [activeSessions, updateFirestore, updateRecentProjects, toast, formatTime]);


 const logWorkEntry = useCallback((session: ActiveSession, summary?: string, options?: { resetToDefault?: boolean }) => {
    if (!session.lastWorkSessionStartTime) return null;

    const now = Date.now();
    const calculatedDurationMinutes = Math.round((now - session.lastWorkSessionStartTime) / (1000 * 60));

    if (calculatedDurationMinutes < 1) {
        setSessionToConfirm({ session, summary });
        setIsShortSessionConfirmOpen(true);
        return;
    }
    
    setSessionToSummarize(session);
  }, []);
  
  const closeShortSessionConfirm = useCallback((shouldLog: boolean) => {
      setIsShortSessionConfirmOpen(false);
      if (shouldLog && sessionToConfirm) {
          _actuallyLogWorkEntry(sessionToConfirm.session, sessionToConfirm.summary);
      } else if (sessionToConfirm) {
           // Reset session if user cancels logging the short session
           const newSessions = activeSessions.map(s => s.id === sessionToConfirm.session.id ? {...s, lastWorkSessionStartTime: null, currentTime: 0, tasks: [], isRunning: false} : s);
           updateFirestore({ activeSessions: newSessions.map(cleanActiveSession) });
      }
      setSessionToConfirm(null);
  }, [sessionToConfirm, _actuallyLogWorkEntry, activeSessions, updateFirestore]);

  

  const removeSession = useCallback((sessionId: string) => {
    let sessionToLog: ActiveSession | undefined;
    const currentSession = activeSessions.find(s => s.id === sessionId);
    const projectNameForToast = currentSession?.project || 'Untitled Session';

    if (currentSession && currentSession.currentInterval === 'work' && currentSession.isRunning && currentSession.lastWorkSessionStartTime && currentSession.currentTime > 0) {
      sessionToLog = { ...currentSession }; 
    }

    const newSessions = activeSessions.filter(s => s.id !== sessionId);

    updateFirestore({ activeSessions: newSessions.map(cleanActiveSession) });

    if (sessionToLog) {
      setSessionToSummarize(sessionToLog);
    } else {
        toast({title: `Session "${projectNameForToast}" removed`});
    }

    if (timerRefs.current[sessionId]) { clearInterval(timerRefs.current[sessionId]!); delete timerRefs.current[sessionId]; }
    if (notificationSentRefs.current[sessionId]) delete notificationSentRefs.current[sessionId];
  }, [activeSessions, toast, updateFirestore]);

  const logSessionFromSummary = useCallback((session: ActiveSession, summary?: string) => {
      logWorkEntry(session, summary, { resetToDefault: true });
      setSessionToSummarize(null);
  }, [logWorkEntry]);

  const closeSummaryModal = useCallback(() => {
    if (sessionToSummarize) {
      toast({ title: "Logging Canceled", description: `"${sessionToSummarize.project}" session was not logged. Resuming timer.`, variant: "default" });
      
      // Resume the timer
      const newSessions = activeSessions.map(s => 
          s.id === sessionToSummarize.id ? { ...s, isRunning: true } : s
      );

      updateFirestore({ activeSessions: newSessions.map(cleanActiveSession) });
    }
    setSessionToSummarize(null);
  }, [sessionToSummarize, toast, activeSessions, updateFirestore]);

  const updateSettings = useCallback((newSettings: Partial<TimerSettings>) => { 
    const updatedSettings = { ...settings, ...newSettings };
    updateFirestore({ settings: updatedSettings });
  }, [settings, updateFirestore]);

  const undoDeleteLogEntry = useCallback(async (entry: LogEntry) => {
    await updateFirestore({ log: arrayUnion(entry) as any });
  }, [updateFirestore]);

  const deleteLogEntry = useCallback((id: string) => {
    const entryToDelete = log.find(entry => entry.id === id);
    if (!entryToDelete) return;
  
    updateFirestore({ log: arrayRemove(entryToDelete) as any });
  
    toast({
      title: "Entry deleted",
      onUndo: () => undoDeleteLogEntry(entryToDelete),
      duration: UNDO_TIMEOUT,
    });
  }, [log, updateFirestore, toast, undoDeleteLogEntry]);
  
  const openEditModal = useCallback((entry: LogEntry) => { setEntryToEdit(cleanLogEntry(entry)); setIsEditModalOpen(true); }, []);
  const closeEditModal = useCallback(() => { setIsEditModalOpen(false); setEntryToEdit(null); }, []);

  const updateLogEntry = useCallback((updatedEntryData: LogEntry) => {
    const cleanedUpdatedEntry = cleanLogEntry(updatedEntryData);
    
    const entryToUpdate = log.find(e => e.id === cleanedUpdatedEntry.id);
    if (entryToUpdate) {
        const newLog = log.map(entry => entry.id === cleanedUpdatedEntry.id ? cleanedUpdatedEntry : entry);
        updateFirestore({ log: newLog.map(cleanLogEntry) as any });
    }

    if (cleanedUpdatedEntry.project) updateRecentProjects(cleanedUpdatedEntry.project);
    toast({ title: "Entry updated successfully!" });
    closeEditModal();
  }, [toast, closeEditModal, updateRecentProjects, log, updateFirestore]);

  const addManualLogEntry = useCallback((newEntryData: Omit<LogEntry, 'id' | 'type' | 'sessionId'>) => {
    const newEntry: LogEntry = { ...newEntryData, id: `${Date.now()}-manual`, type: 'work' };
    const cleanedNewEntry = cleanLogEntry(newEntry);
    
    updateFirestore({ log: arrayUnion(cleanedNewEntry) as any });

    if (cleanedNewEntry.project) updateRecentProjects(cleanedNewEntry.project);
    toast({ title: "Manual entry added!" });
  }, [updateRecentProjects, toast, updateFirestore]);
  
  const openEditActiveSessionModal = useCallback((session: ActiveSession) => { setActiveSessionToEdit(cleanActiveSession(session)); setIsEditActiveSessionModalOpen(true); }, []);
  const closeEditActiveSessionModal = useCallback(() => { setIsEditActiveSessionModalOpen(false); setActiveSessionToEdit(null); }, []);
  
  const resetTimer = useCallback((sessionId: string) => {
    const newSessions = activeSessions.map(s => {
      if (s.id === sessionId) {
        if (timerRefs.current[s.id]) {
          clearInterval(timerRefs.current[s.id]!);
          timerRefs.current[s.id] = null;
        }
        // We also need to reset the notification flags for this session
        if (notificationSentRefs.current[s.id]) {
            notificationSentRefs.current[s.id] = { work: false, shortBreak: false, longBreak: false };
        }
        return { ...s, isRunning: false, currentTime: 0, lastWorkSessionStartTime: null };
      }
      return s;
    });
    updateFirestore({ activeSessions: newSessions.map(cleanActiveSession) });
  }, [activeSessions, updateFirestore]);

  const skipInterval = useCallback((sessionId: string) => {
    const session = activeSessions.find(s => s.id === sessionId);
    if (!session) return;

    // Log the current work session if it's being skipped
    if (session.currentInterval === 'work' && session.lastWorkSessionStartTime) {
      logWorkEntry(session);
    }

    const newSessions = activeSessions.map(s => {
      if (s.id === sessionId) {
        const newPomodorosCompleted = s.currentInterval === 'work' ? s.timersCompletedThisSet + 1 : s.timersCompletedThisSet;
        const isLongBreak = newPomodorosCompleted > 0 && newPomodorosCompleted % settings.timersPerSet === 0;
        
        let nextInterval: IntervalType;
        if (s.currentInterval === 'work') {
          nextInterval = isLongBreak ? 'longBreak' : 'shortBreak';
        } else {
          nextInterval = 'work';
        }

        if (timerRefs.current[s.id]) {
          clearInterval(timerRefs.current[s.id]!);
          timerRefs.current[s.id] = null;
        }
        
        // Reset notification flags for the new interval
        if (notificationSentRefs.current[s.id]) {
            notificationSentRefs.current[s.id] = { work: false, shortBreak: false, longBreak: false };
        }

        return {
          ...s,
          currentInterval: nextInterval,
          timersCompletedThisSet: nextInterval === 'work' ? s.timersCompletedThisSet : newPomodorosCompleted,
          currentTime: 0,
          isRunning: false,
          lastWorkSessionStartTime: null,
        };
      }
      return s;
    });
    updateFirestore({ activeSessions: newSessions.map(cleanActiveSession) });
  }, [activeSessions, settings.timersPerSet, updateFirestore, logWorkEntry]);

  const updateActiveSessionStartTime = useCallback((sessionId: string, newStartTime: number) => {""
    const newSessions = activeSessions.map(s => {
      if (s.id === sessionId && s.lastWorkSessionStartTime !== null) {
        const newCurrentTime = Math.max(0, Math.round((Date.now() - newStartTime) / 1000));
        if (notificationSentRefs.current[s.id]) notificationSentRefs.current[s.id].work = false;
        return { ...s, lastWorkSessionStartTime: newStartTime, currentTime: newCurrentTime };
      }
      return s;
    });

    updateFirestore({ activeSessions: newSessions.map(cleanActiveSession) });
    
    closeEditActiveSessionModal();
    toast({ title: "Start time updated!" });
  }, [closeEditActiveSessionModal, toast, activeSessions, updateFirestore]);

  const updateSessionTasks = useCallback((sessionId: string, newTasks: Task[]) => {
      const newSessions = activeSessions.map(session =>
        session.id === sessionId ? { ...session, tasks: newTasks } : session
      );
      updateFirestore({ activeSessions: newSessions.map(cleanActiveSession) });
  }, [activeSessions, updateFirestore]);

  const addTaskToSession = useCallback((sessionId: string, text: string) => {
    const session = activeSessions.find(s => s.id === sessionId);
    if (!session) return;
    const newTask = cleanTask({ id: Date.now().toString(), text, completed: false });
    const newTasks = [newTask, ...session.tasks];
    updateSessionTasks(sessionId, newTasks);
  }, [activeSessions, updateSessionTasks]);
  
  const toggleTaskInSession = useCallback((sessionId: string, taskId: string) => {
    const session = activeSessions.find(s => s.id === sessionId);
    if (!session) return;
    const newTasks = session.tasks.map((task: Task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    updateSessionTasks(sessionId, newTasks);
  }, [activeSessions, updateSessionTasks]);
  
  const deleteTaskFromSession = useCallback((sessionId: string, taskId: string) => {
    const session = activeSessions.find(s => s.id === sessionId);
    if (!session) return;
    const newTasks = session.tasks.filter((task: Task) => task.id !== taskId);
    updateSessionTasks(sessionId, newTasks);
  }, [activeSessions, updateSessionTasks]);

  const getLogEntriesForPeriod = useCallback((log: LogEntry[], filter: TimeFilter, range?: DateRange): LogEntry[] => {
    const now = new Date();
    switch (filter) {
      case 'today':
        return log.filter(entry => isToday(parseISO(entry.endTime)));
      case 'thisWeek':
        return log.filter(entry => isWithinInterval(parseISO(entry.endTime), { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }));
      case 'thisMonth':
        return log.filter(entry => isWithinInterval(parseISO(entry.endTime), { start: startOfMonth(now), end: endOfMonth(now) }));
      case 'custom':
        if (range?.from) {
          const start = startOfDay(range.from);
          const end = range.to ? endOfDay(range.to) : endOfDay(range.from);
          return log.filter(entry => isWithinInterval(parseISO(entry.endTime), { start, end }));
        }
        return [];
      default:
        return log;
    }
  }, []);

  const filteredLogForPeriod = useMemo(() => {
    if (!isClient || isDataLoading) return [];
    return getLogEntriesForPeriod(log, activeFilter, customDateRange);
  }, [log, activeFilter, customDateRange, isClient, isDataLoading, getLogEntriesForPeriod]);


  const processedChartData = useMemo((): ChartDataPoint[] => {
    const aggregation: Record<string, number> = {};
    filteredLogForPeriod.forEach(entry => {
      const projectName = entry.project || 'No Project';
      aggregation[projectName] = (aggregation[projectName] || 0) + entry.duration;
    });
    return Object.entries(aggregation).map(([name, totalMinutes]) => ({ name, totalMinutes })).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [filteredLogForPeriod]);

  const insightsStats = useMemo((): InsightsStatsData => {
    const totalMinutes = filteredLogForPeriod.reduce((sum, entry) => sum + entry.duration, 0);
    const totalSessions = filteredLogForPeriod.length;
    const averageSessionMinutes = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
    return { totalMinutes, totalSessions, averageSessionMinutes };
  }, [filteredLogForPeriod]);

  const generatePeriodSummary = useCallback(async () => {
    if (filteredLogForPeriod.length === 0) {
        toast({ title: "No Data", description: "There is no data in the selected period to summarize." });
        return;
    }
    setIsGeneratingSummary(true);
    try {
        let summary;
        if (isPremium) {
            const result = await summarizePeriod({ entries: filteredLogForPeriod });
            summary = result.periodSummary;
        } else {
            summary = "This is a sample summary. Upgrade to Premium to get personalized summaries of your work periods based on your actual data and accomplishments.";
        }
        setPeriodSummary(summary);
        setIsPeriodSummaryModalOpen(true);
    } catch (error) {
        console.error("AI period summarization failed.", error);
        toast({ title: "Error", description: "Could not generate summary.", variant: "destructive" });
    } finally {
        setIsGeneratingSummary(false);
    }
  }, [filteredLogForPeriod, isPremium, toast]);

  const closePeriodSummaryModal = useCallback(() => {
    setIsPeriodSummaryModalOpen(false);
    setPeriodSummary(null);
  }, []);

  const populateTestData = useCallback(() => {
    const now = new Date();
    const testLogEntries: LogEntry[] = [];
    const testProjects = ['Client A Website', 'Internal Dashboard', 'Q3 Financials', 'Mobile App Design', 'API Integration'];

    const createEntry = (date: Date, project: string, duration: number, tasks: string[]): LogEntry => {
      const endTime = date;
      const startTime = new Date(endTime.getTime() - duration * 60 * 1000);
      return {
        id: `${endTime.getTime()}-${project.replace(/\s/g, '')}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        type: 'work',
        duration,
        project,
        summary: `Completed: ${tasks.join(', ')}.`,
      };
    };

    // Today
    testLogEntries.push(createEntry(new Date(now.getTime() - 1 * 60 * 60 * 1000), testProjects[0], 25, ['Deployed staging environment', 'Fixed hero banner bug']));
    testLogEntries.push(createEntry(new Date(now.getTime() - 3 * 60 * 60 * 1000), testProjects[1], 50, ['Implemented new charting library', 'Added user authentication endpoints']));
    // Yesterday
    testLogEntries.push(createEntry(subDays(now, 1), testProjects[0], 45, ['Wireframed the new landing page', 'Met with stakeholders for feedback']));
    testLogEntries.push(createEntry(subDays(now, 1), testProjects[2], 30, ['Finalized Q3 expense report']));
    // This week
    testLogEntries.push(createEntry(subDays(now, 3), testProjects[3], 60, ['Created high-fidelity mockups for the iOS app', 'Designed app icon']));
    // Last week
    testLogEntries.push(createEntry(subWeeks(now, 1), testProjects[1], 90, ['Refactored database schema', 'Optimized slow-running queries']));
    testLogEntries.push(createEntry(subWeeks(now, 1), testProjects[4], 20, ['Tested the payment gateway integration']));
    // This month (but > 1 week ago)
    testLogEntries.push(createEntry(subWeeks(now, 2), testProjects[2], 75, ['Drafted the Q3 P&L statement', 'Prepared slides for the financial review']));
    // Last month
    testLogEntries.push(createEntry(subMonths(now, 1), testProjects[0], 120, ['Launched the new marketing website', 'Monitored initial analytics and performance']));
    testLogEntries.push(createEntry(subMonths(now, 1), testProjects[3], 40, ['Created user flow diagrams for the new checkout process']));

    const cleanedEntries = testLogEntries.map(cleanLogEntry);
    const existingIds = new Set(log.map(e => e.id));
    const newEntries = cleanedEntries.filter(e => !existingIds.has(e.id));
    
    const combinedLog = [...log, ...newEntries];
    updateFirestore({ log: combinedLog.map(cleanLogEntry) });

    updateRecentProjects(testProjects[0]);
    updateRecentProjects(testProjects[1]);
    updateRecentProjects(testProjects[2]);
    updateRecentProjects(testProjects[3]);
    updateRecentProjects(testProjects[4]);

    toast({ title: "Test Data Populated!", description: "10 new log entries added." });
  }, [toast, log, updateFirestore, updateRecentProjects]);

  const removeRecentProject = useCallback((projectName: string) => {
    const updatedRecent = recentProjects.filter(p => p !== projectName);
    updateFirestore({ recentProjects: updatedRecent });
    toast({
      title: "Project Removed",
      description: `"${projectName}" has been removed from your recent projects.`,
    });
  }, [toast, recentProjects, updateFirestore]);

  const wipeAllData = useCallback(() => {
    // Clear local state
    setLog([]);
    setActiveSessions([]);
    setRecentProjects([]);
    setSettings(DEFAULT_SETTINGS);
    
    // Clear localStorage
    localStorage.removeItem(LOCAL_LOG_KEY);
    localStorage.removeItem(LOCAL_ACTIVE_SESSIONS_KEY);
    localStorage.removeItem(LOCAL_RECENT_PROJECTS_KEY);
    localStorage.removeItem(LOCAL_SETTINGS_KEY);


    if (currentUser) {
      updateFirestore({
        log: [],
        activeSessions: [],
        recentProjects: [],
        settings: DEFAULT_SETTINGS,
      });
    }

    setIsWipeConfirmOpen(false);
    toast({
      title: "All Data Wiped",
      description: "Your local and cloud-synced data has been cleared.",
      variant: "destructive"
    });
  }, [currentUser, updateFirestore, toast]);


  useEffect(() => {
    const anySessionOnBreak = activeSessions.some(s => s.currentInterval === 'shortBreak' || s.currentInterval === 'longBreak');
    if (anySessionOnBreak && !isFetchingQuote) {
      const needsFreshQuote = !motivationalQuote || (motivationalQuote.source === "Adagio" && isPremium);
      if (needsFreshQuote) fetchAndSetQuote();
    }
  }, [activeSessions, motivationalQuote, isFetchingQuote, fetchAndSetQuote, isPremium]);

  const openEntriesModal = useCallback((projectName: string) => {
    setSelectedChartProject(projectName);
    setIsEntriesModalOpen(true);
  }, []);

  const closeEntriesModal = useCallback(() => {
    setIsEntriesModalOpen(false);
    setSelectedChartProject(null);
  }, []);

  const entriesForModal = useMemo(() => {
    if (!selectedChartProject) return [];
    
    const entriesInPeriod = getLogEntriesForPeriod(log, activeFilter, customDateRange);

    return entriesInPeriod.filter(entry => (entry.project || 'No Project') === selectedChartProject);
  }, [selectedChartProject, log, getLogEntriesForPeriod, activeFilter, customDateRange]);

  const openSettingsModal = useCallback(() => setIsSettingsModalOpen(true), []);
  const closeSettingsModal = useCallback(() => setIsSettingsModalOpen(false), []);

  // Media Session API for lock screen controls
  useEffect(() => {
    if (!isClient || !('mediaSession' in navigator)) {
      return;
    }

    const firstRunningSession = activeSessions.find(s => s.isRunning);

    if (firstRunningSession) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: firstRunningSession.project,
        artist: `Adagio - ${formatTime(firstRunningSession.currentTime)}`,
        album: 'Timer',
        artwork: [
          { src: '/icons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      });

      navigator.mediaSession.playbackState = 'playing';

      try {
        navigator.mediaSession.setActionHandler('play', () => startTimer(firstRunningSession.id));
        navigator.mediaSession.setActionHandler('pause', () => pauseTimer(firstRunningSession.id));
        if (firstRunningSession.currentInterval === 'work') {
          navigator.mediaSession.setActionHandler('stop', () => logWorkEntry(firstRunningSession));
        } else {
            navigator.mediaSession.setActionHandler('stop', null);
        }
      } catch (error) {
        console.error("Error setting media session action handlers:", error);
      }

    } else {
      // Clear media session when no timer is running
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('stop', null);
      } catch (error) {
         console.error("Error clearing media session action handlers:", error);
      }
    }
  }, [activeSessions, isClient, startTimer, pauseTimer, formatTime, logWorkEntry]);


  return {
    settings, updateSettings, activeSessions, log, 
    addTaskToSession, toggleTaskInSession, deleteTaskFromSession,
    addSession, removeSession, startTimer, pauseTimer,
    deleteLogEntry, formatTime, isClient, recentProjects, motivationalQuote, isFetchingQuote,
    activeFilter, setActiveFilter, processedChartData, insightsStats, isEditModalOpen, entryToEdit, openEditModal,
    closeEditModal, updateLogEntry, addManualLogEntry, populateTestData, isDataLoading,
    isEditActiveSessionModalOpen, activeSessionToEdit, openEditActiveSessionModal, closeEditActiveSessionModal, updateActiveSessionStartTime,
    resetTimer, skipInterval,
    sessionToSummarize, logSessionFromSummary, removeRecentProject, closeSummaryModal,
    inputProjectName, setInputProjectName,
    customDateRange, setCustomDateRange,
    isEntriesModalOpen, openEntriesModal, closeEntriesModal, entriesForModal, selectedChartProject,
    isSettingsModalOpen, openSettingsModal, closeSettingsModal,
    isWipeConfirmOpen, setIsWipeConfirmOpen, wipeAllData,
    hasExceededFreeLogLimit,
    isShortSessionConfirmOpen, closeShortSessionConfirm,

    isGeneratingSummary, generatePeriodSummary, periodSummary, isPeriodSummaryModalOpen, closePeriodSummaryModal,
    filteredLogForPeriod,
  };
}
