/* audio.js — ElevenLabs-generated SFX samples (audio/*.mp3) + layered generative soundtrack + haptics.
 * Samples are decoded once into AudioBuffers; if a file can't load, a procedural fallback plays instead. */
(function () {
  'use strict';
  const CA = window.CA;

  // name -> [category, base volume, pitch variance, max simultaneous voices]
  const SFX = {
    hit: ['sfx', 0.55, 0.12, 5], crit: ['sfx', 0.7, 0.08, 3], slash: ['sfx', 0.55, 0.1, 4], punch: ['sfx', 0.7, 0.1, 4],
    shoot: ['sfx', 0.38, 0.12, 4], zap: ['sfx', 0.45, 0.12, 4], boom: ['sfx', 0.8, 0.1, 4], bigboom: ['skills', 0.95, 0.05, 2],
    hurt: ['sfx', 0.8, 0.06, 2], death: ['sfx', 0.38, 0.15, 5], xp: ['sfx', 0.22, 0.2, 4], boss: ['sfx', 1.0, 0, 1], warn: ['sfx', 0.6, 0, 1],
    pull: ['skills', 0.8, 0.06, 2], whoosh: ['skills', 0.6, 0.1, 3], ult: ['skills', 1.0, 0, 1], domain: ['skills', 1.0, 0, 1],
    summon: ['skills', 0.8, 0.08, 2], blood: ['skills', 0.6, 0.1, 3], fire: ['skills', 0.75, 0.06, 2], spark: ['skills', 0.95, 0.05, 2],
    jackpot: ['skills', 0.7, 0, 1], roll: ['skills', 0.55, 0, 1], beam: ['skills', 0.6, 0.05, 2], shield: ['skills', 0.6, 0.05, 2],
    click: ['ui', 0.6, 0.05, 3], levelup: ['ui', 0.7, 0, 1], chest: ['ui', 0.8, 0, 1], achieve: ['ui', 0.7, 0, 1], select: ['ui', 0.6, 0.03, 2],
  };
  const ALIAS = { back: ['click', 0.8], pickup: ['xp', 0.75] }; // name -> [sample, playbackRate]
  const MIN_GAP = { hit: 0.03, xp: 0.035, death: 0.04, shoot: 0.05, zap: 0.05, slash: 0.04, punch: 0.04, boom: 0.06, crit: 0.05, hurt: 0.12, blood: 0.06, click: 0.03 };

  const A = {
    ctx: null, master: null, cats: {}, noiseBuf: null, ready: false, last: {}, voices: {}, buffers: {}, loaded: 0, total: Object.keys(SFX).length,
    reverb: null, musicBus: null, musicTimer: null, intensity: 0, step: 0, nextTime: 0, bar: 0, delay: null, layer: {},
    hapticEl: null, lastHaptic: 0,

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { this.ctx = new AC(); } catch (e2) { return; } }
      const c = this.ctx;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -10; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.18;
      this.master = c.createGain();
      this.master.connect(comp); comp.connect(c.destination);
      for (const k of ['sfx', 'skills', 'ui', 'music']) { const g = c.createGain(); g.connect(this.master); this.cats[k] = g; }
      // shared noise buffer (procedural fallback + drums)
      const len = c.sampleRate * 1.2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
      // algorithmic reverb (generated impulse response)
      this.reverb = c.createConvolver();
      this.reverb.buffer = this.impulse(2.6, 2.4);
      const rvOut = c.createGain(); rvOut.gain.value = 0.9;
      this.reverb.connect(rvOut); rvOut.connect(this.cats.music);
      // skills get a little space too
      this.skillVerb = c.createGain(); this.skillVerb.gain.value = 0.18; this.skillVerb.connect(this.reverb);
      this.applySettings();
      this.ready = true;
      this.loadSamples();
    },
    impulse(seconds, decay) {
      const c = this.ctx, rate = c.sampleRate, len = Math.floor(rate * seconds);
      const ir = c.createBuffer(2, len, rate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return ir;
    },
    loadSamples() {
      const c = this.ctx;
      for (const name of Object.keys(SFX)) {
        fetch('audio/' + name + '.mp3').then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
          .then((ab) => new Promise((res, rej) => { const p = c.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); }))
          .then((buf) => { this.buffers[name] = buf; this.loaded++; })
          .catch(() => { /* procedural fallback stays active for this sound */ });
      }
    },
    unlock() {
      this.init();
      if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    },
    suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); },
    resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); },
    applySettings() {
      if (!this.ctx) return;
      const s = CA.Store.settings, t = this.ctx.currentTime;
      this.master.gain.setTargetAtTime(s.master, t, 0.05);
      this.cats.sfx.gain.setTargetAtTime(s.sfx ? 1 : 0, t, 0.03);
      this.cats.skills.gain.setTargetAtTime(s.skills ? 1 : 0, t, 0.03);
      this.cats.ui.gain.setTargetAtTime(s.ui ? 0.9 : 0, t, 0.03);
      this.cats.music.gain.setTargetAtTime(s.music ? s.musicVol * 0.7 : 0, t, 0.1);
    },

    // ---------- sample playback ----------
    sample(name, vol, rate, delay) {
      const buf = this.buffers[name];
      if (!buf) return false;
      const def = SFX[name], c = this.ctx;
      const v = this.voices[name] || 0;
      if (v >= def[3]) return true; // voice cap: drop silently
      const src = c.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = (rate || 1) * (1 + (Math.random() * 2 - 1) * def[2]);
      const g = c.createGain();
      g.gain.value = def[1] * vol;
      src.connect(g); g.connect(this.cats[def[0]]);
      if (def[0] === 'skills') g.connect(this.skillVerb);
      this.voices[name] = v + 1;
      src.onended = () => { this.voices[name] = Math.max(0, (this.voices[name] || 1) - 1); };
      src.start(c.currentTime + (delay || 0));
      return true;
    },
    play(name, vol) {
      if (!this.ready || !this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const gap = MIN_GAP[name] || 0.02;
      if (this.last[name] && now - this.last[name] < gap) return;
      this.last[name] = now;
      const v = vol == null ? 1 : vol;
      if (ALIAS[name]) { if (this.sample(ALIAS[name][0], v * 0.8, ALIAS[name][1])) return; }
      else if (this.sample(name, v)) {
        // cinematic layering
        if (name === 'ult') { this.sample('bigboom', v * 0.55, 1, 0.35); this.synthRise(v); }
        if (name === 'domain') { this.sample('bigboom', v * 0.7, 0.85, 0.9); this.synthRise(v * 1.2); }
        if (name === 'boss') this.sample('bigboom', v * 0.4, 0.7, 0.2);
        if (name === 'spark') this.sample('zap', v * 0.4, 0.7);
        return;
      }
      this.synth(name, v); // fallback
    },
    synthRise(v) { // short rising swell under ult/domain samples
      const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(420, t + 0.8);
      f.type = 'lowpass'; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3000, t + 0.8);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12 * v, t + 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      o.connect(f); f.connect(g); g.connect(this.cats.skills); g.connect(this.skillVerb);
      o.start(t); o.stop(t + 1.05);
    },

    // ---------- procedural fallback (used only if a sample failed to load) ----------
    env(g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); },
    tone(cat, type, f0, f1, dur, vol, delay) {
      const c = this.ctx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      this.env(g, t, 0.005, vol, dur); o.connect(g); g.connect(this.cats[cat]); o.start(t); o.stop(t + dur + 0.02);
    },
    noise(cat, dur, vol, type, f0, f1) {
      const c = this.ctx, t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noiseBuf; f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      this.env(g, t, 0.004, vol, dur); s.connect(f); f.connect(g); g.connect(this.cats[cat]); s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.02);
    },
    synth(name, v) {
      const cat = (SFX[name] || ['sfx'])[0];
      const big = /boom|ult|domain|boss|spark/.test(name);
      if (/click|select|back|levelup|achieve|chest|pickup|xp|jackpot/.test(name)) this.tone(cat, 'triangle', 700, 1100, 0.12, 0.12 * v);
      else if (big) { this.noise(cat, 0.8, 0.6 * v, 'lowpass', 1600, 60); this.tone(cat, 'sine', 110, 35, 0.7, 0.5 * v); }
      else this.noise(cat, 0.12, 0.3 * v, 'bandpass', 2200, 600);
    },

    // ================= GENERATIVE SOUNDTRACK =================
    // D minor / Japanese "in" flavour. 16th-note grid, one chord per bar, 4-bar phrases.
    PROG: {
      0: [[50, 53, 57, 60], [46, 50, 53, 57], [43, 46, 50, 53], [45, 49, 52, 55]],       // Dm7  Bbmaj7  Gm7  A7  (menu)
      1: [[50, 53, 57, 62], [46, 50, 53, 58], [48, 52, 55, 60], [45, 48, 52, 57]],       // Dm   Bb      C    Am  (battle)
      2: [[50, 53, 56, 62], [49, 52, 56, 61], [46, 50, 53, 58], [45, 49, 52, 57]],       // Ddim-ish tension (boss)
    },
    MOTIF: [62, 65, 67, 69, 72, 74, 77, 79], // D F G A C D F G (minor pentatonic)
    setIntensity(i) {
      if (i === this.intensity) return;
      this.intensity = i;
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const L = this.layer;
      if (L.drums) L.drums.gain.setTargetAtTime(i >= 1 ? 1 : 0, t, 0.8);
      if (L.lead) L.lead.gain.setTargetAtTime(i >= 1 ? 1 : 0.6, t, 1.2);
    },
    startMusic() {
      if (!this.ready || this.musicTimer) return;
      const c = this.ctx;
      const bus = c.createGain(); bus.gain.value = 1; bus.connect(this.cats.music);
      const send = c.createGain(); send.gain.value = 0.55; send.connect(this.reverb);
      // ping-pong-ish delay for plucks
      const dly = c.createDelay(1.0), fb = c.createGain(), dOut = c.createGain(), dF = c.createBiquadFilter();
      dly.delayTime.value = 0.32; fb.gain.value = 0.38; dOut.gain.value = 0.35; dF.type = 'lowpass'; dF.frequency.value = 2800;
      dly.connect(dF); dF.connect(fb); fb.connect(dly); dF.connect(dOut); dOut.connect(bus); dOut.connect(send);
      const mk = (g) => { const n = c.createGain(); n.gain.value = g; n.connect(bus); return n; };
      this.layer = { bus, send, delay: dly, drums: mk(this.intensity >= 1 ? 1 : 0), pad: mk(0.9), bass: mk(1), pluck: mk(1), lead: mk(this.intensity >= 1 ? 1 : 0.6) };
      this.step = 0;
      this.nextTime = c.currentTime + 0.15;
      this.musicTimer = setInterval(() => this.schedule(), 60);
    },
    stopMusic() { clearInterval(this.musicTimer); this.musicTimer = null; },
    mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); },
    schedule() {
      const c = this.ctx;
      if (!c || c.state !== 'running') { if (c) this.nextTime = c.currentTime + 0.1; return; }
      const I = this.intensity;
      const bpm = I >= 2 ? 138 : I === 1 ? 118 : 76;
      const sd = 60 / bpm / 4;
      while (this.nextTime < c.currentTime + 0.25) {
        const s = this.step, t = this.nextTime, beat = s % 16, bar = Math.floor(s / 16) % 4, phrase = Math.floor(s / 64);
        const chord = this.PROG[I][bar];
        const root = chord[0];
        // ---- pad: new chord each bar, slow swell
        if (beat === 0) for (let i = 0; i < chord.length; i++) this.pad(this.mtof(chord[i] + 12), t, sd * 16, I === 0 ? 0.035 : 0.028);
        // ---- bass
        if (I === 0) { if (beat === 0) this.bass(this.mtof(root - 12), t, sd * 14, 0.16, 300); }
        else {
          const pat = I >= 2 ? [0, 0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, 0, 12, 10, 7] : [0, -1, 0, 12, -1, 0, 7, -1, 0, -1, 0, 12, -1, 0, 10, -1];
          const n = pat[beat];
          if (n >= 0) this.bass(this.mtof(root - 12 + n), t, sd * 0.9, I >= 2 ? 0.2 : 0.17, I >= 2 ? 900 : 650);
        }
        // ---- koto-like pluck arpeggio
        const arpEvery = I === 0 ? 2 : 1;
        if (beat % arpEvery === 0 && !(I === 0 && Math.random() < 0.25)) {
          const order = [0, 2, 1, 3, 2, 1, 3, 0];
          const idx = order[(s / arpEvery | 0) % 8];
          const oct = I >= 1 && beat % 8 >= 4 ? 24 : 12;
          this.pluck(this.mtof(chord[idx] + oct), t, I === 0 ? 0.06 : 0.045);
        }
        // ---- lead motif (call & response every other phrase)
        if (I >= 1 && (phrase % 2 === 1) && (beat === 0 || beat === 6 || beat === 10 || (I >= 2 && beat === 14))) {
          const m = this.MOTIF[(bar * 3 + beat + phrase) % this.MOTIF.length];
          this.lead(this.mtof(m), t, sd * (beat === 10 ? 6 : 4), I >= 2 ? 0.05 : 0.04);
        }
        if (I === 0 && beat === 8 && bar % 2 === 1) this.lead(this.mtof(this.MOTIF[(bar + phrase) % 5 + 2]), t, sd * 7, 0.03);
        // ---- drums
        if (I >= 1) {
          const D = this.layer.drums;
          if (beat === 0 || beat === 8 || (I >= 2 && (beat === 3 || beat === 11)) || (beat === 10 && bar === 3)) this.kick(t, D);
          if (beat === 4 || beat === 12) this.snare(t, D, 0.16);
          if (beat % 2 === 0) this.hat(t, D, beat % 4 === 2 ? 0.05 : 0.03);
          else if (I >= 2) this.hat(t, D, 0.02);
          if (I >= 2 && (beat === 0 || beat === 7) && bar % 2 === 0) this.taiko(t, D, 0.5);
          if (bar === 3 && beat >= 12 && I >= 1) this.snare(t, D, 0.06 + (beat - 12) * 0.03); // fill
        }
        this.nextTime += sd;
        this.step++;
      }
    },
    pad(f, t, dur, vol) {
      const c = this.ctx, g = c.createGain(), fl = c.createBiquadFilter();
      fl.type = 'lowpass'; fl.frequency.setValueAtTime(600, t); fl.frequency.linearRampToValueAtTime(1500, t + dur * 0.5); fl.frequency.linearRampToValueAtTime(700, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.05);
      for (const det of [-7, 0, 7]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(fl); o.start(t); o.stop(t + dur * 1.1); }
      fl.connect(g); g.connect(this.layer.pad); g.connect(this.layer.send);
    },
    bass(f, t, dur, vol, cut) {
      const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f / 2;
      fl.type = 'lowpass'; fl.Q.value = 6; fl.frequency.setValueAtTime(cut * 2.2, t); fl.frequency.exponentialRampToValueAtTime(cut * 0.4, t + Math.min(0.25, dur));
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(this.layer.bass);
      o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
    },
    pluck(f, t, vol) { // koto/shamisen-ish: bright attack, fast decay, harmonic partials
      const c = this.ctx, g = c.createGain(), fl = c.createBiquadFilter();
      fl.type = 'lowpass'; fl.frequency.setValueAtTime(f * 8, t); fl.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.3);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      for (const [mul, typ, a] of [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.15]]) {
        const o = c.createOscillator(), og = c.createGain(); o.type = typ; o.frequency.value = f * mul; og.gain.value = a;
        o.connect(og); og.connect(fl); o.start(t); o.stop(t + 0.95);
      }
      fl.connect(g); g.connect(this.layer.pluck); g.connect(this.layer.delay); g.connect(this.layer.send);
    },
    lead(f, t, dur, vol) { // shakuhachi-ish breathy lead with vibrato
      const c = this.ctx, o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain(), fl = c.createBiquadFilter();
      o.type = 'triangle'; o.frequency.setValueAtTime(f * 0.985, t); o.frequency.linearRampToValueAtTime(f, t + 0.08);
      lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + dur * 0.5);
      lfo.connect(lg); lg.connect(o.frequency);
      fl.type = 'lowpass'; fl.frequency.value = 2200;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.06); g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(fl); fl.connect(g); g.connect(this.layer.lead); g.connect(this.layer.send); g.connect(this.layer.delay);
      // breath noise
      const n = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain();
      n.buffer = this.noiseBuf; nf.type = 'bandpass'; nf.frequency.value = f * 2; nf.Q.value = 3;
      ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(vol * 0.25, t + 0.04); ng.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.6);
      n.connect(nf); nf.connect(ng); ng.connect(this.layer.lead);
      o.start(t); lfo.start(t); n.start(t, Math.random() * 0.4);
      o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05); n.stop(t + dur);
    },
    kick(t, out) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.3);
    },
    snare(t, out, vol) {
      const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noiseBuf; f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
      s.connect(f); f.connect(g); g.connect(out); g.connect(this.layer.send);
      s.start(t, Math.random() * 0.5); s.stop(t + 0.18);
      const o = c.createOscillator(), og = c.createGain();
      o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
      og.gain.setValueAtTime(vol * 0.6, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.12);
    },
    hat(t, out, vol) {
      const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noiseBuf; f.type = 'highpass'; f.frequency.value = 7500;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + 0.05);
    },
    taiko(t, out, vol) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.35);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.connect(g); g.connect(out); g.connect(this.layer.send); o.start(t); o.stop(t + 0.6);
    },

    // ---------- haptics ----------
    // Android: navigator.vibrate. iOS Safari 17.4+: toggling a hidden <input switch> gives a system haptic tick.
    vibrate(kind) {
      if (!CA.Store.settings.vibration) return;
      const now = performance.now();
      if (now - this.lastHaptic < 70) return;
      this.lastHaptic = now;
      const pattern = kind === 'heavy' ? [35] : kind === 'medium' ? [18] : [8];
      if (navigator.vibrate) { try { navigator.vibrate(pattern); return; } catch (e) { /* ignore */ } }
      if (!this.hapticEl) {
        const label = document.createElement('label');
        label.style.cssText = 'position:fixed;left:-100px;top:-100px;opacity:0;pointer-events:none;';
        const inp = document.createElement('input');
        inp.type = 'checkbox'; inp.setAttribute('switch', '');
        label.appendChild(inp); document.body.appendChild(label);
        this.hapticEl = label;
      }
      try { this.hapticEl.click(); } catch (e) { /* ignore */ }
    },
  };
  CA.Audio = A;
})();
