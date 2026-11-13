# Swarm Cursor Animation 全站接入交接

## 目标
把 Swarm Cursor Animation 的「多光标协作施工」效果应用到现有所有前台页面，而不是单独做一个 /swarm 页面。独立页面已按要求删除。

## 状态
已接入并通过 `pnpm --filter @classbook/web typecheck` 与 `pnpm --filter @classbook/web build`。
下列「收尾修复」章节记录了第二轮修复（生命周期、滚动锁、点击穿透、快照自排除、reduced-motion、主题跟随、性能、移动端）。

## 架构与文件职责

| 文件 | 职责 |
| --- | --- |
| `apps/web/src/components/Layout.tsx` | 全站挂载点：`<SwarmPageBuild />` + 引入 `@/features/swarm/styles/index.css`（`Layout.tsx:15-16`、`Layout.tsx:246`）。 |
| `features/swarm/SwarmPageBuild.jsx` | 重建层宿主：路由变化时快照 DOM、创建 `SwarmEngine`、推进施工、提供底部控制条（首页/重播/1×-3×/完成）与准备幕布；负责实例生命周期与滚动锁。 |
| `features/swarm/scene/snapshot.js` | 把当前 `document.body` 转成场景（矩形/路径/文字任务），只取直接文字、限制数量，并排除重建层自身与注入节点。 |
| `features/swarm/animation/SwarmEngine.js` | 任务调度：依赖、滚动前沿（`frontier`）、工人分配、空闲/离场、群集飞行；`type()` 逐字输入并按文案长度自动加速。 |
| `features/swarm/animation/DrawingEngine.js` | 单个工人的绘制生成器：钢笔路径、矩形拖拽、文字输入、复制、辅助线。 |
| `features/swarm/animation/config.js` | 工人数量（`WORKER_LIMITS`）、光标名称与配色。 |
| `features/swarm/scene/theme.js` | 设计稿尺寸（`PAGE_WIDTH`）、字体栈、场景默认配色常量。 |
| `features/swarm/scene/scene-builder.js` | 场景注册表：元素、任务、复制组与依赖关系。 |
| `features/swarm/AmbientCursors.jsx` | 完成后保留的氛围光标层（固定视口、`pointer-events: none`、不绘制内容）。 |
| `features/swarm/hooks/useSwarm.js` | 氛围光标与独立场景的通用生命周期（字体准备、resize/scroll/pointer 监听、唯一 rAF）。 |
| `features/swarm/styles/build.css` | 遮罩、幕布、控制条样式（全部改为主题 CSS 变量）。 |
| `features/swarm/components/ConstructionOverlay.jsx` 等 | 独立 `SwarmExperience` 场景用的选框、标尺、点击层组件（全站重建层不启用点击层）。 |

### 快照与重绘流程
1. 路由 `location.key` 变化（或点击「重播」`runId` 变化）→ effect 以 `runRef` 令牌开启新一轮运行。
2. 加锁滚动（记录 `documentElement.overflow`、`body.overflow`、`body.paddingRight`），显示「正在准备页面重建…」幕布。
3. 等待首屏文字出现（≤1600ms，`CONTENT_WAIT_MS`）→ 等待字体（≤500ms，`FONT_WAIT_MS`）→ 布局稳定 140ms（`LAYOUT_SETTLE_MS`）。
4. `buildSnapshotScene(document.body)` 生成场景：坐标是**文档坐标**，任务 `y` 越大越靠后。
5. 遮罩以 `position: absolute; height: 文档高度; z-index: 100` 平铺整页，`SwarmEngine.vp` 使用 `s: 1, left: 0` 的文档坐标视图。
6. rAF 循环调用 `engine.step(delta)`（倍速通过同帧多步推进）：滚动只推进 `frontier`，光标优先领取视口内任务；文字用逐字输入重绘。
7. 全部任务 done（或 `MAX_BUILD_MS` 超时）→ 遮罩 `.is-leaving` 淡出 `LEAVE_MS` 后卸载，滚动锁还原；氛围光标保留。

