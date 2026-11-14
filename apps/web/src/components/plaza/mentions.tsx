import { Fragment } from 'react';
import type { ReactNode } from 'react';
import type { PublicProfileDto } from '@classbook/shared';
import { profilesApi } from '@/lib/api';

export type MentionMember = Pick<
  PublicProfileDto,
  'id' | 'username' | 'realName' | 'nickname' | 'avatarUrl'
>;

export const MENTION_PATTERN = /@([A-Za-z0-9_-]{1,20})/g;

export async function fetchAllMembers(): Promise<MentionMember[]> {
  const pageSize = 50;
  const members: MentionMember[] = [];

  for (let page = 1; page <= 20; page += 1) {
    const result = await profilesApi.list({ page, pageSize });
    members.push(...result.items);
    if (members.length >= result.total || result.items.length < pageSize) break;
  }

  return members;
}

export function filterMembers(
  members: MentionMember[],
  query: string,
  excludeId?: string,
): MentionMember[] {
  const lower = query.toLowerCase();
  return members
    .filter(
      (member) =>
        member.id !== excludeId &&
        (member.username.toLowerCase().includes(lower) ||
          member.realName.toLowerCase().includes(lower) ||
          (member.nickname ?? '').toLowerCase().includes(lower)),
    )
    .slice(0, 6);
}

export function memberByUsername(
  members: MentionMember[],
  username: string,
): MentionMember | undefined {
  const lower = username.toLowerCase();
  return members.find((member) => member.username.toLowerCase() === lower);
}

interface MentionTextProps {
  content: string;
  members: MentionMember[];
}

export function MentionText({ content, members }: MentionTextProps) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(MENTION_PATTERN)) {
    const index = match.index ?? 0;
    if (!memberByUsername(members, match[1])) continue;
    if (index > lastIndex) nodes.push(content.slice(lastIndex, index));
    nodes.push(
      <span
        key={`mention-${index}`}
        className="font-medium text-accent"
      >{`@${match[1]}`}</span>,
    );
    lastIndex = index + match[0].length;
  }

  nodes.push(content.slice(lastIndex));

  return (
    <>
      {nodes.map((node, nodeIndex) => (
        <Fragment key={nodeIndex}>{node}</Fragment>
      ))}
    </>
  );
}