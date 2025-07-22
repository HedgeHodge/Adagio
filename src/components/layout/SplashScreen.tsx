
"use client";

import { motion } from 'framer-motion';

export const SplashScreen = () => (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="font-handwritten text-8xl font-bold text-primary select-none"
        >
            Adagio
        </motion.div>
    </div>
);
