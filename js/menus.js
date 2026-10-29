// Экраны вне боя: стартовый, карта кампании (рисованная карта мира), выбор сложности (карусель), рейтинговый забег, таблицы лидеров.
import { WEEKLY, WEEKLY_LEVEL, weeklyState, weekLeft, leftText } from './weekly.js?v=20261029182134';
import { LANGS, setLang, lang as curLang } from './i18n.js?v=20261029182134';
import * as D from './data.js?v=20261029182134';
import * as M from './meta.js?v=20261029182134';
import { glyphIcon, iconUrl, bareGlyphUrl, PALETTE } from './icons.js?v=20261029182134';
import { url as imgUrl } from './sprites.js?v=20261029182134';
import { Net } from './net.js?v=20261029182134';
import { towerIcon, econIcon, itemChips, itemCard } from './ui.js?v=20261029182134';
import { fillPlates, gemIc } from './res.js?v=20261029182134';
import { gemHtml } from './gem3d.js?v=20261029182134';
import { Wallet } from './wallet.js?v=20261029182134';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const x = (v) => (Math.round(v * 100) / 100).toString().replace('.', ',');
export const clock = (t) => { t = Math.max(0, Math.floor(t)); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), q = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(q).padStart(2, '0'); };
export const MAP_W = 1376, MAP_H = 768;
const P = (p) => [p[0], p[1] + 8];           // координаты рубежей заданы в пикселях картинки карты; +8 — иконка стоит чуть выше якоря
// дороги нарисованы на самой карте: здесь опорные точки по ним (пиксели картинки), по которым подсвечиваем пройденный путь
const ROADS = {
  'tut>g1': [[185, 666], [240, 672], [290, 655], [312, 641]],
  'g1>g2a': [[312, 641], [285, 610], [250, 585], [219, 567]],
  'g1>g2b': [[312, 641], [340, 635], [380, 615], [420, 600], [472, 598]],
  'g2a>g3': [[219, 567], [230, 550], [245, 535], [270, 515], [290, 495], [316, 483]],
  'g3>f1': [[316, 483], [280, 465], [230, 445], [195, 435], [172, 423]],
  'f1>f2a': [[172, 423], [205, 400], [245, 390], [285, 365], [310, 346]],
  'f2a>f2b': [[310, 346], [255, 330], [225, 315], [210, 290], [180, 275], [146, 273]],
  'f2a>f3': [[310, 346], [350, 360], [390, 380], [430, 400], [460, 410], [479, 413]],
  'f3>d1': [[479, 413], [540, 420], [600, 422], [663, 423]],
  'd1>d2a': [[663, 423], [700, 447], [767, 477], [843, 489]],
  'd2a>d2b': [[843, 489], [900, 453], [950, 447], [987, 430], [990, 395]],
  'd2b>d3': [[990, 395], [967, 373], [933, 350], [895, 340]],
  'd3>i1': [[895, 340], [867, 335], [833, 328], [800, 317], [767, 300], [733, 280], [717, 250], [729, 227]],
  'i1>i2a': [[729, 227], [712, 212], [677, 187], [625, 165], [597, 147], [559, 129]],
  'i2a>i2b': [[545, 129], [520, 138], [470, 150], [420, 146], [385, 125], [373, 104]],
  'i2b>i3': [[373, 104], [345, 108], [335, 125], [350, 167], [397, 197], [444, 217]],
  'i1>h1': [[729, 227], [763, 230], [800, 218], [830, 190], [850, 162]],
  'h1>h1b': [[850, 162], [905, 150], [940, 141], [968, 133]],
  'h1b>h2': [[968, 133], [1000, 125], [1030, 118], [1060, 113]],
  'h2>h3': [[1060, 113], [1105, 100], [1135, 85], [1148, 74]],
};
const SC = () => imgUrl('ui/score_cut.webp');
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
export function runRow(r, cls = 'brow', ctx = null) {
  const meU = Net.me(), box = el('div', 'rwrap' + (r.rank >= 1 && r.rank <= 3 ? ' top' + r.rank : '')), d = el('div', `${cls} rrow` + (meU && r.tg_id === meU.id ? ' me' : ''));
  d.appendChild(el('div', `rk${r.rank <= 3 ? ' r' + r.rank : ''}`, r.rank)); d.appendChild(avatar(r.photo_url || r.photo, r.name, r.tg_id));
  d.appendChild(el('div', 'nm', `${String(r.name).replace(/</g, '&lt;')}${r.username ? `<small>@${r.username}</small>` : ''}`));
  d.appendChild(el('div', 'rs', r.score || r.wave ? `<img src="${SC()}" alt="">${fmt(r.score)}` : '—'));
  const arrow = el('button', 'rarr', '<i></i>'); arrow.setAttribute('aria-label', 'Подробнее'); d.appendChild(arrow);
  const items = String(r.loadout || '').split(',').filter((t) => D.TOWERS[t] || D.ECON[t]);
  const more = el('div', 'rmore', `<div class="rslots">${items.length ? items.map((t) => `<img src="${iconUrl(D.TOWERS[t] ? towerIcon(t, 1, null, null) : econIcon(t, 1))}" alt="" title="${(D.TOWERS[t] || D.ECON[t]).name}">`).join('') : '<span class="rnone">набор неизвестен</span>'}</div>
    <div class="rinfo">${r.lv ? `<div class="rl"><b>${r.lv}</b><small>${lvName(r.lv)}</small></div>` : `<div class="rl${ctx && ctx.total && r.wave >= ctx.total ? ' full' : ''}"><b>${r.wave || '–'}${ctx && ctx.total ? `/${ctx.total}` : ''}</b><small>волн пройдено</small></div>`}<div class="rt"><img src="${bareGlyphUrl('hourglass', 18)}" alt="">${r.duration ? clock(r.duration) : '—'}<small>${r.lv ? 'время забега' : 'время'}</small></div></div>`);
  arrow.onclick = () => { box.classList.toggle('open'); };
  box.append(d, more); return box;
}

