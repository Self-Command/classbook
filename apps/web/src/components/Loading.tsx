interface LoadingProps {
  label?: string;
  full?: boolean;
  className?: string;
}

export function Loading({
  label = '正在翻开同学录…',
  full = false,
  className = '',
}: LoadingProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-16 text-center ${
        full ? 'min-h-[52vh]' : ''
      } ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-ink/15 border-t-ink" />
      <p className="text-sm text-ink-faint">{label}</p>
    </div>
  );
}
