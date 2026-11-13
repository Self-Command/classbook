import { paginationSchema } from '@classbook/shared';

export interface Pagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function getPagination(query: unknown): Pagination {
  const { page, pageSize } = paginationSchema.parse(query);
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function getStringQuery(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
