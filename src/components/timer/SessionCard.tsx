"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useTimer } from '@/hooks/useTimer';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimerDisplay } from '@/components/timer/TimerDisplay';
import { TimerControls } from '@/components/timer/TimerControls';
import { TaskList } from '@/components/timer/TaskList';
import { ActivePomodoroSession } from '@/types/pomodoro';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

interface SessionCardProps {
    session: ActivePomodoroSession;
    index: number;
    activeSessionIndex: number;
    paginate: (newDirection: number) => void;
    swipeConfidenceThreshold: number;
    swipePower: (offset: number, velocity: number) => number;
    pomodoroHooks: ReturnType<typeof useTimer>;
}

const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.8,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.8,
      transition: {
        x: { duration: 0.3 },
        opacity: { duration: 0.2 },
      },
    }),
  };

  const cardShakeVariants = {
    shaking: {
        x: [0, -10, 10, -10, 10, -5, 5, 0],
        transition: { 
            duration: 0.5, 
            repeat: Infinity,
        },
    },
    normal: {
        x: 0,
    }
  }

export function SessionCard({ session, index, activeSessionIndex, paginate, swipeConfidenceThreshold, swipePower, pomodoroHooks }: SessionCardProps) {
    const { 
        startTimer, 
        pauseTimer, 
        removeSession,
        openEditActiveSessionModal, 
        addTaskToSession,
        toggleTaskInSession,
        deleteTaskFromSession,
    } = pomodoroHooks;
    
    const [isFlipped, setIsFlipped] = useState(false);
    const [deleteIntent, setDeleteIntent] = useState(false);
    
    const direction = index > activeSessionIndex ? 1 : -1;

    const toggleCardFlip = () => {
        setIsFlipped(!isFlipped);
    };

    const handleDrag = (e: MouseEvent | TouchEvent | PointerEvent, { offset }: PanInfo) => {
        if (offset.y < -50) {
            setDeleteIntent(true);
        } else {
            setDeleteIntent(false);
        }
    };

    const handleDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
        const swipeX = swipePower(offset.x, velocity.x);

        if (deleteIntent) {
            removeSession(session.id);
            setDeleteIntent(false);
            return;
        }

        if (Math.abs(offset.y) > Math.abs(offset.x) * 1.5) {
            if (offset.y > 25 && velocity.y > 150) { 
                toggleCardFlip();
                return;
            }
        }

        if (swipeX < -swipeConfidenceThreshold) {
            paginate(1);
        } else if (swipeX > swipeConfidenceThreshold) {
            paginate(-1);
        }
    };

    if (index < activeSessionIndex -1 || index > activeSessionIndex + 1) {
        return null;
    }

    return (
        <AnimatePresence initial={false} custom={direction}>
            {index === activeSessionIndex && (
                <motion.div
                    key={index}
                    className="absolute w-full h-full"
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                        x: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 }
                    }}
                    drag
                    dragDirectionLock
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={0.2}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    style={{ perspective: 1000 }}
                >
                    <motion.div
                        className="relative w-full h-full"
                        style={{ transformStyle: 'preserve-3d' }}
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        {/* Front of Card */}
                        <motion.div 
                            className="absolute w-full h-full" 
                            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                            variants={cardShakeVariants}
                            animate={deleteIntent ? "shaking" : "normal"}
                        >
                            <Card className={cn("relative w-full h-full flex flex-col justify-center items-center bg-card/20 backdrop-blur-xl rounded-3xl shadow-2xl p-6 transition-colors duration-300", { "bg-red-500/30": deleteIntent })}>
                                {deleteIntent && (
                                    <motion.div className="absolute inset-0 flex items-center justify-center" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}>
                                        <Trash2 className="w-16 h-16 text-red-500/80" />
                                    </motion.div>
                                )}
                                <motion.div 
                                    className="w-full h-full flex flex-col"
                                    animate={{ opacity: deleteIntent ? 0 : 1 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <CardHeader className="absolute top-0 left-0 w-full flex flex-row items-center justify-between p-6">
                                        <h3 className="text-xl font-bold tracking-tight text-foreground truncate max-w-full">{session.project}</h3>
                                    </CardHeader>
                                    <CardContent className="flex flex-col items-center justify-center text-center h-full">
                                        <TimerDisplay
                                            remainingTime={session.currentTime}
                                            mode={session.currentInterval}
                                        />
                                        <TimerControls
                                            session={session}
                                            onStartPause={() => session.isRunning ? pauseTimer(session.id) : startTimer(session.id)}
                                            onReset={() => pomodoroHooks.resetTimer(session.id)}
                                            onSkip={() => pomodoroHooks.skipInterval(session.id)}
                                            isTimerRunning={session.isRunning}
                                            mode={session.currentInterval}
                                            onOpenEditActiveSessionModal={() => openEditActiveSessionModal(session)}
                                            onToggleCardFlip={toggleCardFlip}
                                            onOpenSettingsModal={pomodoroHooks.openSettingsModal}
                                        />
                                    </CardContent>
                                </motion.div>
                            </Card>
                        </motion.div>

                        {/* Back of Card */}
                        <div className="absolute w-full h-full" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                             <Card className="w-full h-full flex flex-col items-center justify-center bg-card/20 backdrop-blur-xl rounded-3xl shadow-2xl p-6">
                                <h3 className="text-xl font-bold text-foreground mb-4">Tasks</h3>
                               <TaskList 
                                    session={session}
                                    onAddTask={addTaskToSession}
                                    onToggleTask={toggleTaskInSession}
                                    onDeleteTask={deleteTaskFromSession}
                                />
                                <div className="absolute bottom-2 right-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={toggleCardFlip}>
                                        &times;
                                    </Button>
                                </div>
                             </Card>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}