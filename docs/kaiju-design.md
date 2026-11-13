# Kaiju design handoff: one tap, a calmer Facebook

Round 2 of `docs/activities-design.md`, fleshed out. Checked against `design` at 41d4850 (code read, nothing run; every snippet below is unverified in a browser). Names: copy says **Kaiju**; code says `activities` (routes, attribute, tokens) and `rally` (engine). Read `AGENTS.md` first; this file never overrides it.

## 1. The idea

Facebook is busy. Tapping Kaiju should feel like the whole app took a breath: same layout, same information architecture, but white or navy instead of grey, hairlines instead of shadows, one blue, one orange, dots, and nothing moving unless it means something. Leaving restores Facebook exactly.

Ten rules. If a screen breaks one, the screen is wrong.

1. **One accent per screen.** Blue is structure (links, selected, progress). Ember is the one action that matters or the one live number. Never two ember things in view.
2. **Line, not shadow.** Cards are a surface with a 1px `--fb-act-line`. `--fb-act-shadow` is only for things that float (sheet, toast, popover).
3. **Dots are the only ornament.** Dot grid, dotted ring, dotted rule, dot bar, dot orb (§4). No illustrations, no emoji, no gradients outside the hero wash.
4. **One luminous thing per screen:** the wash hero, or a beam, or the 3D stage. Not two.
5. **Three type sizes per screen,** numbers tabular, one line of copy per card.
6. **Real counts or no line.** "3 friends are in" hides at zero.
7. **Motion explains state.** Enter, press, a number changing, a move landing. No loops except the 22 s wash and an orb while Muse works.
8. **Dark is navy,** never grey.
9. **Every tap target ≥ 44px;** every hover style sits under `@media (hover: hover)`.
10. **Nothing waits silently.** Under 2 s: nothing. 2 s or more: a dot orb. Over 3 s: also a beam on the thing being made.

## 2. The mode: the whole app changes on one attribute

Every piece of Facebook chrome (`components/layout/*`, `components/mobile/*`, `components/messages/*`) already paints from `--fb-*` variables. So the refresh is a token remap, not a second layout.

**`app/globals.css`** (after the dark block; both themes work because `--fb-act-*` already has light and dark values):

```css
/* Activities mode: the chrome reads the calm tokens while <ActivitiesMode/> is mounted. */
html[data-mode='activities'] {
  --fb-bg: var(--fb-act-bg);
  --fb-card: var(--fb-act-surface);
  --fb-text: var(--fb-act-ink);
  --fb-text-secondary: var(--fb-act-muted);
  --fb-text-tertiary: var(--fb-act-muted);
  --fb-divider: var(--fb-act-line);
  --fb-divider-soft: var(--fb-act-line);
  --fb-hover: var(--fb-act-surface-2);
  --fb-hover-strong: var(--fb-act-blue-soft);
  --fb-icon-bg: var(--fb-act-surface-2);
  --fb-icon-bg-hover: var(--fb-act-blue-soft);
  --fb-input-bg: var(--fb-act-surface-2);
  --fb-bubble: var(--fb-act-surface-2);
  --fb-blue: var(--fb-act-blue);
  --fb-blue-hover: var(--fb-act-blue-deep);
  --fb-shimmer: var(--fb-act-surface-2);
  --fb-shimmer-highlight: var(--fb-act-line);
  --fb-radius: 16px;
  --fb-shadow-card: 0 0 0 1px var(--fb-act-line);
  --fb-font: var(--fb-act-font);
}
html[data-mode-fade] *,
html[data-mode-fade] *::before,
html[data-mode-fade] *::after {
  transition:
    background-color 0.42s var(--fb-act-ease), color 0.42s var(--fb-act-ease),
    border-color 0.42s var(--fb-act-ease), box-shadow 0.42s var(--fb-act-ease), fill 0.42s var(--fb-act-ease) !important;
}
```

