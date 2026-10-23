// Интерфейс боя: HUD, выдвижная панель слотов, блок выбранного здания (иконки) и окно выбора улучшения. Без поясняющих текстов — только иконки и цифры.
import * as D from './data.js?v=20261023150737';
import * as A from './art.js?v=20261023150737';
import { uiIcon } from './env.js?v=20261023150737';
import { enemyFrame, gibSprite } from './enemies.js?v=20261023150737';
import { glyphIcon, spriteIcon, iconUrl, bareGlyphUrl, PALETTE, STAT_GLYPH, SPELL_GLYPH } from './icons.js?v=20261023150737';
import { TARGET_MODES } from './sim.js?v=20261023150737';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const COIN = (n = 16) => `<img src="${uiIcon('coin', n * 2)}" alt="">`;
const pct = (v) => Math.round(v * 100) + '%';
const f1 = (v) => (Math.round(v * 10) / 10).toString();

// форматирование характеристик башен
const FMT = {
  dmg: (v) => Math.round(v), rate: f1, range: f1, splash: f1, chains: (v) => v, pierce: (v) => v, crit: pct, execute: pct, slow: pct, freeze: pct, brittle: (v) => '+' + pct(v), shatter: pct,
  poison: (v) => Math.round(v), stacks: (v) => v, plague: f1, shred: pct, orbit: (v) => v, bounce: (v) => v, stun: pct, guards: (v) => v, ghp: (v) => Math.round(v), gdmg: (v) => Math.round(v), garmor: pct, cleave: (v) => v,
  rateBuff: (v) => '+' + pct(v), dmgBuff: (v) => '+' + pct(v), mark: (v) => '+' + pct(v), cluster: (v) => v, fire: (v) => v, burn: (v) => Math.round(v), spread: (v) => v, trail: (v) => v, pull: (v) => Math.round(v),
  collapseMult: (v) => '×' + v, anchor: (v) => f1(v) + 'с', heavyMult: (v) => '×' + f1(v), armorPierce: pct,
  income: (v) => '+' + v, cap: (v) => v, bonus: (v) => '+' + v,
};
const ECON_FMT = { income: (v) => '+' + v, rate: pct, cap: (v) => v, bonus: (v) => '+' + v, range: f1 };
const SHOW_ORDER = ['dmg', 'rate', 'range', 'splash', 'burn', 'poison', 'chains', 'pierce', 'crit', 'execute', 'slow', 'freeze', 'brittle', 'shatter', 'stacks', 'plague', 'shred', 'orbit', 'bounce', 'stun', 'cluster', 'fire', 'spread', 'trail', 'pull', 'collapseMult', 'anchor', 'heavyMult', 'armorPierce', 'guards', 'ghp', 'gdmg', 'garmor', 'cleave', 'rateBuff', 'dmgBuff', 'mark'];
const BRANCH_COL = { A: '#6fd0ff', B: '#ff5a6a' };

const chip = (glyph, text, cls = '', title = '') => `<span class="ch ${cls}" ${title ? `title="${title}"` : ''}><img src="${bareGlyphUrl(glyph, 18)}" alt=""><b>${text}</b></span>`;
const fmtStat = (k, v) => (FMT[k] ? FMT[k](v) : f1(v));

