// Таблицы выпадения сундуков: только данные, без DOM. Из них js/chests.js делает бросок и показ шансов, tools/gen_chests_sql.mjs — таблицу для сервера (supabase/chests.sql).
// w — вес записи: шанс в процентах = w / сумма весов × 100 (сумма примерно 100, но это не обязательно). Как в кейсах CS2: обычного много, дорогое выпадает очень редко.
// t: souls | gems | unlock (id — здание, которое открывается навсегда) | stars (главный приз: Telegram Stars, выплачивается вручную, строка пишется в chest_jackpots).
// gemsOnly — запись только при оплате кристаллами (при оплате душами её заменяют души).
// Сундуки продаются за Telegram Stars и за души (за кристаллы больше нет). Таблицы ниже — «сырые»; коэффициенты TUNE ужесточают их: кристаллы мельче, башни и особенно премиум реже.
// Сундук за Stars бросается на сервере по полной таблице (CHEST_ROWS); сундук за души — на клиенте по таблице без премиум-башен, кристаллов и главного приза (soulRows).
export const POOL_OF = {
  frost: 'common', toxic: 'common', mortar: 'common', flame: 'common', banner: 'common', saw: 'common',
  harpoon: 'mid', tesla: 'mid', voidwell: 'mid', bank: 'mid', altar: 'mid', magnet: 'mid', grinder: 'mid', bell: 'mid', miner: 'mid', pendulum: 'mid',
  gold_bolt: 'prem', storm_tesla: 'prem', hell_flame: 'prem', thunder: 'prem', winter: 'prem', bloodstorm: 'prem', plague: 'prem',
};
export const TUNE = { gems: 0.6, tower: 0.5, prem: 0.3 };
const T = (id, w) => ({ w, t: 'unlock', id });
const RAW = {
  wood: { souls: 300, stars: 9, rows: [
    { w: 28, t: 'souls', min: 40, max: 89 }, { w: 22, t: 'souls', min: 90, max: 175 }, { w: 9, t: 'souls', min: 176, max: 260 }, { w: 3.5, t: 'souls', min: 261, max: 500 },
    { w: 0.8, t: 'souls', min: 501, max: 1200 }, { w: 0.08, t: 'souls', min: 3000, max: 5000 },
    { w: 6, t: 'gems', min: 2, max: 6, gemsOnly: true }, { w: 1.4, t: 'gems', min: 10, max: 25, gemsOnly: true }, { w: 0.3, t: 'gems', min: 50, max: 100 }, { w: 0.02, t: 'gems', min: 500, max: 500 },
    T('frost', 3.2), T('mortar', 3.2), T('toxic', 3.2), T('flame', 3.2), T('banner', 3), T('saw', 3),
    T('harpoon', 1.2), T('tesla', 1.2), T('voidwell', 0.9), T('magnet', 0.9), T('grinder', 0.7), T('bank', 0.4), T('altar', 0.4), T('bell', 1), T('miner', 0.9), T('pendulum', 0.8),
  ] },
  silver: { souls: 540, stars: 17, rows: [
    { w: 27, t: 'gems', min: 23, max: 40 }, { w: 19, t: 'gems', min: 41, max: 57 }, { w: 8, t: 'gems', min: 58, max: 89 }, { w: 2.6, t: 'gems', min: 90, max: 140 },
    { w: 0.8, t: 'gems', min: 141, max: 300 }, { w: 0.1, t: 'gems', min: 301, max: 800 }, { w: 0.005, t: 'gems', min: 2000, max: 2500 },
    { w: 8, t: 'souls', min: 300, max: 650 }, { w: 2, t: 'souls', min: 700, max: 1500 }, { w: 0.05, t: 'souls', min: 5000, max: 5000 },
    T('frost', 1), T('mortar', 1), T('toxic', 1), T('flame', 1), T('banner', 1), T('saw', 1),
    T('harpoon', 3), T('tesla', 3), T('voidwell', 2.5), T('magnet', 2.5), T('grinder', 2), T('bank', 1.5), T('altar', 1.5), T('bell', 2.5), T('miner', 2.2), T('pendulum', 2),
    T('gold_bolt', 0.25), T('storm_tesla', 0.15), T('hell_flame', 0.1), T('thunder', 0.12), T('winter', 0.12), T('bloodstorm', 0.1), T('plague', 0.1),
  ] },
  gold: { souls: 1250, stars: 45, rows: [
    { w: 23, t: 'gems', min: 70, max: 110 }, { w: 17, t: 'gems', min: 111, max: 180 }, { w: 8, t: 'gems', min: 181, max: 260 }, { w: 3, t: 'gems', min: 261, max: 400 },
    { w: 0.6, t: 'gems', min: 401, max: 900 }, { w: 0.05, t: 'gems', min: 901, max: 2000 }, { w: 0.002, t: 'gems', min: 5000, max: 5000 },
    { w: 8, t: 'souls', min: 900, max: 1800 }, { w: 1.5, t: 'souls', min: 1801, max: 4000 }, { w: 0.01, t: 'souls', min: 10000, max: 10000 },
    T('frost', 0.8), T('mortar', 0.8), T('toxic', 0.8), T('flame', 0.8), T('banner', 0.8), T('saw', 0.8),
    T('harpoon', 2), T('tesla', 2), T('voidwell', 2), T('magnet', 2), T('grinder', 2), T('bank', 2), T('altar', 2), T('bell', 2), T('miner', 2), T('pendulum', 2),
    T('gold_bolt', 3), T('storm_tesla', 2), T('hell_flame', 1.2), T('thunder', 1.8), T('winter', 2), T('bloodstorm', 1.5), T('plague', 2),
    { w: 1e-15, t: 'stars', min: 150, max: 150 },
  ] },
};
const tune = (rows) => rows.map((r) => (r.t === 'gems' ? { ...r, min: Math.max(1, Math.round(r.min * TUNE.gems)), max: Math.max(1, Math.round(r.max * TUNE.gems)) }
  : r.t === 'unlock' ? { ...r, w: r.w * (POOL_OF[r.id] === 'prem' ? TUNE.prem : TUNE.tower) } : r));
export const CHEST_ROWS = {}; for (const k of Object.keys(RAW)) CHEST_ROWS[k] = { ...RAW[k], rows: tune(RAW[k].rows) };
export const SOUL_PER_GEM = 6;                                          // курс при пересчёте кристаллов в души (в сундуке за души)
// таблица сундука за души: без премиум-башен, кристаллов (они превращаются в души по курсу) и главного приза
export const soulRows = (kind) => CHEST_ROWS[kind].rows.filter((r) => r.t !== 'stars' && !(r.t === 'unlock' && POOL_OF[r.id] === 'prem'))
  .map((r) => (r.t === 'gems' ? (r.gemsOnly ? { w: r.w, t: 'souls', min: 40, max: 89 } : { w: r.w, t: 'souls', min: r.min * SOUL_PER_GEM, max: r.max * SOUL_PER_GEM }) : r));
// шанс записи в процентах (по умолчанию в таблице за Stars; rows — своя таблица, например soulRows)
export const chanceOf = (kind, row, rows = CHEST_ROWS[kind].rows) => (row.w / rows.reduce((s, r) => s + r.w, 0)) * 100;
// «красивая» запись процента: до 15 знаков после запятой, без хвоста из нулей
export function pctText(p) {
  if (p >= 10) return p.toFixed(0); if (p >= 1) return p.toFixed(1).replace(/\.0$/, ''); if (p >= 0.01) return p.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  if (p >= 0.001) return p.toFixed(3).replace(/0+$/, '').replace(/\.$/, ''); return '<0.001';
}
