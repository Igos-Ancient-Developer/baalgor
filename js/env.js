// Окружение: фон карт, пятна крови, иконки интерфейса. На картах стоят только деревья и валуны; портал и ворота — на концах дороги.
import { OUT, S, mk, cached, shade, lin, rad, rrect, ell, circ, poly, fillStroke, tube, glow, shadowEll, rng } from './art.js?v=20261023194025';
import { CELL, COLS, ROWS, WORLD_W, WORLD_H, PAD, MAPS } from './data.js?v=20261023194025';
import { UI_IMG, inner } from './iconmap.js?v=20261023194025';
import { BLOOD } from './enemies.js?v=20261023194025';
import { SPR, img } from './sprites.js?v=20261023194025';

const T2 = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const THEMES = {
  grave:     { base: '#34452f', base2: '#2a3a28', tuft: '#4d6a42', path: '#6b5e4c', pathHi: '#7e705b', edge: '#2f2820', stone: '#7b7f86', sky: 'rgba(120,150,220,0.06)' },
  slaughter: { base: '#4c3128', base2: '#3b2620', tuft: '#6a4538', path: '#7a5240', pathHi: '#8f6550', edge: '#2e1a14', stone: '#8a7c72', sky: 'rgba(220,60,40,0.06)' },
  ice:       { base: '#8fa9bf', base2: '#7a95ad', tuft: '#c4d9e8', path: '#5d7189', pathHi: '#6f84a0', edge: '#34455c', stone: '#9db0c4', sky: 'rgba(150,200,255,0.08)' },
  forest:    { base: '#26402c', base2: '#1b3022', tuft: '#3d7040', path: '#6e5c40', pathHi: '#826d4a', edge: '#251d12', stone: '#6c7468', sky: 'rgba(80,220,150,0.05)' },
  desert:    { base: '#cfae6e', base2: '#b8924f', tuft: '#e2c888', path: '#a87c4c', pathHi: '#c0925e', edge: '#6a4a28', stone: '#b09874', sky: 'rgba(255,200,100,0.06)' },
  lava:      { base: '#2c1a18', base2: '#1d0f0f', tuft: '#4e2c24', path: '#5e3c34', pathHi: '#744e42', edge: '#140808', stone: '#4c3c3a', sky: 'rgba(255,70,20,0.08)' },
};

// канвас в заданном масштабе (фон карты рисуется в своём масштабе, а не в общем масштабе спрайтов)
function mkS(w, h, s, fn) {
  const c = document.createElement('canvas'); c.width = Math.ceil(w * s); c.height = Math.ceil(h * s);
  const g = c.getContext('2d'); g.scale(s, s); g.lineJoin = 'round'; g.lineCap = 'round'; fn(g); c.lw = w; c.lh = h; return c;
}

// ───── запасной декор (рисуется кодом, если картинки темы не загрузились) ─────
function groundShadow(g, x, y, rx, ry) { shadowEll(g, x + 2, y + 2, rx, ry, 0.45); }
const blob = (g, x, y, r, c) => { circ(g, x, y, r); fillStroke(g, rad(g, x - r * 0.35, y - r * 0.4, r * 0.1, r * 1.25, [[0, shade(c, 0.4)], [0.55, c], [1, shade(c, -0.4)]]), 1.5); };
export const DECOR = {
  tree(g, x, y) { groundShadow(g, x, y + 12, 17, 6); tube(g, x, y + 13, x, y - 2, 6, '#7a5632', 1.2); blob(g, x - 9, y - 4, 10.5, '#5f8f46'); blob(g, x + 9, y - 5, 10.5, '#578840'); blob(g, x, y - 14, 13, '#6a9d4e'); },
  rock(g, x, y) {
    groundShadow(g, x, y + 12, 21, 7);
    const pts = [[-19, 10], [-21, -2], [-13, -15], [2, -20], [16, -14], [22, -1], [19, 10]];
    g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(x + a, y + b) : g.moveTo(x + a, y + b))); g.closePath();
    fillStroke(g, lin(g, x - 20, y - 20, x + 20, y + 12, [[0, '#b4b8bf'], [0.55, '#868b94'], [1, '#4e525c']]), 1.8);
  },
};
DECOR.statue = DECOR.rock; DECOR.bush = DECOR.rock;

