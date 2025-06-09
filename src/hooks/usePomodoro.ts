
"use client";

import type { PomodoroSettings, PomodoroLogEntry, IntervalType, TimeFilter, ChartDataPoint } from '@/types/pomodoro';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { getMotivationalQuote, type MotivationalQuoteOutput } from '@/ai/flows/motivational-quote-flow';
import { isToday, isWithinInterval, startOfWeek, endOfWeek, parseISO, startOfMonth, endOfMonth } from 'date-fns';

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25, // minutes for suggestion
  shortBreakDuration: 5, // minutes for suggestion
  longBreakDuration: 15, // minutes for suggestion
  pomodorosPerSet: 4,
};

const SETTINGS_KEY = 'pomodoroSettings';
const LOG_KEY = 'pomodoroLog';
const PROJECT_KEY = 'currentProject';
const RECENT_PROJECTS_KEY = 'recentProjects';
const MAX_RECENT_PROJECTS = 5;


export function usePomodoro() {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [currentTime, setCurrentTime] = useState<number>(0); // Counts up
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentInterval, setCurrentInterval] = useState<IntervalType>('work');
  const [pomodorosCompletedThisSet, setPomodorosCompletedThisSet] = useState<number>(0);
  const [pomodoroLog, setPomodoroLog] = useState<PomodoroLogEntry[]>([]);
  const [currentProject, setCurrentProjectState] = useState<string>('');
  const [recentProjects, setRecentProjects] = useState<string[]>([]);
  const [motivationalQuote, setMotivationalQuote] = useState<MotivationalQuoteOutput | null>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('today');
  const [lastWorkSessionStartTime, setLastWorkSessionStartTime] = useState<number | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<PomodoroLogEntry | null>(null);

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
      const storedRecentProjects = localStorage.getItem(RECENT_PROJECTS_KEY);
      if (storedRecentProjects) {
        setRecentProjects(JSON.parse(storedRecentProjects));
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
  
  useEffect(() => {
    if (isClient) {
      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(recentProjects));
    }
  }, [recentProjects, isClient]);


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

  const updateRecentProjects = useCallback((projectName?: string) => {
    if (!projectName || projectName.trim() === "") return;

    setRecentProjects(prevRecent => {
      const filtered = prevRecent.filter(p => p !== projectName);
      const updated = [projectName, ...filtered].slice(0, MAX_RECENT_PROJECTS);
      return updated;
    });
  }, []);


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
      // This handles resuming a paused work timer
      setLastWorkSessionStartTime(Date.now() - currentTime * 1000);
    }
     // For breaks, no specific start time tracking is needed for logging purposes
  }, [currentInterval, currentTime, lastWorkSessionStartTime]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setCurrentTime(0);
    notificationSentRef.current = { work: false, shortBreak: false, longBreak: false };
    if (currentInterval === 'work') {
      setLastWorkSessionStartTime(null); // Reset start time only if current interval is work
    }
  }, [currentInterval]);

  const logWorkEntry = useCallback(() => {
    const now = Date.now();
    if (currentInterval === 'work' && lastWorkSessionStartTime && currentTime > 0) {
      const newLogEntry: PomodoroLogEntry = {
        id: now.toString(),
        startTime: new Date(lastWorkSessionStartTime).toISOString(),
        endTime: new Date(now).toISOString(),
        type: 'work',
        duration: Math.round(currentTime / 60),
        project: currentProject || undefined,
      };
      setPomodoroLog(prevLog => [newLogEntry, ...prevLog]);
      toast({ title: "Work entry logged!", description: `Duration: ${formatTime(currentTime)}` });
      if (newLogEntry.project) {
        updateRecentProjects(newLogEntry.project);
      }
      return newLogEntry;
    }
    return null;
  }, [currentInterval, lastWorkSessionStartTime, currentTime, currentProject, toast, updateRecentProjects]);


  const switchMode = useCallback(() => {
    setIsRunning(false); // Stop timer before switching
    let nextInterval: IntervalType;

    if (currentInterval === 'work') {
      logWorkEntry(); // Log the work session
      const newCompletedPomodoros = pomodorosCompletedThisSet + 1;
      setPomodorosCompletedThisSet(newCompletedPomodoros);

      if (newCompletedPomodoros % settings.pomodorosPerSet === 0) {
        nextInterval = 'longBreak';
      } else {
        nextInterval = 'shortBreak';
      }
      fetchAndSetQuote();
    } else { 
      // Current interval is a break
      nextInterval = 'work';
      setMotivationalQuote(null); // Clear quote when switching to work
      if (currentInterval === 'longBreak') {
        setPomodorosCompletedThisSet(0); // Reset count after a long break
      }
    }

    setCurrentInterval(nextInterval);
    setCurrentTime(0); // Reset timer for the new interval
    setLastWorkSessionStartTime(nextInterval === 'work' ? Date.now() : null); // Set start time if new interval is work
    notificationSentRef.current = { work: false, shortBreak: false, longBreak: false }; // Reset notifications
  }, [currentInterval, pomodorosCompletedThisSet, settings, logWorkEntry, fetchAndSetQuote]);

  const endCurrentWorkSession = useCallback(() => {
    if (currentInterval === 'work' && isRunning) {
      logWorkEntry();
      setIsRunning(false);
      setCurrentTime(0);
      setLastWorkSessionStartTime(null);
      notificationSentRef.current.work = false; // Reset work notification
      // pomodorosCompletedThisSet remains, as ending a task doesn't mean the "set" is over.
      // currentInterval remains 'work', ready for a new task.
      // motivationalQuote is not changed/fetched here.
    }
  }, [currentInterval, isRunning, logWorkEntry]);


  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const deleteLogEntry = useCallback((id: string) => {
    setPomodoroLog(prevLog => prevLog.filter(entry => entry.id !== id));
    toast({ title: "Entry deleted", variant: "destructive" });
  }, [toast]);

  const openEditModal = useCallback((entry: PomodoroLogEntry) => {
    setEntryToEdit(entry);
    setIsEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEntryToEdit(null);
  }, []);

  const updateLogEntry = useCallback((updatedEntry: PomodoroLogEntry) => {
    setPomodoroLog(prevLog => 
      prevLog.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry)
    );
    if (updatedEntry.project) {
      updateRecentProjects(updatedEntry.project);
    }
    toast({ title: "Entry updated successfully!" });
    closeEditModal();
  }, [toast, closeEditModal, updateRecentProjects]);


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
       createTestDataEntry('tm3', now, 2, 11, 15, 35, 'Quick Sync'),
      createTestDataEntry('tm4', now, 5, 17, 0, 70, 'Content Creation'),
      createTestDataEntry('tm5', now, 6, 12, 30, 20, 'Bug Fixing'),
    ];

    // Filter out any entries that might be in the future if "now" is close to midnight
    const validTestData = testData.filter(entry => parseISO(entry.endTime) <= now);
    
    let newLog = [...pomodoroLog];
    let projectsToUpdateToRecent: string[] = [];

    validTestData.forEach(tdEntry => {
        if(!newLog.find(entry => entry.id === tdEntry.id)){
            newLog.unshift(tdEntry); // Add to beginning
            if(tdEntry.project){
                projectsToUpdateToRecent.push(tdEntry.project);
            }
        }
    });
    
    setPomodoroLog(newLog);

    // Update recent projects with unique projects from test data, prioritizing newest
    if (projectsToUpdateToRecent.length > 0) {
      setRecentProjects(prevRecent => {
        const uniqueNewProjects = [...new Set(projectsToUpdateToRecent)];
        const filteredOldRecent = prevRecent.filter(p => !uniqueNewProjects.includes(p));
        return [...uniqueNewProjects, ...filteredOldRecent].slice(0, MAX_RECENT_PROJECTS);
      });
    }
    
    toast({ title: "Test Data Added", description: `${validTestData.length} sample entries have been added/updated in your log.` });
  }, [toast, pomodoroLog]);


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
    endCurrentWorkSession,
    formatTime,
    isClient,
    currentProject,
    setCurrentProject,
    recentProjects,
    motivationalQuote,
    isFetchingQuote,
    activeFilter,
    setActiveFilter,
    processedChartData,
    isEditModalOpen,
    entryToEdit, 
    openEditModal,
    closeEditModal,
    updateLogEntry,
    populateTestData,
  };
}
