import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const jwtSecret = process.env.JWT_SECRET ?? (nodeEnv === 'production' ? '' : 'dev-secret-change-me');

if (!jwtSecret) {
  throw new Error('生产环境必须设置 JWT_SECRET');
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv,
  jwtSecret,
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  adminOrigin: process.env.ADMIN_ORIGIN ?? 'http://localhost:5174',
};
