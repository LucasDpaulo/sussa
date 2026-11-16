// Catálogo do YouTube sem chave de API: cada canal tem um feed público com os 15 envios mais recentes.
// O prefixo UULF no lugar de UC devolve só vídeos longos, sem Shorts nem lives.
const cache = new Map();
const TTL = 3 * 60 * 60 * 1000;
const channelId = /^UC[\w-]{22}$/;
const videoId = /^[\w-]{11}$/;

function decode(text) {
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, code) => {
    if (code[0] === '#') return String.fromCodePoint(code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1)));
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[code.toLowerCase()];
  });
}

function parseFeed(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, entry]) => ({
    id: entry.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1],
    title: decode(entry.match(/<title>([^<]*)<\/title>/)?.[1] ?? '').trim(),
    channel: decode(entry.match(/<author>\s*<name>([^<]*)<\/name>/)?.[1] ?? '').trim(),
    published: entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? '',
    views: Number(entry.match(/<media:statistics views="(\d+)"/)?.[1] ?? 0)
  })).filter(video => video.id && video.title);
}

async function request(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'Accept-Language': 'pt-BR,en;q=0.8' } });
  return response;
}

async function channelVideos(id) {
  if (!channelId.test(id)) throw new Error('Canal inválido');
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL) return hit.videos;
  const response = await request(`https://www.youtube.com/feeds/videos.xml?playlist_id=UULF${id.slice(2)}`);
  if (!response.ok) throw new Error(`Feed indisponível (${response.status})`);
  const videos = parseFeed(await response.text());
  cache.set(id, { at: Date.now(), videos });
  return videos;
}

// Alguns autores proíbem tocar o vídeo fora do YouTube; o oEmbed responde 401/403 nesses casos.
async function embeddable(id) {
  if (!videoId.test(id)) return false;
  const response = await request(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
  return response.ok;
}

module.exports = { channelVideos, embeddable, parseFeed };

// A playlist pública permite continuar além dos 15 itens do RSS.
const pages = new Map();
const cursors = new Map();
const { randomUUID } = require('node:crypto');
function parsePlaylist(data) {
  const videos = [], seen = new Set();
  let continuation = null;
  const label = value => value?.simpleText ?? value?.runs?.map(run => run.text).join('') ?? '';
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    const model = node.lockupViewModel;
    if (model?.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO' && videoId.test(model.contentId) && !seen.has(model.contentId)) {
      const meta = model.metadata?.lockupMetadataViewModel;
      if (meta?.title?.content) {
        seen.add(model.contentId);
        videos.push({ id: model.contentId, title: meta.title.content, channel: meta.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content ?? '', published: '' });
      }
    }
    const video = node.playlistVideoRenderer;
    if (video && videoId.test(video.videoId) && video.isPlayable !== false && !seen.has(video.videoId)) {
      seen.add(video.videoId);
      videos.push({ id: video.videoId, title: label(video.title), channel: label(video.shortBylineText), published: '' });
    }
    const token = node.continuationItemViewModel?.continuationCommand?.innertubeCommand?.continuationCommand?.token ?? node.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token ?? node.continuationItemRenderer?.continuationEndpoint?.commandExecutorCommand?.commands?.find(c => c.continuationCommand)?.continuationCommand?.token;
    if (token) continuation = token;
    for (const value of Object.values(node)) if (typeof value === 'object') visit(value);
  }
  visit(data);
  return { videos, continuation };
}
function extractInitialData(html) {
  const marker = /(?:var\s+ytInitialData|window\["ytInitialData"\]|ytInitialData)\s*=\s*/g;
  const match = marker.exec(html);
  if (!match) throw new Error('Catálogo indisponível');
  const start = marker.lastIndex;
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; }
    else if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return JSON.parse(html.slice(start, i + 1));
  }
  throw new Error('Resposta incompleta do catálogo');
}
async function channelPage(id, cursor = null) {
  if (!channelId.test(id)) throw new Error('Canal inválido');
  for (const [key, value] of cursors) if (Date.now() - value.at >= TTL) cursors.delete(key);
  for (const [key, value] of pages) if (Date.now() - value.at >= TTL) pages.delete(key);
  const key = `${id}:${cursor ?? 'first'}`;
  if (pages.has(key)) return pages.get(key).page;
  let data, context;
  if (cursor !== null) {
    const next = cursors.get(cursor);
    if (!next || next.id !== id) throw new Error('Página expirada; reabra o catálogo');
    context = next.context;
    const response = await fetch('https://www.youtube.com/youtubei/v1/browse', {
      method: 'POST', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context, continuation: next.token })
    });
    if (!response.ok) throw new Error('Não foi possível carregar mais vídeos');
    data = await response.json();
  } else {
    const response = await request(`https://www.youtube.com/playlist?list=UULF${id.slice(2)}&hl=en`);
    if (!response.ok) throw new Error('Catálogo indisponível');
    const html = await response.text();
    data = extractInitialData(html);
    const version = html.match(/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"\s]+)"/)?.[1];
    if (!version) throw new Error('Catálogo indisponível');
    context = { client: { clientName: 'WEB', clientVersion: version, hl: 'en', gl: 'US' } };
  }
  if (data.error) throw new Error('Catálogo indisponível');
  const parsed = parsePlaylist(data);
  const nextCursor = parsed.continuation ? randomUUID() : null;
  if (nextCursor) cursors.set(nextCursor, { id, token: parsed.continuation, context, at: Date.now() });
  const page = { videos: parsed.videos, nextCursor };
  pages.set(key, { page, at: Date.now() });
  return page;
}
module.exports.channelPage = channelPage;
module.exports.parsePlaylist = parsePlaylist;
module.exports.extractInitialData = extractInitialData;
