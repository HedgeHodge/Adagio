
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
import { Loader2, Sparkles, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


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
          <Label htmlFor="summary-description" className="text-foreground/80">
            Describe what you accomplished (optional):
          </Label>
          <Textarea
            id="summary-description"
            placeholder="e.g., Finished the first draft of the report and answered urgent emails..."
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
                Upgrade to Premium to automatically generate a concise project name from your description. For now, it will be logged as "{session.project}".
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
                isPremium && description.trim() ? <><Sparkles className="mr-2 h-4 w-4" /> Summarize & Save</> : "Save Log"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
