// Процедурные спрайты врагов (кадры ходьбы) и кусков тел для расчленёнки.
import { SPR, img, dropImg, enemyFile } from './sprites.js?v=20261030153315';
import { OUT, S, mk, cached, dropCache, shade, rgba, lin, rad, rrect, ell, circ, poly, fillStroke, tube, glow, shadowEll, rng } from './art.js?v=20261030153315';

export const FRAMES = 8;
const T2 = Math.PI * 2;

// ───── палитры ─────
export const PAL = {
  grunt:    { skin: '#7ab648', skin2: '#4e8a2c', cloth: '#7a5232', cloth2: '#4a3020', eye: '#ffe23a' },
  skeleton: { skin: '#e8e1cb', skin2: '#b7ae92', cloth: '#6b5a44', cloth2: '#3a2f22', eye: '#ff4a3a' },
  bat:      { skin: '#8a3c60', skin2: '#512240', cloth: '#a8466e', cloth2: '#3a1530', eye: '#ff3a3a' },
  zombie:   { skin: '#9a9c62', skin2: '#666a3e', cloth: '#6e5a3a', cloth2: '#3e3020', eye: '#ff4a3a' },
  hound:    { skin: '#6f7d68', skin2: '#46524a', cloth: '#56624e', cloth2: '#2c342c', eye: '#ff3a3a' },
  slime:    { skin: '#6fd13a', skin2: '#3a8a1c', cloth: '#6fd13a', cloth2: '#3a8a1c', eye: '#ffffff' },
  shaman:   { skin: '#6aa83a', skin2: '#3e6a22', cloth: '#5a3a7a', cloth2: '#2e1c40', eye: '#7aff3a' },
  knight:   { skin: '#6a6e78', skin2: '#3a3e48', cloth: '#7a1c24', cloth2: '#3a0c10', eye: '#4adfff' },
  butcher:  { skin: '#b07a5a', skin2: '#7a4a34', cloth: '#6a4a34', cloth2: '#3a2418', eye: '#ffcf8a' },
  gargoyle: { skin: '#8a8278', skin2: '#5a544c', cloth: '#6a645c', cloth2: '#3a3630', eye: '#ffa83a' },
  berserker: { skin: '#b03030', skin2: '#6a1818', cloth: '#3a3028', cloth2: '#1c1814', eye: '#ffe23a' },
  ogre:     { skin: '#c87a38', skin2: '#8a4a1c', cloth: '#3a3430', cloth2: '#1c1a18', eye: '#ffe27a' },
  reaper:   { skin: '#8ac8c0', skin2: '#3a5a58', cloth: '#2a2040', cloth2: '#120c20', eye: '#4adfff' },
  lich:     { skin: '#9ac8a0', skin2: '#3a6a50', cloth: '#1c5a44', cloth2: '#0c2a20', eye: '#7aff3a' },
  demon:    { skin: '#a8382a', skin2: '#5a1810', cloth: '#7a2a20', cloth2: '#2a0c08', eye: '#ffc83a' },
};
PAL.slimelet = PAL.slime;
export const BLOOD = {
  red: ['#b3101e', '#e02a3a', '#6a0812'],
  green: ['#5fae2a', '#8fd84a', '#2e6a14'],
  dark: ['#4a0a1c', '#7a1630', '#220610'],
  bone: ['#8a1018', '#c8c0a8', '#4a0a10'],
  ooze: ['#6fd13a', '#b6f070', '#3a8a1c'],
  ichor: ['#6a1f9a', '#b050e0', '#2e0a4a'],
  ice: ['#8fc8e8', '#e4f6ff', '#3c6e94'],
  sand: ['#b88e4e', '#e2c488', '#7a5a2c'],
};

// ───── головы ─────
function eye(g, x, y, r, col, pupil = true) {
  circ(g, x, y, r); fillStroke(g, col, 0.8);
  if (pupil) { g.fillStyle = OUT; circ(g, x + r * 0.25, y, r * 0.45); g.fill(); }
}
const HEADS = {
  goblin(g, x, y, r, p) {
    // ухо назад
    poly(g, [[x - r * 0.6, y - r * 0.3], [x - r * 2.0, y - r * 1.2], [x - r * 0.9, y + r * 0.35]]); fillStroke(g, p.skin2, 1.1);
    circ(g, x, y, r); fillStroke(g, rad(g, x - r * 0.3, y - r * 0.4, 1, r * 1.4, [[0, shade(p.skin, 0.3)], [1, p.skin2]]), 1.3);
    poly(g, [[x + r * 0.85, y - r * 0.1], [x + r * 1.6, y + r * 0.35], [x + r * 0.8, y + r * 0.55]]); fillStroke(g, p.skin, 1);
    eye(g, x + r * 0.35, y - r * 0.2, r * 0.36, p.eye);
    g.strokeStyle = OUT; g.lineWidth = 1; g.beginPath(); g.moveTo(x + r * 0.1, y + r * 0.55); g.lineTo(x + r * 0.9, y + r * 0.62); g.stroke();
    poly(g, [[x + r * 0.45, y + r * 0.58], [x + r * 0.6, y + r * 0.58], [x + r * 0.53, y + r * 0.9]]); fillStroke(g, '#fff', 0.5);
    g.strokeStyle = OUT; g.lineWidth = 1; g.beginPath(); g.moveTo(x - r * 0.1, y - r * 0.75); g.lineTo(x + r * 0.75, y - r * 0.5); g.stroke();
  },
  ghoul(g, x, y, r, p) {
    for (let i = 0; i < 4; i++) { tube(g, x - r * 0.8 + i * r * 0.3, y - r * 0.8, x - r * 1.4 + i * r * 0.2, y - r * 1.4, 0.9, '#3a3236', 0.5); }
    ell(g, x, y, r * 1.05, r * 1.15); fillStroke(g, rad(g, x - r * 0.3, y - r * 0.4, 1, r * 1.6, [[0, shade(p.skin, 0.25)], [1, p.skin2]]), 1.3);
    ell(g, x + r * 0.9, y + r * 0.35, r * 0.55, r * 0.4); fillStroke(g, p.skin, 1);
    eye(g, x + r * 0.35, y - r * 0.15, r * 0.34, p.eye, false); glow(g, x + r * 0.35, y - r * 0.15, r * 0.9, '#ff2a2a', 0.5);
    g.strokeStyle = OUT; g.lineWidth = 1; g.beginPath(); g.moveTo(x + r * 0.4, y + r * 0.62); g.lineTo(x + r * 1.3, y + r * 0.62); g.stroke();
    for (let i = 0; i < 3; i++) { poly(g, [[x + r * (0.55 + i * 0.25), y + r * 0.62], [x + r * (0.67 + i * 0.25), y + r * 0.62], [x + r * (0.61 + i * 0.25), y + r * 0.95]]); fillStroke(g, '#f2ead0', 0.4); }
  },
  orc(g, x, y, r, p) {
    circ(g, x, y, r); fillStroke(g, rad(g, x - r * 0.3, y - r * 0.4, 1, r * 1.5, [[0, shade(p.skin, 0.3)], [1, p.skin2]]), 1.4);
    rrect(g, x - r * 0.2, y + r * 0.2, r * 1.3, r * 0.85, r * 0.3); fillStroke(g, p.skin2, 1.2);
    for (const dx of [0.2, 0.85]) { poly(g, [[x + r * dx, y + r * 0.3], [x + r * (dx + 0.18), y + r * 0.3], [x + r * (dx + 0.09), y - r * 0.4]]); fillStroke(g, '#f4ecd4', 0.8); }
    eye(g, x + r * 0.4, y - r * 0.2, r * 0.3, p.eye, false); g.fillStyle = '#c1121f'; circ(g, x + r * 0.45, y - r * 0.2, r * 0.13); g.fill();
    g.strokeStyle = OUT; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - r * 0.05, y - r * 0.65); g.lineTo(x + r * 0.9, y - r * 0.4); g.stroke();
  },
  skull(g, x, y, r, p) {
    circ(g, x, y, r); fillStroke(g, rad(g, x - r * 0.3, y - r * 0.4, 1, r * 1.5, [[0, '#fffbe8'], [1, p.skin2]]), 1.3);
    rrect(g, x - r * 0.35, y + r * 0.55, r * 1.3, r * 0.75, r * 0.2); fillStroke(g, p.skin, 1.1);
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.7; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x + r * (0.0 + i * 0.28), y + r * 0.6); g.lineTo(x + r * (0.0 + i * 0.28), y + r * 1.2); g.stroke(); }
    g.fillStyle = '#0a0406'; ell(g, x + r * 0.45, y - r * 0.05, r * 0.32, r * 0.4); g.fill();
    glow(g, x + r * 0.45, y - r * 0.05, r * 0.7, p.eye, 0.9);
    poly(g, [[x + r * 0.95, y + r * 0.2], [x + r * 1.1, y + r * 0.5], [x + r * 0.8, y + r * 0.5]]); fillStroke(g, '#1a0b10', 0.6);
  },
  knight(g, x, y, r, p) {
    // шлем
    circ(g, x, y, r * 1.05); fillStroke(g, lin(g, x - r, y - r, x + r, y + r, [[0, shade(p.skin, 0.4)], [0.5, p.skin], [1, p.skin2]]), 1.5);
    // гребень
    g.beginPath(); g.moveTo(x - r * 0.9, y - r * 0.4); g.quadraticCurveTo(x - r * 0.3, y - r * 1.9, x + r * 0.5, y - r * 1.0); g.lineTo(x + r * 0.2, y - r * 0.8); g.quadraticCurveTo(x - r * 0.3, y - r * 1.3, x - r * 0.7, y - r * 0.2); g.closePath(); fillStroke(g, p.cloth, 1);
    rrect(g, x + r * 0.05, y - r * 0.3, r * 1.0, r * 0.38, r * 0.15); fillStroke(g, '#0a0a12', 0.9);
    glow(g, x + r * 0.6, y - r * 0.12, r * 0.8, p.eye, 0.95);
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x + r * 0.5, y + r * 0.1); g.lineTo(x + r * 0.5, y + r * 0.9); g.stroke();
  },
  hood(g, x, y, r, p) {
    g.beginPath(); g.moveTo(x - r * 1.3, y + r * 1.4); g.quadraticCurveTo(x - r * 1.5, y - r * 1.6, x + r * 0.3, y - r * 1.6); g.quadraticCurveTo(x + r * 1.5, y - r * 1.0, x + r * 1.1, y + r * 0.7); g.closePath();
    fillStroke(g, lin(g, x - r, y - r, x + r, y + r, [[0, shade(p.cloth, 0.2)], [1, p.cloth2]]), 1.4);
    ell(g, x + r * 0.35, y - r * 0.1, r * 0.72, r * 0.85); fillStroke(g, '#07040a', 0.8);
    g.fillStyle = p.eye; glow(g, x + r * 0.5, y - r * 0.15, r * 0.9, p.eye, 0.9);
    circ(g, x + r * 0.55, y - r * 0.15, r * 0.14); g.fill(); circ(g, x + r * 0.05, y - r * 0.15, r * 0.14); g.fill();
  },
  horned(g, x, y, r, p) {
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * r * 0.35 - r * 0.1, y - r * 0.7); g.quadraticCurveTo(x + s * r * 1.0 - r * 0.2, y - r * 1.5, x + s * r * 1.25 - r * 0.3, y - r * 1.9); g.quadraticCurveTo(x + s * r * 0.55, y - r * 1.1, x + s * r * 0.7, y - r * 0.5); g.closePath(); fillStroke(g, '#efe6cc', 1); }
    HEADS.orc(g, x, y, r, p);
    g.strokeStyle = '#f4eed8'; g.lineWidth = 1.2; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x - r * 0.4 + i * r * 0.3, y - r * 0.9); g.lineTo(x - r * 0.1 + i * r * 0.3, y - r * 0.2); g.stroke(); }
  },
  demon(g, x, y, r, p) {
    for (const s of [0, 1]) { g.beginPath(); g.moveTo(x - r * 0.2 + s * r * 0.6, y - r * 0.7); g.quadraticCurveTo(x - r * 0.9 + s * r * 1.0, y - r * 2.0, x - r * 0.2 + s * r * 1.3, y - r * 2.4); g.quadraticCurveTo(x + s * r * 0.5, y - r * 1.2, x + s * r * 0.9, y - r * 0.5); g.closePath(); fillStroke(g, '#2a0a0c', 1.1); }
    HEADS.orc(g, x, y, r, { ...p, eye: p.eye });
    glow(g, x + r * 0.4, y - r * 0.2, r * 0.9, '#ffb02a', 0.8);
  },
  crown(g, x, y, r, p) {
    HEADS.skull(g, x, y, r, p);
    poly(g, [[x - r * 0.7, y - r * 0.8], [x - r * 0.7, y - r * 1.7], [x - r * 0.3, y - r * 1.2], [x, y - r * 1.9], [x + r * 0.3, y - r * 1.2], [x + r * 0.7, y - r * 1.7], [x + r * 0.7, y - r * 0.8]]);
    fillStroke(g, lin(g, 0, y - r * 1.9, 0, y - r * 0.8, [[0, '#ffe27a'], [1, '#b8821a']]), 1.1);
  },
};

