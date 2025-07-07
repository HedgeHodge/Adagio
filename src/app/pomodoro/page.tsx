"use client";

import React, { useState, useMemo } from 'react';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useAuth } from '@/context/AuthContext';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { PomodoroLog } from '@/components/pomodoro/PomodoroLog';
import { SettingsModal } from '@/components/pomodoro/SettingsModal';
import { SessionSummaryModal } from '@/components/pomodoro/SessionSummaryModal';
import { EditEntryModal } from '@/components/pomodoro/EditSessionModal';
import { AddEntryModal } from '@/components/pomodoro/AddEntryModal';
import { EditActiveSessionModal } from '@/components/pomodoro/EditActiveSessionModal';
import { ProjectEntriesModal } from '@/components/pomodoro/ProjectEntriesModal';
import { summarizeSession } from '@/ai/flows/summarize-session-flow';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TimerDisplay } from '@/components/pomodoro/TimerDisplay';
import { TimerControls } from '@/components/pomodoro/TimerControls';
import { TaskList } from '@/components/pomodoro/TaskList';
import { Plus, Play, X, Trash2, Calendar as CalendarIcon, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectTimeChart } from '@/components/pomodoro/ProjectTimeChart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

type ActiveTab = 'timer' | 'log' | 'insights';

export default function PomodoroPage() {
    const [activeTab, setActiveTab] = useState<ActiveTab>('timer');
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);

    const pomodoro = usePomodoro();
    const { isPremium } = useAuth();
    
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
                const result = await summarizeSession({ tasks: completedTasks });
                summary = result.projectName;
            } catch (error) {
                console.error("AI summarization failed, falling back.", error);
                summary = session.project; 
            }
        } else if (completedTasks.length > 0) {
            summary = session.project;
        }

        pomodoro.logSessionFromSummary(session, summary);
        setIsSummarizing(false);
    };

    const TimerView = (
        <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
             <Card className="w-full shadow-lg">
                <CardHeader>
                    <CardTitle>Start a New Session</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddSession} className="space-y-4">
                        <div className="relative">
                            <Input
                                id="project-name"
                                placeholder="What are you working on?"
                                value={pomodoro.inputProjectName}
                                onChange={(e) => pomodoro.setInputProjectName(e.target.value)}
                                className="h-12 text-base pr-20"
                                disabled={pomodoro.isDataLoading}
                            />
                            <Button type="submit" size="sm" className="absolute top-1/2 right-2 -translate-y-1/2" disabled={pomodoro.isDataLoading || !pomodoro.inputProjectName.trim()}>
                                <Plus className="mr-1 h-4 w-4" /> Add
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
                                    >
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            className="h-8 pl-3 pr-8 shadow-sm"
                                            onClick={() => pomodoro.addSession(proj)}
                                        >
                                            {proj}
                                            <Play className="absolute right-2 h-4 w-4 text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                                        </Button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>

            <AnimatePresence>
                {pomodoro.activeSessions.map((session, index) => (
                    <motion.div
                        key={session.id}
                        layout
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -30, scale: 0.95 }}
                        transition={{ delay: index * 0.1, type: "spring", stiffness: 300, damping: 30 }}
                        className="w-full"
                    >
                        <Card className="w-full shadow-lg relative overflow-hidden">
                            <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10" onClick={() => pomodoro.removeSession(session.id)}>
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
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );

    const InsightsView = (
        <Card className="w-full max-w-2xl mx-auto shadow-lg">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1">
                        <CardTitle>Productivity Insights</CardTitle>
                        <CardDescription>Time spent per project.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className="w-[280px] justify-start text-left font-normal"
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
                            <SelectTrigger className="w-[140px]">
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
                </div>
            </CardHeader>
            <CardContent>
                <ProjectTimeChart data={pomodoro.processedChartData} onBarClick={(projectName) => pomodoro.openEntriesModal(projectName)} />
            </CardContent>
        </Card>
    );
    
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-6">
                 {activeTab === 'timer' && TimerView}
                 {activeTab === 'log' && (
                     <PomodoroLog
                         log={pomodoro.pomodoroLog}
                         onDeleteEntry={pomodoro.deleteLogEntry}
                         onEditEntry={pomodoro.openEditModal}
                         onAddEntry={() => setIsAddEntryModalOpen(true)}
                         isMobileLayout={true}
                     />
                 )}
                 {activeTab === 'insights' && InsightsView}
            </div>

            <SettingsModal isOpen={pomodoro.isSettingsModalOpen} onClose={pomodoro.closeSettingsModal} settings={pomodoro.settings} onSave={pomodoro.updateSettings} />
            {pomodoro.entryToEdit && <EditEntryModal isOpen={pomodoro.isEditModalOpen} onClose={pomodoro.closeEditModal} entry={pomodoro.entryToEdit} onSave={pomodoro.updateLogEntry} />}
            <AddEntryModal isOpen={isAddEntryModalOpen} onClose={() => setIsAddEntryModalOpen(false)} onSave={pomodoro.addManualLogEntry} />
            {pomodoro.sessionToSummarize && <SessionSummaryModal isOpen={!!pomodoro.sessionToSummarize} session={pomodoro.sessionToSummarize} onSave={handleSummarizeAndSave} isSummarizing={isSummarizing} isPremium={isPremium} />}
            {pomodoro.activeSessionToEdit && <EditActiveSessionModal isOpen={pomodoro.isEditActiveSessionModalOpen} onClose={pomodoro.closeEditActiveSessionModal} session={pomodoro.activeSessionToEdit} onSave={pomodoro.updateActiveSessionStartTime} />}
            {pomodoro.selectedChartProject && <ProjectEntriesModal isOpen={pomodoro.isEntriesModalOpen} onClose={pomodoro.closeEntriesModal} projectName={pomodoro.selectedChartProject} entries={pomodoro.entriesForModal} />}

            <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
    );
}
