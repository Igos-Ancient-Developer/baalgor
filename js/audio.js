// Звук: полностью синтезированный на WebAudio (никаких файлов). Эффекты + тёмный эмбиент (js/music.js: свой для каждого уровня).
import { createTrack, MENU_SPEC } from './music.js?v=20261028204133';
export class Sfx {
  constructor() {
    this.ctx = null; this.sfxOn = true; this.musOn = true;
    this.last = {}; this.track = null; this.spec = MENU_SPEC; this.tension = 0;
  }
  // iPhone глушит WebAudio, пока стоит беззвучный режим: переводим аудиосессию в «воспроизведение» и держим тихий <audio> —
  // тогда звук идёт и при выключенном рингере. Работает только из жеста пользователя, поэтому вызывается из unlock().
  keepAwake() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* */ }
    if (this.silent) { if (this.silent.paused) this.silent.play().catch(() => {}); return; }
    try {
      const n = 800, b = new DataView(new ArrayBuffer(44 + n * 2)), w = (o, t) => { for (let i = 0; i < t.length; i++) b.setUint8(o + i, t.charCodeAt(i)); };
      w(0, 'RIFF'); b.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true); b.setUint32(24, 8000, true); b.setUint32(28, 16000, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); w(36, 'data'); b.setUint32(40, n * 2, true);
      const a = new Audio(URL.createObjectURL(new Blob([b.buffer], { type: 'audio/wav' }))); a.loop = true; a.volume = 0.01; a.setAttribute('playsinline', ''); this.silent = a; a.play().catch(() => {});
    } catch (e) { /* */ }
  }
  unlock() {
    this.keepAwake();
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    // общий компрессор: можно делать звук погромче, не боясь перегруза динамика телефона
    this.master = this.ctx.createGain(); this.master.gain.value = 1.0;
    const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
    this.master.connect(comp); comp.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = 1.9 * (this.volS ?? 1); this.sfxBus.connect(this.master);
    this.musBus = this.ctx.createGain(); this.musBus.gain.value = 2.0 * (this.volM ?? 0.8); this.musBus.connect(this.master);
    // шумовой буфер
    const len = this.ctx.sampleRate * 1.5, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    // эхо для музыки
    this.delay = this.ctx.createDelay(1.2); this.delay.delayTime.value = 0.42; const fb = this.ctx.createGain(); fb.gain.value = 0.38; const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    this.delay.connect(lp); lp.connect(fb); fb.connect(this.delay); lp.connect(this.musBus);
    // реверберация для музыки: затухающий шум 2.8 с
    const rl = Math.floor(this.ctx.sampleRate * 1.3), ir = this.ctx.createBuffer(1, rl, this.ctx.sampleRate);
    for (let ch = 0; ch < 1; ch++) { const d2 = ir.getChannelData(ch); for (let i = 0; i < rl; i++) d2[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 2.6); }
    const cv = this.ctx.createConvolver(); cv.buffer = ir; const rg = this.ctx.createGain(); rg.gain.value = 0.6; cv.connect(rg); rg.connect(this.musBus); this.rev = cv;
    if (this.musOn && this.wantMusic) this.startMusic();
  }
  setSfx(on) { this.sfxOn = on; }
  setVolumes(sfx, mus) { this.volS = sfx; this.volM = mus; if (this.ctx) { this.sfxBus.gain.value = 1.9 * sfx; this.musBus.gain.value = 2.0 * mus; } }
  setMusic(on) { this.musOn = on; if (!this.ctx) return; if (on) this.startMusic(); else this.stopMusic(); }
  gate(name, gap) { if (!this.ctx) return false; const t = this.ctx.currentTime; if (this.last[name] && t - this.last[name] < gap) return false; this.last[name] = t; return true; }

  // примитивы
  tone(type, f0, f1, dur, gain, delay = 0, bus) {
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.01, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(type, f0, f1, dur, gain, delay = 0, q = 1) {
    const c = this.ctx, t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }


  // «Нинтендо»-звуки: короткие прямоугольные и треугольные ноты по очереди
  chip(notes, step = 0.055, type = 'square', gain = 0.11, hold = 1) {
    notes.forEach((f, i) => { if (f) this.tone(type, f, f, step * hold, gain, i * step); });
  }
  // «мясные» кирпичики в духе Mortal Kombat: глухой удар, хруст костей, мокрый плеск, фонтан крови
  punch(v = 1, f = 1) { this.tone('sine', 190 * f, 36, 0.24, 0.8 * v); this.noise('lowpass', 1500, 110, 0.15, 0.55 * v); this.noise('highpass', 2600, 1800, 0.025, 0.4 * v); }
  crunch(n, v = 1, t0 = 0, lo = 1600, hi = 4600) { for (let i = 0; i < n; i++) this.noise('bandpass', lo + Math.random() * (hi - lo), 800, 0.016 + Math.random() * 0.02, (0.32 + Math.random() * 0.3) * v, t0 + i * (0.012 + Math.random() * 0.022), 3 + Math.random() * 5); }
  wet(v = 1, t0 = 0, dur = 0.3, f = 1) {
    const c = this.ctx, t = c.currentTime + t0, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; fl.type = 'bandpass'; fl.Q.value = 6; fl.frequency.setValueAtTime(520 * f, t); fl.frequency.exponentialRampToValueAtTime(170 * f, t + dur);
    lfo.frequency.value = 22 + Math.random() * 16; lg.gain.value = 240 * f; lfo.connect(lg); lg.connect(fl.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.55 * v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(this.sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.03); lfo.start(t); lfo.stop(t + dur + 0.03);
  }
  spurt(v = 1, t0 = 0, n = 3) {                                    // фонтан крови: шум, пульсирующий в такт сердцу
    const c = this.ctx, t = c.currentTime + t0, dur = 0.14 * n + 0.12, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; f.type = 'highpass'; f.frequency.value = 1800; lfo.frequency.value = 7; lg.gain.value = 0.5; lfo.connect(lg); lg.connect(g.gain);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.28 * v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.03); lfo.start(t); lfo.stop(t + dur + 0.03);
  }

  // сочный всплеск: низкий удар, «хлюп» (резонансный шум с проваливающейся частотой и пузырями), брызги капель; r — высота, v — громкость
  slop(v = 1, t0 = 0, r = 1) {
    const c = this.ctx, t = c.currentTime + t0, dur = 0.34 + Math.random() * 0.12;
    this.tone('sine', 150 * r, 38, 0.2, 0.7 * v, t0);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), f2 = c.createBiquadFilter();
    s.buffer = this.noiseBuf; s.loop = true; f.type = 'bandpass'; f.Q.value = 9; f.frequency.setValueAtTime(1100 * r, t); f.frequency.exponentialRampToValueAtTime(190 * r, t + dur * 0.8);
    f2.type = 'lowpass'; f2.frequency.value = 2600;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.75 * v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.18 * v, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(f2); f2.connect(g); g.connect(this.sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.03);
    for (let i = 0; i < 4; i++) { const ff = (380 + Math.random() * 520) * r, dl = 0.05 + i * 0.065 + Math.random() * 0.04; this.tone('sine', ff, ff * 2.1, 0.05, 0.1 * v, t0 + dl); }          // пузыри
    for (let i = 0; i < 5; i++) this.noise('highpass', 3800 + Math.random() * 2500, 2500, 0.018, 0.12 * v, t0 + 0.04 + Math.random() * 0.22, 2);               // капли
  }
  // предсмертный вскрик: гортанный хрип с формантой, высота зависит от размера
  groan(v = 1, r = 1) {
    const c = this.ctx, t = c.currentTime, d = 0.28 + Math.random() * 0.12, o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o2.type = 'square'; const f0 = (150 + Math.random() * 60) * r;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.45, t + d); o2.frequency.setValueAtTime(f0 * 1.5, t); o2.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + d);
    f.type = 'bandpass'; f.Q.value = 3.5; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(380, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * v, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfxBus); o.start(t); o2.start(t); o.stop(t + d + 0.03); o2.stop(t + d + 0.03);
    this.noise('bandpass', 1500, 500, d * 0.8, 0.07 * v, 0, 1.2);
  }
  // Смерть по видам: у каждого вида своё звучание, чтобы по слуху было понятно, кто погиб
  death(type, v = 1) {
    if (!this.ctx || !this.sfxOn || !this.gate('death', 0.06)) return;
    const r = 0.88 + Math.random() * 0.26, G = {
      slime: 'goo', slimelet: 'goo', sandgolem: 'stone', snowgolem: 'ice', lavagolem: 'lava', skeleton: 'bone', iceskel: 'bone', zombie: 'zombie', ogre: 'zombie', butcher: 'zombie',
      goblin: 'squeal', imp: 'squeal', bat: 'screech', gargoyle: 'screech', reaper: 'wail', djinn: 'wail', lich: 'wail', anubis: 'wail', knight: 'metal',
      pinky: 'roar', baron: 'roar', berserker: 'roar', yeti: 'roar', ultrayeti: 'roar', wolf: 'yelp', hound: 'yelp', mummy: 'dust', pharaoh: 'dust',
    }[type] || 'zombie';
    switch (G) {
      case 'goo': this.slop(1 * v, 0, 0.7 * r); this.slop(0.7 * v, 0.12, 0.9 * r); for (let i = 0; i < 6; i++) this.tone('sine', 200 + Math.random() * 300, 700, 0.06, 0.12 * v, 0.05 + i * 0.06); break;
      case 'stone': this.tone('sine', 70 * r, 28, 0.5, 0.8 * v); this.noise('lowpass', 900, 80, 0.5, 0.5 * v); this.crunch(9, 1.2 * v, 0.02, 400, 2200); this.noise('bandpass', 300, 120, 0.35, 0.4 * v, 0.1, 2); break;
      case 'ice': this.crunch(6, 1 * v, 0, 3000, 7000); [3400, 4300, 5200, 4700].forEach((f, i) => this.tone('sine', f * r, f * r * 0.7, 0.14, 0.09 * v, i * 0.035)); this.tone('sine', 120, 45, 0.3, 0.5 * v); this.noise('highpass', 5500, 3500, 0.2, 0.2 * v); break;
      case 'lava': this.tone('sine', 60 * r, 25, 0.55, 0.8 * v); this.noise('lowpass', 700, 60, 0.5, 0.5 * v); this.noise('highpass', 5000, 2500, 0.55, 0.16 * v, 0.05); this.crunch(6, 0.9 * v, 0.03, 500, 2600); this.slop(0.4 * v, 0.1, 0.6); break;
      case 'bone': for (let i = 0; i < 7; i++) { this.noise('bandpass', 1800 + Math.random() * 3200, 900, 0.025, 0.4 * v, i * 0.03 + Math.random() * 0.02, 5); this.tone('triangle', (700 + Math.random() * 900) * r, 300, 0.04, 0.12 * v, i * 0.03); } this.tone('sine', 140 * r, 60, 0.12, 0.35 * v); break;
      case 'zombie': this.groan(1.2 * v, 0.7 * r); this.slop(0.7 * v, 0.12, 0.8 * r); this.punch(0.5 * v, 0.7); break;
      case 'squeal': this.tone('square', 1100 * r, 2400 * r, 0.09, 0.1 * v); this.tone('square', 2400 * r, 800 * r, 0.14, 0.09 * v, 0.09); this.slop(0.45 * v, 0.12, 1.3); break;
      case 'screech': { for (let i = 0; i < 3; i++) this.tone('sawtooth', (2400 + i * 350) * r, (1500 + i * 200) * r, 0.1, 0.07 * v, i * 0.07); this.noise('bandpass', 3000, 1200, 0.25, 0.14 * v, 0, 2); this.slop(0.4 * v, 0.12, 1.2); break; }
      case 'wail': { const c = this.ctx, t = c.currentTime, o = c.createOscillator(), lf = c.createOscillator(), lg = c.createGain(), g = c.createGain(), f0 = 520 * r; o.type = 'triangle'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.4, t + 0.6); lf.frequency.value = 7; lg.gain.value = 14; lf.connect(lg); lg.connect(o.frequency); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14 * v, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62); o.connect(g); g.connect(this.sfxBus); o.start(t); lf.start(t); o.stop(t + 0.7); lf.stop(t + 0.7); this.noise('bandpass', 2200, 600, 0.5, 0.1 * v, 0, 2); break; }
      case 'metal': [820, 1230, 1840, 2650].forEach((f, i) => this.tone('sine', f * r, f * r * 0.96, 0.4 - i * 0.06, 0.13 * v / (1 + i * 0.3))); this.noise('highpass', 4500, 3000, 0.04, 0.3 * v); this.groan(0.8 * v, 0.6 * r); this.punch(0.5 * v, 0.8); break;
      case 'roar': { const c = this.ctx, t = c.currentTime, d = 0.5, o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), ws = c.createWaveShaper(), cv = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cv[i] = Math.tanh(x * 3); } ws.curve = cv; o.type = 'sawtooth'; o2.type = 'square'; o.frequency.setValueAtTime(110 * r, t); o.frequency.exponentialRampToValueAtTime(48 * r, t + d); o2.frequency.setValueAtTime(55 * r, t); o2.frequency.exponentialRampToValueAtTime(30 * r, t + d); f.type = 'lowpass'; f.Q.value = 3; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(220, t + d); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2 * v, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(ws); o2.connect(ws); ws.connect(f); f.connect(g); g.connect(this.sfxBus); o.start(t); o2.start(t); o.stop(t + d + 0.03); o2.stop(t + d + 0.03); this.noise('lowpass', 800, 120, 0.4, 0.35 * v); this.slop(0.5 * v, 0.2, 0.7); break; }
      case 'yelp': this.tone('square', 900 * r, 1700 * r, 0.07, 0.09 * v); this.tone('square', 1700 * r, 500 * r, 0.16, 0.09 * v, 0.07); this.slop(0.5 * v, 0.1, 1.0); break;
      case 'dust': this.noise('bandpass', 2600, 700, 0.5, 0.2 * v, 0, 1.5); this.noise('highpass', 4500, 2500, 0.35, 0.14 * v, 0.02); this.groan(0.5 * v, 0.55 * r); this.crunch(3, 0.5 * v, 0.1, 900, 2400); break;
    }
  }

  play(name, vol = 1) {
    if (!this.ctx || !this.sfxOn) return;
    const v = vol;
    switch (name) {
      case 'bolt': if (!this.gate('bolt', 0.05)) return; this.tone('triangle', 900, 260, 0.09, 0.13 * v); this.noise('highpass', 3500, 3000, 0.05, 0.07 * v); break;
      case 'mortar': if (!this.gate('mortar', 0.1)) return; this.noise('lowpass', 700, 90, 0.28, 0.4 * v); this.tone('sine', 130, 45, 0.25, 0.5 * v); break;
      case 'tesla': if (!this.gate('tesla', 0.06)) return; this.noise('bandpass', 2600, 1200, 0.2, 0.18 * v, 0, 2); this.tone('sawtooth', 1900, 200, 0.16, 0.06 * v); break;
      case 'frost': if (!this.gate('frost', 0.06)) return; this.tone('sine', 2000, 1000, 0.12, 0.08 * v); this.tone('sine', 3000, 2200, 0.08, 0.04 * v, 0.02); break;
      case 'toxic': if (!this.gate('toxic', 0.08)) return; this.tone('sine', 260, 640, 0.14, 0.16 * v); this.noise('lowpass', 900, 400, 0.1, 0.1 * v); break;
      case 'saw': if (!this.gate('saw', 0.1)) return; this.tone('sawtooth', 300, 800, 0.18, 0.07 * v); this.noise('bandpass', 4000, 2500, 0.15, 0.08 * v, 0, 3); break;
      case 'sawhit': if (!this.gate('sawhit', 0.05)) return; this.tone('sawtooth', 700, 350, 0.06, 0.07 * v); break;
      case 'flame': if (!this.gate('flame', 0.13)) return; this.noise('bandpass', 700, 1800, 0.18, 0.2 * v, 0, 0.8); this.noise('lowpass', 500, 200, 0.12, 0.15 * v); break;
      case 'void': if (!this.gate('void', 0.2)) return; this.tone('sine', 420, 55, 0.45, 0.3 * v); this.noise('bandpass', 1800, 150, 0.4, 0.16 * v, 0, 1.4); this.tone('triangle', 90, 40, 0.5, 0.25 * v, 0.1); break;
      case 'harpoon': if (!this.gate('harpoon', 0.2)) return; this.tone('triangle', 260, 50, 0.22, 0.4 * v); this.noise('highpass', 2000, 800, 0.1, 0.3 * v); this.noise('lowpass', 800, 100, 0.25, 0.4 * v, 0.05); break;
      case 'flesh': { if (!this.gate('flesh', 0.05)) return; const r = 0.85 + Math.random() * 0.3; this.punch(0.45 * v, r); this.wet(0.4 * v, 0.01, 0.12, r); break; }
      case 'slap': { if (!this.gate('slap', 0.06)) return; const r = 0.85 + Math.random() * 0.3; this.tone('sine', 110 * r, 42, 0.1, 0.35 * v); this.slop(0.4 * v, 0.005, r * 1.2); break; }
      case 'thudwet': { const r = 0.85 + Math.random() * 0.3; this.punch(0.8 * v, r * 0.8); this.slop(0.9 * v, 0.03, r); break; }
      case 'squelch': { if (!this.gate('squelch', 0.07)) return; const r = 0.85 + Math.random() * 0.3; this.slop(1 * v, 0, r); this.slop(0.6 * v, 0.1, r * 1.25); this.punch(0.4 * v, r); break; }
      case 'rip': { const r = 0.9 + Math.random() * 0.25; this.noise('bandpass', 500 * r, 3200 * r, 0.32, 0.4 * v, 0, 1.2); this.crunch(7, 0.9 * v, 0.02, 1200, 3800); this.wet(0.8 * v, 0.12, 0.3, r); this.tone('sawtooth', 180, 60, 0.3, 0.1 * v); break; }
      case 'chop': { if (!this.gate('chop', 0.06)) return; const r = 0.9 + Math.random() * 0.2; this.noise('highpass', 6500, 3500, 0.07, 0.35 * v); this.tone('triangle', 2600 * r, 1200, 0.1, 0.12 * v); this.punch(0.9 * v, r); this.crunch(3, 0.7 * v, 0.02); this.wet(0.7 * v, 0.05, 0.2, r); break; }
      case 'bone': { if (!this.gate('bone', 0.06)) return; const r = 0.85 + Math.random() * 0.3; this.crunch(5, 1 * v, 0, 1800, 5200); this.tone('triangle', 2400 * r, 520, 0.03, 0.2 * v); this.tone('sine', 150 * r, 55, 0.12, 0.35 * v, 0.03); break; }
      case 'spray': { if (!this.gate('spray', 0.15)) return; this.spurt(0.9 * v, 0.02, 3); this.wet(0.4 * v, 0.1, 0.35, 1.4); break; }
      case 'burst': { if (!this.gate('burst', 0.08)) return; this.punch(1.3 * v, 0.9); this.tone('sine', 90, 28, 0.5, 0.7 * v, 0.02); this.crunch(8, 1 * v, 0.02); this.wet(1 * v, 0.05, 0.45, 0.9); this.wet(0.7 * v, 0.2, 0.3, 1.4); this.spurt(0.8 * v, 0.1, 3); break; }
      case 'sizzle': { if (!this.gate('sizzle', 0.15)) return; this.noise('highpass', 5000, 3000, 0.5, 0.15 * v); for (let i = 0; i < 5; i++) this.tone('square', 3000 + Math.random() * 3000, 1200, 0.015, 0.05 * v, i * 0.06 + Math.random() * 0.03); break; }
      case 'glass': { if (!this.gate('glass', 0.06)) return; const r = 0.9 + Math.random() * 0.2; [3200, 4100, 5200, 3800].forEach((f, i) => this.tone('sine', f * r, f * r * 0.8, 0.12, 0.08 * v, i * 0.03)); this.noise('highpass', 6000, 4000, 0.1, 0.2 * v); break; }
      case 'bubble': { for (let i = 0; i < 5; i++) { const f = 220 + Math.random() * 300; this.tone('sine', f, f * 2, 0.07, 0.12 * v, i * 0.07 + Math.random() * 0.03); } this.noise('lowpass', 700, 250, 0.3, 0.12 * v); break; }
      case 'crackle': { if (!this.gate('crackle', 0.12)) return; for (let i = 0; i < 4; i++) this.noise('highpass', 3000 + Math.random() * 2000, 1500, 0.04, 0.22 * v, i * 0.05 + Math.random() * 0.03); this.noise('lowpass', 600, 200, 0.25, 0.14 * v); break; }
      case 'voidpop': { this.tone('sine', 320, 40, 0.3, 0.4 * v); this.noise('bandpass', 1800, 150, 0.3, 0.2 * v, 0, 1.4); this.chip([1568, 784, 392, 196], 0.04, 'square', 0.06 * v); break; }
      case 'boom': if (!this.gate('boom', 0.06)) return; this.noise('lowpass', 900, 70, 0.45, 0.55 * v); this.tone('sine', 110, 35, 0.4, 0.6 * v); break;
      case 'boomsmall': if (!this.gate('boomsmall', 0.05)) return; this.noise('lowpass', 1200, 150, 0.2, 0.3 * v); this.tone('sine', 150, 60, 0.15, 0.3 * v); break;
      case 'meteor': this.noise('lowpass', 500, 40, 1.0, 0.9 * v); this.tone('sine', 90, 25, 0.9, 0.9 * v); this.noise('bandpass', 1500, 300, 0.6, 0.4 * v, 0, 1); break;
      case 'whoosh': this.noise('bandpass', 300, 2400, 0.8, 0.3 * v, 0, 1.2); break;
      case 'splat': if (!this.gate('splat', 0.035)) return; this.slop(0.55 * v, 0, 1 + Math.random() * 0.3); break;
      case 'gib': if (!this.gate('gib', 0.07)) return; this.punch(0.45 * v, 1.1); this.slop(0.7 * v, 0.02, 1.1); break;
      case 'gibbig': if (!this.gate('gibbig', 0.1)) return; this.punch(0.9 * v, 0.8); this.crunch(4, 0.8 * v, 0.03); this.slop(1 * v, 0.04, 0.8); this.slop(0.6 * v, 0.16, 1.1); break;
      case 'crack': if (!this.gate('crack', 0.06)) return; this.noise('highpass', 2500, 1500, 0.07, 0.35 * v); this.tone('triangle', 1500, 400, 0.06, 0.2 * v); break;
      case 'coin': if (!this.gate('coin', 0.045)) return; this.tone('square', 988, 988, 0.06, 0.09 * v); this.tone('square', 1319, 1319, 0.34, 0.09 * v, 0.06); this.tone('sine', 2637, 2637, 0.25, 0.04 * v, 0.06); break;
      case 'bag': this.chip([1319, 1568, 1976, 2637], 0.05, 'square', 0.09 * v, 1.4); this.tone('sine', 3951, 3951, 0.3, 0.05 * v, 0.2); break;
      case 'build': this.noise('lowpass', 700, 150, 0.08, 0.5 * v); this.tone('sine', 150, 70, 0.1, 0.5 * v); this.chip([659, 988], 0.05, 'square', 0.07 * v); this.noise('lowpass', 700, 150, 0.08, 0.4 * v, 0.1); break;
      case 'upgrade': this.chip([523, 659, 784, 1046, 784, 1046, 1318, 1568], 0.055, 'square', 0.09 * v, 1.2); this.chip([262, 330, 392, 523], 0.11, 'triangle', 0.1 * v); this.tone('sine', 3136, 3136, 0.3, 0.04 * v, 0.4); break;
      case 'sell': this.chip([1319, 988, 1319, 1976], 0.05, 'square', 0.08 * v); break;
      case 'horn': {                                                   // зловещий рог волны: два глухих удара сердца, низкий медный рёв с тритоном, гонг и призрачный вой
        const c = this.ctx, t = c.currentTime;
        this.tone('sine', 70, 32, 0.22, 0.55 * v); this.tone('sine', 62, 30, 0.26, 0.5 * v, 0.24);
        [[55, 0.5], [58.3, 0.5], [77.8, 0.56], [110, 0.62]].forEach(([f, dl]) => {
          const o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain(), t0 = t + dl;
          o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 1.04, t0); o.frequency.exponentialRampToValueAtTime(f, t0 + 0.5);
          fl.type = 'lowpass'; fl.Q.value = 5; fl.frequency.setValueAtTime(140, t0); fl.frequency.exponentialRampToValueAtTime(1000, t0 + 0.75); fl.frequency.exponentialRampToValueAtTime(160, t0 + 2.1);
          g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.17 * v, t0 + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
          o.connect(fl); fl.connect(g); g.connect(this.sfxBus); o.start(t0); o.stop(t0 + 2.3);
        });
        this.tone('sine', 58, 28, 1.5, 0.65 * v, 0.5); this.noise('lowpass', 520, 45, 1.4, 0.5 * v, 0.5);              // гонг
        const w = c.createOscillator(), wl = c.createOscillator(), wg = c.createGain(), wf = c.createGain(), tw = t + 1.0;                 // вой: падающий тон с дрожью
        w.type = 'triangle'; w.frequency.setValueAtTime(420, tw); w.frequency.exponentialRampToValueAtTime(190, tw + 1.6); wl.frequency.value = 5.5; wf.gain.value = 9; wl.connect(wf); wf.connect(w.frequency);
        wg.gain.setValueAtTime(0.0001, tw); wg.gain.exponentialRampToValueAtTime(0.06 * v, tw + 0.5); wg.gain.exponentialRampToValueAtTime(0.0001, tw + 1.7);
        w.connect(wg); wg.connect(this.sfxBus); w.start(tw); wl.start(tw); w.stop(tw + 1.8); wl.stop(tw + 1.8);
        this.noise('bandpass', 700, 2200, 1.2, 0.12 * v, 0.9, 3);
        break;
      }
      case 'bosshorn': this.tone('sawtooth', 65, 55, 1.8, 0.22 * v); this.tone('sawtooth', 98, 82, 1.8, 0.14 * v); this.noise('lowpass', 300, 80, 1.6, 0.35 * v); this.tone('square', 32, 28, 1.8, 0.2 * v); break;
      case 'leak': this.chip([440, 330, 220, 165], 0.07, 'square', 0.11 * v, 1.2); this.tone('sawtooth', 120, 40, 0.5, 0.25 * v); this.noise('lowpass', 800, 100, 0.4, 0.4 * v); break;
      case 'error': this.tone('square', 233, 110, 0.16, 0.11); this.tone('square', 175, 90, 0.14, 0.09, 0.08); break;
      case 'back': this.chip([1175, 784], 0.05, 'square', 0.08); break;
      case 'start': this.chip([523, 659, 784, 1046, 1318, 1568], 0.06, 'square', 0.09, 1.3); this.tone('triangle', 130, 130, 0.5, 0.12); break;
      case 'death': { if (!this.gate('death', 0.07)) return; const r = 0.85 + Math.random() * 0.4; this.groan(0.8 * v, r); this.slop(0.55 * v, 0.03, r); break; }
      case 'pop': if (!this.gate('pop', 0.05)) return; this.tone('square', 480, 1100, 0.05, 0.07 * v); this.tone('square', 1100, 700, 0.06, 0.06 * v, 0.045); break;
      case 'click': this.chip([1568, 2093], 0.04, 'square', 0.07); break;
      case 'select': this.chip([784, 1175, 1568], 0.045, 'square', 0.08); break;
      case 'freeze': this.tone('sine', 2400, 1200, 0.18, 0.1 * v); this.noise('highpass', 5000, 4000, 0.1, 0.1 * v); break;
      case 'stomp': this.noise('lowpass', 500, 50, 0.5, 0.7 * v); this.tone('sine', 70, 30, 0.5, 0.7 * v); break;
      case 'summon': this.tone('sawtooth', 200, 600, 0.4, 0.1 * v); this.noise('bandpass', 800, 3000, 0.4, 0.15 * v, 0, 2); break;
      case 'stasis': this.tone('sine', 1800, 300, 0.7, 0.18 * v); this.tone('sine', 2400, 400, 0.7, 0.1 * v); this.noise('highpass', 4000, 1000, 0.6, 0.12 * v); break;
      case 'rush': [660, 880, 1100, 1320, 1760].forEach((f, i) => this.tone('square', f, f, 0.1, 0.07 * v, i * 0.06)); break;
      case 'frenzy': this.tone('sawtooth', 180, 360, 0.4, 0.14 * v); break;
      case 'win': this.chip([523, 523, 523, 659, 784, 1046, 784, 1046, 1318], 0.09, 'square', 0.1 * v, 1.1); this.chip([262, 262, 262, 330, 392, 523], 0.15, 'triangle', 0.12 * v); break;
      case 'waveclear': this.chip([784, 988, 1175, 1568], 0.06, 'square', 0.08 * v, 1.3); this.tone('triangle', 196, 196, 0.35, 0.1 * v); break;
      case 'sparkle': this.chip([2093, 2637, 3136, 4186], 0.04, 'triangle', 0.07 * v, 1.6); break;
      case 'lose': this.chip([523, 494, 466, 440, 392, 330, 262], 0.16, 'square', 0.1 * v, 1.2); this.tone('sawtooth', 65, 40, 1.4, 0.15 * v, 0.3); break;
      case 'heal': if (!this.gate('heal', 0.2)) return; this.tone('sine', 700, 1100, 0.2, 0.06 * v); break;
    }
  }

  // ───── музыка: у каждого уровня свой эмбиент (см. music.js) ─────
  startMusic(spec) {
    if (spec) this.spec = spec;
    this.wantMusic = true;
    if (!this.ctx || !this.musOn) return;
    if (this.track && this.trackKey === JSON.stringify(this.spec)) return;
    if (this.track) this.track.stop();
    this.track = createTrack(this, this.spec); this.trackKey = JSON.stringify(this.spec); this.track.setTension(this.tension);
  }
  stopMusic() {
    this.wantMusic = false;
    if (this.track) { this.track.stop(); this.track = null; this.trackKey = null; }
  }
  stinger() { if (this.track && this.track.stinger) this.track.stinger(); }
  setTension(v) { this.tension = Math.max(0, Math.min(1, v)); if (this.track) this.track.setTension(this.tension); }
}

