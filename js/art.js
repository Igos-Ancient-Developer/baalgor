// Графика башен и зданий: растровые ассеты из img/ (js/sprites.js); процедурная отрисовка — запасной вариант и для зданий без ассетов (банк, алтарь).
// Все спрайты рисуются кодом при загрузке и кэшируются в canvas (масштаб S подбирается под экран).
import { SPR, img } from './sprites.js?v=20261029212841';
import { TOWERS } from './data.js?v=20261029212841';
export { SPR };
export const OUT = '#170a0f';
export let S = 2;
const cache = new Map();
export function setScale(s) { S = s; cache.clear(); }
export function dropCache(pred) { for (const k of [...cache.keys()]) if (pred(k)) cache.delete(k); }      // выбросить кэшированные спрайты (освободить память)
export function cached(key, make) { let v = cache.get(key); if (!v) { v = make(); cache.set(key, v); } return v; }

export function mk(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * S); c.height = Math.ceil(h * S);
  const g = c.getContext('2d');
  g.scale(S, S); g.lineJoin = 'round'; g.lineCap = 'round';
  fn(g);
  c.lw = w; c.lh = h;
  return c;
}

// ───── цвет ─────
function rgb(hex) {
  if (hex[0] === '#') {
    if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  }
  const m = hex.match(/\d+/g); return [+m[0], +m[1], +m[2]];
}
export function shade(hex, amt) {
  const [r, g, b] = rgb(hex); const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  return `rgb(${Math.round((t - r) * p + r)},${Math.round((t - g) * p + g)},${Math.round((t - b) * p + b)})`;
}
export function rgba(hex, a) { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; }
export function lin(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}
export function rad(g, x, y, r0, r1, stops) {
  const gr = g.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}
export function rng(seed) {
  let a = seed | 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ───── примитивы ─────
export function fillStroke(g, fill, lw = 1.3, stroke = OUT) {
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (lw) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); }
}
export function rrect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export function ell(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); }
export function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); }
export function poly(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
// толстая обведённая линия (конечности, древки)
export function tube(g, x0, y0, x1, y1, w, col, lw = 1.3) {
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
  g.lineWidth = w + lw * 2; g.strokeStyle = OUT; g.stroke();
  g.lineWidth = w; g.strokeStyle = col; g.stroke();
  g.lineWidth = Math.max(0.6, w * 0.28); g.strokeStyle = shade(col, 0.35); g.globalAlpha = 0.7;
  g.beginPath(); g.moveTo(x0 - w * 0.15, y0 - w * 0.15); g.lineTo(x1 - w * 0.15, y1 - w * 0.15); g.stroke(); g.globalAlpha = 1;
}
export function shadowEll(g, x, y, rx, ry, a = 0.35) {
  g.fillStyle = rad(g, x, y, 0, rx, [[0, `rgba(0,0,0,${a})`], [0.7, `rgba(0,0,0,${a * 0.6})`], [1, 'rgba(0,0,0,0)']]);
  g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y);
  g.beginPath(); g.arc(x, y, rx, 0, Math.PI * 2); g.fill(); g.restore();
}
export function glow(g, x, y, r, col, a = 0.8) {
  g.fillStyle = rad(g, x, y, 0, r, [[0, rgba(col, a)], [1, rgba(col, 0)]]);
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
}

// ───── каменная/деревянная круглая башня ─────
function keep(g, o) {
  const { cx = 40, cy = 74, rx = 17, ry = 9, h = 30, col = '#8a8f9a', tex = 'brick', crenel = false, bands = [], top = null, plinth = true, plCol = '#6f7480' } = o;
  shadowEll(g, cx + 3, cy + 5, rx + 12, ry + 6, 0.4);
  if (plinth) {
    const pr = rx + 6, pry = ry + 3.5, ph = 6;
    g.beginPath(); g.moveTo(cx - pr, cy); g.lineTo(cx - pr, cy + ph); g.ellipse(cx, cy + ph, pr, pry, 0, Math.PI, 0, true); g.lineTo(cx + pr, cy);
    g.ellipse(cx, cy, pr, pry, 0, 0, Math.PI, false); fillStroke(g, lin(g, cx - pr, 0, cx + pr, 0, [[0, shade(plCol, 0.2)], [1, shade(plCol, -0.4)]]), 1.3);
    ell(g, cx, cy, pr, pry); fillStroke(g, shade(plCol, 0.12), 1.3);
  }
  // back merlons
  const mer = (front) => {
    if (!crenel) return;
    const n = 9;
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2;
      const isFront = Math.sin(th) > 0;
      if (isFront !== front) continue;
      const x = cx + Math.cos(th) * (rx - 1.5), y = cy - h + Math.sin(th) * (ry - 1);
      rrect(g, x - 2.6, y - 7, 5.2, 7.5, 1); fillStroke(g, lin(g, x - 3, 0, x + 3, 0, [[0, shade(col, 0.3)], [1, shade(col, -0.25)]]), 1.1);
    }
  };
  mer(false);
  g.beginPath(); g.moveTo(cx - rx, cy - h); g.lineTo(cx - rx, cy); g.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true); g.lineTo(cx + rx, cy - h);
  g.ellipse(cx, cy - h, rx, ry, 0, 0, Math.PI, false);
  fillStroke(g, lin(g, cx - rx, 0, cx + rx, 0, [[0, shade(col, 0.32)], [0.4, col], [1, shade(col, -0.45)]]), 1.4);
  // текстура
  g.save(); g.clip();
  g.lineWidth = 0.7; g.strokeStyle = 'rgba(10,5,8,0.35)';
  if (tex === 'brick') {
    const rows = Math.max(2, Math.round(h / 7));
    for (let k = 1; k <= rows; k++) {
      const y = cy - h + (k * h) / rows - 0.5 * 0;
      g.beginPath(); g.ellipse(cx, y, rx, ry, 0, 0, Math.PI); g.stroke();
      for (let t = 0; t < 6; t++) {
        const th = ((t + (k % 2) * 0.5) / 6) * Math.PI;
        const x = cx + Math.cos(th) * rx, yy = y + Math.sin(th) * ry;
        g.beginPath(); g.moveTo(x, yy); g.lineTo(x, yy - h / rows); g.stroke();
      }
    }
  } else {
    for (let t = 1; t < 8; t++) {
      const th = (t / 8) * Math.PI; const x = cx + Math.cos(th) * rx;
      g.beginPath(); g.moveTo(x, cy - h + Math.sin(th) * ry); g.lineTo(x, cy + Math.sin(th) * ry); g.stroke();
    }
  }
  for (const b of bands) { // железные пояса
    const y = cy - h * b;
    g.lineWidth = 3; g.strokeStyle = '#2a2d33'; g.beginPath(); g.ellipse(cx, y, rx + 0.5, ry, 0, 0, Math.PI); g.stroke();
    g.lineWidth = 1; g.strokeStyle = '#7d8590'; g.beginPath(); g.ellipse(cx, y - 1, rx, ry, 0, 0.1, Math.PI - 0.1); g.stroke();
  }
  g.restore();
  // верхняя площадка
  ell(g, cx, cy - h, rx, ry);
  fillStroke(g, top || rad(g, cx, cy - h, 1, rx, [[0, shade(col, -0.1)], [1, shade(col, 0.15)]]), 1.4);
  mer(true);
}

// небольшие общие украшения
function flag(g, x, y, col, w = 12, h = 8, flip = 1) {
  tube(g, x, y, x, y - 18, 1.6, '#5a4630', 1);
  g.beginPath(); g.moveTo(x, y - 18); g.quadraticCurveTo(x + flip * w * 0.5, y - 20, x + flip * w, y - 16); g.lineTo(x + flip * (w - 2), y - 12); g.quadraticCurveTo(x + flip * w * 0.4, y - 14, x, y - 10); g.closePath();
  fillStroke(g, col, 1.1);
}
function skull(g, x, y, r = 3.2) {
  circ(g, x, y, r); fillStroke(g, '#e8e0cc', 0.9);
  rrect(g, x - r * 0.55, y + r * 0.6, r * 1.1, r * 0.9, 0.8); fillStroke(g, '#d6cdb6', 0.8);
  g.fillStyle = '#1a0b10'; circ(g, x - r * 0.38, y, r * 0.3); g.fill(); circ(g, x + r * 0.38, y, r * 0.3); g.fill();
}
function gem(g, x, y, r, col) {
  poly(g, [[x, y - r], [x + r * 0.8, y - r * 0.1], [x, y + r], [x - r * 0.8, y - r * 0.1]]);
  fillStroke(g, lin(g, x - r, y - r, x + r, y + r, [[0, shade(col, 0.5)], [0.5, col], [1, shade(col, -0.4)]]), 1);
}
function torch(g, x, y) {
  tube(g, x, y, x, y - 8, 2, '#5a4630', 0.9);
  glow(g, x, y - 11, 8, '#ff9a2a', 0.7);
  g.beginPath(); g.moveTo(x - 2.4, y - 8); g.quadraticCurveTo(x - 3, y - 13, x, y - 16); g.quadraticCurveTo(x + 3, y - 13, x + 2.4, y - 8); g.closePath();
  fillStroke(g, lin(g, x, y - 16, x, y - 8, [[0, '#ffe27a'], [1, '#ff5a1c']]), 0.8);
}

