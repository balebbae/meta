/**
 * Which exercise does a clip show? TS port of repcount/repcount/classify.py (same signals, clip stats, scaler,
 * logistic regression, thresholds and abstain rules), run on the phone over the MediaPipe landmarks the clip flow
 * already extracts. The JSON is the model. Pure; tests in pose-classify.test.ts (incl. the JSON's selftest vector).
 */
import clf from '../../repcount/model/exercise_clf.json' with {type: 'json'};
import type {PoseVerdict} from './proof-fusion.ts';
import {angle, fill, joint, percentile, side, smooth, type Landmark} from './repcount.ts';

// shortcut: coefficients are fitted on UCF101 (non-commercial research licence, see the JSON's "licence"), refit on own/CC clips before shipping in a product.
const MODEL = clf;
const TH = MODEL.thresholds;
const [F_LO, F_HI] = MODEL.preprocessing.freq_band_hz;
const NFFT = MODEL.preprocessing.nfft;
const SMOOTH_S = MODEL.preprocessing.smooth_s;
const DYNAMIC = ['elbow', 'knee', 'hip', 'arms_up', 'abduction', 'hip_height', 'feet_apart', 'ankle_spread'] as const;
const STATIC = ['torso_tilt', 'knee_gap'] as const;
const HORIZONTAL = new Set(['push_up', 'sit_up']);
const UPRIGHT = new Set(['squat', 'lunge', 'jumping_jack']);
const REP_SIGNAL = MODEL.rep_signal as Record<string, keyof typeof MODEL.min_rep_range>;

/** Exercises the model was trained on (sit-ups aren't yet), so fusion never trusts it for the others. */
export const POSE_SUPPORTED: string[] = MODEL.classes.filter(c => c !== 'none');

type Sig = number | null;
type Signals = Record<(typeof DYNAMIC)[number] | (typeof STATIC)[number], Sig[]> & {valid: boolean[]; coreVis: Sig[]};

const CORE = [11, 12, 23, 24];
const vis = (p: Landmark) => p.visibility ?? 1;
const fin = (x: Sig[]) => x.filter((v): v is number => v != null && Number.isFinite(v));
const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
const std = (x: number[]) => {
  const m = mean(x);
  return Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / x.length);
};
const range = (x: Sig[]) => {
  const f = fin(x);
  return f.length ? percentile(f, 95) - percentile(f, 5) : 0;
};
const torsoLen = (lens: number[]) => Math.max(lens.length ? percentile(lens, 50) : 1, 1e-3);

/** Per-frame signals (features.features() + classify.signals()); invalid frames (no pose, core joints < 0.5 visible) are null. */
function signals(frames: (Landmark[] | null)[]): Signals {
  const ok = frames.map(f => (f && f.length >= 33 && Math.max(...CORE.map(i => vis(f[i]))) >= 0.5 ? f : null));
  const valid = ok.filter((f): f is Landmark[] => f != null);
  // torso length per clip (median): visibility-weighted points for arms_up/feet_apart, plain midpoints for hip_height/ankle_spread
  const lenW = torsoLen(valid.map(f => Math.hypot(side(f, 23, 24).x - side(f, 11, 12).x, side(f, 23, 24).y - side(f, 11, 12).y)));
  const lenM = torsoLen(valid.map(f => Math.hypot((f[23].x + f[24].x - f[11].x - f[12].x) / 2, (f[23].y + f[24].y - f[11].y - f[12].y) / 2)));
  const per = (fn: (f: Landmark[]) => number) => ok.map(f => (f ? fn(f) : null));
  return {
    elbow: per(f => joint(f, [11, 12], [13, 14], [15, 16])),
    knee: per(f => joint(f, [23, 24], [25, 26], [27, 28])),
    hip: per(f => joint(f, [11, 12], [23, 24], [25, 26])),
    abduction: per(f => joint(f, [23, 24], [11, 12], [13, 14])),
    torso_tilt: per(f => {
      const sh = side(f, 11, 12), hp = side(f, 23, 24);
      return (Math.atan2(Math.abs(hp.x - sh.x), Math.abs(hp.y - sh.y) + 1e-9) * 180) / Math.PI;
    }),
    arms_up: per(f => (side(f, 11, 12).y - (f[15].y + f[16].y) / 2) / lenW),
    feet_apart: per(f => Math.abs(f[27].x - f[28].x) / lenW),
    knee_gap: per(f => Math.abs(angle(f[23], f[25], f[27]) - angle(f[24], f[26], f[28]))),
    hip_height: per(f => -((f[23].y + f[24].y) / 2) / lenM),
    ankle_spread: per(f => Math.hypot(f[27].x - f[28].x, f[27].y - f[28].y) / lenM),
    valid: ok.map(f => f != null),
    coreVis: per(f => mean(CORE.map(i => vis(f[i])))),
  };
}

