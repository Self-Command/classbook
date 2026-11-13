import { Button, Pagination } from '@heroui/react';

interface PaginationBarProps {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

type PageItem = number | 'ellipsis';

function getPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: PageItem[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) items.push('ellipsis');
  for (let current = start; current <= end; current += 1) items.push(current);
  if (end < totalPages - 1) items.push('ellipsis');
  items.push(totalPages);

  return items;
}

export function PaginationBar({ page, total, pageSize, onChange }: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const items = getPageItems(page, totalPages);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="mt-8">
      <Pagination
        aria-label="分页"
        className="hidden flex-col gap-3 sm:flex sm:flex-row sm:items-center sm:justify-between"
        size="md"
      >
        <Pagination.Summary className="text-xs text-muted">
          第 {startItem}–{endItem} 条 · 共 {total} 条
        </Pagination.Summary>
        <Pagination.Content className="flex-wrap gap-1">
          <Pagination.Item>
            <Pagination.Previous
              isDisabled={page <= 1}
              onPress={() => onChange(page - 1)}
            >
              <Pagination.PreviousIcon />
              <span>上一页</span>
            </Pagination.Previous>
          </Pagination.Item>

          {items.map((item, index) =>
            item === 'ellipsis' ? (
              <Pagination.Item key={`ellipsis-${index}`}>
                <Pagination.Ellipsis />
              </Pagination.Item>
            ) : (
              <Pagination.Item key={item}>
                <Pagination.Link isActive={item === page} onPress={() => onChange(item)}>
                  {item}
                </Pagination.Link>
              </Pagination.Item>
            ),
          )}

          <Pagination.Item>
            <Pagination.Next
              isDisabled={page >= totalPages}
              onPress={() => onChange(page + 1)}
            >
              <span>下一页</span>
              <Pagination.NextIcon />
            </Pagination.Next>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>

      <div className="flex items-center justify-between gap-3 sm:hidden">
        <Button
          isDisabled={page <= 1}
          size="sm"
          variant="secondary"
          onPress={() => onChange(page - 1)}
        >
          上一页
        </Button>
        <span className="text-xs text-muted">
          第 {page} / {totalPages} 页
        </span>
        <Button
          isDisabled={page >= totalPages}
          size="sm"
          variant="secondary"
          onPress={() => onChange(page + 1)}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}