**`components/activities/ActivitiesMode.tsx`** (new, ~20 lines), rendered by a new `app/(app)/activities/layout.tsx` (`<><ActivitiesMode />{children}</>`), by `app/(app)/games/[id]` (Turf), and by `RallySheet` while the library sheet is open in a thread:

```tsx
'use client';
import {useEffect} from 'react';

/** Sets html[data-mode='activities'] while mounted; the chrome re-tints through app/globals.css. */
export function ActivitiesMode() {
  useEffect(() => {
    const html = document.documentElement;
    const flip = (on: boolean) => {
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        html.setAttribute('data-mode-fade', '');
        setTimeout(() => html.removeAttribute('data-mode-fade'), 450);
      }
      if (on) html.setAttribute('data-mode', 'activities');
      else html.removeAttribute('data-mode');
      const bg = getComputedStyle(html).getPropertyValue(on ? '--fb-act-bg' : '--fb-card').trim();
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
      (window as {ReactNativeWebView?: {postMessage(s: string): void}}).ReactNativeWebView?.postMessage(
        JSON.stringify({type: 'mode', bg, dark: html.dataset.theme === 'dark'}),
      );
    };
    flip(true);
    return () => flip(false);
  }, []);
  return null;
}
```

**The Expo shell follows** (`mobile/App.tsx`): in `onMessage`, before the `sync-health` check, handle `{type: 'mode', bg, dark}` by setting the `SafeAreaView` background to `bg` and `<StatusBar style={dark ? 'light' : 'dark'} />`. Without this the notch strip stays white above a navy app. `useActTheme` should post the same message when the theme flips inside the mode.

**What still needs its own rule** (hard-coded values the remap cannot reach), all in the existing module files under `:global(html[data-mode='activities'])`:

| Where | In the mode |
|---|---|
| `layout.module.css` `.header` | `background: color-mix(in srgb, var(--fb-act-surface) 72%, transparent)`, `backdrop-filter: blur(20px) saturate(180%)` (+ `-webkit-`), `box-shadow: 0 1px 0 var(--fb-act-line)` |
| `.tabActive::after` | no underline; the active tab is a `--fb-act-blue-soft` pill behind the icon |
| `.rightCol` | contents hidden for the demo (calm, zero logic); later "Closeness this week" + your squads |
| `LeftSidebar` | the five Kaiju doors only: Home, Goals, Games, Muse, Privacy, then "Back to Facebook" |
| `mobile.module.css` tab bar | already glass; active icon gets the same blue-soft pill |
| `@media (prefers-reduced-transparency: reduce)` | header and tab bar go opaque `--fb-act-surface` |

Once the mode is in, the `body:has(.page)` canvas rules at the top of `home.module.css` are redundant and can go.

**Where the mode never applies:** the Feed. The Home hero card and the quest cards in a thread are calm islands (they use `--fb-act-*` directly), windows into the mode, not the mode.

### Entry, in order

| t | What happens |
|---|---|
| 0 | Press feedback on the Kaiju tab (scale 0.97, 100 ms, on pointer-down) |
| 0–420 ms | Chrome re-tints (colour only, nothing moves); header turns to glass; right rail fades out |
| 0–600 ms | The hero wash fades in; one glimmer band crosses the canvas once (the spec §9.3 glimmer; a `linear-gradient` mask translated once, never looped) |
| 120 ms → | Sections rise 500 ms, staggered 45 ms (built in round 1) |
| ~500 ms | Dot grid settles, numbers count up once, the ring draws 1.2 s |
| exit | 200 ms colour fade back, no choreography |

Reduced motion: no fade, no glimmer, no rise, no count-up. The colours simply are the new ones.

## 3. Tokens

Already in `app/globals.css` as `--fb-act-*` (light + dark). Changes this handoff asks for, all inside that file:

