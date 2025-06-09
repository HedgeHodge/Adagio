
"use client";

import type { PomodoroSettings, PomodoroLogEntry, IntervalType, TimeFilter, ChartDataPoint } from '@/types/pomodoro';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { getMotivationalQuote, type MotivationalQuoteOutput } from '@/ai/flows/motivational-quote-flow';
import { isToday, isWithinInterval, startOfWeek, endOfWeek, parseISO, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25, // minutes for suggestion
  shortBreakDuration: 5, // minutes for suggestion
  longBreakDuration: 15, // minutes for suggestion
  pomodorosPerSet: 4,
};

const SETTINGS_KEY = 'pomodoroSettings';
const LOG_KEY = 'pomodoroLog';
const PROJECT_KEY = 'currentProject';

export function usePomodoro() {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [currentTime, setCurrentTime] = useState<number>(0); // Counts up
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentInterval, setCurrentInterval] = useState<IntervalType>('work');
  const [pomodorosCompletedThisSet, setPomodorosCompletedThisSet] = useState<number>(0);
  const [pomodoroLog, setPomodoroLog] = useState<PomodoroLogEntry[]>([]);
  const [currentProject, setCurrentProjectState] = useState<string>('');
  const [motivationalQuote, setMotivationalQuote] = useState<MotivationalQuoteOutput | null>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('today');
  const [lastWorkSessionStartTime, setLastWorkSessionStartTime] = useState<number | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLogEntryForEdit, setSelectedLogEntryForEdit] = useState<PomodoroLogEntry | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notificationSentRef = useRef<Record<IntervalType, boolean>>({ work: false, shortBreak: false, longBreak: false });
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
      const storedLog = localStorage.getItem(LOG_KEY);
      if (storedLog) {
        setPomodoroLog(JSON.parse(storedLog));
      }
      const storedProject = localStorage.getItem(PROJECT_KEY);
      if (storedProject) {
        setCurrentProjectState(storedProject);
      }
      audioRef.current = new Audio('/sounds/notification.mp3');
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  }, [settings, isClient]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(LOG_KEY, JSON.stringify(pomodoroLog));
    }
  }, [pomodoroLog, isClient]);

  const setCurrentProject = useCallback((project: string) => {
    setCurrentProjectState(project);
    if (isClient) {
      localStorage.setItem(PROJECT_KEY, project);
    }
  }, [isClient]);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(error => console.warn("Audio play failed:", error));
    }
  }, []);

  const fetchAndSetQuote = async () => {
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
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setCurrentTime(prevTime => {
          const newTime = prevTime + 1;

          if (currentInterval === 'work' && !notificationSentRef.current.work && newTime >= settings.workDuration * 60) {
            toast({ title: "Focus Period Suggestion", description: `Consider taking a short break. You've been working for ${settings.workDuration} minutes.` });
            playNotificationSound();
            notificationSentRef.current.work = true;
          } else if (currentInterval === 'shortBreak' && !notificationSentRef.current.shortBreak && newTime >= settings.shortBreakDuration * 60) {
            toast({ title: "Break Over Suggestion", description: `Your ${settings.shortBreakDuration}-minute short break is up. Ready to focus again?` });
            playNotificationSound();
            notificationSentRef.current.shortBreak = true;
          } else if (currentInterval === 'longBreak' && !notificationSentRef.current.longBreak && newTime >= settings.longBreakDuration * 60) {
            toast({ title: "Break Over Suggestion", description: `Your ${settings.longBreakDuration}-minute long break is up. Time to get back to it!` });
            playNotificationSound();
            notificationSentRef.current.longBreak = true;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, settings, currentInterval, toast, playNotificationSound]);


  const startTimer = useCallback(() => {
    setIsRunning(true);
    if (currentInterval === 'work' && currentTime === 0 && lastWorkSessionStartTime === null) {
      setLastWorkSessionStartTime(Date.now());
    } else if (currentInterval === 'work' && lastWorkSessionStartTime === null) {
      setLastWorkSessionStartTime(Date.now() - currentTime * 1000);
    }
  }, [currentInterval, currentTime, lastWorkSessionStartTime]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setCurrentTime(0);
    notificationSentRef.current = { work: false, shortBreak: false, longBreak: false };
    if (currentInterval === 'work') {
      setLastWorkSessionStartTime(null);
    }
  }, [currentInterval]);

  const switchMode = useCallback(() => {
    setIsRunning(false);
    const now = Date.now();
    let nextInterval: IntervalType;

    if (currentInterval === 'work') {
      if (lastWorkSessionStartTime && currentTime > 0) {
        const newLogEntry: PomodoroLogEntry = {
          id: now.toString(),
          startTime: new Date(lastWorkSessionStartTime).toISOString(),
          endTime: new Date(now).toISOString(),
          type: 'work',
          duration: Math.round(currentTime / 60),
          project: currentProject || undefined,
        };
        setPomodoroLog(prevLog => [newLogEntry, ...prevLog]);
        toast({ title: "Work session logged!", description: `Duration: ${formatTime(currentTime)}` });
      }

      const newCompletedPomodoros = pomodorosCompletedThisSet + 1;
      setPomodorosCompletedThisSet(newCompletedPomodoros);

      if (newCompletedPomodoros % settings.pomodorosPerSet === 0) {
        nextInterval = 'longBreak';
      } else {
        nextInterval = 'shortBreak';
      }
      fetchAndSetQuote();
    } else { 
      nextInterval = 'work';
      setMotivationalQuote(null);
      if (currentInterval === 'longBreak') {
        setPomodorosCompletedThisSet(0);
      }
    }

    setCurrentInterval(nextInterval);
    setCurrentTime(0);
    setLastWorkSessionStartTime(nextInterval === 'work' ? now : null);
    notificationSentRef.current = { work: false, shortBreak: false, longBreak: false };
  }, [currentInterval, lastWorkSessionStartTime, currentTime, pomodorosCompletedThisSet, settings, toast, currentProject, fetchAndSetQuote]);


  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const deleteLogEntry = useCallback((id: string) => {
    setPomodoroLog(prevLog => prevLog.filter(entry => entry.id !== id));
    toast({ title: "Session deleted", variant: "destructive" });
  }, [toast]);

  const openEditModal = useCallback((entry: PomodoroLogEntry) => {
    setSelectedLogEntryForEdit(entry);
    setIsEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedLogEntryForEdit(null);
  }, []);

  const updateLogEntry = useCallback((updatedEntry: PomodoroLogEntry) => {
    setPomodoroLog(prevLog => 
      prevLog.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry)
    );
    toast({ title: "Session updated successfully!" });
    closeEditModal();
  }, [toast, closeEditModal]);


  const formatTime = (timeInSeconds: number): string => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    
    let formatted = '';
    if (hours > 0) {
      formatted += `${hours.toString().padStart(2, '0')}:`;
    }
    formatted += `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return formatted;
  };

  const processedChartData = useMemo((): ChartDataPoint[] => {
    if (!isClient) return [];

    const now = new Date();
    let filteredLog: PomodoroLogEntry[];

    switch (activeFilter) {
      case 'today':
        filteredLog = pomodoroLog.filter(entry => isToday(parseISO(entry.endTime)));
        break;
      case 'thisWeek':
        filteredLog = pomodoroLog.filter(entry =>
          isWithinInterval(parseISO(entry.endTime), {
            start: startOfWeek(now, { weekStartsOn: 1 }),
            end: endOfWeek(now, { weekStartsOn: 1 }),
          })
        );
        break;
      case 'thisMonth':
         filteredLog = pomodoroLog.filter(entry =>
          isWithinInterval(parseISO(entry.endTime), {
            start: startOfMonth(now),
            end: endOfMonth(now),
          })
        );
        break;
      default:
        filteredLog = pomodoroLog;
    }

    const aggregation: Record<string, number> = {};
    filteredLog.forEach(entry => {
      const projectName = entry.project || 'No Project';
      aggregation[projectName] = (aggregation[projectName] || 0) + entry.duration;
    });

    return Object.entries(aggregation)
      .map(([name, totalMinutes]) => ({ name, totalMinutes }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [pomodoroLog, activeFilter, isClient]);

  const createTestDataEntry = (idSuffix: string, baseTime: Date, daysAgo: number, hour: number, minute: number, durationMinutes: number, project?: string): PomodoroLogEntry => {
    const startTime = new Date(baseTime);
    startTime.setDate(baseTime.getDate() - daysAgo);
    startTime.setHours(hour, minute, 0, 0);
  
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
    return {
      id: `${startTime.getTime()}-${idSuffix}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      type: 'work',
      duration: durationMinutes,
      project: project,
    };
  };
  
  const populateTestData = useCallback(() => {
    const now = new Date();
    const testData: PomodoroLogEntry[] = [
      // Today
      createTestDataEntry('td1', now, 0, 9, 0, 25, 'Project Phoenix'),
      createTestDataEntry('td2', now, 0, 10, 30, 50, 'Project Phoenix'),
      createTestDataEntry('td3', now, 0, 14, 0, 45), // No project
      // Yesterday
      createTestDataEntry('yd1', now, 1, 11, 0, 60, 'Project Chimera'),
      createTestDataEntry('yd2', now, 1, 15, 0, 30, 'Project Phoenix'),
      // This week (but not today/yesterday)
      createTestDataEntry('tw1', now, 3, 10, 0, 90, 'Adagio App'),
      createTestDataEntry('tw2', now, 4, 16, 0, 55, 'Client Meeting Prep'),
       // Last week
      createTestDataEntry('lw1', now, 8, 9, 30, 120, 'Project Chimera'),
      createTestDataEntry('lw2', now, 10, 14,0, 40), // No project
      // This month (but not this week)
      createTestDataEntry('tm1', now, 15, 13, 0, 75, 'Project Phoenix'),
      createTestDataEntry('tm2', now, 20, 10, 0, 60, 'Adagio App'),
    ];

    // Filter out any entries that might be in the future if "now" is close to midnight
    const validTestData = testData.filter(entry => parseISO(entry.endTime) <= now);

    setPomodoroLog(prevLog => {
      const existingIds = new Set(prevLog.map(e => e.id));
      const newUniqueEntries = validTestData.filter(e => !existingIds.has(e.id));
      return [...newUniqueEntries, ...prevLog];
    });
    toast({ title: "Test Data Added", description: `${validTestData.length} sample sessions have been added to your log.` });
  }, [toast]);


  return {
    settings,
    updateSettings,
    currentTime,
    isRunning,
    currentInterval,
    pomodorosCompletedThisSet,
    pomodoroLog,
    deleteLogEntry,
    startTimer,
    pauseTimer,
    resetTimer,
    switchMode,
    formatTime,
    isClient,
    currentProject,
    setCurrentProject,
    motivationalQuote,
    isFetchingQuote,
    activeFilter,
    setActiveFilter,
    processedChartData,
    isEditModalOpen,
    selectedLogEntryForEdit,
    openEditModal,
    closeEditModal,
    updateLogEntry,
    populateTestData,
  };
}

    