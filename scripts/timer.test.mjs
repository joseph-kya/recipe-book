import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration, formatRemaining, startTimer, stopTimer, finishTimer, getTimer, remainingSeconds } from '../src/timer.js';

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
