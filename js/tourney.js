// Турнир недели: рейтинговый забег с обнулением каждый понедельник 00:00 UTC (supabase/tourney.sql). Здесь — состояние с сервера,
// шапка таблицы лидеров (отсчёт до итогов, пьедестал 2–1–3 с призами, награды за остальные места) и окно приза прошлой недели.
// Пока на сервере нет ключа tourney_from, сервер отвечает on: false и игра турнир не показывает.
import { Net } from './net.js?v=20261109142430';
import { weekLeft } from './weekly.js?v=20261109142430';
import { chestImg } from './chests.js?v=20261109142430';
import { url as imgUrl } from './sprites.js?v=20261109142430';

const IC = (n) => imgUrl('ui/ic/' + n + '.webp');
const esc = (s) => String(s).replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'));
export const CHEST_NAME = { gold: 'Золотой сундук', silver: 'Серебряный сундук', wood: 'Деревянный сундук' };
const GIFT_NAME = { up: 'Главный подарок Telegram', big: 'Подарок Telegram', small: 'Подарок Telegram' };
// призы за 1–3 место (как в private.tourney_settle)
const PODIUM = { 1: { gift: 'up', chest: 'gold' }, 2: { gift: 'big', chest: 'silver' }, 3: { gift: 'small', chest: 'silver' } };

let state = null, stateT = 0;
export async function tourneyState(force = false) {
  if (!Net.enabled) return null;
  if (!force && state && Date.now() - stateT < 30000) return state;
  const r = await Net.tourneyMe(); if (r && r.ok) { state = r; stateT = Date.now(); }
  return state;
}
export const tourneyOn = () => !!(state && state.on);
export const tourneyCached = () => state;

// отсчёт до итогов: дни отдельно (букву «д» переводит словарь), остальное часы:минуты:секунды
export function countdown(now = Date.now()) {
  const l = weekLeft(now), s = Math.floor(l.ms / 1000) % 60, p = (n) => String(n).padStart(2, '0');
  return { d: l.d, t: `${p(l.h)}:${p(l.m)}:${p(s)}`, short: l.d ? `${l.d}д ${l.h}ч` : `${l.h}ч ${l.m}м`, ms: l.ms };
}
const clockHtml = () => { const c = countdown(); return `${c.d ? `<b>${c.d}</b><small>д</small>` : ''}<b>${c.t}</b>`; };
// часы тикают, пока элемент на экране; в конце недели — onEnd (перечитать таблицу)
export function tickClock(box, onEnd) {
  const t = setInterval(() => {
    if (!box.isConnected) { clearInterval(t); return; }
    box.innerHTML = clockHtml();
    if (countdown().ms <= 0) { clearInterval(t); setTimeout(() => onEnd && onEnd(), 4000); }
  }, 1000);
}

// коробка подарка Telegram (рисуется кодом): 1 место — золотая с фиолетовой лентой и искрами, 2 — красная, 3 — синяя
export function giftSvg(kind) {
  const [a, b, r, r2] = kind === 'up' ? ['#ffe27a', '#b8780a', '#a46bff', '#5a22c8'] : kind === 'big' ? ['#ff6a78', '#8a1424', '#ffe27a', '#c08a10'] : ['#6ab4ff', '#174a9a', '#ffe27a', '#c08a10'];
  const spark = (x, y, s) => `<path d="M${x} ${y - s}L${x + s * 0.28} ${y - s * 0.28}L${x + s} ${y}L${x + s * 0.28} ${y + s * 0.28}L${x} ${y + s}L${x - s * 0.28} ${y + s * 0.28}L${x - s} ${y}L${x - s * 0.28} ${y - s * 0.28}Z" fill="#fff8d0"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
    <linearGradient id="r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${r2}"/><stop offset=".45" stop-color="${r}"/><stop offset="1" stop-color="${r2}"/></linearGradient></defs>
    <g stroke="#1a0d06" stroke-width="2" stroke-linejoin="round">
      <path d="M22 20C14 8 6 14 12 19C15 22 21 21 30 21Z" fill="url(#r)"/><path d="M42 20C50 8 58 14 52 19C49 22 43 21 34 21Z" fill="url(#r)"/>
      <rect x="10" y="31" width="44" height="27" rx="3" fill="url(#g)"/><rect x="7" y="22" width="50" height="11" rx="3" fill="url(#g)"/>
      <rect x="28" y="22" width="8" height="36" fill="url(#r)"/><circle cx="32" cy="21" r="4.5" fill="url(#r)"/></g>
    <rect x="12" y="34" width="14" height="3" rx="1.5" fill="#fff" opacity=".35"/><rect x="9" y="24" width="17" height="2.5" rx="1.2" fill="#fff" opacity=".45"/>
    ${kind === 'up' ? spark(8, 10, 5) + spark(57, 30, 4) + spark(50, 6, 3) : ''}</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// шапка таблицы лидеров турнира: отсчёт, пьедестал, награды за остальные места
export function tourneyHead() {
  const col = (p) => {
    const z = PODIUM[p];
    return `<div class="pd p${p}"><div class="pd-prize"><img class="pd-chest" src="${chestImg(z.chest)}" alt=""><img class="pd-gift" src="${giftSvg(z.gift)}" alt=""></div>
      <div class="pd-names"><span>${GIFT_NAME[z.gift]}</span><span>${CHEST_NAME[z.chest]}</span></div>
      <div class="pd-block"><img class="pd-medal" src="${IC('cont_m' + p)}" alt=""><div class="pd-who">—</div></div></div>`;
  };
  return `<div class="tn"><div class="tn-cd"><span>Итоги турнира через</span><div class="tn-clock">${clockHtml()}</div></div>
    <div class="tn-pod">${col(2)}${col(1)}${col(3)}</div>
    <div class="tn-rest">
      <div class="tr"><b>4–10</b><img src="${chestImg('silver')}" alt=""><span>Серебряный сундук</span></div>
      <div class="tr"><b>50%</b><img src="${chestImg('wood')}" alt=""><span>Деревянный сундук верхней половине таблицы</span></div>
      <div class="tr"><b>100%</b><img src="${IC('loot_souls')}" alt=""><span><em>100</em> душ каждому участнику</span></div>
    </div></div>`;
}
// имена тех, кто сейчас стоит на пьедестале
export function fillPodium(head, rows) {
  for (let p = 1; p <= 3; p++) { const e = head.querySelector(`.pd.p${p} .pd-who`), r = rows && rows[p - 1]; if (e) e.innerHTML = r ? esc(r.name) : '—'; }
}

// окно приза прошлой недели: место, подарок, сундук, души. ok() — после «Забрать»
export function prizeHtml(p) {
  const medal = p.place <= 3 ? IC('cont_m' + p.place) : IC('cont_cup');
  const giftSub = p.gift_status === 'sent' ? 'Уже у тебя в профиле Telegram' : 'Скоро появится в профиле Telegram';
  const line = (img, name, sub) => `<li><img src="${img}" alt=""><span><b>${name}</b><small>${sub}</small></span></li>`;
  return `<img class="of-ic tp-medal" src="${medal}" alt=""><div class="tp-place"><b>#${p.place}</b><small>/ ${p.total}</small></div>
    <ul class="of-list tp-list">${p.gift ? line(giftSvg(p.gift), GIFT_NAME[p.gift], giftSub) : ''}${p.chest ? line(chestImg(p.chest), CHEST_NAME[p.chest], 'Лежит на складе в магазине') : ''}${p.souls ? line(IC('loot_souls'), `+${p.souls}`, 'душ') : ''}</ul>`;
}
