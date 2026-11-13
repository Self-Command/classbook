import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Gauge, Home, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { SwarmEngine } from "./animation/SwarmEngine.js";
import { TaskState } from "./animation/config.js";
import { SceneElements } from "./components/SceneElements.jsx";
import { CursorLayer } from "./components/Cursor.jsx";
import { buildSnapshotScene } from "./scene/snapshot.js";
import { AmbientCursors } from "./AmbientCursors.jsx";
import { swarmAudio } from "./audio.js";

/**
 * 准备阶段的最长等待时间：超时后使用当前已有内容生成快照，
 * 保证首屏不会因为骨架屏或字体服务而无限等待。
 */
const CONTENT_WAIT_MS = 1600;
const CONTENT_POLL_MS = 110;
const FONT_WAIT_MS = 500;
const LAYOUT_SETTLE_MS = 140;
/** 重建层出现后允许的最长施工时长，超时直接收尾，避免长时间挡住真实页面。 */
const MAX_BUILD_MS = 8000;
/** 遮罩淡出时长，必须与styles/build.css中的transition保持一致。 */
const LEAVE_MS = 420;

/**
 * 读取系统「减少动态效果」偏好；SSR与旧浏览器按未开启处理。
 * @returns {boolean} 是否需要跳过全部动画。
 */
function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * 等待若干毫秒，用于准备阶段的分步采样。
 * @param {number} ms 等待时长。
 * @returns {Promise<void>} 定时结束后兑现。
 */
function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * 全站页面重建层：快照当前页面DOM，用光标从首屏开始重新绘制，
 * 滚动时继续施工，完成后淡出到真实页面。底部bar提供重播、速度和完成。
 *
 * 生命周期约定：每个路由只允许存在一个实例；路由切换、重播或卸载时
 * 通过runRef令牌终止旧实例的定时器、rAF、滚动监听并还原滚动锁。
 * @returns {React.ReactElement} 重建层、控制bar与落幕后的氛围光标。
 */
