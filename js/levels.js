// Уровни кампании: секторы, раскладки, связи (after = открывается после прохождения ЛЮБОГО из перечисленных).
import { LAYOUTS, COLS, ROWS, expand } from './layouts.js?v=20261027144449';

export const SECTORS = [
  { id: 'grave', name: 'Проклятый погост', theme: 'grave', color: '#7fa86a' },
  { id: 'forest', name: 'Тёмный лес', theme: 'forest', color: '#4f8a4a' },
  { id: 'desert', name: 'Пустыня костей', theme: 'desert', color: '#d8b060' },
  { id: 'ice', name: 'Ледяные пустоши', theme: 'ice', color: '#9fd0f0' },
  { id: 'hell', name: 'Врата Ада', theme: 'lava', color: '#ff6a3a' },
];

// Декор: только деревья, камни и статуи (плюс кусты, кактусы, папоротники как мелкая растительность); картинки берутся из листа темы (img/land). Здания и постройки на картах не стоят.
export const DECOR_KINDS = {
  grave: ['tree', 'rock', 'tree', 'statue', 'rock', 'tree', 'bush'],
  slaughter: ['tree', 'rock', 'rock', 'tree', 'statue', 'bush'],
  ice: ['tree', 'rock', 'tree', 'statue', 'bush', 'tree', 'rock'],
  forest: ['tree', 'tree', 'rock', 'tree', 'bush', 'tree', 'statue', 'rock'],
  desert: ['rock', 'tree', 'rock', 'bush', 'statue', 'tree', 'bush'],
  lava: ['rock', 'tree', 'rock', 'statue', 'bush', 'tree'],
};

function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Клетки рядом с порталами и воротами: строить нельзя (там стоят сами портал и ворота, они шире клетки)
function blockCells(paths) {
  const on = new Set(), out = [];
  for (const p of paths) for (const c of expand(p)) on.add(c + '');
  for (const p of paths) for (const [c, r] of [p[0], p[p.length - 1]]) for (const dc of [-1, 1]) { const q = [c + dc, r]; if (q[0] >= 0 && q[0] < COLS && !on.has(q + '') && !out.some((o) => o[0] === q[0] && o[1] === q[1])) out.push(q); }
  return out;
}

// Препятствия (деревья, валуны): чем выше уровень, тем их больше и тем чаще они стоят на самых выгодных клетках у дороги.
function autoDecor(paths, theme, seed, lvl = 1) {
  const R = rng(seed * 131 + 7), onPath = new Set(), pc = [];
  for (const p of paths) for (const c of expand(p)) { if (!onPath.has(c + '')) { onPath.add(c + ''); pc.push(c); } }
  for (const c of blockCells(paths)) onPath.add(c + '');
  const free = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (onPath.has(c + ',' + r)) continue;
    let cov = 0; for (const [pc0, pr0] of pc) if (Math.hypot(pc0 - c, pr0 - r) <= 2.3) cov++;
    free.push({ c, r, cov });
  }
  const t = lvl <= 0 ? 0 : Math.min(1, (lvl - 1) / 18);
  const want = Math.min(lvl <= 0 ? 6 : Math.round(9 + 12 * t), free.length - 34);
  const sorted = [...free].sort((a, b) => b.cov - a.cov), prime = new Set(sorted.slice(0, Math.ceil(free.length / 3)).map((q) => q.c + ',' + q.r));
  for (const q of free) q.w = 1 + R() * 0.6 + (prime.has(q.c + ',' + q.r) ? 5 * t : 0);
  const kinds = DECOR_KINDS[theme === 'slaughter' ? 'slaughter' : theme], out = [], taken = new Set();
  const nb = t < 0.4 ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];      // на высоких уровнях можно по диагонали рядом
  let guard = 0;
  while (out.length < want && guard++ < 800) {
    const left = free.filter((q) => !taken.has(q.c + ',' + q.r)); if (!left.length) break;
    let x = R() * left.reduce((s2, q) => s2 + q.w, 0), q = left[left.length - 1];
    for (const e of left) { x -= e.w; if (x <= 0) { q = e; break; } }
    if (nb.some(([dc, dr]) => taken.has((q.c + dc) + ',' + (q.r + dr)))) { q.w *= 0.3; continue; }
    taken.add(q.c + ',' + q.r); out.push([q.c, q.r, kinds[Math.floor(R() * kinds.length)]]);
  }
  // Дерево — картинка высотой почти в две клетки: она закрывает клетку над собой, и построенное там здание налезало бы на крону.
  // Поэтому дерево ставим только там, где клетка над ним занята (дорога, другое препятствие) или это верхний ряд; иначе переносим на подходящее место либо делаем низким камнем.
  const busy = (c, r) => r < 0 || onPath.has(c + ',' + r) || taken.has(c + ',' + r);
  for (let pass = 0; pass < 2; pass++) for (const d of out) {      // два прохода: перенос одного дерева может освободить клетку над другим
    if (d[2] !== 'tree' || busy(d[0], d[1] - 1)) continue;
    const spot = free.filter((q) => !taken.has(q.c + ',' + q.r) && busy(q.c, q.r - 1) && !nb.some(([dc, dr]) => taken.has((q.c + dc) + ',' + (q.r + dr))));
    if (spot.length) { const q = spot[Math.floor(R() * spot.length)]; taken.delete(d[0] + ',' + d[1]); taken.add(q.c + ',' + q.r); d[0] = q.c; d[1] = q.r; }
    else d[2] = R() < 0.5 ? 'rock' : 'bush';
  }
  return out;
}