// ───── ландшафт из img/land (листы собирает tools/build_landscape.py): земля, дорога, кромки, декор, панорамы, портал и ворота ─────
const landImg = (n) => img(`land/${n}.webp`);
function landSet(theme) {
  const L = { ground: landImg('ground_' + theme), road: landImg('road_' + theme), edge: landImg('edge_' + theme), decor: landImg('decor_' + theme), border: landImg('border_' + theme),
    portal: landImg('portal'), m: SPR.land || {}, theme };
  return L.ground && L.road && L.decor && L.m.road && L.m.decor ? L : null;
}
const ROAD_W = CELL;                                    // дорога в одну клетку: шире врагов, они идут по ней свободно
const GROUND_W = CELL * 4;                              // кусок земли на экране: 4 клетки (текстура бесшовная)
const GROUND_TINT = { lava: 'rgba(14,4,4,0.42)', slaughter: 'rgba(16,6,6,0.16)' };      // земля темнее дороги: дорога и враги на ней читаются лучше
function groundTiles(g, L) {
  const x0 = -PAD.l, y0 = -PAD.t, x1 = WORLD_W + PAD.r, y1 = WORLD_H + PAD.b; g.imageSmoothingQuality = 'high';
  for (let y = Math.floor(y0 / GROUND_W) * GROUND_W; y < y1; y += GROUND_W) for (let x = Math.floor(x0 / GROUND_W) * GROUND_W; x < x1; x += GROUND_W) g.drawImage(L.ground, x, y, GROUND_W + 0.6, GROUND_W + 0.6);
  const tint = GROUND_TINT[L.theme]; if (tint) { g.fillStyle = tint; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
}
// клетки дороги и в какую сторону идёт полоса через клетку (v: вдоль y; на поворотах — вдоль y)
function roadCells(map) {
  const cells = new Map();
  for (const p of map.paths) for (let i = 1; i < p.length; i++) {
    const [c0, r0] = p[i - 1], [c1, r1] = p[i], vert = c0 === c1, dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
    for (let c = c0, r = r0; ; c += dc, r += dr) { const k = c + ',' + r, o = cells.get(k); cells.set(k, { c, r, v: vert || !!(o && o.v) }); if (c === c1 && r === r1) break; }
  }
  return cells;
}
// дорога: текстура кладётся по клеткам вдоль направления движения (на горизонталях оси меняются местами), «полосы» центруются по оси дороги
function roadFill(g, L, theme, cells) {
  const t = L.road, rm = L.m.road[theme], tw = rm.tw, th = rm.th; g.imageSmoothingQuality = 'high';
  for (const { c, r, v } of cells.values()) {
    const x = c * CELL, y = r * CELL; g.save(); g.beginPath(); g.rect(x - 0.3, y - 0.3, CELL + 0.6, CELL + 0.6); g.clip();
    const a0 = v ? x : y, b0 = v ? y : x;                                // a — поперёк дороги, b — вдоль
    if (!v) g.transform(0, 1, 1, 0, 0, 0);
    const oa = rm.strip ? a0 + CELL / 2 - tw / 2 : Math.floor(a0 / tw) * tw;
    for (let bb = Math.floor(b0 / th) * th; bb < b0 + CELL; bb += th) for (let aa = oa; aa < a0 + CELL; aa += tw) g.drawImage(t, aa, bb, tw + 0.5, th + 0.5);
    g.restore();
  }
}
// кромка дороги: куски полосы вдоль каждой стороны, за которой дороги нет (у портала и ворот кромки нет)
function roadEdges(g, L, theme, cells, map, R) {
  const e = L.edge, em = L.m.edge && L.m.edge[theme]; if (!e || !em) return;
  const th = em.th, k = e.width / em.tw, has = (c, r) => cells.has(c + ',' + r), skip = new Set();
  for (const p of map.paths) { skip.add(p[0][0] + ',' + (p[0][1] - 1)); const q = p[p.length - 1]; skip.add(q[0] + ',' + (q[1] + 1)); }
  const free = (c, r) => !has(c, r) && !skip.has(c + ',' + r);
  const piece = (x, y, len, horiz) => {
    const sw = Math.min(e.width, len * k), sx = Math.floor(R() * Math.max(1, e.width - sw));
    g.save(); g.translate(x, y); if (!horiz) g.transform(0, 1, 1, 0, 0, 0);
    g.drawImage(e, sx, 0, sw, e.height, 0, 0, len, th); g.restore();
  };
  g.save(); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 3; g.shadowOffsetY = 1.2; g.imageSmoothingQuality = 'high';
  const o = th * 0.85, i = th * 0.15;
  for (const { c, r } of cells.values()) {
    const x = c * CELL, y = r * CELL, lN = !has(c - 1, r), rN = !has(c + 1, r), tN = !has(c, r - 1), bN = !has(c, r + 1);
    const hx = x - (lN ? o : 0), hl = CELL + (lN ? o : 0) + (rN ? o : 0);
    if (free(c, r - 1)) piece(hx, y - o, hl, true);
    if (free(c, r + 1)) piece(hx, y + CELL - i, hl, true);
    if (free(c - 1, r)) piece(x - o, y, CELL, false);
    if (free(c + 1, r)) piece(x + CELL - i, y, CELL, false);
  }
  g.restore();
}
// панорама по верхнему краю карты (лес, дюны, горы, частокол) и тень внизу: фон не обрывается пустой землёй
function borders(g, L, theme) {
  const b = L.border, bm = L.m.border && L.m.border[theme]; if (!b || !bm) return;
  const BW = WORLD_W + PAD.l + PAD.r, h = BW * bm.h / bm.w; g.imageSmoothingQuality = 'high';
  g.drawImage(b, -PAD.l, -6 - h, BW, h);
  g.fillStyle = lin(g, 0, WORLD_H + 10, 0, WORLD_H + PAD.b, [[0, 'rgba(8,2,6,0)'], [1, 'rgba(8,2,6,0.6)']]); g.fillRect(-PAD.l, WORLD_H + 10, BW, PAD.b - 10);       // внизу карта уходит в тень, под панелью зданий
}
const DECOR_SCALE = { statue: 0.78, tree: 0.9, rock: 0.9 };            // декор не крупнее зданий: статуи и камни ниже башен
// декор: деревья, камни, статуи, кусты из листа темы; размер уже посчитан сборщиком (px мира)
function natDecor(g, L, kind, x, y, key) {
  const list = L.m.decor[L.theme] && L.m.decor[L.theme][kind]; if (!list || !list.length) return false;
  const q = list[key % list.length], ds = DECOR_SCALE[kind] || 1, ww = q.ww * ds, wh = q.wh * ds;
  shadowEll(g, x, y + 13, ww * 0.36, Math.min(6, 2.5 + ww * 0.05), 0.4); g.imageSmoothingQuality = 'high'; g.drawImage(L.decor, q.x, q.y, q.w, q.h, x - ww / 2, y + 15 - wh, ww, wh); return { q, ww, wh, x: x - ww / 2, y: y + 15 - wh };
}

// ───── портал врагов и ворота крепости ─────
// портал: зев в центре клетки, откуда выходят враги; ворота: проём у нижнего края дороги, где враги исчезают
export const PORTAL = { w: 96 }, GATE = { w: 92, floor: 0.92 };
function drawPortal(g, L, x, y) {
  const pm = L.m.portal && L.m.portal.base; if (!L.portal || !pm) return;
  const w = PORTAL.w, h = w * pm.h / pm.w, top = y - 4 - h * pm.my, left = x - w * pm.mx;
  shadowEll(g, x, top + h - 7, w * 0.4, 6, 0.45); g.imageSmoothingQuality = 'high'; g.drawImage(L.portal, left, top, w, h);
}
function drawGate(g, x, y) {
  const im = img('decor/obj_gate.webp'); if (!im) return;
  const w = GATE.w, h = w * im.naturalHeight / im.naturalWidth, top = y - h * GATE.floor;
  shadowEll(g, x, top + h - 4, w * 0.46, 7, 0.5); g.imageSmoothingQuality = 'high'; g.drawImage(im, x - w / 2, top, w, h);
}

export function bakeMap(map, scale = S) {
  const th = THEMES[map.theme], R = rng(map.id.length * 7919 + 13), bs = clamp(scale, 1.5, 2.25);
  const BW = WORLD_W + PAD.l + PAD.r, BH = WORLD_H + PAD.t + PAD.b;
  const L = SPR.ok ? landSet(map.theme) : null, cells = roadCells(map), trees = new Map();
  const c = mkS(BW, BH, bs, (g) => {
    g.translate(PAD.l, PAD.t);
    if (L) { groundTiles(g, L); roadFill(g, L, map.theme, cells); roadEdges(g, L, map.theme, cells, map, R); }
    else {                                                                                  // картинки темы не загрузились: рисуем кодом
      g.fillStyle = lin(g, 0, -PAD.t, 0, WORLD_H + PAD.b, [[0, th.base], [1, th.base2]]); g.fillRect(-PAD.l, -PAD.t, BW, BH);
      for (let i = 0; i < 900; i++) { const x = -PAD.l + R() * BW, y = -PAD.t + R() * BH; ell(g, x, y, 2 + R() * 9, 1 + R() * 5, R() * 3); g.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.045)'; g.fill(); }
      const strokePaths = (w, col) => { g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = col; g.lineWidth = w; for (const p of map.paths) { g.beginPath(); p.forEach(([cc, r], i) => { const x = (cc + 0.5) * CELL, y = (r + 0.5) * CELL; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); } };
      strokePaths(ROAD_W * 1.06, th.edge); strokePaths(ROAD_W * 0.92, th.path); strokePaths(ROAD_W * 0.62, th.pathHi);
    }
    // занятые клетки: дорога и декор
    const onPath = new Set(cells.keys()), dec = new Set(map.decor.map(([cc, r]) => cc + ',' + r));
    if (L) borders(g, L, map.theme);
    // деревья, камни и статуи по рядам (сверху вниз)
    [...map.decor].sort((a, b) => a[1] - b[1]).forEach(([cc, r, kind]) => {
      const d = L && natDecor(g, L, kind, (cc + 0.5) * CELL, (r + 0.5) * CELL, cc * 5 + r * 3 + map.index);
      if (!d) { DECOR[kind](g, (cc + 0.5) * CELL, (r + 0.5) * CELL); return; }
      if (kind === 'tree') {                                                              // копия дерева: сундук, спрятанный за деревом, дорисовывается им поверх
        const sp = mkS(d.ww, d.wh, bs, (g2) => { g2.imageSmoothingQuality = 'high'; g2.drawImage(L.decor, d.q.x, d.q.y, d.q.w, d.q.h, 0, 0, d.ww, d.wh); });
        trees.set(cc + ',' + r, { c: sp, x: d.x, y: d.y, w: d.ww, h: d.wh });
      }
    });
    // портал в начале каждой дороги, ворота в конце
    if (L) {
      for (const p of map.paths) drawPortal(g, L, (p[0][0] + 0.5) * CELL, (p[0][1] + 0.5) * CELL);
      const gates = new Set();
      for (const p of map.paths) { const e = p[p.length - 1], k = e + ''; if (!gates.has(k)) { gates.add(k); drawGate(g, (e[0] + 0.5) * CELL, (e[1] + 0.5) * CELL); } }
    }
    // лёгкая дымка и тонкая рамка по краю: фон не обрывается резко
    g.fillStyle = th.sky; g.fillRect(-PAD.l, -PAD.t, BW, BH);
    for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[-PAD.l, 0, -PAD.l + 22, 0, -PAD.l, -PAD.t, 22, BH], [WORLD_W + PAD.r, 0, WORLD_W + PAD.r - 22, 0, WORLD_W + PAD.r - 22, -PAD.t, 22, BH]]) {
      g.fillStyle = lin(g, x0, y0, x1, y1, [[0, 'rgba(8,2,6,0.5)'], [1, 'rgba(8,2,6,0)']]); g.fillRect(rx, ry, rw, rh);
    }
  });
  c.trees = trees;
  return c;
}

