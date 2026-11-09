'use strict';
/* Офлайн-сведение звуковой дорожки (Web Audio OfflineAudioContext):
   озвучка ElevenLabs + звуковые эффекты (ElevenLabs) + процедурная музыка.
   Все времена — из js/timing.js, поэтому звук совпадает с картинкой. */
const SR = 48000;
const MIXR = rng(2024);
const SFX_FILES = ['braam', 'heart', 'shatter', 'dash', 'clench', 'crash', 'crash2', 'slowmo', 'land', 'land2', 'roar',
  'whoosh', 'punch', 'hit', 'crit', 'bigboom', 'boom', 'slash', 'boss', 'spark', 'click', 'domain', 'summon', 'beam'];

// [время, звук, громкость, скорость, панорама]
const CUES = [
  [2.5, 'whoosh', 0.12, 0.6, 0], [5.7, 'whoosh', 0.18, 0.75, 0], [6.25, 'spark', 0.18, 0.6, 0], [7.0, 'spark', 0.12, 0.5, 0.2],
  [T.title1, 'braam', 1.0, 1, 0], [T.title1, 'bigboom', 0.45, 0.6, 0],
  [8.9, 'whoosh', 0.45, 1.2, 0],
  [T.heart1, 'heart', 0.9, 1, 0], [T.heart2, 'heart', 0.85, 0.97, 0], [T.heart3, 'heart', 0.95, 0.95, 0],
  [9.55, 'clench', 0.8, 1, 0], [T.fistCrack, 'hit', 0.35, 0.6, 0], [12.2, 'clench', 0.55, 0.85, -0.2],
  [14.2, 'whoosh', 0.25, 0.55, 0], [15.3, 'heart', 0.7, 0.92, 0], [T.posture, 'boom', 0.35, 0.7, 0], [T.posture + 0.1, 'clench', 0.4, 0.7, 0],
  [19.08, 'whoosh', 0.6, 1.5, -0.3], [T.glassCatch, 'hit', 0.35, 1.6, 0.2],
  [20.2, 'whoosh', 0.2, 0.6, 0], [T.eyeCold, 'spark', 0.45, 1, 0], [T.eyeCold, 'beam', 0.25, 0.5, 0],
  [23.75, 'whoosh', 0.55, 1.0, 0], [24.0, 'boom', 0.55, 0.8, 0],
  [28.4, 'clench', 0.35, 0.6, 0],
  [T.dash, 'dash', 1.0, 1, 0], [T.dash, 'boom', 0.7, 0.8, 0], [29.32, 'slash', 0.35, 0.5, 0.3],
  [T.jump, 'land', 0.7, 1.1, 0], [T.jump + 0.02, 'whoosh', 0.55, 0.7, 0],
  [32.3, 'whoosh', 0.5, 0.9, 0], [T.land, 'land2', 1.0, 1, 0], [T.land, 'bigboom', 0.5, 0.8, 0],
  [33.9, 'whoosh', 0.5, 1.5, 0], [T.punch1, 'punch', 1.0, 0.9, 0], [T.punch1, 'crit', 0.7, 0.8, 0], [T.punch1 + 0.08, 'shatter', 1.0, 0.85, 0.2],
  [T.punch1 + 0.1, 'bigboom', 0.6, 0.9, 0], [T.punch1 + 0.25, 'crash2', 0.5, 0.8, 0.3],
  [T.rift, 'domain', 0.55, 0.8, 0.2], [T.rift + 0.3, 'summon', 0.35, 0.6, 0.2],
  [T.curseLand, 'land', 0.9, 0.85, 0.1], [T.curseLand, 'boom', 0.6, 0.6, 0.1], [T.curseEyes, 'beam', 0.3, 0.45, 0],
  [T.roar, 'roar', 1.0, 1, 0], [T.roar, 'boss', 0.45, 0.8, 0],
  [43.05, 'whoosh', 0.6, 0.6, 0.2], [43.15, 'boom', 0.35, 0.7, 0], [43.35, 'boom', 0.4, 0.7, 0],
  [T.clawSwing, 'slash', 0.7, 0.75, 0.3],
  [T.slowStart, 'slowmo', 0.95, 1, 0], [45.2, 'heart', 0.75, 0.85, 0], [46.3, 'heart', 0.75, 0.85, 0], [47.3, 'heart', 0.8, 0.85, 0],
  [T.vanish, 'whoosh', 0.7, 1.7, 0], [47.95, 'crash', 0.6, 1.0, -0.2], [47.95, 'boom', 0.5, 0.8, -0.2], [T.behind, 'click', 0.35, 0.7, 0.3],
  [49.05, 'whoosh', 0.35, 0.7, 0], [T.punch2, 'punch', 1.0, 0.85, 0], [T.punch2, 'crit', 0.9, 0.75, 0], [T.punch2, 'bigboom', 0.8, 0.85, 0],
  [T.punch2, 'braam', 0.55, 1.05, 0], [49.6, 'whoosh', 0.6, 0.6, -0.3],
  [T.crash, 'crash', 1.0, 0.9, -0.4], [T.crash, 'crash2', 0.8, 0.75, -0.4], [T.crash + 0.02, 'bigboom', 0.7, 0.7, -0.4], [51.6, 'crash2', 0.45, 0.6, -0.5],
  [T.ash, 'spark', 0.25, 0.5, -0.3], [55.0, 'summon', 0.2, 0.5, -0.3],
  [58.55, 'whoosh', 0.45, 0.9, 0],
  [65.9, 'click', 0.35, 0.8, 0.3], [66.35, 'click', 0.3, 0.6, -0.3], [66.8, 'click', 0.3, 0.9, 0.3], [67.5, 'spark', 0.2, 0.7, 0],
  [69.45, 'slowmo', 1.0, 0.9, 0], [69.6, 'boom', 0.4, 0.5, 0], [70.2, 'heart', 0.7, 0.85, 0], [71.4, 'heart', 0.75, 0.85, 0],
  [T.catchSpike, 'hit', 0.45, 1.8, 0.2], [T.catchSpike, 'click', 0.4, 1.2, 0.2],
  [T.snap, 'dash', 0.85, 1.2, 0], [74.0, 'crash', 0.75, 1.0, -0.4], [74.06, 'boom', 0.6, 0.8, -0.3], [74.12, 'crash2', 0.6, 1.1, -0.5],
  [74.25, 'shatter', 0.55, 1.4, 0.2],
  [T.finalTitle, 'braam', 1.0, 0.95, 0], [T.finalTitle, 'bigboom', 0.85, 0.75, 0], [T.finalTitle, 'punch', 0.5, 0.6, 0],
  [T.finalCut, 'bigboom', 1.0, 0.65, 0], [T.finalCut, 'braam', 0.7, 0.8, 0],
];