/** [dominant Hz within the band, share of in-band power within ±1 bin of it], like classify.spectrum_peak (np.fft.rfft). */
export function spectrumPeak(x: Sig[], fps: number): [number, number] {
  if (fin(x).length < 8) return [0, 0];
  const s = smooth(fill(x) as number[], fps, SMOOTH_S);
  const m = mean(s), T = s.length, n = Math.max(NFFT, T);
  const w = s.map((v, t) => (v - m) * (T > 1 ? 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / (T - 1)) : 1));
  const step = 1 / (n * (1 / fps)); // as np.fft.rfftfreq
  const pb: number[] = [], fb: number[] = [];
  // plain DFT over the in-band bins only: a few hundred bins, cheaper than a full FFT of any length
  for (let k = 0; k <= n >> 1; k++) {
    const fr = k * step;
    if (fr < F_LO || fr > F_HI) continue;
    let re = 0, im = 0;
    for (let t = 0; t < T; t++) {
      const a = (2 * Math.PI * ((k * t) % n)) / n;
      re += w[t] * Math.cos(a);
      im -= w[t] * Math.sin(a);
    }
    pb.push(re * re + im * im);
    fb.push(fr);
  }
  const total = pb.reduce((a, b) => a + b, 0);
  if (!pb.length || total <= 1e-12) return [0, 0];
  const i = pb.indexOf(Math.max(...pb));
  return [fb[i], pb.slice(Math.max(0, i - 1), i + 2).reduce((a, b) => a + b, 0) / total];
}

function corr(a: Sig[], b: Sig[]): number {
  const idx = a.flatMap((v, i) => (v != null && Number.isFinite(v) && b[i] != null && Number.isFinite(b[i]) ? [i] : []));
  if (idx.length < 8) return 0;
  const x = idx.map(i => a[i] as number), y = idx.map(i => b[i] as number);
  const sx = std(x), sy = std(y);
  if (sx < 1e-9 || sy < 1e-9) return 0;
  const mx = mean(x), my = mean(y);
  return idx.reduce((s, _, j) => s + (x[j] - mx) * (y[j] - my), 0) / idx.length / (sx * sy);
}

/** Feature vector in the JSON's `features` order (NaN-free), plus the per-frame signals. */
export function clipFeatures(frames: (Landmark[] | null)[], fps: number): {x: number[]; s: Signals} {
  const s = signals(frames);
  const out: number[] = [];
  const stats = (x: Sig[], periodic: boolean) => {
    const f = fin(x);
    if (!f.length) return out.push(...Array(periodic ? 5 : 3).fill(0));
    out.push(mean(f), std(f), percentile(f, 95) - percentile(f, 5));
    if (periodic) out.push(...spectrumPeak(x, fps));
  };
  DYNAMIC.forEach(k => stats(s[k], true));
  STATIC.forEach(k => stats(s[k], false));
  const cv = fin(s.coreVis);
  out.push(corr(s.arms_up, s.feet_apart), corr(s.knee, s.hip), s.valid.length ? s.valid.filter(Boolean).length / s.valid.length : 0, cv.length ? mean(cv) : 0);
  return {x: out.map(v => (Number.isFinite(v) ? v : 0)), s};
}

export function predictProba(x: number[]): number[] {
  const {mean: mu, scale, coef, intercept} = MODEL.model;
  const z = x.map((v, i) => (v - mu[i]) / scale[i]);
  const logits = coef.map((row, c) => row.reduce((s, w, i) => s + w * z[i], intercept[c]));
  const top = Math.max(...logits);
  const e = logits.map(l => Math.exp(l - top));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map(v => v / sum);
}

/** Clip verdict (classify.classify without the rep count: the clip flow's countReps supplies reps). */
export function classifyPose(frames: (Landmark[] | null)[], fps: number): PoseVerdict & {abstain_reasons: string[]} {
  const {x, s} = clipFeatures(frames, fps);
  const names: string[] = MODEL.features;
  const validFrac = x[names.indexOf('valid_frac')];
  const nValid = s.valid.filter(Boolean).length;
  const tilt = fin(s.torso_tilt);
  const tiltMed = tilt.length ? percentile(tilt, 50) : NaN;
  const personFound = validFrac >= TH.min_valid_frac && nValid >= TH.min_valid_frames;

  const p = predictProba(x);
  const best = p.indexOf(Math.max(...p));
  const label = MODEL.classes[best];
  const conf = p[best];
  const reasons: string[] = [];
  if (!personFound) reasons.push('no_person');
  if (frames.length / Math.max(fps, 1e-6) < TH.min_clip_s) reasons.push('short_clip');
  if (conf < TH.min_confidence) reasons.push('low_confidence');
  if (Number.isFinite(tiltMed)) {
    if (HORIZONTAL.has(label) && tiltMed < TH.horizontal_min_tilt) reasons.push('posture_conflict');
    if (UPRIGHT.has(label) && tiltMed > TH.upright_max_tilt) reasons.push('posture_conflict');
  }
  const sig = REP_SIGNAL[label];
  if (sig && range(s[sig]) < MODEL.min_rep_range[sig]) reasons.push('low_motion');
  // sit-ups aren't in the training data yet: a horizontal body folding at the hip more than the elbow might be one
  if (!MODEL.classes.includes('sit_up') && personFound && Number.isFinite(tiltMed) && tiltMed > TH.horizontal_min_tilt && range(s.hip) > Math.max(MODEL.min_rep_range.hip, range(s.elbow))) {
    reasons.push('possible_sit_up_unmodelled');
  }
  return {exercise: label as PoseVerdict['exercise'], confidence: Math.round(conf * 1e4) / 1e4, abstain: reasons.length > 0, abstain_reasons: reasons, person_found: personFound, reps: null};
}
