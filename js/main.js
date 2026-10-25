// Точка входа: загрузка ассетов, навигация (старт → карта → сложность → подготовка → бой), игровой цикл, ввод, сохранения.
import * as D from './data.js?v=20261025134213';
import * as A from './art.js?v=20261025134213';
import { Sim } from './sim.js?v=20261025134213';
import { Gore } from './gore.js?v=20261025134213';
import { Renderer } from './render.js?v=20261025134213';
import { GameUI } from './ui.js?v=20261025134213';
import { Tutorial } from './tutorial.js?v=20261025134213';
import { Sfx, attachSfx } from './audio.js?v=20261025134213';
import { TG, defaultSave, defaultSettings, betterRun } from './tg.js?v=20261025134213';
import { applyEnemySprites, releaseEnemies, enemyFiles } from './enemies.js?v=20261025134213';
import { loadSprites, loadEnemyImgs, loadLand, dropLand } from './sprites.js?v=20261025134213';
import { mapBG, releaseBG } from './env.js?v=20261025134213';
import { MENU_SPEC } from './music.js?v=20261025134213';
import { Meta, perkMods, lockedItems, nextAfter, tutorialDone, getLoadout, slotsOf } from './meta.js?v=20261025134213';
import { renderForge, renderAchs } from './screens.js?v=20261025134213';
import { renderShop } from './shop.js?v=20261025134213';
import { Wallet } from './wallet.js?v=20261025134213';
import { initLang, pickLang } from './i18n.js?v=20261025134213';
import { Menus, RUN, clock } from './menus.js?v=20261025134213';
import { Net } from './net.js?v=20261025134213';
import { gemIc } from './res.js?v=20261025134213';
import { bareGlyphUrl, glyphIcon, iconUrl, PALETTE } from './icons.js?v=20261025134213';

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
let wasFrozen = false, needDraw = false, drawAcc = 0;
const DRAW_MIN = TG.isMobile ? 0.029 : 0;
let panning = false;
let running = false, paused = false, held = false, acc = 0, ending = null, last = 0, diffI = 1, levelIdx = 0, lastHud = '', tally = 0;

// ───────── загрузка ─────────
async function boot() {
  const sheet = document.querySelector('link[href^="css/style.css"]');            // основной css подгружается без блокировки показа; перед построением экранов ждём его
  if (sheet && sheet.media !== 'all') await new Promise((r) => { sheet.addEventListener('load', r, { once: true }); setTimeout(r, 4000); });
  await initLang(pickLang());                                                   // язык интерфейса: до построения экранов
  TG.init();
  if (location.search.includes('debug')) window.__bk = ctrl;
  if (location.search.includes('enemydemo')) import('./demo.js?v=20261025134213').then((m) => m.enemyDemo(ctrl));
  if (location.search.includes('buildall')) import('./demo.js?v=20261025134213').then((m) => m.buildAll(ctrl));
  save = await TG.load(); ctrl.save = save;
  sfx.sfxOn = save.sfx; sfx.musOn = save.mus; applySettings();
  const dpr = Math.min(window.devicePixelRatio || 1, TG.isMobile ? 1.5 : 2);      // на телефоне холст чуть мельче: меньше нагрев
  A.setScale(Renderer.pickScale(window.innerWidth, Math.max(300, window.innerHeight - 56), dpr));
  await loadSprites((f) => { $('#loadfill').style.width = Math.round(f * 100) + '%'; });
  menus = new Menus(ctrl); ctrl.menus = menus;
  $('#loadfill').style.width = '100%';
  setupGameUi(); setupInput(); setupOverlays(); setupRevive(); setupNav();
  Wallet.init(save, () => { persist(); }); Wallet.sync().then(() => { if (!$('#title').classList.contains('hidden')) menus.buildTitle(); });
  hide('#loading'); goTitle();
  last = performance.now();
}

