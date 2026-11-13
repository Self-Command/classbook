import { useState } from 'react';
import type { TimelineEventDto } from '@classbook/shared';
import { Button, Card, Chip, toast } from '@heroui/react';
import { getErrorMessage, timeline, type TimelineCreateInput } from '../lib/api';
import { formatDate, formatYear } from '../lib/format';
import { useAsyncData } from '../lib/useAsyncData';
import { TimelineFormModal } from '../components/timeline/TimelineFormModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorBlock, LoadingBlock } from '../components/ui/States';

export function TimelinePage() {
  const { data, loading, error, reload } = useAsyncData(() => timeline.list(), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TimelineEventDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TimelineEventDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const events = data ?? [];

  const grouped = new Map<string, TimelineEventDto[]>();
  for (const event of events) {
    const year = formatYear(event.date) || '未知年份';
    const bucket = grouped.get(year);
    if (bucket) bucket.push(event);
    else grouped.set(year, [event]);
  }
  const groups = Array.from(grouped.entries());

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (event: TimelineEventDto) => {
    setEditing(event);
    setFormOpen(true);
  };

  const handleSubmit = async (input: TimelineCreateInput) => {
    if (editing) {
      await timeline.update(editing.id, input);
      toast.success('时间线事件已更新');
    } else {
      await timeline.create(input);
      toast.success('时间线事件已添加');
    }
    reload();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await timeline.remove(deleteTarget.id);
      toast.success(`事件「${deleteTarget.title}」已删除`);
      setDeleteTarget(null);
      reload();
    } catch (cause) {
      toast.danger(getErrorMessage(cause));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="时间线"
        description="把班会、旅行、毕业典礼这些共同记忆串成一条时间线，展示站会按年份分组呈现。"
        actions={
          <>
            <Button variant="secondary" isPending={loading} onPress={reload}>
              {({ isPending }) => (
                <>
                  <Icon name="refresh" className={isPending ? 'size-4 animate-spin' : 'size-4'} />
                  刷新
                </>
              )}
            </Button>
            <Button onPress={openCreate}>
              <Icon name="plus" className="size-4" />
              新增事件
            </Button>
          </>
        }
      />

      {loading && !data ? (
        <LoadingBlock label="正在读取时间线…" />
      ) : error && !data ? (
        <ErrorBlock message={getErrorMessage(error)} onRetry={reload} />
      ) : events.length === 0 ? (
        <EmptyState
          icon="timeline"
          title="时间线还是空的"
          description="从第一次班会或某次难忘的旅行开始记录吧。"
          action={
            <Button onPress={openCreate}>
              <Icon name="plus" className="size-4" />
              记录第一个事件
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {groups.map(([year, yearEvents]) => (
            <section key={year}>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  {year}
                  {year !== '未知年份' ? (
                    <span className="ml-0.5 text-base text-muted">年</span>
                  ) : null}
                </h2>
                <span className="h-px flex-1 bg-separator" />
                <span className="text-[11px] text-muted">{yearEvents.length} 条</span>
              </div>

              <div className="relative ml-2 border-l border-border pl-5 sm:ml-3 sm:pl-8">
                {yearEvents.map((event) => (
                  <div key={event.id} className="relative pb-4 last:pb-0">
                    <span className="absolute -left-[7px] top-5 size-3 rounded-full border-2 border-background bg-accent" />
                    <Card className="overflow-hidden p-0">
                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:p-5">
                        {event.imageUrl ? (
                          <img
                            src={event.imageUrl}
                            alt={event.title}
                            loading="lazy"
                            className="h-36 w-full rounded-xl object-cover sm:h-24 sm:w-32 sm:shrink-0"
                          />
                        ) : null}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                            <Chip size="sm" variant="soft" className="mt-0.5">
                              {formatDate(event.date)}
                            </Chip>
                            <h3 className="min-w-0 flex-1 font-display text-lg font-semibold leading-6 text-foreground">
                              {event.title}
                            </h3>
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="ghost"
                                aria-label={`编辑事件 ${event.title}`}
                                onPress={() => openEdit(event)}
                              >
                                <Icon name="edit" className="size-4" />
                              </Button>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="ghost"
                                className="text-danger"
                                aria-label={`删除事件 ${event.title}`}
                                onPress={() => setDeleteTarget(event)}
                              >
                                <Icon name="trash" className="size-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted">
                            {event.description || '这个事件还没有描述。'}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <TimelineFormModal
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除时间线事件"
        description={
          deleteTarget ? (
            <>
              确定要删除事件{' '}
              <span className="font-medium text-foreground">「{deleteTarget.title}」</span>{' '}
              吗？删除后展示站将不再显示这条时间线记录。
            </>
          ) : null
        }
        confirmLabel="确认删除"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </>
  );
}
