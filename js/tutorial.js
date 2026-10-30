// Обучающий уровень: без сообщений. Ведёт игрока по шагам одной подсветкой: нужный объект обведён по контуру, рядом палец с анимацией касания,
// остальной экран затемнён и не нажимается (касания проходят только через «окно» вокруг цели). Когда игрок выбрал здание и ставит его на клетку,
// затемнения нет: обводится только клетка и показывается палец. Состояние берётся из симуляции и интерфейса, поэтому порядок шагов не жёсткий.
import * as D from './data.js?v=20261030153315';

const $ = (s) => document.querySelector(s);

export class Tutorial {
  constructor(ctrl) { this.c = ctrl; this.i = -1; this.steps = this.build(); this.timer = 0; }

  attach(sim, ui) {
    this.sim = sim; this.ui = ui; this.i = -1; this.timer = 0; this.done = false; this._sp = '';
    const hand = $('#tuthand'); if (!hand.src) hand.src = new URL('../img/ui/hand.webp', import.meta.url).href;
    this.go(0);
  }
  detach() { this.done = true; this.spot(null); const v = this.c.view; if (v) v.hint = null; }

  // подходящие клетки: для башни — рядом с дорогой, для рудника — подальше от неё
  cells(kind) {
    const s = this.sim, out = [];
    for (let r = 0; r < D.ROWS; r++) for (let c = 0; c < D.COLS; c++) {
      if (!s.canBuild(c, r)) continue;
      const x = (c + 0.5) * D.CELL, y = (r + 0.5) * D.CELL; let cov = 0;
      for (const p of s.paths) for (let d = 0; d < p.total; d += 16) { const q = p.at(d); if (Math.hypot(q.x - x, q.y - y) <= 3 * D.CELL) cov++; }
      out.push([c, r, cov]);
    }
    out.sort((a, b) => (kind === 'tower' ? b[2] - a[2] : a[2] - b[2]));
    return out.slice(0, 5).map(([c, r]) => [c, r]);
  }
  // карточка здания в меню; если меню закрыто — сначала подсвечиваем кнопку, которая его открывает
  card(type) { const sel = `#slots .card[data-type=${type}]`, e = document.querySelector(sel); return e && e.getBoundingClientRect().width ? sel : '#slotbtn'; }
  has(type) { return this.sim.countOf(type === 'bolt' ? 'tower' : 'econ', type) > 0; }
  tower() { return this.sim.buildings.find((b) => b.type === 'bolt'); }

  // dim: затемнять и блокировать остальной экран на этом шаге; hint: селектор элемента интерфейса; bag/b: монета или башня на поле
  build() {
    const self = this;
    return [
      { hint: '#slotbtn', dim: true, done: () => self.ui.open || !!self.ui.cardSel || self.sim.buildings.length > 0 },
      { hint: () => self.card('bolt'), dim: true, tick: () => self.armedHint(), done: () => self.sim.buildings.length > 0 || self.has('bolt') },
      { hint: () => self.card(self.has('bolt') ? 'mine' : 'bolt'), dim: true, tick: () => self.armedHint(), done: () => self.has('bolt') && self.has('mine') },
      { bag: true, dim: true, done: () => self.sim.stats.bags >= 1 },
      { hint: '.wcall', dim: true, enter() { self.sim.hold = false; }, done: () => self.sim.wave >= 1 },
      { done: () => self.sim.wave >= 1 && self.sim.qi >= self.sim.queue.length && self.sim.enemies.length === 0 },
      { b: true, dim: true, enter() { self.sim.gold = Math.max(self.sim.gold, 80); }, skip: () => !self.tower(), done: () => !!self.ui.selB },
      { hint: '.abtn.up', dim: true, skip: () => !self.tower(), done: () => !!self.ui.upB || (self.tower() && self.tower().level >= 2) },
      { hint: '#um-cards', dim: true, done: () => !self.tower() || self.tower().level >= 2 },
    ];
  }

  // игрок взял здание из меню и должен поставить его: затемнения нет, обводится подходящая клетка
  armedHint() {
    const v = this.c.view, a = v.armed;
    const key = a ? a.type + ':' + this.sim.buildings.length : '';
    if (this._hk !== key) {
      this._hk = key; v.hint = a ? { cells: this.cells(a.kind === 'tower' ? 'tower' : 'mine') } : null;      // клетки считаем один раз, а не каждый кадр
      const R = this.c.renderer, h = v.hint && v.hint.cells[0];
      if (R && h && !R.inView((h[0] + 0.5) * D.CELL, (h[1] + 0.5) * D.CELL, -40)) R.focus((h[0] + 0.5) * D.CELL, (h[1] + 0.5) * D.CELL);      // клетка вне экрана — показываем её
    }
    this.placing = !!a;
  }

