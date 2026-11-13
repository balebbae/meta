# Activities design (round 1) and the whole-app refresh (round 2)

Branch `design`. Round 1 is built and previewable; round 2 is the direction we still have to flesh out.
Product name is parked: copy says "Activities", the engine stays "Rally".

## The goal

Facebook feels busy. The moment someone taps **Activities** they should feel like they walked into a
different, calmer app: Instagram-easy, Apple-clean, blue + orange, light and dark, motion everywhere but
never loud. Every feature we already have (Muse, goals, games, Turf, Coach, messaging challenges) keeps its
logic; only the surface changes.

## Round 1: the Activities tab (done, `/activities`)

Order on the page, top to bottom (the user's list):

1. **Progress hero**: greeting, active goal, steps today vs goal, active days this week vs the band picked in
   onboarding, sleep last night, a blue-to-orange ring to the goal. Numbers count up once; the ring pulses
   (`border-beam`, `pulse-outside`) only on days a move already landed.
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
| `--fb-act-bg` | white | `#070c1a` navy | page canvas while Activities is mounted |
| `--fb-act-wash-a / -b` | pale blue / peach | deep blue / rust | hero radial wash, drifts 22 s |
| `--fb-act-surface`, `-surface-2`, `-line` | white, `#f4f7fb`, `#e5eaf2` | navy steps | cards, rows, hairlines |
| `--fb-act-ink`, `-muted` | near-black, slate | near-white, slate | text |
| `--fb-act-blue`, `-blue-deep`, `-blue-soft` | FB blue family | lifted | links, primary pills, chips |
| `--fb-act-ember`, `-ember-deep`, `-ember-soft` | orange family | muted | the one action that matters, live numbers, pins |
| `--fb-act-grain` | 0.07 | 0.10 | SVG `feTurbulence` grain over the hero (no WebGL) |
| `--fb-act-ease`, `--fb-act-radius` | `cubic-bezier(.2,.8,.2,1)`, 20px | same | every transition, big cards |

No new hex outside `app/globals.css` (AGENTS.md rule).

### Motion rules

- Sections fade + rise 500 ms, staggered 45 ms; Muse rows 40 ms.
- Hover: surface lift 2px / tint, 140 ms. Press: scale .97–.98.
- Count-up once, 900 ms, cubic ease-out. Ring 1.2 s.
- Beam only on the hero ring (moved today) and nowhere else. No looping backgrounds except the slow hero wash.
- `prefers-reduced-motion`: no stagger, no beam, static wash, no count-up.
- **Theme switch fades**: `useActTheme` sets `html[data-theme-fade]` for 450 ms when `data-theme` flips while
  Activities is mounted; only this tree transitions colours. The rest of Facebook still snaps.

### Files

- `components/activities/home/` (ProgressHero, YourGames, Communities, EventsNearby + EventMap,
  useActTheme, `home.module.css`), `MuseActions.tsx` and `DiscoverPage.tsx` restyled in place.
- `lib/activities/home.ts` (`homeProgress`, `nearbyEvents`), `lib/activities/geo.ts` (+ node test).
- Dev preview without a database or session: `app/activities-preview/page.tsx` + `fixtures.ts`
  (404 in production). Agentation is mounted in dev builds for click-and-annotate feedback.

## Round 2: the whole app refreshes when you enter Activities (to flesh out)

What the user asked for: "people should get super refreshed instantly as they hit the activities tab", and the
same feeling in Messages for the challenges. Proposed shape, open for discussion:

1. **Activities as a mode, not a page.** Entering `/activities/*` (and the challenge surfaces in Messages) sets
   `html[data-mode='activities']`. The header, left rail, right rail and mobile tab bar read the `--fb-act-*`
   tokens under that attribute: same layout, calmer surfaces, hairline dividers, pill buttons, the blue/orange
   accent. Leaving the mode restores Facebook as is. One attribute, one fade (reuse the theme fade), no second
   layout.
2. **Entry transition.** First paint of the mode: canvas wash fades in, chrome re-tints over 420 ms, sections
   rise. Think "the app took a breath".
3. **Messages / challenges.** The group-chat challenge cards (quests, Turf, boss fights, weekly drops) get the
   hero/task-row language: one live number, one ember action, progress ring per member. Logic untouched: same
   API routes, same tables, same Muse calls.
4. **Right rail in the mode** becomes "Closeness this week" + your squads only; left rail collapses to the
   Activities sub-nav (Home, Goals, Games, Muse, Privacy).
5. **Shader.** The CSS wash + grain stays as the fallback; a WebGL distortion-wave hero (the SwiftUI
   `DistortionWaves` reference) is a follow-up once the CSS version is signed off.
6. **Still open:** does the Feed itself ever enter the mode (probably not), what the phone tab bar does
   (liquid-glass already, keep), and the name.

## How to review

```bash
npm run dev            # http://localhost:3001 if 3000 is busy
open http://localhost:3001/activities-preview
```

Toggle light/dark from the account panel, check 1440 / 768 / 390, use Agentation (bottom-right) to leave notes.
