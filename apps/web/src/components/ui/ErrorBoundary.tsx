import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button, Card } from '@heroui/react';
import { PageContainer } from './PageState';
import { IconAlert } from './icons';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error && error.message ? error.message : '页面渲染时出了点问题',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('页面渲染异常：', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <PageContainer className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md items-center p-8 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-danger/10 text-danger">
              <IconAlert className="size-6" />
            </span>
            <h1 className="font-display text-2xl text-foreground">这一页暂时翻不开了</h1>
            <p className="max-w-sm text-sm leading-6 text-muted">
              {this.state.message || '页面遇到了意外情况，刷新后再试试。'}
            </p>
            <Button className="mt-2" onPress={() => window.location.reload()}>
              刷新页面
            </Button>
          </Card>
        </PageContainer>
      );
    }

    return this.props.children;
  }
}
