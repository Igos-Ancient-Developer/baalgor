// Магазин: ежедневный подарок, стартовый набор (один раз), премиум-башни за кристаллы, пакеты кристаллов за Telegram Stars.
// Приёмы, которые тут работают на повторные покупки: первая покупка каждого пакета даёт ×2, ярлыки «Хит» и «Лучшая цена»,
// серия подарков на 7 дней, постоянные траты кристаллов (слоты, закрытые здания, премиум, усилители с растущей ценой).
import * as D from './data.js?v=20261029172153';
import { Wallet } from './wallet.js?v=20261029172153';
import { fillPlates, gemIc } from './res.js?v=20261029172153';
import { towerIcon } from './ui.js?v=20261029172153';
import { iconUrl, bareGlyphUrl, glyphIcon } from './icons.js?v=20261029172153';
import { SHOP_IMG } from './iconmap.js?v=20261029172153';
import { CHESTS, CHEST_ORDER, buyChests, openChests, stockOf, refreshStock, playOpening, oddsOf, chestHtml, chestImg, topPrizes, freeChestReady, claimFreeChest, freeChestIn } from './chests.js?v=20261029172153';
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

  // ── сундуки: покупка про запас (1 / 5 / 10 за раз), склад, открытие одного или всех разом ──
  body.appendChild(el('div', 'sect-title', 'Сундуки'));
  const cg = el('div', 'sh-chests');
  ctrl._chestQty = ctrl._chestQty || {};
  const openLoop = async (kind) => {
    for (;;) {
      const r = await openChests(save, kind, 1);
      if (!r || !r.ok) { ctrl.sfx.play('error'); ctrl.note('Не получилось, попробуй ещё раз'); redraw(); return; }
      ctrl.persist(); const left = stockOf(save, kind);
      const again = await playOpening(kind, r.loots[0], ctrl, { again: left > 0 ? { label: `Ещё один · осталось ${left}` } : null });
      redraw(); if (!again) return;
    }
  };
  // бесплатный деревянный сундук раз в сутки: забрал и сразу открыл
  { const ready = freeChestReady(save), fr = el('div', 'freech' + (ready ? '' : ' off'));
    fr.innerHTML = `<img src="${chestImg('wood')}" alt=""><b>Бесплатный сундук</b>`;
    const b = el('button', 'btn chb go' + (ready ? '' : ' poor'), ready ? 'Забрать' : freeChestIn(save) > 1 ? `Через ${freeChestIn(save)} дн.` : 'Завтра');
    b.onclick = async () => { if (!ready) { fail(b); return; } if (claimFreeChest(save)) { ctrl.persist(); await openLoop('wood'); } };
    fr.appendChild(b); cg.appendChild(fr); }
  ctrl._chestQty = ctrl._chestQty || {};
  for (const kind of CHEST_ORDER) {
    const c = CHESTS[kind], card = el('div', 'chcard ' + c.theme), have = stockOf(save, kind), qty = ctrl._chestQty[kind] || 1;
    card.innerHTML = `<div class="chart">${chestHtml(c.theme)}<b class="chstock${have ? '' : ' zero'}">${have}</b></div><div class="chn">${c.name}</div><div class="chd">В наличии: <b>${have}</b><div class="chtop">${topPrizes(kind).map((x) => `<i style="--c:${x.col}"><img src="${x.pic}" alt=""></i>`).join('')}</div></div>`;
    const buy = el('div', 'chbtns');
    const afterBuy = (r, b) => { if (r && r.ok) { ctrl.sfx.play('upgrade'); ctrl.persist(); redraw(); } else { const e = r && r.error; ctrl.sfx.play('error'); ctrl.note(e === 'gems' ? 'Не хватает кристаллов' : e === 'souls' ? 'Не хватает душ' : 'Не получилось, попробуй ещё раз'); if (e === 'gems') $('#shop-packs').scrollIntoView({ behavior: 'smooth' }); fail(b); } };
    const stp = el('div', 'chstep'), dec = el('button', 'sa', '‹'), num = el('b', 'sn', String(qty)), inc = el('button', 'sa', '›'); stp.append(dec, num, inc); buy.appendChild(stp);
    const prices = [];
    const setQ = (q) => { q = Math.max(1, Math.min(50, q)); ctrl._chestQty[kind] = q; num.textContent = q; dec.disabled = q <= 1; inc.disabled = q >= 50; prices.forEach(([b, v, ic]) => { b.innerHTML = `${ic}${fmt(v * q)}`; }); };
    if (c.souls) { const b = el('button', 'btn chb'); b.onclick = async () => { b.disabled = true; afterBuy(await buyChests(save, kind, 'souls', ctrl._chestQty[kind]), b); b.disabled = false; }; prices.push([b, c.souls, `<img src="${bareGlyphUrl('soul', 22)}" alt="">`]); buy.appendChild(b); }
    { const b = el('button', 'btn chb gem'); b.onclick = async () => { b.disabled = true; afterBuy(await buyChests(save, kind, 'gems', ctrl._chestQty[kind]), b); b.disabled = false; }; prices.push([b, c.gems, gemIc(22)]); buy.appendChild(b); }
    dec.onclick = () => { ctrl.sfx.play('click'); setQ((ctrl._chestQty[kind] || 1) - 1); }; inc.onclick = () => { ctrl.sfx.play('click'); setQ((ctrl._chestQty[kind] || 1) + 1); }; setQ(qty);
    const op = el('div', 'chbtns open');
    const o1 = el('button', 'btn chb go', `Открыть <b class="chstock in">${have}</b>`);
    o1.onclick = () => openLoop(kind);
    if (have) op.appendChild(o1);
    card.append(buy); if (have) card.append(op);
    const odds = el('div', 'chodds hidden'); odds.innerHTML = oddsOf(kind).map(([t, p, r, pic]) => `<div class="od r-${r}"><img src="${pic}" alt=""><span>${t}</span><b>${p}%</b></div>`).join('');
    card.querySelector('.chart').onclick = () => { odds.classList.toggle('hidden'); ctrl.sfx.play('click'); };       // шансы: по нажатию на сам сундук
    card.append(odds); cg.appendChild(card);
  }
  body.appendChild(cg);
  if (!ctrl._stockT || Date.now() - ctrl._stockT > 20000) { ctrl._stockT = Date.now(); refreshStock(save).then(() => { if (!$('#shop').classList.contains('hidden')) redraw(); }); }

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

  // ── кристаллы за Telegram Stars: внизу, как валюта ──
  const t = el('div', 'sect-title', 'Кристаллы'); t.id = 'shop-packs'; body.appendChild(t);
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

  $('#shop').scrollTop = keep;
}
