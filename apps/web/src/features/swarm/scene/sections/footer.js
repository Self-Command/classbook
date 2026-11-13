import {
  COLORS,
  TEXT_STYLES,
  CONTENT_LEFT,
  FRAME_LEFT,
  sansStyle,
} from "../theme.js";

/**
 * 创建页脚：品牌、两列真实入口与版权说明。
 * @param {import("../scene-builder.js").SceneBuilder} scene 当前页面构建器。
 * @returns {void}
 */
export function createFooter(scene) {
  scene.frame("footer", 4480, 4740, true);
  scene.guide("g-foot", "x", 640, 4500);
  scene.rect("f-dot", CONTENT_LEFT, 4520, 26, 26, {
    r: 13,
    fill: COLORS.accent,
  });
  scene.text(
    "f-glyph",
    CONTENT_LEFT,
    4524,
    "拾",
    sansStyle(13, 700, 1.3, "#FFFFFF"),
    { w: 26, align: "center", deps: ["r:f-dot"] }
  );
  scene.text("f-brand", FRAME_LEFT + 78, 4520, "拾光同学录", TEXT_STYLES.brand);
  scene.text(
    "f-tagline",
    CONTENT_LEFT,
    4566,
    "把青春留在纸上，把牵挂留在这里。",
    TEXT_STYLES.small,
    { w: 460 }
  );
  scene.text(
    "f-copy",
    CONTENT_LEFT,
    4680,
    "拾光同学录 · 仅供本班同学留念",
    TEXT_STYLES.small,
    { w: 420 }
  );

  // 右侧两列由第一列复制而来，链接与站点现有路由一一对应。
  scene.text(
    "fc-h",
    640,
    4520,
    "浏览",
    sansStyle(14.5, 600, 1.4),
    { snap: "g-foot" }
  );
  scene.text("fc-1", 640, 4556, "留言墙", TEXT_STYLES.item, { snap: "g-foot" });
  scene.text("fc-2", 640, 4592, "相册", TEXT_STYLES.item);
  scene.text("fc-3", 640, 4628, "时间线", TEXT_STYLES.item);
  scene.duplicate(
    "fcols",
    ["fc-h", "fc-1", "fc-2", "fc-3"],
    [
      {
        dx: 220,
        dy: 0,
        edits: ["参与", "登录", "用邀请码注册", "返回首页"],
      },
    ]
  );
}