// ───────────────────── Башни ─────────────────────
// Каждая: body(g,lvl,br) на холсте 80×100 (якорь (40,74)); head(g,lvl,br) на 64×64 (центр вращения (32,32)).
export const TW_W = 80, TW_H = 100, TW_AX = 40, TW_AY = 74;
export const HEAD = 64;
export const TOWER_ART = {};

TOWER_ART.bolt = {
  lift: 26,
  body(g, lvl, br) {
    const wood = lvl < 3 && !br;
    keep(g, {
      cx: 40, cy: 74, rx: 15 + lvl * 0.4, ry: 8, h: 26 + lvl * 2, col: wood ? '#9a6a3c' : br === 'B' ? '#6d4a58' : br === 'A' ? '#8d99aa' : '#8a8f9a',
      tex: wood ? 'wood' : 'brick', crenel: lvl >= 3, bands: lvl >= 2 ? [0.3, 0.75] : [], plCol: '#6b6f7a',
    });
    const top = 74 - (26 + lvl * 2);
    if (lvl >= 3) torch(g, 25, top + 4);
    if (br === 'A') { gem(g, 40, top + 14, 4, '#6fd0ff'); flag(g, 54, top + 6, '#3b82c4', 10, 7, 1); }
    if (br === 'B') { skull(g, 40, top + 15, 3.4); flag(g, 54, top + 6, '#a3121f', 10, 7, 1); skull(g, 28, top + 8, 2.4); }
  },
  head(g, lvl, br) {
    const wood = '#8b5a2b', iron = br === 'A' ? '#cfe3f5' : br === 'B' ? '#3d2f35' : '#9aa0aa';
    ell(g, 30, 36, 20, 6); g.fillStyle = 'rgba(0,0,0,0.0)';
    // ложе
    rrect(g, 7, 28.5, 42, 7, 3); fillStroke(g, lin(g, 0, 28, 0, 36, [[0, '#b27a42'], [1, '#6e4520']]), 1.3);
    rrect(g, 7, 27, 12, 10, 3); fillStroke(g, '#6e4520', 1.2);
    // плечи лука
    const lim = (sgn) => {
      g.beginPath(); g.moveTo(36, 32); g.quadraticCurveTo(40, 32 + sgn * 10, 33, 32 + sgn * 22); g.lineTo(31, 32 + sgn * 21); g.quadraticCurveTo(37, 32 + sgn * 9, 33, 32);
      g.closePath(); fillStroke(g, lin(g, 30, 0, 40, 0, [[0, '#a8742f'], [1, '#5b3a18']]), 1.2);
    };
    lim(-1); lim(1);
    if (lvl >= 2) { g.fillStyle = iron; rrect(g, 33, 27, 8, 10, 2); fillStroke(g, iron, 1.1); }
    if (lvl >= 3) { // вторая пара плеч
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(26, 32 + s * 3); g.quadraticCurveTo(30, 32 + s * 12, 25, 32 + s * 19); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 1.6; g.strokeStyle = iron; g.stroke(); }
    }
    // тетива
    g.lineWidth = 1; g.strokeStyle = br === 'B' ? '#ff4a4a' : '#efe2c0';
    g.beginPath(); g.moveTo(32.5, 10.5); g.lineTo(14, 32); g.lineTo(32.5, 53.5); g.stroke();
    // болт
    g.lineWidth = 2.6; g.strokeStyle = OUT; g.beginPath(); g.moveTo(14, 32); g.lineTo(46, 32); g.stroke();
    g.lineWidth = 1.4; g.strokeStyle = '#d9c9a0'; g.beginPath(); g.moveTo(14, 32); g.lineTo(46, 32); g.stroke();
    poly(g, [[44, 28.5], [54, 32], [44, 35.5]]); fillStroke(g, br === 'A' ? '#ffd35a' : iron, 1);
    if (br === 'B') { circ(g, 20, 32, 2); fillStroke(g, '#c1121f', 0.8); }
  },
};

TOWER_ART.mortar = {
  lift: 14,
  body(g, lvl, br) {
    keep(g, { cx: 40, cy: 74, rx: 19, ry: 10, h: 14 + lvl * 1.2, col: br === 'B' ? '#6b4a3a' : br === 'A' ? '#6c7488' : '#7b7f88', crenel: false, bands: lvl >= 2 ? [0.5] : [], plCol: '#5f636c' });
    const top = 74 - (14 + lvl * 1.2);
    // горка снарядов
    const balls = [[22, 74], [27, 79], [19, 80]];
    for (let i = 0; i < Math.min(3, lvl); i++) { const [x, y] = balls[i]; circ(g, x + 22 * 0, y, 3.3); fillStroke(g, rad(g, x - 1, y - 1, 0.5, 4, [[0, '#777'], [1, '#222']]), 1); }
    if (br === 'B') { glow(g, 54, top + 2, 9, '#ff7a1c', 0.5); }
    if (br === 'A') { for (let i = 0; i < 3; i++) { circ(g, 56 - i * 3, 78 + i * 1.4, 2.4); fillStroke(g, '#d0a030', 0.8); } }
  },
  head(g, lvl, br) {
    const bronze = br === 'B' ? ['#d28a3a', '#6b3510'] : br === 'A' ? ['#9db3d0', '#3f5170'] : ['#c79a4e', '#6a4a1c'];
    const len = 26 + lvl * 1.5, th = 11 + lvl * 0.6;
    // ствол
    rrect(g, 32 - 6, 32 - th / 2, len, th, 4);
    fillStroke(g, lin(g, 0, 32 - th / 2, 0, 32 + th / 2, [[0, bronze[0]], [0.5, shade(bronze[0], -0.15)], [1, bronze[1]]]), 1.4);
    // бандажи
    for (const x of [42, 50]) { g.fillStyle = 'rgba(30,15,5,0.55)'; g.fillRect(x, 32 - th / 2 + 0.6, 2.2, th - 1.2); }
    // дульный срез
    ell(g, 32 - 6 + len, 32, 3.4, th / 2 + 0.6); fillStroke(g, '#1a0e08', 1.2);
    ell(g, 32 - 6 + len - 0.6, 32, 1.8, th / 2 - 1.2); fillStroke(g, '#050202', 0);
    // казённик
    circ(g, 26, 32, th / 2 + 1); fillStroke(g, lin(g, 20, 26, 32, 38, [[0, bronze[0]], [1, bronze[1]]]), 1.4);
    circ(g, 26, 32, 2); fillStroke(g, '#2a1a0c', 0.8);
    if (lvl >= 3) { rrect(g, 36, 32 - th / 2 - 2, 10, 2.5, 1); fillStroke(g, '#444', 0.8); }
  },
};

TOWER_ART.tesla = {
  lift: 40,
  body(g, lvl, br) {
    const col = br === 'A' ? '#5a4a7a' : br === 'B' ? '#2f5f78' : '#6a707c';
    keep(g, { cx: 40, cy: 74, rx: 14, ry: 8, h: 12, col, bands: [0.5], plCol: '#5a5f6a' });
    const topY = 62;
    // сердечник
    const hh = 22 + lvl * 3;
    rrect(g, 36, topY - hh, 8, hh + 2, 2); fillStroke(g, lin(g, 36, 0, 44, 0, [[0, '#cfd6e0'], [1, '#5a6270']]), 1.2);
    // медные кольца
    const rings = 2 + lvl;
    for (let i = 0; i < rings; i++) {
      const y = topY - 4 - i * ((hh - 6) / rings);
      const rw = 11 - i * (6 / rings);
      g.beginPath(); g.ellipse(40, y, rw, rw * 0.38, 0, 0, Math.PI * 2);
      g.lineWidth = 3.4; g.strokeStyle = OUT; g.stroke();
      g.lineWidth = 2; g.strokeStyle = lin(g, 40 - rw, 0, 40 + rw, 0, [[0, '#f0a050'], [0.5, '#c0662a'], [1, '#6a3010']]); g.stroke();
    }
    // электрод
    const ty = topY - hh - 4;
    circ(g, 40, ty, 6 + lvl * 0.4); fillStroke(g, rad(g, 38, ty - 2, 1, 9, [[0, '#d8f4ff'], [0.5, br === 'A' ? '#c070ff' : '#4cc3ff'], [1, '#17508a']]), 1.3);
    if (lvl >= 3) { for (const s of [-1, 1]) { tube(g, 40 + s * 10, topY - 6, 40 + s * 15, topY - 18, 1.8, '#9aa3b0', 0.8); circ(g, 40 + s * 15, topY - 20, 2.4); fillStroke(g, '#7fd8ff', 0.8); } }
    if (br === 'B') { for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; tube(g, 40 + Math.cos(a) * 10, 70, 40 + Math.cos(a) * 13, 58, 1.6, '#9aa3b0', 0.8); } }
  },
  head: null,
  // орбитальная точка для динамического свечения
  orb(lvl) { return { y: 62 - (22 + lvl * 3) - 4, r: 6 + lvl * 0.4 }; },
};

