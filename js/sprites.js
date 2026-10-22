// Растровые ассеты из img/ (WebP с альфой): башни, враги (полосы кадров), тайлы, декор, портреты, иконки, логотип, карта мира.
// Папка img/ собирается скриптами tools/build_*.py из листов в assets/.
const ROOT = new URL('../img/', import.meta.url).href;

export const SPR = { ok: false, towers: {}, enemies: {}, imgs: new Map() };

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

export const TILE_KINDS = ['grass', 'snow', 'sand', 'lava'];
export const DECOR_IMGS = ['dead_tree', 'rocks', 'bones', 'crystal', 'ruin', 'torch', 'cart', 'campfire', 'skull_pole', 'chest_loot', 'chest', 'statue',
  'townhall', 'smithy', 'tents', 'tavern', 'warehouse', 'portal', 'altar', 'shrine', 'obelisk', 'farm', 'mill', 'fishhut', 'watchtower', 'woodcutter', 'quarry', 'camp', 'hut',
  'obj_gate', 'obj_portal', 'obj_chest', 'obj_chest_open',
  ...[1, 2, 3, 4, 5].map((n) => 'nat_oak_' + n), 'nat_dead_1', 'nat_spruce_1', ...[1, 2, 3, 4, 5, 6, 7].map((n) => 'nat_rock_' + n)];
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
  const [tw, en] = await Promise.all([loadJson('towers/meta.json'), loadJson('enemies/meta.json')]);
  if (!tw || !en) return false;
  SPR.towers = tw; SPR.enemies = en;
  const list = [];
  for (const [t, m] of Object.entries(tw)) { for (let i = 0; i < m.n; i++) list.push(`towers/${t}_${i}.webp`); if (m.head) list.push(`towers/${t}_head.webp`); }
  for (const k of Object.keys(en)) list.push(`enemies/${k}.webp`);
  for (const k of TILE_KINDS) for (let i = 0; i < 4; i++) list.push(`tiles/${k}_${i}.webp`);
  for (const k of DECOR_IMGS) list.push(`decor/${k}.webp`);
  for (const k of GIB_IMGS) list.push(`gibs/${k}.webp`);
  for (const k of PORTRAITS) list.push(`ui/portrait_${k}.webp`);
  for (const k of UI_ICONS) list.push(`ui/icon_${k}.webp`);
  for (const k of ICON_NAMES) list.push(`icons/${k}.webp`);
  list.push('ui/logo.webp', 'ui/worldmap.webp');
  let done = 0;
  await Promise.all(list.map((p) => loadImg(p).then(() => onProgress(++done / list.length))));
  SPR.ok = true;
  return true;
}

export const img = (path) => { const im = SPR.imgs.get(path); return im && im.complete && im.naturalWidth > 0 ? im : null; };
export const url = (path) => ROOT + path;
