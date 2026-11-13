import { z } from 'zod';

export const ROLES = ['MEMBER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const THEME_IDS = ['warm', 'noir', 'marine', 'forest'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const THEMES = [
  {
    id: 'warm',
    name: '暖光',
    description: '暖白纸面与珊瑚橙，像一本摊开的同学录。',
    mode: 'light',
    swatches: ['#FAF7F0', '#1F2A37', '#C2410C'],
  },
  {
    id: 'noir',
    name: '墨夜',
    description: '深墨底色与雾蓝高光，安静地翻看旧照片。',
    mode: 'dark',
    swatches: ['#0B0F14', '#F5F7FA', '#93C5FD'],
  },
  {
    id: 'marine',
    name: '海盐',
    description: '冷调雾蓝与深海蓝，干净、清爽、利落。',
    mode: 'light',
    swatches: ['#F3F6FA', '#0F2744', '#1D4ED8'],
  },
  {
    id: 'forest',
    name: '松林',
    description: '深松绿与青柠微光，像晚自习后的操场。',
    mode: 'dark',
    swatches: ['#0E1A15', '#F0F7F2', '#A3E635'],
  },
] as const satisfies ReadonlyArray<{
  id: ThemeId;
  name: string;
  description: string;
  mode: 'light' | 'dark';
  swatches: readonly string[];
}>;

export const themeIdSchema = z.enum(THEME_IDS);
export const themePreferenceSchema = z.object({ theme: themeIdSchema.nullable() });

export const USER_STATUSES = ['ACTIVE', 'DISABLED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const MESSAGE_STATUSES = ['VISIBLE', 'HIDDEN'] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const PAGE_SIZE_DEFAULT = 12;
export const PAGE_SIZE_MAX = 50;
export const MESSAGE_MAX_LENGTH = 500;
export const BIO_MAX_LENGTH = 1000;
export const MOTTO_MAX_LENGTH = 60;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AUTH_COOKIE = 'cb_token';

export const usernameSchema = z
  .string()
  .trim()
  .min(3, '用户名至少 3 个字符')
  .max(20, '用户名最多 20 个字符')
  .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线');

export const passwordSchema = z
  .string()
  .min(8, '密码至少 8 位')
  .max(72, '密码最多 72 位');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
});

