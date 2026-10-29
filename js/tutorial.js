// Обучающий уровень: ведёт игрока по шагам сообщениями и подсветкой. Состояние берётся из симуляции и интерфейса,
// поэтому порядок «сначала башня, потом рудник» или наоборот не важен, а лишние действия не ломают ход обучения.
import * as D from './data.js?v=20261029212841';

const $ = (s) => document.querySelector(s);

export class Tutorial {
  constructor(ctrl) { this.c = ctrl; this.i = -1; this.steps = this.build(); this.timer = 0; }

  attach(sim, ui) {
    this.sim = sim; this.ui = ui; this.i = -1; this.clicked = false; this.timer = 0; this.done = false;
    $('#tut .tpic').src = new URL('../img/ui/portrait_skull.webp', import.meta.url).href;
    const ok = $('#tut .tok'); ok.onclick = () => { this.clicked = true; this.c.sfx.play('click'); };
    this.go(0);
  }
  detach() { this.clearHints(); $('#tut').classList.add('hidden'); this.done = true; this.c.view.hint = null; }

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
  has(type) { return this.sim.countOf(type === 'bolt' ? 'tower' : 'econ', type) > 0; }
  tower() { return this.sim.buildings.find((b) => b.type === 'bolt'); }

  build() {
    const self = this;
    return [
      { text: 'Добро пожаловать, воевода! Нечисть идёт по дороге к твоей крепости. Я научу тебя обороне.', btn: true, done: () => self.clicked },
      { text: 'Открой строительство: кнопка справа внизу.', hint: '#slotbtn', done: () => self.ui.open || !!self.ui.cardSel || self.sim.buildings.length > 0 },
      { text: 'Арбалет бьёт врагов, рудник даёт золото. Золота хватит на оба, но ставить можно по одному. Начни с любого.', hint: '#slots .card',
        tick: () => self.armedHint(), done: () => self.sim.buildings.length > 0 },
      { text() { return self.has('bolt') ? 'Отлично! Теперь рудник: без золота башни не вырастут.' : 'Отлично! Теперь арбалет: он защитит от врагов.'; },
        hint() { return self.has('bolt') ? '#slots .card[data-type=mine]' : '#slots .card[data-type=bolt]'; }, tick: () => self.armedHint(), done: () => self.has('bolt') && self.has('mine') },
      { text: 'Рудник выбрасывает монеты. Коснись монеты, пока она не пропала!', bag: true, done: () => self.sim.stats.bags >= 1 },
      { text: 'Враги уже близко. Нажми ▶ и вызови первую волну!', hint: '.wcall', enter() { self.sim.hold = false; }, done: () => self.sim.wave >= 1 },
      { text: 'Арбалет стреляет сам. Золото дают монеты рудника: подбирай их, пока не пропали!', done: () => self.sim.wave >= 1 && self.sim.qi >= self.sim.queue.length && self.sim.enemies.length === 0 },
      { text: 'Золото есть: усилим арбалет. Коснись башни.', enter() { self.sim.gold = Math.max(self.sim.gold, 80); }, b: true, skip: () => !self.tower(), done: () => !!self.ui.selB },
      { text: 'Нажми на значок улучшения.', hint: '.abtn.up', skip: () => !self.tower(), done: () => !!self.ui.upB || (self.tower() && self.tower().level >= 2) },
      { text: 'Игра на паузе. Выбери улучшение: оно зависит от башни, предлагаются два варианта.', hint: '.umc', done: () => !self.tower() || self.tower().level >= 2 },
      { text: 'Так держать! Отбей оставшиеся волны: подбирай монеты и улучшай башни.', auto: 7, done: () => false },
    ];
  }

  armedHint() {
    const v = this.c.view, a = v.armed;
    const key = a ? a.type + ':' + this.sim.buildings.length : '';
    if (this._hk !== key) {
      this._hk = key; v.hint = a ? { cells: this.cells(a.kind === 'tower' ? 'tower' : 'mine') } : null;      // клетки считаем один раз, а не каждый кадр
      const R = this.c.renderer, h = v.hint && v.hint.cells[0];
      if (R && h && !R.inView((h[0] + 0.5) * D.CELL, (h[1] + 0.5) * D.CELL, -40)) R.focus((h[0] + 0.5) * D.CELL, (h[1] + 0.5) * D.CELL);      // подсвеченная клетка вне экрана — показываем её
    }
    const t = $('#tut .ttext'); const want = a ? 'Коснись подсвеченной клетки. На телефоне коснись дважды в одну и ту же клетку.' : null;
    if (want && t.textContent !== want) { this.armedText = true; t.textContent = want; }
    else if (!want && this.armedText) { this.armedText = false; this.show(this.steps[this.i]); }
  }

