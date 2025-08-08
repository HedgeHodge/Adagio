
export interface PomodoroSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  timersPerSet: number;
}

export interface LogEntry {
  id: string;
  startTime: string;
  endTime: string;
  type: 'work' | 'break';
  duration: number;
  project?: string;
  summary?: string;
  sessionId?: string;
}

export type IntervalType = 'work' | 'shortBreak' | 'longBreak';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export interface ActivePomodoroSession {
  id: string;
  project: string;
  tasks: Task[];
  currentInterval: IntervalType;
  currentTime: number;
  totalWorkTime: number;
  isRunning: boolean;
  timersCompletedThisSet: number;
  lastWorkSessionStartTime: number | null;
}
