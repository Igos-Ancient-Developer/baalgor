// Сундуки (лутбоксы): три вида, шансы выпадения, бросок и анимация открытия.
// Деревянный: за души или за немного кристаллов, в основном души. Серебряный: только за кристаллы, в основном кристаллы.
// Золотой: самый дорогой, лучшая добыча, редкие премиум-башни. Для кристаллов бросок делает сервер (supabase/chests.sql, функция chest_open) —
// ровно по этим же таблицам; здесь бросок нужен для оплаты душами (души хранятся в сохранении) и для локального режима вне Telegram.
import * as D from './data.js?v=20261028174922';
import * as M from './meta.js?v=20261028174922';
import { Net } from './net.js?v=20261028174922';
import { Wallet } from './wallet.js?v=20261028174922';
import { gemIc } from './res.js?v=20261028174922';
import { towerIcon, econIcon } from './ui.js?v=20261028174922';
import { iconUrl, bareGlyphUrl } from './icons.js?v=20261028174922';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// пулы закрытых зданий: обычные, средние и премиум (редкие башни, которые иначе покупаются только за кристаллы)
export const POOLS = {
  common: { list: ['frost', 'toxic', 'mortar', 'flame', 'banner', 'saw'] },
  mid: { list: ['harpoon', 'tesla', 'voidwell', 'bank', 'altar', 'magnet', 'grinder'] },
  prem: { list: ['gold_bolt', 'storm_tesla', 'hell_flame'], weight: { gold_bolt: 5, storm_tesla: 3, hell_flame: 2 } },
};
// w — вес записи (сумма 100 = проценты). t: souls | gems | unlock. gemsOnly — запись только при оплате кристаллами (при оплате душами её заменяют души)
export const CHESTS = {
  wood: {
    name: 'Деревянный сундук', souls: 250, gems: 25, theme: 'wood', color: '#c98a46',
    table: [
      { w: 60, t: 'souls', min: 90, max: 175 }, { w: 10, t: 'souls', min: 40, max: 89 },
      { w: 24, t: 'unlock', pool: 'common' }, { w: 6, t: 'gems', min: 2, max: 6, gemsOnly: true },
    ],
  },
  silver: {
    name: 'Серебряный сундук', gems: 65, theme: 'silver', color: '#a9cdee',
    table: [
      { w: 58, t: 'gems', min: 23, max: 57 }, { w: 4, t: 'gems', min: 90, max: 140 },
      { w: 20, t: 'unlock', pool: 'mid' }, { w: 8, t: 'unlock', pool: 'common' }, { w: 10, t: 'souls', min: 300, max: 650 },
    ],
  },
  gold: {
    name: 'Золотой сундук', gems: 180, theme: 'gold', color: '#ffd24a',
    table: [
      { w: 46, t: 'gems', min: 70, max: 180 }, { w: 5, t: 'gems', min: 120, max: 220 }, { w: 3, t: 'gems', min: 250, max: 400 },
      { w: 24, t: 'unlock', pool: 'mid' }, { w: 10, t: 'unlock', pool: 'prem' }, { w: 12, t: 'souls', min: 900, max: 1800 },
    ],
  },
};
export const CHEST_ORDER = ['wood', 'silver', 'gold'];

const rint = (a, b, rnd) => a + Math.floor(rnd() * (b - a + 1));
const have = (save, id) => (D.isPremium(id) ? !!save.unlocked[id] : M.itemUnlocked(save, id));

// кто из пула ещё не открыт (с весами); пусто — всё уже есть
function freeIn(poolId, save) {
  const p = POOLS[poolId]; return p.list.filter((id) => !have(save, id)).map((id) => [id, (p.weight && p.weight[id]) || 1]);
}
// повтор: если всё из пула уже открыто, выдаётся компенсация (деревянный — души, остальные — кристаллы, 40% цены здания)
function dupLoot(kind, id) {
  if (kind === 'wood') return { t: 'souls', n: 120, dup: id };
  const u = D.unlockOf(id); return { t: 'gems', n: Math.max(5, Math.round(((u && u.gems) || 20) * 0.4)), dup: id };
}
// бросок. pay: 'souls' | 'gems'. rnd — Math.random или детерминированный для тестов
export function rollChest(kind, pay, save, rnd = Math.random) {
  const c = CHESTS[kind], rows = c.table.map((r) => (r.gemsOnly && pay === 'souls' ? { w: r.w, t: 'souls', min: 40, max: 89 } : r));
  let x = rnd() * rows.reduce((s, r) => s + r.w, 0), row = rows[rows.length - 1];
  for (const r of rows) { if ((x -= r.w) < 0) { row = r; break; } }
  if (row.t === 'unlock') {
    const free = freeIn(row.pool, save);
    if (!free.length) { const any = POOLS[row.pool].list[0]; return dupLoot(kind, any); }
    let y = rnd() * free.reduce((s, f) => s + f[1], 0), id = free[free.length - 1][0];
    for (const [fid, fw] of free) { if ((y -= fw) < 0) { id = fid; break; } }
    return { t: 'unlock', id, pool: row.pool };
  }
  return { t: row.t, n: rint(row.min, row.max, rnd), tier: row.max >= 250 && row.t === 'gems' ? 'big' : '' };
}
// шансы для показа игроку: список строк «что — сколько процентов»
export function oddsOf(kind) {
  const c = CHESTS[kind], out = [];
  for (const r of c.table) {
    const label = r.t === 'souls' ? `${fmt(r.min)}–${fmt(r.max)} душ` : r.t === 'gems' ? `${fmt(r.min)}–${fmt(r.max)} кристаллов` : r.pool === 'prem' ? 'Премиум-башня' : r.pool === 'mid' ? 'Здание: средней редкости' : 'Здание: обычное';
    out.push([label, r.w, r.t === 'unlock' ? (r.pool === 'prem' ? 'l' : r.pool === 'mid' ? 'r' : 'u') : (r.t === 'gems' && r.max >= 250) ? 'e' : r.t === 'gems' ? 'r' : 'c']);
  }
  return out;
}

