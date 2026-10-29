// Мета-прогресс: души, дары кузницы, открытие башен, достижения. Не зависит от DOM (можно тестировать в Node).
import * as D from './data.js?v=20261029182134';

export const SOUL_K = 5;                    // общий множитель душ: полное прохождение уровня на «Ужасе» даёт около 95 душ, на «Ночном кошмаре» около 330; вся прокачка и открытие всего стоит около 10 000

// ───── Дары кузницы ─────
export const PERKS = [
  { id: 'treasury', now: (l) => `+${15 * l} золота`, name: 'Казна', icon: 'coin', max: 5, c0: 25, per: '+15 золота на старте', mod: (l) => ({ startGold: 15 * l }) },
  { id: 'fortress', now: (l) => `+${2 * l} жизни`, name: 'Крепость', icon: 'heart', max: 5, c0: 30, per: '+2 жизни', mod: (l) => ({ lives: 2 * l }) },
  { id: 'taxes', now: (l) => `+${8 * l}% с рудника`, name: 'Налоги', icon: 'income', max: 5, c0: 40, per: '+8% золота с каждой монеты рудника', mod: (l) => ({ mine: 0.08 * l }) },
  { id: 'temper', now: (l) => `+${(2.5 * l).toFixed(1).replace('.0', '')}% урона`, name: 'Закалка', icon: 'sword', max: 5, c0: 50, per: '+2.5% урона башен', mod: (l) => ({ dmg: 0.025 * l }) },
  { id: 'aim', now: (l) => `+${5 * l}% крита`, name: 'Меткость', icon: 'crit', max: 10, c0: 30, g: 1.28, per: '+5% шанса крита (до 50%). Крит бьёт сильнее с 3-го уровня башни', mod: (l) => ({ crit: 0.05 * l }) },
  { id: 'builder', now: (l) => `-${3 * l}% к ценам`, name: 'Бережливость', icon: 'coins', max: 5, c0: 45, per: 'Постройки и улучшения дешевле на 3%', mod: (l) => ({ build: 0.03 * l }) },
  { id: 'spells', now: (l) => `-${8 * l}% к перезарядке`, name: 'Мастер чар', icon: 'book', max: 5, c0: 40, per: '-8% к перезарядке заклинаний', mod: (l) => ({ spellCd: 0.08 * l }) },
  { id: 'rhythm', now: (l) => `+${2 * l}% скорости`, name: 'Боевой ритм', icon: 'rate', max: 5, c0: 55, per: '+2% к скорострельности всех башен', mod: (l) => ({ rate: 0.02 * l }) },
  { id: 'caller', now: (l) => `+${10 * l}% золота`, name: 'Нетерпение', icon: 'hourglass', max: 5, c0: 35, per: '+10% золота за ранний вызов волны', mod: (l) => ({ call: 0.1 * l }) },
  { id: 'merchant', now: (l) => `+${4 * l}% при продаже`, name: 'Торговец', icon: 'sell', max: 3, c0: 30, per: '+4% при продаже', mod: (l) => ({ sell: 0.04 * l }) },
];
export const perkCost = (p, level) => Math.round(p.g ? p.c0 * Math.pow(p.g, level) : p.c0 * (1 + 0.7 * level));
export function perkMods(levels) {
  const out = {};
  for (const p of PERKS) { const l = (levels && levels[p.id]) || 0; if (l) for (const [k, v] of Object.entries(p.mod(l))) out[k] = (out[k] || 0) + v; }
  return out;
}
export function buyPerk(save, id) {
  const p = PERKS.find((x) => x.id === id); const lv = save.perks[id] || 0;
  if (!p || lv >= p.max) return 'max';
  const c = perkCost(p, lv); if (save.souls < c) return 'souls';
  save.souls -= c; save.perks[id] = lv + 1; return true;
}