// спрайт башни целиком (корпус + вращающаяся часть) — для иконок
function composite(type, lvl, br, picks) {
  const key = `cmp:${type}:${lvl}:${br || ''}:${picks ? picks.join('') : ''}`;
  return A.cached(key, () => {
    const body = A.towerFull(type, lvl, br), head = A.towerHead(type, lvl, br);
    const c = document.createElement('canvas'); c.width = body.width; c.height = body.height;
    const g = c.getContext('2d'); g.drawImage(body, 0, 0);
    if (head) g.drawImage(head, ((A.TW_W - A.HEAD) / 2) * A.S, (A.TW_AY - A.TOWER_ART[type].lift - 32) * A.S, A.HEAD * A.S, A.HEAD * A.S);
    c.lw = body.lw; c.lh = body.lh; return c;
  });
}
export const towerIcon = (type, lvl = 1, br = null, picks = null, o = {}) => {
  const prem = D.isPremium(type), bt = A.artType(type);          // премиум: своя картинка, а если её нет — базовая башня; рамка золотая с короной
  return spriteIcon(`t:${type}:${lvl}:${br || ''}:${picks ? picks.join('') : ''}:${o.k || ''}`, composite(bt, lvl, br, picks), { bg: prem ? ['#f6dc7a', '#5a3a10'] : PALETTE.tower, frame: prem ? 'arcane' : 'gold', badge: prem ? 'crown' : null, badgeCol: '#ffd24a', spriteScale: 1.4, ...o });
};
export const econIcon = (type, lvl = 3, o = {}) => spriteIcon(`e:${type}:${lvl}:${o.k || ''}`, A.econBody(type, lvl), { bg: PALETTE.econ, spriteScale: 1.4, ...o });

const STAT_LABEL = { dmg: 'Урон', rate: 'Скорострельность', range: 'Дальность', splash: 'Радиус взрыва', burn: 'Горение', poison: 'Яд', chains: 'Прыжков молнии', pierce: 'Пробивает целей', crit: 'Шанс крита', execute: 'Казнь раненых', slow: 'Замедление', freeze: 'Шанс заморозки', brittle: 'Уязвимость ко льду', shatter: 'Осколки льда', stacks: 'Слоёв яда', plague: 'Радиус чумы', shred: 'Снятие брони', orbit: 'Лезвий вокруг', bounce: 'Рикошетов', stun: 'Шанс оглушения', cluster: 'Бомб в кассете', fire: 'Огонь', spread: 'Заражение огнём', trail: 'Огонь за целью', pull: 'Отбрасывание', collapseMult: 'Мощь схлопывания', anchor: 'Пригвождение', heavyMult: 'Урон по тяжёлым', armorPierce: 'Пробитие брони', guards: 'Солдат', ghp: 'Здоровье солдат', gdmg: 'Урон солдат', garmor: 'Броня солдат', cleave: 'Задевает целей', rateBuff: 'Скорость союзников', dmgBuff: 'Урон союзников', mark: 'Метка на врагах', income: 'Золото с монеты', cap: 'Потолок монеты', bonus: 'Золото за убийство' };
const UNIT = { rate: ' /с', range: ' кл.', splash: ' кл.', plague: ' кл.' };
const NO_PCT = ['crit', 'execute', 'slow', 'freeze', 'brittle', 'shatter', 'armorPierce', 'stun', 'garmor', 'rateBuff', 'dmgBuff', 'mark'];
const PICK_NAME = { power: 'Мощь', speed: 'Скорость', special: 'Особое' };
const MODE_TXT = ['1-й', 'Пос', 'Сил', 'Бли'];

// характеристики первого уровня башни/здания чипами (для карточек подготовки и подсказки)
export function itemChips(type) {
  if (D.TOWERS[type]) {
    const t = D.TOWERS[type], st = D.towerStats(type, 1, null, [0, 0]);
    return SHOW_ORDER.filter((k) => st[k] !== undefined).slice(0, 5).map((k) => chip(STAT_GLYPH[k] || 'dmg', fmtStat(k, st[k]))).join('') + (t.air ? chip('wing', '') : '');
  }
  const l1 = D.ECON[type].lv[0];
  if (type === 'mine') return chip('coins', '+' + l1.income) + chip('hourglass', D.COIN_PERIOD + 'с', 'dim');
  if (type === 'bank') return chip('coins', pct(l1.rate)) + chip('chart', l1.cap);
  return chip('coins', '+' + l1.bonus) + chip('range', l1.range);
}

