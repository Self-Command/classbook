import type { CookieOptions, RequestHandler, Response } from 'express';
import type { User } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { AUTH_COOKIE, type Role } from '@classbook/shared';
import { config } from '../config';
import { prisma } from '../db';
import { ApiError } from './api-error';

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface AuthTokenPayload {
  sub: string;
  role: Role;
  tokenVersion: number;
}

export const cookieBaseOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.cookieSecure || config.nodeEnv === 'production',
  path: '/',
};

export const authCookieOptions: CookieOptions = {
  ...cookieBaseOptions,
  maxAge: TOKEN_TTL_SECONDS * 1000,
};

export function signAuthToken(user: Pick<User, 'id' | 'role' | 'tokenVersion'>): string {
  const payload: AuthTokenPayload = {
    sub: user.id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: TOKEN_TTL_SECONDS });
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, authCookieOptions);
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, cookieBaseOptions);
}

function parseToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (typeof decoded === 'string') return null;
    const { sub, role, tokenVersion } = decoded;
    if (typeof sub !== 'string' || sub.length === 0) return null;
    if (role !== 'MEMBER' && role !== 'ADMIN') return null;
    if (typeof tokenVersion !== 'number' || !Number.isInteger(tokenVersion)) return null;
    return { sub, role, tokenVersion };
  } catch {
    return null;
  }
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = req.cookies?.[AUTH_COOKIE];
  if (typeof token !== 'string' || token.length === 0) {
    throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
  }

  const payload = parseToken(token);
  if (!payload) {
    clearAuthCookie(res);
    throw new ApiError(401, 'UNAUTHORIZED', '登录已失效，请重新登录');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { profile: true },
  });

  if (!user || user.status !== 'ACTIVE' || user.tokenVersion !== payload.tokenVersion) {
    clearAuthCookie(res);
    throw new ApiError(401, 'UNAUTHORIZED', '登录已失效，请重新登录');
  }

  req.user = user;
  next();
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'UNAUTHORIZED', '请先登录');
  }
  if (req.user.role !== 'ADMIN') {
    throw new ApiError(403, 'FORBIDDEN', '无权访问该资源');
  }
  next();
};
