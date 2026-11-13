# API 契约 v1（实现细则）

设计文档见 [`docs/design.md`](./design.md)。本文件是前后端实现的接口依据，冲突时以本文件为准；如需变更请同步更新本文件。

## 0. 通用约定

- 前缀 `/api`，除特别标注外都要求登录。
- 鉴权：JWT 放在 HttpOnly Cookie `cb_token`（`Path=/; SameSite=Lax; Max-Age=604800`，生产 `Secure`）。前端 `fetch` 使用 `credentials: 'include'`。
- JWT payload：`{ sub: userId, role: 'MEMBER'|'ADMIN', tokenVersion: number }`。
- 鉴权中间件每次查库：用户不存在 / `status=DISABLED` / `tokenVersion` 不匹配 → `401 UNAUTHORIZED` 并清除 Cookie。
- 所有时间字段为 ISO 8601 UTC 字符串（例：`2026-11-12T09:00:00.000Z`）。
- 请求体为 JSON；上传接口为 `multipart/form-data`。
- 分页参数：`page`（默认 1）、`pageSize`（默认 12，最大 50）。分页响应：

```json
{ "items": [], "total": 0, "page": 1, "pageSize": 12 }
```

- 错误响应（所有 4xx/5xx）：

```json
{ "error": { "code": "INVALID_INVITE", "message": "邀请码无效或已用完" } }
```

错误码：`VALIDATION_ERROR`(400)、`UNAUTHORIZED`(401)、`FORBIDDEN`(403)、`NOT_FOUND`(404)、`USERNAME_TAKEN`(409)、`INVALID_INVITE`(400)、`INVALID_CREDENTIALS`(401)、`USER_DISABLED`(403)、`CANNOT_MODIFY_SELF`(400)、`RATE_LIMITED`(429)、`UPLOAD_TOO_LARGE`(413)、`UNSUPPORTED_FILE_TYPE`(415)、`INTERNAL_ERROR`(500)。

- 校验失败时 `details` 放 Zod 的 `flatten()` 结果。
- 留言/档案中的空字符串一律存 `null`；响应中可选字段用 `null`，不要省略。
- 中文错误文案由后端返回，前端直接展示 `error.message`。

## 1. 数据形状（与 `@classbook/shared` 一致）

```ts
ProfileDto = {
  id, userId, realName, nickname, avatarUrl, motto, bio,
  location, birthday /* "MM-DD" */, wechat, qq, email, phone, updatedAt
}
UserDto = { id, username, role, status, profile: ProfileDto | null, theme: ThemeId | null, createdAt }
PublicProfileDto = { id, realName, nickname, avatarUrl, motto, location, updatedAt }
MessageAuthorDto = { id, realName, nickname, avatarUrl, disabled }
MessageDto = { id, content, status, createdAt, toUserId, author, toUser: {id, realName} | null }
AlbumSummaryDto = { id, title, description, coverUrl, photoCount, createdAt }
PhotoDto = { id, albumId, url, caption, sortOrder, createdAt }
AlbumDto = AlbumSummaryDto & { photos: PhotoDto[] }
TimelineEventDto = { id, date, title, description, imageUrl, sortOrder, createdAt }
SiteSettingsDto = { className, schoolName, graduationYear, slogan, heroImageUrl, defaultTheme: ThemeId }
ThemeId = 'warm' | 'noir' | 'marine' | 'forest'
InviteCodeDto = { id, code, note, maxUses, usedCount, expiresAt, disabled, createdAt }
AdminMemberDto = { id, username, role, status, createdAt, profile: PublicProfileDto | null, messageCount }
AdminStatsDto = {
  memberCount, messageCount, hiddenMessageCount, photoCount,
  activeInviteCount, recentMessages: MessageDto[]
}
```

- `UserDto.theme`：用户主题偏好，取值 `ThemeId` 或 `null`。`null`（或用户未设置偏好）时前端回退到站点默认主题。序列化始终输出该键，未设置时为 `null`（`apps/api/src/lib/serialize.ts:70`；类型为可选 `theme?: ThemeId | null`，见 `packages/shared/src/index.ts:199`）。
- `SiteSettingsDto.defaultTheme`：站点默认主题，取值 `ThemeId`。无 `SiteSetting` 记录时后端兜底 `"warm"`，故接口响应中该字段总是存在（`apps/api/src/lib/serialize.ts:162`；类型为可选 `defaultTheme?: ThemeId`，见 `packages/shared/src/index.ts:269`）。
- 主题机制详见 `docs/theme-system.md`。

## 2. 认证

### POST /api/auth/register（免登录）

请求：`{ inviteCode, username, password, realName }`

