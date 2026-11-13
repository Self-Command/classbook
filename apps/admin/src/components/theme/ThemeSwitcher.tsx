import { useState } from 'react';
import type { SVGProps } from 'react';
import { Button, Modal, cn } from '@heroui/react';
import { THEMES } from '@classbook/shared';
import { useTheme } from '../../lib/theme';

function PaletteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h5.4A3.6 3.6 0 0 0 21 9.4 6.4 6.4 0 0 0 14.6 3H12Z" />
      <circle cx="7.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface ThemeOptionProps {
  name: string;
  description: string;
  swatches: readonly string[];
  active: boolean;
  onSelect: () => void;
}

function ThemeOption({ name, description, swatches, active, onSelect }: ThemeOptionProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition',
        active
          ? 'border-accent bg-accent-soft/60'
          : 'border-border bg-surface hover:bg-default',
      )}
    >
      <span className="flex shrink-0 gap-1 rounded-full border border-border/60 bg-background/60 p-1">
        {swatches.map((color) => (
          <span
            key={color}
            className="size-4 rounded-full border border-black/10"
            style={{ backgroundColor: color }}
          />
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{name}</span>
          {active && <span className="text-[10px] text-accent">当前</span>}
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted">{description}</span>
      </span>
    </button>
  );
}

export function ThemeSwitcher({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { preference, defaultTheme, setTheme } = useTheme();
  const defaultMeta = THEMES.find((item) => item.id === defaultTheme) ?? THEMES[0];

  return (
    <>
      <Button
        isIconOnly
        aria-label="切换主题"
        className={className}
        variant="ghost"
        onPress={() => setOpen(true)}
      >
        <PaletteIcon className="size-5" />
      </Button>

      <Modal.Backdrop isOpen={open} onOpenChange={setOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[640px]">
            <Modal.CloseTrigger aria-label="关闭主题选择" />
            <Modal.Header>
              <Modal.Icon className="bg-accent-soft text-accent">
                <PaletteIcon className="size-5" />
              </Modal.Icon>
              <Modal.Heading>选择主题</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="max-h-[65vh] space-y-4 overflow-y-auto">
              <p className="text-sm leading-6 text-muted">
                主题会立即生效，并跟随你的账号保存；未选择时使用站点默认主题。
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <ThemeOption
                  active={preference === null}
                  description={`跟随站点默认主题（当前：${defaultMeta.name}）`}
                  name="跟随站点默认"
                  swatches={defaultMeta.swatches}
                  onSelect={() => setTheme(null)}
                />
                {THEMES.map((item) => (
                  <ThemeOption
                    key={item.id}
                    active={preference === item.id}
                    description={item.description}
                    name={item.name}
                    swatches={item.swatches}
                    onSelect={() => setTheme(item.id)}
                  />
                ))}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="secondary">
                完成
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
