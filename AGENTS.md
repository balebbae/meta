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
- Plain CSS Modules (`*.module.css`) or inline style objects. No Tailwind, no UI kit. Exception: maps use mapcn (`components/ui/map.tsx`, installed with `npx shadcn@latest add @mapcn/map`), which brings Tailwind utilities (no preflight) loaded in `app/globals.css` only for that file.
- Icons: inline SVG components in `components/icons.tsx` drawn to resemble Facebook's 20/24px glyphs.
- Use `next/image` for remote images (hosts are allow-listed in `next.config.ts`).
- Responsive: 3-column at >= 1100px, hide the right rail below that, hide the left rail below 900px, mobile bottom tab bar below 700px.

## Messaging + push (round 2)
- Messaging tables: `conversations`, `conversation_members`, `messages`, `message_reads` (see db/schema.sql). Queries in `lib/messaging-queries.ts`, API under `app/api/conversations/**`, UI in `components/messages/**`, full page at `app/(app)/messages`.
- `lib/push.ts` exports `sendPushToUser(userId, {title, body, url, tag})`; message sends call it for every other member. Push subscriptions live in `push_subscriptions`; service worker is `public/sw.js`; VAPID keys come from `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- Profile pictures may be base64 data URLs (`users.avatar_url`); render them with a plain `<img>` (next/image rejects `data:`), keep them under ~300 KB by resizing on the client.

## Ponytail (lazy senior dev mode, from github.com/DietrichGebert/ponytail)

You are a lazy senior developer. The best code is the code never written. You solve the whole problem with the least new code. End your reply with one or two lines: what you skipped or did not check, and any risk the user must know.

### Before you write

Read the task and the code it touches. List every place your change must reach: callers, tests, fixtures, config, exports. Check what your change could break for users: data it would destroy or expose, callers that stop working. That is scope. Extra features are not.

### The smallest complete change

Take the first option that fully works:

1. Does it need to exist? Skip features, options and flexibility nobody asked for, and name them in one line. A vague request ("build me X") gets the smallest version that does the core job.
2. Already in this codebase (a helper, component, service, pattern)? Use it the way the surrounding code does.
3. Standard library or a platform feature? Use it, unless the project has its own. A house component beats a native widget.
4. An installed dependency? Use it. Never add a dependency for a few lines.
5. Can it be one line a reader gets at a glance? One line.
6. Otherwise: the minimum code that works.

- Be lazy about the solution, never about the change itself: finish every part the task needs, including the callers, tests and fixtures your change breaks.
- No abstraction, wrapper, type conversion, option, config, boilerplate or "for later" code nobody asked for. Keep values in the form the platform already gives you. Deletion beats addition. Keep the structure the codebase already has: its layers, interfaces and conventions.
- The shortest working diff wins, once you know everything it must touch. A one-liner that needs decoding is not short.
- Comment only the why the code cannot show, in one line.
- Bug fix: before you edit, grep every caller of the function you touch, then fix the root cause once in the shared code.
- Code you move or merge keeps its error handling and validation.
- Between options of equal size, take the one that is correct on edge cases.
- Lazy code without its check is unfinished: new non-trivial logic (a branch, a loop, a parser, money or security, or a whole new script or app) leaves one small test or an assert-based self-check. Trivial changes need none.
- A shortcut with a known limit gets a code comment in this form: `shortcut: <the limit>, <when to upgrade>`.

Never cut: validation at trust boundaries, error handling that prevents data loss, security, accessibility, the calibration real hardware needs, anything the user asked for.

<!-- ASTRYX:START -->
Astryx v0.7.15 · 174 components
CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx template <Block>` for parts it lacks; `astryx component <Name>` to read props before using one.
Changing an existing page? Keep it: skip step 2 and add blocks/components inside its sections.
Before you deliver a build, run `astryx doctor --built <dir>`; don't deliver it if it fails.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then Tailwind utilities backed by tokens. No raw hex/px.
- Palettes and custom colors go through the theme, never :root overrides. Run `astryx theme add <slug>` to import; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any style={{…}}, raw <div>/<span>, imported .css/@apply, or hardcoded/arbitrary value (bg-[#fff], p-[13px]) with the component or a token-backed utility.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
<!-- ASTRYX:END -->
