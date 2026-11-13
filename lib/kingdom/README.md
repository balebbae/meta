# Beta Kingdom · `lib/kingdom`

Kaiju's characters and world pieces plus the pure game logic. Every piece is a pixel build in the Minecraft manner: boxes on a 1/16 m grid, one texel of a 16×16 nearest-filtered pattern per pixel (planks, stone bricks, scales, weave, leaves), faces painted as flat pixel decals, cones as stepped pyramids. The shared helpers are in `factories/soft.ts` (`PX`, `box`, `decal`, `steps`, `eyes`, `smile`, `softMaterial`): heroes (`hero.ts`), kaijus (`creatures.ts`), ponies (`mounts.ts`), castles and props (`world.ts`) and merged game boards (`terrain.ts`). Builders write every size and position in px.
Rendered by `components/kingdom` (React Three Fiber) at `/kingdom`.

## Units and conventions

- 1 world unit = 1 metre = 16 px. A hero is 29 px (1.8 m), a pony 26 px. Kaijus are px builds blown up by a per-kind factor (`SIZE` in `creatures.ts`, on an inner group so scenes keep `group.scale` for themselves): even a small one is hero height or more, a medium Stone Giant is 3.8 m and a boss Elder Dragon 5.4 m; terrain cells are `CELL = 1 m`, one 16 px block.
- Every asset's origin is at ground level under the centre of its footprint. Faces point to **+z**; +x is the character's left on screen.
- Geometry and materials are shared caches (`soft.ts`); `disposeSoftResources()` frees them once, on app unmount. Terrain merges one mesh per surface kind.
- A built asset is a `Rig` (`types.ts`): `group` (add it to a scene), named `pivots`, `height`, animation `state`, and `dispose()` for its geometry.
  Mounts seat riders under the `rider` pivot and list them in `rig.attached`.

### Pivot names

| Species | Pivots |
| --- | --- |
| avatar (the smooth base body, `factories/hero.ts`) | `root`, `torso`, `head`, `face` (`eyeL/eyeR`, mouth groups), `hat`, `armL/armR` (`handL/handR` inside), `legL/legR`, `cape` |
| slime / goblin / cyclops / giant | `root`, `head` where present, `armL/armR`, `legL/legR` (giant: `legR` carries the stomping foot) |
| dragon | `root`, `head` (+`flame`), `wingL/wingR`, `legL/legR`, `tail` |
| pony | `root`, `head`, `tail`, `legFL/FR/BL/BR`, `rider` |
| prop | `lid` (chest), `flag` (banner), `bridge` (drawbridge) |

## Animation

`rig.ts` drives pivots from code; nothing rebuilds geometry. `setState(rig, state)` then `animate(rig, dt, motion)` every frame
(`dt` in seconds, clamp it; `motion` 0..1 scales amplitude for reduced motion). Continuous states: `idle walk run trot flap`.
One-shots (`jump attack hit celebrate puff stomp squash`) return to `rig.rest` after `ONE_SHOT[state]` seconds.
`rig.states` lists what a given rig supports.

## Catalog, roles and themes

- `catalog.ts` is the gallery's list: `AssetDef {id, category, name, role, build(options), customizable}`.
- `theme/kingdom.ts` maps gameplay **roles** (`starter defender champion ruler smallEnemy heavyEnemy boss mount`) to asset ids.
  Games read `getTheme().roles.*`, never asset ids, so a second theme only needs its own catalog entries and a `Theme` object in `theme/index.ts`.
- `difficulty.ts` holds creature stats by kind and variant; `creatures.ts` re-exports it and stamps `group.userData.creature`.
- `factories/terrain.ts` merges a character map into one mesh (used by the game boards).

## Games (`games/`)

Pure modules, no three import: `createX(seed)`, `startX(state)`, `stepX(state, input, dt)`. `state.events` lists what happened in the
last step for scenes to turn into effects. Tests: `node --test "lib/kingdom/**/*.test.ts"` (also `pnpm test:kingdom`).

## Scenes (`scenes/`)

The 3D side of each game, as plain three with no React: `createGameScene(id, {camera, hero})` returns `{group, background, start(seed), step(dt, input), auto(), hud(), dispose()}`.
Add `group` to a scene, call `step` every frame and read `hud()`. The app wraps this in one R3F component (`components/kingdom/games/GameScene.tsx`); the character sheet in `docs/characters` runs the very same modules.

- `stage.ts`: what every game stands on. Lights with shadows, stepped hills and drifting clouds, pixel-true ground and blocks, the rigs it animates, pixel-cube bursts, scale pulses for hits, a death pop, and a camera with shake. A scene sets `eye` and `look`; `update(dt)` does the rest.
- `defense.ts`: kaijus march down three lanes and stop in front of the hero at the gate. Swings spark, hits shove them back, health bars sit over anything that takes more than two swings, kills burst into cubes of the creature's colour, blows on the gate throw rubble and shake the camera, and the gate topples when it falls.
- `dash.ts`: full-height brick towers slide in from above and below so their bricks never stretch; coins spin, hedges and pines scroll at different speeds, the dragon pitches with its speed and puffs on every flap.
- `joust.ts`: two riders charge past a wooden stand whose crowd bobs harder the better you ride; the camera pushes in for the impact and a perfect strike rocks the goblin back in the saddle.
- `quest.ts`: the maze is drawn at two metres a cell, so the patrolling slimes are as big as the hero; chests stay open, treasure sparkles, the camera follows from above.
- `games/autopilot.ts`: the input a competent player would give, read from game state alone. `scene.auto()` returns it, so a demo can play itself and tests can drive whole runs (`autopilot.test.ts`).

## Adding an asset

1. Build it from `box(parent, material, w, h, d, x, y, z)` calls in px, origin at the feet, named pivots (`piv`) for anything that moves. Keep sizes whole pixels; a worn layer is 1 px larger than what it covers.
2. Return `makeRig(group, species, pivots, height, states)`; add a branch in `rig.ts` only if the species is new.
3. Add an `AssetDef` to `catalog.ts`; map a role in the theme if games should use it.

## Export

`components/kingdom/export.ts` writes a binary GLB with `GLTFExporter` and re-imports it with `GLTFLoader` to compare mesh counts.
Vertex colours and the pixel textures survive; the pose is baked and **procedural animations are not exported** (no keyframe tracks).
