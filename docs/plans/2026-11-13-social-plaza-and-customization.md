# 拾光同学录：全站文案 + 密码可见 + 开放相册 + 广场 + 通知 实施计划

> **执行方式：** 本计划由本会话按批次执行（仓库位于服务器 `/opt/classbook`，无法使用独立 worktree；用本地分支 + 备份替代）。每个任务先写测试、再实现、再验证。

**Goal:** 把同学录从"只读纪念册"升级为可定制、可共创、有实时通知的班级社区。

**Architecture:** 复用现有 `Message` 作为统一帖子模型（公开/私密 + 图片 + 点赞 + 评论），新增 `Notification` 表；`/api/plaza` 提供游标信息流，SSE 推送通知；全站文案存 `SiteSetting.copy` JSONB，前端统一读取。

**Tech Stack:** React 19 + Vite 7 + HeroUI 3、Express 5 + Prisma 6 + PostgreSQL 16、Vitest 5 + Supertest、SSE、Nginx。

---

## 约定

- 服务器仓库：`/opt/classbook`；生产域名 `https://class.spacedo.org`。
- 开发分支：`feat/social-plaza`（在服务器本地创建；不 push）。
- 测试数据库：`postgresql://postgres:<vitest.config.ts 中的密码>@localhost:5433/classbook_test`，独立容器，绝不复用生产库。
- 每个任务结束：`pnpm --filter @classbook/api test` 或对应构建通过后 `git add -A && git commit -m "..."`。
- 禁止 `docker compose down -v`；迁移前必须备份数据库与上传卷。
- 前端验收统一用真实浏览器（桌面 1280px + 手机 390px）。

---

## Phase 0：安全与基线

### Task 0.1：备份与基线测试

**Files:** 无代码改动。

**Step 1:** 备份数据库与上传：

```bash
cd /opt/classbook
mkdir -p /opt/backups/classbook
docker exec classbook-postgres-1 pg_dump -U classbook classbook | gzip > /opt/backups/classbook/pre-social-$(date +%F-%H%M).sql.gz
docker run --rm -v classbook_uploads:/data -v /opt/backups/classbook:/backup alpine tar czf /backup/pre-social-uploads-$(date +%F-%H%M).tar.gz -C /data .
```

**Step 2:** 给当前镜像打回滚标签：

```bash
docker tag ghcr.io/self-command/classbook-api:latest ghcr.io/self-command/classbook-api:pre-social
docker tag ghcr.io/self-command/classbook-web:latest ghcr.io/self-command/classbook-web:pre-social
```

**Step 3:** 创建分支：

```bash
cd /opt/classbook && git checkout -b feat/social-plaza
```

**Step 4:** 启动测试库并跑基线：

```bash
docker rm -f cb-test-pg 2>/dev/null || true
docker run -d --name cb-test-pg -e POSTGRES_PASSWORD=<见 vitest.config.ts> -p 127.0.0.1:5433:5432 postgres:16-alpine
sleep 5
docker exec cb-test-pg createdb -U postgres classbook_test
docker run --rm --network host -v /opt/classbook:/app -w /app node:24-bookworm-slim \
  sh -c "corepack enable && pnpm install --frozen-lockfile && pnpm --filter @classbook/api exec prisma migrate deploy && pnpm --filter @classbook/api test"
```

Expected: 现有测试全部通过。若失败，先修复环境再继续。

---

## Phase 1：全站文案 + 密码小眼睛

### Task 1.1：共享包定义文案键与校验

**Files:**
- Modify: `packages/shared/src/index.ts`
- Test: `apps/api/tests/settings-copy.test.ts`（新建）

**Step 1:** 在 shared 新增：

