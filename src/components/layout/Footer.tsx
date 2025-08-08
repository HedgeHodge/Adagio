
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { Clock, ListChecks, BarChart2 } from 'lucide-react';

type ActiveTab = 'timer' | 'log' | 'insights';

const triggerHapticFeedback = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(10); // Vibrate for 10ms
    }
};

const ActionButton = ({ icon, label, className = '', isActive, onTouchStart, ...props }: { icon: React.ReactNode, label: string, className?: string, isActive?: boolean, onTouchStart?: () => void, [key: string]: any }) => (
    <div className="flex flex-col items-center gap-2">
        <Button
            variant="secondary"
            className={cn(
                "w-20 h-20 bg-background/60 dark:bg-background/30 rounded-3xl shadow-lg flex items-center justify-center transition-all duration-200",
                isActive ? 'bg-white dark:bg-secondary scale-110 -translate-y-2' : 'hover:bg-background/80 dark:hover:bg-background/50',
                className
            )}
            onTouchStart={onTouchStart}
            {...props}
        >
            {icon}
        </Button>
        <span className={cn(
            "font-semibold text-sm transition-opacity",
            isActive ? 'text-primary' : 'text-muted-foreground'
        )}>{label}</span>
    </div>
);

interface FooterProps {
    activeTab: ActiveTab;
    setActiveTab: (tab: ActiveTab) => void;
}

export function Footer({ activeTab, setActiveTab }: FooterProps) {
    return (
        <footer className="fixed bottom-0 left-0 right-0 flex justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-20 md:hidden">
            <div className="w-full max-w-sm h-28 pointer-events-auto bg-background/40 backdrop-blur-xl rounded-full shadow-2xl shadow-black/10 flex justify-around items-center px-4">
                <ActionButton
                    icon={<Clock className={cn("h-10 w-10", activeTab === 'timer' ? 'text-primary' : 'text-muted-foreground')} />}
                    label="Timer"
                    onTouchStart={triggerHapticFeedback}
                    onClick={() => setActiveTab('timer')}
                    isActive={activeTab === 'timer'}
                    className="rounded-2xl"
                />
                <ActionButton
                    icon={<ListChecks className={cn("h-10 w-10", activeTab === 'log' ? 'text-primary' : 'text-muted-foreground')} />}
                    label="Log"
                    onTouchStart={triggerHapticFeedback}
                    onClick={() => setActiveTab('log')}
                    isActive={activeTab === 'log'}
                    className="rounded-2xl"
                />
                <ActionButton
                    icon={<BarChart2 className={cn("h-10 w-10", activeTab === 'insights' ? 'text-primary' : 'text-muted-foreground')} />}
                    label="Insights"
                    onTouchStart={triggerHapticFeedback}
                    onClick={() => setActiveTab('insights')}
                    isActive={activeTab === 'insights'}
                    className="rounded-2xl"
                />
            </div>
        </footer>
    );
}