TOWER_ART.frost = {
  lift: 36,
  body(g, lvl, br) {
    const ice = br === 'A' ? ['#bfe9ff', '#3a6ea8'] : br === 'B' ? ['#d9f3ff', '#7a5ac8'] : ['#a8defa', '#2f78b8'];
    keep(g, { cx: 40, cy: 74, rx: 17, ry: 9, h: 8, col: '#7a8aa0', plCol: '#5e6a80', top: '#cfe8f6' });
    const baseY = 66;
    const spire = (x, w, h, sk = 0) => {
      poly(g, [[x - w, baseY], [x - w * 0.8, baseY - h * 0.7], [x + sk, baseY - h], [x + w * 0.8, baseY - h * 0.65], [x + w, baseY]]);
      fillStroke(g, lin(g, x - w, 0, x + w, 0, [[0, ice[0]], [0.55, shade(ice[0], -0.1)], [1, ice[1]]]), 1.3);
      g.beginPath(); g.moveTo(x - w * 0.15, baseY - 2); g.lineTo(x + sk * 0.8, baseY - h + 3); g.lineWidth = 0.9; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.stroke();
      g.beginPath(); g.moveTo(x + w * 0.3, baseY - 2); g.lineTo(x + w * 0.45 + sk * 0.5, baseY - h * 0.6); g.lineWidth = 0.8; g.strokeStyle = rgba('#12306a', 0.5); g.stroke();
    };
    if (lvl >= 2) { spire(27, 5, 18 + lvl * 2, -2); spire(53, 5, 20 + lvl * 2, 2); }
    if (lvl >= 3 || br) { spire(33, 4, 26 + lvl, -1); spire(48, 4, 24 + lvl, 1); }
    spire(40, 8 + lvl * 0.4, 32 + lvl * 3, 0);
    if (br === 'B') { for (const [x, y] of [[22, 70], [58, 71]]) { circ(g, x, y, 3); fillStroke(g, '#9ce0ff', 0.9); } }
    if (br === 'A') glow(g, 40, 60, 20, '#8fe0ff', 0.25);
  },
  head: null,
  orb(lvl) { return { y: 66 - (32 + lvl * 3) + 4, r: 5 }; },
};

TOWER_ART.toxic = {
  lift: 24,
  body(g, lvl, br) {
    const liq = br === 'B' ? '#c8e63a' : '#58d63a';
    keep(g, { cx: 40, cy: 74, rx: 17, ry: 9, h: 8, col: '#6a6f78', plCol: '#565a63' });
    const top = 66;
    // котёл
    g.beginPath(); g.moveTo(22, top - 14); g.quadraticCurveTo(20, top + 4, 40, top + 6); g.quadraticCurveTo(60, top + 4, 58, top - 14); g.closePath();
    fillStroke(g, lin(g, 22, 0, 58, 0, [[0, '#5b6068'], [0.4, '#2e3138'], [1, '#14161a']]), 1.5);
    g.beginPath(); g.ellipse(40, top - 14, 18, 7, 0, 0, Math.PI * 2); fillStroke(g, '#2a2d34', 1.5);
    ell(g, 40, top - 14, 15, 5.2); fillStroke(g, rad(g, 40, top - 15, 1, 16, [[0, shade(liq, 0.45)], [0.6, liq], [1, shade(liq, -0.35)]]), 1);
    // ободок блеска
    g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(40, top - 14, 18, 7, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    // заклёпки
    g.fillStyle = '#8a9099'; for (let i = 0; i < 5; i++) { circ(g, 26 + i * 7, top - 3 + Math.sin((i / 4) * Math.PI) * 2, 1.1); g.fill(); }
    // ножки/огонь
    if (lvl >= 2) { skull(g, 22, top + 8, 3); }
    if (lvl >= 3 || br) { tube(g, 56, top - 8, 66, top - 28, 2.4, '#8a9099', 0.9); circ(g, 66, top - 31, 5); fillStroke(g, lin(g, 61, 0, 71, 0, [[0, 'rgba(200,255,200,0.85)'], [1, 'rgba(60,160,60,0.9)']]), 1.1); g.fillStyle = liq; circ(g, 66, top - 30, 3); g.fill(); }
    if (br === 'A') { for (let i = 0; i < 3; i++) skull(g, 28 + i * 12, top - 24 - (i % 2) * 3, 2.6); }
    if (br === 'B') { glow(g, 40, top - 14, 24, '#d6ff3a', 0.3); }
  },
  head: null,
};

TOWER_ART.saw = {
  lift: 22,
  body(g, lvl, br) {
    keep(g, { cx: 40, cy: 74, rx: 16, ry: 9, h: 16 + lvl, col: br === 'A' ? '#5a4f6a' : '#555a63', bands: [0.35, 0.8], plCol: '#4a4e57' });
    const top = 74 - (16 + lvl);
    // стойка и рычаг
    rrect(g, 36, top - 9, 8, 12, 2); fillStroke(g, lin(g, 36, 0, 44, 0, [[0, '#8f959f'], [1, '#3a3e46']]), 1.2);
    // шестерня
    const cog = (x, y, r, n) => {
      g.beginPath();
      for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r * 0.82 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.9); }
      g.closePath(); fillStroke(g, lin(g, x - r, y - r, x + r, y + r, [[0, '#b0b6c0'], [1, '#4a4e57']]), 1.1);
      circ(g, x, y, r * 0.3); fillStroke(g, '#23262c', 0.8);
    };
    cog(25, top + 6, 6, 8); if (lvl >= 3) cog(56, top + 8, 5, 7);
    // ступица (сюда рендерер рисует вращающийся диск)
    circ(g, 40, top - 12, 3.4); fillStroke(g, '#23262c', 1.1);
    // кровавые подтёки
    g.fillStyle = 'rgba(150,10,20,0.55)'; for (const [x, y, w] of [[30, top + 4, 3], [44, top + 8, 2.4], [52, top + 2, 2]]) { rrect(g, x, y, w, 6 + w * 2, 1); g.fill(); }
    if (br === 'B') for (let i = 0; i < 3; i++) { poly(g, [[22 + i * 18, 78], [26 + i * 18, 78], [24 + i * 18, 70]]); fillStroke(g, '#c9ced6', 0.8); }
  },
  head: null,
  hub(lvl) { return { y: 74 - (16 + lvl) - 12 }; },
};


TOWER_ART.banner = {
  lift: 30,
  body(g, lvl, br) {
    // подставка с кольями
    shadowEll(g, 43, 78, 22, 9, 0.4);
    g.beginPath(); g.ellipse(40, 74, 15, 8, 0, 0, Math.PI * 2); fillStroke(g, '#5f636c', 1.3);
    ell(g, 40, 72, 11, 5.5); fillStroke(g, '#3a2418', 1.1);
    for (const [x, y, a] of [[27, 76, -0.4], [53, 76, 0.4], [32, 80, -0.15], [48, 80, 0.15]]) {
      tube(g, x, y, x + Math.sin(a) * 11, y - 12, 1.8, '#8a6a42', 0.8);
    }
    // древко
    const h = 46 + lvl * 3;
    tube(g, 40, 74, 40, 74 - h, 3, '#7b5530', 1);
    // череп на навершии
    if (br === 'B') { skull(g, 40, 74 - h - 4, 4.4); } else { poly(g, [[40, 74 - h - 11], [43.5, 74 - h - 3], [36.5, 74 - h - 3]]); fillStroke(g, br === 'A' ? '#ffd35a' : '#cfd4dc', 1); }
    for (const k of [0, 1]) { circ(g, 40, 74 - h * (0.25 + k * 0.1), 2.2); fillStroke(g, '#c9a240', 0.8); }
    // перекладина
    tube(g, 28, 74 - h + 6, 52, 74 - h + 6, 2, '#7b5530', 0.8);
  },
  head: null,
  pole(lvl) { return { top: 74 - (46 + lvl * 3) + 6 }; },
};


