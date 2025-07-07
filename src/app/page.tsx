
"use client";

import type { TimeFilter, ActivePomodoroSession } from '@/types/pomodoro';
import { useState, useEffect } from 'react';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/AuthContext';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { TimerDisplay } from '@/components/pomodoro/TimerDisplay';
import { TimerControls } from '@/components/pomodoro/TimerControls';
import { SettingsModal } from '@/components/pomodoro/SettingsModal';
import { EditEntryModal } from '@/components/pomodoro/EditSessionModal';
import { AddEntryModal } from '@/components/pomodoro/AddEntryModal';
import { EditActiveSessionModal } from '@/components/pomodoro/EditActiveSessionModal';
import { PomodoroLog } from '@/components/pomodoro/PomodoroLog';
import { ProjectTimeChart } from '@/components/pomodoro/ProjectTimeChart';
import { ProjectEntriesModal } from '@/components/pomodoro/ProjectEntriesModal';
import { TaskList } from '@/components/pomodoro/TaskList';
import { SessionSummaryModal } from '@/components/pomodoro/SessionSummaryModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Quote, BarChart2, Loader2, PlusCircle, XCircle, Sparkles, ListChecks, RefreshCwIcon, Pencil, Play, FlaskConical, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { summarizeSession } from '@/ai/flows/summarize-session-flow';

type MobileTab = 'timer' | 'log' | 'insights';

