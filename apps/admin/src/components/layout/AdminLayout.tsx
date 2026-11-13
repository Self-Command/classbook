import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Button, Chip, Drawer, Spinner, toast } from '@heroui/react';
import { useAuth } from '../../lib/auth';
import { cn } from '../../lib/cn';
import { ThemeSwitcher } from '../theme/ThemeSwitcher';
import { Icon, type IconName } from '../ui/Icon';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '仪表盘', icon: 'dashboard', end: true },
  { to: '/members', label: '成员管理', icon: 'users' },
  { to: '/invites', label: '邀请码', icon: 'ticket' },
  { to: '/messages', label: '留言审核', icon: 'message' },
  { to: '/albums', label: '相册管理', icon: 'album' },
  { to: '/timeline', label: '时间线', icon: 'timeline' },
  { to: '/copy', label: '文案管理', icon: 'copy' },
  { to: '/settings', label: '站点设置', icon: 'settings' },
];

function displayName(name: string): string {
  return name.trim().slice(0, 1) || '管';
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center gap-3 border-b border-separator px-5 py-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent font-display text-lg font-semibold text-accent-foreground">
          拾
        </span>
        <div className="min-w-0">
          <p className="font-display text-xl leading-tight tracking-wide text-foreground">拾光</p>
          <p className="text-[10px] tracking-[0.24em] text-muted">同学录 · 管理</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="管理导航">
        <p className="px-3 pb-2 text-[10px] tracking-[0.24em] text-muted">管理菜单</p>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted hover:bg-default hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} className={cn('size-4', isActive ? '' : 'text-muted')} />
                <span className="flex-1">{item.label}</span>
                {isActive ? <span className="size-1.5 rounded-full bg-accent-foreground/80" /> : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-separator px-5 py-4">
        <p className="text-[10px] leading-5 tracking-wide text-muted">
          私密班级空间
          <br />
          仅管理员可访问
        </p>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const activeItem =
    NAV_ITEMS.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
    ) ?? NAV_ITEMS[0];

  const name = user?.profile?.realName || user?.profile?.nickname || user?.username || '管理员';

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
      toast.info('已退出登录');
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-separator lg:block">
        <SidebarContent />
      </aside>

      <Drawer.Backdrop isOpen={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Content placement="left">
          <Drawer.Dialog className="w-72 max-w-[85vw] p-0" aria-label="管理导航">
            <Drawer.CloseTrigger />
            <Drawer.Body className="p-0">
              <SidebarContent onNavigate={() => setDrawerOpen(false)} />
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-separator bg-background/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              className="lg:hidden"
              aria-label="打开菜单"
              onPress={() => setDrawerOpen(true)}
            >
              <Icon name="menu" className="size-5" />
            </Button>

            <div className="hidden min-w-0 items-center gap-2 text-sm text-muted sm:flex">
              <span>管理后台</span>
              <span className="text-border">/</span>
              <span className="truncate font-medium text-foreground">{activeItem.label}</span>
            </div>
            <div className="min-w-0 flex-1 sm:hidden">
              <p className="truncate font-display text-lg text-foreground">{activeItem.label}</p>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <ThemeSwitcher />
              <div className="flex items-center gap-2.5 rounded-full border border-border bg-surface py-1 pl-1 pr-2 sm:pr-3">
                <Avatar size="sm">
                  {user?.profile?.avatarUrl ? (
                    <Avatar.Image alt={name} src={user.profile.avatarUrl} />
                  ) : null}
                  <Avatar.Fallback>{displayName(name)}</Avatar.Fallback>
                </Avatar>
                <div className="hidden min-w-0 leading-tight sm:block">
                  <p className="max-w-32 truncate text-xs font-medium text-foreground">{name}</p>
                  <p className="text-[10px] text-muted">@{user?.username ?? 'admin'}</p>
                </div>
                <Chip size="sm" variant="soft" className="ml-1 hidden md:inline-flex">
                  管理员
                </Chip>
              </div>

              <Button
                size="sm"
                variant="secondary"
                aria-label="退出登录"
                isPending={signingOut}
                onPress={handleLogout}
              >
                {({ isPending }) => (
                  <>
                    {isPending ? <Spinner color="current" size="sm" /> : <Icon name="logout" className="size-3.5" />}
                    <span className="hidden sm:inline">退出</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