TOWER_ART.flame = {
  lift: 16,
  body(g, lvl, br) {
    const col = br === 'A' ? '#6a3a3a' : br === 'B' ? '#3a5a52' : '#6e6a66';
    keep(g, { cx: 40, cy: 74, rx: 17, ry: 9, h: 12 + lvl, col, bands: [0.5], plCol: '#55504c' });
    const top = 74 - (12 + lvl);
    // топливный бак сбоку
    rrect(g, 52, top - 4, 14, 22, 5); fillStroke(g, lin(g, 52, 0, 66, 0, [[0, '#d8402a'], [0.5, '#a02418'], [1, '#4a0e0a']]), 1.4);
    for (const dy of [2, 10]) { g.fillStyle = '#2a2d33'; g.fillRect(52, top + dy, 14, 2.4); }
    ell(g, 59, top - 4, 7, 2.6); fillStroke(g, '#2a2d33', 1);
    // труба к стволу
    g.beginPath(); g.moveTo(52, top + 4); g.quadraticCurveTo(46, top - 6, 40, top - 6); g.lineWidth = 5; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#8a7a5a'; g.stroke();
    if (lvl >= 2) { skull(g, 24, top + 10, 3); }
    if (lvl >= 3 || br) { torch(g, 25, top + 4); }
    if (br === 'A') { poly(g, [[22, top + 2], [18, top - 8], [27, top - 1]]); fillStroke(g, '#c9a24a', 0.9); }
    if (br === 'B') { glow(g, 59, top + 6, 16, '#5affc8', 0.35); }
  },
  head(g, lvl, br) {
    const metal = br === 'A' ? ['#d8b060', '#6a3a10'] : br === 'B' ? ['#6adcc4', '#1f5a52'] : ['#c79a4e', '#6a4a1c'];
    // шланг от бака
    g.beginPath(); g.moveTo(8, 34); g.quadraticCurveTo(14, 44, 22, 36); g.lineWidth = 5; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#3a3a40'; g.stroke();
    // ствол
    rrect(g, 14, 27.5, 26, 9, 3); fillStroke(g, lin(g, 0, 27, 0, 37, [[0, metal[0]], [1, metal[1]]]), 1.4);
    for (const x of [20, 30]) { g.fillStyle = 'rgba(30,15,5,0.55)'; g.fillRect(x, 28, 2.2, 8); }
    // драконья пасть
    g.beginPath(); g.moveTo(38, 26); g.lineTo(56, 20); g.quadraticCurveTo(60, 32, 56, 44); g.lineTo(38, 38); g.closePath();
    fillStroke(g, lin(g, 38, 0, 58, 0, [[0, metal[0]], [1, shade(metal[1], -0.1)]]), 1.5);
    g.beginPath(); g.moveTo(40, 29.5); g.lineTo(55, 26); g.quadraticCurveTo(57, 32, 55, 38); g.lineTo(40, 34.5); g.closePath(); fillStroke(g, '#1a0804', 1);
    glow(g, 52, 32, 9, br === 'B' ? '#5affc8' : '#ff8a1c', 0.9);
    for (let i = 0; i < 3; i++) { poly(g, [[43 + i * 4.5, 29.6 - i * 0.8], [45 + i * 4.5, 33], [47 + i * 4.5, 29.4 - i * 0.8]]); fillStroke(g, '#f4ecd4', 0.5); poly(g, [[43 + i * 4.5, 34.6 + i * 0.8], [45 + i * 4.5, 31.5], [47 + i * 4.5, 34.8 + i * 0.8]]); fillStroke(g, '#f4ecd4', 0.5); }
    for (const s of [-1, 1]) { poly(g, [[36, 32 + s * 5], [44, 32 + s * 11], [50, 32 + s * 9], [46, 32 + s * 6]]); fillStroke(g, metal[1], 0.8); }
    circ(g, 22, 32, 3); fillStroke(g, '#2a2d33', 0.9);
  },
};

TOWER_ART.voidwell = {
  lift: 18,
  body(g, lvl, br) {
    const col = br === 'A' ? '#5a2a5a' : br === 'B' ? '#2a4a70' : '#4a3a6a';
    const acc = br === 'A' ? '#ff4a9a' : br === 'B' ? '#4adcff' : '#b070ff';
    shadowEll(g, 43, 80, 26, 10, 0.5);
    keep(g, { cx: 40, cy: 74, rx: 18, ry: 10, h: 10 + lvl * 0.8, col, bands: [], plCol: '#33283f', top: '#07030c' });
    const topY = 74 - (10 + lvl * 0.8);
    // внутренняя бездна
    ell(g, 40, topY, 13.5, 7); fillStroke(g, rad(g, 40, topY, 0.5, 14, [[0, '#000'], [0.6, '#1a0a2a'], [1, shade(acc, -0.55)]]), 1.2);
    // руны на кольце
    g.strokeStyle = acc; g.lineWidth = 1.1; g.globalAlpha = 0.85; for (let i = 0; i < 7; i++) { const a = Math.PI * 0.12 + (i / 6) * Math.PI * 0.76; const x = 40 + Math.cos(a) * 17, y = 74 - 4 + Math.sin(a) * 9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1, y + 3); g.stroke(); } g.globalAlpha = 1;
    // кристаллы по краям
    const cr = (x, y, h) => { poly(g, [[x - 3, y], [x - 2, y - h * 0.7], [x, y - h], [x + 2.4, y - h * 0.65], [x + 3, y]]); fillStroke(g, lin(g, x - 3, 0, x + 3, 0, [[0, shade(acc, 0.5)], [0.5, acc], [1, shade(acc, -0.5)]]), 1.1); };
    cr(18, 70, 10 + lvl * 1.5); cr(62, 70, 10 + lvl * 1.5);
    if (lvl >= 2) { cr(24, 80, 8); cr(56, 80, 8); }
    if (lvl >= 3) { cr(14, 62, 12); cr(66, 62, 12); }
    if (br) { for (const s of [-1, 1]) { poly(g, [[40 + s * 22, 78], [40 + s * 25, 78], [40 + s * 23.5, 64]]); fillStroke(g, '#c9ced6', 0.8); } }
  },
  head: null,
  well(lvl) { return { y: 74 - (10 + lvl * 0.8), rx: 13.5, ry: 7 }; },
};

