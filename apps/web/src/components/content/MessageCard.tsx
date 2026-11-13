import type { MessageDto } from '@classbook/shared';
import { Button, Card, Chip } from '@heroui/react';
import { formatDateTime } from '@/lib/format';
import { IconTrash } from '@/components/icons';
import { ProfileAvatar } from './ProfileAvatar';

interface MessageCardProps {
  message: MessageDto;
  currentUserId?: string;
  isAdmin?: boolean;
  onDelete?: (message: MessageDto) => void;
}

export function MessageCard({
  message,
  currentUserId,
  isAdmin = false,
  onDelete,
}: MessageCardProps) {
  const canDelete = Boolean(
    onDelete &&
      !message.author.disabled &&
      (message.author.id === currentUserId || isAdmin),
  );

  return (
    <Card className="gap-0 rounded-2xl border border-border/70 bg-surface p-4 shadow-sm transition hover:border-border sm:p-5">
      <div className="flex items-start gap-3">
        <ProfileAvatar
          className="size-9 shrink-0"
          name={message.author.realName}
          size="md"
          src={message.author.avatarUrl}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`text-sm font-medium ${
                message.author.disabled ? 'text-muted' : 'text-foreground'
              }`}
            >
              {message.author.realName}
            </span>
            {message.author.nickname && (
              <span className="text-xs text-muted">@{message.author.nickname}</span>
            )}
            {message.toUser && (
              <Chip color="accent" size="sm" variant="soft">
                写给{message.toUser.realName}
              </Chip>
            )}
            <div className="ml-auto flex items-center gap-1">
              <time
                className="text-[11px] text-muted"
                dateTime={message.createdAt}
              >
                {formatDateTime(message.createdAt)}
              </time>
              {canDelete && (
                <Button
                  isIconOnly
                  aria-label="删除留言"
                  className="size-7 min-w-0 shrink-0 p-0 text-muted hover:bg-danger-soft hover:text-danger"
                  size="sm"
                  variant="ghost"
                  onPress={() => onDelete?.(message)}
                >
                  <IconTrash className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">
            {message.content}
          </p>
        </div>
      </div>
    </Card>
  );
}
