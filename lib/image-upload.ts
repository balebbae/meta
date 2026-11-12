/** Shared by the browser uploader and the PATCH /api/users/[id] validator. */
export const MAX_DATA_URL_LENGTH = 400_000; // ~400 KB of base64 text
export const AVATAR_BOX = {maxWidth: 320, maxHeight: 320};
export const COVER_BOX = {maxWidth: 1500, maxHeight: 600};
export const TOO_BIG_MESSAGE = 'This photo is too large. Please choose an image under 400 KB after resizing.';

const DATA_URL = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+=*$/;

export function isImageDataUrl(v: unknown): v is string {
  return typeof v === 'string' && v.length <= MAX_DATA_URL_LENGTH && DATA_URL.test(v);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file could not be read as an image. Please choose a JPG or PNG.'));
    };
    img.src = url;
  });
}

/**
 * Centre-crops the photo to the box's aspect ratio, scales it down (never up) to fit the box and
 * returns a JPEG data URL. Quality starts at 0.85 and steps down before giving up at the size cap.
 */
export async function fileToDataUrl(file: File, box: {maxWidth: number; maxHeight: number}): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  const img = await loadImage(file);
  const aspect = box.maxWidth / box.maxHeight;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (!sw || !sh) throw new Error('That file could not be read as an image. Please choose a JPG or PNG.');
  if (sw / sh > aspect) sw = Math.round(sh * aspect);
  else sh = Math.round(sw / aspect);
  const sx = Math.round((img.naturalWidth - sw) / 2);
  const sy = Math.round((img.naturalHeight - sh) / 2);
  const scale = Math.min(1, box.maxWidth / sw, box.maxHeight / sh);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process this image.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.85, 0.75, 0.65, 0.5]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= MAX_DATA_URL_LENGTH) return dataUrl;
  }
  throw new Error(TOO_BIG_MESSAGE);
}

/** Scales a photo to fit `maxSide` without cropping (Photo Proof screens must stay whole). JPEG data URL. */
export async function fileToDataUrlFit(file: File, maxSide = 1280, maxLength = 1_500_000): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  const img = await loadImage(file);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) throw new Error('That file could not be read as an image. Please choose a JPG or PNG.');
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process this image.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.85, 0.75, 0.6, 0.45]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= maxLength) return dataUrl;
  }
  throw new Error('This photo is too large even after resizing. Try a smaller image.');
}
