import { useEffect, useState } from 'react';
import { cx } from '@/lib/styles';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'fill';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-7 w-7 text-[11px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-base',
  lg: 'h-20 w-20 text-2xl',
  xl: 'h-28 w-28 text-4xl',
  fill: 'h-full w-full text-5xl',
};

const palettes = ['bg-ink-soft', 'bg-sage', 'bg-coral', 'bg-ink'];

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const displayName = name.trim() || '同学';
  const initial = Array.from(displayName)[0] ?? '同';
  const paletteIndex =
    Array.from(displayName).reduce(
      (sum, character) => sum + (character.codePointAt(0) ?? 0),
      0,
    ) % palettes.length;

  return (
    <span
      className={cx(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-cream font-display leading-none text-paper ring-1 ring-ink/10',
        sizeClasses[size],
        className,
      )}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={`${displayName}的头像`}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={cx('grid h-full w-full place-items-center', palettes[paletteIndex])}>
          {initial}
        </span>
      )}
    </span>
  );
}
