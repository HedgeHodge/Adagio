
"use client";

import type { TimeFilter, ActivePomodoroSession } from '@/types/pomodoro';
import { useState, useEffect } from 'react';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { TimerDisplay } from '@/components/pomodoro/TimerDisplay';
import { TimerControls } from '@/components/pomodoro/TimerControls';
import { SettingsModal } from '@/components/pomodoro/SettingsModal';
import { EditEntryModal } from '@/components/pomodoro/EditSessionModal';
import { PomodoroLog } from '@/components/pomodoro/PomodoroLog';
import { ProjectTimeChart } from '@/components/pomodoro/ProjectTimeChart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Quote, BarChart2, Loader2, PlusCircle, XCircle } from 'lucide-react';

type MobileTab = 'timer' | 'log' | 'insights';

export default function PomodoroPage() {
  const pomodoroState = usePomodoro();
  const {
    settings,
    updateSettings,
    activeSessions, // Changed from single timer state
    pomodoroLog,
    deleteLogEntry,
    addSession,     // New
    removeSession,  // New
    startTimer,     // Now takes sessionId
    pauseTimer,     // Now takes sessionId
    resetTimer,     // Now takes sessionId
    switchMode,     // Now takes sessionId
    endCurrentWorkSession, // Now takes sessionId
    formatTime,
    isClient,
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
    isDataLoading,
    inputProjectName, // For new project input
    setInputProjectName, // For new project input
    updateRecentProjects, // For recent project buttons
  } = pomodoroState;

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isMobile = useIsMobile();
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('timer');

  // Update document title based on the first running timer or a generic title
  useEffect(() => {
    if (isClient && typeof document !== 'undefined') {
      const runningWorkSession = activeSessions.find(s => s.isRunning && s.currentInterval === 'work');
      const runningBreakSession = activeSessions.find(s => s.isRunning && (s.currentInterval === 'shortBreak' || s.currentInterval === 'longBreak'));

      let titlePrefix = "Adagio";
      if (runningWorkSession) {
        titlePrefix = `${runningWorkSession.project} - ${formatTime(runningWorkSession.currentTime)}`;
      } else if (runningBreakSession) {
        titlePrefix = `Break - ${formatTime(runningBreakSession.currentTime)}`;
      } else if (activeSessions.length > 0 && activeMobileTab === 'timer') {
         // If timers exist but none are running, show the first one's project or default
         const firstSession = activeSessions[0];
         if (firstSession.currentInterval === 'work') {
            titlePrefix = `${firstSession.project} - ${formatTime(firstSession.currentTime)}`;
         } else {
            titlePrefix = `Break - ${formatTime(firstSession.currentTime)}`;
         }
      }
      document.title = `${titlePrefix} | Adagio`;
    }
  }, [activeSessions, formatTime, isClient, activeMobileTab]);


  if (!isClient || isDataLoading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your Adagio experience...</p>
      </main>
    );
  }

  const handleAddSession = () => {
    if (inputProjectName.trim()) {
      addSession(inputProjectName.trim());
    }
  };
  
  const filterButtonLabel = (filter: TimeFilter): string => {
    switch (filter) {
      case 'today': return 'Today';
      case 'thisWeek': return 'This Week';
      case 'thisMonth': return 'This Month';
      default: return '';
    }
  };

  const renderTimerContent = () => (
    <>
      <div className="w-full max-w-md mb-4">
        <Label htmlFor="project-input" className="text-sm font-medium text-foreground/80">
          Add new work session:
        </Label>
        <div className="flex items-center space-x-2 mt-1">
          <Input
            id="project-input"
            type="text"
            placeholder="E.g., Freelance Project #2"
            value={inputProjectName}
            onChange={(e) => setInputProjectName(e.target.value)}
            className="bg-card border-border shadow-sm flex-grow"
            onKeyPress={(e) => e.key === 'Enter' && handleAddSession()}
          />
          <Button onClick={handleAddSession} size="icon" aria-label="Add session">
            <PlusCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {recentProjects && recentProjects.length > 0 && (
        <div className="w-full max-w-md mb-6 mt-2 flex flex-wrap gap-2">
          {recentProjects.map((project) => (
            <Button
              key={project}
              variant="outline"
              size="sm"
              className="text-xs px-2 py-1 h-auto bg-card hover:bg-accent/80 border-border shadow-sm text-muted-foreground"
              onClick={() => {
                // Check if a session with this project name already exists (and is not running)
                const existingSession = activeSessions.find(s => s.project === project && !s.isRunning);
                if (existingSession) {
                    startTimer(existingSession.id); // Start existing paused session
                } else if (!activeSessions.some(s => s.project === project && s.isRunning)){
                    addSession(project); // Add new session if no active one with this name
                } else {
                    setInputProjectName(project); // Or, set input and let user click add
                }
              }}
            >
              {project}
            </Button>
          ))}
        </div>
      )}
      {(!recentProjects || recentProjects.length === 0) && <div className="mb-6"></div>}

      {activeSessions.length === 0 && (
        <Card className="w-full max-w-md mb-8 bg-card shadow-md">
          <CardContent className="p-6 text-center text-muted-foreground">
            No active sessions. Add a project above to get started!
          </CardContent>
        </Card>
      )}

      <div className="w-full max-w-md space-y-6">
        {activeSessions.map((session) => (
          <Card key={session.id} className="bg-card shadow-lg overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-lg text-foreground truncate flex-1 pr-2">
                {session.project}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeSession(session.id)}
                aria-label={`Remove ${session.project} session`}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <TimerDisplay
                formattedTime={formatTime(session.currentTime)}
                intervalType={session.currentInterval}
                isRunning={session.isRunning}
                // project name is in CardTitle now
              />
              <TimerControls
                sessionId={session.id} // Pass session ID
                isRunning={session.isRunning}
                currentInterval={session.currentInterval}
                onStart={() => startTimer(session.id)}
                onPause={() => pauseTimer(session.id)}
                onReset={() => resetTimer(session.id)}
                onSwitchMode={() => switchMode(session.id)}
                onOpenSettings={() => setIsSettingsOpen(true)} // Settings are global
                onEndCurrentWorkSession={session.currentInterval === 'work' && session.isRunning ? () => endCurrentWorkSession(session.id) : undefined}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {(motivationalQuote && activeSessions.some(s => s.currentInterval === 'shortBreak' || s.currentInterval === 'longBreak')) && (
        <div className="w-full max-w-md mt-8 mb-8">
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
    </>
  );

  const renderLogContent = () => (
    <PomodoroLog 
      log={pomodoroLog} 
      onDeleteEntry={deleteLogEntry}
      onEditEntry={openEditModal}
    />
  );

  const renderInsightsContent = () => (
    <>
      <Card className="w-full max-w-md bg-card shadow-lg mt-8">
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
       <div className="w-full max-w-md mt-4 flex justify-center">
        <Button onClick={populateTestData} variant="outline" size="sm">
          Populate Test Data
        </Button>
      </div>
    </>
  );


  if (isMobile) {
    return (
      <>
        <main className="flex flex-col items-center justify-start pt-20 pb-24 px-4 min-h-screen bg-background text-foreground selection:bg-primary/30">
          <h1 className="text-7xl font-headline font-bold mb-8 text-primary">Adagio</h1>
          {activeMobileTab === 'timer' && renderTimerContent()}
          {activeMobileTab === 'log' && renderLogContent()}
          {activeMobileTab === 'insights' && renderInsightsContent()}
        </main>
        <MobileTabBar activeTab={activeMobileTab} onTabChange={setActiveMobileTab} />
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSave={updateSettings}
        />
        <EditEntryModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          entry={entryToEdit}
          onSave={updateLogEntry}
        />
      </>
    );
  }

  // Desktop layout
  return (
    <>
      <main className="flex flex-col items-center justify-start pt-12 sm:pt-20 min-h-screen bg-background text-foreground p-4 selection:bg-primary/30">
        <h1 className="text-6xl sm:text-7xl font-headline font-bold mb-6 sm:mb-8 text-primary">Adagio</h1>
        
        {renderTimerContent()}
        {renderLogContent()}
        {renderInsightsContent()}

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSave={updateSettings}
        />
        <EditEntryModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          entry={entryToEdit}
          onSave={updateLogEntry}
        />
      </main>
    </>
  );
}
