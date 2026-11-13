import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { MessageDto } from '@classbook/shared';
import { messageCreateSchema } from '@classbook/shared';
import {
  Button,
  Card,
  Description,
  FieldError,
  Label,
  TextArea,
  TextField,
} from '@heroui/react';
import { getErrorMessage, messagesApi } from '@/lib/api';
import { validateForm } from '@/lib/validation';

interface MessageComposerProps {
  toUserId?: string;
  toName?: string;
  onCreated?: (message: MessageDto) => void;
}

export function MessageComposer({ toUserId, toName, onCreated }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

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
      setNotice(toName ? '留言已送达' : '留言已贴上墙');
      onCreated?.(result.message);
    } catch (submitError) {
      setFormError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="gap-4 rounded-3xl border border-border/70 bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {toName ? `写给${toName}` : '在留言墙上写点什么'}
        </p>
        <span className="text-[11px] text-muted">将以真实姓名展示</span>
      </div>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <TextField
          aria-label="留言内容"
          fullWidth
          isDisabled={submitting}
          isInvalid={Boolean(error)}
          value={content}
          onChange={(value) => {
            setContent(value);
            if (error) setError('');
            if (notice) setNotice('');
          }}
        >
          <Label className="text-xs font-medium text-muted">留言内容</Label>
          <TextArea
            className="min-h-28 resize-y"
            maxLength={500}
            placeholder={
              toName ? `想对${toName}说些什么？` : '写下一句想对大家说的话吧…'
            }
            rows={4}
          />
          <Description>1–500 字，发送后同学们都能看到。</Description>
          <FieldError>{error}</FieldError>
        </TextField>

        <div className="flex items-center justify-between gap-3">
          <span
            className={`text-[11px] ${
              content.length > 480 ? 'text-danger' : 'text-muted'
            }`}
          >
            {content.length} / 500
          </span>
          <Button
            isDisabled={submitting || content.trim().length === 0}
            isPending={submitting}
            size="md"
            type="submit"
          >
            {submitting ? '发送中…' : '发送留言'}
          </Button>
        </div>

        {formError && (
          <p
            className="rounded-xl border border-danger/25 bg-danger-soft/50 px-3.5 py-2.5 text-sm leading-6 text-danger"
            role="alert"
          >
            {formError}
          </p>
        )}
        {notice && (
          <p className="text-xs text-success" role="status">
            {notice}
          </p>
        )}
      </form>
    </Card>
  );
}
