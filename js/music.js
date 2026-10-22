// Тёмный эмбиент для каждого сектора и каждого уровня — всё синтезируется на WebAudio (файлов нет).
// Сектор задаёт «звуковой мир» (ветер и колокола погоста, сверчки и уханье леса, пустынный ветер и щипок струны,
// ледяной звон и вьюга, гул и треск магмы, пульс и скрежет скотобойни), а конкретный уровень — тональность, лад,
// плотность событий и «зерно» случайных мелодий, так что все 19 уровней звучат по-разному, но в духе своей локации.

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export const MODES = {
  aeolian: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], locrian: [0, 1, 3, 5, 6, 8, 10],
  dominant: [0, 1, 4, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11], lydian: [0, 2, 4, 6, 7, 9, 11], whole: [0, 2, 4, 6, 8, 10, 12],
};

// уровень → [сектор-тема, тоника (MIDI), лад, плотность 0.6–1.4, зерно]
const LEVEL_SPEC = {
  g1: ['grave', 33, 'aeolian', 0.9, 11], g2a: ['grave', 30, 'dorian', 0.8, 12], g2b: ['grave', 35, 'phrygian', 1.0, 13], g3: ['grave', 31, 'harmonic', 1.15, 14],
  f1: ['forest', 34, 'dorian', 0.9, 21], f2a: ['forest', 29, 'aeolian', 1.1, 22], f2b: ['forest', 36, 'phrygian', 1.0, 23], f3: ['forest', 32, 'locrian', 1.25, 24],
  d1: ['desert', 38, 'dominant', 0.9, 31], d2a: ['desert', 35, 'phrygian', 1.0, 32], d2b: ['desert', 40, 'harmonic', 0.8, 33], d3: ['desert', 36, 'dominant', 1.2, 34],
  i1: ['ice', 40, 'lydian', 0.8, 41], i2a: ['ice', 37, 'whole', 1.0, 42], i2b: ['ice', 42, 'aeolian', 1.2, 43], i3: ['ice', 35, 'lydian', 1.3, 44],
  h1: ['lava', 28, 'phrygian', 1.0, 51], h2: ['lava', 26, 'locrian', 1.2, 52], h3: ['slaughter', 29, 'phrygian', 1.3, 53],
};
export const MENU_SPEC = { theme: 'menu', root: 33, mode: 'aeolian', density: 0.8, seed: 7 };
export function levelSpec(level, ranked = false) {
  const t = LEVEL_SPEC[level && level.id] || LEVEL_SPEC.g1;
  return { theme: t[0], root: t[1], mode: t[2], density: t[3] * (ranked ? 1.15 : 1), seed: t[4] };
}

