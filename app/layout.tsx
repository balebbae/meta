import type {Metadata, Viewport} from 'next';
import './globals.css';
import {AuthProvider} from '@/components/auth/AuthProvider';
import {Providers} from './providers';

const THEME_SCRIPT = `try{var t=localStorage.getItem('fb.theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.dataset.theme='dark';else document.documentElement.dataset.theme='light';}catch(e){}`;

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html: THEME_SCRIPT}} />
      </head>
      <body>
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
