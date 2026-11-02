// Счётчик «сейчас в игре» на стартовом экране: число от 145 до 278, которое плавно дрейфует (на 1–3 каждые несколько секунд).
const MIN = 145, MAX = 278;
export function startOnline() {
  const out = document.getElementById('ol-n'); if (!out) return;
  let n = MIN + Math.floor(Math.random() * (MAX - MIN + 1));
  const show = () => { out.textContent = n; };
  const step = () => {
    const d = Math.floor(Math.random() * 7) - 3;                       // −3 … +3
    n = Math.max(MIN, Math.min(MAX, n + (d || 1)));
    show(); setTimeout(step, 4000 + Math.random() * 6000);
  };
  show(); setTimeout(step, 4000 + Math.random() * 6000);
}
