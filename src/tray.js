// Modo na barra (só no app desktop): a janela some, o timer aparece na barra do sistema
// e o menu do ícone mostra o que está rodando, com pausa e controles de volume.
const modeName = { focus: 'Foco', short: 'Pausa curta', long: 'Pausa longa' };
const pad = n => String(n).padStart(2, '0');
export const clock = ms => {
  const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${Math.floor(s / 60)}:${pad(s % 60)}`;
};
const hour = date => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// No Linux o Electron entrega o ícone como arquivo, e a extensão de bandeja do Ubuntu mostra imagens
// largas (largura ≥ 1,5 × altura) no tamanho real: cabe o tempo inteiro, como um relógio.
// No Windows a bandeja é um quadrado de 16 px, então só os minutos cabem legíveis.
export async function drawTrayIcon({ text, clock: time, progress, mode, running, wide }) {
  const fill = Math.max(0, Math.min(1, progress)), accent = mode === 'focus' ? '#f2b47c' : '#8fd8aa';
  let canvas, c;
  if (wide) {
    const height = 22, font = '700 15px system-ui, sans-serif';
    const measure = new OffscreenCanvas(1, 1).getContext('2d'); measure.font = font;
    const width = Math.max(Math.ceil(height * 1.6), Math.ceil(measure.measureText(time).width) + 6);
    canvas = new OffscreenCanvas(width, height); c = canvas.getContext('2d');
    c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(1, height - 3, width - 2, 2);
    c.fillStyle = accent; c.fillRect(1, height - 3, (width - 2) * fill, 2);
    c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = running ? '#ffffff' : 'rgba(255,255,255,.55)';
    c.fillText(time, width / 2, 9.5);
  } else {
    canvas = new OffscreenCanvas(32, 32); c = canvas.getContext('2d');
    c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(2, 28, 28, 4);
    c.fillStyle = accent; c.fillRect(2, 28, 28 * fill, 4);
    c.fillStyle = running ? '#ffffff' : 'rgba(255,255,255,.55)';
    c.font = `800 ${text.length > 2 ? 17 : 25}px system-ui, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, 16, 14.5, 31);
  }
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return new Uint8Array(await blob.arrayBuffer());
}

export function trayView(state, now = Date.now()) {
  const full = state.durations[state.mode] * 60000, minutes = Math.ceil(state.remaining / 60000);
  const text = state.remaining <= 0 ? '✓' : minutes < 100 ? String(minutes) : `${Math.round(minutes / 60)}h`;
  const title = `${modeName[state.mode] ?? 'Foco'} · ${state.room === 'work' ? 'Trabalho' : 'Estudos'}`;
  const detail = state.remaining <= 0 ? 'Sessão concluída'
    : state.running ? `${minutes} min restantes · até ${hour(new Date(now + state.remaining))}`
    : `Pausado · ${clock(state.remaining)} restantes`;
  const action = state.running ? 'Pausar' : state.remaining <= 0 ? 'Nova sessão' : state.remaining >= full ? 'Iniciar' : 'Retomar';
  return { text, clock: state.remaining <= 0 ? '✓ 0:00' : clock(state.remaining), progress: full ? state.remaining / full : 0, title, detail, action };
}

export function initTray({ state, toggleTimer, isMuted, toggleMute, setMasterVolume }) {
  const bridge = window.desktopTray;
  if (!bridge) return () => {};
  const wide = /Linux/.test(navigator.userAgent);
  let reportedRunning = null, active = false, lastIcon = '', lastMenu = '', sending = false, pending = false;
  const button = document.createElement('button');
  button.id = 'tray-mode'; button.textContent = '⇲';
  button.title = 'Rodar na barra do sistema, economizando bateria (Ctrl+M)';
  button.setAttribute('aria-label', 'Rodar na barra do sistema');
  button.onclick = () => bridge.enter();
  document.querySelector('#fullscreen')?.before(button);
  async function update() {
    // O processo principal usa isso para decidir se o X fecha o app ou o manda para a barra.
    if (state.running !== reportedRunning) { reportedRunning = state.running; bridge.setRunning(state.running); }
    if (!active) return;
    if (sending) { pending = true; return; }
    const view = trayView(state);
    // Redesenha só quando muda o que aparece: o tempo (a cada segundo no Linux) ou um passo da linha de progresso.
    const iconKey = [wide ? view.clock : view.text, Math.round(view.progress * 28), state.mode, state.running].join('|');
    const menu = { title: view.title, detail: view.detail, action: view.action, volume: state.volumes.master, muted: isMuted(), videoVolume: state.workspace.backgroundVolume, videoActive: state.workspace.scene === 'youtube' };
    const menuKey = JSON.stringify(menu);
    if (iconKey === lastIcon && menuKey === lastMenu) return;
    sending = true;
    try {
      const icon = iconKey === lastIcon ? undefined : await drawTrayIcon({ ...view, mode: state.mode, running: state.running, wide });
      if (active) bridge.update({ ...menu, icon });
      lastIcon = iconKey; lastMenu = menuKey;
    } catch { /* o ícone anterior continua na barra */ }
    finally { sending = false; if (pending) { pending = false; update(); } }
  }
  bridge.onCommand(async command => {
    if (command?.type === 'volume') {
      if (command.kind === 'master') setMasterVolume(command.value);
      else document.dispatchEvent(new CustomEvent('sussa:video-volume', { detail: command.value }));
    } else if (command === 'entered') {
      active = true; lastIcon = lastMenu = '';
      // O vídeo de fundo é o maior gasto de bateria e ninguém o vê com a janela escondida.
      document.dispatchEvent(new CustomEvent('sussa:tray', { detail: 'entered' }));
      update();
    } else if (command === 'exited') {
      active = false;
      document.dispatchEvent(new CustomEvent('sussa:tray', { detail: 'exited' }));
    } else if (command === 'toggle') await toggleTimer();
    else if (command === 'mute') await toggleMute();
    else if (command === 'volume-up' || command === 'volume-down') setMasterVolume(state.volumes.master + (command === 'volume-up' ? 10 : -10));
    update();
  });
  return update;
}
