import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Chip, Skeleton, cn } from '@heroui/react';
import type { SiteSettingsDto, UserDto } from '@classbook/shared';
import { messagesApi, settingsApi, timelineApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAsyncData } from '@/lib/useAsyncData';
import { formatDate, formatDateTime, formatShortDate } from '@/lib/format';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  CardSkeleton,
  EmptyPanel,
  ErrorPanel,
  FullPageLoading,
  PageContainer,
  SectionHeading,
} from '@/components/ui/PageState';
import {
  IconAlbum,
  IconArrowRight,
  IconClock,
  IconMessage,
  IconSparkle,
  IconUsers,
} from '@/components/ui/icons';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { data: settings, loading, error, reload } = useAsyncData(
    () => settingsApi.getPublic(),
    [],
  );

  if (authLoading) {
    return <FullPageLoading label="正在推开教室的门…" />;
  }

  if (loading) {
    return (
      <PageContainer className="space-y-8">
        <Skeleton className="h-[320px] w-full rounded-[32px]" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <CardSkeleton key={index} rows={2} />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (error || !settings) {
    return (
      <PageContainer>
        <ErrorPanel
          title="同学录暂时打不开"
          message={error ?? '没有拿到班级信息，请稍后再试。'}
          onRetry={reload}
        />
      </PageContainer>
    );
  }

  if (!user) {
    return <LandingContent settings={settings} />;
  }

  return <MemberHome settings={settings} user={user} />;
}

function LandingContent({ settings }: { settings: SiteSettingsDto }) {
  const navigate = useNavigate();

  const features = [
    {
      title: '同窗档案',
      description: '把散落在各地的名字重新聚在一起，看看每个人现在的模样。',
      icon: <IconUsers className="size-5" />,
      tone: 'bg-accent/10 text-accent',
    },
    {
      title: '纸短情长',
      description: '在班级留言墙或同学的个人留言板上，留下一句想说的话。',
      icon: <IconMessage className="size-5" />,
      tone: 'bg-success/10 text-success',
    },
    {
      title: '光影与纪事',
      description: '相册收藏旧时光，时间线记下那些值得被记住的日子。',
      icon: <IconAlbum className="size-5" />,
      tone: 'bg-warning/15 text-warning-foreground',
    },
  ];

  return (
    <PageContainer className="space-y-10">
      <Card className="overflow-hidden p-0 lg:grid lg:grid-cols-[1.08fr_0.92fr]">
        <div className="flex flex-col justify-center gap-5 px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-wrap items-center gap-2">
            <Chip color="accent" variant="soft" size="sm">
              {settings.schoolName ?? '毕业纪念册'}
            </Chip>
            {settings.graduationYear ? (
              <Chip variant="soft" size="sm">
                {settings.graduationYear} 届
              </Chip>
            ) : null}
            <Chip color="success" variant="soft" size="sm">
              仅限本班同学
            </Chip>
          </div>

          <div>
            <p className="text-xs font-medium tracking-[0.28em] text-accent">拾光同学录</p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-foreground sm:text-6xl">
              {settings.className}
            </h1>
            {settings.slogan ? (
              <p className="mt-5 max-w-xl font-display text-lg leading-8 text-muted sm:text-xl">
                {settings.slogan}
              </p>
            ) : (
              <p className="mt-5 max-w-xl text-sm leading-6 text-muted">
                把青春留在纸上，把牵挂留在这里。
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" onPress={() => navigate('/login')}>
              登录同学录
            </Button>
            <Button size="lg" variant="secondary" onPress={() => navigate('/register')}>
              用邀请码注册
            </Button>
          </div>

          <p className="text-xs leading-6 text-muted">
            邀请码由班长或管理员发放，登录后即可查看全部内容。
          </p>
        </div>

        <div className="relative min-h-56 overflow-hidden bg-accent/10 lg:min-h-full">
          <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="grid size-20 place-items-center rounded-full bg-accent text-3xl text-accent-foreground shadow-sm">
              拾
            </span>
            <p className="font-display text-xl text-foreground">{settings.className}</p>
            <p className="max-w-xs text-xs leading-6 text-muted">
              愿多年以后，我们仍能在这里认出彼此。
            </p>
          </div>
          {settings.heroImageUrl ? (
            <img
              src={settings.heroImageUrl}
              alt={`${settings.className}的封面`}
              className="absolute inset-0 size-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          ) : null}
        </div>
      </Card>

      <section className="space-y-4">
        <SectionHeading
          title="翻开这本同学录"
          description="登录后可查看同学档案、留言墙、相册与班级时间线。"
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="transition-transform hover:-translate-y-0.5">
              <span className={cn('grid size-10 place-items-center rounded-full', feature.tone)}>
                {feature.icon}
              </span>
              <div>
                <h3 className="font-display text-lg text-foreground">{feature.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Card variant="transparent" className="border border-dashed border-border p-8 text-center">
        <IconSparkle className="mx-auto size-6 text-accent" />
        <p className="mt-3 font-display text-lg leading-8 text-foreground">
          「把青春留在纸上，把牵挂留在这里。」
        </p>
        <p className="mt-2 text-xs text-muted">拾光同学录 · {settings.className}</p>
      </Card>
    </PageContainer>
  );
}

function MemberHome({ settings, user }: { settings: SiteSettingsDto; user: UserDto }) {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsyncData(async () => {
    const [messageResult, timelineResult] = await Promise.all([
      messagesApi.list({ page: 1, pageSize: 4 }),
      timelineApi.list(),
    ]);
    return {
      messages: messageResult.items,
      messageTotal: messageResult.total,
      timeline: timelineResult.items.slice(0, 3),
    };
  }, []);

  const displayName = user.profile?.realName ?? user.username;
  const entries = [
    {
      to: '/classmates',
      title: '同学档案',
      description: '看看大家现在的样子',
      icon: <IconUsers className="size-5" />,
      tone: 'bg-accent/10 text-accent',
    },
    {
      to: '/wall',
      title: '留言墙',
      description: '写下一句想说的话',
      icon: <IconMessage className="size-5" />,
      tone: 'bg-success/10 text-success',
    },
    {
      to: '/albums',
      title: '相册',
      description: '把旧时光翻出来晒晒',
      icon: <IconAlbum className="size-5" />,
      tone: 'bg-warning/15 text-warning-foreground',
    },
    {
      to: '/timeline',
      title: '时间线',
      description: '沿着日子慢慢往回走',
      icon: <IconClock className="size-5" />,
      tone: 'bg-default text-foreground',
    },
  ];

  return (
    <PageContainer className="space-y-8">
      <Card className="overflow-hidden border border-separator bg-default p-0 text-foreground">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col justify-center gap-4 px-6 py-10 sm:px-10 sm:py-14">
            <p className="text-xs tracking-[0.26em] text-muted">
              {settings.schoolName ?? '拾光同学录'}
              {settings.graduationYear ? ` · ${settings.graduationYear} 届` : ' · 毕业纪念'}
            </p>
            <div className="flex items-center gap-3">
              <UserAvatar
                name={displayName}
                src={user.profile?.avatarUrl}
                className="size-12 shrink-0 lg:hidden"
              />
              <h1 className="font-display text-2xl leading-tight text-foreground sm:text-4xl">
                欢迎回来，{displayName}
              </h1>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted">
              {settings.slogan ?? '在这里，和同学们继续书写我们的故事。'}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button onPress={() => navigate('/wall')}>写一条留言</Button>
              <Button variant="secondary" onPress={() => navigate('/me')}>
                编辑我的档案
              </Button>
            </div>
          </div>
          <div className="hidden items-center justify-center p-8 lg:flex">
            <UserAvatar
              name={displayName}
              src={user.profile?.avatarUrl}
              className="size-28 text-3xl ring-4 ring-background"
            />
          </div>
        </div>
      </Card>

      <section className="space-y-4">
        <SectionHeading title="今天想翻哪一页？" description="四个入口，都是我们的共同记忆。" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {entries.map((entry) => (
            <Link key={entry.to} to={entry.to} className="group block">
              <Card className="h-full transition-transform group-hover:-translate-y-0.5">
                <span
                  className={cn('grid size-10 place-items-center rounded-full', entry.tone)}
                >
                  {entry.icon}
                </span>
                <div>
                  <h3 className="font-display text-lg text-foreground">{entry.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted">{entry.description}</p>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 pt-2 text-xs text-accent">
                  去看看
                  <IconArrowRight className="size-3.5" />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <CardSkeleton rows={4} />
          <CardSkeleton rows={4} />
        </div>
      ) : null}

      {!loading && error ? (
        <ErrorPanel title="暂时没能拿到最新内容" message={error} onRetry={reload} />
      ) : null}

      {!loading && !error && data ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="p-5 sm:p-6">
            <SectionHeading
              title="最新留言"
              description={`共 ${data.messageTotal} 条班级留言`}
              action={
                <Link
                  to="/wall"
                  className="link inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  查看全部
                  <IconArrowRight className="size-3.5" />
                </Link>
              }
            />

            {data.messages.length > 0 ? (
              <div className="mt-4 space-y-3">
                {data.messages.map((message) => (
                  <article key={message.id} className="rounded-2xl bg-default/60 p-3.5">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        name={message.author.realName}
                        src={message.author.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {message.author.realName}
                        </p>
                        <p className="text-xs text-muted">{formatDateTime(message.createdAt)}</p>
                      </div>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">
                      {message.content}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyPanel
                  compact
                  icon={<IconMessage className="size-5" />}
                  title="留言墙还空着"
                  description="来写下第一条留言吧。"
                  action={<Button onPress={() => navigate('/wall')}>去写留言</Button>}
                />
              </div>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionHeading
              title="时间线"
              description="那些值得记住的日子"
              action={
                <Link
                  to="/timeline"
                  className="link inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  全部
                  <IconArrowRight className="size-3.5" />
                </Link>
              }
            />

            {data.timeline.length > 0 ? (
              <ol className="mt-4 space-y-1">
                {data.timeline.map((event) => (
                  <li key={event.id}>
                    <Link
                      to="/timeline"
                      className="group flex gap-3 rounded-xl px-1 py-3 transition-colors hover:bg-default/60"
                    >
                      <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-accent ring-4 ring-accent/10" />
                      <span className="min-w-0">
                        <span className="block text-xs text-accent">{formatDate(event.date)}</span>
                        <span className="mt-0.5 block truncate font-display text-base text-foreground transition-colors group-hover:text-accent">
                          {event.title}
                        </span>
                        {event.description ? (
                          <span className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted">
                            {event.description}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-4">
                <EmptyPanel
                  compact
                  icon={<IconClock className="size-5" />}
                  title="时间线还没有故事"
                  description="等管理员把回忆一条条挂上去。"
                />
              </div>
            )}

            <div className="mt-4 rounded-2xl bg-default/60 px-3.5 py-3 text-xs leading-5 text-muted">
              今天是 {formatShortDate(new Date().toISOString())}，也值得被记住。
            </div>
          </Card>
        </div>
      ) : null}
    </PageContainer>
  );
}