| Token | Now | Change | Why |
|---|---|---|---|
| `--fb-act-ember-ink` (light) | `#ffffff` | `#1a0d04` (the dark-theme value) | White on ember is **2.61:1** and fails; dark ink on ember is **7.30:1** |
| `--fb-act-radius` | `20px` | `16px` | The Kaiju card decision; matches Astryx's radius step |
| `--fb-act-radius-hero` | — | `28px` | Hero and sheets |
| `--fb-act-font` | — | `var(--font-figtree), Segoe UI, Helvetica, Arial, sans-serif` | Figtree via `next/font/google` in `app/layout.tsx` (`variable: '--font-figtree'`) |

Measured contrast (WCAG): blue on white 4.82 · muted on white 5.41 · ember text on white **2.61** · ember-deep text on white **3.54** · dark theme: ember on surface 7.71, blue 5.66, muted 6.58. So: ember is never small text on light; live numbers in ember use `--fb-act-ember-deep` at 24px bold or larger; `--fb-act-line` (1.21:1) is decoration only, so inputs get a `--fb-act-muted` border or a 2px blue focus ring.

**Radii** (Astryx steps): 8 chips · 12 inputs and rows · 16 cards · 28 hero and sheets · 32 modal · 999 pills.
**Type** (Astryx 14 × 1.2, Figtree): 12 · 14 · 17 · 20 · 24 · 29 · 35. Weights 400 body, 500 labels, 600 titles, 700 numbers. Tracking −0.02em at 29 and up, 0 at body, +0.01em at 12. `font-variant-numeric: tabular-nums` on every number.
**Space:** 28 between sections · 16 card padding · 12 between rows · 8 inside rows.

## 4. Dots

| Piece | Recipe | Use |
|---|---|---|
| Dot grid | `radial-gradient(circle, currentColor 1px, transparent 1.5px)` at `12px 12px`, opacity 0.16, masked with a radial fade so it dissolves at the edges | Hero background, empty states |
| Dotted ring | 60 SVG dots, 6° apart, 3px; the first `round(p × 60)` filled blue → ember, the rest `--fb-act-ring-track` | Goal ring, per-member progress on quest cards |
| Dotted rule | 1px dots at 8px pitch in `--fb-act-line` | Section dividers instead of lines |
| Dot bar | 20 dots; filled count = progress | Kaiju HP, relay legs, streak lives |
| Dot orb | `ThinkingOrb` (§5) | Every AI state |

If `components/activities/dots.tsx` from the fitness-tab pass lands, it wins and these numbers move to match it.

## 5. libraries.dev

All are React 18+ web packages (MIT, client components, canvas or SVG or WebGL). `border-beam` is installed and used; the rest are `pnpm add`. Kit colour props take real colour strings, so read tokens at run time (`getComputedStyle(document.documentElement).getPropertyValue('--fb-act-blue')`); no hex leaves `globals.css`. Pass `theme={useActTheme()}` to every kit, as `ProgressHero` does.

| Kit | Package · component | Where in Kaiju | Props to use |
|---|---|---|---|
| **Thinking orbs** (the dot orb you liked) | `thinking-orbs` · `ThinkingOrb` | Every Muse state: see the state map below | `state`, `size` (64 or 20 only), `theme`, `paused`, `aria-label`. Monochrome; freezes itself under reduced motion |
| **Border beam** (installed) | `border-beam` · `BorderBeam` | Hero ring on a day a move landed (built: `pulse-outside`, `sunset`). The quest card while Spark writes it (`md`, `ocean`) | `size`, `colorVariant` (`ocean` blue, `sunset` ember), `active`, `borderRadius`, `strength`. Rotating sizes ignore reduced motion: bind `active={loading && !reduced}` |
| **Image** | `img-fx` · `ImageGeneration` | Boss and badge art from `api/muse/badge-art`: a pixel mosaic that settles into the kaiju | `preset="pixels-organic"`, `images`, `colors` (blue + ember tokens), `cardBg`, ref `triggerReveal()`. Needs `three` (installed). Art must be same-origin or CORS |
| **Voice** | `voice-glow` · `VoiceBeam`, `useMicrophone` | Voice log in `LogWorkoutSheet`: glow from the bottom on phones, around the mic pill on desktop | `type` (`mobile` / `pill`), `stream` or `level`, `colorVariant="ocean"`, `active` |
| **Liquid metal** | `metal-fx` · `MetalFx`, `MetalBadge` | The reward card medallion and the MVP crown; `preset` follows the tier (Iron/Silver Knight → `silver`, Golden Knight and up → `gold`) | `variant="circle"`, `preset`, `paused` (set it under reduced motion; the kit does not). WebGL2, falls back to the plain child. One per screen |
| **Gooey** | `liquid-gooey` · `Liquid`, `Liquid.Item` | "Make a move" splits into Manual · Photo · Voice | `fill="var(--fb-act-surface)"`, `blur`, `Liquid.Item` `x`/`y`, `transition="smooth"`. SVG filters; snaps under reduced motion |
| **Bot avatars** | `bot-avatars` · `BotAvatar` | Only the Muse-to-Muse mentor exchange, where two agents need faces. Never a person: people are the soft toys in `lib/kingdom` | `type="blob"`, `shading="smooth"`, `state` (`default` / `working`), `color`, `size`, `seed` |
| Not used | `voice-ring`, `magnetkit-web`, Distortion waves | One voice effect is enough; Magnet's model file is not MIT; Distortion waves is SwiftUI only, so the hero stays CSS wash + grain | — |

