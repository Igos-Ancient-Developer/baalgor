// Кошелёк донат-кристаллов. В Telegram баланс, покупки и цены живут на сервере (supabase/schema.sql), клиент только показывает.
// Вне Telegram (обычный браузер) работает локальный режим для разработки: траты считаются в сохранении, пополнение только с ?debug.
import * as D from './data.js?v=20261030153315';
import { Net } from './net.js?v=20261030153315';
import { TG } from './tg.js?v=20261030153315';

const today = () => new Date().toISOString().slice(0, 10);
const debug = () => location.search.includes('debug');

export const Wallet = {
  save: null, onChange: () => {},
  init(save, onChange) { this.save = save; if (onChange) this.onChange = onChange; },
  get online() { return Net.canSubmit(); },

  // сервер → сохранение (баланс, открытое, слоты, пакеты, серия)
  apply(w) {
    const s = this.save; s.gems = w.gems; s.slots = Math.max(s.slots || 2, w.slots || 2); s.packs = w.packs || []; s.starterBought = !!w.starter; s.dailyReady = !!w.daily_ready; s.streak = w.streak || 0;
    if (w.chests) s.chestsSrv = w.chests;
    const have = new Set(w.unlocked || []);
    for (const id of have) s.unlocked[id] = 1;
    for (const id of D.PREMIUM_ORDER) if (!have.has(id)) delete s.unlocked[id];                 // премиум берётся только с сервера
    if (w.starter && !s.starterSouls) { s.starterSouls = 1; s.souls += D.STARTER.souls; }       // души из стартового набора
    this.onChange();
  },
  async sync() {
    if (!this.online) return null;
    try { const w = await Net.call('wallet_get', { init_data: Net.initData() }); if (w && w.ok) { this.apply(w); if (!this._warm) { this._warm = 1; setTimeout(() => this.prefetchInvoices(), 2500); } return w; } } catch (e) { /* без связи */ }      // счета Stars готовим сразу после входа: первый запуск функции на сервере занимает несколько секунд
    return null;
  },
  // kind: unlock | slot | boost; cost нужен только локальному режиму (на сервере цену считает сервер)
  async spend(kind, id, cost, lvl = 1) {
    const s = this.save;
    if (this.online) {
      try { const r = await Net.call('wallet_spend', { init_data: Net.initData(), p: { kind, id, lvl } }); if (r && r.ok) this.apply(r); return r || { error: 'net' }; } catch (e) { return { error: 'net' }; }
    }
    if ((s.gems || 0) < cost) return { error: 'gems', price: cost };
    s.gems -= cost;
    if (kind === 'unlock') s.unlocked[id] = 1; else if (kind === 'slot') s.slots = (s.slots || 2) + 1;
    this.onChange(); return { ok: true, spent: cost };
  },
  dailyReady() { const s = this.save; return this.online ? !!s.dailyReady : (s.daily || {}).last !== today(); },
  dailyDay() { const s = this.save; return this.online ? ((s.streak || 0) % 7) + 1 : (((s.daily || {}).streak || 0) % 7) + 1; },
  // ежедневный подарок — души (хранятся в сохранении); сервер лишь следит за серией и за тем, что подарок взят один раз в сутки
  async daily() {
    const s = this.save;
    if (this.online) {
      try {
        const r = await Net.call('wallet_daily', { init_data: Net.initData() });
        if (r && r.ok) { this.apply(r); const reward = D.DAILY[Math.max(0, (r.streak || 1) - 1) % 7]; s.souls = (s.souls || 0) + reward; this.onChange(); return { ok: true, reward }; }
        return r || { error: 'net' };
      } catch (e) { return { error: 'net' }; }
    }
    const d = s.daily || (s.daily = { last: '', streak: 0 }); if (d.last === today()) return { error: 'done' };
    const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    d.streak = d.last === yest ? (d.streak % 7) + 1 : 1; d.last = today();
    const reward = D.DAILY[d.streak - 1]; s.souls = (s.souls || 0) + reward; this.onChange(); return { ok: true, reward };
  },
  // награда кровавого уровня недели: 500 душ (в сохранении) и 5 кристаллов (на сервере: один раз за неделю на игрока)
  async weekly(week) {
    const s = this.save, W = { souls: 500, gems: 5 };
    if (this.online) {
      try {
        const r = await Net.call('wallet_weekly', { init_data: Net.initData(), week });
        if (r && r.ok) { this.apply(r); s.souls = (s.souls || 0) + W.souls; this.onChange(); return { ok: true, ...W }; }
        return r || { error: 'net' };
      } catch (e) { return { error: 'net' }; }
    }
    s.souls = (s.souls || 0) + W.souls; s.gems = (s.gems || 0) + W.gems; this.onChange(); return { ok: true, ...W };
  },
  // ссылки на счета создаём заранее, когда игрок открыл магазин: создание идёт через сервер (функция + база + Telegram) и занимает секунды, а ссылка многоразовая.
  // Хранится только в памяти: после перезапуска игры создаётся заново, чтобы не попасть на старую цену.
  prefetchInvoices() {
    if (!this.online) return; const s = this.save, ids = D.PACKS.map((p) => p.id); if (!s.starterBought) ids.push('starter');
    this._inv ||= {}; const todo = ids.filter((id) => !this._inv[id] && !(this._pend ||= {})[id]);
    const run = async () => { for (let id; (id = todo.shift());) { this._pend[id] = 1; try { const r = await Net.invoice(id); if (r && r.link) this._inv[id] = r.link; } catch (e) { /* без связи */ } delete this._pend[id]; } };
    run(); run(); run();                                                   // три потока: все семь счетов за пару секунд
  },
  // пакет за Stars: открывает счёт Telegram, после оплаты ждёт начисления от вебхука
  async buy(pack) {
    const s = this.save, id = pack.id || pack;
    if (!this.online) {
      if (!debug()) return { error: 'notg' };
      const pk = D.PACKS.find((p) => p.id === id);                       // отладка вне Telegram: начисляем сразу, как вебхук
      if (id === 'starter') { if (s.starterBought) return { error: 'starter_done' }; s.starterBought = true; s.gems += D.STARTER.gems; s.unlocked[D.STARTER.tower] = 1; s.souls += D.STARTER.souls; }
      else { const first = !(s.packs || []).includes(id); s.gems += pk.gems * (first ? D.FIRST_BONUS : 1); if (first) s.packs.push(id); }
      this.onChange(); return { status: 'paid' };
    }
    let link = (this._inv || {})[id];                                      // ссылка на счёт уже создана заранее (prefetchInvoices): окно оплаты открывается сразу
    if (!link) { const inv = await Net.invoice(id); if (!inv || !inv.link) return { error: inv && inv.error || 'net' }; link = inv.link; (this._inv ||= {})[id] = link; }
    const status = await new Promise((res) => { try { TG.tg.openInvoice(link, res); } catch (e) { res('failed'); } });
    if (status !== 'paid') return { status };
    for (let i = 0; i < 10; i++) { const before = s.gems; await new Promise((r) => setTimeout(r, 1200)); const w = await this.sync(); if (w && (w.gems > before || w.starter !== undefined && id === 'starter' && w.starter)) break; }   // вебхук может прийти с задержкой
    return { status: 'paid' };
  },
};
