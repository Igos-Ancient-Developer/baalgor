// Точка входа: загрузка ассетов, навигация (старт → карта → сложность → подготовка → бой), игровой цикл, ввод, сохранения.
import * as D from './data.js';
import * as A from './art.js';
import { Sim } from './sim.js';
import { Gore } from './gore.js';
import { Renderer } from './render.js';
import { GameUI } from './ui.js';
import { Tutorial } from './tutorial.js';
import { Sfx, attachSfx } from './audio.js';
import { TG, defaultSave, defaultSettings, betterRun } from './tg.js';
import { ENEMY_ART, FRAMES, enemyFrame, gibSprite, gibKinds, applyEnemySprites } from './enemies.js';
import { loadSprites } from './sprites.js';
import { bakeMap } from './env.js';
import { levelSpec, MENU_SPEC } from './music.js';
import { Meta, perkMods, lockedItems, nextAfter, tutorialDone, getLoadout, slotsOf } from './meta.js';
import { renderForge, renderAchs } from './screens.js';
import { renderShop } from './shop.js';
import { Wallet } from './wallet.js';
import { Menus, RUN, clock } from './menus.js';
import { Net } from './net.js';
import { bareGlyphUrl, glyphIcon, iconUrl, PALETTE } from './icons.js';

const $ = (s) => document.querySelector(s);
const show = (id) => $(id).classList.remove('hidden');
const hide = (id) => $(id).classList.add('hidden');
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SCORE_ICON = new URL('../img/ui/score.webp', import.meta.url).href;
window.addEventListener('error', (e) => console.error(e.error || e.message));

const STEP = 1 / 60;
const view = { selected: null, armed: null, hover: null, hoverPx: null, spell: null, pending: null, hint: null };
const sfx = new Sfx();
const ctrl = { sim: null, view, sfx, TG };
let save = defaultSave();
let renderer, gore, ui, sim, meta, menus, tutorial, pollT = 0;
let run = null;   // состояние рейтингового забега (null — обычная игра)
let wasFrozen = false, needDraw = false;
let running = false, paused = false, held = false, acc = 0, ending = null, last = 0, diffI = 1, levelIdx = 0, lastHud = '', tally = 0;

// ───────── загрузка ─────────
async function boot() {
  $('#load-logo').src = new URL('../img/ui/logo.webp', import.meta.url).href;
  TG.init();
  if (location.search.includes('debug')) window.__bk = ctrl;
  if (location.search.includes('enemydemo')) import('./demo.js').then((m) => m.enemyDemo(ctrl));
  save = await TG.load(); ctrl.save = save;
  sfx.sfxOn = save.sfx; sfx.musOn = save.mus; applySettings();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  A.setScale(Renderer.pickScale(window.innerWidth, Math.max(300, window.innerHeight - 56), dpr));
  await loadSprites((f) => { $('#loadfill').style.width = Math.round(f * 40) + '%'; });
  applyEnemySprites();
  menus = new Menus(ctrl); ctrl.menus = menus;
  const tasks = [];
  for (const t of D.TOWER_ORDER) for (const [lv, br] of [[1, null], [2, null], [3, null], [4, 'A'], [5, 'A'], [4, 'B'], [5, 'B']]) tasks.push(() => { A.towerBody(t, lv, br); A.towerHead(t, lv, br); });
  for (const t of D.ECON_ORDER) for (let lv = 1; lv <= 5; lv++) tasks.push(() => A.econBody(t, lv));
  for (const t of Object.keys(ENEMY_ART)) { tasks.push(() => { for (let i = 0; i < (ENEMY_ART[t].anims ? 1 : FRAMES); i++) enemyFrame(t, i); }); tasks.push(() => { for (const k of new Set(gibKinds(t))) for (let v = 0; v < 3; v++) gibSprite(t, k, v); }); }
  for (const m of [D.MAPS[D.MAPS.length - 1], ...D.MAPS.slice(0, 2)]) tasks.push(() => bakeMap(m));
  for (let i = 0; i < tasks.length; i++) {
    tasks[i]();
    if (i % 4 === 0) { $('#loadfill').style.width = Math.round(40 + (i / tasks.length) * 60) + '%'; await new Promise((r) => setTimeout(r, 0)); }
  }
  $('#loadfill').style.width = '100%';
  setupGameUi(); setupInput(); setupOverlays(); setupNav();
  Wallet.init(save, () => { persist(); }); Wallet.sync().then(() => { if (!$('#title').classList.contains('hidden')) menus.buildTitle(); });
  hide('#loading'); goTitle();
  last = performance.now(); requestAnimationFrame(frame);
}

