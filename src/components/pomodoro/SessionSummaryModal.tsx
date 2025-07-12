
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
  DialogClose
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";


interface SessionSummaryModalProps {
  isOpen: boolean;
  session: ActivePomodoroSession;
  onClose: () => void;
  onSave: (session: ActivePomodoroSession) => Promise<void>;
  isSummarizing: boolean;
  isPremium: boolean;
}

export function SessionSummaryModal({ isOpen, session, onClose, onSave, isSummarizing, isPremium }: SessionSummaryModalProps) {
  const completedTasks = session.tasks.filter(task => task.completed);

  const handleSave = () => {
    onSave(session);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[480px] bg-card sm:rounded-3xl">
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
             <p className="text-sm text-muted-foreground text-center py-4">No tasks were marked as complete for this session. The entry will be logged without a summary.</p>
          )}

           {!isPremium && completedTasks.length > 0 && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>Unlock AI Summaries!</AlertTitle>
              <AlertDescription>
                Upgrade to Premium to automatically generate a concise summary of your completed tasks for this log entry.
              </AlertDescription>
            </Alert>
           )}
        </div>

        <DialogFooter className="sm:justify-between gap-2">
            <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>
                    Don't Log
                </Button>
            </DialogClose>
            <Button type="button" onClick={handleSave} disabled={isSummarizing} className="w-full sm:w-auto">
                {isSummarizing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Summarizing...</>
                ) : (
                    isPremium && completedTasks.length > 0 ? <><Sparkles className="mr-2 h-4 w-4" /> Summarize & Save</> : "Save Log"
                )}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