// ───── применить добычу к сохранению (души — всегда на клиенте; кристаллы и здания уже записал сервер, если платили кристаллами онлайн) ─────
export function applyLoot(save, loot, { server = false } = {}) {
  if (loot.t === 'souls') save.souls = (save.souls || 0) + loot.n;
  else if (loot.t === 'gems') { if (!server) save.gems = (save.gems || 0) + loot.n; }
  else if (loot.t === 'unlock') { if (!server || !D.isPremium(loot.id)) save.unlocked[loot.id] = 1; }
}

// ───── значки добычи ─────
const lootIcon = (l, size = 72) => {
  if (l.t === 'souls') return `<img src="${bareGlyphUrl('soul', size)}" alt="">`;
  if (l.t === 'gems') return gemIc(Math.round(size * 0.9));
  const prem = D.isPremium(l.id), src = D.ECON[l.id] ? econIcon(l.id, 3) : towerIcon(l.id, 1, null, null, { k: 'shop', size: 96 });
  return `<img src="${iconUrl(src)}" alt="" ${prem ? 'class="prem"' : ''}>`;
};
const lootName = (l) => (l.t === 'souls' ? `+${fmt(l.n)} душ` : l.t === 'gems' ? `+${fmt(l.n)} кристаллов` : (D.TOWERS[l.id] || D.ECON[l.id]).name);
const lootSub = (l) => (l.dup ? `У тебя уже есть «${(D.TOWERS[l.dup] || D.ECON[l.dup]).name}», вместо него — компенсация` : l.t === 'unlock' ? (D.isPremium(l.id) ? 'Премиум-башня, навсегда' : 'Новое здание, навсегда') : l.t === 'gems' ? 'Кристаллы на счёт' : 'Души в Кузницу');
const rarOf = (l, kind) => {
  if (l.t === 'unlock') return l.pool === 'prem' ? 'l' : l.pool === 'mid' ? 'r' : 'u';
  if (l.dup) return 'u';
  if (l.t === 'gems') return l.n >= 250 ? 'e' : l.n >= 90 ? 'r' : 'u';
  return l.n >= 800 ? 'e' : l.n >= 300 ? 'r' : l.n >= 90 ? 'u' : 'c';
};
const RARNAME = { c: 'Обычное', u: 'Необычное', r: 'Редкое', e: 'Эпическое', l: 'Легендарное' };

// карточка для ленты (случайные «призраки» из таблицы этого сундука)
function filler(kind, save, rnd) {
  return rollChest(kind, 'gems', { unlocked: {} }, rnd);       // для ленты берём любые здания, не глядя на то, что уже открыто
}

