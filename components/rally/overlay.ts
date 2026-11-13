/**
 * Mirror Match overlay, in the Kingdom look: the Reel's target pose is a glowing "ghost knight" (royal blue, gold
 * crown) standing on a rune circle, anchored to the player's hips and scaled to their body so they can step into it.
 * Joints the player already has right light up green; holding the pose fills a gold ring round the crown, and a
 * match turns the knight gold with a burst of sparkles. The player is a thin white skeleton.
 *
 * Pose updates arrive ~8 times a second; a requestAnimationFrame loop eases between them so it moves smoothly.
 * The canvas is CSS-mirrored like the camera preview, so the target is flipped here to appear the same way round
 * as in the Reel. One overlay runs at a time (module state).
 */
import {BONES, JOINT_POINTS, type PointFrame} from '@/lib/rally/mirror';
import {C} from '@/lib/kingdom/palette';

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const BLUE = hex(C.blue);
const BLUE_LIGHT = hex(C.blueLight);
const GOLD = hex(C.gold);
const GOLD_DARK = hex(C.goldDark);
const SPARKLE = hex(C.sparkle);
const GREEN = hex(C.moss);
const WHITE = '#ffffff';

type Frame = {target: PointFrame; aspect: number; user: PointFrame; hits: (boolean | null)[] | null; matched: boolean; holdSince: number; holdMs: number};
type Spark = {x: number; y: number; vx: number; vy: number; born: number; size: number; spin: number};

const frame: Frame = {target: null, aspect: 9 / 16, user: null, hits: null, matched: false, holdSince: 0, holdMs: 700};
let shown: number[] | null = null; // eased player points, in canvas pixels
let scale = 0;
let sparks: Spark[] = [];
let lastPlaced: number[] | null = null;
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** New pose data from the tracker (any subset). */
export function setOverlay(f: Partial<Frame>) {
  Object.assign(frame, f);
}

/** Next step: forget easing so the new target doesn't slide in from the old one. */
export function resetOverlay() {
  scale = 0;
  lastPlaced = null;
  frame.holdSince = 0;
  frame.matched = false;
  frame.hits = null;
}

/** Gold sparkles from the knight's chest: call when a pose is matched. */
export function burstOverlay() {
  if (!lastPlaced || reduced()) return;
  const [x, y] = mid(lastPlaced, 1, 2);
  const s = sizeOf(lastPlaced);
  const now = performance.now();
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + Math.random() * 0.3;
    const v = s * (0.025 + Math.random() * 0.035);
    sparks.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - s * 0.02, born: now, size: s * (0.05 + Math.random() * 0.06), spin: Math.random() * Math.PI});
  }
}

/** Starts drawing on the canvas every frame; returns stop. */
export function startOverlay(c: HTMLCanvasElement, v: HTMLVideoElement): () => void {
  let raf = 0;
  const tick = (now: number) => {
    draw(c, v, now);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    Object.assign(frame, {target: null, user: null, hits: null, matched: false, holdSince: 0});
    shown = null;
    sparks = [];
    resetOverlay();
    c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
  };
}

// ---------- geometry ----------

const mid = (p: number[], a: number, b: number) => [(p[a * 2] + p[b * 2]) / 2, (p[a * 2 + 1] + p[b * 2 + 1]) / 2];
const dist = (p: number[], a: number, b: number) => Math.hypot(p[a * 2] - p[b * 2], p[a * 2 + 1] - p[b * 2 + 1]);
/** A body size that stays steady when bending: the longest of a few segments. */
function sizeOf(p: number[]) {
  const [x, y] = mid(p, 7, 8);
  const [sx, sy] = mid(p, 1, 2);
  return Math.max(Math.hypot(sx - x, sy - y), dist(p, 1, 2) * 1.3, dist(p, 7, 9) * 1.1, dist(p, 8, 10) * 1.1, 1e-3);
}
const pt = (p: number[], i: number): [number, number] => [p[i * 2], p[i * 2 + 1]];

// ---------- drawing ----------

