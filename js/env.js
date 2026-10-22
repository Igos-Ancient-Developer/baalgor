// Окружение: фон карт, декор, пятна крови, иконки интерфейса.
import { OUT, S, mk, cached, shade, rgba, lin, rad, rrect, ell, circ, poly, fillStroke, tube, glow, shadowEll, rng } from './art.js';
import { CELL, COLS, ROWS, WORLD_W, WORLD_H, MAPS, MARGIN, MARGIN_ROWS } from './data.js';
import { UI_IMG, inner } from './iconmap.js';
import { BLOOD } from './enemies.js';
import { SPR, img } from './sprites.js';

const T2 = Math.PI * 2;

export const THEMES = {
  grave:     { base: '#34452f', base2: '#2a3a28', tuft: '#4d6a42', path: '#6b5e4c', pathHi: '#7e705b', edge: '#2f2820', stone: '#7b7f86', sky: 'rgba(120,150,220,0.08)' },
  slaughter: { base: '#4c3128', base2: '#3b2620', tuft: '#6a4538', path: '#7a5240', pathHi: '#8f6550', edge: '#2e1a14', stone: '#8a7c72', sky: 'rgba(220,60,40,0.07)' },
  ice:       { base: '#8fa9bf', base2: '#7a95ad', tuft: '#c4d9e8', path: '#5d7189', pathHi: '#6f84a0', edge: '#34455c', stone: '#9db0c4', sky: 'rgba(150,200,255,0.10)' },
};

// ───── декор ─────
function groundShadow(g, x, y, rx, ry) { shadowEll(g, x + 2, y + 2, rx, ry, 0.45); }
export const DECOR = {
  tomb(g, x, y, R) {
    groundShadow(g, x, y + 10, 15, 6);
    const w = 18, h = 24;
    g.beginPath(); g.moveTo(x - w / 2, y + 10); g.lineTo(x - w / 2, y - h / 2 + 5); g.quadraticCurveTo(x, y - h / 2 - 7, x + w / 2, y - h / 2 + 5); g.lineTo(x + w / 2, y + 10); g.closePath();
    fillStroke(g, lin(g, x - w / 2, 0, x + w / 2, 0, [[0, '#b5b9c0'], [0.6, '#8a8e97'], [1, '#585c66']]), 1.5);
    g.strokeStyle = 'rgba(20,15,20,0.55)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x, y + 2); g.moveTo(x - 4, y - 4); g.lineTo(x + 4, y - 4); g.stroke();
    g.fillStyle = 'rgba(60,110,50,0.5)'; ell(g, x - 4, y + 8, 6, 2.4); g.fill();
    ell(g, x, y + 11, 14, 4); fillStroke(g, '#4a4640', 1.2);
  },
  deadtree(g, x, y, R) {
    groundShadow(g, x, y + 12, 14, 5);
    g.beginPath(); g.moveTo(x - 4, y + 12); g.quadraticCurveTo(x - 3, y - 2, x - 6, y - 10); g.lineTo(x + 5, y - 10); g.quadraticCurveTo(x + 2, y - 2, x + 5, y + 12); g.closePath(); fillStroke(g, lin(g, x - 6, 0, x + 6, 0, [[0, '#6e5a48'], [1, '#2e241c']]), 1.4);
    const br = (x0, y0, x1, y1, w) => tube(g, x0, y0, x1, y1, w, '#4a3a2c', 0.9);
    br(x - 3, y - 8, x - 14, y - 20, 3); br(x - 10, y - 16, x - 18, y - 17, 2); br(x + 2, y - 8, x + 12, y - 22, 3); br(x + 8, y - 17, x + 16, y - 16, 2); br(x, y - 10, x + 1, y - 24, 2.4); br(x - 1, y - 18, x - 5, y - 26, 1.6);
  },
  rock(g, x, y) {
    groundShadow(g, x, y + 9, 16, 6);
    for (const [dx, dy, r, c] of [[-6, 4, 9, '#7c8088'], [7, 5, 7.5, '#6a6e77'], [1, -3, 8.5, '#8d9199']]) {
      g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * T2; const k = r * (0.85 + 0.2 * Math.sin(i * 2.7 + dx)); g.lineTo(x + dx + Math.cos(a) * k, y + dy + Math.sin(a) * k * 0.8); } g.closePath();
      fillStroke(g, lin(g, x + dx - r, y + dy - r, x + dx + r, y + dy + r, [[0, shade(c, 0.3)], [1, shade(c, -0.4)]]), 1.4);
    }
  },
  skullpike(g, x, y) {
    groundShadow(g, x, y + 12, 10, 4);
    tube(g, x, y + 12, x, y - 12, 3, '#6a4a2c', 1);
    poly(g, [[x - 2, y - 11], [x, y - 20], [x + 2, y - 11]]); fillStroke(g, '#6a4a2c', 0.8);
    circ(g, x, y - 14, 6.4); fillStroke(g, rad(g, x - 2, y - 17, 1, 9, [[0, '#fffbe8'], [1, '#bdb393']]), 1.3);
    rrect(g, x - 3.6, y - 10, 7.2, 5, 1.5); fillStroke(g, '#d6cdb2', 1);
    g.fillStyle = '#120608'; circ(g, x - 2.4, y - 14, 1.9); g.fill(); circ(g, x + 2.4, y - 14, 1.9); g.fill();
    g.fillStyle = 'rgba(160,10,20,0.7)'; rrect(g, x - 5, y - 10, 2, 7, 1); g.fill();
  },
  barrel(g, x, y) {
    groundShadow(g, x, y + 10, 13, 5);
    g.beginPath(); g.moveTo(x - 10, y - 10); g.quadraticCurveTo(x - 14, y, x - 10, y + 10); g.lineTo(x + 10, y + 10); g.quadraticCurveTo(x + 14, y, x + 10, y - 10); g.closePath();
    fillStroke(g, lin(g, x - 12, 0, x + 12, 0, [[0, '#a8743a'], [0.5, '#7a4e22'], [1, '#432a12']]), 1.5);
    ell(g, x, y - 10, 10, 4); fillStroke(g, '#2a1008', 1.2);
    for (const dy of [-5, 5]) { g.strokeStyle = '#2a2d33'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x - 11.5, y + dy); g.quadraticCurveTo(x, y + dy + 3, x + 11.5, y + dy); g.stroke(); }
    g.fillStyle = 'rgba(150,10,20,0.75)'; rrect(g, x + 1, y - 9, 3, 12, 1.4); g.fill(); ell(g, x - 3, y - 10, 4, 1.6); g.fill();
  },
  bones(g, x, y) {
    groundShadow(g, x, y + 4, 16, 5);
    for (const [dx, dy, a, l] of [[-6, 3, 0.4, 9], [4, 5, -0.5, 8], [0, -2, 1.3, 9], [7, -2, 0.1, 7]]) { tube(g, x + dx - Math.cos(a) * l, y + dy - Math.sin(a) * l * 0.6, x + dx + Math.cos(a) * l, y + dy + Math.sin(a) * l * 0.6, 3, '#e9e2cc', 0.9); }
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x - 3 + i * 2, y - 4, 7 - i * 1.2, Math.PI * 1.1, Math.PI * 1.9); g.lineWidth = 3.4; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 2; g.strokeStyle = '#efe8d2'; g.stroke(); }
    circ(g, x + 9, y + 2, 5.2); fillStroke(g, '#f2ecd6', 1.2); g.fillStyle = '#120608'; circ(g, x + 7.6, y + 1.5, 1.4); g.fill(); circ(g, x + 10.6, y + 1.5, 1.4); g.fill();
  },
  pen(g, x, y) {
    groundShadow(g, x, y + 9, 18, 6);
    ell(g, x, y + 4, 17, 8); fillStroke(g, '#2e1a12', 1.2); g.fillStyle = 'rgba(150,10,20,0.55)'; ell(g, x - 2, y + 4, 11, 4.4); g.fill();
    for (let i = 0; i < 5; i++) { const px = x - 16 + i * 8; tube(g, px, y + 10, px, y - 8, 3, '#8a5c30', 0.9); poly(g, [[px - 1.6, y - 8], [px, y - 12], [px + 1.6, y - 8]]); fillStroke(g, '#8a5c30', 0.7); }
    tube(g, x - 18, y - 2, x + 18, y - 2, 2.6, '#6a4524', 0.9); tube(g, x - 18, y + 5, x + 18, y + 5, 2.6, '#6a4524', 0.9);
  },
  hook(g, x, y) {
    groundShadow(g, x, y + 12, 15, 5);
    tube(g, x - 12, y + 12, x - 12, y - 18, 3.6, '#5a3a20', 1); tube(g, x + 12, y + 12, x + 12, y - 18, 3.6, '#5a3a20', 1); tube(g, x - 14, y - 18, x + 14, y - 18, 3.6, '#6a4524', 1);
    tube(g, x, y - 17, x, y - 8, 1.4, '#9aa0aa', 0.6);
    g.beginPath(); g.moveTo(x, y - 8); g.quadraticCurveTo(x + 4, y - 2, x - 1, y + 1); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 1.5; g.strokeStyle = '#b6bcc6'; g.stroke();
    ell(g, x - 1, y + 5, 6, 8.5); fillStroke(g, lin(g, x - 6, 0, x + 6, 0, [[0, '#d86a78'], [1, '#7a1220']]), 1.3);
    g.fillStyle = 'rgba(150,10,20,0.6)'; ell(g, x, y + 14, 8, 2.4); g.fill();
  },
  icerock(g, x, y) {
    groundShadow(g, x, y + 9, 16, 6);
    for (const [dx, dy, w, h] of [[-6, 6, 9, 14], [6, 7, 8, 11], [0, 4, 8, 20]]) { poly(g, [[x + dx - w, y + dy], [x + dx - w * 0.5, y + dy - h], [x + dx + w * 0.4, y + dy - h * 0.8], [x + dx + w, y + dy]]); fillStroke(g, lin(g, x + dx - w, 0, x + dx + w, 0, [[0, '#e4f4ff'], [1, '#6aa0d0']]), 1.3); }
  },
  pine(g, x, y) {
    groundShadow(g, x, y + 12, 13, 5);
    tube(g, x, y + 12, x, y + 2, 4, '#4a3020', 1);
    for (let i = 0; i < 3; i++) { const yy = y + 4 - i * 9, w = 14 - i * 3.5; poly(g, [[x - w, yy], [x, yy - 14], [x + w, yy]]); fillStroke(g, lin(g, x - w, 0, x + w, 0, [[0, '#2f6a52'], [1, '#143a2c']]), 1.3); g.fillStyle = 'rgba(240,250,255,0.9)'; poly(g, [[x - w * 0.55, yy - 5], [x, yy - 14], [x + w * 0.55, yy - 5], [x + w * 0.2, yy - 7], [x - w * 0.2, yy - 4]]); g.fill(); }
  },
  crystal(g, x, y) {
    groundShadow(g, x, y + 10, 14, 5);
    glow(g, x, y - 2, 20, '#7ad0ff', 0.35);
    for (const [dx, h, w] of [[-7, 14, 4.4], [6, 11, 4], [0, 22, 5.6]]) { poly(g, [[x + dx - w, y + 8], [x + dx - w * 0.7, y + 8 - h * 0.8], [x + dx, y + 8 - h], [x + dx + w * 0.7, y + 8 - h * 0.75], [x + dx + w, y + 8]]); fillStroke(g, lin(g, x + dx - w, 0, x + dx + w, 0, [[0, '#d6f4ff'], [0.5, '#52b4f0'], [1, '#1f5a9a']]), 1.2); }
  },
};

