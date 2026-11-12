type P = {size?: number; className?: string};

const base = (size: number) => ({width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true as const});

export function PhoneIcon({size = 20, className}: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2a1 1 0 011-.25c1.1.37 2.3.57 3.6.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1z" />
    </svg>
  );
}
export function VideoCallIcon({size = 20, className}: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 6a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2v-2.6l4.4 2.5a.8.8 0 001.2-.7V8.8a.8.8 0 00-1.2-.7L16 10.6V8a2 2 0 00-2-2z" />
    </svg>
  );
}
export function InfoCircleIcon({size = 20, className}: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 4.5a1.4 1.4 0 110 2.8 1.4 1.4 0 010-2.8zM10.3 10.5h2.6v6h1.1v1.7h-4v-1.7h1.1v-4.3h-.8z" />
    </svg>
  );
}
export function PlusCircleIcon({size = 20, className}: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 9h3.5a1 1 0 010 2H13v3.5a1 1 0 01-2 0V13H7.5a1 1 0 010-2H11V7.5a1 1 0 012 0z" />
    </svg>
  );
}
export function ImageIcon({size = 20, className}: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 3h14a3 3 0 013 3v12a3 3 0 01-3 3H5a3 3 0 01-3-3V6a3 3 0 013-3zm0 2a1 1 0 00-1 1v9.6l3.6-3.6a1.5 1.5 0 012.1 0l2.3 2.3 4.3-4.3a1.5 1.5 0 012.1 0L20 11.6V6a1 1 0 00-1-1zm3 3a1.8 1.8 0 110 3.6A1.8 1.8 0 018 8z" />
    </svg>
  );
}
export function StickerSquareIcon({size = 20, className}: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 2h12a4 4 0 014 4v7.2a2 2 0 01-.6 1.4l-6.8 6.8a2 2 0 01-1.4.6H6a4 4 0 01-4-4V6a4 4 0 014-4zm3 6.5a1.3 1.3 0 100 2.6 1.3 1.3 0 000-2.6zm6 0a1.3 1.3 0 100 2.6 1.3 1.3 0 000-2.6zM8.3 13.6a.9.9 0 00-.1 1.3A5.4 5.4 0 0012 16.5a.9.9 0 100-1.8 3.6 3.6 0 01-2.5-1 .9.9 0 00-1.2-.1zM14 21v-4.5a2.5 2.5 0 012.5-2.5H21z" />
    </svg>
  );
}
export function GifSquareIcon({size = 20, className}: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 3h14a3 3 0 013 3v12a3 3 0 01-3 3H5a3 3 0 01-3-3V6a3 3 0 013-3zm3.2 6.3c-1.7 0-2.8 1.2-2.8 2.9s1.1 2.9 2.8 2.9c1 0 1.7-.4 2.1-.9v-2.3H8.1v1h1.1v.9c-.2.2-.5.3-.9.3-.9 0-1.5-.7-1.5-1.9s.6-1.9 1.5-1.9c.5 0 .9.2 1.2.6l.9-.7c-.5-.6-1.2-.9-2.2-.9zm3.3.1v5.6h1.3V9.4zm2.5 0v5.6h1.3v-2.2h2.2v-1h-2.2v-1.3h2.5v-1.1z" />
    </svg>
  );
}
export function ThumbIcon({size = 20, className}: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M2 10.5A1.5 1.5 0 013.5 9h2A1.5 1.5 0 017 10.5v9A1.5 1.5 0 015.5 21h-2A1.5 1.5 0 012 19.5zM9 10.3c0-.6.2-1.1.6-1.5L13.5 4a1.6 1.6 0 012.7 1.1c0 .2 0 .4-.1.6L15.2 9H20a2 2 0 012 2.3l-1.2 7.1A3 3 0 0117.9 21H11a2 2 0 01-2-2z" />
    </svg>
  );
}
export function SendIcon({size = 20, className}: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3.4 3.3a1 1 0 011.1-.2l16 8a1 1 0 010 1.8l-16 8A1 1 0 013 20l1.7-6.9L12 12 4.7 10.9 3 4a1 1 0 01.4-.7z" />
    </svg>
  );
}
export function MicIcon({size = 20, className}: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 15a4 4 0 004-4V6a4 4 0 00-8 0v5a4 4 0 004 4zm6-4a1 1 0 112 0 8 8 0 01-7 7.9V21h2a1 1 0 110 2H9a1 1 0 110-2h2v-2.1A8 8 0 014 11a1 1 0 112 0 6 6 0 0012 0z" />
    </svg>
  );
}
export function BellOffIcon({size = 20, className}: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 22a2.5 2.5 0 002.5-2.5h-5A2.5 2.5 0 0012 22zM19 16V11a7 7 0 00-5.3-6.8V3.5a1.7 1.7 0 10-3.4 0v.7A7 7 0 005 11v5l-2 2v1h18v-1zM3.3 2.3l18.4 18.4-1.4 1.4L1.9 3.7z" />
    </svg>
  );
}
export function UserCircleIcon({size = 20, className}: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a3.5 3.5 0 110 7 3.5 3.5 0 010-7zm0 14a8 8 0 01-5.8-2.5C7 15.6 9.3 14.5 12 14.5s5 1.1 5.8 3A8 8 0 0112 20z" />
    </svg>
  );
}
export function LeaveIcon({size = 20, className}: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M10 3a1 1 0 011 1v1H6v14h5v1a1 1 0 01-1 1H5a2 2 0 01-2-2V5a2 2 0 012-2zm6.3 4.3a1 1 0 011.4 0l4 4a1 1 0 010 1.4l-4 4a1 1 0 01-1.4-1.4L18.6 13H10a1 1 0 110-2h8.6l-2.3-2.3a1 1 0 010-1.4z" />
    </svg>
  );
}
export function SearchSmallIcon({size = 16, className}: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M10 2a8 8 0 016.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1110 2zm0 2a6 6 0 100 12 6 6 0 000-12z" />
    </svg>
  );
}
