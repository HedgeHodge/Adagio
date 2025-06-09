
"use client";

import type { PomodoroLogEntry } from '@/types/pomodoro';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListChecks, Briefcase, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface PomodoroLogProps {
  log: PomodoroLogEntry[];
  onDeleteEntry: (id: string) => void;
}

export function PomodoroLog({ log, onDeleteEntry }: PomodoroLogProps) {
  if (log.length === 0) {
    return (
      <Card className="w-full max-w-md mt-8 bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-foreground"><ListChecks className="mr-2 h-5 w-5 text-primary" />Session Log</CardTitle>
          <CardDescription className="text-muted-foreground">No sessions completed yet. Start working to see your progress!</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mt-8 bg-card shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-foreground"><ListChecks className="mr-2 h-5 w-5 text-primary" />Session Log</CardTitle>
        <CardDescription className="text-muted-foreground">Your completed work sessions.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] pr-4">
          <ul className="space-y-3">
            {log.map((entry, index) => (
              <li 
                key={entry.id} 
                className="flex items-center justify-between p-3 rounded-md border border-border bg-background/50 hover:bg-accent/10 transition-colors group"
              >
                <div>
                  <div className="font-medium text-sm text-foreground">
                    Session #{log.length - index} ({entry.duration} min)
                  </div>
                  {entry.project && (
                    <div className="text-xs text-primary/90 flex items-center mt-1">
                      <Briefcase className="mr-1.5 h-3.5 w-3.5" />
                      {entry.project}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {format(parseISO(entry.startTime), "MMM d, HH:mm")} - {format(parseISO(entry.endTime), "HH:mm")}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-1 rounded-md bg-destructive/10 hover:bg-destructive/30 text-destructive/70 hover:text-destructive transition-all shadow-sm hover:shadow-md opacity-50 group-hover:opacity-100 focus:opacity-100 h-7 w-7"
                  onClick={() => onDeleteEntry(entry.id)}
                  aria-label="Delete session"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