```ts
export const SITE_COPY_FIELDS = [
  { key: 'siteName', group: '品牌', label: '站点名称', max: 40, fallback: '拾光同学录' },
  { key: 'siteEmoji', group: '品牌', label: '站点符号', max: 4, fallback: '拾' },
  { key: 'logoText', group: '品牌', label: 'Logo 文字', max: 4, fallback: '拾' },
  { key: 'tabTitle', group: '品牌', label: '浏览器标题', max: 60, fallback: '拾光同学录' },
  { key: 'footerText', group: '品牌', label: '页脚标语', max: 80, fallback: '拾光同学录 · 愿记忆有处安放' },
  { key: 'footerCopyright', group: '品牌', label: '版权信息', max: 80, fallback: '' },
  { key: 'navHome', group: '导航', label: '首页', max: 12, fallback: '首页' },
  { key: 'navClassmates', group: '导航', label: '同学录', max: 12, fallback: '同学录' },
  { key: 'navPlaza', group: '导航', label: '广场', max: 12, fallback: '广场' },
  { key: 'navAlbums', group: '导航', label: '相册', max: 12, fallback: '相册' },
  { key: 'navTimeline', group: '导航', label: '时间线', max: 12, fallback: '时间线' },
  { key: 'navMe', group: '导航', label: '我的档案', max: 12, fallback: '我的档案' },
  // 首页、登录注册、广场、相册、同学录、时间线、个人中心、通知、通用、404
  // 每个键都按同样结构补齐；group 用于后台分组，fallback 是默认文案，max 是最大长度。
  // 完整键表见本任务末尾清单。
] as const;

export type SiteCopyKey = (typeof SITE_COPY_FIELDS)[number]['key'];
export type SiteCopy = Record<SiteCopyKey, string>;

export const DEFAULT_SITE_COPY = Object.fromEntries(
  SITE_COPY_FIELDS.map((field) => [field.key, field.fallback]),
) as SiteCopy;

export const siteCopySchema = z
  .object(
    Object.fromEntries(
      SITE_COPY_FIELDS.map((field) => [field.key, z.string().trim().max(field.max)]),
    ) as Record<SiteCopyKey, z.ZodString>,
  )
  .partial();
```

**Step 2:** 将 `copy: SiteCopy` 加入 `SiteSettingsDto`，`copy: siteCopySchema.optional()` 加入 `settingsUpdateSchema`。

**Step 3:** 文案键完整清单（必须全部实现）：

- 品牌：`siteName`、`siteEmoji`、`logoText`、`tabTitle`、`footerText`、`footerCopyright`
- 导航：`navHome`、`navClassmates`、`navPlaza`、`navAlbums`、`navTimeline`、`navMe`
- 首页：`homeEyebrow`、`homeFeature1Title`、`homeFeature1Desc`、`homeFeature2Title`、`homeFeature2Desc`、`homeFeature3Title`、`homeFeature3Desc`、`homeCtaLogin`、`homeCtaRegister`、`homeMemberGreeting`、`homeMemberSubtitle`
- 登录注册：`loginTitle`、`loginSubtitle`、`loginButton`、`registerTitle`、`registerSubtitle`、`registerButton`、`inviteLabel`、`invitePlaceholder`、`usernameLabel`、`passwordLabel`、`realNameLabel`
- 广场：`plazaTitle`、`plazaEyebrow`、`plazaDescription`、`plazaComposerPlaceholder`、`plazaPostButton`、`plazaEmptyTitle`、`plazaEmptyDescription`、`plazaCommentPlaceholder`、`plazaCommentButton`、`plazaLikeLabel`、`plazaCommentLabel`、`plazaPublicLabel`、`plazaPrivateLabel`、`plazaDeleteConfirm`
- 相册：`albumsTitle`、`albumsDescription`、`albumsCreateButton`、`albumsEmptyTitle`、`albumsEmptyDescription`、`albumUploadHint`、`albumDeleteConfirm`
- 同学录：`classmatesTitle`、`classmatesDescription`、`classmatesEmptyTitle`、`classmatesEmptyDescription`
- 时间线：`timelineTitle`、`timelineDescription`、`timelineEmptyTitle`、`timelineEmptyDescription`
- 个人中心：`meTitle`、`meDescription`、`meSaveButton`、`mePasswordTitle`、`mePasswordButton`
- 个人页留言：`profileMessageTitle`、`profileMessagePlaceholder`、`profileMessageHint`
- 通知：`notificationsTitle`、`notificationsEmpty`、`notificationsMarkAllRead`、`notificationsViewAll`
- 通用：`commonLoading`、`commonRetry`、`commonCancel`、`commonSave`、`commonDelete`、`commonConfirm`、`commonBack`、`commonMore`
- 404：`notFoundTitle`、`notFoundDescription`、`notFoundButton`

