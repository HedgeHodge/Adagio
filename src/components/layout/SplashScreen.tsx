
"use client";

import { motion } from 'framer-motion';

export const SplashScreen = () => (
    <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-transparent"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.0, ease: 'easeInOut' }}
    >
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="font-handwritten text-8xl font-bold text-primary select-none"
        >
            Adagio
        </motion.div>
    </motion.div>
);
