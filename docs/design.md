# 拾光同学录（Classbook）设计文档

- 日期：2026-11-12
- 状态：已批准并实现（2026-11-12）
- 代码仓库：本仓库

## 1. 背景与目标

用途假设：本班毕业纪念与长期联络。一个私密站点，只有本班同学凭邀请码注册后进入；同学可以维护自己的档案、互相留言、浏览班级相册与时间线；管理员负责邀请码、成员、内容审核和站点设置。

成功标准：

- 新同学拿到邀请码后，3 分钟内完成注册并完善档案。
- 登录后能按姓名搜索全班同学、查看档案与留言、浏览相册和时间线。
- 管理员能生成/停用邀请码、禁用成员、隐藏违规留言、管理相册与时间线、修改站点信息。
- 可部署到公网 Linux 服务器，数据存放在 PostgreSQL；Web/Admin 静态资源与 API 由 Docker Compose 运行，宿主机 Nginx 负责域名与 HTTPS。

非目标（v1 不做）：

- 即时聊天、私信会话、好友关系。
- 匿名树洞、投票、活动报名。
- 手机 App、微信小程序、公众号集成。
- 视频上传、对象存储/CDN、图片压缩流水线。
- 多班级/多租户、国际化。
- 邮件找回密码（由管理员重置）。

反目标：

- 为了功能多而牺牲私密性：未登录访客不能读取任何同学资料、留言、相册。
- 把管理后台代码打进公开展示站的产物里。
- 把密码、JWT 密钥、数据库连接串写进仓库。

## 2. 角色

| 角色 | 权限 |
| --- | --- |
| 访客 | 登录、注册（需邀请码）、查看公开落地页（班级名/口号/封面），不能读取任何同学数据 |
| 同学 member | 浏览档案/留言/相册/时间线；编辑自己的档案；发留言；删除自己的留言 |
| 管理员 admin | 同学全部权限 + 邀请码管理、成员管理、留言审核、相册/时间线/站点设置管理 |

## 3. 架构（方案 A：三应用 + 共享契约）

```
OP/
  pnpm-workspace.yaml
  package.json                 # 根脚本：dev/build/typecheck/test/db:*
  tsconfig.base.json
  .env.example
  .gitignore
  apps/
    api/                       # Express + Prisma + PostgreSQL
      prisma/schema.prisma
      prisma/seed.ts
      src/
      tests/
    web/                       # 同学录展示站 React + Vite
    admin/                     # 管理后台 React + Vite
  packages/
    shared/                    # 共享 TS 类型 + Zod 校验 + 常量
  deploy/
    docker-compose.yml
    Dockerfile.api
    Dockerfile.web
    nginx.conf.example
    nginx.web.conf
  docs/
    api-contract.md            # 实现期契约细则
    design.md                  # 本设计文档
  uploads/                     # 本地开发上传目录（git 忽略）
```

技术选型：

- 前端：React 19 + Vite 7 + TypeScript + Tailwind CSS 4 + HeroUI 3（@heroui/react）+ lucide-react + React Router 7（库模式）+ 原生 fetch 封装。
- 后端：Node 24 + Express 5 + Prisma 6 + PostgreSQL 16 + Zod + bcryptjs + multer。
- 鉴权：JWT 放在 **HttpOnly Cookie**（`cb_token`，SameSite=Lax，生产 Secure，7 天），前后端同源（开发用 Vite 代理，生产用 Nginx 反代），避免把 token 暴露给 JS。
- 校验：Zod schema 放 `packages/shared`，前后端共用；错误统一格式。
- 测试：API 用 Vitest + Supertest；前端以 `tsc` + `vite build` + 关键路径冒烟为准。
- 包管理：pnpm workspaces；根目录统一安装依赖，使用 `pnpm-lock.yaml` 锁定版本。
- 开发数据库：`embedded-postgres`（npm 包，免安装、免管理员权限），数据目录 `.dev/pgdata`，端口 5433；生产用 Docker 里的 PostgreSQL。

