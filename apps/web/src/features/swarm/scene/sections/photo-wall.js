import {
  COLORS,
  TEXT_STYLES,
  CONTENT_LEFT,
  sansStyle,
} from "../theme.js";

/** 照片墙里每张卡片的说明文字，序号与标题可逐项替换。 */
const photoCopies = [
  {
    dx: 360,
    dy: 0,
    edits: ["PHOTO 02", "最后一节晚自习", "示意照片 · 待上传"],
  },
  {
    dx: 720,
    dy: 0,
    edits: ["PHOTO 03", "黑板上没擦掉的字", "示意照片 · 待上传"],
  },
];
const photoCopiesRowTwo = [
  {
    dx: 360,
    dy: 0,
    edits: ["PHOTO 05", "运动会那天", "示意照片 · 待上传"],
  },
  {
    dx: 720,
    dy: 0,
    edits: ["PHOTO 06", "合照里少了一个人", "示意照片 · 待上传"],
  },
];

/**
 * 创建照片墙区：六张示意卡片按两行排开，说明文字保持清晰。
 * @param {import("../scene-builder.js").SceneBuilder} scene 当前页面构建器。
 * @returns {void}
 */
export function createPhotoWall(scene) {
  scene.frame("photo", 1740, 2600);
  scene.guide("g-photo", "x", CONTENT_LEFT, 1764);
  scene.guide("g-photo-r", "x", 740, 1764);
  scene.text(
    "ph-title",
    CONTENT_LEFT,
    1806,
    "把散落的照片\n挂回同一面墙。",
    TEXT_STYLES.h2,
    { w: 460, snap: "g-photo", grow: true }
  );
  scene.text(
    "ph-lead",
    740,
    1816,
    "毕业照、运动会、晚自习的窗外……\n相册可以按时间和主题整理。这里先\n摆六张示意卡片，真实照片等大家上传。",
    TEXT_STYLES.body,
    { w: 400, snap: "g-photo-r" }
  );

  // 第一行先做一张完整卡片，再复制出另外两张。
  const card = scene.rect("ph-card0", 116, 1970, 330, 258, {
    r: 14,
    fill: COLORS.card,
    stroke: COLORS.line,
    deps: ["g:g-photo"],
  });
  const tint = scene.rect("ph-tint0", 130, 1984, 302, 156, {
    r: 10,
    fill: COLORS.soft,
    deps: [card],
  });
  scene.text("ph-label0", 148, 2004, "PHOTO 01", TEXT_STYLES.label, {
    deps: [tint],
  });
  scene.text(
    "ph-cap0",
    136,
    2162,
    "操场边的夏天",
    sansStyle(16, 600, 1.4),
    { w: 290, deps: [card] }
  );
  scene.text(
    "ph-sub0",
    136,
    2192,
    "示意照片 · 待上传",
    TEXT_STYLES.small,
    { w: 290, deps: [card] }
  );
  scene.duplicate(
    "ph-row-one",
    ["ph-card0", "ph-tint0", "ph-label0", "ph-cap0", "ph-sub0"],
    photoCopies
  );

  // 第二行换一种纸色，延续“贴照片”的手工感。
  const card2 = scene.rect("ph-card3", 116, 2258, 330, 258, {
    r: 14,
    fill: COLORS.card,
    stroke: COLORS.line,
    deps: ["d:ph-row-one:1"],
  });
  const tint2 = scene.rect("ph-tint3", 130, 2272, 302, 156, {
    r: 10,
    fill: COLORS.sand,
    deps: [card2],
  });
  scene.text("ph-label3", 148, 2292, "PHOTO 04", TEXT_STYLES.label, {
    deps: [tint2],
  });
  scene.text(
    "ph-cap3",
    136,
    2450,
    "走廊尽头的风",
    sansStyle(16, 600, 1.4),
    { w: 290, deps: [card2] }
  );
  scene.text(
    "ph-sub3",
    136,
    2480,
    "示意照片 · 待上传",
    TEXT_STYLES.small,
    { w: 290, deps: [card2] }
  );
  scene.duplicate(
    "ph-row-two",
    ["ph-card3", "ph-tint3", "ph-label3", "ph-cap3", "ph-sub3"],
    photoCopiesRowTwo
  );

  scene.rect("ph-btn", 990, 2536, 210, 46, {
    r: 23,
    fill: COLORS.accentDeep,
    deps: ["d:ph-row-two:1"],
  });
  scene.text(
    "ph-btn-t",
    990,
    2547,
    "打开相册看看",
    TEXT_STYLES.btn,
    { w: 210, align: "center", deps: ["r:ph-btn"] }
  );
  scene.text(
    "ph-note",
    CONTENT_LEFT,
    2550,
    "相册需要登录后查看。",
    TEXT_STYLES.small,
    { w: 320 }
  );
}
