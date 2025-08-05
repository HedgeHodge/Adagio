
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  animationKey: string;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -20,
  },
};

const pageTransition = {
  in: {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.25,
  },
  out: {
    type: 'tween',
    ease: 'anticipate',
    duration: 0,
  },
};

export const PageTransition: React.FC<PageTransitionProps> = ({ children, animationKey }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={animationKey}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
