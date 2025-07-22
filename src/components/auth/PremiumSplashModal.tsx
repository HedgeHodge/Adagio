
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { CheckCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

interface PremiumSplashModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const ConfettiPiece = ({ x, y, rotate, color }: { x: number, y: number, rotate: number, color: string }) => {
    const variants = {
        initial: {
            x: '50%',
            y: '50%',
            opacity: 0,
            scale: 0.5,
        },
        animate: {
            x: `${x}%`,
            y: `${y}%`,
            opacity: [0, 0.7, 1, 1, 0],
            scale: [0.5, 1, 1, 0.8, 0],
            rotate,
            transition: {
                duration: 1.5 + Math.random() * 1.5,
                ease: "easeOut",
                delay: Math.random() * 0.5,
            },
        },
    };
    return (
        <motion.div
            className="absolute w-2 h-4"
            style={{ backgroundColor: color, left: 0, top: 0 }}
            variants={variants}
            initial="initial"
            animate="animate"
        />
    );
};


export function PremiumSplashModal({ isOpen, onOpenChange }: PremiumSplashModalProps) {
    const { theme } = useTheme();

    const lightColors = ["#fde68a", "#fca5a5", "#86efac", "#a5b4fc"]; // Pastel Yellow, Red, Green, Blue
    const darkColors = ["#fde047", "#f87171", "#4ade80", "#818cf8"]; // Brighter Yellow, Red, Green, Blue
    const confettiColors = theme === 'dark' ? darkColors : lightColors;

    const confettiPieces = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 200 - 50,
      y: Math.random() * 200 - 50,
      rotate: Math.random() * 360,
      color: confettiColors[i % confettiColors.length],
    }));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card sm:rounded-3xl overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
            {isOpen && confettiPieces.map(piece => <ConfettiPiece key={piece.id} {...piece} />)}
        </div>
        <DialogHeader className="pt-8 text-center z-10">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 10, stiffness: 100, delay: 0.2 }}
            className="flex justify-center"
          >
            <CheckCircle className="h-20 w-20 text-primary" />
          </motion.div>
          <DialogTitle className="text-3xl font-bold text-foreground mt-4">
            Welcome to Premium!
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-lg mt-2">
            You've unlocked all features. Thanks for your support!
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4 py-4 z-10">
            <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Sparkles className="h-5 w-5" />
                <span>AI Summaries & Full History Unlocked</span>
            </div>
        </div>

        <DialogFooter className="z-10">
            <DialogClose asChild>
                <Button type="button" className="w-full" size="lg" onClick={() => onOpenChange(false)}>
                    Start Focusing
                </Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