// ───── окно открытия ─────
export function chestHtml(theme) {
  return `<div class="cx ${theme}"><div class="cx-glow"></div><div class="cx-body"><i class="b1"></i><i class="b2"></i><i class="b3"></i><span class="cx-lock"></span></div><div class="cx-lid"><i class="b1"></i><i class="b2"></i></div><div class="cx-inside"></div></div>`;
}
export async function playOpening(kind, loot, ctrl, { again = null } = {}) {
  const c = CHESTS[kind], sfx = ctrl.sfx, rnd = Math.random;
  const root = el('div', 'cfx'); root.id = 'cfx';
  root.innerHTML = `<div class="cfx-rays"></div><div class="cfx-title">${c.name}</div><div class="cfx-stage">${chestHtml(c.theme)}</div>
    <div class="cfx-reel"><div class="cfx-mark"></div><div class="cfx-strip"></div></div><div class="cfx-result"></div><div class="cfx-actions"></div><div class="cfx-sparks"></div>`;
  $('#app').appendChild(root);
  const chest = root.querySelector('.cx'), strip = root.querySelector('.cfx-strip'), reel = root.querySelector('.cfx-reel'), res = root.querySelector('.cfx-result'), acts = root.querySelector('.cfx-actions'), sparks = root.querySelector('.cfx-sparks');
  let skipped = false; root.onclick = (e) => { if (e.target === root || e.target.closest('.cfx-stage')) skipped = true; };
  const wait = async (ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms && !skipped) await sleep(40); };
  // 1. сундук трясётся и накаляется
  requestAnimationFrame(() => root.classList.add('in')); sfx.play('select');
  await wait(500); chest.classList.add('shake'); sfx.play('upgrade'); await wait(1250);
  // 2. крышка открывается, вспышка и искры
  chest.classList.remove('shake'); chest.classList.add('open'); root.classList.add('burst'); sfx.play('win');
  for (let i = 0; i < 26; i++) { const s = el('i'); const a = (i / 26) * Math.PI * 2 + Math.random() * 0.4, d = 90 + Math.random() * 130; s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d * 0.8 - 40 + 'px'); s.style.setProperty('--c', ['#ffe27a', '#fff', c.color][i % 3]); s.style.animationDelay = Math.random() * 0.15 + 's'; sparks.appendChild(s); }
  await wait(650);
  // 3. лента предметов: быстро прокручивается и замедляется на выпавшем
  const N = 38, WIN = 31, CW = 86, GAP = 8, items = [];
  for (let i = 0; i < N; i++) items.push(i === WIN ? loot : filler(kind, {}, rnd));
  strip.innerHTML = items.map((l) => `<div class="cc r-${rarOf(l)}">${lootIcon(l, 56)}<small>${l.t === 'unlock' ? (D.TOWERS[l.id] || D.ECON[l.id]).name : l.t === 'souls' ? fmt(l.n) : fmt(l.n)}</small></div>`).join('');
  reel.classList.add('show'); chest.classList.add('away');
  await sleep(30);
  const w = reel.clientWidth, target = -(WIN * (CW + GAP) + CW / 2 - w / 2) + (Math.random() - 0.5) * (CW * 0.6);
  strip.style.transform = 'translateX(0px)'; void strip.offsetWidth;
  strip.style.transition = 'transform 4.6s cubic-bezier(.08,.62,.12,1)'; strip.style.transform = `translateX(${target}px)`;
  let last = 0; const t0 = performance.now();
  while (performance.now() - t0 < 4700 && !skipped) {
    const m = new DOMMatrix(getComputedStyle(strip).transform), idx = Math.floor((-m.m41 + w / 2) / (CW + GAP));
    if (idx !== last) { last = idx; sfx.play('click', 0.35); }
    await sleep(30);
  }
  if (skipped) { strip.style.transition = 'none'; strip.style.transform = `translateX(${target}px)`; }
  // 4. выпавшее
  const rar = rarOf(loot, kind);
  reel.classList.add('done'); root.classList.add('got', 'r-' + rar);
  res.innerHTML = `<div class="cfx-card r-${rar}"><div class="cfx-ic">${lootIcon(loot, 96)}</div><b>${lootName(loot)}</b><small>${RARNAME[rar]}</small><em>${lootSub(loot)}</em></div>`;
  res.classList.add('show'); sfx.play(rar === 'l' || rar === 'e' ? 'win' : 'upgrade');
  await sleep(250);
  return new Promise((done) => {
    const close = (reroll) => { root.classList.add('out'); setTimeout(() => { root.remove(); done(reroll); }, 220); };
    const ok = el('button', 'btn big', 'Забрать'); ok.onclick = () => { sfx.play('click'); close(false); }; acts.appendChild(ok);
    if (again) { const ag = el('button', 'btn ghost', again.label); ag.onclick = () => { sfx.play('click'); close(true); }; acts.appendChild(ag); }
  });
}

// ───── покупка: души (бросок на клиенте) или кристаллы (бросок на сервере; вне Telegram — локально для разработки) ─────
export async function buyChest(save, kind, pay) {
  const c = CHESTS[kind];
  if (pay === 'souls') {
    if (!c.souls) return { error: 'bad' };
    if ((save.souls || 0) < c.souls) return { error: 'souls', price: c.souls };
    save.souls -= c.souls; const loot = rollChest(kind, 'souls', save); applyLoot(save, loot); Wallet.onChange(); return { ok: true, loot };
  }
  if (Wallet.online) {
    const owned = Object.keys(save.unlocked || {}).filter((id) => save.unlocked[id]);
    try {
      const r = await Net.call('chest_open', { init_data: Net.initData(), p: { kind, owned } });
      if (r && r.ok) { Wallet.apply(r); applyLoot(save, r.loot, { server: true }); Wallet.onChange(); return { ok: true, loot: r.loot }; }
      return r || { error: 'net' };
    } catch (e) { return { error: 'net' }; }
  }
  if ((save.gems || 0) < c.gems) return { error: 'gems', price: c.gems };
  save.gems -= c.gems; const loot = rollChest(kind, 'gems', save); applyLoot(save, loot); Wallet.onChange(); return { ok: true, loot };
}
