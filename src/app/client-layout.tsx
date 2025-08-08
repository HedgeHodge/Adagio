'use client';

import { Providers } from '@/components/layout/Providers';
import { ThemeHandler } from '@/components/layout/ThemeHandler';
import { Toaster } from '@/components/ui/toaster';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useEffect } from 'react';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { installPrompt, triggerInstallPrompt } = usePWAInstall();

  useEffect(() => {
    if (installPrompt) {
      triggerInstallPrompt();
    }
  }, [installPrompt, triggerInstallPrompt]);

  return (
    <Providers>
      <ThemeHandler />
      {children}
      <Toaster />
    </Providers>
  );
}