// Seção "Conta Google" em ⚙ Aparência (só no app desktop). Cada serviço tem o seu botão e pede só a
// sua permissão: dá para conectar só a Agenda, só o YouTube ou os dois.
// Quem muda o estado avisa o resto do app com o evento 'google:changed'.
const bridge = window.desktopGoogle;
// O Electron prefixa erros vindos do processo principal; o usuário só precisa da mensagem.
export const cleanError = error => String(error?.message || error).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

let current = { configured: false, connected: false, calendar: false, youtube: false, email: '' };
export const googleStatus = () => current;
function announce(status) { current = status; document.dispatchEvent(new CustomEvent('google:changed', { detail: status })); }

const services = [
  ['calendar', 'Agenda', 'Eventos do dia nas Tarefas'],
  ['youtube', 'YouTube', 'Curtidos, inscrições e playlists no Explorar']
];

export function initGoogleAccount({ toast }) {
  const settings = document.querySelector('#settings');
  if (!bridge || !settings) return;
  const section = document.createElement('section');
  section.id = 'google-account';
  section.innerHTML = `<hr><h3>Conta Google</h3><p id="google-state"></p>
    ${services.map(([id, title, detail]) => `<div class="google-service" data-service="${id}"><div><b>${title}</b><small>${detail}</small></div><button type="button" data-connect="${id}">Conectar</button></div>`).join('')}
    <button type="button" id="google-disconnect">Desconectar conta</button>
    <details id="google-setup"><summary>Credenciais próprias do Google Cloud</summary>
      <p class="hint">Só é preciso quando o app não traz credenciais embutidas. Crie um cliente OAuth do tipo <b>App para computador</b>, ative a Google Calendar API e a YouTube Data API v3 e cole os dados abaixo. O passo a passo está no README.</p>
      <label>Client ID<input id="google-id" autocomplete="off" spellcheck="false" placeholder="…apps.googleusercontent.com"></label>
      <label>Client secret<input id="google-secret" type="password" autocomplete="off" spellcheck="false"></label>
      <button type="button" id="google-save">Salvar credenciais</button>
    </details>`;
  settings.append(section);
  const $ = selector => section.querySelector(selector);

  function render(status) {
    $('#google-state').textContent = status.connected
      ? `Conectada${status.email ? ` como ${status.email}` : ''}. Somente leitura.`
      : status.configured ? 'Somente leitura. O login abre no navegador, e você escolhe o que liberar.'
      : 'Para conectar, informe as credenciais do Google Cloud abaixo.';
    for (const [id] of services) {
      const on = Boolean(status[id]), button = $(`[data-connect="${id}"]`);
      button.textContent = on ? '✓ Conectado' : 'Conectar';
      button.disabled = on || !status.configured;
      button.classList.toggle('primary', !on && status.configured);
    }
    $('#google-disconnect').hidden = !status.connected;
    // Com credenciais embutidas, a parte técnica fica escondida.
    $('#google-setup').hidden = status.builtIn;
    $('#google-setup').open = !status.configured;
    if (status.clientId && !$('#google-id').value) $('#google-id').value = status.clientId;
  }
  const update = status => { render(status); announce(status); };

  section.addEventListener('click', async event => {
    const service = event.target.closest('[data-connect]')?.dataset.connect;
    if (!service) return;
    const button = event.target.closest('button');
    button.disabled = true; button.textContent = 'Continue no navegador…';
    try { update(await bridge.connect(service)); toast(`${service === 'calendar' ? 'Agenda' : 'YouTube'} conectado.`); }
    catch (error) { render(current); toast(cleanError(error)); }
  });
  $('#google-save').onclick = async () => {
    try { update(await bridge.configure({ id: $('#google-id').value, secret: $('#google-secret').value })); $('#google-secret').value = ''; toast('Credenciais salvas. Agora conecte a Agenda ou o YouTube.'); }
    catch (error) { toast(cleanError(error)); }
  };
  $('#google-disconnect').onclick = async () => {
    try { update(await bridge.disconnect()); toast('Conta Google desconectada.'); }
    catch (error) { toast(cleanError(error)); }
  };
  bridge.status().then(update).catch(() => {});
}