// строки «модификаторов» сложности — всё, что реально меняется в бою (как в Diablo)
export function diffLines(d, i) {
  const L = [];
  const mul = (v) => '×' + x(v);
  L.push({ k: 'horde', icon: 'horde', t: 'Размер орд', v: d.horde > 1 ? mul(d.horde) : 'обычный', cls: d.horde > 1 ? 'bad' : 'neutral', s: d.horde > 1 ? 'Больше врагов в каждой волне' : 'Состав волн по умолчанию' });
  if (d.tier) L.push({ k: 'tier', icon: 'dmg', t: 'Сильные виды врагов', v: d.tier >= 8 ? 'с первых карт' : d.tier >= 5 ? 'намного раньше' : 'раньше', cls: 'bad', s: 'Монстры из середины и конца игры выходят уже на ранних уровнях' });
  L.push({ k: 'elite', icon: 'crown', t: 'Элитные враги', v: d.elite ? Math.round(d.elite * 100) + '%' : 'нет', cls: d.elite ? 'bad' : 'neutral', s: d.elite ? `Золотая аура: здоровье ×${x(d.eliteHp)}, скорость +${Math.round((d.eliteSpd - 1) * 100)}%, награда ×2` : 'Золотых элит в волнах нет' });
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
    $('#b-ranked .tk').src = imgUrl('ui/icon_skull_cut.webp');
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
    { const NAMES = ['Экономия', 'Авто', 'Плавно'], b = el('button', 'btn perf', NAMES[st.perf ?? 1]); b.onclick = () => { st.perf = ((st.perf ?? 1) + 1) % 3; b.textContent = NAMES[st.perf]; c.sfx.play('click'); save(); }; row('Плавность боя', '', b); }
    row('Подтверждать выход из боя', 'Telegram спросит перед закрытием', toggle(() => st.confirm, (v) => { st.confirm = v; }));
    body.appendChild(el('div', 'sect-title', 'Друзья'));
    { const r = el('div', 'srow inv'); r.innerHTML = `<img class="sr-ic" src="${imgUrl('ui/ic/friend.webp')}" alt=""><div class="lb">Пригласить друга<small>За каждого друга по твоей ссылке: +3 кристалла</small></div>`;
      const inv = el('button', 'btn', 'Позвать'); inv.onclick = () => { c.sfx.play('click'); if (!Net.invite()) c.note('Ссылка на игру ещё не задана'); };
      r.appendChild(inv); body.appendChild(r); }
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
    map.style.width = Math.round(MAP_W * f) + 'px'; map.style.height = Math.round(H) + 'px'; map.style.setProperty('--lvh', Math.round(H) + 'px');
    if (!img.src) img.src = imgUrl('ui/worldmap.webp');
    this.f = f;
    // подписи секторов
    const secs = $('#sectors'); secs.innerHTML = '';
    // подписей регионов на карте нет
    // дороги между рубежами
    const cv = $('#worldcv'); cv.width = MAP_W; cv.height = MAP_H; const g = cv.getContext('2d'); g.clearRect(0, 0, MAP_W, MAP_H);
    for (const l of D.MAPS) for (const a of l.after) {
      const pts = ROADS[a + '>' + l.id]; if (!pts) continue;               // дорога между рубежами: пунктир поверх нарисованной на карте; открытая ярче, закрытая тише
      const open = M.levelUnlocked(s, l), q = pts.map((v) => P(v));
      const trace = () => { g.beginPath(); g.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length - 1; i++) g.quadraticCurveTo(q[i][0], q[i][1], (q[i][0] + q[i + 1][0]) / 2, (q[i][1] + q[i + 1][1]) / 2); g.lineTo(q[q.length - 1][0], q[q.length - 1][1]); g.stroke(); };
      g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([]);
      if (open) { g.strokeStyle = 'rgba(255,200,70,.34)'; g.lineWidth = 20; trace(); }                       // тёплое свечение открытого пути
      g.strokeStyle = open ? 'rgba(28,14,4,.78)' : 'rgba(10,8,8,.6)'; g.lineWidth = 12; trace();             // тёмная подложка: точки читаются на любом фоне
      g.setLineDash([0.5, 16]); g.strokeStyle = open ? '#fff6c4' : 'rgba(228,220,196,.82)'; g.lineWidth = 8; trace(); g.setLineDash([]);
    }
    // рубежи: маленькие тихие медальоны на нарисованных площадках; подробности — в плашке по нажатию
    this.closeLevel(); const nodes = $('#nodes'); nodes.innerHTML = '';
    for (const l of D.MAPS) {
      if (l.weekly) continue;                                   // недельный уровень — отдельный узел ниже
      const unlocked = M.levelUnlocked(s, l), cleared = M.levelCleared(s, l.id);
      const state = !unlocked ? 'locked' : cleared ? 'cleared' : 'avail';
      const glyph = state === 'locked' ? 'skulllock' : state === 'cleared' ? 'flag' : 'dmg';
      const bg = state === 'locked' ? PALETTE.lock : state === 'cleared' ? PALETTE.special : PALETTE.danger;
      const frame = state === 'locked' ? 'dark' : state === 'cleared' ? 'nature' : 'blood';
      const nsrc = l.tutorial ? iconUrl(glyphIcon('book', { bg, frame })) : imgUrl(`ui/ic/sec_${l.sector}_${state}.webp`);          // у каждого сектора своя эмблема: закрыт / открыт / пройден
      const n = el('button', `node ${state}${l.tutorial ? ' tutnode' : ''}`, `<img class="ni" src="${nsrc}" alt="">${state === 'locked' ? '' : `<div class="nl">${l.name}</div>`}`);
      n.dataset.id = l.id;
      const lp = P(l.pos); n.style.left = (lp[0] / MAP_W) * 100 + '%'; n.style.top = (lp[1] / MAP_H) * 100 + '%';
      n.onclick = (e) => { e.stopPropagation(); if (state === 'locked') { c.sfx.play('error'); n.classList.remove('shake'); void n.offsetWidth; n.classList.add('shake'); return; } c.sfx.play('select'); if (l.tutorial) { c.startLevel(l.id, 1); return; } if (this.lpId === l.id) this.closeLevel(); else this.openLevel(l.id); };
      nodes.appendChild(n);
    }
    { // недельный уровень: отдельная площадка вне дорог, с обратным отсчётом до конца недели
      const ws = weeklyState(s), wl = WEEKLY_LEVEL, lp = P(wl.pos);
      const n = el('button', `node weekly${ws.done ? ' wkdone' : ''}`, `<img class="ni" src="${imgUrl(`ui/ic/wk_${wl.sector}.webp`)}" alt=""><div class="nl wkl"></div>`);
      n.dataset.id = wl.id; n.style.left = (lp[0] / MAP_W) * 100 + '%'; n.style.top = (lp[1] / MAP_H) * 100 + '%';
      n.onclick = (e) => { e.stopPropagation(); c.sfx.play('select'); this.openLevel(wl.id); };
      nodes.appendChild(n);
      const lab = n.querySelector('.wkl'), tick = () => { if (!lab.isConnected) { clearInterval(this._wkNode); return; } const l = weekLeft(); lab.textContent = (weeklyState(s).done ? 'Новый через ' : 'Ещё ') + (l.d ? `${l.d}д ${l.h}ч` : `${l.h}ч ${l.m}м`); };
      tick(); clearInterval(this._wkNode); this._wkNode = setInterval(tick, 30000);
    }
    map.onclick = (e) => { if (!e.target.closest('#lvp')) this.closeLevel(); };            // тап по пустому месту карты закрывает плашку
    // прокрутка к текущему рубежу
    const target = D.MAPS.find((l) => l.id === focus) || D.CAMPAIGN.find((l) => M.levelUnlocked(s, l) && !M.levelCleared(s, l.id)) || D.CAMPAIGN[D.CAMPAIGN.length - 1];
    requestAnimationFrame(() => { const tp = P(target.pos); sc.scrollLeft = Math.max(0, tp[0] * f - sc.clientWidth / 2); sc.scrollTop = Math.max(0, tp[1] * f - sc.clientHeight / 2); });
  }
  fitWorld() { /* размер карты считается в buildWorld */ }

  // ───── плашка уровня рядом с рубежом ─────
  lvOpen() { return !!this.lpId; }
  closeLevel(quiet) {
    const was = !!this.lpId; this.lpId = null; this.diffSeq++; clearInterval(this._wkPlate);
    if (this.lpEl) { this.lpEl.remove(); this.lpEl = null; }
    document.querySelectorAll('#nodes .node.sel').forEach((n) => n.classList.remove('sel'));
    return was;
  }
  openLevel(levelId) {
    const l = D.MAPS.find((q) => q.id === levelId), s = this.save, c = this.c;
    this.closeLevel(); const seq = ++this.diffSeq;
    this.lpId = levelId; if (c.warm) c.warm(levelId, l.weekly ? WEEKLY.diff : undefined);              // пока игрок смотрит плашку, готовим листы врагов и фон карты
    const map = $('#worldmap'), sc = $('#worldscroll'), f = this.f || 1;
    document.querySelectorAll('#nodes .node').forEach((n) => n.classList.toggle('sel', n.dataset.id === levelId));
    const wk = !!l.weekly, wkDone = wk && weeklyState(s).done;       // кровавый уровень недели: своя плашка, сразу «Ночной кошмар»
    const diff = this.startDiff(l.id);      // результаты на плашке — по сложности, с которой обычно открывается уровень
    const wrap = el('div', 'lvp'); wrap.id = 'lvp'; this.lpEl = wrap;
    const card = el('div', 'lvp-card'), go = el('button', 'btn big lvp-go', 'Начать');
    wrap.append(card, go); map.appendChild(wrap);
    wrap.onclick = (e) => { e.stopPropagation(); if (e.target.closest('.rarr')) setTimeout(() => place(false), 0); };      // раскрыли строку — плашка могла вырасти, подвинем, чтобы не вылезала за экран
    go.onclick = () => { c.sfx.play('click'); if (wkDone) { c.sfx.play('error'); return; } this.closeLevel(); if (wk) c.startLevel(l.id, WEEKLY.diff, true); else this.openDiff(l.id); };      // дальше — экран выбора сложности
    const SECT = { grave: 'Погост', forest: 'Лес', desert: 'Пустыня', ice: 'Лёд', hell: 'Ад' };
    const nameEsc = (t) => String(t).replace(/</g, '&lt;');
    const lp = P(l.pos), nx = lp[0] * f, ny = lp[1] * f;
    // плашка всегда целиком в видимой части карты: вертикаль считаем от верха видимой области, а не от верха всей картинки
    const vh = sc.clientHeight || 600, mh = parseFloat(map.style.height) || MAP_H * f;
    let vTop = sc.scrollTop; if (ny < vTop + 50 || ny > vTop + vh - 50) vTop = Math.max(0, Math.min(mh - vh, ny - vh / 2));      // рубеж у края экрана — сначала подвозим его к середине
    const place = (scroll) => {
      card.style.maxHeight = Math.max(200, vh - go.offsetHeight - 28) + 'px';
      const mw = MAP_W * f, W = wrap.offsetWidth, H = wrap.offsetHeight;
      let left = nx + 30, side = 'r'; if (left + W > mw - 4) { left = nx - 30 - W; side = 'l'; }
      left = Math.max(4, left); const top = Math.max(vTop + 8, Math.min(vTop + vh - H - 8, ny - 44));
      wrap.style.left = left + 'px'; wrap.style.top = top + 'px'; wrap.dataset.side = side; wrap.style.setProperty('--ay', Math.max(18, Math.min(H - 70, ny - top)) + 'px');
      if (scroll) {
        const x0 = Math.min(left, nx - 26), x1 = Math.max(left + W, nx + 26), vw = sc.clientWidth;
        const tx = x1 - x0 <= vw ? x0 - (vw - (x1 - x0)) / 2 : x0;
        sc.scrollTo({ left: Math.max(0, tx), top: vTop, behavior: 'smooth' });
      }
    };
    let data = { top: null, me: null, friends: null, loaded: false };
    const render = () => {
      if (wk) {
        card.innerHTML = `<div class="lvp-h"><div class="lvp-t"><b>${l.name}</b><small>${SECT[l.sector] || ''} · рубеж ${l.lvl}</small></div></div>
          <div class="wk"><div class="wk-t">Кровавый уровень недели</div>
          <div class="wk-r"><span><img src="${bareGlyphUrl('soul', 26)}" alt="" style="width:26px;height:26px"><b>${WEEKLY.souls}</b></span><span>${gemHtml(26)}<b>${WEEKLY.gems}</b></span></div>
          <div class="wk-c">${wkDone ? 'Пройден: награда получена' : `Только «${D.DIFFS[WEEKLY.diff].name}»: одна жизнь, враги крепче`}</div>
          <div class="wk-time"><small>${wkDone ? 'Новый уровень откроется через' : 'Уровень закроется через'}</small><b></b></div></div>`;
        const tb = card.querySelector('.wk-time b'), upd = () => { if (tb.isConnected) tb.textContent = leftText(weekLeft()); };
        upd(); clearInterval(this._wkPlate); this._wkPlate = setInterval(upd, 20000);
        go.textContent = wkDone ? 'Пройден' : 'Начать'; go.classList.toggle('poor', wkDone);
        place(false); return;
      }
      const d = D.DIFFS[diff], best = M.bestScore(s, l.id, diff), my = data.me, meU = Net.me(), ctx = { total: l.waves };
      const wv = (n) => `<span class="${n >= l.waves ? 'wfull' : ''}">волна ${n}/${l.waves}</span>`;
      const items = my && my.loadout ? String(my.loadout).split(',').filter((t) => D.TOWERS[t] || D.ECON[t]) : [];
      const mine = best || my ? `<div class="lvp-me"><div class="lvp-sc"><img src="${SC()}" alt=""><b>${fmt(Math.max(best, my ? my.score : 0))}</b>${my && my.rank ? `<span class="lvp-rk">место #${my.rank}</span>` : ''}</div>
          ${my && (my.duration || my.wave) ? `<div class="lvp-meta">${my.wave ? wv(my.wave) : ''}${my.wave && my.duration ? ' · ' : ''}${my.duration ? `<img src="${bareGlyphUrl('hourglass', 14)}" alt="">${clock(my.duration)}` : ''}</div>` : ''}
          ${items.length ? `<div class="lvp-set">${items.map((t) => `<img src="${iconUrl(D.TOWERS[t] ? towerIcon(t, 1, null, null) : econIcon(t, 1))}" alt="" title="${(D.TOWERS[t] || D.ECON[t]).name}">`).join('')}</div>` : ''}</div>`
        : `<div class="lvp-none">Не пройдено на этой сложности</div>`;
      card.innerHTML = `<div class="lvp-h"><div class="lvp-t"><b>${l.name}</b><small>${SECT[l.sector] || ''} · рубеж ${l.lvl}</small></div></div>
                <div class="lvp-st">Лучший результат</div>${mine}
        <div class="lvp-st">Лучшие игроки</div><div class="lvp-top"></div>
        <div class="lvp-st">Друзья</div><div class="lvp-fr"></div>`;
      // топ-3
      const tb = card.querySelector('.lvp-top');
      if (!Net.enabled) tb.innerHTML = '<div class="trow empty">Нет связи</div>';
      else if (!data.loaded) tb.innerHTML = '<div class="skel"></div>'.repeat(3);
      else { tb.innerHTML = ''; for (let k = 0; k < 3; k++) { const r = data.top && data.top[k]; if (!r) { tb.appendChild(el('div', 'trow empty', '—')); continue; } tb.appendChild(runRow({ ...r, rank: k + 1 }, 'trow', ctx)); } }
      // друзья
      const fb = card.querySelector('.lvp-fr'), fr = data.friends;
      if (!Net.enabled || !Net.canSubmit()) fb.innerHTML = '<div class="trow empty">Друзья доступны в Telegram</div>';
      else if (!data.loaded) fb.innerHTML = '<div class="skel"></div>'.repeat(2);
      else if (!fr || fr.length < 2) { fb.innerHTML = '<div class="lvp-hint">Здесь будут твои друзья и твоё место среди них. Пригласить друга можно в настройках.</div>'; }
      else {
        fr.slice(0, 6).forEach((r, k) => fb.appendChild(runRow({ ...r, rank: k + 1 }, 'trow', ctx)));
      }
      place(false);
    };
    const load = () => {
      const mySeq = seq, myDiff = diff;
      const ok = () => mySeq === this.diffSeq && myDiff === diff;
      const done = () => { if (!ok()) return; data.loaded = true; render(); };
      if (!Net.enabled) { data.loaded = true; return; }
      let left = 3; const fin = () => { if (--left === 0) done(); };
      Net.levelBoard(l.id, diff, 0, 3).then((r) => { if (ok()) data.top = r; }).catch(() => {}).then(fin);
      (Net.me() ? Net.levelRank(l.id, diff) : Promise.resolve(null)).then((r) => { if (ok() && r) data.me = r; }).catch(() => {}).then(fin);
      Net.levelFriends(l.id, diff).then((r) => { if (ok()) data.friends = r; }).catch(() => {}).then(fin);
    };
    render(); place(true); if (!wk) load();
  }

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
      card.innerHTML = `<div class="dport"><div class="arch dic"><img src="${imgUrl('ui/ic/diffc_' + i + '.webp')}" alt=""></div>
          <div class="dname">${d.name}</div>
          ${best ? `<div class="dbest"><img src="${SC()}" alt="">${fmt(best)}</div>` : ''}
        </div>
        ${unlocked ? '' : `<div class="dlock"><img src="${bareGlyphUrl('lock', 72)}" alt=""><span>Откроется после победы на сложности «${D.DIFFS[Math.max(0, i - 1)].name}»</span></div>`}
        <div class="dbody"><div class="dsub">Испытания</div>${rows}</div>
        `;
      const foot = el('div', 'dfoot', '<button class="btn big play">Играть</button>');           // кнопка стоит под плитой, а не поверх прокручиваемого текста
      const col = el('div', 'dcol'); col.append(card, foot);
      foot.querySelector('.play').onclick = () => { if (!unlocked) { c.sfx.play('error'); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); return; } c.sfx.play('click'); c.startLevel(l.id, i); };
      car.appendChild(col); card.col = col; return card;
    });
    const dots = $('#ddots'); dots.innerHTML = D.DIFFS.map(() => '<i></i>').join('');
    let cur = -1;
    const setCur = () => {
      const mid = car.scrollLeft + car.clientWidth / 2; let best = 0, bd = 1e9;
      cards.forEach((cd, i) => { const d = Math.abs(cd.col.offsetLeft + cd.col.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
      if (best === cur) return; cur = best;
      cards.forEach((cd, i) => { cd.classList.toggle('cur', i === best); cd.col.classList.toggle('cur', i === best); });
      [...dots.children].forEach((d, i) => d.classList.toggle('on', i === best)); dots.style.setProperty('--c', D.DIFFS[best].color);
      $('#d-prev').disabled = best === 0; $('#d-next').disabled = best === cards.length - 1;
    };
    const go = (i, smooth = true) => { i = Math.max(0, Math.min(cards.length - 1, i)); const cd = cards[i].col; car.scrollTo({ left: cd.offsetLeft - (car.clientWidth - cd.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' }); };
    let raf = 0; car.onscroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(setCur); };
    $('#d-prev').onclick = () => { c.sfx.play('click'); go(cur - 1); }; $('#d-next').onclick = () => { c.sfx.play('click'); go(cur + 1); };
    const start = this.startDiff(l.id);
    this.show('#diffsheet');
    requestAnimationFrame(() => { go(start, false); setCur(); });
  }
  // сложность, с которой открываем уровень: где играли в последний раз; иначе самая высокая пройденная; иначе первая
  startDiff(levelId) {
    const s = this.save; let start = 0;
    const ld = (s.lastDiff || {})[levelId];
    if (Number.isInteger(ld) && ld >= 0 && ld < D.DIFFS.length) start = ld;
    else if (s.last && s.last.level === levelId && Number.isInteger(s.last.diff)) start = s.last.diff;
    else D.DIFFS.forEach((d, i) => { if (M.diffCleared(s, levelId, i)) start = i; });
    return start;
  }

  // ───── рейтинговый забег ─────
  openRanked() {
    const c = this.c, s = this.save, body = $('#rankedbody'), seq = ++this.diffSeq;
    const d = D.DIFFS[4], n = D.CAMPAIGN.length;
    const row = (icon, t, sm, v, cls = 'neutral') => `<div class="mrow ${cls}"><img src="${bareGlyphUrl(icon, 24)}" alt=""><div class="mt">${t}${sm ? `<small>${sm}</small>` : ''}</div><b>${v}</b></div>`;
    const best = s.rank && s.rank.lv ? s.rank : null;
    const slotsHtml = best && best.loadout ? best.loadout.split(',').filter((t) => D.TOWERS[t] || D.ECON[t]).map((t) => `<img src="${iconUrl(D.TOWERS[t] ? towerIcon(t, 1, null, null) : econIcon(t, 1))}" alt="" title="${(D.TOWERS[t] || D.ECON[t]).name}">`).join('') : '';
    const bestHtml = best ? `<div class="rk-best"><div class="bt">Твой лучший забег</div><div class="rkb">
        <div class="lvrow"><b class="big">${best.lv}</b><span>уровень<b>${lvName(best.lv)}</b></span></div>
        <div class="two"><div><img src="${bareGlyphUrl('hourglass', 26)}" alt=""><span>время забега<b>${clock(best.time)}</b></span></div><div><img src="${SC()}" alt=""><span>очки<b>${fmt(best.score)}</b></span></div></div>
        ${slotsHtml ? `<div class="slots">${slotsHtml}</div>` : ''}</div>
        ${best.fast ? `<div class="bf"><img src="${bareGlyphUrl('hourglass', 20)}" alt="">Весь путь пройден за <b>${clock(best.fast)}</b></div>` : ''}<div class="br" id="rk-myrank"></div></div>` : '';
    body.innerHTML = `<div class="slab rk-slab" style="--c:#b08ad8"><div class="arch"><img src="${imgUrl('ui/icon_skull_cut.webp')}" alt=""></div>
      <h3 class="carve">Один забег — все рубежи</h3><p class="carvep">Весь путь от первого уровня до последнего без остановки. В таблицу попадает самый далёкий уровень, время и очки.</p>
      ${bestHtml}
      <div class="rk-rules">
        ${row('flag', 'Рубежей подряд', 'Все уровни кампании по порядку, общий таймер на весь забег', n)}
        ${row('skull', 'Сложность', `«${d.name}»: враги крепче ×${x(d.hp)}, быстрее на ${Math.round((d.spd - 1) * 100)}%, орды ×${x(d.horde)}, ${Math.round(d.elite * 100)}% элитных`, '', 'bad').replace('<b></b>', `<b>${d.name}</b>`)}
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
      if (!lo.sel.some((t) => D.ECON[t])) { this.c.sfx.play('error'); $('#lo-slots').classList.remove('shake'); void $('#lo-slots').offsetWidth; $('#lo-slots').classList.add('shake'); this.c.note('Возьми хотя бы одно здание добычи: без золота не построить оборону'); return; }      // без ресурсного здания золота нет совсем
      this.c.sfx.play('click'); this.hide('#loadout'); lo.onGo(lo.sel, [...lo.bsel]);
    };
    this.refreshLoadout(); this.show('#loadout'); $('#loadout').scrollTop = 0;
  }
  refreshLoadout() {
    const lo = this.lo; if (!lo) return; const s = this.save, c = this.c, shake = (e) => { c.sfx.play('error'); e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); };
    const open = (t) => (lo.all ? !D.isPremium(t) : M.itemUnlocked(s, t));
    lo.sel = lo.sel.filter((t) => open(t)).slice(0, lo.slots);
    $('#lo-title').textContent = lo.title; $('#lo-back').style.visibility = lo.nobackBtn ? 'hidden' : '';
    const icon = (t) => iconUrl(D.TOWERS[t] ? towerIcon(t, 1, null, null) : econIcon(t, 1));
    const nameOf = (t) => (D.TOWERS[t] || D.ECON[t]).name;
    // слоты
    const sb = $('#lo-slots'); sb.innerHTML = '';
    for (let i = 0; i < D.SLOT_MAX; i++) {
      const t = lo.sel[i];
      if (i >= lo.slots) { const b = el('button', 'los lock', `<img src="${bareGlyphUrl('lock', 48)}" alt="">`); b.onclick = () => { shake(b); c.openForge(); }; sb.appendChild(b); }
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
        const b = el('button', 'loc' + (isOpen ? '' : ' locked') + (idx >= 0 ? ' on' : '') + (lo.info === t ? ' info' : ''), `<img class="ci" src="${icon(t)}" alt=""><div class="cn">${nameOf(t)}</div><div class="cc">${!isOpen && prem ? `${gemIc(14)}<span>${D.PREMIUM[t].gems}</span>` : `<img src="${bareGlyphUrl('coins', 14)}" alt=""><span>${cost}</span>`}</div>${prem ? '<i class="crn"></i>' : ''}${isOpen ? `<i class="chk${idx >= 0 ? ' on' : ''}"></i>` : ''}${isOpen ? '' : `<div class="lk"><img src="${bareGlyphUrl('lock', 48)}" alt=""></div>`}`);
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
    section('Добыча', D.ECON_ORDER); section('Башни', D.TOWER_ORDER); if (!lo.all) section('Премиум', D.PREMIUM_ORDER);
    if (lo.boosts) this.boostsSection(gb, shake);
    // описание выбранной карточки
    const inf = $('#lo-info'), t = lo.info;
    if (!t) inf.innerHTML = `<span class="lo-hint">Слоты: ${lo.sel.length}/${lo.slots}. ${lo.sel.some((q) => D.ECON[q]) ? 'Выбери здания для уровня' : 'Нужно хотя бы одно здание добычи'}</span>`;
    else {
      const d = D.TOWERS[t] || D.ECON[t], u = D.unlockOf(t), isOpen = open(t);
      inf.innerHTML = itemCard(t);
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
