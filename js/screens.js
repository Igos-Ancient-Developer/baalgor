// Экраны меню: Кузница душ и Достижения (иконки в стиле WC3).
import * as D from './data.js';
import { uiIcon } from './env.js';
import { glyphIcon, iconUrl, bareGlyphUrl, PALETTE, PERK_GLYPH, ACH_GLYPH } from './icons.js';
import { towerIcon, econIcon } from './ui.js';
import { PERKS, perkCost, buyPerk, ACH, itemUnlocked, unlockItem, slotsOf } from './meta.js';
import { fillPlates, trophyPlate, gemIc } from './res.js';
import { ACH_IMG } from './iconmap.js';
import { Wallet } from './wallet.js';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const SOUL = (n = 28) => `<img class="si" src="${bareGlyphUrl('soul', n)}" alt="">`;
const SOULBG = ['#8ab8ff', '#10284a'];
const GEM = (n = 18) => gemIc(n);

export function renderForge(save, sfx, onChange, openShop) {
  fillPlates($('#forge-souls'), save, openShop);
  const box = $('#perks'); box.innerHTML = '';
  for (const p of PERKS) {
    const lv = save.perks[p.id] || 0, max = lv >= p.max, cost = max ? 0 : perkCost(p, lv);
    const row = el('div', 'frow' + (max ? ' max' : ''));
    const pips = Array.from({ length: p.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
    row.innerHTML = `<img class="fi" src="${iconUrl(glyphIcon(PERK_GLYPH[p.id], { bg: PALETTE.perk, frame: max ? 'gold' : 'silver' }))}" alt=""><div class="ft"><div class="fn">${p.name}<span class="pips">${pips}</span></div><div class="fd">${p.per}</div></div>`;
    const b = el('button', 'fbuy' + (!max && save.souls < cost ? ' poor' : ''), max ? 'МАКС' : `${SOUL(18)}${cost}`);
    if (!max) b.onclick = () => { const r = buyPerk(save, p.id); if (r === true) { sfx.play('upgrade'); onChange(); } else { sfx.play('error'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } };
    row.appendChild(b); box.appendChild(row);
  }
  const fail = (b) => { sfx.play('error'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); };
  // слоты: сколько зданий можно взять в бой (в начале 2, максимум 5)
  const sbx = $('#slotsbox'); sbx.innerHTML = '';
  { const n = slotsOf(save), row = el('div', 'frow' + (n >= D.SLOT_MAX ? ' max' : '')), pips = Array.from({ length: D.SLOT_MAX }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
    row.innerHTML = `<img class="fi" src="${iconUrl(glyphIcon('tower', { bg: PALETTE.tower, frame: 'gold' }))}" alt=""><div class="ft"><div class="fn">Слоты в бою<span class="pips">${pips}</span></div><div class="fd">Сколько зданий и башен берёшь на уровень: ${n} из ${D.SLOT_MAX}</div></div>`;
    if (n >= D.SLOT_MAX) row.appendChild(el('div', 'fbuy', 'МАКС'));
    else {
      const c = D.SLOT_COST[n], box = el('div', 'fbuys');
      const b1 = el('button', 'fbuy' + (save.souls < c.souls ? ' poor' : ''), `${SOUL(18)}${c.souls}`); b1.onclick = () => { if (buySlot(save, 'souls') === true) { sfx.play('win'); onChange(); } else fail(b1); };
      const b2 = el('button', 'fbuy gem' + ((save.gems || 0) < c.gems ? ' poor' : ''), `${GEM()}${c.gems}`); b2.onclick = async () => { const r = await Wallet.spend('slot', null, c.gems); if (r && r.ok) { sfx.play('win'); onChange(); } else { fail(b2); if (r && r.error === 'gems') openShop && setTimeout(openShop, 400); } };
      box.append(b1, b2); row.appendChild(box);
    }
    sbx.appendChild(row); }
  const ub = $('#unlocks'); ub.innerHTML = '';
  for (const t of [...D.TOWER_ORDER, ...D.ECON_ORDER]) {
    const u = D.unlockOf(t); if (!u) continue;
    const d = D.TOWERS[t] || D.ECON[t], open = itemUnlocked(save, t);
    const icon = D.TOWERS[t] ? towerIcon(t, 1, null, null) : econIcon(t, 3);
    const row = el('div', 'frow' + (open ? ' max' : ''));
    row.innerHTML = `<img class="fi" src="${iconUrl(icon)}" alt=""><div class="ft"><div class="fn">${d.name}</div><div class="fd">${d.short}</div></div>`;
    if (open) row.appendChild(el('div', 'fbuy', '✓'));
    else {
      const box = el('div', 'fbuys');
      const b1 = el('button', 'fbuy' + (save.souls < u.souls ? ' poor' : ''), `${SOUL(18)}${u.souls}`);
      b1.onclick = () => { if (unlockItem(save, t, 'souls') === true) { sfx.play('win'); onChange(); } else fail(b1); };
      const b2 = el('button', 'fbuy gem' + ((save.gems || 0) < u.gems ? ' poor' : ''), `${GEM()}${u.gems}`);
      b2.onclick = async () => { const r = await Wallet.spend('unlock', t, u.gems); if (r && r.ok) { sfx.play('win'); onChange(); } else { fail(b2); if (r && r.error === 'gems') openShop && setTimeout(openShop, 400); } };
      box.append(b1, b2); row.appendChild(box);
    }
    ub.appendChild(row);
  }
  // пополнение донат-монет: платёж через Telegram Stars подключается на стороне бота
  const top = el('div', 'frow'); top.innerHTML = `<img class="fi" src="${bareGlyphUrl('gem', 40)}" alt=""><div class="ft"><div class="fn">Донат-кристаллы</div><div class="fd">Открывают закрытые башни, здания и слоты сразу. Покупаются за ⭐ Telegram Stars</div></div>`;
  const tb = el('button', 'fbuy gem', 'Купить'); tb.onclick = () => { sfx.play('click'); openShop && openShop(); }; top.appendChild(tb); ub.prepend(top);
  // премиум-башни: только за кристаллы
  const pb = $('#premium'); pb.innerHTML = '';
  for (const id of D.PREMIUM_ORDER) {
    const d = D.TOWERS[id], own = !!save.unlocked[id], row = el('div', 'frow' + (own ? ' max' : ''));
    row.innerHTML = `<img class="fi" src="${iconUrl(towerIcon(id, 1, null, null))}" alt=""><div class="ft"><div class="fn">${d.name}</div><div class="fd">${d.short}</div></div>`;
    if (own) row.appendChild(el('div', 'fbuy', '✓')); else { const b = el('button', 'fbuy gem' + ((save.gems || 0) < D.PREMIUM[id].gems ? ' poor' : ''), `${GEM()}${D.PREMIUM[id].gems}`); b.onclick = async () => { const r = await Wallet.spend('unlock', id, D.PREMIUM[id].gems); if (r && r.ok) { sfx.play('win'); onChange(); } else { fail(b); if (r && r.error === 'gems') openShop && setTimeout(openShop, 400); } }; row.appendChild(b); }
    pb.appendChild(row);
  }
}

export function renderAchs(save) {
  const done = ACH.filter((a) => save.ach[a.id]).length;
  $('#achs-count').className = 'rps'; $('#achs-count').innerHTML = trophyPlate(`${done}/${ACH.length}`);
  const box = $('#achlist'); box.innerHTML = '';
  const ctx = { run: {}, life: save.life, save };
  const list = [...ACH].sort((a, b) => (save.ach[a.id] ? 1 : 0) - (save.ach[b.id] ? 1 : 0));
  for (const a of list) {
    const got = !!save.ach[a.id]; const v = Math.min(a.goal, a.val(ctx)); const showBar = a.goal > 1 && !got;
    const row = el('div', 'arow' + (got ? ' got' : ''));
    const ico = iconUrl(glyphIcon(ACH_IMG[a.id] || ACH_GLYPH[a.id] || 'trophy', { size: 96, bg: got ? PALETTE.ach : PALETTE.lock, frame: got ? 'gold' : 'dark' }));
    row.innerHTML = `<img class="ai" src="${ico}" alt=""><div class="at"><div class="an">${a.name}</div><div class="ad">${a.desc}</div>${showBar ? `<div class="bar"><u style="width:${Math.round((v / a.goal) * 100)}%"></u></div><div class="bt">${v.toLocaleString('ru-RU')} / ${a.goal.toLocaleString('ru-RU')}</div>` : ''}</div><div class="ar">${SOUL(16)}+${a.reward}</div>`;
    box.appendChild(row);
  }
}