**Orb state map** (the Standby / Thinking / Building / Generating / Waiting / Error set):

| Kaiju moment | `state` | Size | Beam too? |
|---|---|---|---|
| Muse idle ("From your Muse" header) | `breathing` | 20 | no |
| Muse ordering Decide-now cards, weekly recap | `solving` | 20 | no |
| Game Master writing a quest from a sentence or a Reel (~6 s) | `shaping` | 64, in the pending quest card | yes, `md` `ocean` |
| Boss or badge art generating | `composing` | 20, under the mosaic | no (the mosaic is the loader) |
| Photo Proof check (1.4–3.6 s) | `searching` | 20, beside "Checking your photo" | no |
| Waiting on a WHOOP webhook | `connecting` | 20 | no |
| Voice log listening | `listening` | 20 | no (the voice glow is live) |
| Mentor exchange, Muse ↔ Muse (~22 s) | `weaving` | 64 | yes, `line` |
| Error | `paused` + an `--fb-act-ember-deep` label | 20 | no |
| Narration (1.8 s) | nothing | — | — |

Install order for the hours left: `thinking-orbs` first (it is the signature), then `img-fx` and `voice-glow`, then `metal-fx`; `liquid-gooey` and `bot-avatars` only if everything else is done. WebGL kits (`metal-fx`, `img-fx`) load through `next/dynamic` with `ssr: false`.

## 6. Glass

- **Header and tab bar: CSS glass**, as in §2. It works everywhere, including the iOS shell.
- **`liquid-glass-react` (installed, unused): one place, the arena HUD** (the HP pill over the 3D stage in `QuestDashboard`). Refraction only shows over something colourful and moving, and the arena is the only such surface. Props: `displacementScale={40} blurAmount={0.08} saturation={130} aberrationIntensity={1} elasticity={0.12} cornerRadius={999}`, `overLight` in light theme, never `mode="shader"`.
- Safari and Firefox draw the blur but not the bend, and the iOS shell is WKWebView, so on iPhone it is plain glass. Design the plain version first; no text smaller than 14px inside glass; opaque under reduced transparency.

## 7. Feel (from Emil Kowalski's skills)

`npx skills@latest add emilkowalski/skills`. For this repo: `emil-design-eng` and `apple-design` before composing a screen, `animate` before writing motion, `choreograph` for the mode entry, `mobile-native` for the WebView, `review-animations` + `animation-performance` on any PR touching motion, `remove-animations` once per screen, `break-ui` after each screen, `learn-taste` at the end of a session (it writes corrections into this file). `animate-expo` only for `mobile/`.

