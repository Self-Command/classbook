import { Avatar } from '@heroui/react';

interface UserAvatarProps {
  name?: string | null;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UserAvatar({ name, src, size = 'md', className }: UserAvatarProps) {
  const label = (name ?? '').trim();
  const initial = label.slice(0, 1) || '拾';

  return (
    <Avatar size={size} color="accent" className={className}>
      {src ? <Avatar.Image alt={label ? `${label}的头像` : '同学头像'} src={src} /> : null}
      <Avatar.Fallback>{initial}</Avatar.Fallback>
    </Avatar>
  );
}
