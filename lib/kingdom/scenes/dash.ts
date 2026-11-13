/** Dragon Dash: the dragon holds x = 0 while stone towers, coins, hedges, pines and finally the castle scroll past. */
import {Group} from 'three';
import {C} from '../palette';
import {autoDash} from '../games/autopilot';
import {DASH, createDash, startDash, stepDash} from '../games/dash';
import {setContinuous, setState} from '../rig';
import {box, softMaterial} from '../factories/soft';
import {Stage, type GameScene, type Host} from './stage';

const POOL = 8, COINS = 30, TALL = 9;

export function createDashScene(host: Host): GameScene {
  const st = new Stage(host, {fov: 38, sun: [-4, 9, 6], radius: 13, far: -11});
  let s = createDash(1);
  const ground = st.ground(72, 32, 2, -10);
  const pillars = Array.from({length: POOL}, () => { // shafts are full height and slide in from below and above, so their bricks never stretch
    const g = new Group(); g.visible = false; st.group.add(g);
    return {g, bottom: st.block(0.8125, TALL, 0.8125, 'stone', C.stoneLight, 0, 0, 0, g), top: st.block(0.8125, TALL, 0.8125, 'stone', C.stoneLight, 0, 0, 0, g), capB: st.block(1.0625, 0.25, 1.0625, 'stone', C.stone, 0, 0, 0, g), capT: st.block(1.0625, 0.25, 1.0625, 'stone', C.stone, 0, 0, 0, g)};
  });
  const coins = Array.from({length: COINS}, () => { const g = new Group(); g.visible = false; st.group.add(g); box(g, softMaterial('gold', C.gold), 4, 6, 1, 0, 0, 0); for (const sx of [-1, 1]) box(g, softMaterial('gold', C.gold), 1, 4, 1, sx * 2.5, 0, 0); box(g, softMaterial('gold', C.goldDark), 2, 2, 1.5, 0, 0, 0); return g; });
  const pine = st.make('world-tree-pine'), hedge = st.make('world-hedge');
  const pines = Array.from({length: 8}, (_, i) => st.clone(pine, 0, 0, -3.6 - (i % 3) * 1.1, i).group), hedges = Array.from({length: 18}, () => st.clone(hedge, 0, 0, -1.7).group);
  const castle = st.place(st.make('world-castle-royal'), 0, 0, 0, -Math.PI / 2); castle.group.scale.setScalar(1.6);
  const dragon = st.place(st.make('creature-baby-dragon', {variant: 'medium'}), 0, 2.3, 0, Math.PI / 2);
  dragon.group.scale.setScalar(1 / dragon.group.userData.creature.scale); dragon.rest = 'flap'; setState(dragon, 'flap'); // you fly this one: its px size matches DASH.radius

  return {
    group: st.group, background: st.sky,
    start: (seed = 1) => { s = startDash(createDash(seed)); setState(dragon, 'flap'); },
    auto: () => autoDash(s),
    hud: () => ({phase: s.phase, score: s.score, message: s.message, left: `♥ ${s.lives}`, right: `${Math.min(DASH.goal, Math.round(s.dist))} / ${DASH.goal} m · ${s.coins} gold`}),
    dispose: () => st.dispose(),
    step: (dt, input) => {
      stepDash(s, input, dt);
      for (const e of s.events) {
        if (e.type === 'flap') { setState(dragon, 'jump'); st.burst(-0.45, s.y - 0.25, 0, C.white, 3, 0.8, 0.7); }
        if (e.type === 'coin') st.burst(0.2, e.y ?? s.y, 0, C.gold, 9, 1.7);
        if (e.type === 'pass') st.burst(0, s.y, 0, C.sparkle, 5, 1.2, 0.7);
        if (e.type === 'hit') { setState(dragon, 'hit'); st.burst(0.3, s.y, 0, C.crimson, 16, 2.6); st.shake(0.55); }
        if (e.type === 'win') { setState(dragon, 'celebrate'); [0, 2, 4].forEach((x, i) => st.burst(x, 3.5, 0, [C.gold, C.pink, C.blue][i], 18, 3.2)); }
        if (e.type === 'lose') setState(dragon, 'hit');
      }
      const d = s.dist;
      dragon.group.position.y = s.y - 0.3; dragon.group.rotation.z = Math.max(-0.45, Math.min(0.45, s.vy * 0.07)); dragon.group.visible = !(s.invuln > 0 && Math.floor(s.t * 12) % 2 === 0);
      if (s.phase === 'playing') setContinuous(dragon, 'flap');
      pillars.forEach((e, i) => {
        const p = s.pillars[i]; e.g.visible = !!p; if (!p) return;
        const bottomH = Math.max(0.2, p.gapY - DASH.gap), topY = p.gapY + DASH.gap;
        e.g.position.x = p.x - d; e.bottom.position.y = bottomH - TALL / 2; e.capB.position.y = bottomH + 0.125; e.top.position.y = topY + TALL / 2; e.capT.position.y = topY - 0.125;
      });
      coins.forEach((g, i) => { const c = s.coinList[i]; g.visible = !!c && !c.taken; if (c) { g.position.set(c.x - d, c.y, 0); g.rotation.y += dt * 3.5; } });
      castle.group.position.x = DASH.goal + 5 - d; ground.position.x = 2 - (d % 1); // the grass repeats every metre, so sliding it one metre and snapping back reads as endless
      pines.forEach((t, i) => { t.position.x = ((((i * 6.5 - d * 0.6) % 52) + 52) % 52) - 26; });
      hedges.forEach((h, i) => { h.position.x = ((((i * 3 - d) % 54) + 54) % 54) - 27; });
      const lift = (s.y - 3) * 0.12; st.eye.set(1.8, 3.3 + lift, 11.5); st.look.set(1.8, 3.1 + lift, 0);
      st.update(dt);
    },
  };
}