export default function PomodoroPage() {
  const pomodoroState = usePomodoro();
  const { currentUser, isPremium, upgradeUserToPremium, togglePremiumStatus } = useAuth();
  const { toast } = useToast();
  const {
    settings,
    updateSettings,
    activeSessions,
    pomodoroLog,
    addTaskToSession,
    toggleTaskInSession,
    deleteTaskFromSession,
    deleteLogEntry,
    addSession,
    removeSession,
    startTimer,
    pauseTimer,
    resetTimer,
    switchMode,
    endCurrentWorkSession,
    formatTime,
    isClient,
    recentProjects,
    removeRecentProject,
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
    addManualLogEntry,
    populateTestData,
    isDataLoading,
    isEditActiveSessionModalOpen,
    activeSessionToEdit,
    openEditActiveSessionModal,
    closeEditActiveSessionModal,
    updateActiveSessionStartTime,
    inputProjectName,
    setInputProjectName,
    sessionToSummarize,
    logSessionFromSummary,
    customDateRange,
    setCustomDateRange,
    isEntriesModalOpen,
    openEntriesModal,
    closeEntriesModal,
    entriesForModal,
    selectedChartProject,
  } = pomodoroState;

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const isMobile = useIsMobile();
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('timer');
  const [isSummarizing, setIsSummarizing] = useState(false);

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
  
  const startSessionFromProject = (projectName: string) => {
    const existingSession = activeSessions.find(s => s.project === projectName);
    if (existingSession) {
        if (!existingSession.isRunning) {
            startTimer(existingSession.id);
        }
    } else {
        addSession(projectName);
    }
  };

  const handleSaveSummary = async (session: ActivePomodoroSession) => {
    const completedTasks = session.tasks.filter(task => task.completed).map(task => task.text);

    if (!isPremium || !currentUser || completedTasks.length === 0) {
        logSessionFromSummary(session);
        return;
    }

    setIsSummarizing(true);
    try {
        const result = await summarizeSession({ 
            tasks: completedTasks,
        });
        logSessionFromSummary(session, result.projectName);
    } catch (error) {
        console.error("AI summarization failed:", error);
        toast({
            title: "AI Summary Failed",
            description: "Logging session without an AI summary.",
            variant: "destructive"
        });
        logSessionFromSummary(session);
    } finally {
        setIsSummarizing(false);
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
             <div key={project} className="relative group">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs px-2 py-1 h-auto bg-card hover:bg-accent/80 border-border shadow-sm text-muted-foreground pr-7"
                  onClick={() => startSessionFromProject(project)}
                  aria-label={`Start session for ${project}`}
                >
                  <Play className="h-3 w-3 mr-1.5" />
                  <span className="truncate max-w-[120px] inline-block">{project}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-0 right-0 h-full w-6 rounded-l-none text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeRecentProject(project)}
                  aria-label={`Remove ${project} from recent projects`}
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
            </div>
          ))}
        </div>
      )}
      {(!recentProjects || recentProjects.length === 0) && <div className="mb-6"></div>}

      {activeSessions.length === 0 && (
        <Card className="w-full max-w-md mb-8 bg-card shadow-md">
          <CardContent className="p-6 text-center text-muted-foreground">
            No active sessions. Add a project or start one from your recents to get going!
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
              <div className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeSession(session.id)}
                  aria-label={`Remove ${session.project} session`}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <TimerDisplay
                formattedTime={formatTime(session.currentTime)}
                intervalType={session.currentInterval}
                isRunning={session.isRunning}
              />
              <TimerControls
                sessionId={session.id}
                isRunning={session.isRunning}
                currentInterval={session.currentInterval}
                onStart={() => startTimer(session.id)}
                onPause={() => pauseTimer(session.id)}
                onReset={() => resetTimer(session.id)}
                onSwitchMode={() => switchMode(session.id)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onEndCurrentWorkSession={session.currentInterval === 'work' && session.isRunning ? () => endCurrentWorkSession(session.id) : undefined}
                onOpenEditActiveSessionModal={() => openEditActiveSessionModal(session)}
                lastWorkSessionStartTime={session.lastWorkSessionStartTime}
              />
              <TaskList
                session={session}
                onAddTask={addTaskToSession}
                onToggleTask={toggleTaskInSession}
                onDeleteTask={deleteTaskFromSession}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {(motivationalQuote && currentUser && activeSessions.some(s => s.currentInterval === 'shortBreak' || s.currentInterval === 'longBreak')) && (
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
                {!isPremium && motivationalQuote.source === "Adagio App" && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 h-auto text-xs mt-2 text-primary hover:text-primary/80"
                    onClick={upgradeUserToPremium}
                  >
                    Unlock with Premium
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  );

  const renderLogContent = () => (
    <>
      <PomodoroLog
        log={pomodoroLog}
        onDeleteEntry={deleteLogEntry}
        onEditEntry={(entry) => {
          if (currentUser) {
            openEditModal(entry);
          } else {
            toast({
              title: "Please Sign In",
              description: "Editing log entries requires an account to sync changes.",
            });
          }
        }}
        onAddEntry={() => setIsAddModalOpen(true)}
      />
      {!currentUser && (
        <Card className="w-full max-w-md mt-4 bg-card shadow-lg border-primary/20">
          <CardHeader className="p-4">
            <div className="flex items-center">
              <ListChecks className="mr-3 h-5 w-5 text-primary shrink-0" />
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">Sync Your Data</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Your log is saved on this device. Sign in to sync across devices.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}
    </>
  );

  const renderInsightsContent = () => (
    <>
      <Card className="w-full max-w-md bg-card shadow-lg mt-8">
        <CardHeader>
          <CardTitle className="flex items-center text-foreground">
            <BarChart2 className="mr-2 h-5 w-5 text-primary" />
            Time Insights
          </CardTitle>
           {!currentUser && <CardDescription className="text-muted-foreground">Sign in to see your time insights.</CardDescription>}
           {currentUser && <CardDescription className="text-muted-foreground">Tracked time per project.</CardDescription>}
        </CardHeader>
        <CardContent className="pt-2">
          {currentUser ? (
            <>
              <div className="flex justify-center flex-wrap gap-2 mb-6">
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={activeFilter === 'custom' ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs sm:text-sm px-3 py-1.5 h-auto w-[240px] justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateRange?.from ? (
                        customDateRange.to ? (
                          <>
                            {format(customDateRange.from, "LLL dd, y")} -{" "}
                            {format(customDateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(customDateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Custom Range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={customDateRange?.from}
                      selected={customDateRange}
                      onSelect={(range) => {
                          setCustomDateRange(range);
                          if (range?.from) {
                            setActiveFilter('custom');
                          }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <ProjectTimeChart data={processedChartData} onBarClick={openEntriesModal} isModalOpen={isEntriesModalOpen} />
            </>
          ) : (
            <p className="text-center text-muted-foreground py-4">No data to display. Please sign in.</p>
          )}
        </CardContent>
      </Card>
       {currentUser && (
        <div className="w-full max-w-md mt-4 flex flex-col items-center gap-2">
          {!isPremium && (
            <Button onClick={upgradeUserToPremium} variant="default" size="lg" className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
              <Sparkles className="mr-2 h-5 w-5" /> Upgrade to Adagio Premium
            </Button>
          )}
           <div className="flex items-center gap-2 mt-2">
              <Button onClick={togglePremiumStatus} variant="secondary" size="sm">
                <RefreshCwIcon className="mr-2 h-4 w-4" /> Toggle Premium (Test): {isPremium ? 'ON' : 'OFF'}
              </Button>
              <Button onClick={populateTestData} variant="outline" size="sm">
                <FlaskConical className="mr-2 h-4 w-4" /> Populate Data
              </Button>
            </div>
        </div>
       )}
    </>
  );

  const sharedModals = (
    <>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={updateSettings}
      />
      <AddEntryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={addManualLogEntry}
      />
      {entryToEdit && (
        <EditEntryModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          entry={entryToEdit}
          onSave={updateLogEntry}
        />
      )}
      {activeSessionToEdit && (
        <EditActiveSessionModal
          isOpen={isEditActiveSessionModalOpen}
          onClose={closeEditActiveSessionModal}
          session={activeSessionToEdit}
          onSave={updateActiveSessionStartTime}
        />
      )}
      {sessionToSummarize && (
          <SessionSummaryModal
            isOpen={!!sessionToSummarize}
            session={sessionToSummarize}
            onSave={handleSaveSummary}
            isSummarizing={isSummarizing}
            isPremium={isPremium && !!currentUser}
          />
      )}
      {selectedChartProject && (
        <ProjectEntriesModal
            isOpen={isEntriesModalOpen}
            onClose={closeEntriesModal}
            projectName={selectedChartProject}
            entries={entriesForModal}
        />
      )}
    </>
  );


  if (isMobile) {
    return (
      <>
        <div className="fixed top-4 left-4 z-40">
          <Link href="/" aria-label="Adagio Home Page">
            <h1 className="text-5xl font-headline font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity">
              A
            </h1>
          </Link>
        </div>

        <main className="flex flex-col items-center justify-start pt-20 pb-24 px-4 min-h-screen bg-background text-foreground selection:bg-primary/30">
          {activeMobileTab === 'timer' && renderTimerContent()}
          {activeMobileTab === 'log' && renderLogContent()}
          {activeMobileTab === 'insights' && renderInsightsContent()}
        </main>
        <MobileTabBar activeTab={activeMobileTab} onTabChange={setActiveMobileTab} />
        {sharedModals}
      </>
    );
  }

  return (
    <>
      <main className="flex flex-col items-center justify-start pt-20 min-h-screen bg-background text-foreground p-4 selection:bg-primary/30">
        <Link href="/" aria-label="Adagio Home Page">
            <h1 className="text-6xl sm:text-7xl font-headline font-bold mb-6 sm:mb-8 text-primary cursor-pointer hover:opacity-80 transition-opacity">
                Adagio
            </h1>
        </Link>
        
        {renderTimerContent()}
        {renderLogContent()}
        {renderInsightsContent()}
        
        {sharedModals}
      </main>
    </>
  );
}
