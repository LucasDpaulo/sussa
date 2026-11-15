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