// ───── оружие/предметы в руке ─────
const WEAPONS = {
  club(g, x, y, a, s) { g.save(); g.translate(x, y); g.rotate(a); tube(g, 0, 0, 14 * s, 0, 3.2 * s, '#8a5a2b', 1); circ(g, 14 * s, 0, 4.6 * s); fillStroke(g, lin(g, 0, -4, 0, 4, [[0, '#a8743a'], [1, '#5a3818']]), 1.2); for (const [dx, dy] of [[12, -4], [16, -3], [15, 3.5]]) { poly(g, [[dx * s - 1, dy * s], [dx * s + 1, dy * s], [dx * s, (dy + Math.sign(dy) * 3) * s]]); fillStroke(g, '#c9ced6', 0.5); } g.restore(); },
  dagger(g, x, y, a, s) { g.save(); g.translate(x, y); g.rotate(a); tube(g, -2, 0, 3 * s, 0, 2.4 * s, '#5a3a22', 0.8); poly(g, [[3 * s, -2.2 * s], [13 * s, 0], [3 * s, 2.2 * s]]); fillStroke(g, lin(g, 0, -2, 0, 2, [[0, '#f0f4fa'], [1, '#8f98a8']]), 0.9); g.restore(); },
  sword(g, x, y, a, s) { g.save(); g.translate(x, y); g.rotate(a); tube(g, -2, 0, 3 * s, 0, 2.6 * s, '#3a2a22', 0.8); tube(g, 3 * s, -4 * s, 3 * s, 4 * s, 2 * s, '#b0b8c4', 0.7); poly(g, [[4 * s, -2 * s], [19 * s, 0], [4 * s, 2 * s]]); fillStroke(g, lin(g, 0, -2, 0, 2, [[0, '#f4f8ff'], [1, '#8a93a4']]), 1); g.restore(); },
  rustsword(g, x, y, a, s) { g.save(); g.translate(x, y); g.rotate(a); tube(g, -2, 0, 3 * s, 0, 2.2 * s, '#4a3a2a', 0.7); poly(g, [[3 * s, -2 * s], [14 * s, -0.5 * s], [16 * s, 1 * s], [3 * s, 2 * s]]); fillStroke(g, lin(g, 0, -2, 0, 2, [[0, '#b4a58a'], [1, '#6a4a30']]), 0.9); g.restore(); },
  axe(g, x, y, a, s) { g.save(); g.translate(x, y); g.rotate(a); tube(g, -3, 0, 13 * s, 0, 2.4 * s, '#6a4a2a', 0.8); g.beginPath(); g.moveTo(11 * s, -1 * s); g.quadraticCurveTo(14 * s, -9 * s, 19 * s, -7 * s); g.lineTo(18 * s, 6 * s); g.quadraticCurveTo(14 * s, 8 * s, 11 * s, 1 * s); g.closePath(); fillStroke(g, lin(g, 11, -8, 19, 6, [[0, '#e8edf4'], [1, '#6c7584']]), 1); g.restore(); },
  cleaver(g, x, y, a, s) { g.save(); g.translate(x, y); g.rotate(a); tube(g, -3, 0, 5 * s, 0, 2.6 * s, '#4a3020', 0.8); rrect(g, 4 * s, -6 * s, 20 * s, 12 * s, 2 * s); fillStroke(g, lin(g, 0, -6, 0, 6, [[0, '#dfe5ee'], [1, '#7a8394']]), 1.3); g.fillStyle = 'rgba(160,10,20,0.6)'; for (const dx of [8, 14, 20]) { rrect(g, dx * s, -4 * s, 2 * s, (4 + dx % 3) * s, 1); g.fill(); } circ(g, 8 * s, -2 * s, 1.4 * s); fillStroke(g, '#2a2a30', 0.6); g.restore(); },
  staff(g, x, y, a, s, col = '#7aff4a') { g.save(); g.translate(x, y); g.rotate(a); tube(g, -8 * s, 0, 16 * s, 0, 2.2 * s, '#5a4028', 0.8); glow(g, 19 * s, 0, 10 * s, col, 0.8); circ(g, 19 * s, 0, 4 * s); fillStroke(g, rad(g, 18, -1, 0.5, 5, [[0, '#f4ffe0'], [0.5, col], [1, shade(col, -0.5)]]), 1); g.restore(); },
  scythe(g, x, y, a, s) { g.save(); g.translate(x, y); g.rotate(a); tube(g, -10 * s, 0, 18 * s, 0, 2 * s, '#4a3a30', 0.8); g.beginPath(); g.moveTo(18 * s, -1); g.quadraticCurveTo(24 * s, -14 * s, 10 * s, -16 * s); g.quadraticCurveTo(20 * s, -10 * s, 14 * s, 0); g.closePath(); fillStroke(g, lin(g, 0, -16, 0, 0, [[0, '#f2f6ff'], [1, '#7a869e']]), 1.1); g.restore(); },
  spear(g, x, y, a, s) { g.save(); g.translate(x, y); g.rotate(a); tube(g, -8 * s, 0, 20 * s, 0, 2 * s, '#7a5a30', 0.7); poly(g, [[19 * s, -3 * s], [28 * s, 0], [19 * s, 3 * s]]); fillStroke(g, '#dfe5ee', 0.9); g.restore(); },
};