  // Подсветка цели: рамка по контуру, окно в затемнении (четыре панели вокруг, касания проходят только в окно) и палец с касанием.
  spot(r, dim = true) {
    const layer = $('#tutlayer'), ring = $('#tutring'), hand = $('#tuthand'), P = layer.children;
    if (!r) { layer.classList.add('hidden'); hand.classList.add('hidden'); this._sp = ''; return; }
    const key = [r.x, r.y, r.w, r.h, dim ? 1 : 0].map(Math.round).join(','); if (key === this._sp) return; this._sp = key;
    const pad = 4, x = r.x - pad, y = r.y - pad, w = r.w + pad * 2, h = r.h + pad * 2, W = window.innerWidth, H = window.innerHeight;
    layer.classList.remove('hidden'); hand.classList.remove('hidden');
    const set = (e, l, t, ww, hh) => { e.style.cssText = `left:${l}px;top:${t}px;width:${Math.max(0, ww)}px;height:${Math.max(0, hh)}px;display:${dim ? '' : 'none'}`; };
    set(P[0], 0, 0, W, y); set(P[1], 0, y + h, W, H - y - h); set(P[2], 0, y, x, h); set(P[3], x + w, y, W - x - w, h);
    Object.assign(ring.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', borderRadius: r.round ? '50%' : (r.radius != null ? r.radius + pad : 14) + 'px' });
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, hw = 84; hand.style.width = hw + 'px'; hand.style.left = cx - hw * 0.07 + 'px'; hand.style.top = cy - hw * 0.05 + 'px';      // кончик пальца — в центре цели
  }
  target(sel) {
    if (sel) {
      const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); if (!b.width) return null;
      const rad = parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0; return { x: b.left, y: b.top, w: b.width, h: b.height, radius: Math.min(rad, Math.min(b.width, b.height) / 2), round: rad >= Math.min(b.width, b.height) / 2 - 1 && Math.abs(b.width - b.height) < 3 };
    }
    const v = this.c.view, R = this.c.renderer, s = this.sim, h = v && v.hint; if (!R || !h) return null;
    const cv = document.getElementById('cv').getBoundingClientRect(), at = (wx, wy, size, round) => { const p = R.toScreen(wx, wy), k = size * R.zoom; return { x: cv.left + p.x - k / 2, y: cv.top + p.y - k / 2, w: k, h: k, round, radius: 8 }; };
    if (h.cells && h.cells[0]) return at((h.cells[0][0] + 0.5) * D.CELL, (h.cells[0][1] + 0.5) * D.CELL, D.CELL);
    if (h.bag) { const g = (s.bags || []).find((q) => !q.dead); return g ? at(g.x, g.y - 12, 44, true) : null; }
    if (h.b) return at(h.b.x, h.b.y - 6, 52);
    return null;
  }
  go(i) {
    this.spot(null); this.placing = false; this._hk = null; const v = this.c.view; if (v) v.hint = null;
    while (i < this.steps.length && this.steps[i].skip && this.steps[i].skip()) i++;
    this.i = i; if (i >= this.steps.length) return;
    const st = this.steps[i]; if (st.enter) st.enter(); this.c.sfx.play('select');
  }
  update(dt) {
    if (this.done || this.i < 0 || this.i >= this.steps.length) return;
    const st = this.steps[this.i], v = this.c.view;
    if (st.tick) st.tick();
    const sel = typeof st.hint === 'function' ? st.hint() : st.hint;
    if (!st.tick) v.hint = st.bag ? { bag: true } : st.b ? { b: this.tower() } : null;
    else if (st.bag) v.hint = { bag: true };
    this._st = (this._st || 0) + dt;
    if (st.bag || this._st > 0.12) {                                  // монета движется — следим за ней каждый кадр, остальное реже
      this._st = 0;
      if (this.placing) this.spot(this.target(null), false);           // здание выбрано: без затемнения, только клетка и палец
      else if (sel || st.bag || st.b) this.spot(this.target(typeof sel === 'string' ? sel : null), !!st.dim);
      else this.spot(null);
    }
    if (st.done()) this.go(this.i + 1);
  }
}
