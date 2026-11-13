import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const dataDir = resolve(process.cwd(), '.dev/pgdata');
const port = 5433;
const user = 'postgres';
const password = 'postgres';

async function main() {
  mkdirSync(resolve(process.cwd(), '.dev'), { recursive: true });

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user,
    password,
    port,
    persistent: true,
  });

  if (!existsSync(dataDir)) {
    console.log('初始化 PostgreSQL 数据目录…');
    await pg.initialise();
  }

  console.log('启动 PostgreSQL…');
  await pg.start();

  for (const database of ['classbook_dev', 'classbook_test']) {
    try {
      await pg.createDatabase(database);
      console.log(`创建数据库 ${database}`);
    } catch {
      console.log(`数据库已存在 ${database}`);
    }
  }

  console.log(
    `PostgreSQL 就绪: postgresql://${user}:${password}@localhost:${port}/classbook_dev`,
  );

  const shutdown = async () => {
    try {
      await pg.stop();
    } catch {
      // ignore
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await new Promise(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
