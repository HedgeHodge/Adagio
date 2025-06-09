
"use client";

import type { PomodoroSettings, PomodoroLogEntry, IntervalType, TimeFilter, ChartDataPoint } from '@/types/pomodoro';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { getMotivationalQuote, type MotivationalQuoteOutput } from '@/ai/flows/motivational-quote-flow';
import { isToday, isWithinInterval, startOfWeek, endOfWeek, parseISO, startOfMonth, endOfMonth } from 'date-fns';

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  pomodorosPerSet: 4,
};

const SETTINGS_KEY = 'pomodoroSettings';
const LOG_KEY = 'pomodoroLog';
const PROJECT_KEY = 'currentProject'; // Key for storing current project

export function usePomodoro() {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [currentTime, setCurrentTime] = useState<number>(settings.workDuration * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentInterval, setCurrentInterval] = useState<IntervalType>('work');
  const [pomodorosCompletedThisSet, setPomodorosCompletedThisSet] = useState<number>(0);
  const [pomodoroLog, setPomodoroLog] = useState<PomodoroLogEntry[]>([]);
  const [currentProject, setCurrentProjectState] = useState<string>('');
  const [motivationalQuote, setMotivationalQuote] = useState<MotivationalQuoteOutput | null>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('today');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings(parsedSettings);
        setCurrentTime(parsedSettings.workDuration * 60);
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
      if (!isRunning) {
         if (currentInterval === 'work') setCurrentTime(settings.workDuration * 60);
         else if (currentInterval === 'shortBreak') setCurrentTime(settings.shortBreakDuration * 60);
         else if (currentInterval === 'longBreak') setCurrentTime(settings.longBreakDuration * 60);
      }
    }
  }, [settings, isClient, isRunning, currentInterval]);

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

  const handleIntervalEnd = useCallback(() => {
    playNotificationSound();
    setIsRunning(false);

    let nextInterval: IntervalType;
    let completedPomodoros = pomodorosCompletedThisSet;

    if (currentInterval === 'work') {
      const newLogEntry: PomodoroLogEntry = {
        id: Date.now().toString(),
        startTime: new Date(Date.now() - settings.workDuration * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
        type: 'work',
        duration: settings.workDuration,
        project: currentProject || undefined,
      };
      setPomodoroLog(prevLog => [newLogEntry, ...prevLog]);
      completedPomodoros++;
      setPomodorosCompletedThisSet(completedPomodoros);
      toast({ title: "Work session complete!", description: "Time for a break." });

      if (completedPomodoros % settings.pomodorosPerSet === 0) {
        nextInterval = 'longBreak';
      } else {
        nextInterval = 'shortBreak';
      }
      fetchAndSetQuote(); 
    } else { 
      nextInterval = 'work';
      if (currentInterval === 'longBreak') {
        setPomodorosCompletedThisSet(0); 
      }
      toast({ title: "Break's over!", description: "Let's get back to work." });
      setMotivationalQuote(null); 
    }
    
    setCurrentInterval(nextInterval);
    switch (nextInterval) {
      case 'work':
        setCurrentTime(settings.workDuration * 60);
        break;
      case 'shortBreak':
        setCurrentTime(settings.shortBreakDuration * 60);
        break;
      case 'longBreak':
        setCurrentTime(settings.longBreakDuration * 60);
        break;
    }
  }, [currentInterval, pomodorosCompletedThisSet, settings, playNotificationSound, toast, currentProject]);


  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setCurrentTime(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current!);
            handleIntervalEnd();
            return 0;
          }
          return prevTime - 1;
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
  }, [isRunning, handleIntervalEnd]);


  const startTimer = useCallback(() => {
    setIsRunning(true);
    if (currentInterval !== 'work') {
      setMotivationalQuote(null); 
    }
  }, [currentInterval]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (currentInterval !== 'work') { 
        fetchAndSetQuote();
    } else {
        setMotivationalQuote(null);
    }
    switch (currentInterval) {
      case 'work':
        setCurrentTime(settings.workDuration * 60);
        break;
      case 'shortBreak':
        setCurrentTime(settings.shortBreakDuration * 60);
        break;
      case 'longBreak':
        setCurrentTime(settings.longBreakDuration * 60);
        break;
    }
  }, [currentInterval, settings]);

  const skipInterval = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    handleIntervalEnd(); 
  }, [handleIntervalEnd]);

  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const deleteLogEntry = useCallback((id: string) => {
    setPomodoroLog(prevLog => prevLog.filter(entry => entry.id !== id));
    toast({ title: "Session deleted", variant: "destructive" });
  }, [toast]);

  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const currentProgress = (): number => {
    let totalDuration;
    switch (currentInterval) {
      case 'work': totalDuration = settings.workDuration * 60; break;
      case 'shortBreak': totalDuration = settings.shortBreakDuration * 60; break;
      case 'longBreak': totalDuration = settings.longBreakDuration * 60; break;
      default: totalDuration = 1; 
    }
    if (totalDuration === 0) return 0; 
    return ((totalDuration - currentTime) / totalDuration) * 100;
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
        filteredLog = pomodoroLog; // Should not happen with typed TimeFilter
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
    skipInterval,
    formatTime,
    currentProgress,
    isClient,
    currentProject,
    setCurrentProject,
    motivationalQuote,
    isFetchingQuote,
    activeFilter,
    setActiveFilter,
    processedChartData,
  };
}