  clearHints() { for (const e of document.querySelectorAll('.tuthint')) e.classList.remove('tuthint'); const v = this.c.view; if (v) v.hint = null; this.spot(null); }
  // Затемнение с «окном» вокруг нужного объекта, указатель-перчатка на нём и сообщение рядом (над объектом или под ним, чтобы не закрывать его).
  // Цель: кнопка интерфейса (селектор), клетка/монета/здание на поле (координаты считаются из камеры). Касания проходят сквозь затемнение.
  spot(r) {
    const sp = $('#tutspot'), hand = $('#tuthand'), box = $('#tut');
    if (!r) { sp.classList.add('hidden'); hand.classList.add('hidden'); box.style.top = ''; this._sp = ''; return; }
    const key = [r.x, r.y, r.w, r.h].map(Math.round).join(','); if (key === this._sp) return; this._sp = key;
    const pad = 6; sp.classList.remove('hidden'); hand.classList.remove('hidden');
    if (!hand.src) hand.src = new URL('../img/ui/hand.webp', import.meta.url).href;
    Object.assign(sp.style, { left: r.x - pad + 'px', top: r.y - pad + 'px', width: r.w + pad * 2 + 'px', height: r.h + pad * 2 + 'px', borderRadius: r.round ? '50%' : '14px' });
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, hw = 84; hand.style.width = hw + 'px'; hand.style.left = cx - hw * 0.07 + 'px'; hand.style.top = cy - hw * 0.05 + 'px';      // кончик пальца — в центре цели
    const vh = window.innerHeight, mh = box.offsetHeight || 70;
    box.style.top = (cy < vh * 0.42 ? Math.min(vh - mh - 130, r.y + r.h + 112) : Math.max(54, r.y - mh - 18)) + 'px';
  }
  target(sel) {
    if (sel) { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? { x: b.left, y: b.top, w: b.width, h: b.height } : null; }
    const v = this.c.view, R = this.c.renderer, s = this.sim, h = v && v.hint; if (!R || !h) return null;
    const cv = document.getElementById('cv').getBoundingClientRect(), at = (wx, wy, size, round) => { const p = R.toScreen(wx, wy), k = size * R.zoom; return { x: cv.left + p.x - k / 2, y: cv.top + p.y - k / 2, w: k, h: k, round }; };
    if (h.cells && h.cells[0]) return at((h.cells[0][0] + 0.5) * D.CELL, (h.cells[0][1] + 0.5) * D.CELL, D.CELL);
    if (h.bag) { const g = (s.bags || []).find((q) => !q.dead); return g ? at(g.x, g.y - 12, 44, true) : null; }
    if (h.b) return at(h.b.x, h.b.y - 6, 52);
    return null;
  }
  show(st) {
    const box = $('#tut'); box.classList.remove('hidden');
    $('#tut .ttext').textContent = typeof st.text === 'function' ? st.text() : st.text;
    $('#tut .tok').classList.toggle('hidden', !st.btn);
  }
  go(i) {
    this.clearHints(); this.armedText = false;
    while (i < this.steps.length && this.steps[i].skip && this.steps[i].skip()) i++;
    this.i = i; if (i >= this.steps.length) { $('#tut').classList.add('hidden'); return; }
    const st = this.steps[i]; this.clicked = false; this.timer = st.auto || 0;
    if (st.enter) st.enter();
    this.show(st); this.c.sfx.play('select');
  }
  update(dt) {
    if (this.done || this.i < 0 || this.i >= this.steps.length) return;
    const st = this.steps[this.i], v = this.c.view;
    if (st.tick) st.tick();
    // подсветка: элемент интерфейса, клетки, монета, здание
    const sel = typeof st.hint === 'function' ? st.hint() : st.hint;
    for (const e of document.querySelectorAll('.tuthint')) if (!sel || !e.matches(sel)) e.classList.remove('tuthint');
    if (sel) for (const e of document.querySelectorAll(sel)) e.classList.add('tuthint');
    if (!st.tick) v.hint = st.bag ? { bag: true } : st.b ? { b: this.tower() } : null;
    else if (st.bag) v.hint = { bag: true };
    if (!st.btn && !st.auto) { this._st = (this._st || 0) + dt; if (this._st > 0.2) { this._st = 0; this.spot(this.target(typeof sel === 'string' ? sel : null)); } } else this.spot(null);
    if (st.auto) { this.timer -= dt; if (this.timer <= 0) { $('#tut').classList.add('hidden'); this.i = this.steps.length; this.clearHints(); return; } }
    if (st.done()) this.go(this.i + 1);
  }
}
