/**
 * 页面重建音效：使用Web Audio实时合成，不依赖音频文件。
 * 首次用户手势后解锁；音量与静音状态由底部控制条维护并持久化。
 */
export const AUDIO_STORAGE_KEY = "classbook:swarm-audio";
export const DEFAULT_AUDIO_STATE = Object.freeze({
  enabled: true,
  volume: 0.55,
});

let context = null;
let master = null;
let enabled = DEFAULT_AUDIO_STATE.enabled;
let volume = DEFAULT_AUDIO_STATE.volume;
let lastClickAt = 0;
let lastTickAt = 0;
let lastNoteAt = 0;
const plays = { click: 0, tick: 0, note: 0, chord: 0 };

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/**
 * 把任意输入规范化为可用的音效设置，非法值回退默认值。
 * @param {unknown} input 待规范化的设置。
 * @returns {{enabled:boolean,volume:number}} 合法设置。
 */
export function normalizeAudioState(input) {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_AUDIO_STATE };
  }
  const enabledValue =
    typeof input.enabled === "boolean"
      ? input.enabled
      : DEFAULT_AUDIO_STATE.enabled;
  const rawVolume =
    typeof input.volume === "number" ? input.volume : Number(input.volume);
  const volumeValue = Number.isFinite(rawVolume)
    ? clamp(rawVolume)
    : DEFAULT_AUDIO_STATE.volume;
  return { enabled: enabledValue, volume: volumeValue };
}

/**
 * 从 localStorage 读取音效设置；不可用或损坏时返回默认值。
 * @param {Storage|null} storage 存储实现。
 * @returns {{enabled:boolean,volume:number}} 音效设置。
 */
export function readAudioState(storage) {
  if (!storage) return { ...DEFAULT_AUDIO_STATE };
  try {
    const raw = storage.getItem(AUDIO_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_STATE };
    return normalizeAudioState(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_AUDIO_STATE };
  }
}

/**
 * 写入音效设置；隐私模式下写失败时静默忽略。
 * @param {Storage|null} storage 存储实现。
 * @param {{enabled:boolean,volume:number}} state 音效设置。
 * @returns {void}
 */
export function writeAudioState(storage, state) {
  if (!storage) return;
  try {
    storage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(normalizeAudioState(state)));
  } catch {
    // 隐私模式或配额不足时不影响播放。
  }
}

/**
 * 取得可用的 localStorage；浏览器禁用存储时返回 null。
 * @returns {Storage|null} 存储实现。
 */
function getStorage() {
  try {
    return typeof window !== "undefined" && window.localStorage
      ? window.localStorage
      : null;
  } catch {
    return null;
  }
}

/** 把内存中的设置写回存储。 */
function persist() {
  writeAudioState(getStorage(), { enabled, volume });
}

// 浏览器端在模块加载时恢复上次的音量/静音设置；Node 测试环境保持默认值。
if (typeof window !== "undefined") {
  const stored = readAudioState(getStorage());
  enabled = stored.enabled;
  volume = stored.volume;
}

/**
 * 创建音频上下文与总音量节点；只在用户手势后调用。
 * @returns {AudioContext|null} 可用的音频上下文。
 */
function ensure() {
  if (context) return context;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  context = new AudioContextClass();
  master = context.createGain();
  master.gain.value = enabled ? volume : 0;
  master.connect(context.destination);
  return context;
}

/**
 * 创建声像节点，浏览器不支持时直接接到总音量。
 * @param {number} pan 声像位置，-1到1。
 * @returns {AudioNode} 输出节点。
 */
function output(pan) {
  if (context.createStereoPanner) {
    const panner = context.createStereoPanner();
    panner.pan.value = clamp(pan, -1, 1);
    panner.connect(master);
    return panner;
  }
  return master;
}

/**
 * 播放一个短促音符。
 * @param {number} frequency 频率。
 * @param {number} duration 持续时间，秒。
 * @param {number} gain 峰值音量。
 * @param {OscillatorType} type 波形。
 * @param {number} pan 声像。
 * @param {number} delay 延迟开始时间，秒。
 * @returns {void}
 */
