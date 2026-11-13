import {test} from 'node:test';
import assert from 'node:assert/strict';
import clf from '../../repcount/model/exercise_clf.json' with {type: 'json'};
import {classifyPose, clipFeatures, predictProba} from './pose-classify.ts';
import type {ClipInput, ClipPose} from './queries.ts';
import type {Landmark} from './repcount.ts';

test('selftest vector from the JSON gives the same probabilities as classify.py', () => {
  const p = predictProba(clf.selftest.x);
  p.forEach((v, i) => assert.ok(Math.abs(v - clf.selftest.probs[i]) <= 1e-6, `class ${i}: ${v} vs ${clf.selftest.probs[i]}`));
});

/** Noisy synthetic clips with dropped frames and low-visibility joints (the second one is the parity clip). */
function clips(): {fps: number; frames: (Landmark[] | null)[]}[] {
  let s = 7;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return ([['jj', 12, 110], ['pu', 15, 150]] as const).map(([kind, fps, n]) => ({
    fps,
    frames: Array.from({length: n}, (_, t) => {
      if (r() < 0.08) return null;
      const ph = Math.sin((2 * Math.PI * 0.6 * t) / fps);
      return Array.from({length: 33}, (_, i) => {
        const base = kind === 'pu' ? {x: 0.2 + (i % 7) * 0.1, y: 0.6 + (i % 3) * 0.03} : {x: 0.4 + (i % 2) * 0.1, y: 0.1 + i * 0.025};
        const amp = 0.08 * ph * ((i % 5) - 2);
        return {x: base.x + amp + (r() - 0.5) * 0.02, y: base.y + amp * 0.7 + (r() - 0.5) * 0.02, visibility: r() < 0.1 ? 0.3 : 0.6 + 0.4 * r()};
      });
    }),
  }));
}

test('clip features and verdict match repcount classify.py on the same landmarks', () => {
  // python: C.clip_features(lm, 15) / C.classify(lm, 15) on clips()[1] (missing frames as NaN, z = 0)
  const py = [24.15500172, 10.70250403, 32.22796487, 1.23046875, 0.6254224246, 72.16926865, 17.15842182, 48.54418146, 0.5859375, 0.291581976, 16.18749112, 11.59063284, 32.86119133, 0.5859375, 0.7943263622, 0.06499376637, 0.1864589016, 0.5515279173, 0.5859375, 0.838273588, 71.85939874, 17.68535886, 53.56879218, 1.23046875, 0.3707709259, -2.978318957, 0.280685109, 0.7834224601, 0.5859375, 0.8686788711, 2.860581363, 0.2600738471, 0.7376902215, 0.5859375, 0.8664568877, 2.879220547, 0.2506355146, 0.709884198, 0.5859375, 0.8647757305, 65.80417246, 21.17514953, 64.72469312, 90.95464481, 48.53192012, 153.6586439, -0.9584810365, 0.3276938318, 0.9066666667, 0.7402508837];
  const {fps, frames} = clips()[1];
  const {x} = clipFeatures(frames, fps);
  assert.equal(x.length, clf.features.length);
  x.forEach((v, i) => assert.ok(Math.abs(v - py[i]) <= 1e-6 * Math.max(1, Math.abs(py[i])), `${clf.features[i]}: ${v} vs ${py[i]}`));
  const v = classifyPose(frames, fps);
  assert.deepEqual([v.exercise, v.confidence, v.abstain_reasons], ['lunge', 0.9289, ['posture_conflict', 'possible_sit_up_unmodelled']]);
});

test('no person abstains', () => {
  const v = classifyPose(Array(60).fill(null), 15);
  assert.ok(v.abstain && !v.person_found && v.abstain_reasons.includes('no_person'));
});

test('the clip request carries only the verdict, signal and stills, never video', () => {
  // compile-time: adding a field (a Blob, a video URL…) to the payload types fails `tsc` here until it is reviewed
  const clipKeys: Record<keyof ClipInput, true> = {exercise: true, fps: true, signal: true, frames: true, pose: true};
  const poseKeys: Record<keyof ClipPose, true> = {exercise: true, confidence: true, abstain: true, person_found: true, reps: true};
  const body: ClipInput = {exercise: 'pushup', fps: 12, signal: [170, null, 90], frames: ['data:image/jpeg;base64,AA'], pose: {exercise: 'push_up', confidence: 0.9, abstain: false, person_found: true, reps: 3}};
  assert.deepEqual(Object.keys(body).sort(), Object.keys(clipKeys).sort());
  assert.deepEqual(Object.keys(body.pose ?? {}).sort(), Object.keys(poseKeys).sort());
  assert.ok(body.frames.every(f => f.startsWith('data:image/jpeg')));
});