// ───── Закрытые башни и здания: открываются в Кузнице за души или за донат-монеты ─────
export const itemUnlocked = (save, type) => !D.unlockOf(type) || !!save.unlocked[type];
export const towerUnlocked = itemUnlocked;
export const lockedItems = (save) => [...Object.keys(D.TOWERS), ...Object.keys(D.ECON)].filter((t) => !itemUnlocked(save, t));
export const lockedTowers = lockedItems;
// currency: 'souls' | 'gems'
export function unlockItem(save, type, currency = 'souls') {
  const u = D.unlockOf(type); if (!u || save.unlocked[type]) return 'done';
  if (currency === 'gems') { if ((save.gems || 0) < u.gems) return 'gems'; save.gems -= u.gems; }
  else { if (save.souls < u.souls) return 'souls'; save.souls -= u.souls; }
  save.unlocked[type] = 1; return true;
}
export const unlockTower = unlockItem;

// ───── Слоты и набор для боя ─────
export const slotsOf = (save) => Math.max(D.SLOT_START, Math.min(D.SLOT_MAX, save.slots || D.SLOT_START));
export function buySlot(save, currency = 'souls') {
  const n = slotsOf(save); if (n >= D.SLOT_MAX) return 'max';
  const c = D.SLOT_COST[n];
  if (currency === 'gems') { if ((save.gems || 0) < c.gems) return 'gems'; save.gems -= c.gems; }
  else { if (save.souls < c.souls) return 'souls'; save.souls -= c.souls; }
  save.slots = n + 1; return true;
}
// набор для боя: только открытые вещи, без повторов, не больше слотов; пустой набор → арбалет и рудник
export function getLoadout(save, slots = slotsOf(save), all = false) {
  const ok = (t) => (D.TOWERS[t] || D.ECON[t]) && (all ? !D.isPremium(t) : itemUnlocked(save, t));       // в забеге премиум не берётся
  const out = []; for (const t of save.loadout || []) if (ok(t) && !out.includes(t) && out.length < slots) out.push(t);
  return out.length ? out : ['bolt', 'mine'].slice(0, slots);
}

// ───── Прогресс кампании ─────
// save.prog.cleared[levelId][diffIdx] = 1; save.prog.scores[`${levelId}_${diffIdx}`] = лучший счёт
export const diffCleared = (save, id, d) => !!(save.prog.cleared[id] && save.prog.cleared[id][d]);
export const levelCleared = (save, id) => !!save.prog.cleared[id] && Object.keys(save.prog.cleared[id]).length > 0;
// обучение считается пройденным и у тех, кто уже играл до его появления
export const tutorialDone = (save) => !!save.tutDone || Object.keys(save.prog.cleared).some((k) => k !== 'tut' && levelCleared(save, k));
export const levelUnlocked = (save, level) => level.after.length === 0 || level.after.some((a) => (a === 'tut' ? tutorialDone(save) : levelCleared(save, a)));
export const diffUnlocked = () => true;      // все сложности открыты сразу на каждой карте
export const levelStars = (save, id) => (save.prog.cleared[id] ? Object.keys(save.prog.cleared[id]).length : 0);
export const clearedCount = (save) => D.CAMPAIGN.filter((l) => levelCleared(save, l.id)).length;
export function markCleared(save, id, d) { (save.prog.cleared[id] ||= {})[d] = 1; if (id === 'tut') save.tutDone = 1; }
export function bestScore(save, id, d) { return save.prog.scores[`${id}_${d}`] || 0; }
export function totalScore(save) { return Object.values(save.prog.scores).reduce((a, b) => a + b, 0); }
// следующий уровень после победы (первый ещё не пройденный из открывшихся)
export function nextAfter(save, id) {
  const opened = D.MAPS.filter((l) => l.after.includes(id) && levelUnlocked(save, l));
  return opened.find((l) => !levelCleared(save, l.id)) || opened[0] || null;
}

