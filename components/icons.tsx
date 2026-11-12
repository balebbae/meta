import type {SVGProps} from 'react';
import type {ReactionType} from '@/lib/types';

type IconProps = SVGProps<SVGSVGElement> & {size?: number};

function Svg({size = 24, children, ...rest}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

/* ---------- Brand ---------- */
export function FacebookLogo({size = 40}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label="Facebook">
      <circle cx="20" cy="20" r="20" fill="#0866ff" />
      <path
        fill="#fff"
        d="M26.7 25.4l.9-5.8h-5.6v-3.8c0-1.6.8-3.1 3.3-3.1h2.5V7.8s-2.3-.4-4.5-.4c-4.6 0-7.6 2.8-7.6 7.8v4.4h-5.1v5.8h5.1V40c1 .2 2.1.2 3.1.2s2.1-.1 3.1-.2V25.4h4.8z"
      />
    </svg>
  );
}

/* ---------- Header nav (outline / filled) ---------- */
export function HomeIcon({active, ...p}: IconProps & {active?: boolean}) {
  return active ? (
    <Svg {...p}>
      <path d="M9.5 21v-5.5a1 1 0 011-1h3a1 1 0 011 1V21h5a1 1 0 001-1v-8.6a1 1 0 00-.35-.76l-7.5-6.4a1 1 0 00-1.3 0l-7.5 6.4A1 1 0 003.5 11.4V20a1 1 0 001 1h5z" />
    </Svg>
  ) : (
    <Svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M9.5 20.5v-5a1 1 0 011-1h3a1 1 0 011 1v5h4.5a1 1 0 001-1v-8.3a1 1 0 00-.36-.77l-7-5.9a1 1 0 00-1.28 0l-7 5.9a1 1 0 00-.36.77v8.3a1 1 0 001 1h4.5z" />
    </Svg>
  );
}

