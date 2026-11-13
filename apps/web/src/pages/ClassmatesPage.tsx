import { useState } from 'react';
import { PAGE_SIZE_DEFAULT } from '@classbook/shared';
import { Button, Label, SearchField, Spinner } from '@heroui/react';
import { profilesApi } from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useSiteCopy } from '@/lib/siteCopy';
import { IconSearch, IconUsers } from '@/components/icons';
import { ClassmateCard } from '@/components/content/ClassmateCard';
import { EmptyPanel, ErrorPanel } from '@/components/content/ContentStates';
import { ClassmateGridSkeleton } from '@/components/content/ContentSkeletons';
import { PageShell } from '@/components/content/PageShell';
import { PaginationBar } from '@/components/content/PaginationBar';

export default function ClassmatesPage() {
  const { copy } = useSiteCopy();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const { data, loading, error, reload } = useAsyncData(
    () =>
      profilesApi.list({
        q: debouncedQuery || undefined,
        page,
        pageSize: PAGE_SIZE_DEFAULT,
      }),
    [debouncedQuery, page],
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const clearSearch = () => {
    setQuery('');
    setPage(1);
  };

  return (
    <PageShell
      description={copy.classmatesDescription}
      eyebrow="同窗名录"
      title={copy.classmatesTitle}
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SearchField
          aria-label="搜索同学"
          className="w-full sm:max-w-sm"
          fullWidth
          value={query}
          onChange={handleQueryChange}
        >
          <Label className="sr-only">搜索同学</Label>
          <SearchField.Group>
            <SearchField.SearchIcon>
              <IconSearch className="size-4" />
            </SearchField.SearchIcon>
            <SearchField.Input placeholder="搜索姓名或昵称…" />
            <SearchField.ClearButton aria-label="清空搜索" />
          </SearchField.Group>
        </SearchField>

        <p className="flex items-center gap-2 text-xs text-muted" role="status">
          {loading && <Spinner size="sm" />}
          {loading
            ? '正在寻找同学们…'
            : data
              ? `共 ${data.total} 位同学`
              : '暂时无法统计'}
        </p>
      </div>

      {loading && !data && <ClassmateGridSkeleton />}

      {!loading && error && (
        <ErrorPanel message={error} title="同学录暂时打不开" onRetry={reload} />
      )}

      {!loading && !error && data && data.items.length === 0 && (
        <EmptyPanel
          action={
            debouncedQuery ? (
              <Button size="sm" variant="secondary" onPress={clearSearch}>
                清空搜索
              </Button>
            ) : undefined
          }
          description={
            debouncedQuery
              ? '换一个名字或昵称试试看。'
              : copy.classmatesEmptyDescription
          }
          icon={<IconUsers className="size-5" />}
          title={debouncedQuery ? '没有找到匹配的同学' : copy.classmatesEmptyTitle}
        />
      )}

      {data && data.items.length > 0 && (
        <div className={loading ? 'pointer-events-none opacity-60' : ''}>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {data.items.map((profile, index) => (
              <ClassmateCard key={profile.id} index={index} profile={profile} />
            ))}
          </div>
          <PaginationBar
            onChange={setPage}
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
          />
        </div>
      )}
    </PageShell>
  );
}