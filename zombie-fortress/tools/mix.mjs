// Builds audio/mix.mp3: narration clips on the timeline + ElevenLabs sound effects + music.
import fs from 'fs'; import { execFileSync } from 'child_process';
const T = JSON.parse(fs.readFileSync('T.json')), cuts = JSON.parse(fs.readFileSync('cuts.json'));
const ev = []; // [file, at, volume, {from, dur, loop, fadeOut}]
const SFX_GAIN = 0.42; // effects sit well under the narration
const sfx = (n, at, v, o = {}) => ev.push([`raw/sfx/${n}.mp3`, at, v * SFX_GAIN, o]);
cuts.forEach(c => ev.push(['raw/voice_fit.mp3', c.at, 2.8, { from: c.a, dur: c.b - c.a, fade: 0.012 }]));
ev.push(['raw/music.mp3', 0, 0.075, { dur: 69.6, fadeOut: 1.2 }]);
sfx('horde_loop', 0, 0.22, { dur: T.hookEnd, fadeOut: 0.3 }); sfx('horde_bang', 0.15, 0.15);
sfx('rewind', T.hookEnd - 0.15, 0.8);
sfx('day_amb', T.rewindEnd, 0.22, { loop: true, dur: T.I - T.rewindEnd, fadeOut: 1 });
for (const t of [T.C, T.D, T.E, T.poetomu, T.G, T.H, T.krysha, T.dvor, T.J]) sfx('whoosh', t - 0.12, 0.35);
sfx('glass_break', T.break - 0.35, 0.7); sfx('glass_install', T.bronya - 0.15, 0.7); sfx('shutter', T.rolls + 0.05, 0.7, { dur: 1.0 }); sfx('shutter', T.rolls + 0.7, 0.5, { dur: 1.3 });
sfx('door_slam', T.steel + 0.15, 0.85); sfx('bolts', T.bolts, 0.8); sfx('bar', T.bar + 0.1, 0.7);
sfx('slabs', T.tri + 0.3, 0.9); sfx('wire', T.spiral, 0.6);
sfx('dig', T.rov - 0.3, 0.8); sfx('stakes', T.kolya - 0.1, 0.7); sfx('bridge', T.most, 0.7, { dur: 1.9 });
sfx('siren', T.sirena + 0.1, 0.3, { dur: 3.3, fadeOut: 0.5 });
sfx('solar', T.paneli - 0.4, 0.7); sfx('water', T.bak, 0.55, { dur: 1.4, fadeOut: 0.3 }); sfx('grow', T.gryadki - 0.1, 0.7);
sfx('tick', T.I - 2.8, 0.35, { dur: 2.8 }); sfx('boom', T.I, 0.9); sfx('riser', T.orda - 1.9, 0.45, { dur: 1.9 }); sfx('boom', T.uperlas + 0.25, 0.6);
sfx('horde_loop', T.orda - 0.3, 0.42, { loop: true, dur: T.J - T.orda + 0.3, fadeOut: 1.2 });
sfx('horde_loop', T.J - 1.0, 0.1, { loop: true, dur: 8.2, fadeOut: 0.6 });
sfx('night_amb', T.I + 1.2, 0.3, { loop: true, dur: 69.2 - T.I - 1.2, fadeOut: 0.5 });
sfx('drone_end', T.J, 0.4); sfx('light_flick', T.svet - 0.05, 0.7); sfx('knock', T.voiceEnd + 0.25, 2.4, { dur: 0.8, fadeOut: 0.08 }); sfx('boom', T.voiceEnd + 1.67, 0.5, { dur: 1.2, fadeOut: 0.5 });
const args = ['-loglevel', 'error', '-y'], f = [];
ev.forEach(([file, at, v, o], i) => {
  if (o.loop) args.push('-stream_loop', '-1'); args.push('-i', file);
  let c = `[${i}:a]aresample=44100,aformat=channel_layouts=stereo`;
  if (o.from !== undefined || o.dur) c += `,atrim=${o.from || 0}:${(o.from || 0) + (o.dur || 999)},asetpts=PTS-STARTPTS`;
  if (o.fade) c += `,afade=t=in:d=${o.fade},afade=t=out:st=${o.dur - o.fade}:d=${o.fade}`;
  if (o.fadeOut) c += `,afade=t=out:st=${Math.max(0, o.dur - o.fadeOut)}:d=${o.fadeOut}`;
  c += `,volume=${v},adelay=${Math.round(at * 1000)}:all=1[a${i}]`; f.push(c);
});
f.push(`${ev.map((_, i) => `[a${i}]`).join('')}amix=inputs=${ev.length}:normalize=0:duration=longest,apad,atrim=0:70,alimiter=limit=0.89,loudnorm=I=-14:TP=-1.2:LRA=11[out]`);
execFileSync('ffmpeg', [...args, '-filter_complex', f.join(';'), '-map', '[out]', '-ar', '44100', '-b:a', '192k', '../audio/mix.mp3']);
