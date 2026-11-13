import { SceneBuilder } from "./scene-builder.js";
import { createNavigation } from "./sections/navigation.js";
import { createHero } from "./sections/hero.js";
import { createCover } from "./sections/cover.js";
import { createPhotoWall } from "./sections/photo-wall.js";
import { createMessageWall } from "./sections/message-wall.js";
import { createTimeline } from "./sections/timeline.js";
import { createClosing } from "./sections/closing.js";
import { createFooter } from "./sections/footer.js";

/** 页面设计画布总高度，包含页脚下方留白。 */
export const PAGE_HEIGHT = 4760;

/**
 * 按页面从上至下的顺序组装可编辑场景和施工任务。
 * 依次为：开场、封面拼装、照片墙、留言墙、时间线、结尾 CTA、页脚。
 * @param {() => number} getWorkerCount 由动画引擎提供的实际施工人数。
 * @returns {{els:object[],tasks:object[],groups:object[],height:number}} 场景元素、依赖任务、重复组与设计高度。
 */
export function createScene(getWorkerCount) {
  // 每个区块由独立源码文件定义，修改文案和几何时无需触碰动画调度器。
  const scene = new SceneBuilder();
  createNavigation(scene);
  createHero(scene);
  createCover(scene);
  createPhotoWall(scene);
  createMessageWall(scene);
  createTimeline(scene);
  createClosing(scene, getWorkerCount);
  createFooter(scene);
  return {
    els: scene.elements,
    tasks: scene.tasks,
    groups: scene.groups,
    height: PAGE_HEIGHT,
  };
}
