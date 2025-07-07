
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
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO, isValid } from 'date-fns';

interface EditActiveSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ActivePomodoroSession | null;
  onSave: (sessionId: string, newStartTime: number) => void;
}

const editActiveSessionSchema = z.object({
  startTime: z.string().refine(val => {
    const parsed = parseISO(val);
    return isValid(parsed) && parsed.getTime() <= Date.now();
  }, {
    message: "Start time must be a valid date and cannot be in the future.",
  }),
});

type EditActiveSessionFormData = z.infer<typeof editActiveSessionSchema>;

const formatToDateTimeLocal = (timestamp: number | null): string => {
  if (timestamp === null || !isValid(new Date(timestamp))) return '';
  return format(new Date(timestamp), "yyyy-MM-dd'T'HH:mm");
};

export function EditActiveSessionModal({ isOpen, onClose, session, onSave }: EditActiveSessionModalProps) {
  const { control, handleSubmit, formState: { errors }, reset } = useForm<EditActiveSessionFormData>({
    resolver: zodResolver(editActiveSessionSchema),
    defaultValues: {
      startTime: session?.lastWorkSessionStartTime ? formatToDateTimeLocal(session.lastWorkSessionStartTime) : '',
    },
  });

  React.useEffect(() => {
    if (session) {
      reset({
        startTime: formatToDateTimeLocal(session.lastWorkSessionStartTime),
      });
    }
  }, [session, reset, isOpen]);

  const onSubmit = (data: EditActiveSessionFormData) => {
    if (!session) return;
    const newStartTime = parseISO(data.startTime).getTime();
    onSave(session.id, newStartTime);
    onClose();
  };
  
  if (!session) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[480px] bg-card sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Start Time</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Adjust the start time for the current session: <strong>{session.project}</strong>. The timer will update accordingly.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
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
