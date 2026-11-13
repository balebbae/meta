/**
 * The asset catalog: every gallery entry with its builder, category and gameplay role.
 * Builders are factories; the gallery caches and disposes the Rigs it makes from them.
 */
import type {AssetDef, BuildOptions, Category, CreatureKind, Gender, Rig, Royal, Tier} from './types';
import {buildHero} from './factories/hero';
import {buildCreature} from './factories/creatures';
import {buildMount} from './factories/mounts';
import {buildBanner, buildCastle, buildChest, buildDrawbridge, buildFence, buildGate, buildHedge, buildRock, buildShrub, buildSteppingStone, buildTent, buildTile, buildTower, buildTree, buildWall} from './factories/world';
import {C} from './palette';

export const CATEGORIES: {id: Category; label: string; blurb: string}[] = [
  {id: 'heroes', label: 'Heroes', blurb: 'Six ranks, from Page to Royal Champion.'},
  {id: 'royalty', label: 'Royalty', blurb: 'The crown, the court and a neutral sovereign.'},
  {id: 'creatures', label: 'Creatures', blurb: 'Small, medium and boss variants with stats.'},
  {id: 'mounts', label: 'Mounts', blurb: 'Ponies with saddles and a rider seat.'},
  {id: 'world', label: 'World', blurb: 'Castles, modular walls, props and terrain tiles.'},
];

const hero = (id: string, tier: Tier | Royal, gender: Gender, name: string, subtitle: string, description: string, role: AssetDef['role'], category: Category = 'heroes'): AssetDef => ({
  id, category, name, subtitle, description, role, customizable: ['hero'],
  build: (o: BuildOptions) => buildHero({gender, ...o.hero, tier}),
});
const creature = (id: string, kind: CreatureKind, name: string, subtitle: string, description: string, role: AssetDef['role']): AssetDef => ({
  id, category: 'creatures', name, subtitle, description, role, customizable: ['variant'],
  build: (o: BuildOptions) => buildCreature(kind, o.variant ?? 'medium'),
});
const prop = (id: string, name: string, subtitle: string, description: string, build: (o: BuildOptions) => Rig): AssetDef => ({id, category: 'world', name, subtitle, description, role: null, customizable: [], build});

/** Seat a hero on a mount's `rider` pivot: hips on the saddle, legs bent forward and spread. */
function seatRider(mount: Rig, options: BuildOptions): Rig {
  const rider = buildHero({tier: 'iron', gender: 'masc', ...options.hero});
  const seat = mount.pivots.rider;
  if (seat) {
    rider.group.position.set(0, -0.27, 0); // avatar hips are 0.30 m up; sit them on the saddle
    for (const [name, spread] of [['legL', 0.55], ['legR', -0.55]] as const) { const leg = rider.pivots[name]; if (leg) { leg.rotation.x = -1.35; leg.rotation.z = spread; } }
    seat.add(rider.group);
    rider.rest = 'idle';
    mount.attached = [rider];
    const disposeMount = mount.dispose;
    mount.dispose = () => { rider.dispose(); disposeMount(); };
  }
  return mount;
}

