import { Link } from 'react-router-dom';
import type { PublicProfileDto } from '@classbook/shared';
import { cx } from '@/lib/styles';
import { Avatar } from './Avatar';
import { IconPin } from './icons';

const rotations = ['-rotate-1', 'rotate-0', 'rotate-1', '-rotate-[0.5deg]'];

export function ClassmateCard({
  profile,
  index = 0,
}: {
  profile: PublicProfileDto;
  index?: number;
}) {
  return (
    <Link
      to={`/classmates/${profile.id}`}
      className="group block focus-visible:outline-none"
      aria-label={`查看 ${profile.realName} 的档案`}
    >
      <article
        className={cx(
          'relative rounded-[14px] border border-ink/10 bg-white p-3 pt-5 shadow-card transition duration-300 group-hover:-translate-y-1.5 group-hover:rotate-0 group-hover:shadow-lift group-focus-visible:ring-2 group-focus-visible:ring-ink/30',
          rotations[index % rotations.length],
        )}
      >
        <span
          className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rounded-[1px] bg-coral/25 shadow-sm"
          aria-hidden="true"
        />
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[8px] bg-cream">
          <Avatar
            name={profile.realName}
            src={profile.avatarUrl}
            size="xl"
            className="shadow-sm"
          />
        </div>
        <div className="px-1 pb-1 pt-3">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate font-display text-lg text-ink">{profile.realName}</h3>
            {profile.nickname && (
              <span className="shrink-0 truncate text-[11px] text-sage">
                @{profile.nickname}
              </span>
            )}
          </div>
          <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-ink-soft">
            {profile.motto ?? '这位同学还没有留下寄语'}
          </p>
          {profile.location && (
            <p className="mt-2 flex items-center gap-1 text-[11px] text-ink-faint">
              <IconPin className="h-3 w-3" />
              <span className="truncate">{profile.location}</span>
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
