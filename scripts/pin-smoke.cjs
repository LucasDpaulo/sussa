// Verificação de empilhamento real: executar em Linux com X11/XWayland e WM ativo.
const { app, BrowserWindow } = require('electron');
const { execFileSync } = require('node:child_process');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
app.setPath('userData', mkdtempSync(join(tmpdir(), 'sussa-pin-test-')));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const id = window => '0x' + window.getNativeWindowHandle().readUInt32LE().toString(16);
const stacking = () => execFileSync('xprop', ['-root', '_NET_CLIENT_LIST_STACKING'], { encoding: 'utf8' }).match(/0x[\da-f]+/gi) ?? [];
const timeout = setTimeout(() => app.exit(1), 15000);
app.whenReady().then(async () => {
  try {
    const main = new BrowserWindow({ width: 360, height: 260, x: 40, y: 40, title: 'Sussa: teste de fixação' });
    await main.loadURL('data:text/html,<body style="background:%23262626;color:white;font:20px sans-serif">Teste temporário do contador fixado</body>');
    main.setAlwaysOnTop(true);
    const cover = new BrowserWindow({ width: 440, height: 340, x: 20, y: 20, title: 'Sussa: janela de comparação' });
    await cover.loadURL('data:text/html,<body style="background:%23444;color:white;font:20px sans-serif">Janela temporária de comparação</body>');
    cover.focus(); await wait(600);
    const flags = execFileSync('xprop', ['-id', id(main), '_NET_WM_STATE'], { encoding: 'utf8' });
    if (!flags.includes('_NET_WM_STATE_ABOVE')) throw Error('WM did not accept ABOVE');
    let order = stacking();
    if (!order.includes(id(main)) || !order.includes(id(cover)) || order.indexOf(id(main)) < order.indexOf(id(cover))) throw Error('Pinned window is behind another window');
    main.setAlwaysOnTop(false); cover.focus(); await wait(600);
    order = stacking();
    if (order.indexOf(id(main)) > order.indexOf(id(cover))) throw Error('Unpinned window remained on top');
    console.log('PASS: real window manager confirms ABOVE and stacking over another window; unpin restores stacking');
    main.destroy(); cover.destroy(); clearTimeout(timeout); app.exit(0);
  } catch(error) { console.error(error); app.exit(1); }
});
