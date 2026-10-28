// Сундуки (лутбоксы): три вида, шансы выпадения, бросок и анимация открытия.
// Деревянный: за души или за немного кристаллов, в основном души. Серебряный: только за кристаллы, в основном кристаллы.
// Золотой: самый дорогой, лучшая добыча, редкие премиум-башни. Каждая башня — отдельная строка таблицы (js/chesttable.js).
// Для кристаллов бросок делает сервер (supabase/chests.sql, функция chest_open) — по этой же таблице; здесь бросок нужен для оплаты душами (души хранятся в сохранении) и для локального режима вне Telegram.
import * as D from './data.js?v=20261028203243';
import * as M from './meta.js?v=20261028203243';
import { Net } from './net.js?v=20261028203243';
import { Wallet } from './wallet.js?v=20261028203243';
import { towerIcon, econIcon } from './ui.js?v=20261028203243';
import { iconUrl } from './icons.js?v=20261028203243';
import { url as imgUrl } from './sprites.js?v=20261028203243';
import { CHEST_ROWS, POOL_OF, chanceOf, pctText } from './chesttable.js?v=20261028203243';
import { createChest3D } from './chest3d.js?v=20261028203243';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const META = { wood: { name: 'Деревянный сундук', theme: 'wood', color: '#c98a46' }, silver: { name: 'Серебряный сундук', theme: 'silver', color: '#a9cdee' }, gold: { name: 'Золотой сундук', theme: 'gold', color: '#ffd24a' } };
export const CHESTS = {};
for (const k of Object.keys(CHEST_ROWS)) CHESTS[k] = { ...META[k], souls: CHEST_ROWS[k].souls, gems: CHEST_ROWS[k].gems, table: CHEST_ROWS[k].rows.map((r) => (r.t === 'unlock' ? { ...r, pool: POOL_OF[r.id] } : r)) };
export const CHEST_ORDER = ['wood', 'silver', 'gold'];

const rint = (a, b, rnd) => a + Math.floor(rnd() * (b - a + 1));
const have = (save, id) => (D.isPremium(id) ? !!save.unlocked[id] : M.itemUnlocked(save, id));
const nameOf = (id) => (D.TOWERS[id] || D.ECON[id]).name;

// повтор: если такое здание уже есть, выдаётся компенсация (деревянный — души, остальные — кристаллы, 40% цены здания)
function dupLoot(kind, id, pool) {
  if (kind === 'wood') return { t: 'souls', n: 120, dup: id, pool };
  const u = D.unlockOf(id); return { t: 'gems', n: Math.max(5, Math.round(((u && u.gems) || 20) * 0.4)), dup: id, pool };
}
// бросок. pay: 'souls' | 'gems'. rnd — Math.random или детерминированный для тестов
export function rollChest(kind, pay, save, rnd = Math.random) {
  const c = CHESTS[kind], rows = c.table.map((r) => (r.gemsOnly && pay === 'souls' ? { w: r.w, t: 'souls', min: 40, max: 89 } : r));
  let x = rnd() * rows.reduce((s, r) => s + r.w, 0), row = rows[rows.length - 1];
  for (const r of rows) { if ((x -= r.w) < 0) { row = r; break; } }
  if (row.t === 'unlock') return have(save, row.id) ? dupLoot(kind, row.id, row.pool) : { t: 'unlock', id: row.id, pool: row.pool };
  if (row.t === 'stars') return { t: 'stars', n: row.min };
  return { t: row.t, n: rint(row.min, row.max, rnd) };
}
// редкость строки по её шансу, как в кейсах: чем реже, тем «краснее» и «золотее»
const rarOfChance = (p) => (p >= 8 ? 'c' : p >= 2 ? 'u' : p >= 0.5 ? 'r' : p >= 0.05 ? 'e' : 'l');
const rowRar = (kind, r) => rarOfChance(chanceOf(kind, r));
const RARNAME = { c: 'Обычное', u: 'Необычное', r: 'Редкое', e: 'Эпическое', l: 'Легендарное' };
const RARCOL = { c: '#aab0b8', u: '#5ab0ff', r: '#8a6aff', e: '#ff5ad0', l: '#ffcf3a' };

