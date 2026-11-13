import type {
  AdminMemberDto,
  AdminStatsDto,
  AlbumDto,
  AlbumSummaryDto,
  InviteCodeDto,
  MessageDto,
  MessageStatus,
  Paginated,
  PhotoDto,
  Role,
  SiteSettingsDto,
  TimelineEventDto,
  UserDto,
  UserStatus,
} from '@classbook/shared';

const API_BASE = '/api';
export const AUTH_EXPIRED_EVENT = 'classbook:auth-expired';

const AUTH_EXEMPT_PATHS = new Set([
  '/auth/me',
  '/auth/login',
  '/auth/logout',
  '/auth/invite/validate',
]);

interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

function readErrorPayload(data: unknown): ApiErrorPayload | null {
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;
  const nested = record.error;
  if (typeof nested !== 'object' || nested === null) return null;
  const error = nested as Record<string, unknown>;
  if (typeof error.code !== 'string' || typeof error.message !== 'string') return null;
  return { code: error.code, message: error.message, details: error.details };
}

function fallbackMessage(status: number): string {
  if (status === 401) return '登录状态已失效，请重新登录';
  if (status === 403) return '没有权限执行此操作';
  if (status === 404) return '接口暂不可用（404），请确认后端服务已启动';
  if (status === 413) return '文件过大，请压缩后重试';
  if (status === 415) return '不支持的文件类型';
  if (status === 429) return '操作过于频繁，请稍后再试';
  if (status >= 500) return '服务器开小差了，请稍后重试';
  return `请求失败（HTTP ${status}）`;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = '登录状态已失效，请重新登录', code = 'UNAUTHORIZED', details?: unknown) {
    super(code, message, 401, details);
    this.name = 'UnauthorizedError';
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return '网络连接失败，请确认后端服务已启动';
  if (error instanceof Error && error.message) return error.message;
  return '操作失败，请稍后重试';
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  json?: unknown;
  body?: BodyInit | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { json, headers: rawHeaders, ...init } = options;
  const headers = new Headers(rawHeaders);
  let body = options.body;

  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      body,
      credentials: 'include',
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', '网络连接失败，请确认后端服务已启动', 0);
  }

  let data: unknown = null;
  if (response.status !== 204) {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    }
  }

  if (!response.ok) {
    const payload = readErrorPayload(data);
    const message = payload?.message ?? fallbackMessage(response.status);
    const code = payload?.code ?? `HTTP_${response.status}`;

    if (response.status === 401) {
      if (!AUTH_EXEMPT_PATHS.has(path) && typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      }
      throw new UnauthorizedError(message, code, payload?.details);
    }

    throw new ApiError(code, message, response.status, payload?.details);
  }

  return data as T;
}

