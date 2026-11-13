import { Pagination } from '@heroui/react';
import { cn } from '../../lib/cn';

interface DataPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function pageItems(current: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  if (start > 2) items.push('ellipsis');
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < totalPages - 1) items.push('ellipsis');
  items.push(totalPages);

  return items;
}

export function DataPagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: DataPaginationProps) {
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <Pagination size="sm" className={cn('w-full', className)}>
      <Pagination.Summary>
        显示 {start}–{end} 条，共 {total} 条
      </Pagination.Summary>
      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous
            isDisabled={page <= 1}
            onPress={() => onPageChange(page - 1)}
            aria-label="上一页"
          >
            <Pagination.PreviousIcon />
            <span className="hidden sm:inline">上一页</span>
          </Pagination.Previous>
        </Pagination.Item>
        {pageItems(page, totalPages).map((item, index) =>
          item === 'ellipsis' ? (
            <Pagination.Item key={`ellipsis-${index}`} className="hidden sm:flex">
              <Pagination.Ellipsis />
            </Pagination.Item>
          ) : (
            <Pagination.Item key={item} className="hidden sm:flex">
              <Pagination.Link isActive={item === page} onPress={() => onPageChange(item)}>
                {item}
              </Pagination.Link>
            </Pagination.Item>
          ),
        )}
        <Pagination.Item className="sm:hidden">
          <span className="px-2 text-xs text-muted">
            {page} / {totalPages}
          </span>
        </Pagination.Item>
        <Pagination.Item>
          <Pagination.Next
            isDisabled={page >= totalPages}
            onPress={() => onPageChange(page + 1)}
            aria-label="下一页"
          >
            <span className="hidden sm:inline">下一页</span>
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  );
}
