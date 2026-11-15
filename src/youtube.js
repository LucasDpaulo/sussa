import { categories, pickVideos } from './youtube-catalog.js';
import { googleStatus, cleanError } from './google-account.js';

// No desktop, o processo principal busca os feeds; na versão web, o servidor local faz isso.
const api = window.desktopYouTube ?? {
  channel: async id => { const r = await fetch(`/api/youtube/channel/${id}`); if (!r.ok) throw new Error('Feed indisponível'); return r.json(); },
  embeddable: async id => { const r = await fetch(`/api/youtube/embeddable/${id}`); return r.ok ? r.json() : true; }
};
const periods = [['all', 'Todos'], ['day', 'Dia'], ['night', 'Noite']];
// Categoria extra quando a conta Google está conectada (só no desktop).
const account = { id: 'account', title: 'Sua conta', music: true };

export function initYouTubeCatalog({ preferences, save, toast, play }) {
  const prefs = preferences.youtube = { category: 'study', period: 'all', collection: 'liked', ...preferences.youtube };
  if (![...categories, account].some(c => c.id === prefs.category)) prefs.category = 'study';
  const feeds = new Map(), collections = new Map();
  let library = null;
  let request = 0;

  const dialog = document.createElement('dialog');
  dialog.id = 'youtube-catalog';
  dialog.innerHTML = `<header><h2>Explorar YouTube</h2><button data-close aria-label="Fechar">×</button></header>
    <div class="yt-filters"><div class="yt-tabs" role="group" aria-label="Categoria"><button type="button" data-yt-category="account" hidden>★ Sua conta</button>${categories.map(c => `<button type="button" data-yt-category="${c.id}">${c.title}</button>`).join('')}</div>
    <div class="yt-tabs yt-period" role="group" aria-label="Período">${periods.map(([id, label]) => `<button type="button" data-yt-period="${id}">${label}</button>`).join('')}</div></div>
    <div class="yt-tabs yt-account" role="group" aria-label="Coleção" hidden></div>
    <p id="yt-status" role="status"></p><div id="yt-grid"></div>
    <p class="hint">Os vídeos tocam como fundo pelo player oficial do YouTube e podem exibir anúncios. O som, a pausa e o enquadramento ficam na barra do rodapé da tela.</p>`;
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector);
  dialog.querySelector('[data-close]').onclick = () => dialog.close();

  const open = document.createElement('button');
  open.id = 'open-youtube'; open.type = 'button'; open.className = 'primary';
  open.textContent = '▶ Explorar vídeos do YouTube';
  open.onclick = () => { dialog.showModal(); render(); };
  document.querySelector('#youtube-slot')?.append(open);

  function card(video, category) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'yt-card'; button.dataset.video = video.id;
    button.classList.toggle('active', preferences.scene === 'youtube' && preferences.videoUrl.endsWith(video.id));
    const img = document.createElement('img');
    img.src = `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    const title = document.createElement('span'); title.className = 'yt-title'; title.textContent = video.title;
    const channel = document.createElement('small'); channel.textContent = video.channel;
    button.append(img, title, channel);
    button.onclick = async () => {
      button.disabled = true;
      // Se a verificação falhar por rede, tenta tocar mesmo assim.
      const allowed = await api.embeddable(video.id).catch(() => true);
      if (!allowed) { button.classList.add('blocked'); button.title = 'O autor não permite tocar este vídeo fora do YouTube.'; return toast('Este vídeo só pode ser visto no YouTube. Escolha outro.'); }
      button.disabled = false;
      play(video, { music: Boolean(category.music) });
      dialog.close();
    };
    return button;
  }

  async function renderAccount(current) {
    const bar = $('.yt-account'); bar.hidden = false;
    try {
      library ??= await window.desktopGoogle.youtubeLibrary();
      if (current !== request) return;
      const tabs = [['liked', 'Curtidos'], ['subscriptions', 'Inscrições'], ...library.playlists.map(p => [`playlist:${p.id}`, p.title])];
      if (!tabs.some(([id]) => id === prefs.collection)) prefs.collection = 'liked';
      bar.replaceChildren(...tabs.map(([id, label]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.ytCollection = id; b.textContent = label; b.setAttribute('aria-pressed', id === prefs.collection); return b; }));
      if (!collections.has(prefs.collection)) {
        const [kind, id] = prefs.collection.split(':');
        collections.set(prefs.collection, await window.desktopGoogle.youtubeCollection(kind, id));
      }
      if (current !== request) return;
      const videos = collections.get(prefs.collection);
      $('#yt-grid').replaceChildren(...videos.map(video => card(video, account)));
      $('#yt-status').textContent = videos.length ? '' : 'Nada por aqui ainda.';
    } catch (error) {
      if (current !== request) return;
      $('#yt-grid').replaceChildren(); $('#yt-status').textContent = cleanError(error);
    }
  }

  async function render() {
    const connected = googleStatus().youtube;
    $('[data-yt-category=account]').hidden = !connected;
    if (prefs.category === 'account' && !connected) prefs.category = 'study';
    const current = ++request;
    dialog.querySelectorAll('[data-yt-category]').forEach(b => b.setAttribute('aria-pressed', b.dataset.ytCategory === prefs.category));
    $('.yt-account').hidden = true;
    if (prefs.category === 'account') { $('.yt-period').hidden = true; $('#yt-status').textContent = 'Carregando seus vídeos…'; return renderAccount(current); }
    const category = categories.find(c => c.id === prefs.category);
    dialog.querySelectorAll('[data-yt-category]').forEach(b => b.setAttribute('aria-pressed', b.dataset.ytCategory === category.id));
    dialog.querySelectorAll('[data-yt-period]').forEach(b => b.setAttribute('aria-pressed', b.dataset.ytPeriod === prefs.period));
    $('.yt-period').hidden = !category.period;
    $('#yt-status').textContent = 'Carregando vídeos…';
    if (!feeds.has(category.id)) {
      const results = await Promise.allSettled(Object.keys(category.channels).map(id => api.channel(id)));
      const lists = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      // Só guarda quando ao menos um canal respondeu, para tentar de novo depois de uma falha de rede.
      if (lists.length) feeds.set(category.id, lists);
      if (current !== request) return;
      if (!lists.length) { $('#yt-grid').replaceChildren(); $('#yt-status').textContent = 'Não foi possível carregar os vídeos. Verifique a conexão com a internet.'; return; }
    }
    if (current !== request) return;
    const videos = pickVideos(category, feeds.get(category.id), category.period ? prefs.period : 'all');
    $('#yt-grid').replaceChildren(...videos.map(video => card(video, category)));
    $('#yt-status').textContent = videos.length ? '' : 'Nenhum vídeo encontrado com esse filtro.';
  }

  dialog.addEventListener('click', event => {
    const category = event.target.closest('[data-yt-category]')?.dataset.ytCategory;
    const period = event.target.closest('[data-yt-period]')?.dataset.ytPeriod;
    const collection = event.target.closest('[data-yt-collection]')?.dataset.ytCollection;
    if (category) prefs.category = category;
    if (period) prefs.period = period;
    if (collection) prefs.collection = collection;
    if (category || period || collection) { save(); render(); }
  });
  // Trocar de conta (ou desconectar) invalida o que veio da conta anterior.
  document.addEventListener('google:changed', () => { library = null; collections.clear(); if (dialog.open) render(); });
}