function buildQuery(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

function memberPath(id: string): string {
  return `/admin/members/${encodeURIComponent(id)}`;
}

export const auth = {
  async me(): Promise<UserDto> {
    const data = await request<{ user: UserDto }>('/auth/me');
    return data.user;
  },

  async login(input: { username: string; password: string }): Promise<UserDto> {
    const data = await request<{ user: UserDto }>('/auth/login', {
      method: 'POST',
      json: input,
    });
    return data.user;
  },

  async logout(): Promise<void> {
    await request<void>('/auth/logout', { method: 'POST' });
  },
};

export interface MembersQuery {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface MemberUpdateInput {
  status?: UserStatus;
  role?: Role;
}

export interface AdminMessagesQuery {
  status?: MessageStatus;
  page?: number;
  pageSize?: number;
}

export interface AlbumCreateInput {
  title: string;
  description?: string | null;
}

export interface AlbumUpdateInput {
  title?: string;
  description?: string | null;
  coverUrl?: string | null;
}

export interface PhotoUpload {
  url: string;
  videoUrl?: string | null;
}

export interface PhotoAttachInput {
  photos: PhotoUpload[];
  caption?: string | null;
}

export type AlbumInput = AlbumCreateInput;

export interface TimelineCreateInput {
  date: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
}

export type TimelineUpdateInput = Partial<TimelineCreateInput>;

export interface InviteCreateInput {
  note?: string | null;
  maxUses?: number;
  expiresAt?: string | null;
}

export type SettingsUpdateInput = Partial<SiteSettingsDto>;

export const admin = {
  stats(): Promise<AdminStatsDto> {
    return request<AdminStatsDto>('/admin/stats');
  },

  members(query: MembersQuery = {}): Promise<Paginated<AdminMemberDto>> {
    return request<Paginated<AdminMemberDto>>(
      `/admin/members${buildQuery({
        q: query.q,
        page: query.page,
        pageSize: query.pageSize,
      })}`,
    );
  },

  async updateMember(id: string, input: MemberUpdateInput): Promise<AdminMemberDto> {
    const data = await request<{ member: AdminMemberDto }>(memberPath(id), {
      method: 'PATCH',
      json: input,
    });
    return data.member;
  },

  async resetMemberPassword(id: string, newPassword: string): Promise<void> {
    await request<void>(`${memberPath(id)}/reset-password`, {
      method: 'POST',
      json: { newPassword },
    });
  },

  messages(query: AdminMessagesQuery = {}): Promise<Paginated<MessageDto>> {
    return request<Paginated<MessageDto>>(
      `/admin/messages${buildQuery({
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      })}`,
    );
  },

  async updateMessageStatus(id: string, status: MessageStatus): Promise<MessageDto> {
    const data = await request<{ message: MessageDto }>(
      `/admin/messages/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        json: { status },
      },
    );
    return data.message;
  },

  settings(): Promise<SiteSettingsDto> {
    return request<SiteSettingsDto>('/settings/public');
  },

  updateSettings(input: SettingsUpdateInput): Promise<SiteSettingsDto> {
    return request<SiteSettingsDto>('/admin/settings', {
      method: 'PATCH',
      json: input,
    });
  },

  async invites(): Promise<InviteCodeDto[]> {
    const data = await request<{ items: InviteCodeDto[] }>('/admin/invite-codes');
    return data.items;
  },

  async createInvite(input: InviteCreateInput): Promise<InviteCodeDto> {
    const data = await request<{ invite: InviteCodeDto }>('/admin/invite-codes', {
      method: 'POST',
      json: input,
    });
    return data.invite;
  },

  async disableInvite(id: string): Promise<void> {
    await request<void>(`/admin/invite-codes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};

export const albums = {
  async list(): Promise<AlbumSummaryDto[]> {
    const data = await request<{ items: AlbumSummaryDto[] }>('/albums');
    return data.items;
  },

  async get(id: string): Promise<AlbumDto> {
    const data = await request<{ album: AlbumDto }>(`/albums/${encodeURIComponent(id)}`);
    return data.album;
  },

  async create(input: AlbumCreateInput): Promise<AlbumSummaryDto> {
    const data = await request<{ album: AlbumSummaryDto }>('/admin/albums', {
      method: 'POST',
      json: input,
    });
    return data.album;
  },

  async update(id: string, input: AlbumUpdateInput): Promise<AlbumSummaryDto> {
    const data = await request<{ album: AlbumSummaryDto }>(
      `/admin/albums/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        json: input,
      },
    );
    return data.album;
  },

  async remove(id: string): Promise<void> {
    await request<void>(`/admin/albums/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async addPhotos(id: string, input: PhotoAttachInput): Promise<PhotoDto[]> {
    const data = await request<{ photos: PhotoDto[] }>(
      `/admin/albums/${encodeURIComponent(id)}/photos`,
      {
        method: 'POST',
        json: input,
      },
    );
    return data.photos;
  },

  async removePhoto(id: string): Promise<void> {
    await request<void>(`/admin/photos/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};

export const timeline = {
  async list(): Promise<TimelineEventDto[]> {
    const data = await request<{ items: TimelineEventDto[] }>('/timeline');
    return data.items;
  },

  async create(input: TimelineCreateInput): Promise<TimelineEventDto> {
    const data = await request<{ event: TimelineEventDto }>('/admin/timeline', {
      method: 'POST',
      json: input,
    });
    return data.event;
  },

  async update(id: string, input: TimelineUpdateInput): Promise<TimelineEventDto> {
    const data = await request<{ event: TimelineEventDto }>(
      `/admin/timeline/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        json: input,
      },
    );
    return data.event;
  },

  async remove(id: string): Promise<void> {
    await request<void>(`/admin/timeline/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};

export const uploads = {
  async image(file: File): Promise<PhotoUpload> {
    const form = new FormData();
    form.append('file', file);
    const data = await request<{ url: string; videoUrl?: string | null }>('/uploads/images', {
      method: 'POST',
      body: form,
    });
    return { url: data.url, videoUrl: data.videoUrl ?? null };
  },

  async livePhoto(photo: File, video: File): Promise<PhotoUpload> {
    const normalizedVideo =
      video.type === 'video/mp4' || video.type === 'video/quicktime'
        ? video
        : new File([video], video.name || 'live-photo.mov', { type: 'video/quicktime' });

    const form = new FormData();
    form.append('photo', photo);
    form.append('video', normalizedVideo);
    const data = await request<{ url: string; videoUrl: string }>('/uploads/live-photo', {
      method: 'POST',
      body: form,
    });
    return { url: data.url, videoUrl: data.videoUrl };
  },
};
