
"use client";

import type { PomodoroLogEntry } from '@/types/pomodoro';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListChecks } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface PomodoroLogProps {
  log: PomodoroLogEntry[];
}

export function PomodoroLog({ log }: PomodoroLogProps) {
  if (log.length === 0) {
    return (
      <Card className="w-full max-w-md mt-8 bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-foreground"><ListChecks className="mr-2 h-5 w-5 text-primary" />Pomodoro Log</CardTitle>
          <CardDescription className="text-muted-foreground">No pomodoros completed yet. Keep up the good work!</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mt-8 bg-card shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-foreground"><ListChecks className="mr-2 h-5 w-5 text-primary" />Pomodoro Log</CardTitle>
        <CardDescription className="text-muted-foreground">Your completed work sessions.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] pr-4">
          <ul className="space-y-3">
            {log.map((entry, index) => (
              <li key={entry.id} className="p-3 rounded-md border border-border bg-background/50 hover:bg-accent/10 transition-colors">
                <div className="font-medium text-sm text-foreground">
                  Pomodoro #{log.length - index} ({entry.duration} min)
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(parseISO(entry.startTime), "MMM d, HH:mm")} - {format(parseISO(entry.endTime), "HH:mm")}
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
