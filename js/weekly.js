// Кровавый уровень недели: отдельный узел на карте мира, вне дорог кампании. Раз в неделю (ISO-неделя по UTC, смена в понедельник 00:00 UTC)
// открывается новый уровень: другая раскладка, сектор и крепость врагов (см. configureWeekly в levels.js). Проходится только на «Ночном кошмаре» (одна жизнь).
// Награда один раз за неделю: души и кристаллы. Пройденный уровень повторно не открывается до следующей недели; состояние хранится в save.weekly.
import { WEEKLY_LEVEL, configureWeekly } from './levels.js?v=20261029213125';
export const WEEKLY = { souls: 500, gems: 5, diff: 4 };
export function isoWeek(d = new Date()) {                         // та же неделя, что и на сервере: to_char(now() at time zone 'utc', 'IYYY-"W"IW')
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())), day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day); const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return y + '-W' + String(w).padStart(2, '0');
}
// сколько осталось до конца недели (до понедельника 00:00 UTC)
export function weekLeft(now = Date.now()) {
  const d = new Date(now), day = d.getUTCDay() || 7, end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + (8 - day));
  const ms = Math.max(0, end - now), m = Math.floor(ms / 6e4);
  return { ms, d: Math.floor(m / 1440), h: Math.floor((m % 1440) / 60), m: m % 60 };
}
export const leftText = (l) => `${l.d ? l.d + ' д ' : ''}${l.h} ч ${l.m} мин`;
let cfgWk = null;
export function weeklyState(save) {
  const wk = isoWeek(); let w = save.weekly;
  if (!w || w.wk !== wk) save.weekly = w = { wk, done: false, won: false };
  if (cfgWk !== wk) { configureWeekly(wk); cfgWk = wk; }       // уровень этой недели
  return w;
}
export const weeklyOpen = (save) => !weeklyState(save).done;
export { WEEKLY_LEVEL };
