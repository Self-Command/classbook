import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@heroui/react';
import { useSiteCopy } from '@/lib/siteCopy';
import { PageContainer } from '@/components/ui/PageState';
import { IconArrowRight } from '@/components/ui/icons';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { copy } = useSiteCopy();

  return (
    <PageContainer className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg items-center p-8 text-center sm:p-10">
        <p className="font-display text-7xl leading-none text-accent/25">404</p>
        <h1 className="mt-3 font-display text-2xl text-foreground sm:text-3xl">
          {copy.notFoundTitle}
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted">
          {copy.notFoundDescription}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onPress={() => navigate('/')}>
            {copy.notFoundButton}
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
