// Отрисовка игрового поля: фон, кровь, сущности (с сортировкой по глубине), снаряды, частицы, подсказки.
import { CELL, COLS, ROWS, WORLD_W, WORLD_H, PAD, VIEW_COLS, TOWERS, ECON, SPELLS } from './data.js?v=20261030160142';
import * as A from './art.js?v=20261030160142';
import { ENEMY_ART, FRAMES, enemyFrame, tinted, tintCanvas, animFrame, eliteFrame, drawAnim, BLOOD } from './enemies.js?v=20261030160142';
import { tile } from './iconmap.js?v=20261030160142';
import { img } from './sprites.js?v=20261030160142';
import { mapBG, glowSprite, smokeSprite, shardSprite, coinSprite, bagSprite, sawBladeSprite, scorchSprite } from './env.js?v=20261030160142';

const T2 = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const BUILD_K = 1.2, FIT_W = CELL * 0.98;           // здания крупнее среднего монстра и декора-статуй, но основание всегда помещается в свою клетку (не заходит на дорогу и соседей)
// обучение: золотой контур по форме картинки (силуэт, раздутый на несколько пикселей) и границы непрозрачных пикселей
const _outl = new WeakMap(), _bnd = new WeakMap();
function outlineOf(img) {
  let o = _outl.get(img); if (o) return o;
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, P = Math.max(3, Math.round(Math.max(w, h) / 40));
  const t = document.createElement('canvas'); t.width = w; t.height = h; const tg = t.getContext('2d'); tg.drawImage(img, 0, 0, w, h); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = '#ffd65a'; tg.fillRect(0, 0, w, h);
  const c = document.createElement('canvas'); c.width = w + 2 * P; c.height = h + 2 * P; const g = c.getContext('2d');
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.drawImage(t, P + Math.cos(a) * P, P + Math.sin(a) * P); }
  o = { c, P, w, h }; _outl.set(img, o); return o;
}
function alphaBounds(img) {
  let b = _bnd.get(img); if (b) return b;
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h);
  let x0 = w, y0 = h, x1 = 0, y1 = 0; try { const d = g.getImageData(0, 0, w, h).data; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } } catch (e) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; }
  b = { x0, y0, x1, y1, w, h }; _bnd.set(img, b); return b;
}
function buildK(at, level, br) { if (!(A.SPR.ok && A.SPR.towers[at])) return 1; const g = A.towerGeo(at, level, br); return Math.min(BUILD_K, FIT_W / Math.max(1, g.right - g.left)); }

