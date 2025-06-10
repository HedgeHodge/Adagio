
"use client";

import type { IntervalType } from '@/types/pomodoro';
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Settings, Coffee, Briefcase, StopCircle } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TimerControlsProps {
  sessionId: string; // Each control set is for a specific session
  isRunning: boolean;
  currentInterval: IntervalType;
  onStart: () => void; // Specific to this session
  onPause: () => void; // Specific to this session
  onReset: () => void; // Specific to this session
  onSwitchMode: () => void; // Specific to this session
  onOpenSettings: () => void; // Settings are global
  onEndCurrentWorkSession?: () => void; // Specific to this session
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
  onSwitchMode,
  onOpenSettings,
  onEndCurrentWorkSession,
}: TimerControlsProps) {
  const isBreakInterval = currentInterval === 'shortBreak' || currentInterval === 'longBreak';

  const switchModeButtonIcon = isBreakInterval ? <Briefcase className="h-4 w-4" /> : <Coffee className="h-4 w-4" />; // Smaller icons
  const switchModeButtonTooltip = isBreakInterval ? "Start Work" : "Take Break";

  return (
    <div className="flex space-x-2 justify-center items-center mt-2"> {/* Smaller margin, justify center */}
      <AnimatePresence mode="wait">
        {!isRunning ? (
          <motion.div key={`start-${sessionId}`} variants={buttonVariants} initial="initial" animate="animate" exit="exit">
            <Button
              onClick={onStart}
              size="default" // Smaller button
              className="px-6 py-3 text-base shadow-md hover:shadow-lg transition-shadow" // Adjusted padding
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
              size="default" // Smaller button
              className={cn(
                "px-6 py-3 text-base shadow-md hover:shadow-lg transition-shadow", // Adjusted padding
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

      {isRunning && currentInterval === 'work' && onEndCurrentWorkSession && (
        <motion.div variants={buttonVariants} initial="initial" animate="animate" transition={{ delay: 0.05 }}>
          <Button 
            onClick={onEndCurrentWorkSession} 
            variant="destructive" 
            size="icon" 
            className="h-10 w-10" // Adjusted size
            aria-label="End Current Tracking"
            title="End Current Tracking"
          >
            <StopCircle className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      <motion.div variants={buttonVariants} initial="initial" animate="animate" transition={{ delay: 0.1 }}>
        <Button onClick={onReset} variant="ghost" size="icon" className="h-10 w-10 hover:bg-muted">
          <RotateCcw className="h-4 w-4" />
          <span className="sr-only">Reset Timer</span>
        </Button>
      </motion.div>

      <motion.div variants={buttonVariants} initial="initial" animate="animate" transition={{ delay: 0.15 }}>
        <Button 
            onClick={onSwitchMode} 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 hover:bg-muted"
            aria-label={switchModeButtonTooltip}
            title={switchModeButtonTooltip}
        >
          {switchModeButtonIcon}
          <span className="sr-only">{switchModeButtonTooltip}</span>
        </Button>
      </motion.div>

       <motion.div variants={buttonVariants} initial="initial" animate="animate" transition={{ delay: 0.2 }}>
        <Button onClick={onOpenSettings} variant="ghost" size="icon" className="h-10 w-10 hover:bg-muted">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </motion.div>
    </div>
  );
}
