import type {Metadata, Viewport} from 'next';
import './globals.css';
import {AuthProvider} from '@/components/auth/AuthProvider';

export const metadata: Metadata = {
  title: 'Facebook',
  description: 'Facebook clone',
  manifest: '/manifest.webmanifest',
  icons: {icon: '/favicon.svg', apple: '/apple-touch-icon.png'},
  appleWebApp: {capable: true, title: 'Facebook', statusBarStyle: 'black-translucent'},
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
