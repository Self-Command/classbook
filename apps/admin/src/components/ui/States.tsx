import { Alert, Button, Spinner } from '@heroui/react';

export function LoadingBlock({ label = '加载中…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted" role="status">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function FullPageLoading({ label = '正在验证登录状态…' }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="flex flex-col items-center gap-3 text-sm text-muted" role="status">
        <Spinner size="lg" />
        <span>{label}</span>
      </div>
    </div>
  );
}

interface ErrorBlockProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBlock({ message, onRetry }: ErrorBlockProps) {
  return (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>加载失败</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
      {onRetry ? (
        <Button size="sm" variant="secondary" onPress={onRetry}>
          重新加载
        </Button>
      ) : null}
    </Alert>
  );
}
