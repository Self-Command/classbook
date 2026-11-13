import { Link } from 'react-router-dom';
import type { PublicProfileDto } from '@classbook/shared';
import { Card, Chip } from '@heroui/react';
import { IconPin } from '@/components/icons';
import { ProfileAvatar } from './ProfileAvatar';

interface ClassmateCardProps {
  profile: PublicProfileDto;
  index: number;
}

const tilts = ['sm:-rotate-1', 'sm:rotate-[0.6deg]', 'sm:-rotate-[0.4deg]', 'sm:rotate-1'];

export function ClassmateCard({ profile, index }: ClassmateCardProps) {
  return (
    <Link
      aria-label={`查看${profile.realName}的同学档案`}
      className="group block rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      to={`/classmates/${profile.id}`}
    >
      <Card
        className={`h-full gap-0 rounded-[22px] border border-border/80 bg-surface p-3 shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:rotate-0 group-hover:shadow-lg ${tilts[index % tilts.length]}`}
      >
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[16px] bg-default/70">
          <span aria-hidden="true" className="absolute inset-x-5 top-4 h-px bg-border/70" />
          <span aria-hidden="true" className="absolute inset-x-5 bottom-4 h-px bg-border/70" />
          <ProfileAvatar
            className="size-20 rounded-[18px] shadow-sm sm:size-24"
            name={profile.realName}
            src={profile.avatarUrl}
            size="lg"
          />
          {profile.location && (
            <span className="absolute bottom-2.5 left-2.5 inline-flex max-w-[calc(100%-1.25rem)] items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] text-muted backdrop-blur">
              <IconPin className="size-3 shrink-0" />
              <span className="truncate">{profile.location}</span>
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
          <div className="flex items-start justify-between gap-2">
            <h2 className="truncate font-display text-lg leading-6 text-foreground">
              {profile.realName}
            </h2>
            {profile.nickname && (
              <Chip
                className="max-w-[45%] shrink-0"
                color="accent"
                size="sm"
                variant="soft"
              >
                <Chip.Label className="truncate">@{profile.nickname}</Chip.Label>
              </Chip>
            )}
          </div>
          <p className="mt-2 line-clamp-3 min-h-[3.75rem] text-xs leading-5 text-muted">
            {profile.motto ? `「${profile.motto}」` : '还没有写下寄语。'}
          </p>
        </div>
      </Card>
    </Link>
  );
}
