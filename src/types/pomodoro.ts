
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
  sessionId?: string; // Optional: to link log entry to a specific session if needed
}

export type IntervalType = 'work' | 'shortBreak' | 'longBreak';

export type TimeFilter = 'today' | 'thisWeek' | 'thisMonth';

export interface ChartDataPoint {
  name: string; // Project name or "No Project"
  totalMinutes: number;
}

export interface ActivePomodoroSession {
  id: string;
  project: string;
  currentTime: number; // seconds in current interval
  isRunning: boolean;
  currentInterval: IntervalType;
  pomodorosCompletedThisSet: number;
  lastWorkSessionStartTime: number | null; // timestamp for the current work interval of this session
  // We'll use global settings for now
}