function draw(c: HTMLCanvasElement, v: HTMLVideoElement, now: number) {
  const W = v.videoWidth;
  const H = v.videoHeight;
  const g = c.getContext('2d');
  if (!W || !H || !g) return;
  if (c.width !== W) c.width = W;
  if (c.height !== H) c.height = H;
  g.clearRect(0, 0, W, H);

  // ease the player's points toward the latest pose
  const raw = frame.user ? frame.user.map((n, i) => (i % 2 ? n * H : n * W)) : null;
  if (!raw) shown = null;
  else if (!shown) shown = raw;
  else shown = shown.map((n, i) => n + (raw[i] - n) * 0.35);

  if (frame.target) {
    // Reel points in units of its height, so its aspect ratio is kept
    const t = frame.target.map((n, i) => (i % 2 ? n : n * frame.aspect));
    const [tx, ty] = mid(t, 7, 8);
    const ts = sizeOf(t);
    const [ux, uy] = shown ? mid(shown, 7, 8) : [W / 2, H * 0.6];
    const us = shown ? sizeOf(shown) : H * 0.22;
    scale = scale ? scale * 0.85 + (us / ts) * 0.15 : us / ts;
    const placed = t.map((n, i) => (i % 2 ? uy + (n - ty) * scale : ux - (n - tx) * scale));
    lastPlaced = placed;
    knight(g, placed, now);
  }
  if (shown) player(g, shown, H);
  drawSparks(g, now);
}

