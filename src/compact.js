// Mantém os elementos reais do timer e do player: nenhuma sessão paralela ou iframe duplicado.
export function initCompact({ toast }) {
  const bridge = window.desktopCompact;
  if (!bridge) return;
  const $ = selector => document.querySelector(selector);
  const svg = body => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const pip = svg('<rect x="3" y="4" width="18" height="16" rx="2"/><rect x="12" y="12" width="7" height="5" rx="1" fill="currentColor" stroke="none"/>');
  const expand = svg('<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6"/>');
  const pin = svg('<path d="m15 3 6 6-3 1-4 4v4l-2 2-8-8 2-2h4l4-4zM9 15l-6 6"/>');
  const enter = document.createElement('button');
  enter.id = 'compact-mode'; enter.type = 'button'; enter.innerHTML = pip;
  enter.title = 'Picture-in-picture (Ctrl+Shift+P)'; enter.setAttribute('aria-label', 'Abrir modo picture-in-picture');
  $('#fullscreen')?.before(enter);
  const tools = document.createElement('div'); tools.id = 'compact-tools'; tools.hidden = true;
  tools.innerHTML = `<button type="button" id="compact-pin" aria-label="Sempre à frente" aria-pressed="false" title="Sempre à frente">${pin}</button><button type="button" id="compact-restore" aria-label="Voltar ao tamanho normal" title="Voltar ao tamanho normal (Esc)">${expand}</button>`;
  document.body.append(tools);
  let snapshot = null, active = false, pinned = false, busy = false;
  function prepare() {
    if (snapshot) return;
    snapshot = [...document.querySelectorAll('#workspace-ui > .floating-panel')].map(panel => ({ panel, style: panel.getAttribute('style'), hidden: panel.hidden, inert: panel.inert }));
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    $('#timer-config').open = false;
    document.body.classList.add('compact-mode');
    const hero = $('#viewport-1-winner-hero'); hero.hidden = false; hero.inert = false;
    document.dispatchEvent(new Event('workspace:notice'));
  }
  function render(state) {
    active = state.active; pinned = state.pinned;
    if (active) prepare();
    else if (snapshot) {
      document.body.classList.remove('compact-mode');
      for (const item of snapshot) {
        if (item.style === null) item.panel.removeAttribute('style'); else item.panel.setAttribute('style', item.style);
        item.panel.hidden = item.hidden; item.panel.inert = item.inert;
      }
      snapshot = null;
      document.dispatchEvent(new Event('workspace:notice'));
      enter.focus({ preventScroll: true });
    }
    tools.hidden = !active;
    $('#compact-pin').setAttribute('aria-pressed', String(pinned));
    $('#compact-pin').title = pinned ? 'Desativar sempre à frente' : 'Sempre à frente';
  }
  async function toggle() {
    if (busy) return;
    busy = true;
    try { if (!active) prepare(); render(await bridge.toggle()); }
    catch (error) { render(await bridge.state()); toast(error.message || 'Não foi possível alterar o tamanho da janela.'); }
    finally { busy = false; }
  }
  enter.onclick = toggle;
  $('#compact-restore').onclick = toggle;
  $('#compact-pin').onclick = async () => {
    try {
      const requested = !pinned;
      render(await bridge.pin(requested));
      if (requested && !pinned) toast('Seu gerenciador de janelas não permitiu fixar o Sussa à frente.');
    } catch { toast('Não foi possível fixar a janela.'); }
  };
  document.addEventListener('keydown', event => {
    if ((event.key.toLowerCase() === 'p' && (event.ctrlKey || event.metaKey) && event.shiftKey) || (active && event.key === 'Escape')) {
      event.preventDefault(); event.stopImmediatePropagation(); toggle();
    }
  }, true);
  bridge.onChanged(render);
  bridge.state().then(render).catch(() => {});
}
