// O backend gráfico é escolhido antes do JavaScript. appendSwitch aqui seria tarde.
const { app } = require('electron');
const wantsX11 = process.platform === 'linux' && process.env.DISPLAY && !process.argv.some(arg => arg.startsWith('--ozone-platform'));
if (wantsX11) {
  app.relaunch({ args: [...process.argv.slice(1), '--ozone-platform=x11'], execPath: process.env.APPIMAGE || process.execPath });
  app.exit(0);
} else {
  require('./main.cjs');
}
