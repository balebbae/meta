/**
 * Mirror Match overlay: the Reel's target pose drawn over the camera, anchored to the player's hips and scaled to
 * their body, so they can step into it. The canvas is mirrored like the camera preview, so the target is flipped
 * here to appear the same way round as in the Reel.
 */
import {BONES, type PointFrame} from '@/lib/rally/mirror';

type Anchor = {x: number; y: number; size: number};
const mid = (p: number[], a: number, b: number) => [(p[a * 2] + p[b * 2]) / 2, (p[a * 2 + 1] + p[b * 2 + 1]) / 2];
const dist = (p: number[], a: number, b: number) => Math.hypot(p[a * 2] - p[b * 2], p[a * 2 + 1] - p[b * 2 + 1]);

/** Hip centre + a body size that stays steady when bending (the longest of a few segments). */
function anchor(p: number[]): Anchor {
  const [x, y] = mid(p, 7, 8);
  const [sx, sy] = mid(p, 1, 2);
  const size = Math.max(Math.hypot(sx - x, sy - y), dist(p, 1, 2) * 1.3, dist(p, 7, 9) * 1.1, dist(p, 8, 10) * 1.1, 1e-3);
  return {x, y, size};
}

function skeleton(g: CanvasRenderingContext2D, p: number[], color: string, width: number) {
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = width;
  g.lineCap = 'round';
  for (const [a, b] of BONES) {
    g.beginPath();
    g.moveTo(p[a * 2], p[a * 2 + 1]);
    g.lineTo(p[b * 2], p[b * 2 + 1]);
    g.stroke();
  }
  for (let i = 1; i < p.length / 2; i++) {
    g.beginPath();
    g.arc(p[i * 2], p[i * 2 + 1], width * 0.7, 0, Math.PI * 2);
    g.fill();
  }
  const [hx, hy] = [p[0], p[1]];
  g.beginPath();
  g.arc(hx, hy, width * 1.6, 0, Math.PI * 2);
  g.stroke();
}

const token = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/** Smoothed scale between frames so the overlay doesn't jitter. */
let lastScale = 0;
export const resetOverlay = () => (lastScale = 0);

export function drawOverlay(c: HTMLCanvasElement, v: HTMLVideoElement, target: PointFrame, aspect: number, user: PointFrame, matched: boolean) {
  const W = v.videoWidth;
  const H = v.videoHeight;
  const g = c.getContext('2d');
  if (!W || !H || !g) return;
  if (c.width !== W) c.width = W;
  if (c.height !== H) c.height = H;
  g.clearRect(0, 0, W, H);
  const me = user ? user.map((n, i) => (i % 2 ? n * H : n * W)) : null;
  if (me) skeleton(g, me, token('--fb-on-media', 'white'), Math.max(2, H / 160));
  if (!target) return;
  // Reel points in units of its height, so its aspect ratio is kept
  const t = target.map((n, i) => (i % 2 ? n : n * aspect));
  const ta = anchor(t);
  const ua = me ? anchor(me) : {x: W / 2, y: H * 0.6, size: H * 0.22};
  const scale = ua.size / ta.size;
  lastScale = lastScale ? lastScale * 0.8 + scale * 0.2 : scale;
  const placed = t.map((n, i) => (i % 2 ? ua.y + (n - ta.y) * lastScale : ua.x - (n - ta.x) * lastScale));
  g.globalAlpha = 0.85;
  skeleton(g, placed, matched ? token('--fb-green', 'lime') : token('--fb-blue', 'dodgerblue'), Math.max(4, H / 70));
  g.globalAlpha = 1;
}
