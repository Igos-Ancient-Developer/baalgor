// Окружение: фон карт, пятна крови, иконки интерфейса. На картах стоят только деревья и валуны; портал и ворота — на концах дороги.
import { OUT, S, mk, cached, shade, lin, rad, rrect, ell, circ, poly, fillStroke, tube, glow, shadowEll, rng } from './art.js?v=20261023142219';
import { CELL, COLS, ROWS, WORLD_W, WORLD_H, PAD, MAPS } from './data.js?v=20261023142219';
import { UI_IMG, inner } from './iconmap.js?v=20261023142219';
import { BLOOD } from './enemies.js?v=20261023142219';
import { SPR, img } from './sprites.js?v=20261023142219';

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

// ───── деревья и валуны: картинки из листов nature_*; если их нет — рисуем кодом ─────
function groundShadow(g, x, y, rx, ry) { shadowEll(g, x + 2, y + 2, rx, ry, 0.45); }
const blob = (g, x, y, r, c) => { circ(g, x, y, r); fillStroke(g, rad(g, x - r * 0.35, y - r * 0.4, r * 0.1, r * 1.25, [[0, shade(c, 0.4)], [0.55, c], [1, shade(c, -0.4)]]), 1.5); };
const tier = (g, x, y, w, h, c) => { poly(g, [[x - w, y], [x - w * 0.15, y - h], [x + w * 0.15, y - h], [x + w, y]]); fillStroke(g, lin(g, x - w, 0, x + w, 0, [[0, shade(c, 0.35)], [0.5, c], [1, shade(c, -0.45)]]), 1.5); };
export const DECOR = {
  oak(g, x, y) { groundShadow(g, x, y + 12, 17, 6); tube(g, x, y + 13, x, y - 2, 6, '#7a5632', 1.2); blob(g, x - 9, y - 4, 10.5, '#5f8f46'); blob(g, x + 9, y - 5, 10.5, '#578840'); blob(g, x, y - 14, 13, '#6a9d4e'); },
  spruce(g, x, y) { groundShadow(g, x, y + 12, 14, 5); tube(g, x, y + 13, x, y + 3, 5, '#6a4a2a', 1.2); for (let i = 0; i < 4; i++) tier(g, x, y + 7 - i * 9, 17 - i * 3.6, 15, i % 2 ? '#3f7a52' : '#357048'); },
  snowspruce(g, x, y) { DECOR.spruce(g, x, y); },
  deadtree(g, x, y) {
    groundShadow(g, x, y + 12, 14, 5);
    g.beginPath(); g.moveTo(x - 4, y + 12); g.quadraticCurveTo(x - 3, y - 2, x - 6, y - 10); g.lineTo(x + 5, y - 10); g.quadraticCurveTo(x + 2, y - 2, x + 5, y + 12); g.closePath(); fillStroke(g, lin(g, x - 6, 0, x + 6, 0, [[0, '#6e5a48'], [1, '#2e241c']]), 1.4);
    for (const [x0, y0, x1, y1, w] of [[-3, -8, -14, -20, 3], [2, -8, 12, -22, 3], [0, -10, 1, -24, 2.4]]) tube(g, x + x0, y + y0, x + x1, y + y1, w, '#4a3a2c', 0.9);
  },
  boulder(g, x, y) {
    groundShadow(g, x, y + 12, 21, 7);
    const pts = [[-19, 10], [-21, -2], [-13, -15], [2, -20], [16, -14], [22, -1], [19, 10]];
    g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(x + a, y + b) : g.moveTo(x + a, y + b))); g.closePath();
    fillStroke(g, lin(g, x - 20, y - 20, x + 20, y + 12, [[0, '#b4b8bf'], [0.55, '#868b94'], [1, '#4e525c']]), 1.8);
  },
};
// вид -> [набор картинок, сколько их, высота на карте]
const NAT = { oak: ['oak', 5, 68], deadtree: ['dead', 1, 66], spruce: ['spruce', 1, 72], snowspruce: ['spruce', 1, 72], boulder: ['rock', 7, 44] };
function natDecor(g, kind, x, y, key) {
  const [grp, n, h0] = NAT[kind], im = img(`decor/nat_${grp}_${key % n + 1}.webp`); if (!im) return false;
  let h = h0, w = h * im.naturalWidth / im.naturalHeight; if (w > 58) { w = 58; h = w * im.naturalHeight / im.naturalWidth; }
  shadowEll(g, x, y + 12, w * 0.4, 5, 0.45); g.imageSmoothingQuality = 'high'; g.drawImage(im, x - w / 2, y + 14 - h, w, h); return true;
}

