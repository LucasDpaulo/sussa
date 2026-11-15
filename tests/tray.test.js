import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trayView } from '../src/tray.js';

const base = { mode: 'focus', room: 'study', durations: { focus: 50, short: 10, long: 20 }, running: true, remaining: 24 * 60000 + 13000 };

test('running timer shows rounded-up minutes and the end time', () => {
  const now = new Date(2026, 10, 15, 14, 0, 0).getTime();
  const view = trayView(base, now);
  assert.equal(view.text, '25');
  assert.equal(view.title, 'Foco · Estudos');
  assert.match(view.detail, /^25 min restantes · até 14:24$/);
  assert.equal(view.action, 'Pausar');
  assert.ok(Math.abs(view.progress - (24 * 60 + 13) / (50 * 60)) < 1e-9);
});

test('paused, fresh, finished and long timers', () => {
  assert.deepEqual(
    (({ title, detail, action }) => ({ title, detail, action }))(trayView({ ...base, running: false, mode: 'short', room: 'work', remaining: 4 * 60000 + 13000 })),
    { title: 'Pausa curta · Trabalho', detail: 'Pausado · 4:13 restantes', action: 'Retomar' });
  assert.equal(trayView({ ...base, running: false, remaining: 50 * 60000 }).action, 'Iniciar');
  const done = trayView({ ...base, running: false, remaining: 0 });
  assert.deepEqual([done.text, done.detail, done.action], ['✓', 'Sessão concluída', 'Nova sessão']);
  assert.equal(trayView({ ...base, durations: { ...base.durations, focus: 240 }, remaining: 180 * 60000 }).text, '3h');
  assert.equal(trayView({ ...base, remaining: 5000 }).text, '1');
  assert.deepEqual([trayView(base).clock, trayView({ ...base, remaining: 5000 }).clock, done.clock], ['24:13', '0:05', '✓ 0:00']);
  assert.equal(trayView({ ...base, durations: { ...base.durations, focus: 240 }, remaining: (2 * 3600 + 5 * 60 + 9) * 1000 }).clock, '2:05:09');
});
