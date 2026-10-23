// Уровни кампании: секторы, раскладки, связи (after = открывается после прохождения ЛЮБОГО из перечисленных).
import { LAYOUTS, COLS, ROWS, expand } from './layouts.js?v=20261023153351';

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
  return out;
}

// [id, имя, сектор, раскладка, тема, волн, множитель здоровья, after, позиция на карте мира]
const SPEC = [
  ['g1', 'Погост', 'grave', 'snake', 'grave', 8, 0.79, ['tut'], [327, 737]],
  ['g2a', 'Склеп', 'grave', 'crypt', 'grave', 9, 0.62, ['g1'], [207, 653]],
  ['g2b', 'Часовня', 'grave', 'hook', 'grave', 9, 0.67, ['g1'], [453, 700]],
  ['g3', 'Могильный холм', 'grave', 'frame', 'grave', 10, 0.74, ['g2a', 'g2b'], [327, 560]],
  ['f1', 'Тёмная опушка', 'forest', 'twist', 'forest', 11, 0.82, ['g3'], [167, 447]],
  ['f2a', 'Гнилые топи', 'forest', 'wave', 'forest', 12, 0.90, ['f1'], [107, 320]],
  ['f2b', 'Волчья тропа', 'forest', 'dhook', 'forest', 12, 0.74, ['f1'], [300, 397]],
  ['f3', 'Сердце чащи', 'forest', 'merge', 'forest', 13, 0.80, ['f2a', 'f2b'], [467, 467]],
  ['d1', 'Караванный путь', 'desert', 'zigzag', 'desert', 14, 0.98, ['f3'], [647, 469]],
  ['d2a', 'Дюны костей', 'desert', 'stairs', 'desert', 15, 0.74, ['d1'], [820, 560]],
  ['d2b', 'Пересохшее русло', 'desert', 'saw', 'desert', 15, 0.74, ['d1'], [980, 423]],
  ['d3', 'Храм песков', 'desert', 'trap', 'desert', 16, 0.75, ['d2a', 'd2b'], [900, 331]],
  ['i1', 'Замёрзший перевал', 'ice', 'organ', 'ice', 17, 0.74, ['d3'], [696, 300]],
  ['i2a', 'Ледяной перекрёсток', 'ice', 'cross', 'ice', 18, 0.84, ['i1'], [440, 251]],
  ['i2b', 'Метель', 'ice', 'poker', 'ice', 18, 0.82, ['i1'], [329, 129]],
  ['i3', 'Ледяной трон', 'ice', 'snail', 'ice', 19, 0.84, ['i2a', 'i2b'], [573, 133]],
  ['h1', 'Врата Ада', 'hell', 'triple', 'lava', 20, 0.76, ['i3'], [840, 200]],
  ['h2', 'Река огня', 'hell', 'lanes', 'lava', 21, 0.88, ['h1'], [997, 160]],
  ['h3', 'Скотобойня', 'hell', 'spiral', 'slaughter', 22, 0.72, ['h2'], [1117, 80]],
];

export const LEVELS = SPEC.map(([id, name, sector, layout, theme, waves, hp, after, pos], i) => {
  const paths = LAYOUTS[layout];
  return { id, name, sector, theme, layout, paths, block: blockCells(paths), decor: autoDecor(paths, theme, i + 1, i + 1), waves, hp, after, pos, index: i, lvl: i + 1 };
});
// Обучение: самая простая карта, 3 волны из простых врагов. Стоит в конце массива, чтобы не сдвигать номера остальных уровней.
{
  const paths = LAYOUTS.tutor, w = (...g) => g;
  LEVELS.push({ id: 'tut', name: 'Обучение', sector: 'grave', theme: 'grave', layout: 'tutor', paths, block: blockCells(paths), decor: autoDecor(paths, 'grave', 77, 0), waves: 3, hp: 0.55, after: [], pos: [185, 758], index: LEVELS.length, lvl: 0, tutorial: true,
    waveList: [w(['grunt', 4, 1.7]), w(['grunt', 6, 1.4]), w(['grunt', 5, 1.2], ['skeleton', 2, 1.4])] });
}
export const CAMPAIGN = LEVELS.filter((l) => !l.tutorial);
export const levelById = (id) => LEVELS.find((l) => l.id === id);
