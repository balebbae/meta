/* eslint-disable @next/next/no-img-element */
import type {CSSProperties} from 'react';
import {FB_SVG, type FbSvgName} from './icons-fb-paths';
import styles from './icons-fb.module.css';

export type FbTone = 'primary' | 'secondary' | 'blue' | 'white' | 'none';

/**
 * Sprite sheets downloaded from static.xx.fbcdn.net into public/fb/. `w`/`h` are the CSS
 * background-size facebook.com uses (the files are 2x). See public/fb/manifest.json for URLs.
 */
export const FB_SHEETS = {
  misc: {file: 'oJWMPcOINb5.webp', w: 37, h: 628},
  rail: {file: 'rIjih14LjuO.webp', w: 37, h: 1702},
  actions: {file: 'VSC73biWNYl.webp', w: 21, h: 840},
  media: {file: '_KL4TMeNLAS.webp', w: 73, h: 435},
  groups: {file: '9jo_cDrjlWe.webp', w: 21, h: 114},
  account: {file: '-niN-ouXo_W.webp', w: 25, h: 382},
  marketplace: {file: 'X379lXGkJ3Q.webp', w: 25, h: 433},
  categories: {file: 'fCuCYDERcgd.webp', w: 25, h: 315},
  friends: {file: 'Rb16h549h8v.webp', w: 400, h: 160},
  notifications: {file: 'wzfD2uZzAhG.webp', w: 29, h: 3101},
  events: {file: 'eX--fQCC0ZP.webp', w: 25, h: 375},
  eventsMisc: {file: 'YNUmR9qWaPn.webp', w: 33, h: 370},
} as const;
export type FbSheet = keyof typeof FB_SHEETS;

/** Named sprite cells: [sheet, x, y, natural size, default tone]. Positions are facebook.com's background-position. */
export const FB_SPRITES = {
  metaAi: ['misc', 0, 0, 36, 'none'],
  railFriends: ['rail', 0, -851, 36, 'none'],
  railMemories: ['rail', 0, -1221, 36, 'none'],
  railSaved: ['rail', 0, -518, 36, 'none'],
  railGroups: ['rail', 0, -185, 36, 'none'],
  railReels: ['rail', 0, -111, 36, 'none'],
  railMarketplace: ['rail', 0, -999, 36, 'none'],
  railEvents: ['rail', 0, -666, 36, 'none'],
  railAds: ['rail', 0, -407, 36, 'none'],
  railPages: ['rail', 0, -333, 36, 'none'],
  railMessenger: ['rail', 0, -37, 36, 'none'],
  railFundraisers: ['rail', 0, -74, 36, 'none'],
  railOrders: ['rail', 0, -1073, 36, 'none'],
  railLive: ['rail', 0, -962, 36, 'none'],
  railGaming: ['rail', 0, -1628, 36, 'none'],
  railClimate: ['rail', 0, -1480, 36, 'none'],
  like20: ['actions', 0, -441, 20, 'secondary'],
  likeFilled20: ['actions', 0, -378, 20, 'none'],
  comment20: ['actions', 0, -231, 20, 'secondary'],
  share20: ['actions', 0, -567, 20, 'secondary'],
  globe20: ['actions', 0, -336, 20, 'secondary'],
  friendsAudience20: ['actions', 0, -315, 20, 'secondary'],
  check20: ['actions', 0, -147, 20, 'secondary'],
  link20: ['actions', 0, -504, 20, 'secondary'],
  avatarSticker16: ['actions', 0, -588, 16, 'secondary'],
  photo16: ['actions', 0, -605, 16, 'secondary'],
  gif16: ['actions', 0, -622, 16, 'secondary'],
  sticker16: ['actions', 0, -690, 16, 'secondary'],
  more20: ['misc', 0, -493, 20, 'secondary'],
  close20: ['misc', 0, -472, 20, 'secondary'],
  chevronUp20: ['misc', 0, -409, 20, 'primary'],
  chevronDown20: ['misc', 0, -346, 20, 'primary'],
  chevronLeft20: ['misc', 0, -367, 20, 'primary'],
  chevronRight20: ['misc', 0, -388, 20, 'primary'],
  eyeOff20: ['misc', 0, -514, 20, 'primary'],
  plus16: ['misc', 0, -611, 16, 'blue'],
  trophy16: ['misc', -17, -611, 16, 'primary'],
  more16: ['misc', -17, -594, 16, 'primary'],
  logout20: ['account', 0, -88, 20, 'primary'],
  groupsFeed20: ['groups', 0, -63, 20, 'primary'],
  groupsDiscover20: ['groups', 0, 0, 20, 'primary'],
  groupsYours20: ['groups', 0, -42, 20, 'primary'],
  mkNotifications20: ['marketplace', 0, -146, 20, 'primary'],
  catApparel: ['categories', 0, -260, 20, 'primary'],
  catHobbies: ['categories', 0, -134, 20, 'primary'],
  catToys: ['categories', 0, -176, 20, 'primary'],
  catBuySell: ['categories', 0, -50, 20, 'primary'],
  catOffice: ['categories', 0, -113, 20, 'primary'],
  birthdays20: ['friends', -158, -127, 20, 'primary'],
  play20: ['media', -42, -317, 20, 'white'],
  unmute20: ['media', -42, -296, 20, 'white'],
  interested16: ['events', 0, -332, 16, 'primary'],
  location16: ['eventsMisc', 0, -234, 16, 'secondary'],
} as const satisfies Record<string, readonly [FbSheet, number, number, number, FbTone]>;
export type FbSpriteName = keyof typeof FB_SPRITES;

