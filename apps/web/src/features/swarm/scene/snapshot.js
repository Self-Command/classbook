import { SceneBuilder } from "./scene-builder.js";
import { COLORS, FontKind } from "./theme.js";

/** 快照上限：重建整页的关键结构，控制施工任务数量，保证首屏2-3秒内完成。 */
const MAX_BOXES = 84;
const MAX_TEXTS = 40;
const MAX_TEXT_LENGTH = 160;
const MAX_PAGE_HEIGHT = 6000;

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "LINK",
  "META",
  "NOSCRIPT",
  "SVG",
  "PATH",
  "CANVAS",
  "VIDEO",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "TEMPLATE",
]);

/**
 * 快照必须排除重建层自身、控制条、氛围光标，以及 sw.js / 调试工具注入的节点，
 * 否则会把遮罩当成页面内容，形成自引用递归（截图里出现无限套娃）。
 */
const SKIP_SELECTOR = [
  ".swarm-experience",
  ".swarm-page-build",
  ".swarm-build-overlay",
  ".swarm-build-curtain",
  ".swarm-build-bar",
  ".swarm-ambient",
  "[data-swarm-build]",
  "[data-swarm-ignore]",
  "[data-swarm-root]",
  "vite-error-overlay",
  "#sw-register",
  "[data-service-worker]",
  "[data-extension-installed]",
  "[data-dsh-overlay]",
  "[data-dsh-root]",
].join(", ");

/**
 * 判断元素是否属于需要排除的注入节点（重建层自身、控制条、sw.js 等）。
 * @param {Element} element 目标元素。
 * @returns {boolean} 是否跳过该元素及其子树。
 */
function isExcluded(element) {
  // 选择器匹配与祖先回溯双重排除，避免任何一层漏判导致自引用递归。
  try {
    if (element.matches(SKIP_SELECTOR)) return true;
    if (element.closest(SKIP_SELECTOR)) return true;
  } catch {
    // 极端环境不支持选择器时退回属性判断。
    const className = element.className;
    if (typeof className === "string" && className.includes("swarm-")) {
      return true;
    }
    return Boolean(
      element.dataset?.swarmBuild !== undefined ||
        element.dataset?.swarmIgnore !== undefined,
    );
  }
  return false;
}

/**
 * 生成跟随当前主题的可见色：优先使用主题令牌，取不到时退回场景常量。
 * @param {string} token 主题令牌名，如 --background。
 * @param {string} fallback 令牌缺失时使用的颜色。
 * @returns {string} 可直接写入场景的 CSS 颜色。
 */
function themeColor(token, fallback) {
  if (typeof document === "undefined" || !document.documentElement) {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  return value || fallback;
}

/**
 * 解析颜色的透明度，用于过滤完全透明的背景与边框。
 * @param {string} color CSS颜色值。
 * @returns {number} 0到1之间的透明度。
 */
function alphaOf(color) {
  if (!color || color === "transparent") return 0;
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return 1;
  const parts = match[1].split(",").map(Number);
  return parts.length > 3 ? parts[3] : 1;
}

/**
 * 判断元素是否具备可绘制尺寸与显示状态。
 * @param {Element} element 目标元素。
 * @param {CSSStyleDeclaration} style 计算样式。
 * @returns {boolean} 是否纳入快照。
 */
function isRenderable(element, style) {
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (Number(style.opacity) < 0.05) return false;
  if (style.position === "fixed") return false;
  const rect = element.getBoundingClientRect();
  return rect.width >= 4 && rect.height >= 4;
}

/**
 * 读取元素计算后的圆角，取最大角并限制在元素尺寸内。
 * @param {CSSStyleDeclaration} style 计算样式。
 * @param {number} width 元素宽度。
 * @param {number} height 元素高度。
 * @returns {number} 可在场景矩形中使用的圆角。
 */
function radiusOf(style, width, height) {
  const radii = [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius,
  ]
    .map((value) => parseFloat(value) || 0)
    .filter((value) => value > 0);
  const raw = radii.length ? Math.max(...radii) : 0;
  return Math.min(raw, width / 2, height / 2);
}

/**
 * 仅当元素直接包含文字时返回文本，避免父子元素重复输入。
 * @param {HTMLElement} element 目标元素。
 * @returns {string} 可输入的文字内容。
 */
function directText(element) {
  if (["INPUT", "TEXTAREA", "SELECT", "OPTION"].includes(element.tagName)) return "";
  let hasOwnText = false;
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      hasOwnText = true;
      break;
    }
  }
  if (!hasOwnText) return "";
  const raw = (element.innerText || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!raw) return "";
  return raw.length > MAX_TEXT_LENGTH
    ? `${raw.slice(0, MAX_TEXT_LENGTH)}…`
    : raw;
}

