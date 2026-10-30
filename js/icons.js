// Пакет иконок в «рисованном» стиле Warcraft 3: квадрат с бронзовой фаской, насыщенный фон, жирный контур, глянец.
// Всё рисуется кодом; иконки кэшируются в canvas и dataURL.
import { OUT, S as ART_S, mk, cached, shade, rgba, lin, rad, rrect, ell, circ, poly, fillStroke, tube, glow } from './art.js?v=20261030220754';
import { GLYPH_IMG, tile, inner } from './iconmap.js?v=20261030220754';

const T2 = Math.PI * 2;
export const PALETTE = {
  tower: ['#7aa0d0', '#1a2a48'], econ: ['#e8c060', '#5a3a10'], spell: ['#b080f0', '#2a1050'], perk: ['#a8b8c8', '#2a3240'],
  ach: ['#f0d070', '#5a3a10'], power: ['#f07a68', '#4a1410'], speed: ['#f4dc70', '#5a4410'], special: ['#80f090', '#14401c'],
  A: ['#70b4ff', '#10284a'], B: ['#ff7a8a', '#4a1018'], final: ['#ffd24a', '#5a2a08'], lock: ['#7a7a84', '#1c1c22'], danger: ['#ff6a4a', '#3a0a08'],
};
const FRAMES = { gold: ['#ffe9a8', '#c99a3a', '#5a3c12'], silver: ['#f4f8ff', '#a0a8b8', '#3a4050'], blood: ['#ffb0a8', '#c0382c', '#4a0e0a'], ice: ['#e8f8ff', '#6ab0e0', '#1a3a5a'], nature: ['#d8ffc0', '#6ab04a', '#1a3a12'], arcane: ['#f0d8ff', '#9a60d8', '#2a1250'], dark: ['#9a9aa4', '#4a4a54', '#14141a'] };

// ───── рамка + фон ─────
export function makeIcon(size, { bg = PALETTE.tower, frame = 'gold', draw, sprite, crop = null, spriteScale = 1, spriteDy = 0, badge = null, badgeCol = '#ffd24a' } = {}) {
  const k = size / 64;
  return mk(size, size, (g) => {
    g.scale(k, k);
    const F = FRAMES[frame] || FRAMES.gold, W = 64;
    rrect(g, 0, 0, W, W, 9); g.fillStyle = '#0d0806'; g.fill();
    rrect(g, 1.2, 1.2, W - 2.4, W - 2.4, 8); g.fillStyle = lin(g, 0, 0, W, W, [[0, F[0]], [0.45, F[1]], [1, F[2]]]); g.fill();
    rrect(g, 4.2, 4.2, W - 8.4, W - 8.4, 6); g.fillStyle = '#120c08'; g.fill();
    g.save(); rrect(g, 5.4, 5.4, W - 10.8, W - 10.8, 5); g.clip();
    g.fillStyle = rad(g, 32, 26, 2, 46, [[0, bg[0]], [0.6, shade(bg[0], -0.35)], [1, bg[1]]]); g.fillRect(0, 0, W, W);
    // лучи
    g.globalAlpha = 0.12; g.fillStyle = '#fff'; for (let i = 0; i < 7; i++) { const a = (i / 7) * T2; g.beginPath(); g.moveTo(32, 30); g.arc(32, 30, 48, a, a + 0.18); g.closePath(); g.fill(); } g.globalAlpha = 1;
    if (sprite && crop) {                                           // вырезка из спрайта (логические единицы): голова башни крупным планом
      const m = sprite.width / sprite.lw; g.imageSmoothingQuality = 'high';
      g.drawImage(sprite, crop.x * m, crop.y * m, crop.w * m, crop.h * m, 5.4, 5.4, 53.2, 53.2);
    } else if (sprite) {
      const sw = sprite.lw, sh = sprite.lh, sc = Math.min(50 / sw, 56 / sh) * spriteScale;
      g.drawImage(sprite, 32 - (sw * sc) / 2, 33 - (sh * sc) / 2 + spriteDy, sw * sc, sh * sc);
    }
    if (draw) draw(g, 64);
    // значок характеристики в углу
    if (badge && GLYPH_IMG[badge] && tile(GLYPH_IMG[badge])) { const ic = inner(GLYPH_IMG[badge]); circ(g, 50, 50, 11.5); fillStroke(g, rad(g, 47, 46, 1, 14, [[0, shade(badgeCol, 0.2)], [1, shade(badgeCol, -0.6)]]), 2); g.save(); circ(g, 50, 50, 9.5); g.clip(); g.drawImage(ic.im, ic.sx, ic.sy, ic.sw, ic.sh, 40, 40, 20, 20); g.restore(); }
    else if (badge && G[badge]) { circ(g, 50, 50, 11.5); fillStroke(g, rad(g, 47, 46, 1, 14, [[0, shade(badgeCol, 0.2)], [1, shade(badgeCol, -0.6)]]), 2); g.save(); g.translate(39, 39); g.scale(22 / 64, 22 / 64); G[badge](g, 64); g.restore(); }
    // виньетка + глянец
    g.fillStyle = rad(g, 32, 32, 20, 46, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.45)']]); g.fillRect(0, 0, W, W);
    g.beginPath(); g.ellipse(32, 8, 30, 14, 0, 0, T2); g.fillStyle = lin(g, 0, 0, 0, 22, [[0, 'rgba(255,255,255,0.38)'], [1, 'rgba(255,255,255,0)']]); g.fill();
    g.restore();
    rrect(g, 5.4, 5.4, W - 10.8, W - 10.8, 5); g.lineWidth = 1.4; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.stroke();
    g.beginPath(); g.moveTo(8, W - 7); g.lineTo(W - 8, W - 7); g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,0.18)'; g.stroke();
  });
}

