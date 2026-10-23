// Звук: полностью синтезированный на WebAudio (никаких файлов). Эффекты + тёмный эмбиент (js/music.js: свой для каждого уровня).
import { createTrack, MENU_SPEC } from './music.js?v=20261023180731';
export class Sfx {
  constructor() {
    this.ctx = null; this.sfxOn = true; this.musOn = true;
    this.last = {}; this.track = null; this.spec = MENU_SPEC; this.tension = 0;
  }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = this.volS ?? 1; this.sfxBus.connect(this.master);
    this.musBus = this.ctx.createGain(); this.musBus.gain.value = 0.85 * (this.volM ?? 0.8); this.musBus.connect(this.master);
    // шумовой буфер
    const len = this.ctx.sampleRate * 1.5, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    // эхо для музыки
    this.delay = this.ctx.createDelay(1.2); this.delay.delayTime.value = 0.42; const fb = this.ctx.createGain(); fb.gain.value = 0.38; const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    this.delay.connect(lp); lp.connect(fb); fb.connect(this.delay); lp.connect(this.musBus);
    // реверберация для музыки: затухающий шум 2.8 с
    const rl = Math.floor(this.ctx.sampleRate * 2.8), ir = this.ctx.createBuffer(2, rl, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d2 = ir.getChannelData(ch); for (let i = 0; i < rl; i++) d2[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 2.6); }
    const cv = this.ctx.createConvolver(); cv.buffer = ir; const rg = this.ctx.createGain(); rg.gain.value = 0.6; cv.connect(rg); rg.connect(this.musBus); this.rev = cv;
    if (this.musOn && this.wantMusic) this.startMusic();
  }
  setSfx(on) { this.sfxOn = on; }
  setVolumes(sfx, mus) { this.volS = sfx; this.volM = mus; if (this.ctx) { this.sfxBus.gain.value = sfx; this.musBus.gain.value = 0.85 * mus; } }
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
      case 'flesh': { if (!this.gate('flesh', 0.05)) return; const r = 0.8 + Math.random() * 0.4; this.noise('lowpass', 900 * r, 150, 0.1, 0.3 * v); this.tone('sine', 150 * r, 55, 0.09, 0.3 * v); break; }
      case 'slap': { if (!this.gate('slap', 0.045)) return; const r = 0.8 + Math.random() * 0.4; this.noise('lowpass', 700 * r, 120, 0.08, 0.34 * v); this.tone('sine', 110 * r, 45, 0.1, 0.38 * v); this.noise('bandpass', 1800 * r, 900, 0.04, 0.12 * v, 0.01, 2); break; }
      case 'thudwet': { const r = 0.85 + Math.random() * 0.3; this.noise('lowpass', 500 * r, 90, 0.18, 0.4 * v); this.tone('sine', 90 * r, 38, 0.2, 0.5 * v); this.noise('bandpass', 900, 300, 0.1, 0.2 * v, 0.05, 3); break; }
      case 'squelch': { if (!this.gate('squelch', 0.07)) return; const r = 0.8 + Math.random() * 0.4; this.noise('bandpass', 400 * r, 1400 * r, 0.18, 0.32 * v, 0, 5); this.noise('bandpass', 700 * r, 300, 0.12, 0.22 * v, 0.08, 4); this.tone('sine', 160 * r, 60, 0.12, 0.3 * v); break; }
      case 'rip': { const r = 0.85 + Math.random() * 0.3; this.noise('bandpass', 400 * r, 2500 * r, 0.3, 0.36 * v, 0, 1.5); this.noise('highpass', 3000, 1500, 0.1, 0.15 * v, 0.05); this.noise('lowpass', 600, 150, 0.2, 0.3 * v, 0.1); break; }
      case 'chop': { if (!this.gate('chop', 0.06)) return; const r = 0.85 + Math.random() * 0.3; this.noise('highpass', 2200, 1200, 0.05, 0.4 * v); this.tone('triangle', 900 * r, 250, 0.07, 0.2 * v); this.tone('sine', 120 * r, 50, 0.14, 0.5 * v, 0.02); this.noise('lowpass', 800, 200, 0.12, 0.32 * v, 0.03); break; }
      case 'bone': { if (!this.gate('bone', 0.06)) return; const r = 0.8 + Math.random() * 0.4; this.noise('highpass', 3500, 2500, 0.04, 0.4 * v); this.tone('square', 2200 * r, 800, 0.03, 0.1 * v); this.noise('highpass', 3000, 2000, 0.04, 0.3 * v, 0.05); this.tone('sine', 140 * r, 60, 0.1, 0.32 * v, 0.02); break; }
      case 'spray': { if (!this.gate('spray', 0.15)) return; this.noise('highpass', 2500, 1200, 0.45, 0.17 * v, 0.03, 0.7); this.noise('bandpass', 900, 400, 0.4, 0.15 * v, 0.03); break; }
      case 'burst': { if (!this.gate('burst', 0.08)) return; this.noise('lowpass', 1800, 100, 0.38, 0.6 * v); this.tone('sine', 130, 35, 0.32, 0.65 * v); [0, 0.05, 0.12, 0.2].forEach((d) => this.noise('bandpass', 500 + Math.random() * 900, 300, 0.14, 0.26 * v, d, 4)); this.noise('highpass', 2500, 1000, 0.08, 0.26 * v, 0.02); break; }
      case 'sizzle': { if (!this.gate('sizzle', 0.15)) return; this.noise('highpass', 5000, 3000, 0.5, 0.15 * v); for (let i = 0; i < 5; i++) this.tone('square', 3000 + Math.random() * 3000, 1200, 0.015, 0.05 * v, i * 0.06 + Math.random() * 0.03); break; }
      case 'glass': { if (!this.gate('glass', 0.06)) return; const r = 0.9 + Math.random() * 0.2; [3200, 4100, 5200, 3800].forEach((f, i) => this.tone('sine', f * r, f * r * 0.8, 0.12, 0.08 * v, i * 0.03)); this.noise('highpass', 6000, 4000, 0.1, 0.2 * v); break; }
      case 'bubble': { for (let i = 0; i < 5; i++) { const f = 220 + Math.random() * 300; this.tone('sine', f, f * 2, 0.07, 0.12 * v, i * 0.07 + Math.random() * 0.03); } this.noise('lowpass', 700, 250, 0.3, 0.12 * v); break; }
      case 'crackle': { if (!this.gate('crackle', 0.12)) return; for (let i = 0; i < 4; i++) this.noise('highpass', 3000 + Math.random() * 2000, 1500, 0.04, 0.22 * v, i * 0.05 + Math.random() * 0.03); this.noise('lowpass', 600, 200, 0.25, 0.14 * v); break; }
      case 'voidpop': { this.tone('sine', 320, 40, 0.3, 0.4 * v); this.noise('bandpass', 1800, 150, 0.3, 0.2 * v, 0, 1.4); break; }
      case 'boom': if (!this.gate('boom', 0.06)) return; this.noise('lowpass', 900, 70, 0.45, 0.55 * v); this.tone('sine', 110, 35, 0.4, 0.6 * v); break;
      case 'boomsmall': if (!this.gate('boomsmall', 0.05)) return; this.noise('lowpass', 1200, 150, 0.2, 0.3 * v); this.tone('sine', 150, 60, 0.15, 0.3 * v); break;
      case 'meteor': this.noise('lowpass', 500, 40, 1.0, 0.9 * v); this.tone('sine', 90, 25, 0.9, 0.9 * v); this.noise('bandpass', 1500, 300, 0.6, 0.4 * v, 0, 1); break;
      case 'whoosh': this.noise('bandpass', 300, 2400, 0.8, 0.3 * v, 0, 1.2); break;
      case 'splat': if (!this.gate('splat', 0.035)) return; this.noise('lowpass', 1400, 220, 0.11, 0.3 * v); this.tone('sine', 200, 65, 0.09, 0.28 * v); break;
      case 'gib': if (!this.gate('gib', 0.07)) return; this.noise('lowpass', 1600, 250, 0.16, 0.42 * v); this.tone('sine', 170, 50, 0.14, 0.4 * v); this.noise('highpass', 1200, 900, 0.05, 0.2 * v, 0.03); break;
      case 'gibbig': if (!this.gate('gibbig', 0.1)) return; this.noise('lowpass', 1800, 150, 0.3, 0.55 * v); this.tone('sine', 120, 38, 0.3, 0.6 * v); this.noise('highpass', 1500, 600, 0.08, 0.3 * v, 0.04); this.noise('lowpass', 800, 200, 0.14, 0.3 * v, 0.12); break;
      case 'crack': if (!this.gate('crack', 0.06)) return; this.noise('highpass', 2500, 1500, 0.07, 0.35 * v); this.tone('triangle', 1500, 400, 0.06, 0.2 * v); break;
      case 'coin': if (!this.gate('coin', 0.045)) return; this.tone('sine', 1318, 1318, 0.09, 0.12 * v); this.tone('sine', 1760, 1760, 0.16, 0.12 * v, 0.06); break;
      case 'bag': this.tone('sine', 1046, 1046, 0.08, 0.14 * v); this.tone('sine', 1318, 1318, 0.08, 0.14 * v, 0.06); this.tone('sine', 1568, 1568, 0.18, 0.14 * v, 0.12); break;
      case 'build': this.noise('lowpass', 600, 200, 0.07, 0.4 * v); this.tone('sine', 160, 80, 0.09, 0.4 * v); this.noise('lowpass', 600, 200, 0.07, 0.4 * v, 0.1); this.tone('sine', 190, 90, 0.09, 0.4 * v, 0.1); break;
      case 'upgrade': [523, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, 0.14, 0.16 * v, i * 0.07)); break;
      case 'sell': this.tone('sine', 880, 440, 0.15, 0.15 * v); this.tone('sine', 660, 330, 0.18, 0.12 * v, 0.07); break;
      case 'horn': this.tone('sawtooth', 98, 92, 1.0, 0.16 * v); this.tone('sawtooth', 147, 138, 1.0, 0.1 * v); this.tone('square', 49, 46, 1.0, 0.1 * v); break;
      case 'bosshorn': this.tone('sawtooth', 65, 55, 1.8, 0.22 * v); this.tone('sawtooth', 98, 82, 1.8, 0.14 * v); this.noise('lowpass', 300, 80, 1.6, 0.35 * v); this.tone('square', 32, 28, 1.8, 0.2 * v); break;
      case 'leak': this.tone('sawtooth', 240, 55, 0.55, 0.28 * v); this.noise('lowpass', 800, 100, 0.4, 0.4 * v); break;
      case 'error': this.tone('square', 160, 120, 0.12, 0.12 * v); break;
      case 'click': this.tone('sine', 820, 700, 0.04, 0.08 * v); break;
      case 'select': this.tone('triangle', 600, 760, 0.06, 0.1 * v); break;
      case 'freeze': this.tone('sine', 2400, 1200, 0.18, 0.1 * v); this.noise('highpass', 5000, 4000, 0.1, 0.1 * v); break;
      case 'stomp': this.noise('lowpass', 500, 50, 0.5, 0.7 * v); this.tone('sine', 70, 30, 0.5, 0.7 * v); break;
      case 'summon': this.tone('sawtooth', 200, 600, 0.4, 0.1 * v); this.noise('bandpass', 800, 3000, 0.4, 0.15 * v, 0, 2); break;
      case 'stasis': this.tone('sine', 1800, 300, 0.7, 0.18 * v); this.tone('sine', 2400, 400, 0.7, 0.1 * v); this.noise('highpass', 4000, 1000, 0.6, 0.12 * v); break;
      case 'rush': [660, 880, 1100, 1320, 1760].forEach((f, i) => this.tone('square', f, f, 0.1, 0.07 * v, i * 0.06)); break;
      case 'frenzy': this.tone('sawtooth', 180, 360, 0.4, 0.14 * v); break;
      case 'win': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, 0.4, 0.2 * v, i * 0.14)); break;
      case 'lose': [330, 262, 208, 165].forEach((f, i) => this.tone('sawtooth', f, f * 0.96, 0.7, 0.15 * v, i * 0.3)); break;
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
  setTension(v) { this.tension = Math.max(0, Math.min(1, v)); if (this.track) this.track.setTension(this.tension); }
}

