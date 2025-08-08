
"use client";

import type { IntervalType } from '@/types/pomodoro';
import { Button } from "@/components/ui/button";
import { Play, Pause, StopCircle, Pencil, ListChecks, Coffee, FastForward } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TimerControlsProps {
  session: any;
  onStartPause: () => void;
  onEndSession: () => void;
  onSkip: () => void;
  onSkipBreak: () => void;
  isTimerRunning: boolean;
  mode: IntervalType;
  onOpenEditActiveSessionModal: () => void;
  onToggleCardFlip: () => void;
  className?: string;
}

const buttonVariants = {
  initial: { opacity: 0, scale: 0.8, y: 5 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 500, damping: 30 } },
  exit: { opacity: 0, scale: 0.8, y: -5, transition: { duration: 0.15 } },
};

export function TimerControls({ session, onStartPause, onEndSession, onSkip, onSkipBreak, isTimerRunning, mode, onOpenEditActiveSessionModal, onToggleCardFlip, className }: TimerControlsProps) {
  const isBreakInterval = mode === 'shortBreak' || mode === 'longBreak';

  return (
    <div className={cn("flex flex-wrap justify-center items-center mt-2 gap-2", className)}>
      <AnimatePresence mode="wait">
        {!isTimerRunning ? (
          <motion.div key={`start-${session.id}`} variants={buttonVariants} initial="initial" animate="animate" exit="exit">
            <Button
              onClick={onStartPause}
              size="lg"
              className="px-8 py-4 text-base shadow-md hover:shadow-lg transition-shadow rounded-lg"
              variant={isBreakInterval ? 'secondary' : 'default'}
            >
              <Play className="mr-1.5 h-5 w-5" /> Start
            </Button>
          </motion.div>
        ) : (
          <motion.div key={`pause-${session.id}`} variants={buttonVariants} initial="initial" animate="animate" exit="exit">
            <Button
              onClick={onStartPause}
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
        {isTimerRunning && (
            <motion.div variants={buttonVariants} initial="initial" animate="animate" transition={{ delay: 0.05 }}>
                <Button 
                  onClick={onEndSession} 
                  variant="destructive" 
                  size="icon" 
                  className="h-10 w-10 rounded-lg"
                  aria-label="End & Log Session"
                  title="End & Log Session"
                >
                  <StopCircle className="h-5 w-5" />
                </Button>
              </motion.div>
        )}
        {isTimerRunning && mode === 'work' && (
            <motion.div variants={buttonVariants} initial="initial" animate="animate" transition={{ delay: 0.05 }}>
                <Button 
                  onClick={onSkip} 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-lg"
                  aria-label="Take a Break"
                  title="Take a Break"
                >
                  <Coffee className="h-5 w-5" />
                </Button>
              </motion.div>
        )}
         {isTimerRunning && isBreakInterval && (
            <motion.div variants={buttonVariants} initial="initial" animate="animate" transition={{ delay: 0.05 }}>
                <Button 
                  onClick={onSkipBreak} 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-lg"
                  aria-label="End Break"
                  title="End Break"
                >
                  <FastForward className="h-5 w-5" />
                </Button>
              </motion.div>
        )}
        <motion.div variants={buttonVariants} initial="initial" animate="animate" transition={{ delay: 0.1 }}>
          <Button 
            onClick={onOpenEditActiveSessionModal} 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-lg"
            aria-label="Edit Session"
            title="Edit Session"
          >
            <Pencil className="h-5 w-5" />
          </Button>
        </motion.div>
        <motion.div variants={buttonVariants} initial="initial" animate="animate" transition={{ delay: 0.15 }}>
          <Button 
            onClick={onToggleCardFlip} 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-lg"
            aria-label="Tasks"
            title="Tasks"
          >
            <ListChecks className="h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

    