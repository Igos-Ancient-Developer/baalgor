// Режим просмотра врагов: открой index.html?debug&enemydemo — первый уровень, золото, несколько башен и казарма,
// каждые несколько секунд по дороге идут враги всех видов (или тех, что перечислены: enemydemo=ogre,demon) (ходьба, атака у казармы, смерть).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function enemyDemo(ctrl) {
  while (!ctrl.startLevel || !ctrl.save) await sleep(200);          // ждём, пока игра загрузится
  await sleep(800); ctrl.save.tutDone = 1; ctrl.startLevel('g1', 1); await sleep(1200);
  const go = document.querySelector('#lo-go'); if (go) go.click(); await sleep(2200);
  const s = ctrl.sim; if (!s) return;
  s.allowed = null; s.limits = {}; s.gold = 5000; s.hold = false;
  const cells = []; for (let r = 0; r < s.grid.length; r++) for (let c = 0; c < s.grid[0].length; c++) if (s.canBuild(c, r)) {
    let cov = 0; for (const p of s.paths) for (let d = 0; d < p.total; d += 16) { const q = p.at(d); if (Math.hypot(q.x - (c + 0.5) * 48, q.y - (r + 0.5) * 48) <= 2.4 * 48) cov++; }
    cells.push([c, r, cov]);
  }
  cells.sort((a, b) => b[2] - a[2]);
  const plan = ((location.search.match(/towers=([\w,]+)/) || [])[1] || 'barracks,bolt,bolt,frost').split(','); let used = [];
  for (const t of plan) { const cell = cells.find(([c, r]) => !used.some(([a, b]) => Math.abs(a - c) < 2 && Math.abs(b - r) < 2)); if (!cell) break; used.push(cell); const b = s.build('tower', t, cell[0], cell[1]); if (b && typeof b === 'object') { b.level = t === 'barracks' ? 2 : 3; s.refreshStats(b); } }
  const types = ['grunt', 'skeleton', 'zombie', 'hound', 'bat', 'slime', 'shaman', 'knight', 'butcher', 'gargoyle', 'berserker', 'ogre', 'reaper', 'lich', 'demon'];
  const pick = (location.search.match(/enemydemo=([\w,]+)/) || [])[1]; const list = pick ? pick.split(',').filter((t) => types.includes(t)) : types;
  await ctrl.ensureTypes(list);                                      // листы врагов грузятся по уровню: докачиваем нужные
  for (;;) {
    if (ctrl.sim !== s || s.state !== 'play') return;
    list.forEach((t, i) => s.spawn(t, 0, { w: 1, d: i * 38, noBounty: true }));
    await sleep(9000);
  }
}
