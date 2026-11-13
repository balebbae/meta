/** Kingdom palette: pastels with blue, teal, lavender, gold and crimson accents. Hex colours in sRGB. */
export const C = {
  // skin tones (gallery options)
  skin: [0xfae8d5, 0xf1c3a3, 0xd9a07a, 0xb97b55, 0x8b5a3c, 0x5f3b26] as const,
  // hair
  hairBrown: 0x6b4a3b, hairAuburn: 0xb85c33, hairBlack: 0x2c2a33, hairBlonde: 0xe9c978, hairWhite: 0xf2ede4, hairPink: 0xe9a1c3, hairTeal: 0x4fa8a0,
  // face
  ink: 0x241f2b, white: 0xffffff, blush: 0xf29aae, mouth: 0x7a3e4a,
  // cloth accents
  blue: 0x2f6be0, blueDark: 0x1f4fb0, blueLight: 0x9ec1ff, teal: 0x3ba99c, tealDark: 0x2a7f76, lavender: 0xb08ae0, purple: 0x8b5cc7, purpleDark: 0x5e3a96,
  gold: 0xe9b94a, goldDark: 0xb7861f, crimson: 0xd7263d, crimsonDark: 0x9a1a2c, green: 0x6db36b, greenDark: 0x3e8e52, cream: 0xf3e6cf, ivory: 0xf7f1e6, pink: 0xf4a6c6, pinkDark: 0xe07ba6,
  // materials
  iron: 0x9aa6b8, ironDark: 0x6c7a8f, silver: 0xd7dee8, silverDark: 0xaab4c4, leather: 0x8a5a3b, leatherDark: 0x5b3a26, wood: 0xa5713f, woodDark: 0x6e4526, quilt: 0xc9b58c, quiltDark: 0xa8946f,
  stone: 0xc9cdd3, stoneDark: 0x9aa1ab, stoneLight: 0xe4e7eb, slate: 0x7e8592, moss: 0x7cc05c, mossDark: 0x4e9a46, leafLight: 0x9ad37a,
  sand: 0xe8d3a2, dirt: 0x8c6a4a, water: 0x6fb8f0, waterDeep: 0x3f8fe0, grass: 0x7fc466, grassDark: 0x5ea64d,
  // creatures
  slime: 0x8fd65a, slimeDark: 0x5ea83b, goblin: 0x8ccb7a, goblinDark: 0x5f9a52, cyclops: 0xb08ae0, cyclopsDark: 0x7a56b3, giant: 0xaeb4bf, giantDark: 0x7e8592,
  dragonBaby: 0xb59be8, dragonBabyDark: 0x8a6ccc, dragonElder: 0x3fa66b, dragonElderDark: 0x2b7a4e, belly: 0xf9e7cf, bellyGold: 0xf0cf6a,
  // mounts
  chestnut: 0xa86a3f, chestnutDark: 0x6b3f23, whitePony: 0xf4f0e8, mane: 0x3b2a24, hoof: 0x3a2d2a,
  // fx
  flame: 0xff9a3c, flameCore: 0xffe08a, sparkle: 0xfff1a8, puff: 0xcfe7ff,
} as const;

/** Small deterministic brightness jitter for seeded colour variation. */
export function jitter(hex: number, r: () => number, amount = 0.05): number {
  const k = 1 + (r() * 2 - 1) * amount;
  const rr = Math.min(255, Math.round(((hex >> 16) & 255) * k)), g = Math.min(255, Math.round(((hex >> 8) & 255) * k)), b = Math.min(255, Math.round((hex & 255) * k));
  return (rr << 16) | (g << 8) | b;
}
export function shade(hex: number, k: number): number {
  const rr = Math.min(255, Math.round(((hex >> 16) & 255) * k)), g = Math.min(255, Math.round(((hex >> 8) & 255) * k)), b = Math.min(255, Math.round((hex & 255) * k));
  return (rr << 16) | (g << 8) | b;
}
