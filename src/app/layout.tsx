
import type { Metadata, Viewport } from 'next';
import { Inter, Dancing_Script } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/AuthContext';
import { AuthStatus } from '@/components/layout/AuthStatus';

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
    statusBarStyle: 'default',
    title: 'Adagio',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
  // themeColor is handled by the viewport export for PWA consistency
  other: {
    'msapplication-config': '/icons/browserconfig.xml', // You'll need to create public/icons/browserconfig.xml
    'msapplication-TileColor': '#3CB371', // Often duplicated here, also in browserconfig.xml
    'msapplication-tap-highlight': 'no',
  }
};

export const viewport: Viewport = {
  themeColor: '#3CB371',
  // viewportFit: 'cover', // Example: if needed for notch areas
  // width: 'device-width',
  // initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${dancingScript.variable}`}>
      {/*
        The <head> tag is automatically managed by Next.js using the `metadata` and `viewport` exports.
        Do not add a manual <head> tag here.
        Google Font <link> tags are replaced by the `next/font` setup above.
        PWA meta tags are handled by the `metadata` and `viewport` objects.
      */}
      <body className="font-body antialiased">
        <AuthProvider>
          <header className="fixed top-0 right-0 p-4 z-50">
            <AuthStatus />
          </header>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
