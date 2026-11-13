import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5433/classbook_test?schema=public';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup-env.ts'],
    globals: true,
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'test-secret-do-not-use-in-production',
      UPLOAD_DIR: 'uploads/test-tmp',
      COOKIE_SECURE: 'false',
      WEB_ORIGIN: 'http://localhost:5173',
      ADMIN_ORIGIN: 'http://localhost:5174',
    },
  },
});
