
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/AuthContext';
import { AuthStatus } from '@/components/layout/AuthStatus';

export const metadata: Metadata = {
  title: 'Adagio',
  description: 'Find your rhythm with Adagio, your focused work companion.',
  manifest: '/manifest.json',
  icons: {
    apple: '/icons/apple-touch-icon.png', // You'll need to add this icon to public/icons/
  },
  // viewport: 'minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, viewport-fit=cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Dancing+Script:wght@400;700&display=swap" rel="stylesheet" />
        
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Adagio" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Adagio" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" /> {/* Optional: You may need to create public/icons/browserconfig.xml for IE/Edge tile customization */}
        <meta name="msapplication-TileColor" content="#3CB371" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#3CB371" /> 
        {/* Viewport meta tag is often recommended for PWAs, but Next.js usually handles it.
            If you encounter viewport issues, you might uncomment and adjust the viewport in the metadata object. */}
      </head>
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
