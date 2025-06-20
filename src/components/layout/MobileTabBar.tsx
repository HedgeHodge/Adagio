
"use client";

import { Clock, ListChecks, BarChart2 } from 'lucide-react';
// Removed Button import from shadcn, will use raw button for custom styling
import { cn } from '@/lib/utils';

type MobileTab = 'timer' | 'log' | 'insights';

interface MobileTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

const tabs: { name: MobileTab; label: string; icon: React.ElementType }[] = [
  { name: 'timer', label: 'Timer', icon: Clock },
  { name: 'log', label: 'Log', icon: ListChecks },
  { name: 'insights', label: 'Insights', icon: BarChart2 },
];

export function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 pb-3 pt-2 flex justify-center pointer-events-none print:hidden z-50">
      <div className="flex items-center justify-around p-1.5 bg-background/80 dark:bg-background/70 border border-border/70 rounded-full shadow-xl pointer-events-auto gap-1 backdrop-blur-sm w-3/4 max-w-md">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            type="button"
            onClick={() => onTabChange(tab.name)}
            aria-label={tab.label}
            className={cn(
              'relative flex flex-col items-center justify-center h-14 w-14 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              activeTab === tab.name
                ? 'text-primary'
                : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
            )}
          >
            <tab.icon className="h-6 w-6" />
            {activeTab === tab.name && (
              <span
                className="absolute bottom-1.5 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full bg-primary transition-all duration-200"
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