// фон текущей карты: один запечённый холст; при смене карты прежний освобождается
let bgCache = null;
export function mapBG(map, scale) {
  if (bgCache && bgCache.id === map.id) return bgCache.c;
  releaseBG(); bgCache = { id: map.id, c: bakeMap(map, scale) }; return bgCache.c;
}
export function releaseBG() { if (bgCache) { if (bgCache.c.trees) for (const t of bgCache.c.trees.values()) t.c.width = 0; bgCache.c.width = 0; bgCache = null; } }

// ───── кровь ─────
// kind: ключ BLOOD; возвращает спрайты пятен
export function splatSprite(kind, idx, size = 40) {
  return cached(`splat:${kind}:${idx}:${size}`, () => {
    const col = BLOOD[kind]; const R = rng(idx * 101 + kind.length * 31);
    return mk(size, size, (g) => {
      g.translate(size / 2, size / 2);
      const body = (r, c, jag) => {
        g.beginPath(); const n = 18;
        for (let i = 0; i <= n; i++) { const a = (i / n) * T2; const k = r * (0.72 + 0.5 * R()) * (1 + jag * Math.sin(i * 1.9 + idx)); g.lineTo(Math.cos(a) * k, Math.sin(a) * k * 0.82); }
        g.closePath(); g.fillStyle = c; g.fill();
      };
      const r0 = size * 0.22;
      body(r0 * 1.12, col[2], 0.12);
      body(r0, col[0], 0.18);
      // капли-спутники
      const n = 5 + (idx % 4);
      for (let i = 0; i < n; i++) { const a = R() * T2, d = r0 * (0.9 + R() * 0.7), rr = 1 + R() * size * 0.04; circ(g, Math.cos(a) * d, Math.sin(a) * d * 0.82, rr); g.fillStyle = i % 2 ? col[0] : col[2]; g.fill();
        // «лучи» к каплям
        if (i % 2 === 0) { g.beginPath(); g.moveTo(Math.cos(a) * r0 * 0.6, Math.sin(a) * r0 * 0.5); g.lineTo(Math.cos(a) * d, Math.sin(a) * d * 0.8); g.lineWidth = rr * 0.8; g.strokeStyle = col[0]; g.stroke(); } }
      // влажный блик
      g.globalAlpha = 0.55; ell(g, -r0 * 0.3, -r0 * 0.3, r0 * 0.32, r0 * 0.16, -0.5); g.fillStyle = col[1]; g.fill(); g.globalAlpha = 1;
    });
  });
}
export function poolSprite(kind, idx, size = 56) {
  return cached(`pool:${kind}:${idx}:${size}`, () => {
    const col = BLOOD[kind]; const R = rng(idx * 57 + kind.length);
    return mk(size, size, (g) => {
      g.translate(size / 2, size / 2);
      g.beginPath(); for (let i = 0; i <= 24; i++) { const a = (i / 24) * T2; const k = size * 0.42 * (0.82 + 0.2 * Math.sin(i * 1.3 + idx) + 0.1 * R()); g.lineTo(Math.cos(a) * k, Math.sin(a) * k * 0.7); } g.closePath();
      g.fillStyle = rad(g, 0, 0, 2, size * 0.45, [[0, col[0]], [0.7, col[0]], [1, col[2]]]); g.fill();
      g.globalAlpha = 0.5; ell(g, -size * 0.1, -size * 0.08, size * 0.14, size * 0.06, -0.4); g.fillStyle = col[1]; g.fill(); g.globalAlpha = 1;
    });
  });
}
export function scorchSprite(size = 56) {
  return cached(`scorch:${size}`, () => mk(size, size, (g) => { g.translate(size / 2, size / 2); g.fillStyle = rad(g, 0, 0, 2, size * 0.46, [[0, 'rgba(10,6,6,0.85)'], [0.6, 'rgba(14,8,8,0.55)'], [1, 'rgba(14,8,8,0)']]); g.save(); g.scale(1, 0.78); g.beginPath(); g.arc(0, 0, size * 0.46, 0, T2); g.fill(); g.restore(); }));
}
export function iceSprite(size = 48) {
  return cached(`ice:${size}`, () => mk(size, size, (g) => { g.translate(size / 2, size / 2); g.fillStyle = rad(g, 0, 0, 2, size * 0.46, [[0, 'rgba(220,245,255,0.7)'], [1, 'rgba(180,225,255,0)']]); g.save(); g.scale(1, 0.78); g.beginPath(); g.arc(0, 0, size * 0.46, 0, T2); g.fill(); g.restore(); }));
}
export function glowSprite(color, size = 32) {
  return cached(`glow:${color}:${size}`, () => mk(size, size, (g) => { glow(g, size / 2, size / 2, size / 2, color, 1); }));
}
export function smokeSprite(size = 32) {
  return cached(`smoke:${size}`, () => mk(size, size, (g) => { g.fillStyle = rad(g, size / 2, size / 2, 0, size / 2, [[0, 'rgba(60,55,60,0.8)'], [1, 'rgba(60,55,60,0)']]); g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, T2); g.fill(); }));
}
export function shardSprite(color = '#bfe8ff') {
  return cached(`shard:${color}`, () => mk(12, 12, (g) => { g.translate(6, 6); poly(g, [[-4, 1], [0, -5], [4, 0], [1, 5]]); fillStroke(g, lin(g, -4, -5, 4, 5, [[0, '#ffffff'], [0.5, color], [1, '#5a9ad0']]), 0.8); }));
}
export function coinSprite(size = 14) {
  return cached(`coin:${size}`, () => mk(size, size, (g) => { const r = size / 2 - 1; g.translate(size / 2, size / 2); circ(g, 0, 0, r); fillStroke(g, rad(g, -r * 0.3, -r * 0.3, 0.5, r * 1.2, [[0, '#fff6b8'], [0.55, '#f6b92c'], [1, '#a8700e']]), 1); circ(g, 0, 0, r * 0.62); g.lineWidth = 0.7; g.strokeStyle = 'rgba(120,70,0,0.7)'; g.stroke(); }));
}
export function bagSprite() {
  return cached('bag', () => mk(30, 32, (g) => {
    glow(g, 15, 18, 15, '#ffd24a', 0.5);
    g.beginPath(); g.moveTo(8, 28); g.quadraticCurveTo(2, 20, 8, 12); g.lineTo(11, 8); g.lineTo(19, 8); g.lineTo(22, 12); g.quadraticCurveTo(28, 20, 22, 28); g.closePath();
    fillStroke(g, lin(g, 6, 0, 24, 0, [[0, '#d9a85a'], [1, '#8a5a24']]), 1.5);
    rrect(g, 10, 6, 10, 4, 1.5); fillStroke(g, '#6a4218', 1);
    circ(g, 15, 19, 4.6); fillStroke(g, rad(g, 14, 18, 0.5, 5.5, [[0, '#fff6b8'], [0.6, '#f6b92c'], [1, '#a8700e']]), 1);
    g.fillStyle = '#8a5a0a'; g.font = 'bold 7px sans-serif'; g.textAlign = 'center'; g.fillText('$', 15, 21.6);
  }));
}
export function sawBladeSprite(r = 14, col = '#cfd5de') {
  return cached(`saw:${r}:${col}`, () => mk(r * 2 + 4, r * 2 + 4, (g) => {
    g.translate(r + 2, r + 2); const n = 12;
    g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * T2; const k = i % 2 ? r * 0.8 : r; const a2 = a + (i % 2 ? 0 : 0.06); g.lineTo(Math.cos(a2) * k, Math.sin(a2) * k); } g.closePath();
    fillStroke(g, rad(g, -r * 0.3, -r * 0.3, 1, r * 1.3, [[0, '#ffffff'], [0.5, col], [1, '#5a6070']]), 1.2);
    circ(g, 0, 0, r * 0.55); g.lineWidth = 1; g.strokeStyle = 'rgba(40,40,50,0.6)'; g.stroke();
    for (let i = 0; i < 3; i++) { const a = (i / 3) * T2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55); g.lineWidth = 1.1; g.strokeStyle = 'rgba(40,40,50,0.5)'; g.stroke(); }
    circ(g, 0, 0, r * 0.2); fillStroke(g, '#3a3e48', 0.8);
    g.fillStyle = 'rgba(160,10,20,0.6)'; ell(g, r * 0.45, r * 0.3, r * 0.22, r * 0.1, 0.8); g.fill();
  }));
}

