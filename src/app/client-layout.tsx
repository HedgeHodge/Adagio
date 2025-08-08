

'use client';

import { Providers } from '@/components/layout/Providers';
import { Toaster } from '@/components/ui/toaster';
import { useTheme } from '@/context/ThemeContext';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useEffect } from 'react';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { installPrompt, triggerInstallPrompt } = usePWAInstall();
  const { theme } = useTheme();

  useEffect(() => {
    if (installPrompt) {
      triggerInstallPrompt();
    }
  }, [installPrompt, triggerInstallPrompt]);

  useEffect(() => {
    const lightColor = '#D4E9E2';
    const darkColor = '#0D1B2A';
    const color = theme === 'dark' ? darkColor : lightColor;

    let metaThemeColor = document.querySelector("meta[name='theme-color']");
    
    if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
    }
    
    metaThemeColor.setAttribute('content', color);

  }, [theme]);

  return (
    <Providers>
      {children}
      <Toaster />
    </Providers>
  );
}

