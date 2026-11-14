import { useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, FormEvent, KeyboardEvent } from 'react';
import { MESSAGE_IMAGES_MAX, MESSAGE_MAX_LENGTH } from '@classbook/shared';
import type { MessageDto } from '@classbook/shared';
import { Button, Card, TextArea, TextField, Label } from '@heroui/react';
import {
  getErrorMessage,
  messagesApi,
  plazaApi,
  settingsApi,
  uploadsApi,
  type PhotoUpload,
} from '@/lib/api';
import {
  compressImage,
  DEFAULT_IMAGE_COMPRESSION,
  type ImageCompressionConfig,
} from '@/lib/compressImage';
import { useToast } from '@/components/Toast';
import { IconCamera, IconClose } from '@/components/icons';
import { MentionPicker } from './MentionPicker';
import { filterMembers, type MentionMember } from './mentions';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SOURCE_BYTES = 30 * 1024 * 1024;

interface MentionState {
  start: number;
  query: string;
}

interface PostComposerProps {
  members: MentionMember[];
  toUserId?: string;
  toName?: string;
  placeholder?: string;
  submitLabel?: string;
  publicLabel?: string;
  privateLabel?: string;
  onCreated: (post: MessageDto) => void;
}

let compressionConfigPromise: Promise<ImageCompressionConfig> | null = null;

function getCompressionConfig(): Promise<ImageCompressionConfig> {
  if (!compressionConfigPromise) {
    compressionConfigPromise = settingsApi
      .getPublic()
      .then((settings) => ({
        enabled: settings.imageCompressEnabled,
        thresholdKb: settings.imageCompressThresholdKb,
        maxDimension: settings.imageMaxDimension,
        quality: settings.imageQuality,
      }))
      .catch(() => DEFAULT_IMAGE_COMPRESSION);
  }
  return compressionConfigPromise;
}

