
"use client";

import type { TimeFilter } from '@/types/pomodoro';
import { useState, useEffect } from 'react';
import { usePomodoro } from '@/hooks/usePomodoro';
import { TimerDisplay } from '@/components/pomodoro/TimerDisplay';
import { TimerControls } from '@/components/pomodoro/TimerControls';
import { SettingsModal } from '@/components/pomodoro/SettingsModal';
import { EditSessionModal } from '@/components/pomodoro/EditSessionModal';
import { PomodoroLog } from '@/components/pomodoro/PomodoroLog';
import { ProjectTimeChart } from '@/components/pomodoro/ProjectTimeChart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Quote, BarChart2 } from 'lucide-react';

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
  } = usePomodoro();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (isClient && typeof document !== 'undefined') {
      let titlePrefix = formatTime(currentTime);
      if (currentInterval === 'work') {
        titlePrefix = currentProject ? `${currentProject} - ${titlePrefix}` : titlePrefix;
        document.title = `${titlePrefix} | Adagio`;
      } else if (currentInterval === 'shortBreak' || currentInterval === 'longBreak') {
         document.title = `Break - ${titlePrefix} | Adagio`;
      } else {
         document.title = "Adagio";
      }
       if (!isRunning && currentTime === 0) {
        document.title = "Adagio"; 
      }
    }
  }, [currentTime, isRunning, currentInterval, formatTime, isClient, currentProject]);


  if (!isClient) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <div className="flex flex-col items-center w-full max-w-md">
          <Skeleton className="h-16 w-64 mb-8" /> 
          <Skeleton className="w-full h-12 mb-6 rounded-lg" />
          <Skeleton className="w-full h-40 mb-6 rounded-lg" />
          <div className="flex space-x-3 mb-8">
            <Skeleton className="h-16 w-32 rounded-md" />
            <Skeleton className="h-12 w-12 rounded-md" />
            <Skeleton className="h-12 w-12 rounded-md" />
            <Skeleton className="h-12 w-12 rounded-md" />
          </div>
          <Skeleton className="w-full h-12 mb-8 rounded-lg" />
          <Skeleton className="w-full h-64 rounded-lg" />
          <Skeleton className="w-full h-80 mt-8 rounded-lg" />
        </div>
      </main>
    );
  }

  const filterButtonLabel = (filter: TimeFilter): string => {
    switch (filter) {
      case 'today': return 'Today';
      case 'thisWeek': return 'This Week';
      case 'thisMonth': return 'This Month';
      default: return '';
    }
  }

  return (
    <>
      <main className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 selection:bg-primary/30">
        <h1 className="text-7xl font-headline font-bold mb-8 text-primary">Adagio</h1>

        <div className="w-full max-w-md mb-6">
          <Label htmlFor="project-input" className="text-sm font-medium text-foreground/80">
            What are you working on?
          </Label>
          <Input
            id="project-input"
            type="text"
            placeholder="E.g., Freelance Project #1"
            value={currentProject}
            onChange={(e) => setCurrentProject(e.target.value)}
            className="mt-1 bg-card border-border shadow-sm"
            disabled={isRunning && currentInterval === 'work'}
          />
        </div>

        <TimerDisplay
          formattedTime={formatTime(currentTime)}
          intervalType={currentInterval}
          isRunning={isRunning}
        />

        <TimerControls
          isRunning={isRunning}
          currentInterval={currentInterval}
          onStart={startTimer}
          onPause={pauseTimer}
          onReset={resetTimer}
          onSwitchMode={switchMode}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {(currentInterval === 'shortBreak' || currentInterval === 'longBreak') && (
          <div className="w-full max-w-md mb-8">
            {isFetchingQuote && (
              <Card className="bg-card shadow-md animate-pulse">
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2 ml-auto" />
                </CardContent>
              </Card>
            )}
            {!isFetchingQuote && motivationalQuote && (
              <Card className="bg-card shadow-md animate-subtle-pop">
                <CardContent className="p-4">
                  <div className="flex items-start text-sm text-muted-foreground italic">
                    <Quote className="h-4 w-4 mr-2 text-primary/70 shrink-0 mt-0.5" />
                    <div>
                      <p className="mb-1">"{motivationalQuote.quote}"</p>
                      {motivationalQuote.source && (
                        <p className="text-xs text-muted-foreground/80 text-right">- {motivationalQuote.source}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <PomodoroLog 
          log={pomodoroLog} 
          onDeleteEntry={deleteLogEntry}
          onEditEntry={openEditModal}
        />

        <Card className="w-full max-w-md mt-8 bg-card shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <BarChart2 className="mr-2 h-5 w-5 text-primary" />
              Time Insights
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Tracked time per project.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex justify-center space-x-2 mb-6">
              {(['today', 'thisWeek', 'thisMonth'] as const).map((filterOption) => (
                <Button
                  key={filterOption}
                  variant={activeFilter === filterOption ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter(filterOption)}
                  className="text-xs sm:text-sm px-3 py-1.5 h-auto"
                >
                  {filterButtonLabel(filterOption)}
                </Button>
              ))}
            </div>
            <ProjectTimeChart data={processedChartData} />
          </CardContent>
        </Card>

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSave={updateSettings}
        />
        <EditSessionModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          session={selectedLogEntryForEdit}
          onSave={updateLogEntry}
        />
      </main>
    </>
  );
}