// ───────── навигация ─────────
const SCREENS = ['#title', '#world', '#game'], OVERLAYS = ['#shop', '#settings', '#diffsheet', '#rankedsheet', '#board', '#forge', '#achs', '#loadout', '#pausemenu', '#endmenu'];
function hideAll() { for (const id of [...SCREENS, ...OVERLAYS]) hide(id); }
function goTitle() { hideAll(); stopPlay(); menus.buildTitle(); show('#title'); sfx.startMusic(MENU_SPEC); updateBack(); }
function goWorld(focus) { hideAll(); stopPlay(); menus.buildWorld(focus); show('#world'); sfx.startMusic(MENU_SPEC); updateBack(); }
function stopPlay() { running = false; paused = false; held = false; run = null; ctrl.run = null; document.body.classList.remove('ranked'); TG.closingConfirm(false); if (tutorial) tutorial.detach(); if (ui) ui.closeUpgrade(true); tally++; }
function top() { for (const id of ['#shop', '#settings', '#board', '#forge', '#achs', '#loadout', '#rankedsheet', '#diffsheet']) if (!$(id).classList.contains('hidden')) return id; return null; }
function back() {
  const t = top();
  if (t) {
    if (t === '#loadout' && run && run.i > 0) { sfx.play('error'); return; }             // посреди забега назад пути нет
    hide(t); if (t === '#forge' || t === '#achs' || t === '#shop') { menus.buildTitle(); if (!$('#world').classList.contains('hidden')) menus.buildWorld(); if (!$('#loadout').classList.contains('hidden')) menus.refreshLoadout(); if (t === '#shop' && ctrl.forgeDraw && !$('#forge').classList.contains('hidden')) ctrl.forgeDraw(); }
    sfx.play('click'); updateBack(); return;
  }
  if (!$('#world').classList.contains('hidden')) { sfx.play('click'); goTitle(); return; }
  if (running && !paused) setPause(true);
}
function updateBack() { TG.backButton(!$('#title').classList.contains('hidden') ? null : back); }
function setupNav() {
  for (const [id, fn] of [['#st-back', back], ['#rk-back', back], ['#world-back', back], ['#ds-back', back], ['#bd-back', back], ['#forge-back', back], ['#achs-back', back], ['#lo-back', back], ['#shop-back', back]]) $(id).onclick = fn;
  $('#b-start').onclick = () => {
    sfx.unlock(); sfx.play('click'); sfx.startMusic(MENU_SPEC);
    if (!tutorialDone(save)) { prepareLevel('tut', 1); return; }               // новичка сразу ведём в обучение
    goWorld();
  };
  $('#b-ranked').onclick = () => { sfx.unlock(); sfx.play('click'); sfx.startMusic(MENU_SPEC); menus.openRanked(); updateBack(); };
  $('#b-forge').onclick = () => ctrl.openForge(); $('#b-achs').onclick = () => ctrl.openAchs();
  $('#b-board').onclick = () => { sfx.unlock(); sfx.play('click'); menus.openBoard({ global: true }); updateBack(); };
  $('#b-settings').onclick = () => { sfx.unlock(); sfx.play('click'); menus.openSettings(); updateBack(); };
  $('#b-gems').onclick = () => { sfx.unlock(); sfx.play('select'); ctrl.openShop(); };
  ctrl.applySettings = applySettings; ctrl.persist = persist; ctrl.resetProgress = resetProgress;
  window.addEventListener('resize', () => { if (!$('#world').classList.contains('hidden')) menus.fitWorld(); });
  ctrl.openShop = () => { sfx.unlock(); sfx.play('click'); const draw = () => { persist(); renderShop(save, ctrl, draw); menus.buildTitle(); }; draw(); show('#shop'); updateBack(); Wallet.sync().then((w) => { if (w && !$('#shop').classList.contains('hidden')) renderShop(save, ctrl, draw); }); };
  ctrl.openForge = () => { sfx.unlock(); sfx.play('click'); const draw = () => renderForge(save, sfx, () => { persist(); draw(); menus.buildTitle(); if (!$('#world').classList.contains('hidden')) menus.buildWorld(); }, ctrl.openShop); ctrl.forgeDraw = draw; draw(); show('#forge'); updateBack(); };
  ctrl.openAchs = () => { sfx.unlock(); sfx.play('click'); renderAchs(save); show('#achs'); updateBack(); };
  ctrl.toggleSnd = () => { sfx.unlock(); sfx.setSfx(!sfx.sfxOn); save.sfx = sfx.sfxOn; persist(); sfx.play('click'); };
  ctrl.toggleMus = () => { sfx.unlock(); sfx.setMusic(!sfx.musOn); save.mus = sfx.musOn; persist(); };
  ctrl.startLevel = (id, d) => prepareLevel(id, d); ctrl.startRun = startRunFlow;
  ctrl.note = (text) => { const n = $('#note'); n.textContent = text; n.classList.add('show'); clearTimeout(ctrl._nt); ctrl._nt = setTimeout(() => n.classList.remove('show'), 2200); };
}
function persist() { TG.save(save); }
function applySettings() {
  const st = save.set = { ...defaultSettings(), ...(save.set || {}) };
  sfx.setVolumes(st.sfxVol, st.musVol); TG.hapticOn = st.haptic; TG.allowConfirm = st.confirm;
  if (gore) gore.level = st.gore; if (renderer) renderer.floaters = st.dmg;
}
function resetProgress() { save = defaultSave(); ctrl.save = save; TG.save(save); setTimeout(() => location.reload(), 150); }

