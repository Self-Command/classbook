import {
  COLORS,
  TEXT_STYLES,
  CONTENT_LEFT,
  sansStyle,
} from "../theme.js";

/** 封面拼装的四步顺序，标题、说明与序号都可直接编辑。 */
const assemblySteps = [
  {
    dx: 0,
    dy: 0,
    edits: [
      "01  纸张打底",
      "先铺一张暖白纸，四周留出手作的余量。",
    ],
  },
  {
    dx: 0,
    dy: 96,
    edits: [
      "02  照片就位",
      "把合照贴进预留的相框，边角不用太整齐。",
    ],
  },
  {
    dx: 0,
    dy: 192,
    edits: [
      "03  标题落笔",
      "写下班级的名字，让这一页有清楚的落款。",
    ],
  },
  {
    dx: 0,
    dy: 288,
    edits: [
      "04  留白收尾",
      "空出来的地方，留给以后补上的那句话。",
    ],
  },
];

/**
 * 创建封面拼装区：左侧叠放纸张与标题，右侧列出拼装顺序。
 * @param {import("../scene-builder.js").SceneBuilder} scene 当前页面构建器。
 * @returns {void}
 */
export function createCover(scene) {
  scene.frame("cover", 780, 1740);
  scene.guide("g-cover", "x", CONTENT_LEFT, 804);
  scene.guide("g-cover-r", "x", 740, 804);
  scene.text(
    "cv-title",
    CONTENT_LEFT,
    846,
    "先拼一页\n属于我们的封面。",
    TEXT_STYLES.h2,
    { w: 460, snap: "g-cover", grow: true }
  );
  scene.text(
    "cv-lead",
    740,
    856,
    "纸张、照片、标题和一句寄语，按顺序\n落位。每个元素都由一个光标放置，\n像全班一起做手工。",
    TEXT_STYLES.body,
    { w: 400, snap: "g-cover-r" }
  );

  // 三张错层的纸代表拼装过程，标签与说明保持中英混排的编辑感。
  scene.rect("cv-paper-3", 190, 1086, 450, 312, {
    r: 16,
    fill: COLORS.sand,
  });
  scene.rect("cv-paper-2", 160, 1048, 450, 312, {
    r: 16,
    fill: COLORS.soft,
    stroke: COLORS.line,
    deps: ["r:cv-paper-3"],
  });
  const paper = scene.rect("cv-paper-1", 130, 1010, 450, 312, {
    r: 16,
    fill: COLORS.card,
    stroke: COLORS.line,
    deps: ["r:cv-paper-2"],
  });
  scene.text("cv-label", 162, 1042, "COVER / 01", TEXT_STYLES.label, {
    deps: [paper],
  });
  scene.text(
    "cv-big",
    160,
    1072,
    "拾光",
    sansStyle(46, 700, 1.2),
    { w: 220, deps: [paper], grow: true }
  );
  scene.text(
    "cv-big-2",
    160,
    1128,
    "同学录",
    sansStyle(30, 700, 1.3),
    { w: 240, deps: ["t:cv-big"] }
  );
  scene.path(
    "cv-rule",
    [
      { x: 162, y: 1184 },
      { x: 548, y: 1184 },
    ],
    { stroke: COLORS.line, deps: ["t:cv-big-2"] }
  );
  scene.text(
    "cv-meta",
    162,
    1200,
    "共创封面 · 全班合订 · 手作纸感",
    TEXT_STYLES.small,
    { w: 380, deps: ["p:cv-rule"] }
  );
  scene.text(
    "cv-tag",
    162,
    1264,
    "一页纸 / 一群人 / 一段日子",
    sansStyle(13, 500, 1.5, COLORS.accentDeep),
    { w: 360, deps: [paper] }
  );

  // 右侧拼装顺序从第一条开始，其余三条由复制任务补齐。
  scene.text("cv-order", 740, 1010, "拼装顺序", TEXT_STYLES.label, {
    snap: "g-cover-r",
  });
  scene.text(
    "cv-step0",
    740,
    1042,
    assemblySteps[0].edits[0],
    sansStyle(18, 600, 1.4),
    { w: 400, snap: "g-cover-r" }
  );
  scene.text(
    "cv-step0-b",
    740,
    1074,
    assemblySteps[0].edits[1],
    TEXT_STYLES.body,
    { w: 380, snap: "g-cover-r" }
  );
  scene.duplicate(
    "cv-steps",
    ["cv-step0", "cv-step0-b"],
    assemblySteps.slice(1)
  );

  scene.text(
    "cv-link",
    740,
    1418,
    "接着看照片墙  →",
    sansStyle(15.5, 600, 1.5, COLORS.accentDeep),
    { w: 260, snap: "g-cover-r" }
  );
  scene.vertical("cv-div", 700, 980, 1480);
  scene.text(
    "cv-foot",
    CONTENT_LEFT,
    1652,
    "封面先做出来，里面的内容再慢慢补。",
    TEXT_STYLES.small,
    { w: 520 }
  );
}