export class GameUI {
  constructor(ctrl) {
    this.c = ctrl; this.view = ctrl.view;
    this.cardSel = null; this.cards = []; this.loadout = []; this.open = false;
    this.last = {}; this.selB = null; this.upB = null; this.icons = new Map();
    for (const img of document.querySelectorAll('#game img[data-icon]')) img.src = ['tower', 'coins', 'horde', 'meteor', 'star'].includes(img.dataset.icon) ? bareGlyphUrl(img.dataset.icon, 22) : uiIcon(img.dataset.icon, 40);
    $('#chip-time .hg').src = bareGlyphUrl('hourglass', 22);
    $('#slotbtn .sb-ic').src = bareGlyphUrl('tower', 34);
    $('#um-cards').parentNode.querySelector('.cg').src = uiIcon('coin', 32); $('#sellmodal .cg').src = uiIcon('coin', 32);
    $('#slotbtn').onclick = () => { this.c.sfx.play('click'); if (this.cardSel) { this.disarm(); this.refreshCards(); } else this.setOpen(!this.open); };
    $('#um-cancel').onclick = () => { this.c.sfx.play('click'); this.closeUpgrade(); };
    $('#upmodal').addEventListener('pointerdown', (e) => { if (e.target.id === 'upmodal') { this.c.sfx.play('click'); this.closeUpgrade(); } });
  }
  get sim() { return this.c.sim; }