**Step 4:** 写测试：默认值齐全、每个键可校验、超长报错。

**Step 5:** 运行 `pnpm --filter @classbook/api test -- settings-copy`，先失败再通过（RED→GREEN）。

**Step 6:** Commit `feat: add site copy definitions`。

### Task 1.2：Prisma 字段 + 设置 API

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20261113160000_social_core/migration.sql`
- Modify: `apps/api/src/routes/settings.ts`、`apps/api/src/routes/admin.ts`、`apps/api/src/lib/serialize.ts`
- Test: `apps/api/tests/settings-copy.test.ts`

**Step 1:** schema 的 `SiteSetting` 增加：

```prisma
copy Json @default("{}")
```

**Step 2:** 迁移 SQL 先加：

```sql
ALTER TABLE "SiteSetting" ADD COLUMN "copy" JSONB NOT NULL DEFAULT '{}';
```

**Step 3:** 公共设置序列化：`copy = { ...DEFAULT_SITE_COPY, ...(setting.copy as Partial<SiteCopy> ?? {}) }`。

**Step 4:** 管理端 PATCH：校验 `copy` 后与已有原始 JSON 合并，未知键由 schema 丢弃，保存后返回合并结果。

**Step 5:** 测试：
- 默认返回全量默认文案；
- PATCH 只改一个键，其他保持默认；
- 超过 max 返回 400；
- 未知键不落库。

**Step 6:** 构建 + 测试 + commit。

### Task 1.3：后台「全站文案」页面

**Files:**
- Create: `apps/admin/src/pages/CopyPage.tsx`
- Modify: `apps/admin/src/App.tsx`、`apps/admin/src/components/layout/AdminLayout.tsx`、`apps/admin/src/lib/api.ts`

**Step 1:** API 增加 `admin.copy` 读写（复用 `/admin/settings`）。

**Step 2:** 页面结构：
- 顶部搜索框（按键名/中文标签过滤）
- 按 `group` 分组的 `<details>` 折叠面板
- 每行：中文标签 + 输入框（长文案用 textarea）+ "恢复默认"按钮
- 底部：保存、全部恢复默认
- 保存只提交与默认/已保存值不同的键

**Step 3:** 管理导航新增「文案管理」，路由 `/copy`。

**Step 4:** `pnpm --filter @classbook/admin build`，浏览器验证保存后 `/api/settings/public` 立即变化。

**Step 5:** Commit。

### Task 1.4：前端文案注入与品牌替换

**Files:**
- Create: `apps/web/src/lib/siteCopy.tsx`
- Modify: `apps/web/src/App.tsx`、`apps/web/src/components/Layout.tsx`、`apps/web/src/pages/HomePage.tsx`、`LoginPage.tsx`、`RegisterPage.tsx`、`ClassmatesPage.tsx`、`AlbumsPage.tsx`、`TimelinePage.tsx`、`MePage.tsx`、`NotFoundPage.tsx`

**Step 1:** `SiteCopyProvider`：

```tsx
const CopyContext = createContext<{ copy: SiteCopy; settings: SiteSettingsDto | null }>({
  copy: DEFAULT_SITE_COPY,
  settings: null,
});
export function SiteCopyProvider({ children }: { children: ReactNode }) {
  const state = useAsyncData(() => settingsApi.getPublic(), []);
  const copy = state.data?.copy ?? DEFAULT_SITE_COPY;
  useEffect(() => { document.title = copy.tabTitle; }, [copy.tabTitle]);
  return <CopyContext.Provider value={{ copy, settings: state.data }}>{children}</CopyContext.Provider>;
}
export const useSiteCopy = () => useContext(CopyContext);
```

**Step 2:** `Layout` 改用 `useSiteCopy` 的 settings，导航标签、Logo、站名、页脚全部读 copy；`SettingsProvider` 放在 Router 外层。

**Step 3:** 逐页替换标题/副标题/空状态/按钮文案；HomePage 的三张功能卡读 `homeFeature*`。

**Step 4:** 浏览器验证：后台改 `siteName`、`tabTitle`、`navPlaza`，刷新前台立即生效；清空某项后回退默认。

**Step 5:** `pnpm --filter @classbook/web build` + commit。

### Task 1.5：密码小眼睛

**Files:**
- Create: `apps/web/src/components/ui/PasswordInput.tsx`
- Create: `apps/admin/src/components/ui/PasswordInput.tsx`（同样实现）
- Modify: `apps/web/src/pages/LoginPage.tsx`、`RegisterPage.tsx`、`MePage.tsx`
- Modify: `apps/admin/src/pages/LoginPage.tsx`、`apps/admin/src/components/members/ResetPasswordModal.tsx`

**Step 1:** 组件 API：

```tsx
interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  autoComplete?: string;
  isInvalid?: boolean;
  isDisabled?: boolean;
  error?: string;
}
```

内部用 HeroUI `TextField` + `Input`（保持现有样式），右侧 `Button isIconOnly` 切换 `type="password" | "text"`，`aria-label={visible ? '隐藏密码' : '显示密码'}`，图标用 `lucide-react` 的 `Eye` / `EyeOff`。

**Step 2:** 替换全部 `type="password"` 字段，保持原有校验/提示。

**Step 3:** 浏览器验证：登录、注册、修改密码、后台登录、重置密码五处都能切换且不丢焦点。

**Step 4:** 两个前端 build + commit。

---

## Phase 2：相册完全开放

### Task 2.1：成员级相册 API

**Files:**
- Modify: `apps/api/src/routes/albums.ts`、`apps/api/src/routes/admin.ts`
- Create: `apps/api/src/lib/album-service.ts`
- Test: `apps/api/tests/albums-open.test.ts`

**Step 1:** 抽出创建/更新/删除/加照片/删照片逻辑到 service，admin 路由与成员路由共用。

**Step 2:** `albumsRouter`（已 `requireAuth`）新增：

```text
POST   /api/albums
PATCH  /api/albums/:id
DELETE /api/albums/:id
POST   /api/albums/:id/photos
DELETE /api/albums/photos/:id
```

权限：任何 `ACTIVE` 登录用户可操作任何相册（完全开放）；删除文件时同时删除 `url` 与 `videoUrl`。

**Step 3:** 测试：
- 普通成员可建/改/删相册；
- 普通成员可上传/删除照片；
- 删除相册清理图片和视频文件；
- 未登录 401。

**Step 4:** 测试通过 + commit。

### Task 2.2：前台相册管理 UI

**Files:**
- Create: `apps/web/src/components/content/MultiImageUploader.tsx`（从 admin 移植，改用 web 的 uploadsApi/toast）
- Modify: `apps/web/src/lib/api.ts`（新增 `uploadsApi.image`、`livePhoto`、`albumsApi.create/update/remove/addPhotos/removePhoto`）
- Modify: `apps/web/src/pages/AlbumsPage.tsx`、`AlbumDetailPage.tsx`

**Step 1:** 相册列表右上角「创建相册」弹窗（标题、描述），创建后跳详情。

**Step 2:** 详情页顶部「编辑相册 / 删除相册」；空相册显示上传区；已有照片显示「继续添加」。复用压缩 + 实况照片配对逻辑（与后台一致）。

**Step 3:** 每张照片悬停显示「设为封面 / 删除」；删除二次确认。

**Step 4:** 浏览器双账号验证：A 建相册、B 能上传和删除；390px 无横向滚动。

**Step 5:** build + commit。

---

## Phase 3：广场与通知后端

### Task 3.1：数据模型与迁移

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/prisma/migrations/20261113160000_social_core/migration.sql`
- Modify: `apps/api/tests/helpers.ts`

