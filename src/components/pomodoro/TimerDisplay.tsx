
"use client";

import type { IntervalType } from '@/types/pomodoro';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion'; 

interface TimerDisplayProps {
  formattedTime: string;
  intervalType: IntervalType;
  isRunning: boolean;
}

const getIntervalLabelText = (intervalType: IntervalType): string => {
  switch (intervalType) {
    case 'work':
      return "Focusing";
    case 'shortBreak':
      return "Short Break";
    case 'longBreak':
      return "Long Break";
    default:
      return "";
  }
};

export function TimerDisplay({ formattedTime, intervalType, isRunning }: TimerDisplayProps) {
  const animationKey = `${intervalType}-${isRunning}`;
  const isBreak = intervalType === 'shortBreak' || intervalType === 'longBreak';

  return (
    <motion.div
      key={animationKey}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-lg w-full",
      )}
    >
      <motion.h2 
        className="text-lg md:text-xl font-semibold mb-1 text-foreground/80 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        {getIntervalLabelText(intervalType)}
      </motion.h2>
      <motion.div 
        className={cn(
        "text-6xl md:text-7xl font-bold transition-opacity duration-300",
        !isRunning && intervalType === 'work' ? "opacity-70" : "opacity-100",
        isBreak ? 'text-muted-foreground' : 'text-primary'
       )}
       initial={{ opacity: 0, scale: 0.95 }}
       animate={{ opacity: 1, scale: 1 }}
       transition={{ delay: 0.05, duration: 0.3, type: "spring", stiffness: 200, damping: 20 }}
      >
        {formattedTime}
      </motion.div>
    </motion.div>
  );
}
