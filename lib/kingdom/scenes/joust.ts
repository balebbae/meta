/** Tournament Joust: two riders charge down the lists in front of a cheering stand; the camera pushes in for the impact. */
import {Group, type Object3D} from 'three';
import {C} from '../palette';
import {autoJoust} from '../games/autopilot';
import {JOUST, createJoust, joustScore, startJoust, stepJoust} from '../games/joust';
import {setContinuous, setState} from '../rig';
import {buildTerrain} from '../factories/terrain';
import {PX, box, softMaterial} from '../factories/soft';
import {rng} from '../rng';
import {Stage, type GameScene, type Host} from './stage';

const LIST = ['FFFFFFFFFFFFFFFFFFFFFFFF', 'SSSSSSSSSSSSSSSSSSSSSSSS', 'SSSSSSSSSSSSSSSSSSSSSSSS', 'SSSSSSSSSSSSSSSSSSSSSSSS', 'SSSSSSSSSSSSSSSSSSSSSSSS', 'FFFFFFFFFFFFFFFFFFFFFFFF'];
const SHIRTS = [C.crimson, C.blue, C.gold, C.teal, C.purple, C.pink, C.green, C.ivory];

function lance(parent: Object3D): Group {
  const g = new Group(); g.position.set(-5 * PX, 17 * PX, 7 * PX); parent.add(g);
  box(g, softMaterial('wood', C.wood), 1, 1, 36, 0, 0, 18); box(g, softMaterial('metal', C.silver), 2, 2, 2, 0, 0, 36.5); box(g, softMaterial('gold', C.gold), 3, 3, 1, 0, 0, 3);
  return g;
}

