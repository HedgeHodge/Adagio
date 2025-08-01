
"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
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
    Settings,
    BookText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AccountModal } from '@/components/auth/AccountModal';
import { PremiumSplashModal } from '@/components/auth/PremiumSplashModal';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { useOnboarding } from '@/hooks/useOnboarding';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { DevToolsModal } from '@/components/dev/DevToolsModal';
import { InsightsStats } from '@/components/pomodoro/InsightsStats';
import { PeriodSummaryModal } from '@/components/pomodoro/PeriodSummaryModal';
import { AddSessionModal } from '@/components/pomodoro/AddSessionModal';


const ActionButton = ({ icon, label, className = '', isActive, ...props }: { icon: React.ReactNode, label: string, className?: string, isActive?: boolean, [key: string]: any }) => (
    <div className="flex flex-col items-center gap-2">
        <Button
            variant="secondary"
            className={cn(
                "w-20 h-20 bg-background/60 dark:bg-background/30 rounded-3xl shadow-lg flex items-center justify-center transition-all duration-200",
                isActive ? 'bg-white dark:bg-secondary scale-110 -translate-y-2' : 'hover:bg-background/80 dark:hover:bg-background/50',
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
    const { currentUser, loading } = useAuth();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(!currentUser);
    const [isSplashVisible, setIsSplashVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsSplashVisible(false);
        }, 2000); // Minimum splash screen time: 2 seconds

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        // Keep auth modal sync with user status, but only if not loading
        if (!loading) {
            setIsAuthModalOpen(!currentUser);
        }
    }, [currentUser, loading]);

    if (loading || isSplashVisible) {
        return (
            <AnimatePresence>
                {(loading || isSplashVisible) && <SplashScreen />}
            </AnimatePresence>
        );
    }

    if (!currentUser) {
        return (
             <div className="h-screen w-screen flex items-center justify-center bg-background/40 backdrop-blur-lg">
                <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
            </div>
        );
    }

    return <AuthenticatedApp />;
}

