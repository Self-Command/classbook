import type { ReactNode } from 'react';
import { Alert, Button, Card, Skeleton, Spinner, cn } from '@heroui/react';
import { IconAlert } from './icons';

export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6 sm:py-12',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-medium tracking-[0.24em] text-accent">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 font-display text-3xl leading-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-xl leading-tight text-foreground sm:text-2xl">
          {title}
        </h2>
        {description ? <p className="mt-1 text-xs leading-5 text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function FullPageLoading({ label = '正在加载…' }: { label?: string }) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 py-16 text-center"
      aria-busy="true"
      aria-live="polite"
    >
      <Spinner size="lg" color="accent" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-2.5 w-16 rounded-full" />
        </div>
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton
            key={index}
            className={cn('h-3 rounded-full', index % 2 === 0 ? 'w-full' : 'w-4/5')}
          />
        ))}
      </div>
    </Card>
  );
}

export function LoadingGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ErrorPanel({
  title = '内容加载失败',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Alert status="danger">
      <Alert.Indicator>
        <IconAlert className="size-5" />
      </Alert.Indicator>
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
      {onRetry ? (
        <Button size="sm" variant="danger-soft" onPress={onRetry}>
          重新加载
        </Button>
      ) : null}
    </Alert>
  );
}

export function EmptyPanel({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <Card
      variant="transparent"
      className={cn('border border-dashed border-border', compact ? 'p-5' : 'p-8')}
    >
      <div className="flex flex-col items-center text-center">
        {icon ? (
          <span className="grid size-11 place-items-center rounded-full bg-accent/10 text-accent">
            {icon}
          </span>
        ) : null}
        <h3 className="mt-3 font-display text-lg text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted">{description}</p>
        ) : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </Card>
  );
}
