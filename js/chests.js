// Сундуки (лутбоксы): три вида, шансы выпадения, бросок и анимация открытия.
// Деревянный: за души или за немного кристаллов, в основном души. Серебряный: только за кристаллы, в основном кристаллы.
// Золотой: самый дорогой, лучшая добыча, редкие премиум-башни. Каждая башня — отдельная строка таблицы (js/chesttable.js).
// Для кристаллов бросок делает сервер (supabase/chests.sql, функция chest_open) — по этой же таблице; здесь бросок нужен для оплаты душами (души хранятся в сохранении) и для локального режима вне Telegram.
import * as D from './data.js?v=20261028194558';
import * as M from './meta.js?v=20261028194558';
import { Net } from './net.js?v=20261028194558';
import { Wallet } from './wallet.js?v=20261028194558';
import { towerIcon, econIcon } from './ui.js?v=20261028194558';
import { iconUrl } from './icons.js?v=20261028194558';
import { url as imgUrl } from './sprites.js?v=20261028194558';
import { CHEST_ROWS, POOL_OF } from './chesttable.js?v=20261028194558';

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
  return { t: row.t, n: rint(row.min, row.max, rnd) };
}
const rowRar = (r) => (r.t === 'unlock' ? (r.pool === 'prem' ? 'l' : r.pool === 'mid' ? 'r' : 'u') : r.t === 'gems' ? (r.max >= 250 ? 'e' : r.max >= 90 ? 'r' : 'u') : r.max >= 800 ? 'e' : r.max >= 300 ? 'r' : r.max >= 90 ? 'u' : 'c');
// шансы для показа игроку: список строк «что — сколько процентов — редкость»
export function oddsOf(kind) {
  return CHESTS[kind].table.map((r) => [r.t === 'souls' ? `${fmt(r.min)}–${fmt(r.max)} душ` : r.t === 'gems' ? `${fmt(r.min)}–${fmt(r.max)} кристаллов` : nameOf(r.id), r.w, rowRar(r)]);
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
const unlockIcon = (id) => iconUrl(D.ECON[id] ? econIcon(id, 3, { size: 128, k: 'chest' }) : towerIcon(id, 1, null, null, { size: 128, k: 'chest' }));
const lootIcon = (l) => (l.t === 'souls' ? `<img src="${IC('loot_souls')}" alt="">` : l.t === 'gems' ? `<img src="${gemPic(l.n)}" alt="">` : `<img src="${unlockIcon(l.id)}" alt="" ${D.isPremium(l.id) ? 'class="prem"' : ''}>`);
const rowPic = (r) => (r.t === 'souls' ? IC('loot_souls') : r.t === 'gems' ? gemPic(r.max) : unlockIcon(r.id));
const lootName = (l) => (l.t === 'souls' ? `+${fmt(l.n)} душ` : l.t === 'gems' ? `+${fmt(l.n)} кристаллов` : nameOf(l.id));
const lootSub = (l) => (l.dup ? `У тебя уже есть «${nameOf(l.dup)}», вместо него — компенсация` : l.t === 'unlock' ? (D.isPremium(l.id) ? 'Премиум-башня, навсегда' : 'Новое здание, навсегда') : l.t === 'gems' ? 'Кристаллы на счёт' : 'Души в Кузницу');
const rarOf = (l) => {
  if (l.t === 'unlock') return l.pool === 'prem' ? 'l' : l.pool === 'mid' ? 'r' : 'u';
  if (l.dup) return 'u';
  if (l.t === 'gems') return l.n >= 250 ? 'e' : l.n >= 90 ? 'r' : 'u';
  return l.n >= 800 ? 'e' : l.n >= 300 ? 'r' : l.n >= 90 ? 'u' : 'c';
};
const RARNAME = { c: 'Обычное', u: 'Необычное', r: 'Редкое', e: 'Эпическое', l: 'Легендарное' };
// какая строка таблицы выпала (для подсветки и подписи «шанс N%»)
const winRow = (kind, loot) => CHESTS[kind].table.findIndex((r) => (loot.dup ? r.t === 'unlock' && r.id === loot.dup : loot.t === 'unlock' ? r.t === 'unlock' && r.id === loot.id : r.t === loot.t && loot.n >= r.min && loot.n <= r.max));
const rowSmall = (r) => (r.t === 'unlock' ? '' : `${fmt(r.min)}–${fmt(r.max)}`);

const countUp = (e, to, ms, suffix) => new Promise((res) => {
  const t0 = performance.now(), f = (t) => { const k = Math.min(1, (t - t0) / ms), q = 1 - Math.pow(1 - k, 3); e.textContent = '+' + fmt(to * q) + suffix; if (k < 1) requestAnimationFrame(f); else res(); };
  requestAnimationFrame(f);
});
// предмет вылетает из сундука по дуге, вращаясь, и падает обратно
function fling(layer, src, dx, dy, big = false) {
  const im = el('img', 'cfx-fly'); im.src = src; if (big) im.classList.add('big'); layer.appendChild(im);
  const peak = 150 + Math.random() * 130, N = 18, rot = (Math.random() - 0.5) * 900, kf = [];
  for (let i = 0; i <= N; i++) { const t = i / N; kf.push({ transform: `translate(${dx * t}px, ${-4 * peak * t * (1 - t) * 1 + dy * t * t * 0}px) translate(-50%, -50%) rotate(${rot * t}deg) scale(${0.3 + Math.sin(Math.min(1, t * 1.4) * Math.PI / 2) * 0.8})`, opacity: t < 0.08 ? t / 0.08 : t > 0.8 ? (1 - t) / 0.2 : 1, offset: t }); }
  const a = im.animate(kf, { duration: 1100 + Math.random() * 500, easing: 'linear', fill: 'forwards' }); a.onfinish = () => im.remove();
}

// ───── окно открытия: весь экран затемнён, по центру объёмный сундук на магическом круге. Падает, поворачивается за пальцем, раскручивается и взлетает,
// вспышка, крышка открыта, из сундука разлетаются предметы, главная добыча поднимается над ним ─────
export async function playOpening(kind, loot, ctrl, { again = null } = {}) {
  const c = CHESTS[kind], sfx = ctrl.sfx, rar = rarOf(loot), wi = winRow(kind, loot), row = wi >= 0 ? c.table[wi] : null;
  const RC = { c: '#aab0b8', u: '#6adf6a', r: '#4aa8ff', e: '#b46aff', l: '#ffcf3a' }[rar];
  const odds = c.table.map((r, i) => `<div class="od r-${rowRar(r)}${i === wi ? ' win' : ''}"><img src="${rowPic(r)}" alt=""><b>${r.w}%</b>${rowSmall(r) ? `<small>${rowSmall(r)}</small>` : ''}</div>`).join('');
  const closed = chestImg(c.theme), opened = chestImg(c.theme, 'open');
  [closed, opened].forEach((u) => { const im = new Image(); im.src = u; });      // прогрев: при вспышке картинка уже готова
  const ext = (u) => Array.from({ length: 7 }, (_, i) => `<img class="ex" style="transform: translateZ(${-(i + 1) * 3.2}px)" src="${u}" alt="">`).join('');      // слои глубины: при повороте сундук выглядит объёмным
  const root = el('div', 'cfx'); root.id = 'cfx'; root.style.setProperty('--cc', c.color); root.style.setProperty('--rc', RC);
  root.innerHTML = `<div class="cfx-rays"></div><div class="cfx-glow"></div><div class="cfx-title">${c.name}</div>
    <div class="cfx-stage"><div class="cfx-circle"><i></i><i></i></div><div class="cfx-beams"><i></i><i></i><i></i><i></i><i></i></div>
      <div class="cfx-chestw"><div class="cfx-tilt"><div class="cfx-shake"><div class="cfx-spin">
        <div class="grp closed">${ext(closed)}<img class="fr" src="${closed}" alt=""></div><div class="grp open">${ext(opened)}<img class="fr" src="${opened}" alt=""></div>
      </div></div></div></div>
      <div class="cfx-fly-layer"></div><div class="cfx-hint">Нажми на сундук</div></div>
    <div class="cfx-loot${loot.t === 'unlock' ? ' tw' : ''}">${lootIcon(loot)}</div><div class="cfx-ring"></div>
    <div class="cfx-result"><div class="rr">${RARNAME[rar]}</div><div class="rn"></div><div class="rc">${row ? `Шанс выпадения: <b>${row.w}%</b>` : ''}</div><div class="rs">${lootSub(loot)}</div></div>
    <div class="cfx-odds">${odds}</div><div class="cfx-actions"></div><div class="cfx-flash"></div><div class="cfx-sparks"></div>`;
  $('#app').appendChild(root);
  const q = (s) => root.querySelector(s), chestW = q('.cfx-chestw'), tilt = q('.cfx-tilt'), sparks = q('.cfx-sparks'), acts = q('.cfx-actions'), nm = q('.rn'), layer = q('.cfx-fly-layer');
  let tapped = false, skipped = false;
  chestW.onclick = () => { tapped = true; }; root.onclick = () => { if (root.classList.contains('burst')) skipped = true; };
  // сундук поворачивается за пальцем (или курсором)
  root.addEventListener('pointermove', (e) => { if (root.classList.contains('burst')) return; const r = root.getBoundingClientRect(); tilt.style.setProperty('--ty', ((e.clientX - r.left) / r.width - 0.5) * 46 + 'deg'); tilt.style.setProperty('--tx', (0.5 - (e.clientY - r.top) / r.height) * 22 + 'deg'); });
  const wait = async (ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms && !skipped) await sleep(40); };
  const cx = () => { const a = layer.getBoundingClientRect(); return [a.width / 2, a.height / 2]; };
  // 1. сундук падает на круг
  requestAnimationFrame(() => root.classList.add('in')); sfx.play('select'); await sleep(900);
  // 2. ждём нажатия (само откроется через пару секунд): сундук покачивается, круг светится
  root.classList.add('idle'); { const t0 = Date.now(); while (!tapped && Date.now() - t0 < 2800) await sleep(40); }
  // 3. накал: сундук взлетает над кругом, раскручивается и трясётся всё сильнее, лучи света бьют вверх
  root.classList.remove('idle'); root.classList.add('charge'); sfx.play('upgrade'); await sleep(1500);
  // 4. взрыв света: вспышка, волна, крышка открыта, искры и предметы разлетаются
  root.classList.remove('charge'); root.classList.add('burst', 'quake'); sfx.play('win');
  const cols = ['#fff6c0', '#ffd24a', '#fff', c.color, RC], n = rar === 'l' ? 74 : rar === 'e' ? 58 : 44;
  for (let i = 0; i < n; i++) {
    const s = el('i', i % 3 === 0 ? 'st' : ''), a = Math.random() * Math.PI * 2, d = 110 + Math.random() * Math.min(window.innerWidth, 520) * 0.55;
    s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d * 0.85 - 30 + 'px'); s.style.setProperty('--c', cols[i % cols.length]); s.style.setProperty('--t', 0.7 + Math.random() * 0.7 + 's'); s.style.animationDelay = Math.random() * 0.12 + 's';
    sparks.appendChild(s);
  }
  { const [x0, y0] = cx(); layer.style.setProperty('--x0', x0 + 'px'); layer.style.setProperty('--y0', y0 * 0.82 + 'px');
    const pool = c.table.slice().sort(() => Math.random() - 0.5).slice(0, 9);
    pool.forEach((r, i) => setTimeout(() => { const side = (i % 2 ? 1 : -1) * (40 + Math.random() * 130); fling(layer, rowPic(r), side, 0); }, 60 + i * 70)); }
  await wait(900);
  // 5. главная добыча поднимается над сундуком
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
