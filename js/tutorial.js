// Обучающий уровень: без сообщений. Ведёт игрока по шагам одной подсветкой: нужный объект обведён по контуру (кнопка — по своей форме, здание и монета —
// по силуэту картинки, это рисует render.js по view.hl), рядом палец с анимацией касания, остальной экран затемнён и не нажимается (касания проходят
// только через «окно» вокруг цели). Когда игрок выбрал здание и ставит его, подсветки нет совсем: куда ставить, решает сам. Состояние берётся из симуляции
// и интерфейса, поэтому порядок шагов не жёсткий.
import * as D from './data.js?v=20261109100442';
import { Net } from './net.js?v=20261109100442';

const $ = (s) => document.querySelector(s);

export class Tutorial {
  constructor(ctrl) { this.c = ctrl; this.i = -1; this.steps = this.build(); this.timer = 0; }

  attach(sim, ui) {
    this.sim = sim; this.ui = ui; this.i = -1; this.timer = 0; this.done = false; this._sp = '';
    const hand = $('#tuthand'); if (!hand.src) hand.src = new URL('../img/ui/hand.webp', import.meta.url).href;
    this.go(0);
  }
  detach() { this.done = true; clearTimeout(this._end); this.spot(null); const v = this.c.view; if (v) v.hl = null; }

