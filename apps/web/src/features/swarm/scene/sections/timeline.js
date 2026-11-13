import {
  COLORS,
  TEXT_STYLES,
  CONTENT_LEFT,
  sansStyle,
  monoStyle,
} from "../theme.js";

/** 时间线上的四段共同记忆，序号、标题与短说明都可直接替换。 */
const timelineCopies = [
  {
    dx: 260,
    dy: 0,
    edits: ["02", "第一次运动会", "在跑道边喊到嗓子哑。"],
  },
  {
    dx: 520,
    dy: 0,
    edits: ["03", "毕业照", "把校服穿得整整齐齐。"],
  },
  {
    dx: 780,
    dy: 0,
    edits: ["04", "最后一次班会", "谁都没有先走。"],
  },
];

/**
 * 创建时间线区：一条横线串起四段记忆，节点由复制任务依次出现。
 * @param {import("../scene-builder.js").SceneBuilder} scene 当前页面构建器。
 * @returns {void}
 */
export function createTimeline(scene) {
  scene.frame("timeline", 3460, 4060);
  scene.guide("g-tl", "x", CONTENT_LEFT, 3484);
  scene.guide("g-tl-r", "x", 740, 3484);
  scene.text(
    "tl-title",
    CONTENT_LEFT,
    3526,
    "沿着时间，\n把日子串起来。",
    TEXT_STYLES.h2,
    { w: 480, snap: "g-tl", grow: true }
  );
  scene.text(
    "tl-lead",
    740,
    3536,
    "开学的第一天、第一次运动会、\n毕业照、最后一次班会——时间线\n把散落的片段按顺序放好。",
    TEXT_STYLES.body,
    { w: 400, snap: "g-tl-r" }
  );

  const line = scene.horizontal("tl-line", 3742, 140, 1160);
  const dot = scene.rect("tl-dot0", 193, 3735, 14, 14, {
    r: 7,
    fill: COLORS.accent,
    deps: [line],
  });
  scene.text("tl-no0", 180, 3668, "01", monoStyle(11, COLORS.accentDeep, 600), {
    deps: [dot],
  });
  scene.text(
    "tl-name0",
    180,
    3690,
    "开学第一天",
    sansStyle(16.5, 600, 1.4),
    { w: 210, deps: [dot] }
  );
  scene.text(
    "tl-desc0",
    180,
    3766,
    "第一次走进同一间教室。",
    TEXT_STYLES.small,
    { w: 220, deps: [dot] }
  );
  scene.duplicate(
    "tl-nodes",
    ["tl-dot0", "tl-no0", "tl-name0", "tl-desc0"],
    timelineCopies
  );

  scene.text(
    "tl-link",
    CONTENT_LEFT,
    3960,
    "查看完整时间线  →",
    sansStyle(15.5, 600, 1.5, COLORS.accentDeep),
    { w: 260, snap: "g-tl" }
  );
  scene.text(
    "tl-note",
    CONTENT_LEFT + 300,
    3966,
    "时间线需要登录后查看。",
    TEXT_STYLES.small,
    { w: 320 }
  );
  scene.text(
    "tl-foot",
    740,
    3948,
    "时间会往前走，这一页可以慢慢补。",
    TEXT_STYLES.small,
    { w: 420, snap: "g-tl-r" }
  );
}
