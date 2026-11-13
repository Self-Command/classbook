import { randomInt } from 'node:crypto';
import type { InviteCode } from '@prisma/client';
import { prisma } from '../db';
import { ApiError } from './api-error';

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_LENGTH = 8;
const MAX_GENERATE_ATTEMPTS = 20;

export function isInviteUsable(invite: InviteCode | null, now = new Date()): invite is InviteCode {
  if (!invite) return false;
  if (invite.disabled) return false;
  if (invite.usedCount >= invite.maxUses) return false;
  if (invite.expiresAt && invite.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < INVITE_LENGTH; i += 1) {
    code += INVITE_ALPHABET[randomInt(0, INVITE_ALPHABET.length)];
  }
  return code;
}

export async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt += 1) {
    const code = generateInviteCode();
    const existing = await prisma.inviteCode.findUnique({ where: { code }, select: { id: true } });
    if (!existing) return code;
  }
  throw new ApiError(500, 'INTERNAL_ERROR', '邀请码生成失败，请重试');
}
