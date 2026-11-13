import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Chip } from '@heroui/react';
import { profilesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAsyncData } from '@/lib/useAsyncData';
import { formatBirthday, formatDate } from '@/lib/format';
import {
  IconCalendar,
  IconLock,
  IconMail,
  IconMessage,
  IconPhone,
  IconPin,
  IconUser,
} from '@/components/icons';
import { ErrorPanel } from '@/components/content/ContentStates';
import { ProfileDetailSkeleton } from '@/components/content/ContentSkeletons';
import { MessageBoard } from '@/components/content/MessageBoard';
import { BackLink, PageShell } from '@/components/content/PageShell';
import { ProfileAvatar } from '@/components/content/ProfileAvatar';

interface InfoItem {
  label: string;
  value: string;
  icon: ReactNode;
}

export default function ClassmateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const profileState = useAsyncData(
    () => {
      if (!id) return Promise.reject(new Error('缺少同学 ID'));
      return profilesApi.get(id);
    },
    [id],
  );

  if (profileState.loading && !profileState.data) {
    return (
      <PageShell
        back={<BackLink to="/classmates">返回同学录</BackLink>}
        description="稍等一下，记忆正在加载。"
        eyebrow="同窗档案"
        title="正在翻开档案…"
      >
        <ProfileDetailSkeleton />
      </PageShell>
    );
  }

  if (profileState.error || !profileState.data) {
    return (
      <PageShell
        back={<BackLink to="/classmates">返回同学录</BackLink>}
        description="档案可能已经被移走了，或者这位同学已经不在班级里。"
        eyebrow="同窗档案"
        title="没有找到这位同学"
      >
        <ErrorPanel
          message={profileState.error ?? '没有找到这位同学的档案。'}
          title="档案暂时打不开"
          onRetry={profileState.reload}
        />
      </PageShell>
    );
  }

  const { profile, username } = profileState.data;
  const birthday = formatBirthday(profile.birthday);

  const infoItems: InfoItem[] = [];
  if (profile.location) {
    infoItems.push({
      label: '所在地',
      value: profile.location,
      icon: <IconPin className="size-4" />,
    });
  }
  if (birthday) {
    infoItems.push({
      label: '生日',
      value: birthday,
      icon: <IconCalendar className="size-4" />,
    });
  }

  const contactItems: InfoItem[] = [];
  if (profile.wechat) {
    contactItems.push({
      label: '微信',
      value: profile.wechat,
      icon: <IconMessage className="size-4" />,
    });
  }
  if (profile.qq) {
    contactItems.push({
      label: 'QQ',
      value: profile.qq,
      icon: <IconUser className="size-4" />,
    });
  }
  if (profile.email) {
    contactItems.push({
      label: '邮箱',
      value: profile.email,
      icon: <IconMail className="size-4" />,
    });
  }
  if (profile.phone) {
    contactItems.push({
      label: '电话',
      value: profile.phone,
      icon: <IconPhone className="size-4" />,
    });
  }

  return (
    <PageShell
      action={
        <Chip color="accent" size="sm" variant="soft">
          <Chip.Label>@{username}</Chip.Label>
        </Chip>
      }
      back={<BackLink to="/classmates">返回同学录</BackLink>}
      description={profile.motto ? `「${profile.motto}」` : '这位同学还没有写下寄语。'}
      eyebrow="同窗档案"
      title={profile.realName}
    >
      <Card className="rounded-3xl border border-border/70 bg-surface p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-3 sm:w-44 sm:shrink-0">
            <ProfileAvatar
              className="size-24 rounded-3xl ring-4 ring-surface"
              name={profile.realName}
              size="lg"
              src={profile.avatarUrl}
            />
            {profile.nickname && (
              <Chip color="accent" size="sm" variant="soft">
                @{profile.nickname}
              </Chip>
            )}
            <p className="text-center text-[11px] leading-5 text-muted">
              @{username}
              <br />
              档案更新于 {formatDate(profile.updatedAt)}
            </p>
          </div>

          <div className="min-w-0 flex-1 border-t border-border pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <h2 className="font-display text-xl text-foreground">关于我</h2>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-foreground/85">
              {profile.bio ?? '这位同学还没有填写自我介绍。'}
            </p>

            {infoItems.length > 0 ? (
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {infoItems.map((item) => (
                  <div
                    className="flex items-start gap-2.5 rounded-2xl bg-default/70 px-3.5 py-2.5"
                    key={item.label}
                  >
                    <span className="mt-0.5 text-accent">{item.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted">{item.label}</p>
                      <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                        {item.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-muted">还没有填写所在地和生日。</p>
            )}
          </div>
        </div>
      </Card>

      <Card className="mt-6 rounded-3xl border border-border/70 bg-surface p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl text-foreground">联系方式</h2>
          <Chip color="accent" size="sm" variant="soft">
            <IconLock className="size-3" />
            <Chip.Label>仅登录同学可见</Chip.Label>
          </Chip>
        </div>

        {user ? (
          contactItems.length > 0 ? (
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {contactItems.map((item) => (
                <div
                  className="flex items-start gap-2.5 rounded-2xl bg-default/70 px-3.5 py-2.5"
                  key={item.label}
                >
                  <span className="mt-0.5 text-accent">{item.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted">{item.label}</p>
                    <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">这位同学还没有留下联系方式。</p>
          )
        ) : (
          <p className="mt-4 text-sm text-muted">登录后即可查看本班同学的联系方式。</p>
        )}

        <p className="mt-4 border-t border-border pt-3 text-[11px] leading-5 text-muted">
          联系方式仅对已登录的本班同学可见，请温柔使用。
        </p>
      </Card>

      <div className="mx-auto mt-10 max-w-3xl">
        <MessageBoard
          description={`给${profile.realName}留一句话吧`}
          emptyDescription={`成为第一个给${profile.realName}留言的人吧。`}
          emptyTitle="还没有人留言"
          heading="留言板"
          toName={profile.realName}
          toUserId={profile.userId}
        />
      </div>
    </PageShell>
  );
}