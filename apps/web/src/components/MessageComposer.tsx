import { useState } from 'react';
import type { FormEvent } from 'react';
import type { MessageDto } from '@classbook/shared';
import { messageCreateSchema } from '@classbook/shared';
import { getErrorMessage, messagesApi } from '@/lib/api';
import { validateForm } from '@/lib/validation';
import {
  alertErrorClass,
  btnPrimary,
  cx,
  textareaClass,
} from '@/lib/styles';
import { useToast } from './Toast';

interface MessageComposerProps {
  toUserId?: string;
  toName?: string;
  onCreated?: (message: MessageDto) => void;
}

export function MessageComposer({ toUserId, toName, onCreated }: MessageComposerProps) {
  const { showToast } = useToast();
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setFormError('');

    const parsed = validateForm(
      messageCreateSchema,
      toUserId ? { content, toUserId } : { content },
    );

    if (!parsed.success) {
      setError(parsed.errors.content ?? parsed.errors._form ?? '留言不能为空');
      return;
    }

    setSubmitting(true);
    try {
      const result = await messagesApi.create(
        toUserId
          ? { content: parsed.data.content, toUserId }
          : { content: parsed.data.content },
      );
      setContent('');
      showToast(toUserId ? '留言已送达' : '留言已贴上墙');
      onCreated?.(result.message);
    } catch (submitError) {
      setFormError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[18px] border border-ink/10 bg-white/85 p-4 shadow-card sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">
          {toName ? `写给${toName}` : '在留言墙上写点什么'}
        </p>
        <span className="text-[11px] text-ink-faint">将以真实姓名展示</span>
      </div>

      <label htmlFor={toUserId ? 'message-board' : 'message-wall'} className="sr-only">
        留言内容
      </label>
      <textarea
        id={toUserId ? 'message-board' : 'message-wall'}
        value={content}
        onChange={(event) => {
          setContent(event.target.value);
          if (error) setError('');
        }}
        maxLength={500}
        rows={4}
        placeholder={
          toName
            ? `想对${toName}说些什么？`
            : '写下一句想对大家说的话吧…'
        }
        className={cx(textareaClass, 'mt-3', error && '!border-coral/60')}
        disabled={submitting}
        aria-invalid={Boolean(error)}
      />

      <div className="mt-2 flex items-center justify-between gap-3">
        <span
          className={cx(
            'text-[11px]',
            content.length > 480 ? 'text-coral' : 'text-ink-faint',
          )}
        >
          {content.length} / 500
        </span>
        <button
          type="submit"
          className={btnPrimary}
          disabled={submitting || content.trim().length === 0}
        >
          {submitting ? '发送中…' : '发送留言'}
        </button>
      </div>

      {error && (
        <p className="mt-1 text-xs text-coral" role="alert">
          {error}
        </p>
      )}
      {formError && (
        <p className={cx(alertErrorClass, 'mt-3')} role="alert">
          {formError}
        </p>
      )}
    </form>
  );
}