- 用户名 3–20 位字母/数字/下划线；密码 8–72 位；真实姓名 1–20 字。
- 邀请码校验：存在、`disabled=false`、未过期、`usedCount < maxUses`。
- 事务内：创建 User + Profile（`realName`），`inviteCode.usedCount + 1`，写入 `inviteCodeId`。
- 成功 `201 { "user": UserDto }` 并 `Set-Cookie`。
- 失败：`INVALID_INVITE`、`USERNAME_TAKEN`、`VALIDATION_ERROR`。

### POST /api/auth/login（免登录）

请求：`{ username, password }`。成功 `200 { "user": UserDto }` + Cookie。
失败：`INVALID_CREDENTIALS`（用户不存在或密码错）、`USER_DISABLED`。

### POST /api/auth/logout

清除 Cookie，`204`。

### GET /api/auth/me

`200 { "user": UserDto }`；未登录 `401`。

### PATCH /api/auth/password

请求：`{ currentPassword, newPassword }`。校验旧密码；成功：`tokenVersion + 1`，`204` 并下发新 Cookie（新 token 版本）。

### PATCH /api/auth/preferences

保存当前登录用户的主题偏好（`apps/api/src/routes/auth.ts:144-153`）。

请求：`{ theme }`，`theme` 为 `"warm" | "noir" | "marine" | "forest" | null`。

- schema：`themePreferenceSchema = z.object({ theme: themeIdSchema.nullable() })`（`packages/shared/src/index.ts:46-47`）。**`theme` 键必填**（不传即 `VALIDATION_ERROR`），值可为 4 个合法 id 之一或 `null`；`null` 表示清除偏好、回到站点默认主题。
- 未知字段被 Zod 默认剥离，不报错；非法 id → `400 VALIDATION_ERROR`（`details` 为 Zod `flatten()`）。
- 鉴权：`requireAuth`，未登录/`DISABLED`/`tokenVersion` 不匹配 → `401 UNAUTHORIZED`。**不要求管理员**。
- 写入 `User.theme`（`String?`，`apps/api/prisma/schema.prisma:31`）；**不递增 `tokenVersion`**，不影响登录态。
- 响应：`200 { "user": UserDto }`（更新后的用户，含 `theme`）。

```json
{ "theme": "noir" }
```

清除偏好（回到站点默认主题）：

```json
{ "theme": null }
```

响应：

```json
{ "user": { "id": "cuid", "username": "admin", "role": "ADMIN", "status": "ACTIVE",
            "profile": { "...": "..." }, "theme": "noir", "createdAt": "2026-11-12T09:00:00.000Z" } }
```

### POST /api/auth/invite/validate（免登录）

请求：`{ code }` → `200 { "valid": true }`；无效也返回 200 + `false`（不泄漏原因）。

限流：登录/注册/邀请码校验按 IP 10 次/10 分钟，超限 `429 RATE_LIMITED`。

## 3. 档案

### GET /api/profiles

查询：`q?`（匹配 `realName` 或 `nickname`，`contains` 不区分大小写）、`page`、`pageSize`。
只返回 `status=ACTIVE` 用户，按 `updatedAt desc`。
响应：`Paginated<PublicProfileDto>`。

### GET /api/profiles/:id

`:id` 是 **User.id**。返回 `200 { "profile": ProfileDto, "username": string }`（含联系方式）。
用户不存在或 `status=DISABLED` → `404 NOT_FOUND`。

### PATCH /api/profiles/me

请求：`profileUpdateSchema` 的任意子集（字段见设计文档）。只更新传入字段；`""` 归一化为 `null`。
响应：`200 { "profile": ProfileDto }`。

### POST /api/uploads/avatar

`multipart/form-data`，字段名 `file`。仅 jpg/png/webp，≤2MB。
响应：`201 { "url": "/uploads/<random>.<ext>" }`。

### POST /api/uploads/images（管理员）

同上，≤5MB，用于相册/时间线/站点封面。

上传实现：`multer` 内存或磁盘存储 + 类型/大小校验；文件名用 `crypto.randomUUID()` + 扩展名；目录 `config.uploadDir`，启动时确保存在。`/uploads/**` 由带鉴权的 `express.static` 提供（`Cache-Control: private, max-age=3600`）。

## 4. 留言

### GET /api/messages

查询：`page`、`pageSize`、`toUserId?`。

- 不带 `toUserId`：只返回班级墙（`toUserId = null`）。
- 带 `toUserId`：返回该同学的留言板。
- 只返回 `status=VISIBLE`，按 `createdAt desc`。
- 作者被禁用时：`author = { id, realName: "已注销同学", nickname: null, avatarUrl: null, disabled: true }`。

