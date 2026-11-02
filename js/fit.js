// Подбор шрифта под ширину: если надпись не помещается в свою кнопку или плашку (на любом языке), кегль уменьшается
// (не ниже 62% обычного), а если и так не влезает, разрешается перенос на вторую строку. Проверка раз в полсекунды и только по тем
// надписям, у которых изменился текст или ширина.
const SEL = 'button, .btn, .stn > span, .fbuy, .dname, .lvp-t b, .lgcur b, .lgrow .nm b, .rp b, .sect-title, .dflab b, #lo-title, .topbar h2, .cn, .cc, .fn, .an, .mt, .lb, .dl, .dr, .pn, .us, .bt, .ap, .wk-time b, .ps-d b, .rk-best .bt, .rinfo .rl small';
const MIN = 0.62, STEP = 0.93;
const shown = (e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed';

function fit(el) {
  const sig = el.textContent + '|' + el.clientWidth;
  if (el._fitSig === sig) return;
  if (el._fit0) { el.style.fontSize = ''; el.style.whiteSpace = ''; el.style.lineHeight = ''; }         // текст или ширина изменились: начинаем с обычного кегля
  const f0 = parseFloat(getComputedStyle(el).fontSize); el._fit0 = f0;
  if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
    let k = 1;
    while (k > MIN && el.scrollWidth > el.clientWidth + 1) { k *= STEP; el.style.fontSize = (f0 * k).toFixed(2) + 'px'; }
    if (el.scrollWidth > el.clientWidth + 1) { el.style.whiteSpace = 'normal'; el.style.overflowWrap = 'anywhere'; el.style.lineHeight = '1.05'; el.style.fontSize = (f0 * 0.8).toFixed(2) + 'px'; }
  }
  el._fitSig = el.textContent + '|' + el.clientWidth;
}

export function fitAll(root = document.body) {
  for (const el of root.querySelectorAll(SEL)) {
    if (!el.textContent.trim() || !shown(el)) continue;
    // у контейнера с вложенными кнопками/плашками подгоняем только сами надписи
    if (el.querySelector('button, .btn') && !el.matches('button, .btn')) continue;
    fit(el);
  }
}

export function startFit() {
  let busy = false;
  const tick = () => { if (busy || document.hidden) return; busy = true; try { fitAll(); } catch (e) { /* */ } busy = false; };
  setInterval(tick, 500); addEventListener('resize', () => { document.querySelectorAll(SEL).forEach((e) => { e._fitSig = null; }); tick(); });
}