function setupOverlays() {
  $('#p-resume').onclick = () => setPause(false);
  $('#p-restart').onclick = () => { hide('#pausemenu'); if (meta) meta.abandon(); prepareLevel(D.MAPS[levelIdx].id, diffI, true); };
  $('#p-quit').onclick = () => { if (meta) meta.abandon(); if (run) { abandonRun(); return; } if (D.MAPS[levelIdx].tutorial) { goTitle(); return; } goWorld(D.MAPS[levelIdx].id); };
  $('#p-settings').onclick = () => { sfx.play('click'); menus.openSettings(); updateBack(); };
  $('#e-again').onclick = () => { hide('#endmenu'); if (run) { startRunFlow(); return; } prepareLevel(D.MAPS[levelIdx].id, diffI, true); };
  $('#e-menu').onclick = () => { hide('#endmenu'); if (run) { goTitle(); return; } goWorld(D.MAPS[levelIdx].id); };
  $('#e-next').onclick = () => {
    hide('#endmenu');
    if (run) { run.i++; openLoadoutFor(run.levels[run.i], RUN.diff); return; }
    const n = nextAfter(save, D.MAPS[levelIdx].id); goWorld(n ? n.id : D.MAPS[levelIdx].id);
  };
  $('#e-endless').onclick = () => { hide('#endmenu'); sim.endless = true; sim.state = 'play'; sim.nextWaveT = 8; ending = null; sfx.play('horn'); };
  $('#end-verdict').onclick = () => { tally++; };       // касание пропускает анимацию подсчёта
}
function setPause(p) {
  if (!running) return; paused = p; sfx.play('click');
  if (p) show('#pausemenu'); else hide('#pausemenu');
  $('#p-restart').classList.toggle('hidden', !!run); $('#p-quit').textContent = run ? 'Завершить забег' : D.MAPS[levelIdx].tutorial ? 'В меню' : 'На карту';
  $('#b-pause').classList.toggle('on', p);
}
// Рекорд забега: самый высокий достигнутый уровень, затем очки, затем меньшее время. В таблице у игрока одна лучшая запись.
function recordRun(won) {
  const r = save.rank ||= { lv: 0, score: 0, time: 0, fast: 0 }, reached = run.i + 1, full = won && run.i >= run.levels.length - 1;
  const cand = { lv: reached, score: Math.round(run.score), time: Math.round(run.time) };
  if (betterRun(cand, r)) { r.lv = cand.lv; r.score = cand.score; r.time = cand.time; r.loadout = (run.loadout || []).join(','); }
  if (full && (!r.fast || run.time < r.fast)) r.fast = Math.round(run.time);
  persist();
}
const submitRun = (won) => Net.submit({ level: RUN.level, diff: RUN.diff, score: run.score, wave: run.waves, kills: run.kills, won, duration: run.time, lv: run.i + 1, loadout: (run.loadout || []).join(',') });
function abandonRun() {
  if (!run.done && sim && sim.state === 'play') { run.score += sim.score; run.time += sim.time; run.kills += sim.stats.kills; run.waves += sim.wave; run.done = true; recordRun(false); submitRun(false); }
  goTitle();
}

