// Кристалл как настоящая вращающаяся модель: огранка (корона, площадка, павильон) считается в 3D, поворачивается вокруг вертикальной оси,
// грани закрашиваются по освещению, со сверканием. Кадры заранее рендерятся в небольшие холсты, а общий таймер лишь подставляет нужный кадр
// во все холсты .gem3d на странице — это почти бесплатно.
const N = 64, SZ = 96, SIDES = 8;
let frames = null;

function build() {
  const out = [];
  const gir = [], tab = [];
  for (let i = 0; i < SIDES; i++) { const a = (i / SIDES) * Math.PI * 2 + Math.PI / SIDES; gir.push([Math.cos(a), 0, Math.sin(a)]); tab.push([Math.cos(a) * 0.52, -0.46, Math.sin(a) * 0.52]); }
  const culet = [0, 0.98, 0];
  const faces = [];
  for (let i = 0; i < SIDES; i++) {
    const j = (i + 1) % SIDES;
    faces.push({ v: [gir[i], gir[j], tab[j], tab[i]], k: 'crown', i });
    faces.push({ v: [gir[j], gir[i], culet], k: 'pav', i });
  }
  faces.push({ v: tab.slice().reverse(), k: 'table', i: 0 });
  const L = norm([-0.45, -0.7, 0.55]);
  for (let f = 0; f < N; f++) {
    const th = (f / N) * Math.PI * 2, tilt = 0.42, c = document.createElement('canvas'); c.width = c.height = SZ;
    const g = c.getContext('2d'), cs = Math.cos(th), sn = Math.sin(th), ct = Math.cos(tilt), st = Math.sin(tilt);
    const rot = (p) => { const x = p[0] * cs + p[2] * sn, z = -p[0] * sn + p[2] * cs, y = p[1]; return [x, y * ct - z * st, y * st + z * ct]; };   // вокруг Y, затем наклон вперёд
    g.translate(SZ / 2, SZ / 2 + 2); g.scale(SZ * 0.42, SZ * 0.42); g.lineJoin = 'round';
    // мягкое свечение позади
    const gl = g.createRadialGradient(0, 0, 0.1, 0, 0, 1.35); gl.addColorStop(0, 'rgba(120,220,255,.35)'); gl.addColorStop(1, 'rgba(120,220,255,0)'); g.fillStyle = gl; g.fillRect(-1.5, -1.5, 3, 3);
    const vis = [];
    for (const fc of faces) {
      const p = fc.v.map(rot), n = normal(p);
      if (n[2] <= 0) continue;                                                // грани, обращённые от зрителя, не рисуем (камень выпуклый)
      const d = Math.max(0, dot(n, L)), spec = Math.pow(Math.max(0, dot(n, norm([L[0], L[1], L[2] + 1]))), 24);
      vis.push({ p, d, spec, fc, z: p.reduce((s, q) => s + q[2], 0) / p.length });
    }
    vis.sort((a, b) => a.z - b.z);
    for (const o of vis) {
      const base = o.fc.k === 'table' ? [150, 235, 255] : o.fc.k === 'crown' ? mix([90, 210, 255], [150, 110, 255], (o.fc.i % 3) / 3) : mix([30, 120, 230], [120, 60, 210], (o.fc.i % 4) / 4);
      const b = 0.52 + 0.78 * o.d, col = base.map((x, i) => Math.min(255, x * b + 255 * o.spec * 0.9 + (i === 2 ? 14 : 0)));
      g.beginPath(); o.p.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath();
      g.fillStyle = `rgb(${col.map(Math.round)})`; g.fill();
      g.lineWidth = 0.035; g.strokeStyle = `rgba(235,250,255,${0.35 + 0.4 * o.d})`; g.stroke();
    }
    // тёмный контур камня
    // сверкание раз за оборот
    const ph = ((f / N) + 0.04) % 1, a = ph < 0.16 ? Math.sin((ph / 0.16) * Math.PI) : 0;
    if (a > 0.02) { g.save(); g.translate(-0.38, -0.5); g.rotate(ph * 6); g.globalAlpha = a; g.fillStyle = '#fff'; g.shadowColor = '#bff'; g.shadowBlur = 0.25; const s = 0.42 * a; g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.18, -s * 0.18); g.lineTo(s, 0); g.lineTo(s * 0.18, s * 0.18); g.lineTo(0, s); g.lineTo(-s * 0.18, s * 0.18); g.lineTo(-s, 0); g.lineTo(-s * 0.18, -s * 0.18); g.closePath(); g.fill(); g.restore(); }
    out.push(c);
  }
  return out;
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
function normal(p) { const u = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]], v = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]]; return norm([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]); }

let tick = 0, timer = 0;
// Анимируем только кристалл на главном экране (IntersectionObserver), не чаще 10 раз в секунду и только пока ничто его не закрывает; остальным рисуем один статичный кадр.
// Раньше таймер каждые 55 мс перерисовывал все холсты на странице (в Кузнице их десятки) — телефон грелся.
const visible = new Set(); let io = null;
function watch(c) {
  c.dataset.w = '1';
  const g = c.getContext('2d'); g.drawImage(frames[(+c.dataset.ph || 0) % N], 0, 0, c.width, c.height);
  if (c.closest('#title')) { if (io) io.observe(c); else visible.add(c); }      // вращается только кристалл на главном экране, в остальных окнах он неподвижный
}
function paint() {
  if (document.hidden) return;
  const gm = document.getElementById('game'); if (gm && !gm.classList.contains('hidden')) return;           // в бою кристаллов нет: не тратим время
  for (const c of document.querySelectorAll('canvas.gem3d:not([data-w])')) watch(c);
  if (document.querySelector('.screen:not(#title):not(#loading):not(.hidden)')) return;                       // поверх главного экрана открыто окно: не анимируем скрытое
  tick = (tick + 1) % N;
  for (const c of visible) {
    if (!c.isConnected) { visible.delete(c); if (io) io.unobserve(c); continue; }
    const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.drawImage(frames[(tick * 2 + (+c.dataset.ph || 0)) % N], 0, 0, c.width, c.height);
  }
}
export function startGems() {
  if (timer) return; frames = frames || build();
  try { io = new IntersectionObserver((es) => { for (const e of es) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); } }); } catch (e) { io = null; }
  timer = setInterval(paint, 100);
}
// Неподвижный кристалл (все окна, кроме главного экрана): готовая картинка, без холстов и таймеров
const urls = new Map();
export function gemUrl(ph = 0) { if (!frames) frames = build(); const k = ph % N; let u = urls.get(k); if (!u) { u = frames[k].toDataURL(); urls.set(k, u); } return u; }
// HTML кристалла нужного размера (n — в пикселях страницы); anim = true — вращающийся (только на главном экране)
export const gemHtml = (n = 24, ph = 0, anim = false) => anim
  ? `<span class="gemic"><canvas class="gem3d" width="${Math.round(n * 2)}" height="${Math.round(n * 2)}" data-ph="${ph}" style="width:${n}px;height:${n}px"></canvas></span>`
  : `<span class="gemic"><img src="${gemUrl(ph)}" alt="" width="${n}" height="${n}" style="width:${n}px;height:${n}px"></span>`;
