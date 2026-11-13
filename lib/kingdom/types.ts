/**
 * Beta Kingdom: shared types for assets, rigs, themes and games.
 *
 * World units: 1 unit = 1 metre. One voxel is VOXEL metres (see voxel.ts).
 * Every asset's origin is at ground level (y = 0) under the centre of its footprint.
 * +y is up, +z faces the viewer (a character's face points to +z), +x is the character's left on screen.
 */
import type {Group, Object3D} from 'three';

export type MaterialKind = 'skin' | 'cloth' | 'quilt' | 'leather' | 'metal' | 'gold' | 'wood' | 'stone' | 'moss' | 'leaf' | 'scale' | 'slime' | 'glow' | 'ink' | 'water' | 'sand' | 'grass' | 'dirt';

export type Tier = 'page' | 'squire' | 'iron' | 'silver' | 'golden' | 'champion';
export type Royal = 'king' | 'queen' | 'royal';
export type Gender = 'masc' | 'fem' | 'neutral';
export type HairStyle = 'short' | 'pony' | 'braid' | 'bun' | 'curls' | 'none';
export type Accessory = 'none' | 'plume' | 'flower' | 'scarf';
/** smile = the resting face; the other three match the expression sheet: closed-happy, surprised, sparkle-eyed. */
export type Expression = 'smile' | 'happy' | 'curious' | 'sparkle';

export type HeroPreset = {
  tier: Tier | Royal;
  gender: Gender;
  skin: number;
  hair: HairStyle;
  hairColor: number;
  accessory: Accessory;
  beard: boolean;
  seed: number;
  expression: Expression;
};

export type CreatureKind = 'slime' | 'goblin' | 'cyclops' | 'giant' | 'babyDragon' | 'elderDragon';
export type Variant = 'small' | 'medium' | 'boss';
export type MountKind = 'chestnut' | 'royal';

export type AnimState = 'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'hit' | 'celebrate' | 'trot' | 'flap' | 'puff' | 'squash' | 'stomp' | 'dance' | 'flex' | 'wave' | 'poke';
export type Species = 'avatar' | 'hero' | 'slime' | 'goblin' | 'cyclops' | 'giant' | 'dragon' | 'pony' | 'prop';

/** A built asset: one Group with named pivots. Geometry is merged per part and material; pivots move whole parts. */
export type Rig = {
  group: Group;
  species: Species;
  pivots: Record<string, Object3D>;
  /** Height in world units, for camera framing and scale references. */
  height: number;
  state: AnimState;
  stateTime: number;
  /** Per-rig scratch for springs; owned by the animator. */
  scratch: Record<string, number>;
  /** One-shot states return to this. */
  rest: AnimState;
  /** Animation states this rig supports (the gallery shows buttons for these). */
  states: AnimState[];
  /** Dispose every geometry this rig owns. Materials are shared and never disposed here. */
  dispose: () => void;
  /** Rigs parented inside this one (a rider on a mount). The gallery animates them with their own state. */
  attached?: Rig[];
};

export type Category = 'heroes' | 'royalty' | 'creatures' | 'mounts' | 'world';

export type AssetDef = {
  id: string;
  category: Category;
  name: string;
  subtitle: string;
  description: string;
  /** Semantic gameplay role this asset fills in the theme; null for pure scenery. */
  role: Role | null;
  build: (options: BuildOptions) => Rig;
  /** Options the gallery exposes for this asset. */
  customizable: ('hero' | 'variant' | 'mount')[];
};

export type BuildOptions = {
  hero?: Partial<HeroPreset>;
  variant?: Variant;
  /** Mounts only: seat the current hero preset on the saddle. */
  rider?: boolean;
  seed?: number;
};

export type Role = 'starter' | 'defender' | 'champion' | 'ruler' | 'smallEnemy' | 'heavyEnemy' | 'boss' | 'mount';

export type ThemePalette = {
  background: string;
  accent: string;
  accent2: string;
  text: string;
  ground: string;
};

export type Theme = {
  id: string;
  name: string;
  palette: ThemePalette;
  /** Role → asset id in this theme's catalog. */
  roles: Record<Role, string>;
  labels: Record<string, string>;
  /** Decorative glyph names the UI may show; purely cosmetic. */
  ornament: {frame: string; divider: string};
  effects: {hitColor: number; sparkleColor: number; puffColor: number; sound?: Record<string, string>};
};