// ───────── бой ─────────
function setupGameUi() {
  ui = new GameUI(ctrl); ctrl.ui = ui;
  tutorial = new Tutorial(ctrl); ctrl.tutorial = tutorial;
  ctrl.hold = (on) => { held = on; };
  $('#b-pause').onclick = () => setPause(!paused);
  const stage = $('#stage');
  renderer = new Renderer($('#cv')); ctrl.renderer = renderer;
  const fit = () => { const r = stage.getBoundingClientRect(); if (r.width > 0) { needDraw = true; renderer.resize(r.width, r.height, Math.min(window.devicePixelRatio || 1, 2)); }; };
  new ResizeObserver(fit).observe(stage); window.addEventListener('resize', fit); ctrl.fit = fit;
}
// Подготовка к уровню: окно выбора зданий по слотам (обучение и повтор уровня идут без него)
function prepareLevel(levelId, diffIdx, again = false) {
  const L = D.MAPS.find((l) => l.id === levelId);
  if (L.tutorial) { startLevel(levelId, diffIdx, false, ['bolt', 'mine']); return; }
  if (again && save.loadout) { startLevel(levelId, diffIdx, false, getLoadout(save)); return; }
  menus.openLoadout({ title: L.name, slots: slotsOf(save), all: false, initial: getLoadout(save), boosts: true, lvl: L.lvl, diff: diffIdx,
    onGo: async (list, boosts) => {
      save.loadout = list.slice(); persist();
      for (const id of boosts) { const r = await Wallet.spend('boost', id, D.boostPrice(id, L.lvl), L.lvl); if (!r || !r.ok) { ctrl.note(r && r.error === 'gems' ? 'Не хватает кристаллов для усилителей' : 'Не получилось'); prepareLevel(levelId, diffIdx); return; } }
      startLevel(levelId, diffIdx, false, list, boosts);
    } });
  updateBack();
}
function openLoadoutFor(levelId, diffIdx) {                 // перед каждым уровнем забега: все здания открыты, максимум слотов
  const lv = D.MAPS.find((l) => l.id === levelId);
  menus.openLoadout({ title: `${run.i + 1}/${run.levels.length} · ${lv.name}`, slots: D.RUN_SLOTS, all: true, initial: run.loadout || getLoadout(save, D.RUN_SLOTS, true), nobackBtn: run.i > 0,
    onGo: (list) => { run.loadout = list.slice(); startLevel(levelId, diffIdx, true, list); } });
  updateBack();
}
function startLevel(levelId, diffIdx, ranked, loadout, boosts = []) {
  levelIdx = D.MAPS.findIndex((l) => l.id === levelId); diffI = diffIdx;
  const L = D.MAPS[levelIdx], tut = !!L.tutorial;
  hideAll(); show('#game'); tally++;
  if (!ranked) { run = null; ctrl.run = null; }
  const std = !ranked && !tut;                           // в рейтинговом забеге и обучении: без даров Кузницы
  sim = new Sim({ mapId: levelIdx, diffIdx, seed: (Math.random() * 1e9) | 0, perks: boostMods(perkMods(std ? save.perks : {}), boosts, diffIdx), locked: std ? lockedItems(save) : [],
    allowed: loadout, limits: tut ? { bolt: 1, mine: 1 } : null, gold: tut ? 110 : null, hold: tut });
  ctrl.sim = sim; if (location.search.includes('debug')) window.__bk = ctrl;
  gore = new Gore(); ctrl.gore = gore; gore.level = (save.set || {}).gore ?? 2; gore.attach(sim); gore.onSound = (n, v) => sfx.play(n, v);
  attachSfx(sim, sfx);
  renderer.setGame(sim, gore); ctrl.fit();
  view.selected = null; view.armed = null; view.hover = null; view.spell = null; view.hint = null;
  document.body.classList.toggle('ranked', ranked); $('#chip-time').classList.toggle('hidden', !ranked);
  ui.attachSim(sim, loadout);
  meta = new Meta(save, { persist, onUnlock: showAchToast }); meta.attach(sim, diffIdx, levelIdx, { soulMult: boosts.includes('souls') ? 1.5 : 1 }); pollT = 0;
  sim.on('over', (d) => onOver(d));
  $('#b-pause').classList.remove('on');
  running = true; paused = false; held = false; acc = 0; ending = null; lastHud = '';
  save.plays++; save.last = { level: levelId, diff: diffIdx }; persist();
  TG.closingConfirm(true); updateBack();
  sfx.unlock(); sfx.startMusic(levelSpec(L, ranked));
  if (tut) tutorial.attach(sim, ui); else tutorial.detach();
}
// усилители за кристаллы: золото на старте и жизни (на Хардкоре жизнь одна, усилитель жизней там не действует)
function boostMods(m, boosts, diffIdx) { const o = { ...m }; if (boosts.includes('gold')) o.startGold = (o.startGold || 0) + 100; if (boosts.includes('lives') && diffIdx !== 4) o.lives = (o.lives || 0) + 5; return o; }
// Рейтинговый забег: все рубежи подряд на «Хардкоре», общий таймер и очки; набор зданий выбирается перед каждым уровнем
function startRunFlow() {
  run = { i: 0, score: 0, time: 0, kills: 0, waves: 0, levels: D.CAMPAIGN.map((l) => l.id), done: false, loadout: null }; ctrl.run = run;
  hide('#endmenu'); openLoadoutFor(run.levels[0], RUN.diff);
}
function showAchToast(a) {
  const t = $('#achtoast'); t.innerHTML = `<img src="${iconUrl(glyphIcon('trophy', { size: 64, bg: PALETTE.ach }))}" alt=""><div>${a.name}<small>+${a.reward}</small></div>`;
  t.classList.add('show'); clearTimeout(showAchToast._t); showAchToast._t = setTimeout(() => t.classList.remove('show'), 3200);
  sfx.play('upgrade'); TG.haptic.notify('success');
}
function onOver({ won }) {
  save.kills += sim.stats.kills; persist();
  TG.haptic.notify(won ? 'success' : 'error');
  ending = { t: won ? 2.2 : 1.8, won, shown: false };
  if (D.MAPS[levelIdx].tutorial) return;                  // обучение в таблицу не уходит
  if (run) {                                              // копим результат забега; в таблицу уходит один итог
    run.score += sim.score; run.time += sim.time; run.kills += sim.stats.kills; run.waves += sim.wave;
    run.done = !won || run.i >= run.levels.length - 1;
    if (run.done) { recordRun(won); ending.submit = submitRun(won && run.i >= run.levels.length - 1); }
    return;
  }
  ending.submit = Net.submit({ level: sim.map.id, diff: diffI, score: sim.score, wave: sim.wave, kills: sim.stats.kills, won, duration: sim.time });
}
function updateRunHud() {
  if (!run || !sim) return;
  const key = Math.floor(run.time + sim.time);
  if (key !== lastHud) { lastHud = key; $('#rh-time').textContent = clock(run.time + sim.time); }       // сколько уровней пройдено, видно только в итогах
}

