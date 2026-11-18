// Teste de interação isolado: não usa conta, rede nem dados pessoais.
const { app, BrowserWindow, session } = require('electron');
const { writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const directory = process.env.SUSSA_YOUTUBE_TEST_DIRECTORY;
if (!directory) throw new Error('Execute npm run test:youtube para usar um perfil temporário.');
app.setPath('userData', directory);
const timeout = setTimeout(() => app.exit(1), 30000);
process.on('uncaughtException', error => { console.error(error); app.exit(1); });
app.whenReady().then(async () => {
  try {
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['https://*/*'] }, (_, done) => done({ cancel: true }));
    const window = new BrowserWindow({ show: false, webPreferences: { backgroundThrottling: false } });
    const file = join(directory, 'catalog.html');
    writeFileSync(file, '<body><div id="youtube-slot"></div><style>dialog {height:400px;overflow:auto} #yt-grid {display:grid;grid-template-columns:repeat(3,1fr)} .yt-card {height:100px} img {display:none}</style></body>');
    await window.loadFile(file);
    console.log(await window.webContents.executeJavaScript(`(async () => {
      let fail = false;
      const calls = [];
      window.desktopYouTube = {
        page: async (id, cursor) => {
          calls.push({id, cursor});
          await new Promise(r => setTimeout(r, 20));
          if (fail) throw Error('offline');
          return { videos: Array.from({length: 6}, (_, i) => ({id: id + ':' + (i + (cursor ? 5 : 0)), title: 'Study ocean forest city rain night ' + i, channel: id, published: ''})), nextCursor: cursor ? null : 'next' };
        }, embeddable: async () => true
      };
      const {initYouTubeCatalog} = await import(${JSON.stringify(pathToFileURL(resolve('src/youtube.js')).href)});
      initYouTubeCatalog({preferences: {scene:'forest', videoUrl:''}, save(){}, toast(){}, play(){}});
      const $ = s => document.querySelector(s);
      const wait = async fn => { for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,20));}throw Error('Timed out: '+$('#yt-status').textContent); };
      const count = () => document.querySelectorAll('.yt-card').length;
      $('#open-youtube').click();
      await wait(()=>count()===30 && !$('#yt-more').disabled);
      const dialog = $('#youtube-catalog');
      dialog.scrollTop = dialog.scrollHeight; dialog.dispatchEvent(new Event('scroll'));
      await wait(()=>count()===60);
      $('#yt-more').click();
      await wait(()=>count()===66 && $('#yt-more').disabled);
      if(new Set([...document.querySelectorAll('.yt-card')].map(v=>v.dataset.video)).size!==66)throw Error('Duplicate cards');
      fail = true;
      $('[data-yt-category=sea]').click();
      if(count()!==66 || !$('#yt-grid').inert || $('#yt-grid').getAttribute('aria-busy')!=='true')throw Error('Category switch removed the previous list before loading');
      await wait(()=>$('#yt-status').textContent.includes('não responderam'));
      if(count())throw Error('Previous category remained visible');
      if($('#yt-grid').inert || $('#yt-grid').hasAttribute('aria-busy'))throw Error('Grid remained blocked after loading');
      fail = false;
      $('#yt-more').click();
      await wait(()=>count()===30);
      $('[data-yt-period=day]').click();
      await wait(()=>$('#yt-status').textContent.includes('Nenhum'));
      if(count())throw Error('Period filter ignored');
      $('[data-yt-category=rain]').click();
      await wait(()=>$('#yt-status').textContent.includes('Nenhum'));
      $('[data-yt-period=night]').click();
      await wait(()=>count()===30);
      if(![...document.querySelectorAll('.yt-title')].every(v=>v.textContent.includes('rain')))throw Error('Rain category ignored');
      $('[data-yt-category=lofi]').click();
      $('[data-yt-category=study]').click();
      await wait(()=>count()===30);
      await new Promise(r=>setTimeout(r,80));
      if(![...document.querySelectorAll('.yt-card')].every(v=>v.dataset.video.startsWith('UC')))throw Error('Invalid cards');
      if($('[data-yt-category=study]').getAttribute('aria-pressed')!=='true'||count()!==30)throw Error('Stale response changed category');
      const previousCalls = calls.length;
      $('[data-yt-category=study]').click();
      if(calls.length!==previousCalls || $('#yt-grid').inert)throw Error('Selected category triggered another load');
      return 'PASS: scrolling, pagination, deduplication, retry, smooth category switching, stale responses and repeated selection';
    })()`));
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { clearTimeout(timeout); app.quit(); }
});
