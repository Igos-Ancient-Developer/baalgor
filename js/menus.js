// Экраны вне боя: стартовый, карта кампании (рисованная карта мира), выбор сложности (карусель), рейтинговый забег, таблицы лидеров.
import { LANGS, setLang, lang as curLang } from './i18n.js?v=20261025134940';
import * as D from './data.js?v=20261025134940';
import * as M from './meta.js?v=20261025134940';
import { glyphIcon, iconUrl, bareGlyphUrl, PALETTE } from './icons.js?v=20261025134940';
import { url as imgUrl } from './sprites.js?v=20261025134940';
import { Net } from './net.js?v=20261025134940';
import { towerIcon, econIcon, itemChips } from './ui.js?v=20261025134940';
import { fillPlates, gemIc } from './res.js?v=20261025134940';
import { gemHtml } from './gem3d.js?v=20261025134940';
import { Wallet } from './wallet.js?v=20261025134940';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const x = (v) => (Math.round(v * 100) / 100).toString().replace('.', ',');
export const clock = (t) => { t = Math.max(0, Math.floor(t)); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), q = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(q).padStart(2, '0'); };
export const MAP_W = 1376, MAP_H = 768;
const BASE_W = 1356, BASE_H = 828;           // в этой сетке заданы координаты рубежей и подписей; на картинку переносим пропорционально
const P = (p) => [p[0] * MAP_W / BASE_W, p[1] * MAP_H / BASE_H];
const SC = () => imgUrl('ui/score.webp');
const lvName = (lv) => (D.CAMPAIGN[lv - 1] || {}).name || '';
export const RUN = { level: 'run', diff: 4 };      // рейтинговый забег хранится в таблице как уровень «run» на сложности «Хардкор»
// подписи секторов на карте мира (координаты в пикселях картинки)
const SECTOR_LABELS = { grave: [330, 795], forest: [215, 350], desert: [860, 455], ice: [545, 215], hell: [1055, 238] };

export function avatar(photo, name, id) {
  const init = (name || '?').trim().charAt(0).toUpperCase() || '?';
  const mk = () => { const d = el('div', 'av', init); d.style.background = `hsl(${(Number(id) * 47) % 360} 45% 32%)`; return d; };
  if (!photo) return mk();
  const i = el('img', 'av'); i.style.background = `hsl(${(Number(id) * 47) % 360} 45% 32%)`; i.src = photo; i.alt = ''; i.referrerPolicy = 'no-referrer'; i.onerror = () => i.replaceWith(mk()); return i;
}

// строка таблицы рейтингового забега: аватар, ник и очки; стрелка раскрывает слоты, время и уровень с названием
export function runRow(r, cls = 'brow') {
  const meU = Net.me(), box = el('div', 'rwrap'), d = el('div', `${cls} rrow` + (meU && r.tg_id === meU.id ? ' me' : ''));
  d.appendChild(el('div', `rk${r.rank <= 3 ? ' r' + r.rank : ''}`, r.rank)); d.appendChild(avatar(r.photo_url || r.photo, r.name, r.tg_id));
  d.appendChild(el('div', 'nm', `${String(r.name).replace(/</g, '&lt;')}${r.username ? `<small>@${r.username}</small>` : ''}`));
  d.appendChild(el('div', 'rs', `<img src="${SC()}" alt="">${fmt(r.score)}`));
  const arrow = el('button', 'rarr', '<i></i>'); arrow.setAttribute('aria-label', 'Подробнее'); d.appendChild(arrow);
  const items = String(r.loadout || '').split(',').filter((t) => D.TOWERS[t] || D.ECON[t]);
  const more = el('div', 'rmore', `<div class="rslots">${items.length ? items.map((t) => `<img src="${iconUrl(D.TOWERS[t] ? towerIcon(t, 1, null, null) : econIcon(t, 3))}" alt="" title="${(D.TOWERS[t] || D.ECON[t]).name}">`).join('') : '<span class="rnone">набор неизвестен</span>'}</div>
    <div class="rinfo"><div class="rl"><b>${r.lv || '–'}</b><small>${lvName(r.lv)}</small></div><div class="rt"><img src="${bareGlyphUrl('hourglass', 18)}" alt="">${clock(r.duration || 0)}<small>время забега</small></div></div>`);
  arrow.onclick = () => { box.classList.toggle('open'); };
  box.append(d, more); return box;
}

