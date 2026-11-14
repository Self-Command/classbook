import type {
  Album,
  InviteCode,
  Message,
  MessageComment,
  Notification,
  Photo,
  Profile,
  SiteSetting,
  TimelineEvent,
  User,
} from '@prisma/client';
import { DEFAULT_SITE_COPY } from '@classbook/shared';
import type {
  AdminMemberDto,
  AlbumDto,
  AlbumSummaryDto,
  InviteCodeDto,
  MessageCommentDto,
  MessageDto,
  NotificationDto,
  PhotoDto,
  ProfileDto,
  PublicProfileDto,
  SiteCopy,
  SiteSettingsDto,
  ThemeId,
  TimelineEventDto,
  UserDto,
} from '@classbook/shared';

export type UserWithProfile = User & { profile: Profile | null };
export type MessageWithRelations = Message & {
  author: UserWithProfile;
  toUser: UserWithProfile | null;
  likes?: { userId: string }[];
};

export function toProfileDto(profile: Profile): ProfileDto {
  return {
    id: profile.id,
    userId: profile.userId,
    realName: profile.realName,
    nickname: profile.nickname,
    avatarUrl: profile.avatarUrl,
    motto: profile.motto,
    bio: profile.bio,
    location: profile.location,
    birthday: profile.birthday,
    wechat: profile.wechat,
    qq: profile.qq,
    email: profile.email,
    phone: profile.phone,
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function toPublicProfileDto(
  profile: Profile,
  username = '',
): PublicProfileDto {
  return {
    id: profile.userId,
    username,
    realName: profile.realName,
    nickname: profile.nickname,
    avatarUrl: profile.avatarUrl,
    motto: profile.motto,
    location: profile.location,
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function toUserDto(user: UserWithProfile): UserDto {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    profile: user.profile ? toProfileDto(user.profile) : null,
    theme: (user.theme as ThemeId | null) ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toMessageDto(
  message: MessageWithRelations,
  viewerId?: string | null,
): MessageDto {
  const authorDisabled = message.author.status === 'DISABLED';
  const author = authorDisabled
    ? {
        id: message.author.id,
        realName: '已注销同学',
        nickname: null,
        avatarUrl: null,
        disabled: true,
      }
    : {
        id: message.author.id,
        realName: message.author.profile?.realName ?? message.author.username,
        nickname: message.author.profile?.nickname ?? null,
        avatarUrl: message.author.profile?.avatarUrl ?? null,
        disabled: false,
      };

  return {
    id: message.id,
    content: message.content,
    status: message.status,
    createdAt: message.createdAt.toISOString(),
    toUserId: message.toUserId,
    author,
    toUser: message.toUser
      ? {
          id: message.toUser.id,
          realName: message.toUser.profile?.realName ?? message.toUser.username,
        }
      : null,
    images: message.images ?? [],
    visibility: message.visibility,
    commentCount: message.commentCount,
    likeCount: message.likeCount,
    likedByMe:
      Boolean(viewerId) &&
      (message.likes?.some((like) => like.userId === viewerId) ?? false),
  };
}

export type MessageCommentWithRelations = MessageComment & {
  author: UserWithProfile;
};

export function toMessageCommentDto(comment: MessageCommentWithRelations): MessageCommentDto {
  return {
    id: comment.id,
    messageId: comment.messageId,
    parentId: comment.parentId,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    author: {
      id: comment.author.id,
      realName: comment.author.profile?.realName ?? comment.author.username,
      nickname: comment.author.profile?.nickname ?? null,
      avatarUrl: comment.author.profile?.avatarUrl ?? null,
      disabled: comment.author.status === 'DISABLED',
    },
  };
}

export function toNotificationDto(
  notification: Notification & { actor: UserWithProfile },
): NotificationDto {
  return {
    id: notification.id,
    type: notification.type,
    actor: {
      id: notification.actor.id,
      realName: notification.actor.profile?.realName ?? notification.actor.username,
      nickname: notification.actor.profile?.nickname ?? null,
      avatarUrl: notification.actor.profile?.avatarUrl ?? null,
      disabled: notification.actor.status === 'DISABLED',
    },
    messageId: notification.messageId,
    commentId: notification.commentId,
    preview: notification.preview,
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    createdAt: notification.createdAt.toISOString(),
  };
}

export function toPhotoDto(photo: Photo): PhotoDto {
  return {
    id: photo.id,
    albumId: photo.albumId,
    url: photo.url,
    videoUrl: photo.videoUrl ?? null,
    caption: photo.caption,
    sortOrder: photo.sortOrder,
    createdAt: photo.createdAt.toISOString(),
  };
}

export function toAlbumSummaryDto(
  album: Album,
  photoCount: number,
  firstPhotoUrl: string | null,
): AlbumSummaryDto {
  return {
    id: album.id,
    title: album.title,
    description: album.description,
    coverUrl: album.coverUrl ?? firstPhotoUrl,
    photoCount,
    createdAt: album.createdAt.toISOString(),
  };
}

export function toAlbumDto(album: Album & { photos: Photo[] }): AlbumDto {
  const photos = album.photos.map(toPhotoDto);
  return {
    ...toAlbumSummaryDto(album, photos.length, photos[0]?.url ?? null),
    photos,
  };
}

export function toTimelineEventDto(event: TimelineEvent): TimelineEventDto {
  return {
    id: event.id,
    date: event.date.toISOString(),
    title: event.title,
    description: event.description,
    imageUrl: event.imageUrl,
    sortOrder: event.sortOrder,
    createdAt: event.createdAt.toISOString(),
  };
}

export function toSiteSettingsDto(setting: SiteSetting | null): SiteSettingsDto {
  const storedCopy =
    setting?.copy && typeof setting.copy === 'object' && !Array.isArray(setting.copy)
      ? (setting.copy as Partial<SiteCopy>)
      : {};

  return {
    className: setting?.className ?? '我们的班级',
    schoolName: setting?.schoolName ?? null,
    graduationYear: setting?.graduationYear ?? null,
    slogan: setting?.slogan ?? null,
    heroImageUrl: setting?.heroImageUrl ?? null,
    defaultTheme: (setting?.defaultTheme as ThemeId | undefined) ?? 'warm',
    imageCompressEnabled: setting?.imageCompressEnabled ?? true,
    imageCompressThresholdKb: setting?.imageCompressThresholdKb ?? 1024,
    imageMaxDimension: setting?.imageMaxDimension ?? 1920,
    imageQuality: setting?.imageQuality ?? 82,
    copy: { ...DEFAULT_SITE_COPY, ...storedCopy },
  };
}

export function toInviteCodeDto(invite: InviteCode): InviteCodeDto {
  return {
    id: invite.id,
    code: invite.code,
    note: invite.note,
    maxUses: invite.maxUses,
    usedCount: invite.usedCount,
    expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
    disabled: invite.disabled,
    createdAt: invite.createdAt.toISOString(),
  };
}

export function toAdminMemberDto(user: UserWithProfile, messageCount: number): AdminMemberDto {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    profile: user.profile
      ? toPublicProfileDto(user.profile, user.username)
      : null,
    messageCount,
  };
}
