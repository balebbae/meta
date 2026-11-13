# Beta Kingdom · `lib/kingdom`

Kaiju's characters and world pieces plus the pure game logic. Every piece is a pixel build in the Minecraft manner: boxes on a 1/16 m grid, one texel of a 16×16 nearest-filtered pattern per pixel (planks, stone bricks, scales, weave, leaves), faces painted as flat pixel decals, cones as stepped pyramids. The shared helpers are in `factories/soft.ts` (`PX`, `box`, `decal`, `steps`, `eyes`, `smile`, `softMaterial`): heroes (`hero.ts`), kaijus (`creatures.ts`), ponies (`mounts.ts`), castles and props (`world.ts`) and merged game boards (`terrain.ts`). Builders write every size and position in px.
Rendered by `components/kingdom` (React Three Fiber) at `/kingdom`.

## Units and conventions

- 1 world unit = 1 metre = 16 px. A hero is 29 px (1.8 m), a pony 26 px, a giant 41 px; terrain cells are `CELL = 1 m`, one 16 px block.
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

## Adding an asset

1. Build it from `box(parent, material, w, h, d, x, y, z)` calls in px, origin at the feet, named pivots (`piv`) for anything that moves. Keep sizes whole pixels; a worn layer is 1 px larger than what it covers.
2. Return `makeRig(group, species, pivots, height, states)`; add a branch in `rig.ts` only if the species is new.
3. Add an `AssetDef` to `catalog.ts`; map a role in the theme if games should use it.

## Export

`components/kingdom/export.ts` writes a binary GLB with `GLTFExporter` and re-imports it with `GLTFLoader` to compare mesh counts.
Vertex colours and the pixel textures survive; the pose is baked and **procedural animations are not exported** (no keyframe tracks).
