import {
  COLORS,
  TEXT_STYLES,
  FRAME_LEFT,
  FRAME_RIGHT,
  EDGE_START,
  EDGE_END,
  sansStyle,
} from "../theme.js";

/**
 * 创建顶部导航，所有元素在构建结束前一起标记为吸顶层。
 * @param {import("../scene-builder.js").SceneBuilder} scene 当前页面构建器。
 * @returns {void}
 */
export function createNavigation(scene) {
  // 导航保留24像素上沿与64像素高度，施工时由独立吸顶坐标系渲染。
  const firstElement = scene.elements.length;
  scene.path(
    "rule-top",
    [
      { x: EDGE_START, y: 24 },
      { x: EDGE_END, y: 24 },
    ],
    { add: false }
  );
  scene.frame("nav", 24, 88, true);
  scene.rect("mark-dot", FRAME_LEFT + 24, 43, 28, 28, {
    r: 14,
    fill: COLORS.accent,
  });
  scene.text(
    "mark-glyph",
    FRAME_LEFT + 24,
    48,
    "拾",
    sansStyle(14, 700, 1.3, "#FFFFFF"),
    {
      w: 28,
      align: "center",
      deps: ["r:mark-dot"],
    }
  );
  scene.text("brand", FRAME_LEFT + 64, 44, "拾光同学录", TEXT_STYLES.brand);
  scene.text("nav0", 512, 46, "封面", TEXT_STYLES.nav);
  scene.duplicate(
    "nav",
    ["nav0"],
    [
      { dx: 96, dy: 0, edits: ["照片墙"] },
      { dx: 192, dy: 0, edits: ["留言墙"] },
      { dx: 288, dy: 0, edits: ["时间线"] },
    ]
  );
  scene.vertical("nav-div", FRAME_RIGHT - 200, 24, 88);
  scene.rect("nav-btn", FRAME_RIGHT - 172, 36, 152, 40, {
    r: 20,
    fill: COLORS.accentDeep,
  });
  scene.text(
    "nav-btn-t",
    FRAME_RIGHT - 172,
    46,
    "进入同学录",
    TEXT_STYLES.btn,
    {
      w: 152,
      align: "center",
      deps: ["r:nav-btn"],
    }
  );
  scene.elements.slice(firstElement).forEach((element) => {
    element.sticky = true;
  });
}
