import { Avatar } from '@heroui/react';

interface ProfileAvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProfileAvatar({ name, src, size = 'md', className }: ProfileAvatarProps) {
  const label = name.trim();
  const alt = label ? `${label}的头像` : '同学头像';
  const fallback = label ? Array.from(label)[0] : '同';

  return (
    <Avatar aria-label={alt} className={className} color="accent" size={size} variant="soft">
      {src ? <Avatar.Image alt={alt} loading="lazy" src={src} /> : null}
      <Avatar.Fallback>{fallback}</Avatar.Fallback>
    </Avatar>
  );
}