function tone(frequency, duration, gain, type, pan, delay = 0) {
  if (!context || context.state !== "running" || !enabled || volume <= 0) {
    return;
  }
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.006);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope);
  envelope.connect(output(pan));
  oscillator.start(start);
  oscillator.stop(start + duration + 0.04);
}

/**
 * 当前时间戳，用于给高频音效做节流。
 * @returns {number} 毫秒时间戳。
 */
function now() {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

/**
 * 解锁音频上下文。浏览器要求音频在用户手势后启动。
 * @returns {void}
 */
function resume() {
  const audio = ensure();
  if (audio && audio.state !== "running") {
    audio.resume().catch(() => undefined);
  }
}

/**
 * 设置静音状态并持久化。
 * @param {boolean} value 是否启用声音。
 * @returns {void}
 */
function setEnabled(value) {
  enabled = Boolean(value);
  persist();
  if (master && context) {
    master.gain.setTargetAtTime(enabled ? volume : 0, context.currentTime, 0.02);
  }
}

/**
 * 设置总音量并持久化。
 * @param {number} value 0到1。
 * @returns {void}
 */
function setVolume(value) {
  volume = clamp(Number(value) || 0);
  persist();
  if (master && context && enabled) {
    master.gain.setTargetAtTime(volume, context.currentTime, 0.02);
  }
}

/**
 * 返回当前音效设置，供控制条初始化。
 * @returns {{enabled:boolean,volume:number}} 当前设置。
 */
function getState() {
  return { enabled, volume };
}

/**
 * 调试信息：浏览器验收可据此确认音频是否真的在运行。
 * @returns {{enabled:boolean,volume:number,contextState:string|null,masterGain:number|null,plays:object}} 调试快照。
 */
function getDebugInfo() {
  return {
    enabled,
    volume,
    contextState: context ? context.state : null,
    masterGain: master ? master.gain.value : null,
    plays: { ...plays },
  };
}

/** 光标点击落笔的短促木质感。 */
function click(pan = 0.5) {
  const stamp = now();
  if (stamp - lastClickAt < 45) return;
  lastClickAt = stamp;
  if (!context || context.state !== "running" || !enabled || volume <= 0) return;
  plays.click += 1;
  tone(170, 0.09, 0.05, "triangle", pan);
  tone(920, 0.028, 0.022, "sine", pan);
}

/** 文字施工时机械键盘般的轻响。 */
function tick(pan = 0.5) {
  const stamp = now();
  if (stamp - lastTickAt < 50) return;
  lastTickAt = stamp;
  if (!context || context.state !== "running" || !enabled || volume <= 0) return;
  plays.tick += 1;
  tone(1350 + Math.random() * 650, 0.026, 0.016, "triangle", pan);
}

/**
 * 元素完成时播放五声音阶拨弦。
 * @param {number} frequency 音高。
 * @param {number} pan 声像。
 */
function note(frequency, pan = 0.5) {
  const stamp = now();
  if (stamp - lastNoteAt < 110) return;
  lastNoteAt = stamp;
  if (!context || context.state !== "running" || !enabled || volume <= 0) return;
  plays.note += 1;
  tone(frequency, 0.62, 0.048, "sine", pan);
  tone(frequency * 2, 0.3, 0.014, "triangle", pan);
}

/** 整页重建完成的柔和和弦。 */
function chord() {
  if (!context || context.state !== "running" || !enabled || volume <= 0) return;
  plays.chord += 1;
  tone(329.63, 1.2, 0.04, "sine", 0.35, 0);
  tone(415.3, 1.1, 0.03, "sine", 0.5, 0.09);
  tone(493.88, 1, 0.028, "sine", 0.62, 0.18);
  tone(659.25, 0.9, 0.018, "triangle", 0.72, 0.27);
}

export const swarmAudio = {
  resume,
  setEnabled,
  setVolume,
  getState,
  getDebugInfo,
  click,
  tick,
  note,
  chord,
};
