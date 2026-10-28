// Сундуки (лутбоксы): три вида, шансы выпадения, бросок и анимация открытия.
// Деревянный: за души или за немного кристаллов, в основном души. Серебряный: только за кристаллы, в основном кристаллы.
// Золотой: самый дорогой, лучшая добыча, редкие премиум-башни. Для кристаллов бросок делает сервер (supabase/chests.sql, функция chest_open) —
// ровно по этим же таблицам; здесь бросок нужен для оплаты душами (души хранятся в сохранении) и для локального режима вне Telegram.
import * as D from './data.js?v=20261028185043';
import * as M from './meta.js?v=20261028185043';
import { Net } from './net.js?v=20261028185043';
import { Wallet } from './wallet.js?v=20261028185043';
import { towerIcon, econIcon } from './ui.js?v=20261028185043';
import { iconUrl, bareGlyphUrl } from './icons.js?v=20261028185043';
import { url as imgUrl } from './sprites.js?v=20261028185043';

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
function dupLoot(kind, id, pool) {
  if (kind === 'wood') return { t: 'souls', n: 120, dup: id, pool };
  const u = D.unlockOf(id); return { t: 'gems', n: Math.max(5, Math.round(((u && u.gems) || 20) * 0.4)), dup: id, pool };
}
// бросок. pay: 'souls' | 'gems'. rnd — Math.random или детерминированный для тестов
export function rollChest(kind, pay, save, rnd = Math.random) {
  const c = CHESTS[kind], rows = c.table.map((r) => (r.gemsOnly && pay === 'souls' ? { w: r.w, t: 'souls', min: 40, max: 89 } : r));
  let x = rnd() * rows.reduce((s, r) => s + r.w, 0), row = rows[rows.length - 1];
  for (const r of rows) { if ((x -= r.w) < 0) { row = r; break; } }
  if (row.t === 'unlock') {
    const free = freeIn(row.pool, save);
    if (!free.length) { const any = POOLS[row.pool].list[0]; return dupLoot(kind, any, row.pool); }
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

// ───── картинки и значки добычи ─────
const IC = (n) => imgUrl('ui/ic/' + n + '.webp');
export const chestImg = (theme, st = 'closed') => IC(`chest_${theme}_${st}`);
export const chestHtml = (theme) => `<img src="${chestImg(theme)}" alt="">`;
const gemPic = (n) => IC(n >= 250 ? 'loot_gem3' : n >= 90 ? 'loot_gem2' : 'loot_gem1');
const lootIcon = (l) => {
  if (l.t === 'souls') return `<img src="${IC('loot_souls')}" alt="">`;
  if (l.t === 'gems') return `<img src="${gemPic(l.n)}" alt="">`;
  const prem = D.isPremium(l.id), src = D.ECON[l.id] ? econIcon(l.id, 3) : towerIcon(l.id, 1, null, null, { k: 'shop', size: 160 });
  return `<img src="${iconUrl(src)}" alt="" ${prem ? 'class="prem"' : ''}>`;
};
const lootName = (l) => (l.t === 'souls' ? `+${fmt(l.n)} душ` : l.t === 'gems' ? `+${fmt(l.n)} кристаллов` : (D.TOWERS[l.id] || D.ECON[l.id]).name);
const lootSub = (l) => (l.dup ? `У тебя уже есть «${(D.TOWERS[l.dup] || D.ECON[l.dup]).name}», вместо него — компенсация` : l.t === 'unlock' ? (D.isPremium(l.id) ? 'Премиум-башня, навсегда' : 'Новое здание, навсегда') : l.t === 'gems' ? 'Кристаллы на счёт' : 'Души в Кузницу');
const rarOf = (l) => {
  if (l.t === 'unlock') return l.pool === 'prem' ? 'l' : l.pool === 'mid' ? 'r' : 'u';
  if (l.dup) return 'u';
  if (l.t === 'gems') return l.n >= 250 ? 'e' : l.n >= 90 ? 'r' : 'u';
  return l.n >= 800 ? 'e' : l.n >= 300 ? 'r' : l.n >= 90 ? 'u' : 'c';
};
const RARNAME = { c: 'Обычное', u: 'Необычное', r: 'Редкое', e: 'Эпическое', l: 'Легендарное' };
// какая строка таблицы шансов выпала (для подсветки и подписи «шанс N%»)
function winRow(kind, loot) {
  const rows = CHESTS[kind].table;
  const i = rows.findIndex((r) => (loot.dup ? r.t === 'unlock' && r.pool === loot.pool : loot.t === 'unlock' ? r.t === 'unlock' && r.pool === loot.pool : r.t === loot.t && loot.n >= r.min && loot.n <= r.max));
  return i;
}
// значок строки таблицы в ленте шансов
const rowIcon = (r) => r.t === 'souls' ? IC('loot_souls') : r.t === 'gems' ? gemPic(r.max) : IC('loot_scroll');
const rowSmall = (r) => r.t === 'souls' ? `${fmt(r.min)}–${fmt(r.max)}` : r.t === 'gems' ? `${fmt(r.min)}–${fmt(r.max)}` : r.pool === 'prem' ? 'премиум' : r.pool === 'mid' ? 'здание ★' : 'здание';

// ───── окно открытия: весь экран затемнён, по центру сундук. Падает, трясётся, вспышка, крышка открыта, добыча взлетает над ним ─────
const countUp = (el, to, ms, suffix) => new Promise((res) => {
  const t0 = performance.now(), f = (t) => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = '+' + fmt(to * e) + suffix; if (k < 1) requestAnimationFrame(f); else res(); };
  requestAnimationFrame(f);
});
export async function playOpening(kind, loot, ctrl, { again = null } = {}) {
  const c = CHESTS[kind], sfx = ctrl.sfx, rar = rarOf(loot), wi = winRow(kind, loot), row = wi >= 0 ? c.table[wi] : null;
  const RC = { c: '#aab0b8', u: '#6adf6a', r: '#4aa8ff', e: '#b46aff', l: '#ffcf3a' }[rar];
  const odds = c.table.map((r, i) => `<div class="od r-${r.t === 'unlock' ? (r.pool === 'prem' ? 'l' : r.pool === 'mid' ? 'r' : 'u') : (r.t === 'gems' && r.max >= 250) ? 'e' : r.t === 'gems' ? 'r' : 'c'}${i === wi ? ' win' : ''}"><img src="${rowIcon(r)}" alt=""><b>${r.w}%</b><small>${rowSmall(r)}</small></div>`).join('');
  [chestImg(c.theme), chestImg(c.theme, 'open')].forEach((u) => { const im = new Image(); im.src = u; });      // прогрев: при вспышке картинка уже готова
  const root = el('div', 'cfx'); root.id = 'cfx'; root.style.setProperty('--cc', c.color); root.style.setProperty('--rc', RC);
  root.innerHTML = `<div class="cfx-rays"></div><div class="cfx-glow"></div><div class="cfx-title">${c.name}</div>
    <div class="cfx-stage"><div class="cfx-chestw"><img class="closed" src="${chestImg(c.theme)}" alt=""><img class="open" src="${chestImg(c.theme, 'open')}" alt=""></div><div class="cfx-hint">Нажми на сундук</div></div>
    <div class="cfx-loot${loot.t === 'unlock' ? ' tw' : ''}">${lootIcon(loot)}</div><div class="cfx-ring"></div>
    <div class="cfx-result"><div class="rr">${RARNAME[rar]}</div><div class="rn"></div><div class="rc">${row ? `Шанс выпадения: <b>${row.w}%</b>` : ''}</div><div class="rs">${lootSub(loot)}</div></div>
    <div class="cfx-odds">${odds}</div><div class="cfx-actions"></div><div class="cfx-flash"></div><div class="cfx-sparks"></div>`;
  $('#app').appendChild(root);
  const q = (s) => root.querySelector(s), chestW = q('.cfx-chestw'), sparks = q('.cfx-sparks'), acts = q('.cfx-actions'), nm = q('.rn');
  let tapped = false, skipped = false;
  chestW.onclick = () => { tapped = true; }; root.onclick = () => { if (root.classList.contains('burst')) skipped = true; };
  const wait = async (ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms && !skipped) await sleep(40); };
  // 1. сундук падает на место
  requestAnimationFrame(() => root.classList.add('in')); sfx.play('select'); await sleep(850);
  // 2. ждём нажатия (само откроется через пару секунд) — сундук покачивается и светится
  root.classList.add('idle'); { const t0 = Date.now(); while (!tapped && Date.now() - t0 < 2600) await sleep(40); }
  // 3. накал: сундук трясётся всё сильнее, из щелей льётся свет
  root.classList.remove('idle'); root.classList.add('charge'); sfx.play('upgrade'); await sleep(1280);
  // 4. взрыв света: вспышка, волна, крышка открыта, искры во все стороны
  root.classList.remove('charge'); root.classList.add('burst', 'quake'); sfx.play('win');
  const cols = ['#fff6c0', '#ffd24a', '#fff', c.color, RC], n = rar === 'l' ? 70 : rar === 'e' ? 56 : 42;
  for (let i = 0; i < n; i++) {
    const s = el('i', i % 3 === 0 ? 'st' : ''), a = Math.random() * Math.PI * 2, d = 110 + Math.random() * Math.min(window.innerWidth, 520) * 0.55;
    s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d * 0.85 - 30 + 'px'); s.style.setProperty('--c', cols[i % cols.length]); s.style.setProperty('--t', 0.7 + Math.random() * 0.7 + 's'); s.style.animationDelay = Math.random() * 0.12 + 's';
    sparks.appendChild(s);
  }
  await wait(520);
  // 5. добыча взлетает над сундуком
  root.classList.add('rise'); sfx.play(rar === 'l' || rar === 'e' ? 'upgrade' : 'select'); await wait(950);
  // 6. итог: название (числа считаются вверх), редкость, шанс; в ленте шансов подсвечена выпавшая строка
  root.classList.add('got', 'r-' + rar);
  if (loot.t === 'unlock') nm.textContent = lootName(loot);
  else { nm.textContent = '+0'; await countUp(nm, loot.n, 800, loot.t === 'souls' ? ' душ' : ' кристаллов'); }
  sfx.play(rar === 'l' || rar === 'e' ? 'win' : 'upgrade', 0.8);
  await wait(rar === 'l' || rar === 'e' ? 350 : 150);
  return new Promise((done) => {
    const close = (reroll) => { root.classList.add('out'); setTimeout(() => { root.remove(); done(reroll); }, 300); };
    const ok = el('button', 'btn big', 'Забрать'); ok.onclick = () => { sfx.play('click'); close(false); }; acts.appendChild(ok);
    if (again) { const ag = el('button', 'btn ghost', again.label); ag.onclick = () => { sfx.play('click'); close(true); }; acts.appendChild(ag); }
    root.classList.add('done');
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