## 收尾修复（第二轮）
1. **生命周期**：每个路由只保留一个实例。`runRef` 令牌让旧实例的 `startBuild`、rAF、定时器、滚动监听全部失效；滚动监听登记在 `engine.listeners` 上按实例释放，并调用 `engine.stop()`（`SwarmEngine` 本身不持有定时器/rAF/监听，`stop()` 只封存状态，配合 `step()` 开头的 `stopped` 守卫确保残留帧不再推进）；effect 清理用 `clearTimeout`/`cancelAnimationFrame`/`removeEventListener` 收尾，不再出现重复遮罩或控制条。准备阶段的所有定时器（含字体超时分支）都登记在 `timers` 集合中，成功后主动 `clearTimeout`，React StrictMode 双调用下旧实例会被彻底中止。
2. **滚动锁恢复**：`scrollLockRef` 是单一所有者的锁，只有加锁的运行可以还原；在「完成」、组件卸载、路由切换三种路径下都还原 `overflow`/`paddingRight` 的原值（不是置空）。锁只加在 `documentElement`/`body` 的 `style.overflow`，与 `Modal.tsx`/`PhotoLightbox.tsx` 的 body 锁互不覆盖（各自保存原值后还原）。
3. **完成后不拦截点击**：`.swarm-build-overlay`、其 `.canvas`、`.cursors` 全部 `pointer-events: none !important`；点击「完成」后遮罩淡出并从 DOM 移除。控制条 `z-index: 120` 保持可点，氛围光标 `pointer-events: none` 且层级 z-15。
4. **快照排除自身**：`snapshot.js` 的 `SKIP_SELECTOR` 覆盖 `.swarm-experience`、`.swarm-page-build`、`.swarm-build-overlay`、`.swarm-build-curtain`、`.swarm-build-bar`、`.swarm-ambient`、`[data-swarm-build]`、`[data-swarm-ignore]`、`vite-error-overlay`、`#sw-register`、`[data-service-worker]`、`[data-dsh-*]`；遍历时先 `matches` 再 `closest`（祖先回溯）双重排除，避免自引用递归套娃。
5. **reduced-motion 跳过**：`prefers-reduced-motion: reduce` 时组件直接 `return null`（不渲染遮罩、不挂载氛围光标、不加滚动锁、不创建引擎）；`matchMedia` 监听在运行中切换也能立刻收尾。CSS 中另有 `display: none` 兜底。
6. **主题跟随**：`build.css` 与 `base.css` 的硬编码暖色全部替换为主题变量——`--background`、`--foreground`、`--muted`、`--accent`、`--accent-foreground`、`--border`、`--separator`、`--default`、`--overlay`、`--surface`、`--overlay-shadow`（均定义在 `apps/web/src/styles/themes.css`，未修改主题令牌文件）。遮罩背景用 `var(--background)` 实时取值；快照中图片底板/分隔线色通过 `themeColor()` 读取 `--default`/`--separator`，取不到退回 `scene/theme.js` 常量。
7. **性能**：快照上限 `MAX_BOXES=84`、`MAX_TEXTS=40`（原 120/60）；准备等待 1600+500+140ms（原 2400+800+220ms）；控制条显示的光标上限 18→14；`SwarmEngine.type()` 按文案长度自动加速（`rate = clamp(64/长度, 0.45, 1.6)`），长段落单次输入上限约 1.6 秒；`MAX_BUILD_MS=8000` 兜底收尾。
8. **移动端 375px**：控制条 `max-width: calc(100vw - 20px)`，操作按钮包在 `.swarm-build-bar__actions` 内横向滚动（隐藏滚动条、`overscroll-behavior-x: contain`），状态文案 `nowrap`，`overflow-x` 不再撑破页面；遮罩 `overflow: hidden` 不产生横向滚动条。
9. **文档**：即本文件。

## 音效与音量

底部控制条最右侧新增音量组：`Volume2/VolumeX` 图标按钮负责静音/恢复，右侧滑杆实时调节 0–100%。默认**开启**、音量 **55%**；受浏览器自动播放策略限制，页面加载时不会发声，首次点击/按键后才解锁 `AudioContext`。