export const CATALOG: AssetDef[] = [
  hero('hero-page', 'page', 'fem', 'Page', 'Rank 1 · wooden sword', 'Every champion starts here: a green tunic, a wooden practice sword and a lot of heart.', 'starter'),
  hero('hero-squire', 'squire', 'masc', 'Squire', 'Rank 2 · quilted gambeson', 'Leather pads, a round wooden shield and a real blade. Carries the knight\'s banner at tournaments.', 'starter'),
  hero('hero-iron', 'iron', 'masc', 'Iron Knight', 'Rank 3 · iron plate', 'Blue surcoat under iron plate, a nasal helm and a kite shield. The backbone of the castle guard.', 'defender'),
  hero('hero-silver', 'silver', 'fem', 'Silver Knight', 'Rank 4 · polished plate', 'Teal surcoat, polished silver plate and a plume. Fast, proud and hard to hit.', 'defender'),
  hero('hero-golden', 'golden', 'masc', 'Golden Knight', 'Rank 5 · gilded plate', 'Crimson and gold with a short cape, a great sword and an ornate shield.', 'champion'),
  hero('hero-champion', 'champion', 'fem', 'Royal Champion', 'Rank 6 · winged crest', 'Purple and gold, a winged crest helm, a long cape and the royal chest crest. The kingdom\'s finest.', 'champion'),
  hero('royal-king', 'king', 'masc', 'King', 'Crown · scepter · orb', 'Crimson coat with ivory trim, a rounded crown, scepter and orb. Prefers a beard.', 'ruler', 'royalty'),
  hero('royal-queen', 'queen', 'fem', 'Queen', 'Crown · scepter', 'Lavender coat with ivory trim, a rounded crown and a pink-jewelled scepter.', 'ruler', 'royalty'),
  hero('royal-sovereign', 'royal', 'neutral', 'Sovereign', 'Crown · scepter', 'A neutral royal preset in teal and gold for players who want neither king nor queen.', 'ruler', 'royalty'),
  creature('creature-slime', 'slime', 'Moss Slime', 'Bouncy · puff attack', 'A wobbling blob of moss jelly with a flower on top. Squashes when it lands and puffs spores when cornered.', 'smallEnemy'),
  creature('creature-goblin', 'goblin', 'Goblin', 'Quick · club', 'Big ears, a patched vest and a knobbly club. Travels in gangs and runs before it walks.', 'smallEnemy'),
  creature('creature-cyclops', 'cyclops', 'Cyclops', 'Heavy · one eye', 'A purple bruiser with a single eye and two horns. Slow wind-up, big club.', 'heavyEnemy'),
  creature('creature-giant', 'giant', 'Stone Giant', 'Boulder body · stomp', 'A walking boulder stack with moss on its shoulders and a flower it refuses to lose. Its stomp shakes the ground.', 'heavyEnemy'),
  creature('creature-baby-dragon', 'babyDragon', 'Baby Dragon', 'Flap · tiny flame', 'Round, lavender and far too pleased with itself. Flaps more than it flies.', 'boss'),
  creature('creature-elder-dragon', 'elderDragon', 'Elder Dragon', 'Boss · scale armor', 'Jade scales, broad wings, long horns and a flame that lights the tournament braziers.', 'boss'),
  {id: 'mount-chestnut', category: 'mounts', name: 'Chestnut Pony', subtitle: 'Leather saddle', description: 'A sturdy chestnut with a dark mane and a plain leather saddle. The joust favourite.', role: 'mount', customizable: ['mount', 'hero'], build: (o) => (o.rider ? seatRider(buildMount('chestnut'), o) : buildMount('chestnut'))},
  {id: 'mount-royal', category: 'mounts', name: 'Royal Pony', subtitle: 'Blue-and-gold caparison', description: 'A white pony in the royal blue caparison with gold hems and a plumed headpiece.', role: 'mount', customizable: ['mount', 'hero'], build: (o) => (o.rider ? seatRider(buildMount('royal'), o) : buildMount('royal'))},
  prop('world-castle-starter', 'Starter Castle', 'Blue roofs', 'A compact keep with four towers, blue cone roofs, banners and a wooden gate.', () => buildCastle('starter')),
  prop('world-castle-royal', 'Royal Castle', 'Pink roofs · gold trim', 'The royal seat: taller towers, pink roofs, gold trim and ivory walls.', () => buildCastle('royal')),
  prop('world-wall', 'Wall Segment', 'Modular · 12 voxels', 'A crenellated wall segment. Chain segments along x to build any perimeter.', () => buildWall()),
  prop('world-tower', 'Tower', 'Modular corner', 'A round tower with a cone roof for wall corners.', () => buildTower()),
  prop('world-gate', 'Gatehouse', 'Modular · arch', 'A gatehouse arch with a portcullis slot. Pairs with the drawbridge.', () => buildGate()),
  prop('world-drawbridge', 'Drawbridge', 'Animated · celebrate lowers it', 'A chained plank bridge on a hinge pivot. The celebrate animation lowers it.', () => buildDrawbridge()),
  prop('world-fence', 'Fence', 'Modular · 12 voxels', 'Wooden post-and-rail fence for the tournament field.', () => buildFence()),
  prop('world-tent', 'Tournament Tent', 'Striped', 'A striped pavilion for the lists.', () => buildTent(C.crimson)),
  prop('world-chest', 'Treasure Chest', 'Animated lid', 'An iron-banded chest. Celebrate opens the lid.', () => buildChest()),
  prop('world-banner', 'Banner', 'Animated flag', 'A crimson banner with the gold crest. The flag waves while idle.', () => buildBanner()),
  prop('world-tree-round', 'Round Tree', 'Leaf canopy', 'A round-canopy tree with seeded leaf clumps.', (o) => buildTree('round', o.seed ?? 1)),
  prop('world-tree-pink', 'Blossom Tree', 'Pink canopy', 'A blossom tree for the royal gardens.', (o) => buildTree('pink', o.seed ?? 2)),
  prop('world-tree-pine', 'Pine', 'Conifer', 'A stacked-cone pine for the borderlands.', (o) => buildTree('pine', o.seed ?? 3)),
  prop('world-shrub', 'Shrub', 'Low bush', 'A low bush for path edges.', (o) => buildShrub(o.seed ?? 2)),
  prop('world-rock', 'Rock', 'Boulder', 'A mossy boulder.', (o) => buildRock(o.seed ?? 3)),
  prop('world-stepping-stone', 'Stepping Stone', 'Path piece', 'A flat stone for garden paths.', () => buildSteppingStone()),
  prop('world-hedge', 'Hedge', 'Modular · 6 voxels', 'A trimmed hedge segment for mazes and gardens.', () => buildHedge()),
  prop('world-tile-grass', 'Grass Tile', 'Terrain · 12×12', 'A grass terrain tile. Tiles are 12 voxels square and their top sits at y = 0.', (o) => buildTile('grass', o.seed ?? 4)),
  prop('world-tile-flowers', 'Flower Tile', 'Terrain · 12×12', 'Grass with scattered flowers.', (o) => buildTile('flowers', o.seed ?? 5)),
  prop('world-tile-path', 'Path Tile', 'Terrain · 12×12', 'A packed-dirt path tile.', (o) => buildTile('path', o.seed ?? 6)),
  prop('world-tile-sand', 'Sand Tile', 'Terrain · 12×12', 'A sand tile for the tournament lists.', (o) => buildTile('sand', o.seed ?? 7)),
  prop('world-tile-water', 'Water Tile', 'Terrain · 12×12', 'A moat water tile.', (o) => buildTile('water', o.seed ?? 8)),
];

const BY_ID = new Map(CATALOG.map((a) => [a.id, a] as const));
export function assetById(id: string): AssetDef | undefined { return BY_ID.get(id); }
export function assetsIn(category: Category): AssetDef[] { return CATALOG.filter((a) => a.category === category); }
