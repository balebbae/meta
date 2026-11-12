import type {ReactNode} from 'react';

/** Small inline SVG glyphs for Activities (no emoji: they render as tofu on many desktops). */
function G({children, size = 20}: {children: ReactNode; size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}
export const Glyph = {
  run: (s?: number) => <G size={s}><circle cx="15" cy="4" r="2" /><path d="M13 8l-3 4 3 2 1 6M10 12l-4 2M13 8l4 3h3M9 21l2-5" /></G>,
  steps: (s?: number) => <G size={s}><path d="M7 3c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM7 15c1.5 0 2.5 1 2.5 3S8.5 21 7 21s-2.5-1-2.5-3 1-3 2.5-3zM17 3c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM17 15c1.5 0 2.5 1 2.5 3s-1 3-2.5 3-2.5-1-2.5-3 1-3 2.5-3z" /></G>,
  heart: (s?: number) => <G size={s}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" /><path d="M4 12h4l2-3 3 6 2-3h5" /></G>,
  sleep: (s?: number) => <G size={s}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></G>,
  body: (s?: number) => <G size={s}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M9 8a3 3 0 0 0 6 0" /></G>,
  location: (s?: number) => <G size={s}><path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></G>,
  flag: (s?: number) => <G size={s}><path d="M5 22V4M5 4h11l-2 4 2 4H5" /></G>,
  lock: (s?: number) => <G size={s}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></G>,
  brain: (s?: number) => <G size={s}><path d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 1 5 3 3 0 0 0 4 3h3V3zM15 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-1 5 3 3 0 0 1-4 3h-3V3z" /></G>,
  target: (s?: number) => <G size={s}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></G>,
  map: (s?: number) => <G size={s}><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14" /></G>,
  speak: (s?: number) => <G size={s}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-4.6A8 8 0 1 1 21 12z" /></G>,
  secret: (s?: number) => <G size={s}><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a10 10 0 0 0 4.4-1" /></G>,
  nobody: (s?: number) => <G size={s}><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></G>,
  check: (s?: number) => <G size={s}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></G>,
  camera: (s?: number) => <G size={s}><path d="M4 8h3l2-3h6l2 3h3v12H4z" /><circle cx="12" cy="13" r="3.5" /></G>,
  mic: (s?: number) => <G size={s}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></G>,
  phone: (s?: number) => <G size={s}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></G>,
  watch: (s?: number) => <G size={s}><rect x="7" y="7" width="10" height="10" rx="3" /><path d="M9 7l1-4h4l1 4M9 17l1 4h4l1-4" /></G>,
  pencil: (s?: number) => <G size={s}><path d="M4 20h4l11-11-4-4L4 16zM13 7l4 4" /></G>,
  apple: (s?: number) => <G size={s}><path d="M12 7c1.5-1.5 4-1.5 5.5 0 2 2 1.5 7-1 10-1 1.5-2 1.5-3 1s-2-.5-3 0-2 .5-3-1c-2.5-3-3-8-1-10 1.5-1.5 4-1.5 5.5 0zM12 7c0-2 1-3.5 3-4" /></G>,
};