部署形态：

- Docker Compose 只跑 `postgres` + `api`，API 绑定 `127.0.0.1:3000`。
- 宿主机 Nginx：`/` 指向 `apps/web/dist`，`/admin/` 指向 `apps/admin/dist`，`/api` 与 `/uploads` 反代到 `127.0.0.1:3000`。
- 上传文件放 Docker volume（`uploads`），单机部署，不做 CDN。

## 4. 数据模型（Prisma / PostgreSQL）

```prisma
enum Role          { MEMBER ADMIN }
enum UserStatus    { ACTIVE DISABLED }
enum MessageStatus { VISIBLE HIDDEN }

model User {
  id           String      @id @default(cuid())
  username     String      @unique
  passwordHash String
  role         Role        @default(MEMBER)
  status       UserStatus  @default(ACTIVE)
  tokenVersion Int         @default(0)
  inviteCodeId String?
  inviteCode   InviteCode? @relation(fields: [inviteCodeId], references: [id])
  profile      Profile?
  messages     Message[]   @relation("author")
  received     Message[]   @relation("recipient")
  albums       Album[]
  timeline     TimelineEvent[]
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}

model InviteCode {
  id          String   @id @default(cuid())
  code        String   @unique
  note        String?
  maxUses     Int      @default(1)
  usedCount   Int      @default(0)
  expiresAt   DateTime?
  disabled    Boolean  @default(false)
  createdById String?
  users       User[]
  createdAt   DateTime @default(now())
}

model Profile {
  id        String    @id @default(cuid())
  userId    String    @unique
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  realName  String
  nickname  String?
  avatarUrl String?
  motto     String?   // 一句话寄语
  bio       String?   @db.Text
  location  String?
  birthday  String?   // "MM-DD"，不存年份
  wechat    String?
  qq        String?
  email     String?
  phone     String?
  updatedAt DateTime  @updatedAt
}

model Message {
  id        String        @id @default(cuid())
  authorId  String
  author    User          @relation("author", fields: [authorId], references: [id], onDelete: Cascade)
  toUserId  String?
  toUser    User?         @relation("recipient", fields: [toUserId], references: [id], onDelete: SetNull)
  content   String        @db.Text
  status    MessageStatus @default(VISIBLE)
  createdAt DateTime      @default(now())
  @@index([status, createdAt])
  @@index([toUserId, status, createdAt])
}

model Album {
  id          String   @id @default(cuid())
  title       String
  description String?
  coverUrl    String?
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
  photos      Photo[]
  createdAt   DateTime @default(now())
}

model Photo {
  id        String   @id @default(cuid())
  albumId   String
  album     Album    @relation(fields: [albumId], references: [id], onDelete: Cascade)
  url       String
  caption   String?
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  @@index([albumId, sortOrder])
}

model TimelineEvent {
  id          String   @id @default(cuid())
  date        DateTime
  title       String
  description String?  @db.Text
  imageUrl    String?
  sortOrder   Int      @default(0)
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  @@index([date])
}

model SiteSetting {
  id             Int      @id @default(1)
  className      String   @default("我们的班级")
  schoolName     String?
  graduationYear Int?
  slogan         String?
  heroImageUrl   String?
  updatedAt      DateTime @updatedAt
}
```

约定：

- 所有 id 用 cuid 字符串；时间存 UTC，前端按本地时区展示。
- 删除用户采用「禁用」而非物理删除；留言作者禁用后内容仍保留，前端显示「已注销同学」。
- 相册删除级联删除照片记录，同时尽力删除磁盘文件；失败不阻塞。

## 5. API 契约（v1）

统一前缀 `/api`。请求/响应均为 JSON（上传为 multipart）。鉴权靠 Cookie，前端请求默认带凭据。

分页：`?page=1&pageSize=12`，返回 `{ items, total, page, pageSize }`；`pageSize` 最大 50。

