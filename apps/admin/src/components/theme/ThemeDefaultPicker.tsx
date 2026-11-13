import { THEMES, type ThemeId } from '@classbook/shared';
import { cn } from '../../lib/cn';

interface ThemeDefaultPickerProps {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
  disabled?: boolean;
}

export function ThemeDefaultPicker({ value, onChange, disabled = false }: ThemeDefaultPickerProps) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {THEMES.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(item.id)}
            className={cn(
              'flex items-start gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60',
              active
                ? 'border-accent bg-accent-soft/60'
                : 'border-border bg-surface hover:bg-default',
            )}
          >
            <span className="flex shrink-0 gap-1 rounded-full border border-border/60 bg-background/60 p-1">
              {item.swatches.map((color) => (
                <span
                  key={color}
                  className="size-4 rounded-full border border-black/10"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{item.name}</span>
                {active && <span className="text-[10px] text-accent">默认</span>}
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted">{item.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
