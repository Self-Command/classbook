import {
  COLORS,
  TEXT_STYLES,
  CONTENT_LEFT,
  sansStyle,
} from "../theme.js";

/**
 * 创建结尾行动区：暖珊瑚色底板、两个真实入口和一句收尾说明。
 * @param {import("../scene-builder.js").SceneBuilder} scene 当前页面构建器。
 * @returns {void}
 */
export function createClosing(scene) {
  scene.frame("cta", 4060, 4480);
  const panel = scene.rect("x-panel", 80, 4090, 1120, 340, {
    r: 20,
    fill: COLORS.accentDeep,
    deps: ["g:g-tl-r"],
  });
  scene.text(
    "x-kicker",
    120,
    4140,
    "封面拼完了",
    sansStyle(11, 600, 1.5, "#F1C9BA", 0.16),
    { deps: [panel] }
  );
  scene.text(
    "x-title",
    120,
    4182,
    "封面会拼完，\n故事还在继续。",
    sansStyle(44, 700, 1.25, "#FFFFFF"),
    { w: 560, deps: [panel], grow: true }
  );
  scene.text(
    "x-lead",
    120,
    4312,
    "登录后可以补全同窗档案、上传照片、\n写下留言，也能把班级时间线慢慢填满。",
    sansStyle(16, 400, 1.7, "#F7E3D9"),
    { w: 540, deps: [panel] }
  );
  scene.text(
    "x-note",
    120,
    4392,
    "拾光同学录 · 只属于我们班的那一页",
    sansStyle(12, 400, 1.5, "#EFCFC1"),
    { w: 480, deps: [panel] }
  );

  scene.rect("x-btn1", 760, 4190, 190, 50, {
    r: 25,
    fill: COLORS.card,
    deps: [panel],
  });
  scene.text(
    "x-btn1-t",
    760,
    4202,
    "登录同学录",
    sansStyle(14.5, 600, 1.4, COLORS.accentDeep),
    { w: 190, align: "center", deps: ["r:x-btn1"] }
  );
  scene.rect("x-btn2", 970, 4190, 190, 50, {
    r: 25,
    fill: COLORS.accentDeep,
    stroke: "#E4A995",
    deps: [panel],
  });
  scene.text(
    "x-btn2-t",
    970,
    4202,
    "用邀请码注册",
    TEXT_STYLES.btn,
    { w: 190, align: "center", deps: ["r:x-btn2"] }
  );
}