// ───────── итог уровня: подсчёт очков с анимацией ─────────
async function playVerdict(v, token) {
  const box = $('#end-verdict'), modal = $('#endmenu .modal');
  const L = (k) => $(`#end-verdict [data-k=${k}]`);
  const cancelled = () => token !== tally;
  const count = async (el, from, to, ms, pre = '') => {
    if (cancelled()) { el.textContent = pre + fmt(to); return; }
    const t0 = performance.now();
    await new Promise((res) => { const tick = () => { if (cancelled()) { el.textContent = pre + fmt(to); res(); return; } const f = Math.min(1, (performance.now() - t0) / ms); el.textContent = pre + fmt(from + (to - from) * f); if (f < 1) requestAnimationFrame(tick); else res(); }; tick(); });
  };
  const rows = [['waves', v.waves], ['kills', v.kills], ['time', v.time]];
  for (const [k, val] of rows) {
    const r = L(k); r.classList.add('in'); if (!cancelled()) sfx.play('click');
    await count(r.querySelector('b'), 0, val, val ? 380 : 120, '+'); if (!cancelled()) await sleep(110);
  }
  const sub = L('sub'); sub.classList.add('in'); await count(sub.querySelector('b'), 0, v.sub, 320);
  if (!cancelled()) await sleep(260);
  const mul = L('mul'); mul.classList.add('in'); if (!cancelled()) { sfx.play('upgrade'); TG.haptic.impact('medium'); }
  if (!cancelled()) await sleep(520);
  const tot = L('tot'); tot.classList.add('in');
  if (!cancelled()) sfx.play('horn');
  await count(tot.querySelector('b'), v.sub, v.total, 800);
  tot.classList.add('done'); modal.classList.remove('tally');
}
function showEnd(won) {
  const s = sim.stats, r = meta.run, v = sim.verdict, tut = !!D.MAPS[levelIdx].tutorial;
  const L = bareGlyphUrl;
  const more = !!run && !run.done;                       // забег продолжается: следующий рубеж
  $('#end-title').textContent = tut ? (won ? 'Обучение пройдено' : 'Поражение') : run ? (more ? `Рубеж ${run.i + 1} из ${run.levels.length} взят` : won ? 'Забег пройден' : `Забег окончен на рубеже ${run.i + 1}`) : won ? 'Победа' : 'Поражение';
  $('#end-title').style.color = won ? '#8fe36a' : '#ff5a6a';
  const dl = D.DIFFS[diffI];
  const par = clock(v.par);
  $('#end-verdict').innerHTML = tut ? '' : `
    <div class="vr" data-k="waves"><span><img src="${L('flag', 22)}" alt="">Волны</span><b>+0</b></div>
    <div class="vr" data-k="kills"><span><img src="${L('skull', 22)}" alt="">Сильные враги</span><b>+0</b></div>
    <div class="vr" data-k="time"><span><img src="${L('hourglass', 22)}" alt="">Время ${clock(v.t)}<small>${won ? 'норма ' + par : 'бонус только за победу'}</small></span><b>+0</b></div>
    <div class="vr sub" data-k="sub"><span>Сумма</span><b>0</b></div>
    <div class="vr mul" data-k="mul"><span>${dl.name}</span><b>×${String(Math.round(dl.score * 100) / 100).replace('.', ',')}</b></div>
    <div class="vr tot" data-k="tot"><span><img class="sc" src="${SCORE_ICON}" alt=""></span><b>0</b></div>`;
  $('#end-score').innerHTML = run ? `<img src="${SCORE_ICON}" alt="" class="sc">${fmt(run.score)}<small>за весь забег</small>` : '';
  $('#end-score').classList.toggle('hidden', !run);
  $('#end-stats').innerHTML = run
    ? `<div><img src="${L('flag', 28)}" alt=""><b>${run.i + 1}/${run.levels.length}</b></div><div><img src="${L('hourglass', 28)}" alt=""><b>${clock(run.time)}</b></div><div><img src="${L('skull', 28)}" alt=""><b>${run.kills}</b></div>`
    : `<div><img src="${L('skull', 28)}" alt=""><b>${s.kills}</b></div><div><img src="${L('flag', 28)}" alt=""><b>${won ? sim.total : sim.wave}</b></div><div><img src="${L('coins', 28)}" alt=""><b>${fmt(s.earned)}</b></div>`;
  $('#end-souls').innerHTML = `<img src="${L('soul', 24)}" alt=""> +${r.souls}`;
  $('#end-ach').innerHTML = r.newAch.map((a) => `<div>${a.name} · +${a.reward}</div>`).join('');
  $('#end-rank').classList.add('hidden');
  const nxt = !run && won ? nextAfter(save, sim.map.id) : null;
  $('#e-next').classList.toggle('hidden', run ? !more : !nxt); $('#e-next').textContent = run ? 'Следующий рубеж' : 'Дальше';
  $('#e-endless').classList.toggle('hidden', !!run || !won || tut);
  $('#e-again').textContent = run ? 'Новый забег' : 'Ещё раз'; $('#e-again').classList.toggle('hidden', more || (tut && won));
  $('#e-menu').textContent = run ? 'В меню' : tut ? 'В меню' : 'На карту';
  if (tut && won) { $('#e-next').classList.remove('hidden'); $('#e-next').textContent = 'К карте'; }
  show('#endmenu');
  if (!tut) { $('#endmenu .modal').classList.add('tally'); const token = ++tally; playVerdict(v, token); }
  else $('#endmenu .modal').classList.remove('tally');
  if (ending && ending.submit) ending.submit.then((res) => { if (res && res.ok && !run && !$('#endmenu').classList.contains('hidden')) { const e = $('#end-rank'); e.innerHTML = `<img src="${L('crown', 28)}" alt="">#${res.level_rank}`; e.classList.remove('hidden'); } });
}