// Больше 15 волн на уровне не бывает: долгие уровни грели телефон. В SPEC «волн» — задуманная длина: уровень сжимается до 15, а каждая волна
// получает силу той, что стояла бы на этом месте в полной версии (genWave берёт wavesFull), так что рост сложности не теряется.
export const MAX_WAVES = 15;
// [id, имя, сектор, раскладка, тема, волн, множитель здоровья, after, позиция на карте мира (пиксели картинки 1376×768, центр нарисованной площадки)]
// after — по нарисованным дорогам: развилки на карте мира сделаны ответвлениями (g2b, f2b), ледяной сектор — тупиковая ветка от i1, к Аду ведёт дорога от i1
// Множители здоровья подобраны так, чтобы общая «масса» врагов уровня строго росла от рубежа к рубежу (шаг не меньше ~12%), без провалов;
// при смене волн или врагов пересчитай: node tools/curve.mjs
const SPEC = [
  ['g1', 'Погост', 'grave', 'snake', 'grave', 8, 0.77, ['tut'], [312, 641]],
  ['g2a', 'Склеп', 'grave', 'crypt', 'grave', 9, 0.70, ['g1'], [219, 567]],
  ['g2b', 'Часовня', 'grave', 'hook', 'grave', 9, 0.75, ['g1'], [472, 598]],
  ['g3', 'Могильный холм', 'grave', 'frame', 'grave', 10, 0.81, ['g2a'], [316, 483]],
  ['f1', 'Тёмная опушка', 'forest', 'twist', 'forest', 11, 0.78, ['g3'], [172, 423]],
  ['f2a', 'Гнилые топи', 'forest', 'wave', 'forest', 12, 0.73, ['f1'], [310, 346]],
  ['f2b', 'Волчья тропа', 'forest', 'dhook', 'forest', 12, 0.67, ['f2a'], [146, 273]],
  ['f3', 'Сердце чащи', 'forest', 'merge', 'forest', 13, 0.61, ['f2a'], [479, 413]],
  ['d1', 'Караванный путь', 'desert', 'zigzag', 'desert', 14, 0.64, ['f3'], [663, 423]],
  ['d2a', 'Дюны костей', 'desert', 'stairs', 'desert', 15, 0.57, ['d1'], [843, 489]],
  ['d2b', 'Пересохшее русло', 'desert', 'saw', 'desert', 15, 0.59, ['d2a'], [990, 395]],
  ['d3', 'Храм песков', 'desert', 'trap', 'desert', 16, 0.53, ['d2b'], [895, 340]],
  ['i1', 'Замёрзший перевал', 'ice', 'organ', 'ice', 17, 0.57, ['d3'], [729, 227]],
  ['i2a', 'Ледяной перекрёсток', 'ice', 'cross', 'ice', 18, 0.53, ['i1'], [545, 129]],
  ['i2b', 'Метель', 'ice', 'poker', 'ice', 18, 0.51, ['i2a'], [373, 104]],
  ['i3', 'Ледяной трон', 'ice', 'snail', 'ice', 19, 0.51, ['i2b'], [444, 217]],
  ['h1', 'Врата Ада', 'hell', 'triple', 'lava', 20, 0.47, ['i1'], [850, 162]],
  ['h2', 'Река огня', 'hell', 'lanes', 'lava', 21, 0.48, ['h1'], [1060, 113]],
  ['h3', 'Скотобойня', 'hell', 'spiral', 'slaughter', 22, 0.46, ['h2'], [1148, 74]],
];

export const LEVELS = SPEC.map(([id, name, sector, layout, theme, waves, hp, after, pos], i) => {
  const paths = LAYOUTS[layout];
  return { id, name, sector, theme, layout, paths, block: blockCells(paths), decor: autoDecor(paths, theme, i + 1, i + 1), waves: Math.min(waves, MAX_WAVES), wavesFull: waves, hp, after, pos, index: i, lvl: i + 1 };
});
// Обучение: самая простая карта, 3 волны из простых врагов. Стоит в конце массива, чтобы не сдвигать номера остальных уровней.
{
  const paths = LAYOUTS.tutor, w = (...g) => g;
  LEVELS.push({ id: 'tut', name: 'Обучение', sector: 'grave', theme: 'grave', layout: 'tutor', paths, block: blockCells(paths), decor: autoDecor(paths, 'grave', 77, 0), waves: 3, hp: 0.55, after: [], pos: [185, 666], index: LEVELS.length, lvl: 0, tutorial: true,
    waveList: [w(['skeleton', 4, 1.7]), w(['skeleton', 6, 1.4]), w(['skeleton', 5, 1.2], ['zombie', 2, 1.6])] });
}
export const CAMPAIGN = LEVELS.filter((l) => !l.tutorial);
export const levelById = (id) => LEVELS.find((l) => l.id === id);