**Step 1:** Prisma 增加：

```prisma
enum MessageVisibility { PUBLIC PRIVATE }
enum NotificationType { PROFILE_MESSAGE POST_COMMENT COMMENT_REPLY POST_LIKE MENTION }

model Message {
  images      String[]  @default([])
  visibility  MessageVisibility @default(PUBLIC)
  commentCount Int @default(0)
  likeCount    Int @default(0)
  editedAt     DateTime?
  comments     MessageComment[]
  likes        MessageLike[]
  notifications Notification[]
  @@index([status, visibility, createdAt])
}

model MessageComment {
  id        String   @id @default(cuid())
  messageId String
  message   Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation("CommentAuthor", fields: [authorId], references: [id], onDelete: Cascade)
  parentId  String?
  parent    MessageComment? @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies   MessageComment[] @relation("CommentReplies")
  content   String   @db.Text
  createdAt DateTime @default(now())
  @@index([messageId, createdAt])
  @@index([parentId, createdAt])
}

model MessageLike {
  messageId String
  userId    String
  message   Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  @@id([messageId, userId])
  @@index([userId, createdAt])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation("NotificationRecipient", fields: [userId], references: [id], onDelete: Cascade)
  actorId   String
  actor     User     @relation("NotificationActor", fields: [actorId], references: [id], onDelete: Cascade)
  type      NotificationType
  messageId String?
  message   Message? @relation(fields: [messageId], references: [id], onDelete: Cascade)
  commentId String?
  comment   MessageComment? @relation(fields: [commentId], references: [id], onDelete: Cascade)
  preview   String?  @db.Text
  readAt    DateTime?
  createdAt DateTime @default(now())
  @@index([userId, readAt, createdAt])
  @@index([userId, createdAt])
}
```