export function VideoIcon({active, ...p}: IconProps & {active?: boolean}) {
  return active ? (
    <Svg {...p}>
      <path d="M5 4h14a3 3 0 013 3v10a3 3 0 01-3 3H5a3 3 0 01-3-3V7a3 3 0 013-3zm4.5 4.9v6.2a.6.6 0 00.9.5l5.3-3.1a.6.6 0 000-1l-5.3-3.1a.6.6 0 00-.9.5z" />
    </Svg>
  ) : (
    <Svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <rect x="2.9" y="4.9" width="18.2" height="14.2" rx="2.6" />
      <path d="M10.2 9.3v5.4l4.6-2.7z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function MarketplaceIcon({active, ...p}: IconProps & {active?: boolean}) {
  return active ? (
    <Svg {...p}>
      <path d="M3.3 3h17.4a1 1 0 01.95.69l1.2 3.6c.1.3.15.6.15.9A3.8 3.8 0 0119.2 12a3.8 3.8 0 01-3.6-2.6 3.8 3.8 0 01-7.2 0A3.8 3.8 0 014.8 12 3.8 3.8 0 011 8.2c0-.3.05-.6.15-.9l1.2-3.6A1 1 0 013.3 3zM3 13.5c.6.3 1.2.5 1.8.5 1.1 0 2.2-.4 3-1.1V20a1 1 0 001 1h6.4a1 1 0 001-1v-7.1c.8.7 1.9 1.1 3 1.1.6 0 1.2-.2 1.8-.5V20a2 2 0 01-2 2H5a2 2 0 01-2-2v-6.5zm7.5 1.7V19h3v-3.8a1.5 1.5 0 10-3 0z" />
    </Svg>
  ) : (
    <Svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M3.4 4h17.2l1.3 4.2c.1.3.1.5.1.8a3.3 3.3 0 01-6.5.3 3.3 3.3 0 01-7 0A3.3 3.3 0 012 9c0-.3 0-.5.1-.8L3.4 4z" />
      <path d="M4 12.8V20h16v-7.2M9.5 20v-4.3a2.5 2.5 0 015 0V20" />
    </Svg>
  );
}

export function GroupsIcon({active, ...p}: IconProps & {active?: boolean}) {
  return active ? (
    <Svg {...p}>
      <circle cx="12" cy="7.5" r="3.5" />
      <circle cx="4.8" cy="9.5" r="2.5" />
      <circle cx="19.2" cy="9.5" r="2.5" />
      <path d="M12 12.5c3.4 0 6.2 2.2 6.2 5.3V20a1 1 0 01-1 1H6.8a1 1 0 01-1-1v-2.2c0-3.1 2.8-5.3 6.2-5.3zM4.8 13.5c.5 0 1 .07 1.4.2a7.3 7.3 0 00-1.7 4.3V20H1.8a.8.8 0 01-.8-.8v-1.8c0-2.3 1.6-3.9 3.8-3.9zm14.4 0c2.2 0 3.8 1.6 3.8 3.9v1.8a.8.8 0 01-.8.8h-2.7v-2c0-1.6-.6-3.1-1.7-4.3.4-.13.9-.2 1.4-.2z" />
    </Svg>
  ) : (
    <Svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <circle cx="12" cy="7.8" r="3" />
      <circle cx="5" cy="10" r="2.2" />
      <circle cx="19" cy="10" r="2.2" />
      <path d="M6.9 20v-1.9c0-2.8 2.3-4.8 5.1-4.8s5.1 2 5.1 4.8V20H6.9zM5.5 14.4c-2 .1-3.5 1.4-3.5 3.5V19h3M18.5 14.4c2 .1 3.5 1.4 3.5 3.5V19h-3" />
    </Svg>
  );
}

export function GamingIcon({active, ...p}: IconProps & {active?: boolean}) {
  return active ? (
    <Svg {...p}>
      <path d="M7 5h10a6 6 0 016 6v4.2A3.8 3.8 0 0119.2 19c-1.2 0-2.3-.6-3-1.5L15 16H9l-1.2 1.5A3.8 3.8 0 014.8 19 3.8 3.8 0 011 15.2V11a6 6 0 016-6zm.5 3.5a.8.8 0 00-.8.8v1.2H5.5a.8.8 0 000 1.6h1.2v1.2a.8.8 0 001.6 0v-1.2h1.2a.8.8 0 000-1.6H8.3V9.3a.8.8 0 00-.8-.8zM15.5 9a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4zm2.8 2.3a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z" />
    </Svg>
  ) : (
    <Svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M7.5 6h9a5.5 5.5 0 015.5 5.5v3.4a3.1 3.1 0 01-5.5 2L15.2 15H8.8l-1.3 1.9A3.1 3.1 0 012 15V11.5A5.5 5.5 0 017.5 6z" />
      <path d="M7.5 9.5v3.6M5.7 11.3h3.6" strokeLinecap="round" />
      <circle cx="15.5" cy="10.2" r=".9" fill="currentColor" stroke="none" />
      <circle cx="18.2" cy="12.4" r=".9" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function FriendsIcon({active, ...p}: IconProps & {active?: boolean}) {
  return active ? (
    <Svg {...p}>
      <circle cx="9" cy="7" r="4" />
      <path d="M9 13c4.4 0 8 2.6 8 5.8V20a1 1 0 01-1 1H2a1 1 0 01-1-1v-1.2C1 15.6 4.6 13 9 13zm8-1.5a3.5 3.5 0 10-2.6-5.9 5.9 5.9 0 01-.3 6c.9-.1 1.9-.1 2.9-.1zm1.4 2c2.7.7 4.6 2.6 4.6 5.2V20a1 1 0 01-1 1h-3.2c.1-.3.2-.6.2-1v-1.2c0-1.9-.6-3.6-1.7-5 .4-.2.8-.3 1.1-.3z" />
    </Svg>
  ) : (
    <Svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <circle cx="9" cy="7.5" r="3.5" />
      <path d="M2 20v-1c0-3 3.1-5.5 7-5.5s7 2.5 7 5.5v1H2zM15.5 4.3a3.2 3.2 0 11-1 6.2M17.5 13.6c2.6.5 4.5 2.4 4.5 4.9V20h-3" />
    </Svg>
  );
}

/* ---------- Generic UI ---------- */
export function MenuGridIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 3h5v5H3zM9.5 3h5v5h-5zM16 3h5v5h-5zM3 9.5h5v5H3zM9.5 9.5h5v5h-5zM16 9.5h5v5h-5zM3 16h5v5H3zM9.5 16h5v5h-5zM16 16h5v5h-5z" />
    </Svg>
  );
}
export function MessengerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2C6.4 2 2 6.2 2 11.7c0 3 1.3 5.6 3.5 7.4.2.2.3.4.3.6l.1 2.1c0 .6.7 1.1 1.3.8l2.3-1c.2-.1.4-.1.6-.1.6.2 1.3.3 1.9.3 5.6 0 10-4.2 10-9.7S17.6 2 12 2zm6 7.5l-2.9 4.6c-.5.7-1.5.9-2.2.4l-2.3-1.7a.6.6 0 00-.7 0L6.7 15.2c-.4.3-1-.2-.7-.6l2.9-4.6c.5-.7 1.5-.9 2.2-.4l2.3 1.7a.6.6 0 00.7 0l3.2-2.4c.4-.3 1 .2.7.6z" />
    </Svg>
  );
}
export function BellIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2.5a1.5 1.5 0 011.5 1.5v.6A6.5 6.5 0 0118.5 11v3.6l1.6 2.4a1 1 0 01-.8 1.5H4.7a1 1 0 01-.8-1.5l1.6-2.4V11a6.5 6.5 0 015-6.4V4A1.5 1.5 0 0112 2.5zm-2.8 17h5.6a2.8 2.8 0 01-5.6 0z" />
    </Svg>
  );
}
export function SearchIcon(p: IconProps) {
  return (
    <Svg {...p} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L21 21" />
    </Svg>
  );
}
export function CaretDownIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.3 9.3a1 1 0 011.4 0L12 13.6l4.3-4.3a1 1 0 111.4 1.4l-5 5a1 1 0 01-1.4 0l-5-5a1 1 0 010-1.4z" />
    </Svg>
  );
}
export function CaretDownSmallIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 15.5l-6-6h12z" />
    </Svg>
  );
}
export function ChevronDownIcon(p: IconProps) {
  return <CaretDownIcon {...p} />;
}
export function ChevronUpIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.3 14.7a1 1 0 001.4 0L12 10.4l4.3 4.3a1 1 0 101.4-1.4l-5-5a1 1 0 00-1.4 0l-5 5a1 1 0 000 1.4z" />
    </Svg>
  );
}
export function ChevronRightIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9.3 6.3a1 1 0 011.4 0l5 5a1 1 0 010 1.4l-5 5a1 1 0 01-1.4-1.4L13.6 12 9.3 7.7a1 1 0 010-1.4z" />
    </Svg>
  );
}
export function ChevronLeftIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14.7 6.3a1 1 0 00-1.4 0l-5 5a1 1 0 000 1.4l5 5a1 1 0 001.4-1.4L10.4 12l4.3-4.3a1 1 0 000-1.4z" />
    </Svg>
  );
}
export function ArrowLeftIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M11.7 4.3a1 1 0 010 1.4L6.4 11H20a1 1 0 110 2H6.4l5.3 5.3a1 1 0 01-1.4 1.4l-7-7a1 1 0 010-1.4l7-7a1 1 0 011.4 0z" />
    </Svg>
  );
}
export function CloseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5.3 5.3a1 1 0 011.4 0L12 10.6l5.3-5.3a1 1 0 111.4 1.4L13.4 12l5.3 5.3a1 1 0 01-1.4 1.4L12 13.4l-5.3 5.3a1 1 0 01-1.4-1.4l5.3-5.3-5.3-5.3a1 1 0 010-1.4z" />
    </Svg>
  );
}
export function MoreHorizontalIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="5" cy="12" r="2.2" />
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="19" cy="12" r="2.2" />
    </Svg>
  );
}
export function PlusIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4a1.2 1.2 0 011.2 1.2v5.6h5.6a1.2 1.2 0 010 2.4h-5.6v5.6a1.2 1.2 0 01-2.4 0v-5.6H5.2a1.2 1.2 0 010-2.4h5.6V5.2A1.2 1.2 0 0112 4z" />
    </Svg>
  );
}
export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9.5 16.2L5.3 12l-1.4 1.4 5.6 5.6 12-12-1.4-1.4z" />
    </Svg>
  );
}
export function GlobeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm7.9 9h-3.4c-.1-2.2-.6-4.2-1.4-5.7A8.1 8.1 0 0119.9 11zM12 20c-1 0-2.6-2.5-2.9-7h5.8c-.3 4.5-1.9 7-2.9 7zm-2.9-9c.3-4.5 1.9-7 2.9-7s2.6 2.5 2.9 7H9.1zM8.9 5.3C8.1 6.8 7.6 8.8 7.5 11H4.1a8.1 8.1 0 014.8-5.7zM4.1 13h3.4c.1 2.2.6 4.2 1.4 5.7A8.1 8.1 0 014.1 13zm11 5.7c.8-1.5 1.3-3.5 1.4-5.7h3.4a8.1 8.1 0 01-4.8 5.7z" />
    </Svg>
  );
}
export function LockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2a5 5 0 015 5v3h1a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8a2 2 0 012-2h1V7a5 5 0 015-5zm0 2a3 3 0 00-3 3v3h6V7a3 3 0 00-3-3zm0 10a1.5 1.5 0 00-.8 2.8V18a.8.8 0 001.6 0v-1.2A1.5 1.5 0 0012 14z" />
    </Svg>
  );
}

