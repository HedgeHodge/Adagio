
"use client";

import * as React from "react";
import type { ActivePomodoroSession } from '@/types/pomodoro';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  onClose: () => void;
  session: ActivePomodoroSession;
  onSave: (session: ActivePomodoroSession, description: string) => Promise<void>;
  isSummarizing: boolean;
  isPremium: boolean;
}

export function SessionSummaryModal({ isOpen, onClose, session, onSave, isSummarizing, isPremium }: SessionSummaryModalProps) {
  const [description, setDescription] = React.useState('');
  const completedTasks = session.tasks.filter(task => task.completed);

  const handleSave = () => {
    onSave(session, description).finally(() => {
        setDescription(''); // Clear description after save attempt
    });
  };

  const handleSkip = () => {
    setDescription('');
    onClose();
  };
  
  // Prevent closing via overlay click or escape key while summarizing
  const onOpenChange = (open: boolean) => {
    if (!isSummarizing && !open) {
      handleSkip();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Session Complete!</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Log your work for "<strong>{session.project}</strong>". How did it go?
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {completedTasks.length > 0 && (
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
          )}

          <Label htmlFor="summary-description" className="text-foreground/80">
            Add additional notes (optional):
          </Label>
          <Textarea
            id="summary-description"
            placeholder="e.g., Deployed the new feature and monitored the logs..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[100px] bg-background"
            disabled={isSummarizing}
          />
           {!isPremium && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>Unlock AI Summaries!</AlertTitle>
              <AlertDescription>
                Upgrade to Premium to automatically generate a concise project name from your completed tasks and notes. For now, it will be logged as "{session.project}".
              </AlertDescription>
            </Alert>
           )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleSkip} disabled={isSummarizing}>
            Skip
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSummarizing}>
            {isSummarizing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Summarizing...</>
            ) : (
                isPremium && (completedTasks.length > 0 || description.trim()) ? <><Sparkles className="mr-2 h-4 w-4" /> Summarize & Save</> : "Save Log"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
