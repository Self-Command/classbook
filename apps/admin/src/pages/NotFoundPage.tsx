import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@heroui/react';
import { Icon } from '../components/ui/Icon';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Card className="w-full max-w-md text-center">
        <Card.Header className="items-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-default text-muted">
            <Icon name="search" className="size-5" />
          </span>
          <Card.Title>页面不存在</Card.Title>
          <Card.Description>你访问的管理页面可能已被移动或删除。</Card.Description>
        </Card.Header>
        <Card.Footer className="justify-center">
          <Button onPress={() => navigate('/')}>
            <Icon name="dashboard" className="size-4" />
            返回仪表盘
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}
