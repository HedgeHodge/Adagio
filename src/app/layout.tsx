
import type { Metadata, Viewport } from 'next';
import { Nunito_Sans, Pacifico } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { DevLogProvider } from '@/context/DevLogContext';
import { DevLogPanel } from '@/components/dev/DevLogPanel';

const nunito_sans = Nunito_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-nunito-sans',
});

const pacifico = Pacifico({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-pacifico',
});

export const metadata: Metadata = {
  title: 'Adagio',
  description: 'A helpful assistant.',
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
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#D4E9E2' },
    { media: '(prefers-color-scheme: dark)', color: '#F3D4B4' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito_sans.variable} ${pacifico.variable}`} suppressHydrationWarning>
      <body className="font-body antialiased">
        <DevLogProvider>
          <ThemeProvider>
            <AuthProvider>
              {children}
              <Toaster />
              <DevLogPanel />
            </AuthProvider>
          </ThemeProvider>
        </DevLogProvider>
      </body>
    </html>
  );
}
