import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { createApp } from './app';
import { config } from './config';

mkdirSync(path.resolve(config.uploadDir), { recursive: true });

const app = createApp();

app.listen(config.port, () => {
  console.log(`API 已启动: http://localhost:${config.port}`);
});
