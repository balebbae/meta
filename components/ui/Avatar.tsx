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
  const imgStyle: CSSProperties = {width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block'};
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
      {src.startsWith('data:') ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} width={size} height={size} style={imgStyle} />
      ) : (
        <Image src={src} alt={alt} width={size} height={size} style={imgStyle} />
      )}
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