/* ---------- Post actions ---------- */
export function LikeIcon(p: IconProps) {
  return (
    <Svg {...p} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M7.5 10.5v9.3H4.6a1 1 0 01-1-1v-7.3a1 1 0 011-1h2.9zm0 0l4.1-7.6c.3-.6 1-.9 1.6-.6 1 .4 1.6 1.4 1.5 2.5L14.3 9h4.5a2 2 0 012 2.3l-1.1 6.9a2 2 0 01-2 1.6H7.5" />
    </Svg>
  );
}
export function LikeFilledIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 10.5h3v9.3h-3a1 1 0 01-1-1v-7.3a1 1 0 011-1zm4.5 0l4.1-7.6c.3-.6 1-.9 1.6-.6 1 .4 1.6 1.4 1.5 2.5L14.8 9h4a2 2 0 012 2.3l-1.1 6.9a2 2 0 01-2 1.6H8v-9.3z" />
    </Svg>
  );
}
export function CommentIcon(p: IconProps) {
  return (
    <Svg {...p} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M12 3.5c5 0 9 3.4 9 7.7s-4 7.7-9 7.7c-1 0-2-.1-2.9-.4L5 20.3a.5.5 0 01-.7-.5l.4-3.1A7.3 7.3 0 013 11.2c0-4.3 4-7.7 9-7.7z" />
    </Svg>
  );
}
export function ShareIcon(p: IconProps) {
  return (
    <Svg {...p} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M14 5.5l6.5 5.8a.7.7 0 010 1L14 18.2v-3.9c-5 0-8.3 1.4-10.5 4.7.5-5.6 3.8-9.6 10.5-10.1V5.5z" />
    </Svg>
  );
}
export function PhotoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path fill="#45BD62" d="M5 3h14a3 3 0 013 3v12a3 3 0 01-3 3H5a3 3 0 01-3-3V6a3 3 0 013-3z" />
      <path fill="#fff" d="M8.5 7.5a1.8 1.8 0 110 3.6 1.8 1.8 0 010-3.6zM4.5 18l4.2-5.1a.8.8 0 011.2 0l2 2.3 3.1-4.1a.8.8 0 011.3 0L20 18H4.5z" />
    </Svg>
  );
}
export function LiveVideoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path fill="#F3425F" d="M4 6h10a2 2 0 012 2v1.6l3.4-2.3a1 1 0 011.6.8v7.8a1 1 0 01-1.6.8L16 14.4V16a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
      <circle cx="9" cy="12" r="2.2" fill="#fff" />
    </Svg>
  );
}
export function FeelingIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" fill="#F7B928" />
      <circle cx="8.6" cy="9.8" r="1.4" fill="#4b3a1f" />
      <circle cx="15.4" cy="9.8" r="1.4" fill="#4b3a1f" />
      <path d="M7.2 14a5.2 5.2 0 009.6 0z" fill="#4b3a1f" />
    </Svg>
  );
}
export function EmojiIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zM8.5 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm7 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM7.4 13.6c.9 2 2.6 3.2 4.6 3.2s3.7-1.2 4.6-3.2a.8.8 0 00-1.4-.6c-.7 1.4-1.8 2.2-3.2 2.2s-2.5-.8-3.2-2.2a.8.8 0 00-1.4.6z" />
    </Svg>
  );
}
export function GifIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v12h16V6H4zm4.3 2.8c.8 0 1.5.2 2 .7l-.9 1.1a1.7 1.7 0 00-1.1-.4c-.9 0-1.6.8-1.6 1.8s.7 1.8 1.6 1.8c.4 0 .7-.1.9-.3v-.8h-1V11.5h2.4v2.7c-.6.6-1.4.9-2.3.9-1.9 0-3.2-1.4-3.2-3.2S6.5 8.8 8.3 8.8zm3.5.1h1.6v6h-1.6v-6zm2.8 0h4.1v1.4h-2.5v1.1h2.2v1.4h-2.2V15h-1.6V8.9z" />
    </Svg>
  );
}
export function StickerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 3h8.6a1 1 0 01.7.3l5.4 5.4a1 1 0 01.3.7V18a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3zm0 2a1 1 0 00-1 1v12a1 1 0 001 1h11.5c-2.2-.6-3.9-2.4-4.3-4.7-2.3-.4-4.1-2.1-4.7-4.3V5H6zm9 .4V9a1 1 0 001 1h3.6L15 5.4zM9.3 8.2a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
    </Svg>
  );
}
export function CameraIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 4h6a1 1 0 01.8.4L17.5 6H20a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h2.5l1.7-1.6A1 1 0 019 4zm3 5a4 4 0 100 8 4 4 0 000-8zm0 2a2 2 0 110 4 2 2 0 010-4z" />
    </Svg>
  );
}
export function TagIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="4" fill="#1877F2" />
      <path d="M12 13c4.4 0 8 2.5 8 5.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-1.5c0-3 3.6-5.5 8-5.5z" fill="#1877F2" />
    </Svg>
  );
}
export function LocationIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7zm0 4.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" fill="#F5533D" />
    </Svg>
  );
}
export function VideoCameraIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 6h10a2 2 0 012 2v1.6l3.4-2.3a1 1 0 011.6.8v7.8a1 1 0 01-1.6.8L16 14.4V16a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
    </Svg>
  );
}
export function TextBgIcon(p: IconProps) {
  return (
    <svg width={p.size ?? 38} height={p.size ?? 38} viewBox="0 0 38 38" aria-hidden="true">
      <defs>
        <linearGradient id="aa" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ff4d7c" />
          <stop offset=".5" stopColor="#a85cff" />
          <stop offset="1" stopColor="#4a7cff" />
        </linearGradient>
      </defs>
      <rect width="38" height="38" rx="8" fill="url(#aa)" />
      <text x="19" y="25" textAnchor="middle" fontFamily="var(--fb-font)" fontWeight="700" fontSize="17" fill="#fff">
        Aa
      </text>
    </svg>
  );
}

