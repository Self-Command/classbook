# 生产部署

本文面向一台全新的 Linux 云服务器（Ubuntu 22.04/24.04 或 Debian 12），使用 Docker Compose、宿主机 Nginx、certbot 和 GHCR 镜像完成部署。

## 1. 前置条件

- 一台有公网 IP 的服务器，拥有 root 或 sudo 权限。
- 一个已解析到服务器 IP 的域名（A/AAAA 记录）。
- 服务器防火墙开放 `22`、`80`、`443`；**不要**开放 `8080`、`3000`、`5432`。
- GitHub 仓库与 GHCR 镜像可访问：
  - https://github.com/Self-Command/classbook
  - `ghcr.io/self-command/classbook-api:latest`
  - `ghcr.io/self-command/classbook-web:latest`

镜像由 GitHub Actions 的 `Docker` workflow 在 `main` 分支构建。部署前先确认 Actions 成功，并在 GitHub 的 Package settings 中把两个包设为 **Public**，或准备一个有 `read:packages` 权限的 PAT。

## 2. 安装依赖

```bash
sudo apt update
sudo apt install -y ca-certificates curl git nginx certbot python3-certbot-nginx

curl -fsSL https://get.docker.com | sudo sh
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

重新登录 SSH 让 docker 组生效，然后验证：

```bash
docker --version
docker compose version
nginx -v
```

## 3. 获取部署文件

```bash
sudo mkdir -p /opt/classbook
sudo chown "$USER":"$USER" /opt/classbook
git clone https://github.com/Self-Command/classbook.git /opt/classbook
cd /opt/classbook
```

如果 GHCR 包仍是 Private：

```bash
echo "<PAT-with-read:packages>" | docker login ghcr.io -u <github-user> --password-stdin
```

## 4. 配置环境变量

```bash
cp deploy/.env.example deploy/.env
chmod 600 deploy/.env
```

编辑 `deploy/.env`：

```dotenv
IMAGE_PREFIX=ghcr.io/self-command
IMAGE_TAG=latest
WEB_PORT=8080

POSTGRES_USER=classbook
POSTGRES_PASSWORD=<URL 安全的强密码>
POSTGRES_DB=classbook

JWT_SECRET=<openssl rand -hex 32 的输出>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<强密码>

COOKIE_SECURE=true
PUBLIC_ORIGIN=https://<你的域名>
TZ=Asia/Shanghai
```

说明：

- `POSTGRES_PASSWORD` 会被拼进 `DATABASE_URL`，只使用字母和数字，避免 `@ : / ? # %` 等字符。
- 生成密钥：

  ```bash
  openssl rand -hex 32
  ```

- `PUBLIC_ORIGIN` 必须与最终访问地址完全一致（含 `https://`，不要带末尾斜杠）。
- 不要提交或外发 `deploy/.env`。

## 5. 启动容器

```bash
cd /opt/classbook

docker compose -f deploy/docker-compose.yml --env-file deploy/.env pull

docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d

docker compose -f deploy/docker-compose.yml --env-file deploy/.env ps
```

期望结果：

- `postgres`、`api`、`web` 三个服务均为 running，API/Web 为 healthy。
- `web` 只监听 `127.0.0.1:8080`。
- `api` 和 `postgres` 没有宿主机端口映射。

API 容器启动时会自动执行 `prisma migrate deploy`。首次启动如果失败，先看日志：

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env logs -f api
```

## 6. 创建管理员（仅首次）

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env \
  exec -T api pnpm --filter @classbook/api db:seed
```

输出应包含管理员用户名。随后访问 `/admin/` 登录，并立即在「我的档案」中修改密码。

> 重复执行 seed 只会确保管理员存在，不会清空业务数据。`db:seed:demo` 会清空演示数据，**不要在生产执行**。

## 7. 配置宿主机 Nginx

