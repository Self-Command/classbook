import type {
  Album,
  InviteCode,
  Message,
  Photo,
  Profile,
  SiteSetting,
  TimelineEvent,
  User,
} from '@prisma/client';
import type {
  AdminMemberDto,
  AlbumDto,
  AlbumSummaryDto,
  InviteCodeDto,
  MessageDto,
  PhotoDto,
  ProfileDto,
  PublicProfileDto,
  SiteSettingsDto,
  ThemeId,
  TimelineEventDto,
  UserDto,
} from '@classbook/shared';

export type UserWithProfile = User & { profile: Profile | null };
export type MessageWithRelations = Message & {
  author: UserWithProfile;
  toUser: UserWithProfile | null;
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

export function toPublicProfileDto(profile: Profile): PublicProfileDto {
  return {
    id: profile.userId,
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

export function toMessageDto(message: MessageWithRelations): MessageDto {
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
  };
}

export function toPhotoDto(photo: Photo): PhotoDto {
  return {
    id: photo.id,
    albumId: photo.albumId,
    url: photo.url,
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
  return {
    className: setting?.className ?? '我们的班级',
    schoolName: setting?.schoolName ?? null,
    graduationYear: setting?.graduationYear ?? null,
    slogan: setting?.slogan ?? null,
    heroImageUrl: setting?.heroImageUrl ?? null,
    defaultTheme: (setting?.defaultTheme as ThemeId | undefined) ?? 'warm',
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
    profile: user.profile ? toPublicProfileDto(user.profile) : null,
    messageCount,
  };
}