错误：HTTP 4xx/5xx + `{ "error": { "code": "INVALID_INVITE", "message": "邀请码无效或已用完" } }`。

### 5.1 认证

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/register` | body `{inviteCode, username, password, realName}`；成功 201 + Set-Cookie |
| POST | `/api/auth/login` | body `{username, password}`；成功 200 + Set-Cookie |
| POST | `/api/auth/logout` | 清除 Cookie，204 |
| GET | `/api/auth/me` | 当前用户 + profile；未登录 401 |
| PATCH | `/api/auth/password` | `{currentPassword, newPassword}` |
| POST | `/api/auth/invite/validate` | `{code}` → `{valid: boolean}`（限流） |

用户名 3–20 位字母/数字/下划线；密码至少 8 位。登录与注册按 IP 限流（如 10 次/10 分钟）。

### 5.2 档案

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/profiles` | 登录可见；只返回 ACTIVE 成员；`q` 模糊匹配姓名/昵称；返回卡片字段 |
| GET | `/api/profiles/:id` | 登录可见；完整档案（含联系方式）；禁用成员返回 404 |
| PATCH | `/api/profiles/me` | 更新自己的档案，字段见 Profile 模型 |
| POST | `/api/uploads/avatar` | multipart `file`；返回 `{url}`；≤2MB |
| POST | `/api/uploads/images` | 管理员；multipart `file`；返回 `{url}`；≤5MB |

图片仅允许 jpg/png/webp，随机文件名，存 `UPLOAD_DIR`，通过 `/uploads/<name>` 访问。

### 5.3 留言

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/messages` | 可见留言，倒序；不带 `toUserId` 时只返回班级墙（`toUserId = null`），带则返回该同学留言板 |
| POST | `/api/messages` | `{content, toUserId?}`；content 1–500 字 |
| DELETE | `/api/messages/:id` | 作者本人或管理员 |
| GET | `/api/admin/messages` | 管理员；`status`、分页 |
| PATCH | `/api/admin/messages/:id` | `{status: "VISIBLE"|"HIDDEN"}` |

留言返回含作者 `{id, realName, avatarUrl}`；被禁用作者显示占位信息。

### 5.4 相册

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/albums` | 列表：id/title/description/coverUrl/photoCount/createdAt |
| GET | `/api/albums/:id` | 含 photos（按 sortOrder） |
| POST | `/api/admin/albums` | `{title, description?}` |
| PATCH | `/api/admin/albums/:id` | `{title?, description?, coverUrl?}` |
| DELETE | `/api/admin/albums/:id` | 级联照片 |
| POST | `/api/admin/albums/:id/photos` | `{urls: string[], caption?}` |
| DELETE | `/api/admin/photos/:id` | 删除照片 |

### 5.5 时间线

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/timeline` | 按 date 倒序 |
| POST | `/api/admin/timeline` | `{date, title, description?, imageUrl?, sortOrder?}` |
| PATCH | `/api/admin/timeline/:id` | 同上可选字段 |
| DELETE | `/api/admin/timeline/:id` | |

### 5.6 站点设置与统计

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/settings/public` | `{className, schoolName, graduationYear, slogan, heroImageUrl}`，免登录 |
| PATCH | `/api/admin/settings` | 管理员更新 |
| GET | `/api/admin/stats` | `{memberCount, messageCount, hiddenMessageCount, photoCount, activeInviteCount, recentMessages}` |
| GET | `/api/admin/members` | 分页；`q` 模糊匹配 username/真实姓名/昵称；含 username/role/status/profile 摘要 |
| PATCH | `/api/admin/members/:id` | `{status?, role?}`；不能操作自己 |
| POST | `/api/admin/members/:id/reset-password` | `{newPassword}` |
| GET | `/api/admin/invite-codes` | 列表 |
| POST | `/api/admin/invite-codes` | `{note?, maxUses?, expiresAt?}` → 含 code |
| DELETE | `/api/admin/invite-codes/:id` | 停用（disabled=true） |

