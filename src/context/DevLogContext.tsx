
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface LogMessage {
  type: 'log' | 'warn' | 'error';
  message: any[];
  timestamp: string;
}

interface DevLogContextType {
  isDevModeEnabled: boolean;
  toggleDevMode: () => void;
  logs: LogMessage[];
  clearLogs: () => void;
}

const DevLogContext = createContext<DevLogContextType | undefined>(undefined);

const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

export function DevLogProvider({ children }: { children: ReactNode }) {
  const [isDevModeEnabled, setIsDevModeEnabled] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);

  const addLog = useCallback((type: 'log' | 'warn' | 'error', ...args: any[]) => {
    // Prevent feedback loop if logging state
    if (args.some(arg => typeof arg === 'string' && arg.includes('DevLogContext'))) return;

    setLogs(prevLogs => [
      ...prevLogs,
      {
        type,
        message: args,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    if (isDevModeEnabled) {
      console.log = (...args) => {
        originalConsole.log(...args);
        addLog('log', ...args);
      };
      console.warn = (...args) => {
        originalConsole.warn(...args);
        addLog('warn', ...args);
      };
      console.error = (...args) => {
        originalConsole.error(...args);
        addLog('error', ...args);
      };
       originalConsole.log('Dev Log Panel activated.');
    } else {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
    }

    return () => {
      // Cleanup on unmount
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
    };
  }, [isDevModeEnabled, addLog]);

  const toggleDevMode = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
        setIsDevModeEnabled(prev => !prev);
    }
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);
  
  // Only render provider in development
  if (process.env.NODE_ENV !== 'development') {
    return <>{children}</>;
  }

  const value = { isDevModeEnabled, toggleDevMode, logs, clearLogs };

  return (
    <DevLogContext.Provider value={value}>
      {children}
    </DevLogContext.Provider>
  );
}

export function useDevLog() {
  const context = useContext(DevLogContext);
  if (context === undefined && process.env.NODE_ENV === 'development') {
    throw new Error('useDevLog must be used within a DevLogProvider');
  }
  return context;
}