/* ---------- Menus ---------- */
export function BookmarkIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 3h10a2 2 0 012 2v15.4a.6.6 0 01-.95.5L12 17l-6.05 3.9A.6.6 0 015 20.4V5a2 2 0 012-2z" />
    </Svg>
  );
}
export function PencilIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M16.9 3.3a2.5 2.5 0 013.5 0l.3.3a2.5 2.5 0 010 3.5L9.5 18.3a2 2 0 01-.9.5l-4.2 1.1a.7.7 0 01-.9-.9l1.1-4.2c.1-.3.3-.7.5-.9L16.9 3.3zM15.5 6.5l2 2 1.8-1.8-2-2-1.8 1.8z" />
    </Svg>
  );
}
export function TrashIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 3h6a1 1 0 011 1v1h4a1 1 0 010 2h-1v12a3 3 0 01-3 3H8a3 3 0 01-3-3V7H4a1 1 0 010-2h4V4a1 1 0 011-1zm1 2v0h4V5h-4zM7 7v12a1 1 0 001 1h8a1 1 0 001-1V7H7zm3 2.5a.8.8 0 01.8.8v6.4a.8.8 0 01-1.6 0v-6.4a.8.8 0 01.8-.8zm4 0a.8.8 0 01.8.8v6.4a.8.8 0 01-1.6 0v-6.4a.8.8 0 01.8-.8z" />
    </Svg>
  );
}
export function EyeOffIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.3 3.3a1 1 0 011.4 0l16 16a1 1 0 01-1.4 1.4l-2.8-2.8A11 11 0 0112 19c-4.7 0-8.6-2.9-10.4-6.6a1 1 0 010-.8 12.4 12.4 0 014-4.7L3.3 4.7a1 1 0 010-1.4zM12 5c4.7 0 8.6 2.9 10.4 6.6a1 1 0 010 .8 12.5 12.5 0 01-2.8 3.7l-3.3-3.3A4.5 4.5 0 0011.2 7.6L8.8 5.4C9.8 5.1 10.9 5 12 5zm-4.6 4.2a4.5 4.5 0 006.4 6.4l-1.5-1.5a2.5 2.5 0 01-3.4-3.4L7.4 9.2z" />
    </Svg>
  );
}
export function UnfollowIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 3a4.5 4.5 0 110 9 4.5 4.5 0 010-9zm0 11c2.1 0 4 .5 5.4 1.3-.9 1-1.4 2.3-1.4 3.7 0 .7.1 1.4.4 2H3a1 1 0 01-1-1v-1c0-2.8 3.6-5 8-5zm9 1.5l1.4 1.4-1.6 1.6 1.6 1.6-1.4 1.4-1.6-1.6-1.6 1.6-1.4-1.4 1.6-1.6-1.6-1.6 1.4-1.4 1.6 1.6 1.6-1.6z" />
    </Svg>
  );
}
export function ClockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2a10 10 0 110 20 10 10 0 010-20zm0 2a8 8 0 100 16 8 8 0 000-16zm0 3a1 1 0 011 1v3.6l2.7 1.6a1 1 0 11-1 1.7l-3.2-1.9a1 1 0 01-.5-.9V8a1 1 0 011-1z" />
    </Svg>
  );
}
export function CalendarIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 2a1 1 0 011 1v1h8V3a1 1 0 112 0v1h1a3 3 0 013 3v11a3 3 0 01-3 3H5a3 3 0 01-3-3V7a3 3 0 013-3h1V3a1 1 0 011-1zm13 8H4v8a1 1 0 001 1h14a1 1 0 001-1v-8zm-12 2a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
    </Svg>
  );
}
export function SettingsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10.3 2h3.4a1 1 0 011 .8l.4 2.3c.6.3 1.1.6 1.6 1l2.2-.8a1 1 0 011.2.4l1.7 2.9a1 1 0 01-.2 1.3l-1.8 1.5a7.6 7.6 0 010 1.9l1.8 1.5a1 1 0 01.2 1.3l-1.7 2.9a1 1 0 01-1.2.4l-2.2-.8c-.5.4-1 .7-1.6 1l-.4 2.3a1 1 0 01-1 .8h-3.4a1 1 0 01-1-.8l-.4-2.3c-.6-.3-1.1-.6-1.6-1l-2.2.8a1 1 0 01-1.2-.4l-1.7-2.9a1 1 0 01.2-1.3l1.8-1.5a7.6 7.6 0 010-1.9L2.4 9.9a1 1 0 01-.2-1.3l1.7-2.9a1 1 0 011.2-.4l2.2.8c.5-.4 1-.7 1.6-1l.4-2.3a1 1 0 011-.8zM12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" />
    </Svg>
  );
}
export function HelpIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2a10 10 0 110 20 10 10 0 010-20zm0 14.3a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4zM12 6a4 4 0 00-4 4 1 1 0 102 0 2 2 0 114 0c0 .7-.3 1-1.2 1.6-1 .7-1.8 1.4-1.8 2.9a1 1 0 102 0c0-.6.2-.8 1-1.3 1-.7 2-1.5 2-3.2a4 4 0 00-4-4z" />
    </Svg>
  );
}
export function MoonIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12.6 2.1a1 1 0 01.2 1.1 8 8 0 0010 10 1 1 0 011.1 1.3A10 10 0 1111.5 1.9a1 1 0 011.1.2z" />
    </Svg>
  );
}
export function FeedbackIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 3h16a2 2 0 012 2v11a2 2 0 01-2 2h-8.6l-4.7 3.5A.7.7 0 015.5 21v-3H4a2 2 0 01-2-2V5a2 2 0 012-2zm8 3.5a1.2 1.2 0 00-1.2 1.2v3.6a1.2 1.2 0 002.4 0V7.7A1.2 1.2 0 0012 6.5zm0 7.2a1.3 1.3 0 100 2.6 1.3 1.3 0 000-2.6z" />
    </Svg>
  );
}
export function LogoutIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 3h8a2 2 0 012 2v3a1 1 0 11-2 0V5H5v14h8v-3a1 1 0 112 0v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm12.3 5.3a1 1 0 011.4 0l3 3a1 1 0 010 1.4l-3 3a1 1 0 01-1.4-1.4l1.3-1.3H10a1 1 0 110-2h8.6l-1.3-1.3a1 1 0 010-1.4z" />
    </Svg>
  );
}
export function CakeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2c.8 1 1.5 2 1.5 3a1.5 1.5 0 11-3 0c0-1 .7-2 1.5-3zm-1 6h2v2.5h3.5A2.5 2.5 0 0119 13v1.3c-.7.5-1.4.7-2 .7-.9 0-1.5-.4-2.5-1-1 .6-1.6 1-2.5 1s-1.5-.4-2.5-1c-1 .6-1.6 1-2.5 1-.6 0-1.3-.2-2-.7V13a2.5 2.5 0 012.5-2.5H11V8zM5 16.2c.7.4 1.4.6 2 .6.9 0 1.5-.4 2.5-1 1 .6 1.6 1 2.5 1s1.5-.4 2.5-1c1 .6 1.6 1 2.5 1 .6 0 1.3-.2 2-.6V20a2 2 0 01-2 2H7a2 2 0 01-2-2v-3.8z" fill="#F7B928" />
    </Svg>
  );
}
export function UsersIcon(p: IconProps) {
  return <FriendsIcon active {...p} />;
}
export function ThumbTabIcon(p: IconProps) {
  return <LikeFilledIcon {...p} />;
}

