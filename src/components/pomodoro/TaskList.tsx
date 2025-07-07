
"use client";

import type { Task } from '@/types/pomodoro';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListTodo, Play, Trash2, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskListProps {
  tasks: Task[];
  onAddTask: (text: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onFocusTask: (text: string) => void;
}

export function TaskList({ tasks, onAddTask, onToggleTask, onDeleteTask, onFocusTask }: TaskListProps) {
  const [newTaskText, setNewTaskText] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskText.trim()) {
      onAddTask(newTaskText.trim());
      setNewTaskText('');
    }
  };

  const hasTasks = tasks.length > 0;
  const incompleteTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  return (
    <Card className="w-full max-w-md mt-8 bg-card shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-foreground"><ListTodo className="mr-2 h-5 w-5 text-primary" />Today's Tasks</CardTitle>
        <CardDescription className="text-muted-foreground">
          What do you want to focus on today?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddTask} className="flex items-center space-x-2 mb-4">
          <Input
            type="text"
            placeholder="Add a new task..."
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            className="flex-grow bg-background"
          />
          <Button type="submit" size="icon" aria-label="Add task">
            <PlusCircle className="h-5 w-5" />
          </Button>
        </form>

        {!hasTasks ? (
          <div className="h-[150px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No tasks yet. Add one to get started!</p>
          </div>
        ) : (
          <ScrollArea className="h-[200px] pr-4">
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
                      onCheckedChange={() => onToggleTask(task.id)}
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
                  <div className="flex items-center ml-2 space-x-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary/80 hover:text-primary opacity-50 group-hover:opacity-100"
                      onClick={() => onFocusTask(task.text)}
                      aria-label={`Focus on ${task.text}`}
                      title={`Focus on ${task.text}`}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive/70 hover:text-destructive opacity-50 group-hover:opacity-100"
                      onClick={() => onDeleteTask(task.id)}
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
                          onCheckedChange={() => onToggleTask(task.id)}
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
                         onClick={() => onDeleteTask(task.id)}
                         aria-label={`Delete task ${task.text}`}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
