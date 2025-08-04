
"use client";

import type { PomodoroLogEntry } from '@/types/pomodoro';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, Briefcase } from 'lucide-react';

interface PeriodSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  entries: PomodoroLogEntry[];
  isPremium: boolean;
  onUpgrade?: () => void;
}

export function PeriodSummaryModal({ isOpen, onClose, summary, entries, isPremium, onUpgrade }: PeriodSummaryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl bg-card sm:rounded-3xl">
        <DialogHeader>
                    <DialogTitle className="text-foreground flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-primary" />
            Your Work Summary
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Here&apos;s an AI-generated summary of your work for the selected period.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="p-4 rounded-lg border bg-background">
            <p className="text-foreground leading-relaxed">{summary}</p>
          </div>

          {!isPremium && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>Upgrade for Better Summaries!</AlertTitle>
              <AlertDescription>
                You&apos;re using a sample summary. Upgrade to Premium for personalized summaries based on your actual work.
                <Button variant="link" size="sm" className="p-0 h-auto ml-1 text-primary" onClick={onUpgrade}>Upgrade Now</Button>
              </AlertDescription>
            </Alert>
          )}

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Entries Used for this Summary:</h4>
            <ScrollArea className="h-48 w-full rounded-md border p-2">
              {entries.length > 0 ? (
                  <ul className="space-y-2">
                  {entries.map(entry => (
                      <li key={entry.id} className="flex flex-col p-2 rounded-md bg-background/50">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">
                                    {entry.project || "Untitled"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {format(parseISO(entry.startTime), "LLL d, HH:mm")}
                                </p>
                            </div>
                            <Badge variant="secondary">{entry.duration} min</Badge>
                        </div>
                         {entry.summary && (
                            <div className="text-xs text-primary/80 flex items-start mt-1.5 pt-1.5 border-t border-border/50">
                            <Briefcase className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                            <span className="flex-1 italic">{entry.summary}</span>
                            </div>
                        )}
                      </li>
                  ))}
                  </ul>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-10">
                  No entries were found for this period.
                </p>
              )}
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