// ───── картинки и значки добычи ─────
const IC = (n) => imgUrl('ui/ic/' + n + '.webp');
export const chestImg = (theme, st = 'closed') => IC(`chest_${theme}_${st}`);
export const chestHtml = (theme) => `<img src="${chestImg(theme)}" alt="">`;
const gemPic = (n) => IC(n >= 250 ? 'loot_gem3' : n >= 90 ? 'loot_gem2' : 'loot_gem1');
const unlockIcon = (id) => iconUrl(D.ECON[id] ? econIcon(id, 1, { size: 128, k: 'chest' }) : towerIcon(id, 1, null, null, { size: 128, k: 'chest' }));
const starPic = () => IC('cont_cup');
const lootIcon = (l) => (l.t === 'souls' ? `<img src="${IC('loot_souls')}" alt="">` : l.t === 'gems' ? `<img src="${gemPic(l.n)}" alt="">` : l.t === 'stars' ? `<img src="${starPic()}" alt="">` : `<img src="${unlockIcon(l.id)}" alt="" ${D.isPremium(l.id) ? 'class="prem"' : ''}>`);
const rowPic = (r) => (r.t === 'souls' ? IC('loot_souls') : r.t === 'gems' ? gemPic(r.max) : r.t === 'stars' ? starPic() : unlockIcon(r.id));
const lootName = (l) => (l.t === 'souls' ? `+${fmt(l.n)} душ` : l.t === 'gems' ? `+${fmt(l.n)} кристаллов` : l.t === 'stars' ? `${l.n} Telegram Stars` : nameOf(l.id));
const lootSub = (l) => (l.dup ? `У тебя уже есть «${nameOf(l.dup)}», вместо него — компенсация` : l.t === 'stars' ? 'Главный приз! Мы свяжемся с тобой' : l.t === 'unlock' ? (D.isPremium(l.id) ? 'Премиум-башня, навсегда' : 'Новое здание, навсегда') : l.t === 'gems' ? 'Кристаллы на счёт' : 'Души в Кузницу');
// какая строка таблицы выпала (для подсветки и подписи «шанс N%»)
const winRow = (kind, loot) => CHESTS[kind].table.findIndex((r) => (loot.dup ? r.t === 'unlock' && r.id === loot.dup : loot.t === 'unlock' ? r.t === 'unlock' && r.id === loot.id : loot.t === 'stars' ? r.t === 'stars' : r.t === loot.t && loot.n >= r.min && loot.n <= r.max));
const rarOf = (kind, loot) => { const i = winRow(kind, loot); return i >= 0 ? rowRar(kind, CHESTS[kind].table[i]) : loot.dup ? 'c' : 'u'; };
// шансы для показа игроку (карточка сундука в магазине)
export function oddsOf(kind) {
  return CHESTS[kind].table.map((r) => [r.t === 'souls' ? `${fmt(r.min)}–${fmt(r.max)} душ` : r.t === 'gems' ? `${fmt(r.min)}–${fmt(r.max)} кристаллов` : r.t === 'stars' ? `${r.min} Telegram Stars` : nameOf(r.id), pctText(chanceOf(kind, r)), rowRar(kind, r), rowPic(r)]);
}

// ───── применить добычу к сохранению (души — всегда на клиенте; кристаллы и здания уже записал сервер, если платили кристаллами онлайн) ─────
export function applyLoot(save, loot, { server = false } = {}) {
  if (loot.t === 'souls') save.souls = (save.souls || 0) + loot.n;
  else if (loot.t === 'gems') { if (!server) save.gems = (save.gems || 0) + loot.n; }
  else if (loot.t === 'unlock') { if (!server || !D.isPremium(loot.id)) save.unlocked[loot.id] = 1; }
}

