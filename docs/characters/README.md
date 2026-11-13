# Character sets

- `kaiju-avatars.html`: the whole soft-toy family: the base avatar with its nine costumes, faces and moves, the six kaijus (small / medium / boss), both ponies with a rider seat, and the castles and props. Open it in a browser; it is self-contained (three.js inlined).
- Source: `lib/kingdom/factories/hero.ts` (base body + costume layers), `lib/kingdom/rig.ts` (jiggle animator), kaijus in `lib/kingdom/factories/creatures.ts`, ponies in `mounts.ts`, shared soft-toy helpers in `soft.ts`. Castles and props in `world.ts`, game boards in `terrain.ts`.