/** The target: rune circle, glowing limbs and torso, helmet and crown, joint gems, hold ring. */
function knight(g: CanvasRenderingContext2D, p: number[], now: number) {
  const s = sizeOf(p);
  const matched = frame.matched;
  const main = matched ? GOLD : BLUE;
  const light = matched ? SPARKLE : BLUE_LIGHT;
  const limb = Math.max(6, s * 0.17);
  const calm = reduced();
  const pulse = calm ? 1 : 0.85 + 0.15 * Math.sin(now / 260);

  // rune circle under the feet
  const [fx] = mid(p, 11, 12);
  const fy = Math.max(p[11 * 2 + 1], p[12 * 2 + 1]) + limb * 0.4;
  g.save();
  g.globalAlpha = 0.75;
  g.strokeStyle = matched ? GOLD : GOLD_DARK;
  g.lineWidth = Math.max(2, s * 0.025);
  g.setLineDash([s * 0.09, s * 0.06]);
  g.lineDashOffset = calm ? 0 : -now / 30;
  g.beginPath();
  g.ellipse(fx, fy, s * 0.95, s * 0.2, 0, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);
  g.globalAlpha = 0.18;
  g.fillStyle = main;
  g.fill();
  g.restore();

  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.shadowColor = main;
  g.shadowBlur = s * 0.35 * pulse;

  // torso: shoulders to hips
  const [ls, rs, rh, lh] = [pt(p, 1), pt(p, 2), pt(p, 8), pt(p, 7)];
  g.globalAlpha = 0.3;
  g.fillStyle = main;
  g.beginPath();
  g.moveTo(...ls);
  g.lineTo(...rs);
  g.lineTo(...rh);
  g.lineTo(...lh);
  g.closePath();
  g.fill();

  // limbs: a wide glow, then a light core
  g.globalAlpha = 0.55;
  g.strokeStyle = main;
  g.lineWidth = limb;
  bones(g, p);
  g.shadowBlur = 0;
  g.globalAlpha = 0.85;
  g.strokeStyle = light;
  g.lineWidth = limb * 0.32;
  bones(g, p);

  // armour: gold belt across the hips, round gold plates on the shoulders
  g.globalAlpha = 0.95;
  g.strokeStyle = matched ? SPARKLE : GOLD;
  g.lineWidth = limb * 0.4;
  g.beginPath();
  g.moveTo(...lh);
  g.lineTo(...rh);
  g.stroke();
  for (const [x, y] of [ls, rs]) {
    g.fillStyle = matched ? GOLD : GOLD_DARK;
    g.beginPath();
    g.arc(x, y, limb * 0.75, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = matched ? SPARKLE : GOLD;
    g.beginPath();
    g.arc(x, y, limb * 0.42, 0, Math.PI * 2);
    g.fill();
  }

  // helmet: above the nose, sized to the shoulders
  const [hx, hy0] = pt(p, 0);
  const r = Math.max(limb * 1.1, dist(p, 1, 2) * 0.42);
  const hy = hy0 - r * 0.15;
  g.globalAlpha = 0.45;
  g.fillStyle = main;
  g.shadowBlur = s * 0.3 * pulse;
  g.beginPath();
  g.arc(hx, hy, r, 0, Math.PI * 2);
  g.fill();
  g.shadowBlur = 0;
  g.globalAlpha = 0.9;
  g.strokeStyle = light;
  g.lineWidth = limb * 0.28;
  g.stroke();
  // visor slit
  g.beginPath();
  g.moveTo(hx - r * 0.5, hy);
  g.lineTo(hx + r * 0.5, hy);
  g.stroke();

  // crown: dim gold until matched
  crown(g, hx, hy - r * 0.9, r * 1.5, matched);

  // hold ring round the helmet
  if (frame.holdSince) {
    const k = Math.min(1, (performance.now() - frame.holdSince) / frame.holdMs);
    g.globalAlpha = 1;
    g.strokeStyle = GOLD;
    g.lineWidth = Math.max(3, limb * 0.35);
    g.shadowColor = GOLD;
    g.shadowBlur = s * 0.2;
    g.beginPath();
    g.arc(hx, hy, r * 1.45, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
    g.stroke();
    g.shadowBlur = 0;
  }

  // joint gems: green where the player already matches
  const hits = frame.hits;
  if (hits && !matched) {
    hits.forEach((ok, i) => {
      if (ok == null) return;
      const [x, y] = pt(p, JOINT_POINTS[i]);
      gem(g, x, y, limb * (ok ? 0.55 : 0.4), ok ? GREEN : WHITE, ok ? 1 : 0.6);
    });
  }
  g.restore();
}

function bones(g: CanvasRenderingContext2D, p: number[]) {
  g.beginPath();
  for (const [a, b] of BONES) {
    g.moveTo(...pt(p, a));
    g.lineTo(...pt(p, b));
  }
  g.stroke();
}

function crown(g: CanvasRenderingContext2D, cx: number, base: number, w: number, lit: boolean) {
  const h = w * 0.55;
  const x0 = cx - w / 2;
  g.save();
  g.globalAlpha = lit ? 1 : 0.6;
  g.fillStyle = lit ? GOLD : GOLD_DARK;
  if (lit) {
    g.shadowColor = SPARKLE;
    g.shadowBlur = w * 0.6;
  }
  g.beginPath();
  g.moveTo(x0, base);
  g.lineTo(x0, base - h * 0.55);
  g.lineTo(x0 + w * 0.25, base - h * 0.25);
  g.lineTo(cx, base - h);
  g.lineTo(x0 + w * 0.75, base - h * 0.25);
  g.lineTo(x0 + w, base - h * 0.55);
  g.lineTo(x0 + w, base);
  g.closePath();
  g.fill();
  g.shadowBlur = 0;
  g.fillStyle = lit ? SPARKLE : GOLD;
  for (const [x, y] of [[x0, base - h * 0.55], [cx, base - h], [x0 + w, base - h * 0.55]] as const) {
    g.beginPath();
    g.arc(x, y, w * 0.07, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

function gem(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = color;
  g.strokeStyle = WHITE;
  g.lineWidth = Math.max(1.5, r * 0.25);
  g.shadowColor = color;
  g.shadowBlur = r * 1.5;
  g.beginPath();
  g.moveTo(x, y - r);
  g.lineTo(x + r * 0.75, y);
  g.lineTo(x, y + r);
  g.lineTo(x - r * 0.75, y);
  g.closePath();
  g.fill();
  g.shadowBlur = 0;
  g.stroke();
  g.restore();
}

/** The player: a thin white skeleton so the knight stays the focus. */
function player(g: CanvasRenderingContext2D, p: number[], H: number) {
  const w = Math.max(2, H / 200);
  g.save();
  g.globalAlpha = 0.8;
  g.strokeStyle = WHITE;
  g.fillStyle = WHITE;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.shadowColor = 'rgba(0,0,0,0.5)';
  g.shadowBlur = w * 2;
  bones(g, p);
  for (let i = 1; i < p.length / 2; i++) {
    g.beginPath();
    g.arc(p[i * 2], p[i * 2 + 1], w * 1.3, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

function drawSparks(g: CanvasRenderingContext2D, now: number) {
  if (!sparks.length) return;
  const LIFE = 800;
  sparks = sparks.filter(k => now - k.born < LIFE);
  g.save();
  g.fillStyle = SPARKLE;
  g.shadowColor = GOLD;
  for (const k of sparks) {
    const t = (now - k.born) / 16;
    const x = k.x + k.vx * t;
    const y = k.y + k.vy * t + 0.004 * k.size * t * t; // a little gravity
    const life = 1 - (now - k.born) / LIFE;
    g.globalAlpha = life;
    g.shadowBlur = k.size;
    star(g, x, y, k.size * (0.6 + life * 0.4), k.spin + t * 0.05);
  }
  g.restore();
}

/** Four-point sparkle. */
function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * Math.PI) / 4;
    const rr = i % 2 ? r * 0.3 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}