  attachSim(sim, loadout) {
    this.last = {}; this.closeSell(); this.closeUpgrade(true); this.deselect(); this.disarm(); this.view.spell = null; this.setOpen(false);
    this.loadout = loadout; this.buildCards(); this.buildWaveCalls();
    sim.on('build', () => { this.refreshCards(); });
    sim.on('sell', () => this.refreshCards());
    sim.on('upgrade', (b) => { this.refreshCards(); if (this.selB === b) this.showSel(b); });
    sim.on('wave', () => { this.refreshCards(); });
    sim.on('leak', () => { this.pulse($('#chip-lives'), 'hurt'); });
    sim.on('tick', () => this.pulse($('#chip-gold'), 'bump'));
  }
  pulse(e, cls) { e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls); }
  // ошибка без текста: звук, вибрация, встряска
  fail(r, target) {
    this.c.sfx.play('error');
    const t = target || (r === 'gold' ? $('#chip-gold') : null);
    if (t) this.pulse(t, 'shake');
    if (r === 'gold') this.pulse($('#chip-gold'), 'hurt');
  }

  // ───── слоты: выдвижная панель ─────
  setOpen(on) {
    this.open = on; $('#dock').classList.toggle('open', on);
    if (on) this.deselect();
    this.c.onDrawer && this.c.onDrawer(on);
  }
  defs() {
    const T = D.TOWERS, E = D.ECON;
    return this.loadout.map((t) => T[t] ? { id: t, build: 'tower', type: t, name: T[t].name, icon: iconUrl(towerIcon(t, 1, null, null)) } : { id: t, build: 'econ', type: t, name: E[t].name, icon: iconUrl(econIcon(t, 3)) });
  }
  buildCards() {
    const box = $('#slots'); box.innerHTML = ''; this.cards = [];
    box.style.setProperty('--n', Math.max(1, this.loadout.length));
    for (const d of this.defs()) {
      const e = el('button', 'card'); e.dataset.type = d.type;
      e.innerHTML = `<img class="ci" src="${d.icon}" alt=""><div class="cn">${d.name}</div><div class="cc">${COIN()}<span></span></div><div class="cs"></div>`;
      const card = { d, e, cost: e.querySelector('.cc span'), cs: e.querySelector('.cs') };
      e.onclick = () => this.onCard(card);
      box.appendChild(e); this.cards.push(card);
    }
    this.cardSel = null; this.hideInfo(); this.refreshCards();
  }
  hideInfo() { $('#dinfo').classList.add('hidden'); this._ik = null; }
  // числа карточки: цена, сколько построено и характеристики первого уровня
  cardInfo(card) {
    const s = this.sim, d = card.d; let cost = 0, cs = '', locked = false, chips = '';
    if (d.build === 'tower') {
      const t = D.TOWERS[d.type], st = D.towerStats(d.type, 1, null, [0, 0]); cost = t.cost;
      const keys = SHOW_ORDER.filter((k) => st[k] !== undefined).slice(0, 5);
      chips = keys.map((k) => chip(STAT_GLYPH[k] || 'dmg', fmtStat(k, st[k]))).join('') + (t.air ? chip('wing', '') : '');
    } else {
      const n = s.countOf('econ', d.type), max = D.ECON[d.type].max, lim = s.limits && s.limits[d.type] != null ? s.limits[d.type] : max; cost = s.buildCost('econ', d.type); locked = n >= Math.min(max, lim); cs = `${n}/${Math.min(max, lim)}`;
      const l1 = D.ECON[d.type].lv[0];
      if (d.type === 'mine') chips = chip('coins', '+' + l1.income) + chip('hourglass', D.COIN_PERIOD + 'с', 'dim');
      else if (d.type === 'bank') chips = chip('coins', pct(l1.rate)) + chip('chart', l1.cap) + chip('coins', '+' + Math.min(l1.cap, Math.floor(s.gold * l1.rate)), 'pos');
      else chips = chip('coins', '+' + l1.bonus) + chip('range', l1.range);
    }
    if (d.build === 'tower' && s.limits && s.limits[d.type] != null) { const n = s.countOf('tower', d.type); cs = `${n}/${s.limits[d.type]}`; locked = n >= s.limits[d.type]; }
    return { cost, cs, locked, chips };
  }
  refreshCards() {
    const s = this.sim; if (!s) return;
    let armed = null;
    for (const c of this.cards) {
      const i = this.cardInfo(c);
      c.e.classList.toggle('poor', s.gold < i.cost);
      c.e.classList.toggle('locked', i.locked);
      c.e.classList.toggle('on', this.cardSel === c.d.id);
      c.cost.textContent = i.cost; c.cs.textContent = i.cs;
      if (this.cardSel === c.d.id) { armed = c; this.showInfo(i, c); }
    }
    const b = $('#slotbtn'); b.classList.toggle('armed', !!armed);
    const ic = armed ? armed.d.icon : bareGlyphUrl('tower', 34), im = $('#slotbtn .sb-ic');
    if (this._ic !== ic) { this._ic = ic; im.src = ic; }                       // не трогаем src зря: иначе браузер заново декодирует картинку
    $('#slotbtn .sb-n').textContent = armed ? this.cardInfo(armed).cost : '';
    b.classList.toggle('poor', !!armed && s.gold < this.cardInfo(armed).cost);
  }
  showInfo(i, card) { const e = $('#dinfo'), k = card.d.id; e.classList.remove('hidden'); if (this._ik !== k) { this._ik = k; e.innerHTML = `<b>${card.d.name}</b><span class="dch">${i.chips}</span>`; } }
  onCard(card) {
    const d = card.d, on = this.cardSel === d.id;
    this.c.sfx.play('select');
    this.deselect();
    if (on) { this.disarm(); this.refreshCards(); return; }
    if (this.cardInfo(card).locked) { this.fail('limit', card.e); return; }
    this.cardSel = d.id; this.view.armed = { kind: d.build, type: d.type }; this.view.pending = null;
    this.setOpen(false); this.refreshCards();
    this.c.onArm && this.c.onArm(d);
  }
  disarm() { this.view.armed = null; this.view.hover = null; this.view.pending = null; this.cardSel = null; for (const c of this.cards) c.e.classList.remove('on'); this.hideInfo(); const b = $('#slotbtn'); if (b) { b.classList.remove('armed', 'poor'); this._ic = bareGlyphUrl('tower', 34); $('#slotbtn .sb-ic').src = this._ic; $('#slotbtn .sb-n').textContent = ''; } }

  // ───── блок выбранного здания: по центру внизу, только иконки ─────
  select(b) { this.disarm(); this.setOpen(false); this.view.spell = null; this.selB = b; this.view.selected = b; this.sellArm = 0; this.showSel(b); this.c.renderer && this.c.renderer.reveal(b.x, b.y - 20); this.c.onSelect && this.c.onSelect(b); }
  deselect() { this.selB = null; this.view.selected = null; $('#sel').classList.add('hidden'); $('#dock').classList.remove('hide'); }
  statChips(b, max = 6) {
    const st = b.st;
    if (b.kind === 'econ') { const out = []; for (const k of ['income', 'rate', 'cap', 'bonus', 'range']) if (st[k] !== undefined) out.push(chip(STAT_GLYPH[k] || 'coins', ECON_FMT[k](st[k]))); if (b.type === 'bank') out.push(chip('coins', '+' + Math.min(st.cap, Math.floor(this.sim.gold * st.rate)), 'pos')); return out.join(''); }
    const out = [];
    for (const k of SHOW_ORDER) {
      if (st[k] === undefined || out.length >= max) continue;
      if (k === 'rate' && (b.type === 'banner' || b.type === 'barracks')) continue;
      let v = st[k]; const buffed = (k === 'dmg' && b.dmgMult > 1) || (k === 'rate' && b.rateMult > 1);
      if (k === 'dmg' && b.dmgMult > 1) v = st.dmg * b.dmgMult; if (k === 'rate' && b.rateMult > 1) v = st.rate * b.rateMult;
      out.push(chip(STAT_GLYPH[k] || 'dmg', fmtStat(k, v), buffed ? 'pos' : '', k));
    }
    out.push(chip('skull', b.kills, 'dim'));
    return out.join('');
  }
  pipColors(b) {
    if (b.kind === 'econ') return [1, 2, 3, 4, 5].map(() => '#8fe36a');
    const pk = A.PICK_COLORS;
    return ['#ffd24a', pk[b.picks[0]] || '#ffd24a', pk[b.picks[1]] || '#ffd24a', BRANCH_COL[b.branch] || '#ffd24a', BRANCH_COL[b.branch] || '#ffd24a'];
  }
  upIconFor(b, o) {
    if (b.kind === 'econ') return iconUrl(econIcon(b.type, o.level, { k: 'up', badge: 'arrowup', badgeCol: '#4ad63a' }));
    const kind = o.kind;
    const spec = kind === 'pick' ? { bg: PALETTE[o.id], frame: { power: 'blood', speed: 'gold', special: 'nature' }[o.id], badge: D.PICK_STYLE[o.id].icon, badgeCol: D.PICK_STYLE[o.id].color }
      : kind === 'branch' ? { bg: PALETTE[o.branch], frame: o.branch === 'A' ? 'ice' : 'blood', badge: 'fork', badgeCol: BRANCH_COL[o.branch] }
        : { bg: PALETTE.final, frame: 'arcane', badge: 'star', badgeCol: '#ffd24a' };
    return iconUrl(towerIcon(b.type, o.level, o.branch, o.picks, { k: 'up' + o.id, size: 96, ...spec }));
  }
  optColor(o) { return o.kind === 'pick' ? D.PICK_STYLE[o.id].color : o.kind === 'branch' ? BRANCH_COL[o.branch] : o.kind === 'final' ? '#ffd24a' : '#8fe36a'; }
  deltaChips(b, o, n = 4) {
    const out = [];
    if (b.kind === 'econ') { for (const d of o.delta.slice(0, n)) out.push(chip(STAT_GLYPH[d.k] || 'coins', `${ECON_FMT[d.k] ? ECON_FMT[d.k](d.from) : d.from}→${ECON_FMT[d.k] ? ECON_FMT[d.k](d.to) : d.to}`, 'pos', d.k)); return out.join(''); }
    const ds = o.delta.filter((d) => SHOW_ORDER.includes(d.k)).sort((a, c) => SHOW_ORDER.indexOf(a.k) - SHOW_ORDER.indexOf(c.k));
    for (const d of ds.slice(0, n)) out.push(chip(STAT_GLYPH[d.k] || 'dmg', `${fmtStat(d.k, d.from)}→${fmtStat(d.k, d.to)}`, 'pos', d.k));
    return out.join('');
  }
  showSel(b) {
    const s = this.sim, isT = b.kind === 'tower', def = isT ? D.TOWERS[b.prem || b.type] : D.ECON[b.type];
    const box = $('#sel'); box.classList.remove('hidden'); box.innerHTML = ''; $('#dock').classList.add('hide');
    const icon = iconUrl(isT ? towerIcon(b.prem || b.type, b.level, b.branch, b.picks, { k: 'sel' }) : econIcon(b.type, b.level, { k: 'sel' }));
    const pips = this.pipColors(b).map((c, i) => `<i class="${i < b.level ? 'on' : ''}" style="--c:${c}"></i>`).join('');
    box.appendChild(el('div', 'shead', `<img class="ic" src="${icon}" alt=""><div class="title">${isT && b.branch ? def.branches[b.branch].name : def.name}<small><span class="pipsl">${pips}</span></small></div>`));
    box.appendChild(el('div', 'sstats', this.statChips(b, 5)));
    const acts = el('div', 'sacts');
    // улучшение — только значок (цена видна в окне выбора); открывает окно, игра ставится на паузу
    const opts = s.upgradeOptions(b);
    const up = el('button', 'abtn up' + (opts.length ? '' : ' max'), `<img class="ai" src="${iconUrl(glyphIcon(opts.length ? 'arrowup' : 'star', { size: 64, bg: opts.length ? PALETTE.special : PALETTE.final, frame: opts.length ? 'nature' : 'gold' }))}" alt="">`);
    if (opts.length) up.onclick = () => { this.c.sfx.play('select'); this.openUpgrade(b); };
    this.upBtn = up; this.upCost = opts.length ? Math.min(...opts.map((o) => o.cost)) : null;
    acts.appendChild(up);
    // продажа: значок здания с мешочком золота сверху; по нажатию — вопрос «продать?»
    const sell = el('button', 'abtn sell', `<img class="ai" src="${icon}" alt=""><img class="bag" src="${new URL('../img/icons/bag_gold.webp', import.meta.url).href}" alt="">`);
    sell.onclick = () => { this.c.sfx.play('select'); this.askSell(b, icon); };
    acts.appendChild(sell);
    const x = el('button', 'sx', '✕'); x.onclick = () => { this.c.sfx.play('click'); this.deselect(); }; box.appendChild(x);
    box.appendChild(acts);
    this.placeSel(b);
    this.updateSel();
  }
  // блок всегда внизу по центру
  placeSel() {}
  updateSel() {
    if (!this.selB) return;
    const g = this.sim.gold;
    if (this.upBtn && this.upCost != null) this.upBtn.classList.toggle('poor', g < this.upCost);
  }
  tickSel() {
    const b = this.selB; const key = `${b.level}|${b.rateMult.toFixed(2)}|${b.dmgMult.toFixed(2)}|${b.kills}|${b.type === 'bank' ? Math.min(b.st.cap, Math.floor(this.sim.gold * b.st.rate)) : 0}`;
    if (this._sk !== key) { this._sk = key; return true; }
    return false;
  }

  // подтверждение продажи: маленькое окно по центру, игра на паузе
  askSell(b, icon) {
    const s = this.sim, v = s.sellValue(b), box = $('#sellmodal');
    $('#sm-ic').src = icon; $('#sm-v').textContent = v; box.classList.remove('hidden'); this.c.hold(true); this.sellB = b;
    $('#sm-yes').onclick = () => { this.closeSell(); if (s.buildings.includes(b)) { s.sell(b); this.c.sfx.play('upgrade'); } this.deselect(); this.refreshCards(); };
    $('#sm-no').onclick = () => { this.c.sfx.play('click'); this.closeSell(); };
  }
  closeSell() { if (!this.sellB) return; this.sellB = null; $('#sellmodal').classList.add('hidden'); this.c.hold(false); }

  // ───── окно улучшения: пауза, размытый фон, до двух табличек ─────
  // подписи характеристик в окне улучшения: что именно меняется и на сколько
  statLine(b, d) {
    const L = STAT_LABEL[d.k]; if (!L) return '';
    const econ = b.kind === 'econ', fm = econ ? (ECON_FMT[d.k] || f1) : (FMT[d.k] || f1), u = UNIT[d.k] || '';
    const raw = (v) => (econ && d.k === 'income' ? '+' + v : fm(v)) + u;
    const label = econ && d.k === 'rate' ? 'Процент с золота' : L;
    const pct = !NO_PCT.includes(d.k) && d.from > 0 ? Math.round(((d.to - d.from) / d.from) * 100) : null;
    return `<div class="dr"><img src="${bareGlyphUrl(STAT_GLYPH[d.k] || 'dmg', 20)}" alt=""><div class="dc"><span class="dl">${label}</span><span class="dv"><s>${raw(d.from)}</s><i>→</i><b>${raw(d.to)}</b>${pct ? `<em>${pct > 0 ? '+' : ''}${pct}%</em>` : ''}</span></div></div>`;
  }
  openUpgrade(b) {
    const s = this.sim, opts = s.upgradeOptions(b); if (!opts.length) return;
    this.upB = b; this.c.hold(true);
    const isT = b.kind === 'tower', def = isT ? D.TOWERS[b.prem || b.type] : D.ECON[b.type];
    $('#um-name').textContent = isT && b.branch ? def.branches[b.branch].name : def.name;
    const first = opts[0], pick = first.kind === 'pick' || first.kind === 'branch';
    $('#um-sub').textContent = `Уровень ${b.level} → ${b.level + 1}${opts.length > 1 ? ` · ${first.kind === 'branch' ? 'выбери путь' : 'выбери одно'}` : ''}`;
    const box = $('#um-cards'); box.innerHTML = ''; box.dataset.n = opts.length;
    for (const o of opts) {
      const col = this.optColor(o);
      const tag = o.kind === 'pick' ? PICK_NAME[o.id] : o.kind === 'branch' ? 'Путь ' + o.branch : o.kind === 'final' ? 'Вершина ветки' : 'Уровень ' + o.level;
      const rows = o.delta.filter((d) => STAT_LABEL[d.k]).sort((a, c) => (SHOW_ORDER.indexOf(a.k) + 99 * (SHOW_ORDER.indexOf(a.k) < 0)) - (SHOW_ORDER.indexOf(c.k) + 99 * (SHOW_ORDER.indexOf(c.k) < 0))).slice(0, 6).map((d) => this.statLine(b, d)).join('');
      const card = el('div', 'umc', `<div class="ut">${tag}</div><img class="uicon" src="${this.upIconFor(b, o)}" alt=""><div class="un">${o.name}</div>${o.desc ? `<div class="udesc">${o.desc}</div>` : ''}<div class="udelta">${rows || '<div class="dnone">Улучшение открывает следующий уровень</div>'}</div><button class="umbuy"><span class="bt">Улучшить за</span><span class="bp">${COIN(18)}${o.cost}</span></button>`);
      card.style.setProperty('--c', col); card.dataset.choice = o.choice; card.dataset.cost = o.cost;
      const buy = card.querySelector('.umbuy');
      buy.onclick = () => {
        const r = s.upgrade(b, o.choice);
        if (typeof r !== 'object') { this.fail(r, buy); return; }
        this.c.sfx.play('upgrade'); this.closeUpgrade();
        this.c.onUpgrade && this.c.onUpgrade(b, o);
      };
      box.appendChild(card);
    }
    $('#upmodal').classList.remove('hidden'); this.updateModal();
    this.c.onModal && this.c.onModal(true);
  }
  updateModal() {
    if (!this.upB) return; const g = Math.floor(this.sim.gold); $('#um-gold').textContent = g;
    for (const c of document.querySelectorAll('#um-cards .umc')) {
      const cost = +c.dataset.cost, poor = g < cost; c.classList.toggle('poor', poor);
      const bt = c.querySelector('.umbuy .bt'), txt = poor ? `Не хватает ${cost - g}` : 'Улучшить за';
      if (bt.textContent !== txt) bt.textContent = txt;
    }
  }
  closeUpgrade(quiet) {
    if (!this.upB && quiet) { $('#upmodal').classList.add('hidden'); return; }
    this.upB = null; $('#upmodal').classList.add('hidden'); this.c.hold(false);
    if (!quiet && this.c.onModal) this.c.onModal(false);
  }

  // ───── кнопка вызова волны: справа сверху, круглая каменная кнопка с портретом и кольцом таймера ─────
  buildWaveCalls() {
    const e = $('#wcall'); this.wcall = e;
    e.onclick = () => { this.sim.callWave(); };
    this.last.wmax = 0; this.last.wk = null;
  }
  updateWaveCalls(can) {
    const s = this.sim, L = this.last, e = this.wcall; if (!e) return;
    e.classList.toggle('hidden', !can);
    if (!can) { L.wmax = 0; L.wk = null; return; }
    if (L.wwave !== s.wave) { L.wwave = s.wave; L.wmax = 0; }
    L.wmax = Math.max(L.wmax || 0, s.nextWaveT, 1);
    const n = s.wave + 1, boss = false, bonus = s.waveBonus(), p = Math.round(Math.max(0, Math.min(1, 1 - s.nextWaveT / L.wmax)) * 100);
    const key = `${n}|${boss}|${bonus}`;
    if (L.wk !== key) {
      L.wk = key; e.classList.toggle('boss', boss);
      e.querySelector('.wic').src = new URL(boss ? '../img/icons/horns.webp' : '../img/icons/skull.webp', import.meta.url).href;
      e.querySelector('.wn').textContent = n;
      const wb = e.querySelector('.wb'); wb.style.display = bonus ? '' : 'none'; wb.innerHTML = `<img src="${uiIcon('coin', 28)}" alt="">+${bonus}`;
    }
    if (L.wp !== p) { L.wp = p; e.style.setProperty('--p', p); }
  }

  // ───── HUD ─────
  enemyIcon(type) {
    let u = this.icons.get(type);
    if (!u) { const f = enemyFrame(type, 0); const c = document.createElement('canvas'); c.width = 56; c.height = 56; const g = c.getContext('2d'); const k = Math.min(52 / f.width, 52 / f.height); g.drawImage(f, 28 - (f.width * k) / 2, 28 - (f.height * k) / 2, f.width * k, f.height * k); u = c.toDataURL(); this.icons.set(type, u); }
    return u;
  }
  update(dt) {
    const s = this.sim; if (!s) return;
    const L = this.last;
    const set = (key, id, val, fn) => { if (L[key] !== val) { L[key] = val; (fn || ((v) => { $(id).textContent = v; }))(val); } };
    set('lives', '#v-lives', s.lives); set('gold', '#v-gold', Math.floor(s.gold));
    set('inc', '#v-inc', s.incomePerTick(), (v) => { $('#v-inc').textContent = v ? '+' + v : ''; });
    set('wave', '#v-wave', `${s.wave}/${s.total}`);
    const can = s.canCallWave() && !s.hold;
    this.updateWaveCalls(can);
    L.cardT = (L.cardT || 0) - dt;
    if (L.cardT <= 0) {
      L.cardT = 0.2; this.refreshCards(); this.updateSel(); this.updateModal();
      if (this.selB && !this.sim.buildings.includes(this.selB)) this.deselect(); else if (this.selB && this.tickSel()) this.showSel(this.selB);
    }
    this.c.sfx.setTension(Math.min(1, s.enemies.length / 40));
  }
}
