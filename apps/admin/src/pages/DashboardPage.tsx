import { Link } from 'react-router-dom';
import type { AdminStatsDto, MessageDto } from '@classbook/shared';
import { Avatar, Button, Card, Chip, Skeleton } from '@heroui/react';
import { admin, getErrorMessage } from '../lib/api';
import { cn } from '../lib/cn';
import { formatDateTime } from '../lib/format';
import { useAsyncData } from '../lib/useAsyncData';
import { Icon, type IconName } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBlock } from '../components/ui/States';

interface StatConfig {
  key: keyof Pick<
    AdminStatsDto,
    'memberCount' | 'messageCount' | 'hiddenMessageCount' | 'privateMessageCount' | 'photoCount' | 'activeInviteCount'
  >;
  label: string;
  hint: string;
  icon: IconName;
  tone: 'accent' | 'success' | 'warning' | 'danger' | 'default';
}

const STATS: StatConfig[] = [
  { key: 'memberCount', label: '成员数', hint: '已启用的班级成员', icon: 'users', tone: 'accent' },
  { key: 'messageCount', label: '内容数', hint: '全部内容（含隐藏）', icon: 'message', tone: 'success' },
  { key: 'hiddenMessageCount', label: '隐藏内容', hint: '当前在展示站不可见', icon: 'eyeOff', tone: 'danger' },
  { key: 'privateMessageCount', label: '私密留言', hint: '仅统计数量，内容不可见', icon: 'lock', tone: 'default' },
  { key: 'photoCount', label: '照片数', hint: '所有相册中的照片', icon: 'image', tone: 'default' },
  { key: 'activeInviteCount', label: '有效邀请码', hint: '未停用、未过期、未用完', icon: 'ticket', tone: 'warning' },
];

const QUICK_LINKS: Array<{ to: string; label: string; description: string; icon: IconName }> = [
  { to: '/invites', label: '生成邀请码', description: '邀请新同学加入班级', icon: 'ticket' },
  { to: '/messages', label: '审核留言', description: '处理被隐藏的留言', icon: 'message' },
  { to: '/albums', label: '整理相册', description: '上传照片、设置封面', icon: 'album' },
  { to: '/settings', label: '站点设置', description: '更新班级信息与封面', icon: 'settings' },
];

const TONE_CLASSES: Record<StatConfig['tone'], string> = {
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/20 text-warning',
  danger: 'bg-danger/10 text-danger',
  default: 'bg-default text-foreground',
};

function RecentMessage({ message }: { message: MessageDto }) {
  const authorName = message.author.disabled ? '已注销同学' : message.author.realName;
  const hidden = message.status === 'HIDDEN';

  return (
    <li className="flex gap-3 px-4 py-4 sm:px-6">
      <Avatar size="sm">
        {!message.author.disabled && message.author.avatarUrl ? (
          <Avatar.Image alt={authorName} src={message.author.avatarUrl} />
        ) : null}
        <Avatar.Fallback>{authorName.slice(0, 1)}</Avatar.Fallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-medium text-foreground">{authorName}</p>
          {message.toUser ? (
            <span className="text-[11px] text-muted">写给 {message.toUser.realName}</span>
          ) : null}
          <Chip size="sm" color={hidden ? 'danger' : 'success'} variant="soft">
            {hidden ? '已隐藏' : '可见'}
          </Chip>
          <span className="ml-auto text-[11px] text-muted">{formatDateTime(message.createdAt)}</span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted">{message.content}</p>
      </div>
    </li>
  );
}

export function DashboardPage() {
  const { data, loading, error, reload } = useAsyncData(() => admin.stats(), []);

  return (
    <>
      <PageHeader
        title="仪表盘"
        description="掌握班级空间的动态与待处理内容。"
        actions={
          <Button variant="secondary" isPending={loading} onPress={reload}>
            {({ isPending }) => (
              <>
                <Icon name="refresh" className={isPending ? 'size-4 animate-spin' : 'size-4'} />
                {isPending ? '刷新中…' : '刷新数据'}
              </>
            )}
          </Button>
        }
      />

      {error && !data ? <ErrorBlock message={getErrorMessage(error)} onRetry={reload} /> : null}

      { !error || data ? (
        <>
          {error && data ? (
            <div className="mb-4 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
              {getErrorMessage(error)}，以下为上次加载的数据。
            </div>
          ) : null}

          <section
            className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5"
            aria-label="站点统计"
          >
            {STATS.map((stat, index) =>
              loading && !data ? (
                <Card
                  key={stat.key}
                  className={cn('gap-3', index === STATS.length - 1 && 'col-span-2 md:col-span-1')}
                >
                  <Skeleton className="size-9 rounded-xl" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-12" />
                </Card>
              ) : (
                <Card
                  key={stat.key}
                  className={cn('gap-3', index === STATS.length - 1 && 'col-span-2 md:col-span-1')}
                >
                  <span
                    className={`flex size-9 items-center justify-center rounded-xl ${TONE_CLASSES[stat.tone]}`}
                  >
                    <Icon name={stat.icon} className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs text-muted">{stat.label}</p>
                    <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">
                      {data?.[stat.key] ?? 0}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-4 text-muted">{stat.hint}</p>
                  </div>
                </Card>
              ),
            )}
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_0.85fr]">
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between gap-3 border-b border-separator px-4 py-4 sm:px-6">
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">最近留言</h2>
                  <p className="mt-0.5 text-xs text-muted">最新 5 条，含已隐藏内容</p>
                </div>
                <Link
                  to="/messages"
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent transition hover:opacity-80"
                >
                  审核留言
                  <Icon name="chevronRight" className="size-3.5" />
                </Link>
              </div>

              {loading && !data ? (
                <div className="space-y-4 p-5">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : data && data.recentMessages.length > 0 ? (
                <ul className="divide-y divide-separator">
                  {data.recentMessages.map((message) => (
                    <RecentMessage key={message.id} message={message} />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon="message"
                  title="留言墙还很安静"
                  description="同学们的第一条留言会出现在这里。"
                  className="m-4 border-0 bg-transparent"
                />
              )}
            </Card>

            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-foreground">快捷操作</h2>
                <span className="text-[11px] text-muted">常用入口</span>
              </div>
              <div className="mt-3 space-y-1">
                {QUICK_LINKS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="group flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 transition-colors hover:border-border hover:bg-default/60"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-default text-foreground">
                      <Icon name={item.icon} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{item.label}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted">
                        {item.description}
                      </span>
                    </span>
                    <Icon
                      name="chevronRight"
                      className="size-4 shrink-0 text-muted transition group-hover:text-foreground"
                    />
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </>
  );
}