// ───── универсальный гуманоид ─────
// o: {p(палитра), head, weapon, s, hunch, fat, hr, armor, cape, arm2 (доп. оружие), longArms}
function humanoid(g, ph, o, cx, cy) {
  const p = o.p, s = o.s || 1, hunch = (o.hunch || 0) * s, w = ph * T2;
  const bob = Math.abs(Math.sin(w)) * 1.6 * s;
  const hipY = cy - 11 * s, shY = cy - 24 * s - bob, hr = (o.hr || 7.5) * s;
  const fat = (o.fat || 1);
  const foot = (a) => ({ x: cx + Math.sin(a) * 6 * s, y: cy - Math.max(0, Math.cos(a)) * 3.4 * s });
  const fb = foot(w + Math.PI), ff = foot(w);
  const legCol = o.legCol || p.cloth2, legCol2 = shade(legCol, -0.25);
  const boot = (f, col) => { ell(g, f.x + 1.5 * s, f.y - 0.5 * s, 4.4 * s, 2.6 * s); fillStroke(g, col, 1.1); };
  // плащ сзади
  if (o.cape) { g.beginPath(); g.moveTo(cx - 3 * s + hunch, shY + 1 * s); g.quadraticCurveTo(cx - 13 * s - Math.sin(w) * 2, shY + 12 * s, cx - 10 * s - Math.sin(w) * 3 * s, cy - 2 * s); g.lineTo(cx - 1 * s, cy - 9 * s); g.closePath(); fillStroke(g, lin(g, cx - 14, 0, cx, 0, [[0, p.cloth2], [1, p.cloth]]), 1.2); }
  // задняя рука
  const sh = { x: cx + hunch, y: shY + 2 * s };
  const armLen = (o.longArms ? 11 : 9) * s;
  const hb = { x: sh.x + Math.sin(w) * 5 * s - 1 * s, y: sh.y + armLen + Math.max(0, Math.cos(w)) * 0.5 };
  tube(g, sh.x - 2 * s, sh.y, hb.x, hb.y, 3.4 * s, o.armCol2 || p.skin2, 1);
  // задняя нога
  tube(g, cx - 1.5 * s, hipY, fb.x, fb.y - 1 * s, 4 * s, legCol2, 1); boot(fb, shade(legCol, -0.35));
  // торс
  const tw = 13 * s * fat, th = 17 * s;
  rrect(g, cx - tw / 2 + hunch * 0.5, shY - 1 * s, tw, th, 4 * s);
  fillStroke(g, lin(g, cx - tw / 2, 0, cx + tw / 2, 0, [[0, shade(o.torso || p.cloth, 0.3)], [0.55, o.torso || p.cloth], [1, shade(o.torso || p.cloth, -0.4)]]), 1.4);
  if (o.armor) { // нагрудник/полосы
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.8;
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(cx - tw / 2 + 1 + hunch * 0.5, shY - 1 * s + i * 4 * s); g.lineTo(cx + tw / 2 - 1 + hunch * 0.5, shY - 1 * s + i * 4 * s); g.stroke(); }
  }
  if (o.ribs) { g.strokeStyle = 'rgba(40,30,20,0.55)'; g.lineWidth = 1.1; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(cx - 4 * s + hunch * 0.5, shY + (2 + i * 3.2) * s); g.quadraticCurveTo(cx + hunch * 0.5, shY + (4 + i * 3.2) * s, cx + 4 * s + hunch * 0.5, shY + (2 + i * 3.2) * s); g.stroke(); } tube(g, cx + hunch * 0.5, shY, cx + hunch * 0.5, shY + th - 2 * s, 1.6, '#cfc6aa', 0.4); }
  // пояс
  g.fillStyle = shade(o.belt || '#2a1a10', 0); g.fillRect(cx - tw / 2 + 0.5 + hunch * 0.5, shY + th - 5 * s, tw - 1, 2.4 * s); circ(g, cx + hunch * 0.5, shY + th - 3.8 * s, 1.5 * s); fillStroke(g, '#d4a838', 0.5);
  // передняя нога
  tube(g, cx + 1.5 * s, hipY, ff.x, ff.y - 1 * s, 4.2 * s, legCol, 1); boot(ff, shade(legCol, -0.2));
  // плечевая накладка
  if (o.pad) { circ(g, sh.x - 1 * s, sh.y + 1 * s, 4.6 * s); fillStroke(g, lin(g, 0, sh.y - 4, 0, sh.y + 6, [[0, shade(o.pad, 0.3)], [1, shade(o.pad, -0.3)]]), 1.2); if (o.padSpike) poly(g, [[sh.x - 3 * s, sh.y - 2 * s], [sh.x, sh.y - 9 * s], [sh.x + 2 * s, sh.y - 2 * s]]), fillStroke(g, '#c9ced6', 0.7); }
  // голова
  const hx = cx + (hunch + 1.5 * s), hy = shY - hr * 0.55 - 1 * s;
  HEADS[o.head](g, hx, hy, hr, p);
  // передняя рука + оружие
  const hf = { x: sh.x + 4 * s + Math.sin(w + Math.PI) * 4 * s, y: sh.y + armLen - 1 * s };
  const wa = o.wAngle !== undefined ? o.wAngle : -0.55 + Math.sin(w) * 0.25;
  tube(g, sh.x + 1 * s, sh.y, hf.x, hf.y, 3.6 * s, o.armCol || p.skin, 1);
  if (o.weapon) WEAPONS[o.weapon](g, hf.x, hf.y, wa, s * (o.ws || 1), o.wcol);
  circ(g, hf.x, hf.y, 2.4 * s); fillStroke(g, o.armCol || p.skin, 0.9);
  if (o.shield) { g.beginPath(); g.moveTo(hf.x - 2 * s, hf.y - 8 * s); g.lineTo(hf.x + 6 * s, hf.y - 6 * s); g.lineTo(hf.x + 5 * s, hf.y + 5 * s); g.lineTo(hf.x + 1 * s, hf.y + 9 * s); g.lineTo(hf.x - 3 * s, hf.y + 4 * s); g.closePath(); fillStroke(g, lin(g, hf.x - 3, 0, hf.x + 6, 0, [[0, '#6a7080'], [1, '#2e323c']]), 1.3); tube(g, hf.x + 1.5 * s, hf.y - 6 * s, hf.x + 1.5 * s, hf.y + 6 * s, 1.6 * s, o.p.cloth, 0.5); }
  return { hx, hy, hr, shY, th, tw, sh };
}