响应：`Paginated<MessageDto>`。

### POST /api/messages

请求：`{ content, toUserId? }`，content 1–500 字（trim 后）。
`toUserId` 若提供，必须是存在的 ACTIVE 用户，否则 `404`。
响应：`201 { "message": MessageDto }`。

### DELETE /api/messages/:id

作者本人或管理员；`204`。

### GET /api/admin/messages（管理员）

查询：`status?`（`VISIBLE`/`HIDDEN`）、`page`、`pageSize`。返回全部（含隐藏），`createdAt desc`。
响应：`Paginated<MessageDto>`。

### PATCH /api/admin/messages/:id（管理员）

请求：`{ "status": "VISIBLE" | "HIDDEN" }` → `200 { "message": MessageDto }`。

## 5. 相册

### GET /api/albums

`200 { "items": AlbumSummaryDto[] }`，按 `createdAt desc`。`photoCount` 为照片数；`coverUrl` 为空时取第一张照片 url。

### GET /api/albums/:id

`200 { "album": AlbumDto }`；照片按 `sortOrder asc, createdAt asc`。

### POST /api/admin/albums（管理员）

请求：`{ title, description? }` → `201 { "album": AlbumSummaryDto }`。

### PATCH /api/admin/albums/:id（管理员）

请求：`albumUpdateSchema` 子集 → `200 { "album": AlbumSummaryDto }`。

### DELETE /api/admin/albums/:id（管理员）

级联删除照片记录；尽力删除磁盘文件；`204`。

### POST /api/admin/albums/:id/photos（管理员）

请求：`{ "urls": ["/uploads/a.jpg"], "caption?": "..." }`（先调上传接口拿 url）。
`201 { "photos": PhotoDto[] }`，`sortOrder` 依次递增。

### DELETE /api/admin/photos/:id（管理员）

删除记录 + 尽力删文件；`204`。

## 6. 时间线

### GET /api/timeline

`200 { "items": TimelineEventDto[] }`，按 `date desc, sortOrder asc`。

### POST /api/admin/timeline（管理员）

请求：`{ date, title, description?, imageUrl?, sortOrder? }`（date 接受 ISO 字符串，`z.coerce.date()`）。
`201 { "event": TimelineEventDto }`。

### PATCH /api/admin/timeline/:id（管理员）

请求：字段子集 → `200 { "event": TimelineEventDto }`。

### DELETE /api/admin/timeline/:id（管理员）

`204`。

## 7. 设置与后台

### GET /api/settings/public（免登录）

`200 SiteSettingsDto`（**直接返回对象，不包裹 `settings` 键**）。实现：`apps/api/src/routes/settings.ts:7-9` 按主键 `id = 1` 查 `SiteSetting`，交给 `toSiteSettingsDto`。

```json
{
  "className": "我们的班级",
  "schoolName": null,
  "graduationYear": null,
  "slogan": null,
  "heroImageUrl": null,
  "defaultTheme": "warm"
}
```

- 若 `SiteSetting` 记录不存在（`toSiteSettingsDto(null)`），返回默认值：`className: "我们的班级"`，`schoolName`/`graduationYear`/`slogan`/`heroImageUrl` 为 `null`，**`defaultTheme: "warm"`**（`apps/api/src/lib/serialize.ts:155-164`）。
- `defaultTheme` 取自 `SiteSetting.defaultTheme String @default("warm")`（非空列，`apps/api/prisma/schema.prisma:133`）；序列化处再兜底 `?? 'warm'`，因此该字段在响应中**总是存在**且总是合法 `ThemeId`。
- 前端用它作为「用户未设置偏好」时的站点默认主题；展示站客户端会在进程内缓存该响应（`apps/web/src/lib/api.ts:282-299`）。

### PATCH /api/admin/settings（管理员）

请求：`settingsUpdateSchema` 的任意子集 → `200 SiteSettingsDto`（同样不包裹键）。实现：`apps/api/src/routes/admin.ts:443-458`，对 `id = 1` 做 `upsert`（`create: { id: 1, ...data }`）。

鉴权：`/api/admin/*` 统一挂载 `requireAuth, requireAdmin`（`apps/api/src/routes/admin.ts:59`），未登录 `401 UNAUTHORIZED`，非管理员 `403 FORBIDDEN`。

请求字段（全部可选；`settingsUpdateSchema`，`packages/shared/src/index.ts:152-159`）：

