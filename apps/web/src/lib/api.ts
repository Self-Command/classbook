import { z } from 'zod';
import {
  inviteValidateSchema,
  loginSchema,
  messageCreateSchema,
  passwordChangeSchema,
  profileUpdateSchema,
  registerSchema,
} from '@classbook/shared';
import type {
  AlbumCreateInput,
  AlbumDto,
  AlbumSummaryDto,
  AlbumUpdateInput,
  MessageDto,
  Paginated,
  PhotoDto,
  ProfileDto,
  PublicProfileDto,
  SiteSettingsDto,
  TimelineEventDto,
  UserDto,
} from '@classbook/shared';

const API_PREFIX = '/api';

export const UNAUTHORIZED_EVENT = 'classbook:unauthorized';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string, code = 'UNAUTHORIZED', details?: unknown) {
    super(401, code, message, details);
    this.name = 'UnauthorizedError';
  }
}

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type MessageCreateInput = z.infer<typeof messageCreateSchema>;

type QueryValue = string | number | boolean | null | undefined;

interface RequestOptions {
  method?: string;
  json?: unknown;
  body?: BodyInit;
  headers?: HeadersInit;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
}

interface NormalizedError {
  code: string;
  message: string;
  details?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function defaultMessage(status: number): string {
  switch (status) {
    case 400:
      return '请求有误，请检查后重试';
    case 401:
      return '请先登录';
    case 403:
      return '没有权限进行此操作';
    case 404:
      return '没有找到相关内容';
    case 409:
      return '数据冲突，请刷新后重试';
    case 413:
      return '文件太大了';
    case 415:
      return '不支持的文件格式';
    case 429:
      return '操作太频繁，请稍后再试';
    case 500:
      return '服务器开小差了，请稍后再试';
    default:
      return '请求失败，请稍后再试';
  }
}

function codeForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 413:
      return 'UPLOAD_TOO_LARGE';
    case 415:
      return 'UNSUPPORTED_FILE_TYPE';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'INTERNAL_ERROR';
  }
}

function normalizeError(data: unknown, status: number): NormalizedError {
  if (isRecord(data) && isRecord(data.error)) {
    const code =
      typeof data.error.code === 'string' && data.error.code.length > 0
        ? data.error.code
        : codeForStatus(status);
    const message =
      typeof data.error.message === 'string' && data.error.message.length > 0
        ? data.error.message
        : defaultMessage(status);
    return { code, message, details: data.error.details };
  }
  return { code: codeForStatus(status), message: defaultMessage(status) };
}

function buildQuery(query?: Record<string, QueryValue>): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue;
    params.set(key, String(value));
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', json, body, headers, query, signal } = options;
  const requestHeaders = new Headers(headers);
  const init: RequestInit = {
    method,
    credentials: 'include',
    headers: requestHeaders,
    signal,
  };

  if (json !== undefined) {
    requestHeaders.set('Content-Type', 'application/json');
    init.body = JSON.stringify(json);
  } else if (body !== undefined) {
    init.body = body;
  }

  const response = await fetch(`${API_PREFIX}${path}${buildQuery(query)}`, init);
  const text = await response.text();
  const data = parseBody(text);

  if (!response.ok) {
    const normalized = normalizeError(data, response.status);
    if (response.status === 401) {
      if (!path.startsWith('/auth/')) {
        window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
      }
      throw new UnauthorizedError(normalized.message, normalized.code, normalized.details);
    }
    throw new ApiError(
      response.status,
      normalized.code,
      normalized.message,
      normalized.details,
    );
  }

  if (response.status === 204 || text.length === 0) {
    return undefined as T;
  }

  return data as T;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return '网络开小差了，请稍后再试';
  if (error instanceof Error && error.message) return error.message;
  return '网络开小差了，请稍后再试';
}