/* ---------- Left rail 36px coloured icons ---------- */
function RailBase({children, size = 36}: {children: React.ReactNode; size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      {children}
    </svg>
  );
}
const blue = (id: string) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#19AFFF" />
      <stop offset="1" stopColor="#0062E0" />
    </linearGradient>
  </defs>
);
export function RailFriendsIcon() {
  return (
    <RailBase>
      {blue('rf')}
      <circle cx="18" cy="18" r="18" fill="url(#rf)" />
      <circle cx="14.5" cy="13" r="4.2" fill="#fff" />
      <path d="M6.5 26c0-4.5 3.6-7.5 8-7.5s8 3 8 7.5a1 1 0 01-1 1h-14a1 1 0 01-1-1z" fill="#fff" />
      <circle cx="23.5" cy="13.5" r="3.2" fill="#fff" opacity=".85" />
      <path d="M24 18.6c3.3.3 5.5 2.7 5.5 6.4a1 1 0 01-1 1h-4.3c.2-.6.3-1.3.3-2 0-2.1-.8-4-2.2-5.4.6 0 1.1 0 1.7 0z" fill="#fff" opacity=".85" />
    </RailBase>
  );
}
export function RailMemoriesIcon() {
  return (
    <RailBase>
      {blue('rm')}
      <circle cx="18" cy="18" r="18" fill="url(#rm)" />
      <circle cx="18" cy="18" r="10" fill="none" stroke="#fff" strokeWidth="2.6" />
      <path d="M18 11.5V18l4.5 2.8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </RailBase>
  );
}
export function RailSavedIcon() {
  return (
    <RailBase>
      <defs>
        <linearGradient id="rs" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C56EFF" />
          <stop offset="1" stopColor="#8A2BE2" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="18" fill="url(#rs)" />
      <path d="M12.5 9h11a1.5 1.5 0 011.5 1.5v16.3a.7.7 0 01-1.1.6L18 23.5l-5.9 3.9a.7.7 0 01-1.1-.6V10.5A1.5 1.5 0 0112.5 9z" fill="#fff" />
    </RailBase>
  );
}
export function RailGroupsIcon() {
  return (
    <RailBase>
      {blue('rg')}
      <circle cx="18" cy="18" r="18" fill="url(#rg)" />
      <circle cx="18" cy="13" r="3.8" fill="#fff" />
      <circle cx="10.5" cy="15" r="2.6" fill="#fff" />
      <circle cx="25.5" cy="15" r="2.6" fill="#fff" />
      <path d="M11.5 25.5c0-3.8 2.9-6.5 6.5-6.5s6.5 2.7 6.5 6.5a.8.8 0 01-.8.8H12.3a.8.8 0 01-.8-.8z" fill="#fff" />
      <path d="M6 24c0-2.4 1.8-4.2 4.3-4.2.5 0 1 .1 1.4.2A8.2 8.2 0 0010 25.5v.8H6.8A.8.8 0 016 25.5V24zM30 24c0-2.4-1.8-4.2-4.3-4.2-.5 0-1 .1-1.4.2A8.2 8.2 0 0126 25.5v.8h3.2a.8.8 0 00.8-.8V24z" fill="#fff" opacity=".85" />
    </RailBase>
  );
}
export function RailVideoIcon() {
  return (
    <RailBase>
      {blue('rv')}
      <circle cx="18" cy="18" r="18" fill="url(#rv)" />
      <rect x="8" y="10.5" width="20" height="15" rx="3" fill="#fff" />
      <path d="M15.5 14.3v7.4a.6.6 0 00.9.5l5.9-3.7a.6.6 0 000-1l-5.9-3.7a.6.6 0 00-.9.5z" fill="#0062E0" />
    </RailBase>
  );
}
export function RailMarketplaceIcon() {
  return (
    <RailBase>
      {blue('rmk')}
      <circle cx="18" cy="18" r="18" fill="url(#rmk)" />
      <path d="M10.2 9h15.6a1 1 0 011 .7l1.1 3.4c.1.3.1.5.1.8a3 3 0 01-6 .3 3 3 0 01-6 0 3 3 0 01-6-.3c0-.3 0-.5.1-.8l1.1-3.4a1 1 0 011-.7z" fill="#fff" />
      <path d="M10 17.3c.6.3 1.3.5 2 .5 1.1 0 2.2-.4 3-1.1V26a1 1 0 001 1h4a1 1 0 001-1v-9.3c.8.7 1.9 1.1 3 1.1.7 0 1.4-.2 2-.5V26a2 2 0 01-2 2H12a2 2 0 01-2-2v-8.7z" fill="#fff" />
    </RailBase>
  );
}
export function RailFeedsIcon() {
  return (
    <RailBase>
      {blue('rfd')}
      <circle cx="18" cy="18" r="18" fill="url(#rfd)" />
      <rect x="9" y="9" width="18" height="4" rx="2" fill="#fff" />
      <rect x="9" y="16" width="18" height="4" rx="2" fill="#fff" />
      <rect x="9" y="23" width="12" height="4" rx="2" fill="#fff" />
    </RailBase>
  );
}
export function RailEventsIcon() {
  return (
    <RailBase>
      <defs>
        <linearGradient id="re" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF6D6D" />
          <stop offset="1" stopColor="#E41E3F" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="18" fill="url(#re)" />
      <rect x="9" y="10" width="18" height="17" rx="3" fill="#fff" />
      <rect x="9" y="10" width="18" height="5" rx="2" fill="#B5162F" />
      <rect x="12.5" y="7.5" width="2.5" height="5" rx="1.2" fill="#fff" />
      <rect x="21" y="7.5" width="2.5" height="5" rx="1.2" fill="#fff" />
      <rect x="12" y="18" width="4" height="4" rx="1" fill="#E41E3F" />
    </RailBase>
  );
}
export function RailAdsIcon() {
  return (
    <RailBase>
      {blue('ra')}
      <circle cx="18" cy="18" r="18" fill="url(#ra)" />
      <rect x="9" y="19" width="4.5" height="8" rx="1.5" fill="#fff" />
      <rect x="15.75" y="14" width="4.5" height="13" rx="1.5" fill="#fff" />
      <rect x="22.5" y="9" width="4.5" height="18" rx="1.5" fill="#fff" />
    </RailBase>
  );
}
export function RailPagesIcon() {
  return (
    <RailBase>
      <defs>
        <linearGradient id="rp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF9A4D" />
          <stop offset="1" stopColor="#F2711C" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="18" fill="url(#rp)" />
      <path d="M12 8h9l5 5v14a1.5 1.5 0 01-1.5 1.5h-12.5A1.5 1.5 0 0110.5 27V9.5A1.5 1.5 0 0112 8z" fill="#fff" />
      <rect x="14" y="17" width="9" height="2" rx="1" fill="#F2711C" />
      <rect x="14" y="21" width="9" height="2" rx="1" fill="#F2711C" />
    </RailBase>
  );
}
export function RailGamingIcon() {
  return (
    <RailBase>
      {blue('rgm')}
      <circle cx="18" cy="18" r="18" fill="url(#rgm)" />
      <path d="M13 11h10a6 6 0 016 6v2.6a3.4 3.4 0 01-6.1 2L21.6 20h-7.2l-1.3 1.6A3.4 3.4 0 017 19.6V17a6 6 0 016-6zm.5 3.2a.9.9 0 00-.9.9v1.1h-1.1a.9.9 0 000 1.8h1.1v1.1a.9.9 0 001.8 0V18h1.1a.9.9 0 000-1.8h-1.1v-1.1a.9.9 0 00-.9-.9zM22 14.5a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4zm2.8 2.3a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z" fill="#fff" />
    </RailBase>
  );
}
export function RailMessengerIcon() {
  return (
    <RailBase>
      <defs>
        <linearGradient id="rmsg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00B2FF" />
          <stop offset=".5" stopColor="#A033FF" />
          <stop offset="1" stopColor="#FF5280" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="18" fill="url(#rmsg)" />
      <path d="M18 8c-5.6 0-10 4.2-10 9.7 0 3 1.3 5.6 3.5 7.4.2.2.3.4.3.6l.1 2.1c0 .6.7 1.1 1.3.8l2.3-1c.2-.1.4-.1.6-.1.6.2 1.3.3 1.9.3 5.6 0 10-4.2 10-9.7S23.6 8 18 8zm6 7.5l-2.9 4.6c-.5.7-1.5.9-2.2.4l-2.3-1.7a.6.6 0 00-.7 0l-3.2 2.4c-.4.3-1-.2-.7-.6l2.9-4.6c.5-.7 1.5-.9 2.2-.4l2.3 1.7a.6.6 0 00.7 0l3.2-2.4c.4-.3 1 .2.7.6z" fill="#fff" />
    </RailBase>
  );
}
export function RailFundraiserIcon() {
  return (
    <RailBase>
      <defs>
        <linearGradient id="rfu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF7AA8" />
          <stop offset="1" stopColor="#E0245E" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="18" fill="url(#rfu)" />
      <path d="M18 27.5l-1.3-1.2C11.4 21.6 8 18.5 8 14.7 8 11.6 10.4 9 13.4 9c1.8 0 3.5.8 4.6 2.2A6 6 0 0122.6 9c3 0 5.4 2.6 5.4 5.7 0 3.8-3.4 6.9-8.7 11.6L18 27.5z" fill="#fff" />
    </RailBase>
  );
}
export function RailReelsIcon() {
  return (
    <RailBase>
      <defs>
        <linearGradient id="rr" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF6A88" />
          <stop offset="1" stopColor="#FF2D55" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="18" fill="url(#rr)" />
      <rect x="9" y="9" width="18" height="18" rx="4.5" fill="none" stroke="#fff" strokeWidth="2.4" />
      <path d="M9.5 14.5h17M14.5 9.5l3 5M20.5 9.5l3 5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16.2 17.8v5.4a.5.5 0 00.8.4l4.2-2.7a.5.5 0 000-.8l-4.2-2.7a.5.5 0 00-.8.4z" fill="#fff" />
    </RailBase>
  );
}
export function RailClimateIcon() {
  return (
    <RailBase>
      <defs>
        <linearGradient id="rc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5BE28A" />
          <stop offset="1" stopColor="#1E9E4F" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r="18" fill="url(#rc)" />
      <path d="M26 10c-9 0-14.5 5-15.5 13.5 3.5-5.5 8-8.5 13.5-9.5-5 2.5-8.5 6-10.5 12 1 .3 2 .5 3 .5 7 0 10.5-6 9.5-16.5z" fill="#fff" />
    </RailBase>
  );
}
export function RailOrdersIcon() {
  return (
    <RailBase>
      {blue('ro')}
      <circle cx="18" cy="18" r="18" fill="url(#ro)" />
      <rect x="8" y="11" width="20" height="14" rx="2.5" fill="#fff" />
      <rect x="8" y="14.5" width="20" height="3" fill="#0062E0" />
      <rect x="11" y="20" width="6" height="2" rx="1" fill="#0062E0" />
    </RailBase>
  );
}

