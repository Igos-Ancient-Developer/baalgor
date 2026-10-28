// Обёртка над Telegram Mini App SDK. Вне Telegram (обычный браузер) всё работает без него.
import { newLife } from './meta.js?v=20261028174922';
const tg = window.Telegram && window.Telegram.WebApp;
const KEY = 'bloodkeep_save_v1';

const ver = (v) => { try { return !!(tg && tg.isVersionAtLeast && tg.isVersionAtLeast(v)); } catch (e) { return false; } };

export const TG = {
  tg,
  inTelegram: !!(tg && tg.initData),
  platform: tg ? tg.platform : 'web',
  isMobile: !!(tg && ['android', 'ios', 'android_x'].includes(tg.platform)) || /Android|iPhone|iPad/i.test(navigator.userAgent),

  init() {
    if (!tg) return;
    try { tg.ready(); } catch (e) { /* */ }
    try { tg.expand(); } catch (e) { /* */ }
    try { if (ver('8.0') && tg.requestFullscreen && !tg.isFullscreen) tg.requestFullscreen(); } catch (e) { /* */ }      // сразу на весь экран
    const c = '#0b0609';
    try { tg.setHeaderColor(c); } catch (e) { /* */ }
    try { tg.setBackgroundColor(c); } catch (e) { /* */ }
    try { if (tg.setBottomBarColor) tg.setBottomBarColor(c); } catch (e) { /* */ }
    try { if (tg.disableVerticalSwipes) tg.disableVerticalSwipes(); } catch (e) { /* */ }
    try { if (ver('8.0') && tg.lockOrientation) tg.lockOrientation(); } catch (e) { /* */ }
    this.applySafeArea();
    for (const ev of ['safeAreaChanged', 'contentSafeAreaChanged', 'fullscreenChanged', 'viewportChanged']) {
      try { tg.onEvent(ev, () => this.applySafeArea()); } catch (e) { /* */ }
    }
  },
  applySafeArea() {
    const root = document.documentElement.style;
    const s = (tg && tg.safeAreaInset) || {}, cs = (tg && tg.contentSafeAreaInset) || {};
    const top = (s.top || 0) + (cs.top || 0), bot = (s.bottom || 0) + (cs.bottom || 0);
    // CSS env() даёт запас в обычном браузере/PWA; в Telegram берём значения SDK
    root.setProperty('--sa-top', (tg && tg.isFullscreen ? top : Math.max(top, 0)) + 'px');
    root.setProperty('--sa-bottom', Math.max(bot, 0) + 'px');
    root.setProperty('--sa-left', (s.left || 0) + 'px');
    root.setProperty('--sa-right', (s.right || 0) + 'px');
  },
  backButton(fn) {
    try {
      const bb = tg && tg.BackButton; if (!bb) return;
      if (!fn && !this._shown) return;                       // ничего не изменилось
      if (fn && this._shown && this._bb === fn) return;
      if (this._bb) { bb.offClick(this._bb); this._bb = null; }
      if (fn) { this._bb = fn; bb.onClick(fn); bb.show(); this._shown = true; } else { bb.hide(); this._shown = false; }
      // внутриигровые кнопки «Назад» прячем только пока Telegram показывает свою; если её нет, остаётся наша, и из окна всегда можно выйти
      document.body.classList.toggle('tgback', !!(this._shown && bb.isVisible !== false));
    } catch (e) { /* */ }
  },
  get isFullscreen() { return !!(tg && tg.isFullscreen); },
  toggleFullscreen() {
    if (!tg || !ver('8.0')) return false;
    try { if (tg.isFullscreen) tg.exitFullscreen(); else tg.requestFullscreen(); return true; } catch (e) { return false; }
  },
  canFullscreen() { return !!(tg && ver('8.0') && tg.requestFullscreen); },
  allowConfirm: true,
  closingConfirm(on) { try { if (tg) { (on && this.allowConfirm) ? tg.enableClosingConfirmation() : tg.disableClosingConfirmation(); } } catch (e) { /* */ } },
  user() { return tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null; },
  onVisibility(cb) {
    document.addEventListener('visibilitychange', () => cb(document.hidden));
    try { if (tg) { tg.onEvent('deactivated', () => cb(true)); tg.onEvent('activated', () => cb(false)); } } catch (e) { /* */ }
  },
  // сохранения: CloudStorage Telegram (синхронизируется между устройствами) + localStorage как запасной вариант
  async load() {
    let local = null, cloud = null;
    try { local = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* */ }
    if (tg && tg.CloudStorage && ver('6.9')) {
      cloud = await new Promise((res) => { try { tg.CloudStorage.getItem(KEY, (err, v) => { if (err || !v) return res(null); try { res(JSON.parse(v)); } catch (e) { res(null); } }); } catch (e) { res(null); } setTimeout(() => res(null), 1500); });
    }
    return mergeSave(local, cloud);
  },
  save(data) {
    const s = JSON.stringify(data);
    try { localStorage.setItem(KEY, s); } catch (e) { /* */ }
    try {
      if (tg && tg.CloudStorage && ver('6.9')) {
        // лимит значения CloudStorage — 4096 символов: при переполнении не отправляем счета (они и так хранятся на сервере рейтинга)
        const slim = s.length < 3900 ? s : JSON.stringify({ ...data, prog: { cleared: data.prog.cleared, scores: {} } });
        if (slim.length < 4000) tg.CloudStorage.setItem(KEY, slim, () => {});
      }
    } catch (e) { /* */ }
  },
};

