import { categories, pickVideos } from './youtube-catalog.js';
import { googleStatus, cleanError } from './google-account.js';

// No desktop, o processo principal busca os feeds; na versão web, o servidor local faz isso.
const api = window.desktopYouTube ?? {
  page: async (id, cursor) => { const r = await fetch(`/api/youtube/page/${id}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`); if (!r.ok) throw new Error('Catálogo indisponível'); return r.json(); },
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
  let paging = null;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const dialog = document.createElement('dialog');
  dialog.id = 'youtube-catalog';
  dialog.innerHTML = `<header><h2>Explorar YouTube</h2><button data-close aria-label="Fechar">×</button></header>
    <div class="yt-filters"><div class="yt-tabs" role="group" aria-label="Categoria"><button type="button" data-yt-category="account" hidden>★ Sua conta</button>${categories.map(c => `<button type="button" data-yt-category="${c.id}">${c.title}</button>`).join('')}</div>
    <div class="yt-tabs yt-period" role="group" aria-label="Período">${periods.map(([id, label]) => `<button type="button" data-yt-period="${id}">${label}</button>`).join('')}</div></div>
    <div class="yt-tabs yt-account" role="group" aria-label="Coleção" hidden></div>
    <p id="yt-status" role="status"></p><div id="yt-grid"></div><button type="button" id="yt-more" hidden>Carregar mais vídeos</button>
    <p class="hint">Os vídeos tocam como fundo pelo player oficial do YouTube e podem exibir anúncios. O som, a pausa e o enquadramento ficam na barra do rodapé da tela.</p>`;
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector);
  const grid = $('#yt-grid');
  function beginUpdate() {
    grid.inert = true;
    grid.setAttribute('aria-busy', 'true');
    grid.classList.add('is-updating');
  }
  function finishUpdate() {
    grid.inert = false;
    grid.removeAttribute('aria-busy');
    grid.classList.remove('is-updating');
    if (!reducedMotion.matches && dialog.open) {
      grid.getAnimations().forEach(animation => animation.cancel());
      grid.animate([{ opacity: .4, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], {
        duration: 240, easing: 'cubic-bezier(.22,.8,.25,1)'
      });
    }
  }
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
      finishUpdate();
      $('#yt-status').textContent = videos.length ? '' : 'Nada por aqui ainda.';
    } catch (error) {
      if (current !== request) return;
      $('#yt-grid').replaceChildren(); $('#yt-status').textContent = cleanError(error);
      finishUpdate();
    }
  }

  const more = $('#yt-more');
  more.onclick = () => loadMore();
  dialog.addEventListener('scroll', () => {
    if (!more.hidden && !more.disabled && dialog.scrollHeight - dialog.scrollTop - dialog.clientHeight < 450) loadMore();
  });
  dialog.addEventListener('close', () => { request++; paging = null; grid.inert = false; grid.classList.remove('is-updating'); grid.removeAttribute('aria-busy'); });

  async function loadMore() {
    const state = paging;
    if (!state || state.busy || state.current !== request) return;
    state.busy = true;
    more.disabled = true;
    more.textContent = 'Carregando mais vídeos…';
    let failed = false;
    try {
      let candidates = pickVideos(state.category, state.channels.map(c => c.videos), state.period, Infinity).filter(v => !state.seen.has(v.id));
      // Uma rodada por interação: filtros estreitos podem não encontrar itens nesta página.
      if (candidates.length < 30) {
        const pending = state.channels.filter(c => !c.done);
        const results = await Promise.allSettled(pending.map(async channel => {
          const page = await api.page(channel.id, channel.cursor);
          channel.videos.push(...page.videos);
          channel.done = !page.nextCursor || page.nextCursor === channel.cursor;
          channel.cursor = page.nextCursor;
        }));
        failed = results.some(r => r.status === 'rejected');
        if (state.current !== request) return;
        candidates = pickVideos(state.category, state.channels.map(c => c.videos), state.period, Infinity).filter(v => !state.seen.has(v.id));
      }
      const batch = candidates.slice(0, 30);
      const cards = batch.map(video => { state.seen.add(video.id); return card(video, state.category); });
      if (state.replace) {
        grid.replaceChildren(...cards);
        state.replace = false;
        finishUpdate();
      } else grid.append(...cards);
      const hasMore = candidates.length > batch.length || state.channels.some(c => !c.done);
      more.hidden = !hasMore;
      $('#yt-status').textContent = failed ? 'Alguns canais não responderam. Tente carregar mais novamente.' : !state.seen.size ? (hasMore ? 'Nenhum resultado nesta página. Continue buscando mais vídeos.' : 'Nenhum vídeo encontrado com esse filtro.') : '';
      more.textContent = failed ? 'Tentar carregar mais vídeos' : 'Carregar mais vídeos';
      if (!hasMore && state.seen.size) { more.hidden = false; more.textContent = 'Você chegou ao fim dos vídeos deste filtro.'; }
      more.disabled = !hasMore;
    } catch {
      if (state.current !== request) return;
      if (state.replace) finishUpdate();
      $('#yt-status').textContent = 'Não foi possível carregar mais vídeos. Tente novamente.';
      more.textContent = 'Tentar novamente'; more.disabled = false;
    } finally { state.busy = false; }
  }

  async function render() {
    const connected = googleStatus().youtube;
    $('[data-yt-category=account]').hidden = !connected;
    if (prefs.category === 'account' && !connected) prefs.category = 'study';
    const current = ++request;
    paging = null; more.hidden = true; more.disabled = false;
    beginUpdate();
    dialog.scrollTop = 0;
    dialog.querySelectorAll('[data-yt-category]').forEach(b => b.setAttribute('aria-pressed', b.dataset.ytCategory === prefs.category));
    $('.yt-account').hidden = true;
    if (prefs.category === 'account') { $('.yt-period').hidden = true; $('#yt-status').textContent = 'Carregando seus vídeos…'; return renderAccount(current); }
    const category = categories.find(c => c.id === prefs.category);
    dialog.querySelectorAll('[data-yt-category]').forEach(b => b.setAttribute('aria-pressed', b.dataset.ytCategory === category.id));
    dialog.querySelectorAll('[data-yt-period]').forEach(b => b.setAttribute('aria-pressed', b.dataset.ytPeriod === prefs.period));
    $('.yt-period').hidden = !category.period;
    $('#yt-status').textContent = 'Carregando vídeos…';
    // Mantém as páginas já carregadas por categoria durante esta sessão.
    if (feeds.has(category.id) && Date.now() - feeds.get(category.id).at > 2 * 60 * 60 * 1000) feeds.delete(category.id);
    if (!feeds.has(category.id)) {
      const channels = Object.keys(category.channels).map(id => ({ id, videos: [], cursor: null, done: false }));
      channels.at = Date.now();
      feeds.set(category.id, channels);
    }
    paging = { current, category, period: category.period ? prefs.period : 'all', channels: feeds.get(category.id), seen: new Set(), busy: false, replace: true };
    more.hidden = false;
    await loadMore();
  }

  dialog.addEventListener('click', event => {
    const category = event.target.closest('[data-yt-category]')?.dataset.ytCategory;
    const period = event.target.closest('[data-yt-period]')?.dataset.ytPeriod;
    const collection = event.target.closest('[data-yt-collection]')?.dataset.ytCollection;
    if ((category && category === prefs.category) || (period && period === prefs.period) || (collection && collection === prefs.collection)) return;
    if (category) prefs.category = category;
    if (period) prefs.period = period;
    if (collection) prefs.collection = collection;
    if (category || period || collection) { save(); render(); }
  });
  // Trocar de conta (ou desconectar) invalida o que veio da conta anterior.
  document.addEventListener('google:changed', () => { library = null; collections.clear(); if (dialog.open) render(); });
}
