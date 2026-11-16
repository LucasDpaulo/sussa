// Reutiliza a janela existente para manter o timer, os players e o armazenamento.
function createCompactWindow(window, screen, notify, { pinSupported = true } = {}) {
  let previous = null;
  let busy = false;
  const state = () => ({ active: previous !== null, pinned: pinSupported && previous !== null && window.isAlwaysOnTop(), pinSupported });
  const publish = () => { const value = state(); notify(value); return value; };
  async function toggle() {
    if (busy) return state();
    busy = true;
    try {
      if (!previous) {
        const saved = { bounds: window.getNormalBounds(), maximized: window.isMaximized(), fullscreen: window.isFullScreen(), minimum: window.getMinimumSize(), pinned: window.isAlwaysOnTop() };
        if (saved.fullscreen) {
          await new Promise((resolve, reject) => {
            const timer = setTimeout(() => { window.removeListener('leave-full-screen', done); reject(new Error('Saia da tela cheia e tente novamente.')); }, 3000);
            function done() { clearTimeout(timer); resolve(); }
            window.once('leave-full-screen', done);
            window.setFullScreen(false);
          });
        }
        if (saved.maximized) window.unmaximize();
        previous = saved;
        const area = screen.getDisplayMatching(saved.bounds).workArea;
        window.setMinimumSize(320, 240);
        window.setBounds({ x: Math.max(area.x, area.x + area.width - 440), y: Math.max(area.y, area.y + area.height - 340), width: 420, height: 300 });
        window.setAlwaysOnTop(false);
      } else {
        const saved = previous;
        previous = null;
        window.setAlwaysOnTop(saved.pinned);
        window.setMinimumSize(...saved.minimum);
        const area = screen.getDisplayMatching(saved.bounds).workArea;
        window.setBounds({ ...saved.bounds, x: Math.max(area.x, Math.min(saved.bounds.x, area.x + area.width - saved.bounds.width)), y: Math.max(area.y, Math.min(saved.bounds.y, area.y + area.height - saved.bounds.height)) });
        if (saved.maximized) window.maximize();
        if (saved.fullscreen) window.setFullScreen(true);
      }
      return publish();
    } finally { busy = false; }
  }
  function pin(value) {
    if (pinSupported && previous && typeof value === 'boolean') window.setAlwaysOnTop(value);
    return publish();
  }
  return { toggle, pin, state };
}
module.exports = { createCompactWindow };