/**
 * 将DOM计算样式转换为场景文字样式，字体类别与CSS字体栈保持一致。
 * @param {CSSStyleDeclaration} style 计算样式。
 * @returns {object} 场景TextStyle。
 */
function textStyleOf(style) {
  const family = style.fontFamily.toLowerCase();
  const isMono =
    family.includes("mono") ||
    family.includes("consolas") ||
    family.includes("courier");
  const isSerif =
    !isMono &&
    family.includes("serif") &&
    !family.includes("sans-serif");
  const font = isMono
    ? FontKind.MONO
    : isSerif
      ? FontKind.SERIF
      : FontKind.SANS;
  const size = parseFloat(style.fontSize) || 14;
  const lineHeight = parseFloat(style.lineHeight);
  const spacing = parseFloat(style.letterSpacing);
  return {
    font,
    size,
    weight: parseInt(style.fontWeight, 10) || 400,
    lh: Number.isFinite(lineHeight) && size > 0 ? lineHeight / size : 1.5,
    color: style.color || COLORS.ink,
    ls: Number.isFinite(spacing) && size > 0 ? spacing / size : 0,
    pre: true,
  };
}

/**
 * 计算文字块的实际边界，兼容内边距、居中和多行。
 * @param {HTMLElement} element 文字元素。
 * @returns {DOMRect} 文字实际占据的区域。
 */
function textBounds(element) {
  try {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rect = range.getBoundingClientRect();
    range.detach?.();
    if (rect.width > 1 && rect.height > 1) return rect;
  } catch {
    // 取不到Range时退回元素本身。
  }
  return element.getBoundingClientRect();
}

/**
 * 判断元素是否需要绘制底板。
 * @param {HTMLElement} element 目标元素。
 * @param {CSSStyleDeclaration} style 计算样式。
 * @param {DOMRect} rect 元素边界。
 * @returns {boolean} 是否生成矩形任务。
 */
function needsBox(element, style, rect) {
  if (element.tagName === "IMG") return true;
  const hasBackground = alphaOf(style.backgroundColor) > 0.02;
  const hasImage = style.backgroundImage && style.backgroundImage !== "none";
  const borderWidth = parseFloat(style.borderTopWidth) || 0;
  const hasBorder =
    borderWidth > 0.1 &&
    style.borderTopStyle !== "none" &&
    alphaOf(style.borderTopColor) > 0.02;
  if (!hasBackground && !hasImage && !hasBorder) return false;
  const coversViewport =
    rect.width * rect.height > window.innerWidth * window.innerHeight * 0.92;
  return !coversViewport || hasBorder;
}

/**
 * 从当前页面生成可施工场景，坐标为文档坐标，滚动时由引擎逐步解锁。
 * @param {HTMLElement} [root] 快照根节点，默认document.body。
 * @returns {{els:object[],tasks:object[],groups:object[],height:number}|null} 场景数据。
 */