async function buildMix(base = '') {
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * DURATION), SR);
  const load = async url => ctx.decodeAudioData(await (await fetch(base + url)).arrayBuffer());
  const sfx = {};
  await Promise.all(SFX_FILES.map(async n => { sfx[n] = await load('sfx/' + n + '.mp3'); }));
  const vo = await Promise.all(VO.map(v => load(v.file)));

  // ---------- шины ----------
  const master = ctx.createDynamicsCompressor();
  master.threshold.value = -10; master.knee.value = 6; master.ratio.value = 4; master.attack.value = 0.003; master.release.value = 0.2;
  const out = ctx.createGain(); out.gain.value = 0.9;
  master.connect(out); out.connect(ctx.destination);
  // реверберация (синтетический импульс)
  const conv = ctx.createConvolver();
  const irLen = SR * 2.8, ir = ctx.createBuffer(2, irLen, SR);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); const R = rng(77 + c); for (let i = 0; i < irLen; i++) d[i] = (R() * 2 - 1) * Math.pow(1 - i / irLen, 3.2); }
  conv.buffer = ir;
  const revOut = ctx.createGain(); revOut.gain.value = 0.32; conv.connect(revOut); revOut.connect(master);
  const musicFilter = ctx.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 18000; musicFilter.Q.value = 0.7;
  const music = ctx.createGain(); music.gain.value = 0;
  music.connect(musicFilter); musicFilter.connect(master);
  const musicRev = ctx.createGain(); musicRev.gain.value = 0.5; music.connect(musicRev); musicRev.connect(conv);
  const sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
  const sfxRev = ctx.createGain(); sfxRev.gain.value = 0.18; sfxBus.connect(sfxRev); sfxRev.connect(conv);
  const voBus = ctx.createGain(); voBus.gain.value = 1.15;
  const voHp = ctx.createBiquadFilter(); voHp.type = 'highpass'; voHp.frequency.value = 80;
  voBus.connect(voHp); voHp.connect(master);
  const voRev = ctx.createGain(); voRev.gain.value = 0.06; voHp.connect(voRev); voRev.connect(conv);

  // ---------- озвучка + приглушение музыки (ducking) ----------
  VO.forEach((v, i) => { const s = ctx.createBufferSource(); s.buffer = vo[i]; s.connect(voBus); s.start(v.at); });
  const g = music.gain;
  g.setValueAtTime(0.0, 0); g.linearRampToValueAtTime(0.85, 1.5);
  const duckSpans = [];
  VO.forEach(v => v.phrases.forEach(([a, b]) => duckSpans.push([v.at + a - 0.12, v.at + b + 0.25])));
  duckSpans.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const s of duckSpans) { const L = merged[merged.length - 1]; if (L && s[0] <= L[1] + 0.35) L[1] = Math.max(L[1], s[1]); else merged.push(s.slice()); }
  for (const [a, b] of merged) { g.setTargetAtTime(0.4, a, 0.08); g.setTargetAtTime(0.85, b, 0.25); }
  g.setTargetAtTime(0, T.finalCut, 0.015);

  // фильтр музыки на замедлениях времени
  const mf = musicFilter.frequency;
  for (const [a, b] of [[T.slowStart, T.slowEnd], [T.spikesFire, T.snap]]) {
    mf.setTargetAtTime(420, a, 0.12); mf.setTargetAtTime(18000, b, 0.05);
  }

  // ---------- звуковые эффекты ----------
  for (const [t, n, gain, rate, pan] of CUES) {
    const s = ctx.createBufferSource(); s.buffer = sfx[n]; s.playbackRate.value = rate;
    const gg = ctx.createGain(); gg.gain.value = gain;
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    s.connect(gg); gg.connect(p); p.connect(sfxBus); s.start(Math.max(0, t));
  }

  // ---------- синтез ----------
  const noiseBuf = ctx.createBuffer(1, SR * 2, SR);
  { const d = noiseBuf.getChannelData(0); const R = rng(5); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; }
  const noise = (t0, dur, type, f, q, gain, dest, env = 'perc', f2) => {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t0); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    const gg = ctx.createGain();
    if (env === 'perc') { gg.gain.setValueAtTime(gain, t0); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); }
    else { gg.gain.setValueAtTime(0.0001, t0); gg.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.92); gg.gain.linearRampToValueAtTime(0, t0 + dur); }
    s.connect(fl); fl.connect(gg); gg.connect(dest); s.start(t0, MIXR() * 1.5); s.stop(t0 + dur + 0.05);
  };
  const osc = (t0, dur, type, f, gain, dest, o = {}) => {
    const s = ctx.createOscillator(); s.type = type; s.frequency.setValueAtTime(f, t0);
    if (o.f2) s.frequency.exponentialRampToValueAtTime(o.f2, t0 + (o.glide || dur));
    if (o.detune) s.detune.value = o.detune;
    const gg = ctx.createGain();
    const a = o.a ?? 0.005, r = o.r ?? dur * 0.8;
    gg.gain.setValueAtTime(0.0001, t0); gg.gain.exponentialRampToValueAtTime(gain, t0 + a);
    gg.gain.setValueAtTime(gain, Math.max(t0 + a, t0 + dur - r)); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = s;
    if (o.lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.lp, t0); if (o.lp2) fl.frequency.exponentialRampToValueAtTime(o.lp2, t0 + dur); fl.Q.value = o.q || 1; s.connect(fl); node = fl; }
    if (o.vib) { const l = ctx.createOscillator(); l.frequency.value = 5; const lg = ctx.createGain(); lg.gain.value = f * 0.008; l.connect(lg); lg.connect(s.frequency); l.start(t0); l.stop(t0 + dur); }
    node.connect(gg); gg.connect(dest); s.start(t0); s.stop(t0 + dur + 0.02);
  };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const kick = (t, gn = 0.9) => { osc(t, 0.35, 'sine', 120, gn, music, { f2: 38, glide: 0.12, r: 0.3 }); noise(t, 0.03, 'highpass', 3000, 0.7, gn * 0.3, music); };
  const taiko = (t, gn = 0.8) => { osc(t, 0.7, 'sine', 95, gn, music, { f2: 48, glide: 0.3, r: 0.6 }); noise(t, 0.25, 'bandpass', 220, 1.2, gn * 0.6, music); };
  const snare = (t, gn = 0.4) => { noise(t, 0.2, 'highpass', 1400, 0.8, gn, music); osc(t, 0.12, 'triangle', 190, gn * 0.5, music, { r: 0.1 }); };
  const hat = (t, gn = 0.1) => noise(t, 0.05, 'highpass', 7500, 0.8, gn, music);
  const pad = (t0, t1, notes, gn = 0.05, lp = 1400) => notes.forEach(m => [-8, 8].forEach(d => osc(t0, t1 - t0, 'sawtooth', hz(m), gn, music, { a: 1.2, r: 1.5, detune: d, lp })));
  const pluck = (t, m, gn = 0.12, lp = 2500) => osc(t, 0.9, 'triangle', hz(m), gn, music, { a: 0.003, r: 0.85, lp, lp2: 400 });
  const bass = (t, m, dur, gn = 0.16) => osc(t, dur, 'sawtooth', hz(m), gn, music, { a: 0.005, r: dur * 0.7, lp: 600, lp2: 180, q: 4 });
  const flute = (t, m, dur, gn = 0.07) => { osc(t, dur, 'sine', hz(m), gn, music, { a: 0.12, r: dur * 0.5, vib: true }); noise(t, dur, 'bandpass', hz(m) * 2, 6, gn * 0.25, music, 'swell'); };
  const braamSyn = (t, m = 26, gn = 0.22, dur = 2.8) => [0, 7, 12, 0.1].forEach((k, i) => osc(t, dur, 'sawtooth', hz(m + Math.floor(k)), gn, music, { a: 0.02, r: dur * 0.9, lp: 2200, lp2: 160, detune: i * 6 }));
  const riser = (t0, t1, gn = 0.12) => { noise(t0, t1 - t0, 'bandpass', 300, 1.5, gn, music, 'swell', 7000); osc(t0, t1 - t0, 'sawtooth', 110, gn * 0.4, music, { f2: 880, glide: t1 - t0, a: (t1 - t0) * 0.9, r: 0.05, lp: 3000 }); };
  const sub = (t0, t1, m, gn = 0.2) => osc(t0, t1 - t0, 'sine', hz(m), gn, music, { a: 1.5, r: 1.5 });

  // D-минор: D=50(D3) 38(D2) 26(D1)
  const Dm = [50, 53, 57], Bb = [46, 50, 53], F = [45, 48, 53], C = [48, 52, 55], Eb = [51, 55, 58];
  // 0–8: тихое пробуждение
  pad(0.2, 8.2, Dm, 0.035, 1100); sub(0.5, 8.1, 26, 0.08);
  [[1.0, 69], [2.0, 74], [3.4, 65], [4.4, 64], [5.8, 62], [6.6, 69]].forEach(([t, m]) => pluck(t, m, 0.09, 3200));
  riser(6.6, 8.05, 0.1);
  braamSyn(T.title1, 26, 0.18, 1.0);
  // 9–24: трансформация — нарастание
  sub(9.0, 24.0, 26, 0.16);
  pad(9.0, 13.0, Bb, 0.035, 900); pad(13.0, 17.0, Dm, 0.04, 1200); pad(17.0, 21.0, F, 0.045, 1600); pad(21.0, 24.0, Eb, 0.05, 2000);
  for (let t = 14.25, i = 0; t < 23.9; t += 0.25, i++) { if (t > 18.9 && t < 19.3) continue; bass(t, [38, 38, 41, 38, 45, 38, 41, 43][i % 8], 0.22, 0.09 + (t - 14) * 0.006); }
  taiko(T.posture, 0.8); taiko(T.glassCatch, 0.7); taiko(T.eyeCold, 0.9);
  for (let t = 20.2; t < 23.9; t += 0.5) hat(t, 0.06);
  riser(22.4, 24.0, 0.16);
  // 24–34: действие, 120 BPM
  const prog = [Dm, Bb, F, C];
  for (let bar = 0; bar < 5; bar++) {
    const t0 = 24 + bar * 2;
    pad(t0, t0 + 2.05, prog[bar % 4], 0.04, 2200);
    for (let k = 0; k < 4; k++) { const tb = t0 + k * 0.5; kick(tb, 0.75); hat(tb + 0.25, 0.08); hat(tb, 0.05); if (k % 2) snare(tb, 0.32); }
    [38, 38, 41, 38, 43, 38, 41, 40].forEach((m, k) => bass(t0 + k * 0.25, m + (bar % 4 === 1 ? -4 : bar % 4 === 2 ? -5 : bar % 4 === 3 ? -2 : 0), 0.22, 0.13));
  }
  braamSyn(T.dash, 26, 0.16, 1.4); taiko(T.dash, 1.0);
  braamSyn(T.land, 26, 0.18, 1.6); taiko(T.land, 1.0);
  for (let t = 33.4; t < 34.0; t += 0.0625) snare(t, 0.08 + (t - 33.4) * 0.5);
  braamSyn(T.punch1, 26, 0.24, 2.6); taiko(T.punch1, 1.0);
  // 34–39: тишина после удара → тревога
  pad(34.3, 39.0, [50, 51, 57], 0.035, 900); sub(35.5, 39.0, 27, 0.12);
  taiko(36.5, 0.5); taiko(37.5, 0.6); riser(37.9, 39.0, 0.14);
  // 39–44.8: тяжёлый бой (фригийский лад)
  braamSyn(39.0, 26, 0.2, 2.0);
  for (let t = 39.0; t < 44.75; t += 0.5) { kick(t, 0.7); if (Math.round((t - 39) * 2) % 2) snare(t, 0.3); }
  for (let t = 39.0, i = 0; t < 44.75; t += 0.25, i++) bass(t, [38, 39, 38, 38, 41, 39, 38, 36][i % 8], 0.22, 0.12);
  pad(39.0, 42.0, [50, 51, 55], 0.045, 1500); pad(42.0, 44.8, [46, 50, 51], 0.05, 1800);
  for (let t = 43.05; t < 44.75; t += 0.125) taiko(t, 0.25 + (t - 43) * 0.12);
  // 44.8–47.7: замедление — только гул
  sub(44.8, 47.9, 26, 0.18); pad(44.8, 47.8, [50, 57], 0.03, 600);
  riser(48.3, 49.4, 0.12);
  // 49.45–53: удар и полёт — двойной темп
  braamSyn(T.punch2, 26, 0.26, 2.8);
  for (let t = T.punch2; t < 53.0; t += 0.25) { kick(t, 0.55); hat(t + 0.125, 0.07); if (Math.round((t - T.punch2) * 4) % 4 === 2) snare(t, 0.32); }
  pad(T.punch2, 53.5, Dm, 0.05, 2400);
  taiko(T.crash, 1.0);
  // 53–57: разрешение
  pad(53.0, 57.2, Bb, 0.04, 1200); sub(53.0, 57.0, 26, 0.12);
  // 57–69.4: эпическая тема
  const prog2 = [Dm, Bb, F, C, Dm];
  prog2.forEach((ch, i) => pad(57 + i * 2.5, 57 + (i + 1) * 2.5 + 0.1, ch.concat([ch[0] - 12]), 0.04, 1500));
  sub(57.0, 69.5, 26, 0.12);
  [57.0, 59.7, 62.4, 65.6].forEach(t => taiko(t, 0.7));
  [[58.0, 69, 1.0], [59.0, 72, 0.6], [59.6, 74, 1.4], [61.1, 72, 0.6], [61.7, 69, 0.6], [62.3, 67, 1.2], [63.6, 65, 0.6], [64.2, 67, 0.6],
   [64.8, 69, 1.6], [66.5, 74, 0.8], [67.3, 77, 1.0], [68.3, 76, 0.5], [68.8, 74, 0.6]].forEach(([t, m, d]) => flute(t, m, d, 0.06));
  for (let t = 62.4; t < 69.4; t += 0.5) { hat(t + 0.25, 0.05); if (Math.round((t - 62.4) * 2) % 4 === 0) kick(t, 0.5); }
  // 69.4–73.9: замедление
  sub(69.4, 74.0, 26, 0.18); pad(69.4, 74.0, [50, 57, 62], 0.035, 700); riser(72.9, 73.9, 0.12);
  braamSyn(T.snap, 26, 0.2, 1.2); taiko(T.snap, 0.9);
  // 75–89.3: финал
  pad(75.0, 79.0, Dm, 0.04, 1400); pad(79.0, 83.0, Bb, 0.045, 1600); pad(83.0, 86.5, C, 0.05, 1900);
  sub(75.0, 89.3, 26, 0.12);
  [[75.6, 62], [76.6, 65], [77.6, 69], [79.6, 70], [80.6, 69], [81.6, 65], [83.6, 67], [84.6, 69], [85.4, 72]].forEach(([t, m]) => pluck(t, m, 0.09, 3000));
  for (let t = 83.0; t < 86.4; t += 0.5) { kick(t, 0.35 + (t - 83) * 0.1); hat(t + 0.25, 0.06); }
  riser(84.9, 86.45, 0.2);
  braamSyn(T.finalTitle, 26, 0.3, 2.9); taiko(T.finalTitle, 1.0); pad(T.finalTitle, 89.3, Dm.concat([38]), 0.06, 2600);
  for (let t = T.finalTitle; t < 89.2; t += 0.5) { kick(t, 0.6); if (Math.round((t - T.finalTitle) * 2) % 2) snare(t, 0.3); hat(t + 0.25, 0.08); }
  taiko(T.finalCut, 1.0);

  // эмбиент: комнатный шум, ветер на площадке, треск огня
  noise(0, 8.0, 'lowpass', 600, 0.5, 0.025, sfxBus, 'perc');
  [0.6, 1.3, 3.1, 4.9].forEach((t, i) => { for (let k = 0; k < 3; k++) osc(t + k * 0.09, 0.07, 'sine', 3200 + i * 300, 0.02, sfxBus, { f2: 4200, glide: 0.06, r: 0.05 }); });
  for (const [a, b, gn] of [[24, 39, 0.05], [39, 57, 0.07], [57, 75, 0.06], [75, 89.3, 0.06]]) {
    for (let t = a; t < b; t += 3) noise(t, 3.2, 'bandpass', 500 + (t * 37) % 400, 0.6, gn, sfxBus, 'swell');
  }
  for (let t = 75.2; t < 89.2; t += 0.13 + (Math.sin(t * 13) + 1) * 0.12) noise(t, 0.03, 'highpass', 2500, 0.6, 0.03, sfxBus);
  // шаги на площадке
  for (let t = 24.15; t < 27.6; t += 0.5) { osc(t, 0.12, 'sine', 90, 0.12, sfxBus, { f2: 50, glide: 0.08 }); noise(t, 0.08, 'bandpass', 1800, 1, 0.05, sfxBus); }

  return ctx.startRendering();
}

function toWav(buf) {
  const n = buf.length, ch = buf.numberOfChannels, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true); out.setUint32(24, buf.sampleRate, true);
  out.setUint32(28, buf.sampleRate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true);
  w(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const data = [...Array(ch)].map((_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, data[c][i])); out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return new Uint8Array(out.buffer);
}
