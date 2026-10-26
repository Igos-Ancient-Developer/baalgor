// Расчленёнка, кровь и частицы. Подписывается на события симуляции и рисует в постоянный «слой крови».
import { tr } from './i18n.js?v=20261026145234';
import { WORLD_W, WORLD_H, CELL, ENEMIES } from './data.js?v=20261026145234';
import { S as ART_S } from './art.js?v=20261026145234';
import { BLOOD, gibSprite, gibKinds, enemyFrame, tinted, ENEMY_ART } from './enemies.js?v=20261026145234';
import { splatSprite, poolSprite, scorchSprite, iceSprite, glowSprite, smokeSprite, shardSprite, coinSprite } from './env.js?v=20261026145234';

const GRAV = 560;
const LAYERS = 3, SPAN = 6, HOLD = 6, FADE = 5;   // секунд игрового времени
const MAX_PARTS = 240;
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const pick = (a) => a[(Math.random() * a.length) | 0];

export class Gore {
  constructor() {
    this.parts = []; this.emitters = []; this.pools = []; this.bolts = []; this.floaters = [];
    this.flash = 0; this.flashCol = '#ff2a2a';
    // Слои крови по времени: каждый слой копит следы SPAN секунд, затем держится HOLD и тает FADE — кровь и трупы со временем исчезают
    this.B = Math.min(ART_S, 1.25);
    this.t = 0; this.cur = 0;
    this.layers = Array.from({ length: LAYERS }, () => {
      const c = document.createElement('canvas'); c.width = Math.ceil(WORLD_W * this.B); c.height = Math.ceil(WORLD_H * this.B);
      const g = c.getContext('2d'); g.scale(this.B, this.B); return { c, g, start: null, x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    });
    this.layers[0].start = 0;
    this.stats = { gibs: 0 };
    this.onSound = null;
    this.cam = { x: WORLD_W / 2, y: WORLD_H / 2 };      // центр камеры: сюда выводятся надписи на весь экран
  }
  get bg() { return this.layers[this.cur].g; }
  dispose() { for (const l of this.layers) { l.c.width = 0; l.c.height = 0; } this.parts.length = 0; this.layers = []; }      // освободить слои крови
  sound(name, vol = 1) { if (this.onSound) this.onSound(name, vol); }
  clearBlood() { for (const l of this.layers) { l.g.clearRect(0, 0, WORLD_W, WORLD_H); l.start = null; this.resetBox(l); } this.layers[this.cur].start = this.t; }
  resetBox(l) { l.x0 = l.y0 = 1e9; l.x1 = l.y1 = -1e9; }
  // граница «грязной» области слоя: рисуем и композитим только её (раньше кадр целиком заливался 9 слоями — главный источник тормозов)
  touch(x, y, r) { const l = this.layers[this.cur]; l.x0 = Math.min(l.x0, x - r); l.y0 = Math.min(l.y0, y - r); l.x1 = Math.max(l.x1, x + r); l.y1 = Math.max(l.y1, y + r); }
  fade() { /* исчезновение теперь по времени (см. drawBlood) */ }
  drawBlood(ctx) {
    const order = this.layers.filter((l) => l.start !== null).sort((a, b) => a.start - b.start);
    for (const l of order) {
      const age = this.t - l.start;
      const a = age < HOLD ? 1 : Math.max(0, 1 - (age - HOLD) / FADE);
      if (a <= 0) continue;
      if (l.x1 < l.x0) continue;
      const B = this.B, x0 = Math.max(0, Math.floor(l.x0)), y0 = Math.max(0, Math.floor(l.y0)), x1 = Math.min(WORLD_W, Math.ceil(l.x1)), y1 = Math.min(WORLD_H, Math.ceil(l.y1));
      if (x1 <= x0 || y1 <= y0) continue;
      ctx.globalAlpha = a; ctx.drawImage(l.c, x0 * B, y0 * B, (x1 - x0) * B, (y1 - y0) * B, x0, y0, x1 - x0, y1 - y0);
    }
    ctx.globalAlpha = 1;
  }
  advanceLayer() {
    this.cur = (this.cur + 1) % LAYERS; const l = this.layers[this.cur];
    l.g.clearRect(0, 0, WORLD_W, WORLD_H); l.start = this.t; this.resetBox(l);
  }

  attach(sim) {
    sim.on('hit', (d) => this.onHit(d));
    sim.on('kill', (d) => this.onKill(d));
    sim.on('explosion', (d) => this.onExplosion(d));
    sim.on('lightning', (d) => { const pts = d.pts.slice(), M = this.muzzle && this.muzzle(d.b); if (M) pts[0] = { x: M.x, y: M.y }; this.bolts.push({ pts, t: 0, T: 0.18, seed: Math.random() * 99 }); });      // молния выходит с конца электрода
    sim.on('shot', (d) => this.onShot(d));
    sim.on('leak', (d) => { this.flash = 0.45; this.flashCol = '#ff1a2a'; this.ring(d.x, d.y, 40, '#ff2a2a', 0.5); });
    sim.on('stomp', (d) => { this.ring(d.x, d.y, 2.3 * CELL, '#ffb060', 0.6); this.dust(d.x, d.y, 14, 2.3 * CELL); });
    sim.on('summon', (d) => { this.ring(d.x, d.y, 60, '#9aff6a', 0.7); for (let i = 0; i < 10; i++) this.spark(d.x + rnd(-14, 14), d.y + rnd(-8, 8), '#9aff6a'); });
    sim.on('heal', (d) => { for (let i = 0; i < 7; i++) this.part({ k: 'plus', x: d.x + rnd(-24, 24), y: d.y + rnd(-10, 10), z: rnd(10, 30), vx: 0, vy: 0, vz: rnd(20, 40), life: 0.9 }); });
    sim.on('blink', (d) => { this.smokeAt(d.x0, d.y0, '#8a5aff', 5); this.smokeAt(d.x1, d.y1, '#8a5aff', 5); });
    sim.on('freeze', (e) => { for (let i = 0; i < 6; i++) this.part({ k: 'shard', spr: shardSprite(), x: e.x + rnd(-8, 8), y: e.y, z: rnd(4, 24), vx: rnd(-40, 40), vy: rnd(-20, 20), vz: rnd(20, 90), life: 0.6, rot: rnd(6), vr: rnd(-8, 8), size: rnd(0.7, 1.1) }); });
    sim.on('stun', (e) => { this.spark(e.x, e.y - 20, '#ffe27a'); });
    sim.on('plague', (d) => { this.ring(d.x, d.y, d.r, '#8aff3a', 0.6); for (let i = 0; i < 12; i++) this.part({ k: 'cloud', x: d.x + rnd(-d.r * 0.7, d.r * 0.7), y: d.y + rnd(-d.r * 0.5, d.r * 0.5), z: rnd(0, 14), vx: rnd(-10, 10), vy: rnd(-6, 6), vz: rnd(8, 24), life: rnd(0.7, 1.3), size: rnd(14, 26), col: '#79d94a' }); });
    sim.on('bag', (d) => { this.floatText(d.x, d.y - 8, '+' + d.gold, d.tapped ? '#fff27a' : '#ffd24a', d.tapped ? 1.25 : 1); for (let i = 0; i < (d.tapped ? 6 : 3); i++) this.coinPop(d.x, d.y); });
    sim.on('callwave', (d) => { if (d.bonus) this.floatText(this.cam.x, this.cam.y - 30, '+' + d.bonus + ' за скорость', '#ffd24a', 1.2); });
    sim.on('build', (b) => { this.dust(b.x, b.y + 8, 8, 26); });
    sim.on('upgrade', (b) => { this.ring(b.x, b.y, 34, '#ffe27a', 0.5); for (let i = 0; i < 8; i++) this.spark(b.x + rnd(-14, 14), b.y + rnd(-6, 8), '#ffe27a'); });
    sim.on('chest', (d) => {
      if (d.kind === 'hit') { for (let i = 0; i < 3; i++) this.coinPop(d.x, d.y - 10); this.spark(d.x, d.y - 16, '#fff6c0'); this.dust(d.x, d.y + 8, 4, 18); }
      else { for (let i = 0; i < 18; i++) this.coinPop(d.x + rnd(-10, 10), d.y - 8); this.ring(d.x, d.y, 46, '#ffe9a0', 0.55); this.flash = 0.22; this.flashCol = '#fff6d0'; this.dust(d.x, d.y + 6, 14, 34); this.floatText(d.x, d.y - 24, '+' + d.gold, '#fff27a', 1.5); }
    });
    sim.on('sell', ({ b }) => { this.dust(b.x, b.y + 8, 8, 26); for (let i = 0; i < 4; i++) this.coinPop(b.x, b.y); });
    sim.on('frosthit', (d) => { for (let i = 0; i < 3; i++) this.spark(d.x, d.y - 6, '#bfe8ff'); });
    sim.on('flame', (d) => {
      const col = d.b.branch === 'B' ? '#5affc8' : '#ffb04a', R = d.range, M = this.muzzle && this.muzzle(d.b);      // огонь идёт из пасти головы: плотная струя вдоль направления выстрела
      for (let i = 0; i < 10; i++) {
        const a = (M && this.headAngle ? this.headAngle(d.b) : d.a) + rnd(-0.16, 0.16), s = rnd(R * 1.3, R * 2.8), k = Math.random(), x0 = (M ? M.x : d.x + Math.cos(d.a) * 16) + Math.cos(a) * k * 14, y0 = (M ? M.y : d.y - 16 + Math.sin(d.a) * 8) + Math.sin(a) * k * 7;
        this.part({ k: 'fire', x: x0, y: y0, z: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rnd(0, 16), life: rnd(0.3, 0.52), size: rnd(11, 22), col });
      }
    });
    sim.on('ignite', (e) => { for (let i = 0; i < 3; i++) this.spark(e.x, e.y - 8, '#ff9a2a'); });
    sim.on('pulse', (d) => {
      const col = d.b.branch === 'A' ? '#ff4a9a' : d.b.branch === 'B' ? '#4adcff' : '#b070ff';
      this.ring(d.x, d.y, d.r, col, 0.55); this.ring(d.x, d.y, d.r * 0.6, col, 0.4);
      for (let i = 0; i < 14; i++) { const a = rnd(6.28), r = d.r * rnd(0.6, 1); this.part({ k: 'spark', x: d.x + Math.cos(a) * r, y: d.y + Math.sin(a) * r * 0.8, z: rnd(4, 20), vx: -Math.cos(a) * r * 1.8, vy: -Math.sin(a) * r * 1.4, vz: 0, life: 0.5, col, size: rnd(1.2, 2.2) }); }
      if (d.collapse) { this.flash = 0.2; this.flashCol = col; this.ring(d.x, d.y, d.r * 1.15, '#ffffff', 0.35); }
    });
    sim.on('frenzy', (b) => { this.ring(b.x, b.y, b.st.range * CELL, '#ff3a3a', 0.7); });
  }

  // ───── базовые примитивы ─────
  part(p) { if (this.parts.length > MAX_PARTS) return null; p.age = 0; p.max = p.life; this.parts.push(p); return p; }
  stamp(spr, x, y, size, rot = 0, alpha = 1) {
    this.touch(x, y, size * 0.8);
    const g = this.bg; g.save(); g.globalAlpha = alpha; g.translate(x, y); g.rotate(rot); g.drawImage(spr, -size / 2, -size / 2, size, size); g.restore();
  }
  splat(kind, x, y, size, alpha = 0.85) { this.stamp(splatSprite(kind, (Math.random() * 6) | 0), x, y, size, rnd(6.28), alpha); }
  floatText(x, y, text, col = '#fff', k = 1, kind = '') { this.floaters.push({ x, y, text: tr(text), col, k, t: 0, kind }); }
  coinPop(x, y) { this.part({ k: 'coin', x, y, z: 6, vx: rnd(-50, 50), vy: rnd(-20, 20), vz: rnd(120, 220), life: 1.1, bn: 2, rot: rnd(6), vr: rnd(-10, 10) }); }
  spark(x, y, col) { const a = rnd(6.28), s = rnd(30, 110); this.part({ k: 'spark', x, y, z: rnd(4, 18), vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.5, vz: rnd(30, 120), life: rnd(0.25, 0.55), col, size: rnd(1, 2) }); }
  ring(x, y, r, col, life = 0.5) { this.part({ k: 'ring', x, y, z: 0, vx: 0, vy: 0, vz: 0, life, r, col }); }
  dust(x, y, n, spread) { for (let i = 0; i < n; i++) { const a = rnd(6.28); this.part({ k: 'smoke', x: x + Math.cos(a) * rnd(spread * 0.4), y: y + Math.sin(a) * rnd(spread * 0.3), z: rnd(0, 6), vx: Math.cos(a) * rnd(6, 24), vy: Math.sin(a) * rnd(3, 12), vz: rnd(8, 26), life: rnd(0.4, 0.8), size: rnd(10, 18), col: 'dust' }); } }
  smokeAt(x, y, col, n) { for (let i = 0; i < n; i++) this.part({ k: 'cloud', x: x + rnd(-8, 8), y: y + rnd(-4, 4), z: rnd(0, 20), vx: rnd(-10, 10), vy: rnd(-5, 5), vz: rnd(10, 30), life: rnd(0.5, 0.9), size: rnd(12, 20), col }); }

  drops(x, y, n, col, dir, spread, speed, z0 = 12, size = 1.6) {
    n = Math.ceil(n * [0.25, 0.6, 1][this.level ?? 2]);
    const base = dir && (dir.x || dir.y) ? Math.atan2(dir.y, dir.x) : null;
    for (let i = 0; i < n; i++) {
      const a = base === null ? rnd(6.28) : base + rnd(-spread, spread);
      const s = rnd(0.3, 1) * speed;
      this.part({ k: 'drop', x: x + rnd(-3, 3), y: y + rnd(-2, 2), z: z0 + rnd(-4, 8), vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.55, vz: rnd(40, 200) * (speed / 160 + 0.4), life: 2, col, size: size * rnd(0.6, 1.4) });
    }
  }
  gibs(e, kinds, n, dir, spread, speed, dark = false) {
    n = Math.ceil(n * [0, 0.5, 1][this.level ?? 2]); if (n <= 0) return;
    const blood = BLOOD[e.def.blood], bleeds = e.def.blood !== 'bone';
    for (let i = 0; i < n; i++) {
      const kind = kinds[i % kinds.length];
      const a = dir && (dir.x || dir.y) ? Math.atan2(dir.y, dir.x) + rnd(-spread, spread) : rnd(6.28);
      const s = rnd(0.4, 1) * speed;
      const spr = gibSprite(e.type, kind, i, dark);
      this.part({ k: 'gib', spr, kind, bleeds, bk: e.def.blood, x: e.x + rnd(-4, 4), y: e.y + rnd(-3, 3), z: rnd(8, 26), vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.55, vz: rnd(110, 280) * (speed / 200 + 0.5), rot: rnd(6.28), vr: rnd(-14, 14), bn: 2, life: 2.6, size: 1, big: e.def.size > 1.1 ? 1.2 : 1 });
      this.stats.gibs++;
    }
    void blood;
  }
  emitter(x, y, dir, T, bk, rate = 70, speed = 100) { this.emitters.push({ x, y, dir, t: 0, T, bk, rate, speed, acc: 0 }); }

  // ───── события ─────
  onShot(d) {
    const col = { bolt: '#ffe8a0', mortar: '#ffb050', tesla: '#9adfff', frost: '#cfefff', toxic: '#aaff7a', saw: '#ffffff', harpoon: '#fff2c0' }[d.kind];
    if (!col) return;
    const a = d.a || 0, x = d.x + Math.cos(a) * 14, y = d.y + Math.sin(a) * 8 - 18;
    this.part({ k: 'flash', x, y, z: 0, vx: 0, vy: 0, vz: 0, life: 0.1, r: d.kind === 'mortar' ? 18 : 10, col });
    if (d.kind === 'harpoon') { this.dust(x, y + 12, 3, 12); }
    if (d.kind === 'mortar') { this.dust(x, y + 12, 4, 14); }
  }
  onHit({ e, dmg, type, how, x, y, dx, dy, crit }) {
    if (this.parts.length > MAX_PARTS - 40) return;
    const frac = dmg / e.maxHp;
    const dir = { x: dx, y: dy };
    if ((type === 'phys' || type === 'blast') && Math.random() < 0.6) this.sound('flesh', 0.35 + Math.min(0.5, frac * 3));
    const blood = BLOOD[e.def.blood];
    if (type === 'frost') { this.spark(x, y - 10, '#bfe8ff'); return; }
    if (type === 'lightning') { for (let i = 0; i < 3; i++) this.spark(x, y - 10, '#bfe8ff'); if (Math.random() < 0.4) this.drops(x, y, 2, blood[0], dir, 0.9, 90); return; }
    if (type === 'poison') { this.drops(x, y, 2, '#79d94a', null, 6, 50, 10, 1.2); return; }
    if (type === 'fire') { for (let i = 0; i < 2; i++) this.spark(x, y - 10, '#ff9a2a'); return; }
    const n = Math.min(12, 2 + Math.floor(frac * 36) + (crit ? 4 : 0));
    this.drops(x, y, n, blood[0], dir, 0.8, 80 + frac * 220, 14);
    if (Math.random() < 0.3 + frac) this.splat(e.def.blood, x + dx * 10 + rnd(-6, 6), y + dy * 6 + rnd(-4, 4), rnd(10, 18) * (1 + frac * 2), 0.8);
  }
  onExplosion({ x, y, r, kind, big }) {
    const k = kind === 'meteor' ? 2.2 : kind === 'bomblet' ? 0.55 : kind === 'pop' ? 0.4 : kind === 'vial' ? 0.7 : kind === 'shatter' ? 0.9 : 1;
    if (kind === 'vial') {
      for (let i = 0; i < 10; i++) this.part({ k: 'cloud', x: x + rnd(-r * 0.6, r * 0.6), y: y + rnd(-r * 0.4, r * 0.4), z: rnd(0, 10), vx: rnd(-14, 14), vy: rnd(-8, 8), vz: rnd(10, 36), life: rnd(0.5, 1.0), size: rnd(14, 22), col: '#79d94a' });
      this.ring(x, y, r, '#9aff5a', 0.4); return;
    }
    if (kind === 'shatter') { this.ring(x, y, r, '#bfe8ff', 0.4); for (let i = 0; i < 9; i++) this.part({ k: 'shard', spr: shardSprite(), x, y, z: rnd(6, 20), vx: rnd(-120, 120), vy: rnd(-60, 60), vz: rnd(60, 200), life: 0.9, rot: rnd(6), vr: rnd(-12, 12), size: rnd(0.8, 1.4) }); return; }
    this.part({ k: 'flash', x, y, z: 0, vx: 0, vy: 0, vz: 0, life: 0.22, r: r * 2.2 * k, col: '#ffb040' });
    this.ring(x, y, r * 1.2, '#ffcf80', 0.35);
    const nSmoke = Math.round(5 * k + 2);
    for (let i = 0; i < nSmoke; i++) { const a = rnd(6.28), d = rnd(r * 0.8); this.part({ k: 'smoke', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7, z: rnd(0, 10), vx: Math.cos(a) * 18, vy: Math.sin(a) * 10, vz: rnd(14, 40), life: rnd(0.6, 1.2), size: rnd(14, 28) * k, col: 'dark' }); }
    for (let i = 0; i < 10 * k; i++) { const a = rnd(6.28), s = rnd(40, 170) * k; this.part({ k: 'ember', x, y, z: rnd(2, 10), vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rnd(60, 220), life: rnd(0.4, 0.9), size: rnd(1, 2.4) }); }
    this.stamp(scorchSprite(), x, y, Math.max(26, r * 2.1), rnd(6), 0.75);
    if (kind === 'meteor') { this.flash = 0.3; this.flashCol = '#ff9a2a'; }
  }

  onKill({ e, how, over, x, y, dx, dy, frozen, crit }) {
    const def = e.def, blood = BLOOD[def.blood], bk = def.blood;
    const boss = false, big = def.heavy ? 1.7 : def.size > 1.1 ? 1.3 : 1;
    const bleeds = bk !== 'bone';
    const dir = (dx || dy) ? { x: dx, y: dy } : null;
    const kinds = gibKinds(e.type);
    let mode;
    if (frozen) mode = 'shatter';
    else switch (how) {
      case 'meteor': mode = 'explode'; break;
      case 'blast': mode = crit ? 'explode' : over > 0.5 ? 'explode_small' : 'topple'; break;      // в клочья разлетаются только от критического залпа
      case 'void': mode = 'implode'; break;
      case 'saw': case 'chop': case 'slash': mode = 'dismember'; break;
      case 'crit': case 'execute': mode = 'headshot'; break;
      case 'lightning': mode = 'char'; break;
      case 'frost': case 'shatter': mode = 'shatter'; break;
      case 'poison': mode = 'melt'; break;
      case 'fire': mode = 'burn'; break;
      default: mode = over > 1.2 ? 'explode_small' : 'topple';
    }
    if (crit && how !== 'blast' && how !== 'crit' && how !== 'execute' && mode === 'topple') mode = 'headshot';
    if (boss && (mode === 'topple' || mode === 'headshot')) mode = 'explode_small';
    e._gibbed = ['explode', 'explode_small', 'dismember', 'headshot', 'shatter', 'implode'].includes(mode);      // тело разлетелось: анимацию «упал» не показываем
    if (crit) this.floatText(x, y - 26, 'КРИТ', '#ffd24a', 1, 'crit');
    const poolKind = bk;
    const addPool = (scale = 1, T = 1.6) => this.pools.push({ x, y, kind: poolKind, t: 0, T, scale: scale * big, n: 0 });
    switch (mode) {
      case 'explode': {
        this.sound('burst', boss ? 1.4 : 1); this.sound('bone', 0.6);
        this.gibs(e, kinds, Math.min(14, kinds.length + 2 + (boss ? 6 : 0)), null, 0, 190 * big);
        this.drops(x, y, 34 * big, blood[0], null, 0, 220 * big, 16, 2);
        for (let i = 0; i < 4 * big; i++) this.splat(bk, x + rnd(-26, 26) * big, y + rnd(-16, 16) * big, rnd(24, 46) * big, 0.85);
        addPool(1.3, 1.2);
        this.part({ k: 'flash', x, y, z: 0, vx: 0, vy: 0, vz: 0, life: 0.18, r: 38 * big, col: bleeds ? '#ff5a5a' : '#fff0c0' });
        break;
      }
      case 'implode': {
        this.sound('voidpop', 0.9);
        this.gibs(e, kinds, Math.min(6, kinds.length), dir, 0.5, 120);
        this.drops(x, y, 20, blood[0], dir, 0.8, 130, 14); this.splat(bk, x, y, rnd(22, 32) * big, 0.85); addPool(1);
        this.ring(x, y, 24, '#b070ff', 0.35);
        break;
      }
      case 'explode_small': {
        this.sound('squelch', 0.9); this.sound('bone', 0.5);
        this.gibs(e, kinds, Math.min(6, kinds.length), dir, 1.2, 150);
        this.drops(x, y, 18, blood[0], dir, 1.4, 160, 14);
        this.splat(bk, x, y, rnd(26, 38) * big, 0.9); addPool(1);
        break;
      }
      case 'dismember': {
        this.sound('chop', 0.9); this.sound('rip', 0.8); this.sound('spray', 0.6);
        const k = ['head', 'torso', 'arm', 'arm', 'leg', 'leg'].filter((q) => kinds.includes(q));
        this.gibs(e, k.length ? k : kinds, Math.min(7, Math.max(4, k.length)), dir, 0.9, 170 * big);
        this.drops(x, y, 26 * big, blood[0], dir, 1.1, 190, 16);
        this.splat(bk, x, y, rnd(26, 40) * big, 0.9); this.splat(bk, x + (dir ? dir.x * 18 : 0), y + (dir ? dir.y * 10 : 0), rnd(16, 28) * big, 0.85);
        addPool(1.1);
        this.emitter(x, y, dir, 0.45, bk, 60, 90);
        break;
      }
      case 'topple': {                                      // обычная смерть: проигрывается анимация падения, на земле остаётся кровь
        this.sound('squelch', 0.7); this.sound('thudwet', 0.5);
        this.drops(x, y, 8 * big, blood[0], dir, 1.4, 110, 12);
        this.splat(bk, x, y, rnd(20, 28) * big, 0.8);
        break;
      }
      case 'headshot': {                                    // крит убил: голова улетает, из шеи бьёт фонтан, остальное разваливается
        this.sound('chop', 0.9); this.sound('spray', 1);
        this.gibs(e, ['head'], 1, dir, 0.25, 360 * big);
        this.gibs(e, ['torso', 'arm', 'arm', 'leg'].filter((q) => kinds.includes(q)), 3, dir, 0.6, 120);
        this.emitter(x, y - 14, dir, 1.0, bk, 120, 170);
        this.drops(x, y, 22 * big, blood[0], dir, 1.0, 240, 22, 2);
        this.splat(bk, x, y, rnd(28, 40) * big, 0.9); this.splat(bk, x + (dir ? dir.x * 26 : 0), y + (dir ? dir.y * 14 : 0), rnd(18, 28) * big, 0.85);
        addPool(1.2, 1.4);
        break;
      }
      case 'char': {
        this.sound('sizzle', 0.8);
        for (let i = 0; i < 10; i++) this.spark(x + rnd(-8, 8), y + rnd(-8, 4), i % 2 ? '#bfe8ff' : '#ffffff');
        this.smokeAt(x, y, 'dark', 4);
        this.stamp(scorchSprite(), x, y, 32, rnd(6), 0.7);
        break;
      }
      case 'shatter': {
        this.sound('glass', 0.9);
        for (let i = 0; i < 14; i++) this.part({ k: 'shard', spr: shardSprite(), x, y, z: rnd(6, 24), vx: rnd(-150, 150), vy: rnd(-70, 70), vz: rnd(80, 240), life: 1.1, rot: rnd(6), vr: rnd(-14, 14), size: rnd(0.8, 1.6) * big });
        this.gibs(e, bleeds ? ['chunk', 'chunk', 'head'] : ['bone', 'head', 'bone'], 3, null, 0, 120);
        this.stamp(iceSprite(), x, y, 40 * big, 0, 0.8);
        this.splat(bk, x, y, rnd(18, 26) * big, 0.8);
        this.ring(x, y, 28 * big, '#bfe8ff', 0.4);
        break;
      }
      case 'melt': {
        this.sound('bubble', 0.9);
        for (let i = 0; i < 12; i++) this.drops(x, y, 1, '#79d94a', null, 6, 40, 6, 1.6);
        for (let i = 0; i < 6; i++) this.part({ k: 'cloud', x: x + rnd(-8, 8), y: y + rnd(-4, 4), z: rnd(0, 8), vx: rnd(-6, 6), vy: rnd(-3, 3), vz: rnd(10, 26), life: rnd(0.6, 1.1), size: rnd(10, 16), col: '#79d94a' });
        this.splat('ooze', x, y, rnd(26, 38) * big, 0.85); this.splat(bk, x + rnd(-6, 6), y, rnd(16, 24), 0.7);
        addPool(1, 2.2);
        break;
      }
      case 'burn': {
        this.sound('crackle', 0.9);
        for (let i = 0; i < 12; i++) this.part({ k: 'ember', x: x + rnd(-8, 8), y, z: rnd(2, 14), vx: rnd(-40, 40), vy: rnd(-20, 20), vz: rnd(60, 200), life: rnd(0.5, 1.1), size: rnd(1, 2.4) });
        this.smokeAt(x, y, 'dark', 5);
        this.stamp(scorchSprite(), x, y, 34, rnd(6), 0.75);
        break;
      }
    }
  }

  // ───── обновление ─────
  update(dt) {
    this.t += dt;
    if (this.t - this.layers[this.cur].start >= SPAN) this.advanceLayer();
    if (this.flash > 0) this.flash -= dt;
    // фонтаны
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const em = this.emitters[i]; em.t += dt;
      if (em.t > em.T) { this.emitters.splice(i, 1); continue; }
      em.acc += dt * em.rate * (1 - em.t / em.T);
      const col = BLOOD[em.bk][0];
      while (em.acc >= 1) {
        em.acc -= 1;
        const a = em.dir ? Math.atan2(em.dir.y, em.dir.x) + rnd(-0.9, 0.9) : rnd(6.28);
        const s = rnd(10, em.speed);
        this.part({ k: 'drop', x: em.x, y: em.y, z: 16, vx: Math.cos(a) * s * 0.7, vy: Math.sin(a) * s * 0.4, vz: rnd(120, 240) * (1 - em.t / em.T * 0.5), life: 2, col, size: rnd(1, 2) });
      }
    }
    // лужи
    for (let i = this.pools.length - 1; i >= 0; i--) {
      const p = this.pools[i]; p.t += dt;
      const target = Math.floor((p.t / p.T) * 6);
      while (p.n < target && p.n < 6) { p.n++; const k = 0.45 + (p.n / 6) * 0.8; this.stamp(poolSprite(p.kind, p.n % 3), p.x + rnd(-3, 3), p.y + rnd(-2, 2), 40 * p.scale * k, rnd(6), 0.42); }
      if (p.t >= p.T) this.pools.splice(i, 1);
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) { this.bolts[i].t += dt; if (this.bolts[i].t > this.bolts[i].T) this.bolts.splice(i, 1); }
    for (let i = this.floaters.length - 1; i >= 0; i--) { const f = this.floaters[i]; f.t += dt; f.y -= dt * 22; if (f.t > 1.1) this.floaters.splice(i, 1); }
    // частицы
    const ps = this.parts;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]; p.age += dt;
      if (p.age >= p.max) { this.finish(p); ps.splice(i, 1); continue; }
      switch (p.k) {
        case 'drop': case 'gib': case 'shard': case 'ember': case 'spark': case 'coin': {
          p.vz -= GRAV * dt * (p.k === 'ember' || p.k === 'spark' ? 0.5 : 1);
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          if (p.rot !== undefined) p.rot += (p.vr || 0) * dt;
          if (p.z <= 0) {
            p.z = 0;
            if (p.k === 'drop') {
              this.splat(p.bk || this.dropKind(p.col), p.x, p.y, p.size * rnd(5, 9), 0.8); ps.splice(i, 1);
            } else if ((p.k === 'gib' || p.k === 'coin') && p.bn > 0) {
              this.sound(p.k === 'gib' ? 'slap' : 'coin', p.k === 'gib' ? 0.55 : 0.3); p.bn--; p.vz = -p.vz * 0.35; p.vx *= 0.55; p.vy *= 0.55; p.vr = (p.vr || 0) * 0.5;
              if (p.k === 'gib' && p.bleeds) { this.splat(p.bk, p.x, p.y, rnd(10, 16) * p.big, 0.75); this.drops(p.x, p.y, 3, BLOOD[p.bk][0], null, 0, 70, 4, 1.2); }
            } else if (p.k === 'gib') {
              this.sound('slap', 0.35); this.splat(p.bleeds ? p.bk : 'bone', p.x, p.y, rnd(14, 24) * p.big, 0.6);
              this.stamp(p.spr, p.x, p.y, p.spr.lw, p.rot, 0.95); ps.splice(i, 1);
            } else ps.splice(i, 1);
          }
          break;
        }
        case 'smoke': case 'cloud': case 'plus': case 'fire': p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 0.98; break;
        case 'corpse': break;
      }
    }
  }
  dropKind(col) { return col === '#79d94a' ? 'ooze' : col === '#b3101e' ? 'red' : (Object.keys(BLOOD).find((k) => BLOOD[k][0] === col) || 'red'); }
  finish(p) {
    if (p.k === 'corpse') {
      this.sound('thudwet', 0.8);
      const spr = p.char ? tinted(p.type, 0, '#080506', 0.8) : tinted(p.type, 0, '#3a0610', 0.32);
      const a = ENEMY_ART[p.type];
      this.touch(p.x, p.y, 80);
      const g = this.bg; g.save(); g.globalAlpha = 0.92; g.translate(p.x, p.y);
      g.rotate((p.dirx || 1) * Math.PI / 2 * 0.95); g.scale(p.dirx || 1, 1);
      g.drawImage(spr, -a.ax, -a.ay, spr.lw, spr.lh); g.restore();
      this.splat(p.bk, p.x, p.y + 2, 22, 0.8);
    }
  }
}
