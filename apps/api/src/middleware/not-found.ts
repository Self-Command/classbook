import type { RequestHandler } from 'express';
import { ApiError } from '../lib/api-error';

export const notFoundHandler: RequestHandler = () => {
  throw new ApiError(404, 'NOT_FOUND', '资源不存在');
};
