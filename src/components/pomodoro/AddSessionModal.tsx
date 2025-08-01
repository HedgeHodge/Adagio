
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

interface AddSessionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddSession: (projectName: string) => void;
  recentProjects: string[];
}

export function AddSessionModal({ isOpen, onOpenChange, onAddSession, recentProjects }: AddSessionModalProps) {
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setProjectName("");
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectName.trim()) {
      onAddSession(projectName.trim());
      onOpenChange(false);
    }
  };

  const handleRecentClick = (proj: string) => {
    onAddSession(proj);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Start a New Session</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            What are you working on?
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="flex gap-2">
            <Input
              id="project-name-modal"
              placeholder="Enter project name..."
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="h-11 text-base bg-background/70 flex-grow"
              autoFocus
            />
             <Button type="submit" className="h-11 w-11 rounded-lg" disabled={!projectName.trim()}>
                <Plus className="h-5 w-5" />
                <span className="sr-only">Add</span>
            </Button>
          </div>
          {recentProjects.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Or pick a recent one:</p>
                <div className="flex flex-wrap items-center gap-2">
                    {recentProjects.map((proj, i) => (
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
                                onClick={() => handleRecentClick(proj)}
                            >
                                {proj}
                            </Button>
                        </motion.div>
                    ))}
                </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
