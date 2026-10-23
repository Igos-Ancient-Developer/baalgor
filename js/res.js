// Плашки ресурсов: у каждого ресурса своя плашка с круглым значком (как в популярных играх Telegram).
import { bareGlyphUrl } from './icons.js?v=20261023180731';
import { gemHtml, startGems } from './gem3d.js?v=20261023180731';
startGems();
const fmt = (n) => Math.round(n || 0).toLocaleString('ru-RU');

// кристалл, который крутится и сверкает
export const gemIc = gemHtml;
export function plates(save) {
  return `<button class="rp souls" data-forge aria-label="Кузница"><span class="ri"><img src="${bareGlyphUrl('soul', 26)}" alt=""></span><b>${fmt(save.souls)}</b></button>`
    + `<button class="rp gems" data-shop aria-label="Магазин"><span class="ri">${gemIc(26)}</span><b>${fmt(save.gems)}</b></button>`;
}
export const trophyPlate = (text) => `<span class="rp ach"><span class="ri"><img src="${bareGlyphUrl('trophy', 26)}" alt=""></span><b>${text}</b></span>`;
export function fillPlates(root, save, openShop, openForge) {
  root.className = 'rps'; root.innerHTML = plates(save);
  const g = root.querySelector('[data-shop]'); if (g && openShop) g.onclick = openShop;
  const f = root.querySelector('[data-forge]'); if (f && openForge) f.onclick = openForge;
}
