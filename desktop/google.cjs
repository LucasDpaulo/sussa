// Conta Google no app desktop: um login para a Agenda e o YouTube, só leitura.
// O login abre no navegador do sistema (o Google bloqueia login dentro de apps Electron) e volta por um
// endereço local 127.0.0.1 com PKCE. Os tokens ficam só no processo principal, cifrados com o chaveiro
// do sistema (safeStorage); a página nunca recebe um token.
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { shell, safeStorage } = require('electron');
const youtube = require('./youtube.cjs');

// Cada serviço pede só a sua permissão; conectar o outro depois soma as duas (autorização incremental).
const SERVICES = { calendar: 'https://www.googleapis.com/auth/calendar.events.readonly', youtube: 'https://www.googleapis.com/auth/youtube.readonly' };
// Credenciais do app, criadas uma vez pelo mantenedor (tipo "App para computador"). Para apps instalados,
// o Google não trata o client secret como segredo. O arquivo fica fora do git e entra no pacote.
let builtIn = {};
try { builtIn = require('./google-client.json'); } catch { /* sem credenciais embutidas: o usuário informa as suas */ }
const base64url = buffer => buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function createGoogle(dir) {
  const file = path.join(dir, 'google.json');
  let saved = {}, access = null, pending = null;
  try { saved = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* ainda não configurado */ }

  const seal = text => safeStorage.isEncryptionAvailable() ? { sealed: safeStorage.encryptString(text).toString('base64') } : null;
  const open = box => { try { return box?.sealed ? safeStorage.decryptString(Buffer.from(box.sealed, 'base64')) : null; } catch { return null; } };
  function persist() { fs.writeFileSync(file, JSON.stringify(saved), { mode: 0o600 }); }

  const clientId = () => saved.clientId || builtIn.clientId || '';
  // Sem chaveiro no sistema, segredo e conexão ficam só em memória (valem até fechar o app).
  let memorySecret = null, memoryRefresh = null;
  const clientSecret = () => saved.clientId ? open(saved.clientSecret) ?? memorySecret ?? '' : builtIn.clientSecret || '';
  const refreshToken = () => open(saved.refreshToken) ?? memoryRefresh;

  function status() {
    const connected = Boolean(refreshToken()), scopes = connected ? saved.scopes || [] : [];
    return { configured: Boolean(clientId() && clientSecret()), builtIn: Boolean(builtIn.clientId && !saved.clientId), connected, email: saved.email || '',
      calendar: scopes.includes(SERVICES.calendar), youtube: scopes.includes(SERVICES.youtube), clientId: saved.clientId || '', secure: safeStorage.isEncryptionAvailable() };
  }

  function configure({ id, secret }) {
    id = String(id || '').trim(); secret = String(secret || '').trim();
    if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(id)) throw new Error('O Client ID termina com .apps.googleusercontent.com.');
    if (!/^[\w-]{10,}$/.test(secret)) throw new Error('Cole o Client secret do mesmo cliente OAuth.');
    if (id !== clientId()) { saved = {}; access = null; memoryRefresh = null; }
    saved.clientId = id;
    const box = seal(secret);
    if (box) saved.clientSecret = box; else { delete saved.clientSecret; memorySecret = secret; }
    persist();
    return status();
  }

  async function token(params) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), ...params }), signal: AbortSignal.timeout(15000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data.error === 'invalid_grant') { delete saved.refreshToken; memoryRefresh = null; access = null; persist(); throw new Error('A conexão com o Google expirou. Conecte de novo.'); }
      throw new Error(data.error === 'invalid_client' || data.error === 'unauthorized_client' ? 'O Google não reconheceu o Client ID ou o secret. Confira se o cliente é do tipo App para computador.' : 'O Google recusou a conexão. Confira o Client ID e o secret.');
    }
    return data;
  }

  function connect(service) {
    if (!SERVICES[service]) return Promise.reject(new Error('Serviço inválido'));
    if (!status().configured) return Promise.reject(new Error('Cole o Client ID e o Client secret primeiro.'));
    pending?.cancel();
    return new Promise((resolve, reject) => {
      const verifier = base64url(crypto.randomBytes(48)), state = base64url(crypto.randomBytes(16));
      const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
      let redirect;
      const finish = (error, value) => { clearTimeout(timer); server.close(); pending = null; error ? reject(error) : resolve(value); };
      const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, redirect);
        if (url.pathname !== '/callback') { res.writeHead(404).end(); return; }
        const page = message => res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(`<!doctype html><meta charset="utf-8"><title>Sussa</title><body style="font-family:system-ui;background:#191c22;color:#eee;display:grid;place-items:center;height:100vh;margin:0"><p>${message}</p>`);
        if (url.searchParams.get('state') !== state || !url.searchParams.get('code')) {
          page('A conexão não foi concluída. Pode fechar esta aba.');
          return finish(new Error(url.searchParams.get('error') === 'access_denied' ? 'Você cancelou a conexão no Google.' : 'Resposta inválida do Google.'));
        }
        try {
          const data = await token({ code: url.searchParams.get('code'), code_verifier: verifier, redirect_uri: redirect, grant_type: 'authorization_code' });
          if (!data.refresh_token) throw new Error('O Google não enviou a autorização de longo prazo. Tente de novo.');
          const granted = String(data.scope || '').split(' ');
          if (!granted.includes(SERVICES[service])) throw new Error(`Você não marcou a permissão ${service === 'calendar' ? 'da Agenda' : 'do YouTube'} na tela do Google.`);
          const email = JSON.parse(Buffer.from((data.id_token || '..').split('.')[1] || '', 'base64url').toString() || '{}').email || '';
          access = { value: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
          const box = seal(data.refresh_token);
          if (box) saved.refreshToken = box; else memoryRefresh = data.refresh_token;
          saved.email = email; saved.scopes = granted; persist();
          page('Conta conectada. Pode fechar esta aba e voltar ao Sussa.');
          finish(null, status());
        } catch (error) { page(`Não deu certo: ${error.message} Volte ao Sussa.`); finish(error); }
      });
      const timer = setTimeout(() => finish(new Error('Tempo esgotado. Tente conectar de novo.')), 5 * 60 * 1000);
      pending = { cancel: () => finish(new Error('Conexão anterior cancelada.')) };
      server.listen(0, '127.0.0.1', () => {
        redirect = `http://127.0.0.1:${server.address().port}/callback`;
        const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        auth.search = new URLSearchParams({ client_id: clientId(), redirect_uri: redirect, response_type: 'code', scope: ['openid', 'email', SERVICES[service]].join(' '), include_granted_scopes: 'true', ...(saved.email ? { login_hint: saved.email } : {}), code_challenge: challenge, code_challenge_method: 'S256', state, access_type: 'offline', prompt: 'consent' });
        shell.openExternal(auth.href).catch(error => finish(error));
      });
    });
  }

  async function accessToken() {
    if (access && Date.now() < access.expires) return access.value;
    if (!refreshToken()) throw new Error('Conecte sua conta Google em ⚙ Aparência.');
    const data = await token({ refresh_token: refreshToken(), grant_type: 'refresh_token' });
    access = { value: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
    return access.value;
  }

  async function api(url, params = {}) {
    const response = await fetch(`${url}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${await accessToken()}` }, signal: AbortSignal.timeout(15000) });
    if (response.status === 401) { access = null; throw new Error('A conexão expirou. Tente de novo.'); }
    if (!response.ok) {
      const reason = (await response.json().catch(() => ({})))?.error?.errors?.[0]?.reason;
      throw new Error(reason === 'accessNotConfigured' ? 'Ative a API correspondente (Calendar ou YouTube Data API v3) no Google Cloud.' : 'O Google recusou o pedido.');
    }
    return response.json();
  }

  async function disconnect() {
    const value = refreshToken();
    delete saved.refreshToken; delete saved.email; delete saved.scopes; memoryRefresh = null; access = null; persist();
    if (value) await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: value }), signal: AbortSignal.timeout(10000) }).catch(() => {});
    return status();
  }

  const need = service => { if (!status()[service]) throw new Error(service === 'calendar' ? 'Conecte a Agenda em ⚙ Aparência → Conta Google.' : 'Conecte o YouTube em ⚙ Aparência → Conta Google.'); };
  async function calendarEvents(date, calendarId = 'primary') {
    need('calendar');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Data inválida');
    const start = new Date(`${date}T00:00:00`), end = new Date(start); end.setDate(end.getDate() + 1);
    const items = []; let pageToken;
    do {
      const data = await api(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(String(calendarId || 'primary'))}/events`,
        { timeMin: start.toISOString(), timeMax: end.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '250', ...(pageToken ? { pageToken } : {}) });
      items.push(...(data.items || [])); pageToken = data.nextPageToken;
    } while (pageToken);
    return items.filter(item => item.status !== 'cancelled').map(item => ({
      id: item.id, title: item.summary || 'Sem título',
      time: item.start?.dateTime ? new Date(item.start.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Dia todo'
    }));
  }

  const asVideo = (id, snippet) => ({ id, title: snippet?.title || '', channel: snippet?.videoOwnerChannelTitle || snippet?.channelTitle || '', published: snippet?.publishedAt || '' });
  const visible = video => /^[\w-]{11}$/.test(video.id) && video.title && !/^(Private|Deleted) video$/.test(video.title);

  // Coleções da conta: curtidos, inscrições (vídeos recentes pelos feeds públicos, sem gastar cota) e playlists.
  async function youtubeLibrary() {
    need('youtube');
    const [playlists, subscriptions] = await Promise.all([
      api('https://www.googleapis.com/youtube/v3/playlists', { part: 'snippet', mine: 'true', maxResults: '25' }),
      api('https://www.googleapis.com/youtube/v3/subscriptions', { part: 'snippet', mine: 'true', maxResults: '50', order: 'relevance' })
    ]);
    return {
      playlists: (playlists.items || []).map(p => ({ id: p.id, title: p.snippet?.title || 'Playlist' })),
      channels: (subscriptions.items || []).map(s => s.snippet?.resourceId?.channelId).filter(Boolean)
    };
  }
  async function youtubeCollection(kind, id) {
    need('youtube');
    if (kind === 'liked') {
      const data = await api('https://www.googleapis.com/youtube/v3/videos', { part: 'snippet', myRating: 'like', maxResults: '50' });
      return (data.items || []).map(v => asVideo(v.id, v.snippet)).filter(visible);
    }
    if (kind === 'playlist') {
      if (!/^[\w-]{10,64}$/.test(String(id))) throw new Error('Playlist inválida');
      const data = await api('https://www.googleapis.com/youtube/v3/playlistItems', { part: 'snippet', playlistId: id, maxResults: '50' });
      return (data.items || []).map(v => asVideo(v.snippet?.resourceId?.videoId, v.snippet)).filter(visible);
    }
    if (kind === 'subscriptions') {
      const { channels } = await youtubeLibrary();
      const feeds = await Promise.allSettled(channels.slice(0, 30).map(channel => youtube.channelVideos(channel)));
      return feeds.filter(f => f.status === 'fulfilled').flatMap(f => f.value.slice(0, 3)).sort((a, b) => b.published.localeCompare(a.published)).slice(0, 40);
    }
    throw new Error('Coleção inválida');
  }

  return { status, configure, connect, disconnect, calendarEvents, youtubeLibrary, youtubeCollection };
}

module.exports = { createGoogle };
