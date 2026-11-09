'use strict';
/* Базовые утилиты: математика, easing, детерминированный шум, цвета, пути. */
const W = 1920, H = 1080, FPS = 30;          // логическое пространство сцены
const OW = 1080, OH = 1920;                    // выходной кадр: вертикальный 9:16 для телефона
const TAU = Math.PI * 2, PI = Math.PI;
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const E = {
  lin: t => t,
  inQ: t => t * t, outQ: t => 1 - (1 - t) * (1 - t),
  ioQ: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inC: t => t * t * t, outC: t => 1 - Math.pow(1 - t, 3),
  ioC: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outE: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inE: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  ioE: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  ioS: t => -(Math.cos(PI * t) - 1) / 2,
  outS: t => Math.sin((t * PI) / 2), inS: t => 1 - Math.cos((t * PI) / 2),
  outB: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inB: t => { const c1 = 1.70158, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
  io5: t => (t < 0.5 ? 16 * Math.pow(t, 5) : 1 - Math.pow(-2 * t + 2, 5) / 2),
};
const seg = (t, a, b, ease = E.ioC) => ease(inv(a, b, t));
// «окно»: 0 → 1 (вход a..b) → 1 → 0 (выход c..d)
const win = (t, a, b, c, d, ease = E.ioS) => ease(inv(a, b, t)) * (1 - ease(inv(c, d, t)));

function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); }
function noise(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 91.7), hash(i + 1 + seed * 91.7), u) * 2 - 1;
}
const fbm = (x, seed = 0) => noise(x, seed) * 0.6 + noise(x * 2.13, seed + 3) * 0.28 + noise(x * 4.37, seed + 7) * 0.12;
function rng(seed) {
  let a = (seed * 2654435761) >>> 0 || 1;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Ключевые кадры: keys = [[t, value, easeIn?], ...]; value — число или объект чисел
function key(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (i < n - 1 && t > keys[i + 1][0]) i++;
  const [t0, v0] = keys[i], [t1, v1, ez] = keys[i + 1];
  const u = (ez || E.ioC)((t - t0) / (t1 - t0));
  if (typeof v0 === 'number') return lerp(v0, v1, u);
  const out = {};
  for (const k in v0) out[k] = typeof v0[k] === 'number' && typeof v1[k] === 'number' ? lerp(v0[k], v1[k], u) : v1[k] !== undefined ? v1[k] : v0[k];
  for (const k in v1) if (!(k in out)) out[k] = v1[k];
  return out;
}
function mixObj(a, b, u) {
  const o = {};
  for (const k in a) o[k] = typeof a[k] === 'number' && typeof b[k] === 'number' ? lerp(a[k], b[k], u) : (u < 0.5 ? a[k] : b[k] ?? a[k]);
  for (const k in b) if (!(k in o)) o[k] = b[k];
  return o;
}

// ---------- цвета ----------
const _cc = new Map();
function rgb(hex) {
  let c = _cc.get(hex);
  if (c) return c;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(x => x + x).join('');
  c = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  _cc.set(hex, c);
  return c;
}
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  const r = Math.round(lerp(A[0], B[0], t)), g = Math.round(lerp(A[1], B[1], t)), bl = Math.round(lerp(A[2], B[2], t));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
function rgba(hex, a) { const c = rgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
const darken = (c, t) => mix(c, '#000000', t);
const lighten = (c, t) => mix(c, '#ffffff', t);

// ---------- векторы ----------
const V = (x, y) => ({ x, y });
const vadd = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const vsub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const vmul = (a, s) => ({ x: a.x * s, y: a.y * s });
const vlen = a => Math.hypot(a.x, a.y);
const vnorm = a => { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; };
const vlerp = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
const vrot = (a, ang) => { const c = Math.cos(ang), s = Math.sin(ang); return { x: a.x * c - a.y * s, y: a.x * s + a.y * c }; };
const dirDown = a => ({ x: Math.sin(a), y: Math.cos(a) }); // 0 = вниз, + = вперёд (вправо)
const dirUp = a => ({ x: Math.sin(a), y: -Math.cos(a) });

// ---------- пути ----------
// Гладкий путь Catmull-Rom через точки [[x,y],...]
function smoothPath(pts, closed = true, tension = 0.5, path = new Path2D()) {
  const n = pts.length;
  if (n < 2) return path;
  const P = i => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
  path.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const k = tension / 3;
    path.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k,
      p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
  }
  if (closed) path.closePath();
  return path;
}
// Гладкий контур с острыми вершинами: точка [x, y, 1] — острый «кончик» пряди
function jagPath(pts, tension = 0.5, path = new Path2D()) {
  const out = [];
  for (const p of pts) { out.push([p[0], p[1]]); if (p[2]) out.push([p[0], p[1]]); }
  return smoothPath(out, true, tension, path);
}
function polyPath(pts, closed = true) {
  const p = new Path2D();
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
  if (closed) p.closePath();
  return p;
}
// Сужающаяся «капсула» конечности с выпуклостью мышц (bf — спереди, bb — сзади)
function capsule(p1, p2, r1, r2, bf = 1, bb = 1, path = new Path2D()) {
  const d = vnorm(vsub(p2, p1));
  const n = { x: -d.y, y: d.x };
  const a = Math.atan2(d.y, d.x);
  const m = vlerp(p1, p2, 0.42), rm = (r1 + r2) * 0.5;
  path.moveTo(p1.x + n.x * r1, p1.y + n.y * r1);
  path.quadraticCurveTo(m.x + n.x * rm * bf * 1.18, m.y + n.y * rm * bf * 1.18, p2.x + n.x * r2, p2.y + n.y * r2);
  path.arc(p2.x, p2.y, r2, a + PI / 2, a - PI / 2, true);
  path.quadraticCurveTo(m.x - n.x * rm * bb * 1.18, m.y - n.y * rm * bb * 1.18, p1.x - n.x * r1, p1.y - n.y * r1);
  path.arc(p1.x, p1.y, r1, a - PI / 2, a + PI / 2, true);
  path.closePath();
  return path;
}
// Заострённая «прядь»/шип: от корня к кончику с изгибом
function spike(root, tip, w, bend = 0, path = new Path2D()) {
  const d = vsub(tip, root), L = vlen(d);
  const n = { x: -d.y / L, y: d.x / L };
  const mid = vadd(vlerp(root, tip, 0.5), vmul(n, bend * L));
  path.moveTo(root.x + n.x * w, root.y + n.y * w);
  path.quadraticCurveTo(mid.x + n.x * w * 0.5, mid.y + n.y * w * 0.5, tip.x, tip.y);
  path.quadraticCurveTo(mid.x - n.x * w * 0.4, mid.y - n.y * w * 0.4, root.x - n.x * w, root.y - n.y * w);
  path.closePath();
  return path;
}

// ---------- кеш спрайтов ----------
const Sprites = {
  _c: new Map(),
  soft(color, r = 64, hard = 0) {
    const k = 'soft' + color + r + hard;
    let c = this._c.get(k);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = r * 2;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(r, r, r * hard, r, r, r);
    gr.addColorStop(0, rgba(color, 1));
    gr.addColorStop(0.45, rgba(color, 0.45));
    gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, r * 2, r * 2);
    this._c.set(k, c);
    return c;
  },
  // клуб дыма с неровным краем
  puff(color, seed = 1, r = 96) {
    const k = 'puff' + color + seed + r;
    let c = this._c.get(k);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = r * 2;
    const g = c.getContext('2d');
    const R = rng(seed);
    for (let i = 0; i < 14; i++) {
      const a = R() * TAU, d = R() * r * 0.45, rr = r * (0.28 + R() * 0.3);
      const x = r + Math.cos(a) * d, y = r + Math.sin(a) * d;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, rgba(color, 0.5));
      gr.addColorStop(0.6, rgba(color, 0.22));
      gr.addColorStop(1, rgba(color, 0));
      g.fillStyle = gr;
      g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
    }
    this._c.set(k, c);
    return c;
  },
};

function drawSprite(ctx, spr, x, y, size, alpha = 1, rot = 0) {
  if (alpha <= 0.002 || size <= 0.5) return;
  ctx.globalAlpha = alpha;
  if (rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.drawImage(spr, -size / 2, -size / 2, size, size);
    ctx.restore();
  } else ctx.drawImage(spr, x - size / 2, y - size / 2, size, size);
  ctx.globalAlpha = 1;
}

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
