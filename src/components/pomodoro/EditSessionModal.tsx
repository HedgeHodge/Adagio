
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

interface EditEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: PomodoroLogEntry | null;
  onSave: (updatedEntry: PomodoroLogEntry) => void;
}

const editEntrySchema = z.object({
  project: z.string().optional(), // Project can be an empty string from input
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

type EditEntryFormData = z.infer<typeof editEntrySchema>;

const formatToDateTimeLocal = (isoString: string): string => {
  if (!isoString || !isValid(parseISO(isoString))) return '';
  return format(parseISO(isoString), "yyyy-MM-dd'T'HH:mm");
};

export function EditEntryModal({ isOpen, onClose, entry, onSave }: EditEntryModalProps) {
  const { control, handleSubmit, formState: { errors }, reset, watch } = useForm<EditEntryFormData>({
    resolver: zodResolver(editEntrySchema),
    defaultValues: {
      project: entry?.project || '',
      startTime: entry?.startTime ? formatToDateTimeLocal(entry.startTime) : '',
      endTime: entry?.endTime ? formatToDateTimeLocal(entry.endTime) : '',
    },
  });

  React.useEffect(() => {
    if (entry) {
      reset({
        project: entry.project || '',
        startTime: formatToDateTimeLocal(entry.startTime),
        endTime: formatToDateTimeLocal(entry.endTime),
      });
    } else {
      reset({ project: '', startTime: '', endTime: ''});
    }
  }, [entry, reset, isOpen]);

  const onSubmit = (data: EditEntryFormData) => {
    if (!entry) return;

    const parsedStartTime = parseISO(data.startTime);
    const parsedEndTime = parseISO(data.endTime);
    const newDuration = differenceInMinutes(parsedEndTime, parsedStartTime);

    const updatedEntryData: PomodoroLogEntry = {
      ...entry,
      startTime: parsedStartTime.toISOString(),
      endTime: parsedEndTime.toISOString(),
      duration: newDuration,
    };

    const projectValue = data.project ? data.project.trim() : "";
    if (projectValue !== "") {
      updatedEntryData.project = projectValue;
    } else {
      delete updatedEntryData.project; // Remove project field if it's empty
    }

    onSave(updatedEntryData);
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
    return entry?.duration ?? 0;
  }, [watchedStartTime, watchedEndTime, entry?.duration]);


  if (!entry) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[480px] bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Entry</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Adjust the details for this logged entry.
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
              render={({ field }) => <Input id="project" {...field} value={field.value ?? ''} className="col-span-3 bg-background" />}
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
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

