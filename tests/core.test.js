import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, advance, total, bounds, buckets, embedUrl } from '../src/core.js';
test('background elapsed time is capped, counted once, and stops timer', () => {
  const s = initialState(); s.running = true; s.cursor = 1000; s.remaining = 5000;
  assert.equal(advance(s, 20000), true); assert.equal(s.sessions[0].end, 6000);
  advance(s, 30000); assert.equal(s.completed, 1); assert.equal(s.sessions.length, 1);
});
test('pauses excluded and room switch attributes each interval correctly', () => {
  const s = initialState(); s.running = true; s.cursor = 1000;
  advance(s, 2000); s.room = 'work'; advance(s, 4000); s.mode = 'short'; advance(s, 5000);
  assert.equal(total(s.sessions, 0, 99999, 'study'), 1000); assert.equal(total(s.sessions, 0, 99999, 'work'), 2000);
});
test('session crossing midnight is split by the requested reporting window', () => {
  const start = +new Date(2026, 10, 11, 23, 50), end = +new Date(2026, 10, 12, 0, 10);
  const [a, b] = bounds('day', new Date(2026, 10, 12));
  assert.equal(total([{start, end, room:'study'}], a, b), 600000);
  assert.equal(buckets([], 'year').length, 12); assert.equal(buckets([], 'week').length, 7);
});
test('only supported media hosts and valid IDs can create embeds', () => {
  assert.equal(embedUrl('javascript:alert(1)'), null); assert.equal(embedUrl('https://youtube.com.evil.com/watch?v=jfKfPfyJRdk'), null);
  assert.equal(embedUrl('https://youtu.be/jfKfPfyJRdk'), 'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk');
});
