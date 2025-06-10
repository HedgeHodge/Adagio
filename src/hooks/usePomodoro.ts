
"use client";

import type { PomodoroSettings, PomodoroLogEntry, IntervalType, TimeFilter, ChartDataPoint } from '@/types/pomodoro';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { getMotivationalQuote, type MotivationalQuoteOutput } from '@/ai/flows/motivational-quote-flow';
import { isToday, isWithinInterval, startOfWeek, endOfWeek, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  pomodorosPerSet: 4,
};

const LOCAL_SETTINGS_KEY = 'pomodoroSettings_local';
const LOCAL_LOG_KEY = 'pomodoroLog_local';
const LOCAL_PROJECT_KEY = 'currentProject_local';
const LOCAL_RECENT_PROJECTS_KEY = 'recentProjects_local';
const MAX_RECENT_PROJECTS = 5;

// Firestore data structure type
interface UserPomodoroData {
  settings: PomodoroSettings;
  pomodoroLog: PomodoroLogEntry[];
  currentProject: string;
  recentProjects: string[];
  lastUpdated?: Timestamp;
}

export function usePomodoro() {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [currentTime, setCurrentTime] = useState<number>(0);
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
  const [isDataLoading, setIsDataLoading] = useState(true); // For initial data load indication

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notificationSentRef = useRef<Record<IntervalType, boolean>>({ work: false, shortBreak: false, longBreak: false });
  const { toast } = useToast();

  const loadDataFromLocalStorage = useCallback(() => {
    const storedSettings = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (storedSettings) setSettings(JSON.parse(storedSettings));
    else setSettings(DEFAULT_SETTINGS);

    const storedLog = localStorage.getItem(LOCAL_LOG_KEY);
    if (storedLog) setPomodoroLog(JSON.parse(storedLog));
    else setPomodoroLog([]);

    const storedProject = localStorage.getItem(LOCAL_PROJECT_KEY);
    if (storedProject) setCurrentProjectState(storedProject);
    else setCurrentProjectState('');

    const storedRecentProjects = localStorage.getItem(LOCAL_RECENT_PROJECTS_KEY);
    if (storedRecentProjects) setRecentProjects(JSON.parse(storedRecentProjects));
    else setRecentProjects([]);
  }, []);

  const saveDataToFirestore = useCallback(async (userId: string, data: Partial<UserPomodoroData>) => {
    if (!userId) return;
    try {
      const userDocRef = doc(db, 'users', userId);
      // Fetch existing data to merge, or set new if doesn't exist
      const docSnap = await getDoc(userDocRef);
      const existingData = docSnap.exists() ? docSnap.data() as UserPomodoroData : {};
      
      await setDoc(userDocRef, { 
        ...existingData, 
        ...data, 
        lastUpdated: Timestamp.now() 
      }, { merge: true });
    } catch (error) {
      console.error("Error saving data to Firestore:", error);
      toast({ title: "Sync Error", description: "Could not save data to cloud.", variant: "destructive" });
    }
  }, [toast]);


  // Effect for initial client-side setup and auth-dependent data loading
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/notification.mp3');
    }
  }, []);

  useEffect(() => {
    if (!isClient) return;
    setIsDataLoading(true);

    const loadData = async () => {
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            const cloudData = docSnap.data() as UserPomodoroData;
            setSettings(cloudData.settings || DEFAULT_SETTINGS);
            setPomodoroLog(cloudData.pomodoroLog || []);
            setCurrentProjectState(cloudData.currentProject || '');
            setRecentProjects(cloudData.recentProjects || []);
            // Sync localStorage with cloud data
            localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(cloudData.settings || DEFAULT_SETTINGS));
            localStorage.setItem(LOCAL_LOG_KEY, JSON.stringify(cloudData.pomodoroLog || []));
            localStorage.setItem(LOCAL_PROJECT_KEY, cloudData.currentProject || '');
            localStorage.setItem(LOCAL_RECENT_PROJECTS_KEY, JSON.stringify(cloudData.recentProjects || []));
            toast({ title: "Data Synced", description: "Your data has been loaded from the cloud." });
          } else {
            // No cloud data, check local storage and upload if present
            const localSettings = localStorage.getItem(LOCAL_SETTINGS_KEY);
            const localLog = localStorage.getItem(LOCAL_LOG_KEY);
            const localProject = localStorage.getItem(LOCAL_PROJECT_KEY);
            const localRecent = localStorage.getItem(LOCAL_RECENT_PROJECTS_KEY);

            const initialCloudData: UserPomodoroData = {
                settings: localSettings ? JSON.parse(localSettings) : DEFAULT_SETTINGS,
                pomodoroLog: localLog ? JSON.parse(localLog) : [],
                currentProject: localProject || '',
                recentProjects: localRecent ? JSON.parse(localRecent) : [],
            };
            
            setSettings(initialCloudData.settings);
            setPomodoroLog(initialCloudData.pomodoroLog);
            setCurrentProjectState(initialCloudData.currentProject);
            setRecentProjects(initialCloudData.recentProjects);

            await saveDataToFirestore(currentUser.uid, initialCloudData);
            if (localSettings || localLog || localProject || localRecent) {
              toast({ title: "Data Uploaded", description: "Your local data has been saved to the cloud." });
            }
          }
        } catch (error) {
          console.error("Error loading data from Firestore:", error);
          toast({ title: "Sync Error", description: "Could not load data from cloud. Using local data.", variant: "destructive" });
          loadDataFromLocalStorage(); // Fallback to local
        }
      } else {
        // No user logged in, load from local storage
        loadDataFromLocalStorage();
      }
      setIsDataLoading(false);
    };
    loadData();

  }, [currentUser, isClient, loadDataFromLocalStorage, saveDataToFirestore, toast]);
  
  // Save individual pieces of state to localStorage and Firestore
  useEffect(() => {
    if (isClient && !isDataLoading) { // Ensure not to save during initial load from Firestore
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
      if (currentUser) saveDataToFirestore(currentUser.uid, { settings });
    }
  }, [settings, isClient, currentUser, saveDataToFirestore, isDataLoading]);

  useEffect(() => {
    if (isClient && !isDataLoading) {
      localStorage.setItem(LOCAL_LOG_KEY, JSON.stringify(pomodoroLog));
      if (currentUser) saveDataToFirestore(currentUser.uid, { pomodoroLog });
    }
  }, [pomodoroLog, isClient, currentUser, saveDataToFirestore, isDataLoading]);

  useEffect(() => {
    if (isClient && !isDataLoading) {
      localStorage.setItem(LOCAL_RECENT_PROJECTS_KEY, JSON.stringify(recentProjects));
      if (currentUser) saveDataToFirestore(currentUser.uid, { recentProjects });
    }
  }, [recentProjects, isClient, currentUser, saveDataToFirestore, isDataLoading]);

  const setCurrentProject = useCallback((project: string) => {
    setCurrentProjectState(project);
    if (isClient && !isDataLoading) {
      localStorage.setItem(LOCAL_PROJECT_KEY, project);
      if (currentUser) saveDataToFirestore(currentUser.uid, { currentProject: project });
    }
  }, [isClient, currentUser, saveDataToFirestore, isDataLoading]);


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
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
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

  const pauseTimer = useCallback(() => setIsRunning(false), []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setCurrentTime(0);
    notificationSentRef.current = { work: false, shortBreak: false, longBreak: false };
    if (currentInterval === 'work') setLastWorkSessionStartTime(null);
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
      if (newLogEntry.project) updateRecentProjects(newLogEntry.project);
      return newLogEntry;
    }
    return null;
  }, [currentInterval, lastWorkSessionStartTime, currentTime, currentProject, toast, updateRecentProjects]);

  const switchMode = useCallback(() => {
    setIsRunning(false);
    let nextInterval: IntervalType;
    if (currentInterval === 'work') {
      logWorkEntry();
      const newCompletedPomodoros = pomodorosCompletedThisSet + 1;
      setPomodorosCompletedThisSet(newCompletedPomodoros);
      nextInterval = (newCompletedPomodoros % settings.pomodorosPerSet === 0) ? 'longBreak' : 'shortBreak';
      fetchAndSetQuote();
    } else {
      nextInterval = 'work';
      setMotivationalQuote(null);
      if (currentInterval === 'longBreak') setPomodorosCompletedThisSet(0);
    }
    setCurrentInterval(nextInterval);
    setCurrentTime(0);
    setLastWorkSessionStartTime(nextInterval === 'work' ? Date.now() : null);
    notificationSentRef.current = { work: false, shortBreak: false, longBreak: false };
  }, [currentInterval, pomodorosCompletedThisSet, settings, logWorkEntry, fetchAndSetQuote]);

  const endCurrentWorkSession = useCallback(() => {
    if (currentInterval === 'work' && isRunning) {
      logWorkEntry();
      setIsRunning(false);
      setCurrentTime(0);
      setLastWorkSessionStartTime(null);
      notificationSentRef.current.work = false;
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
    setPomodoroLog(prevLog => prevLog.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry));
    if (updatedEntry.project) updateRecentProjects(updatedEntry.project);
    toast({ title: "Entry updated successfully!" });
    closeEditModal();
  }, [toast, closeEditModal, updateRecentProjects]);

  const formatTime = (timeInSeconds: number): string => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    let formatted = '';
    if (hours > 0) formatted += `${hours.toString().padStart(2, '0')}:`;
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
        filteredLog = pomodoroLog.filter(entry => isWithinInterval(parseISO(entry.endTime), { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }));
        break;
      case 'thisMonth':
        filteredLog = pomodoroLog.filter(entry => isWithinInterval(parseISO(entry.endTime), { start: startOfMonth(now), end: endOfMonth(now) }));
        break;
      default: filteredLog = pomodoroLog;
    }
    const aggregation: Record<string, number> = {};
    filteredLog.forEach(entry => {
      const projectName = entry.project || 'No Project';
      aggregation[projectName] = (aggregation[projectName] || 0) + entry.duration;
    });
    return Object.entries(aggregation).map(([name, totalMinutes]) => ({ name, totalMinutes })).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [pomodoroLog, activeFilter, isClient]);

  const createTestDataEntry = (idSuffix: string, baseTime: Date, daysAgo: number, hour: number, minute: number, durationMinutes: number, project?: string): PomodoroLogEntry => {
    const startTime = new Date(baseTime);
    startTime.setDate(baseTime.getDate() - daysAgo);
    startTime.setHours(hour, minute, 0, 0);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
    return { id: `${startTime.getTime()}-${idSuffix}`, startTime: startTime.toISOString(), endTime: endTime.toISOString(), type: 'work', duration: durationMinutes, project: project };
  };

  const populateTestData = useCallback(() => {
    const now = new Date();
    const testData: PomodoroLogEntry[] = [
      createTestDataEntry('td1', now, 0, 9, 0, 25, 'Project Phoenix'), createTestDataEntry('td2', now, 0, 10, 30, 50, 'Project Phoenix'), createTestDataEntry('td3', now, 0, 14, 0, 45),
      createTestDataEntry('yd1', now, 1, 11, 0, 60, 'Project Chimera'), createTestDataEntry('yd2', now, 1, 15, 0, 30, 'Project Phoenix'),
      createTestDataEntry('tw1', now, 3, 10, 0, 90, 'Adagio App'), createTestDataEntry('tw2', now, 4, 16, 0, 55, 'Client Meeting Prep'),
      createTestDataEntry('lw1', now, 8, 9, 30, 120, 'Project Chimera'), createTestDataEntry('lw2', now, 10, 14,0, 40),
      createTestDataEntry('tm1', now, 15, 13, 0, 75, 'Project Phoenix'), createTestDataEntry('tm2', now, 20, 10, 0, 60, 'Adagio App'),
      createTestDataEntry('tm3', now, 2, 11, 15, 35, 'Quick Sync'), createTestDataEntry('tm4', now, 5, 17, 0, 70, 'Content Creation'), createTestDataEntry('tm5', now, 6, 12, 30, 20, 'Bug Fixing'),
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
      setRecentProjects(prevRecent => {
        const uniqueNewProjects = [...new Set(projectsToUpdateToRecent)];
        const filteredOldRecent = prevRecent.filter(p => !uniqueNewProjects.includes(p));
        return [...uniqueNewProjects, ...filteredOldRecent].slice(0, MAX_RECENT_PROJECTS);
      });
    }
    toast({ title: "Test Data Added", description: `${validTestData.length} sample entries have been added/updated in your log.` });
  }, [toast, pomodoroLog]);

  return {
    settings, updateSettings, currentTime, isRunning, currentInterval, pomodorosCompletedThisSet, pomodoroLog,
    deleteLogEntry, startTimer, pauseTimer, resetTimer, switchMode, endCurrentWorkSession, formatTime,
    isClient, currentProject, setCurrentProject, recentProjects, motivationalQuote, isFetchingQuote,
    activeFilter, setActiveFilter, processedChartData, isEditModalOpen, entryToEdit, openEditModal,
    closeEditModal, updateLogEntry, populateTestData, isDataLoading,
  };
}
