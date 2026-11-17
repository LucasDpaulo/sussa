for (const kind of ['master', 'video']) {
  const slider = document.getElementById(kind);
  slider.addEventListener('input', () => {
    document.getElementById(kind + '-value').textContent = slider.value + '%';
    window.audioControls.set(kind, Number(slider.value));
  });
}
window.audioControls.onState(state => {
  if (!state) return;
  for (const [kind, value] of [['master', state.volume], ['video', state.videoVolume]]) {
    const slider = document.getElementById(kind);
    if (document.activeElement !== slider) slider.value = value;
    document.getElementById(kind + '-value').textContent = slider.value + '%';
  }
  document.getElementById('video').disabled = !state.videoActive;
  document.getElementById('hint').textContent = state.muted ? 'O áudio geral está silenciado no Sussa.' : !state.videoActive ? 'Escolha um vídeo para controlar o áudio dele.' : '';
});