// ───── Достижения ─────
// val(ctx) — текущий прогресс, goal — цель. ctx = { run, life, save }.
const L = (k) => (c) => c.life[k] || 0;
const R = (k) => (c) => c.run[k] || 0;
export const ACH = [
  { id: 'first_blood', name: 'Первая кровь', desc: 'Убей первого врага', goal: 1, val: L('kills'), reward: 5 },
  { id: 'hundred', name: 'Сотня голов', desc: '100 убийств за одну партию', goal: 100, val: R('kills'), reward: 10 },
  { id: 'thousand', name: 'Жатва', desc: '1000 убийств за всё время', goal: 1000, val: L('kills'), reward: 25 },
  { id: 'ten_k', name: 'Бойня', desc: '10 000 убийств за всё время', goal: 10000, val: L('kills'), reward: 80 },
  { id: 'decap', name: 'Охотник за головами', desc: 'Отруби 50 голов критами и казнями арбалета', goal: 50, val: L('decaps'), reward: 20 },
  { id: 'lumberjack', name: 'Лесоруб', desc: 'Убей 100 врагов пилами', goal: 100, val: L('sawKills'), reward: 20 },
  { id: 'sculptor', name: 'Ледяная скульптура', desc: 'Разбей 50 замёрзших врагов', goal: 50, val: L('shatters'), reward: 20 },
  { id: 'storm', name: 'Грозовой фронт', desc: 'Поразить одним разрядом Теслы 6 врагов', goal: 6, val: R('chainMax'), reward: 15 },
  { id: 'birds', name: 'Птичья охота', desc: 'Сбей 150 воздушных врагов', goal: 150, val: L('airKills'), reward: 20 },
  { id: 'burn', name: 'Жареное мясо', desc: 'Убей 100 врагов огнём', goal: 100, val: L('burnKills'), reward: 20 },
  { id: 'bags', name: 'Золотая жила', desc: 'Собери 50 монет', goal: 50, val: L('bagsTapped'), reward: 15 },
  { id: 'bags500', name: 'Король мешков', desc: 'Собери 500 монет', goal: 500, val: L('bagsTapped'), reward: 40 },
  { id: 'scrooge', name: 'Скряга', desc: 'Держи 1000 золота одновременно', goal: 1000, val: R('maxGold'), reward: 20 },
  { id: 'mine_king', name: 'Горный король', desc: 'Построй 6 рудников одновременно', goal: 6, val: R('maxMines'), reward: 20 },
  { id: 'gold_lvl', name: 'Золотая лихорадка', desc: 'Прокачай рудник до 5 уровня', goal: 5, val: R('maxMineLvl'), reward: 15 },
  { id: 'tycoon', name: 'Магнат', desc: 'Доход 100 золота за тик', goal: 100, val: R('maxIncome'), reward: 40 },
  { id: 'collector', name: 'Коллекционер', desc: 'Построй 4 разные башни за одну партию', goal: 4, val: R('typesBuilt'), reward: 25 },
  { id: 'master', name: 'Мастер', desc: 'Прокачай башню до 5 уровня', goal: 5, val: R('maxTowerLvl'), reward: 10 },
  { id: 'both_ways', name: 'Две дороги', desc: 'Имей ветки A и B одной башни одновременно', goal: 1, val: R('bothBranches'), reward: 15 },
  { id: 'impatient', name: 'Нетерпеливый', desc: 'Вызови 10 волн досрочно за партию', goal: 10, val: R('earlyCalls'), reward: 15 },
  { id: 'wave10', name: 'Выживший', desc: 'Дойди до 10 волны', goal: 10, val: L('bestWave'), reward: 10 },
  { id: 'wave20', name: 'Ветеран', desc: 'Дойди до 15 волны', goal: 15, val: L('bestWave'), reward: 25 },
  { id: 'win', name: 'Редут стоит', desc: 'Пройди любой уровень кампании', goal: 1, val: L('wins'), reward: 60 },
  { id: 'hell_win', name: 'Хозяин Ада', desc: 'Победи на сложности «Ад»', goal: 1, val: L('hellWin'), reward: 120 },
  { id: 'hardcore_win', name: 'Бессмертный', desc: 'Победи на «Ночном кошмаре»: одна жизнь', goal: 1, val: L('hardcoreWin'), reward: 250 },
  { id: 'levels10', name: 'Путешественник', desc: 'Пройди 10 уровней кампании', goal: 10, val: (c) => clearedCount(c.save), reward: 50 },
  { id: 'levels_all', name: 'Повелитель карты', desc: 'Пройди все уровни кампании', goal: D.CAMPAIGN.length, val: (c) => clearedCount(c.save), reward: 150 },
  { id: 'score_40', name: 'Счёт пошёл', desc: 'Набери 40 очков за один уровень', goal: 40, val: R('score'), reward: 30 },
  { id: 'score_150', name: 'Мастер счёта', desc: 'Набери 150 очков за один уровень', goal: 150, val: R('score'), reward: 120 },
  { id: 'flawless', name: 'Неприступный', desc: 'Победи, не потеряв ни одной жизни', goal: 1, val: L('flawless'), reward: 100 },
  { id: 'grim', name: 'Суровый воин', desc: 'Победи без рудников, банка, алтаря, рабочих и орды', goal: 1, val: L('noEconWin'), reward: 80 },
  { id: 'all_maps', name: 'Покоритель секторов', desc: 'Пройди хотя бы по одному уровню в каждом секторе', goal: 5, val: (c) => new Set(D.CAMPAIGN.filter((l) => levelCleared(c.save, l.id)).map((l) => l.sector)).size, reward: 70 },
  { id: 'arsenal', name: 'Арсенал', desc: 'Открой все башни в Кузнице душ', goal: 1, val: (c) => (lockedTowers(c.save).length === 0 ? 1 : 0), reward: 30 },
  { id: 'weekly_win', name: 'Кровавая охота', desc: 'Пройди недельный уровень', goal: 1, val: L('weeklyWins'), reward: 60 },
  { id: 'tempered', name: 'Закалённый', desc: 'Прокачай любой дар Кузницы до максимума', goal: 1, val: (c) => (PERKS.some((p) => (c.save.perks[p.id] || 0) >= p.max) ? 1 : 0), reward: 25 },
];
for (const a of ACH) a.reward = Math.max(1, Math.round(a.reward * 0.4 * SOUL_K * 0.75));      // за все достижения вместе около 2400 душ


