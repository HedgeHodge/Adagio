
"use client";

import React, { useState, useRef, useCallback } from 'react';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useAuth } from '@/context/AuthContext';
import { PomodoroLog } from '@/components/pomodoro/PomodoroLog';
import { SettingsModal } from '@/components/pomodoro/SettingsModal';
import { SessionSummaryModal } from '@/components/pomodoro/SessionSummaryModal';
import { EditEntryModal } from '@/components/pomodoro/EditSessionModal';
import { AddEntryModal } from '@/components/pomodoro/AddEntryModal';
import { EditActiveSessionModal } from '@/components/pomodoro/EditActiveSessionModal';
import { ProjectEntriesModal } from '@/components/pomodoro/ProjectEntriesModal';
import { summarizeSession } from '@/ai/flows/summarize-session-flow';
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TimerDisplay } from '@/components/pomodoro/TimerDisplay';
import { TimerControls } from '@/components/pomodoro/TimerControls';
import { TaskList } from '@/components/pomodoro/TaskList';
import { ProjectTimeChart } from '@/components/pomodoro/ProjectTimeChart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthModal } from '@/components/auth/AuthModal';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggleButton } from '@/components/layout/ThemeToggleButton';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    CircleUserRound,
    Clock,
    ListChecks,
    BarChart2,
    Plus,
    X,
    Calendar as CalendarIcon,
    Loader2,
    Sparkles,
    CheckCircle,
    LogOut,
    Beaker,
    Trash2,
    Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AccountModal } from '@/components/auth/AccountModal';

const ActionButton = ({ icon, label, className = '', isActive, ...props }: { icon: React.ReactNode, label: string, className?: string, isActive?: boolean, [key: string]: any }) => (
    <div className="flex flex-col items-center gap-2">
        <Button
            variant="secondary"
            className={cn(
                "w-20 h-20 bg-background/60 dark:bg-background/30 rounded-3xl shadow-lg flex items-center justify-center transition-all duration-300",
                isActive ? 'bg-white/90 dark:bg-primary/20 scale-110 -translate-y-2' : 'hover:bg-background/80 dark:hover:bg-background/50',
                className
            )}
            {...props}
        >
            {icon}
        </Button>
        <span className={cn(
            "font-semibold text-sm transition-opacity",
            isActive ? 'text-primary' : 'text-muted-foreground'
        )}>{label}</span>
    </div>
);

type ActiveTab = 'timer' | 'log' | 'insights';

