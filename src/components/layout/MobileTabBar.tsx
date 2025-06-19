
"use client";

import { Clock, ListChecks, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t border-border bg-background shadow-md">
      {tabs.map((tab) => (
        <Button
          key={tab.name}
          variant="ghost"
          className={cn(
            'flex h-full flex-1 flex-col items-center justify-center rounded-none px-2 py-1 text-xs transition-all duration-300 ease-out', // Added transition
            activeTab === tab.name
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
          onClick={() => onTabChange(tab.name)}
        >
          <tab.icon className={cn(
            'mb-0.5 h-5 w-5 transition-transform duration-300 ease-out', // Added transition-transform
            activeTab === tab.name ? 'text-primary scale-110' : '' // Added scale-110 for active
          )} />
          <span className={cn(activeTab === tab.name && 'font-medium')}> {/* Added font-medium for active label */}
            {tab.label}
          </span>
        </Button>
      ))}
    </nav>
  );
}
