/* audio.js — fully procedural Web Audio SFX + generative music + haptics. No external files. */
(function () {
  'use strict';
  const CA = window.CA;

  const CAT = {
    hit: 'sfx', crit: 'sfx', slash: 'sfx', shoot: 'sfx', zap: 'sfx', boom: 'sfx', hurt: 'sfx', death: 'sfx',
    xp: 'sfx', boss: 'sfx', warn: 'sfx', punch: 'sfx',
    pull: 'skills', whoosh: 'skills', ult: 'skills', domain: 'skills', summon: 'skills', blood: 'skills',
    fire: 'skills', spark: 'skills', jackpot: 'skills', bigboom: 'skills', beam: 'skills', roll: 'skills', shield: 'skills',
    click: 'ui', levelup: 'ui', pickup: 'ui', chest: 'ui', select: 'ui', achieve: 'ui', back: 'ui',
  };
  const MIN_GAP = { hit: 0.035, xp: 0.03, death: 0.04, shoot: 0.05, zap: 0.05, slash: 0.04, punch: 0.04, boom: 0.06, crit: 0.05, hurt: 0.12, blood: 0.05 };

  const A = {
    ctx: null, master: null, cats: {}, noiseBuf: null, ready: false, last: {}, active: 0,
    musicGain: null, musicOn: false, musicTimer: null, intensity: 0, step: 0, nextTime: 0,
    hapticEl: null, lastHaptic: 0,

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { this.ctx = new AC(); } catch (e2) { return; } }
      const c = this.ctx;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
      this.master = c.createGain();
      this.master.connect(comp); comp.connect(c.destination);
      for (const k of ['sfx', 'skills', 'ui', 'music']) {
        const g = c.createGain(); g.connect(this.master); this.cats[k] = g;
      }
      this.musicGain = this.cats.music;
      // noise buffer
      const len = c.sampleRate * 1.2;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
      this.applySettings();
      this.ready = true;
    },
    unlock() {
      this.init();
      if (this.ctx && this.ctx.state !== 'running') { this.ctx.resume().catch(() => {}); }
    },
    suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); },
    resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); },
    applySettings() {
      if (!this.ctx) return;
      const s = CA.Store.settings;
      const t = this.ctx.currentTime;
      this.master.gain.setTargetAtTime(s.master, t, 0.05);
      this.cats.sfx.gain.setTargetAtTime(s.sfx ? 1 : 0, t, 0.03);
      this.cats.skills.gain.setTargetAtTime(s.skills ? 1 : 0, t, 0.03);
      this.cats.ui.gain.setTargetAtTime(s.ui ? 0.9 : 0, t, 0.03);
      this.cats.music.gain.setTargetAtTime(s.music ? s.musicVol * 0.55 : 0, t, 0.1);
    },

    // ---------- primitives ----------
    env(g, t, a, peak, dur) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    },
    tone(cat, type, f0, f1, dur, vol, delay, attack) {
      const c = this.ctx, t = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      this.env(g, t, attack || 0.005, vol, dur);
      o.connect(g); g.connect(this.cats[cat]);
      o.start(t); o.stop(t + dur + 0.02);
    },
    noise(cat, dur, vol, ftype, f0, f1, q, delay, attack) {
      const c = this.ctx, t = c.currentTime + (delay || 0);
      const s = c.createBufferSource(); s.buffer = this.noiseBuf;
      s.playbackRate.value = 0.8 + Math.random() * 0.4;
      const f = c.createBiquadFilter(); f.type = ftype || 'lowpass'; f.Q.value = q || 1;
      f.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      const g = c.createGain(); this.env(g, t, attack || 0.004, vol, dur);
      s.connect(f); f.connect(g); g.connect(this.cats[cat]);
      s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.02);
    },

    play(name, vol) {
      if (!this.ready || !this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const gap = MIN_GAP[name] || 0.02;
      if (this.last[name] && now - this.last[name] < gap) return;
      this.last[name] = now;
      const v = vol == null ? 1 : vol;
      const cat = CAT[name] || 'sfx';
      const R = Math.random;
      switch (name) {
        case 'hit':
          this.noise(cat, 0.07, 0.25 * v, 'bandpass', 1800 + R() * 800, 600, 1.2);
          this.tone(cat, 'triangle', 220 + R() * 60, 90, 0.07, 0.18 * v);
          break;
        case 'punch':
          this.noise(cat, 0.09, 0.35 * v, 'lowpass', 2200, 300, 1);
          this.tone(cat, 'sine', 160, 50, 0.12, 0.35 * v);
          break;
        case 'crit':
          this.noise(cat, 0.12, 0.35 * v, 'highpass', 3000, 1200, 1);
          this.tone(cat, 'square', 880, 220, 0.12, 0.12 * v);
          break;
        case 'slash':
          this.noise(cat, 0.14, 0.3 * v, 'bandpass', 5000 + R() * 2000, 1500, 2.5);
          break;
        case 'shoot':
          this.tone(cat, 'sine', 900 + R() * 200, 300, 0.09, 0.12 * v);
          this.noise(cat, 0.05, 0.08 * v, 'highpass', 4000, 3000, 1);
          break;
        case 'zap':
          this.tone(cat, 'sawtooth', 1400 + R() * 600, 200, 0.12, 0.08 * v);
          this.noise(cat, 0.1, 0.18 * v, 'highpass', 6000, 2500, 0.8);
          break;
        case 'boom':
          this.noise(cat, 0.45, 0.55 * v, 'lowpass', 1600, 80, 0.8);
          this.tone(cat, 'sine', 120, 35, 0.4, 0.5 * v);
          break;
        case 'bigboom':
          this.noise(cat, 1.1, 0.8 * v, 'lowpass', 2400, 40, 0.7);
          this.tone(cat, 'sine', 90, 25, 1.0, 0.75 * v);
          this.tone(cat, 'sawtooth', 60, 30, 0.8, 0.15 * v);
          break;
        case 'hurt':
          this.tone(cat, 'square', 300, 90, 0.18, 0.18 * v);
          this.noise(cat, 0.15, 0.25 * v, 'lowpass', 1200, 200, 1);
          break;
        case 'death':
          this.noise(cat, 0.16, 0.18 * v, 'bandpass', 700 + R() * 400, 200, 1.5);
          this.tone(cat, 'sine', 260 + R() * 80, 70, 0.14, 0.1 * v);
          break;
        case 'xp':
          this.tone(cat, 'sine', 1200 + R() * 500, 1900, 0.06, 0.05 * v);
          break;
        case 'pull':
          this.tone(cat, 'sine', 80, 300, 0.9, 0.35 * v, 0, 0.2);
          this.tone(cat, 'triangle', 400, 60, 0.9, 0.12 * v, 0, 0.3);
          this.noise(cat, 0.9, 0.15 * v, 'bandpass', 200, 1400, 4, 0, 0.3);
          break;
        case 'whoosh':
          this.noise(cat, 0.28, 0.32 * v, 'bandpass', 600, 3000, 2);
          break;
        case 'beam':
          this.tone(cat, 'sawtooth', 220, 110, 0.6, 0.15 * v, 0, 0.02);
          this.tone(cat, 'sine', 440, 880, 0.6, 0.15 * v);
          this.noise(cat, 0.6, 0.25 * v, 'bandpass', 900, 300, 2);
          break;
        case 'fire':
          this.noise(cat, 0.6, 0.4 * v, 'lowpass', 900, 200, 0.6, 0, 0.05);
          this.tone(cat, 'sawtooth', 110, 55, 0.5, 0.1 * v);
          break;
        case 'blood':
          this.noise(cat, 0.18, 0.25 * v, 'bandpass', 500, 1500, 3);
          this.tone(cat, 'sine', 180, 320, 0.15, 0.12 * v);
          break;
        case 'summon':
          this.tone(cat, 'triangle', 110, 55, 0.6, 0.25 * v, 0, 0.05);
          this.tone(cat, 'sine', 330, 165, 0.6, 0.12 * v, 0.05);
          this.noise(cat, 0.6, 0.18 * v, 'lowpass', 400, 100, 1, 0, 0.1);
          break;
        case 'shield':
          this.tone(cat, 'sine', 600, 900, 0.3, 0.15 * v);
          this.tone(cat, 'sine', 900, 1350, 0.3, 0.1 * v, 0.05);
          break;
        case 'spark':
          this.noise(cat, 0.3, 0.6 * v, 'highpass', 2500, 800, 0.7);
          this.tone(cat, 'square', 70, 40, 0.35, 0.4 * v);
          this.tone(cat, 'sawtooth', 2400, 300, 0.2, 0.12 * v);
          break;
        case 'roll':
          for (let i = 0; i < 8; i++) this.tone(cat, 'square', 700 + (i % 3) * 200, 700, 0.04, 0.05 * v, i * 0.09);
          break;
        case 'jackpot':
          [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(cat, 'square', f, f, 0.18, 0.09 * v, i * 0.08));
          this.tone(cat, 'triangle', 1046, 1046, 0.6, 0.12 * v, 0.4);
          break;
        case 'ult':
          this.tone(cat, 'sawtooth', 55, 55, 1.4, 0.25 * v, 0, 0.3);
          this.tone(cat, 'sine', 110, 440, 0.9, 0.3 * v, 0, 0.1);
          this.tone(cat, 'sine', 165, 660, 0.9, 0.2 * v, 0.1, 0.1);
          this.noise(cat, 1.3, 0.35 * v, 'bandpass', 300, 4000, 1.5, 0, 0.4);
          this.tone(cat, 'sine', 80, 30, 0.8, 0.6 * v, 0.9);
          this.noise(cat, 0.8, 0.5 * v, 'lowpass', 2000, 60, 0.7, 0.9);
          break;
        case 'domain':
          this.tone(cat, 'sine', 40, 40, 2.4, 0.45 * v, 0, 0.6);
          [220, 277, 330, 415].forEach((f, i) => this.tone(cat, 'triangle', f, f * 1.01, 2.0, 0.07 * v, 0.2 + i * 0.12, 0.3));
          this.noise(cat, 2.2, 0.25 * v, 'bandpass', 100, 3000, 3, 0, 1.2);
          this.tone(cat, 'sine', 120, 30, 1.0, 0.6 * v, 1.4);
          break;
        case 'boss':
          this.tone(cat, 'sawtooth', 55, 52, 2.2, 0.3 * v, 0, 0.4);
          this.tone(cat, 'sawtooth', 82, 78, 2.2, 0.2 * v, 0.1, 0.4);
          this.tone(cat, 'sine', 41, 41, 2.5, 0.5 * v, 0, 0.6);
          this.noise(cat, 2.0, 0.3 * v, 'lowpass', 300, 1200, 2, 0, 1.0);
          break;
        case 'warn':
          this.tone(cat, 'square', 440, 440, 0.12, 0.08 * v);
          this.tone(cat, 'square', 440, 440, 0.12, 0.08 * v, 0.18);
          break;
        case 'click':
          this.tone(cat, 'triangle', 900, 600, 0.05, 0.12 * v);
          break;
        case 'back':
          this.tone(cat, 'triangle', 600, 400, 0.06, 0.1 * v);
          break;
        case 'select':
          this.tone(cat, 'triangle', 660, 990, 0.09, 0.12 * v);
          this.tone(cat, 'sine', 1320, 1320, 0.12, 0.06 * v, 0.05);
          break;
        case 'pickup':
          this.tone(cat, 'sine', 700, 1400, 0.12, 0.12 * v);
          break;
        case 'levelup':
          [392, 523, 659, 784].forEach((f, i) => this.tone(cat, 'triangle', f, f, 0.22, 0.14 * v, i * 0.07));
          this.tone(cat, 'sine', 1568, 1568, 0.5, 0.06 * v, 0.28);
          break;
        case 'chest':
          this.noise(cat, 0.3, 0.2 * v, 'lowpass', 600, 200, 1);
          [523, 784, 1046, 1568].forEach((f, i) => this.tone(cat, 'sine', f, f, 0.3, 0.1 * v, 0.25 + i * 0.06));
          break;
        case 'achieve':
          [659, 880, 1318].forEach((f, i) => this.tone(cat, 'triangle', f, f, 0.25, 0.1 * v, i * 0.09));
          break;
      }
    },

    // ---------- generative music ----------
    setIntensity(i) { this.intensity = i; },
    startMusic() {
      if (!this.ready || this.musicTimer) return;
      this.musicOn = true;
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.1;
      this.musicTimer = setInterval(() => this.schedule(), 90);
    },
    stopMusic() { clearInterval(this.musicTimer); this.musicTimer = null; this.musicOn = false; },
    schedule() {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const c = this.ctx;
      const bpm = this.intensity >= 2 ? 132 : this.intensity === 1 ? 112 : 84;
      const stepDur = 60 / bpm / 4;
      // D minor-ish with a dark flavor: D, F, G, A, C, Bb, E
      const roots = [146.83, 146.83, 116.54, 130.81]; // D, D, Bb, C (per bar)
      const scale = [0, 3, 5, 7, 10, 12, 15, 17, 19];
      while (this.nextTime < c.currentTime + 0.25) {
        const s = this.step, t = this.nextTime, bar = Math.floor(s / 16) % 4, beat = s % 16;
        const root = roots[bar];
        const out = this.cats.music;
        // bass pulse
        if (beat % 8 === 0) this.mTone(out, 'sawtooth', root / 2, t, stepDur * 7, 0.11, 500);
        // arpeggio
        if (this.intensity >= 0 && (beat % 2 === 0 || this.intensity >= 2)) {
          const idx = [0, 2, 4, 5, 3, 6, 2, 4][(s >> (this.intensity >= 2 ? 0 : 1)) % 8];
          const f = root * 2 * Math.pow(2, scale[idx] / 12);
          this.mTone(out, 'triangle', f, t, stepDur * 1.6, this.intensity === 0 ? 0.035 : 0.05, 2600);
        }
        // pad on bar start
        if (beat === 0) {
          [0, 3, 7].forEach((st) => this.mTone(out, 'sine', root * Math.pow(2, st / 12), t, stepDur * 16, 0.035, 1200, 0.6));
        }
        if (this.intensity >= 1) {
          if (beat % 4 === 0) this.mKick(out, t);
          if (beat % 4 === 2) this.mHat(out, t, 0.04);
          if (this.intensity >= 2 && beat % 2 === 1) this.mHat(out, t, 0.02);
          if (beat === 12 && this.intensity >= 2) this.mSnare(out, t);
          if (beat === 4 || beat === 12) this.mSnare(out, t, 0.6);
        }
        this.nextTime += stepDur;
        this.step++;
      }
    },
    mTone(out, type, f, t, dur, vol, cutoff, attack) {
      const c = this.ctx;
      const o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
      o.type = type; o.frequency.value = f;
      fl.type = 'lowpass'; fl.frequency.value = cutoff || 2000;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(fl); fl.connect(g); g.connect(out);
      o.start(t); o.stop(t + dur + 0.05);
    },
    mKick(out, t) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.22);
    },
    mHat(out, t, vol) {
      const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noiseBuf; f.type = 'highpass'; f.frequency.value = 7000;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + 0.06);
    },
    mSnare(out, t, v) {
      const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noiseBuf; f.type = 'bandpass'; f.frequency.value = 1800;
      g.gain.setValueAtTime(0.12 * (v || 1), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + 0.16);
    },

    // ---------- haptics ----------
    // Android/Chrome: navigator.vibrate. iOS Safari 17.4+: toggling a hidden <input switch> gives a system haptic tick.
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
