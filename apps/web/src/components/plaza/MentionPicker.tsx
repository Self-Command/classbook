import type { MentionMember } from './mentions';
import { ProfileAvatar } from '@/components/content/ProfileAvatar';

interface MentionPickerProps {
  members: MentionMember[];
  activeIndex: number;
  onPick: (username: string) => void;
}

export function MentionPicker({
  members,
  activeIndex,
  onPick,
}: MentionPickerProps) {
  return (
    <div
      aria-label="选择要提及的同学"
      className="absolute bottom-full left-0 z-20 mb-2 w-64 overflow-hidden rounded-2xl border border-border bg-surface shadow-lift"
      role="listbox"
    >
      {members.map((member, index) => (
        <button
          key={member.id}
          type="button"
          aria-selected={index === activeIndex}
          className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${
            index === activeIndex
              ? 'bg-accent/10 text-accent'
              : 'text-foreground hover:bg-default'
          }`}
          onMouseDown={(event) => {
            event.preventDefault();
            onPick(member.username);
          }}
          role="option"
        >
          <ProfileAvatar
            className="size-7 shrink-0"
            name={member.realName}
            size="sm"
            src={member.avatarUrl}
          />
          <span className="min-w-0 flex-1 truncate">
            <span className="block font-medium leading-5">{member.realName}</span>
            <span className="block truncate text-[11px] text-muted">
              @{member.username}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}