// лучший забег: выше достигнутый уровень, затем очки, затем меньшее время
export const betterRun = (a, b) => !b || !(b.lv || b.score) || (a.lv || 0) > (b.lv || 0) || ((a.lv || 0) === (b.lv || 0) && ((a.score || 0) > (b.score || 0) || ((a.score || 0) === (b.score || 0) && a.time && (!b.time || a.time < b.time))));
export const defaultSettings = () => ({ sfxVol: 1, musVol: 0.8, gore: 1, perf: 1, dmg: true, confirm: true });
export function defaultSave() { return { best: {}, sfx: true, mus: true, set: defaultSettings(), rank: null, plays: 0, kills: 0, souls: 0, gems: 0, slots: 2, loadout: ['bolt', 'mine'], tutDone: 0, packs: [], starterBought: false, daily: { last: '', streak: 0 }, perks: {}, unlocked: {}, ach: {}, life: newLife(), prog: { cleared: {}, scores: {} } }; }
function mergeSave(a, b) {
  const out = defaultSave();
  for (const src of [a, b]) {
    if (!src) continue;
    Object.assign(out, { sfx: src.sfx ?? out.sfx, mus: src.mus ?? out.mus }); if (src.set) out.set = { ...out.set, ...src.set };
    if (src.rank && 'score' in src.rank) {                                              // рейтинговый забег: лучший (уровень, очки, время) и самый быстрый полный
      const r = out.rank ||= { lv: 0, score: 0, time: 0, fast: 0 }, sr = src.rank;
      if (betterRun(sr, r)) { r.lv = sr.lv || 0; r.score = sr.score || 0; r.time = sr.time || 0; r.loadout = sr.loadout || ''; }
      if (sr.fast && (!r.fast || sr.fast < r.fast)) r.fast = sr.fast;
    }
    out.plays = Math.max(out.plays, src.plays || 0); out.kills = Math.max(out.kills, src.kills || 0); out.souls = Math.max(out.souls, src.souls || 0); out.gems = Math.max(out.gems || 0, src.gems || 0); out.slots = Math.max(out.slots || 2, src.slots || 2); for (const k of src.packs || []) if (!out.packs.includes(k)) out.packs.push(k); out.starterBought = out.starterBought || !!src.starterBought; if (src.daily && src.daily.last > out.daily.last) out.daily = { ...src.daily }; out.tutDone = out.tutDone || src.tutDone || 0;
    if (Array.isArray(src.loadout) && src.loadout.length) out.loadout = src.loadout.slice(0, 5);
    if (src.last) out.last = src.last; if (src.lastDiff) out.lastDiff = { ...(out.lastDiff || {}), ...src.lastDiff };      // последний сыгранный уровень и сложность на каждом уровне
    for (const k of Object.keys(src.best || {})) out.best[k] = Math.max(out.best[k] || 0, src.best[k]);
    for (const k of Object.keys(src.perks || {})) out.perks[k] = Math.max(out.perks[k] || 0, src.perks[k]);
    for (const k of Object.keys(src.unlocked || {})) out.unlocked[k] = 1;
    for (const k of Object.keys(src.ach || {})) out.ach[k] = 1;
    for (const id of Object.keys((src.prog && src.prog.cleared) || {})) { out.prog.cleared[id] ||= {}; Object.assign(out.prog.cleared[id], src.prog.cleared[id]); }
    for (const k of Object.keys((src.prog && src.prog.scores) || {})) out.prog.scores[k] = Math.max(out.prog.scores[k] || 0, src.prog.scores[k]);
    const l = src.life || {};
    for (const k of Object.keys(out.life)) {
      if (typeof out.life[k] === 'number') out.life[k] = Math.max(out.life[k], l[k] || 0);
      else for (const kk of Object.keys(l[k] || {})) out.life[k][kk] = 1;
    }
  }
  return out;
}
