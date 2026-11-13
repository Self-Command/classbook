/** 页面使用1280像素设计坐标；视口缩放由展示层统一处理。 */
export const PAGE_WIDTH = 1280;
export const NAV_TOP = 24;
export const NAV_HEIGHT = 64;
export const RULER_SIZE = 20;
export const FRAME_LEFT = 80;
export const FRAME_RIGHT = 1200;
export const CONTENT_LEFT = FRAME_LEFT + 36;
export const EDGE_START = -10000;
export const EDGE_END = 10000;

/** 场景文字使用的字体类别，保持与测量层和文本实体协议一致。 */
export const FontKind = Object.freeze({
  SANS: "sans",
  SERIF: "serif",
  MONO: "mono",
});

/**
 * 字体栈不依赖在线字体服务，优先使用系统已安装的中文字体。
 * CSS、Canvas测量与字体预加载必须引用同一份定义。
 */
export const FONT_STACKS = Object.freeze({
  sans: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  serif: '"Noto Serif SC", "Songti SC", "SimSun", serif',
  mono: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
});

/** 页面颜色集中配置：暖白纸张、珊瑚橙强调与深棕文字。 */
export const COLORS = {
  ink: "#2A231D",
  muted: "#6C6258",
  line: "#E6D9CB",
  accent: "#C2503A",
  accentDeep: "#A2402D",
  paper: "#FAF5EE",
  card: "#FFFCF7",
  soft: "#F6E7DA",
  sand: "#F0E0D0",
  sun: "#EFBE9C",
  noteA: "#FBE9CE",
  noteB: "#F7DFD3",
  noteC: "#F3E4D7",
  code: "#2E2721",
};

/**
 * @typedef {object} TextStyle
 * @property {string} font 字体类别，对应FontKind。
 * @property {number} size 字号，单位为设计坐标像素。
 * @property {number} weight 字重。
 * @property {number} lh 行高相对于字号的倍率。
 * @property {string} color 文字颜色。
 * @property {number} [ls] 字间距，单位为em。
 * @property {boolean} [pre] 是否保留空白并禁止自动换行。
 * @property {boolean} [code] 是否进行代码语法着色。
 * @property {boolean} [upper] 是否将文案转换为大写。
 */

/**
 * 创建无衬线文字样式，供标题、正文和按钮等区块复用。
 * @param {number} size 字号。
 * @param {number} weight 字重。
 * @param {number} lineHeightRatio 行高倍率。
 * @param {string} [color] 文字颜色。
 * @param {number} [letterSpacing] 以em计的字间距。
 * @returns {TextStyle} 可被场景实体与Canvas测量共用的样式。
 */
export function sansStyle(
  size,
  weight,
  lineHeightRatio,
  color = COLORS.ink,
  letterSpacing = 0
) {
  // 中文字形较满，行高与字距保留舒适留白，避免逐字施工时挤在一起。
  return {
    font: FontKind.SANS,
    size,
    weight,
    lh: lineHeightRatio,
    color,
    ls: letterSpacing,
  };
}

/**
 * 创建等宽文字样式，供小标签、序号说明和页脚信息复用。
 * @param {number} size 字号。
 * @param {string} [color] 文字颜色。
 * @param {number} [weight] 字重。
 * @param {Partial<TextStyle>} [overrides] 对默认行高或显示规则的覆盖。
 * @returns {TextStyle} 完整等宽文字样式。
 */
export function monoStyle(
  size,
  color = COLORS.muted,
  weight = 400,
  overrides = {}
) {
  // 代码区允许独立配置行高和空白保留，其余等宽文字沿用默认行高。
  return { font: FontKind.MONO, size, weight, lh: 1.5, color, ...overrides };
}

/** 页面排版层级；区块布局仅引用此表，字号与字重无需分散修改。 */
export const TEXT_STYLES = {
  h1: sansStyle(58, 700, 1.2, COLORS.ink),
  h2: sansStyle(38, 700, 1.24, COLORS.ink),
  h3: sansStyle(20, 600, 1.4, COLORS.ink),
  lead: sansStyle(18, 400, 1.75, COLORS.muted),
  body: sansStyle(15, 400, 1.75, COLORS.muted),
  item: sansStyle(14.5, 500, 1.5, COLORS.ink),
  nav: sansStyle(14, 500, 1.4, COLORS.ink),
  btn: sansStyle(14.5, 600, 1.4, "#FFFFFF"),
  btnDark: sansStyle(14.5, 600, 1.4, COLORS.accentDeep),
  brand: sansStyle(17, 700, 1.3, COLORS.ink),
  stat: sansStyle(40, 700, 1.1, COLORS.ink),
  code: monoStyle(13, "#F7E7DB", 400, { lh: 1.7, pre: true }),
  codeDim: monoStyle(11, "#CBB8A8"),
  nodeName: monoStyle(13, COLORS.ink, 500),
  nodeWhite: monoStyle(14, "#FFFFFF", 500),
  small: monoStyle(11.5, COLORS.muted),
  label: monoStyle(11, COLORS.accentDeep, 600, { ls: 0.16 }),
};

/** 页面顶部与页脚使用的圆形标志锚点，保留可施工的短期路径。 */
export const LOGO_PATHS = [
  {
    d: "M60 4a56 56 0 1 0 0 112a56 56 0 1 0 0-112Z",
    anchors: [
      [60, 4],
      [116, 60],
      [60, 116],
      [4, 60],
    ],
  },
];
