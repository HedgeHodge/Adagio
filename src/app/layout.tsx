
import type { Metadata, Viewport } from 'next';
import { Inter, Dancing_Script } from 'next/font/google';
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

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-dancing-script',
});

export const metadata: Metadata = {
  title: 'Adagio',
  description: 'Find your rhythm with Adagio, your focused work companion.',
  applicationName: 'Adagio',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default', // or 'black-translucent' for dark mode
    title: 'Adagio',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
  // themeColor is now handled by the viewport export for more robust PWA theming
};

export const viewport: Viewport = {
  // themeColor defines the color of the browser toolbar.
  // Using an array allows specifying different colors for light and dark modes.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F0FFF0' }, // Example: Light background
    { media: '(prefers-color-scheme: dark)', color: '#1A1A1A' },  // Example: Dark background
  ],
  // Other viewport settings as needed
  // width: 'device-width',
  // initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Add suppressHydrationWarning to <html> due to client-side theme class manipulation
    <html lang="en" className={`${inter.variable} ${dancingScript.variable}`} suppressHydrationWarning>
      {/*
        The <head> tag is automatically managed by Next.js.
        PWA meta tags are handled by the `metadata` and `viewport` objects.
        The ThemeProvider will manage the 'dark' class on this <html> tag.
      */}
      <body className="font-body antialiased bg-background text-foreground transition-colors duration-300">
        <ThemeProvider>
          <AuthProvider>
            <header className="fixed top-0 left-0 right-0 h-16 px-4 z-50 flex items-center justify-between bg-background/95 backdrop-blur-sm border-b border-border">
                <Link href="/" className="flex items-center" aria-label="Adagio Home Page">
                    <h1 className="sm:hidden text-3xl font-headline font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity">
                        A
                    </h1>
                    <h1 className="hidden sm:block text-3xl font-headline font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity">
                        Adagio
                    </h1>
                </Link>
              <div className="flex items-center space-x-2">
                <ThemeToggleButton />
                <AuthStatus />
              </div>
            </header>
            <main className="pt-16">
                {children}
            </main>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
