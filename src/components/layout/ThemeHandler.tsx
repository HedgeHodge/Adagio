'use client';

import { useTheme } from '@/context/ThemeContext';
import { useEffect } from 'react';

export function ThemeHandler() {
  const { theme } = useTheme();

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

  return null;
}
