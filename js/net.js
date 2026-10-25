// Клиент рейтингов (Supabase REST, без SDK). Все вызовы — через RPC-функции из supabase/schema.sql.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js?v=20261025121926';

const tg = window.Telegram && window.Telegram.WebApp;
const cache = new Map();

async function rpc(fn, body, { timeout = 7000, keepalive = false } = {}) {
  if (!Net.enabled) throw new Error('offline');
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', signal: ctl.signal, keepalive, headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    if (!r.ok) throw new Error('http ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
async function cached(key, ttl, fn) {
  const c = cache.get(key); if (c && Date.now() - c.t < ttl) return c.v;
  const v = await fn(); cache.set(key, { t: Date.now(), v }); return v;
}

export const Net = {
  enabled: !!(SUPABASE_URL && SUPABASE_KEY),
  // Telegram-пользователь (для подсветки «меня» в таблицах). Подпись проверяет сервер при отправке результата.
  me() { const u = tg && tg.initDataUnsafe && tg.initDataUnsafe.user; return u ? { id: u.id, name: u.first_name || u.username || 'Игрок', username: u.username || null, photo: u.photo_url || null } : null; },
  canSubmit() { return this.enabled && !!(tg && tg.initData); },

  levelTops(levelId) { return cached('tops:' + levelId, 15000, () => rpc('level_tops', { p_level: levelId })); },
  levelBoard(levelId, diff, offset = 0, limit = 50) { return rpc('level_board', { p_level: levelId, p_diff: diff, p_limit: limit, p_offset: offset }); },
  async levelRank(levelId, diff) { const me = this.me(); if (!me) return null; const r = await rpc('level_rank', { p_level: levelId, p_diff: diff, p_tg: me.id }); return r[0] || null; },
  globalBoard(offset = 0, limit = 50) { return rpc('global_board', { p_limit: limit, p_offset: offset }); },
  async globalRank() { const me = this.me(); if (!me) return null; const r = await rpc('global_rank', { p_tg: me.id }); return r[0] || null; },
  invalidate(levelId) { cache.delete('tops:' + levelId); },

  // кошелёк и магазин (серверные функции из supabase/schema.sql и supabase/functions)
  call(fn, body) { return rpc(fn, body, { timeout: 10000 }); },
  initData() { return tg && tg.initData; },
  // счёт в Telegram Stars: возвращает { link } или { error }
  async invoice(pack) {
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/create-invoice`, { method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ init_data: tg.initData, pack }) });
      return await r.json();
    } catch (e) { return { error: 'net' }; }
  },

  // Отправка результата партии. Возвращает { ok, level_rank, global_rank, improved, best, total } или { error }
  async submit({ level, diff, score, wave, kills, won, duration, lv = 0, loadout = '' }, { keepalive = false } = {}) {
    if (!this.canSubmit()) return { error: 'noauth' };
    try {
      const r = await rpc('submit_run', { init_data: tg.initData, p: { level, diff, score: Math.round(score), wave, kills, won: !!won, duration: Math.round(duration || 0), lv, loadout } }, { timeout: 10000, keepalive });
      this.invalidate(level);
      return r;
    } catch (e) { return { error: 'net' }; }
  },
};