- 持久化：设置写入 `localStorage` 的 `classbook:swarm-audio`（`{ enabled, volume }`），刷新、路由切换和重播后保持；存储损坏或隐私模式禁用时回退默认值。
- 音效事件：落笔 `click`、逐字输入 `tick`、元素完成 `note`（五声音阶轮换）、整页完成 `chord`；按光标横坐标做立体声声像。
- 节流：`click` 45ms、`tick` 50ms、`note` 110ms，避免多光标并发时声音过密；静音或音量为 0 时不再创建振荡器。
- 交互细节：滑杆拖到 0 等同静音，从 0 往上拖会自动解除静音；从 0 音量点图标恢复时回到 55%。
- 移动端：窄屏隐藏「已重建 / 向下滚动」文字只保留进度数字，滑杆缩到 42–48px，控制条不横向溢出。
- 关闭音效：点控制条音量图标即可；也可在控制台执行 `localStorage.setItem('classbook:swarm-audio', JSON.stringify({ enabled: false, volume: 0.55 }))` 后刷新。`prefers-reduced-motion: reduce` 下重建层整体不挂载，因此没有控制条、没有音效。
- 单元测试：`node --test apps/web/tests/audio.test.js` 覆盖默认值、音量夹取、持久化读写与损坏回退。

## 关闭 / 跳过方式
- **系统级跳过**：开启系统「减少动态效果」（`prefers-reduced-motion: reduce`）即可完全不渲染重建层与氛围光标。
- **临时跳过**：点击控制条「完成」立即淡出；或点击「重播」重来。
- **代码级关闭**：删除 `apps/web/src/components/Layout.tsx:246` 的 `<SwarmPageBuild />`（可保留第 16 行的样式引入，样式只作用于 `.swarm-experience` 命名空间，不启用时无副作用）。
- **只保留氛围光标**：只挂载 `<AmbientCursors maxCursors={5} />`，不挂载 `<SwarmPageBuild />`。
- **调试**：`import.meta.env.DEV` 下引擎实例挂在 `window.__swarmBuild`，可在控制台查看 `tasks` 状态与 `cursors`。

## 性能注意点（常量位置）
| 常量 | 位置 | 作用 |
| --- | --- | --- |
| `MAX_BOXES` / `MAX_TEXTS` / `MAX_TEXT_LENGTH` | `features/swarm/scene/snapshot.js` | 任务总数上限，直接决定施工时长 |
| `CONTENT_WAIT_MS` / `FONT_WAIT_MS` / `LAYOUT_SETTLE_MS` / `MAX_BUILD_MS` / `LEAVE_MS` | `features/swarm/SwarmPageBuild.jsx` | 准备阶段等待与整体超时 |
| `maxCursors`（控制条 14 / 氛围 5） | `SwarmPageBuild.jsx`、`AmbientCursors` 调用处 | 同屏光标数量 |
| `WORKER_LIMITS` | `features/swarm/animation/config.js` | 施工工人上下限（`INITIAL/BASE/FOLLOW/MAXIMUM`） |
| `type()` 的 `rate` | `features/swarm/animation/SwarmEngine.js` | 逐字输入速度，长文案自动加速 |
| 音效节流 45/50/110ms | `features/swarm/audio.js` | `click`/`tick`/`note` 的最小间隔，防止声音过密 |
| 默认音量 55% | `features/swarm/audio.js` | `DEFAULT_AUDIO_STATE`，控制条滑杆与持久化共用 |
| 速度倍率 1×–3× | 控制条「1×/2×/3×」按钮 | 同帧多步推进，不改 `delta` |

## 已知边界
- 快照走的是 `getComputedStyle`，重建画面是「静态再现」：图片按色块绘制、图标由矩形近似。
- 重建层不接管页面点击（`pointer-events: none`），真实页面在遮罩之下始终可交互；只有准备幕布阶段短暂阻挡输入。
- 路由切换会重新快照并重建一次；若页面内容依赖异步加载，快照可能只包含已渲染的部分。

## 约束
- 不要恢复独立 `/swarm` 页面。
- 不要改 `apps/admin`、`apps/api`、`packages/shared`（含主题令牌文件）、`apps/web/src/styles/themes.css`。
- 不要提交 git。
