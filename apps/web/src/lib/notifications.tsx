import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { NotificationDto } from '@classbook/shared';
import { notificationsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const BELL_LIST_SIZE = 10;

interface NotificationsContextValue {
  unreadCount: number;
  latest: NotificationDto[];
  connected: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [latest, setLatest] = useState<NotificationDto[]>([]);
  const [connected, setConnected] = useState(false);
  const pollTimer = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const result = await notificationsApi.list(undefined, BELL_LIST_SIZE);
      setLatest(result.items);
      setUnreadCount(result.unreadCount);
    } catch {
      // 静默失败，不打扰用户
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setLatest([]);
      return;
    }

    void refresh();

    const source = new EventSource('/api/notifications/stream', {
      withCredentials: true,
    });

    const handleNotification = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as {
          notification: NotificationDto;
          unreadCount: number;
        };
        setLatest((previous) =>
          [payload.notification, ...previous].slice(0, BELL_LIST_SIZE),
        );
        setUnreadCount(payload.unreadCount);
      } catch {
        // 忽略无法解析的推送
      }
    };

    source.addEventListener('notification', handleNotification);
    source.addEventListener('ready', () => setConnected(true));
    source.onopen = () => setConnected(true);

    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) {
        setConnected(false);
        if (pollTimer.current === null) {
          pollTimer.current = window.setInterval(() => {
            if (document.visibilityState === 'visible') void refresh();
          }, 60_000);
        }
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      source.close();
      document.removeEventListener('visibilitychange', handleVisibility);
      if (pollTimer.current !== null) {
        window.clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
      setConnected(false);
    };
  }, [user, refresh]);

  const markRead = useCallback(
    async (id: string) => {
      const result = await notificationsApi.markRead({ ids: [id] });
      setUnreadCount(result.unreadCount);
      setLatest((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
    },
    [],
  );

  const markAllRead = useCallback(async () => {
    const result = await notificationsApi.markRead({ all: true });
    setUnreadCount(result.unreadCount);
    setLatest((previous) =>
      previous.map((item) =>
        item.readAt ? item : { ...item, readAt: new Date().toISOString() },
      ),
    );
  }, []);

  const value = useMemo<NotificationsContextValue>(
    () => ({ unreadCount, latest, connected, refresh, markRead, markAllRead }),
    [unreadCount, latest, connected, refresh, markRead, markAllRead],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications 必须在 NotificationsProvider 内使用');
  }
  return context;
}