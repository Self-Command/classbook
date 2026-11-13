import type { ReactNode } from 'react';
import { IconHeart } from './icons';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[18px] border border-dashed border-ink/15 bg-white/40 px-6 text-center ${
        compact ? 'py-8' : 'py-14'
      }`}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-cream text-ink-faint">
        {icon ?? <IconHeart className="h-5 w-5" />}
      </span>
      <h3 className="mt-3 font-display text-lg text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-md text-sm leading-6 text-ink-faint">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
