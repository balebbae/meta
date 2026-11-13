/**
 * 64-bit difference hash (dHash) for Photo Proof, to catch the same screenshot submitted twice even after
 * re-encoding or resizing. The server has no image decoder (no sharp), so the browser computes it from a
 * 9x8 grayscale downscale and the server only compares hashes. Tests: phash.test.ts.
 */

export const DHASH_W = 9;
export const DHASH_H = 8;
/** Hamming distance at or below this counts as the same photo. */
export const REUSE_DISTANCE = 6;

/** gray: DHASH_W x DHASH_H luminance values, row-major. Returns 16 hex chars. */
export function dhashFromGray(gray: ArrayLike<number>): string {
  if (gray.length !== DHASH_W * DHASH_H) throw new Error(`dhash needs ${DHASH_W * DHASH_H} pixels`);
  let hex = '';
  let nibble = 0;
  let bits = 0;
  for (let y = 0; y < DHASH_H; y++) {
    for (let x = 0; x < DHASH_W - 1; x++) {
      nibble = (nibble << 1) | (gray[y * DHASH_W + x] > gray[y * DHASH_W + x + 1] ? 1 : 0);
      if (++bits === 4) {
        hex += nibble.toString(16);
        nibble = 0;
        bits = 0;
      }
    }
  }
  return hex;
}

export function isDhash(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{16}$/.test(v);
}

export function hamming(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < 16; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

/** True when `hash` is within REUSE_DISTANCE of any earlier hash. */
export function isReused(hash: string, previous: string[]): boolean {
  return previous.some(p => isDhash(p) && hamming(hash, p) <= REUSE_DISTANCE);
}

/** Browser only: dHash of an image data URL. */
export async function dhashDataUrl(dataUrl: string): Promise<string> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Could not read the image'));
    img.src = dataUrl;
  });
  // Draw at 8x the hash grid, then box-average: a single huge drawImage downscale aliases and is unstable.
  const k = 8;
  const canvas = document.createElement('canvas');
  canvas.width = DHASH_W * k;
  canvas.height = DHASH_H * k;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const gray = new Array<number>(DHASH_W * DHASH_H).fill(0);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      gray[Math.floor(y / k) * DHASH_W + Math.floor(x / k)] += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    }
  }
  return dhashFromGray(gray);
}
