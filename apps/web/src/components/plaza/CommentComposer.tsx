import { useState } from 'react';
import type { FormEvent } from 'react';
import { COMMENT_MAX_LENGTH } from '@classbook/shared';
import { Button, TextArea, TextField, Label } from '@heroui/react';
import { getErrorMessage, plazaApi } from '@/lib/api';
import type { MessageCommentDto } from '@classbook/shared';

interface CommentComposerProps {
  postId: string;
  parentId?: string | null;
  replyTo?: string | null;
  placeholder?: string;
  autoFocus?: boolean;
  onCreated: (comment: MessageCommentDto) => void;
  onCancel?: () => void;
}

export function CommentComposer({
  postId,
  parentId,
  replyTo,
  placeholder,
  autoFocus = false,
  onCreated,
  onCancel,
}: CommentComposerProps) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = content.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const result = await plazaApi.comment(postId, {
        content: text,
        parentId: parentId ?? undefined,
      });
      setContent('');
      onCreated(result.comment);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
      <TextField
        aria-label={replyTo ? `回复${replyTo}` : '写评论'}
        fullWidth
        isDisabled={submitting}
        value={content}
        onChange={setContent}
      >
        <Label className="sr-only">评论内容</Label>
        <TextArea
          className="min-h-16 resize-none"
          autoFocus={autoFocus}
          maxLength={COMMENT_MAX_LENGTH}
          placeholder={replyTo ? `回复 ${replyTo}…` : (placeholder ?? '友善一点，留句好听的话…')}
          rows={2}
        />
      </TextField>

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button size="sm" variant="ghost" onPress={onCancel}>
            取消
          </Button>
        )}
        <Button
          isDisabled={submitting || content.trim().length === 0}
          isPending={submitting}
          size="sm"
          type="submit"
        >
          {submitting ? '发送中…' : '发送'}
        </Button>
      </div>

      {error && (
        <p
          className="rounded-xl border border-danger/25 bg-danger-soft/50 px-3.5 py-2 text-sm leading-6 text-danger"
          role="alert"
        >
          {error}
        </p>
      )}
    </form>
  );
}