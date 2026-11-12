# Closeness Facebook Clone — Design Spec

Date: 2026-11-12  
Status: draft for review  
Approach: **A** (Next.js on main → Muse closeness features → Neon/Vercel → Expo Go WebView)

## Intent

Ship a Facebook-style social demo that emphasizes **bringing people closer** via notifications, leaderboards, and gamification, powered by as much of the **Meta Model API (Muse)** surface as fits a one-day hackathon. Host on Vercel; wrap the hosted PWA in an Expo Go app so a phone can scan a QR and use it.

## Constraints

- Base: Next.js 16 App Router already on `main` (scaffold: Neon schema/seed, stub auth, chrome placeholders).
- UI: match facebook.com look using `--fb-*` tokens in `app/globals.css`; CSS Modules / inline styles only; no Tailwind/UI kit.
- Secrets live in `.env.local` / Vercel env — never commit. `DATABASE_URL` may be filled later; app features that need DB are gated until then.
- Muse keys: server-only. Never expose `MODEL_API_KEY` to the browser or Expo bundle.

## Architecture

```
┌─────────────────┐     WebView      ┌──────────────────────────────┐
│ mobile/ (Expo)  │ ───────────────► │ Next.js on Vercel (PWA)      │
│ EXPO_PUBLIC_    │                  │ SuperTokens + App Router     │
│ WEB_URL         │                  │ Route Handlers → Muse API    │
└─────────────────┘                  │ Neon Postgres                │
                                     └──────────────────────────────┘
                                                │
                                                ▼
                                     https://api.meta.ai/v1
                                     (Responses API)
```

| Layer | Choice |
| --- | --- |
| Web app | Existing Next.js scaffold on `main` |
| Auth | SuperTokens email/password (`SUPERTOKENS_*` already configured locally) |
| DB | Neon Postgres (`DATABASE_URL` deferred OK; run `pnpm db:setup` when set) |
| AI | Meta Model API — OpenAI SDK → **Responses** at `https://api.meta.ai/v1` |
| Host | New Vercel project linked to `balebbae/meta` (none exists today) |
| Phone | Sibling `mobile/` Expo blank-typescript + `react-native-webview` |

## Muse stack

| Model | ID | Use |
| --- | --- | --- |
| Ember | `muse-ember-1.0` | High-volume XP scoring, notification copy, quest verification |
| Spark | `muse-spark-1.3` | Quest design, closeness insights, hangout ideas (+ `web_search`) |
| Image | `muse-image-1.0` | Badge / streak art |
| Voice | `muse-voice-transcribe-1.0` | Voice-note → text for closeness events |

**Out of MVP:** Muse Wonder, computer use, Meta AI Connectors.

Client: `openai` package, `baseURL: https://api.meta.ai/v1`, `apiKey: process.env.MODEL_API_KEY`. All calls from Route Handlers / server modules under `lib/muse/`.

## Product features

### Core social (unblock demo)

1. Wire SuperTokens (`/auth`, session middleware, replace stub `getSessionUser`).
2. API routes: posts, reactions, comments, friendships, stories, notifications — session-gated.
3. Feed UI: Stories, Composer, PostCard; real Header / Left / Right rails; mobile bottom bar.

### Closeness / gamification (Muse)

1. **XP / warmth** — on social events, Ember returns structured `{xp, reason}`; persist `xp_events`.
2. **Weekly leaderboard** — aggregate XP among friends; page + right-rail widget.
3. **Quests / streaks** — Spark generates weekly quests; Ember verifies completion from events.
4. **Smart notifications** — Ember writes human nudge copy into `notifications`.
5. **Badges** — Muse Image generates art on milestones; store URL on `badges`.
6. **Voice notes** — upload/audio → Muse Voice Transcribe → post/comment path → XP.

## Data model (additions)

Keep existing tables (`users`, `posts`, `comments`, `reactions`, `friendships`, `stories`, `notifications`).

Add:

- `xp_events` — `user_id`, `friend_id?`, `source_type`, `source_id?`, `xp`, `reason`, `created_at`
- `quests` — `id`, `title`, `description`, `xp_reward`, `week_start`, `muse_meta jsonb`
- `quest_progress` — `quest_id`, `user_id`, `status`, `progress jsonb`, unique `(quest_id, user_id)`
- `badges` — `user_id`, `slug`, `title`, `image_url`, `earned_at`
- `voice_notes` — `id`, `author_id`, `post_id?`, `audio_url`, `transcript`, `created_at`

## API surface (new)

- `POST /api/muse/score-interaction` — Ember XP for an event  
- `POST /api/muse/nudge` — Ember notification copy  
- `POST /api/muse/quests/generate` — Spark weekly quests  
- `POST /api/muse/quests/verify` — Ember completion check  
- `POST /api/muse/badge-art` — Muse Image  
- `POST /api/muse/transcribe` — Voice Transcribe  
- `GET /api/leaderboard?period=week`  
- Existing social CRUD under `/api/*` as implementation proceeds  

## Expo wrapper (`mobile/`)

- `npx create-expo-app@latest mobile --template blank-typescript`
- `react-native-webview` + safe area; `EXPO_PUBLIC_WEB_URL=<vercel-url>`
- Same-origin stays in WebView; OAuth / off-origin → `expo-web-browser` if needed
- Cookie auth: configure SuperTokens cookie `SameSite`/`Secure` for the Vercel host so sessions work inside WKWebView
- Dev: `npx expo start` → scan QR in Expo Go (use tunnel if LAN fails)

## Deploy sequence

1. Implement features against local Next.js (mock Muse if needed; real key already in `.env.local`).
2. When `DATABASE_URL` is available: `pnpm db:setup`, verify seed.
3. `npx vercel` link/create project `meta`; set `DATABASE_URL`, `MODEL_API_KEY`, `SUPERTOKENS_*`, `NEXT_PUBLIC_APP_URL`.
4. Point SuperTokens dashboard app domain at the Vercel URL.
5. Set `mobile/.env` `EXPO_PUBLIC_WEB_URL` to production URL; `expo start`.

## Testing

- Local: sign up / sign in, create post, react, see notification + XP bump, leaderboard ranks, generate quest, transcribe a short clip.
- Vercel preview: same smoke path.
- Expo Go: load production URL, login, scroll feed (cookies persist in WebView).

## Non-goals

- Pixel-perfect parity with every Facebook surface
- Native React Native feed rewrite
- Muse Connectors / Wonder agents
- Offline-first PWA inside WebView
