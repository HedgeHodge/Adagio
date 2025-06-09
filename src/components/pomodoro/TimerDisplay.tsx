
"use client";

import type { IntervalType } from '@/types/pomodoro';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion'; 

interface TimerDisplayProps {
  formattedTime: string;
  intervalType: IntervalType;
  isRunning: boolean;
}

const intervalLabels: Record<IntervalType, string> = {
  work: "Working On",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};

export function TimerDisplay({ formattedTime, intervalType, isRunning }: TimerDisplayProps) {
  const animationKey = intervalType;
  const isBreak = intervalType === 'shortBreak' || intervalType === 'longBreak';

  return (
    <motion.div
      key={animationKey}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center p-8 rounded-lg shadow-xl w-full max-w-md mb-8 bg-card",
        isRunning && intervalType === 'work' ? 'animate-pulse-bg' : '' // Subtle pulse for active work
      )}
    >
      <motion.h2 
        className="text-2xl font-semibold mb-2 text-foreground/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {intervalLabels[intervalType]}
      </motion.h2>
      <motion.div 
        className={cn(
        "text-7xl md:text-8xl font-bold mb-4 transition-opacity duration-300",
        !isRunning && intervalType === 'work' ? "opacity-70" : "opacity-100",
        isBreak ? 'text-muted-foreground' : 'text-primary'
       )}
       initial={{ opacity: 0, scale: 0.9 }}
       animate={{ opacity: 1, scale: 1 }}
       transition={{ delay: 0.1, duration: 0.4, type: "spring", stiffness: 200, damping: 15 }}
      >
        {formattedTime}
      </motion.div>
      {/* Progress bar removed as timer now counts up indefinitely per session */}
    </motion.div>
  );
}
