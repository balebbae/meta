import type {Metadata} from 'next';
import Link from 'next/link';
import {panelHref} from '@/lib/activities/panel-href';

export const metadata: Metadata = {title: 'Privacy Policy | Facebook'};

const UPDATED = 'November 12, 2026';

/** Public (no sign-in) privacy policy; the URL is registered with connector providers such as WHOOP and Strava. */
export default function PrivacyPolicyPage() {
  return (
    <main style={{maxWidth: 760, margin: '0 auto', padding: '32px 20px 64px', color: 'var(--fb-text)', lineHeight: 1.55, fontSize: 15}}>
      <p style={{marginBottom: 24}}>
        <Link href="/" style={{color: 'var(--fb-blue)', fontWeight: 600}}>
          ← Back to Facebook
        </Link>
      </p>
      <h1 style={{fontSize: 28, fontWeight: 700, margin: '0 0 4px'}}>Privacy Policy</h1>
      <p style={{color: 'var(--fb-text-secondary)', margin: '0 0 24px'}}>Last updated {UPDATED}</p>

      <p>
        This site is a hackathon demo of a social app with an <strong>Activities</strong> feature. It is not affiliated with Meta Platforms, Inc. This policy
        explains what we collect, how it is used, and how to delete it.
      </p>

      <h2 style={h2}>What we collect</h2>
      <ul>
        <li>
          <strong>Account data</strong>: name, email, password (stored only as a hash by our authentication provider), optional birthday, gender, profile and cover photos, posts, comments, reactions, messages and friend connections.
        </li>
        <li>
          <strong>Activity data you choose to connect</strong>: when you connect a source such as WHOOP, Strava, Apple Health, Google Health or Health Connect, we receive workouts, steps, sleep, heart-rate and recovery data from that provider through its official API, only after you authorise it on the provider&apos;s own consent screen.
        </li>
        <li>
          <strong>Data you log yourself</strong>: manual workout entries, photo-proof screenshots and voice notes you submit.
        </li>
        <li>
          <strong>Location</strong>: only inside a Turf game you have explicitly joined with location consent, and only while that game page is open.
        </li>
      </ul>

      <h2 style={h2}>How activity data is used</h2>
      <ul>
        <li>Connected and logged activity data is stored in a private <strong>vault</strong> that only you (and your personal Muse assistant acting for you) can read in full.</li>
        <li>
          Other people never see raw values. Friends, game participants and mentors only receive the yes/no or rounded answers that your privacy settings allow
          (<Link href={panelHref({panel: 'settings', tab: 'privacy'})} style={{color: 'var(--fb-blue)'}}>Activities → Settings → Privacy</Link>). Heart rate, recovery and sleep are Muse-only by default and are never shared.
        </li>
        <li>Every answer given on your behalf is written to an audit log you can review.</li>
        <li>Activity data is used to run Rally quests, Turf games, Discover suggestions and mentor exchanges that you start or join. It is not sold, used for advertising, or shared with third parties.</li>
        <li>Some features send redacted, rounded text (never raw vault rows, never identifiable health data) to a language-model API to generate quest descriptions, narration and plans.</li>
      </ul>

      <h2 style={h2}>WHOOP and other connected providers</h2>
      <p>
        When you connect WHOOP we store an access token and refresh token so we can fetch your data and receive webhook updates. We request only the scopes shown on WHOOP&apos;s consent screen. You can disconnect at any time from{' '}
        <Link href={panelHref({panel: 'settings', tab: 'sources'})} style={{color: 'var(--fb-blue)'}}>Activities → Settings → Sources</Link>; disconnecting revokes our token and stops all further syncing. You can also revoke access from your WHOOP account settings.
      </p>

      <h2 style={h2}>Deleting your data</h2>
      <ul>
        <li>Delete all data from a single source (for example everything that came from WHOOP) with one tap under Activities → Your Muse → Sources.</li>
        <li>Deleting a source removes its vault events and the answers derived from them.</li>
        <li>To delete your whole account and everything associated with it, email the address below and we will remove it within 7 days.</li>
      </ul>

      <h2 style={h2}>Storage and security</h2>
      <p>
        Data is stored in a Postgres database hosted by Neon and served from Vercel over HTTPS. Authentication is handled by SuperTokens with secure, HTTP-only session cookies. Access tokens for connected providers are stored server-side and are never sent to the browser.
      </p>

      <h2 style={h2}>Cookies</h2>
      <p>We use only the cookies needed to keep you signed in and to remember your light/dark theme. There are no advertising or tracking cookies.</p>

      <h2 style={h2}>Contact</h2>
      <p>
        Questions or deletion requests: <a href="mailto:baecal000@gmail.com" style={{color: 'var(--fb-blue)'}}>baecal000@gmail.com</a>
      </p>
    </main>
  );
}

const h2 = {fontSize: 20, fontWeight: 700, margin: '28px 0 8px'} as const;
