'use strict';
/* Сел-шейдинг в духе аниме: базовый цвет, полутень со стороны от ключевого света,
   тонкий контровой свет (rim) и контур. Свет задаётся на кадр. */
const Light = {
  kx: 0.6, ky: -0.8,     // направление ключевого света (откуда светит)
  ko: 0.22,              // смещение тени в долях толщины детали
  rx: -0.9, ry: -0.3,    // направление контрового света
  ro: 0.08, rim: '#9fc4ff', rimA: 0.85,
  tint: null, tintA: 0,  // цветовой «окрас» всей фигуры (свет окружения)
  vol: 1,
  line: '#0a0a10',
};
const RENDER = { mode: 'normal' }; // 'normal' | 'sil' (силуэт) | 'impact' (чёрное на белом) | 'neg'
const SIL = { fill: '#07070b', rim: '#ff9a5a' };

function setLight(o) { Object.assign(Light, { kx: 0.6, ky: -0.8, ko: 0.22, rx: -0.9, ry: -0.3, ro: 0.08, rim: '#9fc4ff', rimA: 0.85, tint: null, tintA: 0, line: '#0a0a10', vol: 1 }, o); }

// m: {b: base, s: shade, o?: outline, w?: outline width, r?: rim color, size?: характерный размер}
function shadePath(ctx, path, m, size = 30) {
  const mode = RENDER.mode;
  if (mode === 'impact') {
    ctx.fillStyle = '#000'; ctx.fill(path);
    return;
  }
  if (mode === 'neg') {
    ctx.fillStyle = '#fff'; ctx.fill(path);
    return;
  }
  if (mode === 'sil') {
    ctx.fillStyle = SIL.fill; ctx.fill(path);
    if (SIL.rim) {
      ctx.save(); ctx.clip(path);
      ctx.fillStyle = SIL.rim; ctx.fill(path);
      const o = Math.max(1.5, size * 0.1);
      ctx.translate(-Light.rx * o, -Light.ry * o);
      ctx.fillStyle = SIL.fill; ctx.fill(path);
      ctx.restore();
    }
    return;
  }
  const base = Light.tint ? mix(m.b, Light.tint, Light.tintA) : m.b;
  const sh = Light.tint ? mix(m.s, Light.tint, Light.tintA * 0.6) : m.s;
  const o = size * Light.ko;
  const useRim = Light.rimA > 0 && m.rim !== false;
  const ro = useRim ? Math.max(1.2, size * Light.ro) : 0;
  ctx.save();
  ctx.clip(path);
  if (useRim) {
    // каёмка контрового света: всё, что не перекрыто сдвинутой от света копией
    ctx.fillStyle = mix(sh, m.r || Light.rim, Light.rimA);
    ctx.fill(path);
    ctx.translate(-Light.rx * ro, -Light.ry * ro);
  }
  ctx.fillStyle = sh;
  ctx.fill(path);
  ctx.translate(Light.kx * o, Light.ky * o);
  ctx.fillStyle = base;
  ctx.fill(path);
  if (m.hl) {
    ctx.translate(Light.kx * o * 1.2, Light.ky * o * 1.2);
    ctx.globalAlpha = 0.3; ctx.fillStyle = m.hl; ctx.fill(path); ctx.globalAlpha = 1;
  }
  ctx.restore();
  if (m.vol !== false && Light.vol > 0) {
    // объём: мягкое затемнение к краям формы (имитация окклюзии)
    ctx.save(); ctx.clip(path);
    ctx.strokeStyle = darken(sh, 0.35); ctx.lineJoin = 'round';
    for (const [k, a] of [[0.55, 0.07], [0.32, 0.08], [0.14, 0.1]]) {
      ctx.globalAlpha = a * Light.vol; ctx.lineWidth = size * k; ctx.stroke(path);
    }
    ctx.restore();
  }
  if (m.w) {
    ctx.lineWidth = m.w; ctx.strokeStyle = m.o || Light.line;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke(path);
  }
}

// Линии деталей (складки, мышцы) — исчезают в режимах силуэта
function detailStroke(ctx, path, color, w, alpha = 1) {
  if (RENDER.mode !== 'normal') return;
  ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = w;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke(path); ctx.globalAlpha = 1;
}
function detailFill(ctx, path, color, alpha = 1) {
  if (RENDER.mode !== 'normal') return;
  ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fill(path); ctx.globalAlpha = 1;
}
const isNormal = () => RENDER.mode === 'normal';
