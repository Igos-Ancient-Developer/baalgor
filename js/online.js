// «Сейчас в игре»: одно общее число (145–278) на все плашки — на главном экране, на карте и в таблице лидеров.
// У каждой плашки своя небольшая погрешность и чуть другая задержка, поэтому числа рядом, но не совпадают до цифры.
// Когда люди «приходят» и «уходят», число бежит к новому значению по одному, а над плашкой всплывает «+2» или «−1».
const MIN = 145, MAX = 278;
let n = MIN + Math.floor(Math.random() * (MAX - MIN + 1));
const widgets = [];
const PEOPLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.4"/><path d="M2.6 19.5c0-3.6 2.8-6 6.4-6s6.4 2.4 6.4 6z"/><circle cx="17.2" cy="9" r="2.7" opacity=".8"/><path d="M16.6 13.9c3.1.1 5.2 2 5.2 5.2h-4.6c0-2-.4-3.7-.6-5.2z" opacity=".8"/></svg>';
const clamp = (v) => Math.max(MIN, Math.min(MAX, v));

function adopt(el, off) {
  const num = el.querySelector('.ol-n'); if (!num) return;
  const w = { el, num, off, shown: clamp(n + off), timer: 0 };
  num.textContent = w.shown; widgets.push(w);
}
// создаёт плашку в конце верхней панели (если там её ещё нет)
export function mountOnline(host) {
  if (!host || host.querySelector('.online')) return;
  const el = document.createElement('div'); el.className = 'online'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<i class="ol-dot"></i>' + PEOPLE + '<b class="ol-n"></b>';
  host.appendChild(el); adopt(el, Math.floor(Math.random() * 7) - 3);
}
function flash(w, d) {
  const u = document.createElement('u'); u.className = 'ol-d ' + (d > 0 ? 'up' : 'dn'); u.textContent = (d > 0 ? '+' : '−') + Math.abs(d);
  w.el.appendChild(u); setTimeout(() => u.remove(), 1500);
}
function run(w, target) {                                   // число бежит к target по одному
  clearInterval(w.timer);
  const d = target - w.shown; if (!d) return;
  flash(w, d);
  w.timer = setInterval(() => {
    w.shown += Math.sign(target - w.shown); w.num.textContent = w.shown; w.num.classList.remove('tick'); void w.num.offsetWidth; w.num.classList.add('tick');
    if (w.shown === target) clearInterval(w.timer);
  }, 110);
}
function step() {
  const d = (Math.floor(Math.random() * 7) - 3) || 1;        // −3 … +3
  n = clamp(n + d);
  for (const w of widgets) setTimeout(() => run(w, clamp(n + w.off)), Math.random() * 1600);
  setTimeout(step, 3500 + Math.random() * 5500);
}
export function startOnline() {
  const title = document.getElementById('online'); if (title) adopt(title, 0);
  mountOnline(document.querySelector('#world .topbar'));
  mountOnline(document.querySelector('#board .topbar'));
  setTimeout(step, 3500 + Math.random() * 3000);
}
