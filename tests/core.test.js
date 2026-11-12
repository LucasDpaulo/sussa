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

test('current streak sums consecutive local focus days, including midnight splits', async () => {
  const { focusStreak } = await import('../src/core.js');
  const now = new Date(2026, 10, 12, 12);
  const session = (day, hour, minutes) => ({room:'study',start:+new Date(2026,10,day,hour),end:+new Date(2026,10,day,hour,minutes)});
  assert.deepEqual(focusStreak([], now), {days:0,time:0});
  assert.deepEqual(focusStreak([session(10,10,30)], now), {days:0,time:0});
  assert.deepEqual(focusStreak([session(10,10,30),session(11,10,20)], now), {days:2,time:50*60000});
  assert.deepEqual(focusStreak([session(10,10,30),session(12,10,20)], now), {days:1,time:20*60000});
  const crossing = {room:'work',start:+new Date(2026,10,11,23,50),end:+new Date(2026,10,12,0,10)};
  assert.deepEqual(focusStreak([crossing,session(12,9,10)], now), {days:2,time:30*60000});
  assert.deepEqual(focusStreak([session(13,9,30)], now), {days:0,time:0});
});

test('rolling periods include today and the preceding local calendar days', () => {
  const date = new Date(2026, 10, 12, 15);
  const [start, end] = bounds('last7', date);
  assert.equal(+start, +new Date(2026, 10, 6));
  assert.equal(+end, +new Date(2026, 10, 13));
  assert.equal(buckets([], 'last7', date).length, 7);
  assert.equal(buckets([], 'last14', date).length, 14);
});
