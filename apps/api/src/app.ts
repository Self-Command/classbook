import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { config } from './config';
import { prisma } from './db';
import { requireAuth } from './lib/auth';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { requestLogger } from './middleware/request-logger';
import { adminRouter } from './routes/admin';
import { albumsRouter } from './routes/albums';
import { authRouter } from './routes/auth';
import { messagesRouter } from './routes/messages';
import { notificationsRouter } from './routes/notifications';
import { plazaRouter } from './routes/plaza';
import { profilesRouter } from './routes/profiles';
import { settingsRouter } from './routes/settings';
import { timelineRouter } from './routes/timeline';
import { uploadsRouter } from './routes/uploads';

const allowedOrigins = new Set([config.webOrigin, config.adminOrigin]);

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use(
    '/uploads',
    async (req, res, next) => {
      if (req.method === 'GET' || req.method === 'HEAD') {
        try {
          const setting = await prisma.siteSetting.findUnique({
            where: { id: 1 },
            select: { heroImageUrl: true },
          });
          const publicUrl = `/uploads${req.path}`;
          if (setting?.heroImageUrl === publicUrl) {
            next();
            return;
          }
        } catch {
          // 数据库异常时退回鉴权，避免误放行
        }
      }
      try {
        await requireAuth(req, res, next);
      } catch (error) {
        next(error);
      }
    },
    express.static(path.resolve(config.uploadDir), {
      index: false,
      dotfiles: 'deny',
      maxAge: 3600 * 1000,
      setHeaders(res) {
        res.setHeader('Cache-Control', 'private, max-age=3600');
      },
    }),
  );

  app.use('/api/auth', authRouter);
  app.use('/api/profiles', profilesRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/plaza', plazaRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/albums', albumsRouter);
  app.use('/api/timeline', timelineRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
