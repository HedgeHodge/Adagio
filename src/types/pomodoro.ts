export interface PomodoroSettings {
  workDuration: number; // minutes
  shortBreakDuration: number; // minutes
  longBreakDuration: number; // minutes
  pomodorosPerSet: number;
}

export interface PomodoroLogEntry {
  id: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  type: 'work'; // Only logging work pomodoros
  duration: number; // minutes
  project?: string; // Name of the project or task
}

export type IntervalType = 'work' | 'shortBreak' | 'longBreak';
