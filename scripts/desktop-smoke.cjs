const { app, BrowserWindow } = require('electron');
const main = require('../desktop/main.cjs');
const timeout = setTimeout(() => { console.error('Desktop smoke timed out'); app.exit(1); }, 40000);
app.whenReady().then(async () => {
  try {
    let window, ready = false;
    for (let i = 0; i < 100 && !ready; i++) {
      window = BrowserWindow.getAllWindows()[0];
      // Espera o app obter a trava de escrita (navigator.locks); antes disso os cliques são ignorados.
      ready = !!window && await window.webContents.executeJavaScript("document.body.dataset.ready === 'true' && !!window.desktopStorage").catch(() => false);
      if (!ready) await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error('App did not become ready (writer lock not acquired)');
    const result = await window.webContents.executeJavaScript(`(async () => {
      const key = 'meu-espaco-v1';
      if (typeof require !== 'undefined') throw new Error('Node leaked into renderer');
      if (${JSON.stringify(process.argv.includes('--write'))}) {
        document.querySelector('#task-title').value = 'Desktop smoke task';
        document.querySelector('#task-form').requestSubmit();
        document.querySelector('#toggle-timer').click();
        await new Promise(resolve => setTimeout(resolve, 1500));
        document.querySelector('#mute').click();
        document.querySelector('[data-panel=spaces]').click();
        const waitFor = async (test, message) => {
          for (let i=0;i<100;i++) { if(test()) return; await new Promise(r=>setTimeout(r,100)); }
          throw new Error(message + JSON.stringify({music: {src: document.querySelector('#ambience-audio').src, error: document.querySelector('#ambience-audio').error?.message, paused: document.querySelector('#ambience-audio').paused}, status: document.querySelector('#ambience-status').textContent, toast: document.querySelector('#toast').textContent}));
        };
        if (!document.querySelector('#open-youtube') || document.querySelector('#catalog-scene, #apply-ambience, #scene-file, #scene-url')) throw new Error('Ambientes panel not reorganized');
        document.querySelector('#neutral-scene').click();
        if (document.querySelector('#neutral-scene').getAttribute('aria-pressed') !== 'true' || !document.querySelector('#scene-image').classList.contains('neutral')) throw new Error('Neutral background not applied');
        document.querySelector('#forest-scene').click();
        document.querySelector('[data-panel=sound]').click();
        const music = document.querySelector('#ambience-audio');
        const track=document.querySelector('#ambience-track');track.value='jazz';track.dispatchEvent(new Event('change'));
        document.querySelector('#ambience-play').click();
        await waitFor(()=>music.src.endsWith('jazz.mp3') && !music.paused && music.currentTime>0, 'Jazz did not play');
        if (!document.querySelector('#mute').textContent.includes('Ativar')) throw new Error('Music changed mute');
        document.querySelector('[data-panel=sound]').click();
      }
      const state = JSON.parse(window.desktopStorage.getItem(key));
      if (!state.tasks.some(task => task.title === 'Desktop smoke task')) throw new Error('Task not persisted');
      if (!state.running || state.remaining >= state.durations.focus * 60000) throw new Error('Timer did not advance: ' + JSON.stringify({running: state.running, remaining: state.remaining, mode: state.mode}));
      if (state.ambience?.track !== 'jazz' || state.workspace.scene !== 'forest') throw new Error('Ambience not persisted: ' + JSON.stringify({track: state.ambience?.track, scene: state.workspace.scene}));
      if (!document.querySelector('#clock').textContent) throw new Error('Clock missing');
      return 'Task and running timer persisted; isolated storage bridge working';
    })()`);
    console.log(result);
    if (process.argv.includes('--write')) {
      const until = async (test, message) => { for (let i = 0; i < 100; i++) { if (test()) return; await new Promise(r => setTimeout(r, 100)); } throw new Error(message + ' ' + JSON.stringify(main.trayState())); };
      await window.webContents.executeJavaScript("document.querySelector('#tray-mode').click()");
      await until(() => { const t = main.trayState(); return t.active && !t.visible && t.icons > 0 && t.info?.action === 'Pausar'; }, 'Tray mode did not start');
      const { info } = main.trayState();
      if (!/^Foco · Estudos$/.test(info.title) || !/min restantes · até/.test(info.detail) || !info.muted || !main.trayState().muted) throw new Error('Unexpected tray menu ' + JSON.stringify(info));
      window.webContents.send('tray:command', 'mute');
      await until(() => !main.trayState().info.muted && !main.trayState().muted, 'Tray unmute failed');
      const before = main.trayState().info.volume;
      window.webContents.send('tray:command', 'volume-up');
      await until(() => main.trayState().info.volume === Math.min(100, before + 10), 'Tray volume did not change');
      window.webContents.send('tray:command', 'toggle');
      await until(() => main.trayState().info.action === 'Retomar' && main.trayState().info.detail.startsWith('Pausado'), 'Tray pause failed');
      window.webContents.send('tray:command', 'toggle');
      await until(() => main.trayState().info.action === 'Pausar', 'Tray resume failed');
      main.leaveTray();
      await until(() => main.trayState().visible && !main.trayState().active, 'Window did not come back');
      await until(() => main.trayState().running, 'Running state not reported');
      window.close();
      await until(() => main.trayState().active && !main.trayState().visible, 'Close button did not send a running timer to the tray');
      main.leaveTray();
      await until(() => main.trayState().visible, 'Window did not come back after close');
      console.log('Tray mode: icon, menu, mute, volume, pause and close-to-tray working');
    }
    if (process.argv.includes('--write')) { const fs = require('node:fs'); fs.mkdirSync('artifacts', { recursive:true }); await new Promise(r=>setTimeout(r,300)); fs.writeFileSync('artifacts/immersion-desktop.png', (await window.capturePage()).toPNG()); await window.webContents.executeJavaScript("document.querySelector('[data-panel=spaces]').click()"); await new Promise(r=>setTimeout(r,300)); fs.writeFileSync('artifacts/immersion-sound.png', (await window.capturePage()).toPNG()); }
    clearTimeout(timeout);
    app.quit();
  } catch (error) { console.error(error); app.exit(1); }
});
