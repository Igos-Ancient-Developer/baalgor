// Игровая симуляция. Никакого DOM/canvas — только состояние и события (emit).
// Рендер, гор, звук и UI подписываются на события через sim.on(type, fn).
import * as D from './data.js?v=20261023175722';
const { CELL, COLS, ROWS } = D;

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Path {
  constructor(cells) {
    this.cells = cells;
    this.pts = cells.map(([c, r]) => ({ x: (c + 0.5) * CELL, y: (r + 0.5) * CELL }));
    this.cum = [0];
    for (let i = 1; i < this.pts.length; i++) {
      const a = this.pts[i - 1], b = this.pts[i];
      this.cum.push(this.cum[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
    }
    this.total = this.cum[this.cum.length - 1];
  }
  at(d, out = {}) {
    if (d < 0) d = 0;
    if (d > this.total) d = this.total;
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < d) i++;
    const a = this.pts[i - 1], b = this.pts[i];
    const sl = this.cum[i] - this.cum[i - 1] || 1;
    const t = (d - this.cum[i - 1]) / sl;
    out.x = a.x + (b.x - a.x) * t; out.y = a.y + (b.y - a.y) * t;
    out.dx = (b.x - a.x) / sl; out.dy = (b.y - a.y) / sl;
    return out;
  }
}

const TARGET_MODES = ['Первый', 'Последний', 'Сильный', 'Ближний'];
export { TARGET_MODES };

export class Sim {
  constructor({ mapId = 0, diffIdx = 1, seed = 1, perks = null, locked = [], allowed = null, limits = null, gold = null, hold = false, autoCollect = false } = {}) {
    this.autoCollect = autoCollect;      // боты: монеты собираются сами; у игрока — только тапом
    this.mods = Object.assign({ startGold: 0, lives: 0, baseIncome: 0, mine: 0, dmg: 0, gold: 0, bag: 0, sell: 0, spellCd: 0 }, perks || {});
    this.locked = new Set(locked);
    this.allowed = allowed ? new Set(allowed) : null;      // набор зданий, взятых в бой (слоты); null — можно всё
    this.limits = limits;                                  // потолок по типам (обучение)
    this.hold = hold;                                      // true — таймер волн стоит (обучение)
    this.xrng = mulberry32((seed ^ 0x5bd1e995) | 0);       // отдельный генератор для сундука-сюрприза: не сдвигает остальные случайности
    this.orng = mulberry32((seed ^ 0x9e3779b9) | 0);       // отдельный генератор: какие 2 из 3 улучшений предложить
    this.map = D.MAPS[mapId];
    this.mapId = mapId;
    this.diffIdx = diffIdx; this.D = D.DIFFS[diffIdx]; this.total = this.map.waves; this.score = 0; this.buildIdxMap();
    this.lf = D.levelMult(this.map.lvl);                   // множитель глубины уровня
    this.parts = { waves: 0, kills: 0, time: 0, leaks: 0 }; this.verdict = null;
    this.rng = mulberry32(seed);
    this.handlers = {};
    this.paths = this.map.paths.map((p) => new Path(p));
    this.flyPaths = this.paths;                       // летающие враги идут над той же дорогой, что и наземные

    // сетка: путь/декор — занято
    this.pathCell = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    for (const p of this.map.paths) {
      for (let i = 1; i < p.length; i++) {
        const [c0, r0] = p[i - 1], [c1, r1] = p[i];
        const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0);
        let c = c0, r = r0;
        for (;;) {
          if (c >= 0 && c < COLS && r >= 0 && r < ROWS) this.pathCell[r][c] = true;
          if (c === c1 && r === r1) break;
          c += dc; r += dr;
        }
      }
    }
    this.decorCell = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    for (const [c, r] of this.map.decor) this.decorCell[r][c] = true;
    for (const [c, r] of this.map.block || []) this.decorCell[r][c] = true;      // у портала и ворот строить нельзя
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.chest = null; this.placeChest();

    this.time = 0;
    this.gold = gold ?? (D.START_GOLD + this.mods.startGold);
    this.lives = this.D.lives ?? (D.START_LIVES + this.mods.lives);
    this.wave = 0;
    this.nextWaveT = D.FIRST_WAVE_DELAY;
    this.tickT = 0;
    this.state = 'play';          // play | won | lost
    this.revive = { on: false, used: 0, max: 2 };      // возрождение за кристаллы (включает main: обычная игра, не Хардкор и не рейтинговый забег)
    this.limbo = false;           // враг прошёл в ворота на последней жизни: бой замер, ждём решения игрока
    this.enemies = []; this.buildings = []; this.guards = [];
    this.projs = []; this.zones = []; this.bags = []; this.fx = [];
    this.queue = []; this.qi = 0;
    this.eid = 0; this.bid = 0;
    this.baseIncome = D.BASE_INCOME + this.mods.baseIncome;
    this.workers = 0; this.hordeBuys = [0, 0, 0]; this.hordeWave = [0, 0, 0]; this.hordeInc = 0;
    this.pendingHorde = [];
    this.spellCd = { meteor: 0, stasis: 0, rush: 0 };
    this.rushT = 0;
    this.bannerT = 0;
    this.stats = { kills: 0, earned: 0, leaks: 0, built: 0, bags: 0, bagGold: 0 };
  }

  on(type, fn) { (this.handlers[type] ||= []).push(fn); return this; }
  emit(type, data) { const h = this.handlers[type]; if (h) for (let i = 0; i < h.length; i++) h[i](data); }

  // ───── строительство ─────
  inBounds(c, r) { return c >= 0 && c < COLS && r >= 0 && r < ROWS; }
  canBuild(c, r) { return this.inBounds(c, r) && !this.pathCell[r][c] && !this.decorCell[r][c] && !this.grid[r][c] && !(this.chest && this.chest.c === c && this.chest.r === r); }
  // ───── сундук-сюрприз ─────
  // Сундук появляется не только на видных местах: у краёв и в углах карты (куда надо докрутить) и за деревьями (из-за ствола виден лишь кусок).
  placeChest() {
    if (this.map.tutorial || this.xrng() >= D.CHEST_CHANCE) return;
    const spots = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (this.pathCell[r][c] || this.decorCell[r][c]) continue;
      const edge = c === 0 || c === COLS - 1, vedge = r === 0 || r === ROWS - 1;
      spots.push({ c, r, w: 1 + (edge ? 3 : 0) + (vedge ? 2 : 0) + (edge && vedge ? 3 : 0), x: (c + 0.5) * CELL, y: (r + 0.5) * CELL });
    }
    for (const [c, r, kind] of this.map.decor) if (kind === 'tree') {
      const side = this.xrng() < 0.5 ? -1 : 1;
      spots.push({ c, r, w: 12, x: (c + 0.5) * CELL + side * 11, y: (r + 0.5) * CELL + 3, behind: c + ',' + r });
    }
    if (!spots.length) return;
    let t = this.xrng() * spots.reduce((s2, q) => s2 + q.w, 0), sp = spots[spots.length - 1];
    for (const q of spots) { t -= q.w; if (t <= 0) { sp = q; break; } }
    this.chest = { c: sp.c, r: sp.r, x: sp.x, y: sp.y, hits: 0, shake: 0, born: 0, behind: sp.behind || null };
  }
  chestAt(x, y) { const ch = this.chest; return !!ch && Math.abs(x - ch.x) <= 28 && Math.abs(y - (ch.y - 8)) <= 28; }
  // касание сундука: он вздрагивает; после последнего касания взрывается, монеты сыплются на его место
  hitChest() {
    const ch = this.chest; if (!ch) return false;
    ch.hits++; ch.shake = 0.4;
    if (ch.hits < D.CHEST_HITS) { this.emit('chest', { kind: 'hit', hits: ch.hits, x: ch.x, y: ch.y }); return true; }
    const g = D.CHEST_GOLD; this.gold += g; this.stats.earned += g; this.chest = null;
    this.emit('chest', { kind: 'open', x: ch.x, y: ch.y, gold: g });
    return true;
  }
  canBuildAny() { for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (this.canBuild(c, r)) return true; return false; }
  countOf(kind, type) { let n = 0; for (const b of this.buildings) if (b.kind === kind && (b.type === type || b.prem === type)) n++; return n; }
  buildCost(kind, type) {
    if (kind === 'tower') return D.TOWERS[type].cost;
    const d = D.ECON[type];
    return Math.round(d.cost * Math.pow(d.grow, this.countOf('econ', type)));
  }
  buildLimit(kind, type) { return kind === 'econ' ? D.ECON[type].max : 99; }

  build(kind, type, c, r) {
    if (this.locked.has(type) || (this.allowed && !this.allowed.has(type))) return 'locked';
    if (!this.canBuild(c, r)) return 'cell';
    if (this.countOf(kind, type) >= this.buildLimit(kind, type) || (this.limits && this.limits[type] != null && this.countOf(kind, type) >= this.limits[type])) return 'limit';
    const cost = this.buildCost(kind, type);
    if (this.gold < cost) return 'gold';
    this.gold -= cost;
    const b = {
      id: ++this.bid, kind, type: kind === 'tower' && D.isPremium(type) ? D.TOWERS[type].base : type, prem: kind === 'tower' && D.isPremium(type) ? type : null, level: 1, branch: null, c, r,
      x: (c + 0.5) * CELL, y: (r + 0.5) * CELL, invested: cost, age: 0,
      cd: 0.3, target: null, retarget: 0, angle: -Math.PI / 2, st: null, kills: 0, picks: [0, 0], mode: (kind === 'tower' && D.TOWERS[type].defaultMode) || 0, pulses: 0,
      rateMult: 1, dmgMult: 1, stunT: 0, orbitA: 0, hitT: new Map(), frenzyT: 0, frenzyCd: 6, recoil: 0,
      offers: kind === 'tower' ? [this.rollOffer(), this.rollOffer()] : null,      // из трёх вариантов улучшения на каждой ступени предлагаются два
    };
    this.refreshStats(b);
    this.grid[r][c] = b; this.buildings.push(b);
    this.stats.built++;
    if (type === 'barracks') this.syncGuards(b);
    this.emit('build', b);
    return b;
  }
  refreshStats(b) {
    b.st = b.kind === 'tower' ? D.towerStats(b.prem || b.type, b.level, b.branch, b.picks) : D.econStats(b.type, b.level);
  }
  // варианты следующего улучшения (для башен — выбор из 2–3, для зданий — один)
  rollOffer() { const drop = Math.floor(this.orng() * 3) + 1; return [1, 2, 3].filter((v) => v !== drop); }
  upgradeOptions(b) {
    if (b.kind === 'tower') return D.upgradeOptions(b.type, b.level, b.branch, b.picks).filter((o) => o.kind !== 'pick' || !b.offers || b.offers[b.level - 1].includes(o.choice));
    const c = D.econUpgradeCost(b.type, b.level); if (c == null) return [];
    const nx = D.econStats(b.type, b.level + 1), cur = b.st, delta = [];
    for (const k of Object.keys(nx)) if (nx[k] !== cur[k]) delta.push({ k, from: cur[k] ?? 0, to: nx[k] });
    return [{ kind: 'econ', choice: 'U', name: D.ECON[b.type].name + ' ' + (b.level + 1), cost: c, level: b.level + 1, delta }];
  }
  upgradeCost(b) { const o = this.upgradeOptions(b); return o.length ? Math.min(...o.map((x) => x.cost)) : null; }
  needsBranch(b) { return b.kind === 'tower' && b.level === 3; }
  // choice: номер варианта (1..3) / 'A' | 'B' / не нужен, если вариант один
  upgrade(b, choice) {
    const opts = this.upgradeOptions(b);
    if (!opts.length) return 'max';
    const o = choice === undefined ? (opts.length === 1 ? opts[0] : null) : opts.find((x) => x.choice === choice);
    if (!o) return 'choice';
    if (this.gold < o.cost) return 'gold';
    this.gold -= o.cost; b.invested += o.cost; b.level = o.level; b.age = 0;
    if (b.kind === 'tower') { b.branch = o.branch; b.picks = o.picks.slice(); }
    this.refreshStats(b);
    if (b.type === 'barracks') this.syncGuards(b, true);
    this.emit('upgrade', b);
    return b;
  }
  sellValue(b) { return Math.round(b.invested * (b.age < 5 ? 1 : D.SELL_RATE + this.mods.sell)); }
  sell(b) {
    const v = this.sellValue(b);
    this.gold += v;
    this.grid[b.r][b.c] = null;
    this.buildings.splice(this.buildings.indexOf(b), 1);
    if (b.type === 'barracks') {
      this.guards = this.guards.filter((g) => {
        if (g.owner !== b) return true;
        this.releaseGuard(g); return false;
      });
    }
    this.emit('sell', { b, value: v });
    return v;
  }

  // ───── экономика ─────
  workerCost() { return Math.round(D.WORKERS.cost * Math.pow(D.WORKERS.grow, this.workers)); }
  buyWorker() {
    if (this.workers >= D.WORKERS.max) return 'max';
    const c = this.workerCost();
    if (this.gold < c) return 'gold';
    this.gold -= c; this.workers++;
    this.emit('econ', { kind: 'worker' });
    return true;
  }
  hordeCost(i) { const h = D.HORDE[i]; return Math.round(h.cost * Math.pow(h.grow, this.hordeBuys[i])); }
  buyHorde(i) {
    const h = D.HORDE[i];
    if (this.hordeWave[i] >= D.HORDE_MAX_PER_WAVE) return 'limit';
    const c = this.hordeCost(i);
    if (this.gold < c) return 'gold';
    this.gold -= c; this.hordeBuys[i]++; this.hordeWave[i]++;
    this.hordeInc += h.inc;
    this.pendingHorde.push(h.spawn);
    this.emit('econ', { kind: 'horde', i });
    return true;
  }
  mineIncome() { let s = 0; for (const b of this.buildings) if (b.type === 'mine') s += b.st.income; return s; }
  bankInterest() {
    let s = 0;
    for (const b of this.buildings) if (b.type === 'bank') s += Math.min(b.st.cap, Math.floor(this.gold * b.st.rate));
    return s;
  }
  // Доход, как в Plants vs Zombies: золото «просто так» не капает. Каждое здание добычи само выбрасывает монеты — их нужно тапнуть.
  incomePerTick() { return Math.round((this.mineIncome() + this.bankInterest()) * D.TICK / D.COIN_PERIOD); }   // золото за 10 с при полном сборе
  spawnCoin(kind, amt, x, y, b) {
    amt = Math.round(amt); if (amt <= 0) return;
    const bag = { kind, x, y, amt, t: 0, life: D.COIN_LIFE, b };
    this.bags.push(bag); this.emit('coinspawn', bag);
    if (this.autoCollect) this.collectBag(bag, false);
  }
  updateCoins(dt) {
    for (const b of this.buildings) {
      if (b.kind !== 'econ' || (b.type !== 'mine' && b.type !== 'bank')) continue;
      b.coinT = (b.coinT ?? D.COIN_FIRST) - dt;
      if (b.coinT > 0) continue;
      b.coinT += D.COIN_PERIOD;
      if (b.type === 'mine') this.spawnCoin('mine', b.st.income * (1 + this.mods.mine), b.x, b.y - 10, b);
      else this.spawnCoin('bank', Math.min(b.st.cap, Math.floor(this.gold * b.st.rate)) * (D.COIN_PERIOD / D.TICK), b.x, b.y - 8, b);
    }
  }
  collectBag(bag, tapped) {
    const i = this.bags.indexOf(bag); if (i < 0) return;
    this.bags.splice(i, 1);
    const g = Math.round(bag.amt * (1 + this.mods.bag) * (1 + this.D.gold) * (this.rushT > 0 ? 2 : 1));
    this.gold += g; this.stats.earned += g; this.stats.bags++; this.stats.bagGold += g;
    this.emit('bag', { x: bag.x, y: bag.y, gold: g, tapped, kind: bag.kind });
  }
  bagAt(x, y) {
    let best = null, bd = 40 * 40;
    for (const b of this.bags) { const d = (b.x - x) ** 2 + (b.y - 20 - y) ** 2; if (d < bd) { bd = d; best = b; } }
    return best;
  }

  // ───── волны ─────
  // «эквивалентный» номер волны: короткие уровни сжимают 30-волновую кривую
  // карта «номер волны уровня → эквивалентная волна кривой 1..30»: короткие уровни проходят кривую мягче (степень 0.6), боссы гарантированы
  buildIdxMap() {
    if (this.map.waveList) { this.idxMap = Array.from({ length: this.total + 1 }, (_, n) => n); this.maxIdx = this.total; return; }
    if (this.map.lvl) { const m = [0]; for (let n = 1; n <= this.total; n++) m[n] = D.eqWave(this.map.lvl, n, this.total); this.idxMap = m; this.maxIdx = m[this.total]; return; }
    this.idxMap = Array.from({ length: this.total + 1 }, (_, n) => n); this.maxIdx = this.total;
  }
  idx(n) { return n <= this.total ? this.idxMap[Math.max(1, n)] : this.maxIdx + (n - this.total); }
  // меньше монстров на экране ради плавности: крупные группы сокращаются, а каждый монстр крепче (hpm) и чуть быстрее — общая сила волны почти та же
  waveDef(n) {
    if (this.map.waveList) return this.map.waveList[Math.min(n, this.total) - 1];
    return this.waveDefRaw(n).map(([t, c, iv, h]) => {
      if (c <= 3) return [t, c, iv, h || 1];
      const c2 = Math.round(3 + (c - 3) * 0.62);
      return [t, c2, iv * 1.05, Math.min(1.6, 1 + (c / c2 - 1) * 0.65)];
    });
  }
  waveDefRaw(n) {
    if (this.map.waveList) return this.map.waveList[Math.min(n, this.total) - 1];
    if (this.map.lvl && n <= this.total) return D.genWave(this.map.lvl, n, this.total);
    return D.genWave(this.map.lvl || 1, n, this.total);
  }
  // Вызов следующей волны раньше срока. Волны выстраиваются в очередь и идут друг за другом (не одновременно);
  // бонус золота — только за реально сэкономленное время, т.е. если предыдущая волна уже выпущена целиком.
  callWave(immediate = false) {
    if (!this.canCallWave()) return 0;
    const backlog = this.qi < this.queue.length;
    const bonus = backlog ? 0 : Math.round(this.nextWaveT * (0.8 + 0.03 * this.idx(this.wave)) * (1 + this.D.gold));
    this.gold += bonus; this.stats.earned += bonus;
    this.nextWaveT = 0;
    if (immediate) { this.startWave(); this.nextWaveT = D.waveGap(this.idx(this.wave)); }
    this.emit('callwave', { bonus });
    return bonus || 1;
  }
  callAllWaves() { let n = 0; while (this.canCallWave()) { this.callWave(true); n++; } return n; }
  waveBonus() { return this.qi < this.queue.length ? 0 : Math.round(this.nextWaveT * (0.8 + 0.03 * this.idx(this.wave)) * (1 + this.D.gold)); }
  canCallWave() { return this.state === 'play' && this.wave < this.total && this.nextWaveT > 2; }
  startWave() {
    const n = ++this.wave;
    const def = this.waveDef(n);
    let t = Math.max(this.time + 0.5, this.queueEnd || 0), k = 0;
    const q = [];
    // отправленные орды — в начале волны
    for (const [type, cnt] of this.pendingHorde) {
      for (let i = 0; i < cnt; i++) { q.push({ t, type, path: k++ % this.paths.length, sent: true, w: n }); t += 0.55; }
    }
    this.pendingHorde = [];
    this.hordeWave = [0, 0, 0];
    if (q.length) t += 1.2;
    for (const [type, cnt, iv, hpm] of def) {
      const cc = D.HEAVY_CAP[type] ? cnt : Math.ceil(cnt * this.D.horde);
      for (let i = 0; i < cc; i++) { q.push({ t, type, path: k++ % this.paths.length, w: n, hpm: hpm || 1 }); t += iv * (cc > cnt ? cnt / cc : 1); }
      t += 1.4;
    }
    this.queue = this.queue.slice(this.qi).concat(q); this.qi = 0; this.queueEnd = t;
    (this.waveRem ||= {})[n] = q.length;           // очки за волну — когда она полностью побеждена
    this.emit('wave', { n });
  }
  spawn(type, pathIdx, o = {}) {
    const def = D.ENEMIES[type];
    const path = def.air ? this.flyPaths[pathIdx % this.flyPaths.length] : this.paths[pathIdx];
    const n = this.idx(Math.max(1, o.w || this.wave));       // сила врага — по номеру его волны (волны могут стоять в очереди)
    const elite = !o.sent && !def.heavy && !o.noBounty && this.D.elite > 0 && this.rng() < this.D.elite;
    const hs = D.hpScale(n) * this.map.hp * (this.map.lvl && !this.map.waveList ? 1 + (this.map.lvl - 1) * 0.12 * Math.max(0, ((o.w || this.wave) - 1) / Math.max(1, this.total - 1)) : 1) * this.D.hp * (o.sent ? 0.85 : 1) * (o.hpMult || 1) * (elite ? 1.6 : 1);
    const e = {
      id: ++this.eid, type, def, path, pathIdx, d: o.d || 0, x: 0, y: 0, dx: 0, dy: 1,
      hp: def.hp * hs, maxHp: def.hp * hs, size: def.size,
      bounty: 0, elite, spdMult: this.D.spd * (elite ? 1.15 : 1) * (o.spdK || 1),
      dead: false, t: this.rng() * 5, slowF: 0, slowT: 0, stunT: 0, freezeT: 0, brittle: 0, shatter: 0,
      poison: [], poisonSrc: null, plague: 0, burnDps: 0, burnT: 0, shred: 0, shredT: 0, mark: 0, markT: 0,
      engaged: null, atkT: 0.5, healCd: 2 + this.rng() * 2, blinkCd: 2 + this.rng() * 2, summonCd: 5, stompCd: 6,
      air: !!def.air, sent: !!o.sent, spawnT: this.time, hurtT: 0, w: o.w || 0,
    };
    path.at(e.d, e); e.x = path.at(e.d).x; e.y = path.at(e.d).y;
    this.enemies.push(e);
    this.emit('spawn', e);
    return e;
  }

  // ───── статусы / урон ─────
  curSpeed(e) {
    if (e.freezeT > 0 || e.stunT > 0 || e.engaged || e.pullLeft > 0) return 0;
    let s = e.def.spd * e.spdMult;
    if (e.def.enrage) s *= 1 + (1 - e.hp / e.maxHp) * 0.9;
    return s * (1 - e.slowF);
  }
  predict(e, t) {
    const p = e.path.at(e.d + this.curSpeed(e) * t);
    return p;
  }
  slow(e, f, t) {
    if (e.def.heavy) f *= 0.7;
    if (f > e.slowF) e.slowF = f;
    if (t > e.slowT) e.slowT = t;
  }
  freeze(e, t, brittle = 0, shatter = 0) {
    if (e.def.heavy) t *= 0.4;
    if (t > e.freezeT) e.freezeT = t;
    if (brittle) e.brittle = brittle;
    if (shatter) e.shatter = shatter;
    this.emit('freeze', e);
  }
  stun(e, t) { if (e.def.heavy) t *= 0.4; if (t > e.stunT) e.stunT = t; this.emit('stun', e); }
  addPoison(e, dps, t, max, src, plague = 0) {
    if (e.def.immune && e.def.immune.includes('poison') || e.air) return;
    if (e.poison.length < max) e.poison.push({ dps, t });
    else { let m = e.poison[0]; for (const p of e.poison) if (p.t < m.t) m = p; m.t = Math.max(m.t, t); m.dps = Math.max(m.dps, dps); }
    e.poisonSrc = src; if (plague) e.plague = Math.max(e.plague, plague);
  }
  armorOf(e) { return Math.max(0, (e.def.armor || 0) - e.shred); }

  hurt(e, amt, type, src = {}) {
    if (e.dead || amt <= 0) return 0;
    const def = e.def;
    if (def.immune && def.immune.includes(type)) return 0;
    let m = 1;
    if (type === 'phys' || type === 'blast') {
      let ar = Math.max(0, this.armorOf(e) - (src.pierce || 0));
      if (type === 'blast') ar *= 0.5;
      m *= 1 - ar;
      if (def.ghost) m *= 0.55;
    }
    if (e.mark) m *= 1 + e.mark;
    if (e.freezeT > 0 && e.brittle) m *= 1 + e.brittle;
    if (src.tower && this.mods.dmg) m *= 1 + this.mods.dmg;
    const dmg = amt * m;
    e.hp -= dmg; e.hurtT = 0.12;
    if (src.tower) src.tower.dmgDone = (src.tower.dmgDone || 0) + dmg;
    this.emit('hit', { e, dmg, type, how: src.how || type, x: e.x, y: e.y, dx: src.dx || 0, dy: src.dy || 0, crit: !!src.crit });
    if (e.hp <= 0) this.kill(e, src.how || type, -e.hp / e.maxHp, src);
    return dmg;
  }
  hurtDot(e, amt, type, src) {
    if (e.dead) return;
    if (e.def.immune && e.def.immune.includes(type)) return;
    if (src && typeof src === 'object') amt *= 1 + this.mods.dmg;
    e.hp -= amt;
    if (src && typeof src === 'object') src.dmgDone = (src.dmgDone || 0) + amt;
    if (e.hp <= 0) this.kill(e, type, 0, { tower: src });
  }
  explode(x, y, r, dmg, type, src = {}) {
    for (const e of this.enemies) {
      if (e.dead || e.air) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d > r + e.size * 8) continue;
      const f = 1 - 0.45 * Math.min(1, d / (r || 1));
      const nx = d > 0.1 ? (e.x - x) / d : 0, ny = d > 0.1 ? (e.y - y) / d : 0;
      this.hurt(e, dmg * f, type, { ...src, dx: nx, dy: ny, how: src.how || 'blast' });
    }
    this.emit('explosion', { x, y, r, kind: src.kind || 'shell', big: dmg > 150, crit: !!src.crit });
  }

  waveDone(e) {
    if (!e.w || !this.waveRem || !this.waveRem[e.w]) return;
    if (--this.waveRem[e.w] > 0) return;
    this.parts.waves += D.WAVE_PTS(this.idx(e.w)); this.rescore();
  }
  // очки: три части (волны, сильные враги, время) считаются с множителем глубины уровня и округляются до целых; сумма умножается на множитель сложности
  // штраф за пропущенных: доля от того, что уровень мог дать за волны и время; хоть один пропуск — минус очко (в рейтинговом забеге одна жизнь, штрафа нет)
  partsNow() {
    const p = this.parts, lf = this.lf, w = Math.round(p.waves * lf), k = Math.round(p.kills * lf), t = Math.round(p.time * lf);
    const l = p.leaks ? -Math.max(1, Math.round(p.leaks * lf)) : 0, sub = Math.max(0, w + k + t + l);
    return { waves: w, kills: k, time: t, leaks: l, sub, total: Math.round(sub * this.D.score) };
  }
  rescore() { this.score = this.partsNow().total; }
  // «обычное» время прохождения без досрочных вызовов волн; бонус за время растёт, чем быстрее игрок его побил
  potential() { if (this._pot == null) { let w = D.TIME_PTS * this.total; for (let n = 1; n <= this.total; n++) w += D.WAVE_PTS(this.idx(n)); this._pot = w; } return this._pot; }
  parTime() { let t = D.FIRST_WAVE_DELAY + 40; for (let n = 1; n < this.total; n++) t += D.waveGap(this.idx(n)); return t; }
  timePts() { const r = this.time / this.parTime(); return D.TIME_PTS * this.total * Math.max(0, Math.min(1, (1.15 - r) / 0.7)); }
  finish(won) {
    if (won) this.parts.time = this.timePts();
    this.rescore();
    this.verdict = { won, ...this.partsNow(), mult: this.D.score, lf: this.lf, par: this.parTime(), t: this.time };
  }
  kill(e, how, over, src = {}) {
    if (e.dead) return;
    e.dead = true; this.waveDone(e);
    this.stats.kills++;
    if (src.tower) src.tower.kills++;
    let g = 0;                                          // золото за убийство даёт только кровавый алтарь рядом
    for (const b of this.buildings) {
      if (b.type !== 'altar') continue;
      if (Math.hypot(b.x - e.x, b.y - e.y) <= b.st.range * CELL) { g += b.st.bonus; b.altarFlash = 0.4; }
    }
    if (g > 0) {
      if (this.rushT > 0) g *= 2;
      g = Math.round(g * (1 + this.D.gold));
      this.gold += g; this.stats.earned += g;
    }
    { const pt = (e.def.pts || 0) + (e.elite ? 0.02 : 0); if (pt) { this.parts.kills += pt; this.rescore(); } }
    if (e.engaged) { const h = e.engaged.holds; const i = h.indexOf(e); if (i >= 0) h.splice(i, 1); e.engaged = null; }
    if (src.heal && src.guard) src.guard.hp = Math.min(src.guard.maxHp, src.guard.hp + src.guard.maxHp * src.heal);
    this.emit('kill', { e, how, over, crit: !!src.crit, x: e.x, y: e.y, dx: src.dx || 0, dy: src.dy || 0, gold: g, pts: 0, frozen: e.freezeT > 0 });
    // эффекты смерти
    if (e.def.split) {
      for (let i = 0; i < 2; i++) {
        const c = this.spawn(e.def.split, e.pathIdx, { d: Math.max(0, e.d + (i ? 14 : -14)), noBounty: false, hpMult: 1 });
        c.splitT = 0.4;
      }
    }
    if (e.plague && e.poison.length) {
      const top = e.poison.reduce((a, b) => (b.dps > a.dps ? b : a));
      const R = e.plague * CELL;
      for (const o of this.enemies) {
        if (o.dead || o === e || o.air) continue;
        if (Math.hypot(o.x - e.x, o.y - e.y) <= R) this.addPoison(o, top.dps, 4, 6, e.poisonSrc, e.plague);
      }
      this.emit('plague', { x: e.x, y: e.y, r: R });
    }
    if (e.freezeT > 0 && e.shatter) {
      const dmg = e.maxHp * e.shatter; e.shatter = 0;
      const R = 1.0 * CELL;
      for (const o of this.enemies) {
        if (o.dead || o === e) continue;
        if (Math.hypot(o.x - e.x, o.y - e.y) <= R) this.hurt(o, dmg, 'frost', { how: 'shatter', dx: 0, dy: 0 });
      }
      this.emit('explosion', { x: e.x, y: e.y, r: R, kind: 'shatter', big: false });
    }
  }

  leak(e) {
    e.dead = true; this.waveDone(e);
    this.stats.leaks++;
    if (this.D.lives !== 1) { this.parts.leaks += D.LEAK_FRAC * this.potential() * Math.min(this.lives, e.def.lives); this.rescore(); }
    this.lives = Math.max(0, this.lives - e.def.lives);
    if (e.engaged) { const h = e.engaged.holds; const i = h.indexOf(e); if (i >= 0) h.splice(i, 1); }
    this.emit('leak', { e, x: e.x, y: e.y });
    if (this.lives <= 0 && this.state === 'play' && !this.limbo) {
      if (this.revive.on && this.revive.used < this.revive.max) { this.limbo = true; this.emit('limbo', { used: this.revive.used }); }
      else { this.state = 'lost'; this.finish(false); this.emit('over', { won: false }); }
    }
  }
  // решение игрока в момент гибели: вернуть жизни (бой идёт дальше) или сдаться
  reviveWith(n) { if (!this.limbo) return; this.limbo = false; this.revive.used++; this.lives = n; this.emit('revived', { n }); }
  giveUp() { if (!this.limbo) return; this.limbo = false; if (this.state === 'play') { this.state = 'lost'; this.finish(false); this.emit('over', { won: false }); } }

  // ───── заклинания ─────
  castSpell(id, x, y) {
    const sp = D.SPELLS[id];
    if (this.spellCd[id] > 0 || this.state !== 'play') return 'cd';
    if (id === 'meteor') {
      this.fx.push({ kind: 'meteor', x, y, t: 0, T: 0.85 });
      this.emit('spell', { id, x, y });
    } else if (id === 'stasis') {
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (e.def.heavy) { this.slow(e, 0.9, sp.time); } else { e.freezeT = Math.max(e.freezeT, sp.time); }
      }
      this.emit('spell', { id });
    } else if (id === 'rush') {
      this.rushT = sp.time; this.emit('spell', { id });
    }
    this.spellCd[id] = sp.cd * (1 - this.mods.spellCd);
    return true;
  }

  // ───── казарма: стража ─────
  guardSpot(b) {
    const R = b.st.range * CELL;
    let best = null, bd = Infinity;
    for (let pi = 0; pi < this.paths.length; pi++) {
      const p = this.paths[pi];
      for (let d = 10; d < p.total - 10; d += 8) {
        const q = p.at(d);
        const dist = Math.hypot(q.x - b.x, q.y - b.y);
        if (dist <= R && dist < bd) { bd = dist; best = { pi, d }; }
      }
    }
    return best;
  }
  syncGuards(b, refill) {
    const st = b.st;
    const mine = this.guards.filter((g) => g.owner === b);
    const spot = this.guardSpot(b);
    while (mine.length < st.guards) {
      const g = { owner: b, hp: st.ghp, maxHp: st.ghp, x: b.x, y: b.y, atkT: 0, holds: [], dead: false, respawnT: 0, id: ++this.bid, anim: 0 };
      this.guards.push(g); mine.push(g);
    }
    mine.forEach((g, i) => {
      g.maxHp = st.ghp; if (refill) g.hp = g.maxHp;
      if (spot) {
        const p = this.paths[spot.pi].at(spot.d + (i - (mine.length - 1) / 2) * 20);
        g.hx = p.x; g.hy = p.y;
      } else { g.hx = b.x; g.hy = b.y + 18; }
      if (!g.dead) { g.x = g.hx; g.y = g.hy; }
    });
  }
  releaseGuard(g) { for (const e of g.holds) e.engaged = null; g.holds.length = 0; }

  // ───── главный апдейт ─────
  update(dt) {
    if (this.limbo) return;
    if (this.state !== 'play' && this.state !== 'won') return;
    if (this.state === 'lost') return;
    this.time += dt;
    this.updateCoins(dt);
    if (this.chest) { this.chest.born += dt; if (this.chest.shake > 0) this.chest.shake = Math.max(0, this.chest.shake - dt); }
    // волны
    if (this.wave < this.total && this.state === 'play') {
      if (!this.hold && this.qi >= this.queue.length) this.nextWaveT -= dt;      // пауза идёт после выхода последнего врага волны (как в Kingdom Rush)
      if (this.nextWaveT <= 0) { this.startWave(); this.nextWaveT = D.waveGap(this.idx(this.wave)); }
    }
    while (this.qi < this.queue.length && this.queue[this.qi].t <= this.time) {
      const q = this.queue[this.qi++];
      this.spawn(q.type, q.path, { sent: q.sent, w: q.w, hpMult: q.hpm || 1, spdK: q.hpm > 1 ? 1 + Math.min(0.08, (q.hpm - 1) * 0.12) : 1 });
    }
    // кулдауны заклинаний
    for (const k in this.spellCd) if (this.spellCd[k] > 0) this.spellCd[k] = Math.max(0, this.spellCd[k] - dt);
    if (this.rushT > 0) this.rushT -= dt;

    this.updateAuras(dt);
    this.updateEnemies(dt);
    for (const b of this.buildings) { b.age += dt; if (b.altarFlash > 0) b.altarFlash -= dt; if (b.kind === 'tower') this.updateTower(b, dt); }
    this.updateGuards(dt);
    this.updateProjs(dt);
    this.updateZones(dt);
    this.updateFx(dt);
    for (let i = this.bags.length - 1; i >= 0; i--) {
      const bg = this.bags[i]; bg.t += dt;
      if (bg.t >= bg.life) { bg.amt = Math.max(1, Math.round(bg.amt * 0.5)); this.collectBag(bg, false); }          // не успел тапнуть — рудник отдаёт половину сам
    }
    // чистка
    if (this.enemies.some((e) => e.dead)) this.enemies = this.enemies.filter((e) => !e.dead);
    // победа
    if (this.state === 'play' && this.wave >= this.total && this.qi >= this.queue.length && this.enemies.length === 0) {
      this.state = 'won'; this.finish(true); this.emit('over', { won: true });
    }
  }

  updateAuras(dt) {
    this.bannerT -= dt;
    if (this.bannerT > 0) return;
    this.bannerT = 0.25;
    const banners = this.buildings.filter((b) => b.type === 'banner');
    for (const b of this.buildings) { b.rateMult = 1; b.dmgMult = 1; }
    for (const bn of banners) {
      const st = bn.st;
      if (st.frenzy) {
        bn.frenzyCd -= 0.25;
        if (bn.frenzyT > 0) bn.frenzyT -= 0.25;
        else if (bn.frenzyCd <= 0) { bn.frenzyT = st.frenzy; bn.frenzyCd = st.frenzyEvery; this.emit('frenzy', bn); }
      }
    }
    for (const b of this.buildings) {
      if (b.type === 'banner') continue;
      let rb = 0, db = 0, extra = 0, fr = false;
      for (const bn of banners) {
        if (Math.hypot(bn.x - b.x, bn.y - b.y) > bn.st.range * CELL) continue;
        const st = bn.st;
        if (st.rateBuff > rb) { extra += rb * 0.3; rb = st.rateBuff; } else extra += st.rateBuff * 0.3;
        if (st.dmgBuff > db) db = st.dmgBuff;
        if (bn.frenzyT > 0) fr = true;
      }
      b.rateMult = (1 + rb + Math.min(0.3, extra)) * (fr ? 2 : 1);
      b.dmgMult = 1 + db;
    }
    for (const bn of banners) {
      if (!bn.st.mark) continue;
      const R = bn.st.range * CELL;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.hypot(bn.x - e.x, bn.y - e.y) <= R + 6) { e.mark = Math.max(e.mark, bn.st.mark); e.markT = 0.6; }
      }
    }
  }

  updateEnemies(dt) {
    const n = this.idx(Math.max(1, this.wave));
    for (const e of this.enemies) {
      if (e.dead) continue;
      const def = e.def;
      e.t += dt;
      if (e.hurtT > 0) e.hurtT -= dt;
      if (e.splitT > 0) e.splitT -= dt;
      // статусы
      if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowF = 0; }
      if (e.stunT > 0) e.stunT -= dt;
      if (e.freezeT > 0) { e.freezeT -= dt; if (e.freezeT <= 0) { e.brittle = 0; e.shatter = 0; } }
      if (e.markT > 0) { e.markT -= dt; if (e.markT <= 0) e.mark = 0; }
      if (e.shredT > 0) { e.shredT -= dt; if (e.shredT <= 0) e.shred = 0; }
      if (e.poison.length) {
        let tot = 0;
        for (let i = e.poison.length - 1; i >= 0; i--) {
          const p = e.poison[i]; tot += p.dps; p.t -= dt;
          if (p.t <= 0) e.poison.splice(i, 1);
        }
        this.hurtDot(e, tot * dt, 'poison', e.poisonSrc);
        if (e.dead) continue;
      }
      if (e.burnT > 0) {
        e.burnT -= dt; this.hurtDot(e, e.burnDps * dt, 'fire', e.burnSrc || null); if (e.dead) continue;
        if (e.spread) {
          e.spreadT = (e.spreadT || 0) - dt;
          if (e.spreadT <= 0) {
            e.spreadT = 0.6;
            for (const o of this.enemies) {
              if (o.dead || o === e || o.air || o.burnT > 1.2) continue;
              if (Math.hypot(o.x - e.x, o.y - e.y) <= e.spread) { o.burnDps = Math.max(o.burnDps, e.burnDps * 0.8); o.burnT = 2.2; o.spread = e.spread; o.burnSrc = e.burnSrc; this.emit('ignite', o); }
            }
          }
        }
      }
      if (def.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * def.regen * dt);
      // способности
      if (def.heal) {
        e.healCd -= dt;
        if (e.healCd <= 0) {
          e.healCd = 3.2;
          let any = false;
          for (const o of this.enemies) {
            if (o.dead || o === e || o.hp >= o.maxHp) continue;
            if (Math.hypot(o.x - e.x, o.y - e.y) < 2 * CELL) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.1); any = true; this.emit('healed', o); }
          }
          if (any) this.emit('heal', { x: e.x, y: e.y });
        }
      }
      if (def.blink && e.freezeT <= 0 && e.stunT <= 0 && !e.engaged) {
        e.blinkCd -= dt;
        if (e.blinkCd <= 0) {
          e.blinkCd = def.blink;
          const x0 = e.x, y0 = e.y;
          e.d = Math.min(e.path.total - 1, e.d + 1.6 * CELL);
          const p = e.path.at(e.d); e.x = p.x; e.y = p.y;
          this.emit('blink', { x0, y0, x1: e.x, y1: e.y, e });
        }
      }
      if (def.stomp) {
        e.stompCd -= dt;
        if (e.stompCd <= 0) {
          e.stompCd = def.stomp;
          for (const b of this.buildings) {
            if (b.kind === 'tower' && Math.hypot(b.x - e.x, b.y - e.y) < 2.3 * CELL) { b.stunT = 3; }
          }
          for (const g of this.guards) if (!g.dead && Math.hypot(g.x - e.x, g.y - e.y) < 2.3 * CELL) g.hp -= g.maxHp * 0.3;
          this.emit('stomp', { x: e.x, y: e.y, e });
        }
      }
      if (def.summon) {
        e.summonCd -= dt;
        if (e.summonCd <= 0) {
          e.summonCd = def.summon;
          for (let i = 0; i < 3; i++) this.spawn('skeleton', e.pathIdx, { d: Math.max(0, e.d - 20 - i * 16), noBounty: true, hpMult: 0.5 });
          this.emit('summon', { x: e.x, y: e.y, e });
        }
      }
      // бой со стражей
      if (e.engaged) {
        const g = e.engaged;
        if (g.dead) { e.engaged = null; }
        else {
          e.atkT -= dt;
          if (e.atkT <= 0) {
            e.atkT = 0.9;
            const dmg = def.atk * (1 + 0.1 * n) * (1 - (g.owner.st.garmor || 0));
            g.hp -= dmg; g.hurtT = 0.15;
            this.emit('guardhit', { g, e });
            if (g.hp <= 0) this.guardDie(g);
          }
        }
      }
      // движение
      if (e.pullLeft > 0) { const m = Math.min(e.pullLeft, 420 * dt); e.d = Math.max(0, e.d - m); e.pullLeft -= m; if (e.engaged) { const h = e.engaged.holds; const i = h.indexOf(e); if (i >= 0) h.splice(i, 1); e.engaged = null; } }
      const sp = this.curSpeed(e);
      if (sp > 0) {
        e.d += sp * dt;
        if (e.d >= e.path.total) { this.leak(e); continue; }
      }
      const p = e.path.at(e.d, e._p || (e._p = {}));
      e.x = p.x; e.y = p.y; e.dx = p.dx; e.dy = p.dy;
    }
  }
  guardDie(g) {
    g.dead = true; g.respawnT = g.owner.st.respawn; this.releaseGuard(g);
    this.emit('guarddie', g);
  }
  updateGuards(dt) {
    for (const g of this.guards) {
      if (g.hurtT > 0) g.hurtT -= dt;
      if (g.dead) {
        g.respawnT -= dt;
        if (g.respawnT <= 0) { g.dead = false; g.hp = g.maxHp = g.owner.st.ghp; g.x = g.hx; g.y = g.hy; this.emit('guardspawn', g); }
        continue;
      }
      g.atkT -= dt;
      // захват врагов
      if (g.holds.length < 2) {
        for (const e of this.enemies) {
          if (e.dead || e.air || e.engaged) continue;
          if (Math.hypot(e.x - g.hx, e.y - g.hy) < 26) {
            e.engaged = g; g.holds.push(e); e.atkT = 0.4;
            if (g.holds.length >= 2) break;
          }
        }
      }
      if (g.holds.length && g.atkT <= 0) {
        const st = g.owner.st;
        g.atkT = 0.8; g.anim = 0.25;
        const dmg = st.gdmg * g.owner.dmgMult;
        const list = g.holds.slice(0, st.cleave || 1);
        let extra = [];
        if (st.cleave) {
          const first = g.holds[0];
          for (const o of this.enemies) {
            if (o.dead || o.air || o === first || extra.length >= st.cleave - 1) continue;
            if (Math.hypot(o.x - first.x, o.y - first.y) < 40) extra.push(o);
          }
        }
        for (const e of new Set([...list, ...extra])) {
          const dx = e.x - g.x, dy = e.y - g.y, l = Math.hypot(dx, dy) || 1;
          this.hurt(e, dmg, 'phys', { how: st.cleave ? 'chop' : 'slash', dx: dx / l, dy: dy / l, tower: g.owner, guard: g, heal: st.lifesteal });
        }
      }
      if (g.anim > 0) g.anim -= dt;
    }
  }

  // ───── башни ─────
  findTarget(b) {
    const d = D.TOWERS[b.type], st = b.st, R = st.range * CELL;
    let best = null, bv = -Infinity;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.air ? !d.air : !d.ground) continue;
      const dx = e.x - b.x, dy = e.y - b.y, d2 = dx * dx + dy * dy, rr = R + e.size * 8;
      if (d2 > rr * rr) continue;
      let v;
      switch (b.mode) { case 0: v = e.d; break; case 1: v = -e.d; break; case 2: v = e.hp; break; default: v = -d2; }
      if (v > bv) { bv = v; best = e; }
    }
    return best;
  }
  updateTower(b, dt) {
    const st = b.st;
    if (b.recoil > 0) b.recoil = Math.max(0, b.recoil - dt * 6);
    if (b.type === 'banner' || b.type === 'barracks') {
      if (b.type === 'barracks') {
        // стража синхронизируется при смене стат
      }
      return;
    }
    if (b.stunT > 0) { b.stunT -= dt; return; }
    // орбитальные пилы
    if (b.type === 'saw' && st.orbit) { this.updateOrbit(b, dt); return; }
    b.retarget -= dt;
    if (b.retarget <= 0 || !b.target || b.target.dead) { b.target = this.findTarget(b); b.retarget = 0.18; }
    // аура мерзлоты
    if (b.type === 'frost' && st.aura) {
      b.auraT = (b.auraT || 0) - dt;
      if (b.auraT <= 0) {
        b.auraT = 0.25;
        const R = st.range * CELL;
        for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - b.x, e.y - b.y) <= R) this.slow(e, st.aura, 0.5);
      }
    }
    const tg = b.target;
    if (tg) {
      const want = Math.atan2(tg.y - b.y, tg.x - b.x);
      let da = want - b.angle; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      b.angle += da * Math.min(1, dt * 14);
    }
    b.cd -= dt * b.rateMult;
    if (b.cd <= 0) {
      if (tg) { this.fire(b, tg); b.cd += 1 / st.rate; if (b.cd < 0) b.cd = 0; } else b.cd = 0;
    }
  }
  fire(b, tg) {
    const st = b.st, X = b.x, Y = b.y;
    b.recoil = 1;
    const dm = b.dmgMult;
    switch (b.type) {
      case 'bolt': {
        const dist = Math.hypot(tg.x - X, tg.y - Y), T = dist / 620;
        const p = this.predict(tg, T);
        const a = Math.atan2(p.y - Y, p.x - X);
        b.angle = a;
        this.projs.push({ kind: 'bolt', x: X + Math.cos(a) * 14, y: Y + Math.sin(a) * 14, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620,
          dmg: st.dmg * dm, pierce: st.pierce || 0, armorPierce: st.armorPierce || 0, crit: st.crit, critMult: st.critMult, execute: st.execute,
          life: (st.range * CELL + 30) / 620, hit: new Set(), owner: b, big: !!st.pierce });
        this.emit('shot', { b, kind: 'bolt', x: X, y: Y, a });
        break;
      }
      case 'mortar': {
        const dist = Math.hypot(tg.x - X, tg.y - Y), T = Math.min(1.5, Math.max(0.65, dist / 230));
        const p = this.predict(tg, T);
        this.projs.push({ kind: 'shell', x0: X, y0: Y, x1: p.x, y1: p.y, x: X, y: Y, t: 0, T, dmg: st.dmg * dm, r: st.splash * CELL,
          cluster: st.cluster || 0, fire: st.fire, fireT: st.fireT, crit: st.crit, critMult: st.critMult, owner: b });
        this.emit('shot', { b, kind: 'mortar', x: X, y: Y, a: Math.atan2(p.y - Y, p.x - X) });
        break;
      }
      case 'tesla': this.fireTesla(b, tg); break;
      case 'flame': {
        const a = Math.atan2(tg.y - Y, tg.x - X); b.angle = a;
        const R = st.range * CELL;
        for (const e of this.enemies) {
          if (e.dead || e.air) continue;
          const dx = e.x - X, dy = e.y - Y, d = Math.hypot(dx, dy);
          if (d > R + e.size * 8) continue;
          let da = Math.atan2(dy, dx) - a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
          if (Math.abs(da) > st.cone + (e.size * 9) / Math.max(d, 24)) continue;
          this.hurt(e, st.dmg * dm, 'fire', { how: 'fire', dx: dx / (d || 1), dy: dy / (d || 1), tower: b });
          if (!e.dead) { e.burnDps = Math.max(e.burnDps, st.burn * dm); e.burnT = Math.max(e.burnT, st.burnT); e.burnSrc = b; if (st.spread) e.spread = st.spread; }
        }
        if (st.trail && this.rng() < 0.1) this.zones.push({ kind: 'fire', x: tg.x, y: tg.y, r: 0.55 * CELL, t: 2.5, tick: 0, dps: st.trail * dm, owner: b });
        this.emit('flame', { b, x: X, y: Y, a, range: R });
        this.emit('shot', { b, kind: 'flame', x: X, y: Y, a });
        break;
      }
      case 'voidwell': {
        b.pulses++; const collapse = st.collapse && b.pulses % st.collapse === 0; const R = st.range * CELL;
        for (const e of this.enemies) {
          if (e.dead) continue;
          const dx = X - e.x, dy = Y - e.y, d = Math.hypot(dx, dy);
          if (d > R + e.size * 8) continue;
          e.pullLeft = (e.pullLeft || 0) + st.pull * (e.def.heavy ? 0.4 : 1);
          this.slow(e, st.slow, st.slowT);
          if (st.stun) this.stun(e, st.stun);
          this.hurt(e, st.dmg * dm * (collapse ? st.collapseMult : 1), 'void', { how: collapse ? 'blast' : 'void', dx: dx / (d || 1), dy: dy / (d || 1), tower: b });
        }
        this.emit('pulse', { b, x: X, y: Y, r: R, collapse: !!collapse });
        this.emit('shot', { b, kind: 'void', x: X, y: Y, a: 0 });
        break;
      }
      case 'harpoon': {
        const dist = Math.hypot(tg.x - X, tg.y - Y), T = dist / 950;
        const p = this.predict(tg, T);
        const a = Math.atan2(p.y - Y, p.x - X); b.angle = a;
        this.projs.push({ kind: 'bolt', harpoon: true, x: X + Math.cos(a) * 16, y: Y + Math.sin(a) * 16, vx: Math.cos(a) * 950, vy: Math.sin(a) * 950,
          dmg: st.dmg * dm, pierce: 0, armorPierce: st.armorPierce || 0, crit: st.crit, critMult: st.critMult, heavyMult: st.heavyMult, anchor: st.anchor, splash: st.splash, shred: st.shred,
          life: (st.range * CELL + 40) / 950, hit: new Set(), owner: b, big: true, aim: tg });
        this.emit('shot', { b, kind: 'harpoon', x: X, y: Y, a });
        break;
      }
      case 'frost':
        this.projs.push({ kind: 'shard', x: X, y: Y - 14, target: tg, speed: 460, dmg: st.dmg * dm, owner: b, life: 3 });
        this.emit('shot', { b, kind: 'frost', x: X, y: Y });
        break;
      case 'toxic': {
        const dist = Math.hypot(tg.x - X, tg.y - Y), T = Math.min(1.3, Math.max(0.6, dist / 200));
        const p = this.predict(tg, T);
        this.projs.push({ kind: 'vial', x0: X, y0: Y, x1: p.x, y1: p.y, x: X, y: Y, t: 0, T, dmg: st.dmg * dm, r: st.splash * CELL, owner: b });
        this.emit('shot', { b, kind: 'toxic', x: X, y: Y });
        break;
      }
      case 'saw': {
        const R = st.range * CELL;
        const dist = Math.hypot(tg.x - X, tg.y - Y);
        const a = Math.atan2(tg.y - Y, tg.x - X);
        if (st.bounce) {
          this.projs.push({ kind: 'saw', mode: 'ric', x: X, y: Y, target: tg, left: st.bounce, hit: new Set(), dmg: st.dmg * dm, speed: 420, owner: b, spin: 0, life: 6 });
        } else {
          const ext = Math.min(R + 20, dist + 40);
          this.projs.push({ kind: 'saw', mode: 'out', x: X, y: Y, tx: X + Math.cos(a) * ext, ty: Y + Math.sin(a) * ext, hit: new Map(), dmg: st.dmg * dm, speed: 340, owner: b, spin: 0, life: 6 });
        }
        this.emit('shot', { b, kind: 'saw', x: X, y: Y, a });
        break;
      }
    }
  }
  fireTesla(b, tg) {
    const st = b.st, dm = b.dmgMult;
    const pts = [{ x: b.x, y: b.y - 26 }];
    const hit = new Set();
    let cur = tg, dmg = st.dmg * dm;
    for (let i = 0; i <= st.chains && cur; i++) {
      hit.add(cur);
      pts.push({ x: cur.x, y: cur.y - 8 });
      const dx = cur.x - pts[i].x, dy = cur.y - pts[i].y, l = Math.hypot(dx, dy) || 1;
      this.hurt(cur, dmg, 'lightning', { how: 'lightning', dx: dx / l, dy: dy / l, tower: b });
      if (st.stun && this.rng() < st.stun && !cur.dead) this.stun(cur, st.stunT);
      dmg *= st.falloff;
      let nx = null, nd = (1.7 * CELL) ** 2;
      for (const e of this.enemies) {
        if (e.dead || hit.has(e)) continue;
        const d2 = (e.x - cur.x) ** 2 + (e.y - cur.y) ** 2;
        if (d2 < nd) { nd = d2; nx = e; }
      }
      cur = nx;
    }
    this.emit('lightning', { pts, b });
    this.emit('shot', { b, kind: 'tesla', x: b.x, y: b.y });
  }
  updateOrbit(b, dt) {
    const st = b.st;
    b.orbitA += dt * 3.4;
    b.orbitR = st.range * CELL * (0.55 + 0.45 * Math.abs(Math.sin(b.age * 0.9)));
    b.blades = [];
    for (let k = 0; k < st.orbit; k++) {
      const a = b.orbitA + (k / st.orbit) * Math.PI * 2;
      const x = b.x + Math.cos(a) * b.orbitR, y = b.y + Math.sin(a) * b.orbitR;
      b.blades.push({ x, y, a });
      for (const e of this.enemies) {
        if (e.dead || e.air) continue;
        if (Math.hypot(e.x - x, e.y - y) < 15 + e.size * 8) {
          const last = b.hitT.get(e.id) || -9;
          if (this.time - last > 0.3) {
            b.hitT.set(e.id, this.time);
            const dx = e.x - b.x, dy = e.y - b.y, l = Math.hypot(dx, dy) || 1;
            this.hurt(e, st.dmg * b.dmgMult, 'phys', { how: 'saw', dx: dx / l, dy: dy / l, tower: b });
          }
        }
      }
    }
    if (b.hitT.size > 80) for (const [k, v] of b.hitT) if (this.time - v > 3) b.hitT.delete(k);
  }

  // ───── снаряды ─────
  updateProjs(dt) {
    const ps = this.projs;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      let dead = false;
      switch (p.kind) {
        case 'bolt': dead = this.updBolt(p, dt); break;
        case 'shell': case 'vial': dead = this.updShell(p, dt); break;
        case 'shard': dead = this.updShard(p, dt); break;
        case 'saw': dead = this.updSaw(p, dt); break;
      }
      if (dead) ps.splice(i, 1);
    }
  }
  updBolt(p, dt) {
    p.life -= dt; if (p.life <= 0) return true;
    // шагами, чтобы не пролетать сквозь врагов
    const steps = 3;
    for (let s = 0; s < steps; s++) {
      p.x += p.vx * dt / steps; p.y += p.vy * dt / steps;
      for (const e of this.enemies) {
        if (e.dead || p.hit.has(e)) continue;
        const r = e.size * 9 + 5;
        if ((e.x - p.x) ** 2 + (e.y - (p.y - (e.air ? 0 : 0))) ** 2 < r * r) {
          p.hit.add(e);
          let amt = p.dmg, how = 'bolt', crit = false;
          if (p.crit && this.rng() < p.crit) { amt *= p.critMult; crit = true; how = 'crit'; }
          if (p.execute && !e.def.heavy && e.hp / e.maxHp <= p.execute) { amt = e.hp + 1; how = 'execute'; crit = true; }
          const l = Math.hypot(p.vx, p.vy);
          if (p.heavyMult && e.def.heavy) amt *= p.heavyMult;
          this.hurt(e, amt, 'phys', { how, pierce: p.armorPierce, dx: p.vx / l, dy: p.vy / l, crit, tower: p.owner });
          if (p.harpoon) {
            if (p.anchor && !e.dead) this.stun(e, p.anchor);
            if (p.splash) {
              const R = p.splash * CELL;
              for (const o of this.enemies) { if (!o.dead && !o.air && Math.hypot(o.x - e.x, o.y - e.y) <= R) { o.shred = Math.max(o.shred, p.shred || 0); o.shredT = 5; } }
              this.explode(e.x, e.y, R, p.dmg * 0.55, 'blast', { tower: p.owner, how: 'blast', kind: 'shell' });
            }
          }
          if (p.pierce > 0) { p.pierce--; } else return true;
        }
      }
    }
    return false;
  }
  updShell(p, dt) {
    p.t += dt;
    const k = Math.min(1, p.t / p.T);
    p.x = p.x0 + (p.x1 - p.x0) * k; p.y = p.y0 + (p.y1 - p.y0) * k;
    p.z = Math.sin(Math.PI * k) * (p.kind === 'vial' ? 50 : 80);
    if (k < 1) return false;
    const src = { tower: p.owner, how: 'blast' };
    if (p.kind === 'vial') {
      const st = p.owner.st;
      this.explode(p.x1, p.y1, p.r, p.dmg, 'poison', { tower: p.owner, how: 'poison', kind: 'vial' });
      this.zones.push({ kind: st.shred ? 'acid' : 'poison', x: p.x1, y: p.y1, r: p.r, t: 3.2, tick: 0, owner: p.owner });
      return true;
    }
    if (p.cluster) {
      const n = p.cluster;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + this.rng(), d = (0.3 + this.rng() * 0.9) * CELL * 1.1;
        this.projs.push({ kind: 'shell', bomblet: true, x0: p.x1, y0: p.y1, x1: p.x1 + Math.cos(a) * d, y1: p.y1 + Math.sin(a) * d,
          x: p.x1, y: p.y1, t: 0, T: 0.35 + this.rng() * 0.15, dmg: p.dmg, r: p.r, owner: p.owner });
      }
      this.emit('explosion', { x: p.x1, y: p.y1, r: 12, kind: 'pop', big: false });
      return true;
    }
    const crit = !!(p.crit && !p.bomblet && this.rng() < p.crit);       // критический залп: сильнее и разносит врагов в клочья
    this.explode(p.x1, p.y1, p.r, crit ? p.dmg * p.critMult : p.dmg, 'blast', { ...src, crit, kind: p.bomblet ? 'bomblet' : 'shell' });
    if (p.fire) this.zones.push({ kind: 'fire', x: p.x1, y: p.y1, r: p.r * 0.9, t: p.fireT, tick: 0, dps: p.fire, owner: p.owner });
    return true;
  }
  updShard(p, dt) {
    p.life -= dt;
    const e = p.target;
    if (!e || e.dead || p.life <= 0) return true;
    const dx = e.x - p.x, dy = e.y - 6 - p.y, d = Math.hypot(dx, dy);
    const mv = p.speed * dt;
    if (d <= mv + 4) {
      const st = p.owner.st;
      this.hurt(e, p.dmg, 'frost', { how: 'frost', dx: dx / (d || 1), dy: dy / (d || 1), tower: p.owner });
      if (!e.dead) {
        this.slow(e, st.slow, st.slowT);
        if (st.freeze && this.rng() < st.freeze) this.freeze(e, st.freezeT, st.brittle, st.shatter);
      }
      this.emit('frosthit', { x: e.x, y: e.y });
      return true;
    }
    p.x += (dx / d) * mv; p.y += (dy / d) * mv;
    return false;
  }
  updSaw(p, dt) {
    p.life -= dt; p.spin += dt * 25;
    if (p.life <= 0) return true;
    const o = p.owner;
    if (o.dead) return true;
    const stepTo = (tx, ty) => {
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), mv = p.speed * dt;
      if (d <= mv) { p.x = tx; p.y = ty; return true; }
      p.x += dx / d * mv; p.y += dy / d * mv; p.dirx = dx / d; p.diry = dy / d; return false;
    };
    const hitCheck = (cool) => {
      for (const e of this.enemies) {
        if (e.dead || e.air) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) < 16 + e.size * 8) {
          if (p.mode === 'ric') {
            if (p.hit.has(e.id)) continue; p.hit.add(e.id);
          } else {
            const last = p.hit.get(e.id) || -9;
            if (this.time - last < cool) continue; p.hit.set(e.id, this.time);
          }
          const dx = p.dirx || 0, dy = p.diry || 0;
          this.hurt(e, p.dmg, 'phys', { how: 'saw', dx, dy, tower: o });
          return e;
        }
      }
      return null;
    };
    if (p.mode === 'out') {
      hitCheck(0.45);
      if (stepTo(p.tx, p.ty)) p.mode = 'back';
    } else if (p.mode === 'back') {
      hitCheck(0.45);
      if (stepTo(o.x, o.y)) return true;
    } else if (p.mode === 'ric') {
      const e = p.target;
      if (!e || e.dead) { this.sawNext(p); }
      else {
        const hit = Math.hypot(e.x - p.x, e.y - p.y) < 14;
        stepTo(e.x, e.y);
        if (hit) {
          const dx = p.dirx || 0, dy = p.diry || 0;
          this.hurt(e, p.dmg, 'phys', { how: 'saw', dx, dy, tower: o });
          p.hit.add(e.id); this.sawNext(p);
        }
      }
      if (p.mode === 'ric' && p.done) { p.mode = 'back'; p.hit = new Map(); }
    }
    return false;
  }
  sawNext(p) {
    if (p.left-- <= 0) { p.done = true; p.target = null; return; }
    let best = null, bd = (2.6 * CELL) ** 2;
    for (const e of this.enemies) {
      if (e.dead || e.air || p.hit.has(e.id)) continue;
      const d2 = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d2 < bd) { bd = d2; best = e; }
    }
    p.target = best;
    if (!best) p.done = true;
  }

  updateZones(dt) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.t -= dt; z.tick -= dt;
      if (z.t <= 0) { this.zones.splice(i, 1); continue; }
      if (z.tick > 0) continue;
      z.tick = 0.4;
      for (const e of this.enemies) {
        if (e.dead || e.air) continue;
        if (Math.hypot(e.x - z.x, e.y - z.y) > z.r + 4) continue;
        if (z.kind === 'fire') { e.burnDps = Math.max(e.burnDps, z.dps); e.burnT = Math.max(e.burnT, 1.0); }
        else {
          const st = z.owner.st;
          this.addPoison(e, st.poison, st.poisonT, st.stacks, z.owner, st.plague || 0);
          if (z.kind === 'acid' && st.shred) { e.shred = Math.max(e.shred, st.shred); e.shredT = 5; }
        }
      }
    }
  }
  updateFx(dt) {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i]; f.t += dt;
      if (f.kind === 'meteor' && f.t >= f.T) {
        const dmg = D.SPELLS.meteor.dmg * (1 + 0.25 * this.wave);
        const R = D.SPELLS.meteor.radius * CELL;
        this.explode(f.x, f.y, R, dmg, 'fire', { how: 'meteor', kind: 'meteor' });
        this.zones.push({ kind: 'fire', x: f.x, y: f.y, r: R * 0.8, t: D.SPELLS.meteor.burnT, tick: 0, dps: D.SPELLS.meteor.burn * (1 + 0.25 * this.wave), owner: null });
        this.fx.splice(i, 1);
      }
    }
  }
}
