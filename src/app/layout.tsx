
import type { Metadata, Viewport } from 'next';
import { Domine, Pacifico } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ClientLayout } from './client-layout';
import { Analytics } from '@vercel/analytics/next';

const domine = Domine({
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
  description: 'Finally, a time tracker designed for humans. Track your work, manage tasks, and use the built-in Pomodoro timer to stay focused and energized. Get more done, stress less, and find your flow.',
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
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/appstore.png',
  },
};

export const viewport: Viewport = {
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${domine.variable} ${pacifico.variable}`} suppressHydrationWarning>
       <head>
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
      </head>
      </head>
      <body className="font-body antialiased">
        <ClientLayout>{children}</ClientLayout>
        <Analytics />
      </body>
    </html>
  );
}