补 User 反向关系：`comments`、`likes`、`notificationsReceived`、`notificationsSent`。

**Step 2:** 迁移 SQL：

```sql
CREATE TYPE "MessageVisibility" AS ENUM ('PUBLIC','PRIVATE');
CREATE TYPE "NotificationType" AS ENUM ('PROFILE_MESSAGE','POST_COMMENT','COMMENT_REPLY','POST_LIKE','MENTION');
ALTER TABLE "Message" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Message" ADD COLUMN "visibility" "MessageVisibility" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "Message" ADD COLUMN "commentCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Message" ADD COLUMN "likeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Message" ADD COLUMN "editedAt" TIMESTAMP(3);
CREATE INDEX "Message_status_visibility_createdAt_idx" ON "Message"("status","visibility","createdAt");
-- MessageComment / MessageLike / Notification 建表、主键、外键、索引
```

**Step 3:** `resetDb()` 顺序：notification → messageLike → messageComment → message → photo → album → timeline → profile → user → inviteCode → siteSetting。

**Step 4:** 迁移测试库 + `pnpm prisma generate` + 测试通过 + commit。

### Task 3.2：DTO 与校验

**Files:** `packages/shared/src/index.ts`、`apps/api/tests/plaza.test.ts`（新建）

**Step 1:** 定义：

```ts
export const MESSAGE_MAX_LENGTH = 2000;
export const MESSAGE_IMAGES_MAX = 9;
export const messageCreateSchema = z.object({
  content: z.string().trim().min(1, '内容不能为空').max(MESSAGE_MAX_LENGTH),
  toUserId: z.string().trim().min(1).nullable().optional(),
  visibility: z.enum(['PUBLIC','PRIVATE']).optional(),
  images: z.array(uploadUrlSchema).max(MESSAGE_IMAGES_MAX).optional(),
});
export const commentCreateSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  parentId: z.string().trim().min(1).nullable().optional(),
});
```

`uploadUrlSchema` 只允许 `/uploads/` 开头且匹配 `^/uploads/[A-Za-z0-9-]+\.(jpg|jpeg|png|webp)$`。

**Step 2:** `MessageDto` 增加 `images`、`visibility`、`commentCount`、`likeCount`、`likedByMe`；新增 `MessageCommentDto`、`NotificationDto`、`PlazaFeedDto`、`NotificationListDto`。

**Step 3:** 测试 schema：私密必须有 `toUserId`、图片超过 9 张报错、非法 URL 报错、2000 字边界。

**Step 4:** Commit。

### Task 3.3：留言/帖子创建与可见性

**Files:**
- Modify: `apps/api/src/routes/messages.ts`、`apps/api/src/lib/serialize.ts`
- Create: `apps/api/src/lib/notifications.ts`
- Test: `apps/api/tests/plaza.test.ts`