export const registerSchema = z.object({
  inviteCode: z.string().trim().min(4, '请填写邀请码').max(64),
  username: usernameSchema,
  password: passwordSchema,
  realName: z.string().trim().min(1, '请填写真实姓名').max(20),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const inviteValidateSchema = z.object({
  code: z.string().trim().min(1).max(64),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const profileUpdateSchema = z.object({
  realName: z.string().trim().min(1).max(20).optional(),
  nickname: z.string().trim().max(20).nullable().optional(),
  avatarUrl: z.string().trim().max(500).nullable().optional(),
  motto: z.string().trim().max(MOTTO_MAX_LENGTH).nullable().optional(),
  bio: z.string().trim().max(BIO_MAX_LENGTH).nullable().optional(),
  location: z.string().trim().max(40).nullable().optional(),
  birthday: z
    .string()
    .regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, '生日格式为 MM-DD')
    .nullable()
    .optional(),
  wechat: z.string().trim().max(40).nullable().optional(),
  qq: z.string().trim().max(20).nullable().optional(),
  email: z.string().trim().max(100).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
});

export const messageCreateSchema = z.object({
  content: z.string().trim().min(1, '留言不能为空').max(MESSAGE_MAX_LENGTH),
  toUserId: z.string().trim().min(1).nullable().optional(),
});

export const albumCreateSchema = z.object({
  title: z.string().trim().min(1).max(40),
  description: z.string().trim().max(300).nullable().optional(),
});

export const albumUpdateSchema = z.object({
  title: z.string().trim().min(1).max(40).optional(),
  description: z.string().trim().max(300).nullable().optional(),
  coverUrl: z.string().trim().max(500).nullable().optional(),
});

export const photoItemSchema = z.object({
  url: z.string().trim().min(1).max(500),
  videoUrl: z.string().trim().max(500).nullable().optional(),
});

export const photoAttachSchema = z
  .object({
    urls: z.array(z.string().trim().min(1).max(500)).min(1).max(50).optional(),
    photos: z.array(photoItemSchema).min(1).max(50).optional(),
    caption: z.string().trim().max(100).nullable().optional(),
  })
  .refine((data) => Boolean(data.urls?.length || data.photos?.length), {
    message: "请选择照片",
  });

export const timelineCreateSchema = z.object({
  date: z.coerce.date(),
  title: z.string().trim().min(1).max(60),
  description: z.string().trim().max(1000).nullable().optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const timelineUpdateSchema = timelineCreateSchema.partial();

export const SITE_COPY_FIELDS = [
  { key: 'siteName', group: '品牌', label: '站点名称', max: 40, fallback: '拾光同学录' },
  { key: 'siteEmoji', group: '品牌', label: '站点符号', max: 4, fallback: '拾' },
  { key: 'logoText', group: '品牌', label: 'Logo 文字', max: 4, fallback: '拾' },
  { key: 'tabTitle', group: '品牌', label: '浏览器标题', max: 60, fallback: '拾光同学录' },
  {
    key: 'footerText',
    group: '品牌',
    label: '页脚标语',
    max: 80,
    fallback: '拾光同学录 · 愿记忆有处安放',
  },
  { key: 'footerCopyright', group: '品牌', label: '版权信息', max: 80, fallback: '© 拾光同学录' },
  { key: 'navHome', group: '导航', label: '首页', max: 12, fallback: '首页' },
  { key: 'navClassmates', group: '导航', label: '同学录', max: 12, fallback: '同学录' },
  { key: 'navPlaza', group: '导航', label: '广场', max: 12, fallback: '广场' },
  { key: 'navAlbums', group: '导航', label: '相册', max: 12, fallback: '相册' },
  { key: 'navTimeline', group: '导航', label: '时间线', max: 12, fallback: '时间线' },
  { key: 'navMe', group: '导航', label: '我的档案', max: 12, fallback: '我的档案' },
  { key: 'homeEyebrow', group: '首页', label: '首页眉标', max: 40, fallback: '拾光同学录' },
  { key: 'homeFeature1Title', group: '首页', label: '功能一标题', max: 20, fallback: '同窗档案' },
  {
    key: 'homeFeature1Desc',
    group: '首页',
    label: '功能一描述',
    max: 100,
    fallback: '把散落在各地的名字重新聚在一起，看看每个人现在的模样。',
  },
  { key: 'homeFeature2Title', group: '首页', label: '功能二标题', max: 20, fallback: '纸短情长' },
  {
    key: 'homeFeature2Desc',
    group: '首页',
    label: '功能二描述',
    max: 100,
    fallback: '在班级留言墙或同学的个人留言板上，留下一句想说的话。',
  },
  { key: 'homeFeature3Title', group: '首页', label: '功能三标题', max: 20, fallback: '光影与纪事' },
  {
    key: 'homeFeature3Desc',
    group: '首页',
    label: '功能三描述',
    max: 100,
    fallback: '相册收藏旧时光，时间线记下那些值得被记住的日子。',
  },
  { key: 'homeCtaLogin', group: '首页', label: '登录按钮', max: 20, fallback: '登录同学录' },
  {
    key: 'homeCtaRegister',
    group: '首页',
    label: '注册按钮',
    max: 20,
    fallback: '用邀请码注册',
  },
  { key: 'homeMemberGreeting', group: '首页', label: '成员欢迎语', max: 40, fallback: '欢迎回来' },
  {
    key: 'homeMemberSubtitle',
    group: '首页',
    label: '成员副标题',
    max: 100,
    fallback: '在这里，和同学们继续书写我们的故事。',
  },
  { key: 'loginTitle', group: '登录注册', label: '登录标题', max: 40, fallback: '回到拾光' },
  {
    key: 'loginSubtitle',
    group: '登录注册',
    label: '登录副标题',
    max: 100,
    fallback: '登录后，就能看到同学们的近况，也能继续写下新的留言。',
  },
  { key: 'loginButton', group: '登录注册', label: '登录按钮', max: 12, fallback: '登录' },
  { key: 'registerTitle', group: '登录注册', label: '注册标题', max: 40, fallback: '写下你的名字' },
  {
    key: 'registerSubtitle',
    group: '登录注册',
    label: '注册副标题',
    max: 100,
    fallback: '使用管理员发放的邀请码注册，从此这一页也有你的故事。',
  },
  { key: 'registerButton', group: '登录注册', label: '注册按钮', max: 12, fallback: '完成注册' },
  { key: 'inviteLabel', group: '登录注册', label: '邀请码标签', max: 20, fallback: '邀请码' },
  {
    key: 'invitePlaceholder',
    group: '登录注册',
    label: '邀请码占位',
    max: 40,
    fallback: '例如：AB3D7K9M',
  },
  { key: 'usernameLabel', group: '登录注册', label: '用户名标签', max: 20, fallback: '用户名' },
  { key: 'passwordLabel', group: '登录注册', label: '密码标签', max: 20, fallback: '密码' },
  { key: 'realNameLabel', group: '登录注册', label: '真实姓名标签', max: 20, fallback: '真实姓名' },
  { key: 'plazaTitle', group: '广场', label: '广场标题', max: 20, fallback: '班级广场' },
  { key: 'plazaEyebrow', group: '广场', label: '广场眉标', max: 20, fallback: '同窗广场' },
  {
    key: 'plazaDescription',
    group: '广场',
    label: '广场描述',
    max: 100,
    fallback: '那些当面没说完的话，就写在这里吧。',
  },
  {
    key: 'plazaComposerPlaceholder',
    group: '广场',
    label: '发帖占位',
    max: 100,
    fallback: '写下一句想对大家说的话吧…',
  },
  { key: 'plazaPostButton', group: '广场', label: '发布按钮', max: 12, fallback: '发布' },
  { key: 'plazaEmptyTitle', group: '广场', label: '空状态标题', max: 20, fallback: '广场还空着' },
  {
    key: 'plazaEmptyDescription',
    group: '广场',
    label: '空状态描述',
    max: 100,
    fallback: '第一个留下字迹的人，会被记得很久。',
  },
  {
    key: 'plazaCommentPlaceholder',
    group: '广场',
    label: '评论占位',
    max: 60,
    fallback: '说点什么…',
  },
  { key: 'plazaCommentButton', group: '广场', label: '评论按钮', max: 12, fallback: '评论' },
  { key: 'plazaLikeLabel', group: '广场', label: '点赞文案', max: 12, fallback: '点赞' },
  { key: 'plazaCommentLabel', group: '广场', label: '评论文案', max: 12, fallback: '评论' },
  { key: 'plazaPublicLabel', group: '广场', label: '公开文案', max: 12, fallback: '公开' },
  { key: 'plazaPrivateLabel', group: '广场', label: '私密文案', max: 12, fallback: '私密' },
  {
    key: 'plazaDeleteConfirm',
    group: '广场',
    label: '删除确认',
    max: 60,
    fallback: '确定删除这条内容吗？删除后无法恢复。',
  },
  { key: 'albumsTitle', group: '相册', label: '相册标题', max: 20, fallback: '班级相册' },
  {
    key: 'albumsDescription',
    group: '相册',
    label: '相册描述',
    max: 100,
    fallback: '快门按下的一瞬间，时间就被留了下来。',
  },
  { key: 'albumsCreateButton', group: '相册', label: '创建按钮', max: 20, fallback: '创建相册' },
  { key: 'albumsEmptyTitle', group: '相册', label: '空状态标题', max: 20, fallback: '相册还是空的' },
  {
    key: 'albumsEmptyDescription',
    group: '相册',
    label: '空状态描述',
    max: 100,
    fallback: '等第一组照片放进来，这里就会有颜色了。',
  },
  {
    key: 'albumUploadHint',
    group: '相册',
    label: '上传提示',
    max: 100,
    fallback: '支持 JPG、PNG、WebP，单张不超过 5MB。',
  },
  {
    key: 'albumDeleteConfirm',
    group: '相册',
    label: '删除确认',
    max: 60,
    fallback: '确定删除这本相册吗？照片将一并删除。',
  },
  { key: 'classmatesTitle', group: '同学录', label: '标题', max: 20, fallback: '同学录' },
  {
    key: 'classmatesDescription',
    group: '同学录',
    label: '描述',
    max: 100,
    fallback: '名字还是记忆里的样子，故事已经翻到了新的一页。',
  },
  {
    key: 'classmatesEmptyTitle',
    group: '同学录',
    label: '空状态标题',
    max: 20,
    fallback: '同学录还是空白',
  },
  {
    key: 'classmatesEmptyDescription',
    group: '同学录',
    label: '空状态描述',
    max: 100,
    fallback: '等第一位同学写下自己的档案后，这里就会热闹起来。',
  },
  { key: 'timelineTitle', group: '时间线', label: '标题', max: 20, fallback: '班级时间线' },
  {
    key: 'timelineDescription',
    group: '时间线',
    label: '描述',
    max: 100,
    fallback: '把日子一页页翻回去，原来我们已经一起走了这么远。',
  },
  {
    key: 'timelineEmptyTitle',
    group: '时间线',
    label: '空状态标题',
    max: 20,
    fallback: '时间线还没有故事',
  },
  {
    key: 'timelineEmptyDescription',
    group: '时间线',
    label: '空状态描述',
    max: 100,
    fallback: '等第一条纪事被写上去，这里就会开始生长。',
  },
  { key: 'meTitle', group: '个人中心', label: '标题', max: 20, fallback: '我的档案' },
  {
    key: 'meDescription',
    group: '个人中心',
    label: '描述',
    max: 100,
    fallback: '让多年后的我们，还能认出彼此。',
  },
  { key: 'meSaveButton', group: '个人中心', label: '保存按钮', max: 12, fallback: '保存档案' },
  { key: 'mePasswordTitle', group: '个人中心', label: '密码标题', max: 20, fallback: '修改密码' },
  { key: 'mePasswordButton', group: '个人中心', label: '密码按钮', max: 12, fallback: '更新密码' },
  {
    key: 'profileMessageTitle',
    group: '个人页留言',
    label: '留言板标题',
    max: 20,
    fallback: '留言板',
  },
  {
    key: 'profileMessagePlaceholder',
    group: '个人页留言',
    label: '留言占位',
    max: 100,
    fallback: '想对同学说些什么？',
  },
  {
    key: 'profileMessageHint',
    group: '个人页留言',
    label: '留言提示',
    max: 100,
    fallback: '留言会展示给已登录的本班同学。',
  },
  { key: 'notificationsTitle', group: '通知', label: '标题', max: 20, fallback: '通知' },
  {
    key: 'notificationsEmpty',
    group: '通知',
    label: '空状态',
    max: 60,
    fallback: '暂时没有新的通知。',
  },
  {
    key: 'notificationsMarkAllRead',
    group: '通知',
    label: '全部已读',
    max: 20,
    fallback: '全部标为已读',
  },
  { key: 'notificationsViewAll', group: '通知', label: '查看全部', max: 20, fallback: '查看全部' },
  { key: 'commonLoading', group: '通用', label: '加载中', max: 20, fallback: '正在加载…' },
  { key: 'commonRetry', group: '通用', label: '重试', max: 12, fallback: '重试' },
  { key: 'commonCancel', group: '通用', label: '取消', max: 12, fallback: '取消' },
  { key: 'commonSave', group: '通用', label: '保存', max: 12, fallback: '保存' },
  { key: 'commonDelete', group: '通用', label: '删除', max: 12, fallback: '删除' },
  { key: 'commonConfirm', group: '通用', label: '确定', max: 12, fallback: '确定' },
  { key: 'commonBack', group: '通用', label: '返回', max: 12, fallback: '返回' },
  { key: 'commonMore', group: '通用', label: '更多', max: 20, fallback: '查看更多' },
  {
    key: 'notFoundTitle',
    group: '404',
    label: '标题',
    max: 40,
    fallback: '这一页被时光藏起来了',
  },
  {
    key: 'notFoundDescription',
    group: '404',
    label: '描述',
    max: 100,
    fallback: '页面不存在，或者内容已经被移走。回到首页再翻翻看吧。',
  },
  { key: 'notFoundButton', group: '404', label: '按钮', max: 20, fallback: '回到首页' },
] as const;

export type SiteCopyKey = (typeof SITE_COPY_FIELDS)[number]['key'];
export type SiteCopy = Record<SiteCopyKey, string>;

export const DEFAULT_SITE_COPY = Object.fromEntries(
  SITE_COPY_FIELDS.map((field) => [field.key, field.fallback]),
) as SiteCopy;

export const siteCopySchema = z
  .object(
    Object.fromEntries(
      SITE_COPY_FIELDS.map((field) => [field.key, z.string().trim().max(field.max)]),
    ) as Record<SiteCopyKey, z.ZodString>,
  )
  .partial();

export const settingsUpdateSchema = z.object({
  className: z.string().trim().min(1).max(30).optional(),
  schoolName: z.string().trim().max(50).nullable().optional(),
  graduationYear: z.number().int().min(1900).max(2100).nullable().optional(),
  slogan: z.string().trim().max(100).nullable().optional(),
  heroImageUrl: z.string().trim().max(500).nullable().optional(),
  defaultTheme: themeIdSchema.optional(),
  imageCompressEnabled: z.boolean().optional(),
  imageCompressThresholdKb: z.number().int().min(128).max(20480).optional(),
  imageMaxDimension: z.number().int().min(320).max(6000).optional(),
  imageQuality: z.number().int().min(40).max(100).optional(),
  copy: siteCopySchema.optional(),
});

export const memberUpdateSchema = z.object({
  status: z.enum(USER_STATUSES).optional(),
  role: z.enum(ROLES).optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export const inviteCreateSchema = z.object({
  note: z.string().trim().max(100).nullable().optional(),
  maxUses: z.number().int().min(1).max(200).default(1),
  expiresAt: z.coerce.date().nullable().optional(),
});

export interface ProfileDto {
  id: string;
  userId: string;
  realName: string;
  nickname: string | null;
  avatarUrl: string | null;
  motto: string | null;
  bio: string | null;
  location: string | null;
  birthday: string | null;
  wechat: string | null;
  qq: string | null;
  email: string | null;
  phone: string | null;
  updatedAt: string;
}

export interface UserDto {
  id: string;
  username: string;
  role: Role;
  status: UserStatus;
  profile: ProfileDto | null;
  theme?: ThemeId | null;
  createdAt: string;
}

export interface PublicProfileDto {
  id: string;
  realName: string;
  nickname: string | null;
  avatarUrl: string | null;
  motto: string | null;
  location: string | null;
  updatedAt: string;
}

export interface MessageAuthorDto {
  id: string;
  realName: string;
  nickname: string | null;
  avatarUrl: string | null;
  disabled: boolean;
}

export interface MessageDto {
  id: string;
  content: string;
  status: MessageStatus;
  createdAt: string;
  toUserId: string | null;
  author: MessageAuthorDto;
  toUser: { id: string; realName: string } | null;
}

export interface AlbumSummaryDto {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  photoCount: number;
  createdAt: string;
}

export interface PhotoDto {
  id: string;
  albumId: string;
  url: string;
  videoUrl: string | null;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface AlbumDto extends AlbumSummaryDto {
  photos: PhotoDto[];
}

export interface TimelineEventDto {
  id: string;
  date: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface SiteSettingsDto {
  className: string;
  schoolName: string | null;
  graduationYear: number | null;
  slogan: string | null;
  heroImageUrl: string | null;
  defaultTheme?: ThemeId;
  imageCompressEnabled: boolean;
  imageCompressThresholdKb: number;
  imageMaxDimension: number;
  imageQuality: number;
  copy: SiteCopy;
}

export interface AdminStatsDto {
  memberCount: number;
  messageCount: number;
  hiddenMessageCount: number;
  photoCount: number;
  activeInviteCount: number;
  recentMessages: MessageDto[];
}

export interface InviteCodeDto {
  id: string;
  code: string;
  note: string | null;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  disabled: boolean;
  createdAt: string;
}

export interface AdminMemberDto {
  id: string;
  username: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  profile: PublicProfileDto | null;
  messageCount: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