TOWER_ART.harpoon = {
  lift: 22,
  body(g, lvl, br) {
    const wood = lvl < 3 && !br;
    keep(g, { cx: 40, cy: 74, rx: 15, ry: 8, h: 18 + lvl, col: wood ? '#8e6034' : br === 'A' ? '#7a8496' : br === 'B' ? '#7a4a44' : '#8a8f9a', tex: wood ? 'wood' : 'brick', crenel: lvl >= 3, bands: [0.3, 0.7], plCol: '#5f636c' });
    const top = 74 - (18 + lvl);
    // лебёдка с канатом
    rrect(g, 20, top + 6, 8, 12, 2); fillStroke(g, lin(g, 20, 0, 28, 0, [[0, '#a8743a'], [1, '#5b3a18']]), 1.1);
    g.strokeStyle = '#d8c89a'; g.lineWidth = 1.2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(20, top + 8 + i * 2.6); g.lineTo(28, top + 8 + i * 2.6); g.stroke(); }
    // запасные гарпуны
    for (let i = 0; i < Math.min(3, lvl); i++) { tube(g, 54 + i * 3.6, top + 20, 56 + i * 3.6, top + 2, 1.8, '#8b6a3a', 0.7); poly(g, [[54 + i * 3.6 - 2, top + 3], [55 + i * 3.6, top - 3], [57 + i * 3.6, top + 3]]); fillStroke(g, '#cfd5de', 0.7); }
    if (br === 'A') { for (let i = 0; i < 4; i++) { circ(g, 40 + i * 3.4 - 5, top + 15 + (i % 2), 1.8); fillStroke(g, '#9aa3b0', 0.7); } }
    if (br === 'B') { rrect(g, 46, top + 12, 7, 9, 2); fillStroke(g, '#a02418', 1); g.fillStyle = '#ffd24a'; g.font = 'bold 6px sans-serif'; g.textAlign = 'center'; g.fillText('!', 49.5, top + 19); }
  },
  head(g, lvl, br) {
    const iron = br === 'A' ? '#cfe3f5' : br === 'B' ? '#c9a08a' : '#aab0ba';
    // ложе
    rrect(g, 4, 29, 50, 6, 3); fillStroke(g, lin(g, 0, 29, 0, 35, [[0, '#b27a42'], [1, '#6e4520']]), 1.3);
    // мощные плечи
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(26, 32 + s * 2); g.quadraticCurveTo(34, 32 + s * 14, 22, 32 + s * 27); g.lineTo(19, 32 + s * 26); g.quadraticCurveTo(28, 32 + s * 13, 21, 32 + s * 2); g.closePath(); fillStroke(g, lin(g, 18, 0, 34, 0, [[0, '#a8742f'], [1, '#4b3015']]), 1.3);
      rrect(g, 24 - 1, 32 + s * 8 - 2.5, 6, 5, 1.5); fillStroke(g, iron, 0.8);
    }
    g.strokeStyle = '#efe2c0'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(21, 5.5); g.lineTo(7, 32); g.lineTo(21, 58.5); g.stroke();
    // железная рама и бухта каната (отличает от арбалета)
    rrect(g, 14, 22, 18, 20, 3); fillStroke(g, lin(g, 14, 22, 32, 42, [[0, '#7d8490'], [1, '#2c2f36']]), 1.4);
    for (const [x, y] of [[17, 25], [29, 25], [17, 39], [29, 39]]) { circ(g, x, y, 1.1); fillStroke(g, '#c9ced6', 0.5); }
    circ(g, 23, 32, 5.4); fillStroke(g, '#2a2420', 1); g.strokeStyle = '#d8c89a'; g.lineWidth = 1.3; for (const r of [4, 2.6, 1.2]) { g.beginPath(); g.arc(23, 32, r, 0, 6.3); g.stroke(); }
    // гарпун
    g.lineWidth = 3.6; g.strokeStyle = OUT; g.beginPath(); g.moveTo(7, 32); g.lineTo(52, 32); g.stroke(); g.lineWidth = 2; g.strokeStyle = '#d9c9a0'; g.beginPath(); g.moveTo(7, 32); g.lineTo(52, 32); g.stroke();
    if (br === 'A') { g.setLineDash([2.6, 1.8]); g.strokeStyle = '#8f97a6'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(8, 36); g.lineTo(46, 36); g.stroke(); g.setLineDash([]); }
    poly(g, [[50, 26.5], [62, 32], [50, 37.5], [53, 32]]); fillStroke(g, lin(g, 50, 26, 62, 38, [[0, '#fff'], [1, iron]]), 1.1);
    poly(g, [[48, 28], [44, 24], [49, 29.5]]); fillStroke(g, iron, 0.7); poly(g, [[48, 36], [44, 40], [49, 34.5]]); fillStroke(g, iron, 0.7);
    if (br === 'B') { circ(g, 47, 32, 3.2); fillStroke(g, '#c1121f', 0.8); glow(g, 47, 32, 7, '#ff7a1c', 0.7); }
  },
};

// ───────────────────── Экономика ─────────────────────
export const ECON_ART = {};
ECON_ART.mine = {
  body(g, lvl) {
    shadowEll(g, 42, 78, 30, 11, 0.4);
    // холм
    g.beginPath(); g.moveTo(10, 78); g.quadraticCurveTo(12, 46, 40, 44); g.quadraticCurveTo(68, 46, 70, 78); g.quadraticCurveTo(40, 88, 10, 78); g.closePath();
    fillStroke(g, lin(g, 10, 44, 70, 80, [[0, '#9b8b78'], [0.5, '#6e6254'], [1, '#3b332c']]), 1.5);
    g.save(); g.clip();
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 12; i++) { ell(g, 14 + (i * 37) % 52, 52 + (i * 23) % 26, 4, 2.2); g.fill(); }
    g.restore();
    // вход шахты
    g.beginPath(); g.moveTo(26, 78); g.lineTo(26, 62); g.lineTo(32, 55); g.lineTo(48, 55); g.lineTo(54, 62); g.lineTo(54, 78); g.closePath(); fillStroke(g, '#120a08', 1.4);
    // крепи
    tube(g, 25, 79, 25, 59, 3.4, '#8b5a2b', 1); tube(g, 55, 79, 55, 59, 3.4, '#8b5a2b', 1); tube(g, 23, 58, 57, 58, 3.4, '#a06a30', 1);
    // золото внутри
    glow(g, 40, 72, 16, '#ffd24a', 0.55);
    // вагонетка
    rrect(g, 30, 70, 20, 9, 2); fillStroke(g, lin(g, 0, 70, 0, 79, [[0, '#6b6f78'], [1, '#2c2f36']]), 1.2);
    const nug = Math.min(6, 2 + lvl * 1.2);
    for (let i = 0; i < nug; i++) { const x = 32 + i * 3.2 + (i % 2), y = 69.5 - (i % 3) * 1.6; circ(g, x, y, 3); fillStroke(g, rad(g, x - 1, y - 1, 0.3, 3.4, [[0, '#fff2a8'], [0.6, '#f4b92a'], [1, '#a8700e']]), 0.9); }
    for (const x of [34, 46]) { circ(g, x, 80, 2.2); fillStroke(g, '#222', 0.9); }
    // кирка
    tube(g, 62, 82, 70, 66, 1.8, '#8b5a2b', 0.8); g.beginPath(); g.moveTo(63, 66); g.quadraticCurveTo(70, 60, 76, 67); g.lineWidth = 2.6; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 1.4; g.strokeStyle = '#c3c8d0'; g.stroke();
    if (lvl >= 2) { torch(g, 22, 62); }
    if (lvl >= 3) { torch(g, 58, 62); }
    if (lvl >= 4) { // кучи золота снаружи
      for (let i = 0; i < 6; i++) { const x = 12 + i * 3.5, y = 82 - (i % 2) * 3; circ(g, x, y, 3); fillStroke(g, rad(g, x - 1, y - 1, 0.3, 3.4, [[0, '#fff2a8'], [0.6, '#f4b92a'], [1, '#a8700e']]), 0.8); }
    }
    if (lvl >= 5) { gem(g, 40, 49, 5, '#ff4a8a'); glow(g, 40, 49, 14, '#ff4a8a', 0.4); }
  },
};
ECON_ART.bank = {
  body(g, lvl) {
    shadowEll(g, 43, 80, 30, 10, 0.4);
    g.beginPath(); g.ellipse(40, 76, 28, 11, 0, 0, Math.PI * 2); fillStroke(g, '#6d717a', 1.3);
    // здание
    const W = 20, top = 44;
    rrect(g, 40 - W, top + 6, W * 2, 32, 2); fillStroke(g, lin(g, 40 - W, 0, 40 + W, 0, [[0, '#e0d6bf'], [0.55, '#bfb398'], [1, '#6e664f']]), 1.4);
    // фронтон
    poly(g, [[40 - W - 3, top + 7], [40, top - 6], [40 + W + 3, top + 7]]); fillStroke(g, lin(g, 0, top - 6, 0, top + 7, [[0, lvl >= 4 ? '#ffd35a' : '#d8cdb4'], [1, lvl >= 4 ? '#b8892a' : '#9d9276']]), 1.4);
    // колонны
    for (const x of [24, 34, 46, 56]) { rrect(g, x - 1.8, top + 9, 3.6, 26, 1); fillStroke(g, lin(g, x - 2, 0, x + 2, 0, [[0, '#f2ead6'], [1, '#948a70']]), 0.9); }
    // дверь хранилища
    circ(g, 40, 62, 9); fillStroke(g, rad(g, 38, 60, 1, 11, [[0, '#ffe58a'], [0.6, '#d49a22'], [1, '#7a520c']]), 1.5);
    circ(g, 40, 62, 5.4); fillStroke(g, 'rgba(0,0,0,0.25)', 0.9);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; g.beginPath(); g.moveTo(40, 62); g.lineTo(40 + Math.cos(a) * 5, 62 + Math.sin(a) * 5); g.lineWidth = 1.2; g.strokeStyle = '#7a520c'; g.stroke(); }
    // монета на фронтоне
    circ(g, 40, top + 1, 4.2); fillStroke(g, rad(g, 39, top, 0.5, 5, [[0, '#fff2a8'], [0.7, '#f4b92a'], [1, '#a8700e']]), 1);
    g.fillStyle = '#8a5a0a'; g.font = 'bold 6px sans-serif'; g.textAlign = 'center'; g.fillText('$', 40, top + 3.3);
    // мешки золота
    for (let i = 0; i < Math.min(lvl, 4); i++) {
      const x = 14 + (i % 2) * 52 + (i > 1 ? 4 : 0), y = 80 - (i > 1 ? 3 : 0);
      g.beginPath(); g.moveTo(x - 4, y); g.quadraticCurveTo(x - 6, y - 8, x - 1.5, y - 10); g.lineTo(x + 1.5, y - 10); g.quadraticCurveTo(x + 6, y - 8, x + 4, y); g.closePath(); fillStroke(g, '#a8844a', 1);
      g.fillStyle = '#7a5a28'; g.fillRect(x - 2.2, y - 11, 4.4, 2);
    }
    if (lvl >= 5) glow(g, 40, 60, 30, '#ffd35a', 0.25);
  },
};
ECON_ART.altar = {
  body(g, lvl) {
    shadowEll(g, 43, 80, 28, 10, 0.45);
    g.beginPath(); g.ellipse(40, 76, 26, 11, 0, 0, Math.PI * 2); fillStroke(g, '#34303a', 1.4);
    // ступени
    ell(g, 40, 72, 21, 8.5); fillStroke(g, lin(g, 0, 64, 0, 80, [[0, '#6a6474'], [1, '#2c2833']]), 1.3);
    // плита
    rrect(g, 25, 54, 30, 16, 2); fillStroke(g, lin(g, 25, 0, 55, 0, [[0, '#5a5466'], [0.6, '#3a3544'], [1, '#1e1a26']]), 1.4);
    ell(g, 40, 54, 15, 6); fillStroke(g, rad(g, 40, 54, 1, 16, [[0, '#6e687c'], [1, '#2e2a38']]), 1.3);
    // чаша с кровью
    ell(g, 40, 52, 9, 3.6); fillStroke(g, '#2a2430', 1.1);
    ell(g, 40, 52, 7.4, 2.7); fillStroke(g, rad(g, 40, 52, 0.5, 8, [[0, '#ff4a5a'], [0.6, '#b0101c'], [1, '#5a0810']]), 0.8);
    // руны на плите
    g.strokeStyle = '#ff3a4a'; g.lineWidth = 1.1; g.globalAlpha = 0.85;
    for (let i = 0; i < 3; i++) { const x = 31 + i * 9; g.beginPath(); g.moveTo(x, 59); g.lineTo(x + 2, 64); g.lineTo(x - 1, 66); g.stroke(); }
    g.globalAlpha = 1;
    // шипы по краям
    for (const [x, y, hh] of [[16, 76, 12], [64, 76, 12], [22, 83, 9], [58, 83, 9]]) { poly(g, [[x - 2.6, y], [x + 2.6, y], [x, y - hh]]); fillStroke(g, lin(g, x - 3, 0, x + 3, 0, [[0, '#8a8494'], [1, '#2c2833']]), 1); }
    if (lvl >= 2) { skull(g, 16, 62, 3); skull(g, 64, 62, 3); }
    if (lvl >= 3) { for (const s of [-1, 1]) { tube(g, 40 + s * 22, 74, 40 + s * 22, 52, 3, '#3c3646', 1); } }
    if (lvl >= 4) { gem(g, 40, 42, 5, '#ff2a4a'); }
    if (lvl >= 5) { glow(g, 40, 50, 28, '#ff1a3a', 0.35); for (const s of [-1, 1]) gem(g, 40 + s * 22, 47, 3.6, '#ff2a4a'); }
  },
};