export function buildSnapshotScene(root = document.body) {
  const scene = new SceneBuilder();
  // 主题相关的兜底颜色在这里统一解析，避免逐元素读取计算样式。
  const imageFill = themeColor("--default", COLORS.sand);
  const imageStroke = themeColor("--separator", COLORS.line);
  const lineColor = themeColor("--separator", COLORS.line);
  const pageLeft = window.scrollX;
  const pageTop = window.scrollY;
  const pageHeight = Math.min(
    Math.max(document.documentElement.scrollHeight, window.innerHeight),
    MAX_PAGE_HEIGHT
  );
  let boxCount = 0;
  let textCount = 0;

  /**
   * 递归遍历DOM，父级底板作为子任务的依赖，形成自上而下的施工顺序。
   * @param {Element} element 当前元素。
   * @param {string|null} parentTask 最近的父级矩形任务。
   * @param {boolean} textClaimed 父级是否已经接管文字。
   * @returns {void}
   */
  function walk(element, parentTask, textClaimed) {
    // 自身节点与注入节点在遍历阶段再次排除，保证不会递归快照重建层。
    if (isExcluded(element)) return;
    if (SKIP_TAGS.has(element.tagName)) return;
    const style = getComputedStyle(element);
    if (!isRenderable(element, style)) return;
    const rect = element.getBoundingClientRect();
    const top = rect.top + pageTop;
    if (top + rect.height < -40 || top > pageHeight) return;
    const left = rect.left + pageLeft;

    let boxTask = null;
    if (element.tagName === "HR") {
      if (boxCount < MAX_BOXES) {
        scene.path(
          `b${boxCount}`,
          [
            { x: left, y: top + rect.height / 2 },
            { x: left + rect.width, y: top + rect.height / 2 },
          ],
          {
            stroke: style.borderTopColor || lineColor,
            deps: parentTask ? [parentTask] : [],
          }
        );
        boxTask = `p:b${boxCount}`;
        boxCount += 1;
      }
    } else if (needsBox(element, style, rect)) {
      if (boxCount < MAX_BOXES) {
        const isImage = element.tagName === "IMG";
        const hasBackground = alphaOf(style.backgroundColor) > 0.02;
        const hasImage = style.backgroundImage && style.backgroundImage !== "none";
        const hasBorder =
          parseFloat(style.borderTopWidth) > 0.1 &&
          style.borderTopStyle !== "none" &&
          alphaOf(style.borderTopColor) > 0.02;
        const fill = isImage
          ? imageFill
          : hasBackground
            ? style.backgroundColor
            : hasImage
              ? imageFill
              : "transparent";
        scene.rect(`b${boxCount}`, left, top, rect.width, rect.height, {
          r: radiusOf(style, rect.width, rect.height),
          fill,
          stroke: hasBorder
            ? style.borderTopColor
            : isImage
              ? imageStroke
              : undefined,
          deps: parentTask ? [parentTask] : [],
        });
        boxTask = `r:b${boxCount}`;
        boxCount += 1;
      }
    }

    let claimed = textClaimed;
    if (!claimed) {
      const content = directText(element);
      const fontSize = parseFloat(style.fontSize) || 0;
      if (content && fontSize >= 9 && textCount < MAX_TEXTS) {
        const bounds = textBounds(element);
        const paddingLeft = parseFloat(style.paddingLeft) || 0;
        const paddingRight = parseFloat(style.paddingRight) || 0;
        const width = Math.max(20, rect.width - paddingLeft - paddingRight);
        const align =
          style.textAlign === "center"
            ? "center"
            : style.textAlign === "right" || style.textAlign === "end"
              ? "right"
              : "left";
        scene.text(
          `t${textCount}`,
          left + paddingLeft,
          Math.min(pageHeight - 1, Math.max(top, bounds.top + pageTop)),
          content,
          textStyleOf(style),
          {
            w: width,
            align,
            grow: fontSize >= 26,
            deps: boxTask ? [boxTask] : parentTask ? [parentTask] : [],
          }
        );
        textCount += 1;
        claimed = true;
      }
    }

    for (const child of Array.from(element.children)) {
      walk(child, boxTask ?? parentTask, claimed);
    }
  }

  for (const child of Array.from(root.children)) {
    walk(child, null, false);
  }

  if (scene.tasks.length === 0) return null;
  return {
    els: scene.elements,
    tasks: scene.tasks,
    groups: scene.groups,
    height: pageHeight,
  };
}
