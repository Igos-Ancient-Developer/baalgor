// Кровавый уровень недели: раз в неделю один открытый уровень подсвечен на карте красным. Проходится только на «Ночном кошмаре» (одна жизнь),
// враги крепче обычного; награда один раз за неделю: души и кристаллы. Выбор стабилен всю неделю (хранится в save.weekly).
import * as D from './data.js?v=20261028210620';
import * as M from './meta.js?v=20261028210620';
export const WEEKLY = { souls: 500, gems: 5, hp: 1.35, diff: 4 };
export function isoWeek(d = new Date()) {                         // та же неделя, что и на сервере: to_char(now() at time zone 'utc', 'IYYY-"W"IW')
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())), day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day); const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return y + '-W' + String(w).padStart(2, '0');
}
export function weeklyState(save) {
  const wk = isoWeek(); let w = save.weekly;
  if (!w || w.wk !== wk) {
    const open = D.MAPS.filter((l) => !l.tutorial && M.levelUnlocked(save, l)), hard = open.filter((l) => l.lvl >= 9), pool = hard.length ? hard : open;
    let h = 7; for (const ch of wk) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    save.weekly = w = { wk, id: pool.length ? pool[h % pool.length].id : null, done: false, won: false };
  }
  return w;
}
export const weeklyActive = (save, levelId) => { const w = weeklyState(save); return !!w.id && w.id === levelId && !w.done; };