export function createJoustScene(host: Host): GameScene {
  const st = new Stage(host, {fov: 40, sun: [-5, 10, 7], radius: 15, far: -13});
  let s = createJoust(1), cheer = 0, tumble = 0, clock = 0;
  st.ground(64, 34);
  const lists = buildTerrain(LIST, {F: 'flowers', S: 'sand'}, 5); st.group.add(lists.group);
  const fence = st.make('world-fence'), hedge = st.make('world-hedge'), tree = st.make('world-tree-round');
  for (let i = -12; i < 12; i++) for (const z of [-3, 3]) st.clone(fence, i + 0.5, 0, z);
  for (let i = -22; i <= 22; i++) st.clone(hedge, i * 0.5, 0, 0); // the tilt barrier between the two lanes
  for (const x of [-15, -9, 9, 15]) st.clone(tree, x, 0, -9.5, x);
  for (const [x, id] of [[-13.5, 'world-tent'], [13.5, 'world-tent'], [-7, 'world-banner'], [0, 'world-banner'], [7, 'world-banner']] as const) st.place(st.make(id), x, 0, -3.9);
  // the stand: three wooden tiers and a crowd that bobs harder the better you ride
  const r = rng(11), crowd: {g: Group; y: number; phase: number}[] = [];
  for (let t = 0; t < 3; t++) {
    st.block(22, 0.5 + t * 0.5, 1, 'wood', C.wood, 0, (0.5 + t * 0.5) / 2, -5 - t);
    for (let j = 0; j < 22; j++) {
      if (r() < 0.12) continue;
      const g = new Group(), y = 0.5 + t * 0.5; g.position.set(-10.5 + j, y, -5 - t); st.group.add(g);
      box(g, softMaterial('cloth', SHIRTS[Math.floor(r() * SHIRTS.length)]), 6, 6, 4, 0, 3, 0); box(g, softMaterial('skin', C.skin[Math.floor(r() * C.skin.length)]), 6, 6, 6, 0, 9, 0);
      crowd.push({g, y, phase: r() * 6.28});
    }
  }
  const player = st.place(st.make('mount-chestnut', {rider: true, hero: {tier: 'iron', ...host.hero}}), -JOUST.rail, 0, 1.2, Math.PI / 2), rider = player.attached?.[0];
  const foe = st.place(st.make('mount-royal'), JOUST.rail, 0, -1.2, -Math.PI / 2), goblin = st.make('creature-goblin', {variant: 'boss'});
  goblin.group.scale.setScalar(1.5 / goblin.group.userData.creature.scale); goblin.group.position.set(0, -0.19, 0); foe.pivots.rider.add(goblin.group); foe.attached = [goblin]; // rider-sized, still bigger than the hero
  const myLance = lance(player.group), foeLance = lance(foe.group);
  const marker = new Group(); foe.group.add(marker); box(marker, softMaterial('gold', C.gold), 4, 4, 1, 0, 0, 0).rotation.z = Math.PI / 4; marker.visible = false; // where the goblin is open

  return {
    group: st.group, background: st.sky,
    start: (seed = 1) => { s = startJoust(createJoust(seed)); cheer = 0; tumble = 0; },
    auto: () => autoJoust(s),
    hud: () => ({phase: s.phase, score: joustScore(s), message: s.message, left: `Pass ${Math.max(1, s.pass)} / ${JOUST.passes}`, right: `${s.playerScore} – ${s.foeScore} · lance ${['low', 'mid', 'high'][s.playerLane]}`}),
    dispose: () => { lists.dispose(); st.dispose(); },
    step: (dt, input) => {
      stepJoust(s, input, dt); clock += dt;
      for (const e of s.events) {
        if (e.type === 'swing' && rider) setState(rider, 'attack');
        if (e.type === 'message') st.pulse(marker, 0.8);
        if (e.type === 'hit') {
          if (e.value === 0) { st.burst(0, 1.3, 0.6, C.crimson, 14, 2.6); st.shake(0.5); if (rider) setState(rider, 'hit'); setState(player, 'hit'); setState(goblin, 'celebrate'); }
          else { st.burst(0, 1.4, -0.6, C.sparkle, e.value === 3 ? 26 : 12, e.value === 3 ? 3.4 : 2.4); st.shake(e.value === 3 ? 0.7 : 0.35); setState(goblin, 'hit'); cheer = e.value === 3 ? 1 : 0.6; if (e.value === 3) { setState(foe, 'hit'); tumble = 1; } }
        }
        if (e.type === 'sparkle') st.burst(0, 2, -0.6, C.gold, 22, 3);
        if (e.type === 'win') { if (rider) setState(rider, 'celebrate'); setState(player, 'celebrate'); cheer = 1.4; [-6, 0, 6].forEach((x, i) => st.burst(x, 3, -4, [C.gold, C.crimson, C.blue][i], 18, 3.4)); }
        if (e.type === 'lose') setState(goblin, 'celebrate');
      }
      player.group.position.x = s.playerX; foe.group.position.x = s.foeX;
      const running = s.phase === 'playing' && s.passT < JOUST.passLen - 0.15;
      setContinuous(player, running ? 'run' : 'idle'); setContinuous(foe, running ? 'run' : 'idle');
      myLance.rotation.x += (-(s.playerLane - 1) * 0.24 - myLance.rotation.x) * (1 - Math.exp(-dt * 12)); foeLance.rotation.x = -(s.foeOpening - 1) * 0.1;
      marker.visible = s.phase === 'playing' && s.openingShown && !s.resolved; marker.position.set(-5 * PX, JOUST.laneY[s.foeOpening] + 0.9, 9 * PX); marker.rotation.y += dt * 4;
      // a perfect strike rocks the goblin back in the saddle until the next pass starts
      if (s.passT < 0.2) tumble = 0; else tumble = Math.max(0, tumble - dt * 0.35);
      goblin.group.rotation.x = -1.0 * Math.min(1, tumble * 1.6); goblin.group.position.y = -0.19 + 0.35 * Math.sin(Math.min(1, tumble) * Math.PI);
      cheer = Math.max(0, cheer - dt * 0.45);
      for (const c of crowd) c.g.position.y = c.y + Math.abs(Math.sin(clock * (5 + cheer * 5) + c.phase)) * (0.03 + 0.3 * Math.min(1, cheer));
      const k = 1 - Math.min(1, Math.abs(s.playerX) / JOUST.rail); st.eye.set(0, 6.2 - 0.8 * k, 12.5 - 3 * k); st.look.set(0, 1 + 0.2 * k, 0); // high enough that the far rider is never hidden at impact
      st.update(dt);
    },
  };
}
