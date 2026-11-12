import type {CSSProperties} from 'react';
import {Avatar} from '@/components/ui/Avatar';

/** Avatar that also accepts base64 data URLs (next/image rejects `data:`). */
export function ChatAvatar({src, alt = '', size = 40, online = false, style, className}: {src: string; alt?: string; size?: number; online?: boolean; style?: CSSProperties; className?: string}) {
  if (!src.startsWith('data:')) return <Avatar src={src} alt={alt} size={size} online={online} style={style} className={className} />;
  return (
    <span className={className} style={{position: 'relative', display: 'inline-block', width: size, height: size, flexShrink: 0, ...style}}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={size} height={size} style={{width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block'}} />
      {online && (
        <span
          aria-label="Active now"
          style={{position: 'absolute', right: -1, bottom: -1, width: Math.max(8, Math.round(size * 0.3)), height: Math.max(8, Math.round(size * 0.3)), borderRadius: '50%', background: 'var(--fb-online)', border: '2px solid var(--fb-card)'}}
        />
      )}
    </span>
  );
}

/** Two overlapping avatars for unnamed groups without a photo. */
export function GroupAvatar({srcs, size = 56}: {srcs: string[]; size?: number}) {
  if (srcs.length < 2) return <ChatAvatar src={srcs[0] ?? ''} size={size} />;
  const small = Math.round(size * 0.64);
  return (
    <span style={{position: 'relative', display: 'inline-block', width: size, height: size, flexShrink: 0}}>
      <ChatAvatar src={srcs[1]} size={small} style={{position: 'absolute', top: 0, right: 0}} />
      <ChatAvatar src={srcs[0]} size={small} style={{position: 'absolute', bottom: 0, left: 0, outline: '2px solid var(--fb-card)', borderRadius: '50%'}} />
    </span>
  );
}