首个管理员由 seed 脚本用 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 创建；管理员不能把自己降级或禁用。

## 6. 页面与交互

### 6.1 展示站 `apps/web`

| 路由 | 内容 |
| --- | --- |
| `/login` | 登录；无账号引导去注册 |
| `/register` | 邀请码 + 用户名 + 密码 + 真实姓名 |
| `/` | Hero（班级名、毕业年份、口号、封面）、最新留言、时间线预览、四个功能入口 |
| `/classmates` | 同学卡片网格（头像/姓名/寄语），姓名搜索，分页 |
| `/classmates/:id` | 档案详情 + 该同学的留言板 + 写留言 |
| `/wall` | 班级留言墙，倒序，发留言 |
| `/albums` | 相册封面网格 |
| `/albums/:id` | 相册详情，图片网格 + 灯箱 |
| `/timeline` | 竖向时间线，按年份分组 |
| `/me` | 我的档案编辑（含头像上传）、修改密码 |

访客访问 `/` 看到公开落地页（hero + 登录/注册入口，仅使用 `/api/settings/public`），其余页面未登录一律跳登录并回跳原地址。

### 6.2 管理后台 `apps/admin`（部署在 `/admin/`，路由 basename 同名）

| 路由 | 内容 |
| --- | --- |
| `/login` | 管理员登录（非管理员登录提示无权限） |
| `/` | 仪表盘：统计卡 + 最近留言 |
| `/members` | 成员列表：搜索、禁用/启用、重置密码 |
| `/invites` | 邀请码：生成（次数/有效期/备注）、复制、停用 |
| `/messages` | 留言审核：全部/可见/已隐藏，隐藏/恢复 |
| `/albums` | 相册管理：新建、编辑、上传照片、删除 |
| `/timeline` | 时间线管理：增删改 |
| `/settings` | 站点设置 |

### 6.3 视觉风格（2026-11-12 改版：HeroUI + 明亮社交 + 毛玻璃）

改版原则：**功能、路由、数据与后端契约不变，只重做 UI 层**；所有交互与展示控件必须使用 HeroUI v3 原生组件，不自研、不复刻组件；图标统一用 lucide-react。

- 组件库：HeroUI v3（React Aria 底座），Tailwind CSS 4，light 主题；主题变量在 `apps/*/src/index.css` 覆盖。
- 整体气质：明亮社交 App + 毛玻璃（**无渐变**）。暖白底、玻璃悬浮导航/侧边栏/弹窗/卡片、大圆角、充足留白、无衬线字体。
- 展示站主色珊瑚橙，管理后台主色墨蓝；状态色沿用 HeroUI 语义色。
- 展示站：桌面顶部玻璃导航，移动端底部 Tab 栏；首页为社交 feed（欢迎卡 + 快捷统计 Chip + 最新留言 + 时间线预览）；同学录卡片网格；详情页档案头卡 + 信息网格 + 留言板；相册卡片网格 + Modal 灯箱；时间线按年份分组卡片。
- 管理后台：桌面玻璃侧边栏 + 面包屑顶栏，移动端 Drawer；列表用 HeroUI Table，表单用 Modal/TextField/Select/NumberField/DatePicker，删除确认用 AlertDialog，反馈用 Toast。
- 禁止项：`bg-gradient-*`、`linear-gradient`、`radial-gradient`；自研 Button/Modal/Table/Card/Pagination/Toast/Input 等组件；`div + onClick` 模拟按钮；手写 SVG 图标组件。
- 布局容器允许用 div/section + Tailwind 做栅格、间距、定位与玻璃表面（`bg-surface/70 backdrop-blur-xl border border-white/60`）。
- 响应式：移动端 375px 无横向滚动，桌面内容最大宽度约 1120px（后台更宽）。

## 7. 安全与隐私

