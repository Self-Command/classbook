import { Link, useNavigate } from 'react-router-dom';
import type { NotificationDto } from '@classbook/shared';
import { Button, Dropdown, Label } from '@heroui/react';
import { useSiteCopy } from '@/lib/siteCopy';
import { useNotifications } from '@/lib/notifications';
import { formatShortDate } from '@/lib/format';
import { IconBell } from '@/components/icons';
import { ProfileAvatar } from '@/components/content/ProfileAvatar';

export function notificationText(type: NotificationDto['type']): string {
  switch (type) {
    case 'PROFILE_MESSAGE':
      return '在你的留言板留言';
    case 'POST_COMMENT':
      return '评论了你的帖子';
    case 'COMMENT_REPLY':
      return '回复了你';
    case 'POST_LIKE':
      return '赞了你的帖子';
    case 'MENTION':
      return '在帖子里提到了你';
    default:
      return '有一条新消息';
  }
}

export function notificationHref(notification: NotificationDto): string {
  if (notification.type === 'PROFILE_MESSAGE') {
    return `/classmates/${notification.actor.id}`;
  }
  if (!notification.messageId) return '/notifications';
  const hash = notification.commentId ? `#comment-${notification.commentId}` : '';
  return `/plaza/${notification.messageId}${hash}`;
}

export function notificationLabel(notification: NotificationDto): string {
  return `${notification.actor.realName} ${notificationText(notification.type)}`;
}

interface NotificationBellProps {
  onNavigate?: () => void;
}

export function NotificationBell({ onNavigate }: NotificationBellProps) {
  const { unreadCount, latest, markAllRead, markRead } = useNotifications();
  const { copy } = useSiteCopy();
  const navigate = useNavigate();

  const handleClick = async (notification: NotificationDto) => {
    if (!notification.readAt) {
      try {
        await markRead(notification.id);
      } catch {
        // 跳转优先，已读失败不阻塞
      }
    }
    onNavigate?.();
    navigate(notificationHref(notification));
  };

  return (
    <Dropdown>
      <Button
        isIconOnly
        aria-label={`通知${unreadCount > 0 ? `，${unreadCount} 条未读` : ''}`}
        className="relative h-auto w-auto min-w-0 rounded-full p-2"
        size="sm"
        variant="ghost"
        data-tour="bell"
      >
        <IconBell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-medium leading-[18px] text-danger-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
      <Dropdown.Popover placement="bottom end">
        <div className="w-80 max-w-[86vw] p-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-sm font-medium text-foreground">{copy.notificationsTitle}</p>
            {unreadCount > 0 && (
              <Button
                className="h-auto min-w-0 px-2 py-0.5 text-[11px] text-muted"
                size="sm"
                variant="ghost"
                onPress={() => void markAllRead()}
              >
                {copy.notificationsMarkAllRead}
              </Button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {latest.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted">
                {copy.notificationsEmpty}
              </p>
            ) : (
              latest.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={`flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-default ${
                    notification.readAt ? '' : 'bg-accent/5'
                  }`}
                  onClick={() => void handleClick(notification)}
                >
                  <ProfileAvatar
                    className="size-8 shrink-0"
                    name={notification.actor.realName}
                    size="sm"
                    src={notification.actor.avatarUrl}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">
                      {notificationLabel(notification)}
                    </span>
                    {notification.preview && (
                      <span className="mt-0.5 block truncate text-[11px] text-muted">
                        {notification.preview}
                      </span>
                    )}
                    <span className="mt-0.5 block text-[10px] text-muted">
                      {formatShortDate(notification.createdAt)}
                    </span>
                  </span>
                  {!notification.readAt && (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                  )}
                </button>
              ))
            )}
          </div>

          <div className="mt-1 border-t border-border pt-1.5">
            <Link
              className="block rounded-xl px-2 py-1.5 text-center text-xs text-accent hover:bg-accent/10"
              onClick={() => onNavigate?.()}
              to="/notifications"
            >
              {copy.notificationsViewAll}
            </Link>
          </div>
        </div>
      </Dropdown.Popover>
    </Dropdown>
  );
}