// ───── акценты выбранных улучшений: у каждого пути свой вид ─────
const PICK_COL = ['', '#ff5a4a', '#ffd24a', '#6aff7a'];
function accent(g, kind, tier, x, y) {
  const col = PICK_COL[kind], k = tier === 0 ? 0.85 : 1.1;
  glow(g, x, y - 6 * k, 13 * k, col, 0.55);
  // постамент
  ell(g, x, y + 2, 7 * k, 3 * k); fillStroke(g, '#3a3e48', 1.1);
  if (kind === 1) { // мощь: красные шипы-кристаллы
    for (const [dx, h, w] of [[-3.4, 8, 2.4], [3.2, 9, 2.4], [0, 13, 3.2]]) { poly(g, [[x + (dx - w) * k, y], [x + dx * k, y - h * k], [x + (dx + w) * k, y]]); fillStroke(g, lin(g, x - 6 * k, 0, x + 6 * k, 0, [[0, shade(col, 0.5)], [0.5, col], [1, shade(col, -0.5)]]), 1); }
  } else if (kind === 2) { // скорость: жёлтая молния в шестерне
    g.beginPath(); for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, r = (i % 2 ? 4.6 : 6) * k; g.lineTo(x + Math.cos(a) * r, y - 6 * k + Math.sin(a) * r * 0.9); } g.closePath(); fillStroke(g, '#6a6f78', 1);
    poly(g, [[x + 1.6 * k, y - 13 * k], [x - 3 * k, y - 5.5 * k], [x - 0.2 * k, y - 5.5 * k], [x - 1.8 * k, y + 0.4 * k], [x + 3.2 * k, y - 7 * k], [x + 0.4 * k, y - 7 * k]]); fillStroke(g, lin(g, 0, y - 13 * k, 0, y, [[0, '#fff7b0'], [1, col]]), 1);
  } else if (kind === 3) { // особое: зелёный гранёный кристалл с кольцом
    poly(g, [[x, y - 14 * k], [x + 4.4 * k, y - 8 * k], [x + 3.4 * k, y - 1 * k], [x - 3.4 * k, y - 1 * k], [x - 4.4 * k, y - 8 * k]]); fillStroke(g, lin(g, x - 5 * k, 0, x + 5 * k, 0, [[0, shade(col, 0.55)], [0.5, col], [1, shade(col, -0.55)]]), 1.1);
    g.beginPath(); g.ellipse(x, y - 6 * k, 7.6 * k, 2.6 * k, 0, 0, Math.PI * 2); g.lineWidth = 1.2; g.strokeStyle = col; g.stroke();
  }
}
function drawAccents(g, picks) {
  if (!picks) return;
  if (picks[0]) accent(g, picks[0], 0, 15, 77);
  if (picks[1]) accent(g, picks[1], 1, 65, 77);
}
export const pickAccentPos = (tier) => (tier === 0 ? { x: 15, y: 71 } : { x: 65, y: 69 });
export const PICK_COLORS = PICK_COL;

// ───── растровые башни ─────
const TS = 0.315;          // пикселей картинки (192×240) → логических единиц
const TW_BASE_Y = 80;      // низ картинки; постамент стоит чуть выше, на якоре (40, 74)
const LEVEL_MULT = [0.96, 1.0, 1.03, 1.06, 1.08];
function towerIdx(type, lvl, br) {
  const m = SPR.towers[type]; if (!m) return -1; const k = m.n;
  if (k === 1) return 0;
  if (type === 'mine') return Math.min(lvl, k) - 1;
  if (m.bylevel) return Math.min(lvl, k) - 1;                               // 5 картинок = 5 уровней (мортира, огнемёт, гарпун)
  if (k === 5) return lvl <= 3 ? lvl - 1 : (br === 'A' ? 4 : 3);
  const tab = k >= 4 ? [0, 1, 2, 3, 3] : k === 3 ? (TOWERS[type] && (TOWERS[type].premium) ? [0, 1, 2, 2, 2] : (TOWERS[type].stages3) ? [0, 1, 1, 2, 2] : [0, 1, 2, 2, 2]) : [0, 0, 1, 1, 1];      // у премиума три внешних вида: 1 ур., 2–3 ур., 4–5 ур.
  return tab[Math.min(lvl, 5) - 1];
}
// Здание не больше клетки по ширине и клетки с небольшим запасом по высоте: соседние здания не закрывают друг друга.
// Масштаб один на весь ряд уровней (рост по уровням остаётся), считается по самой большой картинке ряда.
// предельные размеры (ширина, высота) здания на карте; узкие и низкие здания разрешено делать крупнее
const CAPS = { mortar: [56, 78], mine: [50, 58], bolt: [56, 72], frost: [56, 72], tesla: [56, 72], saw: [64, 76], banner: [56, 72], flame: [56, 78], voidwell: [56, 70], toxic: [66, 78], bank: [56, 70], altar: [56, 66], harpoon: [56, 78],
  gold_bolt: [56, 78], storm_tesla: [56, 72], hell_flame: [56, 78], thunder: [56, 72], winter: [56, 72], bloodstorm: [64, 72], plague: [66, 78], miner: [56, 64], bell: [56, 78], pendulum: [60, 76], magnet: [56, 72], grinder: [66, 78], giant: [68, 74] }, CAP_DEF = [56, 64], GK = {};
