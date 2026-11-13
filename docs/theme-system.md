# 主题系统（拾光同学录）

本文件说明 classbook monorepo 的主题机制：可选主题、Token 定义位置、用户切换与持久化、管理员默认主题、以及各级 fallback 规则。所有字段与常量均以代码为准，关键位置附文件与行号。

## 目录

- [1. 概览](#1-概览)
- [2. 主题定义位置](#2-主题定义位置)
- [3. 四套主题](#3-四套主题)
- [4. Token 清单](#4-token-清单)
- [5. 用户切换与持久化](#5-用户切换与持久化)
- [6. 管理员默认主题](#6-管理员默认主题)
- [7. Fallback 规则](#7-fallback-规则)
- [8. 新增一套主题的步骤](#8-新增一套主题的步骤)
- [9. 关键文件与行号索引](#9-关键文件与行号索引)

## 1. 概览

- 主题是**单值枚举**，不是「浅色/深色」二选一：`warm`、`noir`、`marine`、`forest` 四套，每套自带 `color-scheme`（light/dark）与完整 Token 覆盖。
- 同一套主题在展示站（`apps/web`）与管理后台（`apps/admin`）共用**同名 Token、同值**，两个 `themes.css` 内容一致。
- 主题通过根元素属性 `data-theme="<id>"` 生效，CSS 选择器为 `[data-theme="warm"]` 等（`themes.css`）。
- 唯一事实来源是 `@classbook/shared` 的 `THEMES` / `THEME_IDS`；前端只从共享包取列表渲染 UI，不硬编码主题数组。

> 历史说明：早期曾设计 6 套带渐变（gradient）/纹理的主题，因与「无渐变、高对比」的设计约束冲突被整体否决并删除，现仅保留下述 4 套高对比纯色主题。

## 2. 主题定义位置

| 关注点 | 文件 | 说明 |
| --- | --- | --- |
| 主题 id / 名称 / 描述 / 模式 / 色板 | `packages/shared/src/index.ts:6-47` | `THEME_IDS`、`ThemeId`、`THEMES` |
| Zod schema | `packages/shared/src/index.ts:46-47` | `themeIdSchema`、`themePreferenceSchema` |
| 展示站 CSS 变量 | `apps/web/src/styles/themes.css` | 4 个 `[data-theme]` 块 |
| 管理端 CSS 变量 | `apps/admin/src/styles/themes.css` | 与 web 内容一致 |
| 展示站变量引入 | `apps/web/src/index.css:3` | `@import "./styles/themes.css";` |
| 管理端变量引入 | `apps/admin/src/index.css:3` | `@import "./styles/themes.css";` |
| 首屏防闪烁 | `apps/web/index.html:2,7-17`、`apps/admin/index.html:2,7-17` | 内联脚本读 `localStorage` 预置 `data-theme` |

共享包中的定义（`packages/shared/src/index.ts:6-47`）：

```ts
export const THEME_IDS = ['warm', 'noir', 'marine', 'forest'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const THEMES = [
  { id: 'warm',   name: '暖光', description: '暖白纸面与珊瑚橙，像一本摊开的同学录。', mode: 'light', swatches: ['#FAF7F0', '#1F2A37', '#C2410C'] },
  { id: 'noir',   name: '墨夜', description: '深墨底色与雾蓝高光，安静地翻看旧照片。', mode: 'dark',  swatches: ['#0B0F14', '#F5F7FA', '#93C5FD'] },
  { id: 'marine', name: '海盐', description: '冷调雾蓝与深海蓝，干净、清爽、利落。',   mode: 'light', swatches: ['#F3F6FA', '#0F2744', '#1D4ED8'] },
  { id: 'forest', name: '松林', description: '深松绿与青柠微光，像晚自习后的操场。',   mode: 'dark',  swatches: ['#0E1A15', '#F0F7F2', '#A3E635'] },
] as const satisfies ReadonlyArray<{
  id: ThemeId;
  name: string;
  description: string;
  mode: 'light' | 'dark';
  swatches: readonly string[];
}>;

export const themeIdSchema = z.enum(THEME_IDS);
export const themePreferenceSchema = z.object({ theme: themeIdSchema.nullable() });
```

四个字段的含义：

- `id`：稳定标识，写入 `data-theme`、数据库与接口；**不得随意改名**。
- `name` / `description`：切换面板中文文案。
- `mode`：`light` | `dark`，仅用于设置根元素 `style.colorScheme`（`apps/web/src/lib/theme.tsx:32-37`）；真实配色仍以 `themes.css` 的 `color-scheme` 为准，两者需保持一致。
- `swatches`：切换面板里的 3 个预览色点（背景 / 文字 / 强调色）。

## 3. 四套主题

| id | 名称 | color-scheme | 定位 | 主强调色 | 展示字体（`--font-display`） | themes.css 起始行 |
| --- | --- | --- | --- | --- | --- | --- |
| `warm` | 暖光 | light | 暖白纸面 + 深墨文字 + 珊瑚橙 | `#c2410c` | `Noto Serif SC`, `Songti SC`, `SimSun`, serif | 9 |
| `noir` | 墨夜 | dark | 深墨底 + 雾蓝高光 | `#93c5fd` | `Noto Sans SC`, `PingFang SC`, `Microsoft YaHei`, sans-serif | 71 |
| `marine` | 海盐 | light | 冷调雾蓝 + 深海蓝 | `#1d4ed8` | `Noto Sans SC`, `PingFang SC`, `Microsoft YaHei`, sans-serif | 132 |
| `forest` | 松林 | dark | 深松绿 + 青柠微光 | `#a3e635` | `Noto Serif SC`, `Songti SC`, `SimSun`, serif | 194 |

同上表的行号对 `apps/admin/src/styles/themes.css` 同样成立（两个文件逐行等价）。

各主题之间的**结构性差异**只有两处，其余 Token 名称完全一致：

1. 圆角：`warm` / `noir` / `forest` 为 `--radius: 1rem`、`--field-radius: 0.875rem`；`marine` 更紧凑，为 `--radius: 0.875rem`、`--field-radius: 0.75rem`（`apps/web/src/styles/themes.css:172-173`）。
2. 阴影：浅色主题（`warm` / `marine`）用多层柔和投影；深色主题（`noir` / `forest`）改用 1px 描边 + 大范围暗投影，避免深色底上投影失效（`apps/web/src/styles/themes.css:116-118,239-241`）。

## 4. Token 清单

以下变量名**逐条摘自 `apps/web/src/styles/themes.css` 与 `apps/admin/src/styles/themes.css`**，四套主题各自完整定义同一组名字：**每套 47 个自定义属性，8 个 `[data-theme]` 块（2 文件 × 4 主题）变量名集合完全一致**，无遗漏、无额外私有变量。表内「warm 默认值」取自 `themes.css` 的 `[data-theme="warm"]` 块；标注 `var(--foreground)` 的表示间接引用同主题的 `--foreground`。

### 4.1 基底与表面

| 变量 | 用途 | warm 默认值 |
| --- | --- | --- |
| `--background` | 页面底色 | `#faf7f0` |
| `--foreground` | 正文/默认文字色 | `#1f2a37` |
| `--surface` | 一级容器（卡片、面板） | `#ffffff` |
| `--surface-foreground` | 一级容器内文字 | `var(--foreground)` |
| `--surface-secondary` | 二级容器（嵌套区块） | `#f5f1e9` |
| `--surface-secondary-foreground` | 二级容器内文字 | `var(--foreground)` |
| `--surface-tertiary` | 三级容器（更弱的分区） | `#ede7db` |
| `--surface-tertiary-foreground` | 三级容器内文字 | `var(--foreground)` |
| `--overlay` | 浮层底色（弹窗/下拉） | `#fffdf8` |
| `--overlay-foreground` | 浮层内文字 | `var(--foreground)` |
| `--muted` | 次要说明文字 | `#5b6472` |
| `--default` | 中性填充（幽灵按钮 hover 等） | `#f1ece2` |
| `--default-foreground` | 中性填充上的文字 | `#1f2a37` |

### 4.2 强调色与状态色

| 变量 | 用途 | warm 默认值 |
| --- | --- | --- |
| `--accent` | 品牌强调色（主按钮、焦点、链接高亮） | `#c2410c` |
| `--accent-foreground` | 强调色上的文字 | `#ffffff` |
| `--segment` | 分段控件/标签底色 | `#f1ece2` |
| `--segment-foreground` | 分段控件文字 | `var(--foreground)` |
| `--success` | 成功态 | `#15803d` |
| `--success-foreground` | 成功态上的文字 | `#ffffff` |
| `--warning` | 警告态 | `#b45309` |
| `--warning-foreground` | 警告态上的文字 | `#ffffff` |
| `--danger` | 危险/错误态 | `#b91c1c` |
| `--danger-foreground` | 危险态上的文字 | `#ffffff` |

> 注意：切换面板里出现的 `bg-accent-soft` 等类名来自 HeroUI 自身的令牌体系，**不在** 本文件定义的变量清单内，主题文件不覆盖它。

### 4.3 表单字段

| 变量 | 用途 | warm 默认值 |
| --- | --- | --- |
| `--field-background` | 输入框底色 | `#ffffff` |
| `--field-foreground` | 输入框文字 | `#1f2a37` |
| `--field-placeholder` | 占位符文字 | `#6b7280` |
| `--field-border` | 输入框边框 | `rgba(31, 42, 55, 0.16)` |

### 4.4 描边、焦点与遮罩

| 变量 | 用途 | warm 默认值 |
| --- | --- | --- |
| `--border` | 通用边框色 | `rgba(31, 42, 55, 0.16)` |
| `--separator` | 分隔线（比 `--border` 更弱） | `rgba(31, 42, 55, 0.09)` |
| `--focus` | 键盘焦点环颜色 | `#c2410c` |
| `--link` | 链接文字色 | `#9a3412` |
| `--backdrop` | 弹窗背后遮罩 | `rgba(15, 23, 42, 0.5)` |

### 4.5 圆角、描边宽度与阴影

| 变量 | 用途 | warm 默认值 |
| --- | --- | --- |
| `--radius` | 组件基础圆角 | `1rem` |
| `--field-radius` | 表单控件圆角 | `0.875rem` |
| `--border-width` | 基础边框宽度 | `1px` |
| `--field-border-width` | 表单边框宽度 | `1px` |
| `--surface-shadow` | 卡片投影 | `0 1px 2px rgba(31,42,55,.05), 0 10px 30px rgba(31,42,55,.06)` |
| `--overlay-shadow` | 浮层投影 | `0 18px 50px rgba(31, 42, 55, 0.16)` |
| `--field-shadow` | 输入框投影 | `0 1px 2px rgba(31, 42, 55, 0.06)` |

### 4.6 骨架图与滚动条

| 变量 | 用途 | warm 默认值 |
| --- | --- | --- |
| `--skeleton-animation` | 骨架屏动画名 | `shimmer` |
| `--scrollbar-thumb` | 滚动条滑块 | `color-mix(in oklch, var(--foreground) 15%, transparent)` |
| `--scrollbar-track` | 滚动条轨道 | `transparent` |
| `--scrollbar-gutter` | 滚动条占位策略 | `auto` |
| `--scrollbar-width` | 滚动条宽度 | `thin` |
| `--scrollbar-color` | 滚动条两段色（滑块 轨道） | `var(--scrollbar-thumb) var(--scrollbar-track)` |
| `--scrollbar` | 兼容别名 | `var(--scrollbar-thumb)` |

### 4.7 字体

| 变量 | 用途 | warm 默认值 |
| --- | --- | --- |
| `--font-display` | 标题/展示字体 | `"Noto Serif SC", "Songti SC", "SimSun", serif` |

### 4.8 非变量声明

每个 `[data-theme]` 块首行还声明了标准属性 `color-scheme`（`light` / `dark`），用于让浏览器原生控件（滚动条、表单、`<select>`）跟随主题；它与 `THEMES[].mode` 语义一致。

## 5. 用户切换与持久化

### 5.1 运行时状态

两端各有一份等价的 `ThemeProvider`，逻辑完全相同：

- 展示站：`apps/web/src/lib/theme.tsx`
- 管理端：`apps/admin/src/lib/theme.tsx:15-103`

```ts
const STORAGE_KEY = 'classbook:theme';
const FALLBACK_THEME: ThemeId = 'warm';
```

上下文暴露 5 个值（`apps/web/src/lib/theme.tsx:39-45`）：`theme`（最终生效）、`preference`（用户显式选择，可为 `null`）、`defaultTheme`（站点默认）、`setTheme(next)`、`themes`（即 `THEMES`）。

实际生效值计算只有一行：

```ts
const theme = preference ?? defaultTheme;   // apps/web/src/lib/theme.tsx:75
```

`applyTheme()` 把结果写到根元素（`apps/web/src/lib/theme.tsx:32-37`）：

```ts
root.dataset.theme = theme;                   // 命中 themes.css 的 [data-theme="..."]
root.style.colorScheme = meta.mode;           // light | dark
```

### 5.2 Header 切换按钮

- 展示站：`apps/web/src/components/theme/ThemeSwitcher.tsx`，挂载在 `apps/web/src/components/Layout.tsx:110`。
- 管理端：`apps/admin/src/components/theme/ThemeSwitcher.tsx`，挂载在 `apps/admin/src/components/layout/AdminLayout.tsx:153`。

交互：调色板图标按钮 → `Modal` 弹窗 → 2 列网格。第一项是「跟随站点默认」（`onSelect={() => setTheme(null)}`，描述文案带出当前默认主题名），其后按 `THEMES` 顺序渲染 4 套主题（`apps/web/src/components/theme/ThemeSwitcher.tsx:96-118`）。每项显示 3 个 `swatches` 色点 + `name` + `description`，选中项加 `aria-pressed`。

### 5.3 点击后的三段动作

`setTheme(next)`（`apps/web/src/lib/theme.tsx:81-95`）依次做三件事：

1. `setPreference(next)`：立即切换 UI，不等网络。
2. 写本地存储：`next` 非空时 `localStorage.setItem('classbook:theme', next)`；选择「跟随站点默认」时 `removeItem`。整段包在 `try/catch` 里——隐私模式下 `localStorage` 不可用时静默跳过（注释见 `theme.tsx:88`）。
3. 已登录时同步服务端：`void updateThemePreference(next).catch(() => {})`——**失败静默**，不回滚本地状态，不弹错。

### 5.4 服务端持久化

`apps/web/src/lib/theme-api.ts` 与 `apps/admin/src/lib/theme-api.ts` 内容一致：

```ts
fetch('/api/auth/preferences', {
  method: 'PATCH',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ theme }),   // theme: ThemeId | null
});
```

- 字段名固定为 `theme`，允许 `null`（清除偏好，回到站点默认）。
- 非 2xx 抛 `new Error('主题偏好保存失败')`，由调用方 `catch` 吞掉。
- 落库位置：`User.theme String?`（`apps/api/prisma/schema.prisma:31`），未设置即 `NULL`。
- 接口细节见 `docs/api-contract.md` 的 `PATCH /api/auth/preferences`。

### 5.5 初始化与本地存储 fallback

初始化分四层，全部以代码为准：

1. **HTML 内联脚本（防首屏闪烁）**：`apps/web/index.html:7-17`、`apps/admin/index.html:7-17`。HTML 标签默认 `data-theme="warm"`，脚本读取 `localStorage['classbook:theme']`，仅当值在 `['warm','noir','marine','forest']` 白名单内才覆盖；读取异常直接忽略。
2. **首次渲染的 React state**：`useState<ThemeId | null>(() => readStoredTheme())`（`theme.tsx:51`）。`readStoredTheme()`（`theme.tsx:23-30`）读同一 key，值不在 `THEMES` id 集合内或抛错时返回 `null`。
3. **拉取站点默认主题**：挂载时请求公开设置（`theme.tsx:54-67`），仅当 `settings.defaultTheme` 存在**且**通过 `isThemeId()` 校验才 `setDefaultTheme`；请求失败静默忽略，保留 `FALLBACK_THEME = 'warm'`。
   - 展示站走 `settingsApi.getPublic()`（`apps/web/src/lib/api.ts:285-299`，进程内缓存，路径 `/settings/public`）。
   - 管理端走 `admin.settings()`（`apps/admin/src/lib/api.ts:275-277`），同样请求 `/settings/public`。
4. **登录用户偏好覆盖**：`useEffect` 监听 `user`，`isThemeId(user.theme)` 通过则 `setPreference(user.theme)`（`theme.tsx:69-73`）。服务端偏好**优先于** `localStorage`；`user.theme` 为 `null` 时不覆盖，从而落到站点默认。

因此 `preference` 的实际取值优先级为：**服务端 `User.theme`（非 `null` 时覆盖）→ `localStorage['classbook:theme']`（首屏初值；未登录时的选择也只存在这里）→ `null`（此时使用 `defaultTheme`）**。注意 `user.theme === null` 时**不会**清掉本地的 `preference`，只有当用户主动点「跟随站点默认」把 `preference` 置 `null`（并清除本地存储）后才会真正落到站点默认主题。

## 6. 管理员默认主题

管理端 `/settings` 页面的「默认主题」卡片（`apps/admin/src/pages/SettingsPage.tsx:206-218`），文案：*「新同学首次打开时使用这套配色；大家仍可在右上角随时切换。」*

- 渲染组件：`ThemeDefaultPicker`（`apps/admin/src/components/theme/ThemeDefaultPicker.tsx`），3 列网格，直接用 `THEMES` 渲染，无「跟随默认」选项，选中项标记「默认」。
- 页面状态：`const [defaultTheme, setDefaultTheme] = useState<ThemeId>('warm')`（`SettingsPage.tsx:31`）；数据到达后 `setDefaultTheme(data.defaultTheme ?? 'warm')`（`SettingsPage.tsx:42`）。
- 读取：页面初始化调用 `admin.settings()` → `GET /api/settings/public`。
- 保存：整页表单提交时，与其他站点字段一起经 `settingsUpdateSchema.safeParse` 校验（`SettingsPage.tsx:59-66`），再调 `admin.updateSettings()` → `PATCH /api/admin/settings`（`apps/admin/src/lib/api.ts:279-284`），成功后 `setData(updated)` 并 toast「站点设置已保存」。
- 落库位置：`SiteSetting.defaultTheme String @default("warm")`（`apps/api/prisma/schema.prisma:133`），非空列，行 id 固定为 `1`（`upsert`）。
- 返回给客户端：`toSiteSettingsDto()` 始终输出 `defaultTheme`，缺记录时兜底 `'warm'`（`apps/api/src/lib/serialize.ts:155-164`）。

修改默认主题**不会**覆盖已经显式选择过主题的用户：那些用户的 `User.theme` 非空，`preference ?? defaultTheme` 仍取个人偏好。

## 7. Fallback 规则

按触发顺序列出，每一条都对应代码：

| 场景 | 结果 | 依据 |
| --- | --- | --- |
| 用户 `User.theme` 非空且合法 | 使用该主题 | `theme.tsx:69-75` |
| 用户未设置偏好（`theme = NULL`） | 使用站点默认主题 `defaultTheme` | `theme.tsx:75` |
| 站点无 `SiteSetting` 记录（或该列为 `NULL`） | `defaultTheme` 回退 `'warm'` | `serialize.ts:162` |
| 前端尚未拿到公开设置 / 请求失败 | `defaultTheme` 保持 `FALLBACK_THEME = 'warm'` | `theme.tsx:16,52,54-67` |
| `settings.defaultTheme` 不是 4 个合法 id 之一 | 忽略该值，保留 `'warm'` | `isThemeId()` 校验，`theme.tsx:19-21,59` |
| `localStorage` 值非法 / 读取抛错 | 视为未设置（`null`） | `theme.tsx:23-30` |
| 首屏内联脚本遇到非法值 | 保留 HTML 上的 `data-theme="warm"` | `index.html:10-14` |
| 用户选择「跟随站点默认」 | 写库为 `NULL`，回到站点默认 | `theme-api.ts:8` + `auth.ts:148` |

**写入侧校验（决定「非法值进不了库」）**：

- 用户偏好：`themePreferenceSchema = z.object({ theme: themeIdSchema.nullable() })`（`packages/shared/src/index.ts:47`），`themeIdSchema = z.enum(THEME_IDS)`（`:46`）。即 `theme` 键**必填**、值必须是 4 个 id 之一**或** `null`；其他值 → `400 VALIDATION_ERROR`（`apps/api/src/middleware/error-handler.ts:17-26`）。Zod 对象默认剥离未知键，多余字段被忽略而非报错。
- 站点默认主题：`settingsUpdateSchema.defaultTheme: themeIdSchema.optional()`（`packages/shared/src/index.ts:158`）。注意它是 **optional 但不可为 null**——显式传 `"defaultTheme": null` 会被拒绝为 `VALIDATION_ERROR`；不传则该字段保持原值（`upsert` 的 `update` 只带传入字段）。
- 数据库层无外键/枚举约束（两处都是 `String`），因此「非法主题 id」在理论上只能源于绕过 API 的直接写库；前端 `isThemeId()` 是最后一道防线，遇到非法值一律退回 `warm` 而非渲染空白主题。

## 8. 新增一套主题的步骤

1. `packages/shared/src/index.ts`：在 `THEME_IDS` 增加 id，并在 `THEMES` 增加一项（含 `name`、`description`、`mode`、`swatches`）。
2. `apps/web/src/styles/themes.css` 与 `apps/admin/src/styles/themes.css`：**同步**新增 `[data-theme="<id>"]` 块，复制上一套并逐项替换第 4 节列出的全部变量；`color-scheme` 与 `mode` 必须一致。
3. `apps/web/index.html`、`apps/admin/index.html` 内联脚本的 `allowed` 白名单数组加入新 id（否则首屏会用旧值，登录后再跳变）。
4. 校验：`pnpm --filter @classbook/web typecheck`、`pnpm --filter @classbook/admin typecheck`；`THEMES` 为 `as const satisfies` 结构，字段缺失会在类型检查阶段报错。
5. 管理端 `/settings` 与两端 Header 切换面板会自动列出新主题（均直接遍历 `THEMES`），无需额外改动 UI。

## 9. 关键文件与行号索引

| 文件 | 关键行 | 内容 |
| --- | --- | --- |
| `packages/shared/src/index.ts` | 6-7 | `THEME_IDS` / `ThemeId` |
| | 9-44 | `THEMES` 定义（4 套） |
| | 46-47 | `themeIdSchema` / `themePreferenceSchema` |
| | 158 | `settingsUpdateSchema.defaultTheme` |
| | 199 | `UserDto.theme?: ThemeId \| null` |
| | 269 | `SiteSettingsDto.defaultTheme?: ThemeId` |
| `apps/web/src/styles/themes.css` | 9 / 71 / 132 / 194 | warm / noir / marine / forest 变量块 |
| `apps/admin/src/styles/themes.css` | 9 / 71 / 132 / 194 | 同上（内容等价） |
| `apps/web/src/lib/theme.tsx` | 15-16 | `STORAGE_KEY` / `FALLBACK_THEME` |
| | 19-30 | `isThemeId` / `readStoredTheme` |
| | 32-37 | `applyTheme` |
| | 51-52 | 初始 state |
| | 54-67 | 拉取公开默认主题 |
| | 69-73 | 登录用户偏好覆盖 |
| | 75 | `preference ?? defaultTheme` |
| | 81-95 | `setTheme`（本地 + 服务端） |
| `apps/web/src/lib/theme-api.ts` | 3-14 | `PATCH /api/auth/preferences` 调用 |
| `apps/web/src/components/theme/ThemeSwitcher.tsx` | 69-129 | Header 切换弹窗 |
| `apps/web/src/components/Layout.tsx` | 110 | 切换按钮挂载点 |
| `apps/web/index.html` | 2, 7-17 | 首屏防闪烁脚本 |
| `apps/admin/src/lib/theme.tsx` | 15-103 | 管理端同构实现 |
| `apps/admin/src/components/theme/ThemeSwitcher.tsx` | 69-130 | 管理端切换弹窗 |
| `apps/admin/src/components/layout/AdminLayout.tsx` | 153 | 管理端挂载点 |
| `apps/admin/src/components/theme/ThemeDefaultPicker.tsx` | 10-49 | 默认主题选择器 |
| `apps/admin/src/pages/SettingsPage.tsx` | 31, 42, 59-66, 206-218 | 默认主题状态 / 校验 / 提交 / 卡片 |
| `apps/api/src/lib/serialize.ts` | 63-73 | `toUserDto`（`theme` 兜底 `null`） |
| | 155-164 | `toSiteSettingsDto`（`defaultTheme` 兜底 `'warm'`） |
| `apps/api/src/routes/auth.ts` | 144-153 | `PATCH /api/auth/preferences` |
| `apps/api/src/routes/settings.ts` | 7-9 | `GET /api/settings/public` |
| `apps/api/src/routes/admin.ts` | 59 | `adminRouter.use(requireAuth, requireAdmin)` |
| | 443-458 | `PATCH /api/admin/settings` |
| `apps/api/prisma/schema.prisma` | 31 | `User.theme String?` |
| | 133 | `SiteSetting.defaultTheme String @default("warm")` |

相关文档：接口契约见 [`docs/api-contract.md`](./api-contract.md)，设计背景见 [`docs/design.md`](./design.md)。
