// Реклама за награду (AdsGram, площадка Baalgor в partner.adsgram.ai). Блоки — в config.js (ADS): у каждого места свой блок, чтобы видеть в кабинете,
// какое место приносит больше. SDK грузится только при первом показе. Вне Telegram и без номера блока кнопки рекламы не показываются.
// show(kind) → 'done' (досмотрел, награду можно выдавать) | 'skip' (закрыл раньше) | 'none' (рекламы сейчас нет) | 'error'.
// Кристаллы за рекламу начисляет сервер: AdsGram сам сообщает о просмотре (Reward URL → функция ad-reward), клиент лишь забирает начисление (supabase/ads.sql).
import { ADS } from './config.js?v=20261106143929';
import { Net } from './net.js?v=20261106143929';

const tg = window.Telegram && window.Telegram.WebApp;
const SDK = 'https://sad.adsgram.ai/js/sad.min.js';
const debug = () => location.search.includes('addebug');
let loadP = null;
const ctrls = {};

function load() {
  if (window.Adsgram) return Promise.resolve();
  return loadP ||= new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = SDK; s.async = true;
    s.onload = () => (window.Adsgram ? res() : rej(new Error('sdk')));
    s.onerror = () => { loadP = null; s.remove(); rej(new Error('load')); };
    document.head.appendChild(s);
  });
}

export const Ads = {
  // место показа включено: есть блок и игра открыта в Telegram (AdsGram работает только там)
  on(kind) { return !!(ADS && ADS[kind]) && !!(tg && tg.initData); },
  async show(kind, sfx) {
    if (!this.on(kind)) return 'none';
    if (this.busy) return 'error'; this.busy = true;
    try {
      await load();
      const c = ctrls[kind] ||= window.Adsgram.init({ blockId: String(ADS[kind]), debug: debug() });
      if (sfx) sfx.stopMusic();
      Net.step('ad_show');
      const r = await c.show().then((x) => x, (x) => x);              // промис отклоняется при пропуске, ошибке и когда рекламы нет
      if (r && r.done) { Net.step('ad_done'); return 'done'; }
      if (!r || r.state === 'load') return 'none';                       // ролик не загрузился: показать нечего
      return r.error ? 'error' : 'skip';
    } catch (e) { return 'error'; }
    finally { this.busy = false; }
  },
  // подписи результата для игрока
  say(res) { return res === 'skip' ? 'Награда — только за просмотр до конца' : res === 'none' ? 'Реклама сейчас недоступна, попробуй позже' : 'Не получилось показать рекламу'; },
};
