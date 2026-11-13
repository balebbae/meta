# Spec — Meta Closeness

Facebook-style social app that rewards **real contact** (not vanity likes) using Meta Muse APIs. Web on Vercel; phone via Expo Go WebView.

**Prod:** https://facebook.calebbae.xyz  
**Branch:** `feat/closeness-muse` (on top of Devin’s Next.js clone)

## Goals

1. Familiar Facebook chrome: feed, friends, profile, groups, marketplace, auth.
2. Closeness layer: XP, weekly leaderboard, Muse-generated quests, smarter notification copy, voice notes → XP.
3. Installable feel: PWA + Expo Go QR wrapper.

## Non-goals

Native RN rewrite · Muse Wonder/computer-use/Connectors · offline WebView PWA · pixel-perfect FB parity.

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 App Router, React 19, CSS Modules + `--fb-*` tokens |
| Auth | SuperTokens email/password (cookie sessions) |
| DB | Neon Postgres (`pnpm db:setup`) |
| AI | Meta Model API `https://api.meta.ai/v1` via OpenAI SDK (server-only) |
| Host | Vercel project `meta` |
| Phone | `mobile/` Expo SDK 58 + `react-native-webview` |

**Env (`.env.local` / Vercel):** `DATABASE_URL`, `SUPERTOKENS_CONNECTION_URI`, `SUPERTOKENS_API_KEY`, `NEXT_PUBLIC_APP_URL`, `MODEL_API_KEY`  
Local `NEXT_PUBLIC_APP_URL=http://localhost:3000`; prod uses the Vercel URL.

## Architecture

```
Expo Go (mobile/) --WebView--> Next.js @ Vercel
                                  |-- SuperTokens
                                  |-- Neon
                                  +-- /api/muse/* --> api.meta.ai (Responses)
```

## Muse usage

| Model | ID | Role |
| --- | --- | --- |
| Ember | `muse-ember-1.0` | XP scoring, nudge copy, quest verify |
| Spark | `muse-spark-1.3` | Weekly quest generation |
| Image | `muse-image-1.0` | Badge art |
| Voice | `muse-voice-transcribe-1.0` | Voice-note transcripts |

All Muse calls live under `lib/muse/*` and `/api/muse/*`. Keys never ship to the client or Expo bundle. Missing `MODEL_API_KEY` / `DATABASE_URL` → `503` (no crash).

## Product surfaces

**Social (Devin + shared):** `/` feed, `/auth`, `/friends`, `/profile/*`, `/groups`, `/marketplace`, `/video`, chrome rails.

**Closeness (ours):**
- `/closeness` — quests + full leaderboard
- Right rail — compact weekly leaderboard
- Left rail — “Closeness” link
- Reactions — best-effort Muse XP + rewritten notification copy

## APIs

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/api/muse/score` | Ember XP → `xp_events` |
| POST | `/api/muse/nudge` | Ember copy → `notifications` |
| POST | `/api/muse/quests/generate` | Spark quests for the week |
| POST | `/api/muse/quests/verify` | Ember complete + XP |
| POST | `/api/muse/badge-art` | Muse Image → `badges` |
| POST | `/api/muse/transcribe` | Voice → transcript + XP |
| GET | `/api/leaderboard` | Friends+self XP last 7 days |

Session required (`withUser`). Social CRUD remains under existing `/api/posts|friends|…`.

## Data (additions)

Keep core social tables. Add:

- `xp_events(user_id, friend_id?, source_type, source_id?, xp, reason, created_at)`
- `quests(title, description, xp_reward, goal_type, goal_count, week_start, muse_meta)`
- `quest_progress(quest_id, user_id, status, progress)` unique `(quest_id, user_id)`
- `badges(user_id, slug, title, image_url, earned_at)`
- `voice_notes(author_id, post_id?, audio_url?, transcript, created_at)`

## Mobile

`mobile/` loads `EXPO_PUBLIC_WEB_URL` (prod Vercel URL). Same-origin in WebView; Expo Go QR via `cd mobile && npx expo start` (`--tunnel` if needed).

## Success criteria

- Sign up / in on web and in Expo WebView.
- React on a post → XP row + warmer notification when Muse is up.
- `/closeness` shows leaderboard + generated quests.
- Voice upload returns transcript and XP.
- Deploy stays up without DB/Muse at build time (lazy Neon client).
