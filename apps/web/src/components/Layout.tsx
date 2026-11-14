import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Button,
  Drawer,
  Dropdown,
  Label,
  Skeleton,
  toast,
  useOverlayState,
} from '@heroui/react';
import { getErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useSiteCopy } from '@/lib/siteCopy';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { SwarmPageBuild } from '@/features/swarm/index.js';
import '@/features/swarm/styles/index.css';
import { UserAvatar } from './ui/UserAvatar';
import { ThemeSwitcher } from './theme/ThemeSwitcher';
import { IconLogout, IconMenu, IconUser } from './ui/icons';

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return [
    'rounded-full px-3.5 py-2 text-sm transition-colors',
    isActive
      ? 'bg-accent/10 font-medium text-accent'
      : 'text-muted hover:bg-default hover:text-foreground',
  ].join(' ');
}

function mobileNavLinkClass({ isActive }: { isActive: boolean }): string {
  return [
    'rounded-xl px-3 py-2.5 text-sm transition-colors',
    isActive
      ? 'bg-accent/10 font-medium text-accent'
      : 'text-muted hover:bg-default hover:text-foreground',
  ].join(' ');
}

export function Layout() {
  const { user, loading, logout } = useAuth();
  const { copy, settings, loading: settingsLoading } = useSiteCopy();
  const navigate = useNavigate();
  const location = useLocation();
  const mobileMenu = useOverlayState();
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = [
    { to: '/', label: copy.navHome, end: true },
    { to: '/classmates', label: copy.navClassmates },
    { to: '/plaza', label: copy.navPlaza },
    { to: '/albums', label: copy.navAlbums },
    { to: '/timeline', label: copy.navTimeline },
  ];

  useEffect(() => {
    mobileMenu.close();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  const displayName = user?.profile?.realName ?? user?.username ?? '同学';

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.success('已退出登录');
      navigate('/');
    } catch (error) {
      toast.danger(getErrorMessage(error));
    } finally {
      setLoggingOut(false);
      mobileMenu.close();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-separator bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-display text-base text-accent-foreground shadow-sm">
              {copy.logoText}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block font-display text-base text-foreground sm:text-lg">
                {copy.siteName}
              </span>
              {settingsLoading ? (
                <Skeleton className="mt-1 hidden h-2.5 w-20 rounded-full sm:block" />
              ) : (
                <span className="hidden max-w-40 truncate text-[10px] tracking-[0.18em] text-muted sm:block">
                  {settings?.className ?? '我们的班级'}
                </span>
              )}
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="主导航">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <ThemeSwitcher />
            {loading ? (
              <Skeleton className="h-9 w-24 rounded-full" />
            ) : user ? (
              <div className="flex items-center gap-1.5">
                <div className="hidden sm:block">
                  <NotificationBell />
                </div>
              <Dropdown>
                <Button
                  variant="ghost"
                  className="hidden h-auto gap-2 rounded-full py-1 pl-1 pr-3 sm:flex"
                  aria-label="账号菜单"
                >
                  <UserAvatar name={displayName} src={user.profile?.avatarUrl} size="sm" />
                  <span className="max-w-32 truncate text-sm">{displayName}</span>
                </Button>
                <Dropdown.Popover placement="bottom end">
                  <Dropdown.Menu
                    onAction={(key) => {
                      if (key === 'me') navigate('/me');
                      if (key === 'logout') void handleLogout();
                    }}
                  >
                    <Dropdown.Item id="me" textValue={copy.navMe}>
                      <Label>{copy.navMe}</Label>
                    </Dropdown.Item>
                    <Dropdown.Item id="logout" textValue="退出登录" variant="danger">
                      <Label>退出登录</Label>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Button variant="ghost" onPress={() => navigate('/login')}>
                  登录
                </Button>
                <Button onPress={() => navigate('/register')}>注册</Button>
              </div>
            )}

            <Drawer state={mobileMenu}>
              <Button isIconOnly variant="ghost" className="lg:hidden" aria-label="打开菜单">
                <IconMenu className="size-5" />
              </Button>
              <Drawer.Backdrop>
                <Drawer.Content placement="right">
                  <Drawer.Dialog>
                    <Drawer.CloseTrigger />
                    <Drawer.Header>
                      <Drawer.Heading className="text-lg">浏览同学录</Drawer.Heading>
                    </Drawer.Header>
                    <Drawer.Body>
                      {user && (
                        <div className="mb-2 flex justify-end">
                          <NotificationBell onNavigate={() => mobileMenu.close()} />
                        </div>
                      )}
                      <nav className="flex flex-col gap-1" aria-label="移动端导航">
                        {navItems.map((item) => (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={() => mobileMenu.close()}
                            className={mobileNavLinkClass}
                          >
                            {item.label}
                          </NavLink>
                        ))}
                      </nav>
                    </Drawer.Body>
                    <Drawer.Footer className="flex-col items-stretch gap-2">
                      {loading ? null : user ? (
                        <>
                          <div className="mb-2 flex items-center gap-3 rounded-2xl bg-default p-3">
                            <UserAvatar
                              name={displayName}
                              src={user.profile?.avatarUrl}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {displayName}
                              </p>
                              <p className="truncate text-xs text-muted">@{user.username}</p>
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            fullWidth
                            onPress={() => {
                              mobileMenu.close();
                              navigate('/me');
                            }}
                          >
                            <IconUser className="size-4" />
                            {copy.navMe}
                          </Button>
                          <Button
                            variant="danger-soft"
                            fullWidth
                            isPending={loggingOut}
                            onPress={() => void handleLogout()}
                          >
                            <IconLogout className="size-4" />
                            退出登录
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            fullWidth
                            onPress={() => {
                              mobileMenu.close();
                              navigate('/login');
                            }}
                          >
                            登录
                          </Button>
                          <Button
                            fullWidth
                            onPress={() => {
                              mobileMenu.close();
                              navigate('/register');
                            }}
                          >
                            用邀请码注册
                          </Button>
                        </>
                      )}
                    </Drawer.Footer>
                  </Drawer.Dialog>
                </Drawer.Content>
              </Drawer.Backdrop>
            </Drawer>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
      <SwarmPageBuild />

      <footer className="border-t border-separator bg-default/40">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-2 px-4 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-display text-sm text-foreground">
            {settings?.className ?? '我们的班级'}
            {settings?.graduationYear ? ` · ${settings.graduationYear} 届` : ''}
          </p>
          <div className="text-left sm:text-right">
            <p>{copy.footerText}</p>
            <p className="mt-1">{copy.footerCopyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

