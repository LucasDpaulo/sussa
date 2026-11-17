import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
const { createCompactWindow } = createRequire(import.meta.url)('../desktop/compact.cjs');
function setup({ maximized = false, fullscreen = false } = {}) {
  const window = new EventEmitter();
  let bounds = { x: 120, y: 90, width: 1000, height: 700 }, minimum = [390, 600], top = false;
  Object.assign(window, {
    getNormalBounds: () => ({ ...bounds }), isMaximized: () => maximized, isFullScreen: () => fullscreen,
    getMinimumSize: () => [...minimum], isAlwaysOnTop: () => top,
    setMinimumSize: (...value) => { minimum = value; }, setBounds: value => { bounds = value; },
    setAlwaysOnTop: value => { top = value; }, unmaximize: () => { maximized = false; }, maximize: () => { maximized = true; },
    setFullScreen: value => { fullscreen = value; if (!value) queueMicrotask(() => window.emit('leave-full-screen')); }
  });
  const events = [];
  return { window, events, compact: createCompactWindow(window, { getDisplayMatching: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }) }, value => events.push(value)) };
}
test('compact mode can resize and pin without losing the original window bounds', async () => {
  const { window, compact } = setup();
  const original = window.getNormalBounds();
  assert.deepEqual(await compact.toggle(), { active: true, pinned: false, pinSupported: true });
  assert.deepEqual(window.getMinimumSize(), [260, 72]);
  assert.equal(window.getNormalBounds().width, 420);
  compact.pin(true); assert.ok(window.isAlwaysOnTop());
  compact.pin(false); assert.ok(!window.isAlwaysOnTop());
  window.setBounds({ x: 500, y: 200, width: 640, height: 400 });
  await compact.toggle();
  assert.deepEqual(window.getNormalBounds(), original);
  assert.deepEqual(window.getMinimumSize(), [390, 600]);
  compact.pin(true); assert.ok(!window.isAlwaysOnTop());
});
test('restores fullscreen and maximized states after compact mode', async () => {
  for (const initial of [{ maximized: true }, { fullscreen: true }]) {
    const { window, compact } = setup(initial);
    await compact.toggle();
    assert.ok(!window.isMaximized() && !window.isFullScreen());
    await compact.toggle();
    if (initial.maximized) assert.ok(window.isMaximized());
    if (initial.fullscreen) assert.ok(window.isFullScreen());
  }
});

test('unsupported backends never report an active pin', async () => {
  const {window} = setup();
  const compact = createCompactWindow(window,{getDisplayMatching:()=>({workArea:{x:0,y:0,width:1920,height:1080}})},()=>{}, {pinSupported:false});
  await compact.toggle();
  assert.deepEqual(compact.pin(true), {active:true,pinned:false,pinSupported:false});
  assert.equal(window.isAlwaysOnTop(),false);
});
