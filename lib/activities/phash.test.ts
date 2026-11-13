import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DHASH_H, DHASH_W, dhashFromGray, hamming, isDhash, isReused, REUSE_DISTANCE} from './phash.ts';

const img = (f: (x: number, y: number) => number) => Array.from({length: DHASH_W * DHASH_H}, (_, i) => f(i % DHASH_W, Math.floor(i / DHASH_W)));
const base = (x: number, y: number) => 128 + 60 * Math.sin(x * 1.3 + y * 0.7) + 30 * Math.cos(y * 1.1 + x * 0.4);
// what a JPEG re-encode + brightness/contrast tweak does to the downscaled grid: small noise, affine shift
const reencoded = (x: number, y: number) => 0.9 * (base(x, y) + (((x * 7 + y * 13) % 5) - 2)) + 12;
const other = (x: number, y: number) => 128 + 60 * Math.cos(x * 0.5 - y * 1.9) + 30 * Math.sin(y * 0.3 * x);

test('dhash is 16 hex chars and stable', () => {
  const h = dhashFromGray(img(base));
  assert.ok(isDhash(h), h);
  assert.equal(dhashFromGray(img(base)), h);
  assert.equal(hamming(h, h), 0);
  assert.equal(hamming('0000000000000000', 'ffffffffffffffff'), 64);
});

test('pHash catches a re-encoded photo but not a different one', () => {
  const h = dhashFromGray(img(base));
  assert.ok(hamming(h, dhashFromGray(img(reencoded))) <= REUSE_DISTANCE);
  assert.ok(hamming(h, dhashFromGray(img(other))) > REUSE_DISTANCE);
  assert.equal(isReused(dhashFromGray(img(reencoded)), ['nothex', h]), true);
  assert.equal(isReused(dhashFromGray(img(other)), [h]), false);
});

test('dhash rejects the wrong grid size', () => {
  assert.throws(() => dhashFromGray([1, 2, 3]));
});