export const authApi = {
  me: () => request<{ user: UserDto }>('/auth/me'),
  login: (input: LoginInput) =>
    request<{ user: UserDto }>('/auth/login', { method: 'POST', json: input }),
  register: (input: RegisterInput) =>
    request<{ user: UserDto }>('/auth/register', { method: 'POST', json: input }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  changePassword: (input: PasswordChangeInput) =>
    request<void>('/auth/password', { method: 'PATCH', json: input }),
  validateInvite: (code: string) => {
    const parsed = inviteValidateSchema.safeParse({ code });
    return request<{ valid: boolean }>('/auth/invite/validate', {
      method: 'POST',
      json: parsed.success ? parsed.data : { code },
    });
  },
};

export interface ProfileDetailDto {
  profile: ProfileDto;
  username: string;
}

export interface PageParams {
  page?: number;
  pageSize?: number;
}

export const profilesApi = {
  list: (params: PageParams & { q?: string } = {}) =>
    request<Paginated<PublicProfileDto>>('/profiles', {
      query: {
        q: params.q,
        page: params.page,
        pageSize: params.pageSize,
      },
    }),
  get: (id: string) =>
    request<ProfileDetailDto>(`/profiles/${encodeURIComponent(id)}`),
  updateMe: (input: ProfileUpdateInput) =>
    request<{ profile: ProfileDto }>('/profiles/me', {
      method: 'PATCH',
      json: input,
    }),
};

export const messagesApi = {
  list: (params: PageParams & { toUserId?: string } = {}) =>
    request<Paginated<MessageDto>>('/messages', {
      query: {
        page: params.page,
        pageSize: params.pageSize,
        toUserId: params.toUserId,
      },
    }),
  create: (input: MessageCreateInput) =>
    request<{ message: MessageDto }>('/messages', {
      method: 'POST',
      json: input,
    }),
  remove: (id: string) =>
    request<void>(`/messages/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const albumsApi = {
  list: () => request<{ items: AlbumSummaryDto[] }>('/albums'),
  get: (id: string) =>
    request<{ album: AlbumDto }>(`/albums/${encodeURIComponent(id)}`),
  create: (input: AlbumCreateInput) =>
    request<{ album: AlbumDto }>('/albums', { method: 'POST', json: input }),
  update: (id: string, input: AlbumUpdateInput) =>
    request<{ album: AlbumDto }>(`/albums/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      json: input,
    }),
  remove: (id: string) =>
    request<void>(`/albums/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  addPhotos: (id: string, photos: PhotoUpload[], caption?: string | null) =>
    request<{ photos: PhotoDto[] }>(`/albums/${encodeURIComponent(id)}/photos`, {
      method: 'POST',
      json: { photos, caption: caption ?? undefined },
    }),
  removePhoto: (photoId: string) =>
    request<void>(`/albums/photos/${encodeURIComponent(photoId)}`, {
      method: 'DELETE',
    }),
};

export const timelineApi = {
  list: () => request<{ items: TimelineEventDto[] }>('/timeline'),
};

let publicSettingsCache: SiteSettingsDto | null = null;
let publicSettingsRequest: Promise<SiteSettingsDto> | null = null;

export const settingsApi = {
  getPublic: async (): Promise<SiteSettingsDto> => {
    if (publicSettingsCache) return publicSettingsCache;
    if (!publicSettingsRequest) {
      publicSettingsRequest = request<SiteSettingsDto>('/settings/public')
        .then((settings) => {
          publicSettingsCache = settings;
          return settings;
        })
        .finally(() => {
          publicSettingsRequest = null;
        });
    }
    return publicSettingsRequest;
  },
};

function uploadFile(path: string, file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  return request<{ url: string }>(path, { method: 'POST', body: form });
}

export interface PhotoUpload {
  url: string;
  videoUrl: string | null;
}

export const uploadsApi = {
  avatar: (file: File) => uploadFile('/uploads/avatar', file),

  async image(file: File): Promise<PhotoUpload> {
    const form = new FormData();
    form.append('file', file);
    const data = await request<{ url: string; videoUrl?: string | null }>(
      '/uploads/images',
      { method: 'POST', body: form },
    );
    return { url: data.url, videoUrl: data.videoUrl ?? null };
  },

  async livePhoto(photo: File, video: File): Promise<PhotoUpload> {
    const normalizedVideo =
      video.type === 'video/mp4' || video.type === 'video/quicktime'
        ? video
        : new File([video], video.name || 'live-photo.mov', {
            type: 'video/quicktime',
          });

    const form = new FormData();
    form.append('photo', photo);
    form.append('video', normalizedVideo);
    const data = await request<{ url: string; videoUrl: string }>(
      '/uploads/live-photo',
      { method: 'POST', body: form },
    );
    return { url: data.url, videoUrl: data.videoUrl };
  },
};