export function createTrack(sfx, spec) {
  const c = sfx.ctx, now0 = c.currentTime, R = rng(spec.seed * 977 + 5);
  const out = c.createGain(); out.gain.value = 0.0001; out.gain.linearRampToValueAtTime(1, now0 + 3); out.connect(sfx.musBus);
  if (sfx.rev) { const send = c.createGain(); send.gain.value = 0.5; out.connect(send); send.connect(sfx.rev); }
  const nodes = [], mode = MODES[spec.mode] || MODES.aeolian, D = spec.density || 1;
  let tension = 0;
  const pick = (a) => a[(R() * a.length) | 0];
  const degree = (d, oct = 0) => spec.root + 12 * oct + mode[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);

  // ── строительные блоки ──
  const env = (g, t, a, peak, dur) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); };
  const osc = (type, freq, gain, o = {}) => {
    const s = c.createOscillator(), g = c.createGain(); s.type = type; s.frequency.value = freq; if (o.detune) s.detune.value = o.detune;
    let last = s;
    if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; s.connect(f); last = f;
      if (o.lfo) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.lfo; lg.gain.value = o.lfoDepth || o.lp * 0.4; l.connect(lg); lg.connect(f.frequency); l.start(); nodes.push(l); } }
    g.gain.value = 0.0001; g.gain.linearRampToValueAtTime(gain, now0 + (o.fade || 4)); last.connect(g); g.connect(out); s.start(); nodes.push(s); return { s, g };
  };
  const noiseLoop = (type, freq, q, gain, o = {}) => {
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = sfx.noiseBuf; s.loop = true; s.loopStart = R(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.value = 0.0001; g.gain.linearRampToValueAtTime(gain, now0 + (o.fade || 5)); s.connect(f); f.connect(g); g.connect(out); s.start(0, R() * 1.2); nodes.push(s);
    if (o.lfo) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.lfo; lg.gain.value = o.lfoDepth || freq * 0.5; l.connect(lg); lg.connect(f.frequency); l.start(); nodes.push(l); }
    if (o.gainLfo) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.gainLfo; lg.gain.value = gain * 0.7; l.connect(lg); lg.connect(g.gain); l.start(); nodes.push(l); }
    return { s, f, g };
  };
  const tone = (type, f0, f1, t, dur, gain, a = 0.01, to = out) => {
    const s = c.createOscillator(), g = c.createGain(); s.type = type; s.frequency.setValueAtTime(f0, t); if (f1 !== f0) s.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    env(g, t, a, gain, dur); s.connect(g); g.connect(to); s.start(t); s.stop(t + dur + 0.05);
  };
  const burst = (type, f0, f1, t, dur, gain, q = 1) => {
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = sfx.noiseBuf; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, 0.004, gain, dur); s.connect(f); f.connect(g); g.connect(out); s.start(t, R()); s.stop(t + dur + 0.05);
  };
  const bell = (midi, t, gain, dur = 3.2, hard = 1) => {                // колокол: чуть негармоничные обертоны
    const f = mtof(midi);
    [[1, 1], [2.01, 0.45 * hard], [2.76, 0.25 * hard], [4.07, 0.12 * hard]].forEach(([k, a]) => tone('sine', f * k, f * k * 0.998, t, dur / (0.6 + k * 0.4), gain * a, 0.006));
  };
  const thump = (t, f0, f1, gain, dur = 0.32) => tone('sine', f0, f1, t, dur, gain, 0.008);
  const pluck = (midi, t, gain) => {                                      // щипок струны
    const f = mtof(midi), s = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain(); s.type = 'sawtooth'; s.frequency.value = f;
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(f * 7, t); fl.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.9); env(g, t, 0.004, gain, 1.6); s.connect(fl); fl.connect(g); g.connect(out); s.start(t); s.stop(t + 1.7);
  };

  // ── миры секторов: возвращают tick(now, tension) ──
  const worlds = {
    menu() {
      [0, 7, 12].forEach((n, i) => osc(i === 2 ? 'triangle' : 'sawtooth', mtof(spec.root + n), i === 2 ? 0.03 : 0.045, { lp: 240 + i * 60, lfo: 0.07 + i * 0.03, detune: i * 4 - 4 }));
      let nb = now0 + 1, beat = 0, nh = now0 + 1;
      return (now, T) => {
        while (nb < now + 0.8) { bell(degree(Math.floor(R() * 7), 2 + (R() < 0.25 ? -1 : 0)), nb, 0.05); nb += (1.2 + R() * 2.6) / D; }
        while (nh < now + 0.8) { if (beat % 4 === 0) thump(nh, 90, 34, 0.2); else if (beat % 4 === 2) thump(nh, 75, 34, 0.1); beat++; nh += 1.0; }
      };
    },
    grave() {                                                  // погост: холодный ветер, далёкий колокол, органный дрон
      osc('sawtooth', mtof(spec.root), 0.05, { lp: 220, lfo: 0.05, detune: -5 }); osc('sawtooth', mtof(spec.root + 7), 0.035, { lp: 260, lfo: 0.08, detune: 4 }); osc('sine', mtof(spec.root - 12), 0.07);
      noiseLoop('bandpass', 420, 0.8, 0.05, { lfo: 0.06, lfoDepth: 220, gainLfo: 0.11 });
      let nb = now0 + 3, nw = now0 + 6, nt = now0 + 2, beat = 0;
      return (now, T) => {
        while (nb < now + 0.8) { bell(degree(pick([0, 2, 4, 5]), 2), nb, 0.07, 4.5); if (R() < 0.35) bell(degree(pick([0, 3, 4]), 3), nb + 0.9, 0.04, 3.5); nb += (4 + R() * 6) / D / (1 + T * 0.6); }
        while (nw < now + 0.8) { burst('bandpass', 700 + R() * 500, 300, nw, 2.5, 0.05, 1.2); nw += 7 + R() * 9; }
        while (nt < now + 0.8) { if (beat % 4 === 0) thump(nt, 70, 32, 0.12); beat++; nt += 1.6 / (1 + T * 0.5); }
      };
    },
    forest() {                                                 // тёмный лес: сверчки, уханье, шорох листвы
      osc('triangle', mtof(spec.root), 0.05, { lp: 260, lfo: 0.06 }); osc('sine', mtof(spec.root + 3 + (mode[2] === 3 ? 0 : 1)), 0.03, { detune: 6 }); osc('sine', mtof(spec.root - 12), 0.06);
      noiseLoop('bandpass', 1900, 0.5, 0.012, { lfo: 0.13, lfoDepth: 600, gainLfo: 0.2 }); noiseLoop('lowpass', 500, 0.7, 0.03, { gainLfo: 0.07 });
      let nc = now0 + 1, nh = now0 + 5, nk = now0 + 3, nm = now0 + 4;
      return (now, T) => {
        while (nc < now + 0.8) { const f = 3900 + R() * 600, n = 3 + ((R() * 5) | 0); for (let i = 0; i < n; i++) tone('sine', f, f, nc + i * 0.075, 0.05, 0.016, 0.004); nc += (0.4 + R() * 1.6) / D; }
        while (nh < now + 0.8) { const f = mtof(spec.root + 24 + pick([0, 3, 5])); tone('sine', f * 1.1, f, nh, 0.5, 0.05, 0.08); tone('sine', f * 1.1, f * 0.9, nh + 0.7, 0.9, 0.05, 0.1); nh += (9 + R() * 12) / D; }
        while (nk < now + 0.8) { thump(nk, 220, 120, 0.06, 0.12); nk += (5 + R() * 8) / D; }
        while (nm < now + 0.8) { bell(degree(pick([1, 3, 5]), 1), nm, 0.035, 3); nm += (6 + R() * 8) / D; }
      };
    },
    desert() {                                                 // пустыня: суховей, струна, глухой барабан
      osc('sawtooth', mtof(spec.root), 0.04, { lp: 300, lfo: 0.04 }); osc('sawtooth', mtof(spec.root + 7), 0.03, { lp: 340, detune: 7 }); osc('sine', mtof(spec.root - 12), 0.06);
      noiseLoop('bandpass', 900, 0.7, 0.06, { lfo: 0.09, lfoDepth: 450, gainLfo: 0.13 }); noiseLoop('highpass', 4200, 0.4, 0.012, { gainLfo: 0.17 });
      let np = now0 + 2, nd = now0 + 3, beat = 0;
      return (now, T) => {
        while (np < now + 0.8) { const n = 2 + ((R() * 3) | 0); let t = np; for (let i = 0; i < n; i++) { pluck(degree(pick([0, 1, 2, 4, 5]), 2), t, 0.06); t += 0.35 + R() * 0.45; } np = t + (3 + R() * 5) / D; }
        while (nd < now + 0.8) { const strong = beat % 6 === 0; thump(nd, strong ? 95 : 130, 50, strong ? 0.2 : 0.09, 0.4); beat++; nd += 0.75 * (1 + (beat % 3 === 2 ? 0.5 : 0)) / (1 + T * 0.4); }
      };
    },
    ice() {                                                    // лёд: стеклянный звон, вьюга, треск
      osc('sine', mtof(spec.root + 12), 0.035, { detune: -6, lfo: 0.2, lp: 1400, lfoDepth: 300 }); osc('sine', mtof(spec.root + 19), 0.025, { detune: 7 }); osc('triangle', mtof(spec.root - 12), 0.05, { lp: 200 });
      noiseLoop('bandpass', 600, 0.9, 0.08, { lfo: 0.05, lfoDepth: 400, gainLfo: 0.09 }); noiseLoop('highpass', 3000, 0.4, 0.015, { gainLfo: 0.12 });
      let nb = now0 + 2, nc = now0 + 6, ns = now0 + 3;
      return (now, T) => {
        while (nb < now + 0.8) { const m = degree(pick([0, 2, 4, 6]), 3 + (R() < 0.3 ? 1 : 0)); bell(m, nb, 0.045, 4.5, 1.6); nb += (2.2 + R() * 3.5) / D / (1 + T * 0.5); }
        while (nc < now + 0.8) { burst('highpass', 5000, 3000, nc, 0.09, 0.05, 2); burst('bandpass', 1800, 900, nc + 0.02, 0.2, 0.04, 3); nc += (7 + R() * 12) / D; }
        while (ns < now + 0.8) { tone('sine', mtof(spec.root + 36 + pick([0, 2, 4])), mtof(spec.root + 36), ns, 1.6, 0.02, 0.4); ns += (5 + R() * 6) / D; }
      };
    },
    lava() {                                                   // врата Ада: гул, треск огня, хор, боевые барабаны
      osc('sawtooth', mtof(spec.root - 12), 0.07, { lp: 120, lfo: 0.04 }); osc('sawtooth', mtof(spec.root), 0.045, { lp: 260, lfo: 0.06 }); osc('sawtooth', mtof(spec.root + 1), 0.03, { lp: 300, detune: 9 }); osc('sawtooth', mtof(spec.root + 6), 0.02, { lp: 380, detune: -9 });
      noiseLoop('lowpass', 260, 0.6, 0.08, { lfo: 0.03, lfoDepth: 90, gainLfo: 0.08 });
      let nf = now0 + 0.5, nd = now0 + 1, beat = 0, nc = now0 + 8;
      return (now, T) => {
        while (nf < now + 0.8) { burst('highpass', 3000 + R() * 3000, 2500, nf, 0.03 + R() * 0.05, 0.03 + R() * 0.03, 1); nf += (0.05 + R() * 0.35) / D; }
        while (nd < now + 0.8) { const s = [1, 0, 0.6, 0, 1, 0.5, 0, 0.7][beat % 8]; if (s) { thump(nd, 70, 28, 0.26 * s, 0.5); if (s === 1) thump(nd + 0.01, 120, 45, 0.1, 0.3); } beat++; nd += 0.5 / (1 + T * 0.25); }
        while (nc < now + 0.8) { const f = mtof(degree(pick([0, 1, 3, 4]), 1)); [1, 1.5, 2].forEach((k, i) => tone('sawtooth', f * k * (1 + i * 0.003), f * k, nc, 5.5, 0.012, 1.8)); nc += (9 + R() * 8) / D; }
      };
    },
    slaughter() {                                              // скотобойня: сердцебиение, металл, дрон-кластер
      osc('sawtooth', mtof(spec.root - 12), 0.07, { lp: 140 }); osc('sawtooth', mtof(spec.root), 0.04, { lp: 240, lfo: 0.09 }); osc('sawtooth', mtof(spec.root + 1), 0.035, { lp: 240, detune: 11 }); osc('sawtooth', mtof(spec.root + 6), 0.025, { lp: 260 });
      noiseLoop('bandpass', 140, 1, 0.05, { gainLfo: 0.1 });
      let nh = now0 + 1, ns = now0 + 4, nb = now0 + 6, beat = 0;
      return (now, T) => {
        while (nh < now + 0.8) { thump(nh, 85, 32, 0.28, 0.28); thump(nh + 0.24, 70, 30, 0.17, 0.25); nh += 1.05 / (1 + T * 0.35); beat++; }
        while (ns < now + 0.8) { const f0 = 800 + R() * 2200; burst('bandpass', f0, f0 * (0.4 + R()), ns, 0.5 + R() * 0.9, 0.06, 9); ns += (2.5 + R() * 5) / D; }
        while (nb < now + 0.8) { bell(degree(pick([0, 1, 3]), 0), nb, 0.08, 5, 0.6); nb += (6 + R() * 7) / D; }
      };
    },
  };
  const tick = (worlds[spec.theme] || worlds.menu)();
  const timer = setInterval(() => { try { tick(c.currentTime, tension); } catch (e) { /* ignore */ } }, 250);
  tick(c.currentTime, 0);
  return {
    _tick: tick,                                   // для офлайн-проверки громкости (tools/)
    setTension(v) { tension = v; },
    stop(fade = 0.9) {
      clearInterval(timer);
      const t = c.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0.0001, t + fade);
      setTimeout(() => { for (const n of nodes) { try { n.stop(); } catch (e) { /* */ } } try { out.disconnect(); } catch (e) { /* */ } }, fade * 1000 + 150);
    },
  };
}
