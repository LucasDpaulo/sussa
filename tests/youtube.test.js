import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { categories, pickVideos, isNight } from '../src/youtube-catalog.js';
const { parseFeed } = createRequire(import.meta.url)('../desktop/youtube.cjs');

const entry = (id, title, published, channel = 'Canal') => `<entry><id>yt:video:${id}</id><yt:videoId>${id}</yt:videoId><title>${title}</title><author><name>${channel}</name></author><published>${published}</published><media:group><media:title>${title}</media:title><media:community><media:statistics views="42"/></media:community></media:group></entry>`;

test('parses the public channel feed and decodes entities', () => {
  const xml = `<feed><title>Canal</title>${entry('abcdefghijk', 'Rain &amp; Jazz &#39;24&#39; &#x1F327;', '2026-11-01T10:00:00+00:00', 'Lo &amp; Fi')}${entry('bad', 'sem id válido', '2026-01-01')}</feed>`;
  assert.deepEqual(parseFeed(xml), [{ id: 'abcdefghijk', title: "Rain & Jazz '24' 🌧", channel: 'Lo & Fi', published: '2026-11-01T10:00:00+00:00', views: 42 }]);
});

test('every curated channel id is well formed', () => {
  for (const category of categories) for (const id of Object.keys(category.channels)) assert.match(id, /^UC[\w-]{22}$/, `${category.id}: ${id}`);
});

test('picks on-topic videos, alternating channels, filtered by day or night', () => {
  const sea = categories.find(c => c.id === 'sea');
  const v = (id, title, day) => ({ id: id.padEnd(11, 'x'), title, channel: id[0], published: `2026-11-${day}T00:00:00Z` });
  const feeds = [
    [v('a1', 'Ocean waves at night', '10'), v('a2', 'Beach sunrise', '09'), v('a3', 'Office vlog', '12')],
    [v('b1', 'Tropical beach 4K', '05'), v('b2', 'Moonlit sea', '04')]
  ];
  assert.deepEqual(pickVideos(sea, feeds).map(x => x.title), ['Ocean waves at night', 'Tropical beach 4K', 'Beach sunrise', 'Moonlit sea']);
  assert.deepEqual(pickVideos(sea, feeds, 'night').map(x => x.title), ['Ocean waves at night', 'Moonlit sea']);
  assert.deepEqual(pickVideos(sea, feeds, 'day').map(x => x.title), ['Beach sunrise', 'Tropical beach 4K']);
  assert.equal(pickVideos(sea, feeds, 'all', 3).length, 3);
  assert.ok(isNight('Tokyo at Night') && isNight('밤 공부') && !isNight('Sunny morning walk'));
});

const { parsePlaylist, extractInitialData } = createRequire(import.meta.url)('../desktop/youtube.cjs');
test('reads both public playlist formats, skips unavailable videos and extracts continuation', () => {
  const modern = { lockupViewModel: { contentType: 'LOCKUP_CONTENT_TYPE_VIDEO', contentId: 'abcdefghijk', metadata: { lockupMetadataViewModel: { title: { content: 'Study night' }, metadata: { contentMetadataViewModel: { metadataRows: [{ metadataParts: [{ text: { content: 'Study channel' } }] }] } } } } } };
  const legacy = { playlistVideoRenderer: { videoId: '12345678901', title: { runs: [{ text: 'Study day' }] }, shortBylineText: { runs: [{ text: 'Other channel' }] } } };
  const unavailable = { playlistVideoRenderer: { ...legacy.playlistVideoRenderer, videoId: 'xxxxxxxxxxx', isPlayable: false } };
  const next = { continuationItemViewModel: { continuationCommand: { innertubeCommand: { continuationCommand: { token: 'next-page' } } } } };
  const page = parsePlaylist({ contents: [modern, legacy, modern, unavailable, next] });
  assert.deepEqual(page.videos.map(v => v.id), ['abcdefghijk', '12345678901']);
  assert.equal(page.videos[0].channel, 'Study channel');
  assert.equal(page.continuation, 'next-page');
  assert.equal(parsePlaylist({ contents: [{ continuationItemRenderer: { continuationEndpoint: { continuationCommand: { token: 'legacy-next' } } } }] }).continuation, 'legacy-next');
});

test('extracts initial data despite braces and escaped quotes in video titles', () => {
  const data = { contents: [{ title: 'Study } "rain" { night' }] };
  assert.deepEqual(extractInitialData(`<script>var ytInitialData = ${JSON.stringify(data)};</script>`), data);
  assert.throws(() => extractInitialData('<html>Consent required</html>'));
});

test('can select beyond the former 30-video cap while keeping topic and period', () => {
  const study = categories.find(c => c.id === 'study');
  const videos = Array.from({ length: 80 }, (_, i) => ({ id: String(i), title: i % 2 ? 'Study night' : 'Study morning', published: '' }));
  const result = pickVideos(study, [videos, videos], 'night', Infinity);
  assert.equal(result.length, 40);
  assert.equal(new Set(result.map(v => v.id)).size, 40);
});

test('rain category keeps rain and thunderstorms, excludes unrelated scenery and respects night', () => {
  const rain = categories.find(c => c.id === 'rain');
  const titles = ['Rain on window at night', 'Chuva na floresta', 'Thunderstorm sounds', 'Rainforest birds', 'Ocean waves without rain', 'Rainbow sky', 'Rainy morning'];
  const videos = titles.map((title, i) => ({ id: String(i), title, published: '' }));
  assert.deepEqual(pickVideos(rain, [videos]).map(v => v.title), [titles[0], titles[1], titles[2], titles[6]]);
  assert.deepEqual(pickVideos(rain, [videos], 'night').map(v => v.title), [titles[0]]);
});
