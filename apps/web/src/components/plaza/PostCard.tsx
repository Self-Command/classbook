import { Link } from 'react-router-dom';
import type { MessageDto } from '@classbook/shared';
import { Button, Card, Chip } from '@heroui/react';
import { formatDateTime } from '@/lib/format';
import {
  IconHeart,
  IconMessage,
  IconTrash,
} from '@/components/icons';
import { ProfileAvatar } from '@/components/content/ProfileAvatar';
import { MentionText, type MentionMember } from './mentions';
import { PostImageGrid } from './PostImageGrid';

interface PostCardProps {
  post: MessageDto;
  members: MentionMember[];
  currentUserId?: string;
  isAdmin?: boolean;
  compact?: boolean;
  onLike: (post: MessageDto) => void;
  onDelete?: (post: MessageDto) => void;
  onOpenImage: (post: MessageDto, index: number) => void;
}

export function PostCard({
  post,
  members,
  currentUserId,
  isAdmin = false,
  compact = false,
  onLike,
  onDelete,
  onOpenImage,
}: PostCardProps) {
  const canDelete = Boolean(
    onDelete &&
      !post.author.disabled &&
      (post.author.id === currentUserId || isAdmin),
  );

  const collapsed =
    compact && post.content.length > 300 && post.content.split('\n').length > 8;

  return (
    <Card className="gap-0 rounded-3xl border border-border/70 bg-surface p-4 shadow-sm transition hover:border-border sm:p-5">
      <div className="flex items-start gap-3">
        <Link
          aria-label={`查看${post.author.realName}的主页`}
          className="shrink-0"
          to={`/classmates/${post.author.id}`}
        >
          <ProfileAvatar
            className="size-10"
            name={post.author.realName}
            size="md"
            src={post.author.avatarUrl}
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              className={`truncate text-sm font-medium hover:text-accent ${
                post.author.disabled ? 'text-muted' : 'text-foreground'
              }`}
              to={`/classmates/${post.author.id}`}
            >
              {post.author.realName}
            </Link>
            {post.author.nickname && (
              <span className="text-xs text-muted">@{post.author.nickname}</span>
            )}
            {post.toUser && (
              <Chip color="accent" size="sm" variant="soft">
                写给{post.toUser.realName}
              </Chip>
            )}
            {post.visibility === 'PRIVATE' && (
              <Chip color="default" size="sm" variant="soft">
                私密
              </Chip>
            )}
            <div className="ml-auto flex items-center gap-1">
              <time className="text-[11px] text-muted" dateTime={post.createdAt}>
                {formatDateTime(post.createdAt)}
              </time>
              {canDelete && (
                <Button
                  isIconOnly
                  aria-label="删除帖子"
                  className="size-7 min-w-0 shrink-0 p-0 text-muted hover:bg-danger-soft hover:text-danger"
                  size="sm"
                  variant="ghost"
                  onPress={() => onDelete?.(post)}
                >
                  <IconTrash className="size-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div
            className={`mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90 ${
              collapsed ? 'line-clamp-8' : ''
            }`}
          >
            <MentionText content={post.content} members={members} />
          </div>

          <PostImageGrid
            images={post.images}
            onOpen={(index) => onOpenImage(post, index)}
          />

          <div className="mt-3 flex items-center gap-4">
            <Button
              className={`h-auto min-w-0 gap-1.5 rounded-full px-2.5 py-1 text-xs ${
                post.likedByMe
                  ? 'bg-danger-soft text-danger'
                  : 'text-muted hover:bg-default hover:text-foreground'
              }`}
              isDisabled={post.author.disabled}
              size="sm"
              variant="ghost"
              onPress={() => onLike(post)}
            >
              <IconHeart className="size-4" />
              <span>{post.likeCount > 0 ? post.likeCount : '赞'}</span>
            </Button>
            <Link
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-muted transition-colors hover:bg-default hover:text-foreground"
              to={`/plaza/${post.id}`}
            >
              <IconMessage className="size-4" />
              <span>{post.commentCount > 0 ? post.commentCount : '评论'}</span>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}