export function PostComposer({
  members,
  toUserId,
  toName,
  placeholder,
  submitLabel,
  publicLabel,
  privateLabel,
  onCreated,
}: PostComposerProps) {
  const { showToast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState('');
  const [images, setImages] = useState<PhotoUpload[]>([]);
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [mention, setMention] = useState<MentionState | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const suggestions = mention ? filterMembers(members, mention.query) : [];
  const mentionOpen = mention && suggestions.length > 0;

  const updateMention = (value: string, caret: number) => {
    const before = value.slice(0, caret);
    const match = /@([A-Za-z0-9_-]{0,20})$/.exec(before);
    if (match) {
      setMention({ start: caret - match[0].length, query: match[1] });
      setMentionIndex(0);
    } else {
      setMention(null);
    }
  };

  const handleChange = (value: string) => {
    setContent(value);
    const caret = textareaRef.current?.selectionStart ?? value.length;
    updateMention(value, caret);
  };

  const insertMention = (username: string) => {
    const textarea = textareaRef.current;
    if (!textarea || !mention) return;

    const caret = textarea.selectionStart ?? mention.start;
    const before = `${content.slice(0, mention.start)}@${username} `;
    const after = content.slice(caret);
    const next = before + after;

    setContent(next);
    setMention(null);

    const position = before.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(position, position);
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionOpen) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setMentionIndex((index) => (index + 1) % suggestions.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setMentionIndex(
        (index) => (index - 1 + suggestions.length) % suggestions.length,
      );
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      insertMention(suggestions[mentionIndex].username);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setMention(null);
    }
  };

  const uploadFiles = async (files: File[]) => {
    const room = MESSAGE_IMAGES_MAX - images.length;
    if (files.length > room) {
      showToast(`最多 ${MESSAGE_IMAGES_MAX} 张图片，已截取前 ${room} 张`, 'error');
    }
    const selected = files
      .filter(
        (file) => ALLOWED_MIME.includes(file.type) && file.size <= MAX_SOURCE_BYTES,
      )
      .slice(0, Math.max(room, 0));

    if (selected.length === 0) {
      if (files.length > 0) showToast('仅支持 30MB 内的 JPG / PNG / WebP 图片', 'error');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const config = await getCompressionConfig();
      const uploaded: PhotoUpload[] = [];
      for (const file of selected) {
        const prepared = await compressImage(file, config);
        uploaded.push(await uploadsApi.image(prepared));
      }
      setImages((previous) => [...previous, ...uploaded].slice(0, MESSAGE_IMAGES_MAX));
    } catch (uploadError) {
      showToast(getErrorMessage(uploadError), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length > 0) void uploadFiles(files);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
      ALLOWED_MIME.includes(file.type),
    );
    if (files.length > 0) {
      event.preventDefault();
      void uploadFiles(files);
    }
  };

  const removeImage = (index: number) => {
    setImages((previous) => previous.filter((_, current) => current !== index));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = content.trim();
    if (!text || submitting) return;

    if (text.length > MESSAGE_MAX_LENGTH) {
      setError(`内容不能超过 ${MESSAGE_MAX_LENGTH} 字`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = { content: text, images: images.map((image) => image.url) };
      if (toUserId) {
        const result = await messagesApi.create({
          ...payload,
          toUserId,
          visibility,
        });
        setContent('');
        setImages([]);
        setVisibility('PUBLIC');
        onCreated(result.message);
      } else {
        const result = await plazaApi.create(payload);
        setContent('');
        setImages([]);
        onCreated(result.post);
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = uploading || submitting;
  const counterTone =
    content.length > MESSAGE_MAX_LENGTH - 20 ? 'text-danger' : 'text-muted';

  return (
    <Card className="gap-4 rounded-3xl border border-border/70 bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {toName ? `写给${toName}` : '说点什么吧'}
        </p>
        <span className="text-[11px] text-muted">以真实姓名展示</span>
      </div>

      {toUserId && (
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-border bg-surface p-0.5">
            {(['PUBLIC', 'PRIVATE'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                  visibility === option
                    ? 'bg-accent/10 font-medium text-accent'
                    : 'text-muted hover:text-foreground'
                }`}
                onClick={() => setVisibility(option)}
              >
                {option === 'PUBLIC'
                  ? (publicLabel ?? '公开')
                  : (privateLabel ?? '私密')}
              </button>
            ))}
          </div>
          <span className="text-[11px] leading-4 text-muted">
            {visibility === 'PUBLIC'
              ? '公开留言会同步到广场，大家都能看到'
              : '私密留言只有你们两人可见'}
          </span>
        </div>
      )}

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <div className="relative">
          {mentionOpen && (
            <MentionPicker
              activeIndex={mentionIndex}
              members={suggestions}
              onPick={insertMention}
            />
          )}
          <TextField
            aria-label={toName ? `写给${toName}的内容` : '帖子内容'}
            fullWidth
            isDisabled={disabled}
            value={content}
            onChange={handleChange}
          >
            <Label className="sr-only">内容</Label>
            <TextArea
              className="min-h-24 resize-y"
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                placeholder ??
                (toName
                  ? `想对${toName}说些什么？`
                  : '分享此刻的心情，@同学 一起聊聊…')
              }
              ref={textareaRef}
              rows={3}
            />
          </TextField>
        </div>

        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((image, index) => (
              <div
                key={`${image.url}-${index}`}
                className="group relative size-20 overflow-hidden rounded-xl border border-border bg-default-100"
              >
                <img
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  src={image.url}
                />
                <Button
                  isIconOnly
                  aria-label="移除图片"
                  className="absolute right-0.5 top-0.5 h-auto min-w-0 bg-foreground/70 p-1 text-background opacity-0 transition group-hover:opacity-100"
                  size="sm"
                  variant="ghost"
                  onPress={() => removeImage(index)}
                >
                  <IconClose className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              aria-label="添加图片"
              className="text-muted hover:text-foreground"
              isDisabled={disabled || images.length >= MESSAGE_IMAGES_MAX}
              size="sm"
              variant="ghost"
              onPress={() => fileInputRef.current?.click()}
            >
              <IconCamera className="size-4.5" />
            </Button>
            <span className="text-[11px] text-muted">
              {images.length}/{MESSAGE_IMAGES_MAX}
            </span>
            <input
              accept={ALLOWED_MIME.join(',')}
              className="hidden"
              multiple
              ref={fileInputRef}
              type="file"
              onChange={handleInput}
            />
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-[11px] ${counterTone}`}>
              {content.length} / {MESSAGE_MAX_LENGTH}
            </span>
            <Button
              isDisabled={disabled || content.trim().length === 0}
              isPending={submitting}
              size="md"
              type="submit"
            >
              {uploading
                ? '上传图片中…'
                : submitting
                  ? '发布中…'
                  : (submitLabel ?? '发布')}
            </Button>
          </div>
        </div>

        {error && (
          <p
            className="rounded-xl border border-danger/25 bg-danger-soft/50 px-3.5 py-2.5 text-sm leading-6 text-danger"
            role="alert"
          >
            {error}
          </p>
        )}
      </form>
    </Card>
  );
}