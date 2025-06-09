
"use client";

import type { PomodoroSettings, PomodoroLogEntry, IntervalType } from '@/types/pomodoro';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  pomodorosPerSet: 4,
};

const SETTINGS_KEY = 'pomodoroSettings';
const LOG_KEY = 'pomodoroLog';

export function usePomodoro() {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [currentTime, setCurrentTime] = useState<number>(settings.workDuration * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentInterval, setCurrentInterval] = useState<IntervalType>('work');
  const [pomodorosCompletedThisSet, setPomodorosCompletedThisSet] = useState<number>(0);
  const [pomodoroLog, setPomodoroLog] = useState<PomodoroLogEntry[]>([]);
  const [isClient, setIsClient] = useState(false);
  
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
      // Ensure audio can be played after user interaction
      audioRef.current = new Audio('/sounds/notification.mp3'); // Placeholder
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      // Reset current time based on new settings if timer is not running
      // and current interval is work, or if the current interval duration changed.
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

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(error => console.warn("Audio play failed:", error));
    }
  }, []);

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
    } else { // currentInterval is 'shortBreak' or 'longBreak'
      nextInterval = 'work';
      if (currentInterval === 'longBreak') {
        setPomodorosCompletedThisSet(0); // Reset for new set
      }
      toast({ title: "Break's over!", description: "Let's get back to work." });
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
  }, [currentInterval, pomodorosCompletedThisSet, settings, playNotificationSound, toast]);


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
  }, []);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
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
    handleIntervalEnd(); // Simulate interval end to move to next
  }, [handleIntervalEnd]);

  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

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
    if (totalDuration === 0) return 0; // Avoid division by zero
    return ((totalDuration - currentTime) / totalDuration) * 100;
  };

  return {
    settings,
    updateSettings,
    currentTime,
    isRunning,
    currentInterval,
    pomodorosCompletedThisSet,
    pomodoroLog,
    startTimer,
    pauseTimer,
    resetTimer,
    skipInterval,
    formatTime,
    currentProgress,
    isClient, // To allow components to know if localStorage is safe to use
  };
}
