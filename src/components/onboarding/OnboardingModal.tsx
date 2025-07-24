
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, BrainCircuit, Coffee, Target, Sparkles, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const steps = [
  {
    icon: Sparkles,
    title: 'Welcome to Adagio!',
    description: 'A simple, beautiful timer to help you find your rhythm and focus. Let\'s quickly walk through how it works.',
  },
  {
    icon: Target,
    title: 'The Pomodoro Technique',
    description: 'It\'s a proven method to boost focus. You work in timed intervals (usually 25 mins), separated by short breaks. It\'s about working *with* your brain, not against it.',
  },
  {
    icon: BrainCircuit,
    title: 'Why It Works',
    description: 'Short, focused sprints prevent burnout and keep your mind fresh. Regular breaks give your brain time to rest and assimilate information, leading to better work.',
  },
  {
    icon: Coffee,
    title: 'How Adagio Helps',
    description: 'Simply start tracking a task. Adagio will count up, and notify you when it might be a good time for a break based on your settings. It\'s a suggestion, not a strict rule!',
  },
  {
    icon: CheckCircle,
    title: 'You\'re All Set!',
    description: 'Ready to find your focus? Start your first session now. You can revisit this guide anytime using the help icon in the header.',
  },
];

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [[page, direction], setPage] = useState([0, 0]);

  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  };

  const handleNext = () => {
    if (page === steps.length - 1) {
      onComplete();
    } else {
      paginate(1);
    }
  };

  const handleBack = () => {
    if (page > 0) {
      paginate(-1);
    }
  };

  const Icon = steps[page].icon;

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md bg-card sm:rounded-3xl p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        {/* Hidden header for accessibility, content is animated separately */}
        <DialogHeader className="sr-only">
          <DialogTitle>{steps[page].title}</DialogTitle>
          <DialogDescription>{steps[page].description}</DialogDescription>
        </DialogHeader>

        <div className="h-[480px] flex flex-col">
          <div className="flex-grow flex flex-col items-center justify-center text-center p-8 overflow-hidden relative">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={page}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className="absolute w-full h-full flex flex-col items-center justify-center p-8"
              >
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 10 }}
                >
                    <Icon className="h-16 w-16 mb-6 text-primary" />
                </motion.div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{steps[page].title}</h2>
                <p className="text-muted-foreground">{steps[page].description}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-center p-2 space-x-2 border-t">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 w-1.5 rounded-full bg-muted transition-all duration-300',
                  i === page ? 'w-6 bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>

          <div className="flex items-center justify-between p-6 bg-muted/30">
            <Button variant="ghost" onClick={handleBack} disabled={page === 0} className={cn(page === 0 && "opacity-0")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleNext}>
              {page === steps.length - 1 ? 'Get Started' : 'Next'}
              {page < steps.length - 1 && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