function AuthenticatedApp() {
    const [activeTab, setActiveTab] = useState<ActiveTab>('timer');
    const { currentUser, isPremium, signOut, upgradeUserToPremium, togglePremiumStatus, isPremiumSplashVisible, hidePremiumSplash } = useAuth();
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isDevToolsModalOpen, setIsDevToolsModalOpen] = useState(false);

    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);
    const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
    
    const [[activeSessionIndex, direction], setPage] = useState([0, 0]);

    const [projectToManage, setProjectToManage] = useState<string | null>(null);
    const [isManageProjectModalOpen, setIsManageProjectModalOpen] = useState(false);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [dragDirection, setDragDirection] = useState<string | null>(null);

    const y = useMotionValue(0);
    const rotateY = useTransform(y, [0, 100], [0, 180]);
    
    const pomodoro = usePomodoro();

    const toggleCardFlip = () => {
        const currentY = y.get();
        animate(y, currentY < 50 ? 100 : 0, { duration: 0.4 });
    };

    const getDuration = (session: any) => {
        if (!session) return 0;
        const sessionSettings = pomodoro.settings;
        switch (session.currentInterval) {
            case 'work':
                return sessionSettings.workDuration * 60;
            case 'shortBreak':
                return sessionSettings.shortBreakDuration * 60;
            case 'longBreak':
                return sessionSettings.longBreakDuration * 60;
            default:
                return sessionSettings.workDuration * 60;
        }
    };
    const { showOnboarding, isFirstTime, setOnboardingCompleted } = useOnboarding(currentUser);
    
    useEffect(() => {
        if (activeSessionIndex >= pomodoro.activeSessions.length && pomodoro.activeSessions.length > 0) {
            setPage([pomodoro.activeSessions.length - 1, 0]);
        } else if (pomodoro.activeSessions.length === 0) {
            setPage([0, 0]);
        }
    }, [pomodoro.activeSessions.length, activeSessionIndex]);

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

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            rotateY: 0
        },
        flipped: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            rotateY: 180
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0
        }),
        exit_up: {
            y: -1000,
            opacity: 0
        }
    };

    const swipeConfidenceThreshold = 10000;
    const swipePower = (offset: number, velocity: number) => {
        return Math.abs(offset) * velocity;
    };

    const paginate = (newDirection: number) => {
        const newIndex = activeSessionIndex + newDirection;
        if (newIndex >= 0 && newIndex < pomodoro.activeSessions.length) {
            setPage([newIndex, newDirection]);
        }
    };

    const TimerView = (
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
            <div
                className="w-full shadow-lg rounded-3xl flex"
            >
                <Card className="w-full bg-card/20 backdrop-blur-xl rounded-3xl max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center"><Clock className="mr-2 h-5 w-5" />Start a New Session</span>
                        </CardTitle>
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
            </div>
        </div>
    );

    const LogView = (
        <PomodoroLog
            log={pomodoro.pomodoroLog}
            onDeleteEntry={pomodoro.deleteLogEntry}
            onEditEntry={pomodoro.openEditModal}
            onAddEntry={() => setIsAddEntryModalOpen(true)}
            isMobileLayout={true}
            hasExceededFreeLogLimit={pomodoro.hasExceededFreeLogLimit}
            isPremium={isPremium}
            onUpgrade={upgradeUserToPremium}
        />
    );

    const InsightsView = (
        <Card className="w-full max-w-md shadow-lg bg-card/20 backdrop-blur-xl rounded-3xl mx-auto">
            <CardHeader>
                <div>
                    <CardTitle className="flex items-center"><BarChart2 className="mr-2 h-5 w-5" />Productivity Insights</CardTitle>
                    <CardDescription>Your performance for the selected period.</CardDescription>
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
            <CardContent className="space-y-4">
                <InsightsStats stats={pomodoro.insightsStats} />
                <div>
                    <CardDescription className="mb-2">Time spent per project</CardDescription>
                    <ProjectTimeChart data={pomodoro.processedChartData} onBarClick={(projectName) => pomodoro.openEntriesModal(projectName)} />
                </div>
                 <Button 
                    onClick={pomodoro.generatePeriodSummary} 
                    className="w-full"
                    disabled={pomodoro.isGeneratingSummary || pomodoro.filteredLogForPeriod.length === 0}
                >
                    {pomodoro.isGeneratingSummary ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                    ) : (
                       isPremium ? (
                           <><Sparkles className="mr-2 h-4 w-4" />Generate Summary</>
                       ) : (
                           <><BookText className="mr-2 h-4 w-4" />Generate Summary</>
                       )
                    )}
                </Button>
            </CardContent>
        </Card>
    );

    return (
        <div className="relative flex flex-col h-screen w-full">
            <header className="sticky top-0 z-30 h-28">
                {/* Background div */}
                <div className="absolute inset-0 bg-background/40 backdrop-blur-lg vertical-fade pointer-events-none"></div>
                {/* Content div */}
                <div className="relative z-10 flex h-full justify-between items-start px-6 md:px-8 pt-6 pb-3">
                    <div className="font-handwritten text-4xl font-bold text-foreground select-none">
                        <span className="hidden md:inline">Adagio</span>
                        <span className="md:hidden">A</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 md:hidden"
                            onClick={() => setIsAddSessionModalOpen(true)}
                        >
                            <Plus className="h-5 w-5" />
                            <span className="sr-only">Add Session</span>
                        </Button>
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
                                    {!isPremium ? (
                                        <DropdownMenuItem onClick={upgradeUserToPremium} className="cursor-pointer text-primary focus:text-primary focus:bg-primary/10">
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            <span>Upgrade to Premium</span>
                                        </DropdownMenuItem>
                                    ) : (
                                        <DropdownMenuItem disabled className="opacity-100 cursor-default focus:bg-transparent focus:text-primary">
                                            <CheckCircle className="mr-2 h-4 w-4 text-primary" />
                                            <span className="text-sm font-medium text-primary">Premium Member</span>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={pomodoro.openSettingsModal} className="cursor-pointer">
                                        <Settings className="mr-2 h-4 w-4" />
                                        <span>Timer Settings</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsDevToolsModalOpen(true)} className="cursor-pointer">
                                        <Beaker className="mr-2 h-4 w-4" />
                                        <span>Dev Tools</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Sign Out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Button variant="ghost" className="rounded-full h-11 w-11 p-0 overflow-hidden" onClick={() => setIsAccountModalOpen(true)}>
                                <Avatar className="h-full w-full">
                                <AvatarFallback className="bg-white/30 text-foreground">
                                        <CircleUserRound className="h-6 w-6" />
                                </AvatarFallback>
                                </Avatar>
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-grow p-4 pb-40 md:pb-8">
                {pomodoro.activeSessions.length > 0 && (
                    <div className="w-full max-w-md mx-auto flex flex-col" style={{ height: '420px' }}>
                        <div className="relative flex-grow flex items-center justify-center" style={{ perspective: 1000 }}>
                            <AnimatePresence initial={false} custom={direction} >
                                {pomodoro.activeSessions.map((session, index) => (
                                    index === activeSessionIndex && (
                                    <motion.div
                                        key={session.id}
                                        className="w-full max-w-md h-full absolute"
                                        style={{ transformStyle: 'preserve-3d', rotateY: rotateY }}
                                        drag
                                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                                        dragDirectionLock
                                        onDirectionLock={axis => setDragDirection(axis)}
                                        onDrag={(e, { offset }) => {
                                            if (dragDirection === 'y') {
                                                if (offset.y < 0) return;
                                                const newY = (offset.y / 200) * 100;
                                                y.set(Math.min(newY, 100));
                                            }
                                        }}
                                        onDragEnd={(e, { offset, velocity }) => {
                                            if (dragDirection === 'x') {
                                                const swipe = swipePower(offset.x, velocity.x);
                                                if (pomodoro.activeSessions.length === 1 && Math.abs(swipe) > swipeConfidenceThreshold) {
                                                    setIsAddSessionModalOpen(true);
                                                } else {
                                                    if (swipe < -swipeConfidenceThreshold) {
                                                        paginate(1);
                                                    } else if (swipe > swipeConfidenceThreshold) {
                                                        paginate(-1);
                                                    }
                                                }
                                            } else if (dragDirection === 'y') {
                                                const swipeY = swipePower(offset.y, velocity.y);
                                                if (swipeY < -swipeConfidenceThreshold) {
                                                    pomodoro.removeSession(session.id);
                                                    return;
                                                }
                                                
                                                const currentY = y.get();
                                                if (currentY > 50 || velocity.y > 300) {
                                                    animate(y, 100, { type: "spring", stiffness: 400, damping: 30, velocity: velocity.y });
                                                } else {
                                                    animate(y, 0, { type: "spring", stiffness: 400, damping: 30, velocity: velocity.y });
                                                }
                                            }
                                            setDragDirection(null);
                                        }}
                                    >
                                        {/* Front */}
                                        <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }} className="h-full">
                                            <Card className="w-full h-full bg-card/20 backdrop-blur-xl rounded-3xl shadow-lg flex flex-col">
                                                <CardHeader className="flex flex-row items-center justify-between">
                                                    <CardTitle>{session.project}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="flex flex-col items-center justify-center flex-grow">
                                                    <div className="flex flex-col items-center justify-center gap-4">
                                                        <TimerDisplay
                                                            remainingTime={session.currentTime}
                                                            mode={session.currentInterval}
                                                        />
                                                        <TimerControls
                                                            session={session}
                                                            onStartPause={() => session.isRunning ? pomodoro.pauseTimer(session.id) : pomodoro.startTimer(session.id)}
                                                            onReset={() => pomodoro.resetTimer(session.id)}
                                                            onSkip={() => pomodoro.skipInterval(session.id)}
                                                            isTimerRunning={session.isRunning}
                                                            mode={session.currentInterval}
                                                            onOpenEditActiveSessionModal={() => pomodoro.openEditActiveSessionModal(session)}
                                                            onToggleCardFlip={toggleCardFlip}
                                                            className="flex items-center justify-center gap-4"
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* Back */}
                                        <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} className="absolute top-0 left-0 w-full h-full">
                                            <Card className="w-full h-full bg-card/20 backdrop-blur-xl rounded-3xl shadow-lg flex flex-col">
                                                <CardHeader className="flex flex-row items-center justify-between">
                                                    <CardTitle>Tasks</CardTitle>
                                                    <Button variant="ghost" size="icon" onClick={toggleCardFlip}>
                                                        <X className="h-5 w-5" />
                                                    </Button>
                                                </CardHeader>
                                                <CardContent className="flex-grow overflow-y-auto">
                                                    <TaskList
                                                        session={session}
                                                        onAddTask={pomodoro.addTaskToSession}
                                                        onToggleTask={pomodoro.toggleTaskInSession}
                                                        onDeleteTask={pomodoro.deleteTaskFromSession}
                                                    />
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </motion.div>
                                    )
                                ))}
                            </AnimatePresence>
                        </div>
                        
                        
                    </div>
                )}

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 items-start max-w-7xl mx-auto">
                    <div className={cn(
                        "md:col-span-1 flex flex-col items-center",
                        activeTab !== 'timer' && 'hidden md:flex'
                    )}>
                        {pomodoro.activeSessions.length === 0 && TimerView}
                    </div>

                    <div className={cn(
                        "md:col-span-1 flex flex-col items-center gap-8 w-full",
                        activeTab === 'timer' && 'hidden md:flex',
                    )}>
                        <div className={cn("w-full max-w-md", activeTab !== 'log' && 'hidden md:block')}>
                            {LogView}
                        </div>
                        <div className={cn("w-full max-w-md", activeTab !== 'insights' && 'hidden md:block')}>
                           {InsightsView}
                        </div>
                    </div>
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 flex justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-20 md:hidden">
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

            {currentUser && <AccountModal isOpen={isAccountModalOpen} onOpenChange={setIsAccountModalOpen} />}
            {currentUser && isPremiumSplashVisible && <PremiumSplashModal isOpen={isPremiumSplashVisible} onOpenChange={hidePremiumSplash} />}
            {currentUser && <DevToolsModal
                isOpen={isDevToolsModalOpen}
                onOpenChange={setIsDevToolsModalOpen}
                onPopulateData={pomodoro.populateTestData}
                onTogglePremium={togglePremiumStatus}
                onShowOnboarding={showOnboarding}
                onWipeAllData={() => pomodoro.setIsWipeConfirmOpen(true)}
                isPremium={isPremium}
             />}

            <OnboardingModal isOpen={isFirstTime} onComplete={setOnboardingCompleted} />

            <AddSessionModal 
                isOpen={isAddSessionModalOpen}
                onOpenChange={setIsAddSessionModalOpen}
                onAddSession={pomodoro.addSession}
                recentProjects={pomodoro.recentProjects}
            />
            <SettingsModal isOpen={pomodoro.isSettingsModalOpen} onClose={pomodoro.closeSettingsModal} settings={pomodoro.settings} onSave={pomodoro.updateSettings} />
            {pomodoro.entryToEdit && <EditEntryModal isOpen={pomodoro.isEditModalOpen} onClose={pomodoro.closeEditModal} entry={pomodoro.entryToEdit} onSave={pomodoro.updateLogEntry} />}
            <AddEntryModal isOpen={isAddEntryModalOpen} onClose={() => setIsAddEntryModalOpen(false)} onSave={pomodoro.addManualLogEntry} />
            {pomodoro.sessionToSummarize && <SessionSummaryModal isOpen={!!pomodoro.sessionToSummarize} session={pomodoro.sessionToSummarize} onClose={pomodoro.closeSummaryModal} onSave={handleSummarizeAndSave} isSummarizing={isSummarizing} isPremium={isPremium} />}
            {pomodoro.activeSessionToEdit && <EditActiveSessionModal isOpen={pomodoro.isEditActiveSessionModalOpen} onClose={pomodoro.closeEditActiveSessionModal} session={pomodoro.activeSessionToEdit} onSave={pomodoro.updateActiveSessionStartTime} />}
            {pomodoro.selectedChartProject && <ProjectEntriesModal isOpen={pomodoro.isEntriesModalOpen} onClose={pomodoro.closeEntriesModal} projectName={pomodoro.selectedChartProject} entries={pomodoro.entriesForModal} />}
            
             {pomodoro.periodSummary && (
                <PeriodSummaryModal 
                    isOpen={pomodoro.isPeriodSummaryModalOpen} 
                    onClose={pomodoro.closePeriodSummaryModal}
                    summary={pomodoro.periodSummary}
                    entries={pomodoro.filteredLogForPeriod}
                    isPremium={isPremium}
                    onUpgrade={upgradeUserToPremium}
                />
            )}

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
            
            <AlertDialog open={pomodoro.isShortSessionConfirmOpen} onOpenChange={pomodoro.closeShortSessionConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Log Short Session?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This session is less than one minute long. Are you sure you want to log it?
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => pomodoro.closeShortSessionConfirm(false)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => pomodoro.closeShortSessionConfirm(true)}>
                        Yes, log it
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

    
