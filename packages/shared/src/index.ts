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
