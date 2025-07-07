
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/AuthContext';
import { AuthStatus } from '@/components/layout/AuthStatus';
import { ThemeProvider } from '@/context/ThemeContext';
import { ThemeToggleButton } from '@/components/layout/ThemeToggleButton';
import Link from 'next/link';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Pomodoro Flow',
  description: 'Find your flow state. The modern pomodoro timer for focused work.',
  applicationName: 'Pomodoro Flow',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pomodoro Flow',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#020817' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <body className="font-body antialiased bg-background text-foreground transition-colors duration-300">
        <ThemeProvider>
          <AuthProvider>
            <header className="fixed top-0 left-0 right-0 h-28 px-4 z-50 flex items-start pt-4 justify-between bg-gradient-to-b from-background via-background/95 to-transparent pointer-events-none">
                <div className="pointer-events-auto">
                    <Link href="/" className="flex items-center" aria-label="Pomodoro Flow Home Page">
                        <h1 className="text-3xl font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity">
                            Pomodoro Flow
                        </h1>
                    </Link>
                </div>
              <div className="flex items-center space-x-2 pointer-events-auto">
                <ThemeToggleButton />
                <AuthStatus />
              </div>
            </header>
            <main className="pt-24 px-4 sm:px-6 lg:px-8">
                {children}
            </main>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
