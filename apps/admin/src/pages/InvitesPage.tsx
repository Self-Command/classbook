import { useState } from 'react';
import type { InviteCodeDto } from '@classbook/shared';
import { Button, Card, Chip, Table, toast } from '@heroui/react';
import { admin, getErrorMessage } from '../lib/api';
import { copyText } from '../lib/clipboard';
import { formatDateTime } from '../lib/format';
import { useAsyncData } from '../lib/useAsyncData';
import { InviteCreateModal } from '../components/invites/InviteCreateModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorBlock, LoadingBlock } from '../components/ui/States';

type InviteColor = 'success' | 'warning' | 'danger' | 'default';

interface InviteStatus {
  label: string;
  color: InviteColor;
  active: boolean;
}

function getInviteStatus(invite: InviteCodeDto): InviteStatus {
  if (invite.disabled) return { label: '已停用', color: 'default', active: false };
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now()) {
    return { label: '已过期', color: 'warning', active: false };
  }
  if (invite.usedCount >= invite.maxUses) {
    return { label: '已用完', color: 'warning', active: false };
  }
  return { label: '有效', color: 'success', active: true };
}

export function InvitesPage() {
  const { data, loading, error, reload } = useAsyncData(() => admin.invites(), []);
  const [createOpen, setCreateOpen] = useState(false);
  const [latestInvite, setLatestInvite] = useState<InviteCodeDto | null>(null);
  const [disableTarget, setDisableTarget] = useState<InviteCodeDto | null>(null);
  const [disabling, setDisabling] = useState(false);

  const invites = data ?? [];
  const activeCount = invites.filter((invite) => getInviteStatus(invite).active).length;

  const handleCopy = async (code: string) => {
    try {
      await copyText(code);
      toast.success(`邀请码 ${code} 已复制`);
    } catch (cause) {
      toast.danger(getErrorMessage(cause));
    }
  };

  const handleDisable = async () => {
    if (!disableTarget) return;
    setDisabling(true);
    try {
      await admin.disableInvite(disableTarget.id);
      toast.success(`邀请码 ${disableTarget.code} 已停用`);
      if (latestInvite?.id === disableTarget.id) setLatestInvite(null);
      setDisableTarget(null);
      reload();
    } catch (cause) {
      toast.danger(getErrorMessage(cause));
    } finally {
      setDisabling(false);
    }
  };

  return (
    <>
      <PageHeader
        title="邀请码"
        description="生成一次性或多次邀请码，分享给还没有加入班级的同学。"
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
            <Button onPress={() => setCreateOpen(true)}>
              <Icon name="plus" className="size-4" />
              生成邀请码
            </Button>
          </>
        }
      />

      {latestInvite ? (
        <Card className="mb-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-success/15 text-success">
                <Icon name="check" className="size-4" strokeWidth={2.4} />
              </span>
              <div>
                <p className="text-xs text-success">新邀请码已生成</p>
                <p className="mt-0.5 font-mono text-lg font-semibold tracking-[0.2em] text-foreground">
                  {latestInvite.code}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onPress={() => handleCopy(latestInvite.code)}>
                <Icon name="copy" className="size-3.5" />
                复制邀请码
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label="关闭新邀请码提示"
                onPress={() => setLatestInvite(null)}
              >
                <Icon name="close" className="size-4" />
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-separator px-4 py-3 sm:px-5">
          <p className="text-xs text-muted">
            共 {invites.length} 个邀请码 · 有效 {activeCount} 个
          </p>
        </div>

        {loading && !data ? (
          <LoadingBlock label="正在读取邀请码…" />
        ) : error && !data ? (
          <div className="p-4">
            <ErrorBlock message={getErrorMessage(error)} onRetry={reload} />
          </div>
        ) : invites.length === 0 ? (
          <EmptyState
            icon="ticket"
            title="还没有邀请码"
            description="生成一个邀请码，把它发给想加入班级的同学。"
            className="m-4 border-0 bg-transparent"
            action={
              <Button onPress={() => setCreateOpen(true)}>
                <Icon name="plus" className="size-4" />
                生成第一个邀请码
              </Button>
            }
          />
        ) : (
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="邀请码列表" className="min-w-[980px]">
                <Table.Header>
                  <Table.Column isRowHeader>邀请码</Table.Column>
                  <Table.Column>备注</Table.Column>
                  <Table.Column>使用情况</Table.Column>
                  <Table.Column>状态</Table.Column>
                  <Table.Column>有效期</Table.Column>
                  <Table.Column>创建时间</Table.Column>
                  <Table.Column className="text-right">操作</Table.Column>
                </Table.Header>
                <Table.Body items={invites}>
                  {(invite) => {
                    const status = getInviteStatus(invite);
                    const percent =
                      invite.maxUses > 0
                        ? Math.min(100, Math.round((invite.usedCount / invite.maxUses) * 100))
                        : 0;
                    return (
                      <Table.Row>
                        <Table.Cell>
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-default px-2.5 py-1.5 font-mono text-sm font-semibold tracking-[0.16em] text-foreground">
                              {invite.code}
                            </span>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="ghost"
                              aria-label={`复制邀请码 ${invite.code}`}
                              onPress={() => handleCopy(invite.code)}
                            >
                              <Icon name="copy" className="size-3.5" />
                            </Button>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="line-clamp-2 max-w-48 text-xs text-muted">
                            {invite.note || '—'}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="min-w-28">
                            <p className="text-xs tabular-nums text-muted">
                              <span className="font-medium text-foreground">{invite.usedCount}</span>
                              <span> / {invite.maxUses}</span>
                            </p>
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-default">
                              <div
                                className={
                                  invite.usedCount >= invite.maxUses ? 'h-full bg-muted' : 'h-full bg-accent'
                                }
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <Chip size="sm" color={status.color} variant="soft">
                            {status.label}
                          </Chip>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="whitespace-nowrap text-xs text-muted">
                            {invite.expiresAt ? formatDateTime(invite.expiresAt) : '永久有效'}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="whitespace-nowrap text-xs text-muted">
                            {formatDateTime(invite.createdAt)}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              onPress={() => handleCopy(invite.code)}
                            >
                              <Icon name="copy" className="size-3.5" />
                              复制
                            </Button>
                            {status.active ? (
                              <Button
                                size="sm"
                                variant="danger-soft"
                                onPress={() => setDisableTarget(invite)}
                              >
                                停用
                              </Button>
                            ) : null}
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    );
                  }}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </Card>

      <InviteCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(invite) => {
          setLatestInvite(invite);
          reload();
        }}
      />

      <ConfirmDialog
        open={disableTarget !== null}
        title="停用邀请码"
        description={
          disableTarget ? (
            <>
              确定要停用邀请码{' '}
              <span className="font-mono font-medium text-foreground">{disableTarget.code}</span>{' '}
              吗？停用后将不能再用于注册，已经注册的同学不受影响。
            </>
          ) : null
        }
        confirmLabel="确认停用"
        danger
        loading={disabling}
        onConfirm={handleDisable}
        onClose={() => {
          if (!disabling) setDisableTarget(null);
        }}
      />
    </>
  );
}
