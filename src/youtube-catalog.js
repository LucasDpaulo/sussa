// Canais curados por nicho. `match` mantém só os vídeos do tema quando o canal mistura assuntos.
export const categories = [
  { id: 'study', title: 'Study with me', music: true,
    match: /study|pomodoro|focus|estud|공부/i,
    channels: {
      'UCgs6PAI_b_qpOSy74GkjsGQ': 'Sean Study', 'UC84whx2xxsiA1gXHXXqKGOA': 'Abao in Tokyo', 'UCMswCjA7v8_7Pyk5iIxpvWg': 'Focus with Yoo',
      'UCwaMXiEfLn3UtpC2I0E2jxQ': 'Celine', 'UCEV6sTdPeIYGArydcl2i9Qw': 'tani study', 'UCt5uTgBnQ9imcAvUTOJvtKA': 'The Late Desk'
    } },
  { id: 'lofi', title: 'Lo-fi e jazz', music: true,
    match: /lo-?fi|jazz|beats|mix|playlist|bgm|music|radio|hours?\b|\d+h\b|study|focus/i,
    exclude: /trailer|teaser|headphones|merch|animated clip|behind the scenes/i,
    channels: {
      'UCSJ4gkVC6NrvII8umztf0Ow': 'Lofi Girl', 'UCOxqgCwgOqC2lMqC5PYz_Dg': 'Chillhop Music', 'UCM6qHi3zNNAMX8HyCPPqdhA': 'OFF:HOUR',
      'UC62G2TNz-C1JCcJwjehm_aA': "yeon's archive", 'UCISE1Ky_EejwKh0qTsO191A': 'Flow Trigger.', 'UCiC2wfbkgr8DU5uOQFz9OrQ': 'chill chill journal'
    } },
  { id: 'sea', title: 'Mar', period: true,
    match: /ocean|\bsea\b|beach|waves?\b|coast|shore|island|tropical|lagoon|surf|\bmar\b|praia|oceano/i,
    channels: {
      'UCS0pbRqDVOf28toP1f0SqFg': 'Geo Relaxation', 'UCjoFckSzE1jUM_kmtVHNlKg': 'Nature Soundscapes', 'UCCkmgsl8W18oR6c_W7UZ1lQ': 'TheSilentWatcher',
      'UCNjGqISO6V2WFpOFWPC8pIw': 'Naturaleza Viva', 'UCPotnGNahFjLWjfsq4KYvuQ': 'Relaxation Film'
    } },
  { id: 'forest', title: 'Floresta', period: true,
    match: /forest|trees?\b|woods|woodland|jungle|rainforest|river|stream|creek|mountain|lake|birdsong|moss|floresta|natureza/i,
    channels: {
      'UCBKFF-7j2D-1TR0oFPK0Gyw': 'Naturescapes', 'UCCkmgsl8W18oR6c_W7UZ1lQ': 'TheSilentWatcher', 'UCPotnGNahFjLWjfsq4KYvuQ': 'Relaxation Film',
      'UCNX5xjCbiuY5kR-SXXyt0QQ': 'Listening to Earth', 'UC8a40BCgmGBlBvKjdYmgOyQ': 'FOX NATURE', 'UCjoFckSzE1jUM_kmtVHNlKg': 'Nature Soundscapes'
    } },
  { id: 'sky', title: 'Céu', period: true,
    match: /sky|clouds?|stars?|starry|starscape|astro|galaxy|aurora|sunset|sunrise|milky|cosmos|space|time-?lapse|céu|nuvens/i,
    channels: {
      'UC-0JKmwmfF0aE-rTtSU3XVg': 'Night Sky Time Lapse', 'UC4lp9Emg1ci8eo2eDkB-Tag': 'Nature Relaxation Films', 'UCzIJVoH2RGS9Pjzab9rywZg': 'Aerial Earth',
      'UCAtpmRSweddbywYCMp0aOaQ': 'Blue Sky Channel', 'UCw385wfnuiRoB_panBZ1cRQ': 'REST EASY FILMS'
    } },
  { id: 'city', title: 'Cidade', period: true,
    match: /walk|city|street|downtown|urban|tokyo|shibuya|shinjuku|osaka|kyoto|seoul|new york|nyc|manhattan|london|paris|rome|cidade|rain/i,
    channels: {
      'UCeC4PBsmjIuKf682CMk1kKw': 'Shogun Walk', 'UCAcsAE1tpLuP3y7UhxUoWpQ': 'Rambalac', 'UCnvLGayHxWh5YZjpJjZ6WRg': 'WALKS and the CITY',
      'UC_mzz_JnzArhhpGUy8KdGwg': 'Watched Walker', 'UCQ-JKqNo_T0yoeDZff1y7Kw': '4K Urban Life', 'UCqRTj-Nu_8to3jIBlXptOtA': 'Nomadic Ambience',
      'UCEknI50IEwDzpoy0rcsht2g': 'Nature for relaxing'
    } }
];

const night = /night|evening|midnight|dusk|twilight|moon|stars?\b|starry|starscape|astro|galaxy|milky way|aurora|after dark|nocturnal|noite|lua|estrelas|夜|밤/i;
export const isNight = title => night.test(title);

// Junta os canais alternando entre eles (do mais recente para o mais antigo), para nenhum dominar a lista.
export function pickVideos(category, feeds, period = 'all', limit = 30) {
  const seen = new Set();
  const lists = feeds.map(videos => videos
    .filter(video => category.match.test(video.title) && !category.exclude?.test(video.title))
    .filter(video => period === 'all' || (period === 'night') === isNight(video.title))
    .sort((a, b) => b.published.localeCompare(a.published)));
  const result = [];
  for (let round = 0; result.length < limit && lists.some(list => list.length > round); round++) {
    for (const list of lists) {
      const video = list[round];
      if (video && !seen.has(video.id) && result.length < limit) { seen.add(video.id); result.push(video); }
    }
  }
  return result;
}