**Step 1:** 创建逻辑：
- `visibility` 默认 PUBLIC；PRIVATE 且无 `toUserId` → 400。
- 图片按给定顺序保存。
- 创建成功后调用 `notifyProfileMessage`、`notifyMentions`（`@username` 正则，最多 10 人，跳过作者和非 ACTIVE）。

**Step 2:** 列表可见性：
- 墙（无 toUserId）：`status=VISIBLE AND visibility=PUBLIC AND toUserId=null`。
- 个人页：`toUserId=target`，若 viewer 是作者或接收者，返回 PUBLIC+自己的 PRIVATE；否则仅 PUBLIC。
- 管理员后台列表：只返回 PUBLIC；私密只统计数量。

**Step 3:** 删除：
- PUBLIC：作者或管理员；
- PRIVATE：作者或接收者，管理员不可删；
- 删除后清理 `images` 文件。

**Step 4:** 测试：
- 公开个人留言出现在广场流；
- 私密不出现在任何他人列表、管理员列表；
- 第三方看不到私密内容；接收者能看到；
- 删除权限矩阵；
- @ 通知只发给被提及者。

**Step 5:** Commit。

### Task 3.4：广场信息流与互动 API

**Files:**
- Create: `apps/api/src/routes/plaza.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/tests/plaza.test.ts`

**Step 1:** 路由：

```text
GET    /api/plaza?cursor=&limit=20
GET    /api/plaza/:id
POST   /api/plaza
POST   /api/plaza/:id/comments
DELETE /api/plaza/comments/:id
POST   /api/plaza/:id/like
DELETE /api/plaza/:id
```

**Step 2:** 游标：`${createdAt.toISOString()}|${id}`；查询 `createdAt < cursorDate OR (createdAt = cursorDate AND id < cursorId)`；`orderBy createdAt desc, id desc`；返回 `nextCursor`。

**Step 3:** 详情返回帖子 + 全部评论（按时间升序，最多 200 条），评论带 `parentId` 供前端分组。

**Step 4:** 评论：
- `parentId` 必须属于同一帖子且必须是根评论（两级限制）；
- 事务内 `commentCount + 1`、创建评论、通知帖子作者或父评论作者。

**Step 5:** 点赞：`upsert/delete` + `likeCount` 增减；仅点赞时通知，且同一 actor+message 只保留一条通知。

**Step 6:** 删除帖子：作者或管理员；级联评论/点赞/通知；删除图片文件。

**Step 7:** 测试：分页不重复/不遗漏、评论计数、三级回复 400、点赞 toggle、删除级联、权限。

**Step 8:** Commit。

### Task 3.5：通知 API 与 SSE

**Files:**
- Create: `apps/api/src/routes/notifications.ts`、`apps/api/src/lib/notification-bus.ts`
- Modify: `apps/api/src/app.ts`、`deploy/nginx.web.conf`
- Test: `apps/api/tests/notifications.test.ts`

**Step 1:** 路由：

```text
GET  /api/notifications?cursor=&limit=20   -> { items, unreadCount, nextCursor }
GET  /api/notifications/unread-count
POST /api/notifications/read              -> { ids?: string[], all?: boolean }
GET  /api/notifications/stream             -> text/event-stream
```

**Step 2:** SSE：`Content-Type: text/event-stream`、`Cache-Control: no-cache`、`Connection: keep-alive`、`X-Accel-Buffering: no`；每 25 秒发送 `: ping\n\n`；连接关闭时移除监听。事件名 `notification`，data 为 `{ notification, unreadCount }`。

**Step 3:** `notifications.ts` 中 `notify()` 写库后 `bus.emit(userId, payload)`；跳过 `userId === actorId`。

**Step 4:** Nginx（web 容器与宿主机）对 `/api/notifications/stream` 加：

```nginx
proxy_buffering off;
proxy_cache off;
proxy_read_timeout 3600s;
proxy_set_header Connection "";
```

**Step 5:** 测试：创建通知、自己触发不通知、点赞去重、标记已读、未读数；SSE 用 `supertest` 读响应头后中止，避免挂起。

**Step 6:** Commit。

### Task 3.6：限流与安全加固

**Files:** `apps/api/src/routes/plaza.ts`、`apps/api/src/routes/messages.ts`

