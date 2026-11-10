// Entry point. The whole film is a pure function of time: frame(t) rebuilds the scene state for second t,
// which lets the page play in real time against the audio track AND be rendered frame-by-frame (?render).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { T, CAPS } from './timeline.js';
import { clamp, lerp, prog, smooth, easeInOut, easeOut, backOut, makeTextures, setMaxAniso } from './util.js';
import { buildWorld } from './world.js';
import { buildHouse, makeMaterials } from './house.js';
import { buildFortify } from './fortify.js';
import { buildSupplies } from './supplies.js';
import { buildHorde } from './horde.js';
import { buildCamera } from './camera.js';
import { Dust } from './fx.js';

const Q = new URLSearchParams(location.search);
const RENDER = Q.has('render');
const MOBILE = matchMedia('(pointer: coarse)').matches;
const LOW = Q.get('q') === 'low' || (MOBILE && Q.get('q') !== 'high');
const $ = id => document.getElementById(id);
const stage = $('stage'), canvas = $('c'), audio = $('audio');
if (RENDER) document.body.classList.add('render');

// ------------------------------------------------------------------ renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: RENDER });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
setMaxAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 9 / 16, 0.25, 4000);

const TX = makeTextures();
const M = makeMaterials(TX);
const W = buildWorld(scene, renderer, TX);
if (LOW) W.sun.shadow.mapSize.set(2048, 2048);
const dust = new Dust(TX.puff);
const H = buildHouse(scene, TX, M, T);
const F = buildFortify(scene, TX, M, T, W, dust);
const S = buildSupplies(scene, TX, M, T, H, dust);
const Hd = buildHorde(scene, T, S.sirenPos);
dust.build(scene);
const cam = buildCamera(camera, T, S, H);

