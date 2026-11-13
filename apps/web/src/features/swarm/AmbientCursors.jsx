import React from "react";
import { useSwarm } from "./hooks/useSwarm.js";
import { CursorLayer } from "./components/Cursor.jsx";

/**
 * 空场景工厂：全站光标层只运行光标动画，不向宿主页面绘制任何内容。
 * @returns {{els:object[],tasks:object[],groups:object[],height:number}} 空场景。
 */
function createEmptyScene() {
  return { els: [], tasks: [], groups: [], height: 0 };
}

/**
 * 全站协作光标层：固定在视口上、不拦截指针事件，供Layout在所有页面复用。
 * 减少渲染数量，避免在正文上形成干扰；减少动态偏好下由CSS直接隐藏。
 * @param {{maxCursors?:number}} props 同时显示的光标数量。
 * @returns {React.ReactElement|null} 光标展示层；字体准备完成前为空。
 */
export function AmbientCursors({ maxCursors = 8 }) {
  // 复用完整的场景生命周期，传入空场景后引擎只保留群集飞行与指针避让。
  const engine = useSwarm({ sceneFactory: createEmptyScene, autoStart: true });
  if (!engine) return null;
  return (
    <div className="swarm-experience swarm-ambient" aria-hidden="true">
      <CursorLayer engine={engine} maxCursors={maxCursors} />
    </div>
  );
}