/* ---------- Reactions ---------- */
export function ReactionIcon({type, size = 18}: {type: ReactionType; size?: number}) {
  const common = {width: size, height: size, viewBox: '0 0 16 16', 'aria-label': type} as const;
  switch (type) {
    case 'like':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="8" fill="#0866FF" />
          <path
            d="M4.6 7.3h1.4v4.7H4.6a.5.5 0 01-.5-.5V7.8a.5.5 0 01.5-.5zm2.1 0l2-3.6c.2-.3.5-.5.8-.3.5.2.8.7.7 1.2l-.3 1.8h2.1a1 1 0 011 1.2l-.5 3.3a1 1 0 01-1 .8H6.7V7.3z"
            fill="#fff"
          />
        </svg>
      );
    case 'love':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="8" fill="#F33E58" />
          <path d="M8 12.2l-.6-.5C5 9.6 3.6 8.3 3.6 6.7 3.6 5.4 4.6 4.4 5.9 4.4c.8 0 1.5.4 2.1 1 .6-.6 1.3-1 2.1-1 1.3 0 2.3 1 2.3 2.3 0 1.6-1.4 2.9-3.8 5L8 12.2z" fill="#fff" />
        </svg>
      );
    case 'care':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="8" fill="#F7B125" />
          <circle cx="5.8" cy="6.3" r=".9" fill="#5a3a12" />
          <circle cx="10.2" cy="6.3" r=".9" fill="#5a3a12" />
          <path d="M5.6 8.7c.6.9 1.4 1.3 2.4 1.3s1.8-.4 2.4-1.3" stroke="#5a3a12" strokeWidth=".9" fill="none" strokeLinecap="round" />
          <path d="M8 13.6l-.4-.3C6 12.1 5 11.2 5 10.2c0-.8.6-1.4 1.4-1.4.5 0 .9.2 1.3.6.3-.4.8-.6 1.3-.6.8 0 1.4.6 1.4 1.4 0 1-1 1.9-2.6 3.1l-.4.3z" fill="#F33E58" stroke="#F7B125" strokeWidth=".5" />
        </svg>
      );
    case 'haha':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="8" fill="#F7B125" />
          <path d="M4.3 6.4l2.6-1M11.7 6.4l-2.6-1" stroke="#5a3a12" strokeWidth=".9" strokeLinecap="round" />
          <path d="M4 8.6c.3 2.3 2 3.9 4 3.9s3.7-1.6 4-3.9c0-.3-.2-.5-.5-.5h-7c-.3 0-.5.2-.5.5z" fill="#5a3a12" />
          <path d="M5.4 11.5c.7.6 1.6 1 2.6 1s1.9-.4 2.6-1c-.5-.7-1.5-1.1-2.6-1.1s-2.1.4-2.6 1.1z" fill="#F33E58" />
        </svg>
      );
    case 'wow':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="8" fill="#F7B125" />
          <ellipse cx="5.7" cy="6.2" rx=".9" ry="1.2" fill="#5a3a12" />
          <ellipse cx="10.3" cy="6.2" rx=".9" ry="1.2" fill="#5a3a12" />
          <path d="M4.5 4.2c.4-.5 1-.7 1.7-.6M11.5 4.2c-.4-.5-1-.7-1.7-.6" stroke="#5a3a12" strokeWidth=".8" strokeLinecap="round" fill="none" />
          <ellipse cx="8" cy="10.6" rx="1.6" ry="2.2" fill="#5a3a12" />
        </svg>
      );
    case 'sad':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="8" fill="#F7B125" />
          <path d="M4.3 6.7c.5-.7 1.2-1 2-.9M11.7 6.7c-.5-.7-1.2-1-2-.9" stroke="#5a3a12" strokeWidth=".9" strokeLinecap="round" fill="none" />
          <circle cx="5.9" cy="7.6" r=".8" fill="#5a3a12" />
          <circle cx="10.1" cy="7.6" r=".8" fill="#5a3a12" />
          <path d="M6 11.8c.5-.6 1.2-.9 2-.9s1.5.3 2 .9" stroke="#5a3a12" strokeWidth=".9" strokeLinecap="round" fill="none" />
          <path d="M11.6 8.8c-.6.9-1 1.7-1 2.3 0 .6.4 1 1 1s1-.4 1-1c0-.6-.4-1.4-1-2.3z" fill="#2B9BFF" />
        </svg>
      );
    case 'angry':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id="angry-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#E9710F" />
              <stop offset="1" stopColor="#D8452F" />
            </linearGradient>
          </defs>
          <circle cx="8" cy="8" r="8" fill="url(#angry-g)" />
          <path d="M4.4 6.6l2.3 1M11.6 6.6l-2.3 1" stroke="#3b1a0b" strokeWidth=".9" strokeLinecap="round" />
          <circle cx="6" cy="8.5" r=".8" fill="#3b1a0b" />
          <circle cx="10" cy="8.5" r=".8" fill="#3b1a0b" />
          <path d="M6 11.6h4" stroke="#3b1a0b" strokeWidth="1" strokeLinecap="round" />
        </svg>
      );
  }
}

