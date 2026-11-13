import { useState } from 'react';
import type { AdminMemberDto, Role, UserStatus } from '@classbook/shared';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Label,
  SearchField,
  Table,
  toast,
} from '@heroui/react';
import { admin, getErrorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate } from '../lib/format';
import { useAsyncData } from '../lib/useAsyncData';
import { ResetPasswordModal } from '../components/members/ResetPasswordModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DataPagination } from '../components/ui/DataPagination';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorBlock, LoadingBlock } from '../components/ui/States';

const PAGE_SIZE = 12;

function memberName(member: AdminMemberDto): string {
  return member.profile?.realName || member.username;
}

function memberInitial(name: string): string {
  return name.trim().slice(0, 1) || '同';
}

export function MembersPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [statusTarget, setStatusTarget] = useState<AdminMemberDto | null>(null);
  const [roleTarget, setRoleTarget] = useState<AdminMemberDto | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminMemberDto | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [roleBusy, setRoleBusy] = useState(false);

  const { data, loading, error, reload } = useAsyncData(
    () => admin.members({ page, pageSize: PAGE_SIZE, q: query || undefined }),
    [page, query],
  );

  const members = data?.items ?? [];
  const nextStatus: UserStatus = statusTarget?.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
  const nextRole: Role = roleTarget?.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';

  const runSearch = (value: string) => {
    setPage(1);
    setQuery(value.trim());
  };

  const clearSearch = () => {
    setSearchInput('');
    setQuery('');
    setPage(1);
  };

  const handleStatus = async () => {
    if (!statusTarget) return;
    setStatusBusy(true);
    try {
      await admin.updateMember(statusTarget.id, { status: nextStatus });
      toast.success(
        nextStatus === 'DISABLED'
          ? `已禁用 ${memberName(statusTarget)}`
          : `已启用 ${memberName(statusTarget)}`,
      );
      setStatusTarget(null);
      reload();
    } catch (cause) {
      toast.danger(getErrorMessage(cause));
    } finally {
      setStatusBusy(false);
    }
  };

  const handleRole = async () => {
    if (!roleTarget) return;
    if (roleTarget.id === user?.id) {
      toast.danger('不能修改自己的角色');
      return;
    }
    setRoleBusy(true);
    try {
      await admin.updateMember(roleTarget.id, { role: nextRole });
      toast.success(
        nextRole === 'ADMIN'
          ? `已将 ${memberName(roleTarget)} 设为管理员`
          : `已取消 ${memberName(roleTarget)} 的管理员权限`,
      );
      setRoleTarget(null);
      reload();
    } catch (cause) {
      toast.danger(getErrorMessage(cause));
    } finally {
      setRoleBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="成员管理"
        description="搜索班级成员，管理账号状态、角色与登录密码。禁用成员会立即失效其登录状态。"
      />

      <Card className="p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <SearchField
            className="flex-1"
            value={searchInput}
            onChange={setSearchInput}
            onSubmit={runSearch}
            onClear={clearSearch}
          >
            <Label className="sr-only">搜索成员</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="搜索用户名 / 姓名 / 昵称" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <div className="flex gap-2">
            <Button className="flex-1 sm:flex-none" onPress={() => runSearch(searchInput)}>
              搜索
            </Button>
            {query ? (
              <Button variant="ghost" onPress={clearSearch}>
                清除
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="mt-4 overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-separator px-4 py-3 sm:px-5">
          <p className="text-xs text-muted">
            {query ? (
              <>
                “{query}” 的搜索结果 · 共 {data?.total ?? 0} 位
              </>
            ) : (
              <>共 {data?.total ?? 0} 位成员</>
            )}
          </p>
          <Button
            size="sm"
            variant="ghost"
            aria-label="刷新成员列表"
            isPending={loading}
            onPress={reload}
          >
            {({ isPending }) => (
              <>
                <Icon name="refresh" className={isPending ? 'size-4 animate-spin' : 'size-4'} />
                <span className="hidden sm:inline">刷新</span>
              </>
            )}
          </Button>
        </div>

        {loading && !data ? (
          <LoadingBlock label="正在读取成员列表…" />
        ) : error && !data ? (
          <div className="p-4">
            <ErrorBlock message={getErrorMessage(error)} onRetry={reload} />
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon="users"
            title={query ? '没有匹配的成员' : '还没有成员'}
            description={
              query
                ? '换一个用户名、姓名或昵称试试。'
                : '生成邀请码并分享给同学，成员会出现在这里。'
            }
            className="m-4 border-0 bg-transparent"
            action={
              query ? (
                <Button variant="secondary" onPress={clearSearch}>
                  清除搜索
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="成员列表" className="min-w-[1000px]">
                  <Table.Header>
                    <Table.Column isRowHeader>用户名</Table.Column>
                    <Table.Column>姓名</Table.Column>
                    <Table.Column>角色</Table.Column>
                    <Table.Column>状态</Table.Column>
                    <Table.Column>留言数</Table.Column>
                    <Table.Column>注册时间</Table.Column>
                    <Table.Column className="text-right">操作</Table.Column>
                  </Table.Header>
                  <Table.Body items={members}>
                    {(member) => {
                      const isSelf = member.id === user?.id;
                      const name = memberName(member);
                      return (
                        <Table.Row>
                          <Table.Cell>
                            <div className="flex items-center gap-2.5">
                              <Avatar size="sm">
                                {member.profile?.avatarUrl ? (
                                  <Avatar.Image alt={name} src={member.profile.avatarUrl} />
                                ) : null}
                                <Avatar.Fallback>{memberInitial(name)}</Avatar.Fallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="truncate text-sm font-medium text-foreground">
                                    @{member.username}
                                  </p>
                                  {isSelf ? (
                                    <Chip size="sm" variant="soft">
                                      当前账号
                                    </Chip>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="text-sm text-foreground">{name}</div>
                            {member.profile?.nickname ? (
                              <div className="mt-0.5 text-[11px] text-muted">
                                {member.profile.nickname}
                              </div>
                            ) : null}
                          </Table.Cell>
                          <Table.Cell>
                            <Chip
                              size="sm"
                              color={member.role === 'ADMIN' ? 'accent' : 'default'}
                              variant="soft"
                            >
                              {member.role === 'ADMIN' ? '管理员' : '同学'}
                            </Chip>
                          </Table.Cell>
                          <Table.Cell>
                            <Chip
                              size="sm"
                              color={member.status === 'ACTIVE' ? 'success' : 'danger'}
                              variant="soft"
                            >
                              {member.status === 'ACTIVE' ? '正常' : '已禁用'}
                            </Chip>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-sm tabular-nums text-muted">
                              {member.messageCount}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="whitespace-nowrap text-xs text-muted">
                              {formatDate(member.createdAt)}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex items-center justify-end gap-1.5">
                              {isSelf ? (
                                <span className="text-[11px] text-muted">请在个人账号中修改</span>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onPress={() => setRoleTarget(member)}
                                  >
                                    {member.role === 'ADMIN' ? '取消管理员' : '设为管理员'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onPress={() => setResetTarget(member)}
                                  >
                                    重置密码
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={
                                      member.status === 'ACTIVE' ? 'danger-soft' : 'secondary'
                                    }
                                    onPress={() => setStatusTarget(member)}
                                  >
                                    {member.status === 'ACTIVE' ? '禁用' : '启用'}
                                  </Button>
                                </>
                              )}
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      );
                    }}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
            <div className="border-t border-separator px-4 py-3 sm:px-5">
              <DataPagination
                page={data?.page ?? page}
                pageSize={data?.pageSize ?? PAGE_SIZE}
                total={data?.total ?? 0}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={statusTarget !== null}
        title={nextStatus === 'DISABLED' ? '禁用成员' : '启用成员'}
        description={
          statusTarget ? (
            <>
              确定要{nextStatus === 'DISABLED' ? '禁用' : '启用'}{' '}
              <span className="font-medium text-foreground">{memberName(statusTarget)}</span> 吗？
              {nextStatus === 'DISABLED'
                ? '禁用后该成员将立即退出登录，且无法访问班级内容。'
                : '启用后该成员可以重新登录并访问班级内容。'}
            </>
          ) : null
        }
        confirmLabel={nextStatus === 'DISABLED' ? '确认禁用' : '确认启用'}
        danger={nextStatus === 'DISABLED'}
        loading={statusBusy}
        onConfirm={handleStatus}
        onClose={() => {
          if (!statusBusy) setStatusTarget(null);
        }}
      />

      <ConfirmDialog
        open={roleTarget !== null}
        title={nextRole === 'ADMIN' ? '设为管理员' : '取消管理员权限'}
        description={
          roleTarget ? (
            <>
              确定要将{' '}
              <span className="font-medium text-foreground">{memberName(roleTarget)}</span>{' '}
              {nextRole === 'ADMIN'
                ? '设为管理员吗？管理员可以管理成员、留言、相册与站点设置。'
                : '的管理员权限取消吗？取消后该成员将只能访问同学内容。'}
            </>
          ) : null
        }
        confirmLabel={nextRole === 'ADMIN' ? '确认设为管理员' : '确认取消权限'}
        danger={nextRole === 'MEMBER'}
        loading={roleBusy}
        onConfirm={handleRole}
        onClose={() => {
          if (!roleBusy) setRoleTarget(null);
        }}
      />

      <ResetPasswordModal member={resetTarget} onClose={() => setResetTarget(null)} />
    </>
  );
}
