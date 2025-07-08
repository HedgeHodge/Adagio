
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

const SESSION_STORAGE_LOG_KEY = 'adagio-dev-logs';

export function DevLogProvider({ children }: { children: ReactNode }) {
  const [isDevModeEnabled, setIsDevModeEnabled] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);

  useEffect(() => {
    try {
      const storedLogs = sessionStorage.getItem(SESSION_STORAGE_LOG_KEY);
      if (storedLogs) {
        setLogs(JSON.parse(storedLogs));
      }
    } catch (error) {
      originalConsole.error('Failed to load dev logs from session storage', error);
    }
  }, []);

  const addLog = useCallback((type: 'log' | 'warn' | 'error', ...args: any[]) => {
    if (args.some(arg => typeof arg === 'string' && arg.includes('DevLogContext'))) return;

    setLogs(prevLogs => {
      const newLogs = [
        ...prevLogs,
        {
          type,
          message: args,
          timestamp: new Date().toLocaleTimeString(),
        },
      ];
      try {
        sessionStorage.setItem(SESSION_STORAGE_LOG_KEY, JSON.stringify(newLogs));
      } catch (error) {
        originalConsole.error('Failed to save dev logs to session storage', error);
      }
      return newLogs;
    });
  }, []);

  useEffect(() => {
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
    } else {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
    }

    return () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
    };
  }, [isDevModeEnabled, addLog]);

  const toggleDevMode = useCallback(() => {
    setIsDevModeEnabled(prev => {
        if (!prev) {
            originalConsole.log('Dev Log Panel activated.');
        }
        return !prev;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    try {
      sessionStorage.removeItem(SESSION_STORAGE_LOG_KEY);
    } catch (error) {
      originalConsole.error('Failed to clear dev logs from session storage', error);
    }
  }, []);
  
  const value = { isDevModeEnabled, toggleDevMode, logs, clearLogs };

  return (
    <DevLogContext.Provider value={value}>
      {children}
    </DevLogContext.Provider>
  );
}

export function useDevLog() {
  const context = useContext(DevLogContext);
  if (context === undefined) {
    throw new Error('useDevLog must be used within a DevLogProvider');
  }
  return context;
}
