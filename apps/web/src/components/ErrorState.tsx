import { btnSecondary } from '@/lib/styles';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = '这一页暂时没能打开',
  message = '请稍后再试，或刷新页面。',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[18px] border border-coral/20 bg-coral/5 px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-coral/10 text-2xl text-coral">
        !
      </span>
      <h2 className="mt-4 font-display text-xl text-ink">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-ink-soft">{message}</p>
      {onRetry && (
        <button type="button" className={`${btnSecondary} mt-5`} onClick={onRetry}>
          再试一次
        </button>
      )}
    </div>
  );
}
