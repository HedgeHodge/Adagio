
"use client";

import type { LogEntry } from '@/types/pomodoro';
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
import { Briefcase } from 'lucide-react';

interface ProjectEntriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  entries: LogEntry[];
}

export function ProjectEntriesModal({ isOpen, onClose, projectName, entries }: ProjectEntriesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl bg-card sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Entries for &quot;{projectName}&quot;
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Showing all logged entries for this project in the selected time range.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <ScrollArea className="h-96 w-full">
            {entries.length > 0 ? (
                <ul className="space-y-3 pr-4">
                {entries.map(entry => (
                    <li key={entry.id} className="flex flex-col p-3 rounded-md border border-border bg-background/50">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                            {format(parseISO(entry.startTime), "EEE, LLL d, yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {format(parseISO(entry.startTime), "HH:mm")} - {format(parseISO(entry.endTime), "HH:mm")}
                        </p>
                        </div>
                        <Badge variant="secondary">{entry.duration} min</Badge>
                    </div>
                    {entry.summary && (
                        <div className="text-xs text-primary/90 flex items-start mt-2 p-2 bg-primary/5 rounded-md border border-primary/10">
                        <Briefcase className="mr-2 h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        <span className="flex-1">{entry.summary}</span>
                        </div>
                    )}
                    </li>
                ))}
                </ul>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-16">
                No entries found for this project in the selected time range.
              </p>
            )}
          </ScrollArea>
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
