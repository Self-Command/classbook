import type { ReactNode } from 'react';
import { Button, Card, EmptyState, Spinner } from '@heroui/react';
import { IconClose } from '@/components/icons';

interface EmptyPanelProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyPanel({ icon, title, description, action }: EmptyPanelProps) {
  return (
    <EmptyState className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-surface/70 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
        {icon}
      </span>
      <h2 className="font-display text-xl text-foreground">{title}</h2>
      {description && (
        <p className="max-w-md text-sm leading-6 text-muted">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </EmptyState>
  );
}

interface ErrorPanelProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorPanel({ title = '暂时无法加载', message, onRetry }: ErrorPanelProps) {
  return (
    <Card className="mx-auto max-w-xl items-center gap-3 rounded-3xl border border-danger/20 bg-danger-soft/40 py-10 text-center shadow-none">
      <span className="grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger">
        <IconClose className="size-5" />
      </span>
      <h2 className="font-display text-xl text-foreground">{title}</h2>
      <p className="max-w-md text-sm leading-6 text-muted">{message}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" onPress={onRetry}>
          重试
        </Button>
      )}
    </Card>
  );
}

interface LoadingPanelProps {
  label?: string;
}

export function LoadingPanel({ label = '正在加载…' }: LoadingPanelProps) {
  return (
    <div
      className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-sm text-muted"
      role="status"
    >
      <Spinner color="accent" size="lg" />
      <span>{label}</span>
    </div>
  );
}
