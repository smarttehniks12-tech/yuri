'use strict';
/* Окружение: 2.5D-камера для площадки, небо, постройки, земля, столбы, деревья, спальня. */

// ---------- 2.5D камера ----------
// Мир: X вправо, Y вверх, Z вглубь. Земля Y=0. Камера смотрит вдоль +Z.
function makeCam(o) {
  const c = Object.assign({ x: 0, y: 300, z: -2500, f: 1400, hy: H * 0.5, roll: 0, cx: W / 2 }, o);
  c.P = (X, Y, Z) => {
    const d = Z - c.z;
    if (d < 20) return null;
    const s = c.f / d;
    return { x: c.cx + (X - c.x) * s, y: c.hy + (c.y - Y) * s, s, d };
  };
  return c;
}
function withCam(ctx, cam, fn) {
  ctx.save();
  if (cam.roll) { ctx.translate(W / 2, H / 2); ctx.rotate(cam.roll); ctx.translate(-W / 2, -H / 2); }
  fn();
  ctx.restore();
}

// ---------- палитры времени суток ----------
const SKY = {
  day: { top: '#5f8fc4', mid: '#a9c6df', hor: '#f3dfc2', sun: '#fff1cf', ground: '#bfae93', groundFar: '#d9cbb1', haze: '#e9dcc6', fog: 0.25, amb: '#fff4e0', hill: '#7f8fa0', tree: '#3c5a3e' },
  ominous: { top: '#1a0f24', mid: '#4a1f3c', hor: '#b2443a', sun: '#ff7b4a', ground: '#4f3d42', groundFar: '#6b4547', haze: '#8a3c40', fog: 0.35, amb: '#ff9a8a', hill: '#2a1828', tree: '#1e1622' },
  night: { top: '#06101a', mid: '#0f2633', hor: '#24505a', sun: '#bfe8ff', ground: '#25333a', groundFar: '#2d4148', haze: '#1f3c46', fog: 0.4, amb: '#9fd8ff', hill: '#0c1a22', tree: '#0a1519' },
  sunset: { top: '#2a1630', mid: '#8b2f3a', hor: '#ff8a3d', sun: '#ffd27a', ground: '#4a3434', groundFar: '#7a4a3a', haze: '#ff7a45', fog: 0.45, amb: '#ffb27a', hill: '#3a1a28', tree: '#26121c' },
};
function skyMix(a, b, t) {
  const A = SKY[a], B = SKY[b], o = {};
  for (const k in A) o[k] = typeof A[k] === 'number' ? lerp(A[k], B[k], t) : mix(A[k], B[k], t);
  return o;
}

function drawSky(ctx, pal, hy, t, o = {}) {
  const g = ctx.createLinearGradient(0, hy - H * 1.2, 0, hy + 40);
  g.addColorStop(0, pal.top); g.addColorStop(0.55, pal.mid); g.addColorStop(1, pal.hor);
  ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400);
  // солнце/луна
  if (o.sun !== false) {
    const sx = o.sunX ?? W * 0.72, sy = o.sunY ?? hy - 160, sr = o.sunR ?? 70;
    drawSprite(ctx, Sprites.soft(pal.sun, 128), sx, sy, sr * 9, 0.35);
    drawSprite(ctx, Sprites.soft(pal.sun, 128), sx, sy, sr * 3.2, 0.7);
    ctx.fillStyle = lighten(pal.sun, 0.4); ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.fill();
  }
  // облака — вытянутые мягкие слои с параллаксом
  const R = rng(o.seed || 3);
  const n = o.clouds ?? 9;
  for (let i = 0; i < n; i++) {
    const depth = 0.3 + R() * 0.7;
    const x = ((R() * 2600 + t * 14 * depth + (o.par || 0) * depth) % 2800) - 400;
    const y = hy - 120 - R() * 520 * depth;
    const w = 380 + R() * 520, h = 60 + R() * 70;
    const col = mix(pal.mid, pal.hor, 0.4 + R() * 0.4);
    for (let k = 0; k < 6; k++) {
      const px = x + (k - 2.5) * w * 0.17 + R() * 30, py = y + (R() - 0.5) * h * 0.5;
      ctx.save(); ctx.translate(px, py); ctx.scale(1, 0.38);
      drawSprite(ctx, Sprites.puff(col, 5 + (i % 4)), 0, 0, w * 0.55, 0.5 * (o.cloudA ?? 1));
      ctx.restore();
    }
  }
}

