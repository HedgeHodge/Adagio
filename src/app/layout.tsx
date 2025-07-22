
import type { Metadata, Viewport } from 'next';
import { Poppins, Pacifico } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Providers } from '@/components/layout/Providers';
import { useId } from 'react';

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

const pacifico = Pacifico({
  subsets: ['latin'],
  display: 'swap',
  weight: '400',
  variable: '--font-pacifico',
});

export const metadata: Metadata = {
  title: 'Adagio',
  description: 'A simple and beautiful Pomodoro timer to help you focus.',
  applicationName: 'Adagio',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Adagio',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: '/icons/appstore.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#D4E9E2' },
    { media: '(prefers-color-scheme: dark)', color: '#0D1B2A' },
  ],
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const id = useId();
  return (
    <html lang="en" className={`${poppins.variable} ${pacifico.variable}`} suppressHydrationWarning>
      <body className="font-body antialiased">
        <Providers key={id}>
            {children}
            <Toaster />
        </Providers>
      </body>
    </html>
  );
}
