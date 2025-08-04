
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { usePomodoro } from '@/hooks/usePomodoro';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimerDisplay } from '@/components/pomodoro/TimerDisplay';
import { TimerControls } from '@/components/pomodoro/TimerControls';
import { TaskList } from '@/components/pomodoro/TaskList';
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
    pomodoroHooks: ReturnType<typeof usePomodoro>;
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

export function SessionCard({ session, index, activeSessionIndex, paginate, swipeConfidenceThreshold, swipePower, pomodoroHooks }: SessionCardProps) {
    const { 
        startTimer, 
        pauseTimer, 
        endCurrentWorkSession, 
        removeSession,
        openEditActiveSessionModal, 
        formatTime,
        addTaskToSession,
        toggleTaskInSession,
        deleteTaskFromSession,
    } = pomodoroHooks;
    
    const [isFlipped, setIsFlipped] = useState(false);
    
    const direction = index > activeSessionIndex ? 1 : -1;

    const handleDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
        const swipe = swipePower(offset.x, velocity.x);

        if (swipe < -swipeConfidenceThreshold) {
            paginate(1);
        } else if (swipe > swipeConfidenceThreshold) {
            paginate(-1);
        }
    };
    
    const toggleCardFlip = () => {
        setIsFlipped(!isFlipped);
    };

    const handlePan = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Vertical swipe detection
        if (Math.abs(info.offset.y) > Math.abs(info.offset.x)) {
             if (info.velocity.y > 800) { // Swipe down
                toggleCardFlip();
            } else if (info.velocity.y < -800) { // Swipe up
                removeSession(session.id);
            }
        }
    }

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
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={handleDragEnd}
                    onPan={handlePan}
                    style={{ perspective: 1000 }}
                >
                    <motion.div
                        className="relative w-full h-full"
                        style={{ transformStyle: 'preserve-3d' }}
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        {/* Front of Card */}
                        <div className="absolute w-full h-full" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                            <Card className="w-full h-full flex flex-col bg-card/20 backdrop-blur-xl rounded-3xl shadow-2xl">
                                <CardContent className="flex flex-col items-center justify-center p-6 text-center flex-grow">
                                    <h3 className="text-xl font-bold tracking-tight text-foreground truncate max-w-full px-4">{session.project}</h3>
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
                                    <TaskList 
                                        session={session}
                                        onAddTask={addTaskToSession}
                                        onToggleTask={toggleTaskInSession}
                                        onDeleteTask={deleteTaskFromSession}
                                    />
                                </CardContent>
                                <div className="absolute bottom-2 right-2">
                                     <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={toggleCardFlip}>
                                        ...
                                    </Button>
                                </div>
                            </Card>
                        </div>

                        {/* Back of Card */}
                        <div className="absolute w-full h-full" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                             <Card className="w-full h-full flex flex-col items-center justify-center bg-card/20 backdrop-blur-xl rounded-3xl shadow-2xl p-6">
                                <h3 className="text-xl font-bold text-foreground mb-4">Session Options</h3>
                               <Button variant="destructive" onClick={() => removeSession(session.id)} className="w-full">
                                    <Trash2 className="mr-2 h-4 w-4"/>
                                    Delete Session
                                </Button>
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
