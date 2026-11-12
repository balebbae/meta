import Image, {type ImageProps} from 'next/image';
import type {CSSProperties} from 'react';

/**
 * Drop-in for `next/image`. Uploaded profile / cover photos are stored as base64 `data:` URLs, which the
 * image optimizer cannot (and should not) process, so those render as a plain <img>.
 */
export default function SmartImage(props: ImageProps) {
  const {src} = props;
  if (typeof src !== 'string' || !src.startsWith('data:')) return <Image {...props} />;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {fill, priority, sizes, quality, placeholder, blurDataURL, loader, unoptimized, overrideSrc, alt, style, width, height, ...rest} = props;
  const fillStyle: CSSProperties | undefined = fill ? {position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'} : undefined;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...rest} src={src} alt={alt} width={fill ? undefined : width} height={fill ? undefined : height} decoding="async" style={{...fillStyle, ...style}} />
  );
}
