import Image from 'next/image';
import type {CSSProperties} from 'react';

export function Avatar({
  src,
  alt,
  size = 40,
  online = false,
  style,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  online?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: size,
        height: size,
        flexShrink: 0,
        ...style,
      }}>
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        style={{width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block'}}
      />
      {online && (
        <span
          aria-label="Active now"
          style={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            width: Math.max(8, Math.round(size * 0.3)),
            height: Math.max(8, Math.round(size * 0.3)),
            borderRadius: '50%',
            background: 'var(--fb-online)',
            border: '2px solid var(--fb-card)',
          }}
        />
      )}
    </span>
  );
}
