# meta

Facebook clone built in a day: Next.js 16 App Router, React 19, TypeScript, Neon Postgres, SuperTokens auth, deployed on Vercel.

```sh
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL + SuperTokens values
pnpm db:setup                # create tables + seed demo data
pnpm dev                     # http://localhost:3000
```

See `AGENTS.md` for the project layout and UI rules.
