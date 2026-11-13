import type { ErrorRequestHandler } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { ApiError } from '../lib/api-error';

interface BodyParserError extends Error {
  status?: number;
  type?: string;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: '请求参数有误',
        details: err.flatten(),
      },
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: { code: 'UPLOAD_TOO_LARGE', message: '文件大小超出限制' },
      });
      return;
    }
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: '上传请求无效' },
    });
    return;
  }

  const parserError = err as BodyParserError;
  if (parserError.type === 'entity.too.large') {
    res.status(413).json({
      error: { code: 'UPLOAD_TOO_LARGE', message: '请求体过大' },
    });
    return;
  }
  if (parserError.type === 'entity.parse.failed') {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: '请求体不是合法的 JSON' },
    });
    return;
  }

  console.error(`[api:error] ${req.method} ${req.originalUrl.split('?')[0]}`, err);

  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
  });
};
