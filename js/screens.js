// Экраны меню: Кузница душ и Достижения (иконки в стиле WC3).
import * as D from './data.js?v=20261029182712';
import { uiIcon } from './env.js?v=20261029182712';
import { glyphIcon, iconUrl, bareGlyphUrl, PALETTE, PERK_GLYPH, ACH_GLYPH } from './icons.js?v=20261029182712';
import { towerIcon, econIcon } from './ui.js?v=20261029182712';
import { PERKS, perkCost, buyPerk, ACH, itemUnlocked, unlockItem, slotsOf, buySlot } from './meta.js?v=20261029182712';
import { fillPlates, trophyPlate, gemIc } from './res.js?v=20261029182712';
import { ACH_IMG, SHOP_IMG } from './iconmap.js?v=20261029182712';
import { url as imgUrl } from './sprites.js?v=20261029182712';
import { Wallet } from './wallet.js?v=20261029182712';

const PERK_FILE = { treasury: 'treasury', fortress: 'fortress', taxes: 'taxes', temper: 'temper', aim: 'aim', merchant: 'merchant', builder: 'luck', spells: 'spells', rhythm: 'rhythm', caller: 'caller' };      // файл иконки каждого дара (img/ui/ic/perk_<файл>.webp); «Бережливость» — рука с монетой
const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const SOUL = (n = 28) => `<img class="si" src="${bareGlyphUrl('soul', n)}" alt="">`;
const SOULBG = ['#8ab8ff', '#10284a'];
const GEM = (n = 18) => gemIc(n);

export function renderForge(save, sfx, onChange, openShop) {
  fillPlates($('#forge-souls'), save, openShop);
  const box = $('#perks'); box.innerHTML = '';
  // ежедневный подарок: плашка в самом верху кузницы
  { const db = $('#dailybox'); db.innerHTML = '';
    const ready = Wallet.dailyReady(), streak = Wallet.online ? (save.streak || 0) : ((save.daily || {}).streak || 0), claimed = ready ? streak % 7 : streak;
    const card = el('div', 'sh-card daily'); card.appendChild(el('div', 'sh-h', `<img class="sh-ic cutg" src="${bareGlyphUrl(SHOP_IMG.daily, 64)}" alt="">Ежедневный подарок`));
    const row = el('div', 'days');
    D.DAILY.forEach((g, i) => row.appendChild(el('div', 'day' + (i < claimed ? ' got' : i === claimed && ready ? ' now' : ''), `<small>день ${i + 1}</small><img class="si" src="${bareGlyphUrl('soul', 22)}" alt=""><b>${g}</b>${i < claimed ? '<i class="ck"></i>' : ''}`)));
    card.appendChild(row);
    const b = el('button', 'btn big' + (ready ? '' : ' poor'), ready ? `Забрать +${D.DAILY[claimed]}` : 'Приходи завтра');
    b.onclick = async () => { if (!ready) { sfx.play('error'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; } const r = await Wallet.daily(); if (r && r.ok) { sfx.play('upgrade'); onChange(); } else { sfx.play('error'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } };
    card.appendChild(b); db.appendChild(card); }
  for (const p of PERKS) {
    const lv = save.perks[p.id] || 0, max = lv >= p.max, cost = max ? 0 : perkCost(p, lv);
    const row = el('div', 'frow' + (max ? ' max' : ''));
    const pips = Array.from({ length: p.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
    row.innerHTML = `<img class="fi" src="${PERK_FILE[p.id] ? imgUrl('ui/ic/perk_' + PERK_FILE[p.id] + '.webp') : iconUrl(glyphIcon(p.icon, { size: 96, bg: PALETTE.perk, frame: 'gold' }))}" alt=""><div class="ft"><div class="fn">${p.name}<span class="pips">${pips}</span></div><div class="fd">${p.per}</div><div class="fnow${lv ? '' : ' zero'}">Сейчас: <b>${lv ? p.now(lv) : '0'}</b></div></div>`;
    const b = el('button', 'fbuy' + (!max && save.souls < cost ? ' poor' : ''), max ? 'МАКС' : `${SOUL(18)}${cost}`);
    if (!max) b.onclick = () => { const r = buyPerk(save, p.id); if (r === true) { sfx.play('upgrade'); onChange(); } else { sfx.play('error'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } };
    row.appendChild(b); box.appendChild(row);
  }
  const fail = (b) => { sfx.play('error'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); };
  // слоты: сколько зданий можно взять в бой (в начале 2, максимум 5)
  const sbx = $('#slotsbox'); sbx.innerHTML = '';
  { const n = slotsOf(save), row = el('div', 'frow' + (n >= D.SLOT_MAX ? ' max' : '')), pips = Array.from({ length: D.SLOT_MAX }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
    row.innerHTML = `<img class="fi cutg" src="${bareGlyphUrl('shield', 52)}" alt=""><div class="ft"><div class="fn">Слоты в бою<span class="pips">${pips}</span></div><div class="fd">Сколько зданий и башен берёшь на уровень: ${n} из ${D.SLOT_MAX}</div></div>`;
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
    const icon = D.TOWERS[t] ? towerIcon(t, 1, null, null) : econIcon(t, 1);
    const row = el('div', 'frow' + (open ? ' max' : ''));
    row.innerHTML = `<img class="fi" src="${iconUrl(icon)}" alt=""><div class="ft"><div class="fn">${d.name}</div><div class="fd">${d.short}${D.comboText(d) ? `<small class="fc">${D.comboText(d)}</small>` : ''}</div></div>`;
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
  // кристаллы: платёж через Telegram Stars; здесь они нужны для того, что игрок получит сразу
  const top = el('div', 'frow'); top.innerHTML = `<img class="fi" src="${bareGlyphUrl('gem', 40)}" alt=""><div class="ft"><div class="fn">Кристаллы</div></div>`;
  const tb = el('button', 'fbuy gem', 'Пополнить'); tb.onclick = () => { sfx.play('click'); openShop && openShop(); }; top.appendChild(tb); ub.prepend(top);
  // премиум-башни: только за кристаллы
  const pb = $('#premium'); pb.innerHTML = '';
  for (const id of D.PREMIUM_ORDER) {
    const d = D.TOWERS[id], own = !!save.unlocked[id], row = el('div', 'frow' + (own ? ' max' : ''));
    row.innerHTML = `<img class="fi" src="${iconUrl(towerIcon(id, 1, null, null))}" alt=""><div class="ft"><div class="fn">${d.name}</div><div class="fd">${d.short}${D.comboText(d) ? `<small class="fc">${D.comboText(d)}</small>` : ''}</div></div>`;
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