// ───── иконки интерфейса (dataURL) ─────
export function uiIcon(name, size = 24) {
  return cached(`ui:${name}:${size}`, () => {
    const c = mk(size, size, (g) => {
      g.scale(size / 24, size / 24);
      const ic = UI_IMG[name] && inner(UI_IMG[name]);
      if (ic) { g.imageSmoothingQuality = 'high'; g.drawImage(ic.im, ic.sx, ic.sy, ic.sw, ic.sh, 0, 0, 24, 24); return; }
      if (name === 'coin') { circ(g, 12, 12, 10); fillStroke(g, rad(g, 9, 9, 1, 14, [[0, '#fff6b8'], [0.5, '#f6b92c'], [1, '#9a6208']]), 1.6); circ(g, 12, 12, 6.4); g.lineWidth = 1.2; g.strokeStyle = 'rgba(120,70,0,0.8)'; g.stroke(); g.fillStyle = '#8a5a0a'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.fillText('$', 12, 15.6); }
      else if (name === 'heart') { g.beginPath(); g.moveTo(12, 21); g.bezierCurveTo(-2, 10, 4, 1, 12, 7); g.bezierCurveTo(20, 1, 26, 10, 12, 21); g.closePath(); fillStroke(g, rad(g, 9, 8, 1, 14, [[0, '#ff9aa6'], [0.5, '#e0243a'], [1, '#7a0818']]), 1.6); g.fillStyle = 'rgba(255,255,255,0.5)'; ell(g, 8, 8, 2.4, 1.4, -0.6); g.fill(); }
      else if (name === 'skull') { circ(g, 12, 10, 8); fillStroke(g, rad(g, 9, 7, 1, 12, [[0, '#fffbe8'], [1, '#b9af90']]), 1.6); rrect(g, 7.5, 15, 9, 6, 2); fillStroke(g, '#e0d8c0', 1.4); g.fillStyle = '#1a0b10'; circ(g, 8.8, 10, 2.3); g.fill(); circ(g, 15.2, 10, 2.3); g.fill(); poly(g, [[12, 12.5], [10.8, 14.5], [13.2, 14.5]]); g.fill(); }
      else if (name === 'sword') { tube(g, 5, 19, 19, 5, 2.6, '#cfd5de', 1.2); tube(g, 4, 20, 8, 16, 3, '#5a3a22', 1); tube(g, 7, 12, 12, 17, 2.4, '#d4a838', 1); }
      else if (name === 'clock') { circ(g, 12, 12, 10); fillStroke(g, '#2a2230', 1.6); circ(g, 12, 12, 8); fillStroke(g, '#efe6d0', 1); g.strokeStyle = '#1a0b10'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(12, 12); g.lineTo(12, 6); g.moveTo(12, 12); g.lineTo(16, 14); g.stroke(); }
      else if (name === 'fast') { poly(g, [[3, 5], [12, 12], [3, 19]]); fillStroke(g, '#f5e6c0', 1.4); poly(g, [[12, 5], [21, 12], [12, 19]]); fillStroke(g, '#f5e6c0', 1.4); }
      else if (name === 'pause') { rrect(g, 5, 4, 5, 16, 1.5); fillStroke(g, '#f5e6c0', 1.4); rrect(g, 14, 4, 5, 16, 1.5); fillStroke(g, '#f5e6c0', 1.4); }
      else if (name === 'play') { poly(g, [[6, 4], [20, 12], [6, 20]]); fillStroke(g, '#f5e6c0', 1.4); }
      else if (name === 'income') { circ(g, 12, 14, 8); fillStroke(g, rad(g, 9, 11, 1, 12, [[0, '#fff6b8'], [0.55, '#f6b92c'], [1, '#9a6208']]), 1.4); poly(g, [[12, 1], [17, 7], [7, 7]]); fillStroke(g, '#7aff7a', 1.2); }
      else if (name === 'meteor') { g.beginPath(); g.moveTo(3, 3); g.quadraticCurveTo(10, 6, 14, 10); g.lineWidth = 6; g.strokeStyle = 'rgba(255,140,30,0.55)'; g.stroke(); circ(g, 15, 15, 6.4); fillStroke(g, rad(g, 13, 13, 0.5, 9, [[0, '#ffe27a'], [0.5, '#ff6a1c'], [1, '#7a1a08']]), 1.4); }
      else if (name === 'stasis') { for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI; g.beginPath(); g.moveTo(12 + Math.cos(a) * 9, 12 + Math.sin(a) * 9); g.lineTo(12 - Math.cos(a) * 9, 12 - Math.sin(a) * 9); g.lineWidth = 2.6; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 1.4; g.strokeStyle = '#bfe8ff'; g.stroke(); } circ(g, 12, 12, 2.2); fillStroke(g, '#fff', 0.8); }
      else if (name === 'rush') { circ(g, 12, 12, 10); fillStroke(g, '#2a2230', 1.6); g.fillStyle = '#ffd24a'; poly(g, [[13, 2], [6, 13], [11, 13], [9, 22], [18, 10], [12.5, 10]]); g.fill(); g.lineWidth = 1; g.strokeStyle = OUT; g.stroke(); }
      else if (name === 'sell') { circ(g, 12, 12, 9); fillStroke(g, '#5a2a2a', 1.4); g.fillStyle = '#ffd24a'; g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; g.fillText('$', 12, 16.5); }
      else if (name === 'up') { poly(g, [[12, 3], [21, 14], [15, 14], [15, 21], [9, 21], [9, 14], [3, 14]]); fillStroke(g, '#7aff7a', 1.5); }
      else if (name === 'worker') { circ(g, 12, 8, 4.6); fillStroke(g, '#e0b890', 1.3); g.beginPath(); g.arc(12, 6.5, 5.2, Math.PI, 0); g.closePath(); fillStroke(g, '#f0b020', 1.3); rrect(g, 6, 13, 12, 9, 3); fillStroke(g, '#5a7ab0', 1.3); }
      else if (name === 'horde') { for (const [x, y, c] of [[7, 12, '#7ab648'], [17, 12, '#7ab648'], [12, 9, '#c06a3e']]) { circ(g, x, y, 5); fillStroke(g, c, 1.3); g.fillStyle = '#ffe23a'; circ(g, x + 1.5, y - 1, 1.3); g.fill(); } }
      else if (name === 'soul') { g.beginPath(); g.moveTo(12, 2); g.bezierCurveTo(20, 8, 20, 16, 12, 22); g.bezierCurveTo(4, 16, 4, 8, 12, 2); g.closePath(); fillStroke(g, rad(g, 12, 8, 1, 14, [[0, '#ffffff'], [0.4, '#9ae8ff'], [1, '#3a7ad8']]), 1.5); g.fillStyle = '#10263a'; circ(g, 9.4, 11, 1.6); g.fill(); circ(g, 14.6, 11, 1.6); g.fill(); g.beginPath(); g.arc(12, 15.2, 2, 0.1, Math.PI - 0.1); g.lineWidth = 1.1; g.strokeStyle = '#10263a'; g.stroke(); }
      else if (name === 'trophy') { g.beginPath(); g.moveTo(6, 3); g.lineTo(18, 3); g.lineTo(17, 11); g.quadraticCurveTo(12, 16, 7, 11); g.closePath(); fillStroke(g, lin(g, 6, 3, 18, 14, [[0, '#fff2a8'], [0.5, '#f6b92c'], [1, '#9a6208']]), 1.5); g.beginPath(); g.moveTo(6, 5); g.quadraticCurveTo(1, 5, 3, 9); g.quadraticCurveTo(4, 11, 7, 10.5); g.moveTo(18, 5); g.quadraticCurveTo(23, 5, 21, 9); g.quadraticCurveTo(20, 11, 17, 10.5); g.lineWidth = 1.6; g.strokeStyle = '#d99a1c'; g.stroke(); rrect(g, 10.4, 14, 3.2, 4, 1); fillStroke(g, '#d99a1c', 1); rrect(g, 7, 18, 10, 3.4, 1.4); fillStroke(g, '#8a5a0a', 1.2); }
      else if (name === 'lock') { rrect(g, 5, 10, 14, 11, 2.4); fillStroke(g, lin(g, 5, 10, 19, 21, [[0, '#c9ced6'], [1, '#4a4e58']]), 1.5); g.beginPath(); g.arc(12, 10, 4.6, Math.PI, 0); g.lineWidth = 2.6; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 1.4; g.strokeStyle = '#9aa0aa'; g.stroke(); circ(g, 12, 15, 1.8); fillStroke(g, '#1a0b10', 0.6); }
      else if (name === 'forge') { poly(g, [[3, 10], [21, 10], [19, 14], [14, 14], [15, 19], [18, 21], [6, 21], [9, 19], [10, 14], [5, 14]]); fillStroke(g, lin(g, 3, 10, 21, 21, [[0, '#a8aeb8'], [1, '#32363e']]), 1.5); g.fillStyle = '#ff7a1c'; ell(g, 12, 8, 3, 1.6); g.fill(); }
      else if (name === 'target') { circ(g, 12, 12, 9); g.lineWidth = 1.6; g.strokeStyle = '#f5e6c0'; g.stroke(); circ(g, 12, 12, 4); g.stroke(); g.beginPath(); g.moveTo(12, 0); g.lineTo(12, 5); g.moveTo(12, 19); g.lineTo(12, 24); g.moveTo(0, 12); g.lineTo(5, 12); g.moveTo(19, 12); g.lineTo(24, 12); g.stroke(); }
    });
    return c.toDataURL();
  });
}