// деревья и валуны из листов nature_*: вид -> [набор картинок, сколько их, высота на карте]; если картинок нет, рисуем кодом
const NAT = { oak: ['oak', 5, 62], deadtree: ['dead', 1, 60], spruce: ['spruce', 1, 66], snowspruce: ['spruce', 1, 66], boulder: ['rock', 7, 40], shrub: ['rock', 7, 26] };
const PROC_DECOR = new Set(Object.keys(NAT));
function natDecor(g, kind, x, y, key) {
  const [grp, n, h0] = NAT[kind], im = img(`decor/nat_${grp}_${key % n + 1}.webp`); if (!im) return false;
  let h = h0, w = h * im.naturalWidth / im.naturalHeight; if (w > 50) { w = 50; h = w * im.naturalHeight / im.naturalWidth; }
  shadowEll(g, x, y + 12, w * 0.4, 5, 0.45); g.imageSmoothingQuality = 'high'; g.drawImage(im, x - w / 2, y + 14 - h, w, h); return true;
}
// ───── деревья и валуны: естественные препятствия, толстый контур и светлая грань, как у зданий ─────
const blob = (g, x, y, r, c) => { circ(g, x, y, r); fillStroke(g, rad(g, x - r * 0.35, y - r * 0.4, r * 0.1, r * 1.25, [[0, shade(c, 0.4)], [0.55, c], [1, shade(c, -0.4)]]), 1.5); };
const tier = (g, x, y, w, h, c) => { poly(g, [[x - w, y], [x - w * 0.15, y - h], [x + w * 0.15, y - h], [x + w, y]]); fillStroke(g, lin(g, x - w, 0, x + w, 0, [[0, shade(c, 0.35)], [0.5, c], [1, shade(c, -0.45)]]), 1.5); };
Object.assign(DECOR, {
  oak(g, x, y, R) {
    groundShadow(g, x, y + 12, 17, 6);
    tube(g, x, y + 13, x, y - 2, 6, '#7a5632', 1.2);
    blob(g, x - 9, y - 4, 10.5, '#5f8f46'); blob(g, x + 9, y - 5, 10.5, '#578840'); blob(g, x, y - 14, 13, '#6a9d4e');
    g.fillStyle = 'rgba(255,255,220,0.25)'; ell(g, x - 4, y - 19, 5, 3); g.fill();
  },
  spruce(g, x, y) {
    groundShadow(g, x, y + 12, 14, 5);
    tube(g, x, y + 13, x, y + 3, 5, '#6a4a2a', 1.2);
    for (let i = 0; i < 4; i++) tier(g, x, y + 7 - i * 9, 17 - i * 3.6, 15, i % 2 ? '#3f7a52' : '#357048');
  },
  snowspruce(g, x, y) {
    groundShadow(g, x, y + 12, 14, 5);
    tube(g, x, y + 13, x, y + 3, 5, '#5a4030', 1.2);
    for (let i = 0; i < 4; i++) { const w = 17 - i * 3.6, yy = y + 7 - i * 9; tier(g, x, yy, w, 15, '#3a6a68'); poly(g, [[x - w * 0.75, yy - 4], [x - w * 0.15, yy - 15], [x + w * 0.15, yy - 15], [x + w * 0.75, yy - 4], [x + w * 0.3, yy - 6], [x, yy - 3], [x - w * 0.3, yy - 6]]); fillStroke(g, '#eef6fa', 1); }
  },
  shrub(g, x, y) {
    groundShadow(g, x, y + 9, 13, 4.5);
    blob(g, x - 7, y + 2, 8, '#5a8a44'); blob(g, x + 7, y + 3, 7.5, '#4e7e3c'); blob(g, x, y - 3, 9, '#66974c');
  },
  boulder(g, x, y, R) {
    groundShadow(g, x, y + 12, 21, 7);
    const pts = [[-19, 10], [-21, -2], [-13, -15], [2, -20], [16, -14], [22, -1], [19, 10]];
    g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(x + a, y + b) : g.moveTo(x + a, y + b))); g.closePath();
    fillStroke(g, lin(g, x - 20, y - 20, x + 20, y + 12, [[0, '#b4b8bf'], [0.55, '#868b94'], [1, '#4e525c']]), 1.8);
    poly(g, [[x - 13, y - 14], [x + 2, y - 19], [x + 6, y - 8], [x - 9, y - 4]]); fillStroke(g, 'rgba(255,255,255,0.28)', 0);
    g.strokeStyle = 'rgba(20,16,22,0.5)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x + 2, y - 19); g.lineTo(x + 6, y - 8); g.lineTo(x + 4, y + 9); g.moveTo(x - 9, y - 4); g.lineTo(x - 12, y + 8); g.stroke();
    g.fillStyle = 'rgba(80,130,60,0.55)'; ell(g, x - 9, y + 9, 8, 2.6); g.fill();
  },
});