// ───── растровая земля (ассеты img/tiles) ─────
const THEME_TILE = { grave: ['grass', 'rgba(14,18,40,0.24)'], forest: ['grass', 'rgba(0,18,10,0.10)'], desert: ['sand', null], ice: ['snow', null], lava: ['lava', null], slaughter: ['lava', 'rgba(40,6,6,0.26)'] };
const THEME_LIFT = { grave: ['soft-light', 'rgba(210,225,150,0.55)'], forest: ['soft-light', 'rgba(190,235,150,0.5)'], desert: ['soft-light', 'rgba(255,230,160,0.35)'], ice: ['soft-light', 'rgba(220,240,255,0.35)'], lava: ['soft-light', 'rgba(255,170,110,0.3)'], slaughter: ['soft-light', 'rgba(255,170,130,0.3)'] };
const TILE_PICK = { grass: 1, sand: 1, snow: 0, lava: 2 };
// дорога: [тип тайла, номер, затемнение]
const ROAD_TILE = { grave: ['sand', 1, 'rgba(38,32,58,0.40)'], forest: ['sand', 1, 'rgba(44,30,12,0.18)'], desert: ['sand', 3, 'rgba(70,36,12,0.14)'], ice: ['snow', 3, 'rgba(74,98,134,0.42)'], lava: ['lava', 0, 'rgba(10,6,6,0.05)'], slaughter: ['sand', 3, 'rgba(84,20,14,0.46)'] };
const ROAD_W = CELL * 1.0;                              // дорога шире врагов: они идут по ней свободно
// текстуры земли мягкие (96 px): чуть подчёркиваем резкость и контраст (шов бесшовный, поэтому края заворачиваем)
const sharpCache = new Map();
function sharpTile(im) {
  if (!im) return im; let c = sharpCache.get(im); if (c) return c;
  const w = im.naturalWidth, h = im.naturalHeight; c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, w, h), src = new Uint8ClampedArray(d.data), k = 0.4;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) for (let ch = 0; ch < 3; ch++) {
    const i = (yy * w + xx) * 4 + ch, up = (((yy + h - 1) % h) * w + xx) * 4 + ch, dn = (((yy + 1) % h) * w + xx) * 4 + ch, lf = (yy * w + ((xx + w - 1) % w)) * 4 + ch, rt = (yy * w + ((xx + 1) % w)) * 4 + ch;
    const v = src[i] * (1 + 4 * k) - k * (src[up] + src[dn] + src[lf] + src[rt]); d.data[i] = (v - 128) * 1.04 + 128;
  }
  x.putImageData(d, 0, 0); sharpCache.set(im, c); return c;
}
const BG_C0 = -1, BG_C1 = COLS, BG_R0 = -2, BG_R1 = ROWS + 3;     // клетки земли с запасом за краем поля (под фон карты)
function groundTiles(g, theme) {
  const [kind, tint] = THEME_TILE[theme] || THEME_TILE.grave;
  const t0 = sharpTile(img(`tiles/${kind}_${TILE_PICK[kind]}.webp`));
  if (!t0) return false;
  g.imageSmoothingQuality = 'high';
  for (let r = BG_R0; r <= BG_R1; r++) for (let c = BG_C0; c <= BG_C1; c++) {
    const flip = ((c * 3 + r * 5) % 4 + 4) % 4;
    g.save(); g.translate((c + 0.5) * CELL, (r + 0.5) * CELL); g.scale(flip & 1 ? -1 : 1, flip & 2 ? -1 : 1);
    g.drawImage(t0, -CELL / 2 - 0.5, -CELL / 2 - 0.5, CELL + 1, CELL + 1); g.restore();
  }
  if (tint) { g.fillStyle = tint; g.fillRect(-PAD.l, -PAD.t, WORLD_W + PAD.l + PAD.r, WORLD_H + PAD.t + PAD.b); }
  const lift = THEME_LIFT[theme];                                                  // подсветка и тёплый оттенок: земля светлее и ярче, враги и здания читаются лучше
  if (lift) { g.save(); g.globalCompositeOperation = lift[0]; g.fillStyle = lift[1]; g.fillRect(-PAD.l, -PAD.t, WORLD_W + PAD.l + PAD.r, WORLD_H + PAD.t + PAD.b); g.restore(); }
  return true;
}
function roadTexture(g, map, bs) {
  const [kind, idx, tint] = ROAD_TILE[map.theme] || ROAD_TILE.grave, t = sharpTile(img(`tiles/${kind}_${idx}.webp`));
  if (!t) return false;
  const BW = WORLD_W + PAD.l + PAD.r, BH = WORLD_H + PAD.t + PAD.b;
  const tmp = mkS(BW, BH, bs, (h) => {
    h.translate(PAD.l, PAD.t);
    h.lineCap = 'round'; h.lineJoin = 'round'; h.strokeStyle = '#000'; h.lineWidth = ROAD_W;
    for (const p of map.paths) { h.beginPath(); p.forEach(([c, r], i) => { const x = (c + 0.5) * CELL, y = (r + 0.5) * CELL; i ? h.lineTo(x, y) : h.moveTo(x, y); }); h.stroke(); }
    h.globalCompositeOperation = 'source-in'; h.imageSmoothingQuality = 'high';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const f = (c * 5 + r * 3) % 4; h.save(); h.translate((c + 0.5) * CELL, (r + 0.5) * CELL); h.scale(f & 1 ? -1 : 1, f & 2 ? -1 : 1); h.drawImage(t, -CELL / 2 - 0.5, -CELL / 2 - 0.5, CELL + 1, CELL + 1); h.restore(); }
    h.fillStyle = tint; h.fillRect(-PAD.l, -PAD.t, BW, BH);
  });
  g.drawImage(tmp, -PAD.l, -PAD.t, BW, BH);
  return true;
}

