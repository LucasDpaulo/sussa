// Músicas incluídas no app. Os créditos aparecem ao lado dos controles.
export const tracks = {
  lofi: { title: 'Comfy · Purrple Cat', file: '/assets/audio/lofi.mp3', credit: 'Comfy — Purrple Cat · CC BY 4.0 · freelofi.com' },
  jazz: { title: 'Jazz Brunch · Kevin MacLeod', file: '/assets/audio/jazz.mp3', credit: 'Jazz Brunch — Kevin MacLeod (incompetech.com) · CC BY 4.0' }
};
export function initAmbience({ state, save, mixer, toast, syncVolumes }) {
  const prefs = state.ambience = { track: 'lofi', volume: 30, spatial: false, ...state.ambience };
  delete prefs.saved; // combinações salvas saíram do app
  if (!tracks[prefs.track]) prefs.track = 'lofi';
  prefs.volume = Math.max(0, Math.min(100, Number(prefs.volume) || 0));
  let playing = false, revision = 0;
  const audio = new Audio(); audio.loop = true; audio.preload = 'none'; audio.id = 'ambience-audio';
  const panel = document.querySelector('#viewport-1-winner-sound');
  const controls = document.createElement('div'); controls.className = 'panel-content'; controls.id = 'ambience-controls';
  controls.innerHTML = `<hr><label>Música offline<select id="ambience-track">${Object.entries(tracks).map(([id,t])=>`<option value="${id}">${t.title}</option>`).join('')}</select></label><button id="ambience-play">Reproduzir música</button><label class="sound-row"><span>Música</span><input id="ambience-volume" type="range" min="0" max="100" value="${prefs.volume}"><output>${prefs.volume}%</output></label><label><input id="ambience-spatial" type="checkbox"> Movimento estéreo suave (fones)</label><p id="ambience-status" class="hint" role="status"></p><details><summary>Créditos dos sons</summary><p class="hint">Comfy — Purrple Cat · CC BY 4.0 · freelofi.com<br>Jazz Brunch — Kevin MacLeod (incompetech.com) · CC BY 4.0<br>Chuva binaural — chromakei · Freesound #396578 · CC0</p><p class="hint">Músicas: creativecommons.org/licenses/by/4.0/ · Chuva: creativecommons.org/publicdomain/zero/1.0/</p></details>`;
  panel.append(controls, audio);
  const $ = selector => controls.querySelector(selector);
  $('#ambience-track').value = prefs.track;
  $('#ambience-spatial').checked = prefs.spatial;
  function status(message) { $('#ambience-status').textContent = message; $('#ambience-play').textContent = playing ? 'Pausar música' : 'Reproduzir música'; }
  async function play() {
    const current = ++revision;
    status('Carregando música local…');
    try {
      await mixer.set('master', state.volumes.master);
      await mixer.attachMusic(audio);
      if (current !== revision) return;
      mixer.setMusicVolume(prefs.volume); mixer.setSpatial(prefs.spatial);
      const url = new URL(tracks[prefs.track].file, location.href).href;
      if (audio.src !== url) audio.src = url;
      await audio.play();
      if (current !== revision) return;
      playing = true; status(tracks[prefs.track].credit);
    } catch { if (current === revision) { playing = false; status('Não foi possível reproduzir a música local.'); } }
  }
  function pause() { revision++; audio.pause(); playing = false; status('Música pausada.'); }
  audio.addEventListener('error', () => { playing = false; status('Arquivo de música indisponível.'); });
  $('#ambience-play').onclick = () => playing ? pause() : play();
  $('#ambience-track').onchange = () => { prefs.track = $('#ambience-track').value; save(); if (playing) play(); else status(tracks[prefs.track].credit); };
  $('#ambience-volume').oninput = e => { prefs.volume = Number(e.target.value); e.target.nextElementSibling.value = `${prefs.volume}%`; mixer.setMusicVolume(prefs.volume); save(); };
  $('#ambience-spatial').onchange = e => { prefs.spatial = e.target.checked; mixer.setSpatial(prefs.spatial); save(); };
  status('Escolha uma música para combinar com os sons.');

}
