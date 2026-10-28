// Магазин: ежедневный подарок, стартовый набор (один раз), премиум-башни за кристаллы, пакеты кристаллов за Telegram Stars.
// Приёмы, которые тут работают на повторные покупки: первая покупка каждого пакета даёт ×2, ярлыки «Хит» и «Лучшая цена»,
// серия подарков на 7 дней, постоянные траты кристаллов (слоты, закрытые здания, премиум, усилители с растущей ценой).
import * as D from './data.js?v=20261028185043';
import { Wallet } from './wallet.js?v=20261028185043';
import { fillPlates, gemIc } from './res.js?v=20261028185043';
import { towerIcon } from './ui.js?v=20261028185043';
import { iconUrl, bareGlyphUrl, glyphIcon } from './icons.js?v=20261028185043';
import { SHOP_IMG } from './iconmap.js?v=20261028185043';
import { CHESTS, CHEST_ORDER, buyChest, playOpening, oddsOf, chestHtml } from './chests.js?v=20261028185043';
const big = (n, s = 96) => iconUrl(glyphIcon(n, { size: s }));

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const RATE = D.PACKS[0].gems / D.PACKS[0].stars;                   // кристаллов за ⭐ в самом маленьком пакете: от него считаем «+N%»

export function renderShop(save, ctrl, redraw) {
  const body = $('#shopbody'), keep = $('#shop').scrollTop; body.innerHTML = '';
  fillPlates($('#shop-res'), save, null);
  const ok = (r) => r && (r.ok || r.status === 'paid');
  const fail = (b) => { ctrl.sfx.play('error'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); };
  const say = (r) => { const e = r && r.error; ctrl.note(e === 'gems' ? 'Не хватает кристаллов' : e === 'notg' ? 'Покупка доступна внутри Telegram' : e === 'starter_done' ? 'Стартовый набор уже куплен' : e === 'telegram' ? 'Платежи пока не подключены' : 'Не получилось, попробуй ещё раз'); };

  // ── кристаллы за Telegram Stars: главное в магазине ──
  const t = el('div', 'sect-title', 'Кристаллы'); t.id = 'shop-packs'; body.appendChild(t);
  body.appendChild(el('p', 'sh-note top', 'Кристаллы покупаются только за Telegram Stars. На них открываются здания, слоты, премиум-башни и усилители уровня.'));
  const grid = el('div', 'sh-packs list');
  D.PACKS.forEach((p) => {
    const first = !(save.packs || []).includes(p.id), got = p.gems * (first ? D.FIRST_BONUS : 1);
    const row = el('div', 'krow' + (p.tag ? ' ' + p.tag : ''));
    row.innerHTML = `<div class="kl">${gemIc(30)}<b>${first ? `<s>${fmt(p.gems)}</s> ` : ''}${fmt(got)}</b>${first ? '<span class="x2">×2 за первую покупку</span>' : ''}${p.tag === 'hit' ? '<span class="tag">Хит</span>' : p.tag === 'best' ? '<span class="tag gold">Лучшая цена</span>' : ''}</div>`;
    const b = el('button', 'btn buy', `⭐ ${p.stars}`);
    b.onclick = async () => { b.disabled = true; const r = await Wallet.buy(p); b.disabled = false; if (ok(r)) { ctrl.sfx.play('win'); ctrl.note(`+${fmt(got)} кристаллов`); redraw(); } else if (r.status !== 'cancelled') { say(r); fail(b); } };
    row.appendChild(b); grid.appendChild(row);
  });
  body.appendChild(grid);

  // ── сундуки: лутбокс с анимацией; шансы показываются по кнопке ──
  body.appendChild(el('div', 'sect-title', 'Сундуки'));
  body.appendChild(el('p', 'sh-note top', 'В сундуках души, кристаллы, здания и редкие премиум-башни. Что падает чаще всего — написано на карточке, полные шансы — по кнопке «Шансы».'));
  const MAIN = { wood: 'Чаще всего: 90–175 душ. Иногда здания', silver: 'Чаще всего: 23–57 кристаллов. Здания средней редкости', gold: 'Лучшая добыча: до 400 кристаллов, редкие башни' };
  const cg = el('div', 'sh-chests');
  for (const kind of CHEST_ORDER) {
    const c = CHESTS[kind], card = el('div', 'chcard ' + c.theme);
    card.innerHTML = `<div class="chart">${chestHtml(c.theme)}</div><div class="chn">${c.name}</div><div class="chd">${MAIN[kind]}</div>`;
    const btns = el('div', 'chbtns');
    const open = async (pay) => {
      for (;;) {
        const r = await buyChest(save, kind, pay);
        if (!r || !r.ok) { const e = r && r.error; ctrl.sfx.play('error'); ctrl.note(e === 'gems' ? 'Не хватает кристаллов' : e === 'souls' ? 'Не хватает душ' : 'Не получилось, попробуй ещё раз'); if (e === 'gems') $('#shop-packs').scrollIntoView({ behavior: 'smooth' }); redraw(); return; }
        ctrl.persist();
        const price = pay === 'souls' ? `${fmt(c.souls)} душ` : `${c.gems} кристаллов`, can = pay === 'souls' ? (save.souls || 0) >= c.souls : (save.gems || 0) >= c.gems;
        const again = await playOpening(kind, r.loot, ctrl, { again: can ? { label: `Ещё раз · ${price}` } : null });
        redraw(); if (!again) return;
      }
    };
    if (c.souls) { const b = el('button', 'btn chb', `<img src="${bareGlyphUrl('soul', 22)}" alt="">${fmt(c.souls)}`); b.onclick = () => { ctrl.sfx.play('click'); open('souls'); }; btns.appendChild(b); }
    const bg = el('button', 'btn chb gem', `${gemIc(22)}${c.gems}`); bg.onclick = () => { ctrl.sfx.play('click'); open('gems'); }; btns.appendChild(bg);
    card.appendChild(btns);
    const odds = el('div', 'chodds hidden'); odds.innerHTML = oddsOf(kind).map(([t, p, r]) => `<div class="od r-${r}"><span>${t}</span><b>${p}%</b></div>`).join('') + '<small>Если выпавшее здание у тебя уже есть, оно заменяется на компенсацию.</small>';
    const tg = el('button', 'chinfo', 'Шансы'); tg.onclick = () => { odds.classList.toggle('hidden'); ctrl.sfx.play('click'); };
    card.append(tg, odds); cg.appendChild(card);
  }
  body.appendChild(cg);

  // ── стартовый набор: один раз ──
  if (!save.starterBought) {
    const worth = Math.round((D.STARTER.gems + D.PREMIUM[D.STARTER.tower].gems) / RATE);
    const card = el('div', 'sh-card starter');
    card.innerHTML = `<div class="rib">Один раз</div><div class="st-top"><img class="st-ic" src="${iconUrl(towerIcon(D.STARTER.tower, 1, null, null, { k: 'shop', size: 96 }))}" alt="">
      <div class="st-t"><b>Стартовый набор</b><ul><li>${gemIc(18)} ${D.STARTER.gems} кристаллов</li><li><img src="${bareGlyphUrl('premium', 18)}" alt=""> ${D.PREMIUM[D.STARTER.tower].name}, навсегда</li><li><img src="${bareGlyphUrl('soul', 18)}" alt=""> ${D.STARTER.souls} душ</li></ul></div></div>
      <div class="st-worth">Выгода: на ${worth} ⭐ товаров за ${D.STARTER.stars} ⭐</div>`;
    const b = el('button', 'btn big buy', `⭐ ${D.STARTER.stars}`);
    b.onclick = async () => { b.disabled = true; const r = await Wallet.buy('starter'); b.disabled = false; if (ok(r)) { ctrl.sfx.play('win'); ctrl.note('Стартовый набор получен'); redraw(); } else if (r.status !== 'cancelled') { say(r); fail(b); } };
    card.appendChild(b); body.appendChild(card);
  }

  // ── премиум-башни ──
  body.appendChild(el('div', 'sect-title', 'Премиум-башни'));
  const pg = el('div', 'sh-prem');
  for (const id of D.PREMIUM_ORDER) {
    const d = D.TOWERS[id], own = !!save.unlocked[id], card = el('div', 'pcard' + (own ? ' own' : ''));
    card.style.setProperty('--c', d.tint);
    card.innerHTML = `<img class="pi" src="${iconUrl(towerIcon(id, 1, null, null, { k: 'shop', size: 96 }))}" alt=""><div class="pn">${d.name}</div><div class="pd">${d.short}</div>`;
    const b = el('button', 'fbuy gem', own ? '✓ Куплено' : `${gemIc(18)}${D.PREMIUM[id].gems}`);
    if (own) b.disabled = true;
    else b.onclick = async () => { const r = await Wallet.spend('unlock', id, D.PREMIUM[id].gems); if (r && r.ok) { ctrl.sfx.play('win'); ctrl.note(`${d.name} открыт`); redraw(); } else { say(r); fail(b); if (r && r.error === 'gems') $('#shop-packs').scrollIntoView({ behavior: 'smooth' }); } };
    card.appendChild(b); pg.appendChild(card);
  }
  body.appendChild(pg);

  // ── ежедневный подарок ──
  { const ready = Wallet.dailyReady(), streak = Wallet.online ? (save.streak || 0) : ((save.daily || {}).streak || 0), claimed = ready ? streak % 7 : streak;
    const card = el('div', 'sh-card daily'); card.appendChild(el('div', 'sh-h', `<img class="sh-ic" src="${big(SHOP_IMG.daily, 64)}" alt="">Ежедневный подарок<small>заходи каждый день: серия 7 дней, последний день — главный приз</small>`));
    const row = el('div', 'days');
    D.DAILY.forEach((g, i) => row.appendChild(el('div', 'day' + (i < claimed ? ' got' : i === claimed && ready ? ' now' : ''), `<small>день ${i + 1}</small><img class="si" src="${bareGlyphUrl('soul', 22)}" alt=""><b>${g}</b>${i < claimed ? '<i class="ck"></i>' : ''}`)));
    card.appendChild(row);
    const b = el('button', 'btn big' + (ready ? '' : ' poor'), ready ? `Забрать +${D.DAILY[claimed]}` : 'Приходи завтра');
    b.onclick = async () => { if (!ready) { fail(b); return; } const r = await Wallet.daily(); if (r && r.ok) { ctrl.sfx.play('upgrade'); ctrl.note(`+${r.reward} душ`); redraw(); } else { say(r); fail(b); } };
    card.appendChild(b); body.appendChild(card); }


  body.appendChild(el('p', 'sh-note', 'Платежи проходят через Telegram Stars. Кристаллы привязаны к твоему аккаунту. Вопросы по покупкам: команда /paysupport у бота, условия: /terms.'));
  $('#shop').scrollTop = keep;
}
