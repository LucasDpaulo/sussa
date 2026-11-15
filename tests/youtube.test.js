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
