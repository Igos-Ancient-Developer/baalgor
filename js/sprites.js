// Растровые ассеты из img/ (WebP с альфой): башни, враги (полосы кадров), тайлы, декор, портреты, иконки, логотип, карта мира.
// Папка img/ собирается скриптами tools/build_*.py из листов в assets/.
const ROOT = new URL('../img/', import.meta.url).href;

export const SPR = { ok: false, towers: {}, enemies: {}, land: {}, imgs: new Map() };

const loadJson = (p) => fetch(ROOT + p).then((r) => (r.ok ? r.json() : null)).catch(() => null);
// загрузка с повтором: в мобильной сети отдельные картинки могут не дойти с первого раза
function loadImg(path, tries = 3) {
  return new Promise((resolve) => {
    const attempt = (n) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { SPR.imgs.set(path, im); resolve(im); };
      im.onerror = () => { if (n > 1) setTimeout(() => attempt(n - 1), 400 * (4 - n)); else resolve(null); };
      im.src = ROOT + path + (n < tries ? '?r=' + n : '');
    };
    attempt(tries);
  });
}

// декор карт (деревья, камни, статуи), земля, дорога, портал и ворота лежат в img/land и грузятся по теме уровня (landFiles); тут — сундук и объекты поля
export const DECOR_IMGS = ['chest_loot', 'obj_gate', 'obj_chest', 'obj_chest_open'];
export const GIB_IMGS = ['gib_1', 'gib_2', 'gib_3', 'gib_4', 'heart', 'arm', 'leg', 'bones', 'skull'];
export const PORTRAITS = ['imp', 'brute', 'succubus', 'pitlord', 'archdemon', 'skull'];
export const UI_ICONS = ['skull', 'star', 'settings', 'map', 'sword', 'shield', 'potion', 'book', 'crown', 'medal', 'chest', 'exit'];

export const ICON_NAMES = [
  'bag_gold',
  ...'heart coin coins bag skull wave pause soul gem trophy lock skulllock arrowup sell close confirm cancel hourglass flag crown horns wing fast map home replay settings sound music expand book scales star chart pickaxe sword shield potion scroll crystal'.split(' '),
  ...'attack defense health speed range reload income fire ice lightning necromancy magic nature dark'.split(' '),
  ...'attack defense health speed range reload fire ice lightning necromancy magic nature'.split(' ').map((n) => n + '_up'),
  ...'gold chest premium_chest premium ruby crystal_pack contract vip elixir card ticket gift event sale coins_pack gem_pack potion_pack crown_pack book_pack scroll_pack'.split(' '),
  ...Array.from({ length: 38 }, (_, i) => 'ach_' + String(i + 1).padStart(2, '0')).filter((n) => n !== 'ach_37'),
];


export async function loadSprites(onProgress = () => {}) {
  const [tw, en, ld] = await Promise.all([loadJson('towers/meta.json'), loadJson('enemies/meta.json'), loadJson('land/meta.json')]);
  if (!tw || !en) return false;
  SPR.towers = tw; SPR.enemies = en; SPR.land = ld || {};
  const list = [];
  for (const [t, m] of Object.entries(tw)) { for (let i = 0; i < m.n; i++) list.push(`towers/${t}_${i}.webp`); if (m.head) list.push(`towers/${t}_head.webp`); }
  for (const k of DECOR_IMGS) list.push(`decor/${k}.webp`);
  for (const k of GIB_IMGS) list.push(`gibs/${k}.webp`);
  for (const k of PORTRAITS) list.push(`ui/portrait_${k}.webp`);
  for (const k of UI_ICONS) list.push(`ui/icon_${k}.webp`);
  for (const k of ICON_NAMES) list.push(`icons/${k}.webp`);
  list.push('ui/logo.webp', 'ui/worldmap.webp', ...['plain', 'glow', 'rust', 'hands'].map((k) => `ui/plate_${k}.webp`), 'ui/stone.webp', 'ui/chain.webp');      // картинки кнопок и панелей из css: грузим заранее, чтобы кнопки не появлялись пустыми
  let done = 0;
  await Promise.all(list.map((p) => loadImg(p).then(() => onProgress(++done / list.length))));
  SPR.ok = true;
  return true;
}

// ландшафт темы грузим по требованию: земля, дорога, кромки, декор, панорама и портал нужны только на время запекания фона карты, потом их выбрасываем
export const landFiles = (theme) => [`ground_${theme}`, `road_${theme}`, `edge_${theme}`, `decor_${theme}`, `border_${theme}`, 'portal'].map((n) => `land/${n}.webp`);
export function loadLand(theme) { return Promise.all(landFiles(theme).filter((p) => !SPR.imgs.has(p)).map((p) => loadImg(p))); }
export function dropLand() { for (const p of [...SPR.imgs.keys()]) if (p.startsWith('land/')) SPR.imgs.delete(p); }

// листы врагов грузим по требованию: на уровне нужны только его виды (остальные не занимают память)
export const enemyFile = (f) => `enemies/${f}.webp`;
export function loadEnemyImgs(files) { return Promise.all(files.filter((f) => !SPR.imgs.has(enemyFile(f))).map((f) => loadImg(enemyFile(f)))); }
export function dropImg(path) { SPR.imgs.delete(path); }

export const img = (path) => { const im = SPR.imgs.get(path); return im && im.complete && im.naturalWidth > 0 ? im : null; };
export const url = (path) => ROOT + path;