// дальние холмы/лес — силуэты
function drawHills(ctx, cam, pal, seed = 1) {
  const R = rng(seed);
  for (let layer = 0; layer < 2; layer++) {
    const Z = 26000 + layer * -9000;
    const col = mix(pal.hill, pal.haze, layer ? 0.35 : 0.6);
    ctx.fillStyle = col;
    ctx.beginPath();
    const p0 = cam.P(-60000, 0, Z);
    ctx.moveTo(-100, H + 400);
    for (let i = 0; i <= 60; i++) {
      const X = -40000 + i * 1400;
      const hgt = 1800 + Math.abs(noise(i * 0.35 + layer * 9, seed)) * 3600 + R() * 400;
      const p = cam.P(X, hgt, Z);
      if (p) ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(W + 100, H + 400);
    ctx.closePath(); ctx.fill();
  }
}

// земля: плитка с перспективой, пятна, трещины
function drawGround(ctx, cam, pal, o = {}) {
  const hz = cam.hy + cam.y * (cam.f / 1e6);
  const g = ctx.createLinearGradient(0, cam.hy, 0, H + 200);
  g.addColorStop(0, pal.groundFar); g.addColorStop(0.25, pal.ground); g.addColorStop(1, darken(pal.ground, 0.25));
  ctx.fillStyle = g;
  ctx.fillRect(-300, cam.hy - 2, W + 600, H * 2);
  // каменные плиты
  const step = 520;
  ctx.lineWidth = 1.5;
  const zMin = cam.z + 120, zMax = cam.z + 30000;
  const lineCol = darken(pal.ground, 0.35);
  ctx.strokeStyle = lineCol;
  for (let Z = Math.ceil(zMin / step) * step; Z < Math.min(zMax, o.zMax || 1e9); Z += step) {
    const a = cam.P(cam.x - 40000, 0, Z), b = cam.P(cam.x + 40000, 0, Z);
    if (!a) continue;
    const fade = clamp(1 - (Z - cam.z) / 16000);
    ctx.globalAlpha = 0.45 * fade;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  const x0 = Math.floor((cam.x - 12000) / step) * step;
  for (let X = x0; X < cam.x + 12000; X += step) {
    const a = cam.P(X, 0, zMin), b = cam.P(X, 0, cam.z + 16000);
    if (!a || !b) continue;
    ctx.globalAlpha = 0.32;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // пятна и камешки (детерминированно)
  const R = rng(o.seed || 11);
  for (let i = 0; i < 160; i++) {
    const X = (R() - 0.5) * 16000, Z = R() * 14000;
    const p = cam.P(X, 0, Z);
    if (!p || p.y > H + 50 || p.x < -100 || p.x > W + 100) { R(); continue; }
    const r = (30 + R() * 90) * p.s;
    ctx.fillStyle = rgba(R() > 0.5 ? darken(pal.ground, 0.25) : lighten(pal.ground, 0.15), 0.35);
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 2, r * 0.5, 0, 0, TAU); ctx.fill();
  }
  // дымка у горизонта
  const hg = ctx.createLinearGradient(0, cam.hy - 120, 0, cam.hy + 160);
  hg.addColorStop(0, rgba(pal.haze, 0)); hg.addColorStop(0.5, rgba(pal.haze, pal.fog)); hg.addColorStop(1, rgba(pal.haze, 0));
  ctx.fillStyle = hg; ctx.fillRect(-300, cam.hy - 120, W + 600, 280);
}

// трещины на земле из точки удара
function drawCracks(ctx, cam, X, Z, size, prog, seed = 1, color = '#120d0c') {
  if (prog <= 0) return;
  const R = rng(seed);
  ctx.save(); ctx.globalAlpha = 0.75;
  ctx.strokeStyle = color; ctx.lineCap = 'round';
  const n = 9;
  for (let i = 0; i < n; i++) {
    let a = (i / n) * TAU + R() * 0.5;
    let x = X, z = Z;
    const len = size * (0.5 + R() * 0.7) * prog;
    const segs = 5;
    let p0 = cam.P(x, 0, z);
    for (let k = 0; k < segs; k++) {
      a += (R() - 0.5) * 0.8;
      const l = len / segs;
      x += Math.cos(a) * l; z += Math.sin(a) * l;
      const p1 = cam.P(x, 0, z);
      if (!p0 || !p1) break;
      ctx.lineWidth = Math.min(9, Math.max(1, (segs - k) * 2.2 * p1.s * 5));
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      p0 = p1;
    }
  }
  // кратер
  const c = cam.P(X, 0, Z);
  if (c) {
    ctx.fillStyle = rgba(color, 0.55);
    ctx.beginPath(); ctx.ellipse(c.x, c.y, size * 0.32 * c.s * prog, size * 0.08 * c.s * prog, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// японская постройка: фасад + изогнутая черепичная крыша
function drawBuilding(ctx, cam, b, pal, t = 0) {
  const { X, Z, w, h } = b;
  const L = cam.P(X - w / 2, 0, Z), Rr = cam.P(X + w / 2, 0, Z), T = cam.P(X - w / 2, h, Z);
  if (!L || !Rr) return;
  const s = L.s;
  if (Rr.x < -400 || L.x > W + 400) return;
  const top = T.y, x0 = L.x, x1 = Rr.x, y0 = L.y;
  const fog = clamp((Z - cam.z) / 30000) * 0.8 + (b.fog || 0);
  const wall = mix(b.wall || '#d9d0bf', pal.haze, fog);
  const wood = mix('#4b3022', pal.haze, fog * 0.8);
  const roof = mix('#2b2a30', pal.haze, fog * 0.7);
  // стена
  ctx.fillStyle = wall; ctx.fillRect(x0, top, x1 - x0, y0 - top);
  // тень под карнизом
  const sh = ctx.createLinearGradient(0, top, 0, top + 140 * s * 3);
  sh.addColorStop(0, rgba('#000000', 0.35)); sh.addColorStop(1, rgba('#000000', 0));
  ctx.fillStyle = sh; ctx.fillRect(x0, top, x1 - x0, 140 * s * 3);
  // балки
  ctx.fillStyle = wood;
  const nb = Math.max(2, Math.round(w / 700));
  for (let i = 0; i <= nb; i++) { const x = lerp(x0, x1, i / nb); ctx.fillRect(x - 28 * s, top, 56 * s, y0 - top); }
  ctx.fillRect(x0, top + (y0 - top) * 0.42, x1 - x0, 40 * s);
  ctx.fillRect(x0, y0 - 60 * s, x1 - x0, 60 * s);
  // сёдзи
  ctx.fillStyle = mix('#efe6d2', pal.haze, fog);
  for (let i = 0; i < nb; i++) {
    const xa = lerp(x0, x1, i / nb) + 40 * s, xb = lerp(x0, x1, (i + 1) / nb) - 40 * s;
    const ya = top + (y0 - top) * 0.48, yb = y0 - 70 * s;
    ctx.fillRect(xa, ya, xb - xa, yb - ya);
    ctx.strokeStyle = rgba(wood, 0.8); ctx.lineWidth = Math.max(1, 8 * s);
    ctx.beginPath();
    for (let k = 1; k < 4; k++) { const xx = lerp(xa, xb, k / 4); ctx.moveTo(xx, ya); ctx.lineTo(xx, yb); }
    for (let k = 1; k < 3; k++) { const yy = lerp(ya, yb, k / 3); ctx.moveTo(xa, yy); ctx.lineTo(xb, yy); }
    ctx.stroke();
  }
  // пролом
  if (b.hole) {
    const hp = cam.P(b.hole.X, b.hole.Y, Z);
    const hr = b.hole.r * hp.s;
    ctx.fillStyle = '#0a0606';
    ctx.beginPath();
    const R = rng(7);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU, r = hr * (0.7 + R() * 0.5); ctx.lineTo(hp.x + Math.cos(a) * r, hp.y + Math.sin(a) * r * 0.9); }
    ctx.closePath(); ctx.fill();
  }
  // крыша с загнутыми краями
  const oh = 260 * s, rh = (b.roofH || 520) * s;
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x0 - oh, top + 10 * s);
  ctx.quadraticCurveTo(x0 - oh * 0.3, top - 30 * s, x0 + (x1 - x0) * 0.12, top - rh * 0.9);
  ctx.lineTo(x1 - (x1 - x0) * 0.12, top - rh * 0.9);
  ctx.quadraticCurveTo(x1 + oh * 0.3, top - 30 * s, x1 + oh, top + 10 * s);
  ctx.quadraticCurveTo((x0 + x1) / 2, top - 20 * s, x0 - oh, top + 10 * s);
  ctx.fill();
  // конёк и линии черепицы
  ctx.fillStyle = darken(roof, 0.3);
  ctx.fillRect(x0 + (x1 - x0) * 0.1, top - rh * 0.95, (x1 - x0) * 0.8, 36 * s);
  ctx.strokeStyle = rgba(lighten(roof, 0.25), 0.5); ctx.lineWidth = Math.max(1, 5 * s);
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    const yy = lerp(top - rh * 0.9, top, i / 4);
    ctx.moveTo(lerp(x0 + (x1 - x0) * 0.12, x0 - oh * 0.8, i / 4), yy); ctx.lineTo(lerp(x1 - (x1 - x0) * 0.12, x1 + oh * 0.8, i / 4), yy);
  }
  ctx.stroke();
  // контровая кромка крыши
  ctx.strokeStyle = rgba(pal.sun, 0.35 * (1 - fog)); ctx.lineWidth = Math.max(1, 6 * s);
  ctx.beginPath(); ctx.moveTo(x0 + (x1 - x0) * 0.12, top - rh * 0.9); ctx.lineTo(x1 - (x1 - x0) * 0.12, top - rh * 0.9); ctx.stroke();
}

// каменная ограда
function drawWall(ctx, cam, Z, pal, x0 = -30000, x1 = 30000, h = 700) {
  const a = cam.P(x0, 0, Z), b = cam.P(x1, 0, Z), c = cam.P(x0, h, Z);
  if (!a) return;
  const fog = clamp((Z - cam.z) / 30000) * 0.8;
  ctx.fillStyle = mix('#8e8577', pal.haze, fog);
  ctx.fillRect(a.x, c.y, b.x - a.x, a.y - c.y);
  ctx.fillStyle = mix('#3a3438', pal.haze, fog * 0.8);
  ctx.fillRect(a.x, c.y - 40 * a.s, b.x - a.x, 60 * a.s);
  ctx.strokeStyle = rgba('#000000', 0.15); ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) { const y = lerp(c.y, a.y, i / 4); ctx.moveTo(a.x, y); ctx.lineTo(b.x, y); }
  ctx.stroke();
}

// деревья за оградой (клубы листвы)
function drawTrees(ctx, cam, pal, Z, seed = 4, autumn = 0.4, t = 0) {
  const R = rng(seed);
  for (let i = 0; i < 26; i++) {
    const X = -16000 + i * 1300 + R() * 600, hgt = 1500 + R() * 1300;
    const base = cam.P(X, 0, Z + R() * 1500);
    if (!base || base.x < -600 || base.x > W + 600) { R(); R(); continue; }
    const s = base.s;
    const fog = clamp((Z - cam.z) / 30000) * 0.7;
    ctx.fillStyle = mix('#2d221c', pal.haze, fog);
    ctx.fillRect(base.x - 40 * s, base.y - hgt * s * 0.6, 80 * s, hgt * s * 0.6);
    const leafCol = mix(mix(pal.tree, '#a8452d', R() * autumn), pal.haze, fog);
    for (let k = 0; k < 6; k++) {
      const ox = (R() - 0.5) * 700 * s + noise(t * 0.5 + i + k, 3) * 6, oy = -hgt * s * (0.65 + R() * 0.4);
      const r = (300 + R() * 260) * s;
      ctx.fillStyle = k % 2 ? leafCol : darken(leafCol, 0.15);
      ctx.beginPath(); ctx.arc(base.x + ox, base.y + oy, r, 0, TAU); ctx.fill();
    }
  }
}

// тренировочный столб (бетон/камень) — цилиндр с затенением; broken — высота слома
function drawPillar(ctx, cam, X, Z, o = {}) {
  const r = o.r || 220, h = o.h || 1100;
  const hb = o.broken ?? h;
  const b = cam.P(X, 0, Z), tp = cam.P(X, hb, Z);
  if (!b) return;
  const w = r * b.s;
  const pal = o.pal || SKY.day;
  const base = o.color || '#9a958b';
  const g = ctx.createLinearGradient(b.x - w, 0, b.x + w, 0);
  const kx = Light.kx;
  g.addColorStop(0, kx > 0 ? darken(base, 0.45) : lighten(base, 0.15));
  g.addColorStop(0.5, base);
  g.addColorStop(1, kx > 0 ? lighten(base, 0.18) : darken(base, 0.45));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(b.x - w, b.y);
  if (o.broken !== undefined) {
    const R = rng(o.seed || 3);
    ctx.lineTo(b.x - w, tp.y + 30 * b.s);
    for (let i = 0; i <= 6; i++) ctx.lineTo(lerp(b.x - w, b.x + w, i / 6), tp.y + (R() - 0.3) * 140 * b.s);
    ctx.lineTo(b.x + w, b.y);
  } else {
    ctx.lineTo(b.x - w, tp.y);
    ctx.ellipse(tp.x, tp.y, w, w * 0.18, 0, PI, 0);
    ctx.lineTo(b.x + w, b.y);
  }
  ctx.ellipse(b.x, b.y, w, w * 0.18, 0, 0, PI);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#141216'; ctx.lineWidth = Math.max(1.5, 4 * b.s); ctx.stroke();
  // верёвка-симэнава
  if (o.rope !== false && hb > h * 0.7) {
    const ry = cam.P(X, h * 0.7, Z).y;
    ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = Math.max(2, 26 * b.s);
    ctx.beginPath(); ctx.ellipse(b.x, ry, w * 1.02, w * 0.2, 0, 0.1, PI - 0.1); ctx.stroke();
    ctx.fillStyle = '#f4f0e6';
    for (let i = 0; i < 3; i++) { const x = b.x - w * 0.5 + i * w * 0.5; ctx.fillRect(x - 14 * b.s, ry + 10 * b.s, 28 * b.s, 90 * b.s); }
  }
  // текстура: сколы
  if (o.cracks) {
    ctx.strokeStyle = 'rgba(20,16,16,0.8)'; ctx.lineWidth = Math.max(1, 5 * b.s);
    const R = rng(o.seed || 9);
    for (let i = 0; i < 7 * o.cracks; i++) {
      let x = b.x + (R() - 0.5) * w * 0.4, y = lerp(b.y, tp.y, 0.45 + (R() - 0.5) * 0.3);
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += (R() - 0.5) * w * 0.7; y += (R() - 0.5) * w * 0.9; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
}

// ---------- набор площадки ----------
const COURT = {
  buildings: [
    { X: -5200, Z: 9000, w: 4200, h: 1500, roofH: 700 },
    { X: 1200, Z: 11000, w: 5200, h: 1800, roofH: 900 },
    { X: 7600, Z: 9500, w: 3800, h: 1500, roofH: 650 },
    { X: -11000, Z: 12500, w: 4600, h: 1700, roofH: 800 },
    { X: 12500, Z: 12500, w: 4000, h: 1600, roofH: 700 },
  ],
  pillars: [[-3400, 4200], [3600, 3800], [-6500, 6800], [6800, 6500]],
};
function drawCourtyard(ctx, cam, pal, t, o = {}) {
  drawSky(ctx, pal, cam.hy, t, Object.assign({ par: -cam.x * 0.02 }, o.sky || {}));
  drawHills(ctx, cam, pal, 3);
  drawTrees(ctx, cam, pal, 14500, 4, o.autumn ?? 0.5, t);
  drawGround(ctx, cam, pal, o.ground || {});
  drawWall(ctx, cam, 13800, pal);
  const bs = (o.buildings || COURT.buildings).slice().sort((a, b) => b.Z - a.Z);
  for (const b of bs) drawBuilding(ctx, cam, b, pal, t);
  if (o.pillars !== false) {
    for (const [X, Z] of (o.pillarList || COURT.pillars)) drawPillar(ctx, cam, X, Z, { pal });
  }
}

// ---------- спальня (2D-композиция в координатах 1920x1080) ----------
function drawBedroom(ctx, t, o = {}) {
  const dawn = o.light ?? 1;
  // стена
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1a2233'); g.addColorStop(1, '#0d121c');
  ctx.fillStyle = g; ctx.fillRect(-400, -400, W + 800, H + 800);
  // окно с жалюзи
  const wx = 1240, wy = 120, ww = 520, wh = 470;
  const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
  sky.addColorStop(0, '#6f95c9'); sky.addColorStop(1, '#f1cfa8');
  ctx.fillStyle = sky; ctx.fillRect(wx, wy, ww, wh);
  // силуэты домов в окне
  ctx.fillStyle = '#41506a';
  const R = rng(21);
  for (let i = 0; i < 9; i++) { const bw = 40 + R() * 70, bh = 60 + R() * 170; ctx.fillRect(wx + i * 62, wy + wh - bh, bw, bh); }
  // жалюзи
  for (let i = 0; i < 16; i++) {
    const y = wy + i * (wh / 16);
    ctx.fillStyle = 'rgba(210,214,224,0.92)'; ctx.fillRect(wx, y, ww, wh / 16 * 0.55);
    ctx.fillStyle = 'rgba(120,128,150,0.6)'; ctx.fillRect(wx, y + wh / 16 * 0.5, ww, 3);
  }
  ctx.strokeStyle = '#0a0d14'; ctx.lineWidth = 22; ctx.strokeRect(wx, wy, ww, wh);
  ctx.fillStyle = '#20283a'; ctx.fillRect(wx - 40, wy + wh + 10, ww + 80, 26);
  // пол
  const fl = ctx.createLinearGradient(0, 820, 0, H);
  fl.addColorStop(0, '#2a2420'); fl.addColorStop(1, '#141110');
  ctx.fillStyle = fl; ctx.fillRect(-400, 820, W + 800, 600);
  // полосы света от жалюзи на стене и кровати (аддитивно)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) {
    const y0 = wy + 20 + i * 36;
    ctx.fillStyle = rgba('#ffcf96', 0.06 * dawn);
    ctx.beginPath(); ctx.moveTo(wx, y0); ctx.lineTo(wx, y0 + 14); ctx.lineTo(180, y0 + 420); ctx.lineTo(180, y0 + 380); ctx.closePath(); ctx.fill();
  }
  const beam = ctx.createLinearGradient(wx, wy, 300, 800);
  beam.addColorStop(0, rgba('#ffd9a8', 0.18 * dawn)); beam.addColorStop(1, rgba('#ffd9a8', 0));
  ctx.fillStyle = beam;
  ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx, wy + wh); ctx.lineTo(200, 1000); ctx.lineTo(-100, 500); ctx.closePath(); ctx.fill();
  ctx.restore();
  // тумбочка с лампой и стаканом
  ctx.fillStyle = '#1d1a1c'; ctx.fillRect(1180, 640, 260, 220);
  ctx.fillStyle = '#2a2628'; ctx.fillRect(1170, 630, 280, 22);
  ctx.strokeStyle = '#0b0a0c'; ctx.lineWidth = 3; ctx.strokeRect(1180, 640, 260, 220);
  ctx.fillStyle = '#3b3436'; ctx.fillRect(1196, 700, 228, 4);
  // часы
  ctx.fillStyle = '#0c0c10'; ctx.fillRect(1210, 586, 100, 46);
  ctx.fillStyle = rgba('#ff5c4a', 0.9); ctx.font = '600 28px Oswald, sans-serif'; ctx.fillText('6:42', 1222, 620);
  if (o.glass !== false) drawGlass(ctx, 1390, 630, 1, 0);
}
function drawGlass(ctx, x, y, s, rot, water = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  const g = new Path2D(); g.moveTo(-22, -84); g.lineTo(22, -84); g.lineTo(17, 0); g.lineTo(-17, 0); g.closePath();
  if (water > 0) {
    ctx.save(); ctx.clip(g);
    ctx.fillStyle = 'rgba(140,190,230,0.45)'; ctx.fillRect(-30, -84 + 84 * (1 - 0.6 * water), 60, 90);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(200,220,240,0.18)'; ctx.fill(g);
  ctx.strokeStyle = 'rgba(230,240,255,0.85)'; ctx.lineWidth = 2.5; ctx.stroke(g);
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(-15, -76, 5, 64);
  ctx.restore();
}
// кровать: рама, матрас, подушка; одеяло рисуется отдельно (поверх героя)
function drawBed(ctx) {
  ctx.fillStyle = '#231c1a'; ctx.fillRect(120, 610, 1040, 60);
  ctx.fillStyle = '#2c2422'; ctx.fillRect(110, 470, 50, 360);
  ctx.fillStyle = '#d7d4cf'; ctx.beginPath(); ctx.roundRect(150, 560, 1010, 70, 20); ctx.fill();
  ctx.fillStyle = '#efece6'; ctx.beginPath(); ctx.ellipse(300, 548, 140, 46, -0.05, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#8e8a84'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#16120f'; ctx.fillRect(140, 670, 1020, 160);
}
function drawBlanket(ctx, t, lift = 0) {
  const p = new Path2D();
  p.moveTo(520 - lift * 60, 540 - lift * 10);
  p.bezierCurveTo(700, 500 - lift * 20, 900, 520, 1150, 540);
  p.quadraticCurveTo(1185, 600, 1160, 690);
  p.lineTo(470, 700);
  p.quadraticCurveTo(450, 600, 520 - lift * 60, 540 - lift * 10);
  ctx.fillStyle = '#3d4a6b'; ctx.fill(p);
  ctx.save(); ctx.clip(p);
  ctx.fillStyle = '#2b3550';
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(600 + i * 130, 610 + (i % 2) * 30, 50, 120, 0.4, 0, TAU); ctx.fill(); }
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,200,140,0.12)'; ctx.fillRect(400, 500, 900, 60);
  ctx.restore();
  ctx.strokeStyle = '#0b0d14'; ctx.lineWidth = 3; ctx.stroke(p);
}
