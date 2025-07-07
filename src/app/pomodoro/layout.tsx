import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthStatus } from '@/components/layout/AuthStatus';

export const metadata: Metadata = {
  title: 'Pomodoro | Adagio',
  description: 'Focus timer to boost your productivity.',
};

export default function PomodoroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-2 md:p-4 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" aria-label="Back to home">
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Pomodoro</h1>
        <div className="w-fit">
          <AuthStatus />
        </div>
      </header>
      <div className="flex-1 flex flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