// ───── не-гуманоиды ─────
function slime(g, ph, p, s) {
  const w = ph * T2, cx = 32, cy = 52;
  const sq = Math.sin(w) * 0.12;
  const bw = 17 * s * (1 + sq), bh = 17 * s * (1 - sq);
  g.beginPath(); g.moveTo(cx - bw, cy);
  g.bezierCurveTo(cx - bw * 1.1, cy - bh * 0.9, cx - bw * 0.5, cy - bh * 1.15, cx, cy - bh * 1.1);
  g.bezierCurveTo(cx + bw * 0.6, cy - bh * 1.15, cx + bw * 1.15, cy - bh * 0.8, cx + bw, cy);
  g.bezierCurveTo(cx + bw * 0.5, cy + 3 * s, cx - bw * 0.5, cy + 3 * s, cx - bw, cy); g.closePath();
  fillStroke(g, rad(g, cx - bw * 0.3, cy - bh * 0.7, 1, bw * 1.6, [[0, '#c8ff9a'], [0.45, p.skin], [1, p.skin2]]), 1.5);
  // пузыри и «проглоченная» косточка
  g.fillStyle = 'rgba(255,255,255,0.22)'; for (const [dx, dy, r] of [[-6, -6, 2.4], [5, -3, 1.8], [-2, -11, 1.4]]) { circ(g, cx + dx * s, cy + dy * s, r * s); g.fill(); }
  tube(g, cx - 5 * s, cy - 3 * s, cx + 3 * s, cy - 6 * s, 1.6 * s, 'rgba(240,235,215,0.55)', 0.3);
  // блик
  g.beginPath(); g.ellipse(cx - bw * 0.45, cy - bh * 0.75, 3.5 * s, 1.8 * s, -0.6, 0, T2); g.fillStyle = 'rgba(255,255,255,0.65)'; g.fill();
  // глаза
  eye(g, cx + 4 * s, cy - bh * 0.5, 3 * s, '#fff'); eye(g, cx + 10 * s, cy - bh * 0.48, 2.4 * s, '#fff');
  g.strokeStyle = OUT; g.lineWidth = 1.1; g.beginPath(); g.arc(cx + 8 * s, cy - bh * 0.25, 3 * s, 0.2, Math.PI - 0.2); g.stroke();
}
function bat(g, ph, p, s) {
  const w = ph * T2, cx = 32, cy = 34;
  const flap = Math.sin(w);
  const wing = (back) => {
    const k = back ? 0.7 : 1;
    const tipY = cy - 6 - flap * 20 * s * k, tipX = cx + (back ? -16 : -18) * s - (back ? 0 : 0);
    g.beginPath(); g.moveTo(cx - 2 * s, cy - 2 * s);
    g.quadraticCurveTo(cx - 10 * s, tipY - 6 * s, tipX - 8 * s, tipY);
    g.lineTo(tipX - 3 * s, tipY + 8 * s); g.quadraticCurveTo(tipX + 2 * s, tipY + 4 * s, tipX + 2 * s, tipY + 12 * s);
    g.quadraticCurveTo(cx - 8 * s, cy + 6 * s - flap * 4 * s, cx - 2 * s, cy + 3 * s); g.closePath();
    fillStroke(g, back ? shade(p.cloth, -0.35) : lin(g, tipX, 0, cx, 0, [[0, shade(p.cloth, -0.3)], [1, p.cloth]]), 1.3);
    g.strokeStyle = shade(p.skin2, -0.2); g.lineWidth = 1; g.beginPath(); g.moveTo(cx - 2 * s, cy - 2 * s); g.lineTo(tipX - 8 * s, tipY); g.moveTo(cx - 2 * s, cy - 1 * s); g.lineTo(tipX - 3 * s, tipY + 8 * s); g.stroke();
  };
  wing(true);
  ell(g, cx, cy, 8 * s, 6.5 * s, -0.2); fillStroke(g, rad(g, cx - 2, cy - 3, 1, 10 * s, [[0, shade(p.skin, 0.35)], [1, p.skin2]]), 1.3);
  // голова
  circ(g, cx + 8 * s, cy - 3 * s, 5.6 * s); fillStroke(g, rad(g, cx + 6, cy - 6, 1, 8 * s, [[0, shade(p.skin, 0.35)], [1, p.skin2]]), 1.3);
  poly(g, [[cx + 5 * s, cy - 7 * s], [cx + 4 * s, cy - 14 * s], [cx + 8 * s, cy - 8 * s]]); fillStroke(g, p.skin2, 1);
  poly(g, [[cx + 9 * s, cy - 8 * s], [cx + 11 * s, cy - 14 * s], [cx + 12 * s, cy - 6 * s]]); fillStroke(g, p.skin, 1);
  glow(g, cx + 10 * s, cy - 4 * s, 4 * s, '#ff2a2a', 0.8); circ(g, cx + 10 * s, cy - 4 * s, 1.5 * s); g.fillStyle = '#ffd0d0'; g.fill();
  poly(g, [[cx + 12 * s, cy - 1 * s], [cx + 14 * s, cy + 3 * s], [cx + 10 * s, cy]]); fillStroke(g, '#fff', 0.6);
  poly(g, [[cx + 8 * s, cy], [cx + 9 * s, cy + 3.5 * s], [cx + 6.5 * s, cy + 0.5 * s]]); fillStroke(g, '#fff', 0.6);
  // лапки
  tube(g, cx - 2 * s, cy + 5 * s, cx - 3 * s, cy + 10 * s, 1.6 * s, p.skin2, 0.6); tube(g, cx + 2 * s, cy + 5 * s, cx + 3 * s, cy + 10 * s, 1.6 * s, p.skin2, 0.6);
  wing(false);
}
function gargoyle(g, ph, p, s) {
  const w = ph * T2, cx = 32, cy = 36, flap = Math.sin(w);
  const wing = (back) => {
    const tipY = cy - 10 - flap * 18 * s * (back ? 0.7 : 1), tipX = cx - 22 * s;
    g.beginPath(); g.moveTo(cx - 3 * s, cy - 6 * s); g.quadraticCurveTo(cx - 12 * s, tipY - 8 * s, tipX, tipY);
    g.lineTo(tipX + 6 * s, tipY + 9 * s); g.lineTo(tipX + 10 * s, tipY + 5 * s); g.lineTo(tipX + 13 * s, tipY + 14 * s); g.lineTo(cx - 4 * s, cy + 4 * s); g.closePath();
    fillStroke(g, back ? shade(p.skin2, -0.2) : lin(g, tipX, 0, cx, 0, [[0, p.skin2], [1, p.skin]]), 1.4);
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(cx - 3 * s, cy - 6 * s); g.lineTo(tipX + 6 * s, tipY + 9 * s); g.moveTo(cx - 3 * s, cy - 5 * s); g.lineTo(tipX + 13 * s, tipY + 14 * s); g.stroke();
  };
  wing(true);
  // торс
  ell(g, cx, cy, 8.5 * s, 10 * s, 0.1); fillStroke(g, lin(g, cx - 8, 0, cx + 8, 0, [[0, shade(p.skin, 0.3)], [1, p.skin2]]), 1.5);
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.8; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(cx + 1, cy - 4 * s + i * 4 * s, 4 * s, 0.2, Math.PI - 0.2); g.stroke(); }
  // ноги-когти
  tube(g, cx - 2 * s, cy + 8 * s, cx - 4 * s, cy + 16 * s, 3 * s, p.skin2, 1); tube(g, cx + 3 * s, cy + 8 * s, cx + 5 * s, cy + 16 * s, 3 * s, p.skin, 1);
  // голова
  const hx = cx + 6 * s, hy = cy - 13 * s;
  for (const dx of [-1, 3]) { poly(g, [[hx + dx * s, hy - 4 * s], [hx + (dx - 1.5) * s, hy - 12 * s], [hx + (dx + 2.5) * s, hy - 5 * s]]); fillStroke(g, '#4a4e5a', 1); }
  circ(g, hx, hy, 6.6 * s); fillStroke(g, rad(g, hx - 2, hy - 3, 1, 9 * s, [[0, shade(p.skin, 0.35)], [1, p.skin2]]), 1.4);
  g.strokeStyle = OUT; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx - 1 * s, hy - 3.5 * s); g.lineTo(hx + 6 * s, hy - 1.5 * s); g.stroke();
  glow(g, hx + 3 * s, hy - 1 * s, 5 * s, p.eye, 0.9); circ(g, hx + 3 * s, hy - 1 * s, 1.5 * s); g.fillStyle = '#fff0c0'; g.fill();
  rrect(g, hx + 1 * s, hy + 2 * s, 6 * s, 3 * s, 1); fillStroke(g, '#2a2e36', 0.8);
  for (let i = 0; i < 3; i++) { poly(g, [[hx + (2 + i * 1.8) * s, hy + 3 * s], [hx + (3 + i * 1.8) * s, hy + 3 * s], [hx + (2.5 + i * 1.8) * s, hy + 5.5 * s]]); fillStroke(g, '#fff', 0.4); }
  // рука
  tube(g, cx + 2 * s, cy - 6 * s, cx + 8 * s, cy + 3 * s, 3.2 * s, p.skin, 1);
  wing(false);
}
function reaper(g, ph, p, s) {
  const w = ph * T2, cx = 30, cy = 54;
  const sway = Math.sin(w) * 2 * s, bob = Math.sin(w) * 1.8;
  g.beginPath(); g.moveTo(cx - 10 * s + sway * 0.3, cy - 30 * s + bob);
  g.quadraticCurveTo(cx - 16 * s, cy - 8 * s, cx - 13 * s + sway, cy + 2 * s);
  for (let i = 0; i < 5; i++) g.lineTo(cx - 13 * s + sway + (i + 0.5) * 5.6 * s, cy + (i % 2 ? -3 : 3 + Math.sin(w + i) * 1.5) * s);
  g.quadraticCurveTo(cx + 15 * s, cy - 8 * s, cx + 8 * s, cy - 28 * s + bob); g.closePath();
  fillStroke(g, lin(g, cx - 12, cy - 30, cx + 14, cy + 4, [[0, shade(p.cloth, 0.35)], [0.5, p.cloth], [1, p.cloth2]]), 1.4);
  g.strokeStyle = 'rgba(120,100,200,0.35)'; g.lineWidth = 0.9; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(cx - 3 * s + i * 4 * s, cy - 22 * s + bob); g.quadraticCurveTo(cx - 5 * s + i * 4 * s + sway, cy - 8 * s, cx - 4 * s + i * 4 * s + sway, cy); g.stroke(); }
  HEADS.hood(g, cx + 3 * s, cy - 30 * s + bob, 7.4 * s, p);
  const hx = cx + 10 * s, hy = cy - 14 * s + bob * 0.5;
  tube(g, cx + 2 * s, cy - 22 * s + bob, hx, hy, 3 * s, p.skin2, 1);
  WEAPONS.scythe(g, hx, hy, -1.25 + Math.sin(w) * 0.1, s * 1.05);
  circ(g, hx, hy, 2.2 * s); fillStroke(g, p.skin, 0.8);
}

