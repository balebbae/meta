import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BOSS_ASSET_IDS, HERO_TIERS, castBoss, castHero, castKey, parseHero} from './cast.ts';

test('every Rally boss kind is played by a catalog creature in its boss variant', () => {
  for (const kind of ['goblin', 'golem', 'dragon', 'serpent', 'yeti', 'spectre', 'beast']) {
    const c = castBoss(kind);
    assert.match(c.assetId, /^creature-/); assert.equal(c.options.variant, 'boss');
  }
  assert.equal(castBoss('dragon').assetId, 'creature-elder-dragon');
});

test('an unknown boss kind still gets a stable creature', () => {
  const a = castBoss('kraken');
  assert.ok(BOSS_ASSET_IDS.includes(a.assetId));
  assert.deepEqual(castBoss('kraken'), a);
});

test('a hero is stable per name and ranks up with gear', () => {
  assert.equal(castKey(castHero('Ada Lovelace')), castKey(castHero(' ada lovelace ')));
  assert.equal(castHero('Ada').assetId, 'hero-page');
  assert.equal(castHero('Ada', ['cape', 'shoes']).assetId, 'hero-iron');
  assert.equal(castHero('Ada', Array(20).fill('x')).assetId, `hero-${HERO_TIERS[5]}`);
  assert.deepEqual(castHero('Ada', ['cape']).options, castHero('Ada').options);
});
