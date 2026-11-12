# Closeness + Muse Implementation Plan

> **For agentic workers:** Use subagent-driven-development or execute task-by-task. Steps use checkbox syntax.

**Goal:** Add Muse-powered closeness (XP, leaderboard, quests, nudges, voice) plus Expo Go WebView on top of Devin’s Next.js Facebook clone; host on Vercel when buildable.

**Architecture:** Server-only Muse client (`lib/muse/*`) calling Meta Model API Responses; gamification tables; `/api/muse/*` + `/api/leaderboard`; UI in right rail + `/closeness` page; sibling `mobile/` Expo WebView. Branch `feat/closeness-muse` tracks Devin’s branch; rebase often; merge to `main` only after Devin’s PR is in or conflicts are resolved.

**Tech Stack:** Next.js 16, Neon, SuperTokens, `openai` SDK → `https://api.meta.ai/v1`, Expo + `react-native-webview`

**Spec:** `docs/superpowers/specs/2026-11-12-closeness-muse-design.md`

## Global Constraints

- Muse key only server-side (`MODEL_API_KEY`)
- FB tokens in `globals.css`; CSS Modules; no Tailwind
- `DATABASE_URL` may be empty — APIs return 503 with clear error until set
- Do not rewrite Devin feed/auth; extend via hooks/new files
- Never commit `.env.local`

## Review Focus

1. Missing `MODEL_API_KEY` → 503, no crash
2. Missing `DATABASE_URL` → 503, no crash  
3. Unauthenticated Muse routes → 401
4. Expo loads only HTTPS production URL (not localhost)
5. Cookie session works in WebView after Vercel domain configured

---

### Task 1: Muse client + schema

**Files:**
- Create: `lib/muse/client.ts`, `lib/muse/score.ts`, `lib/muse/nudge.ts`, `lib/muse/quests.ts`, `lib/muse/image.ts`, `lib/muse/transcribe.ts`
- Modify: `db/schema.sql`, `.env.example`, `package.json` (add `openai`)

**Interfaces:**
- Produces: `getMuseClient()`, `scoreInteraction(...)`, `generateNudge(...)`, `generateQuests(...)`, `verifyQuest(...)`, `generateBadgeArt(...)`, `transcribeAudio(...)`

- [ ] Add `openai` dep; append gamification tables to `schema.sql`
- [ ] Implement Muse client + helpers with structured JSON via Responses API
- [ ] Document `MODEL_API_KEY` in `.env.example`

### Task 2: API routes

**Files:**
- Create: `app/api/muse/score/route.ts`, `nudge/route.ts`, `quests/generate/route.ts`, `quests/verify/route.ts`, `badge-art/route.ts`, `transcribe/route.ts`, `app/api/leaderboard/route.ts`
- Create: `lib/closeness-queries.ts`

- [ ] Session-gated routes using `withUser`
- [ ] Persist XP/quests when DB available; else 503

### Task 3: UI

**Files:**
- Create: `components/closeness/Leaderboard.tsx`, `QuestsPanel.tsx`, `closeness.module.css`, `app/(app)/closeness/page.tsx`
- Modify: `components/layout/RightSidebar.tsx`, `LeftSidebar.tsx` (link)

- [ ] Weekly leaderboard + quests panels
- [ ] Hook reaction/comment paths to fire score+nudge (best-effort)

### Task 4: Expo wrapper

**Files:**
- Create: `mobile/` via create-expo-app

- [ ] WebView shell + `EXPO_PUBLIC_WEB_URL`
- [ ] README section for Expo Go QR

### Task 5: Vercel

- [ ] `npx vercel` link/create when `next build` passes
- [ ] Set env vars (DB when ready)

### Task 6: Sync / merge

- [ ] `git fetch` Devin branch periodically; rebase `feat/closeness-muse`
- [ ] Open PR → merge to `main` when Devin’s work is merged or conflict-free
