const { app, BrowserWindow } = require('electron');
require('../desktop/main.cjs');
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
        document.querySelector('#apply-ambience').click();
        const waitFor = async (test, message) => {
          for (let i=0;i<100;i++) { if(test()) return; await new Promise(r=>setTimeout(r,100)); }
          throw new Error(message + JSON.stringify({music: {src: document.querySelector('#ambience-audio').src, error: document.querySelector('#ambience-audio').error?.message, paused:document.querySelector('#ambience-audio').paused}, video: {src: document.querySelector('#scene-video').src,error:document.querySelector('#scene-video').error?.message, ready:document.querySelector('#scene-video').readyState}, status:document.querySelector('#ambience-status').textContent,scene:document.querySelector('#scene-status').textContent, toast:document.querySelector('#toast').textContent}));
        };
        const music = document.querySelector('#ambience-audio'), video = document.querySelector('#scene-video');
        await waitFor(()=>!music.paused && music.currentTime>0 && video.readyState>=2, 'Bundled audio/video did not start');
        if (!document.querySelector('#mute').textContent.includes('Ativar')) throw new Error('Preset changed mute');
        const track=document.querySelector('#ambience-track');track.value='jazz';track.dispatchEvent(new Event('change'));
        await waitFor(()=>music.src.endsWith('jazz.mp3') && !music.paused && music.currentTime>0, 'Jazz did not play');
        document.querySelector('#save-ambience').click();
        const still=document.querySelector('#still-scene');still.checked=true;still.dispatchEvent(new Event('change'));
        await waitFor(()=>video.hidden && !video.getAttribute('src'), 'Static mode kept video active');
        for(const id of ['office','beach']) {
          const select=document.querySelector('#catalog-scene');select.value=id;select.dispatchEvent(new Event('change'));
          still.checked=false;still.dispatchEvent(new Event('change'));
          await waitFor(()=>video.readyState>=2 && video.currentTime>0, 'Video did not play: '+id);
        }
        document.querySelector('#restore-ambience').click();
        await waitFor(()=>video.readyState>=2 && !music.paused, 'Saved combination failed');
        document.querySelector('[data-panel=sound]').click();
      }
      const state = JSON.parse(window.desktopStorage.getItem(key));
      if (!state.tasks.some(task => task.title === 'Desktop smoke task')) throw new Error('Task not persisted');
      if (!state.running || state.remaining >= state.durations.focus * 60000) throw new Error('Timer did not advance: ' + JSON.stringify({running: state.running, remaining: state.remaining, mode: state.mode}));
      if (state.ambience?.saved?.track !== 'jazz' || state.workspace.scene !== 'library') throw new Error('Combination not persisted');
      if (!document.querySelector('#clock').textContent) throw new Error('Clock missing');
      return 'Task and running timer persisted; isolated storage bridge working';
    })()`);
    console.log(result);
    if (process.argv.includes('--write')) { const fs = require('node:fs'); fs.mkdirSync('artifacts', { recursive:true }); await new Promise(r=>setTimeout(r,300)); fs.writeFileSync('artifacts/immersion-desktop.png', (await window.capturePage()).toPNG()); await window.webContents.executeJavaScript("document.querySelector('[data-panel=spaces]').click()"); await new Promise(r=>setTimeout(r,300)); fs.writeFileSync('artifacts/immersion-sound.png', (await window.capturePage()).toPNG()); }
    clearTimeout(timeout);
    app.quit();
  } catch (error) { console.error(error); app.exit(1); }
});
