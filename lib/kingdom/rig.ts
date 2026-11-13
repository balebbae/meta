/**
 * Rigs and animation. A rig is a Group with named pivots; animators move pivots every frame from delta time.
 * Nothing here rebuilds geometry. One-shot states (jump, attack, hit, celebrate, puff, stomp) return to `rest`.
 */
import {Mesh, Group, Object3D} from 'three';
import type {AnimState, Rig, Species} from './types';

export const ONE_SHOT: Partial<Record<AnimState, number>> = {jump: 0.8, attack: 0.9, hit: 0.6, celebrate: 2.2, puff: 1.2, stomp: 1.0, flex: 1.8, wave: 1.5, poke: 0.7};

/** Damped spring (semi-implicit Euler). `omega` rad/s, `zeta` damping ratio; low zeta = jiggly. State lives in `sc`. */
export function spring(sc: Record<string, number>, key: string, target: number, dt: number, omega: number, zeta: number): number {
  const x = sc[key] ?? target, v = sc[key + 'V'] ?? 0;
  const v2 = v + (-2 * zeta * omega * v - omega * omega * (x - target)) * dt, x2 = x + v2 * dt;
  sc[key] = x2; sc[key + 'V'] = v2; return x2;
}

export function makeRig(group: Group, species: Species, pivots: Record<string, Object3D>, height: number, states: AnimState[], rest: AnimState = 'idle'): Rig {
  const rig: Rig = {group, species, pivots, height, state: rest, stateTime: 0, scratch: {}, rest, states, dispose: () => { group.removeFromParent(); group.traverse((o) => { const m = o as Mesh; if (m.isMesh) m.geometry.dispose(); }); }};
  // Nothing circular goes in userData: Object3D.clone() JSON-copies it, so a Rig reference there would throw.
  return rig;
}
export function setState(rig: Rig, state: AnimState): void { if (rig.state !== state) { rig.state = state; rig.stateTime = 0; } }

