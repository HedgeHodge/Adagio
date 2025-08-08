



import { useState, useEffect, useCallback, useRef } from 'react';
import { PomodoroSettings, ActivePomodoroSession, IntervalType, LogEntry, Task } from '../types/pomodoro';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { subDays, isAfter, parseISO } from 'date-fns';

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  timersPerSet: 4,
};

const FREE_USER_LOG_HISTORY_DAYS = 3;

export function useTimer() {
  const { currentUser, isPremium } = useAuth();
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [activeSession, setActiveSession] = useState<ActivePomodoroSession | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const filterLogForFreeTier = useCallback((log: LogEntry[]): LogEntry[] => {
    const cutoffDate = subDays(new Date(), FREE_USER_LOG_HISTORY_DAYS);
    return log.filter(entry => isAfter(parseISO(entry.endTime), cutoffDate));
  }, []);

  const updateFirestore = useCallback(async (data: any) => {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userDocRef, { ...data, lastUpdated: Timestamp.now() });
    } catch (error) {
      await setDoc(userDocRef, { ...data, lastUpdated: Timestamp.now() }, { merge: true });
      console.error("Error updating Firestore, attempting to set.", error);
    }
  }, [currentUser]);

  const logWorkEntry = useCallback(async (session: ActivePomodoroSession) => {
    const now = new Date();
    const duration = Math.round(session.totalWorkTime / 60);

    if (duration < 1) {
      return;
    }

    const newLogEntry: LogEntry = {
      id: `${now.getTime()}-${session.id}`,
      startTime: new Date(session.lastWorkSessionStartTime!).toISOString(),
      endTime: now.toISOString(),
      type: 'work',
      duration: duration,
      project: session.project,
      sessionId: session.id,
    };

    const newLog = [...log, newLogEntry];
    if (currentUser) {
      updateFirestore({ log: newLog });
    }
    setLog(isPremium ? newLog : filterLogForFreeTier(newLog));
  }, [log, currentUser, isPremium, updateFirestore, filterLogForFreeTier]);

  const advanceInterval = useCallback(() => {
    if (!activeSession) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (activeSession.currentInterval === 'work') {
      logWorkEntry(activeSession);
    }

    const newTimersCompletedThisSet = activeSession.timersCompletedThisSet + (activeSession.currentInterval === 'work' ? 1 : 0);
    const isLongBreak = newTimersCompletedThisSet > 0 && newTimersCompletedThisSet % settings.timersPerSet === 0;

    let nextInterval: IntervalType = 'work';
    let nextDuration = 0;

    if (activeSession.currentInterval === 'work') {
      nextInterval = isLongBreak ? 'longBreak' : 'shortBreak';
      nextDuration = (isLongBreak ? settings.longBreakDuration : settings.shortBreakDuration) * 60;
    } else {
      nextInterval = 'work';
      nextDuration = settings.workDuration * 60;
    }

    setActiveSession(prevSession => {
      if (!prevSession) return null;
      return {
        ...prevSession,
        isRunning: true,
        currentInterval: nextInterval,
        timersCompletedThisSet: newTimersCompletedThisSet,
        currentTime: nextDuration,
        lastWorkSessionStartTime: nextInterval === 'work' ? Date.now() : null,
      };
    });
  }, [settings, activeSession, logWorkEntry]);

  useEffect(() => {
    if (activeSession?.isRunning) {
      timerRef.current = setInterval(() => {
        setActiveSession(prevSession => {
          if (!prevSession || !prevSession.isRunning) {
            if (timerRef.current) clearInterval(timerRef.current);
            return prevSession;
          }

          let newTime;
          let newTotalWorkTime = prevSession.totalWorkTime;

          if (prevSession.currentInterval === 'work') {
            newTime = prevSession.currentTime + 1;
            newTotalWorkTime = newTotalWorkTime + 1;
          } else {
            newTime = prevSession.currentTime - 1;
          }

          if (prevSession.currentInterval !== 'work' && newTime < 0) {
            advanceInterval();
            return prevSession;
          }

          return { ...prevSession, currentTime: newTime, totalWorkTime: newTotalWorkTime };
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [activeSession?.isRunning, advanceInterval]);

  useEffect(() => {
    if (!currentUser) {
      setLog([]);
      return;
    }

    const userDocRef = doc(db, 'users', currentUser.uid);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const cloudLog = data.log || [];
        setLog(isPremium ? cloudLog : filterLogForFreeTier(cloudLog));
        setSettings(data.settings || DEFAULT_SETTINGS);
        setActiveSession(data.activeSession || null);
      }
    });

    return () => unsubscribe();
  }, [currentUser, isPremium, filterLogForFreeTier]);

  const startTimer = useCallback(() => {
    if (!activeSession) {
      const newSession: ActivePomodoroSession = {
        id: Date.now().toString(),
        project: 'Work',
        tasks: [],
        currentInterval: 'work',
        currentTime: 0,
        totalWorkTime: 0,
        isRunning: true,
        timersCompletedThisSet: 0,
        lastWorkSessionStartTime: Date.now(),
      };
      setActiveSession(newSession);
      if (currentUser) {
        updateFirestore({ activeSession: newSession });
      }
    } else {
      const newSession = { ...activeSession, isRunning: true };
      setActiveSession(newSession);
      if (currentUser) {
        updateFirestore({ activeSession: newSession });
      }
    }
  }, [activeSession, currentUser, updateFirestore]);

  const pauseTimer = useCallback(() => {
    const newSession = { ...activeSession, isRunning: false };
    setActiveSession(newSession as ActivePomodoroSession);
    if (currentUser) {
      updateFirestore({ activeSession: newSession });
    }
  }, [activeSession, currentUser, updateFirestore]);

  const resetTimer = useCallback(() => {
    const newSession = {
      ...activeSession,
      isRunning: false,
      currentTime: settings.workDuration * 60,
      currentInterval: 'work',
      timersCompletedThisSet: 0,
      totalWorkTime: 0,
      lastWorkSessionStartTime: null,
    };
    setActiveSession(newSession as ActivePomodoroSession);
    if (currentUser) {
      updateFirestore({ activeSession: newSession });
    }
  }, [settings, activeSession, currentUser, updateFirestore]);

  const addTask = useCallback((text: string) => {
    if (!activeSession) return;
    const newTask: Task = { id: Date.now().toString(), text, completed: false };
    const newTasks = [...activeSession.tasks, newTask];
    const newSession = { ...activeSession, tasks: newTasks };
    setActiveSession(newSession);
    if (currentUser) {
      updateFirestore({ activeSession: newSession });
    }
  }, [activeSession, currentUser, updateFirestore]);

  const toggleTask = useCallback((taskId: string) => {
    if (!activeSession) return;
    const newTasks = activeSession.tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    const newSession = { ...activeSession, tasks: newTasks };
    setActiveSession(newSession);
    if (currentUser) {
      updateFirestore({ activeSession: newSession });
    }
  }, [activeSession, currentUser, updateFirestore]);

  const deleteTask = useCallback((taskId: string) => {
    if (!activeSession) return;
    const newTasks = activeSession.tasks.filter(task => task.id !== taskId);
    const newSession = { ...activeSession, tasks: newTasks };
    setActiveSession(newSession);
    if (currentUser) {
      updateFirestore({ activeSession: newSession });
    }
  }, [activeSession, currentUser, updateFirestore]);

  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    if (currentUser) {
      updateFirestore({ settings: updatedSettings });
    }
  }, [settings, currentUser, updateFirestore]);

  const formatTime = useCallback((timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    settings,
    activeSession,
    log,
    startTimer,
    pauseTimer,
    resetTimer,
    formatTime,
    addTask,
    toggleTask,
    deleteTask,
    updateSettings,
  };
}