// ───── склад сундуков: души → склад в сохранении, кристаллы → склад на сервере (вне Telegram — тоже в сохранении) ─────
export const stockOf = (save, kind) => ((save.stock || {})[kind] || 0) + ((save.chestsSrv || {})[kind] || 0);
export async function refreshStock(save) {
  if (!Wallet.online) return;
  try { const r = await Net.call('chest_stock', { init_data: Net.initData() }); if (r && r.chests) save.chestsSrv = r.chests; } catch (e) { /* без связи */ }
}
// купить n сундуков про запас
export async function buyChests(save, kind, pay, n) {
  const c = CHESTS[kind]; save.stock = save.stock || {};
  if (pay === 'souls') {
    if (!c.souls) return { error: 'bad' };
    if ((save.souls || 0) < c.souls * n) return { error: 'souls', price: c.souls * n };
    save.souls -= c.souls * n; save.stock[kind] = (save.stock[kind] || 0) + n; Wallet.onChange(); return { ok: true };
  }
  if (Wallet.online) {
    try {
      const r = await Net.call('chest_buy', { init_data: Net.initData(), p: { kind, n } });
      if (r && r.ok) { Wallet.apply(r); if (r.chests) save.chestsSrv = r.chests; Wallet.onChange(); return { ok: true }; }
      return r || { error: 'net' };
    } catch (e) { return { error: 'net' }; }
  }
  if ((save.gems || 0) < c.gems * n) return { error: 'gems', price: c.gems * n };
  save.gems -= c.gems * n; save.stock[kind] = (save.stock[kind] || 0) + n; Wallet.onChange(); return { ok: true };
}
// открыть n сундуков со склада: сначала купленные за души (бросок на клиенте), затем кристальные (бросок на сервере)
export async function openChests(save, kind, n) {
  save.stock = save.stock || {}; const loots = []; let left = Math.min(n, stockOf(save, kind));
  const local = Math.min(left, save.stock[kind] || 0);
  for (let i = 0; i < local; i++) { const l = rollChest(kind, Wallet.online ? 'souls' : 'gems', save); applyLoot(save, l); loots.push(l); }
  save.stock[kind] = (save.stock[kind] || 0) - local; left -= local;
  if (left > 0) {
    const owned = Object.keys(save.unlocked || {}).filter((id) => save.unlocked[id]);
    try {
      const r = await Net.call('chest_open', { init_data: Net.initData(), p: { kind, n: left, from: 'stock', owned } });
      if (!(r && r.ok)) { Wallet.onChange(); return { error: (r && r.error) || 'net', loots }; }
      Wallet.apply(r); if (r.chests) save.chestsSrv = r.chests;
      for (const l of r.loots || []) { applyLoot(save, l, { server: true }); loots.push(l); }
    } catch (e) { Wallet.onChange(); return { error: 'net', loots }; }
  }
  Wallet.onChange(); return loots.length ? { ok: true, loots } : { error: 'stock' };
}