export const REACTIONS: {type: ReactionType; label: string; color: string}[] = [
  {type: 'like', label: 'Like', color: '#0866FF'},
  {type: 'love', label: 'Love', color: '#F33E58'},
  {type: 'care', label: 'Care', color: '#F7B125'},
  {type: 'haha', label: 'Haha', color: '#F7B125'},
  {type: 'wow', label: 'Wow', color: '#F7B125'},
  {type: 'sad', label: 'Sad', color: '#F7B125'},
  {type: 'angry', label: 'Angry', color: '#E9710F'},
];

export function RailMetaAIIcon() {
  return (
    <RailBase>
      <defs>
        <linearGradient id="mai" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0866FF" />
          <stop offset="0.5" stopColor="#A033FF" />
          <stop offset="1" stopColor="#FF5C87" />
        </linearGradient>
      </defs>
      {[0, 60, 120, 180, 240, 300].map(a => (
        <ellipse key={a} cx="18" cy="9.5" rx="4.6" ry="8.5" fill="url(#mai)" transform={`rotate(${a} 18 18)`} opacity="0.92" />
      ))}
      <circle cx="18" cy="18" r="4" fill="#fff" />
    </RailBase>
  );
}

export function ComposeIcon(p: IconProps) {
  return (
    <Svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4.5H6.5A2.5 2.5 0 004 7v10.5A2.5 2.5 0 006.5 20H17a2.5 2.5 0 002.5-2.5V12" />
      <path d="M17.8 3.7a1.9 1.9 0 012.7 2.7L12 14.9l-3.7.9.9-3.7z" />
    </Svg>
  );
}

export function WarningIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2a10 10 0 110 20 10 10 0 010-20zm0 13.3a1.3 1.3 0 100 2.6 1.3 1.3 0 000-2.6zM12 6a1.1 1.1 0 00-1.1 1.2l.4 5.6a.7.7 0 001.4 0l.4-5.6A1.1 1.1 0 0012 6z" />
    </Svg>
  );
}

export function ExpandIcon(p: IconProps) {
  return (
    <Svg {...p} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
    </Svg>
  );
}
