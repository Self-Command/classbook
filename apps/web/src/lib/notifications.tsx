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

const PUSH_SUPPORTED =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export async function enableDesktopNotifications(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!PUSH_SUPPORTED) {
    return { ok: false, message: '当前浏览器不支持桌面通知' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, message: '没有授予通知权限' };
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const { publicKey } = await notificationsApi.getVapidPublicKey();
  if (!publicKey) {
    return { ok: false, message: '服务端未配置推送密钥' };
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    }));

  const json = subscription.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, message: '订阅信息不完整' };
  }

  await notificationsApi.subscribe({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });

  return { ok: true, message: '桌面通知已开启' };
}

export function isDesktopNotificationEnabled(): boolean {
  return (
    PUSH_SUPPORTED &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted'
  );
}

export function isIosNotInstalled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return isIos && !standalone;
}