/** Stand-alone webp/png/svg assets from facebook.com (public/fb/). */
export const FB_IMAGES = {
  feeds36: 'GR6y21F_jyL.webp',
  liveVideo24: 'yD3PZM_5DK8.webp',
  photoVideo24: '5ak_tKfzmQv.webp',
  feeling24: 't40HYuD0sbT.webp',
  lifeEvent24: 'ggLmWKYnFrq.webp',
  addToStory16: 'pO4kotnKLXd.webp',
  editProfile16: 'D7WKiU5aD7r.webp',
  publicAudience12: 'ckVwrvbnQCI.webp',
  reactionLike: 'reaction-like.svg',
  reactionLikePng: 'reaction-like.png',
  reactionLove: 'reaction-love.png',
  reactionCare: 'reaction-care.png',
  reactionHaha: 'reaction-haha.png',
  reactionWow: 'reaction-wow.png',
  reactionSad: 'reaction-sad.png',
  reactionAngry: 'reaction-angry.png',
} as const;
export type FbImageName = keyof typeof FB_IMAGES;

type Common = {size?: number; className?: string; style?: CSSProperties; title?: string};

/** Inline SVG copied verbatim from facebook.com, coloured by `currentColor`. */
export function FbSvg({name, size, className, style, title, fill}: Common & {name: FbSvgName; fill?: string}) {
  const def = FB_SVG[name];
  const vb = def.vb.split(' ').map(Number);
  const s = size ?? vb[2];
  return (
    <svg
      width={s}
      height={s}
      viewBox={def.vb}
      fill={fill ?? 'currentColor'}
      className={className}
      style={style}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      dangerouslySetInnerHTML={{__html: def.html}}
    />
  );
}

/** One cell of a facebook.com sprite sheet, rendered exactly like their `<i>` elements. */
export function FbSprite({name, size, tone, className, style, title}: Common & {name: FbSpriteName; tone?: FbTone}) {
  const [sheetKey, x, y, natural, defaultTone] = FB_SPRITES[name];
  const sheet = FB_SHEETS[sheetKey];
  const scale = size ? size / natural : 1;
  return (
    <i
      className={`${styles.sprite} ${styles[tone ?? defaultTone]} ${className ?? ''}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{
        width: natural * scale,
        height: natural * scale,
        backgroundImage: `url(/fb/${sheet.file})`,
        backgroundSize: `${sheet.w * scale}px ${sheet.h * scale}px`,
        backgroundPosition: `${x * scale}px ${y * scale}px`,
        ...style,
      }}
    />
  );
}

/** A single facebook.com image asset (composer icons, profile buttons, reactions). */
export function FbImg({name, size = 24, className, style, alt = ''}: Common & {name: FbImageName; alt?: string}) {
  return <img src={`/fb/${FB_IMAGES[name]}`} width={size} height={size} alt={alt} className={`${styles.img} ${className ?? ''}`} style={style} draggable={false} />;
}
