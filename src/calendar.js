let token = null, expires = 0, scriptPromise;
export function loadGoogle() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
    script.onload = resolve; script.onerror = () => { script.remove(); scriptPromise = null; reject(new Error('Não foi possível carregar o Google. Verifique sua conexão.')); };
    document.head.append(script);
  }); return scriptPromise;
}
export function authorize(clientId) {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) return reject(new Error('Aguarde o carregamento do Google e tente novamente.'));
    window.google.accounts.oauth2.initTokenClient({ client_id: clientId, scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
      callback: response => { if (response.error) return reject(new Error('O Google não autorizou o acesso à agenda.')); token = response.access_token; expires = Date.now() + response.expires_in * 1000; resolve(); },
      error_callback: () => reject(new Error('A conexão foi cancelada ou a janela foi bloqueada.'))
    }).requestAccessToken();
  });
}
export async function events(date, calendarId = 'primary') {
  // No desktop, a conta Google fica no processo principal (⚙ Aparência → Conta Google).
  if (window.desktopGoogle) {
    try { return await window.desktopGoogle.calendar(date, calendarId); }
    catch (error) { throw new Error(String(error.message).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')); }
  }
  if (!token || Date.now() >= expires) throw new Error('Conecte sua conta Google para carregar a agenda.');
  const start = new Date(`${date}T00:00:00`), end = new Date(start); end.setDate(end.getDate() + 1);
  const params = new URLSearchParams({ timeMin: start.toISOString(), timeMax: end.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '250' });
  const items = []; let page;
  do {
    if (page) params.set('pageToken', page);
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(response.status === 401 ? 'A conexão expirou. Conecte novamente.' : 'Não foi possível ler a agenda. Confira o ID e a permissão da conta.');
    const data = await response.json(); items.push(...data.items); page = data.nextPageToken;
  } while (page);
  return items.filter(item => item.status !== 'cancelled').map(item => ({ id: item.id, title: item.summary || 'Sem título', time: item.start.dateTime ? new Date(item.start.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Dia todo', url: item.htmlLink }));
}
export function disconnect() { if (token && window.google?.accounts) window.google.accounts.oauth2.revoke(token); token = null; expires = 0; }