| 字段 | 类型/校验 | 可空 | 说明 |
| --- | --- | --- | --- |
| `className` | `string` trim 后 1–30 字 | 否 | 传 `""` 会因 `min(1)` 触发 `VALIDATION_ERROR`（该字段不在空串转 `null` 白名单内） |
| `schoolName` | `string` trim 后 ≤50 字 | 是 | 传 `""` 由 `emptyStringsToNull` 归一化为 `null` |
| `graduationYear` | `int` 1900–2100 | 是 | 前端以 4 位年份字符串校验后转 `Number` 提交 |
| `slogan` | `string` trim 后 ≤100 字 | 是 | 传 `""` 归一化为 `null` |
| `heroImageUrl` | `string` trim 后 ≤500 字 | 是 | 传 `""` 归一化为 `null` |
| `defaultTheme` | `ThemeId`（`z.enum`） | **否** | `themeIdSchema.optional()`：可省略，但显式传 `null` 会 `VALIDATION_ERROR` |

- 空串归一化白名单：`['schoolName', 'slogan', 'heroImageUrl']`（`apps/api/src/routes/admin.ts:444-448` 调用 `emptyStringsToNull`，实现见 `apps/api/src/lib/normalize.ts`）。
- 未传的字段不写入（`upsert.update` 只带 `data` 中存在的键）；`{}` 是合法请求，等价于「不改动」并返回当前设置。
- 设置 `defaultTheme` 只影响**未显式选择主题**的用户；已保存个人偏好的用户不受影响。
- 校验失败 → `400 VALIDATION_ERROR`；响应 `200 SiteSettingsDto`，含全部 6 个字段（见 `GET /api/settings/public` 示例）。

### GET /api/admin/stats（管理员）

`200 AdminStatsDto`：
- `memberCount`：`status=ACTIVE` 的用户数。
- `messageCount`：全部留言数；`hiddenMessageCount`：`status=HIDDEN`。
- `photoCount`：全部照片数。
- `activeInviteCount`：未停用、未过期、未用完的邀请码数。
- `recentMessages`：最近 5 条留言（含隐藏）。

### GET /api/admin/members（管理员）

查询：`q?`（匹配 username/realName/nickname）、`page`、`pageSize`。按 `createdAt desc`。
响应：`Paginated<AdminMemberDto>`，`messageCount` 为该用户留言数。

### PATCH /api/admin/members/:id（管理员）

请求：`{ status?, role? }`。不能操作自己（`CANNOT_MODIFY_SELF`）。
`status` 改为 `DISABLED` 或 `role` 变更时 `tokenVersion + 1`，立即踢下线。
`200 { "member": AdminMemberDto }`。

### POST /api/admin/members/:id/reset-password（管理员）

请求：`{ newPassword }`；`tokenVersion + 1`；`204`。

### GET /api/admin/invite-codes（管理员）

`200 { "items": InviteCodeDto[] }`，按 `createdAt desc`。

### POST /api/admin/invite-codes（管理员）

请求：`{ note?, maxUses? (1–200，默认 1), expiresAt? }`。
服务端生成 8 位大写字母+数字邀请码（去掉易混淆的 `0O1I`），保证唯一。
`201 { "invite": InviteCodeDto }`。

### DELETE /api/admin/invite-codes/:id（管理员）

`disabled = true`，`204`。

## 8. 鉴权与安全实现要点

- 中间件：`requireAuth`、`requireAdmin`；统一把用户挂到 `req.user`。
- 注册/登录/改密/重置密码都用 `bcryptjs`（cost 10）。
- 所有写接口先 Zod 校验，再进业务；Zod 错误转 `VALIDATION_ERROR`。
- 统一错误处理中间件放最后；未捕获异常打日志并返回 `INTERNAL_ERROR`。
- `express.json({ limit: '1mb' })`；`cookie-parser`；`cors` 仅允许 `config.webOrigin`、`config.adminOrigin` 且 `credentials: true`（生产同源可不触发）。
- 上传文件按 MIME 白名单校验，不信任扩展名；`multer` 限制 `fileSize`。
- 静态 `/uploads` 必须先过 `requireAuth`，再 `express.static`。
- 管理员不能禁用/降级自己；不能删除最后一个管理员（v1 只禁止操作自己即可）。

## 9. 前端 API 客户端约定

- 统一 `request<T>(path, options)`：`credentials: 'include'`，JSON 解析，非 2xx 抛 `ApiError { code, message, details }`。
- 401 时清空本地用户状态并跳登录（带 `redirect` 查询参数）。
- 开发环境走 Vite 代理（`/api`、`/uploads` → `http://localhost:3000`），前端代码里只写相对路径。
- 图片直接用 `<img src={url}>`；因为 `/uploads` 需要登录，浏览器会自动带 Cookie，不要加 `crossOrigin`。
- 日期展示：`new Date(iso).toLocaleDateString('zh-CN')`；时间线按年份分组。
