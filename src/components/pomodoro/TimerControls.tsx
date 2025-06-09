
"use client";

import type { IntervalType } from '@/types/pomodoro';
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Settings, Coffee, Briefcase, StopCircle } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TimerControlsProps {
  isRunning: boolean;
  currentInterval: IntervalType;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSwitchMode: () => void;
  onOpenSettings: () => void;
  onEndCurrentWorkSession?: () => void; // Optional for now, will be used
}

const buttonVariants = {
  initial: { opacity: 0, scale: 0.8, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } },
  exit: { opacity: 0, scale: 0.8, y: -10, transition: { duration: 0.2 } },
};

export function TimerControls({
  isRunning,
  currentInterval,
  onStart,
  onPause,
  onReset,
  onSwitchMode,
  onOpenSettings,
  onEndCurrentWorkSession,
}: TimerControlsProps) {
  const isBreakInterval = currentInterval === 'shortBreak' || currentInterval === 'longBreak';

  const switchModeButtonIcon = isBreakInterval ? <Briefcase className="h-5 w-5" /> : <Coffee className="h-5 w-5" />;
  const switchModeButtonText = isBreakInterval ? "Start Work" : "Take Break";
  const switchModeButtonTooltip = isBreakInterval ? "End break and start working" : "Log work and take a break";

  return (
    <div className="flex space-x-3 mb-8 items-center">
      <AnimatePresence mode="wait">
        {!isRunning ? (
          <motion.div key="start" variants={buttonVariants} initial="initial" animate="animate" exit="exit">
            <Button
              onClick={onStart}
              size="lg"
              className="px-8 py-6 text-lg shadow-md hover:shadow-lg transition-shadow"
              variant={isBreakInterval ? 'secondary' : 'default'}
            >
              <Play className="mr-2 h-6 w-6" /> Start
            </Button>
          </motion.div>
        ) : (
          <motion.div key="pause" variants={buttonVariants} initial="initial" animate="animate" exit="exit">
            <Button
              onClick={onPause}
              variant="outline"
              size="lg"
              className={cn(
                "px-8 py-6 text-lg shadow-md hover:shadow-lg transition-shadow",
                isBreakInterval
                  ? "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  : "border-primary text-primary hover:bg-primary/10"
              )}
            >
              <Pause className="mr-2 h-6 w-6" /> Pause
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {isRunning && currentInterval === 'work' && onEndCurrentWorkSession && (
        <motion.div variants={buttonVariants} initial="initial" animate="animate" transition={{ delay: 0.05 }}>
          <Button 
            onClick={onEndCurrentWorkSession} 
            variant="destructive" 
            size="icon" 
            className="h-12 w-12 text-lg"
            aria-label="End Current Tracking"
            title="End Current Tracking"
          >
            <StopCircle className="h-5 w-5" />
          </Button>
        </motion.div>
      )}

      <motion.div variants={buttonVariants} initial="initial" animate="animate" transition={{ delay: 0.1 }}>
        <Button onClick={onReset} variant="ghost" size="icon" className="h-12 w-12 text-lg hover:bg-muted">
          <RotateCcw className="h-5 w-5" />
          <span className="sr-only">Reset Current Timer</span>
        </Button>
      </motion.div>

      <motion.div variants={buttonVariants} initial="initial" animate="animate" transition={{ delay: 0.15 }}>
        <Button 
            onClick={onSwitchMode} 
            variant="ghost" 
            size="icon" 
            className="h-12 w-12 text-lg hover:bg-muted"
            aria-label={switchModeButtonTooltip}
            title={switchModeButtonTooltip}
        >
          {switchModeButtonIcon}
          <span className="sr-only">{switchModeButtonText}</span>
        </Button>
      </motion.div>

       <motion.div variants={buttonVariants} initial="initial" animate="animate" transition={{ delay: 0.2 }}>
        <Button onClick={onOpenSettings} variant="ghost" size="icon" className="h-12 w-12 text-lg hover:bg-muted">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </motion.div>
    </div>
  );
}
