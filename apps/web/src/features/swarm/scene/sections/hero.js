import {
  COLORS,
  TEXT_STYLES,
  CONTENT_LEFT,
  monoStyle,
  sansStyle,
} from "../theme.js";

/**
 * 创建开场区：左侧标题与真实入口，右侧是一页正在拼装的封面。
 * @param {import("../scene-builder.js").SceneBuilder} scene 当前页面构建器。
 * @returns {void}
 */
export function createHero(scene) {
  // 左侧文案与右侧封面示意图共用1280像素设计画布，窄屏由外层等比缩放。
  scene.frame("hero", 88, 780);
  scene.vertical("hero-div", 740, 88, 780);
  scene.guide("g-hero", "x", CONTENT_LEFT, 108);
  scene.guide("g-hero-r", "x", 760, 108);
  scene.text(
    "h-kicker",
    CONTENT_LEFT,
    150,
    "拾光同学录 · 共创封面",
    TEXT_STYLES.label,
    { snap: "g-hero" }
  );
  scene.text(
    "h-title",
    CONTENT_LEFT,
    196,
    "把青春\n装订成册。",
    TEXT_STYLES.h1,
    {
      w: 540,
      snap: "g-hero",
      grow: true,
    }
  );
  scene.text(
    "h-lead",
    CONTENT_LEFT,
    372,
    "这一页由全班一起拼：暖白的纸、\n珊瑚色的标题，还有被照片和留言\n慢慢填满的角落。",
    TEXT_STYLES.lead,
    { w: 500, snap: "g-hero" }
  );
  scene.rect("h-btn1", CONTENT_LEFT, 492, 190, 50, {
    r: 25,
    fill: COLORS.accentDeep,
  });
  scene.text("h-btn1-t", CONTENT_LEFT, 504, "翻看照片墙", TEXT_STYLES.btn, {
    w: 190,
    align: "center",
    deps: ["r:h-btn1"],
  });
  scene.rect("h-btn2", CONTENT_LEFT + 208, 492, 176, 50, {
    r: 25,
    fill: COLORS.card,
    stroke: COLORS.line,
  });
  scene.text(
    "h-btn2-t",
    CONTENT_LEFT + 208,
    504,
    "写一句留言",
    TEXT_STYLES.btnDark,
    {
      w: 176,
      align: "center",
      deps: ["r:h-btn2"],
    }
  );
  scene.text(
    "h-note",
    CONTENT_LEFT,
    572,
    "向下滚动，看光标把这一页一页拼起来。",
    TEXT_STYLES.small,
    { w: 420, snap: "g-hero" }
  );

  // 右侧封面拆成纸张、照片框、标题和页脚四层，施工顺序与拼装顺序一致。
  scene.rect("h-stack", 782, 178, 376, 496, {
    r: 18,
    fill: COLORS.sand,
    deps: ["g:g-hero-r"],
  });
  const cover = scene.rect("h-cover", 760, 160, 380, 496, {
    r: 18,
    fill: COLORS.card,
    stroke: COLORS.line,
    deps: ["g:g-hero-r"],
  });
  scene.text("h-class", 792, 196, "CLASS BOOK", TEXT_STYLES.label, {
    deps: [cover],
  });
  scene.rect("h-cover-rule", 792, 224, 42, 4, {
    r: 2,
    fill: COLORS.accent,
    deps: [cover],
  });
  scene.text(
    "h-cover-title",
    792,
    250,
    "拾光\n同学录",
    sansStyle(42, 700, 1.18),
    { w: 300, deps: [cover], grow: true }
  );
  scene.text(
    "h-cover-sub",
    792,
    356,
    "共创封面 · 全班合订",
    sansStyle(15, 600, 1.5, COLORS.accentDeep),
    { w: 300, deps: [cover] }
  );
  const photo = scene.rect("h-photo", 792, 392, 316, 150, {
    r: 12,
    fill: COLORS.soft,
    stroke: COLORS.line,
    deps: [cover],
  });
  scene.rect("h-sun", 1018, 418, 34, 34, {
    r: 17,
    fill: COLORS.sun,
    deps: [photo],
  });
  scene.path(
    "h-hill",
    [
      { x: 792, y: 542 },
      { x: 900, y: 468 },
      { x: 1004, y: 542 },
    ],
    { closed: true, stroke: COLORS.sun, fill: COLORS.sun, deps: [photo] }
  );
  scene.path(
    "h-hill-2",
    [
      { x: 918, y: 542 },
      { x: 1012, y: 486 },
      { x: 1108, y: 542 },
    ],
    { closed: true, stroke: COLORS.sand, fill: COLORS.sand, deps: ["p:h-hill"] }
  );
  scene.text(
    "h-photo-cap",
    792,
    496,
    "把合照放进来",
    monoStyle(11, "#8A7A6A"),
    { deps: [photo] }
  );
  scene.text(
    "h-cover-note",
    792,
    558,
    "一页封面，装下我们的三年。",
    TEXT_STYLES.small,
    { w: 310, deps: [cover] }
  );
  scene.path(
    "h-sep",
    [
      { x: 792, y: 590 },
      { x: 1108, y: 590 },
    ],
    { stroke: COLORS.line, deps: ["t:h-cover-note"] }
  );
  scene.text(
    "h-cover-link",
    792,
    606,
    "翻开这本册子  →",
    sansStyle(15, 600, 1.5, COLORS.ink),
    { deps: ["p:h-sep"] }
  );

  // 首屏底部的章节索引不是业务数据，只说明页面结构。
  scene.horizontal("h-index", 704);
  const indexItems = [
    { dx: 0, text: "01  封面" },
    { dx: 260, text: "02  照片墙" },
    { dx: 520, text: "03  留言墙" },
    { dx: 780, text: "04  时间线" },
  ];
  scene.text("h-index0", CONTENT_LEFT, 724, indexItems[0].text, TEXT_STYLES.small);
  scene.duplicate(
    "h-indexes",
    ["h-index0"],
    indexItems.slice(1).map((item) => ({ dx: item.dx, dy: 0, edits: [item.text] }))
  );
}
