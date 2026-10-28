// Таблицы выпадения сундуков: только данные, без DOM. Из них js/chests.js делает бросок и показ шансов, tools/gen_chests_sql.mjs — таблицу для сервера (supabase/chests.sql).
// w — вес записи (сумма 100 = проценты). t: souls | gems | unlock (id — здание, которое открывается навсегда). gemsOnly — запись только при оплате кристаллами (при оплате душами её заменяют души).
export const POOL_OF = {
  frost: 'common', toxic: 'common', mortar: 'common', flame: 'common', banner: 'common', saw: 'common',
  harpoon: 'mid', tesla: 'mid', voidwell: 'mid', bank: 'mid', altar: 'mid', magnet: 'mid', grinder: 'mid',
  gold_bolt: 'prem', storm_tesla: 'prem', hell_flame: 'prem',
};
export const CHEST_ROWS = {
  wood: { souls: 250, gems: 25, rows: [
    { w: 16, t: 'souls', min: 40, max: 89 }, { w: 26, t: 'souls', min: 90, max: 175 }, { w: 7, t: 'souls', min: 176, max: 260 }, { w: 5, t: 'gems', min: 2, max: 6, gemsOnly: true },
    { w: 8, t: 'unlock', id: 'frost' }, { w: 8, t: 'unlock', id: 'mortar' }, { w: 8, t: 'unlock', id: 'toxic' }, { w: 8, t: 'unlock', id: 'flame' }, { w: 7, t: 'unlock', id: 'banner' }, { w: 7, t: 'unlock', id: 'saw' },
  ] },
  silver: { gems: 65, rows: [
    { w: 30, t: 'gems', min: 23, max: 57 }, { w: 12, t: 'gems', min: 58, max: 89 }, { w: 6, t: 'gems', min: 90, max: 140 }, { w: 10, t: 'souls', min: 300, max: 650 },
    { w: 8, t: 'unlock', id: 'harpoon' }, { w: 8, t: 'unlock', id: 'tesla' }, { w: 7, t: 'unlock', id: 'voidwell' }, { w: 7, t: 'unlock', id: 'magnet' }, { w: 6, t: 'unlock', id: 'grinder' }, { w: 3, t: 'unlock', id: 'bank' }, { w: 3, t: 'unlock', id: 'altar' },
  ] },
  gold: { gems: 180, rows: [
    { w: 24, t: 'gems', min: 70, max: 180 }, { w: 8, t: 'gems', min: 181, max: 260 }, { w: 4, t: 'gems', min: 261, max: 400 }, { w: 8, t: 'souls', min: 900, max: 1800 },
    { w: 7, t: 'unlock', id: 'tesla' }, { w: 6, t: 'unlock', id: 'harpoon' }, { w: 6, t: 'unlock', id: 'magnet' }, { w: 5, t: 'unlock', id: 'grinder' }, { w: 5, t: 'unlock', id: 'voidwell' }, { w: 5, t: 'unlock', id: 'bank' }, { w: 4, t: 'unlock', id: 'altar' },
    { w: 8, t: 'unlock', id: 'gold_bolt' }, { w: 6, t: 'unlock', id: 'storm_tesla' }, { w: 4, t: 'unlock', id: 'hell_flame' },
  ] },
};
