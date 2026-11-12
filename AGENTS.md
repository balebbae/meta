# AGENTS.md

Facebook clone: Next.js 16 (App Router) + React 19 + TypeScript, Neon Postgres via `@neondatabase/serverless`, SuperTokens for auth. Hosted on Vercel. One-day hackathon project: optimise for a working, pixel-faithful demo.

## Commands
- `pnpm install`
- `pnpm dev` (http://localhost:3000), `pnpm build`, `pnpm typecheck`
- `pnpm db:setup` creates tables + seeds (`--reset` drops first). Needs `DATABASE_URL` in `.env.local`.

## Env (`.env.local`, git-ignored; see `.env.example`)
`DATABASE_URL`, `SUPERTOKENS_CONNECTION_URI`, `SUPERTOKENS_API_KEY`, `NEXT_PUBLIC_APP_URL`.

## Layout
- `app/(app)/*` signed-in pages sharing the Facebook chrome (`components/layout/Header|LeftSidebar|RightSidebar`).
- `app/auth/*` sign-in / sign-up (SuperTokens, email + password), styled like facebook.com's login page.
- `app/api/**` route handlers (CRUD). Every handler calls `getSessionUser()` from `lib/auth.ts` and returns 401 when null.
- `lib/db.ts` exports `sql` (tagged template). `lib/queries.ts` holds read queries. `lib/types.ts` holds shared types.
- `db/schema.sql`, `db/seed.sql` are the source of truth for the schema.

## UI rules
- Match facebook.com desktop exactly: measure against the real site (open facebook.com; the logged-out login page is public, feed screenshots are on Meta's newsroom and image search). Use the CSS variables in `app/globals.css` (`--fb-*`); no new colour hex values outside that file.
- Plain CSS Modules (`*.module.css`) or inline style objects. No Tailwind, no UI kit.
- Icons: inline SVG components in `components/icons.tsx` drawn to resemble Facebook's 20/24px glyphs.
- Use `next/image` for remote images (hosts are allow-listed in `next.config.ts`).
- Responsive: 3-column at >= 1100px, hide the right rail below that, hide the left rail below 900px, mobile bottom tab bar below 700px.

## Messaging + push (round 2)
- Messaging tables: `conversations`, `conversation_members`, `messages`, `message_reads` (see db/schema.sql). Queries in `lib/messaging-queries.ts`, API under `app/api/conversations/**`, UI in `components/messages/**`, full page at `app/(app)/messages`.
- `lib/push.ts` exports `sendPushToUser(userId, {title, body, url, tag})`; message sends call it for every other member. Push subscriptions live in `push_subscriptions`; service worker is `public/sw.js`; VAPID keys come from `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- Profile pictures may be base64 data URLs (`users.avatar_url`); render them with a plain `<img>` (next/image rejects `data:`), keep them under ~300 KB by resizing on the client.