// строки «модификаторов» сложности — всё, что реально меняется в бою (как в Diablo)
export function diffLines(d, i) {
  const L = [];
  const mul = (v) => '×' + x(v);
  L.push({ k: 'hp', icon: 'heart', t: 'Здоровье врагов', v: mul(d.hp), cls: d.hp > 1 ? 'bad' : d.hp < 1 ? 'good' : 'neutral', s: d.hp < 1 ? 'Враги слабее обычного' : d.hp > 1 ? `Каждый враг крепче на ${Math.round((d.hp - 1) * 100)}%` : 'Базовая прочность' });
  L.push({ k: 'spd', icon: 'fast', t: 'Скорость врагов', v: d.spd > 1 ? '+' + Math.round((d.spd - 1) * 100) + '%' : 'обычная', cls: d.spd > 1 ? 'bad' : 'neutral', s: d.spd > 1 ? 'Быстрее проходят дорогу — меньше времени на урон' : 'Темп по умолчанию' });
  L.push({ k: 'horde', icon: 'horde', t: 'Размер орд', v: d.horde > 1 ? mul(d.horde) : 'обычный', cls: d.horde > 1 ? 'bad' : 'neutral', s: d.horde > 1 ? 'Больше врагов в каждой волне' : 'Состав волн по умолчанию' });
  L.push({ k: 'elite', icon: 'crown', t: 'Элитные враги', v: d.elite ? Math.round(d.elite * 100) + '%' : 'нет', cls: d.elite ? 'bad' : 'neutral', s: d.elite ? 'Золотая аура: здоровье ×1.6, скорость +15%, награда ×2' : 'Золотых элит в волнах нет' });
  L.push({ k: 'lives', icon: 'heart', t: 'Жизни крепости', v: d.lives ? String(d.lives) : String(D.START_LIVES), cls: d.lives ? 'bad' : 'neutral', s: d.lives ? 'Один пропущенный враг — и забег окончен' : 'Враги, дошедшие до ворот, отнимают жизни (тяжёлые — больше). Добавить жизни можно перком «Крепость» в Кузнице и усилителем за кристаллы' });
  L.push({ k: 'sep', t: 'Награды' });
  L.push({ k: 'score', icon: 'star', t: 'Множитель очков', v: mul(d.score), cls: d.score >= 1 ? 'good' : 'bad', s: 'Умножает очки за уровень: волны, сильные враги, время' });
  L.push({ k: 'souls', icon: 'soul', t: 'Души за забег', v: mul(d.souls), cls: d.souls >= 1 ? 'good' : 'bad', s: 'Валюта Кузницы: дары и новые башни' });
  if (d.gold) L.push({ k: 'gold', icon: 'coins', t: 'Золото', v: '+' + Math.round(d.gold * 100) + '%', cls: 'good', s: 'Из всех источников: убийства, рудники, мешки, бонус за вызов волны' });
  return L;
}

export class Menus {
  constructor(ctrl) { this.c = ctrl; this.diffSeq = 0; }
  get save() { return this.c.save; }
  show(id) { $(id).classList.remove('hidden'); }
  hide(id) { $(id).classList.add('hidden'); }

  iconBtn(glyph, { bg = PALETTE.tower, frame = 'gold', badge = null, off = false, onclick } = {}) {
    const b = el('button', 'ibig' + (off ? ' off' : ''), `<img class="ii" src="${iconUrl(glyphIcon(glyph, { bg, frame }))}" alt="">${badge !== null ? `<b>${badge}</b>` : ''}`);
    if (onclick) b.onclick = onclick; return b;
  }
  navButtons(box) {
    const s = this.save, c = this.c;
    box.innerHTML = '';
    box.appendChild(this.iconBtn('trophy', { bg: PALETTE.ach, frame: 'gold', badge: `${Object.keys(s.ach).length}`, onclick: () => c.openAchs() }));
    box.appendChild(this.iconBtn('crown', { bg: ['#ff8a6a', '#4a1008'], frame: 'blood', onclick: () => this.openBoard({ global: true }) }));
  }

  // ───── стартовый экран ─────
  buildTitle() {
    const s = this.save, c = this.c;
    $('#title-logo').src = imgUrl('ui/logo.webp');
    $('#b-ranked .tk').src = imgUrl('ui/icon_skull.webp');
    const me = Net.me() || c.TG.user(), pf = $('#pf'); pf.innerHTML = '';
    pf.appendChild(avatar(me && (me.photo || me.photo_url), me ? (me.name || me.first_name || me.username) : 'Игрок', me ? me.id : 0));
    $('#gem-ic').innerHTML = gemHtml(30, 0, true); $('#gem-n').textContent = (s.gems || 0).toLocaleString('ru-RU');
  }