- 除 `/api/auth/*` 与 `/api/settings/public` 外，所有读接口要求登录；`/uploads/**` 静态文件同样要求登录（Cookie 鉴权，随机文件名不作为隐私保障）。唯一例外：当前站点设置里的 `heroImageUrl` 指向的那张图片允许匿名读取，用于公开落地页封面；其余上传文件仍然受保护。
- JWT 载荷含 `tokenVersion`；鉴权中间件每次查库校验用户状态与版本。禁用成员、修改密码、管理员重置密码都会递增 `tokenVersion`，旧 token 立即失效。
- 联系方式（微信/QQ/电话/邮箱）只返回给已登录同学，不向访客暴露。
- 密码 bcrypt（cost 10）哈希；JWT 密钥来自环境变量；Cookie HttpOnly + SameSite=Lax，生产加 Secure。
- 变更类请求要求 JSON Content-Type（上传除外），配合 SameSite 降低 CSRF 风险。
- 上传校验 MIME 与扩展名，限制大小，文件名随机化，禁止路径穿越。
- 管理接口统一 `requireAdmin` 中间件；管理员不能禁用/降级自己。
- 生产 CORS 不开放跨域（同源反代）；开发只允许 `localhost:5173`、`localhost:5174`。
- 日志不打印密码、Cookie、邀请码明文以外的敏感信息。

## 8. 验收标准

- 根目录 `pnpm typecheck`、`pnpm build` 全绿。
- API 测试覆盖：邀请码注册、登录、鉴权拦截、档案更新、留言发布/隐藏、相册与时间线 CRUD。
- 端到端冒烟：管理员生成邀请码 → 新用户注册 → 完善档案 → 发留言 → 管理员隐藏留言 → 前台不再显示 → 管理员上传相册/时间线 → 前台可见。
- 375px 与 1440px 下主要页面无横向滚动、布局正常。
- 仓库无密钥；`.env.example` 完整；部署文档能照做上线。

## 9. 部署方案

- `deploy/docker-compose.yml`：`postgres:16-alpine`（持久化 volume、健康检查）+ `api` + `web` 三个服务；API 与数据库只在 Compose 内部网络可达，`web` 仅发布 `127.0.0.1:8080`。
- 镜像由 GitHub Actions 构建并推送到 GHCR：`classbook-api`、`classbook-web`；服务器只拉取镜像，不在生产机构建。
- `web` 容器内的 Nginx 同时托管 Web/Admin 静态资源，并把 `/api`、`/uploads` 反代到 `api:3000`。
- 宿主机 Nginx 负责域名、HTTPS 与反向代理到 `127.0.0.1:8080`，提供 `deploy/nginx.conf.example` 与 certbot 说明。
- 环境变量：`PUBLIC_ORIGIN`、`POSTGRES_*`、`JWT_SECRET`、`ADMIN_USERNAME`、`ADMIN_PASSWORD`、`COOKIE_SECURE`、`IMAGE_PREFIX`、`IMAGE_TAG`、`WEB_PORT`。
- 数据备份：`pg_dump` 定时任务 + uploads volume 打包，文档给出示例命令。

## 11. 风险与取舍

- 开发库用 `embedded-postgres`（beta 包）仅为本地便利；生产是标准 PostgreSQL 16。若该包在 Windows 上不稳定，回退到免安装版 PostgreSQL 二进制。
- 上传存本地磁盘，只适合单机；未来换对象存储需要改上传适配层。
- Cookie 鉴权要求前后端同源，因此开发必须走 Vite 代理、生产必须走 Nginx 反代，不能直接跨端口调 API。
- 留言默认直接可见，靠管理员事后隐藏；不做先审后发，避免同学间互动被阻塞。

## 12. 留给实现者的空间

- 组件拆分、具体 CSS 细节、空状态/加载态/错误提示文案。
- 分页大小、动画时长、图标选择。
- API 测试的具体用例组织。
