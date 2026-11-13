/** 页面交互动作类型，保持场景配置与事件处理使用同一口径。 */
export const ActionType = Object.freeze({
  START: "start",
  SCROLL: "scroll",
  DIALOG: "dialog",
  CUSTOM: "custom",
});

/** 保留弹窗类型导出，宿主未使用时不会触发任何本地演示弹窗。 */
export const DialogKind = Object.freeze({
  QUICK_START: "quick-start",
  DOCS: "docs",
  PLAN: "plan",
});

/** 保留方案名称导出以兼容模板公开入口，实际页面不再展示付费方案。 */
export const PlanName = Object.freeze({ HIVE: "Hive", COLONY: "Colony", SWARM: "Swarm" });

/** 点击区域的视觉反馈类型，按钮和文字链接采用不同悬停效果。 */
export const InteractionStyle = Object.freeze({
  LINK: "link",
  BUTTON: "button",
});

/** 点击中心标志即可开始首屏施工，无需先滚动页面。 */
export const START_ACTION = Object.freeze({ type: ActionType.START });

/** 站内真实路由由宿主 onAction 接管，避免页面内出现虚假承诺。 */
function route(to) {
  return { type: ActionType.CUSTOM, to };
}

/**
 * 创建已有文字对应的点击区域，副本文字必须等待复制和替换两项动作完成。
 * @param {string} id 文本实体标识。
 * @param {string} label 完整操作名称，供辅助技术和悬停提示使用。
 * @param {object} action 点击后的动作描述。
 * @param {string[]} [after] 完成条件，默认等待该文字输入完成。
 * @returns {object} 与场景坐标解耦的交互定义。
 */
function textLink(id, label, action, after = [`t:${id}`]) {
  // 只绑定稳定实体ID，缩放和位置从当前场景读取，避免维护两套坐标。
  return {
    id,
    elements: [id],
    after,
    label,
    style: InteractionStyle.LINK,
    action,
  };
}

/**
 * 创建矩形与文字组合按钮的点击区域。
 * @param {string} id 背景矩形标识。
 * @param {string} textId 按钮文本标识。
 * @param {string} label 完整操作名称。
 * @param {object} action 点击后的动作描述。
 * @param {string[]} [after] 任务依赖，默认等待底板绘制和输入完成。
 * @returns {object} 覆盖整个按钮的交互定义。
 */
function button(id, textId, label, action, after = [`r:${id}`, `t:${textId}`]) {
  // 点击范围同时包含底板和文字，整个可见按钮都能响应操作。
  return {
    id,
    elements: [id, textId],
    after,
    label,
    style: InteractionStyle.BUTTON,
    action,
  };
}

/** 页面滚动目标复用已声明的标题实体，不重复保存纵坐标。 */
const destinations = Object.freeze({
  HOME: { type: ActionType.SCROLL },
  COVER: { type: ActionType.SCROLL, target: "cv-title" },
  PHOTOS: { type: ActionType.SCROLL, target: "ph-title" },
  WALL: { type: ActionType.SCROLL, target: "mw-title" },
  TIMELINE: { type: ActionType.SCROLL, target: "tl-title" },
});

/**
 * 页面全部点击入口。after中的任务必须全部完成，未施工和仍在拖动的副本不进入点击或键盘焦点顺序。
 */
export const PAGE_INTERACTIONS = [
  {
    ...textLink("brand", "拾光同学录 · 回到顶部", destinations.HOME, [
      "t:brand",
      "r:mark-dot",
      "t:mark-glyph",
    ]),
    elements: ["brand", "mark-dot", "mark-glyph"],
  },
  textLink("nav0", "封面", destinations.COVER),
  textLink("nav0~1", "照片墙", destinations.PHOTOS, ["d:nav:0", "e:nav0~1"]),
  textLink("nav0~2", "留言墙", destinations.WALL, ["d:nav:1", "e:nav0~2"]),
  textLink("nav0~3", "时间线", destinations.TIMELINE, ["d:nav:2", "e:nav0~3"]),
  button("nav-btn", "nav-btn-t", "进入同学录 · 登录", route("/login")),
  button("h-btn1", "h-btn1-t", "翻看照片墙", route("/albums")),
  button("h-btn2", "h-btn2-t", "写一句留言", route("/wall")),
  textLink("cv-link", "接着看照片墙", destinations.PHOTOS),
  button("ph-btn", "ph-btn-t", "打开相册看看", route("/albums")),
  button("mw-btn", "mw-btn-t", "去留言墙写一句", route("/wall")),
  textLink("tl-link", "查看完整时间线", route("/timeline")),
  button("x-btn1", "x-btn1-t", "登录同学录", route("/login")),
  button("x-btn2", "x-btn2-t", "用邀请码注册", route("/register")),
  {
    ...textLink("f-brand", "拾光同学录 · 回到顶部", destinations.HOME, [
      "t:f-brand",
      "r:f-dot",
      "t:f-glyph",
    ]),
    elements: ["f-brand", "f-dot", "f-glyph"],
  },
  textLink("fc-1", "留言墙", route("/wall")),
  textLink("fc-2", "相册", route("/albums")),
  textLink("fc-3", "时间线", route("/timeline")),
  textLink("fc-1~1", "登录", route("/login"), ["d:fcols:0", "e:fc-1~1"]),
  textLink("fc-2~1", "用邀请码注册", route("/register"), [
    "d:fcols:0",
    "e:fc-2~1",
  ]),
  textLink("fc-3~1", "返回首页", route("/"), ["d:fcols:0", "e:fc-3~1"]),
];
