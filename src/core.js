export const dayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function initialState() {
  return { version: 1, room: 'study', mode: 'focus', durations: { focus: 50, short: 10, long: 20 }, remaining: 3000000, running: false, cursor: null, sessions: [], tasks: [], media: '', background: 'forest', volumes: { master: 60, rain: 0, ocean: 0, fire: 0, delta: 0, theta: 0 }, completed: 0 };
}
// Account only for elapsed focus, capped at the end of the current timer.
export function advance(state, now = Date.now()) {
  if (!state.running) return false;
  const elapsed = Math.min(state.remaining, Math.max(0, now - state.cursor));
  if (state.mode === 'focus' && elapsed > 0) {
    const last = state.sessions.at(-1);
    if (last && last.room === state.room && last.end === state.cursor) last.end += elapsed;
    else state.sessions.push({ room: state.room, start: state.cursor, end: state.cursor + elapsed });
  }
  state.remaining -= elapsed;
  state.cursor = now;
  if (state.remaining <= 0) { state.running = false; state.cursor = null; if (state.mode === 'focus') state.completed++; return true; }
  return false;
}
export function bounds(period, date = new Date()) {
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  if (period === 'last7' || period === 'last14') {
    const end = new Date(start); end.setDate(end.getDate() + 1);
    start.setDate(start.getDate() - (period === 'last7' ? 6 : 13));
    return [start, end];
  }
  if (period === 'week') start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  if (period === 'month') start.setDate(1);
  if (period === 'year') start.setMonth(0, 1);
  const end = new Date(start);
  if (period === 'year') end.setFullYear(end.getFullYear() + 1);
  else if (period === 'month') end.setMonth(end.getMonth() + 1);
  else end.setDate(end.getDate() + (period === 'week' ? 7 : 1));
  return [start, end];
}
export function total(sessions, start, end, room) {
  return sessions.filter(s => !room || s.room === room).reduce((sum, s) => sum + Math.max(0, Math.min(s.end, +end) - Math.max(s.start, +start)), 0);
}
export function buckets(sessions, period, date = new Date(), room) {
  const [start, end] = bounds(period, date); const result = []; let cursor = new Date(start);
  while (cursor < end) {
    const next = new Date(cursor);
    if (period === 'day') next.setHours(next.getHours() + 1);
    else if (period === 'year') next.setMonth(next.getMonth() + 1);
    else next.setDate(next.getDate() + 1);
    result.push({ label: period === 'day' ? `${cursor.getHours()}h` : period === 'year' ? cursor.toLocaleDateString('pt-BR', { month: 'short' }) : String(cursor.getDate()), value: total(sessions, cursor, next, room) });
    cursor = next;
  }
  return result;
}
export function embedUrl(value) {
  let url; try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtu.be' || host === 'youtube.com' || host === 'm.youtube.com') {
    const id = host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
    if (/^[\w-]{11}$/.test(id || '')) return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  if (host === 'open.spotify.com') {
    const match = url.pathname.match(/^\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)$/);
    if (match) return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
  }
  if (host === 'music.apple.com' && /^\/[a-z]{2}\/(album|playlist|station)\//.test(url.pathname)) return `https://embed.music.apple.com${url.pathname}${url.search}`;
  return null;
}

// Current local-day streak; yesterday remains active until today has ended.
export function focusStreak(sessions, now = new Date()) {
  const daily = new Map();
  for (const session of sessions) {
    let cursor = session.start;
    const end = Math.min(session.end, +now);
    if (!Number.isFinite(cursor) || !Number.isFinite(end)) continue;
    while (cursor < end) {
      const next = new Date(cursor); next.setHours(24, 0, 0, 0);
      const stop = Math.min(end, +next), key = dayKey(new Date(cursor));
      daily.set(key, (daily.get(key) || 0) + stop - cursor);
      cursor = stop;
    }
  }
  const date = new Date(now); date.setHours(0, 0, 0, 0);
  if (!daily.has(dayKey(date))) date.setDate(date.getDate() - 1);
  let days = 0, time = 0;
  while (daily.has(dayKey(date))) {
    days++; time += daily.get(dayKey(date)); date.setDate(date.getDate() - 1);
  }
  return { days, time };
}
