
"use client";

import type { IntervalType } from '@/types/pomodoro';
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Coffee, Briefcase, StopCircle, Pencil } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TimerControlsProps {
  sessionId: string; // Each control set is for a specific session
  isRunning: boolean;
  currentInterval: IntervalType;
  onStart: () => void; // Specific to this session
  onPause: () => void; // Specific to this session
  onReset: () => void; // Specific to this session
  onEndCurrentWorkSession?: () => void; // Specific to this session
  onOpenEditActiveSessionModal: () => void; // Specific to this session
  lastWorkSessionStartTime: number | null; // To determine if edit is allowed
}

const buttonVariants = {
  initial: { opacity: 0, scale: 0.8, y: 5 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 500, damping: 30 } },
  exit: { opacity: 0, scale: 0.8, y: -5, transition: { duration: 0.15 } },
};

export function TimerControls({
  sessionId, // unused in render but good for keying if needed
  isRunning,
  currentInterval,
  onStart,
  onPause,
  onReset,
  onEndCurrentWorkSession,
  onOpenEditActiveSessionModal,
  lastWorkSessionStartTime
}: TimerControlsProps) {
  const isBreakInterval = currentInterval === 'shortBreak' || currentInterval === 'longBreak';

  return (
    <div className="flex flex-wrap gap-1 justify-center items-center mt-2">
      <AnimatePresence mode="wait">
        {!isRunning ? (
          <motion.div key={`start-${sessionId}`} variants={buttonVariants} initial="initial" animate="animate" exit="exit">
            <Button
              onClick={onStart}
              size="lg"
              className="px-8 py-4 text-base shadow-md hover:shadow-lg transition-shadow rounded-lg"
              variant={isBreakInterval ? 'secondary' : 'default'}
            >
              <Play className="mr-1.5 h-5 w-5" /> Start
            </Button>
          </motion.div>
        ) : (
          <motion.div key={`pause-${sessionId}`} variants={buttonVariants} initial="initial" animate="animate" exit="exit">
            <Button
              onClick={onPause}
              variant="outline"
              size="lg"
              className={cn(
                "px-8 py-4 text-base shadow-md hover:shadow-lg transition-shadow rounded-lg",
                isBreakInterval
                  ? "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  : "border-primary text-primary hover:bg-primary/10"
              )}
            >
              <Pause className="mr-1.5 h-5 w-5" /> Pause
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1">
        {isRunning && currentInterval === 'work' && onEndCurrentWorkSession && (
          <motion.div variants={buttonVariants} initial="initial" animate="animate" transition={{ delay: 0.05 }}>
            <Button 
              onClick={onEndCurrentWorkSession} 
              variant="destructive" 
              size="icon" 
              className="h-10 w-10 rounded-lg"
              aria-label="End Current Tracking"
              title="End Current Tracking"
            >
              <StopCircle className="h-5 w-5" />
            </Button>
          </motion.div>
        )}

        {currentInterval === 'work' && lastWorkSessionStartTime && (
           <motion.div variants={buttonVariants} initial="initial" animate="animate" transition={{ delay: 0.15 }}>
              <Button 
                  onClick={onOpenEditActiveSessionModal} 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-lg hover:bg-muted"
                  aria-label="Edit start time"
                  title="Edit start time"
              >
                <Pencil className="h-5 w-5" />
              </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
