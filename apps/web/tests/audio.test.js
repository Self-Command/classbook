import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_AUDIO_STATE,
  normalizeAudioState,
  readAudioState,
  writeAudioState,
} from '../src/features/swarm/audio.js';

function fakeStorage(initial) {
  const data = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    dump: () => Object.fromEntries(data),
  };
}

test('默认开启音效且音量为55%', () => {
  assert.deepEqual(DEFAULT_AUDIO_STATE, { enabled: true, volume: 0.55 });
  assert.deepEqual(normalizeAudioState(null), DEFAULT_AUDIO_STATE);
});

test('音量限制在0到1之间并规范化布尔值', () => {
  assert.deepEqual(normalizeAudioState({ enabled: false, volume: 1.8 }), {
    enabled: false,
    volume: 1,
  });
  assert.deepEqual(normalizeAudioState({ enabled: true, volume: -2 }), {
    enabled: true,
    volume: 0,
  });
  assert.deepEqual(normalizeAudioState({ enabled: 'yes', volume: '0.3' }), {
    enabled: true,
    volume: 0.3,
  });
  assert.deepEqual(normalizeAudioState({ enabled: null, volume: 'nope' }), DEFAULT_AUDIO_STATE);
});

test('从存储恢复音效设置', () => {
  const storage = fakeStorage({
    'classbook:swarm-audio': JSON.stringify({ enabled: false, volume: 0.72 }),
  });
  assert.deepEqual(readAudioState(storage), { enabled: false, volume: 0.72 });
});

test('存储损坏或缺失时回退默认值', () => {
  assert.deepEqual(readAudioState(fakeStorage()), DEFAULT_AUDIO_STATE);
  assert.deepEqual(
    readAudioState(fakeStorage({ 'classbook:swarm-audio': '{broken' })),
    DEFAULT_AUDIO_STATE,
  );
});

test('写入设置后可原样读回', () => {
  const storage = fakeStorage();
  writeAudioState(storage, { enabled: false, volume: 0.25 });
  assert.deepEqual(readAudioState(storage), { enabled: false, volume: 0.25 });
});