Object.assign(THEMES, {
  forest: { base: '#26402c', base2: '#1b3022', tuft: '#3d7040', path: '#6e5c40', pathHi: '#826d4a', edge: '#251d12', stone: '#6c7468', sky: 'rgba(80,220,150,0.07)' },
  desert: { base: '#cfae6e', base2: '#b8924f', tuft: '#e2c888', path: '#a87c4c', pathHi: '#c0925e', edge: '#6a4a28', stone: '#b09874', sky: 'rgba(255,200,100,0.08)' },
  lava: { base: '#2c1a18', base2: '#1d0f0f', tuft: '#4e2c24', path: '#5e3c34', pathHi: '#744e42', edge: '#140808', stone: '#4c3c3a', sky: 'rgba(255,70,20,0.10)' },
});

Object.assign(DECOR, {
  darktree(g, x, y) {
    groundShadow(g, x, y + 12, 17, 6);
    g.beginPath(); g.moveTo(x - 5, y + 13); g.quadraticCurveTo(x - 4, y, x - 7, y - 8); g.lineTo(x + 7, y - 8); g.quadraticCurveTo(x + 4, y, x + 5, y + 13); g.closePath(); fillStroke(g, lin(g, x - 7, 0, x + 7, 0, [[0, '#6a4a30'], [1, '#2a1c12']]), 1.5);
    for (const [dx, dy, r, c] of [[-9, -14, 11, '#1f4a2a'], [9, -15, 11, '#1a3f25'], [0, -22, 13, '#255c33'], [0, -10, 12, '#1c4528']]) { circ(g, x + dx, y + dy, r); fillStroke(g, rad(g, x + dx - 3, y + dy - 4, 1, r * 1.3, [[0, shade(c, 0.3)], [1, shade(c, -0.35)]]), 1.4); }
    glow(g, x - 2, y - 12, 8, '#b070ff', 0.5); g.fillStyle = '#d8a0ff'; circ(g, x - 4, y - 12, 1.3); g.fill(); circ(g, x + 1, y - 12, 1.3); g.fill();
  },
  stump(g, x, y) {
    groundShadow(g, x, y + 8, 14, 5);
    g.beginPath(); g.moveTo(x - 10, y + 8); g.lineTo(x - 9, y - 2); g.lineTo(x + 9, y - 2); g.lineTo(x + 10, y + 8); g.quadraticCurveTo(x, y + 12, x - 10, y + 8); fillStroke(g, lin(g, x - 10, 0, x + 10, 0, [[0, '#8a6038'], [1, '#3a2614']]), 1.4);
    ell(g, x, y - 2, 9.5, 4.6); fillStroke(g, '#c8a070', 1.3); g.strokeStyle = 'rgba(90,60,30,0.6)'; g.lineWidth = 0.9; for (const r of [2, 4.5, 7]) { g.beginPath(); g.ellipse(x, y - 2, r, r * 0.46, 0, 0, Math.PI * 2); g.stroke(); }
    tube(g, x + 12, y + 8, x + 6, y - 8, 2.4, '#7a5a30', 1); poly(g, [[x + 2, y - 11], [x + 10, y - 8], [x + 5, y - 4]]); fillStroke(g, '#c9ced6', 0.9);
  },
  mushroom(g, x, y) {
    groundShadow(g, x, y + 8, 15, 5);
    for (const [dx, dy, r, c] of [[-8, 4, 6, '#d8342a'], [7, 2, 8, '#a040d8'], [0, -4, 9, '#e8602a']]) { tube(g, x + dx, y + dy + 6, x + dx, y + dy - 1, 4, '#f0e4c8', 1); g.beginPath(); g.ellipse(x + dx, y + dy - 1, r, r * 0.7, 0, Math.PI, 0); g.closePath(); fillStroke(g, lin(g, x + dx - r, 0, x + dx + r, 0, [[0, shade(c, 0.4)], [1, shade(c, -0.3)]]), 1.4); g.fillStyle = 'rgba(255,255,230,0.9)'; circ(g, x + dx - r * 0.3, y + dy - 5, 1.3); g.fill(); circ(g, x + dx + r * 0.35, y + dy - 4, 1.1); g.fill(); }
    glow(g, x, y - 2, 18, '#c070ff', 0.25);
  },
  bush(g, x, y) {
    groundShadow(g, x, y + 8, 15, 5);
    for (const [dx, dy, r] of [[-7, 2, 8], [7, 3, 8], [0, -3, 9]]) { circ(g, x + dx, y + dy, r); fillStroke(g, rad(g, x + dx - 2, y + dy - 3, 1, r * 1.3, [[0, '#4a8a4a'], [1, '#1a3a22']]), 1.4); }
    for (const [dx, dy] of [[-5, 0], [6, 2], [1, -5]]) { circ(g, x + dx, y + dy, 1.8); fillStroke(g, '#e03a4a', 0.8); }
  },
  cactus(g, x, y) {
    groundShadow(g, x, y + 11, 13, 4.5);
    const arm = (sx) => { g.beginPath(); g.moveTo(x + sx * 4, y + 2); g.lineTo(x + sx * 10, y + 2); g.lineTo(x + sx * 10, y - 8); g.lineWidth = 7; g.strokeStyle = OUT; g.lineCap = 'round'; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#4a9a4a'; g.stroke(); };
    arm(-1); arm(1);
    rrect(g, x - 5, y - 18, 10, 30, 5); fillStroke(g, lin(g, x - 5, 0, x + 5, 0, [[0, '#7ac47a'], [0.5, '#4a9a4a'], [1, '#1f5a28']]), 1.5);
    g.strokeStyle = 'rgba(20,60,20,0.5)'; g.lineWidth = 0.9; for (const dx of [-2, 2]) { g.beginPath(); g.moveTo(x + dx, y - 16); g.lineTo(x + dx, y + 10); g.stroke(); }
    circ(g, x, y - 19, 2.4); fillStroke(g, '#ff6aa0', 0.8);
  },
  skullbig(g, x, y) {
    groundShadow(g, x, y + 8, 17, 6);
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x - 6 + i * 6, y + 10, 11 - i, Math.PI * 1.05, Math.PI * 1.95); g.lineWidth = 4.4; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 2.6; g.strokeStyle = '#efe6c8'; g.stroke(); }
    g.beginPath(); g.ellipse(x, y - 1, 15, 13, 0, Math.PI, 0); g.lineTo(x + 15, y + 8); g.lineTo(x - 15, y + 8); g.closePath(); fillStroke(g, rad(g, x - 4, y - 8, 1, 22, [[0, '#fffbe8'], [1, '#b8aa84']]), 1.6);
    g.fillStyle = OUT; ell(g, x - 6, y, 4, 4.8); g.fill(); ell(g, x + 6, y, 4, 4.8); g.fill(); poly(g, [[x, y + 3], [x - 2, y + 7], [x + 2, y + 7]]); g.fill();
  },
  obelisk(g, x, y) {
    groundShadow(g, x, y + 12, 13, 5);
    poly(g, [[x - 8, y + 12], [x - 6, y - 14], [x, y - 22], [x + 6, y - 14], [x + 8, y + 12]]); fillStroke(g, lin(g, x - 8, 0, x + 8, 0, [[0, '#e8d0a0'], [0.5, '#bf9a64'], [1, '#6a4a28']]), 1.6);
    g.strokeStyle = '#5ae0ff'; g.lineWidth = 1.3; g.globalAlpha = 0.85; for (const [dy, w] of [[-8, 3], [-2, 2.4], [4, 3.2]]) { g.beginPath(); g.moveTo(x - w, y + dy); g.lineTo(x + w, y + dy); g.moveTo(x, y + dy - 2); g.lineTo(x, y + dy + 2); g.stroke(); } g.globalAlpha = 1; glow(g, x, y - 2, 14, '#5ae0ff', 0.22);
    rrect(g, x - 11, y + 8, 22, 6, 2); fillStroke(g, '#a88858', 1.2);
  },
  dunerock(g, x, y) {
    groundShadow(g, x, y + 9, 16, 6);
    for (const [dx, dy, r, c] of [[-6, 4, 9, '#c8a878'], [7, 5, 7.5, '#b8946a'], [1, -3, 8.5, '#d8bc90']]) { g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, k = r * (0.85 + 0.2 * Math.sin(i * 2.7 + dx)); g.lineTo(x + dx + Math.cos(a) * k, y + dy + Math.sin(a) * k * 0.8); } g.closePath(); fillStroke(g, lin(g, x + dx - r, y + dy - r, x + dx + r, y + dy + r, [[0, shade(c, 0.3)], [1, shade(c, -0.4)]]), 1.4); }
  },
  lavapool(g, x, y) {
    glow(g, x, y + 2, 28, '#ff6a1a', 0.45);
    ell(g, x, y + 3, 19, 11); fillStroke(g, '#1a0a08', 2); ell(g, x, y + 2, 16, 8.6); fillStroke(g, rad(g, x - 4, y, 1, 18, [[0, '#fff08a'], [0.45, '#ff9a1a'], [1, '#c01a0a']]), 1);
    g.fillStyle = 'rgba(255,240,160,0.8)'; for (const [dx, dy, r] of [[-6, 1, 2], [4, 4, 1.6], [7, -1, 1.2]]) { circ(g, x + dx, y + dy, r); g.fill(); }
    for (const [dx, dy] of [[-18, 4], [17, 6], [-10, 12], [12, -4]]) { poly(g, [[x + dx - 4, y + dy + 4], [x + dx, y + dy - 6], [x + dx + 4, y + dy + 4]]); fillStroke(g, '#3a2a28', 1.3); }
  },
  obsidian(g, x, y) {
    groundShadow(g, x, y + 10, 14, 5); glow(g, x, y, 18, '#ff3a2a', 0.2);
    for (const [dx, h, w] of [[-7, 14, 4.6], [6, 11, 4.2], [0, 22, 5.6]]) { poly(g, [[x + dx - w, y + 9], [x + dx - w * 0.7, y + 9 - h * 0.8], [x + dx, y + 9 - h], [x + dx + w * 0.7, y + 9 - h * 0.75], [x + dx + w, y + 9]]); fillStroke(g, lin(g, x + dx - w, 0, x + dx + w, 0, [[0, '#6a5a64'], [0.45, '#1c1418'], [1, '#08040a']]), 1.2); g.beginPath(); g.moveTo(x + dx - w * 0.3, y + 8); g.lineTo(x + dx, y + 9 - h * 0.9); g.lineWidth = 0.9; g.strokeStyle = 'rgba(255,90,60,0.8)'; g.stroke(); }
  },
  spikes(g, x, y) {
    groundShadow(g, x, y + 10, 15, 5);
    for (const [dx, h, w] of [[-9, 12, 3.6], [-3, 18, 4], [4, 14, 3.6], [10, 10, 3.2], [0, 9, 3]]) { poly(g, [[x + dx - w, y + 10], [x + dx, y + 10 - h], [x + dx + w, y + 10]]); fillStroke(g, lin(g, x + dx - w, 0, x + dx + w, 0, [[0, '#5a4a4a'], [1, '#1a1212']]), 1.2); }
    g.fillStyle = 'rgba(255,120,40,0.85)'; for (const [dx, dy] of [[-9, -4], [4, -8], [10, 0]]) { circ(g, x + dx, y + dy, 1.2); g.fill(); }
  },
  brazier(g, x, y) {
    groundShadow(g, x, y + 11, 13, 5); glow(g, x, y - 12, 26, '#ff9a2a', 0.55);
    for (const s of [-1, 1]) tube(g, x + s * 6, y + 12, x + s * 2, y + 2, 2.6, '#4a4a54', 1); tube(g, x, y + 12, x, y + 2, 2.6, '#4a4a54', 1);
    g.beginPath(); g.moveTo(x - 11, y - 2); g.quadraticCurveTo(x - 9, y + 6, x, y + 7); g.quadraticCurveTo(x + 9, y + 6, x + 11, y - 2); g.closePath(); fillStroke(g, lin(g, x - 11, 0, x + 11, 0, [[0, '#6a6a74'], [1, '#22222a']]), 1.5);
    g.beginPath(); g.moveTo(x - 7, y - 2); g.quadraticCurveTo(x - 8, y - 12, x - 1, y - 20); g.quadraticCurveTo(x + 1, y - 12, x + 7, y - 14); g.quadraticCurveTo(x + 9, y - 6, x + 7, y - 2); g.closePath(); fillStroke(g, lin(g, 0, y - 20, 0, y - 2, [[0, '#fff2a0'], [0.5, '#ff8a1a'], [1, '#d82a0a']]), 1.2);
  },
});

