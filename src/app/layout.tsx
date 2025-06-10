
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/AuthContext';
import { AuthStatus } from '@/components/layout/AuthStatus';

export const metadata: Metadata = {
  title: 'Adagio',
  description: 'Find your rhythm with Adagio, your focused work companion.',
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