// ───── боссы ─────
function ogre(g, ph) {
  const w = ph * T2, sw = Math.sin(w), bob = Math.abs(sw) * 2.6;
  const skin = PAL.ogre.skin, skin2 = PAL.ogre.skin2;
  // задняя рука
  tube(g, 38, 66 - bob, 28 + sw * 3, 94, 12, skin2, 1.6); circ(g, 28 + sw * 3, 96, 7.5); fillStroke(g, shade(skin2, -0.1), 1.4);
  // ноги
  const lf = [Math.max(0, sw) * 5, Math.max(0, -sw) * 5];
  [[47, 0], [78, 1]].forEach(([x, i]) => {
    rrect(g, x - 9, 94, 18, 22 - lf[i], 6); fillStroke(g, lin(g, x - 9, 0, x + 9, 0, [[0, '#7a4e38'], [1, '#3c241a']]), 1.6);
    ell(g, x + 3, 116 - lf[i], 12, 5.5); fillStroke(g, '#2e1a12', 1.5);
    for (const dx of [-2, 4, 10]) { circ(g, x + dx, 114 - lf[i], 1.6); fillStroke(g, '#e8e0c8', 0.5); }
  });
  // туловище
  ell(g, 62, 76 - bob * 0.4, 31, 29); fillStroke(g, lin(g, 32, 50, 94, 100, [[0, shade(skin, 0.3)], [0.55, skin], [1, skin2]]), 2);
  ell(g, 68, 88 - bob * 0.3, 21, 17); fillStroke(g, lin(g, 48, 70, 88, 100, [[0, shade(skin, 0.4)], [1, shade(skin, -0.1)]]), 1.4);
  circ(g, 72, 90 - bob * 0.3, 2.2); fillStroke(g, '#6a3a22', 0.9);
  // шрамы и швы
  g.strokeStyle = '#7a2a22'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(46, 62); g.lineTo(56, 74); g.stroke(); for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(48 + i * 3 - 2, 65 + i * 3 + 2); g.lineTo(50 + i * 3 + 2, 65 + i * 3 - 1); g.stroke(); }
  // фартук
  g.beginPath(); g.moveTo(48, 92 - bob * 0.3); g.lineTo(84, 92 - bob * 0.3); g.lineTo(82, 110); g.lineTo(76, 104); g.lineTo(70, 112); g.lineTo(63, 104); g.lineTo(56, 112); g.lineTo(50, 106); g.closePath();
  fillStroke(g, lin(g, 0, 92, 0, 112, [[0, '#ddd5c2'], [1, '#a89c86']]), 1.5);
  g.fillStyle = 'rgba(150,10,20,0.8)'; for (const [x, y, ww, hh] of [[52, 94, 5, 11], [62, 93, 4, 14], [72, 95, 6, 9], [78, 93, 3, 12]]) { rrect(g, x, y, ww, hh, 2); g.fill(); }
  // цепь и шипастый наплечник
  g.strokeStyle = '#a0a6b2'; g.lineWidth = 2.6; g.setLineDash([3.4, 2.2]); g.beginPath(); g.moveTo(40, 58); g.quadraticCurveTo(62, 90, 90, 60); g.stroke(); g.setLineDash([]);
  circ(g, 40, 62 - bob, 9.5); fillStroke(g, lin(g, 32, 54, 48, 72, [[0, '#9aa2b0'], [1, '#3a3e48']]), 1.6);
  for (const [dx, dy] of [[-4, -8], [2, -10], [7, -6]]) { poly(g, [[40 + dx - 2, 62 - bob + dy + 4], [40 + dx, 62 - bob + dy - 5], [40 + dx + 2, 62 - bob + dy + 4]]); fillStroke(g, '#d6dbe4', 0.8); }
  // голова
  const hy = 42 - bob * 0.6;
  circ(g, 62, hy + 3, 12); fillStroke(g, skin2, 0); // шея-тень
  poly(g, [[48, hy - 2], [38, hy - 12], [50, hy - 8]]); fillStroke(g, skin2, 1.3);
  circ(g, 66, hy, 17.5); fillStroke(g, rad(g, 60, hy - 6, 2, 26, [[0, shade(skin, 0.35)], [1, skin2]]), 2);
  rrect(g, 56, hy + 5, 28, 14, 6); fillStroke(g, lin(g, 0, hy + 5, 0, hy + 19, [[0, skin2], [1, shade(skin2, -0.25)]]), 1.6);
  for (const x of [60, 78]) { poly(g, [[x, hy + 8], [x + 4.4, hy + 8], [x + 2.2, hy - 4]]); fillStroke(g, '#f5eed8', 1.1); }
  g.strokeStyle = OUT; g.lineWidth = 2.4; g.beginPath(); g.moveTo(58, hy - 8); g.lineTo(82, hy - 4); g.stroke();
  eye(g, 74, hy - 2.5, 4.2, '#ffd23a', false); g.fillStyle = '#c1121f'; circ(g, 75.2, hy - 2.5, 1.8); g.fill(); glow(g, 74, hy - 2.5, 9, '#ff4a1a', 0.5);
  circ(g, 83, hy + 2, 2.6); fillStroke(g, shade(skin, -0.1), 0.9);
  // ирокез
  for (let i = 0; i < 4; i++) { poly(g, [[52 + i * 6, hy - 14 + i * 0.8], [54 + i * 6, hy - 25 + (i % 2) * 3], [58 + i * 6, hy - 14]]); fillStroke(g, '#3a1c14', 1); }
  // передняя рука с тесаком
  tube(g, 88, 66 - bob, 104, 48 + sw * 2, 12, skin, 1.7); circ(g, 105, 46 + sw * 2, 7.6); fillStroke(g, skin, 1.4);
  WEAPONS.cleaver(g, 105, 46 + sw * 2, -1.38 + sw * 0.12, 1.5);
}
function lich(g, ph) {
  const s = 1.32, w = ph * T2, cx = 56, cy = 116, bob = Math.sin(w) * 3;
  // парение: тень рисует рендерер
  g.beginPath(); g.moveTo(cx - 14 * s, cy - 56 * s + bob); g.quadraticCurveTo(cx - 24 * s, cy - 20 * s, cx - 22 * s, cy - 2 * s);
  for (let i = 0; i < 7; i++) g.lineTo(cx - 22 * s + (i + 0.5) * 6.4 * s, cy + (i % 2 ? -4 : 3 + Math.sin(w + i) * 2) * s);
  g.quadraticCurveTo(cx + 24 * s, cy - 20 * s, cx + 14 * s, cy - 54 * s + bob); g.closePath();
  fillStroke(g, lin(g, cx - 20, cy - 56, cx + 22, cy, [[0, shade(PAL.lich.cloth, 0.4)], [0.5, PAL.lich.cloth], [1, PAL.lich.cloth2]]), 1.8);
  g.strokeStyle = 'rgba(160,255,160,0.35)'; g.lineWidth = 1.2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(cx - 8 * s + i * 5 * s, cy - 44 * s + bob); g.quadraticCurveTo(cx - 12 * s + i * 5 * s, cy - 20 * s, cx - 10 * s + i * 5 * s, cy); g.stroke(); }
  // рёбра/амулет
  circ(g, cx + 1 * s, cy - 36 * s + bob, 3.6 * s); fillStroke(g, '#7aff7a', 1); glow(g, cx + 1 * s, cy - 36 * s + bob, 10 * s, '#7aff7a', 0.6);
  // руки и посох
  tube(g, cx + 6 * s, cy - 40 * s + bob, cx + 20 * s, cy - 28 * s + bob, 4 * s, PAL.lich.skin2, 1.2);
  tube(g, cx + 22 * s, cy - 6 * s, cx + 22 * s, cy - 60 * s + bob, 2.6 * s, '#4a3a28', 1);
  glow(g, cx + 22 * s, cy - 64 * s + bob, 18 * s, '#7aff4a', 0.85);
  circ(g, cx + 22 * s, cy - 64 * s + bob, 6.4 * s); fillStroke(g, rad(g, cx + 20 * s, cy - 66 * s, 0.5, 8 * s, [[0, '#f4ffe0'], [0.5, '#7aff4a'], [1, '#2a7a1c']]), 1.4);
  circ(g, cx + 20 * s, cy - 28 * s + bob, 3 * s); fillStroke(g, PAL.lich.skin, 1);
  HEADS.crown(g, cx + 3 * s, cy - 48 * s + bob, 8 * s, PAL.lich);
  tube(g, cx - 6 * s, cy - 38 * s + bob, cx - 16 * s, cy - 24 * s + bob, 3.6 * s, PAL.lich.skin2, 1);
}
function demon(g, ph) {
  const w = ph * T2, fl = Math.sin(w), bob = Math.abs(Math.sin(w)) * 2.2;
  const P = PAL.demon, skin = P.skin, skin2 = P.skin2;
  const wing = (side, back) => {
    const X = (x) => (side < 0 ? x : 140 - x);
    const tipY = 20 - fl * 9 * (back ? 0.7 : 1);
    g.beginPath(); g.moveTo(X(58), 64); g.quadraticCurveTo(X(26), 30, X(6), tipY);
    g.lineTo(X(14), tipY + 22); g.lineTo(X(8), tipY + 40); g.lineTo(X(22), tipY + 34); g.lineTo(X(24), tipY + 52); g.lineTo(X(38), tipY + 42); g.lineTo(X(54), 90); g.closePath();
    fillStroke(g, back ? '#3a0910' : lin(g, X(6), 0, X(58), 0, [[0, '#35080e'], [1, '#8c1822']]), 1.8);
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(58), 64); g.lineTo(X(6), tipY); g.moveTo(X(58), 66); g.lineTo(X(14), tipY + 22); g.moveTo(X(56), 70); g.lineTo(X(24), tipY + 52); g.stroke();
  };
  wing(-1, true); wing(1, true);
  // хвост
  g.beginPath(); g.moveTo(60, 100); g.quadraticCurveTo(28, 108, 24, 128); g.lineWidth = 6; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 3.4; g.strokeStyle = skin2; g.stroke();
  poly(g, [[18, 122], [26, 138], [32, 122]]); fillStroke(g, skin, 1.2);
  // ноги
  const lf = [Math.max(0, fl) * 5, Math.max(0, -fl) * 5];
  [[56, 0], [86, 1]].forEach(([x, i]) => {
    g.beginPath(); g.moveTo(x - 11, 96); g.quadraticCurveTo(x - 16, 112 - lf[i], x - 8, 122 - lf[i]); g.lineTo(x + 8, 122 - lf[i]); g.quadraticCurveTo(x + 14, 108, x + 10, 96); g.closePath();
    fillStroke(g, lin(g, x - 12, 0, x + 12, 0, [[0, shade(skin, 0.1)], [1, skin2]]), 1.7);
    poly(g, [[x - 9, 122 - lf[i]], [x - 10, 130 - lf[i]], [x + 10, 130 - lf[i]], [x + 8, 122 - lf[i]]]); fillStroke(g, '#1a0a0c', 1.4);
  });
  // торс
  g.beginPath(); g.moveTo(44, 62 - bob); g.quadraticCurveTo(70, 54 - bob, 96, 62 - bob); g.lineTo(88, 100); g.quadraticCurveTo(70, 106, 52, 100); g.closePath();
  fillStroke(g, lin(g, 44, 60, 96, 100, [[0, shade(skin, 0.28)], [0.5, skin], [1, skin2]]), 2);
  g.strokeStyle = 'rgba(60,0,6,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(70, 62 - bob); g.lineTo(70, 98); g.moveTo(52, 70 - bob); g.quadraticCurveTo(62, 80, 70, 74); g.moveTo(88, 70 - bob); g.quadraticCurveTo(78, 80, 70, 74); for (let i = 0; i < 3; i++) { g.moveTo(58, 82 + i * 6); g.lineTo(82, 82 + i * 6); } g.stroke();
  // набедренная повязка с шипами
  g.beginPath(); g.moveTo(50, 98); g.lineTo(90, 98); g.lineTo(86, 116); g.lineTo(70, 110); g.lineTo(54, 116); g.closePath(); fillStroke(g, '#2a1216', 1.5);
  rrect(g, 48, 94, 44, 7, 2); fillStroke(g, '#3a2218', 1.3); for (let i = 0; i < 6; i++) { poly(g, [[52 + i * 7, 94], [55 + i * 7, 87], [58 + i * 7, 94]]); fillStroke(g, '#c9ced6', 0.7); }
  circ(g, 70, 97, 3.4); fillStroke(g, '#d4a838', 0.9);
  // задняя рука
  tube(g, 46, 68 - bob, 34, 88, 13, skin2, 1.7); circ(g, 33, 92, 8); fillStroke(g, skin2, 1.5);
  circ(g, 44, 64 - bob, 9); fillStroke(g, lin(g, 36, 56, 52, 72, [[0, '#4a2a30'], [1, '#12080a']]), 1.6);
  for (const [dx, dy] of [[-6, -6], [0, -9], [6, -6]]) { poly(g, [[44 + dx - 2, 64 - bob + dy + 3], [44 + dx, 64 - bob + dy - 7], [44 + dx + 2, 64 - bob + dy + 3]]); fillStroke(g, '#c9ced6', 0.7); }
  // голова
  const hy = 44 - bob * 0.6;
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(70 + sx * 6, hy - 10); g.quadraticCurveTo(70 + sx * 20, hy - 18, 70 + sx * 20, hy - 34); g.quadraticCurveTo(70 + sx * 8, hy - 22, 70 + sx * 2, hy - 8); g.closePath(); fillStroke(g, lin(g, 0, hy - 34, 0, hy - 8, [[0, '#f0e6cc'], [1, '#6a5238']]), 1.5); }
  circ(g, 70, hy, 14.5); fillStroke(g, rad(g, 64, hy - 6, 2, 22, [[0, shade(skin, 0.3)], [1, skin2]]), 2);
  rrect(g, 60, hy + 5, 22, 12, 5); fillStroke(g, lin(g, 0, hy + 5, 0, hy + 17, [[0, skin2], [1, shade(skin2, -0.3)]]), 1.5);
  for (const x of [63, 74]) { poly(g, [[x, hy + 8], [x + 3.6, hy + 8], [x + 1.8, hy - 1]]); fillStroke(g, '#f5eed8', 0.9); }
  g.strokeStyle = OUT; g.lineWidth = 2.2; g.beginPath(); g.moveTo(62, hy - 7); g.lineTo(82, hy - 3); g.stroke();
  glow(g, 76, hy - 2, 12, '#ffb02a', 0.9); eye(g, 76, hy - 2, 3.8, '#ffe27a', false); g.fillStyle = '#c1121f'; circ(g, 77, hy - 2, 1.5); g.fill();
  // огненные волосы
  for (let i = 0; i < 5; i++) { const fx = 58 + i * 6, fh = 12 + ((i * 5 + Math.floor(ph * 8)) % 4) * 3; g.beginPath(); g.moveTo(fx - 3, hy - 12); g.quadraticCurveTo(fx - 4, hy - fh * 0.6 - 12, fx + 1 + Math.sin(w + i) * 2, hy - fh - 12); g.quadraticCurveTo(fx + 4, hy - fh * 0.5 - 12, fx + 3, hy - 12); g.closePath(); fillStroke(g, lin(g, 0, hy - fh - 12, 0, hy - 12, [[0, '#ffe27a'], [0.5, '#ff7a1c'], [1, '#c01a0a']]), 0.8); }
  // передняя рука с мечом
  tube(g, 94, 68 - bob, 104, 88, 13, skin, 1.7); circ(g, 105, 90, 8.2); fillStroke(g, skin, 1.5);
  g.save(); g.translate(105, 90); g.rotate(-1.18 + fl * 0.08);
  tube(g, -6, 0, 5, 0, 4, '#2a1a12', 1); rrect(g, 4, -9, 5, 18, 2); fillStroke(g, '#3a3036', 1.2);
  g.beginPath(); g.moveTo(8, -5); g.lineTo(58, -3); g.lineTo(66, 0); g.lineTo(58, 3); g.lineTo(8, 5); g.closePath(); fillStroke(g, lin(g, 0, -5, 0, 5, [[0, '#ffe9a8'], [0.5, '#ff9a2a'], [1, '#b8300c']]), 1.5);
  glow(g, 34, 0, 16, '#ff7a1c', 0.5);
  for (let i = 0; i < 5; i++) { const fx = 12 + i * 10, fh = 7 + ((i * 3 + Math.floor(ph * 8)) % 3) * 4; g.beginPath(); g.moveTo(fx - 3, -4); g.quadraticCurveTo(fx - 4, -fh * 0.6 - 4, fx + 1, -fh - 4); g.quadraticCurveTo(fx + 4, -fh * 0.5 - 4, fx + 3, -4); g.closePath(); g.fillStyle = 'rgba(255,170,40,0.85)'; g.fill(); }
  g.restore();
  wing(-1, false); wing(1, false);
}