// ───── окно открытия ─────
const countUp = (e, to, ms, suffix) => new Promise((res) => {
  const t0 = performance.now(), f = (t) => { const k = Math.min(1, (t - t0) / ms), q = 1 - Math.pow(1 - k, 3); e.textContent = '+' + fmt(to * q) + suffix; if (k < 1) requestAnimationFrame(f); else res(); };
  requestAnimationFrame(f);
});
// предмет вылетает из сундука по дуге, вращаясь, и падает обратно
function fling(layer, src, dx) {
  const im = el('img', 'cfx-fly'); im.src = src; layer.appendChild(im);
  const peak = 140 + Math.random() * 120, N = 18, rot = (Math.random() - 0.5) * 900, kf = [];
  for (let i = 0; i <= N; i++) { const t = i / N; kf.push({ transform: `translate(${dx * t}px, ${-4 * peak * t * (1 - t)}px) translate(-50%, -50%) rotate(${rot * t}deg) scale(${0.3 + Math.sin(Math.min(1, t * 1.4) * Math.PI / 2) * 0.8})`, opacity: t < 0.08 ? t / 0.08 : t > 0.8 ? (1 - t) / 0.2 : 1, offset: t }); }
  const a = im.animate(kf, { duration: 1100 + Math.random() * 500, easing: 'linear', fill: 'forwards' }); a.onfinish = () => im.remove();
}
// карточка рулетки: значок, подпись, цвет редкости
const amountOf = (r) => (r.t === 'unlock' || r.t === 'stars' ? 0 : Math.round(r.min + Math.random() * (r.max - r.min)));
const cardLabel = (r, amt) => (r.t === 'souls' ? fmt(amt) : r.t === 'gems' ? fmt(amt) : r.t === 'stars' ? '150 ⭐' : nameOf(r.id));
const cardHtml = (kind, r, amt, extra = '') => `<div class="rc ${extra}" style="--rc:${RARCOL[rowRar(kind, r)]}"><img src="${rowPic(r)}" alt=""><small>${cardLabel(r, amt)}</small></div>`;
// строка рулетки: случайные карточки по весам таблицы (с поправкой, чтобы редкие тоже мелькали), на заданном месте — выпавшая
function buildStrip(kind, loot, wi, N, WIN) {
  const rows = CHESTS[kind].table, ws = rows.map((r) => Math.pow(r.w, 0.55)), tot = ws.reduce((a, b) => a + b, 0), out = [];
  for (let i = 0; i < N; i++) {
    if (i === WIN) { const r = rows[wi >= 0 ? wi : 0]; out.push(cardHtml(kind, r, loot.n || 0, 'win')); continue; }
    let x = Math.random() * tot, k = 0; for (; k < rows.length - 1; k++) { x -= ws[k]; if (x < 0) break; } out.push(cardHtml(kind, rows[k], amountOf(rows[k])));
  }
  return out.join('');
}
const stageHtml = (c) => `<div class="cfx-stage"><div class="cfx-circle"><i></i><i></i></div><div class="cfx-flat"><img class="fc" src="${chestImg(c.theme)}" alt=""><img class="fo" src="${chestImg(c.theme, 'open')}" alt=""></div><div class="cfx-fly-layer"></div><div class="cfx-hint">Нажми на сундук</div></div>`;

