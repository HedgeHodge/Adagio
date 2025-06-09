
"use client";

import { useState, useEffect } from 'react';
import { usePomodoro } from '@/hooks/usePomodoro';
import { TimerDisplay } from '@/components/pomodoro/TimerDisplay';
import { TimerControls } from '@/components/pomodoro/TimerControls';
import { SettingsModal } from '@/components/pomodoro/SettingsModal';
import { PomodoroLog } from '@/components/pomodoro/PomodoroLog';
import { Button } from '@/components/ui/button';
import { SettingsIcon } from 'lucide-react'; // Changed from Settings to SettingsIcon for consistency with lucide naming
import { Skeleton } from "@/components/ui/skeleton";

export default function PomodoroPage() {
  const {
    settings,
    updateSettings,
    currentTime,
    isRunning,
    currentInterval,
    pomodoroLog,
    startTimer,
    pauseTimer,
    resetTimer,
    skipInterval,
    formatTime,
    currentProgress,
    isClient,
  } = usePomodoro();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (isClient && typeof document !== 'undefined') {
      if (isRunning) {
        document.title = `${formatTime(currentTime)} - ${currentInterval === 'work' ? 'Work' : 'Break'} | Pomodoro Flow`;
      } else {
        document.title = "Pomodoro Flow";
      }
    }
  }, [currentTime, isRunning, currentInterval, formatTime, isClient]);


  if (!isClient) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <div className="flex flex-col items-center">
          <Skeleton className="h-10 w-48 mb-10" />
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
        {/* Settings button is now part of TimerControls for better layout consolidation */}
        {/* <div className="absolute top-4 right-4">
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} aria-label="Open Settings">
            <SettingsIcon className="h-6 w-6 text-foreground/70 hover:text-primary transition-colors" />
          </Button>
        </div> */}

        <h1 className="text-4xl font-bold mb-10 text-primary font-headline">Pomodoro Flow</h1>

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

        <PomodoroLog log={pomodoroLog} />

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
