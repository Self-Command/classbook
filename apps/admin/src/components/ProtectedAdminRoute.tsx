import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button, Card } from '@heroui/react';
import { useAuth } from '../lib/auth';
import { FullPageLoading } from './ui/States';
import { Icon } from './ui/Icon';

export function ProtectedAdminRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) return <FullPageLoading />;

  if (!user) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <Card.Header className="items-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
              <Icon name="lock" className="size-5" />
            </span>
            <Card.Title>没有管理员权限</Card.Title>
            <Card.Description>
              当前账号无法访问管理后台。请使用管理员账号登录，或返回展示站。
            </Card.Description>
          </Card.Header>
          <Card.Footer className="justify-center">
            <Button variant="secondary" onPress={() => navigate('/login', { replace: true })}>
              重新登录
            </Button>
          </Card.Footer>
        </Card>
      </div>
    );
  }

  return <Outlet />;
}
