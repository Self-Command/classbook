import { Link } from 'react-router-dom';
import type { MessageCommentDto } from '@classbook/shared';
import { Button } from '@heroui/react';
import { formatDateTime } from '@/lib/format';
import { IconTrash } from '@/components/icons';
import { ProfileAvatar } from '@/components/content/ProfileAvatar';
import { MentionText, type MentionMember } from './mentions';
import { CommentComposer } from './CommentComposer';

interface CommentListProps {
  postId: string;
  comments: MessageCommentDto[];
  members: MentionMember[];
  currentUserId?: string;
  isAdmin?: boolean;
  replyTo: string | null;
  onReplyChange: (commentId: string | null) => void;
  onCommentCreated: (comment: MessageCommentDto) => void;
  onCommentDeleted: (comment: MessageCommentDto) => void;
}

export function CommentList({
  postId,
  comments,
  members,
  currentUserId,
  isAdmin = false,
  replyTo,
  onReplyChange,
  onCommentCreated,
  onCommentDeleted,
}: CommentListProps) {
  const roots = comments.filter((comment) => !comment.parentId);

  const renderComment = (comment: MessageCommentDto) => {
    const canDelete =
      !comment.author.disabled &&
      (comment.author.id === currentUserId || isAdmin);
    const replies = comments.filter(
      (item) => item.parentId === comment.id,
    );

    return (
      <div
        className="flex gap-2.5"
        id={`comment-${comment.id}`}
        key={comment.id}
      >
        <Link
          aria-label={`查看${comment.author.realName}的主页`}
          className="shrink-0"
          to={`/classmates/${comment.author.id}`}
        >
          <ProfileAvatar
            className="size-8"
            name={comment.author.realName}
            size="sm"
            src={comment.author.avatarUrl}
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link
              className={`truncate text-xs font-medium hover:text-accent ${
                comment.author.disabled ? 'text-muted' : 'text-foreground'
              }`}
              to={`/classmates/${comment.author.id}`}
            >
              {comment.author.realName}
            </Link>
            <span className="text-[11px] text-muted">
              {formatDateTime(comment.createdAt)}
            </span>
            {canDelete && (
              <Button
                isIconOnly
                aria-label="删除评论"
                className="size-6 min-w-0 p-0 text-muted hover:bg-danger-soft hover:text-danger"
                size="sm"
                variant="ghost"
                onPress={() => onCommentDeleted(comment)}
              >
                <IconTrash className="size-3" />
              </Button>
            )}
          </div>

          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">
            <MentionText content={comment.content} members={members} />
          </p>

          <div className="mt-1">
            <Button
              className="h-auto min-w-0 rounded-full px-2 py-0.5 text-[11px] text-muted hover:bg-default hover:text-foreground"
              size="sm"
              variant="ghost"
              onPress={() =>
                onReplyChange(replyTo === comment.id ? null : comment.id)
              }
            >
              回复
            </Button>
          </div>

          {replyTo === comment.id && (
            <div className="mt-2">
              <CommentComposer
                autoFocus
                parentId={comment.id}
                postId={postId}
                replyTo={comment.author.realName}
                onCreated={onCommentCreated}
                onCancel={() => onReplyChange(null)}
              />
            </div>
          )}

          {replies.length > 0 && (
            <div className="mt-3 flex flex-col gap-3 border-l border-border pl-3">
              {replies.map(renderComment)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return <div className="flex flex-col gap-4">{roots.map(renderComment)}</div>;
}