// ------------------------------------------------------------------ post-processing
const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: LOW ? 0 : 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.55, 1.25);
composer.addPass(bloom);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uVig: { value: 0.5 }, uRewind: { value: 0 }, uTime: { value: 0 }, uSat: { value: 1.08 }, uFade: { value: 0 } },
  vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uVig, uRewind, uTime, uSat, uFade; varying vec2 vUv;
    void main(){
      vec2 uv = vUv; float rw = uRewind;
      uv.x += rw * (sin(uv.y * 80.0 + uTime * 70.0) * 0.012 + sin(uv.y * 7.0 + uTime * 31.0) * 0.012);
      vec3 c = vec3(texture2D(tDiffuse, uv + vec2(rw * 0.008, 0.0)).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - vec2(rw * 0.008, 0.0)).b);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      vec2 d = (vUv - 0.5) * vec2(0.92, 1.0);
      c *= 1.0 - uVig * smoothstep(0.32, 0.92, length(d));
      c = c * (1.0 - uFade) + rw * 0.22;
      gl_FragColor = vec4(c, 1.0);
    }`,
});
composer.addPass(grade);
composer.addPass(new OutputPass());

function resize() {
  let w, h;
  if (RENDER) { w = +(Q.get('w') || 1080); h = Math.round((w * 16) / 9); }
  else { h = innerHeight; w = Math.round((h * 9) / 16); if (w > innerWidth) { w = innerWidth; h = Math.round((w * 16) / 9); } }
  stage.style.setProperty('--u', w / 100 + 'px');
  const pr = RENDER ? 1 : Math.min(devicePixelRatio || 1, LOW ? 1.5 : 2, 1920 / h);
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
  composer.setPixelRatio(pr); composer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', () => { resize(); frame(now); });

// ------------------------------------------------------------------ time mapping
const HOOK_STORY = T.derzh + 0.3;
/** Video time -> story time. The cold open shows night 100, then everything rewinds to the empty house. */
function storyTime(t) {
  if (t < T.hookEnd) return HOOK_STORY + t * 0.3;
  if (t < T.rewindEnd) return lerp(HOOK_STORY + T.hookEnd * 0.3, T.rewindEnd, easeInOut(prog(t, T.hookEnd, T.rewindEnd)));
  return t;
}
/** Story time -> time of day (0 afternoon .. 1 night). */
function timeOfDay(st) {
  if (st < T.I) return lerp(0.02, 0.4, prog(st, T.rewindEnd, T.I));
  if (st < T.day1 + 0.3) return lerp(0.4, 1, smooth(prog(st, T.I, T.I + 1.75)));
  const lapse = prog(st, T.day1 + 0.3, T.day100 + 0.2);            // days flying by
  return lapse < 1 ? 1 - 0.52 * Math.pow(Math.sin(lapse * Math.PI * 2), 2) : 1;
}

// ------------------------------------------------------------------ the twist (basement light)
const KN = T.knocks || [T.voiceEnd + 0.35, T.voiceEnd + 0.8, T.voiceEnd + 1.25];
const T_OFF = KN[KN.length - 1] + 0.42, T_BLACK = T_OFF + 0.4;
const knockShake = KN.map(t => ({ t, a: 0.035 }));
let lastTwist = '';
function twist(t) {
  let k = 0, sx = null, eyes = 0;
  if (t >= T.svet && t < T_OFF) {
    const f = t - T.svet;
    k = f < 0.07 ? 1 : f < 0.16 ? 0.05 : f < 0.24 ? 0.9 : f < 0.3 ? 0.2 : f < 0.42 ? 1 : f < 0.47 ? 0.5 : 0.9 + 0.1 * Math.sin(t * 37) * Math.sin(t * 13.3);
    const pass = prog(t, T.avy + 0.3, T.avy + 1.45), back = prog(t, T.kto + 0.15, T.kto + 0.85);
    if (pass > 0 && pass < 1) sx = lerp(1.35, -1.35, pass);
    if (back > 0) { sx = lerp(-1.35, 0, easeOut(back)); eyes = smooth(prog(t, T.voiceEnd - 0.1, T.voiceEnd + 0.25)); }
  } else if (t >= T_OFF && t < T_BLACK) { k = 0; sx = 0; eyes = 1; }
  const key = k.toFixed(3) + '|' + (sx === null ? 'n' : sx.toFixed(3)) + '|' + eyes.toFixed(2);
  if (key !== lastTwist) { lastTwist = key; H.drawBasement(k, sx, eyes); }
}

// ------------------------------------------------------------------ HUD (DOM overlay, driven by time only)
const el = { timer: $('timer'), timerVal: $('timer').querySelector('.val'), day: $('day'), dayLbl: $('day').querySelector('.lbl'), dayVal: $('day').querySelector('.val'),
  step: $('step'), stepName: $('step').querySelector('.name'), pips: $('step').querySelector('.pips'), caps: $('caps'), flash: $('flash'), fade: $('fade'), alarm: $('alarm'), end: $('endcard'), bar: $('bar').firstElementChild };
const STEPS = [[T.C, 'ОКНА'], [T.D, 'ДВЕРЬ'], [T.E, 'СТЕНА'], [T.F, 'РОВ'], [T.G, 'СИРЕНА-ПРИМАНКА'], [T.H, 'ЗАПАСЫ']];
STEPS.forEach(() => el.pips.appendChild(document.createElement('i')));
const cache = {};
const setText = (node, key, v) => { if (cache[key] !== v) { cache[key] = v; node.textContent = v; } };
const setOp = (node, key, v) => { v = Math.round(v * 100) / 100; if (cache[key] !== v) { cache[key] = v; node.style.opacity = v; } };
const pad = n => String(n).padStart(2, '0');
let capIdx = -1, capSpans = [];
function hud(t) {
  // countdown
  const tv = smooth(prog(t, T.sutki - 0.15, T.sutki + 0.15)) * (1 - smooth(prog(t, T.orda - 0.35, T.orda - 0.1)));
  setOp(el.timer, 'to', tv);
  if (tv > 0) {
    const left = Math.max(0, 24 * 3600 * (1 - prog(t, T.sutki + 0.3, T.I + 0.2)));
    setText(el.timerVal, 'tt', `${pad(Math.floor(left / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(Math.floor(left % 60))}`);
    const zero = left <= 0;
    if (cache.tz !== zero) { cache.tz = zero; el.timer.classList.toggle('zero', zero); }
    el.timer.style.transform = `translateX(-50%) scale(${(zero ? 1 + 0.06 * Math.abs(Math.sin((t - T.I) * 9)) : lerp(0.8, 1, backOut(prog(t, T.sutki - 0.15, T.sutki + 0.15)))).toFixed(3)})`;
  }
  // day counter (cold open + siege)
  const dv = smooth(prog(t, 0.25, 0.5)) * (1 - smooth(prog(t, T.hookEnd - 0.25, T.hookEnd))) + smooth(prog(t, T.day1 - 0.05, T.day1 + 0.15)) * (1 - smooth(prog(t, T_OFF - 0.2, T_OFF)));
  setOp(el.day, 'do', dv);
  if (dv > 0) {
    const n = t < T.hookEnd ? 100 : Math.round(lerp(1, 100, easeInOut(prog(t, T.day1 + 0.45, T.day100 + 0.12))));
    setText(el.dayVal, 'dn', String(n)); setText(el.dayLbl, 'dl', t > T.J ? 'НОЧЬ' : 'ДЕНЬ');
  }
  // upgrade progress
  const sv = smooth(prog(t, T.C - 0.1, T.C + 0.15)) * (1 - smooth(prog(t, T.I - 0.3, T.I - 0.05)));
  setOp(el.step, 'so', sv);
  if (sv > 0) {
    let si = 0; for (let i = 0; i < STEPS.length; i++) if (t >= STEPS[i][0]) si = i;
    if (cache.si !== si) { cache.si = si; el.stepName.textContent = `${si + 1}/6 · ${STEPS[si][1]}`; [...el.pips.children].forEach((p, i) => { p.className = i < si ? 'done' : i === si ? 'on' : ''; }); }
    el.stepName.style.transform = `scale(${lerp(0.82, 1, backOut(prog(t, STEPS[si][0], STEPS[si][0] + 0.2))).toFixed(3)})`;
  }
  // captions
  let ci = -1;
  for (let i = 0; i < CAPS.length; i++) if (t >= CAPS[i].s && t < CAPS[i].e) { ci = i; break; }
  if (ci !== capIdx) {
    capIdx = ci; el.caps.textContent = ''; capSpans = [];
    if (ci >= 0) for (const w of CAPS[ci].w) { const s = document.createElement('span'); s.textContent = w.t; el.caps.appendChild(s); capSpans.push(s); }
  }
  if (ci >= 0) {
    const c = CAPS[ci];
    el.caps.style.transform = `scale(${lerp(0.84, 1, backOut(prog(t, c.s, c.s + 0.13), 2.2)).toFixed(3)})`;
    let act = 0; c.w.forEach((w, i) => { if (t >= w.s - 0.03) act = i; });
    if (cache.cw !== ci * 10 + act) { cache.cw = ci * 10 + act; capSpans.forEach((s, i) => { s.className = i === act ? 'on' : ''; }); }
  }
  // flashes / fades
  const rw = prog(t, T.hookEnd, T.rewindEnd);
  let fl = rw > 0 && rw < 1 ? Math.sin(rw * Math.PI) * 0.5 : 0;
  fl += 0.5 * (1 - prog(t, T.I + 1.05, T.I + 1.3)) * (t > T.I + 1.05 ? 1 : 0);         // floodlights snap on
  setOp(el.flash, 'fl', clamp(fl));
  const al = t > T.I && t < T.orda ? 0.5 * Math.pow(Math.sin(prog(t, T.I, T.I + 1.5) * Math.PI), 0.7) * (0.75 + 0.25 * Math.sin((t - T.I) * 18)) : 0;
  setOp(el.alarm, 'al', al);
  setOp(el.fade, 'fd', prog(t, T_BLACK, T_BLACK + 0.06));
  const ev = prog(t, T_BLACK + 0.12, T_BLACK + 0.45);
  setOp(el.end, 'ev', smooth(ev));
  if (ev > 0) el.end.style.transform = `scale(${lerp(0.9, 1, easeOut(ev)).toFixed(3)})`;
  if (!RENDER) el.bar.style.width = ((t / T.end) * 100).toFixed(2) + '%';
}

// ------------------------------------------------------------------ one frame
const lightCol = new THREE.Color();
let now = 0;
function frame(t) {
  t = clamp(t, 0, T.end); now = t;
  const st = storyTime(t);
  W.update(timeOfDay(st), t);
  const nk = W.nightK;
  H.update(st, nk, t); F.update(st, nk, t); S.update(st, nk, t);
  Hd.update(st, t); Hd.updateHolo(st, t);
  twist(t);
  cam.update(t, st, knockShake);
  W.followCamera(camera);
  dust.update(st, camera, renderer.domElement.height, lightCol.setRGB(1 - nk * 0.7, 1 - nk * 0.64, 1 - nk * 0.5));
  bloom.strength = lerp(0.16, 0.62, nk); bloom.threshold = lerp(1.6, 1.05, nk);
  const rw = prog(t, T.hookEnd, T.rewindEnd);
  grade.uniforms.uRewind.value = rw > 0 && rw < 1 ? Math.sin(rw * Math.PI) : 0;
  grade.uniforms.uTime.value = t;
  grade.uniforms.uVig.value = lerp(0.42, 0.62, nk);
  grade.uniforms.uFade.value = prog(t, T_BLACK, T_BLACK + 0.05);
  composer.render();
  hud(t);
}

// ------------------------------------------------------------------ boot
resize();
const fontsReady = document.fonts ? Promise.all([document.fonts.load('900 20px Montserrat', 'ДЕНЬ'), document.fonts.load('800 20px Montserrat', 'ДЕНЬ'), document.fonts.load('900 20px Montserrat', 'VS 100')]).catch(() => {}) : Promise.resolve();

if (RENDER) {
  // frame-by-frame capture API used by tools/render.mjs
  window.__ready = fontsReady.then(() => { frame(0); return true; });
  window.__frame = t => { frame(t); return true; };
  window.__info = () => ({ duration: T.end, calls: renderer.info.render.calls, tris: renderer.info.render.triangles });
} else {
  const start = $('start'), loading = $('loading');
  let playing = false, raf = 0, clock0 = 0, base = 0, useAudio = !Q.has('mute');
  const still = Q.has('t');
  const tick = () => {
    let t = useAudio ? audio.currentTime : base + (performance.now() - clock0) / 1000;
    if (t >= T.end - 0.02 || audio.ended) { frame(T.end); stop(true); return; }
    frame(t); raf = requestAnimationFrame(tick);
  };
  function play(from) {
    start.classList.add('hidden'); playing = true;
    if (from !== undefined) { base = from; if (useAudio) audio.currentTime = from; }
    clock0 = performance.now();
    if (useAudio) audio.play().catch(() => { useAudio = false; base = now; clock0 = performance.now(); });
    cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  }
  function stop(ended) { playing = false; cancelAnimationFrame(raf); audio.pause(); base = now; if (ended) { start.classList.remove('hidden'); base = 0; } }
  start.addEventListener('click', () => play(base >= T.end - 0.1 ? 0 : base));
  stage.addEventListener('click', e => { if (start.contains(e.target)) return; playing ? stop(false) : play(now); });
  addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); playing ? stop(false) : play(now >= T.end - 0.1 ? 0 : now); }
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { const t = clamp(now + (e.code === 'ArrowRight' ? 2 : -2), 0, T.end - 0.1); base = t; clock0 = performance.now(); if (useAudio) audio.currentTime = t; frame(t); }
  });
  fontsReady.then(() => {
    loading.classList.add('hidden');
    if (still) { start.classList.add('hidden'); base = +Q.get('t') || 0; frame(base); }
    else frame(3.9); // poster frame behind the play button
  });
  window.__frame = frame;
}
