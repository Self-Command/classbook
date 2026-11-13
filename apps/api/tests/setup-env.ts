import path from 'node:path';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5433/classbook_test?schema=public';
process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
process.env.UPLOAD_DIR = path.resolve(process.cwd(), 'uploads/test-tmp');
process.env.COOKIE_SECURE = 'false';
process.env.WEB_ORIGIN = 'http://localhost:5173';
process.env.ADMIN_ORIGIN = 'http://localhost:5174';
