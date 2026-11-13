import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration, formatRemaining, formatMinutes, startTimer, stopTimer, finishTimer, getTimer, remainingSeconds, adjustTimer, getDuration, pauseTimer, resumeTimer, TIMERS_KEY } from '../src/timer.js';

test('parseDuration reads minutes, ranges (low end) and hours in both languages', () => {
  assert.deepEqual(parseDuration('Bake for 20–25 min until set.'), { seconds: 1200, label: '20–25 min' });
  assert.deepEqual(parseDuration('35 Minuten backen.'), { seconds: 2100, label: '35 Minuten' });
  assert.deepEqual(parseDuration('Let rise 1–2 hours.'), { seconds: 3600, label: '1–2 hours' });
  assert.deepEqual(parseDuration('2 Stunden gehen lassen.'), { seconds: 7200, label: '2 Stunden' });
  assert.equal(parseDuration('Fold in the flour.'), null);
  assert.equal(parseDuration('Preheat to 180 °C.', 'Bake 5 min')?.seconds, 300);
});

test('formatRemaining', () => {
  assert.equal(formatRemaining(1200), '20:00');
  assert.equal(formatRemaining(59.2), '1:00');
  assert.equal(formatRemaining(0), '0:00');
  assert.equal(formatRemaining(3661), '1:01:01');
});

test('timer store starts, counts, finishes and stops', () => {
  const key = 'test:0';
  startTimer(key, 600, 1000);
  assert.equal(remainingSeconds(key, 1000), 600);
  assert.equal(remainingSeconds(key, 301000), 300);
  assert.equal(remainingSeconds(key, 999000), 0);
  finishTimer(key);
  assert.equal(getTimer(key).done, true);
  stopTimer(key);
  assert.equal(getTimer(key), null);
});

test('adjustTimer moves idle durations and running ends a minute at a time, never below one minute', () => {
  const key = 'test:adj';
  assert.equal(getDuration(key, 1200), 1200);
  assert.equal(adjustTimer(key, 60, 1200), 1260);
  assert.equal(adjustTimer(key, -60, 1200), 1200);
  assert.equal(adjustTimer(key, -1200, 1200), 60);
  startTimer(key, getDuration(key, 1200), 1000);
  assert.equal(adjustTimer(key, 60, 1200, 1000), 120);
  assert.equal(remainingSeconds(key, 1000), 120);
  assert.equal(adjustTimer(key, -600, 1200, 31000), 60);
  assert.equal(remainingSeconds(key, 31000), 60);
  stopTimer(key);
  assert.equal(formatMinutes(1260), '21 min');
  assert.equal(formatMinutes(7200), '2 h');
});

test('refresh restores running, paused and expired timers separately by recipe and step', async () => {
  const storage = new Map();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  } });
  const now = Date.now();
  let restored;
  const keys = ['brownies:1', 'brownies:2', 'rolls:1'];
  try {
    startTimer(keys[0], 600, now);
    startTimer(keys[1], 600, now);
    pauseTimer(keys[1], now + 120000);
    adjustTimer(keys[1], 60, 600, now + 900000);
    assert.equal(remainingSeconds(keys[1], now + 900000), 540);
    startTimer(keys[2], 60, now - 120000);
    const saved = JSON.parse(storage.get(TIMERS_KEY));
    assert.ok(saved.timers.every(([, entry]) => !('handle' in entry)));
    saved.timers.push(['invalid:0', { endAt: 'bad', total: 60, done: false }]);
    storage.set(TIMERS_KEY, JSON.stringify(saved));
    restored = await import(`../src/timer.js?refresh=${now}`);
    assert.ok(restored.remainingSeconds(keys[0]) > 590);
    assert.equal(restored.getTimer(keys[1]).remaining, 540);
    assert.equal(restored.remainingSeconds(keys[1], now + 900000), 540);
    assert.equal(restored.getTimer(keys[2]).done, true);
    assert.equal(restored.getTimer('invalid:0'), null);
    restored.resumeTimer(keys[1], now + 900000);
    assert.equal(restored.remainingSeconds(keys[1], now + 960000), 480);
    restored.stopTimer(keys[1]);
    assert.ok(!JSON.parse(storage.get(TIMERS_KEY)).timers.some(([key]) => key === keys[1]));
    pauseTimer(keys[2], now);
    assert.equal(getTimer(keys[2]).done, true);
    resumeTimer(keys[2], now);
    assert.equal(getTimer(keys[2]).done, true);
  } finally {
    keys.forEach((key) => { stopTimer(key); restored?.stopTimer(key); });
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

test('unavailable storage does not prevent pause and resume', () => {
  startTimer('private:1', 120, 1000);
  pauseTimer('private:1', 31000);
  assert.equal(remainingSeconds('private:1', 999999), 90);
  resumeTimer('private:1', 50000);
  assert.equal(remainingSeconds('private:1', 80000), 60);
  stopTimer('private:1');
});

test('bell, timer and bite audio wait for resume and reuse one WebKit context', async () => {
  const instances = [];
  let completeResume;
  let tones = 0;
  let bursts = 0;
  let filters = 0;
  const param = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  class Context {
    state = 'suspended'; currentTime = 0; sampleRate = 44100; destination = {};
    constructor() { instances.push(this); }
    resume() { return new Promise((resolve) => { completeResume = () => { this.state = 'running'; resolve(); }; }); }
    createBuffer(ch, len) { const arr = new Float32Array(len); return { length: len, getChannelData: () => arr }; }
    createBufferSource() { return { connect: (n) => n, disconnect() {}, start: () => bursts++, stop() {} }; }
    createBiquadFilter() { filters++; return { frequency: param(), Q: {}, connect: (n) => n, disconnect() {} }; }
    createOscillator() { return { frequency: param(), connect: (n) => n, start: () => tones++, stop() {} }; }
    createGain() { return { gain: param(), connect: (n) => n, disconnect() {} }; }
  }
  globalThis.webkitAudioContext = Context;
  const session = {};
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { audioSession: session } });
  try {
    const sound = await import('../src/audio.js?test');
    const pending = sound.ring();
    assert.equal(session.type, 'playback');
    assert.equal(instances.length, 1);
    assert.equal(tones, 0);
    completeResume();
    await pending;
    assert.equal(tones, 3);
    await sound.primeAudio();
    await sound.ring();
    assert.equal(instances.length, 1);
    assert.equal(tones, 6);
    const burstsBeforeBites = bursts;
    await sound.bite(0);
    await sound.bite(1);
    await sound.bite(2);
    assert.equal(instances.length, 1);
    assert.equal(tones, 9);
    assert.equal(bursts - burstsBeforeBites, 3);
    assert.equal(filters, 6);
    instances[0].state = 'interrupted';
    const again = sound.ring();
    completeResume();
    await again;
    assert.equal(tones, 12);
  } finally {
    delete globalThis.webkitAudioContext;
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
  }
});