// ───── реестр ─────
const H = (o) => (g, ph) => humanoid(g, ph, o, 32, 54);
export const ENEMY_ART = {
  grunt: { size: 64, ax: 32, ay: 54, shadow: 11, draw: H({ p: PAL.grunt, head: 'goblin', weapon: 'dagger', s: 0.92, hr: 8, torso: '#8a5a38', legCol: '#5a3a24' }) },
  skeleton: { size: 64, ax: 32, ay: 54, shadow: 11, draw: H({ p: PAL.skeleton, head: 'skull', weapon: 'rustsword', s: 0.98, hr: 7.4, torso: '#d8cfb4', ribs: true, legCol: '#d4ccb2', armCol: '#d4ccb2', armCol2: '#a89f86', belt: '#4a3a28' }) },
  bat: { size: 64, ax: 32, ay: 40, shadow: 8, draw: (g, ph) => bat(g, ph, PAL.bat, 1.0), air: true },
  zombie: { size: 64, ax: 32, ay: 54, shadow: 11, draw: H({ p: PAL.zombie, head: 'ghoul', weapon: null, s: 0.95, hunch: 3, longArms: true, hr: 7, torso: '#6e5a3a', legCol: '#3e3020', wAngle: 0 }) },
};

// ───── растровые враги: полоса кадров ходьбы из img/enemies/<файл>.webp ─────
// id в игре → [файл, высота на экране в логических px, доп. поля]
const SPRITE_ENEMIES = {
  skeleton: ['skeleton', 44], zombie: ['zombie', 44], goblin: ['goblin', 38], mummy: ['mummy', 46], yeti: ['yeti', 58, { scale: 1.05 }], bat: ['bat', 36, { air: true }],
  hound: ['hound', 40], slime: ['slime', 40], slimelet: ['slime', 24, { scale: 0.6 }], knight: ['knight', 48],
  butcher: ['butcher', 52, { scale: 1.08 }], gargoyle: ['gargoyle', 44, { air: true }],
  berserker: ['berserker', 46], ogre: ['ogre', 56, { scale: 1.1 }], reaper: ['reaper', 44], lich: ['lich', 58],
  anubis: ['anubis', 52], djinn: ['djinn', 50], sandgolem: ['sandgolem', 52], pharaoh: ['pharaoh', 62], wolf: ['wolf', 40], iceskel: ['iceskel', 46], snowgolem: ['snowgolem', 56],
  ultrayeti: ['ultrayeti', 68], imp: ['imp', 40], pinky: ['pinky', 50], lavagolem: ['lavagolem', 58], baron: ['baron', 66],
};
const FALLBACK = { ...ENEMY_ART };                                // запасные рисованные враги (если лист не загрузился)
const ENEMY_K = 0.95;                                              // общий масштаб врагов; у каждого вида свой размер (ref листа × scale): гоблин ~36 px, шаман ~42, зомби и скелет ~42, рыцарь ~46, мясник ~53, огр ~58, владыка ~70 (клетка 48)
const ELITE_RIM = '#e3141f';                                        // усиленные враги обводятся красным
const RIM = { dark: '#1f1014', px: 0.85, boost: 0.08 };           // тонкая тёмная обводка; px — толщина в мировых пикселях; лёгкая подсветка листа
// Лист с обводкой: силуэт кольцом смещений (два кольца, чтобы не было зубцов), поверх — сам лист чуть светлее. Поля между кадрами (5+ px) обводка не пересекает.
function outlineAtlas(im, k) {
  const W = im.naturalWidth, H = im.naturalHeight, r = Math.min(4.6, RIM.px / k), mkc = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const out = mkc(), g = out.getContext('2d'), dark = mkc(), d = dark.getContext('2d');
  d.drawImage(im, 0, 0); d.globalCompositeOperation = 'source-in'; d.fillStyle = RIM.dark; d.fillRect(0, 0, W, H);
  for (const [rr, n] of [[r, 16], [r * 0.6, 10]]) for (let i = 0; i < n; i++) { const a = (i / n) * T2 + (rr === r ? 0 : 0.3); g.drawImage(dark, Math.cos(a) * rr, Math.sin(a) * rr); }
  dark.width = 0;
  g.drawImage(im, 0, 0);
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = RIM.boost; g.drawImage(im, 0, 0);
  return out;
}
const spriteTypes = (types) => Object.keys(SPRITE_ENEMIES).filter((id) => !types || types.includes(id));
export const enemyFiles = (types) => [...new Set(spriteTypes(types).map((id) => SPRITE_ENEMIES[id][0]))];
// Собрать спрайты врагов для перечисленных видов (листы уже загружены: sprites.loadEnemyImgs); без списка — для всех
export function applyEnemySprites(types) {
  if (!SPR.ok) return false;
  for (const id of spriteTypes(types)) {
    const [file, h, extra] = SPRITE_ENEMIES[id];
    if (ENEMY_ART[id] && ENEMY_ART[id].atlas) continue;                  // уже собран
    const m = SPR.enemies[file], im = img(enemyFile(file)); if (!m || !im) continue;
    if (m.anims) {                                              // лист анимаций: ходьба в трёх направлениях, атака, смерть
      const sc = (extra && extra.scale) || 1, k = m.k * sc * ENEMY_K, size = Math.ceil(Math.max(m.cw, m.ch) * k) + 6, ay = size / 2 - (m.ch * k) / 2 + m.ay * k;
      ENEMY_ART[id] = { size, ax: size / 2, ay, shadow: Math.max(9, m.cw * k * 0.3), raster: true, anims: m, atlas: im, atlasO: outlineAtlas(im, k), file, k, air: !!m.air, lift: (m.lift || 0) * sc * ENEMY_K,
        draw(g, ph) { const n = m.rows.walkR.n, i = Math.min(n - 1, Math.floor(ph * n)); drawCell(g, this, 'walkR', i); } };
      continue;
    }
    const w = h * m.w / m.h, size = Math.ceil(Math.max(w, h) + 10), pad = 4;
    ENEMY_ART[id] = {
      size, ax: size / 2, ay: size - pad, shadow: Math.max(9, w * 0.3), raster: true, ...extra, file, atlas: im,
      draw(g, ph) {
        const k = Math.min(m.n - 1, Math.floor(ph * m.n));
        g.imageSmoothingQuality = 'high';
        g.drawImage(im, k * m.w, 0, m.w, m.h, size / 2 - w / 2, size - pad - h, w, h);
      },
    };
  }
  for (const id of spriteTypes(types)) if (!ENEMY_ART[id]) ENEMY_ART[id] = FALLBACK.grunt;      // нет листа — рисуем запасного
  return true;
}
// Освободить листы и кэши видов, которых нет в списке: после боя, при смене уровня
export function releaseEnemies(keep = []) {
  for (const id of Object.keys(SPRITE_ENEMIES)) {
    if (keep.includes(id)) continue;
    const a = ENEMY_ART[id]; if (!a || !a.atlas) { if (!keep.includes(id)) delete ENEMY_ART[id]; continue; }
    if (a.atlasO) a.atlasO.width = 0;
    a.atlas = null; a.atlasO = null; if (a.file) dropImg(enemyFile(a.file));
    delete ENEMY_ART[id];
    dropCache((k) => k.includes(':' + id + ':'));
  }
}