export default function HomePage() {
    const [activeTab, setActiveTab] = useState<ActiveTab>('timer');
    const { currentUser, isPremium, signOut } = useAuth();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);

    const [projectToManage, setProjectToManage] = useState<string | null>(null);
    const [isManageProjectModalOpen, setIsManageProjectModalOpen] = useState(false);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

    const pomodoro = usePomodoro();
    
    const handleLongPress = useCallback((projectName: string) => {
        setProjectToManage(projectName);
        setIsManageProjectModalOpen(true);
    }, []);

    const startLongPress = (projectName: string) => {
        longPressTimerRef.current = setTimeout(() => handleLongPress(projectName), 700);
    };

    const clearLongPress = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };
    
    const handleDeleteProject = () => {
        if (projectToManage) {
            pomodoro.removeRecentProject(projectToManage);
        }
        setIsManageProjectModalOpen(false);
        setProjectToManage(null);
    };
    
    const handleEditProject = () => {
        if (projectToManage) {
            pomodoro.setInputProjectName(projectToManage);
        }
        setIsManageProjectModalOpen(false);
        setProjectToManage(null);
    };


    const handleAddSession = (e: React.FormEvent) => {
        e.preventDefault();
        pomodoro.addSession(pomodoro.inputProjectName);
    };

    const handleSummarizeAndSave = async (session: any) => {
        setIsSummarizing(true);
        let summary;

        const completedTasks = session.tasks.filter((task: any) => task.completed).map((t: any) => t.text);
        if (isPremium && completedTasks.length > 0) {
            try {
                const result = await summarizeSession({ tasks: completedTasks, projectName: session.project });
                summary = result.summary;
            } catch (error) {
                console.error("AI summarization failed, logging without summary.", error);
            }
        }
        
        pomodoro.logSessionFromSummary(session, summary);
        setIsSummarizing(false);
    };

    const TimerView = (
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
            <Card className="w-full shadow-lg bg-card/70 backdrop-blur-sm rounded-3xl max-w-md">
                <CardHeader>
                    <CardTitle>Start a New Session</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddSession} className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                id="project-name"
                                placeholder="What are you working on?"
                                value={pomodoro.inputProjectName}
                                onChange={(e) => pomodoro.setInputProjectName(e.target.value)}
                                className="h-11 text-base bg-background/70 flex-grow"
                                disabled={pomodoro.isDataLoading}
                            />
                            <Button type="submit" className="h-11 w-11 rounded-lg" disabled={pomodoro.isDataLoading || !pomodoro.inputProjectName.trim()}>
                                <Plus className="h-5 w-5" />
                                <span className="sr-only">Add</span>
                            </Button>
                        </div>
                        {pomodoro.recentProjects.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm text-muted-foreground mr-1">Recent:</span>
                                {pomodoro.recentProjects.map((proj, i) => (
                                    <motion.div
                                        key={proj}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="relative group"
                                        onMouseDown={() => startLongPress(proj)}
                                        onMouseUp={clearLongPress}
                                        onMouseLeave={clearLongPress}
                                        onTouchStart={() => startLongPress(proj)}
                                        onTouchEnd={clearLongPress}
                                    >
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            className="h-8 px-3 shadow-sm rounded-lg"
                                            onClick={() => pomodoro.addSession(proj)}
                                        >
                                            {proj}
                                        </Button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>

            {pomodoro.activeSessions.map((session) => (
               <div
                    key={session.id}
                    className="w-full max-w-md relative rounded-3xl overflow-hidden"
                >
                    <Card className={cn("w-full shadow-lg bg-card/70 backdrop-blur-sm rounded-3xl max-w-md relative z-10 overflow-hidden", session.isRunning && session.currentInterval === 'work' && 'animate-radiate')}>
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-20" onClick={() => pomodoro.removeSession(session.id)}>
                            <X className="h-4 w-4" />
                        </Button>
                        <CardHeader>
                            <CardTitle className="truncate pr-8">{session.project}</CardTitle>
                            {pomodoro.motivationalQuote && (session.currentInterval === 'shortBreak' || session.currentInterval === 'longBreak') && (
                                <CardDescription className="pt-2 italic flex items-center gap-2">
                                    {pomodoro.isFetchingQuote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-yellow-500" />}
                                    "{pomodoro.motivationalQuote.quote}" - {pomodoro.motivationalQuote.source}
                                </CardDescription>
                            )}
                        </CardHeader>
                        <CardContent className="flex flex-col items-center">
                            <TimerDisplay
                                formattedTime={pomodoro.formatTime(session.currentTime)}
                                intervalType={session.currentInterval}
                                isRunning={session.isRunning}
                            />
                            <TimerControls
                                sessionId={session.id}
                                isRunning={session.isRunning}
                                currentInterval={session.currentInterval}
                                onStart={() => pomodoro.startTimer(session.id)}
                                onPause={() => pomodoro.pauseTimer(session.id)}
                                onReset={() => pomodoro.resetTimer(session.id)}
                                onSwitchMode={() => pomodoro.switchMode(session.id)}
                                onOpenSettings={pomodoro.openSettingsModal}
                                onEndCurrentWorkSession={() => pomodoro.endCurrentWorkSession(session.id)}
                                onOpenEditActiveSessionModal={() => pomodoro.openEditActiveSessionModal(session)}
                                lastWorkSessionStartTime={session.lastWorkSessionStartTime}
                            />
                            <TaskList
                                session={session}
                                onAddTask={pomodoro.addTaskToSession}
                                onToggleTask={pomodoro.toggleTaskInSession}
                                onDeleteTask={pomodoro.deleteTaskFromSession}
                            />
                        </CardContent>
                    </Card>
                </div>
            ))}
        </div>
    );

    const LogView = (
        <PomodoroLog
            log={pomodoro.pomodoroLog}
            onDeleteEntry={pomodoro.deleteLogEntry}
            onEditEntry={pomodoro.openEditModal}
            onAddEntry={() => setIsAddEntryModalOpen(true)}
            isMobileLayout={true}
        />
    );

    const InsightsView = (
        <Card className="w-full max-w-md shadow-lg bg-card/70 backdrop-blur-sm rounded-3xl mx-auto">
            <CardHeader>
                <div>
                    <CardTitle>Productivity Insights</CardTitle>
                    <CardDescription>Time spent per project.</CardDescription>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-2 pt-4">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className="w-full md:w-auto justify-start text-left font-normal"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {pomodoro.customDateRange?.from ? (
                                    pomodoro.customDateRange.to ? (
                                        <>
                                            {format(pomodoro.customDateRange.from, "LLL dd, y")} -{" "}
                                            {format(pomodoro.customDateRange.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(pomodoro.customDateRange.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>Pick a date</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="range"
                                defaultMonth={pomodoro.customDateRange?.from}
                                selected={pomodoro.customDateRange}
                                onSelect={(range) => {
                                    pomodoro.setCustomDateRange(range);
                                    pomodoro.setActiveFilter('custom');
                                }}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                    <Select value={pomodoro.activeFilter} onValueChange={(value) => pomodoro.setActiveFilter(value as any)}>
                        <SelectTrigger className="w-full md:w-[140px]">
                            <SelectValue placeholder="Select filter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="thisWeek">This Week</SelectItem>
                            <SelectItem value="thisMonth">This Month</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="custom" disabled>Custom</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <ProjectTimeChart data={pomodoro.processedChartData} onBarClick={(projectName) => pomodoro.openEntriesModal(projectName)} />
            </CardContent>
        </Card>
    );

    return (
        <div className="relative flex flex-col h-screen w-full overflow-hidden">
            <header className="flex justify-between items-center w-full p-6 md:p-8 z-20 shrink-0">
                <div className="font-handwritten text-4xl font-bold text-foreground select-none">
                    <span className="hidden md:inline">Adagio</span>
                    <span className="md:hidden">A</span>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggleButton />
                    {currentUser ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="rounded-full h-11 w-11 p-0 overflow-hidden bg-transparent">
                                    <Avatar className="h-full w-full">
                                        {currentUser.photoURL ? (
                                            <AvatarImage src={currentUser.photoURL} alt={currentUser.displayName || 'User avatar'} />
                                        ) : null}
                                        <AvatarFallback className="bg-white/30 text-foreground text-xl">
                                            {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() :
                                            currentUser.email ? currentUser.email.charAt(0).toUpperCase() :
                                            <CircleUserRound className="h-6 w-6" />}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                 <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none text-foreground">
                                            {currentUser.displayName || "User"}
                                        </p>
                                        {currentUser.email && (
                                            <p className="text-xs leading-none text-muted-foreground">
                                                {currentUser.email}
                                            </p>
                                        )}
                                    </div>
                                 </DropdownMenuLabel>
                                 <DropdownMenuSeparator />
                                 {isPremium && (
                                    <DropdownMenuItem disabled className="opacity-100 cursor-default focus:bg-transparent focus:text-primary">
                                        <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                                        <span className="text-sm font-medium text-primary">Premium Member</span>
                                    </DropdownMenuItem>
                                 )}
                                 <DropdownMenuItem onClick={pomodoro.populateTestData} className="cursor-pointer">
                                    <Beaker className="mr-2 h-4 w-4" />
                                    <span>Populate Test Data</span>
                                 </DropdownMenuItem>
                                 <DropdownMenuSeparator />
                                 <DropdownMenuItem onClick={() => pomodoro.setIsWipeConfirmOpen(true)} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Wipe All Data</span>
                                 </DropdownMenuItem>
                                 <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Sign Out</span>
                                 </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button variant="ghost" className="rounded-full h-11 w-11 p-0 overflow-hidden" onClick={() => setIsAuthModalOpen(true)}>
                             <Avatar className="h-full w-full">
                               <AvatarFallback className="bg-white/30 text-foreground">
                                    <CircleUserRound className="h-6 w-6" />
                               </AvatarFallback>
                             </Avatar>
                        </Button>
                    )}
                </div>
            </header>

            <main className="flex-grow overflow-y-auto pt-2 p-4 pb-40 md:pb-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 wide:grid-cols-3 gap-8 items-start max-w-7xl mx-auto">
                    <div className={cn(
                        "md:col-span-1 flex flex-col items-center",
                        activeTab !== 'timer' && 'hidden md:flex'
                    )}>
                        {TimerView}
                    </div>

                    <div className={cn(
                        "md:col-span-1 wide:col-span-1 flex flex-col items-center gap-8 w-full",
                        activeTab === 'timer' && 'hidden md:flex',
                    )}>
                        <div className={cn("w-full max-w-md", activeTab !== 'log' && 'hidden md:block wide:block')}>
                            {LogView}
                        </div>
                        <div className={cn("w-full max-w-md", activeTab !== 'insights' && 'hidden md:block wide:hidden')}>
                           {InsightsView}
                        </div>
                    </div>

                    <div className={cn(
                        "wide:col-span-1 flex flex-col items-center",
                        "hidden wide:flex",
                         activeTab !== 'insights' && 'hidden wide:flex'
                    )}>
                       <div className="max-w-md w-full">{InsightsView}</div>
                    </div>
                </div>
            </main>

            <footer className="absolute bottom-0 left-0 right-0 flex justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-20 md:hidden">
                <div className="w-full max-w-sm h-28 pointer-events-auto bg-background/40 backdrop-blur-xl rounded-full shadow-2xl shadow-black/10 flex justify-around items-center px-4">
                    <ActionButton
                        icon={<Clock className={cn("h-10 w-10", activeTab === 'timer' ? 'text-primary' : 'text-muted-foreground')} />}
                        label="Timer"
                        onClick={() => setActiveTab('timer')}
                        isActive={activeTab === 'timer'}
                        className="rounded-2xl"
                    />
                    <ActionButton
                        icon={<ListChecks className={cn("h-10 w-10", activeTab === 'log' ? 'text-primary' : 'text-muted-foreground')} />}
                        label="Log"
                        onClick={() => setActiveTab('log')}
                        isActive={activeTab === 'log'}
                        className="rounded-2xl"
                    />
                    <ActionButton
                        icon={<BarChart2 className={cn("h-10 w-10", activeTab === 'insights' ? 'text-primary' : 'text-muted-foreground')} />}
                        label="Insights"
                        onClick={() => setActiveTab('insights')}
                        isActive={activeTab === 'insights'}
                        className="rounded-2xl"
                    />
                </div>
            </footer>

            {!currentUser && <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />}
            {currentUser && <AccountModal isOpen={isAccountModalOpen} onOpenChange={setIsAccountModalOpen} />}
            <SettingsModal isOpen={pomodoro.isSettingsModalOpen} onClose={pomodoro.closeSettingsModal} settings={pomodoro.settings} onSave={pomodoro.updateSettings} />
            {pomodoro.entryToEdit && <EditEntryModal isOpen={pomodoro.isEditModalOpen} onClose={pomodoro.closeEditModal} entry={pomodoro.entryToEdit} onSave={pomodoro.updateLogEntry} />}
            <AddEntryModal isOpen={isAddEntryModalOpen} onClose={() => setIsAddEntryModalOpen(false)} onSave={pomodoro.addManualLogEntry} />
            {pomodoro.sessionToSummarize && <SessionSummaryModal isOpen={!!pomodoro.sessionToSummarize} session={pomodoro.sessionToSummarize} onClose={pomodoro.closeSummaryModal} onSave={handleSummarizeAndSave} isSummarizing={isSummarizing} isPremium={isPremium} />}
            {pomodoro.activeSessionToEdit && <EditActiveSessionModal isOpen={pomodoro.isEditActiveSessionModalOpen} onClose={pomodoro.closeEditActiveSessionModal} session={pomodoro.activeSessionToEdit} onSave={pomodoro.updateActiveSessionStartTime} />}
            {pomodoro.selectedChartProject && <ProjectEntriesModal isOpen={pomodoro.isEntriesModalOpen} onClose={pomodoro.closeEntriesModal} projectName={pomodoro.selectedChartProject} entries={pomodoro.entriesForModal} />}
            
            <AlertDialog open={pomodoro.isWipeConfirmOpen} onOpenChange={pomodoro.setIsWipeConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all your sessions, logs, and recent projects from this device and from your account if you are signed in.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={pomodoro.wipeAllData} className={buttonVariants({ variant: "destructive" })}>
                        Yes, wipe everything
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={isManageProjectModalOpen} onOpenChange={setIsManageProjectModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Manage Project</AlertDialogTitle>
                        <AlertDialogDescription>
                            Edit or delete "<strong>{projectToManage}</strong>" from your recent projects.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setProjectToManage(null)}>Cancel</AlertDialogCancel>
                        <Button variant="outline" onClick={handleEditProject}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        <AlertDialogAction onClick={handleDeleteProject} className={buttonVariants({ variant: "destructive" })}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