export function SwarmPageBuild() {
  const location = useLocation();
  const navigate = useNavigate();
  const [build, setBuild] = useState(null);
  // 减少动态效果时完全不挂载重建层与氛围光标，也不锁定滚动。
  const [active, setActive] = useState(() => !prefersReducedMotion());
  const [preparing, setPreparing] = useState(() => !prefersReducedMotion());
  const [speed, setSpeed] = useState(1);
  const [runId, setRunId] = useState(0);
  const initialAudio = useRef(swarmAudio.getState());
  const [muted, setMuted] = useState(() => !initialAudio.current.enabled);
  const [volume, setVolume] = useState(() => initialAudio.current.volume);
  const [, setFrame] = useState(0);
  const finishRef = useRef(null);
  const speedRef = useRef(1);
  const engineRef = useRef(null);
  const runRef = useRef(0);
  // 单一所有者滚动锁：只有加锁的那次运行可以还原，避免新旧实例互相覆盖原值。
  const scrollLockRef = useRef({ owner: null });

  // 运行期间用户在系统设置里切换「减少动态效果」时，立即收尾并停止后续实例。
  // 只监听变化事件，避免与初始化状态不一致导致挂载后多跑一次重建。
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setActive(!media.matches);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // 浏览器只允许在用户手势后播放音频；首次点击/按键时懒解锁。
  useEffect(() => {
    if (!active) return undefined;
    const unlock = () => {
      swarmAudio.resume();
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock);
    };
  }, [active]);

  useEffect(() => {
    // location.key用于区分同一个pathname上的不同历史记录，缺失时避免无谓重建。
    if (!active || !location.key) return undefined;

    const run = ++runRef.current;
    let cancelled = false;
    /** 判断本次运行是否已经被更新的运行或卸载取代。 */
    const stale = () => cancelled || runRef.current !== run;
    const timers = new Set();
    const frame = { id: 0, tick: null };

    /**
     * 登记定时器，便于在收尾时一次性清理。
     * @param {Function} callback 定时回调。
     * @param {number} ms 延迟时长。
     * @returns {number} 定时器句柄。
     */
    const later = (callback, ms) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        callback();
      }, ms);
      timers.add(id);
      return id;
    };

    /** 锁定页面滚动，记录原始overflow与paddingRight以便精确还原。 */
    const lockScroll = () => {
      const lock = scrollLockRef.current;
      if (lock.owner !== null) return;
      const root = document.documentElement;
      const body = document.body;
      lock.owner = run;
      lock.rootOverflow = root.style.overflow;
      lock.bodyOverflow = body.style.overflow;
      lock.bodyPaddingRight = body.style.paddingRight;
      root.style.overflow = "hidden";
      body.style.overflow = "hidden";
      // 补偿滚动条宽度，避免锁定瞬间页面横向抖动。
      const gap = window.innerWidth - root.clientWidth;
      if (gap > 0) {
        lock.paddingRight = `${gap}px`;
        body.style.paddingRight = lock.paddingRight;
      }
    };

    /** 还原锁定前记录的原始值；不是加锁者时不做任何修改。 */
    const unlockScroll = () => {
      const lock = scrollLockRef.current;
      if (lock.owner !== run) return;
      lock.owner = null;
      document.documentElement.style.overflow = lock.rootOverflow ?? "";
      document.body.style.overflow = lock.bodyOverflow ?? "";
      document.body.style.paddingRight = lock.bodyPaddingRight ?? "";
    };

    /** 注销挂在引擎实例上的事件监听并显式停止引擎推进。 */
    const releaseEngine = (engine) => {
      if (!engine) return;
      for (const off of engine.listeners ?? []) off();
      engine.listeners = [];
      // 引擎自身不持有定时器与rAF，stop()只是封存状态，防止残留帧继续推进。
      engine.stop();
    };

    /** 清理本次运行的全部异步资源：rAF、定时器与滚动监听。 */
    const cleanup = () => {
      cancelAnimationFrame(frame.id);
      frame.id = 0;
      frame.tick = null;
      for (const id of timers) clearTimeout(id);
      timers.clear();
      releaseEngine(engineRef.current);
      unlockScroll();
      engineRef.current = null;
    };

    /** 完成施工：淡出遮罩并在过渡结束后从DOM移除，随后彻底释放资源。 */
    const finish = () => {
      if (stale()) return;
      finishRef.current = null;
      cancelAnimationFrame(frame.id);
      frame.id = 0;
      frame.tick = null;
      // 先停掉滚动监听，避免遮罩淡出期间继续推进施工。
      releaseEngine(engineRef.current);
      unlockScroll();
      setBuild((current) => (current ? { ...current, leaving: true } : current));
      later(() => {
        if (stale()) return;
        engineRef.current = null;
        setBuild(null);
      }, LEAVE_MS);
    };

    /** 放弃重建：清空遮罩并还原滚动，用于快照失败或运行被取代。 */
    const abort = () => {
      if (stale()) return;
      cancelAnimationFrame(frame.id);
      frame.id = 0;
      frame.tick = null;
      releaseEngine(engineRef.current);
      unlockScroll();
      engineRef.current = null;
      finishRef.current = null;
      setPreparing(false);
      setBuild(null);
    };

    setPreparing(true);
    setBuild(null);
    lockScroll();

    /**
     * 等待首屏文字出现后再快照，避免把加载骨架当成页面内容。
     * @returns {Promise<void>} 内容稳定或超时后兑现。
     */
    const waitForContent = async () => {
      const main = document.querySelector("main");
      const deadline = performance.now() + CONTENT_WAIT_MS;
      while (!stale() && performance.now() < deadline) {
        if (main && main.innerText.trim().length > 20) return;
        await delay(CONTENT_POLL_MS);
      }
    };

    const startBuild = async () => {
      await waitForContent();
      if (stale()) return;
      if (document.fonts?.ready) {
        // 字体服务不可达时不能让重建层一直等待，超时后使用回退字体快照。
        // 超时分支落败时主动清掉定时器，避免留下多余的挂起定时器。
        let fontTimer = 0;
        const fontTimeout = new Promise((resolve) => {
          fontTimer = window.setTimeout(() => {
            timers.delete(fontTimer);
            resolve();
          }, FONT_WAIT_MS);
          timers.add(fontTimer);
        });
        await Promise.race([
          document.fonts.ready.catch(() => undefined),
          fontTimeout,
        ]);
        clearTimeout(fontTimer);
        timers.delete(fontTimer);
      }
      await delay(LAYOUT_SETTLE_MS);
      if (stale()) return;

      const main = document.querySelector("main");
      const scene = buildSnapshotScene(document.body);
      if (!scene) {
        abort();
        return;
      }

      // 背景优先使用主题令牌（切换 noir/marine/forest 时实时跟随），
      // 只有宿主容器带自定义底色时才退回其计算颜色。
      const layout = main?.parentElement;
      const layoutColor = layout ? getComputedStyle(layout).backgroundColor : "";
      const themeBackground = getComputedStyle(
        document.documentElement,
      ).getPropertyValue("--background");
      const background =
        themeBackground && themeBackground.trim()
          ? "var(--background)"
          : layoutColor && layoutColor !== "rgba(0, 0, 0, 0)"
            ? layoutColor
            : "var(--background)";
      const overlayHeight = Math.max(
        document.documentElement.scrollHeight,
        window.innerHeight,
      );
      const width = document.documentElement.clientWidth;

      const engine = new SwarmEngine({ sceneFactory: () => scene });
      // 快照使用文档坐标；覆盖层按整页高度铺开，滚动时由引擎解锁后续任务。
      engine.vp = {
        scrollY: window.scrollY,
        vh: window.innerHeight,
        vw: window.innerWidth,
        s: 1,
        left: 0,
      };
      engine.setScroll(window.scrollY);
      engine.start();
      if (import.meta.env.DEV) {
        window.__swarmBuild = engine;
        window.__swarmAudio = swarmAudio;
      }

      // 监听器统一登记在引擎实例上，收尾时按实例释放，不会误删新实例的监听。
      const onScroll = () => engine.setScroll(window.scrollY);
      window.addEventListener("scroll", onScroll, { passive: true });
      engine.listeners = [
        () => window.removeEventListener("scroll", onScroll),
      ];
      engineRef.current = engine;

      unlockScroll();
      setPreparing(false);
      setBuild({
        engine,
        width,
        height: overlayHeight,
        background,
        leaving: false,
      });

      const startedAt = performance.now();
      let last = startedAt;
      frame.tick = (now) => {
        frame.id = 0;
        if (stale() || engineRef.current !== engine) return;
        const delta = (now - last) / 1000;
        last = now;
        // 引擎单步上限为0.05秒，倍速通过同帧多步推进而不是放大delta。
        for (let index = 0; index < speedRef.current; index += 1) {
          engine.step(delta);
        }
        setFrame((tickCount) => tickCount + 1);
        const done = engine.tasks.every(
          (task) => task.state === TaskState.DONE,
        );
        if (done || now - startedAt > MAX_BUILD_MS) {
          // 只有真正完成全部任务才播放收尾和弦；跳过或超时静默收尾。
          if (done) swarmAudio.chord();
          finish();
          return;
        }
        frame.id = requestAnimationFrame(frame.tick);
      };
      frame.id = requestAnimationFrame(frame.tick);
    };

    finishRef.current = finish;
    void startBuild();

    return () => {
      cancelled = true;
      cleanup();
      finishRef.current = null;
      // 卸载或切换路由时立即移除遮罩，避免遗留全屏节点拦截点击。
      setBuild(null);
      setPreparing(false);
      engineRef.current = null;
    };
  }, [location.key, runId, active]);

  const replay = () => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setRunId((id) => id + 1);
  };

  const cycleSpeed = () => {
    const next = speed >= 3 ? 1 : speed + 1;
    speedRef.current = next;
    setSpeed(next);
  };

  /** 静音或音量为0时统一显示为静音，避免图标与实际听感不一致。 */
  const silent = muted || volume < 0.01;

  /** 切换静音；从0音量恢复时给一个可听但克制的默认音量。 */
  const toggleMute = () => {
    swarmAudio.resume();
    if (silent) {
      if (volume < 0.01) {
        swarmAudio.setVolume(0.55);
        setVolume(0.55);
      }
      swarmAudio.setEnabled(true);
      setMuted(false);
      return;
    }
    swarmAudio.setEnabled(false);
    setMuted(true);
  };

  /** 拖动滑杆实时调整音量；从0调高时自动解除静音。 */
  const changeVolume = (event) => {
    const next = Number(event.target.value) / 100;
    swarmAudio.setVolume(next);
    setVolume(next);
    if (next < 0.01) {
      swarmAudio.setEnabled(false);
      setMuted(true);
    } else if (muted) {
      swarmAudio.setEnabled(true);
      setMuted(false);
    }
  };

  if (!active) return null;

  const total = build ? build.engine.tasks.length : 0;
  const done = build
    ? build.engine.tasks.filter((task) => task.state === TaskState.DONE).length
    : 0;

  return (
    <>
      <AmbientCursors maxCursors={5} />
      {preparing
        ? createPortal(
            <div
              className="swarm-experience swarm-build-curtain"
              data-swarm-build
              role="status"
              aria-live="polite"
              style={{ background: "var(--background)" }}
            >
              <span className="swarm-build-curtain__label">
                <span className="swarm-build-curtain__dot" aria-hidden="true" />
                正在准备页面重建…
              </span>
            </div>,
            document.body,
          )
        : null}
      {build
        ? createPortal(
            <>
              <div
                className={`swarm-experience swarm-build-overlay${
                  build.leaving ? " is-leaving" : ""
                }`}
                data-swarm-build
                style={{ background: build.background, height: build.height }}
              >
                <div
                  className="canvas"
                  aria-hidden="true"
                  style={{ width: build.width, height: build.height }}
                >
                  <SceneElements
                    elements={build.engine.list}
                    height={build.height}
                    width={build.width}
                  />
                  <CursorLayer engine={build.engine} maxCursors={14} />
                </div>
              </div>
              <div className="swarm-build-bar-anchor">
                <div
                  className="swarm-build-bar"
                  data-swarm-ignore
                  role="toolbar"
                  aria-label="页面重建控制"
                >
                  <span className="swarm-build-bar__status">
                    <span className="swarm-build-bar__dot" aria-hidden="true" />
                    {done === total ? (
                      "重建完成"
                    ) : (
                      <>
                        <span className="swarm-build-bar__prefix">已重建 </span>
                        <span className="swarm-build-bar__count">
                          {done}/{total}
                        </span>
                        <span className="swarm-build-bar__hint">
                          {" "}
                          · 向下滚动
                        </span>
                      </>
                    )}
                  </span>
                  <span className="swarm-build-bar__divider" aria-hidden="true" />
                  <div className="swarm-build-bar__actions">
                    <button
                      type="button"
                      onClick={() => {
                        if (location.pathname === "/") replay();
                        else navigate("/");
                      }}
                      aria-label="回到首页"
                    >
                      <Home aria-hidden="true" />
                      <span className="swarm-build-bar__label">首页</span>
                    </button>
                    <button
                      type="button"
                      onClick={replay}
                      aria-label="重新播放重建动画"
                    >
                      <RotateCcw aria-hidden="true" />
                      <span className="swarm-build-bar__label">重播</span>
                    </button>
                    <button
                      type="button"
                      onClick={cycleSpeed}
                      aria-label={`动画速度 ${speed} 倍，点击切换`}
                    >
                      <Gauge aria-hidden="true" />
                      <span>{speed}×</span>
                    </button>
                    <button
                      type="button"
                      className="is-primary"
                      onClick={() => finishRef.current?.()}
                      aria-label="完成重建并进入页面"
                    >
                      <Check aria-hidden="true" />
                      <span className="swarm-build-bar__label">完成</span>
                    </button>
                  </div>
                  <span className="swarm-build-bar__divider" aria-hidden="true" />
                  <div className="swarm-build-bar__volume">
                    <button
                      type="button"
                      onClick={toggleMute}
                      aria-label={silent ? "开启音效" : "关闭音效"}
                      aria-pressed={!silent}
                      title={silent ? "开启音效" : "关闭音效"}
                    >
                      {silent ? (
                        <VolumeX aria-hidden="true" />
                      ) : (
                        <Volume2 aria-hidden="true" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(volume * 100)}
                      onChange={changeVolume}
                      onPointerDown={() => swarmAudio.resume()}
                      className="swarm-build-bar__volume-range"
                      aria-label="音效音量"
                      aria-valuetext={`${Math.round(volume * 100)}%`}
                    />
                  </div>
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