  // ───── настройки: всё в одном месте ─────
  openSettings() {
    const c = this.c, s = this.save, st = s.set, body = $('#settingsbody');
    const save = () => { c.applySettings(); c.persist(); };
    body.innerHTML = '';
    const row = (label, sub, ctl) => { const r = el('div', 'srow'); r.innerHTML = `<div class="lb">${label}${sub ? `<small>${sub}</small>` : ''}</div>`; r.appendChild(ctl); body.appendChild(r); return r; };
    const toggle = (get, set) => { const b = el('button', 'tgl' + (get() ? ' on' : '')); b.onclick = () => { set(!get()); b.classList.toggle('on', get()); c.sfx.play('click'); save(); }; return b; };
    const slider = (get, set) => { const i = el('input', 'rng'); i.type = 'range'; i.min = 0; i.max = 100; i.value = Math.round(get() * 100); i.oninput = () => { set(i.value / 100); c.applySettings(); }; i.onchange = () => { c.persist(); c.sfx.play('click'); }; return i; };
    body.appendChild(el('div', 'sect-title', 'Звук'));
    row('Звуки', '', toggle(() => c.sfx.sfxOn, () => c.toggleSnd()));
    row('Громкость звуков', '', slider(() => st.sfxVol, (v) => { st.sfxVol = v; }));
    row('Музыка', '', toggle(() => c.sfx.musOn, () => c.toggleMus()));
    row('Громкость музыки', '', slider(() => st.musVol, (v) => { st.musVol = v; }));
    body.appendChild(el('div', 'sect-title', 'Бой'));
    row('Числа над врагами', 'Урон и золото при убийстве', toggle(() => st.dmg, (v) => { st.dmg = v; }));
    row('Подтверждать выход из боя', 'Telegram спросит перед закрытием', toggle(() => st.confirm, (v) => { st.confirm = v; }));
    body.appendChild(el('div', 'sect-title', 'Язык'));
    const grid = el('div', 'langgrid');
    for (const [id, name] of LANGS) { const b = el('button', 'stn' + (id === curLang ? ' on' : ''), `<span>${name}</span>`); b.onclick = () => { if (id === curLang) return; c.sfx.play('click'); setLang(id); }; grid.appendChild(b); }
    body.appendChild(grid);
    this.show('#settings'); $('#settings').scrollTop = 0;
  }

  // ───── карта кампании ─────
  buildWorld(focus) {
    const s = this.save, c = this.c;
    const sc = $('#worldscroll'), map = $('#worldmap'), img = $('#worldimg');
    const H = Math.max(560, Math.min(900, (sc.clientHeight || window.innerHeight - 60) * 1.0)), f = H / MAP_H;
    map.style.width = Math.round(MAP_W * f) + 'px'; map.style.height = Math.round(H) + 'px';
    if (!img.src) img.src = imgUrl('ui/worldmap.webp');
    this.f = f;
    // подписи секторов
    const secs = $('#sectors'); secs.innerHTML = '';
    // подписей регионов на карте нет
    // дороги между рубежами
    const cv = $('#worldcv'); cv.width = MAP_W; cv.height = MAP_H; const g = cv.getContext('2d'); g.clearRect(0, 0, MAP_W, MAP_H);
    for (const l of D.MAPS) for (const a of l.after) {
      const p0 = P(D.MAPS.find((q) => q.id === a).pos), p1 = P(l.pos), open = M.levelUnlocked(s, l);
      const mx = (p0[0] + p1[0]) / 2 + (p1[1] - p0[1]) * 0.12, my = (p0[1] + p1[1]) / 2 - (p1[0] - p0[0]) * 0.12;
      g.lineCap = 'round'; g.setLineDash([]);
      g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineWidth = 13; g.beginPath(); g.moveTo(p0[0], p0[1]); g.quadraticCurveTo(mx, my, p1[0], p1[1]); g.stroke();                       // тёмная подложка
      if (open) { g.strokeStyle = 'rgba(255,214,90,.45)'; g.lineWidth = 11; g.beginPath(); g.moveTo(p0[0], p0[1]); g.quadraticCurveTo(mx, my, p1[0], p1[1]); g.stroke(); }          // тёплое свечение пройденного пути
      g.setLineDash([3, 11]); g.strokeStyle = open ? '#fff4b8' : '#c7cdd3'; g.lineWidth = 7; g.beginPath(); g.moveTo(p0[0], p0[1]); g.quadraticCurveTo(mx, my, p1[0], p1[1]); g.stroke();
    }
    // рубежи
    const nodes = $('#nodes'); nodes.innerHTML = '';
    for (const l of D.MAPS) {
      const unlocked = M.levelUnlocked(s, l), cleared = M.levelCleared(s, l.id);
      const state = !unlocked ? 'locked' : cleared ? 'cleared' : 'avail';
      const glyph = state === 'locked' ? 'skulllock' : state === 'cleared' ? 'flag' : 'dmg';
      const bg = state === 'locked' ? PALETTE.lock : state === 'cleared' ? PALETTE.special : PALETTE.danger;
      const frame = state === 'locked' ? 'dark' : state === 'cleared' ? 'nature' : 'blood';
      const n = el('button', `node ${state}${l.tutorial ? ' tutnode' : ''}`, `<img class="ni" src="${iconUrl(glyphIcon(l.tutorial ? 'book' : glyph, { bg, frame }))}" alt=""><div class="nl">${l.name}</div>${unlocked && !l.tutorial ? `<div class="nsk">${[0, 1, 2, 3, 4].map((i) => `<img class="${M.diffCleared(s, l.id, i) ? 'on' : ''}" src="${bareGlyphUrl('skull', 11)}" alt="">`).join('')}</div>` : ''}`);
      const lp = P(l.pos); n.style.left = (lp[0] / MAP_W) * 100 + '%'; n.style.top = (lp[1] / MAP_H) * 100 + '%';
      n.onclick = () => { if (state === 'locked') { c.sfx.play('error'); n.classList.remove('shake'); void n.offsetWidth; n.classList.add('shake'); return; } c.sfx.play('select'); if (l.tutorial) { c.startLevel(l.id, 1); return; } this.openDiff(l.id); };
      nodes.appendChild(n);
    }
    // прокрутка к текущему рубежу
    const target = D.MAPS.find((l) => l.id === focus) || D.MAPS.find((l) => M.levelUnlocked(s, l) && !M.levelCleared(s, l.id)) || D.MAPS[D.MAPS.length - 1];
    requestAnimationFrame(() => { const tp = P(target.pos); sc.scrollLeft = Math.max(0, tp[0] * f - sc.clientWidth / 2); sc.scrollTop = Math.max(0, tp[1] * f - sc.clientHeight / 2); });
  }
  fitWorld() { /* размер карты считается в buildWorld */ }