// ───── дорога: булыжник или колея, свечение магмы, травинки ─────
const ROAD_STYLE = {
  grave: { k: 'cobble', c: '#7b7d83', gap: 'rgba(6,6,10,.6)' }, forest: { k: 'dirt', c: '#7a6044', blade: '#4f7a3a' }, desert: { k: 'dirt', c: '#b98a4e' },
  ice: { k: 'cobble', c: '#b9cad9', gap: 'rgba(40,70,110,.55)' }, lava: { k: 'cobble', c: '#37312f', gap: 'rgba(255,110,40,.55)', glow: true }, slaughter: { k: 'cobble', c: '#7a574d', gap: 'rgba(40,6,6,.75)' },
};
function roadDetail(g, map, R) {
  const st = ROAD_STYLE[map.theme] || ROAD_STYLE.grave, Wd = ROAD_W * 0.94;
  for (const p of map.paths) for (let i = 1; i < p.length; i++) {
    const [c0, r0] = p[i - 1], [c1, r1] = p[i], x0 = (c0 + 0.5) * CELL, y0 = (r0 + 0.5) * CELL, x1 = (c1 + 0.5) * CELL, y1 = (r1 + 0.5) * CELL, L = Math.hypot(x1 - x0, y1 - y0);
    const ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux, ang = Math.atan2(uy, ux);
    if (st.k === 'cobble') {
      g.lineCap = 'butt'; g.strokeStyle = st.gap; g.lineWidth = Wd * 0.96; g.beginPath(); g.moveTo(x0 - ux * 5, y0 - uy * 5); g.lineTo(x1 + ux * 5, y1 + uy * 5); g.stroke();
      const lanes = 4, lw = Wd / lanes;
      for (let d = -5; d < L + 5; d += 9) for (let k = 0; k < lanes; k++) {
        const off = (k - (lanes - 1) / 2) * lw, dd = d + (k % 2) * 4.5 + (R() - 0.5) * 1.6, px = x0 + ux * dd + nx * off, py = y0 + uy * dd + ny * off;
        const sw = 7.6 + R() * 1.4, sh = lw * (0.84 + R() * 0.1);
        g.save(); g.translate(px, py); g.rotate(ang + (R() - 0.5) * 0.1);
        rrect(g, -sw / 2, -sh / 2, sw, sh, 2.3); g.fillStyle = shade(st.c, (R() - 0.5) * 0.22); g.fill();
        g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(-sw / 2 + 1, -sh / 2 + 0.6, sw - 2, 1.2);          // свет сверху
        g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(-sw / 2 + 1, sh / 2 - 1.6, sw - 2, 1.2);                  // тень снизу
        if (R() < 0.12) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-sw / 2 + 1.5, -sh / 4); g.lineTo(sw / 4, sh / 4); g.stroke(); }  // трещинка
        g.restore();
      }
    } else {
      for (const side of [-1, 1]) {                                                                          // колея
        g.beginPath(); for (let t = 0; t <= L; t += 4) { const o = side * Wd * 0.22 + Math.sin(t * 0.17 + i * 2 + side) * 0.9; const x = x0 + ux * t + nx * o, y = y0 + uy * t + ny * o; t ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.lineCap = 'round'; g.strokeStyle = 'rgba(30,18,8,.30)'; g.lineWidth = 2.6; g.stroke();
        g.beginPath(); for (let t = 0; t <= L; t += 4) { const o = side * Wd * 0.22 + 2 + Math.sin(t * 0.17 + i * 2 + side) * 0.9; const x = x0 + ux * t + nx * o, y = y0 + uy * t + ny * o; t ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.strokeStyle = 'rgba(255,240,200,.13)'; g.lineWidth = 1; g.stroke();
      }
      for (let t = 0; t < L; t += 5) {                                                                       // камешки, трава посередине
        const o = (R() - 0.5) * Wd * 0.8, x = x0 + ux * t + nx * o, y = y0 + uy * t + ny * o;
        if (R() < 0.55) { ell(g, x, y, 0.9 + R() * 1.4, 0.7 + R(), R() * 3); g.fillStyle = R() < 0.5 ? shade(st.c, 0.28) : 'rgba(0,0,0,.28)'; g.fill(); }
        else if (st.blade && R() < 0.5) { g.strokeStyle = st.blade; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 1, y - 3.5); g.moveTo(x + 1, y); g.lineTo(x + 1.5, y - 3); g.stroke(); }
      }
    }
  }
}
// ───── земля: пятна света/тени и травинки (не мешают строить) ─────
function groundDetail(g, map, theme, onPath, dec, R) {
  const BW = WORLD_W + PAD.l + PAD.r, BH = WORLD_H + PAD.t + PAD.b;
  for (let i = 0; i < 90; i++) {
    const x = -PAD.l + R() * BW, y = -PAD.t + R() * BH, r = 26 + R() * 50, light = R() < 0.45;
    g.fillStyle = rad(g, x, y, 0, r, [[0, light ? 'rgba(255,255,230,.07)' : 'rgba(0,0,0,.12)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const th = THEMES[theme];
  for (let r = BG_R0; r <= BG_R1; r++) for (let c = BG_C0; c <= BG_C1; c++) {
    if (onPath.has(c + ',' + r) || dec.has(c + ',' + r)) continue;
    const n = R() < 0.55 ? 1 + (R() < 0.35 ? 1 : 0) : 0;
    for (let k = 0; k < n; k++) {
      const x = (c + 0.15 + R() * 0.7) * CELL, y = (r + 0.2 + R() * 0.7) * CELL, q = R();
      if (q < 0.6 && theme !== 'lava') {                                                                    // травинки / снежные бугорки
        if (theme === 'ice') { ell(g, x, y, 3 + R() * 3, 1.4 + R(), 0); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill(); }
        else if (theme === 'desert') { ell(g, x, y, 2 + R() * 2, 1 + R(), R() * 3); g.fillStyle = 'rgba(90,55,20,.35)'; g.fill(); }
        else { g.strokeStyle = th.tuft; g.lineWidth = 1; g.beginPath(); for (let b = -1; b <= 1; b++) { g.moveTo(x + b * 2, y); g.lineTo(x + b * 3 + (R() - 0.5) * 2, y - 4 - R() * 3); } g.stroke(); }
      } else if (theme === 'lava') { glow(g, x, y, 5 + R() * 4, '#ff7a2a', 0.45); }
    }
  }
}

// ───── портал врагов и ворота крепости ─────
// портал: зев в центре клетки, откуда выходят враги; ворота: проём у нижнего края дороги, где враги исчезают
export const PORTAL = { w: 88, mouth: 0.55 };
export const GATE = { w: 92, floor: 0.88 };
function drawPortal(g, x, y) {
  const im = img('decor/obj_portal.webp'); if (!im) return;
  const w = PORTAL.w, h = w * im.naturalHeight / im.naturalWidth, top = y - 4 - h * PORTAL.mouth;
  shadowEll(g, x, top + h - 4, w * 0.42, 6, 0.45); g.imageSmoothingQuality = 'high'; g.drawImage(im, x - w / 2, top, w, h);
}
function drawGate(g, x, y) {
  const im = img('decor/obj_gate.webp'); if (!im) return;
  const w = GATE.w, h = w * im.naturalHeight / im.naturalWidth, top = y - h * GATE.floor;
  shadowEll(g, x, top + h - 4, w * 0.46, 7, 0.5); g.imageSmoothingQuality = 'high'; g.drawImage(im, x - w / 2, top, w, h);
}

export function bakeMap(map, scale = S) {
  const th = THEMES[map.theme], R = rng(map.id.length * 7919 + 13), bs = clamp(scale, 1.5, 2.25);
  const BW = WORLD_W + PAD.l + PAD.r, BH = WORLD_H + PAD.t + PAD.b;
  const sp = SPR.ok;
  const c = mkS(BW, BH, bs, (g) => {
    g.translate(PAD.l, PAD.t);
    // основа
    if (!(sp && groundTiles(g, map.theme))) {
      g.fillStyle = lin(g, 0, -PAD.t, 0, WORLD_H + PAD.b, [[0, th.base], [1, th.base2]]); g.fillRect(-PAD.l, -PAD.t, BW, BH);
      for (let i = 0; i < 900; i++) { const x = -PAD.l + R() * BW, y = -PAD.t + R() * BH; ell(g, x, y, 2 + R() * 9, 1 + R() * 5, R() * 3); g.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.045)'; g.fill(); }
    }
    // дорога: тёмный бордюр с мягкой тенью, затем текстура и детали
    const strokePaths = (w, col) => { g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = col; g.lineWidth = w; for (const p of map.paths) { g.beginPath(); p.forEach(([cc, r], i) => { const x = (cc + 0.5) * CELL, y = (r + 0.5) * CELL; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); } };
    if (sp) { g.save(); g.shadowColor = 'rgba(0,0,0,.65)'; g.shadowBlur = 10; strokePaths(ROAD_W * 1.1, th.edge); g.restore(); } else strokePaths(ROAD_W * 1.06, th.edge);
    if (sp && roadTexture(g, map, bs)) roadDetail(g, map, R);
    else { strokePaths(ROAD_W * 0.92, th.path); strokePaths(ROAD_W * 0.62, th.pathHi); g.globalAlpha = 0.5; strokePaths(ROAD_W * 0.4, th.path); g.globalAlpha = 1; }
    // камушки по краям дороги
    for (const p of map.paths) {
      for (let i = 1; i < p.length; i++) {
        const [c0, r0] = p[i - 1], [c1, r1] = p[i];
        const x0 = (c0 + 0.5) * CELL, y0 = (r0 + 0.5) * CELL, x1 = (c1 + 0.5) * CELL, y1 = (r1 + 0.5) * CELL, L = Math.hypot(x1 - x0, y1 - y0);
        const nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
        for (let d = 0; d < L; d += 7) {
          const bx = x0 + ((x1 - x0) * d) / L, by = y0 + ((y1 - y0) * d) / L;
          for (const side of [-1, 1]) if (R() < 0.8) { const o = side * (ROAD_W * 0.5 + (R() - 0.5) * 4); ell(g, bx + nx * o, by + ny * o, 1.9 + R() * 1.9, 1.4 + R() * 1.2, R() * 3); fillStroke(g, shade(th.stone, -0.32 + (R() - 0.5) * 0.2), 0.8); }
        }
      }
    }
    // занятые клетки: дорога, декор, места у портала и ворот
    const onPath = new Set();
    for (const p of map.paths) for (let i = 1; i < p.length; i++) { const [c0, r0] = p[i - 1], [c1, r1] = p[i]; let cc = c0, r = r0; const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0); for (;;) { onPath.add(cc + ',' + r); if (cc === c1 && r === r1) break; cc += dc; r += dr; } }
    const dec = new Set(map.decor.map(([cc, r]) => cc + ',' + r));
    if (sp) groundDetail(g, map, map.theme, onPath, dec, R);
    // деревья и валуны по рядам (сверху вниз)
    [...map.decor].sort((a, b) => a[1] - b[1]).forEach(([cc, r, kind]) => { if (!(sp && natDecor(g, kind, (cc + 0.5) * CELL, (r + 0.5) * CELL, cc * 5 + r * 3 + map.index))) DECOR[kind](g, (cc + 0.5) * CELL, (r + 0.5) * CELL); });
    // портал в начале каждой дороги, ворота в конце
    for (const p of map.paths) drawPortal(g, (p[0][0] + 0.5) * CELL, (p[0][1] + 0.5) * CELL);
    const gates = new Set();
    for (const p of map.paths) { const e = p[p.length - 1], k = e + ''; if (!gates.has(k)) { gates.add(k); drawGate(g, (e[0] + 0.5) * CELL, (e[1] + 0.5) * CELL); } }
    // лёгкая дымка и тонкая рамка по краю: фон не обрывается резко
    g.fillStyle = th.sky; g.fillRect(-PAD.l, -PAD.t, BW, BH);
    for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[-PAD.l, 0, -PAD.l + 22, 0, -PAD.l, -PAD.t, 22, BH], [WORLD_W + PAD.r, 0, WORLD_W + PAD.r - 22, 0, WORLD_W + PAD.r - 22, -PAD.t, 22, BH], [0, -PAD.t, 0, -PAD.t + 22, -PAD.l, -PAD.t, BW, 22], [0, WORLD_H + PAD.b, 0, WORLD_H + PAD.b - 22, -PAD.l, WORLD_H + PAD.b - 22, BW, 22]]) {
      g.fillStyle = lin(g, x0, y0, x1, y1, [[0, 'rgba(8,2,6,0.5)'], [1, 'rgba(8,2,6,0)']]); g.fillRect(rx, ry, rw, rh);
    }
  });
  return c;
}

// фон текущей карты: один запечённый холст; при смене карты прежний освобождается
let bgCache = null;
export function mapBG(map, scale) {
  if (bgCache && bgCache.id === map.id) return bgCache.c;
  releaseBG(); bgCache = { id: map.id, c: bakeMap(map, scale) }; return bgCache.c;
}
export function releaseBG() { if (bgCache) { bgCache.c.width = 0; bgCache = null; } }

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
export function guardSprite(kind, step = 0) {
  return cached(`guard:${kind}:${step}`, () => mk(36, 46, (g) => {
    g.translate(0, 6);
    const col = { norm: ['#8a8f9a', '#b03a2a'], A: ['#a8b4c8', '#2d5f9a'], B: ['#5d4a52', '#8a1018'] }[kind];
    shadowEll(g, 18, 36, 9, 3, 0.4);
    tube(g, 15, 26, 14 - step, 35, 3.6, '#3a2a22', 0.9); tube(g, 21, 26, 22 + step, 35, 3.6, '#3a2a22', 0.9);
    rrect(g, 11, 14, 14, 14, 4); fillStroke(g, lin(g, 11, 0, 25, 0, [[0, shade(col[0], 0.3)], [1, shade(col[0], -0.4)]]), 1.3);
    rrect(g, 11, 23, 14, 3, 1); fillStroke(g, '#3a2218', 0.6);
    circ(g, 18, 10, 6.4); fillStroke(g, lin(g, 12, 4, 24, 16, [[0, shade(col[0], 0.4)], [1, shade(col[0], -0.3)]]), 1.3);
    g.fillStyle = '#0a0a12'; g.fillRect(19, 8.6, 6, 2.4);
    poly(g, [[14, 5], [18, -2], [22, 5]]); fillStroke(g, col[1], 0.8);
    poly(g, [[6, 16], [12, 15], [12, 26], [9, 30], [6, 26]]); fillStroke(g, lin(g, 6, 0, 12, 0, [[0, '#6a7080'], [1, '#2e323c']]), 1.1); tube(g, 9, 17, 9, 27, 1.3, col[1], 0.4);
    tube(g, 24, 20, 31, 12, 2.4, '#d8dde6', 0.8); tube(g, 24, 20, 27, 18, 3, '#3a2a22', 0.6);
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
    for (const [n, c] of [['bag', bagSprite()], ['saw', sawBladeSprite(14)], ['guard', guardSprite('norm')], ['guardA', guardSprite('A')], ['guardB', guardSprite('B')], ['coin', coinSprite()], ['scorch', scorchSprite()]]) add(row3, n, c, verdict(n, c, { minFill: 0.05 }), 60);
  }
}