// ───── QA ─────
export function renderSheet({ section, add, verdict }) {
  const row = section('Карты (фон)');
  if (row) for (const m of MAPS) { const c = bakeMap(m); add(row, m.name, c, verdict(m.name, c, { minFill: 0.9, edgeOk: true }), 200); c.style.width = '200px'; }
  const row2 = section('Кровь');
  if (row2) for (const k of Object.keys(BLOOD)) { for (let i = 0; i < 4; i++) { const c = splatSprite(k, i); add(row2, `${k} splat ${i}`, c, verdict(`splat ${k} ${i}`, c, { minFill: 0.1 }), 60); } const p = poolSprite(k, 1); add(row2, `${k} pool`, p, verdict(`pool ${k}`, p, { minFill: 0.1 }), 70); }
  const row3 = section('Иконки и эффекты');
  if (row3) {
    for (const n of ['coin', 'heart', 'skull', 'sword', 'clock', 'fast', 'pause', 'play', 'income', 'meteor', 'stasis', 'rush', 'sell', 'up', 'worker', 'horde', 'target']) { const img = new Image(); img.src = uiIcon(n, 48); const c = mk(24, 24, () => {}); const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96; cv.lw = 48; img.onload = () => cv.getContext('2d').drawImage(img, 0, 0, 96, 96); add(row3, n, cv, null, 60); }
    for (const [n, c] of [['bag', bagSprite()], ['saw', sawBladeSprite(14)], ['coin', coinSprite()], ['scorch', scorchSprite()]]) add(row3, n, c, verdict(n, c, { minFill: 0.05 }), 60);
  }
}