// взмахов крыльев в секунду: раньше цикл из 8 кадров проходил за 0.1 с (кадры мелькали быстрее экрана и моргали); теперь у каждого свой неторопливый ритм
const FLAP = { bat: 2.2, gargoyle: 1.6, reaper: 1.4 };
const FACE0 = { bolt: 1, mortar: 1, flame: 1, harpoon: -1 };      // куда смотрит картинка башни по умолчанию: 1 вправо, -1 влево
// масштаб карты: на экране видно VIEW_COLS клеток в ширину, остальное достаём пальцем
const zoomFor = (cssW) => clamp(cssW / (VIEW_COLS * CELL), 1, 1.7);
// «КРИТ»: готический шрифт, красно-золотой градиент и по молнии с каждой стороны; появляется с «ударом» и быстро гаснет
const BOLT = [[2.5, -6], [-2.5, 0.5], [0, 0.5], [-2, 6], [3, -1], [0.3, -1]];
function drawBolt(ctx, x, y, sc, flip) {
  ctx.beginPath(); BOLT.forEach(([px, py], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, x + px * sc * flip, y + py * sc)); ctx.closePath();
}
function drawCritText(ctx, f, a) {
  const pop = f.t < 0.12 ? 1.5 - f.t * 4 : 1, size = 10.5 * pop, tw = (() => { ctx.font = `700 ${size}px "Playfair Display SC", "Oswald", Georgia, serif`; return ctx.measureText(f.text).width; })();
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const g = ctx.createLinearGradient(0, f.y - size * 0.6, 0, f.y + size * 0.6); g.addColorStop(0, '#fff3a0'); g.addColorStop(0.5, '#ffb52a'); g.addColorStop(1, '#ff4a1a');
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(30,6,4,0.95)'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = g; ctx.fillText(f.text, f.x, f.y);
  const bx = tw / 2 + 6 * pop, sc = 0.95 * pop;
  for (const sd of [-1, 1]) { drawBolt(ctx, f.x + sd * bx, f.y, sc, sd); ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(30,6,4,0.95)'; ctx.stroke(); ctx.fillStyle = '#ffe45a'; ctx.fill(); }
  ctx.restore();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.zoom = 1; this.ox = 0; this.oy = 0; this.dpr = 1; this.cssW = 0; this.cssH = 0;
    this.cx = WORLD_W / 2; this.cy = WORLD_H / 2; this.vx = 0; this.vy = 0;          // центр камеры в мире и скорость прокрутки (инерция)
    this.vw = { x0: 0, y0: 0, x1: WORLD_W, y1: WORLD_H };                              // видимая часть мира (для отсечения невидимого)
    this.t = 0; this.chestFx = [];
    this.bg = null; this.mapId = null;
  }
  static pickScale(cssW, cssH, dpr) {
    return clamp(Math.round(zoomFor(cssW) * dpr * 1.3 * 2) / 2, 1.5, 3);       // масштаб кэша спрайтов: чуть больше экранного, без лишней памяти
  }
  resize(cssW, cssH, dpr) {
    this.cssW = cssW; this.cssH = cssH; this.dpr = dpr;
    const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
    if (this.canvas.width !== w) this.canvas.width = w;                // присваивание размера очищает и пересоздаёт холст: только если размер правда изменился
    if (this.canvas.height !== h) this.canvas.height = h;
    this.zoom = zoomFor(cssW); this.place();
  }
  // камера: центр (cx, cy) держим внутри фона карты; если фон меньше экрана — по центру
  place() {
    const z = this.zoom, hw = this.cssW / z / 2, hh = this.cssH / z / 2, x0 = -PAD.l, x1 = WORLD_W + PAD.r, y0 = -PAD.t, y1 = WORLD_H + PAD.b;
    this.cx = x1 - x0 <= hw * 2 ? (x0 + x1) / 2 : clamp(this.cx, x0 + hw, x1 - hw);
    this.cy = y1 - y0 <= hh * 2 ? (y0 + y1) / 2 : clamp(this.cy, y0 + hh, y1 - hh);
    this.ox = this.cssW / 2 - this.cx * z; this.oy = this.cssH / 2 - this.cy * z;
    this.vw = { x0: this.cx - hw, y0: this.cy - hh, x1: this.cx + hw, y1: this.cy + hh };
  }
  panBy(dxCss, dyCss) { this.goal = null; this.cx += dxCss / this.zoom; this.cy += dyCss / this.zoom; this.place(); }
  // выбранное здание не должно прятаться за панелью внизу или у края экрана: плавно сдвигаем карту
  reveal(wx, wy, bottom = 210, top = 70, side = 56) {
    const sy = (wy - this.vw.y0) * this.zoom, sx = (wx - this.vw.x0) * this.zoom; let dx = 0, dy = 0;
    if (sy > this.cssH - bottom) dy = (sy - (this.cssH - bottom)) / this.zoom; else if (sy < top) dy = (sy - top) / this.zoom;
    if (sx < side) dx = (sx - side) / this.zoom; else if (sx > this.cssW - side) dx = (sx - (this.cssW - side)) / this.zoom;
    if (dx || dy) this.goal = { x: this.cx + dx, y: this.cy + dy };
  }
  focus(wx, wy) { this.cx = wx; this.cy = wy; this.vx = this.vy = 0; this.goal = null; this.place(); }
  inView(x, y, m = 60) { const v = this.vw; return x > v.x0 - m && x < v.x1 + m && y > v.y0 - m && y < v.y1 + m; }
  setGame(sim, gore) {
    this.sim = sim; this.gore = gore; this.chestFx = []; this.corpses = [];
    if (!sim._cfx2) { sim._cfx2 = true; sim.on('kill', (d) => { const e = d.e, a = ENEMY_ART[e.type]; if (a && a.anims && a.anims.rows.death) this.corpses.push({ e, type: e.type, x: e.x, y: e.y, face: e.face || 1, air: !!e.def.air, t0: this.t }); }); }      // анимация смерти играет на месте убитого
    if (!sim._cfx) { sim._cfx = true; sim.on('chest', (d) => { if (d.kind === 'open') this.chestFx.push({ x: d.x, y: d.y, t0: this.t }); }); }      // открытый сундук ненадолго остаётся на карте
    this.bg = mapBG(sim.map); this.mapId = sim.mapId;
    const ps = sim.map.paths; this.vx = this.vy = 0; this.goal = null; this.cx = ps.reduce((a, p) => a + (p[0][0] + 0.5) * CELL, 0) / ps.length; this.cy = -1e4; if (this.cssW) this.place();      // на старте виден верх карты: оттуда придут враги
  }
  // освободить память после боя: фон карты и кэши
  release() { this._uc = null; this.bg = null; this.mapId = null; this.corpses = []; this.chestFx = []; this.sim = null; this.gore = null; }
  toScreen(wx, wy) { return { x: this.ox + wx * this.zoom, y: this.oy + wy * this.zoom }; }
  toWorld(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (clientX - r.left - this.ox) / this.zoom, y: (clientY - r.top - this.oy) / this.zoom };
  }

  render(dt, view) {
    const sim = this.sim, gore = this.gore, ctx = this.ctx;
    this.t += dt; const t = this.t;
    if (this.goal) {
      const k = 1 - Math.exp(-dt * 9); this.cx += (this.goal.x - this.cx) * k; this.cy += (this.goal.y - this.cy) * k;
      if (Math.abs(this.goal.x - this.cx) + Math.abs(this.goal.y - this.cy) < 0.6) this.goal = null;
    }
    if (this.vx || this.vy) {                                           // инерция прокрутки после броска пальцем
      this.cx += this.vx * dt; this.cy += this.vy * dt; const f = Math.exp(-dt * 4.5); this.vx *= f; this.vy *= f;
      if (Math.abs(this.vx) + Math.abs(this.vy) < 4) this.vx = this.vy = 0;
    }
    this.place(); gore.cam.x = this.cx; gore.cam.y = this.cy;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0609'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const k = this.dpr * this.zoom;
    ctx.setTransform(k, 0, 0, k, Math.round(this.dpr * this.ox), Math.round(this.dpr * this.oy));          // сдвиг камеры только целыми пикселями экрана: фон и спрайты двигаются как одно целое, без дрожания
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    this.drawBg(ctx);
    gore.drawBlood(ctx);
    this.drawZones(ctx, t);
    this.drawCorpses(ctx, t);
    if (view.armed) this.drawPlaceHints(ctx, view, t);
    this.drawPortalGate(ctx, t);

    // сущности: наземные сортируем по y, воздух поверх
    const list = [];
    for (const b of sim.buildings) if (this.inView(b.x, b.y, 80)) list.push({ y: b.y + 10, o: b, k: 0 });
    if (sim.chest && this.inView(sim.chest.x, sim.chest.y, 60)) list.push({ y: sim.chest.y + 6, o: sim.chest, k: 3 });
    const air = [];
    for (const e of sim.enemies) { if (e.dead || !this.inView(e.x, e.y, 90)) continue; (e.air ? air : list).push({ y: e.y, o: e, k: 2 }); }
    list.sort((a, b) => a.y - b.y); air.sort((a, b) => a.y - b.y);
    for (const it of list) { if (it.k === 0) this.drawBuilding(ctx, it.o, t, view); else if (it.k === 3) this.drawChest(ctx, it.o, t); else this.drawEnemy(ctx, it.o, t); }
    for (const it of air) this.drawEnemy(ctx, it.o, t);
    this.drawChestFx(ctx, t);

    this.drawProjs(ctx, t);
    this.drawParticles(ctx, gore, t);
    this.drawBolts(ctx, gore);
    this.drawBags(ctx, t, view);
    this.drawOverlays(ctx, view, t);
    for (const f of gore.floaters) {
      const a = 1 - clamp((f.t - 0.6) / 0.5, 0, 1);
      if (f.kind === 'crit') { drawCritText(ctx, f, a); continue; }       // числа критов видны всегда, даже если обычные числа урона выключены
      if (this.floaters === false) continue;
      ctx.save(); ctx.globalAlpha = a; ctx.font = `800 ${Math.round(13 * f.k)}px "Oswald", Impact, sans-serif`; ctx.textAlign = 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,8,10,0.9)'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.col; ctx.fillText(f.text, f.x, f.y); ctx.restore();
    }
    // красная вспышка при утечке/метеоре
    if (gore.flash > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = gore.flashCol; ctx.globalAlpha = Math.min(0.5, gore.flash * 0.9); ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); ctx.globalAlpha = 1;
    }
  }

  // рисуем только видимый кусок запечённого фона
  drawBg(ctx) {
    const bg = this.bg; if (!bg || !bg.width) return;                  // фон мог быть выброшен при переходе на другой уровень
    ctx.drawImage(bg, -PAD.l, -PAD.t, bg.lw, bg.lh);                  // целиком, без вырезки куска: вырезка с дробными границами даёт дрожание фона относительно спрайтов
  }

  // ───── сущности ─────
  // враг выходит из зева портала (растёт и проявляется) и у ворот уменьшается и исчезает в проёме
  drawEnemy(ctx, e, t) {
    const fin = Math.min(1, e.d / 22), fout = Math.min(1, (e.path.total - e.d) / 20), f = Math.min(fin, fout);
    if (f >= 1) { this.drawEnemyInner(ctx, e, t); return; }
    const k = 0.55 + 0.45 * f;
    ctx.save(); ctx.globalAlpha = Math.max(0, f); ctx.translate(e.x, e.y); ctx.scale(k, k); ctx.translate(-e.x, -e.y); this.drawEnemyInner(ctx, e, t); ctx.restore();
  }
  drawEnemyInner(ctx, e, t) {
    const sim = this.sim, def = e.def, a = ENEMY_ART[e.type]; if (!a) return;           // лист этого вида не загружен (не должно случаться): пропускаем, а не роняем отрисовку
    if (Math.abs(e.dx) > 0.35) e.face = e.dx > 0 ? 1 : -1; else if (!e.face) e.face = 1;
    const speed = sim.curSpeed(e);
    let fi, spr, animName = null, mirror = e.face < 0;
    if (a.anims) {
      // направление движения: вправо/влево (одна анимация, влево зеркалим), вниз (к камере) или вверх (от камеры); гистерезис, чтобы не мигало на поворотах
      // дороги идут строго по осям, поэтому берём ту сторону, куда враг идёт сейчас: прямо на зрителя (вниз) — вид спереди, от зрителя (вверх) — со спины
      const dir = Math.abs(e.dy) > Math.abs(e.dx) ? (e.dy > 0 ? 'D' : 'U') : 'R';
      e._dir = dir;
      const rows = a.anims.rows;
      animName = 'walk' + dir; const n = rows[animName].n;                                  // вниз (к зрителю) — вид спереди, вверх — со спины; раньше у летающих вниз брался вид со спины, и гаргулья летела «задом наперёд»
      fi = def.air ? Math.floor((((t * (FLAP[e.type] || 2) + e.id * 0.37) % 1) + 1) % 1 * n) % n : speed > 0 ? Math.floor((((e.d / (36 * def.size)) % 1) + 1) % 1 * n) % n : 0;
      mirror = mirror && animName === 'walkR';
    } else {
      if (def.air) fi = Math.floor(((t * 9 + e.id) % 1 + 1) % 1 * FRAMES) % FRAMES;
      else fi = speed > 0 ? Math.floor((((e.d / (36 * def.size)) % 1) + 1) % 1 * FRAMES) % FRAMES : 0;
      spr = enemyFrame(e.type, fi);
    }
    const lift = def.air ? 20 : (a.lift || 0);
    const bob = def.air ? Math.sin(t * 5 + e.id) * 2 : 0;
    if (!a.anims) { ctx.save(); ctx.globalAlpha = def.air ? 0.3 : 0.4; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(e.x, e.y + (def.air ? 9 : 1), a.shadow * (def.air ? 0.7 : 1), a.shadow * 0.38, 0, 0, T2); ctx.fill(); ctx.restore(); }     // у новых спрайтов тени нет
    if (e.elite) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + 0.2 * Math.sin(t * 6 + e.id); const gw = a.shadow * 3.4; ctx.drawImage(glowSprite('#ff3a2a'), e.x - gw / 2, e.y - gw * 0.4, gw, gw * 0.7); ctx.restore(); }
    ctx.save(); ctx.translate(e.x, e.y - lift + bob);
    if (e.splitT > 0) { const s = 1 + e.splitT * 0.8; ctx.scale(s, 1 / s); }
    if (e.elite) ctx.scale(1.12, 1.12);
    if (a.raster && !a.anims && !def.air && speed > 0) { const ph = (fi / FRAMES) * T2; ctx.translate(0, -Math.abs(Math.sin(ph)) * 1.5); ctx.rotate(Math.sin(ph) * 0.035); }   // шаг: лёгкое покачивание
    if (mirror) ctx.scale(-1, 1);
    if (a.anims) { const ef = e.elite && eliteFrame(e.type, animName, fi); if (ef) ctx.drawImage(ef, -a.ax, -a.ay, ef.lw, ef.lh); else drawAnim(ctx, e.type, animName, fi); } else ctx.drawImage(spr, -a.ax, -a.ay, spr.lw, spr.lh);
    // оверлеи статусов
    let tint = null;
    if (e.freezeT > 0) tint = ['#9fe0ff', 0.6];
    else if (e.burnT > 0) tint = ['#ff6a1c', 0.3 + 0.1 * Math.sin(t * 20)];
    else if (e.poison.length) tint = ['#5fe03a', 0.28];
    else if (e.slowF > 0.05) tint = ['#6aa8ff', 0.22];
    if (tint) { const al = Math.round(tint[1] * 20) / 20, ts = a.anims ? tintCanvas(animFrame(e.type, animName, fi), `${e.type}:${animName}:${fi}`, tint[0], al) : tinted(e.type, fi, tint[0], al); ctx.drawImage(ts, -a.ax, -a.ay, ts.lw, ts.lh); }
    if (e.freezeT > 0) { ctx.fillStyle = 'rgba(190,235,255,0.28)'; ctx.strokeStyle = 'rgba(230,248,255,0.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, -a.ay * 0.42, a.size * 0.2, a.ay * 0.5, 0, 0, T2); ctx.fill(); ctx.stroke(); }
    ctx.restore();
    // значки над головой
    const top = e.y - lift - a.ay * 0.88 + bob;
    if (e.stunT > 0) { for (let i = 0; i < 3; i++) { const an = t * 6 + (i * T2) / 3; ctx.fillStyle = '#ffe27a'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('★', e.x + Math.cos(an) * 8, top - 2 + Math.sin(an) * 2.5); } }
    if (e.mark > 0) { ctx.fillStyle = '#ff3a3a'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('☠', e.x, top - 8); }
    if (e.shred > 0) { ctx.fillStyle = '#d6ff3a'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('▼', e.x + 9, top - 2); }
    // HP
    if (e.hp < e.maxHp - 0.01) {
      const w = (14 + 8 * def.size) * 1.2, h = def.heavy ? 4.5 : 3.5, bx = e.x - w / 2, by = top - 3;
      ctx.fillStyle = 'rgba(10,4,6,0.85)'; ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
      const f = clamp(e.hp / e.maxHp, 0, 1);
      ctx.fillStyle = f > 0.5 ? '#6fd13a' : f > 0.25 ? '#f0b020' : '#e0243a'; ctx.fillRect(bx, by, w * f, h);
      if (e.elite) { ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 1; ctx.strokeRect(bx - 1.5, by - 1.5, w + 3, h + 3); }
    }
  }

  // сундук-сюрприз: слегка светится белым из приоткрытой крышки, вздрагивает от касаний, над ним копятся точки-счётчики
  // убитые враги: кадры смерти, потом тело тает
  drawCorpses(ctx, t) {
    if (!this.corpses.length) return;
    this.corpses = this.corpses.filter((c) => t - c.t0 < 1.5);
    for (const c of this.corpses) {
      if (c.e._gibbed) continue;
      const a = ENEMY_ART[c.type], n = a.anims.rows.death.n, age = t - c.t0, fi = Math.min(n - 1, Math.floor(age * 12));
      const al = age < 0.95 ? 1 : Math.max(0, 1 - (age - 0.95) / 0.5), fall = c.air ? 20 * (1 - Math.min(1, age / 0.4)) : 0;      // летучая мышь падает на землю
      ctx.save(); ctx.globalAlpha = al; ctx.translate(c.x, c.y - (c.air ? fall : (a.lift || 0))); if (c.face < 0) ctx.scale(-1, 1);
      drawAnim(ctx, c.type, 'death', fi); ctx.restore();
    }
  }
  drawChestFx(ctx, t) {
    const im = img('decor/obj_chest_open.webp'); this.chestFx = this.chestFx.filter((f) => t - f.t0 < 1.3); if (!im) return;
    for (const f of this.chestFx) {
      const a = t - f.t0, al = a < 0.8 ? 1 : 1 - (a - 0.8) / 0.5, w = 46, h = w * im.naturalHeight / im.naturalWidth;
      ctx.save(); ctx.globalAlpha = al; ctx.translate(f.x, f.y + 8); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, -w / 2, -h * 0.92, w, h); ctx.restore();
    }
  }
  drawChest(ctx, ch, t) {
    const im = img('decor/obj_chest.webp') || img('decor/chest_loot.webp'); if (!im) return;
    const pop = Math.min(1, ch.born / 0.4), sh = ch.shake > 0 ? Math.sin(t * 55) * (ch.shake / 0.4) * 3.2 : 0, sq = ch.shake > 0 ? 1 + 0.07 * Math.sin((1 - ch.shake / 0.4) * Math.PI) : 1;
    const x = ch.x + sh, y = ch.y + 8, w = 46 * sq * (0.6 + 0.4 * pop), ar = im.naturalHeight / im.naturalWidth;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 + 0.2 * Math.sin(t * 3.2) + (ch.shake > 0 ? 0.25 : 0); ctx.drawImage(glowSprite('#ffffff'), ch.x - 34, y - 52, 68, 50); ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.rotate(sh * 0.012); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, -w / 2, -w * ar * 0.92, w, w * ar); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#fffbe0'; for (let i = 0; i < 3; i++) { const ph = (t * 0.8 + i / 3) % 1, a = Math.sin(ph * Math.PI); ctx.globalAlpha = a * 0.85; const sx = ch.x - 8 + i * 8, sy = y - 24 - ph * 18; ctx.beginPath(); ctx.arc(sx, sy, 1.4 + a, 0, T2); ctx.fill(); } ctx.restore();
    if (ch.behind && this.bg && this.bg.trees) { const tr = this.bg.trees.get(ch.behind); if (tr && tr.c.width) { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(tr.c, tr.x, tr.y, tr.w, tr.h); } }      // сундук за деревом: крона и ствол поверх него
    if (ch.hits > 0) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(ch.x + (i - 1) * 9, y - 46, 3.2, 0, T2); ctx.fillStyle = i < ch.hits ? '#ffe27a' : 'rgba(0,0,0,.55)'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#140a04'; ctx.stroke(); }
  }

  drawBuilding(ctx, b, t, view) {
    const bk = buildK(A.artType(b.prem || b.type), b.level, b.branch);
    ctx.save(); ctx.translate(b.x, b.y + 6); ctx.scale(bk, bk); ctx.translate(-b.x, -b.y - 6);      // здания крупнее: хорошо видны и не теряются на большой карте
    if (view.hl && view.hl.b === b) this.drawHl(ctx, b, t);
    this.drawBuilding0(ctx, b, t, view);
    ctx.restore();
  }
  hlSprite(b) { return b.kind === 'econ' ? A.econBody(b.type, b.level) : A.towerFull(A.artType(b.prem || b.type), b.level, b.branch); }
  // обучение: контур здания по его форме (золотая кромка вокруг силуэта)
  drawHl(ctx, b, t) {
    const sp = this.hlSprite(b); if (!sp) return; const o = outlineOf(sp), kx = A.TW_W / o.w;
    ctx.save(); ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 6); ctx.shadowColor = 'rgba(255,200,60,.95)'; ctx.shadowBlur = 10;
    ctx.drawImage(o.c, b.x - A.TW_AX - o.P * kx, b.y + 6 - A.TW_AY - o.P * kx, (o.w + 2 * o.P) * kx, (o.h + 2 * o.P) * kx); ctx.restore();
  }
  // границы здания в мировых координатах (по непрозрачным пикселям картинки с учётом масштаба здания)
  tutBox(b) {
    const sp = this.hlSprite(b); if (!sp) return null; const bd = alphaBounds(sp), kx = A.TW_W / bd.w, bk = buildK(A.artType(b.prem || b.type), b.level, b.branch), ox = b.x - A.TW_AX, oy = b.y + 6 - A.TW_AY;
    const wx = (px) => b.x + (ox + px * kx - b.x) * bk, wy = (py) => b.y + 6 + (oy + py * kx - b.y - 6) * bk;
    return { x: wx(bd.x0), y: wy(bd.y0), w: (bd.x1 - bd.x0 + 1) * kx * bk, h: (bd.y1 - bd.y0 + 1) * kx * bk };
  }
  drawBuilding0(ctx, b, t, view) {
    const x = b.x, y = b.y + 6;
    const wob = 0;      // анимации «сжатия и подпрыгивания» при постройке и улучшении нет: голова башни её не повторяла и вид разваливался
    let body = b.kind === 'econ' ? A.econBody(b.type, b.level) : A.towerBody(A.artType(b.prem || b.type), b.level, b.branch);
    if (b.kind === 'tower' && b.throwT > 0) { const bf = A.towerBodyF(A.artType(b.prem || b.type), b.level, b.branch); if (bf) body = bf; }      // пилорама: на выстреле щель открыта
    const gf = b.type === 'giant' ? A.giantFrame(b) : null;      // Гигант рисуется кадрами броска, а не одной картинкой
    const shake = b.type === 'grinder' && b.throwT > 0 ? Math.sin(t * 70) * 1.1 : 0;      // Гриндер трясёт, пока мелет
    const rc = b.kind === 'econ' ? 0 : Math.min(1, b.recoil || 0);
    if (b.prem) { const col = TOWERS[b.prem].tint; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 + 0.22 * Math.sin(t * 3 + b.id); ctx.drawImage(glowSprite(col), x - 44, y - 24, 88, 58); ctx.restore(); }      // премиум: свечение под башней
    // башня с оружием смотрит в сторону цели: картинка зеркалится влево/вправо (FACE0 — куда смотрит исходная картинка)
    let sx = 1;
    const rh = b.kind === 'tower' ? A.rotHead(A.rotKey(b), b.level, b.branch) : null;      // голова-оружие, которая поворачивается к цели (у премиума своя голова, если для неё есть картинка)
    if (!rh && b.kind === 'tower' && FACE0[b.type] !== undefined && A.SPR.ok) {
      const cs = Math.cos(b.angle || 0); if (b._face === undefined) b._face = FACE0[b.type];
      if (Math.abs(cs) > 0.3) b._face = cs > 0 ? 1 : -1;
      sx = b._face * FACE0[b.type];
    }
    const sel = view.selected === b;
    const dir8 = ((Math.round((b.angle || 0) / (Math.PI / 4)) % 8) + 8) % 8;
    if (sel && rh) {                                   // башня с головой: одна общая обводка вокруг силуэта «тело + голова» (без внутренней линии между ними)
      const key = `${b.type}:${b.prem || ''}:${b.level}:${b.branch || ''}:${dir8}`, UC = this._uc || (this._uc = new Map()); let u = UC.get(key);
      if (!u) {
        const S = body.width / A.TW_W, pad = 26, c = document.createElement('canvas'); c.width = Math.round((A.TW_W + pad * 2) * S); c.height = Math.round((A.TW_H + pad * 2) * S);
        const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.scale(S, S); g.translate(pad, pad); g.drawImage(body, 0, 0, A.TW_W, A.TW_H); A.drawRotHead(g, rh, dir8 * Math.PI / 4, A.TW_AX, A.TW_AY, 0);
        u = { r: A.selRing(c, c.width, c.height, 1, A.TW_W + pad * 2), pad }; UC.set(key, u);
      }
      const r = u.r; ctx.drawImage(r.c, 0, 0, r.W, r.H, x - A.TW_AX - u.pad - r.pad / r.k, y - A.TW_AY - u.pad - r.pad / r.k, r.W / r.k, r.H / r.k);
    }
    ctx.save(); ctx.translate(x + shake, y); ctx.scale((1 - wob) * sx, 1 + wob);
    if (sel && !rh) { const r = A.selRing(body, body.width, body.height, 1, A.TW_W); ctx.drawImage(r.c, 0, 0, r.W, r.H, -A.TW_AX - r.pad / r.k, -A.TW_AY - r.pad / r.k, r.W / r.k, r.H / r.k); }          // выбранное здание: белая обводка по силуэту
    if (gf) { ctx.save(); ctx.translate(0, 6); ctx.scale(gf.sg * gf.k, gf.k); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(gf.im, gf.sx, gf.sy, gf.sw, gf.sh, -gf.ax, -gf.ay, gf.sw, gf.sh); ctx.restore(); }
    else ctx.drawImage(body, -A.TW_AX, -A.TW_AY, A.TW_W, A.TW_H);
    ctx.restore();
    if (rh) {
      ctx.save(); ctx.imageSmoothingQuality = 'high'; const rec = 0;      // голова при выстреле не дёргается: ось поворота неподвижна
      A.drawRotHead(ctx, rh, b.type === 'magnet' ? t * (1.6 + 3.2 * Math.min(1, b.throwT > 0 ? 1 : b.recoil)) : (b.angle || 0), x, y, rec); ctx.restore();
    }
    if (b.prem) { const col = TOWERS[b.prem].tint; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = col; for (let i = 0; i < 3; i++) { const ph = (t * 0.7 + i / 3 + b.id * 0.13) % 1, a2 = Math.sin(ph * Math.PI); const sx = x + Math.sin(i * 2.4 + b.id) * 18, sy = y - 6 - ph * 40; ctx.globalAlpha = a2 * 0.9; ctx.beginPath(); ctx.moveTo(sx, sy - 3.2 * a2); ctx.lineTo(sx + 1, sy - 1); ctx.lineTo(sx + 3.2 * a2, sy); ctx.lineTo(sx + 1, sy + 1); ctx.lineTo(sx, sy + 3.2 * a2); ctx.lineTo(sx - 1, sy + 1); ctx.lineTo(sx - 3.2 * a2, sy); ctx.lineTo(sx - 1, sy - 1); ctx.fill(); } ctx.restore(); }      // и искры
    if (b.kind === 'econ') this.dynEcon(ctx, b, t, x, y);
    else this.dynTower(ctx, b, t, x, y);
    // оглушён
    if (b.stunT > 0) { for (let i = 0; i < 3; i++) { const an = t * 5 + (i * T2) / 3; ctx.fillStyle = '#ffe27a'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('★', x + Math.cos(an) * 10, y - 56 + Math.sin(an) * 3); } }
    // точки уровня над зданием: первая золотая, 2-я и 3-я цвета выбранных улучшений (мощь красная, скорость жёлтая, особое зелёное), 4-я и 5-я — цвета ветки (A синяя, B красная)
    const n = b.level, at = A.artType(b.prem || b.type), top0 = (A.SPR.ok && A.SPR.towers[at]) ? y - A.TW_AY + A.towerGeo(at, b.level, b.branch).top - 5 : y - 50, rh2 = b.kind === 'tower' ? A.rotHead(A.rotKey(b), b.level, b.branch) : null, top = rh2 ? Math.min(top0, y + rh2.dy - rh2.ay * rh2.k + 3) : top0;      // точки уровня — над самой высокой точкой: у башни с головой это верх картинки головы
    const bc = b.branch === 'A' ? '#4aa8ff' : b.branch === 'B' ? '#ff4a4a' : '#ffd24a', pc = A.PICK_COLORS, pk = b.picks || [];
    const cols = ['#ffd24a', pc[pk[0]] || '#ffd24a', pc[pk[1]] || '#ffd24a', bc, bc];
    for (let i = 0; i < n; i++) {
      const px = x + (i - (n - 1) / 2) * 6.5;
      ctx.beginPath(); ctx.arc(px, top, 2.6, 0, T2); ctx.fillStyle = cols[i] || '#ffd24a'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#170a0f'; ctx.stroke();
    }
  }

  dynTower(ctx, b, t, x, y) {
    const lvl = b.level, br = b.branch, art = A.TOWER_ART[b.type];
    const base = y - A.TW_AY; // y-координата верха спрайта
    const add = (sprite, cx, cy, size, alpha) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(alpha, 0, 1); ctx.drawImage(sprite, cx - size / 2, cy - size / 2, size, size); ctx.restore(); };
    if (b.prem && A.SPR.ok) {                         // у дверей премиум-башни горит и мерцает огонь изнутри
      const at = A.artType(b.prem); for (const [dx, dy, dw] of A.towerDoors(at, lvl, br)) { if (dw < 12) continue;
        const k = A.towerPt(at, lvl, br, dx, dy), fl = 0.5 + 0.25 * Math.sin(t * 9 + b.id) + 0.2 * Math.sin(t * 23.7 + b.id * 3) + 0.15 * Math.sin(t * 3.1);
        add(glowSprite('#ff9a3a'), x + k.x, y + k.y + 1, Math.max(9, dw * (A.towerPt(at, lvl, br, 1, 0).x - A.towerPt(at, lvl, br, 0, 0).x) * 2.4), clamp(0.18 + 0.38 * fl, 0, 0.7));
      }
    }
    const M0 = A.muzzle(b);                                     // дуло повёрнутой головы (null у башен без головы)
    switch (b.type) {
      case 'bolt': case 'mortar': case 'flame': case 'harpoon': {
        const head = A.towerHead(b.type, lvl, br), rh = A.rotHead(A.rotKey(b), lvl, br);
        const lift = art.lift, rec = b.recoil * ({ mortar: 5, harpoon: 7, flame: 1 }[b.type] || 3);
        if (head) { ctx.save(); ctx.translate(x - Math.cos(b.angle) * rec, y - lift - Math.sin(b.angle) * rec * 0.5);
          ctx.rotate(b.angle); ctx.drawImage(head, -A.HEAD / 2, -A.HEAD / 2, A.HEAD, A.HEAD); ctx.restore(); }
        else if (rh) {                                    // вспышка выстрела у дула повёрнутой головы
          if (b.recoil > 0.05 && M0) { const col = { bolt: '#ffe9a0', mortar: '#ff9a3a', flame: br === 'B' ? '#5affc8' : '#ff8a1c', harpoon: '#cfd8ff' }[b.type];
            add(glowSprite(col), M0.x, M0.y, (b.type === 'flame' ? 22 : b.type === 'mortar' ? 26 : 14) + b.recoil * 18, clamp(b.recoil, 0, 1) * (b.type === 'mortar' ? 0.9 : 0.75)); }
          if (b.type === 'flame' && M0) add(glowSprite(br === 'B' ? '#5affc8' : '#ff8a1c'), M0.x, M0.y + 1, 10 + b.recoil * 14, 0.25 + 0.3 * b.recoil + 0.08 * Math.sin(t * 14));
        }
        else if (b.recoil > 0.05) {                       // растровая башня: вспышка выстрела у верхушки
          const gt = A.towerGeo(A.artType(b.prem || b.type), lvl, br), col = { bolt: '#ffe9a0', mortar: '#ff9a3a', flame: br === 'B' ? '#5affc8' : '#ff8a1c', harpoon: '#cfd8ff' }[b.type];
          add(glowSprite(col), x, base + gt.top + (gt.bottom - gt.top) * 0.16, (b.type === 'flame' ? 22 : 16) + b.recoil * 22, clamp(b.recoil, 0, 1) * 0.8);
        }
        if (br === 'B' && b.type === 'mortar') add(glowSprite('#ff7a1c'), x + 14, y - 12, 26, 0.4 + 0.2 * Math.sin(t * 9));
        if (b.type === 'flame' && head && !rh) { const nx = x + Math.cos(b.angle) * 20, ny = y - lift + Math.sin(b.angle) * 12; add(glowSprite(br === 'B' ? '#5affc8' : '#ff8a1c'), nx, ny, 16 + b.recoil * 20, 0.45 + 0.4 * b.recoil + 0.15 * Math.sin(t * 14)); }
        break;
      }
      case 'magnet': {                                  // красно-синее свечение полюсов: на импульсе вспыхивает, поле стягивает врагов
        const gt = A.towerGeo(A.artType(b.type), lvl, br), pc = clamp(b.recoil, 0, 1), top = base + gt.top + 4;
        add(glowSprite('#ff4a5a'), x - 7, top, 14 + pc * 16, 0.2 + 0.12 * Math.sin(t * 5 + b.id) + pc * 0.5);
        add(glowSprite('#5ab8ff'), x + 7, top, 14 + pc * 16, 0.2 + 0.12 * Math.sin(t * 5 + b.id + 2) + pc * 0.5);
        break;
      }
      case 'grinder': {                                 // пока мелет: из распахнутых дверей идёт раскалённый свет и летит пыль
        if (b.throwT > 0) { const gt = A.towerGeo(A.artType(b.type), lvl, br), f = clamp(b.throwT / 0.7, 0, 1);
          add(glowSprite('#ff8a2a'), x + 2, base + gt.top + (gt.bottom - gt.top) * 0.78, 20 + f * 12, 0.35 + 0.4 * f * (0.7 + 0.3 * Math.sin(t * 40))); }
        break;
      }
      case 'voidwell': {                                // на растровой картинке воронка уже нарисована: сверху только пульсирующее свечение, на импульс — вспышка
        const w = art.well(lvl), wy = base + w.y, pc = clamp(b.recoil, 0, 1), acc = br === 'A' ? '#ff4a9a' : br === 'B' ? '#4adcff' : '#b070ff';
        add(glowSprite(acc), x, wy, 36 + pc * 34, 0.22 + 0.1 * Math.sin(t * 3 + b.id) + pc * 0.5);
        break;
      }
      case 'tesla': {
        if (M0) {                                       // электрод: свечение и искры на его конце
          add(glowSprite(br === 'A' ? '#c070ff' : '#7fd8ff'), M0.x, M0.y, 20 + b.recoil * 22, 0.4 + 0.15 * Math.sin(t * 9 + b.id) + b.recoil * 0.5);
          if (Math.random() < 0.3 + b.recoil) { ctx.save(); ctx.strokeStyle = 'rgba(200,240,255,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); let px = M0.x, py = M0.y; ctx.moveTo(px, py); const a0 = Math.random() * T2; for (let i = 0; i < 3; i++) { px += Math.cos(a0 + (Math.random() - 0.5)) * 4; py += Math.sin(a0 + (Math.random() - 0.5)) * 4; ctx.lineTo(px, py); } ctx.stroke(); ctx.restore(); }
          break;
        }
        const o = art.orb(lvl), oy = base + o.y;
        const pulse = 0.55 + 0.25 * Math.sin(t * 9 + b.id) + b.recoil * 0.6;
        add(glowSprite(br === 'A' ? '#c070ff' : '#7fd8ff'), x, oy, 30 + b.recoil * 26, pulse);
        if (Math.random() < 0.35 + b.recoil) {
          ctx.save(); ctx.strokeStyle = 'rgba(200,240,255,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); let px = x, py = oy; ctx.moveTo(px, py); const a0 = Math.random() * T2;
          for (let i = 0; i < 3; i++) { px += Math.cos(a0 + (Math.random() - 0.5)) * 5; py += Math.sin(a0 + (Math.random() - 0.5)) * 5; ctx.lineTo(px, py); } ctx.stroke(); ctx.restore();
        }
        break;
      }
      case 'frost': {
        if (M0) {                                       // ледяное копьё: холодное свечение на острие
          add(glowSprite('#9fe8ff'), M0.x, M0.y, 18 + b.recoil * 20, 0.3 + 0.12 * Math.sin(t * 3 + b.id) + b.recoil * 0.5);
          if (b.st.aura) { const f = (t % 1.8) / 1.8; ctx.save(); ctx.strokeStyle = `rgba(160,225,255,${0.45 * (1 - f)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, b.st.range * CELL * f, b.st.range * CELL * f * 0.82, 0, 0, T2); ctx.stroke(); ctx.restore(); }
          break;
        }
        const o = art.orb(lvl), oy = base + o.y;
        add(glowSprite('#9fe8ff'), x, oy + 6, 34, 0.35 + 0.15 * Math.sin(t * 3 + b.id) + b.recoil * 0.4);
        if (b.st.aura) {
          const f = (t % 1.8) / 1.8; ctx.save(); ctx.strokeStyle = `rgba(160,225,255,${0.45 * (1 - f)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, b.st.range * CELL * f, b.st.range * CELL * f * 0.82, 0, 0, T2); ctx.stroke(); ctx.restore();
        }
        break;
      }
      case 'toxic': {
        if (M0) { if (b.recoil > 0.05) add(glowSprite(br === 'B' ? '#d6ff3a' : '#6aff3a'), M0.x, M0.y, 14 + b.recoil * 16, b.recoil * 0.6); break; }       // метатель склянок: вспышка у чаши при броске
        const liqY = base + (art.liq ? art.liq(lvl).y : 52);
        add(glowSprite(br === 'B' ? '#d6ff3a' : '#6aff3a'), x, liqY, 36, 0.35 + 0.15 * Math.sin(t * 4) + b.recoil * 0.3);
        for (let i = 0; i < 4; i++) {
          const ph = (t * 0.9 + i * 0.27 + b.id * 0.1) % 1, bx = x - 8 + i * 5.2 + Math.sin(ph * 6 + i) * 1.5, by = liqY - ph * 12;
          ctx.beginPath(); ctx.arc(bx, by, 1.2 + ph * 1.8, 0, T2); ctx.fillStyle = `rgba(190,255,150,${0.9 - ph * 0.8})`; ctx.fill(); ctx.strokeStyle = `rgba(20,60,10,${0.6 - ph * 0.5})`; ctx.lineWidth = 0.6; ctx.stroke();
        }
        break;
      }
      case 'saw': {
        const hy = base + art.hub(lvl).y, st = b.st;
        if (st.orbit && b.blades) {
          const bl = sawBladeSprite(10);
          ctx.save(); ctx.strokeStyle = 'rgba(200,210,225,0.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, b.orbitR, b.orbitR * 0.8, 0, 0, T2); ctx.stroke(); ctx.restore();
          for (const bd of b.blades) { ctx.save(); ctx.translate(bd.x, bd.y - 10); ctx.rotate(t * 20 + bd.a); ctx.drawImage(bl, -bl.lw / 2, -bl.lh / 2, bl.lw, bl.lh); ctx.restore(); ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(bd.x, bd.y, 7, 2.6, 0, 0, T2); ctx.fill(); ctx.restore(); }
          const bs = sawBladeSprite(9); ctx.save(); ctx.translate(x, hy); ctx.rotate(t * 8); ctx.drawImage(bs, -bs.lw / 2, -bs.lh / 2, bs.lw, bs.lh); ctx.restore();
        } else {
          const thrown = this.sim.projs.some((p) => p.kind === 'saw' && p.owner === b);
          if (!thrown && !A.SPR.ok) { const bs = sawBladeSprite(13); ctx.save(); ctx.translate(x, hy - 2); ctx.rotate(t * (b.target ? 14 : 4)); ctx.drawImage(bs, -bs.lw / 2, -bs.lh / 2, bs.lw, bs.lh); ctx.restore(); }
        }
        break;
      }
      case 'banner': {
        if (A.SPR.ok) { if (b.frenzyT > 0) add(glowSprite('#ff2a2a'), x, y - 20, b.st.range * CELL * 1.6, 0.35 + 0.2 * Math.sin(t * 12)); break; }
        const top = base + art.pole(lvl).top;
        const fast = b.frenzyT > 0 ? 9 : 5;
        const col = br === 'B' ? ['#1a1218', '#3a2a36'] : br === 'A' ? ['#d8202e', '#7a0c16'] : ['#b3121f', '#6a0a12'];
        const L = 26, Hh = 17;
        ctx.save();
        const pts = [], pts2 = [];
        for (let i = 0; i <= 8; i++) { const f = i / 8; const wv = Math.sin(t * fast - f * 3.4 + b.id) * 3.2 * f; pts.push([x + 2 + f * L, top + wv]); pts2.push([x + 2 + f * L - (i === 8 ? 5 : 0) , top + Hh + wv + (i === 8 ? -4 : 0)]); }
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]);
        // рваный край
        const e = pts[8], e2 = pts2[8]; ctx.lineTo(e[0] - 3, (e[1] + e2[1]) / 2 - 3); ctx.lineTo(e[0] + 1, (e[1] + e2[1]) / 2 + 2); ctx.lineTo(e2[0], e2[1]);
        for (let i = 7; i >= 0; i--) ctx.lineTo(pts2[i][0], pts2[i][1]); ctx.closePath();
        const gr = ctx.createLinearGradient(x, top, x + L, top + Hh); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]); ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 1.3; ctx.strokeStyle = '#170a0f'; ctx.stroke();
        // эмблема
        const mid = pts[3]; ctx.fillStyle = br === 'B' ? '#e8e0cc' : '#ffd24a'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(br === 'B' ? '☠' : '⚔', mid[0] + 2, mid[1] + 11);
        ctx.restore();
        if (b.frenzyT > 0) add(glowSprite('#ff2a2a'), x, y - 20, b.st.range * CELL * 1.6, 0.35 + 0.2 * Math.sin(t * 12));
        break;
      }
    }
  }

  dynEcon(ctx, b, t, x, y) {
    const add = (sprite, cx, cy, size, alpha) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(alpha, 0, 1); ctx.drawImage(sprite, cx - size / 2, cy - size / 2, size, size); ctx.restore(); };
    const base = y - A.TW_AY;
    if (b.type === 'mine') {
      const s = glowSprite('#ffe27a'); add(s, x, base + 70, 34, 0.25 + 0.12 * Math.sin(t * 3 + b.id));
      const ph = (t * 1.1 + b.id * 0.37) % 1; if (ph < 0.5) { const tw = Math.sin((ph / 0.5) * Math.PI); ctx.save(); ctx.fillStyle = `rgba(255,250,210,${tw})`; const sx = x - 8 + ((b.id * 7) % 16), sy = base + 66; ctx.beginPath(); ctx.moveTo(sx, sy - 4 * tw); ctx.lineTo(sx + 1, sy); ctx.lineTo(sx, sy + 4 * tw); ctx.lineTo(sx - 1, sy); ctx.fill(); ctx.beginPath(); ctx.moveTo(sx - 4 * tw, sy); ctx.lineTo(sx, sy + 1); ctx.lineTo(sx + 4 * tw, sy); ctx.lineTo(sx, sy - 1); ctx.fill(); ctx.restore(); }
    } else if (b.type === 'bank') {
      if (b.level >= 3) add(glowSprite('#ffd35a'), x, base + 56, 50, 0.25 + 0.1 * Math.sin(t * 2));
      const ph = (t * 0.6 + b.id * 0.3) % 1; const gx = x - 14 + ph * 28; ctx.save(); ctx.globalAlpha = 0.6 * Math.sin(ph * Math.PI); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(gx, base + 52); ctx.lineTo(gx + 1, base + 56); ctx.lineTo(gx, base + 60); ctx.lineTo(gx - 1, base + 56); ctx.fill(); ctx.restore();
    } else if (b.type === 'altar') {
      const fl = b.altarFlash > 0 ? b.altarFlash / 0.4 : 0;
      add(glowSprite('#ff2a3a'), x, base + 52, 34 + fl * 30, 0.35 + 0.15 * Math.sin(t * 3 + b.id) + fl * 0.6);
      for (let i = 0; i < 3; i++) { const ph = (t * 0.5 + i * 0.33 + b.id * 0.2) % 1; ctx.beginPath(); ctx.arc(x - 6 + i * 6 + Math.sin(ph * 8) * 2, base + 50 - ph * 22, 1.4 * (1 - ph) + 0.4, 0, T2); ctx.fillStyle = `rgba(255,70,90,${1 - ph})`; ctx.fill(); }
      if (fl > 0) { ctx.save(); ctx.strokeStyle = `rgba(255,60,80,${fl})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, b.st.range * CELL * (1 - fl), b.st.range * CELL * (1 - fl) * 0.8, 0, 0, T2); ctx.stroke(); ctx.restore(); }
    }
  }

  // ───── снаряды и зоны ─────
  drawZones(ctx, t) {
    for (const m of this.sim.mines) {                 // мины Минёра: чёрный шар с шипами и мигающим красным огоньком (взводится за 0,7 с)
      const arm = Math.min(1, m.age / 0.7), bl = m.age > 0.7 && Math.sin(t * 7 + m.x) > 0.3;
      ctx.save(); ctx.translate(m.x, m.y); ctx.globalAlpha = 0.5 + 0.5 * arm; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 4, 8, 3, 0, 0, T2); ctx.fill();
      ctx.strokeStyle = '#15161a'; ctx.fillStyle = '#6d727c'; ctx.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const a = i * 1.047 + 0.3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5, -3 + Math.sin(a) * 4); ctx.lineTo(Math.cos(a) * 10, -3 + Math.sin(a) * 8); ctx.stroke(); }
      const g = ctx.createRadialGradient(-2, -6, 1, 0, -3, 8); g.addColorStop(0, '#5a5f69'); g.addColorStop(1, '#101114'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -3, 6.5, 0, T2); ctx.fill(); ctx.stroke();
      if (bl) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#ff3a2a'), -8, -11, 16, 16); } ctx.restore();
    }
    for (const z of this.sim.zones) {
      const a = clamp(z.t / 1.0, 0, 1) * (z.kind === 'fire' ? 0.55 : 0.5);
      const col = z.kind === 'fire' ? '#ff6a1c' : z.kind === 'acid' ? '#d6ff3a' : '#6aff3a';
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; const s = glowSprite(col); ctx.drawImage(s, z.x - z.r * 1.3, z.y - z.r * 1.0, z.r * 2.6, z.r * 2.0); ctx.restore();
      if (z.kind === 'fire') {
        for (let i = 0; i < 6; i++) {
          const ph = (t * 1.6 + i * 0.37 + z.x * 0.01) % 1, ang = i * 1.05 + z.y, rr = z.r * 0.7 * ((i % 3) / 3 + 0.3);
          const fx = z.x + Math.cos(ang) * rr, fy = z.y + Math.sin(ang) * rr * 0.7, h = 12 * (1 - ph) + 3;
          ctx.save(); ctx.globalAlpha = Math.min(1, z.t) * (1 - ph * 0.6);
          ctx.beginPath(); ctx.moveTo(fx - 3, fy); ctx.quadraticCurveTo(fx - 4, fy - h * 0.6, fx, fy - h); ctx.quadraticCurveTo(fx + 4, fy - h * 0.5, fx + 3, fy); ctx.closePath();
          const gr = ctx.createLinearGradient(0, fy - h, 0, fy); gr.addColorStop(0, '#ffe27a'); gr.addColorStop(0.5, '#ff7a1c'); gr.addColorStop(1, '#c01a0a'); ctx.fillStyle = gr; ctx.fill(); ctx.restore();
        }
      } else {
        for (let i = 0; i < 4; i++) {
          const ph = (t * 0.8 + i * 0.27 + z.x * 0.01) % 1, ang = i * 1.9 + z.x, rr = z.r * 0.6 * ((i % 3) / 3 + 0.3);
          ctx.beginPath(); ctx.arc(z.x + Math.cos(ang) * rr, z.y + Math.sin(ang) * rr * 0.7 - ph * 6, 1.5 + ph * 1.5, 0, T2); ctx.fillStyle = `rgba(190,255,150,${0.8 - ph * 0.7})`; ctx.fill();
        }
      }
    }
  }
  // Снаряд вылетает из дула головы СТРОГО вдоль того, куда смотрит голова, и плавно доворачивает к цели (квадратичная кривая: касательная в дуле = направление головы, конец = цель).
  // Чисто визуально: расчёт полёта и попадания в sim не меняется. Возвращает смещение к расчётной позиции снаряда и текущее направление.
  muzOff(p) {
    const b = p.owner; if (!b || b.kind !== 'tower') return null;
    const ps = this._ps || (this._ps = new WeakMap()); let st = ps.get(p);
    const sy = p.kind === 'bolt' ? -14 : p.kind === 'shard' ? 0 : -8;
    if (!st) {
      const M = A.muzzle(b);
      st = (!M || Math.hypot(p.x - b.x, p.y - b.y) > 40) ? { none: true } : { x: p.x, y: p.y, sx: p.x, sy: p.y + sy, M, h: A.headAngle(b), lx: null, ly: null };
      ps.set(p, st);
    }
    if (st.none) return null;
    const tg = p.target || p.aim || b.target, arc = !!p.T;
    let tx, ty;
    if (arc) { tx = p.x1; ty = p.y1 - 8; } else if (tg && !tg.dead) { tx = tg.x; ty = tg.y + sy; } else { tx = st.sx + (p.vx || 0); ty = st.sy + (p.vy || 0); }
    const D = Math.max(30, Math.hypot(tx - st.sx, ty - st.sy));
    const u = arc ? Math.min(1, p.t / p.T) : Math.min(1, Math.hypot(p.x - st.x, p.y - st.y) / D);
    if (p.kind === 'saw') { const f = 1 - Math.min(Math.hypot(p.x - st.x, p.y - st.y), Math.hypot(p.x - b.x, p.y - b.y)) / 44; return f > 0 ? { dx: (st.M.x - st.sx) * f, dy: (st.M.y - st.sy) * f } : null; }
    if (u >= 1) return null;
    const hx = Math.cos(st.h), hy = Math.sin(st.h) * 0.5, hl = Math.hypot(hx, hy) || 1, lam = 0.42 * D;
    const cx = st.M.x + hx / hl * lam, cy = st.M.y + hy / hl * lam, mx = (st.sx + tx) / 2, my = (st.sy + ty) / 2;
    const str = p.kind === 'bolt' || p.kind === 'shard';                       // болты и гарпуны летят строго по прямой: смещение от дула гаснет линейно
    const q = str ? 1 - u : (1 - u) * (1 - u), w = str ? 0 : 2 * u * (1 - u), dx = q * (st.M.x - st.sx) + w * (cx - mx), dy = q * (st.M.y - st.sy) + w * (cy - my);
    const vx = p.x + dx, vy = p.y + sy + dy;
    let dirx = null, diry = null;
    if (st.lx !== null) { const ddx = vx - st.lx, ddy = vy - st.ly, l = Math.hypot(ddx, ddy); if (l > 0.6) { dirx = ddx / l; diry = ddy / l; } }
    st.lx = vx; st.ly = vy; if (dirx === null && st.dx !== undefined) { dirx = st.dx; diry = st.dy; } else if (dirx !== null) { st.dx = dirx; st.dy = diry; }
    return { dx, dy, dirx, diry };
  }
  drawProjs(ctx, t) {
    for (const p of this.sim.projs) {
      const mo = this.muzOff(p); if (mo) { ctx.save(); ctx.translate(mo.dx, mo.dy); }
      switch (p.kind) {
        case 'bolt': {
          const l = Math.hypot(p.vx, p.vy); let ux = p.vx / l, uy = p.vy / l; if (mo && mo.dirx !== null && mo.dirx !== undefined) { ux = mo.dirx; uy = mo.diry; } const y = p.y - 14;
          ctx.save(); ctx.lineCap = 'round';
          const hp = !!p.harpoon, LEN = hp ? 38 : 9, W1 = hp ? 4.6 : 2.4, W2 = hp ? 2 : 1.1, HL = hp ? 9 : 5.5, HW = hp ? 3 : 1.7;
          ctx.strokeStyle = '#170a0f'; ctx.lineWidth = W1; ctx.beginPath(); ctx.moveTo(p.x - ux * LEN, y - uy * LEN); ctx.lineTo(p.x + ux * 3, y + uy * 3); ctx.stroke();
          ctx.strokeStyle = hp ? '#e8dcb8' : p.big ? '#ffe27a' : '#f4e4b8'; ctx.lineWidth = W2; ctx.beginPath(); ctx.moveTo(p.x - ux * LEN, y - uy * LEN); ctx.lineTo(p.x + ux * 3, y + uy * 3); ctx.stroke();
          ctx.fillStyle = '#d4dae4'; ctx.beginPath(); ctx.moveTo(p.x + ux * HL, y + uy * HL); ctx.lineTo(p.x + ux * 1.5 - uy * HW, y + uy * 1.5 + ux * HW); ctx.lineTo(p.x + ux * 1.5 + uy * HW, y + uy * 1.5 - ux * HW); ctx.fill();
          if (p.big) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#ffd35a'), p.x - 6, y - 6, 12, 12); }
          ctx.restore(); break;
        }
        case 'shell': case 'vial': {
          const z = p.z || 0; const r = p.kind === 'vial' ? 4 : p.bomblet ? 3 : 4.8;
          ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.2, r * 0.5, 0, 0, T2); ctx.fill(); ctx.restore();
          if (p.rock) {                                    // валун Гиганта: кружится в полёте; цвет по стадии (камень, мрамор, огонь)
            const lv = p.owner ? p.owner.level : 1, stg = lv <= 1 ? 0 : lv <= 3 ? 1 : 2, C = [['#9a9184', '#5d574e'], ['#f2f6fb', '#9fb4cc'], ['#3a2420', '#120a0a']][stg];
            ctx.save(); ctx.translate(p.x, p.y - z - 10); ctx.rotate((p.t || 0) * 7); ctx.lineJoin = 'round';
            ctx.beginPath(); for (let i = 0; i < 9; i++) { const a = (i / 9) * T2, rr = 7 + ((i * 37) % 5) * 0.8; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.9); } ctx.closePath();
            const gr = ctx.createRadialGradient(-2, -2, 1, 0, 0, 9); gr.addColorStop(0, C[0]); gr.addColorStop(1, C[1]); ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = '#170a0f'; ctx.stroke();
            if (stg === 2) { ctx.strokeStyle = '#ff9a2a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(0, 2); ctx.lineTo(4, -2); ctx.stroke(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#ff7a1c'), -12, -12, 24, 24); }
            ctx.restore(); break;
          }
          if (p.kind === 'vial') {                         // стеклянная склянка с зелёным ядом: кружится в полёте
            ctx.save(); ctx.translate(p.x, p.y - z - 8); ctx.rotate((p.t || 0) * 10); ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.arc(0, 1.4, 4.2, 0, T2); ctx.fillStyle = '#5fe83a'; ctx.fill(); ctx.lineWidth = 1.3; ctx.strokeStyle = '#170a0f'; ctx.stroke();
            ctx.fillStyle = '#d9f2e4'; ctx.fillRect(-1.4, -5.6, 2.8, 3.4); ctx.strokeRect(-1.4, -5.6, 2.8, 3.4); ctx.fillStyle = '#a8703a'; ctx.fillRect(-1.8, -7.2, 3.6, 1.8); ctx.strokeRect(-1.8, -7.2, 3.6, 1.8);
            ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(-1.4, 0, 1.1, 0, T2); ctx.fill();
            ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#6aff3a'), -8, -6, 16, 16); ctx.restore(); break;
          }
          ctx.beginPath(); ctx.arc(p.x, p.y - z - 8, r, 0, T2);
          if (p.kind === 'vial') { ctx.fillStyle = '#6aff3a'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#170a0f'; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(p.x - 1.5, p.y - z - 10, 1.6, 2); }
          else { const gr = ctx.createRadialGradient(p.x - 1.5, p.y - z - 9.5, 0.5, p.x, p.y - z - 8, r * 1.3); gr.addColorStop(0, p.bomblet ? '#ffb060' : '#8a8f9a'); gr.addColorStop(1, p.bomblet ? '#7a2a0a' : '#1a1c22'); ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#170a0f'; ctx.stroke(); if (p.fire) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#ff7a1c'), p.x - 10, p.y - z - 18, 20, 20); ctx.restore(); } }
          break;
        }
        case 'shard': {                                   // ледяная стрела: гранёное остриё, древко и оперение, холодный свет за ней
          const e = p.target; const a = (mo && mo.dirx !== null && mo.dirx !== undefined) ? Math.atan2(mo.diry, mo.dirx) : e ? Math.atan2(e.y - p.y, e.x - p.x) : 0;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); ctx.lineJoin = 'round';
          ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#7fd8ff'), -34, -8, 40, 16); ctx.globalCompositeOperation = 'source-over';
          // ледяная стрела: прямое тонкое ледяное древко, острый гранёный наконечник и два пера
          ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(10, -3.2); ctx.lineTo(7, 0); ctx.lineTo(10, 3.2); ctx.closePath();                   // наконечник
          ctx.moveTo(-14, -1); ctx.lineTo(7, -1); ctx.lineTo(7, 1); ctx.lineTo(-14, 1); ctx.closePath();                                  // древко
          ctx.moveTo(-14, 0); ctx.lineTo(-19, -3.6); ctx.lineTo(-11, 0); ctx.lineTo(-19, 3.6); ctx.closePath();                            // оперение
          ctx.lineWidth = 2.4; ctx.strokeStyle = '#170a0f'; ctx.stroke();
          const gr = ctx.createLinearGradient(-19, 0, 18, 0); gr.addColorStop(0, '#6fc8f5'); gr.addColorStop(0.6, '#cdf2ff'); gr.addColorStop(1, '#ffffff'); ctx.fillStyle = gr; ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(16, 0); ctx.stroke();
          ctx.restore(); break;
        }
        case 'saw': {
          const s = sawBladeSprite(13);
          ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 3, 12, 4, 0, 0, T2); ctx.fill(); ctx.restore();
          ctx.save(); ctx.translate(p.x, p.y - 8); ctx.rotate(p.spin); ctx.drawImage(s, -s.lw / 2, -s.lh / 2, s.lw, s.lh); ctx.restore(); break;
        }
      }
      if (mo) ctx.restore();
    }
    for (const f of this.sim.fx) {
      if (f.kind === 'ring') {                         // расходящееся кольцо: звон колокольни, взмах маятника, пульс вечной зимы
        const k = f.t / f.T, R = f.r * (0.25 + 0.75 * k);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = f.col; ctx.lineWidth = 2.4 * (1 - k) + 1; ctx.globalAlpha = 0.5 * (1 - k); ctx.beginPath(); ctx.ellipse(f.x, f.y, R, R * 0.7, 0, 0, T2); ctx.stroke(); ctx.restore();
        continue;
      }
      if (f.kind === 'meteor') {
        const k = f.t / f.T, d = 1 - k, x = f.x + 200 * d, y = f.y - 420 * d;
        ctx.save(); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 20); ctx.strokeStyle = '#ff3a3a'; ctx.lineWidth = 2; const R = SPELLS.meteor.radius * CELL * (0.5 + 0.5 * k); ctx.beginPath(); ctx.ellipse(f.x, f.y, R, R * 0.8, 0, 0, T2); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#ff7a1c'), x - 30, y - 30, 60, 60); ctx.restore();
        const g = ctx.createLinearGradient(x, y, x - 200 * 0.12, y + 420 * 0.12); g.addColorStop(0, 'rgba(255,200,80,0.9)'); g.addColorStop(1, 'rgba(255,80,20,0)'); ctx.strokeStyle = g; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 200 * 0.35, y - 420 * 0.35); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 11, 0, T2); const gr = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 12); gr.addColorStop(0, '#fff2c0'); gr.addColorStop(0.5, '#ff8a2a'); gr.addColorStop(1, '#8a1a08'); ctx.fillStyle = gr; ctx.fill();
      }
    }
  }
  drawBolts(ctx, gore) {
    for (const b of gore.bolts) {
      const fade = 1 - b.t / b.T; const q = Math.floor(b.t / 0.045);
      for (let pass = 0; pass < 2; pass++) {
        ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.strokeStyle = pass === 0 ? `rgba(110,190,255,${0.45 * fade})` : `rgba(235,250,255,${fade})`; ctx.lineWidth = pass === 0 ? 6 : 1.8;
        ctx.beginPath();
        let seed = b.seed + q * 13.37;
        const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
        for (let i = 1; i < b.pts.length; i++) {
          const a = b.pts[i - 1], c = b.pts[i]; const n = 6, dx = c.x - a.x, dy = c.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
          if (i === 1) ctx.moveTo(a.x, a.y);
          for (let k = 1; k <= n; k++) { const f = k / n, off = k === n ? 0 : (rnd() - 0.5) * 10; ctx.lineTo(a.x + dx * f + nx * off, a.y + dy * f + ny * off); }
        }
        ctx.stroke(); ctx.restore();
      }
    }
  }
  // Рудник выбрасывает мешок с золотом, банк — крупную объёмную монету: она вращается вокруг вертикальной оси, у неё настоящее ребро (стопка тёмных эллипсов), лицо с чеканкой и блик.
  // Обе висят заметно выше здания, чтобы не прятаться за ним.
  drawBags(ctx, t, view) {
    const bag = bagSprite(), coin = coinSprite(30);
    this.sim.bags.forEach((bg, i) => {
      const sky = bg.kind === 'sky', bank = bg.kind === 'bank', fall = sky ? Math.max(0, 1 - bg.t / 0.7) : 0, rise = !sky ? Math.min(26, bg.t * 70) : 0;
      const by = bg.y - 22 - rise - fall * fall * 90 + Math.sin(t * 4 + i) * 2.2, left = 1 - bg.t / bg.life, hurry = bg.life - bg.t < 3;
      ctx.save(); ctx.translate(bg.x, by);
      const tutC = view && view.hl && view.hl.bag;      // в обучении у монеты нет ни золотого ореола, ни кольца таймера: только контур по силуэту
      if (!tutC) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + 0.2 * Math.sin(t * 6 + i); const gs = glowSprite(bank ? '#ffe9a0' : '#ffd24a'); const G = bank ? 56 : 48; ctx.drawImage(gs, -G / 2, -G / 2, G, G); ctx.globalCompositeOperation = 'source-over'; }
      ctx.globalAlpha = hurry ? 0.45 + 0.55 * Math.abs(Math.sin(t * 14)) : 1;
      if (bank) this.drawCoin3d(ctx, t * 3.2 + i * 1.7, 15);
      else {
        const sc = (sky ? 1 : 1.15) * (1 + 0.07 * Math.sin(t * 6 + i)); ctx.scale(sc * (sky ? Math.abs(Math.cos(t * 3 + i)) * 0.55 + 0.45 : 1), sc);
        const ic = tile('bag_gold'); if (ic && view && view.hl && view.hl.bag) { const o = outlineOf(ic), kx = 26 / o.w; ctx.save(); ctx.globalAlpha = 0.8; ctx.shadowColor = 'rgba(255,200,60,.95)'; ctx.shadowBlur = 10; ctx.drawImage(o.c, -13 - o.P * kx, -14 - o.P * kx, (o.w + 2 * o.P) * kx, (o.h + 2 * o.P) * kx); ctx.restore(); }
        if (ic) { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(ic, -13, -14, 26, 26); } else { const sp = sky ? coin : bag; ctx.drawImage(sp, -sp.lw / 2, -sp.lh / 2, sp.lw, sp.lh); }
      }
      ctx.restore();
      if (!tutC) { ctx.save(); ctx.strokeStyle = hurry ? 'rgba(255,120,90,.95)' : 'rgba(255,236,150,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bg.x, by, (bank ? 20 : 17), -Math.PI / 2, -Math.PI / 2 + T2 * left); ctx.stroke(); ctx.restore(); }
    });
  }
  // монета с ребром: ph — угол поворота; при повороте ребро выглядит стопкой эллипсов тёмного золота, лицо — светлым диском поверх
  drawCoin3d(ctx, ph, R) {
    const cs = Math.cos(ph), sn = Math.sin(ph), w = Math.max(0.12, Math.abs(cs)), T = R * 0.42, N = 7, side = cs >= 0 ? 1 : -1;
    ctx.lineWidth = 1.4; ctx.strokeStyle = '#2a1804';
    for (let k = 0; k < N; k++) {                                               // ребро: слои от задней грани к передней
      const f = k / (N - 1) - 0.5, ox = -sn * T * f * 1.0;
      ctx.fillStyle = k % 2 ? '#b8800f' : '#8a5a08'; ctx.beginPath(); ctx.ellipse(ox, 0, R * w, R, 0, 0, T2); ctx.fill(); if (k === 0 || k === N - 1) ctx.stroke();
    }
    const ox = sn * T * 0.5 * -1;                                                // лицевая грань
    ctx.beginPath(); ctx.ellipse(ox, 0, R * w, R, 0, 0, T2);
    const gr = ctx.createLinearGradient(ox - R * w, -R, ox + R * w, R); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.5, '#f2b81e'); gr.addColorStop(1, '#b8780c'); ctx.fillStyle = gr; ctx.fill(); ctx.stroke();
    if (w > 0.3) {
      ctx.save(); ctx.translate(ox, 0); ctx.scale(w * side, 1); ctx.strokeStyle = 'rgba(120,70,0,.85)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(0, 0, R * 0.72, 0, T2); ctx.stroke();
      ctx.fillStyle = 'rgba(120,70,0,.92)'; ctx.font = `bold ${Math.round(R * 1.15)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(-R * 0.36, -R * 0.46, R * 0.22, R * 0.12, -0.6, 0, T2); ctx.fill(); ctx.restore();
    }
  }

  drawParticles(ctx, gore, t) {
    for (const p of gore.parts) {
      if (!this.inView(p.x, p.y, 70)) continue;
      const f = p.age / p.max, y = p.y - (p.z || 0);
      switch (p.k) {
        case 'drop': { ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, y, p.size * 1.15, 0, T2); ctx.fill(); break; }
        case 'gib': {
          ctx.save(); ctx.globalAlpha = 0.3 * (1 - Math.min(1, p.z / 80)); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 6 * p.big, 2.4, 0, 0, T2); ctx.fill(); ctx.restore();
          ctx.save(); ctx.translate(p.x, y); ctx.rotate(p.rot); ctx.drawImage(p.spr, -p.spr.lw / 2, -p.spr.lh / 2, p.spr.lw, p.spr.lh); ctx.restore(); break;
        }
        case 'spark': case 'ember': {
          ctx.save(); ctx.globalAlpha = 1 - f; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = p.col || (f < 0.5 ? '#ffd27a' : '#ff6a1c'); ctx.beginPath(); ctx.arc(p.x, y, (p.size || 1.4) * (1 - f * 0.5), 0, T2); ctx.fill(); ctx.restore(); break;
        }
        case 'fire': { const sz = p.size * (0.5 + Math.sin(f * Math.PI) * 0.9); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - f) * 0.85; ctx.drawImage(glowSprite(f < 0.45 ? p.col : '#ff4a1c'), p.x - sz / 2, y - sz / 2, sz, sz); ctx.restore(); break; }
        case 'smoke': case 'cloud': {
          const s = p.size * (0.7 + f * 0.9);
          const spr = p.col === 'dark' ? smokeSprite() : glowSprite(p.col === 'dust' ? '#b09a7a' : p.col);
          ctx.save(); ctx.globalAlpha = (p.col === 'dark' ? 0.55 : 0.4) * (1 - f); ctx.drawImage(spr, p.x - s / 2, y - s / 2, s, s); ctx.restore(); break;
        }
        case 'ring': { const r = p.r * Math.min(1, f * 1.4 + 0.1); ctx.save(); ctx.globalAlpha = (1 - f) * 0.9; ctx.strokeStyle = p.col; ctx.lineWidth = 2.5 * (1 - f) + 0.5; ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.78, 0, 0, T2); ctx.stroke(); ctx.restore(); break; }
        case 'flash': { const s = p.r * 2; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - f) * 0.9; ctx.drawImage(glowSprite(p.col), p.x - s / 2, p.y - s / 2, s, s); ctx.restore(); break; }
        case 'shard': { ctx.save(); ctx.globalAlpha = 1 - f * f; ctx.translate(p.x, y); ctx.rotate(p.rot); const sc = p.size; ctx.drawImage(p.spr, -6 * sc, -6 * sc, 12 * sc, 12 * sc); ctx.restore(); break; }
        case 'coin': { const c = coinSprite(); const sx = Math.abs(Math.cos(p.rot)); ctx.save(); ctx.globalAlpha = 1 - Math.max(0, (f - 0.75) * 4); ctx.translate(p.x, y); ctx.scale(sx * 0.8 + 0.2, 1); ctx.drawImage(c, -7, -7, 14, 14); ctx.restore(); break; }
        case 'plus': { ctx.save(); ctx.globalAlpha = 1 - f; ctx.fillStyle = '#7aff7a'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.strokeStyle = '#0a2a0a'; ctx.lineWidth = 2; ctx.strokeText('+', p.x, y); ctx.fillText('+', p.x, y); ctx.restore(); break; }
        case 'corpse': {
          const a = ENEMY_ART[p.type]; const spr = p.char ? tinted(p.type, 0, '#080506', 0.8) : enemyFrame(p.type, 0);
          const e = Math.min(1, f * 1.2), ang = (p.dirx || 1) * (Math.PI / 2 * 0.95) * (e * e);
          ctx.save(); ctx.translate(p.x + (p.vx || 0) * f * 0.4, p.y); ctx.rotate(ang); ctx.globalAlpha = 1;
          ctx.drawImage(spr, -a.ax, -a.ay, spr.lw, spr.lh); ctx.restore(); break;
        }
      }
    }
  }

  // ───── подсказки и интерфейсные оверлеи на поле ─────
  // зелёная сетка клеток, куда можно поставить здание (пока выбрано здание)
  drawPlaceHints(ctx, view, t) {
    const sim = this.sim;
    ctx.save();
    const v = this.vw, c0 = Math.max(0, Math.floor(v.x0 / CELL)), c1 = Math.min(COLS - 1, Math.floor(v.x1 / CELL)), r0 = Math.max(0, Math.floor(v.y0 / CELL)), r1 = Math.min(ROWS - 1, Math.floor(v.y1 / CELL));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      if (!sim.canBuild(c, r)) continue;
      const x = c * CELL, y = r * CELL;
      ctx.fillStyle = 'rgba(70,220,120,0.17)'; ctx.fillRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3);
      ctx.strokeStyle = 'rgba(40,190,90,0.8)'; ctx.lineWidth = 1.3; ctx.strokeRect(x + 2.5, y + 2.5, CELL - 5, CELL - 5);
    }
    ctx.restore();
  }
  drawPortalGate(ctx, t) {
    // мерцание порталов у зева, откуда выходят враги
    for (const p of this.sim.map.paths) {
      const x = (p[0][0] + 0.5) * CELL, y = (p[0][1] + 0.5) * CELL - 4;
      if (!this.inView(x, y, 60)) continue;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 + 0.12 * Math.sin(t * 3); ctx.drawImage(glowSprite('#ff4a6a'), x - 30, y - 26, 60, 50); ctx.restore();
    }
  }
  drawOverlays(ctx, view, t) {
    const sim = this.sim;
    const range = (x, y, r, col, dash = true) => { ctx.save(); ctx.fillStyle = col.replace('A', '0.09'); ctx.strokeStyle = col.replace('A', '0.65'); ctx.lineWidth = 1.5; if (dash) ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.ellipse(x, y + 2, r, r * 0.82, 0, 0, T2); ctx.fill(); ctx.stroke(); ctx.restore(); };
    const sel = view.selected;
    if (sel) {
      const st = sel.st; const r = (st.range || 0) * CELL;
      if (r) range(sel.x, sel.y, r, sel.type === 'altar' ? 'rgba(255,60,80,A)' : sel.type === 'banner' ? 'rgba(255,200,60,A)' : 'rgba(255,255,255,A)');
    }
    if (view.armed && view.hover) {
      const { c, r } = view.hover; const ok = sim.canBuild(c, r);
      const x = (c + 0.5) * CELL, y = (r + 0.5) * CELL;
      ctx.save(); ctx.fillStyle = ok ? 'rgba(120,255,160,0.25)' : 'rgba(255,60,60,0.3)'; ctx.fillRect(c * CELL, r * CELL, CELL, CELL); ctx.restore();
      if (ok) {
        const { kind, type } = view.armed;
        const body = kind === 'econ' ? A.econBody(type, 1) : A.towerFull(A.artType(type), 1, null);
        const gk = buildK(A.artType(type), 1, null); ctx.save(); ctx.globalAlpha = 0.7; ctx.translate(x, y + 6); ctx.scale(gk, gk); ctx.translate(-x, -y - 6); ctx.drawImage(body, x - A.TW_AX, y + 6 - A.TW_AY, A.TW_W, A.TW_H);
        if (kind === 'tower') { const bt = TOWERS[type].base || type, h = A.towerHead(bt, 1, null); if (h && A.TOWER_ART[bt].lift !== undefined) ctx.drawImage(h, x - A.HEAD / 2, y + 6 - A.TOWER_ART[bt].lift - A.HEAD / 2, A.HEAD, A.HEAD); }
        ctx.restore();
        const stt = kind === 'tower' ? TOWERS[type].lv[0] : ECON[type].lv[0];
        const rr = (stt.range || 0) * CELL; if (rr) range(x, y, rr, kind === 'econ' ? 'rgba(255,60,80,A)' : type === 'banner' ? 'rgba(255,200,60,A)' : 'rgba(255,255,255,A)');
      }
    }
    if (view.spell === 'meteor' && view.hoverPx) {
      const R = SPELLS.meteor.radius * CELL; const { x, y } = view.hoverPx;
      ctx.save(); ctx.strokeStyle = `rgba(255,70,50,${0.7 + 0.3 * Math.sin(t * 8)})`; ctx.fillStyle = 'rgba(255,70,50,0.12)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.ellipse(x, y, R, R * 0.82, 0, 0, T2); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }
}
