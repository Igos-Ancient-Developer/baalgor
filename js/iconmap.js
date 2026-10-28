// Растровые иконки из листа (img/icons/*.webp, нарезка — tools/build_icons.py) вместо нарисованных кодом.
// Имя глифа игры → файл иконки. Если файла нет, остаётся запасной рисунок из icons.js / env.js.
import { img } from './sprites.js?v=20261028204133';

// имя глифа в игре → имя иконки на листе
export const GLYPH_IMG = {
  dmg: 'attack', rate: 'reload', range: 'range', chain: 'lightning', frost: 'ice', poison: 'nature', shield: 'defense', banner: 'flag', fire: 'fire', vortex: 'magic',
  pierce: 'sword', blast: 'dark', skull: 'skull', crown: 'crown', bag: 'bag', pickaxe: 'pickaxe', chart: 'chart', horde: 'horns', tower: 'defense', star: 'star',
  hourglass: 'hourglass', flag: 'flag', horns: 'horns', wing: 'wing', coins: 'coins', heart: 'heart', scales: 'scales', book: 'book', soul: 'soul', lock: 'lock',
  skulllock: 'skulllock', trophy: 'trophy', map: 'map', fast: 'fast', arrowup: 'arrowup', sell: 'sell', gem: 'gem', sound: 'sound', music: 'music', expand: 'expand',
  home: 'home', replay: 'replay', close: 'close', confirm: 'confirm', cancel: 'cancel', wave: 'wave', income: 'income', gold: 'gold', settings: 'settings',
};
// имена в env.js (uiIcon)
export const UI_IMG = { coin: 'coins', heart: 'heart', skull: 'skull', sword: 'sword', clock: 'hourglass', fast: 'fast', pause: 'pause', play: 'fast', income: 'income', soul: 'soul', trophy: 'trophy', lock: 'lock', sell: 'sell', up: 'arrowup' };
// достижение → иконка листа (на листе нет №37, поэтому 37 картинок на 38 наград)
export const ACH_IMG = {
  first_blood: 'ach_17', hundred: 'ach_01', thousand: 'ach_26', ten_k: 'ach_31', decap: 'ach_02', lumberjack: 'ach_28', sculptor: 'ach_23', storm: 'ach_24', birds: 'ach_21', burn: 'ach_25',
  butcher: 'ach_27', lich_slayer: 'ach_18', demon_slayer: 'ach_22', bags: 'ach_15', bags500: 'gold', scrooge: 'chest', mine_king: 'ach_29', gold_lvl: 'pickaxe', tycoon: 'vip',
  collector: 'ach_10', master: 'ach_35', both_ways: 'ach_06', impatient: 'ach_36', wave10: 'ach_03', wave20: 'ach_08', win: 'ach_38', hell_win: 'ach_30', hardcore_win: 'ach_07',
  levels10: 'ach_11', levels_all: 'ach_20', score_40: 'ach_04', score_150: 'ach_09', flawless: 'ach_19', grim: 'ach_33', all_maps: 'map', arsenal: 'premium_chest', tempered: 'ach_16',
};
export const SHOP_IMG = { daily: 'gift', starter: 'premium_chest', premium: 'premium', packs: ['ruby', 'crystal_pack', 'gem_pack', 'gold', 'premium_chest', 'premium'] };

export const iconFile = (name) => `icons/${name}.webp`;
export const tile = (name) => img(iconFile(name));
// «внутренность» плитки без рамки (для мелких значков рядом с цифрами): рамка занимает ~8% по краям
export const CUT = new Set(['bag_gold', 'soul']);          // иконки без плитки и рамки (вырезаны по контуру): берутся целиком
export function inner(name) { const im = tile(name); if (!im) return null; if (CUT.has(name)) return { im, sx: 0, sy: 0, sw: im.naturalWidth, sh: im.naturalHeight }; return { im, sx: 9, sy: 9, sw: 78, sh: 78 }; }