// ───────── ресурсы уровня ─────────
// Листы врагов, фон карты и спрайты зданий готовим под уровень заранее (пока игрок выбирает сложность и здания) и освобождаем, когда уровень закрыт:
// в памяти только то, что нужно сейчас.
let warmId = null, warmP = null;
function ensureLevel(L) {
  if (warmId === L.id && warmP) return warmP;
  warmId = L.id;
  const types = D.levelTypes(L);
  warmP = (async () => {
    await loadEnemyImgs(enemyFiles(types));
    applyEnemySprites(types); releaseEnemies(types);
    await loadLand(L.theme); mapBG(L); dropLand();                      // фон запекаем один раз и сразу выбрасываем из памяти исходные картинки земли, дороги и декора
  })().catch((e) => { console.error(e); });
  return warmP;
}
function releaseLevel() {
  warmId = null; warmP = null;
  if (renderer) renderer.release();
  if (gore) { gore.dispose(); gore = null; ctrl.gore = null; }
  releaseBG(); dropLand(); releaseEnemies([]); sim = null; ctrl.sim = null;
}
function busy(on) { $('#busy').classList.toggle('hidden', !on); }

// ───────── навигация ─────────
const SCREENS = ['#title', '#world', '#game'], OVERLAYS = ['#shop', '#settings', '#diffsheet', '#rankedsheet', '#board', '#forge', '#achs', '#loadout', '#pausemenu', '#endmenu'];
function hideAll() { for (const id of [...SCREENS, ...OVERLAYS]) hide(id); }
function goTitle() { hideAll(); stopPlay(); releaseLevel(); menus.buildTitle(); show('#title'); sfx.startMusic(MENU_SPEC); updateBack(); }
function goWorld(focus) { hideAll(); stopPlay(); releaseLevel(); menus.buildWorld(focus); show('#world'); sfx.startMusic(MENU_SPEC); updateBack(); }
function stopPlay() { running = false; paused = false; held = false; reviveOpen = false; hide('#revive'); run = null; ctrl.run = null; document.body.classList.remove('ranked'); TG.closingConfirm(false); if (tutorial) tutorial.detach(); if (ui) ui.closeUpgrade(true); tally++; }
function top() { for (const id of ['#shop', '#settings', '#board', '#forge', '#achs', '#loadout', '#rankedsheet', '#diffsheet']) if (!$(id).classList.contains('hidden')) return id; return null; }
function back() {
  const t = top();
  if (!t && reviveOpen) { sfx.play('error'); return; }              // у ворот назад пути нет: либо вернуть жизни, либо сдаться
  if (t) {
    if (t === '#loadout' && run && run.i > 0) { sfx.play('error'); return; }             // посреди забега назад пути нет
    hide(t); if (t === '#forge' || t === '#achs' || t === '#shop') { menus.buildTitle(); if (!$('#world').classList.contains('hidden')) menus.buildWorld(); if (!$('#loadout').classList.contains('hidden')) menus.refreshLoadout(); if (t === '#shop' && ctrl.forgeDraw && !$('#forge').classList.contains('hidden')) ctrl.forgeDraw(); if (t === '#shop' && reviveOpen) { renderRevive(); show('#revive'); } }
    sfx.play('back'); updateBack(); return;
  }
  if (!$('#world').classList.contains('hidden')) { sfx.play('back'); goTitle(); return; }
  if (running && !paused) setPause(true);
}
// кнопка «Назад» Telegram нужна везде, кроме главного меню (поверх него открываются Кузница, Награды и т.д., поэтому смотрим на открытые окна, а не на видимость заставки)
function updateBack() { const home = !top() && $('#world').classList.contains('hidden') && !running; TG.backButton(home ? null : back); document.body.classList.toggle('menuopen', !home); }
function setupNav() {
  let ubT = 0; new MutationObserver((recs) => { if (ubT || !recs.some((r) => r.target.classList && r.target.classList.contains('screen'))) return; ubT = setTimeout(() => { ubT = 0; updateBack(); }, 0); }).observe($('#app'), { subtree: true, attributes: true, attributeFilter: ['class'] });      // любое окно открылось или закрылось
  for (const [id, fn] of [['#st-back', back], ['#rk-back', back], ['#world-back', back], ['#ds-back', back], ['#bd-back', back], ['#forge-back', back], ['#achs-back', back], ['#lo-back', back], ['#shop-back', back]]) $(id).onclick = fn;
  $('#b-start').onclick = () => {
    sfx.unlock(); sfx.play('click'); sfx.startMusic(MENU_SPEC);
    if (!tutorialDone(save)) { prepareLevel('tut', 1); return; }               // новичка сразу ведём в обучение
    goWorld();
  };
  for (const id of ['#world-forge', '#ds-forge', '#lo-forge', '#e-forge']) $(id).onclick = () => ctrl.openForge();      // Кузница доступна при выборе уровня, подготовке и после победы
  $('#b-ranked').onclick = () => { sfx.unlock(); sfx.play('click'); sfx.startMusic(MENU_SPEC); menus.openRanked(); updateBack(); };
  $('#b-forge').onclick = () => ctrl.openForge(); $('#b-achs').onclick = () => ctrl.openAchs();
  $('#b-board').onclick = () => { sfx.unlock(); sfx.play('click'); menus.openBoard({ global: true }); updateBack(); };
  $('#b-settings').onclick = () => { sfx.unlock(); sfx.play('click'); menus.openSettings(); updateBack(); };
  $('#b-gems').onclick = () => { sfx.unlock(); sfx.play('select'); ctrl.openShop(); };
  ctrl.applySettings = applySettings; ctrl.persist = persist;
  window.addEventListener('resize', () => { if (!$('#world').classList.contains('hidden')) menus.fitWorld(); });
  ctrl.openShop = () => { sfx.unlock(); sfx.play('click'); const draw = () => { persist(); renderShop(save, ctrl, draw); menus.buildTitle(); }; draw(); show('#shop'); updateBack(); Wallet.sync().then((w) => { if (w && !$('#shop').classList.contains('hidden')) renderShop(save, ctrl, draw); }); };
  ctrl.openForge = () => { sfx.unlock(); sfx.play('click'); const draw = () => renderForge(save, sfx, () => { persist(); draw(); menus.buildTitle(); if (!$('#world').classList.contains('hidden')) menus.buildWorld(); }, ctrl.openShop); ctrl.forgeDraw = draw; draw(); show('#forge'); updateBack(); };
  ctrl.openAchs = () => { sfx.unlock(); sfx.play('click'); renderAchs(save); show('#achs'); updateBack(); };
  ctrl.toggleSnd = () => { sfx.unlock(); sfx.setSfx(!sfx.sfxOn); save.sfx = sfx.sfxOn; persist(); sfx.play('click'); };
  ctrl.toggleMus = () => { sfx.unlock(); sfx.setMusic(!sfx.musOn); save.mus = sfx.musOn; persist(); };
  ctrl.startLevel = (id, d) => prepareLevel(id, d); ctrl.startRun = startRunFlow; ctrl.ensureTypes = async (types) => { const all = [...new Set([...types, ...types.map((t) => D.ENEMIES[t] && D.ENEMIES[t].split).filter(Boolean)])]; await loadEnemyImgs(enemyFiles(all)); applyEnemySprites(all); }; ctrl.warm = (id) => { const L = D.MAPS.find((l) => l.id === id); if (L) ensureLevel(L); };
  ctrl.note = (text) => { const n = $('#note'); n.textContent = text; n.classList.add('show'); clearTimeout(ctrl._nt); ctrl._nt = setTimeout(() => n.classList.remove('show'), 2200); };
}
function persist() { TG.save(save); }
function applySettings() {
  const st = save.set = { ...defaultSettings(), ...(save.set || {}) };
  sfx.setVolumes(st.sfxVol, st.musVol); TG.allowConfirm = st.confirm;
  if (gore) gore.level = 1; if (renderer) renderer.floaters = st.dmg;
}

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
  $('#end-verdict').onclick = () => { tally++; };       // касание пропускает анимацию подсчёта
}
// ───────── возрождение у ворот ─────
// Враг прошёл в ворота на последней жизни: бой замирает, экран темнеет, игроку предлагают вернуть жизни за кристаллы.
// Не хватает кристаллов — «Пополнить» открывает магазин, после покупки пакета окно возвращается с новым балансом и жизни покупаются в один тап.
let reviveOpen = false, reviveBusy = false;
const revivePrice = () => D.boostPrice('lives', D.MAPS[levelIdx].lvl);
function renderRevive() {
  const price = revivePrice(), have = save.gems || 0, enough = have >= price, left = sim.revive.max - sim.revive.used - 1;
  $('#rv-ic').src = bareGlyphUrl('heart', 128);
  $('#rv-sub').textContent = enough ? 'Последний враг прорвался в ворота. Верни жизни и продолжи бой с этого же места.' : 'Последний враг прорвался в ворота. Пополни кристаллы, верни жизни и продолжи бой с этого же места.';
  $('#rv-bal').innerHTML = `У тебя: ${gemIc(18)} ${fmt(have)}` + (left > 0 ? ` · ещё возрождений: ${left}` : '');
  $('#rv-buy').innerHTML = `+${D.REVIVE.lives} жизней · ${gemIc(18)} ${price}`;
  $('#rv-buy').classList.toggle('hidden', !enough); $('#rv-shop').classList.toggle('hidden', enough);
}
function openRevive() { reviveOpen = true; held = true; sfx.play('error'); renderRevive(); show('#revive'); }
function closeRevive() { reviveOpen = false; held = false; hide('#revive'); }
function setupRevive() {
  $('#rv-buy').onclick = async () => {
    if (reviveBusy || !reviveOpen) return; reviveBusy = true;
    const r = await Wallet.spend('boost', 'lives', revivePrice(), D.MAPS[levelIdx].lvl); reviveBusy = false;
    if (!reviveOpen || !sim) return;
    if (r && r.ok) { persist(); closeRevive(); sim.reviveWith(D.REVIVE.lives); sfx.play('win'); ctrl.note(`+${D.REVIVE.lives} жизней`); }
    else { sfx.play('error'); if (r && r.error === 'gems') renderRevive(); else ctrl.note('Не получилось, попробуй ещё раз'); }
  };
  $('#rv-shop').onclick = () => { hide('#revive'); ctrl.openShop(); };            // окно возрождения прячется под магазин и возвращается, когда его закроют
  $('#rv-no').onclick = () => { if (!reviveOpen || !sim) return; closeRevive(); sim.giveUp(); };
}
// текущие очки в меню паузы (в рейтинговом забеге — за весь забег и время)
function renderPauseScore() {
  const box = $('#p-score'); if (!sim || D.MAPS[levelIdx].tutorial) { box.innerHTML = ''; return; }
  const sc = Math.round(sim.score), img = `<img src="${SCORE_ICON}" alt="">`;
  box.innerHTML = run
    ? `<div class="ps-v">${img}${fmt(run.score + sim.score)}</div><small>Рубеж ${run.i + 1} из ${run.levels.length} · время ${clock(run.time + sim.time)} · за этот рубеж +${fmt(sc)}</small>`
    : `<div class="ps-v">${img}${fmt(sc)}</div><small>Очки за уровень · волна ${sim.wave} из ${sim.total}</small>`;
}
function setPause(p) {
  if (!running) return; paused = p; sfx.play('click');
  if (p) { renderPauseScore(); show('#pausemenu'); } else hide('#pausemenu');
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
const submitRun = (won) => Net.submit({ level: RUN.level, diff: RUN.diff, score: run.score, wave: run.waves, kills: run.kills, won, duration: run.time, lv: run.i + 1, loadout: (run.loadout || []).join(',') }).then((r) => { if (r && r.gems_drop) { Wallet.sync(); setTimeout(() => { sfx.play('win'); ctrl.note(`Награда забега: +${r.gems_drop} ${r.gems_drop === 1 ? 'кристалл' : 'кристалла'}`); }, 900); } return r; });
// Игрок закрыл приложение посреди рубежа: лучшее, чего он достиг, всё равно уходит в таблицу (запрос с keepalive переживает закрытие страницы)
function flushRun() {
  if (!run || !running || run.done || !sim || sim.state !== 'play') return;
  const wv = run.waves + sim.wave, score = run.score + sim.score, time = run.time + sim.time; if (wv < 1) return;
  const sig = `${run.i}:${Math.round(score)}:${wv}`; if (run.sent === sig) return; run.sent = sig;
  const r = save.rank ||= { lv: 0, score: 0, time: 0, fast: 0 }, cand = { lv: run.i + 1, score: Math.round(score), time: Math.round(time) };
  if (betterRun(cand, r)) { r.lv = cand.lv; r.score = cand.score; r.time = cand.time; r.loadout = (run.loadout || []).join(','); persist(); }
  Net.submit({ level: RUN.level, diff: RUN.diff, score, wave: wv, kills: run.kills + sim.stats.kills, won: false, duration: time, lv: run.i + 1, loadout: (run.loadout || []).join(',') }, { keepalive: true });
}
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
  const fit = () => { const r = stage.getBoundingClientRect(); if (r.width > 0) { needDraw = true; renderer.resize(r.width, r.height, Math.min(window.devicePixelRatio || 1, TG.isMobile ? 1.5 : 2)); }; };
  new ResizeObserver(fit).observe(stage); window.addEventListener('resize', fit); ctrl.fit = fit;
}
// Подготовка к уровню: окно выбора зданий по слотам (обучение и повтор уровня идут без него)
function prepareLevel(levelId, diffIdx, again = false) {
  const L = D.MAPS.find((l) => l.id === levelId); ensureLevel(L);
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
function openLoadoutFor(levelId, diffIdx) {                 // перед каждым уровнем забега: слоты и открытые здания игрока, как в обычной игре
  const lv = D.MAPS.find((l) => l.id === levelId); ensureLevel(lv);
  menus.openLoadout({ title: `${run.i + 1}/${run.levels.length} · ${lv.name}`, slots: slotsOf(save), all: false, initial: run.loadout || getLoadout(save), nobackBtn: run.i > 0,
    onGo: (list) => { run.loadout = list.slice(); startLevel(levelId, diffIdx, true, list); } });
  updateBack();
}
let starting = false;
async function startLevel(levelId, diffIdx, ranked, loadout, boosts = []) {
  if (starting) return; starting = true;
  const tm = setTimeout(() => busy(true), 160);
  try { await ensureLevel(D.MAPS.find((l) => l.id === levelId)); } finally { clearTimeout(tm); busy(false); starting = false; }
  levelIdx = D.MAPS.findIndex((l) => l.id === levelId); diffI = diffIdx;
  const L = D.MAPS[levelIdx], tut = !!L.tutorial;
  hideAll(); show('#game'); tally++;
  if (!ranked) { run = null; ctrl.run = null; }
  const std = !tut;                                      // в обучении без даров Кузницы; в рейтинговом забеге действует всё, что игрок открыл и прокачал
  sim = new Sim({ mapId: levelIdx, diffIdx, seed: (Math.random() * 1e9) | 0, perks: boostMods(perkMods(std ? save.perks : {}), boosts, diffIdx), locked: std ? lockedItems(save) : [],
    allowed: loadout, limits: tut ? { bolt: 1, mine: 1 } : null, gold: tut ? 110 : null, hold: tut });
  ctrl.sim = sim; if (location.search.includes('debug')) window.__bk = ctrl;
  if (gore) gore.dispose();
  gore = new Gore(); gore.muzzle = A.muzzle; gore.headAngle = A.headAngle; ctrl.gore = gore; gore.level = 1; gore.attach(sim); gore.onSound = (n, v) => sfx.play(n, v);
  attachSfx(sim, sfx);
  for (const t of loadout || []) {                          // спрайты взятых зданий готовим заранее, чтобы в бою не было задержек
    const lvs = [[1, null], [2, null], [3, null], [4, 'A'], [5, 'A'], [4, 'B'], [5, 'B']];
    if (D.ECON[t]) for (let lv = 1; lv <= 5; lv++) A.econBody(t, lv); else for (const [lv, br] of lvs) { const at = A.artType(t); A.towerBody(at, lv, br); A.towerHead(at, lv, br); }
  }
  renderer.setGame(sim, gore); ctrl.fit();
  view.selected = null; view.armed = null; view.hover = null; view.spell = null; view.hint = null;
  document.body.classList.toggle('ranked', ranked); $('#chip-time').classList.toggle('hidden', !ranked);
  ui.attachSim(sim, loadout);
  meta = new Meta(save, { persist, onUnlock: showAchToast }); meta.attach(sim, diffIdx, levelIdx, { soulMult: boosts.includes('souls') ? 1.5 : 1 }); pollT = 0;
  sim.revive.on = !ranked && !tut && diffIdx !== 4;           // возрождение за кристаллы: только обычная игра (не обучение, не Хардкор и не рейтинговый забег)
  sim.on('limbo', () => openRevive());
  sim.on('over', (d) => onOver(d));
  $('#b-pause').classList.remove('on');
  reviveOpen = false; hide('#revive'); running = true; paused = false; held = false; acc = 0; ending = null; lastHud = ''; kick();
  save.plays++; save.last = { level: levelId, diff: diffIdx }; if (!ranked && !tut) (save.lastDiff ||= {})[levelId] = diffIdx; persist();
  TG.closingConfirm(true); updateBack();
  sfx.unlock(); sfx.stopMusic(); sfx.play('start');                       // на уровнях музыки нет — только звуки боя; меню снова включит свою тему
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
  sfx.play('upgrade');
}
function onOver({ won }) {
  save.kills += sim.stats.kills; persist();
  ending = { t: won ? 2.2 : 1.8, won, shown: false };
  if (D.MAPS[levelIdx].tutorial) return;                  // обучение в таблицу не уходит
  if (run) {                                              // копим результат забега; в таблицу уходит один итог
    run.score += sim.score; run.time += sim.time; run.kills += sim.stats.kills; run.waves += sim.wave;
    run.done = !won || run.i >= run.levels.length - 1;
    if (run.done) { recordRun(won); ending.submit = submitRun(won && run.i >= run.levels.length - 1); }
    else { recordRun(false); submitRun(false); }              // прогресс забега сохраняется после каждого рубежа: даже если выйти, результат уже учтён
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
  const rows = [['waves', v.waves], ['kills', v.kills], ['time', v.time], ...(v.leaks ? [['leaks', v.leaks]] : [])];
  for (const [k, val] of rows) {
    const r = L(k); r.classList.add('in'); if (!cancelled()) sfx.play(val < 0 ? 'error' : 'click');
    await count(r.querySelector('b'), 0, val, val ? 380 : 120, val < 0 ? '' : '+'); if (!cancelled()) await sleep(110);
  }
  const sub = L('sub'); sub.classList.add('in'); await count(sub.querySelector('b'), 0, v.sub, 320);
  if (!cancelled()) await sleep(260);
  const mul = L('mul'); mul.classList.add('in'); if (!cancelled()) { sfx.play('upgrade'); }
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
    ${v.leaks ? `<div class="vr neg" data-k="leaks"><span><img src="${L('heart', 22)}" alt="">Пропущено врагов<small>${s.leaks}</small></span><b>0</b></div>` : ''}
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
  $('#e-again').textContent = run ? 'Новый забег' : 'Ещё раз'; $('#e-again').classList.toggle('hidden', more || (tut && won));
  $('#e-menu').textContent = run ? 'В меню' : tut ? 'В меню' : 'На карту';
  if (tut && won) { $('#e-next').classList.remove('hidden'); $('#e-next').textContent = 'К карте'; }
  show('#endmenu');
  if (!tut) { $('#endmenu .modal').classList.add('tally'); const token = ++tally; playVerdict(v, token); }
  else $('#endmenu .modal').classList.remove('tally');
  if (ending && ending.submit) ending.submit.then((res) => { if (res && res.ok && !run && !$('#endmenu').classList.contains('hidden')) { const e = $('#end-rank'); e.innerHTML = `<img src="${L('crown', 28)}" alt="">#${res.level_rank}`; e.classList.remove('hidden'); } });
}

// ───────── цикл ─────────
// Цикл кадров крутится только пока идёт бой: в меню и магазине он не будит телефон 60 раз в секунду (раньше пустой цикл работал всегда).
let rafId = 0;
function kick() { cancelAnimationFrame(rafId); last = performance.now(); rafId = requestAnimationFrame(frame); }       // при каждом старте уровня цикл перезапускается заново
function frame(now) {
  if (!running) return;
  rafId = requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; dt = Math.min(dt, 0.1);
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
  drawAcc += dt;
  const camMove = panning || renderer.vx || renderer.vy || renderer.goal;                        // карта едет — рисуем каждый кадр, иначе прокрутка идёт рывками
  if ((drawAcc >= DRAW_MIN || camMove) && (!frozen || !wasFrozen || needDraw)) { renderer.render(frozen ? 0 : Math.min(drawAcc, 0.1), view); needDraw = false; drawAcc = 0; }     // на паузе и в окнах холст не перерисовывается; на телефоне рисуем не чаще ~30 к/с, расчёт при этом идёт 60 раз в секунду
  wasFrozen = frozen;
  ui.update(frozen ? 0 : dt); updateRunHud();
}

// ───────── ввод ─────────
function setupInput() {
  const cv = $('#cv'); let down = null;
  const cellOf = (p) => ({ c: Math.floor(p.x / D.CELL), r: Math.floor(p.y / D.CELL) });
  const DRAG = 7;                                              // сдвиг пальца (px), после которого касание считается прокруткой карты
  cv.addEventListener('pointerdown', (e) => {
    if (!running || paused || held || down) return; sfx.unlock(); e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* */ }
    const p = renderer.toWorld(e.clientX, e.clientY); view.hoverPx = p; renderer.vx = renderer.vy = 0;
    down = { id: e.pointerId, p, type: e.pointerType, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), lt: performance.now(), pan: false, vx: 0, vy: 0 };
  });
  cv.addEventListener('pointermove', (e) => {
    if (!running || paused || held) return;
    if (down && down.id === e.pointerId && !view.spell) {                       // тянем карту
      if (!down.pan && Math.hypot(e.clientX - down.x, e.clientY - down.y) > DRAG) down.pan = true;
      if (down.pan) {
        panning = true;
        const now = performance.now(), dt = Math.max(1, now - down.lt) / 1000;
        const dx = e.clientX - down.lx, dy = e.clientY - down.ly; down.lx = e.clientX; down.ly = e.clientY; down.lt = now;
        renderer.panBy(-dx, -dy); needDraw = true;
        down.vx = down.vx * 0.6 + (-dx / renderer.zoom / dt) * 0.4; down.vy = down.vy * 0.6 + (-dy / renderer.zoom / dt) * 0.4;
        return;
      }
    }
    const p = renderer.toWorld(e.clientX, e.clientY);
    if (e.pointerType === 'mouse' || view.spell) view.hoverPx = p;
    if (e.pointerType === 'mouse' && view.armed) view.hover = cellOf(p);
  });
  cv.addEventListener('pointerup', (e) => {
    if (!down || down.id !== e.pointerId) return;
    const d = down; down = null; panning = false;
    if (d.pan) { if (performance.now() - d.lt < 90) { renderer.vx = Math.max(-900, Math.min(900, d.vx)); renderer.vy = Math.max(-900, Math.min(900, d.vy)); } needDraw = true; return; }      // бросок: карта докатывается по инерции
    if (!running || paused || held) return;
    const p = renderer.toWorld(e.clientX, e.clientY);
    if (view.spell) {
      const r = sim.castSpell(view.spell, Math.min(D.WORLD_W, Math.max(0, p.x)), Math.min(D.WORLD_H, Math.max(0, p.y)));
      if (r === true) { view.spell = null; ui.refreshCards(); } else ui.fail(r);
      return;
    }
    handleTap(p, e.pointerType);
  });
  cv.addEventListener('pointercancel', () => { down = null; panning = false; });
  cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') view.hover = null; });
  cv.addEventListener('contextmenu', (e) => { e.preventDefault(); ui.disarm(); ui.deselect(); ui.setOpen(false); view.spell = null; });
  window.addEventListener('keydown', (e) => {
    if (!running) return;
    if (e.key === ' ') { e.preventDefault(); setPause(!paused); }
    else if (e.key === 'Escape') { if (ui.sellB) ui.closeSell(); else if (ui.upB) ui.closeUpgrade(); else { ui.disarm(); ui.deselect(); ui.setOpen(false); view.spell = null; } }
    else if (/^[1-9]$/.test(e.key) && !held) { if (ui.cards[+e.key - 1]) ui.onCard(ui.cards[+e.key - 1]); }
    else if (e.key === 'n' || e.key === 'N') { const w = document.querySelector('.wcall:not(.hidden)'); if (w) w.click(); }
  });
  window.addEventListener('pagehide', flushRun);
  // звук включается и «оживает» с любого касания: iOS принимает только click/touchend, а после звонка или сворачивания контекст уходит в suspended/interrupted
  for (const ev of ['click', 'touchend']) document.addEventListener(ev, () => sfx.unlock(), { capture: true, passive: true });
  TG.onVisibility((hidden) => { if (hidden) flushRun(); if (hidden && running && !paused && !held && ending === null && !location.search.includes('debug')) setPause(true); if (sfx.ctx) { if (hidden) sfx.ctx.suspend && sfx.ctx.suspend(); else sfx.ctx.resume && sfx.ctx.resume(); } });
}
function handleTap(p, ptype) {
  if (ui.open) ui.setOpen(false);
  const bag = sim.bagAt(p.x, p.y);
  if (bag) { sim.collectBag(bag, true); return; }
  if (sim.chestAt(p.x, p.y)) { sim.hitChest(); return; }
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