function ambient(g, x, y, theme, R) {
  const r = R();
  if (theme === 'desert') { if (r < 0.5) { ell(g, x, y, 4 + R() * 3, 1.8); fillStroke(g, '#c0a070', 0.7); } else if (r < 0.75) { tube(g, x - 3, y, x + 3, y - 1, 1.6, '#f2ead0', 0.6); } else { g.strokeStyle = 'rgba(150,110,60,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 6, y); g.quadraticCurveTo(x, y - 3, x + 6, y); g.stroke(); } return; }
  if (theme === 'forest') { if (r < 0.5) { for (let i = 0; i < 3; i++) { g.strokeStyle = '#4a8a4a'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + i * 2 - 2, y); g.lineTo(x + i * 3 - 3, y - 4 - R() * 3); g.stroke(); } } else if (r < 0.75) { tube(g, x, y + 3, x, y - 1, 1.6, '#f0e4c8', 0.5); circ(g, x, y - 2, 2.6); fillStroke(g, R() < 0.5 ? '#d8342a' : '#a040d8', 0.6); } else { ell(g, x, y, 4, 2); fillStroke(g, '#6c7468', 0.7); } return; }
  if (theme === 'lava') { if (r < 0.5) { g.strokeStyle = 'rgba(255,100,30,0.7)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x - 1, y - 2); g.lineTo(x + 2, y + 1); g.lineTo(x + 7, y - 1); g.stroke(); } else if (r < 0.8) { ell(g, x, y, 3 + R() * 2, 2); fillStroke(g, '#3a2a28', 0.8); } else { circ(g, x, y, 1.2); g.fillStyle = 'rgba(255,150,50,0.8)'; g.fill(); } return; }
  if (theme === 'ice') {
    if (r < 0.5) { for (let i = 0; i < 3; i++) { circ(g, x + (R() - 0.5) * 12, y + (R() - 0.5) * 12, 1 + R() * 1.4); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill(); } }
    else { poly(g, [[x - 3, y + 2], [x, y - 3], [x + 3, y + 2]]); fillStroke(g, '#dff1ff', 0.6); }
    return;
  }
  if (r < 0.4) { ell(g, x, y, 3 + R() * 2, 2); fillStroke(g, '#6e7078', 0.8); }
  else if (r < 0.7) { tube(g, x - 3, y, x + 3, y - 1, 1.6, '#e0d8c0', 0.6); circ(g, x + 4, y - 1, 1.4); fillStroke(g, '#efe8d2', 0.5); }
  else if (theme === 'slaughter') { g.fillStyle = 'rgba(130,12,20,0.5)'; ell(g, x, y, 5 + R() * 4, 3 + R() * 2); g.fill(); }
  else { tube(g, x, y + 3, x, y - 2, 1, '#2a3a24', 0.4); circ(g, x, y - 3, 2); fillStroke(g, R() < 0.5 ? '#c9a2d8' : '#e8d070', 0.5); }
}

function portal(g, x, y) {
  const im = img('decor/obj_portal.webp');                       // портал врагов из яркого листа
  if (im) { const w = 56, h = w * im.naturalHeight / im.naturalWidth; shadowEll(g, x, y + 12, w * 0.4, 6, 0.45); g.imageSmoothingQuality = 'high'; g.drawImage(im, x - w / 2, y + 16 - h, w, h); return; }
  glow(g, x, y, 34, '#a040ff', 0.55);
  ell(g, x, y, 22, 14); fillStroke(g, '#1a0826', 2);
  ell(g, x, y, 17, 10.5); fillStroke(g, rad(g, x, y, 0, 18, [[0, '#f0c0ff'], [0.4, '#9030e0'], [1, '#2a0a4a']]), 1);
  g.strokeStyle = 'rgba(255,220,255,0.55)'; g.lineWidth = 1.2; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(x, y, 4 + i * 4.5, 2.4 + i * 2.8, i * 0.5, 0, 4.2); g.stroke(); }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * T2; const px = x + Math.cos(a) * 24, py = y + Math.sin(a) * 15; poly(g, [[px - 2.5, py + 3], [px, py - 7], [px + 2.5, py + 3]]); fillStroke(g, '#3a2a48', 1); }
}
function gate(g, x, y) {
  const im = img('decor/obj_gate.webp');                         // ворота крепости из яркого листа
  if (im) { const w = 68, h = w * im.naturalHeight / im.naturalWidth; shadowEll(g, x + 2, y + 16, w * 0.46, 8, 0.5); g.imageSmoothingQuality = 'high'; g.drawImage(im, x - w / 2, y + 18 - h, w, h); return; }
  shadowEll(g, x + 3, y + 16, 34, 9, 0.5);
  // арка
  g.beginPath(); g.moveTo(x - 26, y + 14); g.lineTo(x - 26, y - 14); g.quadraticCurveTo(x - 26, y - 34, x, y - 34); g.quadraticCurveTo(x + 26, y - 34, x + 26, y - 14); g.lineTo(x + 26, y + 14); g.closePath();
  fillStroke(g, lin(g, x - 26, 0, x + 26, 0, [[0, '#a2a7b0'], [0.5, '#7d828c'], [1, '#4a4e58']]), 2);
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.8; for (let r = 0; r < 5; r++) { g.beginPath(); g.moveTo(x - 26, y - 22 + r * 8); g.lineTo(x + 26, y - 22 + r * 8); g.stroke(); }
  g.beginPath(); g.moveTo(x - 16, y + 14); g.lineTo(x - 16, y - 12); g.quadraticCurveTo(x - 16, y - 24, x, y - 24); g.quadraticCurveTo(x + 16, y - 24, x + 16, y - 12); g.lineTo(x + 16, y + 14); g.closePath(); fillStroke(g, '#0a0508', 1.6);
  glow(g, x, y + 4, 18, '#ff7a1c', 0.3);
  g.strokeStyle = '#555a64'; g.lineWidth = 2; for (let i = -12; i <= 12; i += 6) { g.beginPath(); g.moveTo(x + i, y - 22); g.lineTo(x + i, y + 14); g.stroke(); }
  for (const sx of [-1, 1]) { tube(g, x + sx * 31, y + 14, x + sx * 31, y - 22, 3, '#5a3a20', 1); glow(g, x + sx * 31, y - 28, 10, '#ff9a2a', 0.8); poly(g, [[x + sx * 31 - 3, y - 22], [x + sx * 31, y - 33], [x + sx * 31 + 3, y - 22]]); fillStroke(g, '#ffb02a', 0.8); }
  skullAt(g, x, y - 29);
}
function skullAt(g, x, y) { circ(g, x, y, 4.2); fillStroke(g, '#f0e8d2', 1); g.fillStyle = '#120608'; circ(g, x - 1.6, y, 1.2); g.fill(); circ(g, x + 1.6, y, 1.2); g.fill(); }

// ───── растровая земля и декор (ассеты img/tiles, img/decor) ─────
const THEME_TILE = { grave: ['grass', 'rgba(14,18,40,0.38)'], forest: ['grass', 'rgba(0,18,10,0.22)'], desert: ['sand', null], ice: ['snow', null], lava: ['lava', null], slaughter: ['lava', 'rgba(40,6,6,0.30)'] };
const TILE_PICK = { grass: 1, sand: 1, snow: 0, lava: 2 };
// дорога: [тип тайла, номер, затемнение]
const ROAD_TILE = { grave: ['sand', 1, 'rgba(38,32,58,0.46)'], forest: ['sand', 1, 'rgba(44,30,12,0.22)'], desert: ['sand', 3, 'rgba(70,36,12,0.16)'], ice: ['snow', 3, 'rgba(74,98,134,0.46)'], lava: ['lava', 0, 'rgba(10,6,6,0.05)'], slaughter: ['sand', 3, 'rgba(84,20,14,0.52)'] };
const DECOR_SRC = {
  tomb: 'statue', deadtree: 'dead_tree', rock: 'rocks', skullpike: 'skull_pole',
  barrel: 'cart', bones: 'bones', pen: 'ruin', hook: 'skull_pole',
  icerock: 'rocks', pine: 'dead_tree', crystal: 'crystal',
  darktree: 'dead_tree', stump: 'ruin', mushroom: 'crystal', bush: 'rocks',
  cactus: 'dead_tree', skullbig: 'bones', obelisk: 'statue', dunerock: 'rocks',
  lavapool: 'campfire', obsidian: 'rocks', spikes: 'skull_pole', brazier: 'torch',
};
const DECOR_H = { statue: 52, dead_tree: 56, rocks: 36, skull_pole: 52, cart: 44, bones: 34, ruin: 50, crystal: 40, campfire: 34, torch: 50, chest: 36,
  townhall: 54, smithy: 46, tents: 46, tavern: 48, warehouse: 46, portal: 56, altar: 46, shrine: 54, obelisk: 58, farm: 44, mill: 54, fishhut: 46, watchtower: 64, woodcutter: 46, quarry: 46, camp: 48, hut: 46 };
// какие постройки и предметы стоят на карте каждого сектора (выбор по клетке — карты не повторяются)
const THEME_PROPS = {
  grave: ['dead_tree', 'statue', 'rocks', 'skull_pole', 'ruin', 'altar', 'shrine', 'bones', 'watchtower'],
  forest: ['dead_tree', 'hut', 'mill', 'woodcutter', 'rocks', 'farm', 'crystal', 'campfire', 'torch', 'tents'],
  desert: ['bones', 'obelisk', 'ruin', 'tents', 'camp', 'rocks', 'shrine', 'quarry', 'skull_pole', 'dead_tree'],
  ice: ['rocks', 'crystal', 'shrine', 'watchtower', 'portal', 'dead_tree', 'statue', 'obelisk', 'hut'],
  lava: ['campfire', 'torch', 'skull_pole', 'rocks', 'altar', 'portal', 'smithy', 'ruin', 'obelisk'],
  slaughter: ['skull_pole', 'bones', 'cart', 'smithy', 'altar', 'campfire', 'tavern', 'torch'],
};
// текстуры земли мягкие (96 px): чуть подчёркиваем резкость и контраст, чтобы ландшафт был чётким (шов бесшовный, поэтому края заворачиваем)
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
function groundTiles(g, theme, R) {
  const [kind, tint] = THEME_TILE[theme] || THEME_TILE.grave;
  const t0 = sharpTile(img(`tiles/${kind}_${TILE_PICK[kind]}.webp`));
  if (!t0) return false;
  const tiles = [t0], pick = () => 0;
  g.imageSmoothingQuality = 'high';
  for (let r = -MARGIN_ROWS; r < ROWS + MARGIN_ROWS; r++) for (let c = 0; c < COLS; c++) {
    const t = tiles[pick(c, r)], flip = ((c * 3 + r * 5) % 4 + 4) % 4;
    g.save(); g.translate((c + 0.5) * CELL, (r + 0.5) * CELL); g.scale(flip & 1 ? -1 : 1, flip & 2 ? -1 : 1);
    g.drawImage(t, -CELL / 2 - 0.5, -CELL / 2 - 0.5, CELL + 1, CELL + 1); g.restore();
  }
  if (tint) { g.fillStyle = tint; g.fillRect(0, -MARGIN, WORLD_W, WORLD_H + 2 * MARGIN); }
  return true;
}
function roadTexture(g, map, strokePaths) {
  const [kind, idx, tint] = ROAD_TILE[map.theme] || ROAD_TILE.grave, t = sharpTile(img(`tiles/${kind}_${idx}.webp`));
  if (!t) return false;
  const tmp = mk(WORLD_W, WORLD_H + 2 * MARGIN, (h) => {
    h.translate(0, MARGIN);
    h.lineCap = 'round'; h.lineJoin = 'round'; h.strokeStyle = '#000'; h.lineWidth = CELL * 0.9;
    for (const p of map.paths) { h.beginPath(); p.forEach(([c, r], i) => { const x = (c + 0.5) * CELL, y = (r + 0.5) * CELL; i ? h.lineTo(x, y) : h.moveTo(x, y); }); h.stroke(); }
    h.globalCompositeOperation = 'source-in'; h.imageSmoothingQuality = 'high';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const f = (c * 5 + r * 3) % 4; h.save(); h.translate((c + 0.5) * CELL, (r + 0.5) * CELL); h.scale(f & 1 ? -1 : 1, f & 2 ? -1 : 1); h.drawImage(t, -CELL / 2 - 0.5, -CELL / 2 - 0.5, CELL + 1, CELL + 1); h.restore(); }
    h.fillStyle = tint; h.fillRect(0, -MARGIN, WORLD_W, WORLD_H + 2 * MARGIN);
  });
  g.drawImage(tmp, 0, -MARGIN, WORLD_W, WORLD_H + 2 * MARGIN);
  return true;
}
function decorImg(g, kind, x, y, theme, key) {
  const list = THEME_PROPS[theme], src = list ? list[key % list.length] : DECOR_SRC[kind], im = src && img(`decor/${src}.webp`); if (!im) return false;
  const h = DECOR_H[src] || 44, w = h * im.naturalWidth / im.naturalHeight;
  shadowEll(g, x, y + 12, w * 0.4, 5, 0.4);
  g.imageSmoothingQuality = 'high'; g.drawImage(im, x - w / 2, y + 14 - h, w, h);
  return true;
}

