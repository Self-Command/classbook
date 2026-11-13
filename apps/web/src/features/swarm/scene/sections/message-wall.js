import {
  COLORS,
  TEXT_STYLES,
  CONTENT_LEFT,
  sansStyle,
} from "../theme.js";

/** 四张便签的偏移与文案，复制后由编辑任务替换。 */
const noteCopies = [
  { dx: 334, dy: -24, edits: ["留言 02", "以后也要\n常联系。"] },
  { dx: 30, dy: 216, edits: ["留言 03", "记得那年\n夏天的风。"] },
  { dx: 364, dy: 236, edits: ["留言 04", "下次见面，\n还是少年。"] },
];

/** 留言墙右侧可以写的两类内容，措辞与站点实际功能一致。 */
const writingIdeas = [
  {
    dx: 0,
    dy: 0,
    edits: ["给班级留一句祝福", "公开贴在班级留言墙上，谁都能看见。"],
  },
  {
    dx: 0,
    dy: 92,
    edits: ["给同学留一张纸条", "去同学的个人留言板，写下想说的话。"],
  },
];

/**
 * 创建留言墙区：四张便签错落排开，右侧说明可以写什么。
 * @param {import("../scene-builder.js").SceneBuilder} scene 当前页面构建器。
 * @returns {void}
 */
export function createMessageWall(scene) {
  scene.frame("wall", 2600, 3460);
  scene.guide("g-wall", "x", CONTENT_LEFT, 2624);
  scene.guide("g-wall-r", "x", 800, 2624);
  scene.text(
    "mw-title",
    CONTENT_LEFT,
    2666,
    "一句话，\n留给以后的同学。",
    TEXT_STYLES.h2,
    { w: 480, snap: "g-wall", grow: true }
  );
  scene.text(
    "mw-lead",
    800,
    2676,
    "不用很长。把当时没好意思说的、\n后来才想起来的，都贴在留言墙上。",
    TEXT_STYLES.body,
    { w: 360, snap: "g-wall-r" }
  );

  // 第一张便签先完整做出来，其余三张靠复制与改字完成。
  const note = scene.rect("mw-note0", 116, 2820, 300, 186, {
    r: 8,
    fill: COLORS.noteA,
    stroke: COLORS.line,
    deps: ["g:g-wall"],
  });
  const pin = scene.rect("mw-pin0", 262, 2824, 10, 10, {
    r: 5,
    fill: COLORS.accent,
    deps: [note],
  });
  scene.text("mw-label0", 140, 2844, "留言 01", TEXT_STYLES.label, {
    deps: [pin],
  });
  scene.text(
    "mw-text0",
    140,
    2880,
    "谢谢你借我\n半块橡皮。",
    sansStyle(17, 500, 1.85),
    { w: 250, deps: [note] }
  );
  scene.duplicate(
    "mw-notes",
    ["mw-note0", "mw-pin0", "mw-label0", "mw-text0"],
    noteCopies
  );

  scene.vertical("mw-div", 760, 2760, 3320);
  scene.text("mw-idea-h", 800, 2820, "可以写什么", TEXT_STYLES.label, {
    snap: "g-wall-r",
  });
  scene.text(
    "mw-idea0",
    800,
    2856,
    writingIdeas[0].edits[0],
    sansStyle(17, 600, 1.5),
    { w: 340, snap: "g-wall-r" }
  );
  scene.text(
    "mw-idea0-b",
    800,
    2888,
    writingIdeas[0].edits[1],
    TEXT_STYLES.body,
    { w: 340, snap: "g-wall-r" }
  );
  scene.duplicate(
    "mw-ideas",
    ["mw-idea0", "mw-idea0-b"],
    writingIdeas.slice(1)
  );

  scene.rect("mw-btn", 800, 3100, 270, 50, {
    r: 25,
    fill: COLORS.accentDeep,
    deps: ["d:mw-ideas:0"],
  });
  scene.text(
    "mw-btn-t",
    800,
    3112,
    "去留言墙写一句",
    TEXT_STYLES.btn,
    { w: 270, align: "center", deps: ["r:mw-btn"] }
  );
  scene.text(
    "mw-login-note",
    800,
    3170,
    "需要登录后发布。",
    TEXT_STYLES.small,
    { w: 300 }
  );
  scene.text(
    "mw-foot",
    CONTENT_LEFT,
    3380,
    "一句话也好，一段话也好，都是留给以后的路标。",
    TEXT_STYLES.small,
    { w: 620 }
  );
}
