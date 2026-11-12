# meta

Facebook clone: Next.js 16 App Router, React 19, TypeScript, Neon Postgres, SuperTokens auth, Meta Muse (Model API) for closeness XP / quests / nudges, Expo Go WebView wrapper. Deployed on Vercel.

```sh
pnpm install
cp .env.example .env.local   # DATABASE_URL, SuperTokens, MODEL_API_KEY
pnpm db:setup                # create tables + seed (needs DATABASE_URL)
pnpm dev                     # http://localhost:3000
```

Closeness UI: `/closeness` and the right-rail leaderboard. Muse routes under `/api/muse/*`.

### Expo Go (phone QR)

```sh
cd mobile
npm install
# set EXPO_PUBLIC_WEB_URL to your Vercel URL in mobile/.env
npx expo start
```

See `AGENTS.md` for UI rules and `docs/superpowers/specs/2026-11-12-closeness-muse-design.md` for the Muse design.