// Размер спрайта считается по каждой картинке отдельно: ранние уровни (маленькие хижины, низкие постаменты) растягиваются до доли предельной высоты (HF), чтобы не казаться крошечными; ширина ограничена CAPS.
const HF = [0.86, 0.93, 1, 1, 1], TS_MAX = 0.46, SK = {};
// горизонтальная растяжка спрайта: дом алхимика, пилорама и гриндер нарисованы узкими и высокими — делаем их «потолще», чтобы стоять в одном ряду с башнями
const XS = { toxic: 1.4, plague: 1.1, saw: 1.12, grinder: 1.3 }, xsOf = (t) => XS[t] || 1;
function spriteK(type, lvl, br) {
  const i = towerIdx(type, lvl, br), key = type + ':' + i + ':' + Math.min(lvl, 5); if (SK[key]) return SK[key];
  const [l, t, r, b] = SPR.towers[type].boxes[i], [cw, ch] = CAPS[type] || CAP_DEF, hf = HF[Math.min(lvl, 5) - 1];
  return (SK[key] = Math.min(TS_MAX, cw / ((r - l) * xsOf(type)), (ch * hf) / (b - t)));
}
// точка картинки башни (пикселы ячейки 192×240) в координатах карты относительно якоря здания (x - TW_AX, y - TW_AY добавляет вызывающий)
// рамка корпуса башни в координатах спрайта 80×100 (для вырезки значков)
export function towerBox(type, lvl, br) { const i = towerIdx(type, lvl, br), [l, t, r, b] = SPR.towers[type].boxes[i], k = spriteK(type, lvl, br), xs = xsOf(type), x0 = 40 - 96 * k * xs, y0 = TW_BASE_Y - 240 * k; return [x0 + l * k * xs, y0 + t * k, x0 + r * k * xs, y0 + b * k]; }
export function towerPt(type, lvl, br, px, py) { const k = spriteK(type, lvl, br), xs = xsOf(type); return { x: 40 - 96 * k * xs + px * k * xs - TW_AX, y: TW_BASE_Y - 240 * k + py * k - TW_AY }; }
export function towerDoors(type, lvl, br) { const m = SPR.ok && SPR.towers[type]; return (m && m.doors && m.doors[towerIdx(type, lvl, br)]) || []; }
export function towerGeo(type, lvl, br) {
  const i = towerIdx(type, lvl, br), [l, t, r, b] = SPR.towers[type].boxes[i], k = spriteK(type, lvl, br);
  const xs = xsOf(type), x0 = 40 - 96 * k * xs, y0 = TW_BASE_Y - 240 * k;
  return { top: y0 + t * k, bottom: y0 + b * k, left: x0 + l * k * xs, right: x0 + r * k * xs };
}
const BR_TINT = { A: '#4aa8ff', B: '#ff3a3a' };
// светлая кайма и мягкий свет под основанием: здание отделяется от земли и читается на любом фоне
const RIM = { frost: '#d4f0ff', tesla: '#c4e4ff', toxic: '#e0ffb8', flame: '#ffd8a8', voidwell: '#e6d0ff', banner: '#ffd0d0', saw: '#ffe6c0', mine: '#fff0b8' };
function spriteTower(type, lvl, br, fire = false) {
  const i = towerIdx(type, lvl, br), im = img(`towers/${type}_${fire ? 'f' : ''}${i}.webp`); if (!im) return null;
  const k = spriteK(type, lvl, br), w = 192 * k * xsOf(type), h = 240 * k;
  const rim = RIM[type] || '#fff4d0';
  const body = mk(TW_W, TW_H, (g2) => {
    g2.imageSmoothingQuality = 'high'; g2.drawImage(im, 40 - w / 2, TW_BASE_Y - h, w, h);
  });
  const sil = mk(TW_W, TW_H, (g2) => { g2.drawImage(body, 0, 0, TW_W, TW_H); g2.globalCompositeOperation = 'source-in'; g2.fillStyle = rim; g2.fillRect(0, 0, TW_W, TW_H); });
  const dark = mk(TW_W, TW_H, (g2) => { g2.drawImage(body, 0, 0, TW_W, TW_H); g2.globalCompositeOperation = 'source-in'; g2.fillStyle = OUT; g2.fillRect(0, 0, TW_W, TW_H); });
  return mk(TW_W, TW_H, (g) => {
    const gl = g.createRadialGradient(40, 75, 2, 40, 75, 30);                       // тёплый свет на земле
    gl.addColorStop(0, 'rgba(255,238,180,0.05)'); gl.addColorStop(1, 'rgba(255,238,180,0)');
    g.fillStyle = gl; g.beginPath(); g.ellipse(40, 75, 30, 13, 0, 0, Math.PI * 2); g.fill();
    g.imageSmoothingQuality = 'high'; g.globalAlpha = 0.5;                          // тонкая тёмная обводка снаружи, под ней светлая кайма
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) g.drawImage(dark, dx * 1.0, dy * 1.0, TW_W, TW_H);
    g.globalAlpha = 0.06;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(sil, dx * 0.8, dy * 0.8, TW_W, TW_H);
    g.globalAlpha = 1; g.drawImage(body, 0, 0, TW_W, TW_H);
    g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.04; g.fillStyle = '#1a1018'; g.fillRect(0, 0, TW_W, TW_H); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;      // здания чуть темнее, чтобы сидели в гамме карты
    if (type === 'mine') { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.07; g.drawImage(body, 0, 0, TW_W, TW_H); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }      // тёмные рудники чуть светлее
  });
}
// геометрия «живых» эффектов (орб, жерло, флаг…) считается по рамке картинки
const FR = { tesla: ['orb', 0.11], frost: ['orb', 0.3], voidwell: ['well', 0.4], saw: ['hub', 0.2], banner: ['pole', 0.04], toxic: ['liq', 0.2] };
for (const [t, [key, f]] of Object.entries(FR)) {
  const old = TOWER_ART[t][key];
  TOWER_ART[t][key] = (lvl, br) => {
    if (!SPR.ok || !SPR.towers[t]) return old ? old(lvl, br) : { y: 52, top: 10 };
    const g = towerGeo(t, lvl, br), y = g.top + (g.bottom - g.top) * f, w = g.right - g.left;
    return key === 'well' ? { y, rx: w * 0.27, ry: w * 0.11 } : key === 'pole' ? { top: y } : { y };
  };
}