  // ───── выбор сложности: карусель ─────
  openDiff(levelId) {
    const l = D.MAPS.find((q) => q.id === levelId), s = this.save, c = this.c, seq = ++this.diffSeq;
    this.level = l; if (c.warm) c.warm(levelId);              // пока игрок выбирает сложность, готовим листы врагов и фон карты
    $('#ds-title').textContent = l.name;
    const car = $('#dcar'); car.innerHTML = '';
    const cards = D.DIFFS.map((d, i) => {
      const unlocked = M.diffUnlocked(s, l, i), best = M.bestScore(s, l.id, i);
      const rows = diffLines(d, i).map((r) => r.k === 'sep' ? `<div class="dsub">${r.t}</div>` : `<div class="mrow ${r.cls}"><img src="${bareGlyphUrl(r.icon, 24)}" alt=""><div class="mt">${r.t}<small>${r.s}</small></div><b>${r.v}</b></div>`).join('');
      const card = el('div', `dcard${unlocked ? '' : ' locked'}${i === 4 ? ' hc' : ''}`);
      card.style.setProperty('--c', d.color);
      card.innerHTML = `<div class="dport"><div class="arch"><img src="${imgUrl('ui/portrait_' + d.demon + '.webp')}" alt=""></div>
          <div class="dname">${d.name}</div>
          <div class="dskulls">${[0, 1, 2, 3, 4].map((k) => `<img class="${k <= i ? '' : 'off'}" src="${bareGlyphUrl('skull', 22)}" alt="">`).join('')}</div>
          ${best ? `<div class="dbest"><img src="${SC()}" alt="">${fmt(best)}</div>` : ''}
        </div>
        ${unlocked ? '' : `<div class="dlock"><img src="${iconUrl(glyphIcon('skulllock', { size: 96, bg: PALETTE.lock, frame: 'dark' }))}" alt=""><span>Откроется после победы на сложности «${D.DIFFS[Math.max(0, i - 1)].name}»</span></div>`}
        <div class="dbody"><div class="dsub">Испытания</div>${rows}<div class="dsub">Лучшие на этом рубеже</div><div class="dtop">${'<div class="skel"></div>'.repeat(3)}</div></div>
        <div class="dfoot"><button class="btn big play">Играть</button><button class="btn ghost board"><img src="${bareGlyphUrl('crown', 22)}" alt="" style="width:26px;height:26px"></button></div>`;
      card.querySelector('.play').onclick = () => { if (!unlocked) { c.sfx.play('error'); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); return; } c.sfx.play('click'); c.startLevel(l.id, i); };
      card.querySelector('.board').onclick = () => { c.sfx.play('click'); this.openBoard({ level: l.id, diff: i }); };
      car.appendChild(card); return card;
    });
    const dots = $('#ddots'); dots.innerHTML = D.DIFFS.map(() => '<i></i>').join('');
    let cur = -1;
    const setCur = () => {
      const mid = car.scrollLeft + car.clientWidth / 2; let best = 0, bd = 1e9;
      cards.forEach((cd, i) => { const d = Math.abs(cd.offsetLeft + cd.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
      if (best === cur) return; cur = best;
      cards.forEach((cd, i) => cd.classList.toggle('cur', i === best));
      [...dots.children].forEach((d, i) => d.classList.toggle('on', i === best)); dots.style.setProperty('--c', D.DIFFS[best].color);
      $('#d-prev').disabled = best === 0; $('#d-next').disabled = best === cards.length - 1;
    };
    const go = (i, smooth = true) => { i = Math.max(0, Math.min(cards.length - 1, i)); const cd = cards[i]; car.scrollTo({ left: cd.offsetLeft - (car.clientWidth - cd.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' }); };
    let raf = 0; car.onscroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(setCur); };
    $('#d-prev').onclick = () => { c.sfx.play('click'); go(cur - 1); }; $('#d-next').onclick = () => { c.sfx.play('click'); go(cur + 1); };
    // начинаем со сложности, на которой этот уровень играли в последний раз; иначе с самой высокой пройденной; иначе с первой
    let start = 0;
    const ld = (s.lastDiff || {})[l.id];
    if (Number.isInteger(ld) && ld >= 0 && ld < D.DIFFS.length) start = ld;
    else if (s.last && s.last.level === l.id && Number.isInteger(s.last.diff)) start = s.last.diff;
    else D.DIFFS.forEach((d, i) => { if (M.diffCleared(s, l.id, i)) start = i; });
    this.show('#diffsheet');
    requestAnimationFrame(() => { go(start, false); setCur(); });
    // топ-3 каждой сложности (всегда на виду)
    const fill = (tops) => {
      if (seq !== this.diffSeq) return;
      cards.forEach((card, i) => {
        const box = card.querySelector('.dtop'); box.innerHTML = '';
        const rows = (tops && tops[i]) || [];
        for (let k = 0; k < 3; k++) {
          const r = rows[k];
          if (!r) { box.appendChild(el('div', 'trow empty', '—')); continue; }
          const row = el('div', 'trow' + (Net.me() && r.tg_id === Net.me().id ? ' me' : ''));
          row.appendChild(el('div', `rk r${k + 1}`, k + 1)); row.appendChild(avatar(r.photo, r.name, r.tg_id));
          row.appendChild(el('div', 'nm', r.name.replace(/</g, '&lt;'))); row.appendChild(el('div', 'sc', fmt(r.score)));
          box.appendChild(row);
        }
      });
    };
    if (!Net.enabled) fill(null); else Net.levelTops(l.id).then(fill).catch(() => fill(null));
  }

  // ───── рейтинговый забег ─────
  openRanked() {
    const c = this.c, s = this.save, body = $('#rankedbody'), seq = ++this.diffSeq;
    const d = D.DIFFS[4], n = D.CAMPAIGN.length;
    const row = (icon, t, sm, v, cls = 'neutral') => `<div class="mrow ${cls}"><img src="${bareGlyphUrl(icon, 24)}" alt=""><div class="mt">${t}${sm ? `<small>${sm}</small>` : ''}</div><b>${v}</b></div>`;
    const best = s.rank && s.rank.lv ? s.rank : null;
    const slotsHtml = best && best.loadout ? best.loadout.split(',').filter((t) => D.TOWERS[t] || D.ECON[t]).map((t) => `<img src="${iconUrl(D.TOWERS[t] ? towerIcon(t, 1, null, null) : econIcon(t, 3))}" alt="" title="${(D.TOWERS[t] || D.ECON[t]).name}">`).join('') : '';
    const bestHtml = best ? `<div class="rk-best"><div class="bt">Твой лучший забег</div><div class="rkb">
        <div class="lvrow"><b class="big">${best.lv}</b><span>уровень<b>${lvName(best.lv)}</b></span></div>
        <div class="two"><div><img src="${bareGlyphUrl('hourglass', 26)}" alt=""><span>время забега<b>${clock(best.time)}</b></span></div><div><img src="${SC()}" alt=""><span>очки<b>${fmt(best.score)}</b></span></div></div>
        ${slotsHtml ? `<div class="slots">${slotsHtml}</div>` : ''}</div>
        ${best.fast ? `<div class="bf"><img src="${bareGlyphUrl('hourglass', 20)}" alt="">Весь путь пройден за <b>${clock(best.fast)}</b></div>` : ''}<div class="br" id="rk-myrank"></div></div>` : '';
    body.innerHTML = `<div class="slab rk-slab" style="--c:#b08ad8"><div class="arch"><img src="${imgUrl('ui/icon_skull.webp')}" alt=""></div>
      <h3 class="carve">Один забег — все рубежи</h3><p class="carvep">Весь путь от первого уровня до последнего без остановки. В таблицу попадает самый далёкий уровень, время и очки.</p>
      ${bestHtml}
      <div class="rk-rules">
        ${row('flag', 'Рубежей подряд', 'Все уровни кампании по порядку, общий таймер на весь забег', n)}
        ${row('skull', 'Сложность', `«${d.name}»: враги крепче ×${x(d.hp)}, быстрее на ${Math.round((d.spd - 1) * 100)}%, орды ×${x(d.horde)}, ${Math.round(d.elite * 100)}% элитных`, '', 'bad').replace('<b></b>', '<b>Хардкор</b>')}
        ${row('heart', 'Жизнь', 'Один пропущенный враг — забег окончен', '1', 'bad')}
        ${row('coins', 'Золото', 'Из всех источников', '+' + Math.round(d.gold * 100) + '%', 'good')}
        ${row('star', 'Очки', 'За победу над волной, за сильных врагов и за скорость прохождения уровня. Чем дальше уровень, тем больше очков. Итог каждого уровня умножается на сложность', '×' + x(d.score), 'good').replace('mrow good', 'mrow good tokrow').replace(`<img src="${bareGlyphUrl('star', 24)}" alt="">`, `<img src="${SC()}" alt="" class="scimg">`)}
        ${row('tower', 'Слоты', 'Перед каждым уровнем собираешь набор из зданий, которые у тебя открыты. Слоты, открытые башни и дары Кузницы — как в обычной игре', M.slotsOf(s), 'neutral')}
        ${row('gem', 'Редкая награда', 'За рейтинговый забег иногда можно выбить кристаллы', '✦', 'good')}
        ${row('fast', 'Ускорение', 'Скорость игры не меняется. Хочешь быстрее и получить бонус золота — вызывай следующую волну раньше срока кнопкой справа сверху', '', 'neutral').replace('<b></b>', '<b>волны</b>')}
      </div>
      <div class="dsub">Лучшие игроки</div><div class="rk-top">${'<div class="skel"></div>'.repeat(3)}</div></div>
      <div class="rk-actions"><button class="btn big" id="rk-go">В бой</button><button class="btn" id="rk-board">Таблица лидеров</button></div>`;
    $('#rk-go').onclick = () => { c.sfx.play('click'); c.startRun(); };
    $('#rk-board').onclick = () => { c.sfx.play('click'); this.openBoard({ ...RUN, title: 'Рейтинговый забег' }); };
    this.show('#rankedsheet'); $('#rankedsheet').scrollTop = 0;
    if (best && Net.enabled && Net.me()) Net.levelRank(RUN.level, RUN.diff).then((r) => { const e = $('#rk-myrank'); if (r && e && seq === this.diffSeq) e.innerHTML = `<img src="${bareGlyphUrl('crown', 22)}" alt="">Место в мире: <b>#${r.rank}</b>`; }).catch(() => {});
    const box = body.querySelector('.rk-top');
    const fill = (rows) => {
      if (seq !== this.diffSeq) return; box.innerHTML = '';
      for (let k = 0; k < 3; k++) { const r = rows && rows[k]; if (!r) { box.appendChild(el('div', 'trow empty', '—')); continue; } box.appendChild(runRow({ ...r, rank: k + 1 }, 'trow')); }
    };
    if (!Net.enabled) fill(null); else Net.levelBoard(RUN.level, RUN.diff, 0, 3).then(fill).catch(() => fill(null));
  }

  // ───── подготовка к уровню: выбор зданий по слотам ─────
  openLoadout(o) {
    this.lo = { ...o, sel: [...o.initial], info: null, bsel: new Set() };
    $('#lo-go').onclick = () => {
      const lo = this.lo;
      if (!lo.sel.length) { this.c.sfx.play('error'); $('#lo-slots').classList.remove('shake'); void $('#lo-slots').offsetWidth; $('#lo-slots').classList.add('shake'); return; }
      this.c.sfx.play('click'); this.hide('#loadout'); lo.onGo(lo.sel, [...lo.bsel]);
    };
    this.refreshLoadout(); this.show('#loadout'); $('#loadout').scrollTop = 0;
  }
  refreshLoadout() {
    const lo = this.lo; if (!lo) return; const s = this.save, c = this.c, shake = (e) => { c.sfx.play('error'); e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); };
    const open = (t) => (lo.all ? !D.isPremium(t) : M.itemUnlocked(s, t));
    lo.sel = lo.sel.filter((t) => open(t)).slice(0, lo.slots);
    $('#lo-title').textContent = lo.title; $('#lo-back').style.visibility = lo.nobackBtn ? 'hidden' : '';
    const icon = (t) => iconUrl(D.TOWERS[t] ? towerIcon(t, 1, null, null) : econIcon(t, 3));
    const nameOf = (t) => (D.TOWERS[t] || D.ECON[t]).name;
    // слоты
    const sb = $('#lo-slots'); sb.innerHTML = '';
    for (let i = 0; i < D.SLOT_MAX; i++) {
      const t = lo.sel[i];
      if (i >= lo.slots) { const b = el('button', 'los lock', `<img src="${iconUrl(glyphIcon('skulllock', { size: 64, bg: PALETTE.lock, frame: 'dark' }))}" alt="">`); b.onclick = () => { shake(b); c.openForge(); }; sb.appendChild(b); }
      else if (t) { const b = el('button', 'los full', `<img src="${icon(t)}" alt=""><small>${nameOf(t)}</small>`); b.onclick = () => { c.sfx.play('click'); lo.sel.splice(i, 1); this.refreshLoadout(); }; sb.appendChild(b); }
      else sb.appendChild(el('div', 'los empty', '+'));
    }
    // арсенал
    const gb = $('#lo-grid'); gb.innerHTML = '';
    const section = (title, list) => {
      gb.appendChild(el('div', 'sect-title', title));
      const g = el('div', 'lo-cards');
      for (const t of list) {
        const isOpen = open(t), idx = lo.sel.indexOf(t), cost = D.TOWERS[t] ? D.TOWERS[t].cost : D.ECON[t].cost, prem = D.isPremium(t);
        const b = el('button', 'loc' + (isOpen ? '' : ' locked') + (idx >= 0 ? ' on' : '') + (lo.info === t ? ' info' : ''), `<img class="ci" src="${icon(t)}" alt=""><div class="cn">${nameOf(t)}</div><div class="cc">${!isOpen && prem ? `${gemIc(14)}<span>${D.PREMIUM[t].gems}</span>` : `<img src="${bareGlyphUrl('coins', 14)}" alt=""><span>${cost}</span>`}</div>${prem ? '<i class="crn"></i>' : ''}${isOpen ? `<i class="chk${idx >= 0 ? ' on' : ''}"></i>` : ''}${isOpen ? '' : `<div class="lk"><img src="${iconUrl(glyphIcon('skulllock', { size: 64, bg: PALETTE.lock, frame: 'dark' }))}" alt=""></div>`}`);
        b.onclick = () => {
          lo.info = t;
          if (!isOpen) { shake(b); this.refreshLoadout(); return; }
          if (idx >= 0) { c.sfx.play('click'); lo.sel.splice(idx, 1); }
          else if (lo.sel.length < lo.slots) { c.sfx.play('select'); lo.sel.push(t); }
          else { shake($('#lo-slots')); }
          this.refreshLoadout();
        };
        g.appendChild(b);
      }
      gb.appendChild(g);
    };
    section('Башни', D.TOWER_ORDER); if (!lo.all) section('Премиум', D.PREMIUM_ORDER); section('Добыча', D.ECON_ORDER);
    if (lo.boosts) this.boostsSection(gb, shake);
    // описание выбранной карточки
    const inf = $('#lo-info'), t = lo.info;
    if (!t) inf.innerHTML = `<span class="lo-hint">Слоты: ${lo.sel.length}/${lo.slots}. Выбери здания для уровня</span>`;
    else {
      const d = D.TOWERS[t] || D.ECON[t], u = D.unlockOf(t), isOpen = open(t);
      inf.innerHTML = `<div class="lo-i"><b>${d.name}</b><span>${d.short}</span><div class="dch">${itemChips(t)}</div></div>`;
      if (!isOpen && u && u.premium) { const bt = el('button', 'btn gold', `Купить · ${gemIc(18)} ${u.gems}`); bt.onclick = async () => { const r = await Wallet.spend('unlock', t, u.gems); if (r && r.ok) { c.sfx.play('win'); this.refreshLoadout(); } else { shake(bt); c.note(r && r.error === 'gems' ? 'Не хватает кристаллов' : 'Не получилось'); if (r && r.error === 'gems') setTimeout(() => c.openShop(), 500); } }; inf.appendChild(bt); }
      else if (!isOpen && u) { const bt = el('button', 'btn gold', `Открыть в Кузнице · <img src="${bareGlyphUrl('soul', 18)}" alt="" style="width:18px;height:18px">${u.souls}`); bt.onclick = () => c.openForge(); inf.appendChild(bt); }
    }
    $('#lo-go').classList.toggle('poor', !lo.sel.length);
    const cnt = $('#lo-cnt'); cnt.innerHTML = `<img src="${bareGlyphUrl('tower', 22)}" alt=""><b>${lo.sel.length}/${lo.slots}</b>`; cnt.classList.toggle('full', lo.sel.length >= lo.slots);
  }

  // усилители на один уровень: тратят кристаллы каждый раз, цена растёт с глубиной уровня
  boostsSection(gb, shake) {
    const lo = this.lo, s = this.save, c = this.c;
    const head = el('div', 'sect-title', `Усилители на уровень<span class="bal">${gemIc(16)} ${(s.gems || 0).toLocaleString('ru-RU')}</span>`); gb.appendChild(head);
    const list = el('div', 'lo-boosts');
    const glyph = { gold: 'coins', lives: 'heart', souls: 'soul' };
    for (const id of D.BOOST_ORDER) {
      const b = D.BOOSTS[id], blocked = id === 'lives' && lo.diff === 4, price = D.boostPrice(id, lo.lvl), on = lo.bsel.has(id);
      const row = el('button', 'lob' + (on ? ' on' : '') + (blocked ? ' off' : ''), `<img class="bi" src="${bareGlyphUrl(glyph[id], 32)}" alt=""><span class="bt"><b>${b.name}</b><small>${b.short}</small></span><span class="bp">${gemIc(16)}${price}</span><i class="chk${on ? ' on' : ''}"></i>`);
      row.onclick = () => { if (blocked) { shake(row); return; } c.sfx.play('click'); if (on) lo.bsel.delete(id); else lo.bsel.add(id); this.refreshLoadout(); };
      list.appendChild(row);
    }
    gb.appendChild(list);
  }

  // ───── таблицы лидеров ─────
  async openBoard(spec) {
    if (spec.global) spec = { ...RUN, title: 'Мировой рейтинг' };      // мировой рейтинг — только те, кто проходил рейтинговый забег; результаты обычных уровней видны в таблице самого уровня
    const c = this.c, list = $('#boardlist'), me = $('#bd-me'); const seq = (this.boardSeq = (this.boardSeq || 0) + 1);
    const title = spec.title ? spec.title : spec.global ? 'Мировой рейтинг' : `${D.MAPS.find((q) => q.id === spec.level).name} · ${D.DIFFS[spec.diff].name}`;
    $('#bd-title').textContent = title; list.innerHTML = '<div class="skel"></div>'.repeat(8); me.classList.add('hidden'); me.innerHTML = '';
    this.show('#board'); $('#board').scrollTop = 0;
    const meU = Net.me();
    const row = (r) => {
      const d = el('div', 'brow' + (meU && r.tg_id === meU.id ? ' me' : ''));
      d.appendChild(el('div', `rk${r.rank <= 3 ? ' r' + r.rank : ''}`, r.rank)); d.appendChild(avatar(r.photo_url || r.photo, r.name, r.tg_id));
      d.appendChild(el('div', 'nm', `${r.name.replace(/</g, '&lt;')}${r.username ? `<small>@${r.username}</small>` : ''}`));
      d.appendChild(el('div', 'sc', fmt(r.score))); return d;
    };
    const isRun = spec.level === RUN.level && spec.diff === RUN.diff;
    const row2 = (r) => (isRun ? runRow(r) : row(r));
    const empty = (icon) => { list.innerHTML = `<div class="empty-state"><img src="${bareGlyphUrl(icon, 64)}" alt=""></div>`; };
    if (!Net.enabled) { empty('crown'); return; }
    let offset = 0; const LIM = 50;
    const hideDup = () => { if (list.querySelector('.me')) me.classList.add('hidden'); };      // я уже в списке — закреплённая строка внизу не нужна (иначе меня два раза)
    const load = async () => {
      let rows;
      try { rows = spec.global ? await Net.globalBoard(offset, LIM) : await Net.levelBoard(spec.level, spec.diff, offset, LIM); } catch (e) { if (seq === this.boardSeq && !offset) empty('skull'); return; }
      if (seq !== this.boardSeq) return;
      if (!offset) list.innerHTML = '';
      list.querySelector('.more')?.remove();
      if (!rows.length && !offset) { empty('crown'); return; }
      for (const r of rows) list.appendChild(row2(r));
      offset += rows.length; hideDup();
      if (rows.length === LIM) { const more = el('button', 'btn ghost more', '…'); more.onclick = () => { more.textContent = '…'; load(); }; list.appendChild(more); }
    };
    const first = load();
    // моя позиция: только если меня нет среди загруженных строк
    if (meU) {
      try {
        const r = spec.global ? await Net.globalRank() : await Net.levelRank(spec.level, spec.diff);
        await first;
        if (seq === this.boardSeq && r && !list.querySelector('.me')) { me.classList.remove('hidden'); me.innerHTML = ''; me.appendChild(row2({ rank: r.rank, tg_id: meU.id, name: meU.name, username: meU.username, photo: meU.photo, score: r.score, lv: r.lv || (this.save.rank || {}).lv, duration: r.duration || (this.save.rank || {}).time, loadout: r.loadout || (this.save.rank || {}).loadout })); }
      } catch (e) { /* без связи */ }
    }
  }
}
