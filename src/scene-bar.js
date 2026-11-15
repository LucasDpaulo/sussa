import { icon } from './interface.js';

// Barra discreta no rodapé para o vídeo de fundo do YouTube: tocar/pausar, volume, enquadramento e qualidade.
const qualities = { hd2160: '4K', hd1440: '1440p', hd1080: '1080p', hd720: '720p', large: '480p', medium: '360p', small: '240p', tiny: '144p' };
const youtubeOrigin = 'https://www.youtube-nocookie.com';

export function initSceneBar({ preferences, save, isVideoScene, isPaused, togglePlay, setVolume, onYoutubeState }) {
  if (!['contain', 'cover'].includes(preferences.sceneFit)) preferences.sceneFit = 'contain';
  const scene = document.querySelector('#scene');
  const bar = document.createElement('div');
  bar.id = 'scene-bar'; bar.className = 'workspace-chrome'; bar.hidden = true;
  bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Controles do vídeo de fundo');
  bar.innerHTML = `<button type="button" id="bar-play"></button><button type="button" id="bar-mute"></button>
    <input type="range" id="bar-volume" min="0" max="100" aria-label="Volume do vídeo de fundo">
    <span class="bar-divider" aria-hidden="true"></span><button type="button" id="bar-fit"></button><span id="bar-quality"></span>`;
  document.body.append(bar);
  const $ = selector => bar.querySelector(selector);
  let frame = null, info = {}, lastVolume = 50;

  // Com o player em modo "listening", o YouTube informa estado, qualidade e tempo por postMessage.
  window.addEventListener('message', event => {
    if (!frame || event.source !== frame.contentWindow || event.origin !== youtubeOrigin) return;
    let data; try { data = JSON.parse(event.data); } catch { return; }
    if (data?.event !== 'infoDelivery' || !data.info) return;
    Object.assign(info, data.info);
    if ('playerState' in data.info) onYoutubeState(data.info.playerState);
    update();
  });
  function listen(iframe) {
    frame = iframe; info = {};
    iframe.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), youtubeOrigin);
  }

  // O YouTube escolhe a qualidade pelo tamanho do player: abaixo de ~1920 px ele cai para 720p.
  // Por isso o player é sempre renderizado com pelo menos 1920×1080 e só reduzido na exibição.
  function layout() {
    const iframe = document.querySelector('#scene-youtube iframe');
    if (!iframe) return;
    const width = preferences.sceneFit === 'contain' ? Math.min(innerWidth, innerHeight * 16 / 9) : Math.max(innerWidth, innerHeight * 16 / 9);
    const base = Math.max(1920, Math.round(width));
    iframe.style.width = `${base}px`; iframe.style.height = `${Math.round(base * 9 / 16)}px`;
    iframe.style.transform = `translate(-50%,-50%) scale(${width / base})`;
  }
  addEventListener('resize', layout);

  function update() {
    scene.dataset.fit = preferences.sceneFit;
    layout();
    bar.hidden = !isVideoScene();
    if (bar.hidden) return;
    const paused = isPaused(), volume = preferences.backgroundVolume;
    $('#bar-play').innerHTML = icon(paused ? 'play' : 'pause');
    $('#bar-play').title = paused ? 'Reproduzir vídeo' : 'Pausar vídeo';
    $('#bar-play').setAttribute('aria-label', $('#bar-play').title);
    $('#bar-mute').innerHTML = icon(volume ? 'sound' : 'muted');
    $('#bar-mute').title = volume ? 'Silenciar vídeo' : 'Ativar som do vídeo';
    $('#bar-mute').setAttribute('aria-label', $('#bar-mute').title);
    $('#bar-volume').value = volume;
    $('#bar-volume').style.setProperty('--fill', `${volume}%`);
    const contain = preferences.sceneFit === 'contain';
    $('#bar-fit').innerHTML = icon(contain ? 'fitCover' : 'fitContain');
    $('#bar-fit').title = contain ? 'Preencher a tela (corta as bordas)' : 'Mostrar o vídeo inteiro';
    $('#bar-fit').setAttribute('aria-label', $('#bar-fit').title);
    $('#bar-quality').textContent = qualities[info.playbackQuality] || '';
    $('#bar-quality').title = 'Qualidade escolhida pelo YouTube conforme o tamanho da tela e a internet';
  }

  $('#bar-play').onclick = () => { togglePlay(); update(); };
  $('#bar-mute').onclick = () => {
    if (preferences.backgroundVolume) { lastVolume = preferences.backgroundVolume; setVolume(0); }
    else setVolume(lastVolume || 50);
  };
  $('#bar-volume').oninput = e => setVolume(Number(e.target.value));
  $('#bar-fit').onclick = () => { preferences.sceneFit = preferences.sceneFit === 'contain' ? 'cover' : 'contain'; save(); update(); };
  return { update, listen };
}