// ───── один сундук: 3D-сундук падает на магический круг, раскручивается, вспышка, крышка открыта; снизу рулетка, как в кейсах, останавливается на выпавшем предмете ─────
export async function playOpening(kind, loot, ctrl, { again = null } = {}) {
  const c = CHESTS[kind], sfx = ctrl.sfx, wi = winRow(kind, loot), rar = rarOf(kind, loot), row = wi >= 0 ? c.table[wi] : null, RC = RARCOL[rar];
  const root = el('div', 'cfx'); root.id = 'cfx'; root.style.setProperty('--cc', c.color); root.style.setProperty('--rc', RC);
  root.innerHTML = `<div class="cfx-rays"></div><div class="cfx-glow"></div><div class="cfx-title">${c.name}</div>${stageHtml(c)}
    <div class="cfx-loot${loot.t === 'unlock' ? ' tw' : ''}">${lootIcon(loot)}</div><div class="cfx-ring"></div>
    <div class="cfx-rl"><div class="rl-view"><i class="rl-mark"></i><div class="rl-strip"></div></div></div>
    <div class="cfx-result"><div class="rr">${RARNAME[rar]}</div><div class="rn"></div><div class="rc2">${row ? `Шанс выпадения: <b>${pctText(chanceOf(kind, row))}%</b>` : ''}</div><div class="rs">${lootSub(loot)}</div></div>
    <div class="cfx-actions"></div><div class="cfx-flash"></div><div class="cfx-sparks"></div>`;
  $('#app').appendChild(root);
  const q = (s) => root.querySelector(s), stage = q('.cfx-stage'), sparks = q('.cfx-sparks'), acts = q('.cfx-actions'), nm = q('.rn'), layer = q('.cfx-fly-layer'), strip = q('.rl-strip'), view = q('.rl-view');
  let c3 = null; try { c3 = createChest3D(stage, c.theme, c.color); } catch (e) { c3 = null; }
  if (c3) root.classList.add('has3d');
  let tapped = false, skipped = false;
  stage.onclick = () => { tapped = true; }; root.onclick = () => { if (root.classList.contains('spin')) skipped = true; };
  root.addEventListener('pointermove', (e) => { if (!c3 || root.classList.contains('burst')) return; const r = root.getBoundingClientRect(); c3.tilt((0.5 - (e.clientY - r.top) / r.height) * 0.35, ((e.clientX - r.left) / r.width - 0.5) * 0.7); });
  const wait = async (ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms && !skipped) await sleep(40); };
  // 1. сундук падает на круг
  requestAnimationFrame(() => root.classList.add('in')); sfx.play('select');
  if (c3) await c3.drop(); else { root.classList.add('flat-in'); await sleep(900); }
  // 2. ждём нажатия (само откроется через пару секунд)
  root.classList.add('idle'); { const t0 = Date.now(); while (!tapped && Date.now() - t0 < 2200) await sleep(40); }
  // 3. накал: сундук взлетает, раскручивается, трясётся, лучи света
  root.classList.remove('idle'); root.classList.add('charge'); sfx.play('upgrade'); if (c3) c3.charge(1400); await sleep(1400);
  // 4. взрыв света
  root.classList.remove('charge'); root.classList.add('burst', 'quake'); sfx.play('win'); if (c3) c3.burst();
  { const cols = ['#fff6c0', '#ffd24a', '#fff', c.color, RC];
    for (let i = 0; i < 40; i++) { const s = el('i', i % 3 === 0 ? 'st' : ''), a = Math.random() * Math.PI * 2, d = 110 + Math.random() * Math.min(window.innerWidth, 520) * 0.55; s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d * 0.85 - 30 + 'px'); s.style.setProperty('--c', cols[i % cols.length]); s.style.setProperty('--t', 0.7 + Math.random() * 0.7 + 's'); s.style.animationDelay = Math.random() * 0.12 + 's'; sparks.appendChild(s); }
    const a = layer.getBoundingClientRect(); layer.style.setProperty('--x0', a.width / 2 + 'px'); layer.style.setProperty('--y0', a.height * 0.4 + 'px');
    c.table.slice().sort(() => Math.random() - 0.5).slice(0, 6).forEach((r, i) => setTimeout(() => fling(layer, rowPic(r), (i % 2 ? 1 : -1) * (40 + Math.random() * 120)), 80 + i * 90)); }
  await wait(650);
  // 5. рулетка снизу: быстро едет и плавно останавливается на выпавшем предмете
  const N = 70, WIN = 56, CW = 96, GAP = 6;
  strip.innerHTML = buildStrip(kind, loot, wi, N, WIN); root.classList.add('spin');
  await sleep(60);
  { const vw = view.clientWidth, jitter = (Math.random() - 0.5) * CW * 0.7, target = -(WIN * (CW + GAP) + CW / 2 - vw / 2 + jitter);
    strip.style.transform = 'translateX(0px)'; void strip.offsetWidth; strip.style.transition = 'transform 6s cubic-bezier(.07,.72,.1,1)'; strip.style.transform = `translateX(${target}px)`;
    let lastI = -1; const t0 = performance.now();
    while (performance.now() - t0 < 6100 && !skipped) {
      const m = new DOMMatrix(getComputedStyle(strip).transform), idx = Math.floor((-m.m41 + vw / 2) / (CW + GAP)); if (idx !== lastI) { lastI = idx; sfx.play('click', 0.3); } await sleep(30);
    }
    if (skipped) { strip.style.transition = 'none'; strip.style.transform = `translateX(${target}px)`; } }
  root.classList.add('stopped'); sfx.play(rar === 'l' || rar === 'e' ? 'win' : 'upgrade', 0.8); await wait(700);
  // 6. итог
  root.classList.add('got', 'r-' + rar); if (c3) c3.got(); root.classList.add('rise');
  if (loot.t === 'unlock' || loot.t === 'stars') nm.textContent = lootName(loot);
  else { nm.textContent = '+0'; await countUp(nm, loot.n, 700, loot.t === 'souls' ? ' душ' : ' кристаллов'); }
  await wait(rar === 'l' || rar === 'e' ? 300 : 120);
  return new Promise((done) => {
    const close = (reroll) => { root.classList.add('out'); setTimeout(() => { if (c3) c3.dispose(); root.remove(); done(reroll); }, 300); };
    const ok = el('button', 'btn big', 'Забрать'); ok.onclick = () => { sfx.play('click'); close(false); }; acts.appendChild(ok);
    if (again) { const ag = el('button', 'btn ghost', again.label); ag.onclick = () => { sfx.play('click'); close(true); }; acts.appendChild(ag); }
    root.classList.add('done');
  });
}

