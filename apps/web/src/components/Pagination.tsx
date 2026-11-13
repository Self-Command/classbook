import { IconChevronLeft, IconChevronRight } from './icons';
import { cx } from '@/lib/styles';

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

type PageToken = number | 'ellipsis';

function buildPages(current: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: PageToken[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  if (start > 2) pages.push('ellipsis');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push('ellipsis');
  pages.push(totalPages);

  return pages;
}

export function Pagination({ page, total, pageSize, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const goTo = (next: number) => {
    if (next < 1 || next > totalPages || next === page) return;
    onChange(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="分页">
      <button
        type="button"
        onClick={() => goTo(page - 1)}
        disabled={page <= 1}
        className="grid h-9 w-9 place-items-center rounded-full border border-ink/15 bg-white/60 text-ink-soft transition hover:border-ink/30 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="上一页"
      >
        <IconChevronLeft className="h-4 w-4" />
      </button>

      {buildPages(page, totalPages).map((token, index) =>
        token === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className="grid h-9 w-7 place-items-center text-sm text-ink-faint"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <button
            key={token}
            type="button"
            onClick={() => goTo(token)}
            aria-current={token === page ? 'page' : undefined}
            className={cx(
              'grid h-9 min-w-9 place-items-center rounded-full px-2 text-sm transition',
              token === page
                ? 'bg-ink font-medium text-paper shadow-sm'
                : 'border border-transparent text-ink-soft hover:border-ink/15 hover:bg-white/70 hover:text-ink',
            )}
          >
            {token}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => goTo(page + 1)}
        disabled={page >= totalPages}
        className="grid h-9 w-9 place-items-center rounded-full border border-ink/15 bg-white/60 text-ink-soft transition hover:border-ink/30 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="下一页"
      >
        <IconChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
