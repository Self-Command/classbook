import { useEffect, useState } from 'react';
import type { MessageDto, MessageStatus } from '@classbook/shared';
import { Avatar, Button, Card, Chip, Spinner, Tabs, toast } from '@heroui/react';
import { admin, getErrorMessage } from '../lib/api';
import { formatDateTime, truncate } from '../lib/format';
import { useAsyncData } from '../lib/useAsyncData';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DataPagination } from '../components/ui/DataPagination';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorBlock, LoadingBlock } from '../components/ui/States';

type Filter = 'ALL' | MessageStatus;

const PAGE_SIZE = 10;

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'ALL', label: '全部' },
  { key: 'VISIBLE', label: '可见' },
  { key: 'HIDDEN', label: '已隐藏' },
];

export function MessagesPage() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);
  const [hideTarget, setHideTarget] = useState<MessageDto | null>(null);
  const [hideBusy, setHideBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, loading, error, reload } = useAsyncData(
    () =>
      admin.messages({
        page,
        pageSize: PAGE_SIZE,
        status: filter === 'ALL' ? undefined : filter,
      }),
    [filter, page],
  );

  const messages = data?.items ?? [];

  useEffect(() => {
    if (data && data.items.length === 0 && page > 1) {
      setPage((current) => Math.max(1, current - 1));
    }
  }, [data, page]);

  const changeFilter = (next: Filter) => {
    setFilter(next);
    setPage(1);
  };

  const restoreMessage = async (message: MessageDto) => {
    setBusyId(message.id);
    try {
      await admin.updateMessageStatus(message.id, 'VISIBLE');
      toast.success('留言已恢复可见');
      reload();
    } catch (cause) {
      toast.danger(getErrorMessage(cause));
    } finally {
      setBusyId(null);
    }
  };

  const hideMessage = async () => {
    if (!hideTarget) return;
    setHideBusy(true);
    try {
      await admin.updateMessageStatus(hideTarget.id, 'HIDDEN');
      toast.success('留言已隐藏，展示站将不再显示');
      setHideTarget(null);
      reload();
    } catch (cause) {
      toast.danger(getErrorMessage(cause));
    } finally {
      setHideBusy(false);
    }
  };

  const content = loading && !data ? (
    <LoadingBlock label="正在读取留言…" />
  ) : error && !data ? (
    <ErrorBlock message={getErrorMessage(error)} onRetry={reload} />
  ) : messages.length === 0 ? (
    <EmptyState
      icon="message"
      title={filter === 'HIDDEN' ? '没有隐藏的留言' : '这里还没有留言'}
      description={
        filter === 'HIDDEN'
          ? '被隐藏的留言会集中出现在这里，方便复查和恢复。'
          : '同学们发布的留言会按时间倒序出现在这里。'
      }
    />
  ) : (
    <>
      <div className="space-y-3">
        {messages.map((message) => {
          const authorName = message.author.disabled ? '已注销同学' : message.author.realName;
          const hidden = message.status === 'HIDDEN';
          const busy = busyId === message.id;
          return (
            <Card
              key={message.id}
              className={hidden ? 'border-danger/20 bg-danger/5' : undefined}
            >
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                <div className="flex min-w-0 flex-1 gap-3">
                  <Avatar size="md">
                    {!message.author.disabled && message.author.avatarUrl ? (
                      <Avatar.Image alt={authorName} src={message.author.avatarUrl} />
                    ) : null}
                    <Avatar.Fallback>{authorName.slice(0, 1)}</Avatar.Fallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-sm font-medium text-foreground">{authorName}</p>
                      {message.author.disabled ? (
                        <Chip size="sm" variant="soft">
                          账号已禁用
                        </Chip>
                      ) : null}
                      <Chip size="sm" color={hidden ? 'danger' : 'success'} variant="soft">
                        {hidden ? '已隐藏' : '可见'}
                      </Chip>
                      <span className="text-[11px] text-muted">
                        {message.toUser ? `写给 ${message.toUser.realName}` : '班级留言墙'}
                      </span>
                      <span className="ml-auto whitespace-nowrap text-[11px] text-muted">
                        {formatDateTime(message.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                      {message.content}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
                  {hidden ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      isPending={busy}
                      onPress={() => restoreMessage(message)}
                    >
                      {({ isPending }) => (
                        <>
                          {isPending ? (
                            <Spinner color="current" size="sm" />
                          ) : (
                            <Icon name="eye" className="size-3.5" />
                          )}
                          {isPending ? '恢复中…' : '恢复可见'}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button size="sm" variant="danger-soft" onPress={() => setHideTarget(message)}>
                      <Icon name="eyeOff" className="size-3.5" />
                      隐藏
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <DataPagination
        className="mt-4"
        page={data?.page ?? page}
        pageSize={data?.pageSize ?? PAGE_SIZE}
        total={data?.total ?? 0}
        onPageChange={setPage}
      />
    </>
  );

  return (
    <>
      <PageHeader
        title="留言审核"
        description="查看班级留言，隐藏不适宜的内容。隐藏后展示站立即不可见，可随时恢复。"
        actions={
          <Button variant="secondary" isPending={loading} onPress={reload}>
            {({ isPending }) => (
              <>
                <Icon name="refresh" className={isPending ? 'size-4 animate-spin' : 'size-4'} />
                刷新
              </>
            )}
          </Button>
        }
      />

      <Tabs
        selectedKey={filter}
        onSelectionChange={(key) => changeFilter(key as Filter)}
        className="w-full"
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Tabs.ListContainer>
            <Tabs.List aria-label="留言筛选">
              {FILTERS.map((item) => (
                <Tabs.Tab key={item.key} id={item.key} className="whitespace-nowrap">
                  {item.label}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
          <p className="text-xs text-muted">
            共 {data?.total ?? 0} 条留言{filter === 'HIDDEN' ? ' · 仅显示已隐藏' : ''}
          </p>
        </div>

        {FILTERS.map((item) => (
          <Tabs.Panel key={item.key} id={item.key} className="pt-0">
            {filter === item.key ? content : null}
          </Tabs.Panel>
        ))}
      </Tabs>

      <ConfirmDialog
        open={hideTarget !== null}
        title="隐藏留言"
        description={
          hideTarget ? (
            <>
              隐藏后，这条留言将从展示站消失，但记录会保留，可随时恢复。
              <span className="mt-2 block rounded-xl bg-default/60 px-3 py-2 text-xs leading-5 text-muted">
                {truncate(hideTarget.content, 120)}
              </span>
            </>
          ) : null
        }
        confirmLabel="确认隐藏"
        danger
        loading={hideBusy}
        onConfirm={hideMessage}
        onClose={() => {
          if (!hideBusy) setHideTarget(null);
        }}
      />
    </>
  );
}