- 发帖/评论：每用户 10 次/分钟；点赞：60 次/分钟；上传沿用现有。
- 正文长度、图片 URL、parentId 归属全部服务端校验。
- 确保所有私密查询都在 SQL where 层过滤，不依赖前端隐藏。

**Test:** 429 行为（可降低阈值测试）。

---

## Phase 4：广场前台

### Task 4.1：API 客户端与类型

**Files:** `apps/web/src/lib/api.ts`

新增 `plazaApi`（list/detail/create/comment/removeComment/like/remove）、`notificationsApi`、扩展 `uploadsApi.image`、`messagesApi` 类型。

### Task 4.2：信息流页面

**Files:**
- Create: `apps/web/src/pages/PlazaPage.tsx`
- Create: `apps/web/src/components/plaza/PostCard.tsx`、`PostImageGrid.tsx`、`PostComposer.tsx`
- Modify: `apps/web/src/App.tsx`、`apps/web/src/components/Layout.tsx`

**Step 1:** `/plaza` 路由；`/wall` 改为 `<Navigate to="/plaza" replace />`；导航使用 `copy.navPlaza`。

**Step 2:** 信息流：`useInfiniteFeed`（IntersectionObserver，游标加载）；卡片包含头像、姓名、时间、正文（超过 8 行折叠）、图片网格、点赞/评论数、作者/管理员删除菜单。

**Step 3:** 图片网格规则：1 张 16:9 大图；2 张两列；3–4 张 2×2；5–9 张三列方形；点击打开灯箱（复用 `PhotoLightbox` 的简化版）。

**Step 4:** 空状态、加载骨架、错误重试；移动端 390px 验证。

### Task 4.3：发帖器与 @

**Files:** `PostComposer.tsx`、`MentionPicker.tsx`、`apps/web/src/pages/Profile` 相关组件

- 文字 1–2000 字，最多 9 图；图片先在浏览器压缩再上传；支持粘贴图片。
- `@` 触发成员选择弹层，插入 `@username`；正文渲染时把已知 `@username` 高亮（不能用 `dangerouslySetInnerHTML`）。
- 普通帖子与个人页留言共用；个人页多一个公开/私密切换（默认公开），私密只在双方页面显示。
- 发布成功把新帖插到列表顶部或跳转详情。

### Task 4.4：帖子详情、评论、点赞

**Files:**
- Create: `apps/web/src/pages/PostDetailPage.tsx`
- Create: `apps/web/src/components/plaza/CommentList.tsx`、`CommentComposer.tsx`

- 详情页展示完整正文、图片、点赞列表数量、评论（两级：根评论 + 回复）。
- 回复按钮预填 `parentId`；删除自己的评论；作者/管理员可删帖。
- 点赞乐观更新，失败回滚。
- 路由 `/plaza/:id`；从通知跳转时滚动到 `#comment-<id>`。

### Task 4.5：个人页私密留言

**Files:** `MessageComposer.tsx`、`MessageCard.tsx`、`MessageBoard.tsx`、`ClassmateDetailPage.tsx`

- 有 `toUserId` 时显示「公开 / 私密」分段控件，默认公开；私密提交 `visibility: 'PRIVATE'`。
- 卡片显示「私密」徽标；私密内容只有双方能看到（服务端已过滤）。
- 留言墙不再单独存在，个人页的公开留言同时出现在广场。
- 提示文案：公开会同步到广场，私密只有你们两人可见。

### Task 4.6：后台内容管理

**Files:** `apps/admin/src/pages/MessagesPage.tsx`、`DashboardPage.tsx`

- 列表只展示公开内容；私密只显示数量统计（不显示内容）。
- 标题改为「内容管理」，保留隐藏/恢复操作。
- 构建 + 浏览器验证。

---

## Phase 5：通知前台

### Task 5.1：通知状态与铃铛

**Files:**
- Create: `apps/web/src/lib/notifications.tsx`（Provider + hook）
- Create: `apps/web/src/components/notifications/NotificationBell.tsx`
- Modify: `apps/web/src/components/Layout.tsx`

