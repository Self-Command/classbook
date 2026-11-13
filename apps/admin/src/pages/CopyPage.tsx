import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_SITE_COPY,
  SITE_COPY_FIELDS,
  type SiteCopy,
} from '@classbook/shared';
import {
  Button,
  Card,
  Chip,
  Input,
  Label,
  SearchField,
  Spinner,
  TextArea,
  TextField,
  toast,
} from '@heroui/react';
import { admin, getErrorMessage } from '../lib/api';
import { useAsyncData } from '../lib/useAsyncData';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorBlock, LoadingBlock } from '../components/ui/States';

interface CopyGroup {
  group: string;
  fields: (typeof SITE_COPY_FIELDS)[number][];
}

function groupFields(fields: CopyGroup['fields']): CopyGroup[] {
  const groups: CopyGroup[] = [];
  for (const field of fields) {
    const existing = groups.find((item) => item.group === field.group);
    if (existing) {
      existing.fields.push(field);
    } else {
      groups.push({ group: field.group, fields: [field] });
    }
  }
  return groups;
}

function buildDiff(values: SiteCopy, saved: SiteCopy): Partial<SiteCopy> {
  const diff: Partial<SiteCopy> = {};
  for (const field of SITE_COPY_FIELDS) {
    if (values[field.key] !== saved[field.key]) {
      diff[field.key] = values[field.key];
    }
  }
  return diff;
}

export function CopyPage() {
  const { data, loading, error, reload } = useAsyncData(() => admin.settings(), []);
  const [values, setValues] = useState<SiteCopy>({ ...DEFAULT_SITE_COPY });
  const [saved, setSaved] = useState<SiteCopy>({ ...DEFAULT_SITE_COPY });
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setValues(data.copy);
    setSaved(data.copy);
  }, [data]);

  const query = search.trim().toLowerCase();

  const filteredFields = useMemo(
    () =>
      SITE_COPY_FIELDS.filter((field) => {
        if (!query) return true;
        return (
          field.key.toLowerCase().includes(query) ||
          field.label.toLowerCase().includes(query) ||
          field.group.toLowerCase().includes(query) ||
          (values[field.key] ?? '').toLowerCase().includes(query)
        );
      }),
    [query, values],
  );

  const groups = useMemo(() => groupFields([...filteredFields]), [filteredFields]);
  const changedCount = useMemo(() => Object.keys(buildDiff(values, saved)).length, [values, saved]);

  const resetAll = () => {
    setValues({ ...DEFAULT_SITE_COPY });
  };

  const resetField = (key: keyof SiteCopy) => {
    setValues((current) => ({ ...current, [key]: DEFAULT_SITE_COPY[key] }));
  };

  const handleSave = async () => {
    if (saving) return;
    const diff = buildDiff(values, saved);
    if (Object.keys(diff).length === 0) {
      toast.info('没有需要保存的修改');
      return;
    }

    setSaving(true);
    try {
      const updated = await admin.updateSettings({ copy: diff });
      setValues(updated.copy);
      setSaved(updated.copy);
      toast.success('文案已保存');
    } catch (cause) {
      toast.danger(getErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <>
        <PageHeader title="文案管理" description="统一维护展示站上的全站文案。" />
        <LoadingBlock label="正在读取文案…" />
      </>
    );
  }

  if (error && !data) {
    return (
      <>
        <PageHeader title="文案管理" description="统一维护展示站上的全站文案。" />
        <ErrorBlock message={getErrorMessage(error)} onRetry={reload} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="文案管理"
        description="按分组维护展示站文案，保存后仅更新有改动的字段。"
        actions={
          <Button onPress={handleSave} isPending={saving} isDisabled={saving}>
            {({ isPending }) => (
              <>
                {isPending ? <Spinner color="current" size="sm" /> : null}
                {isPending ? '正在保存…' : '保存'}
              </>
            )}
          </Button>
        }
      />

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchField
            className="flex-1"
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
          >
            <Label className="sr-only">搜索文案</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="搜索 key / 标签 / 分组 / 文案内容" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          <div className="flex flex-wrap items-center gap-2">
            {changedCount > 0 ? (
              <Chip size="sm" variant="soft" color="warning">
                {changedCount} 项未保存
              </Chip>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              isDisabled={saving}
              onPress={resetAll}
            >
              <Icon name="refresh" className="size-4" />
              全部恢复默认
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-4 space-y-3">
        {groups.length === 0 ? (
          <EmptyState
            icon="search"
            title="没有匹配的文案"
            description="换个关键词试试，或者清空搜索查看全部字段。"
            action={
              <Button variant="secondary" onPress={() => setSearch('')}>
                清空搜索
              </Button>
            }
          />
        ) : (
          groups.map(({ group, fields }) => (
            <details
              key={`${group}:${query ? 'search' : 'all'}`}
              open={query.length > 0}
              className="group overflow-hidden rounded-2xl border border-separator bg-surface"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 select-none hover:bg-default/60 sm:px-5 [&::-webkit-details-marker]:hidden">
                <div className="flex min-w-0 items-center gap-2">
                  <Icon
                    name="chevronRight"
                    className="size-4 shrink-0 text-muted transition-transform group-open:rotate-90"
                  />
                  <span className="font-display text-base font-semibold text-foreground">
                    {group}
                  </span>
                  <Chip size="sm" variant="soft">
                    {fields.length}
                  </Chip>
                </div>
                <span className="shrink-0 text-[11px] text-muted">
                  {fields.filter((field) => values[field.key] !== saved[field.key]).length > 0
                    ? `${fields.filter((field) => values[field.key] !== saved[field.key]).length} 项已修改`
                    : '已同步'}
                </span>
              </summary>

              <div className="border-t border-separator">
                {fields.map((field) => {
                  const value = values[field.key];
                  const changed = value !== saved[field.key];
                  const isDefault = value === DEFAULT_SITE_COPY[field.key];
                  return (
                    <div
                      key={field.key}
                      className="border-b border-separator/60 px-4 py-4 last:border-b-0 sm:px-5"
                    >
                      <TextField
                        name={field.key}
                        value={value}
                        onChange={(next) =>
                          setValues((current) => ({ ...current, [field.key]: next }))
                        }
                        isDisabled={saving}
                      >
                        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Label>{field.label}</Label>
                          <span className="font-mono text-[11px] text-muted">{field.key}</span>
                          <span className="text-[11px] text-muted">最多 {field.max} 字</span>
                          {changed ? (
                            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] text-warning">
                              已修改
                            </span>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="ml-auto"
                            isDisabled={saving || isDefault}
                            onPress={() => resetField(field.key)}
                          >
                            <Icon name="refresh" className="size-3.5" />
                            恢复默认
                          </Button>
                        </div>

                        {field.max >= 100 ? (
                          <TextArea
                            placeholder={DEFAULT_SITE_COPY[field.key]}
                            rows={3}
                            maxLength={field.max}
                          />
                        ) : (
                          <Input placeholder={DEFAULT_SITE_COPY[field.key]} maxLength={field.max} />
                        )}

                        <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-muted">
                          <span className="truncate">默认：{DEFAULT_SITE_COPY[field.key]}</span>
                          <span className="shrink-0 tabular-nums">
                            {value.length}/{field.max}
                          </span>
                        </div>
                      </TextField>
                    </div>
                  );
                })}
              </div>
            </details>
          ))
        )}
      </div>
    </>
  );
}
