import { useCallback, useState } from 'react';
import type { NotificationDto } from '@classbook/shared';
import { Button, Card, Spinner } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '@/lib/api';
import type { NotificationListDto } from '@classbook/shared';
import { useAsyncData } from '@/lib/useAsyncData';
import { useNotifications } from '@/lib/notifications';
import { useSiteCopy } from '@/lib/siteCopy';
import { formatDateTime } from '@/lib/format';
import { EmptyPanel, ErrorPanel } from '@/components/content/ContentStates';
import { PageShell } from '@/components/content/PageShell';
import { IconBell } from '@/components/icons';
import { ProfileAvatar } from '@/components/content/ProfileAvatar';
import {
  notificationHref,
  notificationLabel,
} from '@/components/notifications/NotificationBell';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { copy } = useSiteCopy();
  const { markAllRead, markRead } = useNotifications();
  const [cursor, setCursor] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationDto[]>([]);

  const load = useCallback(
    (): Promise<NotificationListDto> =>
      notificationsApi.list(cursor ?? undefined, 20).then((result) => {
        setItems((previous) =>
          cursor ? [...previous, ...result.items] : result.items,
        );
        return result;
      }),
    [cursor],
  );

  const { data, loading, error, reload } = useAsyncData(load, [cursor]);

  const open = async (notification: NotificationDto) => {
    if (!notification.readAt) {
      try {
        await markRead(notification.id);
      } catch {
        // 跳转优先
      }
    }
    navigate(notificationHref(notification));
  };

  const hasMore = Boolean(data?.nextCursor);

  return (
    <PageShell
      description="同学给你的留言、评论、点赞都会出现在这里。"
      eyebrow="时刻惦记"
      title={copy.notificationsTitle}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">
            {data && data.unreadCount > 0 ? `${data.unreadCount} 条未读` : '没有未读'}
          </span>
          <Button
            className="h-auto min-w-0 px-3 py-1.5 text-xs text-muted"
            isDisabled={!data || data.unreadCount === 0}
            size="sm"
            variant="ghost"
            onPress={() => void markAllRead().then(reload)}
          >
            {copy.notificationsMarkAllRead}
          </Button>
        </div>

        {loading && items.length === 0 ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((index) => (
              <Card key={index} className="h-20 items-center justify-center rounded-2xl">
                <Spinner size="sm" />
              </Card>
            ))}
          </div>
        ) : error && items.length === 0 ? (
          <ErrorPanel message={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <EmptyPanel
            description={copy.notificationsEmpty}
            icon={<IconBell className="size-6" />}
            title={copy.notificationsTitle}
          />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {items.map((notification) => (
                <Card
                  key={notification.id}
                  className={`gap-0 rounded-2xl border p-3.5 transition hover:border-border ${
                    notification.readAt
                      ? 'border-border/50 bg-surface'
                      : 'border-accent/30 bg-accent/5'
                  }`}
                >
                  <button
                    className="flex w-full items-start gap-3 text-left"
                    type="button"
                    onClick={() => void open(notification)}
                  >
                    <ProfileAvatar
                      className="size-10 shrink-0"
                      name={notification.actor.realName}
                      size="md"
                      src={notification.actor.avatarUrl}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {notificationLabel(notification)}
                      </span>
                      {notification.preview && (
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          {notification.preview}
                        </span>
                      )}
                      <span className="mt-0.5 block text-[11px] text-muted">
                        {formatDateTime(notification.createdAt)}
                      </span>
                    </span>
                    {!notification.readAt && (
                      <span className="mt-2 size-2 shrink-0 rounded-full bg-accent" />
                    )}
                  </button>
                </Card>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center">
                <Button
                  isDisabled={loading}
                  size="sm"
                  variant="ghost"
                  onPress={() => setCursor(data?.nextCursor ?? null)}
                >
                  {loading ? (
                    <Spinner color="current" size="sm" />
                  ) : (
                    '加载更早的通知'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}