// ───────── цикл ─────────
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; dt = Math.min(dt, 0.1);
  if (!running) return;
  const frozen = paused || held;
  if (!frozen) {
    acc += dt; let n = 0;
    while (acc >= STEP && n < 8) {
      if (ending && !ending.shown) { ending.t -= STEP; if (ending.t <= 0) { ending.shown = true; showEnd(ending.won); } }
      sim.update(STEP); gore.update(STEP); acc -= STEP; n++;
    }
    if (n === 8) acc = 0;
    pollT += dt; if (pollT > 1) { pollT = 0; meta.poll(); }
  }
  if (!paused && tutorial) tutorial.update(dt);
  if (!frozen || !wasFrozen || needDraw) { renderer.render(frozen ? 0 : dt, view); needDraw = false; }     // на паузе и в окнах холст не перерисовывается каждый кадр
  wasFrozen = frozen;
  ui.update(frozen ? 0 : dt); updateRunHud();
}

// ───────── ввод ─────────
function setupInput() {
  const cv = $('#cv'); let down = null;
  const cellOf = (p) => ({ c: Math.floor(p.x / D.CELL), r: Math.floor(p.y / D.CELL) });
  cv.addEventListener('pointerdown', (e) => {
    if (!running || paused || held) return; sfx.unlock(); e.preventDefault();
    const p = renderer.toWorld(e.clientX, e.clientY); view.hoverPx = p; down = { id: e.pointerId, p, type: e.pointerType };
    if (view.spell) return;
    handleTap(p, e.pointerType);
  });
  cv.addEventListener('pointermove', (e) => {
    if (!running || paused || held) return;
    const p = renderer.toWorld(e.clientX, e.clientY);
    if (e.pointerType === 'mouse' || view.spell) view.hoverPx = p;
    if (e.pointerType === 'mouse' && view.armed) view.hover = cellOf(p);
  });
  cv.addEventListener('pointerup', (e) => {
    if (down && view.spell && down.id === e.pointerId) {
      const p = renderer.toWorld(e.clientX, e.clientY);
      const r = sim.castSpell(view.spell, Math.min(D.WORLD_W, Math.max(0, p.x)), Math.min(D.WORLD_H, Math.max(0, p.y)));
      if (r === true) { view.spell = null; ui.refreshCards(); } else ui.fail(r);
    }
    down = null;
  });
  cv.addEventListener('pointercancel', () => { down = null; });
  cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') view.hover = null; });
  cv.addEventListener('contextmenu', (e) => { e.preventDefault(); ui.disarm(); ui.deselect(); ui.setOpen(false); view.spell = null; });
  window.addEventListener('keydown', (e) => {
    if (!running) return;
    if (e.key === ' ') { e.preventDefault(); setPause(!paused); }
    else if (e.key === 'Escape') { if (ui.sellB) ui.closeSell(); else if (ui.upB) ui.closeUpgrade(); else { ui.disarm(); ui.deselect(); ui.setOpen(false); view.spell = null; } }
    else if (/^[1-9]$/.test(e.key) && !held) { if (ui.cards[+e.key - 1]) ui.onCard(ui.cards[+e.key - 1]); }
    else if (e.key === 'n' || e.key === 'N') { const w = document.querySelector('.wcall:not(.hidden)'); if (w) w.click(); }
  });
  TG.onVisibility((hidden) => { if (hidden && running && !paused && !held && ending === null && !location.search.includes('debug')) setPause(true); if (sfx.ctx) { if (hidden) sfx.ctx.suspend && sfx.ctx.suspend(); else sfx.ctx.resume && sfx.ctx.resume(); } });
}
function handleTap(p, ptype) {
  if (ui.open) ui.setOpen(false);
  const bag = sim.bagAt(p.x, p.y);
  if (bag) { sim.collectBag(bag, true); TG.haptic.impact('light'); return; }
  if (sim.chestAt(p.x, p.y)) { sim.hitChest(); TG.haptic.impact('medium'); return; }
  const c = Math.floor(p.x / D.CELL), r = Math.floor(p.y / D.CELL);
  if (!sim.inBounds(c, r)) { ui.deselect(); if (ptype !== 'mouse') view.hover = null; return; }
  const b = sim.grid[r][c];
  if (view.armed) {
    if (b) { ui.select(b); return; }
    if (!sim.canBuild(c, r)) { ui.fail('cell'); return; }
    const same = view.hover && view.hover.c === c && view.hover.r === r;
    if (ptype === 'mouse' || same) {
      const { kind, type } = view.armed;
      const res = sim.build(kind, type, c, r);
      if (typeof res === 'string') { ui.fail(res); return; }
      view.hover = null;
      const next = kind === 'tower' ? D.TOWERS[type].cost : sim.buildCost('econ', type);
      const lim = sim.limits && sim.limits[type] != null ? sim.limits[type] : kind === 'econ' ? D.ECON[type].max : 99;
      if (sim.gold < next || sim.countOf(kind, type) >= lim || (kind === 'econ' && sim.countOf('econ', type) >= D.ECON[type].max)) { ui.disarm(); ui.refreshCards(); }
      return;
    }
    view.hover = { c, r };
    return;
  }
  if (b) { if (ui.selB === b) ui.deselect(); else { ui.select(b); sfx.play('select'); } }
  else ui.deselect();
}

boot().catch((e) => { console.error(e); const t = document.querySelector('#loading .logo-img'); if (t) t.insertAdjacentHTML('afterend', `<div style="color:#ff8a8a;margin-top:16px;font:12px monospace;max-width:90%">${(e && e.message) || e}</div>`); });
