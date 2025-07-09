
'use client';

import React from 'react';
import { useDevLog } from '@/context/DevLogContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DevLogPanel() {
  const devLog = useDevLog();

  if (!devLog || !devLog.isDevModeEnabled) {
    return null;
  }
  
  const { logs, toggleDevMode, clearLogs } = devLog;

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-destructive border-destructive/50 bg-destructive/5';
      case 'warn': return 'text-yellow-500 border-yellow-500/50 bg-yellow-500/5';
      default: return 'text-muted-foreground border-border';
    }
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-[200] w-full max-w-lg">
      <Card className="bg-card/90 backdrop-blur-sm shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
          <CardTitle className="text-lg">Dev Log</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearLogs} aria-label="Clear logs">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleDevMode} aria-label="Close log panel">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-64 p-4">
            {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No logs yet. Interact with the app to see logs.</p>
            ) : (
                <div className="space-y-2 font-mono text-xs">
                    {logs.map((log, index) => (
                        <div key={index} className={cn("p-2 rounded-md border", getLogColor(log.type))}>
                           <div className="flex justify-between items-center text-muted-foreground/80 mb-1">
                             <span className="font-semibold uppercase">{log.type}</span>
                             <span>{log.timestamp}</span>
                           </div>
                           <pre className="whitespace-pre-wrap">
                               {/* Messages are already pre-formatted strings */}
                               {log.message.join(' ')}
                           </pre>
                        </div>
                    ))}
                </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
