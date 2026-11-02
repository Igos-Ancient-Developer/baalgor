// «Сейчас в игре»: одно общее число (145–278) на все плашки — на главном экране, на карте и в таблице лидеров.
// У каждой плашки своя небольшая погрешность и чуть другая задержка, поэтому числа рядом, но не совпадают до цифры.
// Раз в разное время (то 8–25 секунд, то около минуты) число спокойно меняется на соседнее, без анимации.
const MIN = 145, MAX = 278;
let n = MIN + Math.floor(Math.random() * (MAX - MIN + 1));
const widgets = [];
const PEOPLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.4"/><path d="M2.6 19.5c0-3.6 2.8-6 6.4-6s6.4 2.4 6.4 6z"/><circle cx="17.2" cy="9" r="2.7" opacity=".8"/><path d="M16.6 13.9c3.1.1 5.2 2 5.2 5.2h-4.6c0-2-.4-3.7-.6-5.2z" opacity=".8"/></svg>';
const clamp = (v) => Math.max(MIN, Math.min(MAX, v));

function adopt(el, off) {
  const num = el.querySelector('.ol-n'); if (!num) return;
  const w = { el, num, off, shown: clamp(n + off) };
  num.textContent = w.shown; widgets.push(w);
}
// создаёт плашку в конце верхней панели (если там её ещё нет)
export function mountOnline(host) {
  if (!host || host.querySelector('.online')) return;
  const el = document.createElement('div'); el.className = 'online'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<i class="ol-dot"></i>' + PEOPLE + '<b class="ol-n"></b>';
  host.appendChild(el); adopt(el, Math.floor(Math.random() * 7) - 3);
}
// число просто меняется на новое, без бега и подписей
function set(w, v) { if (v !== w.shown) { w.shown = v; w.num.textContent = v; } }
// пауза между изменениями каждый раз разная: чаще 8–25 секунд, иногда заметно дольше
const pause = () => (Math.random() < 0.2 ? 30000 + Math.random() * 40000 : 8000 + Math.random() * 17000);
function step() {
  const d = (Math.floor(Math.random() * 7) - 3) || 1;        // −3 … +3
  n = clamp(n + d);
  for (const w of widgets) setTimeout(() => set(w, clamp(n + w.off)), Math.random() * 2500);
  setTimeout(step, pause());
}
export function startOnline() {
  const title = document.getElementById('online'); if (title) adopt(title, 0);
  mountOnline(document.querySelector('#world .topbar'));
  mountOnline(document.querySelector('#board .topbar'));
  setTimeout(step, 6000 + Math.random() * 9000);
}