/** Critically damped-ish approach used by every animator; k is the per-second stiffness. */
function ease(rig: Rig, key: string, target: number, dt: number, k = 14): number {
  const v = rig.scratch[key] ?? target;
  const n = v + (target - v) * (1 - Math.exp(-k * dt));
  rig.scratch[key] = n;
  return n;
}
const sm = (x: number, a: number, b: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Advance one rig. `motion` is 0 under reduced motion (idle breathing and bobbing stop; one-shots still play, shorter). */
export function animate(rig: Rig, dt: number, motion = 1): void {
  rig.stateTime += dt;
  const one = ONE_SHOT[rig.state];
  if (one !== undefined && rig.stateTime > one * (motion ? 1 : 0.5)) setState(rig, rig.rest);
  const t = rig.stateTime, p = rig.pivots, s = rig.state;
  const rot = (name: string, x: number, y: number, z: number, k = 14) => { const o = p[name]; if (!o) return; o.rotation.set(ease(rig, name + 'x', x, dt, k), ease(rig, name + 'y', y, dt, k), ease(rig, name + 'z', z, dt, k)); };
  const pos = (name: string, x: number, y: number, z: number, k = 14) => { const o = p[name]; if (!o) return; const b = o.userData.base as [number, number, number] | undefined; if (!b) { o.userData.base = [o.position.x, o.position.y, o.position.z]; return; } o.position.set(b[0] + ease(rig, name + 'px', x, dt, k), b[1] + ease(rig, name + 'py', y, dt, k), b[2] + ease(rig, name + 'pz', z, dt, k)); };
  const scl = (name: string, x: number, y: number, z: number, k = 14) => { const o = p[name]; if (!o) return; o.scale.set(ease(rig, name + 'sx', x, dt, k), ease(rig, name + 'sy', y, dt, k), ease(rig, name + 'sz', z, dt, k)); };
  const clock = (rig.scratch.clock = (rig.scratch.clock ?? Math.random() * 10) + dt);
  const m = motion;

  if (rig.species === 'avatar') {
    // Soft-toy avatar: eased poses plus a squash/stretch spring on the root and a lagging head, so every move jiggles.
    const sc = rig.scratch, armRest = sc.armRest ?? 0.4, armRRest = sc.armRRest ?? 0.4;
    let bobY = 0, sqTarget = 0, lean = 0, hipX = 0, hipRz = 0, lL = 0, lR = 0, headRx = 0, headRy = 0, headRz = 0, armScale = 1, handWave = 0, twist = 0;
    const aL: [number, number, number] = [0, 0, -armRest], aR: [number, number, number] = [0, 0, armRRest];
    if (s === 'idle') { bobY = 0.012 * Math.sin(clock * 2.2) * m; headRz = 0.04 * Math.sin(clock * 0.9) * m; headRx = 0.02 * Math.sin(clock * 1.3) * m; aL[2] -= 0.05 * Math.sin(clock * 2.2) * m; aR[2] += 0.05 * Math.sin(clock * 2.2) * m; sqTarget = 0.015 * Math.sin(clock * 2.2) * m; }
    else if (s === 'walk') { const w = Math.sin(clock * 7); lL = w * 0.55; lR = -w * 0.55; aL[0] = -w * 0.35; aR[0] = w * 0.35; bobY = 0.025 * Math.abs(Math.cos(clock * 7)); sqTarget = 0.02 - 0.05 * Math.abs(Math.sin(clock * 7)); headRz = 0.05 * w; hipRz = 0.05 * w; }
    else if (s === 'run') { const w = Math.sin(clock * 11); lL = w * 0.9; lR = -w * 0.9; aL[0] = -w * 0.7; aR[0] = w * 0.7; bobY = 0.05 * Math.abs(Math.cos(clock * 11)); lean = -0.18; sqTarget = 0.03 - 0.08 * Math.abs(Math.sin(clock * 11)); headRz = 0.06 * w; }
    else if (s === 'jump') { const j = Math.sin(Math.min(1, t / 0.8) * Math.PI); bobY = 0.55 * j; aL[2] = -1.5; aR[2] = 1.5; lL = lR = 0.5 * j; sqTarget = 0.12 * j; if (!sc.jumped) { sc.jumped = 1; sc.sqV = (sc.sqV ?? 0) - 2.4; } if (t > 0.74 && !sc.landed) { sc.landed = 1; sc.sqV = (sc.sqV ?? 0) - 3; } }
    else if (s === 'attack') { const kk = sm(t, 0.05, 0.3) * (1 - sm(t, 0.55, 0.9)); aR[0] = -1.4 * kk; aR[2] = armRRest - 0.8 * kk; twist = 0.3 * kk; lean = 0.1 * kk; sqTarget = -0.05 * kk; }
    else if (s === 'hit') { const kk = sm(t, 0, 0.08) * (1 - sm(t, 0.3, 0.6)); lean = 0.35 * kk; headRx = -0.3 * kk; aL[2] = -1.1; aR[2] = 1.1; if (!sc.hitI) { sc.hitI = 1; sc.sqV = (sc.sqV ?? 0) - 2.6; } }
    else if (s === 'celebrate') { const b = Math.abs(Math.sin(t * Math.PI * 2.4)); bobY = 0.12 * b; aL[2] = -1.9; aR[2] = 1.9; headRz = 0.12 * Math.sin(t * Math.PI * 2.4); sqTarget = 0.1 * Math.sin(t * Math.PI * 4.8); hipX = 0.03 * Math.sin(t * 6); }
    else if (s === 'dance') { const beat = clock * 5.2, b = Math.abs(Math.sin(beat)), h = Math.sin(beat / 2); bobY = 0.07 * b; hipX = 0.06 * h; hipRz = -0.12 * h; headRz = 0.14 * h; headRy = 0.15 * Math.sin(beat / 2 + 1); aL[2] = -(1.4 + 0.5 * h); aR[2] = 1.4 - 0.5 * h; lL = 0.25 * h; lR = -0.25 * h; sqTarget = 0.09 * Math.sin(beat * 2); }
    else if (s === 'flex') { const kk = sm(t, 0, 0.25) * (1 - sm(t, 1.45, 1.8)); aL[2] = -(1.55 * kk + armRest * (1 - kk)); aR[2] = 1.55 * kk + armRRest * (1 - kk); armScale = 1 + 0.35 * kk; const shake = 0.04 * Math.sin(t * 45) * kk; aL[2] += shake; aR[2] -= shake; headRz = 0.15 * kk; lean = -0.06 * kk; sqTarget = 0.06 * kk; }
    else if (s === 'wave') { const kk = sm(t, 0, 0.2) * (1 - sm(t, 1.2, 1.5)); aR[2] = 1.9 * kk + armRRest * (1 - kk); handWave = 0.45 * Math.sin(t * 14) * kk; headRz = -0.1 * kk; }
    else if (s === 'poke') { if (!sc.poked) { sc.poked = 1; sc.sqV = (sc.sqV ?? 0) - 3.4; } headRz = 0.1 * Math.sin(t * 20) * (1 - t / 0.7); }
    if (s !== 'jump') { sc.jumped = 0; sc.landed = 0; } if (s !== 'hit') sc.hitI = 0; if (s !== 'poke') sc.poked = 0;
    const sq = spring(sc, 'sq', sqTarget, dt, 11, 0.28) * (m || 0.3);
    const root = p.root; if (root) root.scale.set(1 - 0.55 * sq, 1 + sq, 1 - 0.55 * sq);
    pos('root', hipX, bobY, 0, 18); rot('root', lean, twist, hipRz, 12);
    // head lag: tilt opposite to the body's motion, then spring back
    const vy = (bobY - (sc.prevBob ?? bobY)) / Math.max(dt, 1e-3), vx = (hipX - (sc.prevHip ?? hipX)) / Math.max(dt, 1e-3); sc.prevBob = bobY; sc.prevHip = hipX;
    const wobX = spring(sc, 'wobX', -vy * 0.05, dt, 16, 0.25), wobZ = spring(sc, 'wobZ', vx * 0.6, dt, 16, 0.25);
    rot('head', headRx + wobX * m, headRy, headRz + wobZ * m, 18);
    rot('armL', aL[0], aL[1], aL[2], 12); rot('armR', aR[0], aR[1], aR[2], 12);
    scl('armL', armScale, 1, armScale, 10); scl('armR', armScale, 1, armScale, 10); rot('handR', 0, 0, handWave, 20);
    rot('legL', lL, 0, 0, 14); rot('legR', lR, 0, 0, 14);
    if (p.cape) rot('cape', 0.12 + 0.08 * Math.sin(clock * 2) * m + (s === 'run' ? 0.5 : s === 'walk' || s === 'dance' ? 0.2 : 0), 0, 0, 6);
  } else if (rig.species === 'hero' || rig.species === 'goblin' || rig.species === 'cyclops' || rig.species === 'giant') {
    const heavy = rig.species === 'giant', bob = heavy ? 0.5 : 1;
    const armRest = rig.scratch.armRest ?? 0.12; // sword arm rest angle is set by the factory
    if (s === 'idle') {
      pos('root', 0, 0.012 * Math.sin(clock * 2) * m * bob, 0);
      rot('armL', 0, 0, -0.1 - 0.04 * Math.sin(clock * 2) * m); rot('armR', 0, 0, armRest + 0.04 * Math.sin(clock * 2 + 0.4) * m);
      rot('legL', 0, 0, 0); rot('legR', 0, 0, 0); rot('head', 0, 0.06 * Math.sin(clock * 0.7) * m, 0.02 * Math.sin(clock * 1.3) * m); rot('torso', 0, 0, 0);
      rot('cape', 0.05 * Math.sin(clock * 1.6) * m, 0, 0, 6);
    } else if (s === 'walk' || s === 'run') {
      const f = s === 'run' ? 11 : 7, a = s === 'run' ? 0.9 : 0.55, w = Math.sin(clock * f);
      rot('legL', w * a, 0, 0, 30); rot('legR', -w * a, 0, 0, 30);
      rot('armL', -w * a * 0.8, 0, -0.15, 30); rot('armR', w * a * 0.8, 0, armRest, 30);
      pos('root', 0, Math.abs(Math.sin(clock * f)) * (s === 'run' ? 0.06 : 0.025) * m, 0, 30);
      rot('torso', s === 'run' ? 0.18 : 0.06, 0, 0); rot('head', s === 'run' ? -0.1 : 0, 0, 0); rot('cape', s === 'run' ? 0.9 : 0.35, 0, 0, 8);
    } else if (s === 'jump') {
      const j = Math.sin(Math.min(1, t / 0.8) * Math.PI);
      pos('root', 0, 0.55 * j, 0, 40); rot('legL', -0.5 * j, 0, 0, 30); rot('legR', 0.3 * j, 0, 0, 30); rot('armL', 0, 0, -1.6 * j, 30); rot('armR', 0, 0, 1.6 * j, 30);
      scl('root', 1 - 0.1 * Math.sin(t * 20) * (1 - j), 1 + 0.1 * Math.sin(t * 20) * (1 - j), 1 - 0.1 * Math.sin(t * 20) * (1 - j), 40);
    } else if (s === 'attack') {
      const wind = sm(t, 0, 0.3), swing = sm(t, 0.3, 0.5);
      rot('armR', lerp(0, -1.0, swing), 0, lerp(armRest, 2.8, wind) - 2.5 * swing, 40);
      rot('torso', 0, lerp(-0.45, 0.5, swing), 0, 30); rot('head', 0, lerp(0.2, -0.3, swing), 0, 30);
      rot('legL', 0.35 * swing, 0, 0, 30); rot('legR', -0.35 * swing, 0, 0, 30); pos('root', 0, 0.1 * swing * (1 - sm(t, 0.6, 0.9)), 0, 40);
    } else if (s === 'hit') {
      const k = 1 - sm(t, 0, 0.6);
      pos('root', 0.08 * Math.sin(t * 60) * k, 0, -0.1 * k, 40); rot('torso', -0.3 * k, 0, 0, 30); rot('head', -0.35 * k, 0, 0.2 * k, 30); rot('armL', 0, 0, -0.9 * k, 30); rot('armR', 0, 0, 0.9 * k, 30);
    } else if (s === 'celebrate') {
      const j = Math.abs(Math.sin(t * 6.5)), on = 1 - sm(t, 1.8, 2.2);
      pos('root', 0, 0.3 * j * on, 0, 40); rot('armL', 0, 0, -2.7 * on, 30); rot('armR', 0, 0, 2.7 * on, 30); rot('head', -0.15 * on, 0, 0.1 * Math.sin(t * 6.5) * on, 30); rot('legL', 0.3 * j * on, 0, 0, 30); rot('legR', -0.3 * j * on, 0, 0, 30);
    } else if (s === 'stomp') {
      const up = sm(t, 0, 0.35), down = sm(t, 0.35, 0.5), shake = (1 - sm(t, 0.5, 1.0)) * sm(t, 0.45, 0.5);
      rot('legR', -1.1 * up * (1 - down), 0, 0, 30); pos('root', 0.03 * Math.sin(t * 50) * shake, 0.12 * up * (1 - down), 0, 40); rot('armL', 0, 0, -1.2 * up, 30); rot('armR', 0, 0, 1.2 * up, 30); rot('torso', 0.2 * up * (1 - down), 0, 0, 30);
    }
  } else if (rig.species === 'slime') {
    if (s === 'idle') { const b = 1 + 0.06 * Math.sin(clock * 2.4) * m; scl('root', 1 / Math.sqrt(b), b, 1 / Math.sqrt(b)); rot('root', 0, 0.1 * Math.sin(clock * 0.8) * m, 0.04 * Math.sin(clock * 1.1) * m); }
    else if (s === 'walk' || s === 'run') { const f = s === 'run' ? 7 : 4.5, j = Math.abs(Math.sin(clock * f)); pos('root', 0, 0.18 * j, 0, 30); const b = 1 + 0.18 * (1 - j) - 0.1 * j; scl('root', 1 / Math.sqrt(b), b, 1 / Math.sqrt(b), 30); }
    else if (s === 'squash' || s === 'jump') { const k = Math.sin(Math.min(1, t / 0.8) * Math.PI); const b = t < 0.25 ? 1 - 0.35 * sm(t, 0, 0.25) : 1 + 0.35 * k; scl('root', 1 / Math.sqrt(b), b, 1 / Math.sqrt(b), 40); pos('root', 0, 0.5 * k * sm(t, 0.2, 0.4), 0, 40); }
    else if (s === 'attack') { const k = sm(t, 0.2, 0.45) * (1 - sm(t, 0.6, 0.9)); pos('root', 0, 0, 0.35 * k, 40); scl('root', 1 + 0.15 * k, 1 - 0.1 * k, 1 + 0.25 * k, 40); }
    else if (s === 'hit') { const k = 1 - sm(t, 0, 0.6); scl('root', 1 + 0.3 * k, 1 - 0.35 * k, 1 + 0.3 * k, 40); pos('root', 0.05 * Math.sin(t * 50) * k, 0, 0, 40); }
    else if (s === 'celebrate') { const j = Math.abs(Math.sin(t * 7)); pos('root', 0, 0.3 * j, 0, 40); rot('root', 0, t * 4, 0, 40); }
  } else if (rig.species === 'dragon') {
    const flapBase = s === 'flap' || s === 'run' ? 0.7 : 0.3, flapF = s === 'flap' || s === 'run' ? 7 : 3.2;
    const flap = Math.sin(clock * flapF) * flapBase * m;
    rot('wingL', 0, 0, 0.3 + flap, 30); rot('wingR', 0, 0, -0.3 - flap, 30);
    if (s === 'idle') { pos('root', 0, 0.04 * Math.sin(clock * 1.5) * m, 0); rot('head', 0.05 * Math.sin(clock * 0.9) * m, 0.1 * Math.sin(clock * 0.6) * m, 0); rot('tail', 0, 0.2 * Math.sin(clock * 1.8) * m, 0); rot('root', 0, 0, 0); }
    else if (s === 'walk') { const w = Math.sin(clock * 6); rot('legL', w * 0.5, 0, 0, 30); rot('legR', -w * 0.5, 0, 0, 30); pos('root', 0, 0.02 * Math.abs(w), 0, 30); rot('tail', 0, 0.3 * w, 0, 20); }
    else if (s === 'run' || s === 'flap') { pos('root', 0, 0.25 + 0.08 * Math.sin(clock * flapF) * m, 0, 20); rot('legL', 0.5, 0, 0, 20); rot('legR', 0.5, 0, 0, 20); rot('root', -0.15, 0, 0, 20); rot('tail', 0.3, 0.15 * Math.sin(clock * 2), 0, 20); }
    else if (s === 'jump') { const j = Math.sin(Math.min(1, t / 0.8) * Math.PI); pos('root', 0, 0.6 * j, 0, 40); rot('legL', 0.6 * j, 0, 0, 30); rot('legR', 0.6 * j, 0, 0, 30); }
    else if (s === 'puff' || s === 'attack') { const k = sm(t, 0.1, 0.3) * (1 - sm(t, 0.8, 1.1)); rot('head', -0.35 * k, 0, 0, 30); rot('root', 0.08 * k, 0, 0, 30); scl('flame', 0.01 + k * (1 + 0.3 * Math.sin(t * 25)), 0.01 + k, 0.01 + k * (1 + 0.3 * Math.sin(t * 25)), 60); pos('root', 0, 0.05 * k, -0.08 * k, 30); }
    else if (s === 'hit') { const k = 1 - sm(t, 0, 0.6); pos('root', 0.06 * Math.sin(t * 60) * k, 0, -0.12 * k, 40); rot('head', 0.3 * k, 0, 0.2 * k, 30); rot('wingL', 0, 0, 1.2 * k, 30); rot('wingR', 0, 0, -1.2 * k, 30); }
    else if (s === 'celebrate') { const j = Math.abs(Math.sin(t * 6)); pos('root', 0, 0.35 * j, 0, 40); rot('head', -0.3, 0.3 * Math.sin(t * 6), 0, 30); rot('wingL', 0, 0, 0.5 + 0.9 * j, 40); rot('wingR', 0, 0, -0.5 - 0.9 * j, 40); }
    if (s !== 'puff' && s !== 'attack') scl('flame', 0.01, 0.01, 0.01, 20);
  } else if (rig.species === 'pony') {
    if (s === 'idle') { pos('root', 0, 0.01 * Math.sin(clock * 1.6) * m, 0); rot('head', 0.08 * Math.sin(clock * 1.2) * m, 0.08 * Math.sin(clock * 0.5) * m, 0); rot('tail', 0, 0.3 * Math.sin(clock * 2.2) * m, 0); for (const l of ['legFL', 'legFR', 'legBL', 'legBR']) rot(l, 0, 0, 0); }
    else if (s === 'walk' || s === 'trot' || s === 'run') { const f = s === 'run' ? 12 : s === 'trot' ? 9 : 5.5, a = s === 'run' ? 0.8 : 0.5, w = Math.sin(clock * f); rot('legFL', w * a, 0, 0, 30); rot('legBR', w * a, 0, 0, 30); rot('legFR', -w * a, 0, 0, 30); rot('legBL', -w * a, 0, 0, 30); pos('root', 0, Math.abs(w) * (s === 'run' ? 0.07 : 0.035) * m, 0, 30); rot('head', -0.15 + 0.08 * w, 0, 0, 20); rot('tail', 0.4, 0.3 * w, 0, 20); }
    else if (s === 'jump') { const j = Math.sin(Math.min(1, t / 0.8) * Math.PI); pos('root', 0, 0.5 * j, 0, 40); rot('legFL', -0.8 * j, 0, 0, 30); rot('legFR', -0.8 * j, 0, 0, 30); rot('legBL', 0.6 * j, 0, 0, 30); rot('legBR', 0.6 * j, 0, 0, 30); rot('root', -0.2 * j, 0, 0, 30); }
    else if (s === 'attack') { const k = sm(t, 0.1, 0.35) * (1 - sm(t, 0.6, 0.9)); rot('root', -0.5 * k, 0, 0, 30); rot('legFL', -1.2 * k, 0, 0, 30); rot('legFR', -1.4 * k, 0, 0, 30); pos('root', 0, 0.15 * k, 0, 30); }
    else if (s === 'hit') { const k = 1 - sm(t, 0, 0.6); pos('root', 0.05 * Math.sin(t * 60) * k, 0, -0.1 * k, 40); rot('head', 0.4 * k, 0.2 * k, 0, 30); }
    else if (s === 'celebrate') { const j = Math.abs(Math.sin(t * 6)); pos('root', 0, 0.25 * j, 0, 40); rot('head', -0.3 * j, 0.3 * Math.sin(t * 6), 0, 30); rot('tail', 0.5, 0.5 * Math.sin(t * 12), 0, 30); }
  }
  if (p.eyeL || p.eye) { // every soft character blinks
    const sc = rig.scratch; sc.blinkT = (sc.blinkT ?? 2 + Math.random() * 3) - dt; const blink = sc.blinkT < 0.13 ? 0.1 : 1; if (sc.blinkT < 0) sc.blinkT = 2.5 + Math.random() * 3.5;
    scl('eyeL', 1, blink, 1, 40); scl('eyeR', 1, blink, 1, 40); scl('eye', 1, blink, 1, 40);
  }
  if (rig.species === 'prop') {
    // props only animate explicit pivots: 'lid' (chest), 'flag' (banners), 'bridge' (drawbridge)
    if (p.lid) rot('lid', s === 'celebrate' ? -1.9 : 0, 0, 0, 8);
    if (p.flag) rot('flag', 0, 0.25 * Math.sin(clock * 4) * m, 0, 30);
    if (p.bridge) rot('bridge', s === 'celebrate' ? 0 : -1.45, 0, 0, 6);
  }
}
