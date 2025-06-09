
"use client";

import * as React from "react";
import type { PomodoroSettings } from '@/types/pomodoro';
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

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PomodoroSettings;
  onSave: (newSettings: PomodoroSettings) => void;
}

const settingsSchema = z.object({
  workDuration: z.coerce.number().min(1, "Must be at least 1 min").max(120),
  shortBreakDuration: z.coerce.number().min(1, "Must be at least 1 min").max(60),
  longBreakDuration: z.coerce.number().min(1, "Must be at least 1 min").max(120),
  pomodorosPerSet: z.coerce.number().min(1, "Must be at least 1").max(12),
});

export function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const { control, handleSubmit, formState: { errors }, reset } = useForm<PomodoroSettings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  React.useEffect(() => {
    reset(settings);
  }, [settings, reset]);


  const onSubmit = (data: PomodoroSettings) => {
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); reset(settings); } }}>
      <DialogContent className="sm:max-w-[425px] bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Settings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Customize your Pomodoro suggestion durations (minutes). These will trigger notifications.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="workDuration" className="text-right text-foreground/80">
              Work Suggestion
            </Label>
            <Controller
              name="workDuration"
              control={control}
              render={({ field }) => <Input id="workDuration" type="number" {...field} className="col-span-3 bg-background" />}
            />
            {errors.workDuration && <p className="col-span-4 text-sm text-destructive text-center">{errors.workDuration.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="shortBreakDuration" className="text-right text-foreground/80">
              Short Break Suggestion
            </Label>
            <Controller
              name="shortBreakDuration"
              control={control}
              render={({ field }) => <Input id="shortBreakDuration" type="number" {...field} className="col-span-3 bg-background" />}
            />
            {errors.shortBreakDuration && <p className="col-span-4 text-sm text-destructive text-center">{errors.shortBreakDuration.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="longBreakDuration" className="text-right text-foreground/80">
              Long Break Suggestion
            </Label>
            <Controller
              name="longBreakDuration"
              control={control}
              render={({ field }) => <Input id="longBreakDuration" type="number" {...field} className="col-span-3 bg-background" />}
            />
            {errors.longBreakDuration && <p className="col-span-4 text-sm text-destructive text-center">{errors.longBreakDuration.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pomodorosPerSet" className="text-right text-foreground/80">
              Work Sessions / Set
            </Label>
            <Controller
              name="pomodorosPerSet"
              control={control}
              render={({ field }) => <Input id="pomodorosPerSet" type="number" {...field} className="col-span-3 bg-background" />}
            />
            {errors.pomodorosPerSet && <p className="col-span-4 text-sm text-destructive text-center">{errors.pomodorosPerSet.message}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => reset(settings)}>Cancel</Button>
            </DialogClose>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