// кадр листа анимаций: anim = walkR | walkD | walkU | attack | death; кадр кладём на холст size×size так, чтобы точка опоры (ноги или центр) была в (ax, ay)
function drawCell(g, a, anim, i) {
  const m = a.anims, r = m.rows[anim]; if (!r) return;
  const k = Math.min(r.n - 1, Math.max(0, i | 0)), x = a.size / 2 - (m.cw * a.k) / 2, y = a.size / 2 - (m.ch * a.k) / 2;
  g.imageSmoothingQuality = 'high'; g.drawImage(a.atlas, k * m.cw, r.row * m.ch, m.cw, m.ch, x, y, m.cw * a.k, m.ch * a.k);
}
// рисует кадр прямо из атласа (без промежуточных канвасов: меньше памяти, нет задержки при первом появлении вида); точка опоры — в (0, 0)
export function drawAnim(g, type, anim, i) {
  const a = ENEMY_ART[type], m = a.anims, r = m.rows[anim]; if (!r) return;
  const k = Math.min(r.n - 1, Math.max(0, i | 0)), w = m.cw * a.k, h = m.ch * a.k;
  g.drawImage(a.atlasO || a.atlas, k * m.cw, r.row * m.ch, m.cw, m.ch, -w / 2, a.size / 2 - h / 2 - a.ay, w, h);
}
export function animFrame(type, anim, i) {
  const a = ENEMY_ART[type]; if (!a.anims || !a.anims.rows[anim]) return null;
  const k = Math.min(a.anims.rows[anim].n - 1, Math.max(0, i | 0));
  return cached(`af:${type}:${anim}:${k}`, () => mk(a.size, a.size, (g) => drawCell(g, a, anim, k)));
}
// Усиленный враг: тот же кадр, но обведён красным вместо тёмного. Кадры собираются при первой встрече и кэшируются (отдельный лист не нужен).
export function eliteFrame(type, anim, i) {
  const a = ENEMY_ART[type]; if (!a.anims || !a.anims.rows[anim]) return null;
  const k = Math.min(a.anims.rows[anim].n - 1, Math.max(0, i | 0));
  return cached(`el:${type}:${anim}:${k}`, () => {
    const base = animFrame(type, anim, k), red = tintCanvas(base, `el:${type}:${anim}:${k}`, ELITE_RIM, 1), r = RIM.px * 1.25;
    return mk(a.size, a.size, (g) => {
      for (const [rr, n] of [[r, 16], [r * 0.6, 10]]) for (let j = 0; j < n; j++) { const an = (j / n) * T2 + (rr === r ? 0 : 0.3); g.drawImage(red, Math.cos(an) * rr, Math.sin(an) * rr, a.size, a.size); }
      g.drawImage(base, 0, 0, a.size, a.size);
    });
  });
}
export function tintCanvas(src, key, color, alpha) {
  return cached(`tc:${key}:${color}:${alpha}`, () => {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.lw = src.lw; c.lh = src.lh;
    const g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = alpha; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); return c;
  });
}
export function enemyFrame(type, i) {
  const a = ENEMY_ART[type];
  return cached(`ef:${type}:${i}`, () => mk(a.size, a.size, (g) => a.draw(g, i / FRAMES)));
}
export function tinted(type, i, color, alpha) {
  return cached(`et:${type}:${i}:${color}:${alpha}`, () => {
    const src = enemyFrame(type, i); const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.lw = src.lw; c.lh = src.lh;
    const g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = alpha; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); return c;
  });
}

