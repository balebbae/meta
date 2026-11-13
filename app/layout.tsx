import type {Metadata, Viewport} from 'next';
import './globals.css';
import {AuthProvider} from '@/components/auth/AuthProvider';
import {cookies} from 'next/headers';
import {Providers} from './providers';
import {AgentationBar} from '@/components/dev/AgentationBar';
import {ACTIVITIES_PATH} from '@/lib/activities/mode';

// Resolves the theme before first paint and persists it in a cookie so the server can render the
// same mode next time (Astryx's Theme wrapper is SSR'd; React does not patch attribute mismatches).
const THEME_SCRIPT = `try{var t=localStorage.getItem('fb.theme');var m=(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))?'dark':'light';document.documentElement.dataset.theme=m;document.documentElement.dataset.fbTheme=m;document.cookie='fb.theme='+m+';path=/;max-age=31536000;SameSite=Lax';}catch(e){}`;
// Activities mode before first paint, so a hard load of /activities never flashes the Facebook chrome (useActivitiesMode keeps it in step afterwards).
const MODE_SCRIPT = `if(${ACTIVITIES_PATH}.test(location.pathname))document.documentElement.dataset.mode='activities';`;

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

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const mode = (await cookies()).get('fb.theme')?.value === 'dark' ? 'dark' : 'light';
  return (
    <html lang="en" data-theme={mode} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html: THEME_SCRIPT + MODE_SCRIPT}} />
      </head>
      <body>
        <Providers initialMode={mode}>
          <AuthProvider>{children}</AuthProvider>
          <AgentationBar />
        </Providers>
      </body>
    </html>
  );
}