The rules that matter here:
- Animate `transform` and `opacity` only. Ease-out for enter and exit, ease-in-out for moves on screen, never ease-in. UI under 300 ms; `--fb-act-ease` everywhere.
- Feedback on pointer-down, not release: scale 0.97 in 100 ms.
- Enter from `scale(0.96)` + `opacity: 0`, never from `scale(0)`. Enter and exit along the same path; sheets leave the way they came.
- Anything a finger drags is interruptible and keeps its velocity; rubber-band at edges.
- Materials: heavier glass for structure (header, tab bar), lighter for the one floating control. Never glass on glass. Scrim for modals only.
- WebView hygiene: `-webkit-tap-highlight-color: transparent`; `touch-action: manipulation` on controls; `100dvh`, never `100vh` (`.shell` uses `min-height: 100vh` today); inputs at 16px or larger so iOS does not zoom; hover styles under `@media (hover: hover)`; bottom bars pad `env(safe-area-inset-bottom)`.

## 8. Astryx

Already in: `Theme` with `neutralTheme` in `app/providers.tsx`, and components on `/activities/goals`, `/activities/muse` and `loading.tsx`. The rule that keeps one look:

- **Signature surfaces** (home, hero, quest and reward cards, arena, Messenger cards, chrome): CSS Modules on `--fb-act-*`. No Astryx components.
- **Utility pages** (privacy matrix, connectors, goals, vault, audit log): Astryx components are right there: `List`/`ListItem`, `Token`, `ProgressBar`, `Switch`, `Dialog`, `Skeleton`. They carry the accessibility. Dense rows, not card-wrapped lists.
- What "the Astryx aspect" means in pixels: Figtree, the 14 × 1.2 scale, radii 8/12/16/28/32, hairlines, chips for counts. §3 already adopts all of it, so both kinds of page read as one.
- Colour goes through a theme, never `:root` overrides: after the deadline, `npx astryx theme template` → a `kaiju` theme with the blue and ember tokens → `theme build`. Until then neutral is close enough on utility pages.
- Agents read props before using a component: `npx astryx component <Name> --dense`, or the MCP server (`claude mcp add --transport http astryx https://astryx.atmeta.com/mcp`).

## 9. Characters and Messenger

- The soft toys from `lib/kingdom` are the only faces for people and kaijus. One 3D canvas per screen, paused off-screen, DPR capped at 2, `motion = 0` under reduced motion. Lists and chat strips use the 2D head.
- The same avatar is the thread through the product: Home hero card (idle) → Kaiju home action row (waves when a move is open) → quest card strip → arena (attacks on a move).
- Quest cards in a thread: one live number in ember, one ember action, a dotted ring per member, the squad strip on top. Same routes, tables and Muse calls. WHOOP and Strava moves animate and count; the copy only ever says "X completed a move".

## 10. Order for the hours left (submission 10:30am PST, Nov 13)

1. §2 remap + `ActivitiesMode` + layout file. This is the "whole Facebook changes" moment and the first 15 seconds of the demo.
2. Header glass, active-tab pill, calm rails (§2 table).
3. Copy: `'Activities'` → `'Kaiju'` in `LeftSidebar.tsx:34`, `MobileTabBar.tsx:36`, `MobileMenu.tsx:38`. Figtree.
4. `--fb-act-ember-ink` contrast fix and the radius tokens (§3).
5. `thinking-orbs` in the pending quest card (the 0:40 Reel → quest beat) with the beam.
6. Shell tint in `mobile/App.tsx` (needs a new shell build or a dev client to show).
7. Only if time: `img-fx` boss art, `voice-glow`, `metal-fx` reward, glass HUD.

Check each step at `/activities-preview` (1440 / 768 / 390, light and dark, reduced motion on), then `pnpm typecheck`.

Not checked: nothing here was rendered. The universal `data-mode-fade` transition could stutter on a very long thread (scope it to the chrome if it does). `color-mix` and `:has()` need Safari 16.2+. The remap assumes no chrome file hard-codes Facebook grey; grep for `#f0f2f5` and `rgba(0, 0, 0` under `components/layout` and `components/mobile` before trusting it.
