// Shared helpers: easing, seeded RNG, procedural canvas textures, small geometry utilities.
import * as THREE from 'three';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
/** Linear progress of t through [a, b], clamped to 0..1. */
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = x => x * x * (3 - 2 * x);
export const easeOut = x => 1 - Math.pow(1 - x, 3);
export const easeOut5 = x => 1 - Math.pow(1 - x, 5);
export const easeIn = x => x * x * x;
export const easeIn2 = x => x * x;
export const easeInOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const backOut = (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
export function bounceOut(x) {
  const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}
/** Damped "drop and settle": 0 -> 1 with one small overshoot bounce. */
export const settle = x => (x >= 1 ? 1 : 1 - Math.pow(1 - x, 2) * Math.cos(x * Math.PI * 1.5) * (1 - x * 0.2));

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash1 = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** Smooth 2D value noise in 0..1 (deterministic). */
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}
export const fbm = (x, y, o = 4) => { let a = 0.5, f = 1, s = 0, n = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); n += a; a *= 0.5; f *= 2.03; } return s / n; };

// ---------------------------------------------------------------- canvas textures
let MAX_ANISO = 8;
export const setMaxAniso = v => { MAX_ANISO = v; };

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function tex(c, { srgb = true, repeat = [1, 1] } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = MAX_ANISO;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Tileable normal map from a greyscale height canvas. */
export function normalFromHeight(hc, strength = 2) {
  const w = hc.width, h = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = canvas(w, h), ctx = out.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

function speckle(ctx, w, h, rnd, n, colors, minR, maxR, alpha) {
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = alpha * (0.4 + rnd() * 0.6);
    ctx.fillStyle = colors[(rnd() * colors.length) | 0];
    const r = minR + rnd() * (maxR - minR), x = rnd() * w, y = rnd() * h;
    for (const ox of [0, -w, w]) for (const oy of [0, -h, h]) { ctx.beginPath(); ctx.arc(x + ox, y + oy, r, 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}

/** Returns { map, normalMap } builders for all surface types used in the scene. */
export function makeTextures() {
  const R = mulberry32(7);
  const T = {};

  // --- lap siding: 5 boards per metre vertically, tile = 2 m x 1 m
  {
    const w = 512, h = 256, c = canvas(w, h), x = c.getContext('2d'), hc = canvas(w, h), hx = hc.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
    const bh = h / 5;
    for (let i = 0; i < 5; i++) {
      const y = i * bh, v = 236 + R() * 14;
      x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(0, y, w, bh);
      for (let k = 0; k < 26; k++) { x.globalAlpha = 0.05; x.fillStyle = R() > 0.5 ? '#000' : '#fff'; x.fillRect(0, y + R() * bh, w, 1); }
      x.globalAlpha = 1;
      const g = x.createLinearGradient(0, y + bh - 9, 0, y + bh); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.7, 'rgba(0,0,0,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0.42)');
      x.fillStyle = g; x.fillRect(0, y + bh - 9, w, 9);
      const hg = hx.createLinearGradient(0, y, 0, y + bh); hg.addColorStop(0, '#404040'); hg.addColorStop(0.9, '#f0f0f0'); hg.addColorStop(1, '#fff');
      hx.fillStyle = hg; hx.fillRect(0, y, w, bh);
      const jx = R() * w; x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(jx, y, 1.5, bh - 2); hx.fillStyle = '#303030'; hx.fillRect(jx, y, 2, bh);
    }
    T.siding = { map: tex(c, { repeat: [0.5, 1] }), normalMap: tex(normalFromHeight(hc, 3.2), { srgb: false, repeat: [0.5, 1] }) };
  }

  // --- roof shingles: tile 1.2 m x 0.9 m, 3 offset rows
  {
    const w = 512, h = 384, c = canvas(w, h), x = c.getContext('2d'), hc = canvas(w, h), hx = hc.getContext('2d');
    const rows = 3, cols = 4, rh = h / rows, cw = w / cols;
    for (let r = 0; r < rows; r++) for (let k = -1; k <= cols; k++) {
      const px = k * cw + (r % 2) * cw / 2, py = r * rh, v = 0.82 + R() * 0.3;
      x.fillStyle = `rgb(${(70 * v) | 0},${(80 * v) | 0},${(98 * v) | 0})`; x.fillRect(px, py, cw - 2, rh);
      const g = x.createLinearGradient(0, py, 0, py + rh); g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(0.18, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(255,255,255,0.08)');
      x.fillStyle = g; x.fillRect(px, py, cw - 2, rh);
      x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(px + cw - 2, py, 2, rh);
      const hg = hx.createLinearGradient(0, py, 0, py + rh); hg.addColorStop(0, '#202020'); hg.addColorStop(0.15, '#909090'); hg.addColorStop(1, '#ffffff');
      hx.fillStyle = hg; hx.fillRect(px, py, cw - 2, rh); hx.fillStyle = '#101010'; hx.fillRect(px + cw - 2, py, 2, rh);
    }
    speckle(x, w, h, R, 2500, ['#000', '#9aa6bd'], 0.5, 1.4, 0.16);
    T.shingles = { map: tex(c), normalMap: tex(normalFromHeight(hc, 2.4), { srgb: false }) };
  }

  // --- brick: tile 1 m x 1 m, 8 courses
  {
    const w = 512, h = 512, c = canvas(w, h), x = c.getContext('2d'), hc = canvas(w, h), hx = hc.getContext('2d');
    x.fillStyle = '#b9b0a2'; x.fillRect(0, 0, w, h); hx.fillStyle = '#303030'; hx.fillRect(0, 0, w, h);
    const rows = 8, cols = 4, rh = h / rows, cw = w / cols;
    for (let r = 0; r < rows; r++) for (let k = -1; k <= cols; k++) {
      const px = k * cw + (r % 2) * cw / 2 + 3, py = r * rh + 3, v = 0.8 + R() * 0.35;
      x.fillStyle = `rgb(${(168 * v) | 0},${(84 * v) | 0},${(62 * v) | 0})`; x.fillRect(px, py, cw - 6, rh - 6);
      hx.fillStyle = '#e8e8e8'; hx.fillRect(px, py, cw - 6, rh - 6);
    }
    speckle(x, w, h, R, 3000, ['#000', '#e2b9a0'], 0.5, 1.6, 0.12); speckle(hx, w, h, R, 2000, ['#000', '#fff'], 0.5, 1.5, 0.1);
    T.brick = { map: tex(c), normalMap: tex(normalFromHeight(hc, 2.5), { srgb: false }) };
  }

  // --- concrete (formwork lines + pores), tile 2 m
  {
    const w = 512, h = 512, c = canvas(w, h), x = c.getContext('2d'), hc = canvas(w, h), hx = hc.getContext('2d');
    x.fillStyle = '#b7b5ae'; x.fillRect(0, 0, w, h); hx.fillStyle = '#b0b0b0'; hx.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { x.globalAlpha = 0.07; x.fillStyle = R() > 0.5 ? '#6f6c66' : '#e3e1da'; const y = R() * h, hh = 6 + R() * 50; x.fillRect(0, y, w, hh); x.fillRect(0, y - h, w, hh); }
    x.globalAlpha = 1;
    speckle(x, w, h, R, 5000, ['#55524d', '#dedcd4'], 0.4, 1.8, 0.2); speckle(hx, w, h, R, 1500, ['#000'], 0.6, 2.2, 0.5);
    for (let i = 0; i < 26; i++) { x.globalAlpha = 0.16; x.strokeStyle = '#3c3a36'; x.lineWidth = 1; x.beginPath(); let px = R() * w, py = R() * h; x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (R() - 0.5) * 40; py += R() * 46; x.lineTo(px, py); } x.stroke(); }
    x.globalAlpha = 1;
    T.concrete = { map: tex(c), normalMap: tex(normalFromHeight(hc, 1.6), { srgb: false }) };
  }

  // --- wood planks (vertical boards, 4 per tile)
  {
    const w = 512, h = 512, c = canvas(w, h), x = c.getContext('2d'), hc = canvas(w, h), hx = hc.getContext('2d');
    const n = 4, bw = w / n;
    for (let i = 0; i < n; i++) {
      const v = 0.85 + R() * 0.25;
      x.fillStyle = `rgb(${(214 * v) | 0},${(196 * v) | 0},${(170 * v) | 0})`; x.fillRect(i * bw, 0, bw, h); hx.fillStyle = '#d0d0d0'; hx.fillRect(i * bw, 0, bw, h);
      for (let k = 0; k < 46; k++) { x.globalAlpha = 0.10 + R() * 0.12; x.strokeStyle = R() > 0.4 ? '#7a6248' : '#f4e7d2'; x.lineWidth = 0.6 + R() * 1.4; const px = i * bw + R() * bw; x.beginPath(); x.moveTo(px, 0); x.bezierCurveTo(px + (R() - 0.5) * 10, h * 0.33, px + (R() - 0.5) * 10, h * 0.66, px, h); x.stroke(); }
      x.globalAlpha = 1; x.fillStyle = 'rgba(40,26,14,0.75)'; x.fillRect(i * bw, 0, 2.5, h); hx.fillStyle = '#000'; hx.fillRect(i * bw, 0, 3, h);
    }
    T.wood = { map: tex(c), normalMap: tex(normalFromHeight(hc, 2), { srgb: false }) };
  }

  // --- grass, tile 6 m
  {
    const w = 1024, h = 1024, c = canvas(w, h), x = c.getContext('2d');
    x.fillStyle = '#6f9a45'; x.fillRect(0, 0, w, h);
    speckle(x, w, h, R, 900, ['#5f8a3a', '#7faa50', '#86ad58', '#587f38'], 18, 60, 0.18);
    for (let i = 0; i < 26000; i++) {
      x.globalAlpha = 0.25 + R() * 0.4; x.strokeStyle = ['#4f7a30', '#86b455', '#9cc566', '#3f6a2a', '#6f9f44'][(R() * 5) | 0]; x.lineWidth = 0.8 + R();
      const px = R() * w, py = R() * h, l = 3 + R() * 6, a = -Math.PI / 2 + (R() - 0.5) * 1.2;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
    }
    x.globalAlpha = 1;
    T.grass = { map: tex(c, { repeat: [1 / 6, 1 / 6] }) };
  }

  // --- dirt / soil, tile 3 m
  {
    const w = 512, h = 512, c = canvas(w, h), x = c.getContext('2d'), hc = canvas(w, h), hx = hc.getContext('2d');
    x.fillStyle = '#6b4d35'; x.fillRect(0, 0, w, h); hx.fillStyle = '#808080'; hx.fillRect(0, 0, w, h);
    speckle(x, w, h, R, 500, ['#5a3f2b', '#7b5a3f', '#4c3525'], 10, 40, 0.25);
    speckle(x, w, h, R, 5000, ['#3f2c1f', '#8d6a4b', '#a08366'], 0.6, 2.6, 0.5); speckle(hx, w, h, R, 2600, ['#000', '#fff'], 1, 4, 0.5);
    T.dirt = { map: tex(c, { repeat: [1 / 3, 1 / 3] }), normalMap: tex(normalFromHeight(hc, 2), { srgb: false, repeat: [1 / 3, 1 / 3] }) };
  }

  // --- asphalt, tile 4 m
  {
    const w = 512, h = 512, c = canvas(w, h), x = c.getContext('2d');
    x.fillStyle = '#3d3f43'; x.fillRect(0, 0, w, h);
    speckle(x, w, h, R, 9000, ['#2b2c30', '#55575c', '#6a6c70'], 0.4, 1.5, 0.5);
    T.asphalt = { map: tex(c, { repeat: [1 / 4, 1 / 4] }) };
  }

  // --- galvanised steel slats (horizontal ribs), 1 tile = one slat
  {
    const w = 64, h = 64, hc = canvas(w, h), hx = hc.getContext('2d');
    const g = hx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#202020'); g.addColorStop(0.2, '#e0e0e0'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(0.8, '#e0e0e0'); g.addColorStop(1, '#202020');
    hx.fillStyle = g; hx.fillRect(0, 0, w, h);
    T.slat = { normalMap: tex(normalFromHeight(hc, 3), { srgb: false }) };
  }

  // --- solar panel cells: 6 x 10 cells
  {
    const w = 384, h = 640, c = canvas(w, h), x = c.getContext('2d');
    x.fillStyle = '#c9ced6'; x.fillRect(0, 0, w, h);
    const cw = w / 6, ch = h / 10;
    for (let i = 0; i < 6; i++) for (let j = 0; j < 10; j++) {
      const g = x.createLinearGradient(i * cw, j * ch, (i + 1) * cw, (j + 1) * ch); g.addColorStop(0, '#16284e'); g.addColorStop(1, '#0c1a38');
      x.fillStyle = g; x.fillRect(i * cw + 2, j * ch + 2, cw - 4, ch - 4);
      x.strokeStyle = 'rgba(190,205,230,0.5)'; x.lineWidth = 1;
      for (const f of [0.33, 0.66]) { x.beginPath(); x.moveTo(i * cw + cw * f, j * ch + 2); x.lineTo(i * cw + cw * f, (j + 1) * ch - 2); x.stroke(); }
    }
    const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; T.solar = { map: t };
  }

  // --- stone paving, tile 2 m
  {
    const w = 512, h = 512, c = canvas(w, h), x = c.getContext('2d'), hc = canvas(w, h), hx = hc.getContext('2d');
    x.fillStyle = '#6a665e'; x.fillRect(0, 0, w, h); hx.fillStyle = '#000'; hx.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = 0.85 + R() * 0.25; x.fillStyle = `rgb(${(176 * v) | 0},${(170 * v) | 0},${(158 * v) | 0})`;
      const off = (j % 2) * s / 2;
      for (const ox of [0, -w]) { x.fillRect(i * s + off + 4 + ox, j * s + 4, s - 8, s - 8); hx.fillStyle = '#fff'; hx.fillRect(i * s + off + 4 + ox, j * s + 4, s - 8, s - 8); }
    }
    speckle(x, w, h, R, 3000, ['#000', '#fff'], 0.5, 1.6, 0.08);
    T.paving = { map: tex(c, { repeat: [0.5, 0.5] }), normalMap: tex(normalFromHeight(hc, 2), { srgb: false, repeat: [0.5, 0.5] }) };
  }

  // --- soft round sprite for dust
  {
    const c = canvas(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    T.puff = new THREE.CanvasTexture(c);
  }
  return T;
}

// ---------------------------------------------------------------- geometry helpers
/** Box with its origin moved (ax, ay, az in -0.5..0.5 of the size), handy for hinges and "grow from base". */
export function boxGeo(w, h, d, ax = 0, ay = 0, az = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(-ax * w, -ay * h, -az * d);
  return g;
}

/** Overwrites UVs with world-space planar coordinates (metres) picked per face normal. Call after baking transforms. */
export function worldUV(g, scale = 1) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    if (ny >= nx && ny >= nz) uv.setXY(i, p.getX(i) * scale, p.getZ(i) * scale);
    else if (nx >= nz) uv.setXY(i, p.getZ(i) * scale, p.getY(i) * scale);
    else uv.setXY(i, p.getX(i) * scale, p.getY(i) * scale);
  }
  uv.needsUpdate = true;
  return g;
}

export function mesh(geo, mat, { cast = true, receive = true, pos, rot, name } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast; m.receiveShadow = receive;
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  if (name) m.name = name;
  return m;
}

/** Shows/hides an object only when the flag changes (cheap to call every frame). */
export function setVisible(o, v) { if (o.visible !== v) o.visible = v; }
