
"use client";

import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AddSessionModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    pomodoro: ReturnType<typeof useTimer>;
}

export function AddSessionModal({ isOpen, onOpenChange, pomodoro }: AddSessionModalProps) {
    const [projectToManage, setProjectToManage] = useState<string | null>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleAddSession = (e: React.FormEvent) => {
        e.preventDefault();
        pomodoro.addSession(pomodoro.inputProjectName);
        onOpenChange(false);
    };

    const handleRecentProjectClick = (proj: string) => {
        pomodoro.addSession(proj);
        onOpenChange(false);
    };
    
    // These functions for managing recent projects are not used in this modal,
    // but are kept here in case you want to add long-press to edit/delete in the future.
    const handleLongPress = useCallback((projectName: string) => {
        setProjectToManage(projectName);
        // Here you would open another modal to manage the project
        console.log("Long press on", projectName);
    }, []);

    const startLongPress = (projectName: string) => {
        longPressTimerRef.current = setTimeout(() => handleLongPress(projectName), 700);
    };

    const clearLongPress = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-card rounded-3xl max-h-[90vh] flex flex-col data-[state=open]:top-1/4 data-[state=open]:sm:top-1/2">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-foreground text-center">New Session</DialogTitle>
                    <DialogDescription className="text-muted-foreground text-center">
                        What are you working on?
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-grow">
                    <div className="p-6 space-y-4">
                        <form onSubmit={handleAddSession} className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    id="modal-project-name"
                                    placeholder="e.g., Q3 Report"
                                    value={pomodoro.inputProjectName}
                                    onChange={(e) => pomodoro.setInputProjectName(e.target.value)}
                                    className="h-11 text-base bg-background/70 flex-grow"
                                    disabled={pomodoro.isDataLoading}
                                    autoFocus
                                />
                                <Button type="submit" className="h-11 w-11 rounded-lg" disabled={pomodoro.isDataLoading || !pomodoro.inputProjectName.trim()}>
                                    <Plus className="h-5 w-5" />
                                    <span className="sr-only">Add</span>
                                </Button>
                            </div>
                        </form>

                        {pomodoro.recentProjects.length > 0 && (
                            <div className="!mt-6">
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">Or pick a recent project:</h4>
                                <div className="flex flex-wrap items-center gap-2">
                                    {pomodoro.recentProjects.map((proj: string, i: number) => (
                                        <motion.div
                                            key={proj}
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                        >
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                className="h-8 px-3 shadow-sm rounded-lg"
                                                onClick={() => handleRecentProjectClick(proj)}
                                            >
                                                {proj}
                                            </Button>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                 <DialogFooter className="mt-auto p-6 pt-0">
                    <DialogClose asChild>
                        <Button type="button" variant="ghost" className="w-full">Cancel</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
