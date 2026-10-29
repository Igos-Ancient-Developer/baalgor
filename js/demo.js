// Режим просмотра врагов: открой index.html?debug&enemydemo — первый уровень, золото, несколько башен,
// каждые несколько секунд по дороге идут враги всех видов (или тех, что перечислены: enemydemo=ogre,demon) (ходьба, смерть).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function enemyDemo(ctrl) {
  while (!ctrl.startLevel || !ctrl.save) await sleep(200);          // ждём, пока игра загрузится
  await sleep(800); ctrl.save.tutDone = 1; ctrl.startLevel((location.search.match(/level=(\w+)/) || [])[1] || 'g1', 1); await sleep(1200);
  const go = document.querySelector('#lo-go'); if (go) go.click(); await sleep(2200);
  const s = ctrl.sim; if (!s) return;
  s.allowed = null; s.limits = {}; s.gold = 5000; s.hold = false;
  const cells = []; for (let r = 0; r < s.grid.length; r++) for (let c = 0; c < s.grid[0].length; c++) if (s.canBuild(c, r)) {
    let cov = 0; for (const p of s.paths) for (let d = 0; d < p.total; d += 16) { const q = p.at(d); if (Math.hypot(q.x - (c + 0.5) * 48, q.y - (r + 0.5) * 48) <= 2.4 * 48) cov++; }
    cells.push([c, r, cov]);
  }
  cells.sort((a, b) => b[2] - a[2]);
  const plan = ((location.search.match(/towers=([\w,]+)/) || [])[1] || 'bolt,mortar,bolt,frost').split(','); let used = [];
  for (const t of plan) { const cell = cells.find(([c, r]) => !used.some(([a, b]) => Math.abs(a - c) < 2 && Math.abs(b - r) < 2)); if (!cell) break; used.push(cell); const b = s.build('tower', t, cell[0], cell[1]); if (b && typeof b === 'object') { b.level = t === 'barracks' ? 2 : +((location.search.match(/lv=(\d)/) || [])[1] || 3); s.refreshStats(b); } }
  const types = ['skeleton', 'zombie', 'goblin', 'mummy', 'yeti', 'hound', 'bat', 'slime', 'knight', 'butcher', 'gargoyle', 'berserker', 'ogre', 'reaper', 'lich', 'anubis', 'djinn', 'sandgolem', 'pharaoh', 'wolf', 'iceskel', 'snowgolem', 'ultrayeti', 'imp', 'pinky', 'lavagolem', 'baron'];
  const pick = (location.search.match(/enemydemo=([\w,]+)/) || [])[1]; const list = pick ? pick.split(',').filter((t) => types.includes(t)) : types;
  await ctrl.ensureTypes(list);                                      // листы врагов грузятся по уровню: докачиваем нужные
  for (;;) {
    if (ctrl.sim !== s || s.state !== 'play') return;
    list.forEach((t, i) => s.spawn(t, 0, { w: 1, d: i * 38, noBounty: true }));
    await sleep(9000);
  }
}

// Режим «все здания»: index.html?debug&buildall — первый уровень, много золота, на свободных клетках ставятся все башни и здания добычи по одному
// (смотреть размеры и вид); врагов нет, волны не идут (hold).
export async function buildAll(ctrl) {
  while (!ctrl.startLevel || !ctrl.save) await sleep(200);
  await sleep(800); ctrl.save.tutDone = 1; ctrl.startLevel('g1', 1); await sleep(1200);
  const go = document.querySelector('#lo-go'); if (go) go.click(); await sleep(2200);
  const s = ctrl.sim; if (!s) return;
  s.locked.clear(); s.allowed = null; s.limits = {}; s.gold = 99999; s.hold = true;
  const D = await import('./data.js?v=20261029214441');
  const types = [...Object.keys(D.TOWERS).map((t) => ['tower', t]), ...Object.keys(D.ECON).map((t) => ['econ', t])];
  const free = []; for (let r = 0; r < s.grid.length; r++) for (let c = 0; c < s.grid[0].length; c++) if (s.canBuild(c, r)) free.push([c, r]);
  // клетки вперемешку не нужны: идём по рядам сверху вниз через одну, чтобы здания не слипались
  const spots = free.filter(([c, r]) => (c + r) % 2 === 0);
  types.forEach(([kind, t], i) => { const cell = spots[i]; if (cell) s.build(kind, t, cell[0], cell[1]); });
  console.log('buildall: поставлено', s.buildings.length, 'из', types.length);
}
