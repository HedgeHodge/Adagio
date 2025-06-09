
"use client";

import { useState, useEffect } from 'react';
import { usePomodoro } from '@/hooks/usePomodoro';
import { TimerDisplay } from '@/components/pomodoro/TimerDisplay';
import { TimerControls } from '@/components/pomodoro/TimerControls';
import { SettingsModal } from '@/components/pomodoro/SettingsModal';
import { PomodoroLog } from '@/components/pomodoro/PomodoroLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from "@/components/ui/skeleton";

export default function PomodoroPage() {
  const {
    settings,
    updateSettings,
    currentTime,
    isRunning,
    currentInterval,
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
  } = usePomodoro();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (isClient && typeof document !== 'undefined') {
      if (isRunning) {
        document.title = `${formatTime(currentTime)} - ${currentInterval === 'work' ? 'Work' : 'Break'} | Adagio`;
      } else {
        document.title = "Adagio";
      }
    }
  }, [currentTime, isRunning, currentInterval, formatTime, isClient]);


  if (!isClient) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <div className="flex flex-col items-center">
          <Skeleton className="h-16 w-64 mb-8" /> 
          <Skeleton className="w-full max-w-md h-20 mb-6 rounded-lg" />
          <Skeleton className="w-full max-w-md h-48 mb-8 rounded-lg" />
          <div className="flex space-x-3 mb-8">
            <Skeleton className="h-16 w-32 rounded-md" />
            <Skeleton className="h-12 w-12 rounded-md" />
            <Skeleton className="h-12 w-12 rounded-md" />
            <Skeleton className="h-12 w-12 rounded-md" />
          </div>
          <Skeleton className="w-full max-w-md h-64 rounded-lg" />
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 selection:bg-primary/30">
        <h1 className="text-7xl font-headline font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-br from-primary to-accent">Adagio</h1>

        <div className="w-full max-w-md mb-6">
          <Label htmlFor="project-input" className="text-sm font-medium text-foreground/80">
            What are you working on?
          </Label>
          <Input
            id="project-input"
            type="text"
            placeholder="E.g., Design new logo"
            value={currentProject}
            onChange={(e) => setCurrentProject(e.target.value)}
            className="mt-1 bg-card border-border shadow-sm"
            disabled={isRunning && currentInterval === 'work'}
          />
        </div>

        <TimerDisplay
          formattedTime={formatTime(currentTime)}
          intervalType={currentInterval}
          progress={currentProgress()}
          isRunning={isRunning}
        />

        <TimerControls
          isRunning={isRunning}
          onStart={startTimer}
          onPause={pauseTimer}
          onReset={resetTimer}
          onSkip={skipInterval}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <PomodoroLog log={pomodoroLog} onDeleteEntry={deleteLogEntry} />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSave={updateSettings}
        />
      </main>
    </>
  );
}