// ───── глифы (рисуются в коробке 64×64) ─────
const G = {};
G.dmg = (g) => {
  g.save(); g.translate(32, 32); g.rotate(-Math.PI / 4);
  poly(g, [[-3.6, 18], [-3.6, -18], [0, -25], [3.6, -18], [3.6, 18]]); fillStroke(g, lin(g, -4, 0, 4, 0, [[0, '#ffffff'], [0.5, '#cfd8e4'], [1, '#6a7688']]), 2);
  g.beginPath(); g.moveTo(0, -22); g.lineTo(0, 16); g.lineWidth = 1; g.strokeStyle = 'rgba(70,90,120,0.6)'; g.stroke();
  rrect(g, -11, 18, 22, 5, 2); fillStroke(g, lin(g, 0, 18, 0, 23, [[0, '#ffe27a'], [1, '#a8741a']]), 2);
  rrect(g, -2.6, 23, 5.2, 11, 2); fillStroke(g, '#7a4a22', 1.8); circ(g, 0, 36, 3.6); fillStroke(g, '#ffe27a', 1.6);
  g.restore();
};
G.rate = (g) => { poly(g, [[36, 6], [16, 34], [29, 34], [24, 58], [49, 25], [34, 25], [42, 6]]); fillStroke(g, lin(g, 16, 6, 49, 58, [[0, '#fff7b0'], [0.5, '#ffd22a'], [1, '#e07a0a']]), 2.4); g.beginPath(); g.moveTo(35, 11); g.lineTo(23, 31); g.lineWidth = 1.6; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.stroke(); };
G.range = (g) => {
  for (const [r, c] of [[24, '#f4ecd8'], [17, '#d8342a'], [10, '#f4ecd8'], [4.5, '#d8342a']]) { circ(g, 30, 34, r); fillStroke(g, c, 1.8); }
  tube(g, 30, 34, 54, 10, 2.6, '#8a5a2a', 1.4); poly(g, [[52, 6], [58, 6], [58, 12], [54, 10]]); fillStroke(g, '#e8edf4', 1.4);
};
G.chain = (g) => {
  g.beginPath(); g.moveTo(12, 46); g.lineTo(26, 32); g.lineTo(22, 30); g.lineTo(40, 20); g.lineTo(36, 18); g.lineTo(52, 12); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 3.4; g.strokeStyle = '#bfe8ff'; g.stroke();
  for (const [x, y] of [[12, 48], [30, 32], [52, 14]]) { glow(g, x, y, 12, '#6adcff', 0.8); circ(g, x, y, 6.5); fillStroke(g, rad(g, x - 2, y - 2, 0.5, 8, [[0, '#fff'], [0.5, '#6adcff'], [1, '#1a5aa8']]), 2); }
};
G.frost = (g) => {
  g.save(); g.translate(32, 32); for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -24); g.lineWidth = 6; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#dff6ff'; g.stroke(); for (const d of [-10, -17]) { g.beginPath(); g.moveTo(-6, d - 5); g.lineTo(0, d); g.lineTo(6, d - 5); g.lineWidth = 5; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 2.4; g.strokeStyle = '#bfeaff'; g.stroke(); } }
  circ(g, 0, 0, 5); fillStroke(g, '#fff', 1.6); g.restore();
};
G.poison = (g) => { g.beginPath(); g.moveTo(32, 6); g.bezierCurveTo(50, 28, 52, 40, 44, 50); g.bezierCurveTo(36, 60, 22, 58, 16, 48); g.bezierCurveTo(10, 38, 16, 26, 32, 6); g.closePath(); fillStroke(g, rad(g, 26, 34, 2, 30, [[0, '#d8ff90'], [0.5, '#5ad63a'], [1, '#1f6a12']]), 2.4); g.fillStyle = 'rgba(255,255,255,0.55)'; ell(g, 24, 32, 3.2, 6, 0.4); g.fill(); g.fillStyle = 'rgba(20,70,10,0.8)'; circ(g, 33, 44, 5.4); g.fill(); g.fillStyle = '#d8ffb0'; circ(g, 31, 43, 1.3); g.fill(); circ(g, 35, 43, 1.3); g.fill(); };
G.shield = (g) => { g.beginPath(); g.moveTo(32, 6); g.lineTo(54, 12); g.lineTo(52, 36); g.quadraticCurveTo(48, 52, 32, 59); g.quadraticCurveTo(16, 52, 12, 36); g.lineTo(10, 12); g.closePath(); fillStroke(g, lin(g, 10, 6, 54, 59, [[0, '#8ab8ff'], [0.5, '#2f62b8'], [1, '#12244a']]), 2.6); g.beginPath(); g.moveTo(32, 12); g.lineTo(32, 52); g.moveTo(16, 28); g.lineTo(48, 28); g.lineWidth = 5; g.strokeStyle = '#ffe27a'; g.stroke(); g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke(); };
G.banner = (g) => { tube(g, 18, 58, 18, 8, 3.6, '#8a5a2a', 1.6); g.beginPath(); g.moveTo(21, 10); g.quadraticCurveTo(34, 4, 54, 14); g.lineTo(46, 24); g.lineTo(54, 34); g.quadraticCurveTo(34, 26, 21, 36); g.closePath(); fillStroke(g, lin(g, 21, 10, 54, 36, [[0, '#ff6a5a'], [1, '#8a0c18']]), 2.4); g.fillStyle = '#ffe27a'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.fillText('⚔', 36, 29); circ(g, 18, 7, 4); fillStroke(g, '#ffe27a', 1.6); };
G.fire = (g) => { g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(48, 20, 56, 32, 48, 48); g.bezierCurveTo(44, 58, 20, 58, 16, 46); g.bezierCurveTo(12, 34, 22, 28, 24, 16); g.bezierCurveTo(30, 22, 30, 12, 32, 4); g.closePath(); fillStroke(g, lin(g, 32, 6, 32, 58, [[0, '#fff2a0'], [0.4, '#ff9a1a'], [1, '#d82a0a']]), 2.6); g.beginPath(); g.moveTo(33, 28); g.bezierCurveTo(42, 38, 42, 46, 36, 52); g.bezierCurveTo(28, 54, 22, 48, 26, 40); g.bezierCurveTo(30, 40, 32, 36, 33, 28); fillStroke(g, lin(g, 0, 28, 0, 54, [[0, '#ffffd0'], [1, '#ffcc30']]), 1.4); };
G.vortex = (g) => { g.save(); g.translate(32, 32); g.lineCap = 'round'; for (const [w, c] of [[9, OUT], [5, '#b070ff'], [2.2, '#f0d8ff']]) { g.beginPath(); for (let a = 0; a < 12.5; a += 0.2) { const r = 2 + a * 1.8; g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.9); } g.lineWidth = w; g.strokeStyle = c; g.stroke(); } glow(g, 0, 0, 14, '#d8a0ff', 0.8); g.restore(); };
G.pierce = (g) => { for (const x of [26, 40]) { circ(g, x, 32, 12); fillStroke(g, 'rgba(180,200,230,0.35)', 2); } tube(g, 6, 32, 52, 32, 3.4, '#8a5a2a', 1.6); poly(g, [[50, 22], [62, 32], [50, 42], [54, 32]]); fillStroke(g, '#f4f8ff', 1.8); poly(g, [[6, 32], [14, 24], [16, 32], [14, 40]]); fillStroke(g, '#e84a3a', 1.6); };
G.blast = (g) => { g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * T2, r = i % 2 ? 14 : 28; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.closePath(); fillStroke(g, rad(g, 32, 32, 2, 30, [[0, '#ffffd0'], [0.45, '#ffb02a'], [1, '#e03a0a']]), 2.6); circ(g, 32, 32, 8); fillStroke(g, '#fff', 1.4); };
G.skull = (g) => { circ(g, 32, 28, 20); fillStroke(g, rad(g, 26, 22, 2, 28, [[0, '#ffffff'], [1, '#c8bea0']]), 2.4); rrect(g, 20, 40, 24, 16, 4); fillStroke(g, '#e8dfc4', 2.2); g.fillStyle = OUT; ell(g, 24, 29, 5.2, 6.4); g.fill(); ell(g, 40, 29, 5.2, 6.4); g.fill(); poly(g, [[32, 33], [29, 40], [35, 40]]); g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.6; for (const x of [26, 32, 38]) { g.beginPath(); g.moveTo(x, 44); g.lineTo(x, 55); g.stroke(); } glow(g, 24, 29, 8, '#ff3a2a', 0.7); glow(g, 40, 29, 8, '#ff3a2a', 0.7); };
G.crown = (g) => { poly(g, [[8, 50], [8, 22], [20, 34], [32, 14], [44, 34], [56, 22], [56, 50]]); fillStroke(g, lin(g, 8, 14, 56, 50, [[0, '#fff2a0'], [0.5, '#f4b92a'], [1, '#a8700e']]), 2.6); rrect(g, 8, 46, 48, 9, 3); fillStroke(g, '#c9921a', 2.2); for (const [x, y, c] of [[20, 50, '#ff4a5a'], [32, 50, '#4ac0ff'], [44, 50, '#6aff7a']]) { circ(g, x, y, 3.4); fillStroke(g, c, 1.4); } for (const x of [8, 32, 56]) { circ(g, x, x === 32 ? 12 : 20, 4); fillStroke(g, '#fff2a0', 1.8); } };
G.bag = (g) => { g.beginPath(); g.moveTo(16, 56); g.quadraticCurveTo(4, 42, 18, 28); g.lineTo(24, 18); g.lineTo(40, 18); g.lineTo(46, 28); g.quadraticCurveTo(60, 42, 48, 56); g.closePath(); fillStroke(g, lin(g, 8, 18, 56, 56, [[0, '#e8b868'], [1, '#7a4a18']]), 2.6); rrect(g, 22, 14, 20, 7, 3); fillStroke(g, '#5a3410', 2); g.fillStyle = '#ffe27a'; g.font = 'bold 24px sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#6a3a08'; g.strokeText('$', 32, 49); g.fillText('$', 32, 49); };
G.pickaxe = (g) => { tube(g, 14, 54, 46, 14, 4.4, '#8a5a2a', 1.8); g.beginPath(); g.moveTo(24, 10); g.quadraticCurveTo(52, 6, 58, 34); g.quadraticCurveTo(46, 18, 24, 22); g.closePath(); fillStroke(g, lin(g, 24, 8, 58, 34, [[0, '#f4f8ff'], [1, '#6a7688']]), 2.4); };
G.chart = (g) => { for (const [x, h, c] of [[12, 16, '#6ab0ff'], [27, 28, '#6adc6a'], [42, 40, '#ffd24a']]) { rrect(g, x, 56 - h, 12, h, 2); fillStroke(g, c, 2); } g.beginPath(); g.moveTo(8, 38); g.lineTo(24, 28); g.lineTo(36, 34); g.lineTo(54, 12); g.lineWidth = 5; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 2.4; g.strokeStyle = '#ff6a4a'; g.stroke(); poly(g, [[48, 8], [58, 8], [58, 18]]); fillStroke(g, '#ff6a4a', 1.6); };
G.horde = (g) => { for (const [x, y, c, r] of [[20, 36, '#7ab648', 12], [44, 36, '#c06a3e', 12], [32, 24, '#cc4a34', 14]]) { circ(g, x, y, r); fillStroke(g, rad(g, x - 3, y - 4, 1, r * 1.4, [[0, shade(c, 0.4)], [1, shade(c, -0.3)]]), 2.2); g.fillStyle = '#fff27a'; circ(g, x + r * 0.3, y - r * 0.1, r * 0.2); g.fill(); g.fillStyle = OUT; circ(g, x + r * 0.35, y - r * 0.1, r * 0.09); g.fill(); } };
G.tower = (g) => { rrect(g, 18, 22, 28, 34, 3); fillStroke(g, lin(g, 18, 0, 46, 0, [[0, '#c0c8d4'], [1, '#4a5260']]), 2.4); for (const x of [16, 28, 40]) { rrect(g, x, 12, 9, 12, 2); fillStroke(g, lin(g, x, 0, x + 9, 0, [[0, '#c0c8d4'], [1, '#5a6270']]), 2); } g.beginPath(); g.moveTo(27, 56); g.lineTo(27, 42); g.quadraticCurveTo(32, 34, 37, 42); g.lineTo(37, 56); fillStroke(g, '#1a0e08', 1.8); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; for (const y of [30, 36, 42, 48]) { g.beginPath(); g.moveTo(18, y); g.lineTo(46, y); g.stroke(); } };
G.star = (g) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * T2, r = i % 2 ? 11 : 27; g.lineTo(32 + Math.cos(a) * r, 33 + Math.sin(a) * r); } g.closePath(); fillStroke(g, lin(g, 8, 6, 56, 58, [[0, '#fff7b0'], [0.5, '#ffc82a'], [1, '#d87a0a']]), 2.8); };
G.fork = (g) => { g.lineCap = 'round'; for (const [w, c] of [[9, OUT], [5, '#ffe27a']]) { g.beginPath(); g.moveTo(32, 58); g.lineTo(32, 36); g.lineTo(16, 18); g.moveTo(32, 36); g.lineTo(48, 18); g.lineWidth = w; g.strokeStyle = c; g.stroke(); } for (const [x, y, c] of [[16, 14, '#6ab0ff'], [48, 14, '#ff6a7a']]) { circ(g, x, y, 8); fillStroke(g, c, 2.2); } };
G.hourglass = (g) => { poly(g, [[14, 8], [50, 8], [34, 32], [50, 56], [14, 56], [30, 32]]); fillStroke(g, 'rgba(210,235,255,0.55)', 2.6); poly(g, [[20, 14], [44, 14], [32, 30]]); fillStroke(g, '#ffd24a', 1.4); poly(g, [[22, 52], [42, 52], [32, 40]]); fillStroke(g, '#ffd24a', 1.4); for (const y of [4, 60]) { rrect(g, 10, y - 3, 44, 6, 2); fillStroke(g, '#8a5a2a', 2); } };
G.flag = (g) => { tube(g, 16, 58, 16, 6, 4, '#8a5a2a', 1.8); g.beginPath(); g.moveTo(19, 8); g.quadraticCurveTo(36, 2, 52, 12); g.quadraticCurveTo(38, 20, 52, 30); g.quadraticCurveTo(36, 24, 19, 30); g.closePath(); fillStroke(g, lin(g, 19, 8, 52, 30, [[0, '#8aff9a'], [1, '#1a8a3a']]), 2.4); };
G.horns = (g) => { for (const s of [-1, 1]) { g.beginPath(); g.moveTo(32 + s * 8, 50); g.quadraticCurveTo(32 + s * 30, 44, 32 + s * 26, 10); g.quadraticCurveTo(32 + s * 16, 30, 32 + s * 4, 36); g.closePath(); fillStroke(g, lin(g, 0, 10, 0, 50, [[0, '#fff4d8'], [1, '#8a6a3a']]), 2.4); } circ(g, 32, 46, 12); fillStroke(g, rad(g, 28, 42, 1, 16, [[0, '#ff6a5a'], [1, '#7a0a10']]), 2.4); g.fillStyle = '#ffe27a'; ell(g, 27, 44, 3, 2, 0.3); g.fill(); ell(g, 37, 44, 3, 2, -0.3); g.fill(); };
G.wing = (g) => { g.beginPath(); g.moveTo(10, 54); g.quadraticCurveTo(6, 22, 30, 8); g.quadraticCurveTo(26, 22, 36, 24); g.quadraticCurveTo(36, 14, 52, 10); g.quadraticCurveTo(46, 24, 54, 28); g.quadraticCurveTo(50, 44, 10, 54); g.closePath(); fillStroke(g, lin(g, 10, 8, 54, 54, [[0, '#d8b0ff'], [1, '#5a2a8a']]), 2.6); };
G.coins = (g) => { for (const [x, y] of [[22, 46], [42, 46], [32, 36], [22, 28], [42, 28]]) { ell(g, x, y + 4, 14, 6); fillStroke(g, '#a8700e', 2); ell(g, x, y, 14, 6); fillStroke(g, lin(g, x - 14, y - 6, x + 14, y + 6, [[0, '#fff2a0'], [1, '#e0a01a']]), 2); } };
G.heart = (g) => { g.beginPath(); g.moveTo(32, 56); g.bezierCurveTo(-4, 32, 10, 4, 32, 18); g.bezierCurveTo(54, 4, 68, 32, 32, 56); g.closePath(); fillStroke(g, rad(g, 24, 22, 2, 40, [[0, '#ffa0aa'], [0.5, '#e0243a'], [1, '#6a0818']]), 2.8); g.fillStyle = 'rgba(255,255,255,0.55)'; ell(g, 20, 24, 4, 7, -0.6); g.fill(); };
G.scales = (g) => { tube(g, 32, 54, 32, 14, 3.6, '#8a5a2a', 1.6); tube(g, 12, 18, 52, 18, 3.4, '#c9921a', 1.6); for (const x of [14, 50]) { tube(g, x, 18, x - 7, 38, 1.6, '#c9921a', 1); tube(g, x, 18, x + 7, 38, 1.6, '#c9921a', 1); g.beginPath(); g.ellipse(x, 40, 11, 4.4, 0, 0, Math.PI); g.closePath(); fillStroke(g, lin(g, x - 11, 36, x + 11, 44, [[0, '#fff2a0'], [1, '#b8821a']]), 2); } rrect(g, 22, 54, 20, 5, 2); fillStroke(g, '#8a5a2a', 2); };
G.book = (g) => { rrect(g, 10, 10, 44, 46, 3); fillStroke(g, lin(g, 10, 10, 54, 56, [[0, '#7a5ad8'], [1, '#2a1a6a']]), 2.6); rrect(g, 16, 10, 38, 44, 2); fillStroke(g, '#f0e6c8', 2); g.strokeStyle = 'rgba(80,60,30,0.6)'; g.lineWidth = 1.4; for (const y of [20, 27, 34, 41]) { g.beginPath(); g.moveTo(22, y); g.lineTo(48, y); g.stroke(); } circ(g, 31, 14, 3); fillStroke(g, '#ff4a5a', 1.2); };
G.meteor = (g) => { g.beginPath(); g.moveTo(8, 8); g.quadraticCurveTo(28, 14, 40, 30); g.lineTo(30, 40); g.quadraticCurveTo(18, 24, 8, 8); g.closePath(); fillStroke(g, lin(g, 8, 8, 40, 40, [[0, 'rgba(255,200,80,0)'], [1, '#ff7a1a']]), 0); glow(g, 38, 38, 26, '#ff7a1a', 0.7); circ(g, 40, 40, 15); fillStroke(g, rad(g, 35, 34, 2, 22, [[0, '#ffe27a'], [0.45, '#ff6a1a'], [1, '#6a1408']]), 2.6); g.fillStyle = 'rgba(60,20,10,0.6)'; circ(g, 44, 44, 3.6); g.fill(); circ(g, 35, 45, 2.4); g.fill(); };
G.stasis = (g) => { G.hourglass(g); glow(g, 32, 32, 26, '#9ae8ff', 0.5); G.frost(g); };
G.rush = (g) => { G.coins(g); poly(g, [[38, 4], [24, 32], [34, 32], [28, 60], [50, 26], [38, 26], [46, 4]]); fillStroke(g, '#ffe94a', 2.2); };
G.soul = (g) => { g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(54, 18, 54, 44, 32, 60); g.bezierCurveTo(10, 44, 10, 18, 32, 4); g.closePath(); fillStroke(g, rad(g, 32, 24, 2, 40, [[0, '#ffffff'], [0.4, '#9ae8ff'], [1, '#2a6ad8']]), 2.6); g.fillStyle = '#0a2038'; circ(g, 24, 28, 4.4); g.fill(); circ(g, 40, 28, 4.4); g.fill(); g.beginPath(); g.arc(32, 40, 5, 0.2, Math.PI - 0.2); g.lineWidth = 2.4; g.strokeStyle = '#0a2038'; g.stroke(); };
G.lock = (g) => { rrect(g, 14, 28, 36, 28, 4); fillStroke(g, lin(g, 14, 28, 50, 56, [[0, '#d0d6e0'], [1, '#4a505c']]), 2.6); g.beginPath(); g.arc(32, 28, 12, Math.PI, 0); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 3.4; g.strokeStyle = '#a0a8b4'; g.stroke(); circ(g, 32, 41, 4.4); fillStroke(g, '#1a0b10', 1.4); rrect(g, 30, 42, 4, 9, 1.6); fillStroke(g, '#1a0b10', 1); };
G.skulllock = (g) => {
  G.skull(g);
  g.beginPath(); g.arc(32, 41, 8.5, Math.PI, 0); g.lineWidth = 6.4; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 3.2; g.strokeStyle = '#d0d6e0'; g.stroke();
  rrect(g, 19, 41, 26, 18, 3.4); fillStroke(g, lin(g, 19, 41, 45, 59, [[0, '#f0dc9a'], [1, '#8a6a1a']]), 2.6);
  circ(g, 32, 48, 3); fillStroke(g, '#1a0b10', 1); rrect(g, 30.8, 49, 2.4, 6, 1); g.fillStyle = '#1a0b10'; g.fill();
};
G.trophy = (g) => { g.beginPath(); g.moveTo(16, 8); g.lineTo(48, 8); g.lineTo(45, 30); g.quadraticCurveTo(32, 44, 19, 30); g.closePath(); fillStroke(g, lin(g, 16, 8, 48, 40, [[0, '#fff2a8'], [0.5, '#f6b92c'], [1, '#9a6208']]), 2.6); g.lineWidth = 4; g.strokeStyle = OUT; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(32 + s * 16, 12); g.quadraticCurveTo(32 + s * 30, 12, 32 + s * 24, 26); g.quadraticCurveTo(32 + s * 20, 30, 32 + s * 14, 28); g.stroke(); g.lineWidth = 2; g.strokeStyle = '#e0a01a'; g.stroke(); g.lineWidth = 4; g.strokeStyle = OUT; } rrect(g, 28, 40, 8, 10, 2); fillStroke(g, '#d99a1c', 2); rrect(g, 18, 50, 28, 8, 3); fillStroke(g, '#8a5a0a', 2.2); };
G.map = (g) => { g.beginPath(); g.moveTo(8, 14); g.lineTo(22, 8); g.lineTo(42, 14); g.lineTo(56, 8); g.lineTo(56, 50); g.lineTo(42, 56); g.lineTo(22, 50); g.lineTo(8, 56); g.closePath(); fillStroke(g, lin(g, 8, 8, 56, 56, [[0, '#f4e4b8'], [1, '#b89a5a']]), 2.4); g.strokeStyle = 'rgba(100,70,30,0.7)'; g.lineWidth = 1.4; for (const x of [22, 42]) { g.beginPath(); g.moveTo(x, x === 22 ? 8 : 14); g.lineTo(x, x === 22 ? 50 : 56); g.stroke(); } g.setLineDash([3, 3]); g.beginPath(); g.moveTo(14, 44); g.quadraticCurveTo(30, 20, 50, 28); g.stroke(); g.setLineDash([]); g.fillStyle = '#d8342a'; g.font = 'bold 16px sans-serif'; g.textAlign = 'center'; g.fillText('✕', 49, 33); };
G.fast = (g) => { for (const x of [8, 30]) { poly(g, [[x, 12], [x + 24, 32], [x, 52]]); fillStroke(g, lin(g, x, 12, x + 24, 52, [[0, '#fff7b0'], [1, '#e0a01a']]), 2.6); } };
G.arrowup = (g) => { poly(g, [[32, 6], [56, 34], [40, 34], [40, 58], [24, 58], [24, 34], [8, 34]]); fillStroke(g, lin(g, 8, 6, 56, 58, [[0, '#d0ffc0'], [0.5, '#4ad63a'], [1, '#1a7a12']]), 2.8); };
G.goblin = (g) => { circ(g, 32, 34, 20); fillStroke(g, rad(g, 26, 26, 2, 30, [[0, '#b0e87a'], [1, '#3a7a1a']]), 2.6); poly(g, [[14, 28], [2, 14], [18, 22]]); fillStroke(g, '#5a9a2a', 2); poly(g, [[50, 28], [62, 14], [46, 22]]); fillStroke(g, '#5a9a2a', 2); for (const x of [24, 40]) { circ(g, x, 30, 5.4); fillStroke(g, '#ffe23a', 1.8); g.fillStyle = OUT; circ(g, x + 1, 30, 2.2); g.fill(); } g.beginPath(); g.moveTo(22, 44); g.lineTo(42, 44); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke(); for (const x of [26, 38]) { poly(g, [[x - 2, 44], [x + 2, 44], [x, 50]]); fillStroke(g, '#fff', 1); } };
G.sell = (g) => { G.coins(g); };
G.gem = (g) => {
  poly(g, [[18, 10], [46, 10], [60, 26], [32, 58], [4, 26]]); fillStroke(g, lin(g, 4, 10, 60, 58, [[0, '#c8f4ff'], [0.45, '#3ab8f0'], [1, '#0c4a9a']]), 2.8);
  g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(4, 26); g.lineTo(60, 26); g.moveTo(18, 10); g.lineTo(24, 26); g.lineTo(32, 58); g.moveTo(46, 10); g.lineTo(40, 26); g.lineTo(32, 58); g.moveTo(24, 26); g.lineTo(32, 10); g.lineTo(40, 26); g.stroke();
};
G.sound = (g) => { poly(g, [[10, 24], [22, 24], [36, 12], [36, 52], [22, 40], [10, 40]]); fillStroke(g, lin(g, 10, 12, 36, 52, [[0, '#f4f8ff'], [1, '#8a96aa']]), 2.6); for (const [r, a] of [[10, 1], [18, 0.8], [26, 0.6]]) { g.beginPath(); g.arc(36, 32, r, -0.9, 0.9); g.lineWidth = 6; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 3; g.strokeStyle = `rgba(255,226,122,${a})`; g.stroke(); } };
G.music = (g) => { g.beginPath(); g.moveTo(24, 46); g.lineTo(24, 14); g.lineTo(48, 8); g.lineTo(48, 40); g.lineWidth = 8; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#f4f8ff'; g.stroke(); for (const [x, y] of [[18, 48], [42, 42]]) { ell(g, x, y, 8, 6, -0.4); fillStroke(g, lin(g, x - 8, y - 6, x + 8, y + 6, [[0, '#ffe27a'], [1, '#b8821a']]), 2.4); } };
G.expand = (g) => { for (const [x, y, dx, dy] of [[12, 12, 1, 1], [52, 12, -1, 1], [12, 52, 1, -1], [52, 52, -1, -1]]) { g.beginPath(); g.moveTo(x, y + dy * 16); g.lineTo(x, y); g.lineTo(x + dx * 16, y); g.lineWidth = 8; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#f4f8ff'; g.stroke(); } };
G.home = (g) => { poly(g, [[32, 8], [58, 32], [50, 32], [50, 54], [14, 54], [14, 32], [6, 32]]); fillStroke(g, lin(g, 6, 8, 58, 54, [[0, '#ffe9a8'], [1, '#c0802a']]), 2.6); rrect(g, 26, 36, 12, 18, 2); fillStroke(g, '#4a2a12', 2); };
G.replay = (g) => { g.beginPath(); g.arc(32, 34, 20, -1.2, 4.4); g.lineWidth = 11; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 6; g.strokeStyle = '#f4f8ff'; g.stroke(); poly(g, [[34, 4], [34, 26], [52, 15]]); fillStroke(g, '#f4f8ff', 2.4); };

// ───── публичный API ─────
const CAT = {
  dmg: 'power', rate: 'speed', range: 'special', chain: 'special', frost: 'tower', poison: 'tower', shield: 'tower', banner: 'tower', fire: 'tower', vortex: 'spell', pierce: 'tower', blast: 'tower',
};
export function glyphIcon(name, { size = 64, bg, frame = 'gold' } = {}) {
  const f = GLYPH_IMG[name] || name, t = tile(f);
  if (t) {                                                  // готовая иконка из листа (уже с рамкой); закрытые — серые и тёмные
    return cached(`gi:img:${f}:${size}:${frame === 'dark' ? 'd' : ''}`, () => mk(size, size, (g) => {
      g.drawImage(t, 0, 0, size, size);
      if (frame === 'dark') {                              // закрытое: чёрно-белое и приглушённое (только по непрозрачным пикселям)
        const id = g.getImageData(0, 0, g.canvas.width, g.canvas.height), d = id.data;
        for (let i = 0; i < d.length; i += 4) { const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) * 0.72; d[i] = d[i + 1] = d[i + 2] = l; }
        g.putImageData(id, 0, 0);
      }
    }));
  }
  return cached(`gi:${name}:${size}:${frame}:${bg ? bg[0] : ''}`, () => makeIcon(size, { bg: bg || PALETTE[CAT[name]] || PALETTE.tower, frame, draw: G[name] }));
}
export function spriteIcon(key, sprite, { size = 64, bg = PALETTE.tower, frame = 'gold', crop = null, spriteScale = 1, spriteDy = 0, badge = null, badgeCol } = {}) {
  return cached(`si:${key}:${size}:${frame}:${badge || ''}`, () => makeIcon(size, { bg, frame, sprite, crop, spriteScale, spriteDy, badge, badgeCol }));
}
// значок «вырезкой»: картинка здания без плитки и рамки, на прозрачном фоне; по границам непрозрачных пикселей обрезается и вписывается в квадрат, с мягкой тенью
export function cutIcon(key, sprite, { size = 64, crop = null, badge = null, badgeCol = '#ffd24a' } = {}) {
  return cached(`ci:${key}:${size}:${badge || ''}`, () => {
    const T = 160, t = mk(T, T, (g) => {
      g.imageSmoothingQuality = 'high';
      if (sprite && crop) { const m = sprite.width / sprite.lw; g.drawImage(sprite, crop.x * m, crop.y * m, crop.w * m, crop.h * m, 0, 0, T, T); }
      else if (sprite) { const sc = Math.min(T / sprite.width, T / sprite.height); g.drawImage(sprite, (T - sprite.width * sc) / 2, (T - sprite.height * sc) / 2, sprite.width * sc, sprite.height * sc); }
    });
    const PW = t.width, PH = t.height; let x0 = PW, y0 = PH, x1 = 0, y1 = 0;          // t хранится в пикселях масштаба арта (mk): границы ищем в них
    try { const d = t.getContext('2d').getImageData(0, 0, PW, PH).data; for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) if (d[(y * PW + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } } catch (e) { x0 = 0; y0 = 0; x1 = PW - 1; y1 = PH - 1; }
    if (x1 <= x0 || y1 <= y0) { x0 = 0; y0 = 0; x1 = PW - 1; y1 = PH - 1; }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, sc = PW / T, bwL = bw / sc, bhL = bh / sc, pad = size * 0.06, k = Math.min((size - pad * 2) / bwL, (size - pad * 2) / bhL);
    return mk(size, size, (g) => {
      g.imageSmoothingQuality = 'high'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = size * 0.05; g.shadowOffsetY = size * 0.025;
      g.drawImage(t, x0, y0, bw, bh, (size - bwL * k) / 2, (size - bhL * k) / 2, bwL * k, bhL * k);
      g.shadowColor = 'transparent';
      if (badge && G[badge]) { const r = size * 0.19; circ(g, size - r - 1, r + 1, r); fillStroke(g, rad(g, size - r - 2, r, 1, r * 1.3, [[0, shade(badgeCol, 0.2)], [1, shade(badgeCol, -0.6)]]), 1.6); g.save(); g.translate(size - 2 * r + r * 0.18, r * 0.18 + 1); g.scale((r * 1.64) / 64, (r * 1.64) / 64); G[badge](g, 64); g.restore(); }
    });
  });
}
export function iconUrl(canvas) {
  if (!canvas._url) { const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height; c.getContext('2d').drawImage(canvas, 0, 0); canvas._url = c.toDataURL(); }
  return canvas._url;
}
export const GLYPHS = Object.keys(G);
export const chipHtml = (glyph, text, cls = '', title = '') => `<span class="ch ${cls}" ${title ? `title="${title}"` : ''}><img src="${bareGlyphUrl(glyph, 18)}" alt=""><b>${text}</b></span>`;
// маленькая «голая» иконка-глиф без рамки (для чипов характеристик), size в px
export function bareGlyph(name, size = 20) {
  const ic = inner(name === 'bag' ? 'bag_gold' : (GLYPH_IMG[name] || name));          // мешок с золотом — отдельная вырезанная картинка
  if (ic) return cached(`bg:img:${name}:${size}`, () => mk(size, size, (g) => { g.imageSmoothingQuality = 'high'; g.drawImage(ic.im, ic.sx, ic.sy, ic.sw, ic.sh, 0, 0, size, size); }));
  return cached(`bg:${name}:${size}`, () => { const c = mk(size, size, (g) => { g.scale(size / 64, size / 64); G[name](g, 64); }); return c; });
}
export function bareGlyphUrl(name, size = 20) { return iconUrl(bareGlyph(name, size * 2)); }

// ───── соответствия ─────
export const STAT_GLYPH = { coin: 'coins', buff: 'arrowup', dmg: 'dmg', rate: 'rate', range: 'range', splash: 'blast', chains: 'chain', pierce: 'pierce', critMult: 'skull', execute: 'skull', slow: 'frost', freeze: 'frost', brittle: 'frost', shatter: 'frost', poison: 'poison', stacks: 'poison', plague: 'poison', shred: 'poison', orbit: 'dmg', bounce: 'dmg', stun: 'rate', cleave: 'dmg', rateBuff: 'banner', dmgBuff: 'banner', mark: 'skull', cluster: 'blast', mines: 'blast', airMul: 'dmg', gMul: 'dmg', stunT: 'rate', push: 'vortex', bleed: 'poison', twice: 'dmg', aura: 'frost', fire: 'fire', burn: 'fire', spread: 'fire', trail: 'fire', pull: 'vortex', collapseMult: 'vortex', anchor: 'chain', heavyMult: 'crown', armorPierce: 'pierce', income: 'coins', bonus: 'coins', cap: 'coins' };
export const SPELL_GLYPH = { meteor: 'meteor', stasis: 'stasis', rush: 'rush' };
export const PERK_GLYPH = { treasury: 'coins', fortress: 'heart', taxes: 'chart', temper: 'dmg', greed: 'bag', luck: 'gold', merchant: 'scales', aim: 'skull', wisdom: 'book' };
export const ACH_GLYPH = {
  first_blood: 'skull', hundred: 'skull', thousand: 'dmg', ten_k: 'horns', decap: 'dmg', lumberjack: 'dmg', sculptor: 'frost', storm: 'chain', starfall: 'meteor', birds: 'wing', burn: 'fire',
  butcher: 'goblin', lich_slayer: 'skull', demon_slayer: 'horns', bags: 'bag', bags500: 'bag', scrooge: 'coins', mine_king: 'pickaxe', gold_lvl: 'pickaxe', tycoon: 'chart', devil_deal: 'horde',
  collector: 'tower', master: 'star', both_ways: 'fork', impatient: 'fast', wave10: 'flag', wave20: 'flag', win: 'crown', hell_win: 'horns', flawless: 'shield', grim: 'dmg', all_maps: 'map', arsenal: 'tower', tempered: 'book',
  hardcore_win: 'horns', levels10: 'map', levels_all: 'map', score_40: 'star', score_150: 'crown',
};
