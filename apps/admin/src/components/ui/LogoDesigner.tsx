import {
  LOGO_EMOJIS,
  LOGO_MODES,
  type LogoMode,
} from '@classbook/shared';
import { Input, Label, TextField } from '@heroui/react';
import { ImageUploader } from './ImageUploader';

export interface LogoDesignValue {
  mode: LogoMode;
  text: string;
  emoji: string;
  imageUrl: string | null;
}

interface LogoDesignerProps {
  value: LogoDesignValue;
  onChange: (next: LogoDesignValue) => void;
  disabled?: boolean;
  imageError?: string;
}

export function LogoDesigner({
  value,
  onChange,
  disabled = false,
  imageError,
}: LogoDesignerProps) {
  const patch = (next: Partial<LogoDesignValue>) =>
    onChange({ ...value, ...next });

  const imageUrl = value.imageUrl?.trim() ?? '';
  const text = value.text.trim() || '拾';

  return (
    <div className="flex flex-col gap-5 sm:flex-row">
      <div className="flex shrink-0 flex-col items-center gap-2">
        <div className="grid size-24 place-items-center rounded-2xl border border-dashed border-border bg-surface">
          {value.mode === 'image' && imageUrl ? (
            <img
              alt="Logo 预览"
              className="size-16 object-contain"
              src={imageUrl}
            />
          ) : value.mode === 'emoji' ? (
            <span className="text-4xl leading-none" aria-hidden="true">
              {value.emoji.trim() || '🎓'}
            </span>
          ) : (
            <span
              className={`font-display leading-none text-accent ${
                text.length > 2 ? 'text-2xl' : 'text-4xl'
              }`}
              aria-hidden="true"
            >
              {text}
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted">无背景圆圈，直接展示</span>
      </div>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Logo 形式">
          {LOGO_MODES.map((mode) => {
            const active = value.mode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => patch({ mode: mode.id })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-default text-muted hover:text-foreground'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        {value.mode === 'text' ? (
          <TextField
            name="logoText"
            value={value.text}
            onChange={(next) => patch({ text: next })}
            isDisabled={disabled}
          >
            <Label>Logo 文字</Label>
            <Input placeholder="例如：拾" maxLength={4} />
          </TextField>
        ) : null}

        {value.mode === 'emoji' ? (
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">预设表情</p>
              <div className="grid grid-cols-8 gap-1.5">
                {LOGO_EMOJIS.map((emoji) => {
                  const active = value.emoji === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      aria-label={`选择 ${emoji}`}
                      aria-pressed={active}
                      disabled={disabled}
                      onClick={() => patch({ emoji })}
                      className={`grid aspect-square place-items-center rounded-xl border text-xl transition ${
                        active
                          ? 'border-accent bg-accent/10 text-foreground'
                          : 'border-transparent bg-default/70 hover:bg-default'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>

            <TextField
              name="logoEmoji"
              value={value.emoji}
              onChange={(next) => patch({ emoji: next })}
              isDisabled={disabled}
            >
              <Label>自定义表情</Label>
              <Input placeholder="也可以直接粘贴一个表情" maxLength={8} />
            </TextField>
          </div>
        ) : null}

        {value.mode === 'image' ? (
          <div>
            <ImageUploader
              value={value.imageUrl}
              onChange={(next) => patch({ imageUrl: next })}
              label="Logo 图片"
              hint="建议透明底 PNG / WebP，展示时会保持原始比例，不加背景圆圈。"
              disabled={disabled}
              aspect="square"
              className="max-w-64"
            />
            {imageError ? (
              <p className="mt-1 text-xs text-danger">{imageError}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
