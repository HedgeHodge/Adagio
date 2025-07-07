
"use client";

import * as React from "react";
import type { ActivePomodoroSession } from '@/types/pomodoro';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";


interface SessionSummaryModalProps {
  isOpen: boolean;
  session: ActivePomodoroSession;
  onSave: (session: ActivePomodoroSession) => Promise<void>;
  isSummarizing: boolean;
  isPremium: boolean;
}

export function SessionSummaryModal({ isOpen, session, onSave, isSummarizing, isPremium }: SessionSummaryModalProps) {
  const completedTasks = session.tasks.filter(task => task.completed);

  const handleSave = () => {
    onSave(session);
  };
  
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[480px] bg-card sm:rounded-b-3xl" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-foreground">Session Complete!</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Log your work for "<strong>{session.project}</strong>".
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {completedTasks.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-foreground/80">Completed Tasks:</Label>
              <ScrollArea className="h-[100px] w-full rounded-md border p-2 bg-background">
                <ul className="space-y-1">
                  {completedTasks.map(task => (
                    <li key={task.id} className="text-sm text-muted-foreground flex items-center">
                      <CheckCircle2 className="h-4 w-4 mr-2 text-primary shrink-0" />
                      {task.text}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          ) : (
             <p className="text-sm text-muted-foreground text-center py-4">No tasks were marked as complete for this session. The entry will be logged with the original project name.</p>
          )}

           {!isPremium && completedTasks.length > 0 && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>Unlock AI Summaries!</AlertTitle>
              <AlertDescription>
                Upgrade to Premium to automatically generate a concise project name from your completed tasks. For now, it will be logged as "{session.project}".
              </AlertDescription>
            </Alert>
           )}
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isSummarizing} className="w-full">
            {isSummarizing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Summarizing...</>
            ) : (
                isPremium && completedTasks.length > 0 ? <><Sparkles className="mr-2 h-4 w-4" /> Summarize & Save Log</> : "Save Log"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