- 登录后：GET 未读数 + 最新 10 条；`new EventSource('/api/notifications/stream')`；`onmessage` 增加未读、插入列表、toast；`onerror` 关闭并启动 60 秒轮询；`visibilitychange` 刷新。
- 铃铛在桌面 header 与移动 drawer 各一个；红点 + 数字（99+）。
- 弹层：最新 10 条、全部已读、查看全部（`/notifications`）。

### Task 5.2：通知中心页

**Files:** `apps/web/src/pages/NotificationsPage.tsx`、`apps/web/src/App.tsx`

- 游标分页列表，按类型显示文案：
  - 留言：「{actor} 在你的留言板留言」
  - 评论：「{actor} 评论了你的帖子」
  - 回复：「{actor} 回复了你」
  - 点赞：「{actor} 赞了你的帖子」
  - @：「{actor} 在帖子里提到了你」
- 点击标记已读并跳转：留言 → 对方个人页；其他 → `/plaza/:messageId#comment-:commentId`。
- 未读高亮、全部已读按钮、空状态。

### Task 5.3：布局与移动端

- 移动端 drawer 顶部显示铃铛 + 未读数。
- 390px 下信息流、详情、通知页无横向滚动；图片网格不溢出。

---

## Phase 6：Web Push（二期，可与 Phase 5 分开上线）

### Task 6.1：订阅与推送

**Files:**
- Create: `apps/web/public/sw.js`
- Modify: `apps/web/src/lib/notifications.tsx`、`apps/api/src/lib/notifications.ts`
- Prisma: `PushSubscription { id, userId, endpoint @unique, p256dh, auth, createdAt }`

- 使用 `web-push`，VAPID 公私钥通过环境变量 `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` 注入；不写进仓库。
- 通知中心提供「开启桌面通知」按钮：注册 SW → 请求权限 → `pushManager.subscribe` → POST `/api/notifications/subscribe`。
- `notify()` 写库后：SSE 推送 + 对该用户所有订阅发送 Web Push；410/404 自动删除订阅。
- iOS 需添加到主屏幕后才生效，UI 明确提示。
- 测试：订阅接口鉴权、重复 endpoint 幂等、失效订阅清理。

---

## Phase 7：验收与上线

### Task 7.1：全量验证

```bash
pnpm --filter @classbook/api test
pnpm --filter @classbook/api build
pnpm --filter @classbook/web build
pnpm --filter @classbook/admin build
```

浏览器验收清单：
1. 后台改「站点名称 / 浏览器标题 / 广场导航名」，前台立即生效；恢复默认可用。
2. 五处密码框眼睛可切换。
3. 两个普通账号：A 建相册，B 上传照片并删除；A 能删除 B 的相册。
4. 广场发 9 图帖，图片布局正确，灯箱可看；点赞、评论、回复、@ 都成功。
5. 个人页公开留言出现在广场；私密留言仅双方可见，管理员后台看不到内容。
6. 铃铛实时收到留言/评论/回复/点赞/@；点击跳转正确；全部已读生效。
7. 390px 宽度无横向滚动。
8. 刷新、直接访问 `/plaza/:id`、`/notifications` 不 404。

### Task 7.2：上线

- 再备份一次数据库与上传卷。
- `/usr/local/bin/classbook-hot-api`（自动 `migrate deploy`），确认 healthy。
- 更新宿主机 Nginx SSE 配置，`nginx -t && systemctl reload nginx`。
- `/usr/local/bin/classbook-hot-web`，确认 healthy。
- 清理测试账号/相册/帖子/通知与临时文件。
- 记录回滚方式：`docker tag ...:pre-social ...:latest` + 恢复备份。

---

## 风险与边界

- **私密留言**：管理员不可读是产品决定；后台只统计数量。若以后需要审核，必须改产品决策。
- **相册完全开放**：任何同学可删任何相册/照片，存在误删风险；已加二次确认，但不做回收站。
- **SSE**：单 API 实例内存总线；将来多副本需 Redis Pub/Sub。
- **Web Push**：iOS 仅 PWA 支持；桌面/Android 正常。
- **图片**：广场帖子最多 9 张静态图，实况照片仅在相册支持。
- **构建覆盖**：`docker compose pull` 会覆盖本地镜像，部署后仍需注意。
- **无测试框架覆盖前端**：前端用真实浏览器验收，不做组件单测。
