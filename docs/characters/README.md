# Character sets

- `kaiju-avatars.html`: the whole family in the Minecraft pixel style (16 px to the metre): the base avatar with its nine costumes, faces and moves, the six kaijus (small / medium / boss), both ponies with a rider seat, and the castles and props. Open it in a browser; it is self-contained (three.js inlined). The four game chips run the real game logic from `lib/kingdom/games` with the block characters.
- Source: `lib/kingdom/factories/hero.ts` (base body + costume layers), `lib/kingdom/rig.ts` (jiggle animator), kaijus in `lib/kingdom/factories/creatures.ts`, ponies in `mounts.ts`, shared pixel helpers in `soft.ts`. Castles and props in `world.ts`, game boards in `terrain.ts`.
- `sheets/`: one labelled contact sheet per group (`heroes.png`, `kaijus.png` with small / medium / boss at true relative size, `ponies.png`, `world.png`), rendered from the page above.