// Привязка звуков к событиям симуляции. Звуков в бою нарочно мало: выстрелы, взрывы снарядов, смерть монстров (и кишки), сбор золота, улучшение.
export function attachSfx(sim, sfx) {
  sim.on('shot', (d) => sfx.play({ bolt: 'bolt', mortar: 'mortar', tesla: 'tesla', frost: 'frost', toxic: 'toxic', saw: 'saw', flame: 'flame', void: 'void', harpoon: 'harpoon', magnet: 'void', grinder: 'crack', giant: 'mortar' }[d.kind]));
  sim.on('explosion', (d) => { if (d.kind === 'meteor') sfx.play('meteor'); else if (d.kind === 'pop' || d.kind === 'shatter') sfx.play('crack', 0.6); else if (d.kind === 'vial') sfx.play('splat', 0.8); else sfx.play(d.kind === 'bomblet' ? 'boomsmall' : 'boom', d.big ? 1.2 : 1); });
  sim.on('kill', (d) => sfx.death(d.e && d.e.type, 0.8));
  sim.on('upgrade', () => sfx.play('upgrade'));
  sim.on('bag', (d) => sfx.play(d.tapped ? 'bag' : 'coin', 0.8));
}
// из звуков, которые шлёт «мясо» (gore.js), оставляем только сопровождающие гибель: удары и всплески при ударах по живым и стук кусков не нужны
export const GORE_SOUNDS = new Set(['burst', 'squelch', 'chop', 'rip', 'spray', 'bone', 'thudwet', 'gib', 'gibbig', 'splat', 'voidpop', 'sizzle', 'glass', 'bubble', 'crackle', 'slap']);