```bash
sudo cp /opt/classbook/deploy/nginx.conf.example /etc/nginx/sites-available/classbook
sudo sed -i 's/classbook.example.com/<你的域名>/g' /etc/nginx/sites-available/classbook
sudo ln -sf /etc/nginx/sites-available/classbook /etc/nginx/sites-enabled/classbook
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

先验证回环代理：

```bash
curl -I http://127.0.0.1:8080/
curl -fsS http://127.0.0.1:8080/api/health
```

## 8. 配置 HTTPS

DNS 生效后：

```bash
sudo certbot --nginx -d <你的域名> --redirect
```

按提示填写邮箱、同意条款，选择自动跳转 HTTPS。验证续期：

```bash
sudo certbot renew --dry-run
```

## 9. 验收清单

```bash
curl -I https://<你的域名>/
curl -fsS https://<你的域名>/api/health
curl -I https://<你的域名>/admin/
```

浏览器检查：

1. 首页、登录、注册正常，HTTPS 证书有效。
2. 管理员登录 `/admin/`，仪表盘、成员、邀请码、留言、相册、时间线、设置均可打开。
3. 前台同学录、留言墙、相册、时间线、我的档案正常。
4. 上传图片后 `/uploads/...` 可显示。
5. 390px 手机宽度无横向滚动。
6. 刷新 `/admin/members` 等深层路由不会 404。
7. `docker compose ps` 三个服务健康。
8. 公网无法访问 `8080`、`3000`、`5432`。

## 10. 备份与恢复

卷名（Compose 项目名为 `classbook`）：

- `classbook_pgdata`
- `classbook_uploads`

备份：

```bash
mkdir -p /opt/backups/classbook

docker compose -f /opt/classbook/deploy/docker-compose.yml --env-file /opt/classbook/deploy/.env \
  exec -T postgres pg_dump -U classbook classbook \
  | gzip > /opt/backups/classbook/db-$(date +%F).sql.gz

docker run --rm \
  -v classbook_uploads:/data:ro \
  -v /opt/backups/classbook:/backup \
  alpine tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

恢复数据库（会覆盖现有数据，先停应用写流量）：

```bash
gunzip -c /opt/backups/classbook/db-YYYY-MM-DD.sql.gz \
  | docker compose -f /opt/classbook/deploy/docker-compose.yml --env-file /opt/classbook/deploy/.env \
      exec -T postgres psql -U classbook -d classbook
```

恢复上传文件：

```bash
docker run --rm \
  -v classbook_uploads:/data \
  -v /opt/backups/classbook:/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/uploads-YYYY-MM-DD.tar.gz -C /data"
```

## 11. 更新与回滚

更新：

```bash
cd /opt/classbook
git pull --ff-only
docker compose -f deploy/docker-compose.yml --env-file deploy/.env pull
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d
```

回滚：把 `deploy/.env` 的 `IMAGE_TAG` 改成之前的 `sha-xxxxxxx` 或版本标签，然后：

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env pull
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d
```

## 12. 常见问题

**镜像拉取 403/unauthorized**

GHCR 包不是 Public，或 PAT 没有 `read:packages`。设置包为 Public，或重新登录：

```bash
docker logout ghcr.io
echo "<PAT>" | docker login ghcr.io -u <github-user> --password-stdin
```

**API 容器反复重启**

看日志。常见原因：`JWT_SECRET` 为空、数据库密码含 URL 特殊字符、Postgres 尚未 healthy。确认 `deploy/.env` 后重建：

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --force-recreate api
```

**页面 502**

`web` 无法连接 `api`。确认 `api` 为 healthy：

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env ps
docker compose -f deploy/docker-compose.yml --env-file deploy/.env logs api
```

**登录后马上掉线**

`COOKIE_SECURE=true` 时必须用 HTTPS 访问；如果暂时用 HTTP 测试，改为 `false` 并重启 `api`，上线前改回 `true`。

**上传后图片 401**

`/uploads` 需要登录态。确认浏览器已登录，且 `PUBLIC_ORIGIN` 与实际访问域名一致。

## 13. 安全要求

- 只暴露 80/443；`web` 的 8080 仅绑定 `127.0.0.1`。
- 使用强 `POSTGRES_PASSWORD`、`JWT_SECRET`、`ADMIN_PASSWORD`，不要复用。
- 不在仓库、聊天或日志中记录真实密码。
- 不执行 `docker compose down -v`，否则会删除数据库和上传卷。
- 定期执行备份，并至少做一次恢复演练。
