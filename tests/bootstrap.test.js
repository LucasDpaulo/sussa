import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync(new URL('../desktop/bootstrap.cjs', import.meta.url), 'utf8');
function boot({ platform='linux', env={DISPLAY:':0'}, argv=['/opt/Sussa/sussa'] }={}) {
  const actions=[];
  runInNewContext(source, { process: { platform, env, argv, execPath:argv[0] }, require: id => id==='electron' ? { app: { relaunch: options=>actions.push(['relaunch',JSON.parse(JSON.stringify(options))]), exit: code=>actions.push(['exit',code]) } } : actions.push(['main',id]) });
  return actions;
}
test('Linux relaunches with a startup X11 flag and does not load the UI prematurely', () => {
  const actions=boot();
  assert.deepEqual(actions,[['relaunch',{args:['--ozone-platform=x11'],execPath:'/opt/Sussa/sussa'}],['exit',0]]);
});
test('AppImage relaunch uses the actual AppImage and preserves arguments', () => {
  const actions=boot({env:{DISPLAY:':0',APPIMAGE:'/home/user/Sussa.AppImage'},argv:['/tmp/.mount/sussa','--some-flag']});
  assert.deepEqual(actions[0][1],{args:['--some-flag','--ozone-platform=x11'],execPath:'/home/user/Sussa.AppImage'});
});
test('explicit backend, Windows and pure Wayland do not relaunch repeatedly', () => {
  for(const options of [{argv:['sussa','--ozone-platform=x11']},{argv:['sussa','--ozone-platform=wayland']},{platform:'win32'},{env:{WAYLAND_DISPLAY:'wayland-0'}}])assert.deepEqual(boot(options),[['main','./main.cjs']]);
});
