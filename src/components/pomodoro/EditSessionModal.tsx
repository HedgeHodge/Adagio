
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

interface EditSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: PomodoroLogEntry | null;
  onSave: (updatedSession: PomodoroLogEntry) => void;
}

const editSessionSchema = z.object({
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

type EditSessionFormData = z.infer<typeof editSessionSchema>;

// Helper to format ISO date string to datetime-local input format
const formatToDateTimeLocal = (isoString: string): string => {
  if (!isoString || !isValid(parseISO(isoString))) return '';
  return format(parseISO(isoString), "yyyy-MM-dd'T'HH:mm");
};

export function EditSessionModal({ isOpen, onClose, session, onSave }: EditSessionModalProps) {
  const { control, handleSubmit, formState: { errors }, reset, watch } = useForm<EditSessionFormData>({
    resolver: zodResolver(editSessionSchema),
    defaultValues: {
      project: session?.project || '',
      startTime: session?.startTime ? formatToDateTimeLocal(session.startTime) : '',
      endTime: session?.endTime ? formatToDateTimeLocal(session.endTime) : '',
    },
  });

  React.useEffect(() => {
    if (session) {
      reset({
        project: session.project || '',
        startTime: formatToDateTimeLocal(session.startTime),
        endTime: formatToDateTimeLocal(session.endTime),
      });
    } else {
      reset({ project: '', startTime: '', endTime: ''});
    }
  }, [session, reset, isOpen]);

  const onSubmit = (data: EditSessionFormData) => {
    if (!session) return;

    const parsedStartTime = parseISO(data.startTime);
    const parsedEndTime = parseISO(data.endTime);
    const newDuration = differenceInMinutes(parsedEndTime, parsedStartTime);

    onSave({
      ...session,
      project: data.project || undefined,
      startTime: parsedStartTime.toISOString(),
      endTime: parsedEndTime.toISOString(),
      duration: newDuration,
    });
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
    return session?.duration ?? 0;
  }, [watchedStartTime, watchedEndTime, session?.duration]);


  if (!session) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[480px] bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Session</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Adjust the details for this logged session.
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