// ───── дорога: булыжник или колея, свечение магмы, травинки ─────
const ROAD_STYLE = {
  grave: { k: 'cobble', c: '#7b7d83', gap: 'rgba(6,6,10,.6)' }, forest: { k: 'dirt', c: '#7a6044', blade: '#4f7a3a' }, desert: { k: 'dirt', c: '#b98a4e' },
  ice: { k: 'cobble', c: '#b9cad9', gap: 'rgba(40,70,110,.55)' }, lava: { k: 'cobble', c: '#37312f', gap: 'rgba(255,110,40,.55)', glow: true }, slaughter: { k: 'cobble', c: '#7a574d', gap: 'rgba(40,6,6,.75)' },
};
function roadDetail(g, map, R) {
  const st = ROAD_STYLE[map.theme] || ROAD_STYLE.grave, Wd = CELL * 0.86;
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
// ───── земля: пятна света/тени и мелкие предметы (не мешают строить) ─────
const MICRO = { grave: ['bones', 'rocks'], forest: ['rocks', 'crystal'], desert: ['bones', 'rocks'], ice: ['rocks', 'crystal'], lava: ['rocks'], slaughter: ['bones', 'rocks'] };
function groundDetail(g, map, theme, onPath, dec, R) {
  for (let i = 0; i < 46 + 30; i++) {
    const x = R() * WORLD_W, y = -MARGIN + R() * (WORLD_H + 2 * MARGIN), r = 26 + R() * 50, light = R() < 0.45;
    g.fillStyle = rad(g, x, y, 0, r, [[0, light ? 'rgba(255,255,230,.07)' : 'rgba(0,0,0,.14)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const th = THEMES[theme], micro = MICRO[theme] || [];
  for (let r = -MARGIN_ROWS; r < ROWS + MARGIN_ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (onPath.has(c + ',' + r) || dec.has(c + ',' + r)) continue;
    const n = R() < 0.55 ? 1 + (R() < 0.35 ? 1 : 0) : 0;
    for (let k = 0; k < n; k++) {
      const x = (c + 0.15 + R() * 0.7) * CELL, y = (r + 0.2 + R() * 0.7) * CELL, q = R();
      if (q < 0.5 && theme !== 'lava') {                                                                    // травинки / снежные бугорки
        if (theme === 'ice') { ell(g, x, y, 3 + R() * 3, 1.4 + R(), 0); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill(); }
        else if (theme === 'desert') { ell(g, x, y, 2 + R() * 2, 1 + R(), R() * 3); g.fillStyle = 'rgba(90,55,20,.35)'; g.fill(); }
        else { g.strokeStyle = th.tuft; g.lineWidth = 1; g.beginPath(); for (let b = -1; b <= 1; b++) { g.moveTo(x + b * 2, y); g.lineTo(x + b * 3 + (R() - 0.5) * 2, y - 4 - R() * 3); } g.stroke(); }
      } else if (q < 0.82 && micro.length) {
        const im = img(`decor/${micro[(R() * micro.length) | 0]}.webp`);
        if (im) { const h = 6 + R() * 5, w = (h * im.naturalWidth) / im.naturalHeight; g.save(); g.globalAlpha = 0.55; g.drawImage(im, x - w / 2, y - h * 0.7, w, h); g.restore(); }
      } else if (theme === 'lava') { glow(g, x, y, 5 + R() * 4, '#ff7a2a', 0.45); }
    }
  }
}

export function bakeMap(map) {
  const th = THEMES[map.theme];
  const R = rng(map.id.length * 7919 + 13);
  const c = mk(WORLD_W, WORLD_H + 2 * MARGIN, (g) => {
    g.translate(0, MARGIN);
    // основа
    if (!(SPR.ok && groundTiles(g, map.theme, R))) {
      g.fillStyle = lin(g, 0, -MARGIN, 0, WORLD_H + MARGIN, [[0, th.base], [1, th.base2]]); g.fillRect(0, -MARGIN, WORLD_W, WORLD_H + 2 * MARGIN);
      for (let i = 0; i < 900; i++) { const x = R() * WORLD_W, y = R() * WORLD_H; ell(g, x, y, 2 + R() * 9, 1 + R() * 5, R() * 3); g.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.045)'; g.fill(); }
      // слабая шахматка клеток (подсказка сетки)
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if ((r + c) % 2) { g.fillStyle = 'rgba(0,0,0,0.045)'; g.fillRect(c * CELL, r * CELL, CELL, CELL); }
      // травинки/снег
      for (let i = 0; i < 320; i++) { const x = R() * WORLD_W, y = R() * WORLD_H; g.strokeStyle = th.tuft; g.lineWidth = 1; g.globalAlpha = 0.5 + R() * 0.4; g.beginPath(); for (let k = -1; k <= 1; k++) { g.moveTo(x + k * 2, y); g.lineTo(x + k * 3, y - 3 - R() * 3); } g.stroke(); } g.globalAlpha = 1;
    }
    // дорога
    const strokePaths = (w, col) => { g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = col; g.lineWidth = w; for (const p of map.paths) { g.beginPath(); p.forEach(([c, r], i) => { const x = (c + 0.5) * CELL, y = (r + 0.5) * CELL; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); } };
    if (SPR.ok) { g.save(); g.shadowColor = 'rgba(0,0,0,.65)'; g.shadowBlur = 10; strokePaths(CELL * 1.06, th.edge); g.restore(); } else strokePaths(CELL * 1.04, th.edge);
    if (SPR.ok && roadTexture(g, map, strokePaths)) { roadDetail(g, map, R); }
    else { strokePaths(CELL * 0.9, th.path);
    strokePaths(CELL * 0.62, th.pathHi); g.globalAlpha = 0.5; strokePaths(CELL * 0.4, th.path); g.globalAlpha = 1; }
    // камушки на дороге и бордюр
    for (const p of map.paths) {
      for (let i = 1; i < p.length; i++) {
        const [c0, r0] = p[i - 1], [c1, r1] = p[i];
        const x0 = (c0 + 0.5) * CELL, y0 = (r0 + 0.5) * CELL, x1 = (c1 + 0.5) * CELL, y1 = (r1 + 0.5) * CELL, L = Math.hypot(x1 - x0, y1 - y0);
        const nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
        for (let d = 0; d < L; d += 7) {
          const bx = x0 + ((x1 - x0) * d) / L, by = y0 + ((y1 - y0) * d) / L;
          for (const side of [-1, 1]) if (R() < 0.8) { const o = side * (CELL * 0.47 + (R() - 0.5) * 4); ell(g, bx + nx * o, by + ny * o, 1.9 + R() * 1.9, 1.4 + R() * 1.2, R() * 3); fillStroke(g, shade(th.stone, -0.32 + (R() - 0.5) * 0.2), 0.8); }
          if (R() < 0.35) { const o = (R() - 0.5) * CELL * 0.6; circ(g, bx + nx * o, by + ny * o, 0.8 + R()); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fill(); }
        }
      }
    }
    // занятые клетки пути для ambient
    const onPath = new Set();
    for (const p of map.paths) for (let i = 1; i < p.length; i++) { const [c0, r0] = p[i - 1], [c1, r1] = p[i]; let c = c0, r = r0; const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0); for (;;) { onPath.add(c + ',' + r); if (c === c1 && r === r1) break; c += dc; r += dr; } }
    const dec = new Set(map.decor.map(([c, r]) => c + ',' + r));
    if (SPR.ok) groundDetail(g, map, map.theme, onPath, dec, R);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const k = c + ',' + r; if (onPath.has(k) || dec.has(k)) continue;
      if (!SPR.ok && R() < 0.45) ambient(g, (c + 0.2 + R() * 0.6) * CELL, (r + 0.2 + R() * 0.6) * CELL, map.theme, R);
    }
    // декор по рядам (сверху вниз)
    [...map.decor].sort((a, b) => a[1] - b[1]).forEach(([c, r, kind]) => { if (PROC_DECOR.has(kind)) return; if (!(SPR.ok && decorImg(g, kind, (c + 0.5) * CELL, (r + 0.5) * CELL, map.theme, c * 5 + r * 3 + map.index))) DECOR[kind](g, (c + 0.5) * CELL, (r + 0.5) * CELL, R); });
    // фон за пределами поля: редкие предметы (за дымкой), чтобы карта не обрывалась
    if (SPR.ok) {
      const MR = rng(map.id.length * 131 + map.waves * 7), list = THEME_PROPS[map.theme] || THEME_PROPS.grave, ys = [];
      for (let r = -MARGIN_ROWS; r < ROWS + MARGIN_ROWS; r++) { if (r >= 0 && r < ROWS) continue; for (let c = 0; c < COLS; c++) if (MR() < 0.2) ys.push([c, r]); }
      ys.sort((a, b) => a[1] - b[1]).forEach(([c, r], i) => decorImg(g, 'x', (c + 0.2 + MR() * 0.6) * CELL, (r + 0.5) * CELL, map.theme, i * 7 + c));
    }
    // ландшафт приглушаем (меньше цвета и контраста), чтобы здания и враги читались на нём
    g.save(); g.globalCompositeOperation = 'saturation'; g.globalAlpha = 0.3; g.fillStyle = 'hsl(0,0%,50%)'; g.fillRect(0, -MARGIN, WORLD_W, WORLD_H + 2 * MARGIN); g.restore();
    [...map.decor].filter((d) => PROC_DECOR.has(d[2])).sort((a, b) => a[1] - b[1]).forEach(([c, r, kind]) => { if (!natDecor(g, kind, (c + 0.5) * CELL, (r + 0.5) * CELL, c * 5 + r * 3 + map.index)) DECOR[kind](g, (c + 0.5) * CELL, (r + 0.5) * CELL, R); });      // деревья и валуны рисуем после приглушения, чтобы не выцветали
    // портал врагов и ворота крепости: яркие, поверх приглушённого фона
    // портал и ворота
    for (const p of map.paths) {
      const [sc, sr] = p[0]; const px = Math.min(Math.max(sc, 0), COLS - 1), py = Math.min(Math.max(sr, 0), ROWS - 1);
      portal(g, (px + 0.5) * CELL + (sc < 0 ? 4 : 0), (py + 0.5) * CELL + (sr < 0 ? -6 : 0));
    }
    // ворота крепости
    const last = map.paths[0][map.paths[0].length - 1];
    const gx = Math.min(Math.max(last[0], 0), COLS - 1), gy = Math.min(Math.max(last[1], 0), ROWS - 1);
    gate(g, (gx + 0.5) * CELL, (gy + 0.5) * CELL - (last[1] >= ROWS ? 2 : 0) - 2);
    // атмосфера: туман и виньетка
    g.fillStyle = th.sky; g.fillRect(0, -MARGIN, WORLD_W, WORLD_H + 2 * MARGIN);
    g.fillStyle = rad(g, WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.35, WORLD_H * 0.85, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(8,2,6,0.55)']]); g.fillRect(0, 0, WORLD_W, WORLD_H);
    // дымка за краями поля: вне поля тьма сгущается, UI ложится на неё
    for (const [y0, y1] of [[0, -MARGIN], [WORLD_H, WORLD_H + MARGIN]]) {
      g.fillStyle = lin(g, 0, y0, 0, y1, [[0, 'rgba(8,2,6,0.18)'], [0.35, 'rgba(8,2,6,0.62)'], [1, 'rgba(8,2,6,0.97)']]); g.fillRect(0, Math.min(y0, y1), WORLD_W, MARGIN);
    }
  });
  c.my = MARGIN; return c;
}

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