// ───── куски тел ─────
// kinds: head, torso, arm, leg, chunk, bone, wing, blob
function cut(g, x, y, r) { // красный срез мяса на конце куска
  circ(g, x, y, r); fillStroke(g, rad(g, x, y, 0, r, [[0, '#ff6a78'], [1, '#a00f1e']]), 0.7);
}
// ───── куски тел из самого монстра (нарезка кадра на рваные части) и готовые куски из атласа ─────
const PIECE_SEEDS = [[0.5, 0.14, 'head'], [0.5, 0.42, 'torso'], [0.16, 0.42, 'arm'], [0.84, 0.42, 'arm'], [0.34, 0.8, 'leg'], [0.66, 0.8, 'leg'], [0.5, 0.64, 'chunk']];
function piecesOf(type, dark) {
  return cached(`pieces:${type}:${dark ? 1 : 0}`, () => {
    const f = enemyFrame(type, 0), W = f.width, H = f.height, ctx = f.getContext('2d'), src = ctx.getImageData(0, 0, W, H), d = src.data;
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 <= x0) return [];
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, R = rng(type.length * 313 + 7);
    const boss = ENEMY_ART[type].size >= 100, seeds = PIECE_SEEDS.map(([fx, fy, k]) => ({ k, x: x0 + (fx + (R() - 0.5) * 0.14) * bw, y: y0 + (fy + (R() - 0.5) * 0.1) * bh }));
    if (boss) for (let i = 0; i < 4; i++) seeds.push({ k: 'chunk', x: x0 + R() * bw, y: y0 + R() * bh });
    const own = new Int16Array(W * H).fill(-1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (d[(y * W + x) * 4 + 3] < 40) continue;
      let best = 0, bd = 1e9; const wob = Math.sin(x * 0.35 + y * 0.21) * 3;          // рваная граница
      for (let i = 0; i < seeds.length; i++) { const dd = Math.hypot((x - seeds[i].x) * 0.9, (y - seeds[i].y) * 1.1) + wob * (i % 2 ? 1 : -1); if (dd < bd) { bd = dd; best = i; } }
      own[y * W + x] = best;
    }
    const out = [];
    seeds.forEach((sd, i) => {
      let a0 = W, b0 = H, a1 = 0, b1 = 0, n = 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (own[y * W + x] === i) { n++; if (x < a0) a0 = x; if (x > a1) a1 = x; if (y < b0) b0 = y; if (y > b1) b1 = y; }
      if (n < 30) return;
      const w = a1 - a0 + 1, h = b1 - b0 + 1, c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'), im = g.createImageData(w, h);
      for (let y = b0; y <= b1; y++) for (let x = a0; x <= a1; x++) {
        if (own[y * W + x] !== i) continue;
        const o = (y * W + x) * 4, q = ((y - b0) * w + (x - a0)) * 4;
        // край среза — красное мясо
        const cut = own[y * W + x - 2] !== i || own[y * W + x + 2] !== i || own[(y - 2) * W + x] !== i || own[(y + 2) * W + x] !== i;
        const k = cut ? 0.55 : 0, tr = dark ? 0.78 : 0;
        im.data[q] = (d[o] * (1 - k) + 170 * k) * (1 - tr) + 8 * tr; im.data[q + 1] = (d[o + 1] * (1 - k) + 12 * k) * (1 - tr) + 6 * tr; im.data[q + 2] = (d[o + 2] * (1 - k) + 22 * k) * (1 - tr) + 8 * tr; im.data[q + 3] = d[o + 3];
      }
      g.putImageData(im, 0, 0); c.lw = w / S; c.lh = h / S; c.kind = sd.k; c.cy = ((b0 + b1) / 2 - y0) / bh; out.push(c);
    });
    return out;
  });
}
function atlasGib(name, h) {
  return cached(`ag:${name}:${h}`, () => {
    const im = img(`gibs/${name}.webp`); if (!im) return null;
    const w = h * im.naturalWidth / im.naturalHeight;
    return mk(w, h, (g) => { g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, w, h); });
  });
}
function spriteGib(type, kind, variant, dark) {
  const def = ENEMY_ART[type], big = def.size >= 100 ? 1.9 : def.size >= 68 ? 1.25 : 1;
  const bone = type === 'skeleton', ps = piecesOf(type, dark);
  const byKind = (k) => ps.filter((p) => p.kind === k);
  const pick = (arr) => (arr.length ? arr[variant % arr.length] : null);
  const flesh = () => atlasGib(['gib_1', 'gib_2', 'gib_3', 'gib_4', 'heart'][variant % 5], Math.round(10 * big));
  let r = null;
  if (kind === 'head') r = bone && variant % 2 === 0 ? atlasGib('skull', Math.round(11 * big)) : pick(byKind('head'));
  else if (kind === 'torso') r = pick(byKind('torso')) || pick(byKind('chunk'));
  else if (kind === 'arm') r = bone ? atlasGib('bones', Math.round(9 * big)) : (variant % 3 === 0 ? atlasGib('arm', Math.round(11 * big)) : pick(byKind('arm')));
  else if (kind === 'leg') r = bone ? atlasGib('bones', Math.round(10 * big)) : (variant % 3 === 0 ? atlasGib('leg', Math.round(12 * big)) : pick(byKind('leg')));
  else if (kind === 'bone') r = atlasGib('bones', Math.round((8 + (variant % 3)) * big));
  else if (kind === 'wing') r = pick(byKind('arm'));
  else r = bone ? atlasGib('bones', Math.round(8 * big)) : (type === 'slime' || type === 'slimelet' || variant % 2 === 0) ? pick(byKind('chunk')) : flesh();
  return r || pick(ps);
}
export function gibSprite(type, kind, variant = 0, dark = false) {
  if (SPR.ok && ENEMY_ART[type] && ENEMY_ART[type].raster) {
    const r = cached(`sg:${type}:${kind}:${variant}:${dark ? 1 : 0}`, () => spriteGib(type, kind, variant, dark) || null);
    if (r) return r;
  }
  return procGib(type, kind, variant);
}
function procGib(type, kind, variant = 0) {
  return cached(`gib:${type}:${kind}:${variant}`, () => {
    const def = ENEMY_ART[type]; const p = PAL[type];
    const big = def.size >= 100 ? 1.9 : def.size >= 68 ? 1.25 : 1;
    const R = rng(type.length * 977 + kind.length * 131 + variant * 17);
    const isBone = type === 'skeleton' || type === 'lich', isOoze = type === 'slime' || type === 'slimelet';
    const W = 30 * big, Hh = 30 * big;
    return mk(W, Hh, (g) => {
      g.translate(W / 2, Hh / 2); g.scale(big, big);
      const bleed = !isBone && !isOoze;
      if (kind === 'head') {
        const headKind = { zombie: 'ghoul', zombie_fast: 'ghoul', grunt: 'goblin', goblin: 'goblin', mummy: 'skull', yeti: 'orc', runner: 'ghoul', brute: 'orc', knight: 'knight', skeleton: 'skull', shaman: 'hood', zerk: 'horned', reaper: 'hood', bat: 'goblin', gargoyle: 'orc', ogre: 'orc', lich: 'crown', demon: 'demon', slime: 'goblin', slimelet: 'goblin', anubis: 'orc', djinn: 'orc', sandgolem: 'orc', pharaoh: 'skull', wolf: 'goblin', iceskel: 'skull', snowgolem: 'orc', ultrayeti: 'orc', lavagolem: 'orc', imp: 'demon', pinky: 'horned', baron: 'horned' }[type] || 'orc';
        if (isOoze) { blobGib(g, p, 7); return; }
        g.save(); const hk = type === 'demon' || type === 'zerk' || type === 'lich' ? 0.62 : 0.9; g.scale(hk, hk); g.translate(0, type === 'demon' ? 4 : 0); HEADS[headKind](g, 0, -1, 7.5, p); g.restore();
        if (bleed) { g.beginPath(); g.ellipse(-1, 7, 4.5, 1.6, 0, 0, T2); fillStroke(g, '#b0101e', 0.6); }
      } else if (kind === 'torso') {
        if (isOoze) { blobGib(g, p, 9); return; }
        if (isBone) { // рёбра
          for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-6, -7 + i * 4); g.quadraticCurveTo(0, -4 + i * 4, 6, -7 + i * 4); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 1.5; g.strokeStyle = '#e8e1cb'; g.stroke(); }
          tube(g, 0, -9, 0, 8, 2.2, '#d4ccb2', 0.8); return;
        }
        rrect(g, -7, -8, 14, 16, 4); fillStroke(g, lin(g, -7, 0, 7, 0, [[0, shade(p.cloth, 0.3)], [1, shade(p.cloth, -0.4)]]), 1.3);
        g.save(); rrect(g, -7, -8, 14, 16, 4); g.clip(); g.fillStyle = 'rgba(140,10,20,0.6)'; g.beginPath(); g.moveTo(-7, 3); for (let x = -7; x <= 7; x += 2) g.lineTo(x, 3 + (x % 4 ? 4 : 1.2)); g.lineTo(7, 9); g.lineTo(-7, 9); g.closePath(); g.fill(); g.restore();
        cut(g, 0, 8, 4);
      } else if (kind === 'arm' || kind === 'leg') {
        const len = kind === 'leg' ? 15 : 12, w = kind === 'leg' ? 4.6 : 3.8;
        const col = isBone ? '#e8e1cb' : (kind === 'leg' ? shade(p.cloth2, 0.1) : p.skin);
        tube(g, -len / 2, 0, len / 2, 0, w, col, 1);
        if (isBone) { circ(g, -len / 2 - 0.5, -1.5, 2); fillStroke(g, '#e8e1cb', 0.7); circ(g, -len / 2 - 0.5, 1.5, 2); fillStroke(g, '#e8e1cb', 0.7); }
        else { cut(g, len / 2, 0, w * 0.62); if (kind === 'arm') { circ(g, -len / 2, 0, 2.6); fillStroke(g, p.skin, 0.8); } else { ell(g, -len / 2 - 1, 0, 3.6, 2.8); fillStroke(g, shade(p.cloth2, -0.2), 0.8); } }
      } else if (kind === 'bone') {
        const l = 7 + (variant % 3) * 2;
        tube(g, -l, 0, l, 0, 2.4, '#efe8d2', 0.8);
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) { circ(g, sx * l, sy * 1.5, 1.7); fillStroke(g, '#efe8d2', 0.6); }
      } else if (kind === 'wing') {
        const col = type === 'gargoyle' ? p.skin2 : p.cloth;
        g.beginPath(); g.moveTo(-9, 4); g.quadraticCurveTo(-8, -9, 2, -10); g.lineTo(9, -3); g.lineTo(3, 0); g.lineTo(7, 5); g.lineTo(0, 3); g.closePath(); fillStroke(g, shade(col, -0.1), 1.2);
        tube(g, -9, 4, 5, -8, 1.2, shade(col, -0.35), 0.5);
      } else if (kind === 'blob') { blobGib(g, p, 5 + (variant % 3) * 1.6); }
      else { // chunk — кусок мяса
        if (isBone) { poly(g, [[-4, -3], [3, -5], [5, 2], [-1, 5], [-5, 1]]); fillStroke(g, '#e8e1cb', 1); return; }
        if (isOoze) { blobGib(g, p, 4); return; }
        const pts = []; const n = 7; const rr = 4.5 + (variant % 3);
        for (let i = 0; i < n; i++) { const a = (i / n) * T2; const k = rr * (0.7 + R() * 0.6); pts.push([Math.cos(a) * k, Math.sin(a) * k * 0.8]); }
        poly(g, pts); fillStroke(g, rad(g, -1, -1, 0.5, rr * 1.3, [[0, bleed ? '#ff5a68' : p.skin], [0.7, bleed ? '#b0101e' : p.skin2], [1, '#5a0810']]), 1);
        g.fillStyle = 'rgba(255,200,200,0.5)'; circ(g, -1.5, -1.5, 1.3); g.fill();
      }
    });
  });
}
function blobGib(g, p, r) {
  g.beginPath(); for (let i = 0; i <= 12; i++) { const a = (i / 12) * T2; const k = r * (1 + 0.16 * Math.sin(i * 2.3)); g.lineTo(Math.cos(a) * k, Math.sin(a) * k * 0.75); } g.closePath();
  fillStroke(g, rad(g, -r * 0.3, -r * 0.4, 0.5, r * 1.3, [[0, '#d0ffaa'], [0.5, p.skin], [1, p.skin2]]), 1);
}
// какие куски у кого есть
export function gibKinds(type) {
  switch (type) {
    case 'skeleton': case 'lich': return ['head', 'torso', 'bone', 'bone', 'arm', 'leg', 'bone'];
    case 'slime': case 'slimelet': return ['blob', 'blob', 'blob', 'blob', 'chunk'];
    case 'bat': return ['head', 'wing', 'wing', 'chunk', 'chunk', 'chunk'];
    case 'gargoyle': return ['head', 'wing', 'arm', 'torso', 'chunk', 'chunk'];
    default: return ['head', 'torso', 'arm', 'arm', 'leg', 'leg', 'chunk', 'chunk'];
  }
}

// ───── страница QA ─────
export function renderSheet({ section, add, verdict }) {
  const row = section('Враги (кадры ходьбы)');
  if (row) for (const type of Object.keys(ENEMY_ART)) {
    const a = ENEMY_ART[type];
    for (const i of [0, 2, 4, 6]) {
      const c = enemyFrame(type, i);
      add(row, `${type} #${i}`, c, verdict(`${type} #${i}`, c, { minFill: a.size >= 100 ? 0.04 : 0.05 }), a.size >= 100 ? 110 : 76);
    }
  }
  const row2 = section('Куски тел');
  if (row2) for (const type of Object.keys(ENEMY_ART)) {
    for (const k of [...new Set(gibKinds(type))]) { const c = gibSprite(type, k, 1); add(row2, `${type}:${k}`, c, verdict(`gib ${type}:${k}`, c, { minFill: 0.04 }), 52); }
  }
}
