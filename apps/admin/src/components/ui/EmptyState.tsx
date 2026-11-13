import type { ReactNode } from 'react';
import { EmptyState as HeroEmptyState } from '@heroui/react';
import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: IconName;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon = 'info',
  action,
  className,
}: EmptyStateProps) {
  return (
    <HeroEmptyState
      className={[
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center',
        className ?? '',
      ].join(' ')}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-default text-muted">
        <Icon name={icon} className="size-5" />
      </span>
      <div>
        <p className="font-display text-lg text-foreground">{title}</p>
        {description ? (
          <p className="mt-1 max-w-md text-sm leading-6 text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </HeroEmptyState>
  );
}
