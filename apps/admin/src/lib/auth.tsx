import type { UserDto } from '@classbook/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from '@heroui/react';
import { AUTH_EXPIRED_EVENT, UnauthorizedError, auth as authApi } from './api';

interface AuthContextValue {
  user: UserDto | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<UserDto>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<UserDto | null>(null);

  const applyUser = useCallback((nextUser: UserDto | null) => {
    userRef.current = nextUser;
    setUser(nextUser);
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const me = await authApi.me();
        if (!active) return;
        if (me.role !== 'ADMIN') {
          await authApi.logout().catch(() => undefined);
          if (active) applyUser(null);
          return;
        }
        applyUser(me);
      } catch (error) {
        if (!active) return;
        if (!(error instanceof UnauthorizedError)) {
          applyUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [applyUser]);

  useEffect(() => {
    const handleExpired = () => {
      if (userRef.current) {
        toast.danger('登录状态已失效，请重新登录');
      }
      applyUser(null);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, [applyUser]);

  const login = useCallback(
    async (username: string, password: string): Promise<UserDto> => {
      const nextUser = await authApi.login({ username, password });
      if (nextUser.role !== 'ADMIN') {
        await authApi.logout().catch(() => undefined);
        applyUser(null);
        throw new Error('该账号没有管理员权限');
      }
      applyUser(nextUser);
      return nextUser;
    },
    [applyUser],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
    } finally {
      applyUser(null);
    }
  }, [applyUser]);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
