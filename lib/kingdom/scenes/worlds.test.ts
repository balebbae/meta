import assert from 'node:assert/strict';
import test from 'node:test';
import {WORLDS, WORLD_IDS, tint, worldFor} from './worlds.ts';

test('worlds recolour props and kaijus, never heroes or the kingdom', () => {
  assert.equal(tint(WORLDS.kingdom, 'grass', 0x7fc466), 0x7fc466);
  assert.equal(tint(WORLDS.kingdom, 'skin', 0x8ccb7a, true), 0x8ccb7a);
  for (const id of WORLD_IDS.filter((w) => w !== 'kingdom')) {
    assert.notEqual(tint(WORLDS[id], 'grass', 0x7fc466), 0x7fc466, id);
    assert.notEqual(tint(WORLDS[id], 'skin', 0x8ccb7a, true), 0x8ccb7a, id);
    assert.equal(tint(WORLDS[id], 'cloth', 0xd7263d), 0xd7263d, id); // banners and shirts keep their colour
    assert.equal(tint(WORLDS[id], 'gold', 0xe9b94a, true), 0xe9b94a, id); // a kaiju's crown is not its hide
    assert.ok(tint(WORLDS[id], 'grass', 0x7fc466) !== tint(WORLDS[id], 'grass', 0x5ea64d), id); // light and dark grass stay apart
  }
});
test('a chat always gets the same world and a game outside a chat gets the kingdom', () => {
  assert.equal(worldFor(null), 'kingdom');
  assert.equal(worldFor(7), worldFor(7));
  assert.deepEqual(new Set([1, 2, 3, 4].map(worldFor)).size, 4);
});