  // подходящие клетки: для башни — рядом с дорогой, для рудника — подальше от неё
  cells(kind, n = 5) {
    const s = this.sim, out = [];
    for (let r = 0; r < D.ROWS; r++) for (let c = 0; c < D.COLS; c++) {
      if (!s.canBuild(c, r)) continue;
      const x = (c + 0.5) * D.CELL, y = (r + 0.5) * D.CELL; let cov = 0;
      for (const p of s.paths) for (let d = 0; d < p.total; d += 16) { const q = p.at(d); if (Math.hypot(q.x - x, q.y - y) <= 3 * D.CELL) cov++; }
      out.push([c, r, cov]);
    }
    out.sort((a, b) => (kind === 'tower' ? b[2] - a[2] : a[2] - b[2]));
    return out.slice(0, n).map(([c, r]) => [c, r]);
  }
  // карточка здания в меню; если меню закрыто — сначала подсвечиваем кнопку, которая его открывает
  card(type) { const sel = `#slots .card[data-type=${type}]`, e = document.querySelector(sel); return this.ui.open && e && e.getBoundingClientRect().width ? sel : '#slotbtn'; }
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
      { done: () => !self.tower() || self.tower().level >= 2 },
    ];
  }

  // игрок взял здание из меню и ставит его: никакой подсветки и затемнения, он сам выбирает клетку
  armedHint() { this.placing = !!this.c.view.armed; if (this.ui.selB) this.ui.deselect(); }      // игра выделяет только что построенное здание и открывает его панель — на этих шагах она не нужна и закрывает кнопку строительства

  // Подсветка цели: рамка по контуру, окно в затемнении (четыре панели вокруг, касания проходят только в окно) и палец с касанием.
  spot(r, dim = true, o = {}) {
    const layer = $('#tutlayer'), ring = $('#tutring'), hand = $('#tuthand'), P = layer.children;
    if (!r) { layer.classList.add('hidden'); hand.classList.add('hidden'); this._sp = ''; return; }
    const key = [r.x, r.y, r.w, r.h, dim ? 1 : 0, o.nohand ? 1 : 0, r.canvas ? 1 : 0, o.pick ? 1 : 0].map(Math.round).join(','); if (key === this._sp) return; this._sp = key;
    const pad = r.canvas ? 3 : 4, x = r.x - pad, y = r.y - pad, w = r.w + pad * 2, h = r.h + pad * 2, W = window.innerWidth, H = window.innerHeight;
    layer.classList.remove('hidden'); hand.classList.toggle('hidden', !!o.nohand);
    const set = (e, l, t, ww, hh) => { e.style.cssText = `left:${l}px;top:${t}px;width:${Math.max(0, ww)}px;height:${Math.max(0, hh)}px`; };      // панели невидимые, только не пускают касания мимо цели
    set(P[0], 0, 0, W, y); set(P[1], 0, y + h, W, H - y - h); set(P[2], 0, y, x, h); set(P[3], x + w, y, W - x - w, h);
    ring.classList.toggle('cv', !!r.canvas); ring.classList.toggle('nodim', !dim);      // затемнение рисует сама рамка (тень вокруг «окна» с тем же скруглением); у здания и монеты контур рисует игра по силуэту
    Object.assign(ring.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', borderRadius: r.round ? '50%' : (r.radius != null ? r.radius + pad : 14) + 'px' });
    const cat = $('#tutcatch');                                           // здание: касание в любом месте обведённой картинки выбирает его (игра сама выбирает только по клетке под зданием)
    if (o.pick) { Object.assign(cat.style, { display: 'block', left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' }); cat.onclick = o.pick; } else { cat.style.display = 'none'; cat.onclick = null; }
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, hw = 84; hand.style.width = hw + 'px'; hand.style.left = cx - hw * 0.07 + 'px'; hand.style.top = cy - hw * 0.05 + 'px';      // кончик пальца — в центре цели
  }
  // палец над подходящей клеткой для выбранного здания (башня — у дороги, рудник — подальше); касания не блокируются, ставить можно куда угодно
  pointCell() {
    const a = this.c.view.armed, R = this.c.renderer, hand = $('#tuthand'); if (!a || !R) return;
    const kind = a.kind === 'econ' ? 'econ' : 'tower', key = kind + ':' + this.sim.buildings.length;
    const cv = document.getElementById('cv').getBoundingClientRect(), scr = (q) => R.toScreen((q[0] + 0.5) * D.CELL, (q[1] + 0.5) * D.CELL);
    if (this._cellKey !== key) {                                         // только клетка, которую видно: не за краем поля, не под кнопками и панелями сверху и снизу
      this._cellKey = key;
      const dock = document.getElementById('dock'), db = dock ? dock.getBoundingClientRect() : null, bottom = Math.min(cv.height - 150, db && db.height ? db.top - cv.top - 40 : 1e9);
      this._cell = this.cells(kind, 999).find((q) => { const p = scr(q); return p.x > 40 && p.x < cv.width - 60 && p.y > 130 && p.y < bottom; }) || null;
    }
    if (!this._cell) return;
    const p = scr(this._cell), hw = 84;
    hand.classList.remove('hidden'); hand.style.width = hw + 'px'; hand.style.left = cv.left + p.x - hw * 0.07 + 'px'; hand.style.top = cv.top + p.y - hw * 0.05 + 'px';
  }
  target(sel) {
    if (sel) {
      const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); if (!b.width) return null;
      const rad = parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0; return { x: b.left, y: b.top, w: b.width, h: b.height, radius: Math.min(rad, Math.min(b.width, b.height) / 2), round: rad >= Math.min(b.width, b.height) / 2 - 1 && Math.abs(b.width - b.height) < 3 };
    }
    const v = this.c.view, R = this.c.renderer, s = this.sim, h = v && v.hl; if (!R || !h) return null;
    const cv = document.getElementById('cv').getBoundingClientRect(), k = R.zoom;
    if (h.bag) { const g = (s.bags || []).find((q) => !q.dead); if (!g) return null; const p = R.toScreen(g.x, g.y - 48), sz = 38 * k; return { x: cv.left + p.x - sz / 2, y: cv.top + p.y - sz / 2, w: sz, h: sz, canvas: true, round: true }; }      // монета висит на 48 над землёй (см. drawBags)
    if (h.b && s.buildings.includes(h.b)) { const bx = R.tutBox(h.b); if (!bx) return null; const p = R.toScreen(bx.x, bx.y); return { x: cv.left + p.x, y: cv.top + p.y, w: bx.w * k, h: bx.h * k, canvas: true, radius: 12 }; }
    return null;
  }
  go(i) {
    this.spot(null); this.placing = false; const v = this.c.view; if (v) v.hl = null;
    while (i < this.steps.length && this.steps[i].skip && this.steps[i].skip()) i++;
    this.i = i; if (i >= this.steps.length) { this.complete(); return; }
    Net.step('tut' + i);                                     // воронка новичка: до какого шага обучения дошёл
    const st = this.steps[i]; if (st.enter) st.enter(); this.c.sfx.play('select');
  }
  // все подсказки пройдены — обучение засчитано сразу, без оставшихся волн (новички уходили, когда делать было уже нечего)
  complete() {
    const s = this.sim; clearTimeout(this._end);
    this._end = setTimeout(() => { if (this.done || this.sim !== s || s.state !== 'play') return; s.state = 'won'; s.finish(true); s.emit('over', { won: true }); }, 1200);       // пауза, чтобы игрок увидел улучшенную башню
  }
  update(dt) {
    if (this.done || this.i < 0 || this.i >= this.steps.length) return;
    const st = this.steps[this.i], v = this.c.view;
    // после постройки рудника монета падает почти сразу, только в обучении
    if (this.has('mine') && !this._coinSped && this.sim.stats.bags === 0) { this._coinSped = true; const m = this.sim.buildings.find((b) => b.type === 'mine'); if (m && (m.coinT ?? 99) > 1.2) m.coinT = 1.2; }
    if (st.tick) st.tick(); else this.placing = false;
    const sel = typeof st.hint === 'function' ? st.hint() : st.hint;
    v.hl = st.bag ? { bag: true } : st.b ? { b: this.tower() } : null;
    // цель двигается (кнопки выезжают, монета качается), поэтому положение берём каждый кадр
    if (this.placing) { if (this._sp) this.spot(null); this.pointCell(); }           // здание выбрано: без затемнения, палец показывает хорошую клетку (новички уходили, не понимая, куда ставить)
    else if (sel || st.bag || st.b) this.spot(this.target(typeof sel === 'string' ? sel : null), !!st.dim, { nohand: st.nohand, pick: st.b ? () => { const t = this.tower(); if (t) this.ui.select(t); } : null });
    else this.spot(null);
    if (st.done()) this.go(this.i + 1);
  }
}
