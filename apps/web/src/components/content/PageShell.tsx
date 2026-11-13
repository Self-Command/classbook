import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconChevronLeft } from '@/components/icons';

interface PageShellProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  back?: ReactNode;
  children: ReactNode;
}

export function PageShell({
  eyebrow,
  title,
  description,
  action,
  back,
  children,
}: PageShellProps) {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6 sm:py-12">
      {back && <div className="mb-5">{back}</div>}

      <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-medium tracking-[0.3em] text-accent">{eyebrow}</p>
          )}
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {children}
    </div>
  );
}

interface BackLinkProps {
  to: string;
  children: ReactNode;
}

export function BackLink({ to, children }: BackLinkProps) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-full text-xs text-muted transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <IconChevronLeft className="size-3.5" />
      {children}
    </Link>
  );
}
