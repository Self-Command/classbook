import type { RequestHandler } from 'express';
import { config } from '../config';

export const requestLogger: RequestHandler = (req, res, next) => {
  if (config.nodeEnv === 'test') {
    next();
    return;
  }

  const startedAt = Date.now();
  const path = req.originalUrl.split('?')[0];
  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    console.log(`${req.method} ${path} ${res.statusCode} ${duration}ms`);
  });
  next();
};