// Привязка звуков к событиям симуляции
export function attachSfx(sim, sfx) {
  sim.on('shot', (d) => sfx.play({ bolt: 'bolt', mortar: 'mortar', tesla: 'tesla', frost: 'frost', toxic: 'toxic', saw: 'saw', flame: 'flame', void: 'void', harpoon: 'harpoon' }[d.kind]));
  sim.on('explosion', (d) => { if (d.kind === 'meteor') sfx.play('meteor'); else if (d.kind === 'pop') sfx.play('crack', 0.6); else if (d.kind === 'shatter') sfx.play('crack'); else if (d.kind === 'vial') sfx.play('splat', 0.8); else sfx.play(d.kind === 'bomblet' ? 'boomsmall' : 'boom', d.big ? 1.2 : 1); });
  sim.on('hit', (d) => { if (d.how === 'saw' || d.how === 'chop' || d.how === 'slash') sfx.play('sawhit', 0.7); });
  sim.on('kill', (d) => {
    if (d.gold > 0) sfx.play('coin', 0.7);
  });
  sim.on('build', () => sfx.play('build')); sim.on('upgrade', () => sfx.play('upgrade')); sim.on('sell', () => sfx.play('sell'));
  sim.on('chest', (d) => { if (d.kind === 'hit') sfx.play('select', 0.9); else { sfx.play('win', 0.6); sfx.play('bag'); setTimeout(() => sfx.play('coin'), 120); } });
  sim.on('bag', (d) => sfx.play(d.tapped ? 'bag' : 'coin', 0.8));
  sim.on('wave', (d) => sfx.play('horn'));
  sim.on('leak', () => sfx.play('leak'));
  sim.on('freeze', () => sfx.play('freeze', 0.5));
  sim.on('stomp', () => sfx.play('stomp'));
  sim.on('summon', () => sfx.play('summon'));
  sim.on('heal', () => sfx.play('heal'));
  sim.on('frenzy', () => sfx.play('frenzy'));
  sim.on('econ', () => sfx.play('coin'));
  sim.on('spell', (d) => { if (d.id === 'stasis') sfx.play('stasis'); else if (d.id === 'rush') sfx.play('rush'); else sfx.play('whoosh'); });
  sim.on('over', (d) => sfx.play(d.won ? 'win' : 'lose'));
}
