
"use client";

import type { LogEntry } from '@/types/pomodoro';
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListChecks, Briefcase, Trash2, Pencil, PlusCircle, Loader2, Sparkles } from 'lucide-react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface EntryLogProps {
  log: LogEntry[];
  onDeleteEntry: (id: string) => void;
  onEditEntry: (entry: LogEntry) => void;
  onAddEntry?: () => void;
  isMobileLayout?: boolean;
  hasExceededFreeLogLimit?: boolean;
  isPremium?: boolean;
  onUpgrade?: () => void;
}

const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
};

export function EntryLog({ 
  log, 
  onDeleteEntry, 
  onEditEntry, 
  onAddEntry, 
  isMobileLayout = false,
  hasExceededFreeLogLimit = false,
  isPremium = false,
  onUpgrade
}: EntryLogProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sortedLog = useMemo(() => {
    return [...log].sort((a, b) => parseISO(b.endTime).getTime() - parseISO(a.endTime).getTime());
  }, [log]);

  const groupedLog = useMemo(() => {
    if (!isMounted) return {};
    return sortedLog.reduce<Record<string, LogEntry[]>>((acc, entry) => {
      try {
        const entryDateStr = format(parseISO(entry.startTime), 'yyyy-MM-dd');
        if (!acc[entryDateStr]) {
          acc[entryDateStr] = [];
        }
        acc[entryDateStr].push(entry);
      } catch (e) {
        console.warn("Could not parse date for grouping log entry:", entry, e);
      }
      return acc;
    }, {});
  }, [sortedLog, isMounted]);

  const groupDates = Object.keys(groupedLog);
  const hasEntries = log.length > 0;

  const renderLoader = () => (
    <Card className={cn(
      "w-full shadow-lg rounded-3xl max-w-md",
      isMobileLayout && "mt-0 flex-1 flex flex-col min-h-0 bg-card/20 backdrop-blur-xl"
    )}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-foreground"><ListChecks className="mr-2 h-5 w-5 text-chart-3" />Entry Log</CardTitle>
          {onAddEntry && (
            <Button onClick={onAddEntry} variant="ghost" size="icon" aria-label="Add manual entry" disabled>
              <PlusCircle className="h-6 w-6 text-primary/80" />
            </Button>
          )}
        </div>
        <CardDescription className="text-muted-foreground">
          Loading your completed work entries...
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("p-0 min-h-0", isMobileLayout && "flex-1 flex flex-col")}>
         <div className="h-[240px] flex items-center justify-center p-6">
           <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
         </div>
      </CardContent>
    </Card>
  );

  if (!isMounted) {
    return renderLoader();
  }

  return (
    <Card className={cn(
      "w-full shadow-lg rounded-3xl max-w-md",
      isMobileLayout && "mt-0 flex-1 flex flex-col min-h-0 bg-card/20 backdrop-blur-xl"
    )}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-foreground"><ListChecks className="mr-2 h-5 w-5 text-chart-3" />Entry Log</CardTitle>
          {onAddEntry && (
            <Button onClick={onAddEntry} variant="ghost" size="icon" aria-label="Add manual entry">
              <PlusCircle className="h-6 w-6 text-primary hover:text-primary/80" />
            </Button>
          )}
        </div>
        <CardDescription className="text-muted-foreground">
          {hasEntries ? 'Your completed work entries, grouped by day.' : 'No entries completed yet. Start working or add one manually!'}
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("p-0 min-h-0", isMobileLayout && "flex-1 flex flex-col")}>
        {!hasEntries ? (
           <div className="h-[200px] flex items-center justify-center p-6">
             <p className="text-sm text-muted-foreground">Your log is empty.</p>
           </div>
        ) : (
          <ScrollArea className={cn("h-[240px]", isMobileLayout && "h-full")}>
            <div className="p-6 pt-0">
                <AnimatePresence initial={false}>
                {groupDates.map((dateStr, index) => {
                    const entriesForDate = groupedLog[dateStr];
                    if (!entriesForDate || entriesForDate.length === 0) return null;
                    const dateObj = parseISO(dateStr);

                    let dateText: string;
                    if (isToday(dateObj)) {
                    dateText = 'Today';
                    } else if (isYesterday(dateObj)) {
                    dateText = 'Yesterday';
                    } else {
                    dateText = format(dateObj, 'EEEE, LLL d');
                    }

                    return (
                    <div key={dateStr} className={cn(index > 0 && "mt-4")}>
                        <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-sm -mx-6 px-6 pt-4 pb-2 border-b">
                            <h3 className="text-sm font-semibold text-foreground">{dateText}</h3>
                        </div>
                        <ul className="space-y-3 pt-4">
                        <AnimatePresence initial={false}>
                            {entriesForDate.map(entry => (
                                <motion.li 
                                    key={entry.id} 
                                    layout
                                    initial={{ opacity: 1, height: 'auto' }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                                    className="flex items-center justify-between p-3 rounded-md border border-border bg-background/50 hover:bg-accent/10 transition-colors group"
                                >
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-foreground truncate">
                                    {entry.project || 'Untitled Entry'} ({formatDuration(entry.duration)})
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                    {format(parseISO(entry.startTime), "HH:mm")} - {format(parseISO(entry.endTime), "HH:mm")}
                                    </div>
                                    {entry.summary && (
                                    <div className="text-xs text-primary/90 flex items-start mt-2 p-2 bg-primary/5 rounded-md border border-primary/10">
                                        <Briefcase className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                        <span className="flex-1 italic">{entry.summary}</span>
                                    </div>
                                    )}
                                </div>
                                <div className="flex items-center ml-2 space-x-1 shrink-0">
                                    <Button
                                    variant="ghost"
                                    size="icon"
                                    className="p-1 rounded-md bg-muted/30 hover:bg-muted/70 text-foreground/70 hover:text-foreground transition-all shadow-sm hover:shadow-md opacity-50 group-hover:opacity-100 focus:opacity-100 h-7 w-7"
                                    onClick={() => onEditEntry(entry)}
                                    aria-label="Edit entry"
                                    >
                                    <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                    variant="ghost"
                                    size="icon"
                                    className="p-1 rounded-md bg-destructive/10 hover:bg-destructive/30 text-destructive/70 hover:text-destructive transition-all shadow-sm hover:shadow-md opacity-50 group-hover:opacity-100 focus:opacity-100 h-7 w-7"
                                    onClick={() => onDeleteEntry(entry.id)}
                                    aria-label="Delete entry"
                                    >
                                    <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                </motion.li>
                            ))}
                        </AnimatePresence>
                        </ul>
                    </div>
                    );
                })}
                </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </CardContent>
      {hasExceededFreeLogLimit && !isPremium && (
        <CardFooter className="p-4 border-t">
          <div className="text-center w-full text-sm text-muted-foreground p-2 rounded-lg bg-muted/50 border">
            <p>Your log history is limited on the free plan.</p>
            <Button variant="link" className="p-0 h-auto text-primary" onClick={onUpgrade}>
              <Sparkles className="mr-1.5 h-4 w-4" />
              Upgrade to keep your full history.
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

    

    