export function newLife() { return { kills: 0, decaps: 0, sawKills: 0, shatters: 0, airKills: 0, burnKills: 0, bagsTapped: 0, bosses: {}, bestWave: 0, wins: 0, hellWin: 0, flawless: 0, noEconWin: 0, hardcoreWin: 0, weeklyWins: 0, mapWins: {}, levels: 0 }; }

// ───── Трекер партии: слушает события симуляции, начисляет души и открывает достижения ─────
export class Meta {
  constructor(save, { persist = () => {}, onUnlock = () => {} } = {}) { this.save = save; this.persist = persist; this.onUnlock = onUnlock; }

  attach(sim, diffIdx, mapId, opts = {}) {
    const save = this.save; if (!save.life) save.life = newLife();
    const life = save.life, dm = (D.DIFFS[diffIdx] || D.DIFFS[1]).souls * (opts.soulMult || 1);
    this.sim = sim; this.diffIdx = diffIdx; this.mapId = mapId; this.closed = false;
    const run = this.run = { kills: 0, chainMax: 0, meteorBurst: 0, maxGold: 0, maxMines: 0, maxMineLvl: 0, maxIncome: 0, hordeSet: new Set(), hordeTiers: 0, builtSet: new Set(), typesBuilt: 0,
      maxTowerLvl: 0, bothBranches: 0, earlyCalls: 0, econUsed: false, souls: 0, soulsF: 0, newAch: [], startLives: sim.lives, score: 0 };
    const tut = !!sim.map.tutorial;                     // обучение наград не раздаёт: только подарок за прохождение
    this.tut = tut;
    const award = (x) => { if (tut) return; run.soulsF += x * dm * SOUL_K; const w = Math.floor(run.soulsF); if (w > 0) { run.soulsF -= w; run.souls += w; save.souls += w; } };
    this.award = award;
    let burst = { t: -9, n: 0 };
    sim.on('kill', (d) => {
      run.kills++; life.kills++;
      const how = d.how;
      if (how === 'crit' || how === 'execute') life.decaps++;
      if (how === 'saw') life.sawKills++;
      if (d.frozen || how === 'shatter') life.shatters++;
      if (how === 'fire') life.burnKills++;
      if (d.e.air) life.airKills++;
      if (how === 'meteor') { if (sim.time - burst.t < 0.25) burst.n++; else burst = { t: sim.time, n: 1 }; run.meteorBurst = Math.max(run.meteorBurst, burst.n); }
    });
    sim.on('lightning', (d) => { run.chainMax = Math.max(run.chainMax, d.pts.length - 1); });
    sim.on('bag', (d) => { if (d.tapped) life.bagsTapped++; });
    sim.on('build', (b) => { if (b.kind === 'econ') run.econUsed = true; else run.builtSet.add(b.type); run.typesBuilt = run.builtSet.size; this.scan(); });
    sim.on('upgrade', () => this.scan());
    sim.on('econ', (d) => { run.econUsed = true; if (d.kind === 'horde') { run.hordeSet.add(d.i); run.hordeTiers = run.hordeSet.size; } });
    sim.on('callwave', () => { run.earlyCalls++; });
    sim.on('wave', (d) => { life.bestWave = Math.max(life.bestWave, d.n); award(0.3 + d.n * 0.02); this.persist(); });
    sim.on('over', (d) => this.finish(d.won));
  }
  scan() {
    const sim = this.sim, run = this.run; let mines = 0, mineLvl = 0, tl = 0; const br = {};
    for (const b of sim.buildings) {
      if (b.type === 'mine') { mines++; mineLvl = Math.max(mineLvl, b.level); }
      if (b.kind === 'tower') { tl = Math.max(tl, b.level); if (b.branch) (br[b.type] ||= new Set()).add(b.branch); }
    }
    run.maxMines = Math.max(run.maxMines, mines); run.maxMineLvl = Math.max(run.maxMineLvl, mineLvl); run.maxTowerLvl = Math.max(run.maxTowerLvl, tl);
    for (const k of Object.keys(br)) if (br[k].size >= 2) run.bothBranches = 1;
  }
  // вызывать раз в секунду-две
  poll() {
    if (!this.sim) return;
    const run = this.run, sim = this.sim;
    run.score = sim.score; run.maxGold = Math.max(run.maxGold, Math.floor(sim.gold)); run.maxIncome = Math.max(run.maxIncome, sim.incomePerTick());
    const ctx = { run, life: this.save.life, save: this.save };
    for (const a of ACH) {
      if (this.tut || this.save.ach[a.id]) continue;
      if (a.val(ctx) >= a.goal) { this.save.ach[a.id] = 1; this.save.souls += a.reward; run.souls += a.reward; run.newAch.push(a); this.onUnlock(a); this.persist(); }
    }
  }
  finish(won) {
    if (this.closed) return; this.closed = true;
    const save = this.save, life = save.life, sim = this.sim, run = this.run;
    if (won && this.tut && !save.tutDone) { save.souls += 60; run.souls += 60; }      // подарок новичку: хватит на первую закрытую башню
    if (won) {
      this.award(12);
      life.wins++; if (this.diffIdx >= 3) life.hellWin = 1;
      if (this.diffIdx === 4) life.hardcoreWin = 1;
      if (sim.lives >= run.startLives) life.flawless = 1;
      if (!run.econUsed) life.noEconWin = 1;
      if (!sim.map.weekly) { (life.mapWins ||= {})[sim.map.id] = 1; markCleared(save, sim.map.id, this.diffIdx); }
    }
    { const k = `${sim.map.id}_${this.diffIdx}`; sim.score = Math.round(sim.score); if (sim.score > (save.prog.scores[k] || 0)) save.prog.scores[k] = sim.score; }
    life.bestWave = Math.max(life.bestWave, won ? sim.total : sim.wave);
    this.poll(); this.persist();
  }
  // игрок вышел из партии (меню/рестарт) — зафиксировать то, что успели
  abandon() { if (!this.closed && this.sim) { this.closed = true; this.poll(); this.persist(); } }
}
