# Activities design (round 1) and the whole-app refresh (round 2)

Branch `design` holds round 1; `design-activities-mode` (cut from it) adds round 2. Both are previewable.
Product name is parked: copy says "Activities", the engine stays "Rally".

## The goal

Facebook feels busy. The moment someone taps **Activities** they should feel like they walked into a
different, calmer app: Instagram-easy, Apple-clean, blue + orange, light and dark, motion everywhere but
never loud. Every feature we already have (Muse, goals, games, Turf, Coach, messaging challenges) keeps its
logic; only the surface changes.

## Round 1: the Activities tab (done, `/activities`)

Order on the page, top to bottom (the user's list):

1. **Progress hero**: greeting, active goal, steps today vs goal, active days this week vs the band picked in
   onboarding, sleep last night, a solid ember ring to the goal over the contour shader. Numbers count up once.
2. **From your Muse**: one-tap task list ("Book the Katy Trail 5k · Sat 8:00 · Free", "Nike Pegasus 41 ·
   $65"), ember `Book it` / `Buy it`, quiet `Not now`. Demo checkout unchanged.
3. **Your games**: snap strip of quests and Turf games with boss sprites; last tile starts a game.
4. **Communities**: groups two-up, "3 friends are in" and "Weekly Rally" chips, Join / Open.
5. **Suggested reels**: the bento, rounded onto the new tokens.
6. **Near you**: mapcn map with orange event pins and a blue "you" dot; list with date, time, km from the
   profile city. Places come from a name table (`lib/activities/geo.ts`); unknown places list without a pin.
7. **Gear on Marketplace**, then the remaining Discover sections (first move, friends, mentors, start) and the
   leaderboard, all on the same card surface.

### Tokens (app/globals.css, `--fb-act-*`, light + dark)

| token | light | dark | use |
| --- | --- | --- | --- |
| `--fb-act-bg` | white | `#070c1a` navy | page canvas while Activities mode is on |
| `--fb-act-surface`, `-surface-2`, `-line` | white, `#f4f7fb`, `#e5eaf2` | navy steps | cards, rows, hairlines |
| `--fb-act-ink`, `-muted` | near-black, slate | near-white, slate | text |
| `--fb-act-blue`, `-blue-deep`, `-blue-soft` | FB blue family | lifted | links, primary pills, chips |
| `--fb-act-ember`, `-ember-deep`, `-ember-soft` | orange family | muted | the one action that matters, live numbers, pins |
| `--fb-act-shadow` | one soft 1px shadow | same, darker | cards sit on a hairline, not on a glow |
| `--fb-act-ease`, `--fb-act-radius` | `cubic-bezier(.2,.8,.2,1)`, 20px | same | every transition, big cards |

No new hex outside `app/globals.css` (AGENTS.md rule).

### Motion rules

- Sections fade + rise 500 ms, staggered 45 ms; Muse rows 40 ms.
- Hover: surface lift 2px / tint, 140 ms. Press: scale .97–.98.
- Count-up once, 900 ms, cubic ease-out. Ring 1.2 s.
- The only looping motion is the contour shader (below). No beams, no glows.
- `prefers-reduced-motion`: no stagger, one still shader frame, no count-up.
- **Theme switch fades**: `useActTheme` sets `html[data-theme-fade]` for 450 ms when `data-theme` flips while
  Activities is mounted; the page and (round 2) the chrome transition colours. Outside Activities Facebook still snaps.

### Flat surfaces, one shader (the minimal pass)

The first cut read as generic: pastel radial washes, blue-to-orange gradient orbs, gradient buttons with coloured
glows, a beam around the ring. All of that is gone. The rules now:

- Surfaces are flat (`--fb-act-surface` on `--fb-act-bg`) with a 1px `--fb-act-line`. No gradient fills anywhere:
  ember and blue are solid, icons sit on `-soft` discs, labels are sentence case.
- Ember is for the one action and the one live number. Blue is for links and "where you are".
- Life comes from one WebGL shader, `components/activities/home/Contours.tsx`: slow topographic contour lines of
  a warped height field, thin ink lines with one level in ember. It is used in three places: behind the ring in
  the progress hero, behind the boss on quest cards in Messages, and very faintly under the whole app while
  Activities mode is on. It reads the ink and ember tokens (so it follows light/dark), runs at about 30 fps,
  pauses off-screen and in hidden tabs, and leaves the flat surface alone without WebGL2. The only gradients
  left in the CSS are alpha masks that fade the lines out under text.

### Files

- `components/activities/home/` (ProgressHero, YourGames, Communities, EventsNearby + EventMap, Contours,
  ActivitiesMode, useActivitiesMode, useActTheme, `home.module.css`), `MuseActions.tsx` and `DiscoverPage.tsx`
  restyled in place.
- `lib/activities/home.ts` (`homeProgress`, `nearbyEvents`), `lib/activities/geo.ts` (+ node test).
- Dev preview without a database or session: `app/activities-preview/page.tsx` + `fixtures.ts`
  (404 in production). Agentation is mounted in dev builds for click-and-annotate feedback.

## Round 2: the whole app refreshes when you enter Activities (built, branch `design-activities-mode`)

What the user asked for: "people should get super refreshed instantly as they hit the activities tab", and the
same feeling in Messages for the challenges. No logic changed: same API routes, tables, Muse calls.

1. **Activities is a mode, not a page.** `ActivitiesMode` (mounted once by the signed-in layout) calls
   `useActivitiesMode`, which sets
   `html[data-mode='activities']` while the route matches `lib/activities/mode.ts` (`/activities/*` and the
   preview page) and removes it on leave. A one-line head script in `app/layout.tsx` sets it before first paint,
   so a hard load of `/activities` never flashes the Facebook chrome.
2. **One attribute, one fade.** Under the attribute the header, both rails and the compose button point the
   Facebook tokens they already read (`--fb-card`, `--fb-text`, `--fb-hover`, ...) at the `--fb-act-*` palette
   (`components/layout/layout.module.css`, last block), then a few shape rules: frosted header on a hairline,
   ember badges, pill rows and buttons. Same markup, same layout. Entering, leaving and the light/dark switch
   call `fadeTheme()` (`useActTheme.ts`), which sets `html[data-theme-fade]` for 450 ms; colours transition over
   420 ms only while it is set, so outside those moments Facebook snaps exactly as before.
3. **Entry.** The canvas goes flat white / navy and the faint contour field fades in under everything, the
   chrome re-tints, the sub-nav and the right-rail cards rise, page sections rise as in round 1.
4. **Left rail** gets the Activities sub-nav (Home, Goals, Games, Muse, Privacy) above the usual items; the
   current one is solid blue. **Right rail** shows "Closeness this week" and "Your squads" (the
   viewer's group chats, `components/layout/Squads.tsx`, unread count in ember) only; friend requests and
   contacts stay mounted but hidden, so their state survives the round trip.
5. **Phone.** The header re-tints (solid, not frosted: a backdrop filter would trap the fixed search sheet). The
   liquid-glass tab bar keeps its shape with a navy tint, a blue pill and an ember dot
   (`--fb-act-glass-tint`, `--fb-act-glass-pill`).
6. **Messages / challenges.** The thread cards in `components/messages/cards` use the hero / task-row language
   everywhere they render (Messenger itself stays Facebook): flat card, boss or glyph, one live number in
   ember (HP left, the hit, time left, the leader's cells), one ember action, and `MemberRing`, a small progress
   ring per member (damage share on quests, cell share in each player's map colour on Turf). Pills, chips and
   the eyebrow are the `home.module.css` classes.
7. **Preview without a database.** `/activities-preview` (inside the mode) and `/activities-preview/feed`
   (outside it) share a dev-only layout; `PreviewFetch` answers the chrome's and the cards' GETs from
   `fixtures.ts`. Moving between the two links shows the chrome re-tint and restore.

**Still open:** whether the Feed ever enters the mode (it does not), whether a squad chat with a live quest
should switch the mode on in Messages (it does not; only the cards carry the look), and the name. `border-beam`
is no longer imported and can leave `package.json`. Dialogs that portal to `<body>` from the chrome
(weekly quests, create story) keep the Facebook surface.

## How to review

```bash
npm run dev            # http://localhost:3001 if 3000 is busy
open http://localhost:3001/activities-preview
```

Toggle light/dark from the account panel, check 1440 / 768 / 390, use Agentation (bottom-right) to leave notes.
Use the "Activities · Facebook feed" links at the top of the preview to watch the mode enter and leave.
