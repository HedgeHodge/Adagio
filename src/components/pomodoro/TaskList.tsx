
"use client";

import type { ActivePomodoroSession } from '@/types/pomodoro';
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListTodo, Trash2, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskListProps {
  session: ActivePomodoroSession;
  onAddTask: (sessionId: string, text: string) => void;
  onToggleTask: (sessionId: string, taskId: string) => void;
  onDeleteTask: (sessionId: string, taskId: string) => void;
}

export function TaskList({ session, onAddTask, onToggleTask, onDeleteTask }: TaskListProps) {
  const [newTaskText, setNewTaskText] = useState('');
  const { id: sessionId, tasks } = session;

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskText.trim()) {
      onAddTask(sessionId, newTaskText.trim());
      setNewTaskText('');
    }
  };

  const hasTasks = tasks.length > 0;
  const incompleteTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  return (
    <div className="pt-4 mt-4 border-t border-border/50">
      <h4 className="text-sm font-semibold mb-3 text-foreground/80 flex items-center">
        <ListTodo className="mr-2 h-4 w-4" />
        Tasks
      </h4>
      <form onSubmit={handleAddTask} className="flex items-center space-x-2 mb-4">
        <Input
          type="text"
          placeholder="Add a new task..."
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          className="flex-grow bg-background h-9"
        />
        <Button type="submit" size="icon" className="h-9 w-9 rounded-lg" aria-label="Add task">
          <PlusCircle className="h-5 w-5" />
        </Button>
      </form>

      {!hasTasks ? (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">No tasks for this session yet.</p>
        </div>
      ) : (
        <ScrollArea className="h-[150px] pr-2 -mr-2">
          <ul className="space-y-0.5">
            <AnimatePresence>
              {incompleteTasks.map(task => (
                <motion.li
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors group list-none"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <Checkbox
                      id={`task-${task.id}`}
                      checked={task.completed}
                      onCheckedChange={() => onToggleTask(sessionId, task.id)}
                      aria-label={`Mark "${task.text}" as complete`}
                    />
                    <label
                      htmlFor={`task-${task.id}`}
                      className={cn(
                        "font-medium text-sm text-foreground truncate cursor-pointer",
                        task.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {task.text}
                    </label>
                  </div>
                  <div className="flex items-center ml-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive/70 hover:text-destructive opacity-50 group-hover:opacity-100"
                      onClick={() => onDeleteTask(sessionId, task.id)}
                      aria-label={`Delete task ${task.text}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
            {completedTasks.length > 0 && incompleteTasks.length > 0 && <hr className="my-2 border-border/50" />}
            <AnimatePresence>
              {completedTasks.map(task => (
                 <motion.li
                    key={task.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    className="flex items-center justify-between p-2 rounded-md group list-none"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                       <Checkbox
                          id={`task-${task.id}`}
                          checked={task.completed}
                          onCheckedChange={() => onToggleTask(sessionId, task.id)}
                       />
                       <label
                         htmlFor={`task-${task.id}`}
                         className="font-medium text-sm line-through text-muted-foreground truncate cursor-pointer"
                       >
                         {task.text}
                       </label>
                    </div>
                    <div className="flex items-center ml-2 shrink-0">
                       <Button
                         variant="ghost"
                         size="icon"
                         className="h-7 w-7 text-destructive/70 hover:text-destructive opacity-0 group-hover:opacity-100"
                         onClick={() => onDeleteTask(sessionId, task.id)}
                         aria-label={`Delete task ${task.text}`}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