// ───── несколько сундуков разом: один взрыв, затем сетка всей добычи со сводкой ─────
export async function playBatch(kind, loots, ctrl) {
  const c = CHESTS[kind], sfx = ctrl.sfx, root = el('div', 'cfx batch'); root.id = 'cfx'; root.style.setProperty('--cc', c.color); root.style.setProperty('--rc', c.color);
  const agg = new Map();
  for (const l of loots) { const key = l.t === 'unlock' ? 'u:' + l.id : l.t === 'stars' ? 'stars' : (l.dup ? 'd:' + l.dup + l.t : l.t); const e = agg.get(key) || { l, n: 0, sum: 0 }; e.n++; e.sum += l.n || 0; agg.set(key, e); }
  const RO = { l: 0, e: 1, r: 2, u: 3, c: 4 }, list = [...agg.values()].map((e) => ({ ...e, rar: rarOf(kind, e.l) })).sort((a, b) => RO[a.rar] - RO[b.rar]);
  const cardOf = (e) => { const l = e.l, big = l.t === 'unlock' ? (e.n > 1 ? '×' + e.n : '') : l.t === 'stars' ? l.n + '⭐' : '+' + fmt(e.sum); const name = l.t === 'unlock' ? nameOf(l.id) : l.t === 'souls' ? 'Души' : l.t === 'gems' ? 'Кристаллы' : 'Stars'; return `<div class="bc" style="--rc:${RARCOL[e.rar]}">${lootIcon(l)}<b>${big}</b><small>${name}${l.dup ? ' (повтор)' : ''}</small></div>`; };
  const souls = loots.filter((l) => l.t === 'souls').reduce((s, l) => s + l.n, 0), gems = loots.filter((l) => l.t === 'gems').reduce((s, l) => s + l.n, 0), towers = loots.filter((l) => l.t === 'unlock').length;
  root.innerHTML = `<div class="cfx-rays"></div><div class="cfx-glow"></div><div class="cfx-title">${c.name} ×${loots.length}</div>${stageHtml(c)}<div class="cfx-flash"></div><div class="cfx-sparks"></div>
    <div class="cfx-batch"><div class="bgrid">${list.map(cardOf).join('')}</div><div class="bsum">${souls ? `<span><img src="${IC('loot_souls')}" alt="">+${fmt(souls)}</span>` : ''}${gems ? `<span><img src="${gemPic(100)}" alt="">+${fmt(gems)}</span>` : ''}${towers ? `<span>Новых зданий: ${towers}</span>` : ''}</div></div><div class="cfx-actions"></div>`;
  $('#app').appendChild(root);
  const stage = root.querySelector('.cfx-stage'), acts = root.querySelector('.cfx-actions'); let c3 = null; try { c3 = createChest3D(stage, c.theme, c.color); } catch (e) { c3 = null; } if (c3) root.classList.add('has3d');
  requestAnimationFrame(() => root.classList.add('in')); sfx.play('select');
  if (c3) await c3.drop(); else await sleep(700);
  root.classList.add('charge'); sfx.play('upgrade'); if (c3) c3.charge(1100); await sleep(1100);
  root.classList.remove('charge'); root.classList.add('burst', 'quake'); sfx.play('win'); if (c3) c3.burst();
  await sleep(600); root.classList.add('showb'); sfx.play('upgrade', 0.7);
  return new Promise((done) => { const ok = el('button', 'btn big', 'Забрать'); ok.onclick = () => { sfx.play('click'); root.classList.add('out'); setTimeout(() => { if (c3) c3.dispose(); root.remove(); done(); }, 300); }; acts.appendChild(ok); root.classList.add('done'); });
}
