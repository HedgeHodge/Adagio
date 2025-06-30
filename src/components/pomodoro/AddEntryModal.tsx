
"use client";

import * as React from "react";
import type { PomodoroLogEntry } from '@/types/pomodoro';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO, differenceInMinutes, isValid } from 'date-fns';

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newEntry: Omit<PomodoroLogEntry, 'id' | 'type' | 'sessionId'>) => void;
}

const addEntrySchema = z.object({
  project: z.string().optional(),
  startTime: z.string().refine(val => isValid(parseISO(val)), {
    message: "Invalid start date",
  }),
  endTime: z.string().refine(val => isValid(parseISO(val)), {
    message: "Invalid end date",
  }),
}).refine(data => parseISO(data.endTime) > parseISO(data.startTime), {
  message: "End time must be after start time",
  path: ["endTime"],
});

type AddEntryFormData = z.infer<typeof addEntrySchema>;

const formatToDateTimeLocal = (date: Date): string => {
  if (!date || !isValid(date)) return '';
  return format(date, "yyyy-MM-dd'T'HH:mm");
};

export function AddEntryModal({ isOpen, onClose, onSave }: AddEntryModalProps) {
  const { control, handleSubmit, formState: { errors }, reset, watch } = useForm<AddEntryFormData>({
    resolver: zodResolver(addEntrySchema),
    defaultValues: {
      project: '',
      startTime: formatToDateTimeLocal(new Date()),
      endTime: formatToDateTimeLocal(new Date()),
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      const now = new Date();
      reset({
        project: '',
        startTime: formatToDateTimeLocal(now),
        endTime: formatToDateTimeLocal(now),
      });
    }
  }, [isOpen, reset]);

  const onSubmit = (data: AddEntryFormData) => {
    const parsedStartTime = parseISO(data.startTime);
    const parsedEndTime = parseISO(data.endTime);
    const newDuration = differenceInMinutes(parsedEndTime, parsedStartTime);

    const newEntryData: Omit<PomodoroLogEntry, 'id' | 'type' | 'sessionId'> = {
      startTime: parsedStartTime.toISOString(),
      endTime: parsedEndTime.toISOString(),
      duration: newDuration,
      project: data.project ? data.project.trim() : undefined,
    };

    onSave(newEntryData);
    onClose();
  };
  
  const watchedStartTime = watch("startTime");
  const watchedEndTime = watch("endTime");
  const calculatedDuration = React.useMemo(() => {
    if (watchedStartTime && watchedEndTime) {
      const start = parseISO(watchedStartTime);
      const end = parseISO(watchedEndTime);
      if (isValid(start) && isValid(end) && end > start) {
        return differenceInMinutes(end, start);
      }
    }
    return 0;
  }, [watchedStartTime, watchedEndTime]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[480px] bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Manual Entry</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Manually add a completed work session to your log.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="project" className="text-right text-foreground/80">
              Project
            </Label>
            <Controller
              name="project"
              control={control}
              render={({ field }) => <Input id="project" {...field} value={field.value ?? ''} placeholder="Optional" className="col-span-3 bg-background" />}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startTime" className="text-right text-foreground/80">
              Start Time
            </Label>
            <Controller
              name="startTime"
              control={control}
              render={({ field }) => (
                <Input
                  id="startTime"
                  type="datetime-local"
                  {...field}
                  className="col-span-3 bg-background"
                />
              )}
            />
            {errors.startTime && <p className="col-span-4 text-sm text-destructive text-center">{errors.startTime.message}</p>}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endTime" className="text-right text-foreground/80">
              End Time
            </Label>
            <Controller
              name="endTime"
              control={control}
              render={({ field }) => (
                <Input
                  id="endTime"
                  type="datetime-local"
                  {...field}
                  className="col-span-3 bg-background"
                />
              )}
            />
            {errors.endTime && <p className="col-span-4 text-sm text-destructive text-center">{errors.endTime.message}</p>}
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-foreground/80">
              Duration
            </Label>
            <div className="col-span-3 text-sm text-muted-foreground">
              {calculatedDuration} minutes
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </DialogClose>
            <Button type="submit">Add Entry</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
