import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@heroui/react';
import { PageContainer } from '@/components/ui/PageState';
import { IconArrowRight } from '@/components/ui/icons';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <PageContainer className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg items-center p-8 text-center sm:p-10">
        <p className="font-display text-7xl leading-none text-accent/25">404</p>
        <h1 className="mt-3 font-display text-2xl text-foreground sm:text-3xl">
          这一页被时光藏起来了
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted">
          页面不存在，或者内容已经被移走。回到首页再翻翻看吧。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onPress={() => navigate('/')}>
            回到首页
            <IconArrowRight className="size-4" />
          </Button>
          <Button variant="secondary" onPress={() => navigate(-1)}>
            返回上一页
          </Button>
        </div>
      </Card>
    </PageContainer>
  );
}
