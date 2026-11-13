import type { MessageDto } from '@classbook/shared';
import { formatDateTime } from '@/lib/format';
import { cx } from '@/lib/styles';
import { Avatar } from './Avatar';
import { IconTrash } from './icons';

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
    onDelete && !message.author.disabled && (message.author.id === currentUserId || isAdmin),
  );

  return (
    <article className="rounded-[16px] border border-ink/10 bg-white/85 p-4 shadow-sm transition hover:border-ink/15">
      <div className="flex items-start gap-3">
        <Avatar
          name={message.author.realName}
          src={message.author.avatarUrl}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={cx(
                'text-sm font-medium',
                message.author.disabled ? 'text-ink-faint' : 'text-ink',
              )}
            >
              {message.author.realName}
            </span>
            {message.author.nickname && (
              <span className="text-xs text-ink-faint">@{message.author.nickname}</span>
            )}
            {message.toUser && (
              <span className="rounded-full bg-sage/15 px-2 py-0.5 text-[11px] text-sage">
                写给{message.toUser.realName}
              </span>
            )}
            <time
              className="ml-auto text-[11px] text-ink-faint"
              dateTime={message.createdAt}
            >
              {formatDateTime(message.createdAt)}
            </time>
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete?.(message)}
                className="grid h-7 w-7 place-items-center rounded-full text-ink-faint transition hover:bg-coral/10 hover:text-coral"
                title="删除留言"
                aria-label="删除留言"
              >
                <IconTrash className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink-soft">
            {message.content}
          </p>
        </div>
      </div>
    </article>
  );
}