// ───── API получения спрайтов (с кэшем) ─────
// у премиум-башни своя картинка (если загружена), иначе рисуем базовую
export const artType = (type) => (SPR.ok && SPR.towers[type]) ? type : (TOWERS[type] && TOWERS[type].base) || type;
// картинка «выстрел» (пилорама: щель открыта); null, если у здания такой нет
export function towerBodyF(type, lvl, br) {
  const m = SPR.ok && SPR.towers[type]; if (!m || !m.fire) return null;
  return cached(`tbf:${type}:${lvl}:${br || ''}`, () => spriteTower(type, lvl, br, true));
}
export function towerBody(type, lvl, br) {
  return cached(`tb:${type}:${lvl}:${br || ''}`, () => (SPR.ok && SPR.towers[type] && spriteTower(type, lvl, br)) || mk(TW_W, TW_H, (g) => { TOWER_ART[type].body(g, lvl, br); }));
}
// Вращающееся оружие (арбалет, мортира, огнемёт, гарпун): основание статично, голова поворачивается к цели (8 картинок: E, SE, S, SW, W, NW, N, NE)
// какой вид картинки у здания: у премиума свой набор голов (hell_flame), иначе голова базовой башни; у обычной картинки с зафиксированным оружием — базовая
export const rotKey = (b) => (b.type === 'saw' && b.st && b.st.orbit) ? null : (b.prem && SPR.ok && SPR.towers[b.prem] && SPR.towers[b.prem].head) ? b.prem : (b.prem ? null : b.type);      // у пиломёта с вращающимися лезвиями (ветка A) пускателя нет
export function rotHead(type, lvl, br) {
  if (!type) return null;
  const m = SPR.ok && SPR.towers[type]; if (!m || !m.head) return null;
  const im = img(`towers/${type}_head.webp`); if (!im) return null;
  const i = towerIdx(type, lvl, br), k = spriteK(type, lvl, br), [hx, hy] = m.holes[i], w = 192 * k, h = 240 * k;
  const hk = k * ((m.head.hr && m.head.hr[i]) || 1);      // голова масштабируется под ширину площадки именно этого уровня башни (у разных уровней верх разной ширины)
  return { im, cw: m.head.cw, ch: m.head.ch, ax: m.head.ax, ay: m.head.ay, mx: m.head.mx || 0, my: m.head.my || 0, k: hk, plate: m.head.plate ? m.head.plate[i] * k / 2 : 0, dx: 40 - w / 2 + hx * k - TW_AX, dy: TW_BASE_Y - h + hy * k - TW_AY };
}
// Дуло повёрнутой головы в тех же координатах, где рисуются снаряды и эффекты: ось плиты + вынос ствола вдоль одного из 8 направлений картинки (эллипс: вдоль экрана 1, вглубь 0.5) и высота дула над плитой.
export function muzzle(b) {
  const hi = rotHead(rotKey(b), b.level, b.branch);
  if (!hi || !hi.mx) {                                  // здание без головы (дом алхимика, пилорама): снаряд вылетает из окна или щели на картинке
    const bt = b.prem || b.type, m = SPR.ok && SPR.towers[bt]; if (!m || !m.mz) return null;
    const [px, py] = m.mz[towerIdx(bt, b.level, b.branch)], q = towerPt(bt, b.level, b.branch, px, py); return { x: b.x + q.x, y: b.y + 6 + q.y };
  }
  const a = Math.round((b.angle || 0) / (Math.PI / 4)) * (Math.PI / 4);
  return { x: b.x + hi.dx + Math.cos(a) * hi.mx * hi.k, y: b.y + 6 + hi.dy + Math.sin(a) * hi.mx * hi.k * 0.5 - hi.my * hi.k };
}
// угол, куда на самом деле смотрит голова (одно из 8 направлений картинки)
export const headAngle = (b) => Math.round((b.angle || 0) / (Math.PI / 4)) * (Math.PI / 4);
// у арбалета нет своей плиты, и вокруг гнезда оставался голый пол: под ним рисуется стальной диск на всю площадку до зубцов (ширина по уровням — head.plate)
function drawPlate(g, hi, x, y) {
  const rx = hi.plate, ry = rx * 0.5, cx = x + hi.dx, cy = y + hi.dy, th = rx * 0.1, lw = Math.max(0.8, rx * 0.035);
  const ell = (yy, r) => { g.beginPath(); g.ellipse(cx, yy, r, r * 0.5, 0, 0, Math.PI * 2); };
  g.save(); g.lineJoin = 'round';
  g.fillStyle = '#2a2e37'; g.strokeStyle = '#14161b'; g.lineWidth = lw;
  ell(cy + th, rx); g.fill(); g.fillRect(cx - rx, cy, rx * 2, th); g.beginPath(); g.moveTo(cx - rx, cy); g.lineTo(cx - rx, cy + th); g.moveTo(cx + rx, cy); g.lineTo(cx + rx, cy + th); g.stroke(); ell(cy + th, rx); g.stroke();
  const gr = g.createRadialGradient(cx - rx * 0.25, cy - ry * 0.3, rx * 0.1, cx, cy, rx); gr.addColorStop(0, '#8b92a1'); gr.addColorStop(0.7, '#626978'); gr.addColorStop(1, '#4a505d');
  g.fillStyle = gr; ell(cy, rx); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = lw * 0.9; ell(cy, rx * 0.86); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.3)'; ell(cy, rx * 0.8); g.stroke();
  g.fillStyle = '#c9ced8'; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.beginPath(); g.arc(cx + Math.cos(a) * rx * 0.93, cy + Math.sin(a) * ry * 0.93, Math.max(0.7, rx * 0.028), 0, Math.PI * 2); g.fill(); }
  g.restore();
}
export function drawRotHead(g, hi, angle, x, y, rec = 0) {
  if (hi.plate) drawPlate(g, hi, x, y);
  const dir = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
  g.drawImage(hi.im, dir * hi.cw, 0, hi.cw, hi.ch, x + hi.dx - hi.ax * hi.k - Math.cos(angle) * rec, y + hi.dy - hi.ay * hi.k - Math.sin(angle) * rec * 0.5, hi.cw * hi.k, hi.ch * hi.k);
}
// Белая обводка выбранного здания: силуэт каждой ячейки листа кольцом смещений (светлое кольцо с тёмной каймой снаружи). Строится один раз на картинку и живёт, пока жива она сама.
const RINGS = new WeakMap();
export function selRing(src, cw, ch, n, px) {
  let r = RINGS.get(src); if (r) return r;
  const k = cw / px, rl = 1.9 * k, rd = 2.6 * k, pad = Math.ceil(rd) + 1, W = cw + pad * 2, H = ch + pad * 2;
  const c = document.createElement('canvas'); c.width = W * n; c.height = H; const g = c.getContext('2d');
  const sil = document.createElement('canvas'); sil.width = cw; sil.height = ch; const sg = sil.getContext('2d');
  for (let i = 0; i < n; i++) {
    for (const [col, rr] of [['#150a0e', rd], ['#fff3d0', rl]]) {
      sg.globalCompositeOperation = 'source-over'; sg.clearRect(0, 0, cw, ch); sg.drawImage(src, i * cw, 0, cw, ch, 0, 0, cw, ch); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = col; sg.fillRect(0, 0, cw, ch);
      for (const [q, m] of [[rr, 16], [rr * 0.55, 8]]) for (let j = 0; j < m; j++) { const a = (j / m) * Math.PI * 2 + (q === rr ? 0 : 0.4); g.drawImage(sil, i * W + pad + Math.cos(a) * q, pad + Math.sin(a) * q); }
    }
  }
  sil.width = 0; r = { c, pad, W, H, k }; RINGS.set(src, r); return r;
}
// здание целиком (для иконок и подсказки при постановке): основание + голова, смотрящая на зрителя
export function towerFull(type, lvl, br) {
  const hi = rotHead(type, lvl, br); if (!hi) return towerBody(type, lvl, br);
  return cached(`tf:${type}:${lvl}:${br || ''}`, () => { const c = mk(TW_W, TW_H, (g) => { g.drawImage(towerBody(type, lvl, br), 0, 0, TW_W, TW_H); g.imageSmoothingQuality = 'high'; drawRotHead(g, hi, Math.PI * 0.4, TW_AX, TW_AY, 0); }); return c; });
}
export function towerHead(type, lvl, br) {
  if (SPR.ok && SPR.towers[type]) return null;             // растровая башня целиком статична
  const a = TOWER_ART[type]; if (!a.head) return null;
  return cached(`th:${type}:${lvl}:${br || ''}`, () => mk(HEAD, HEAD, (g) => a.head(g, lvl, br)));
}
export function econBody(type, lvl) {
  return cached(`eb:${type}:${lvl}`, () => (SPR.ok && SPR.towers[type] && spriteTower(type, lvl, null, null)) || mk(TW_W, TW_H, (g) => ECON_ART[type].body(g, lvl)));
}
// иконка для UI (dataURL)
export function iconURL(kind, type, size = 56) {
  return cached(`ic:${kind}:${type}`, () => {
    const body = kind === 'econ' ? econBody(type, 3) : towerFull(type, 1, null);
    const head = kind === 'tower' ? towerHead(type, 1, null) : null;
    const c = document.createElement('canvas'); c.width = size * 2; c.height = size * 2;
    const g = c.getContext('2d');
    const sc = (size * 2) / 84;
    g.drawImage(body, (size * 2 - TW_W * sc) / 2, -2 * sc, TW_W * sc, TW_H * sc);
    if (head) { const lift = TOWER_ART[type].lift; g.drawImage(head, (size * 2 - HEAD * sc) / 2, (74 - lift - 32 - 2) * sc, HEAD * sc, HEAD * sc); }
    return c.toDataURL();
  });
}

// ───── Гигант: кадры броска (колонки 0..7: готов, наклон, подъём, замах, бросок, отпускание, проводка, возврат), ряды атласа: E, SE, S, NE, N (W, SW, NW — зеркалом) ─────
const GROW = [[0, 1], [1, 1], [2, 1], [1, -1], [0, -1], [3, -1], [4, 1], [3, 1]];      // направление (E, SE, S, SW, W, NW, N, NE) → [ряд атласа, знак по x]
export function giantFrame(b) {
  const m = SPR.ok && SPR.towers.giant; if (!m || !m.anim) return null;
  const st = towerIdx('giant', b.level, b.branch), im = img(`towers/giant_a${st}.webp`); if (!im) return null;
  const an = m.anim, dir = ((Math.round((b.angle || 0) / (Math.PI / 4)) % 8) + 8) % 8, [row, sg] = GROW[dir];
  let f = 0;
  if (b.throwT > 0) f = [4, 5, 5, 6, 6, 7][Math.min(5, Math.floor((1 - b.throwT / 0.8) * 6))];
  else if (b.windT > 0) f = [1, 2, 3][Math.min(2, Math.floor(b.windT / 0.25))];
  const k = spriteK('giant', b.level, b.branch);
  return { im, sx: f * an.cw, sy: row * an.ch, sw: an.cw, sh: an.ch, k, sg, ax: an.ax, ay: an.ay };
}
