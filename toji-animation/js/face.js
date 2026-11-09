'use strict';
/* Детальное лицо с поворотом головы (yaw): черты расположены на эллипсоиде,
   поэтому при повороте корректно смещаются нос, глаза, рот и контур.
   Единицы: голова ≈ 590 ед. по высоте, центр лица (0,0) — на уровне переносицы. */
const FACE_Y = [-320, -250, -180, -100, -40, 30, 90, 150, 200, 240, 262];
const FACE_A1 = [110, 166, 186, 193, 195, 188, 180, 170, 140, 92, 46];   // Тоджи
const FACE_A0 = [110, 160, 178, 184, 186, 178, 166, 150, 122, 80, 40];   // обычный
const FACE_B = [190, 205, 206, 200, 190, 176, 160, 140, 112, 86, 62];
const FACE_Z = [-30, -22, -12, 0, 10, 24, 38, 52, 68, 84, 94];
function ftab(tab, y) {
  if (y <= FACE_Y[0]) return tab[0];
  for (let i = 0; i < FACE_Y.length - 1; i++) {
    if (y <= FACE_Y[i + 1]) {
      const u = (y - FACE_Y[i]) / (FACE_Y[i + 1] - FACE_Y[i]);
      const s = u * u * (3 - 2 * u);
      return lerp(tab[i], tab[i + 1], s);
    }
  }
  return tab[tab.length - 1];
}
function faceGeom(bulk, yaw) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const A = y => lerp(ftab(FACE_A0, y), ftab(FACE_A1, y), bulk);
  return {
    A, cy, sy,
    // проекция точки поверхности лица (u — горизонт. смещение в анфас, y, dz — выступ)
    P(u, y, dz = 0) {
      const a = A(y), b = ftab(FACE_B, y), zc = ftab(FACE_Z, y);
      const r = clamp(u / a, -0.999, 0.999);
      const z = zc + b * Math.sqrt(1 - r * r) + dz;
      return V(u * cy + z * sy, y);
    },
    fore(u, y) { // множитель ракурса
      const a = A(y); const th = Math.asin(clamp(u / a, -0.999, 0.999));
      return Math.max(0.05, Math.cos(th + yaw * 1.05));
    },
    edge(y, side) {
      const a = A(y), b = ftab(FACE_B, y), zc = ftab(FACE_Z, y);
      return zc * sy + side * Math.sqrt(a * a * cy * cy + b * b * sy * sy * 0.55);
    },
  };
}

function drawFace(ctx, o) {
  const bulk = o.bulk ?? 1, yaw = o.yaw || 0, t = o.t || 0, det = o.detail ?? 1;
  const G = faceGeom(bulk, yaw);
  const sk = bulk > 0.5 ? PAL.skin : mixSkin(bulk);
  const lightSide = Light.kx >= 0 ? 1 : -1;
  // ---------- контур ----------
  const ys = [-250, -200, -140, -80, -20, 40, 100, 150, 190, 220, 244];
  const R = ys.map(y => [G.edge(y, 1) + (y > 120 ? 0 : 0), y]);
  const Lf = ys.map(y => [G.edge(y, -1), y]).reverse();
  const chin = G.P(0, 262);
  const cw = lerp(40, 52, bulk) * (0.55 + 0.45 * G.cy);
  const facePath = smoothPath([...R, [chin.x + cw * 0.6, 258], [chin.x, 264], [chin.x - cw * 0.6, 258], ...Lf], true, 0.5);
  // ---------- шея и плечи ----------
  const nW = lerp(96, 120, bulk);
  const nX = -15 * G.sy;
  if (!o.noNeck) {
    const neck = new Path2D();
    neck.moveTo(nX - nW, 120); neck.lineTo(nX - nW - 4, 330); neck.quadraticCurveTo(nX - nW - 40, 420, nX - nW - 200, 470);
    neck.lineTo(nX + nW + 200, 470); neck.quadraticCurveTo(nX + nW + 40, 420, nX + nW + 4, 330); neck.lineTo(nX + nW, 120); neck.closePath();
    shadePath(ctx, neck, { b: sk.b, s: sk.s, w: 3, o: PAL.line }, 140);
    if (isNormal() && !o.back) {
      ctx.save(); ctx.clip(neck);
      const js = new Path2D(); // тень под челюстью
      js.moveTo(nX - nW - 20, 150); js.quadraticCurveTo(chin.x, 340, nX + nW + 20, 150); js.lineTo(nX + nW + 20, 100); js.lineTo(nX - nW - 20, 100); js.closePath();
      ctx.fillStyle = darken(sk.s, 0.12); ctx.globalAlpha = 0.95; ctx.fill(js); ctx.globalAlpha = 1;
      const m = new Path2D(); // кивательные мышцы, кадык
      m.moveTo(nX - nW * 0.55, 210); m.quadraticCurveTo(nX - nW * 0.2, 330, nX - 18, 400);
      m.moveTo(nX + nW * 0.55, 210); m.quadraticCurveTo(nX + nW * 0.2, 330, nX + 18, 400);
      m.moveTo(chin.x * 0.4 - 7, 304); m.quadraticCurveTo(chin.x * 0.4, 318, chin.x * 0.4 + 7, 304);
      detailStroke(ctx, m, darken(sk.s, 0.12), 3, 0.5);
      ctx.restore();
    }
    if (o.collar !== false) {
      const cm = o.outfit === 'tee' ? PAL.tee : PAL.shirt;
      const dip = o.back ? 455 : o.outfit === 'tee' ? 540 : 505;
      const col = new Path2D();
      col.moveTo(nX - nW - 420, 900); col.lineTo(nX - nW - 400, 600);
      col.quadraticCurveTo(nX - nW - 260, 470, nX - nW - 30, 440);
      col.quadraticCurveTo(nX, dip + 10, nX + nW + 30, 440);
      col.quadraticCurveTo(nX + nW + 260, 470, nX + nW + 400, 600);
      col.lineTo(nX + nW + 420, 900); col.closePath();
      shadePath(ctx, col, { b: cm.b, s: cm.s, w: 3, o: PAL.line }, 170);
      if (isNormal()) {
        const k = new Path2D(); // кромка ворота и рельеф трапеций под тканью
        k.moveTo(nX - nW - 24, 452); k.quadraticCurveTo(nX, dip + 26, nX + nW + 24, 452);
        if (!o.back) { k.moveTo(nX - 40, 640); k.quadraticCurveTo(nX - 160, 600, nX - 300, 640); k.moveTo(nX + 40, 640); k.quadraticCurveTo(nX + 160, 600, nX + 300, 640); }
        detailStroke(ctx, k, cm.fold || '#3a3d49', 4, 0.6);
      }
    }
  }
  // ---------- уши ----------
  const earSides = [];
  if (yaw > -0.08) earSides.push(-1);
  if (yaw < 0.08) earSides.push(1);
  if (o.back) { earSides.length = 0; earSides.push(-1, 1); }
  for (const s of earSides) {
    const ex = o.back ? s * 196 : G.edge(-10, s) + s * (6 - Math.abs(yaw) * 20);
    const ear = new Path2D();
    ear.moveTo(ex - s * 4, -70); ear.bezierCurveTo(ex + s * 40, -90, ex + s * 46, 10, ex + s * 14, 50); ear.quadraticCurveTo(ex, 62, ex - s * 8, 40); ear.closePath();
    shadePath(ctx, ear, { b: sk.b, s: sk.s, w: 3, o: PAL.line }, 40);
    const ei = new Path2D(); ei.moveTo(ex + s * 6, -50); ei.bezierCurveTo(ex + s * 30, -60, ex + s * 30, 0, ex + s * 10, 24);
    detailStroke(ctx, ei, darken(sk.s, 0.15), 3, 0.7);
  }
  if (o.back) { drawHairBack(ctx, o); return; }
  // ---------- лицо ----------
  shadePath(ctx, facePath, { b: sk.b, s: sk.s, w: 3.2, o: PAL.line, rim: undefined }, 150);
  if (isNormal()) {
    ctx.save(); ctx.clip(facePath);
    // светотень лица — граница по скуле со стороны тени
    const sd = -lightSide;
    const sp = [];
    const yy = [-260, -170, -100, -55, -10, 40, 90, 140, 190, 240, 290];
    for (const y of yy) {
      const cheek = y > -60 && y < 60 ? 0.62 : y >= 60 && y < 160 ? 0.58 : 0.66;
      const u = sd * G.A(y) * cheek * (1 - 0.25 * (sd * yaw > 0 ? 1 : 0) * Math.abs(yaw) * 2);
      sp.push([G.P(u, y).x, y]);
    }
    const shadow = new Path2D();
    shadow.moveTo(sp[0][0], sp[0][1]);
    smoothPath(sp, false, 0.5, shadow);
    shadow.lineTo(sd * 1000, 300); shadow.lineTo(sd * 1000, -300); shadow.closePath();
    ctx.fillStyle = sk.s; ctx.globalAlpha = 0.92; ctx.fill(shadow);
    // скула: зубчатый край в аниме-стиле
    const cb = G.P(sd * G.A(10) * 0.5, 10);
    const tri = new Path2D(); tri.moveTo(cb.x, -20); tri.lineTo(cb.x - sd * 26, 70); tri.lineTo(cb.x + sd * 30, 120); tri.closePath();
    ctx.fill(tri);
    ctx.globalAlpha = 1;
    // тень от волос на лбу
    ctx.fillStyle = darken(sk.s, 0.05);
    ctx.globalAlpha = 0.9;
    ctx.fill(bangsPath(G, o, t, 20));
    ctx.globalAlpha = 1;
    // глазницы, мягкий градиент
    for (const s of [-1, 1]) {
      const e = G.P(s * 82, -55);
      const g = ctx.createRadialGradient(e.x, e.y, 5, e.x, e.y, 90);
      g.addColorStop(0, rgba(sk.s, 0.35)); g.addColorStop(1, rgba(sk.s, 0));
      ctx.fillStyle = g; ctx.fillRect(e.x - 100, e.y - 100, 200, 200);
    }
    // тень под челюстью/подбородком и щёк
    const jaw = new Path2D();
    const jl = G.P(-G.A(200) * 0.9, 200), jr = G.P(G.A(200) * 0.9, 200);
    jaw.moveTo(jl.x - 40, 300); jaw.lineTo(jl.x, 232); jaw.quadraticCurveTo(chin.x, 262, jr.x, 232); jaw.lineTo(jr.x + 40, 300); jaw.closePath();
    ctx.fillStyle = sk.s; ctx.globalAlpha = 0.5; ctx.fill(jaw); ctx.globalAlpha = 1;
    ctx.restore();
    // мимические линии (носогубка у Тоджи)
    if (bulk > 0.5 && det > 0.5) {
      for (const s of [-1, 1]) {
        const a = G.P(s * 52, 72), b = G.P(s * 70, 118);
        const p = new Path2D(); p.moveTo(a.x, a.y); p.quadraticCurveTo(a.x + s * 12, (a.y + b.y) / 2, b.x, b.y);
        detailStroke(ctx, p, darken(sk.s, 0.1), 2.4, 0.35 * G.fore(s * 60, 90));
      }
    }
  }
  // ---------- черты ----------
  drawBrows(ctx, G, o);
  drawEyes(ctx, G, o);
  drawNose(ctx, G, o, sk);
  drawMouth(ctx, G, o, sk);
  // ---------- волосы ----------
  drawHairFront(ctx, G, o);
}

function drawBrows(ctx, G, o) {
  const bulk = o.bulk ?? 1, fur = o.brow ?? 0;
  for (const s of [-1, 1]) {
    const f = G.fore(s * 90, -110);
    if (f < 0.12) continue;
    const pts = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      const u = s * lerp(30, 150, k);
      const arch = bulk > 0.5 ? -8 * Math.sin(k * PI * 0.9) : -18 * Math.sin(k * PI * 0.85);
      const y = -104 + arch + k * k * 6 + fur * (1 - k) * 12 - (o.browUp || 0) * 14;
      pts.push(G.P(u, y));
    }
    const top = [], bot = [];
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      const th = lerp(bulk > 0.5 ? 15 : 11, 4, Math.pow(k, 1.2));
      top.push([pts[i].x, pts[i].y - th * 0.55]);
      bot.push([pts[i].x, pts[i].y + th * 0.45]);
    }
    const p = smoothPath([...top, ...bot.reverse()], true, 0.4);
    if (RENDER.mode === 'normal') { ctx.fillStyle = '#121216'; ctx.fill(p); }
  }
}

function eyeLocal(o) {
  const bulk = o.bulk ?? 1, cold = o.cold ?? bulk;
  const open = clamp(o.open ?? 1, 0, 1.2);
  return { open, cold, peak: lerp(1.08, 0.78, cold), low: lerp(0.8, 0.62, cold) };
}

function drawEyes(ctx, G, o) {
  if (!isNormal()) return;
  const bulk = o.bulk ?? 1;
  const E0 = eyeLocal(o);
  for (const s of [-1, 1]) {
    const f = G.fore(s * 82, -45);
    if (f < 0.1) continue;
    const c = G.P(s * 82, -45);
    const ew = 46 * f, eh = 23;
    const op = E0.open;
    const L = (lx, ly) => V(c.x + s * lx * ew, c.y + ly * eh);
    const up = [L(-1, 0.12), L(-0.45, -E0.peak * op), L(0.35, -E0.peak * op * 1.02), L(1, -0.32 * op - 0.1)];
    const lo = [L(0.95, 0.28), L(0.1, E0.low * op + 0.05), L(-0.85, 0.32)];
    const eye = smoothPath([...up, ...lo].map(v => [v.x, v.y]), true, 0.45);
    if (op > 0.08) {
      ctx.fillStyle = '#ece6e1'; ctx.fill(eye);
      ctx.save(); ctx.clip(eye);
      // тень от века на белке
      ctx.fillStyle = 'rgba(120,90,90,0.35)';
      ctx.fillRect(c.x - ew - 4, c.y - eh * 1.6, ew * 2 + 8, eh * 0.9);
      // радужка
      const lx = (o.lookX || 0) * 0.42, ly = (o.lookY || 0) * 0.3;
      const ic = V(c.x + lx * ew + G.sy * 6, c.y + (0.06 + ly) * eh);
      const ir = 21;
      const irisCol = mix(PAL.iris0, PAL.iris1, bulk);
      const g = ctx.createLinearGradient(0, ic.y - ir, 0, ic.y + ir);
      g.addColorStop(0, darken(irisCol, 0.65)); g.addColorStop(0.55, irisCol); g.addColorStop(1, lighten(irisCol, 0.35));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(ic.x, ic.y, ir * f, ir, 0, 0, TAU); ctx.fill();
      ctx.lineWidth = 2.2; ctx.strokeStyle = darken(irisCol, 0.7); ctx.stroke();
      const pr = ir * lerp(0.46, 0.34, o.cold ?? bulk) * (o.pupil ?? 1);
      ctx.fillStyle = '#060608';
      ctx.beginPath(); ctx.ellipse(ic.x, ic.y + 1, pr * f, pr, 0, 0, TAU); ctx.fill();
      // блики
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath(); ctx.ellipse(ic.x + 6 * Light.kx * f, ic.y - 8, 4.2 * f, 5, 0.3, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.ellipse(ic.x - 5 * f, ic.y + 9, 2.2 * f, 1.6, 0, 0, TAU); ctx.fill();
      if (o.eyeGlint) {
        ctx.fillStyle = rgba('#ffffff', o.eyeGlint);
        ctx.beginPath(); ctx.ellipse(ic.x, ic.y - 3, 9 * f, 2.2, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    // линия ресниц (верхнее веко) — толстая, утолщается к внешнему краю
    const lash = new Path2D();
    const u2 = up.map(v => [v.x, v.y]);
    smoothPath(u2, false, 0.45, lash);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0c0b0f'; ctx.lineWidth = 6.5; ctx.stroke(lash);
    const fl = new Path2D(); const a = L(0.45, -E0.peak * op * 1.0), b = L(1.12, -0.45 * op - 0.16);
    fl.moveTo(a.x, a.y); fl.quadraticCurveTo(L(0.9, -0.62 * op).x, L(0.9, -0.62 * op).y - 2, b.x, b.y);
    ctx.lineWidth = 9; ctx.stroke(fl);
    // складка века
    const cr = new Path2D(); const k1 = L(-0.55, -E0.peak * op - 0.55), k2 = L(0.8, -0.55 * op - 0.5);
    cr.moveTo(k1.x, k1.y); cr.quadraticCurveTo(L(0.1, -E0.peak * op - 0.85).x, L(0.1, -E0.peak * op - 0.85).y, k2.x, k2.y);
    detailStroke(ctx, cr, '#5a3a30', 2.4, 0.6);
    // нижнее веко
    if (op > 0.08) {
      const lw = new Path2D(); const l1 = L(0.95, 0.3), l2 = L(-0.3, E0.low * op + 0.1);
      lw.moveTo(l1.x, l1.y); lw.quadraticCurveTo(L(0.35, E0.low * op + 0.12).x, L(0.35, E0.low * op + 0.12).y, l2.x, l2.y);
      detailStroke(ctx, lw, '#3a2522', 2.2, 0.75);
    }
    if (bulk > 0.5) { // мешки под глазами — усталый, жёсткий взгляд
      const bg = new Path2D(); const g1 = L(-0.5, E0.low * op + 0.8), g2 = L(0.7, E0.low * op + 0.55);
      bg.moveTo(g1.x, g1.y); bg.quadraticCurveTo(L(0.1, E0.low * op + 0.95).x, L(0.1, E0.low * op + 0.95).y, g2.x, g2.y);
      detailStroke(ctx, bg, '#a0604a', 2, 0.45);
    }
  }
}

function drawNose(ctx, G, o, sk) {
  if (!isNormal()) return;
  const tip = G.P(0, 58, 34);
  const sd = -(Light.kx >= 0 ? 1 : -1);
  // боковая линия спинки носа (со стороны тени / поворота)
  const bs = Math.abs(G.sy) > 0.08 ? -Math.sign(G.sy) : sd;
  const b1 = G.P(bs * 16, -40, 8), b2 = G.P(bs * 18, 30, 22);
  const br = new Path2D(); br.moveTo(b1.x, b1.y); br.quadraticCurveTo(b2.x + bs * 2, (b1.y + b2.y) / 2, b2.x, b2.y);
  detailStroke(ctx, br, darken(sk.s, 0.1), 2.6, 0.55);
  // тень под носом
  const sh = new Path2D();
  sh.moveTo(tip.x - 26, 62); sh.quadraticCurveTo(tip.x + sd * 4, 84, tip.x + 26, 62); sh.quadraticCurveTo(tip.x + sd * 20, 74, tip.x - 26, 62);
  ctx.fillStyle = rgba(darken(sk.s, 0.15), 0.8); ctx.fill(sh);
  // ноздри
  const n = new Path2D();
  n.moveTo(tip.x - 20, 58); n.quadraticCurveTo(tip.x - 14, 68, tip.x - 6, 66);
  n.moveTo(tip.x + 20, 58); n.quadraticCurveTo(tip.x + 14, 68, tip.x + 6, 66);
  detailStroke(ctx, n, '#5a3028', 3, 0.85);
  // блик на кончике
  const hl = new Path2D(); hl.ellipse(tip.x + Light.kx * 6, 44, 5, 8, 0, 0, TAU);
  detailFill(ctx, hl, sk.hl || '#f6d2b0', 0.55);
}

function drawMouth(ctx, G, o, sk) {
  if (!isNormal()) return;
  const sm = o.smile || 0, bulk = o.bulk ?? 1;
  const y = 126;
  const L = G.P(-54, y - sm * 6 + 3), Rr = G.P(54, y - sm * 16 + 3), C = G.P(0, y + 2, 6);
  const m = new Path2D();
  m.moveTo(L.x, L.y);
  m.bezierCurveTo(lerp(L.x, C.x, 0.5), C.y - 2 + sm * 4, lerp(C.x, Rr.x, 0.4), C.y - 3 + sm * 2, Rr.x, Rr.y);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#4a1f1a'; ctx.lineWidth = 4.2; ctx.stroke(m);
  // уголки
  const ck = new Path2D(); ck.moveTo(Rr.x, Rr.y); ck.lineTo(Rr.x + 6 * G.fore(54, y), Rr.y - 4 - sm * 6);
  detailStroke(ctx, ck, '#4a1f1a', 3, 0.8);
  // нижняя губа — тень и блик
  const ll = new Path2D(); const l1 = G.P(-26, 150, 4), l2 = G.P(26, 150, 4);
  ll.moveTo(l1.x, l1.y); ll.quadraticCurveTo(G.P(0, 156, 6).x, 157, l2.x, l2.y);
  detailStroke(ctx, ll, darken(sk.s, 0.12), 4, 0.6);
  const lh = new Path2D(); lh.ellipse(G.P(0, 140, 6).x + Light.kx * 6, 140, 16 * G.cy, 4, 0, 0, TAU);
  detailFill(ctx, lh, '#f6c2a8', 0.3);
  // шрам у правого уголка рта (у зрителя — слева)
  const sc = o.scar ?? (bulk > 0.6 ? 1 : 0);
  if (sc > 0.01) {
    const s1 = G.P(-47, 104, 2), s2 = G.P(-40, 150, 2);
    const p = new Path2D(); p.moveTo(s1.x, s1.y); p.quadraticCurveTo(s1.x + 6, (s1.y + s2.y) / 2, s2.x, s2.y);
    detailStroke(ctx, p, '#7a3d33', 6, 0.45 * sc);
    detailStroke(ctx, p, '#f2cdbd', 3.2, 0.95 * sc);
  }
}

// --- волосы ---
// контур причёски в анфас: [u, y, острый кончик?]
const HAIR_FRONT = [
  [-196, -30, 1], [-206, -110], [-238, -160, 1], [-214, -205], [-246, -262, 1], [-196, -292], [-212, -342, 1], [-128, -334],
  [-118, -364, 1], [-46, -352], [0, -367, 1], [48, -354], [118, -360, 1], [140, -330], [214, -339, 1], [204, -292], [248, -250, 1],
  [214, -206], [240, -150, 1], [206, -114], [198, -36, 1],
  [182, -120], [158, -52, 1], [132, -138], [96, -70, 1], [70, -146], [34, -40, 1], [6, -150], [-30, -92, 1], [-58, -150],
  [-102, -58, 1], [-130, -142], [-164, -74, 1], [-184, -128],
];
const HAIR_BACK = [
  [-205, 40], [-230, -40, 1], [-212, -110], [-245, -170, 1], [-214, -230], [-232, -300, 1], [-160, -330], [-150, -364, 1], [-70, -360],
  [-10, -371, 1], [50, -362], [130, -363, 1], [150, -330], [228, -300, 1], [212, -232], [248, -170, 1], [214, -110], [232, -40, 1],
  [200, 30], [168, 118, 1], [120, 70], [70, 135, 1], [20, 80], [-30, 140, 1], [-80, 80], [-128, 125, 1], [-170, 60],
];
function hairPt(G, u, y, dz = 34) {
  const a = G.A(y) * 0.98;
  if (Math.abs(u) <= a) return G.P(u, y, dz);
  const s = Math.sign(u), b = G.P(s * a, y, dz);
  return V(b.x + s * (Math.abs(u) - a) * G.cy, y);
}
function hairOutline(G, o, t, dy = 0) {
  const wind = o.wind || 0;
  return HAIR_FRONT.map(([u, y, sh], i) => {
    const p = hairPt(G, u, y);
    const k = sh ? 1 : 0.25;
    const sway = fbm(t * 1.6 + i * 1.9, i) * (5 + wind * 22) * k;
    return [p.x + sway - wind * 26 * k * (y > -200 ? 1 : 0.6), p.y + dy - wind * 6 * k, sh];
  });
}
function bangsPath(G, o, t, dy = 0) {
  // нижняя кромка чёлки (для тени на лбу)
  const pts = hairOutline(G, o, t, dy);
  return jagPath(pts, 0.42);
}
function drawHairFront(ctx, G, o) {
  const t = o.t || 0;
  const hm = { b: PAL.hair.b, s: PAL.hair.s, w: 3, o: PAL.line, r: mix(Light.rim, PAL.hair.b, 0.4) };
  const path = jagPath(hairOutline(G, o, t), 0.42);
  shadePath(ctx, path, hm, 80);
  if (!isNormal()) return;
  ctx.save(); ctx.clip(path);
  // объём: тёмная зона у корней чёлки, светлая «лента» блика
  const hl = new Path2D();
  for (let i = 0; i < 9; i++) {
    const u = -150 + i * 38;
    const a = hairPt(G, u, -300 + Math.abs(u) * 0.28), b = hairPt(G, u + 22, -262 + Math.abs(u) * 0.3);
    hl.moveTo(a.x, a.y); hl.quadraticCurveTo((a.x + b.x) / 2 + 8, (a.y + b.y) / 2, b.x, b.y);
  }
  detailStroke(ctx, hl, PAL.hair.hl, 9, 0.5);
  // пряди
  const sep = new Path2D();
  const pts = hairOutline(G, o, t);
  pts.forEach((p, i) => {
    if (!p[2] || i < 21) return;
    const r = hairPt(G, HAIR_FRONT[i][0] * 0.8, -290, 34);
    sep.moveTo(p[0], p[1] - 10); sep.quadraticCurveTo((p[0] + r.x) / 2 + 10, (p[1] + r.y) / 2, r.x, r.y);
  });
  for (let i = 0; i < 6; i++) {
    const u = -170 + i * 70, a = hairPt(G, u, -360), b = hairPt(G, u * 0.9 + 10, -230);
    sep.moveTo(a.x, a.y); sep.quadraticCurveTo(a.x + 20, (a.y + b.y) / 2, b.x, b.y);
  }
  detailStroke(ctx, sep, '#000000', 3, 0.55);
  ctx.restore();
}
function drawHairBack(ctx, o) {
  const t = o.t || 0, wind = o.wind || 0;
  const hm = { b: PAL.hair.b, s: PAL.hair.s, w: 3, o: PAL.line };
  const pts = HAIR_BACK.map(([x, y, sh], i) => {
    const k = sh ? 1 : 0.25;
    return [x + fbm(t * 1.5 + i * 2.1, i + 40) * (5 + wind * 20) * k - wind * 20 * k, y, sh];
  });
  const p = jagPath(pts, 0.42);
  shadePath(ctx, p, hm, 90);
  if (isNormal()) {
    ctx.save(); ctx.clip(p);
    const hl = new Path2D();
    for (let i = 0; i < 8; i++) {
      const x = -140 + i * 40;
      hl.moveTo(x, -300 + Math.abs(x) * 0.25); hl.quadraticCurveTo(x + 14, -250, x + 6, -200 + Math.abs(x) * 0.2);
    }
    detailStroke(ctx, hl, PAL.hair.hl, 7, 0.45);
    const sep = new Path2D();
    for (let i = 0; i < 9; i++) { const x = -180 + i * 45; sep.moveTo(x * 0.5, -330); sep.quadraticCurveTo(x * 0.9, -120, x, 60 + (i % 2) * 40); }
    detailStroke(ctx, sep, '#000', 3, 0.5);
    ctx.restore();
  }
}

/* ---------- Профиль крупным планом (лицом вправо) ----------
   единицы как у drawFace; o: {bulk, open, smile, t, wind, lookX, brow, scar} */
function drawProfile(ctx, o) {
  const bulk = o.bulk ?? 1, t = o.t || 0, wind = o.wind || 0;
  const sk = bulk > 0.5 ? PAL.skin : mixSkin(bulk);
  const open = o.open ?? 1;
  // шея и плечо
  const neck = smoothPath([[-150, 110], [-120, 330], [-200, 470], [-600, 560], [-640, 900], [520, 900], [380, 560], [170, 470], [110, 360], [96, 232], [20, 150]], true, 0.4);
  shadePath(ctx, neck, { b: sk.b, s: sk.s, w: 3, o: PAL.line }, 160);
  if (o.collar !== false) {
    const col = smoothPath([[-640, 900], [-620, 580], [-260, 480], [-120, 470], [60, 520], [200, 500], [420, 580], [520, 900]], true, 0.4);
    shadePath(ctx, col, { b: PAL.shirt.b, s: PAL.shirt.s, w: 3, o: PAL.line }, 170);
  }
  if (isNormal()) {
    ctx.save(); ctx.clip(neck);
    ctx.fillStyle = darken(sk.s, 0.1); ctx.globalAlpha = 0.9;
    const js = new Path2D(); js.moveTo(-160, 140); js.quadraticCurveTo(60, 330, 200, 250); js.lineTo(200, 100); js.lineTo(-160, 100); js.closePath(); ctx.fill(js);
    ctx.globalAlpha = 1;
    const m = new Path2D(); m.moveTo(-60, 170); m.quadraticCurveTo(10, 330, 70, 450); m.moveTo(98, 318); m.quadraticCurveTo(112, 336, 100, 352);
    detailStroke(ctx, m, darken(sk.s, 0.15), 4, 0.5);
    ctx.restore();
  }
  // голова (контур профиля)
  const sm = o.smile || 0;
  const head = smoothPath([
    [-170, 150], [-236, 10], [-244, -130], [-160, -300], [0, -336], [150, -256], [196, -150], [214, -78], [200, -44], [214, -18],
    [262, 58], [279, 80], [270, 94], [240, 100], [236, 118], [246, 134], [232, 150 - sm * 4], [243, 164], [224, 186], [233, 228], [210, 262],
    [140, 262], [96, 266], [10, 200], [-90, 160],
  ], true, 0.45);
  shadePath(ctx, head, { b: sk.b, s: sk.s, w: 3.2, o: PAL.line }, 160);
  if (isNormal()) {
    ctx.save(); ctx.clip(head);
    // тени: скула, под глазом, под челюстью, глазница
    ctx.fillStyle = sk.s; ctx.globalAlpha = 0.85;
    const c = new Path2D(); c.moveTo(-250, -320); c.lineTo(40, -320); c.quadraticCurveTo(-20, -80, 60, 60); c.quadraticCurveTo(110, 130, 60, 280); c.lineTo(-250, 280); c.closePath(); ctx.fill(c);
    ctx.globalAlpha = 0.5;
    const e = new Path2D(); e.ellipse(160, -50, 70, 46, 0.2, 0, TAU); ctx.fill(e);
    ctx.globalAlpha = 0.8;
    const j = new Path2D(); j.moveTo(-10, 196); j.quadraticCurveTo(120, 250, 214, 254); j.lineTo(214, 300); j.lineTo(-10, 300); j.closePath(); ctx.fill(j);
    ctx.globalAlpha = 1;
    ctx.restore();
    // линия челюсти, скула
    const jl = new Path2D(); jl.moveTo(-40, 150); jl.quadraticCurveTo(80, 236, 196, 254);
    jl.moveTo(70, 40); jl.quadraticCurveTo(120, 70, 150, 120);
    detailStroke(ctx, jl, darken(sk.s, 0.15), 3, 0.6);
    // ноздря, губы
    const n = new Path2D(); n.moveTo(236, 84); n.quadraticCurveTo(252, 96, 264, 90);
    detailStroke(ctx, n, '#5a2c24', 4, 0.9);
    const lip = new Path2D(); lip.moveTo(198, 152 - sm * 14); lip.quadraticCurveTo(216, 152 - sm * 6, 236, 150);
    detailStroke(ctx, lip, '#4a1f1a', 4.5, 1);
    const ll = new Path2D(); ll.moveTo(214, 178); ll.quadraticCurveTo(226, 182, 236, 172);
    detailStroke(ctx, ll, darken(sk.s, 0.2), 3, 0.6);
    if ((o.scar ?? (bulk > 0.6 ? 1 : 0)) > 0) {
      const sc = new Path2D(); sc.moveTo(214, 122); sc.quadraticCurveTo(220, 150, 216, 180);
      detailStroke(ctx, sc, '#7a3d33', 8, 0.5); detailStroke(ctx, sc, '#f4d0c2', 4.5, 0.95);
    }
  }
  // ухо
  const ear = smoothPath([[-36, -60], [-4, -84], [22, -40], [12, 30], [-8, 70], [-30, 60], [-46, 0]], true, 0.5);
  shadePath(ctx, ear, { b: sk.b, s: sk.s, w: 3, o: PAL.line }, 40);
  if (isNormal()) { const ei = new Path2D(); ei.moveTo(-20, -50); ei.bezierCurveTo(8, -50, 8, 10, -10, 40); ei.moveTo(-18, -10); ei.quadraticCurveTo(-4, 0, -14, 16); detailStroke(ctx, ei, darken(sk.s, 0.2), 4, 0.75); }
  // глаз
  if (isNormal()) {
    const ex = 168, ey = -46;
    if (open > 0.06) {
      const eye = new Path2D();
      eye.moveTo(128, ey + 2); eye.quadraticCurveTo(160, ey - 26 * open, 196, ey - 10 * open); eye.quadraticCurveTo(192, ey + 6, 186, ey + 14 * open); eye.quadraticCurveTo(156, ey + 14 * open, 128, ey + 2);
      ctx.fillStyle = '#ece6e1'; ctx.fill(eye);
      ctx.save(); ctx.clip(eye);
      const ic = mix(PAL.iris0, PAL.iris1, bulk);
      ctx.fillStyle = ic; ctx.beginPath(); ctx.ellipse(180 + (o.lookX || 0) * 6, ey - 2, 9, 19, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#050506'; ctx.beginPath(); ctx.ellipse(186 + (o.lookX || 0) * 6, ey - 2, 4, 10, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(188, ey - 9, 2.5, 4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(80,50,50,0.35)'; ctx.fillRect(120, ey - 30, 90, 14);
      ctx.restore();
    }
    const lid = new Path2D(); lid.moveTo(124, ey + 3); lid.quadraticCurveTo(158, ey - 28 * Math.max(open, 0.12), 200, ey - 12 * Math.max(open, 0.2));
    ctx.lineCap = 'round'; ctx.strokeStyle = '#0c0b0f'; ctx.lineWidth = 8; ctx.stroke(lid);
    const fl = new Path2D(); fl.moveTo(182, ey - 18 * Math.max(open, 0.2)); fl.lineTo(206, ey - 18 * Math.max(open, 0.2) - 6); ctx.lineWidth = 6; ctx.stroke(fl);
    const cr = new Path2D(); cr.moveTo(132, ey - 30 * Math.max(open, 0.4)); cr.quadraticCurveTo(160, ey - 46 * Math.max(open, 0.4), 192, ey - 30);
    detailStroke(ctx, cr, '#6a4034', 3, 0.6);
    const bw = new Path2D(); const bd = o.brow || 0;
    bw.moveTo(108, -96 + bd * 4); bw.quadraticCurveTo(160, -112 + bd * 6, 214, -92 + bd * 10); bw.lineTo(212, -80 + bd * 10); bw.quadraticCurveTo(160, -96 + bd * 6, 110, -84 + bd * 4); bw.closePath();
    ctx.fillStyle = '#131317'; ctx.fill(bw);
  }
  // волосы (профиль)
  const s = i => fbm(t * 1.6 + i * 1.7, i + 60) * (6 + wind * 18);
  const w = wind * 40;
  const hp = [
    [-150, 170], [-190, 210 + s(1), 1], [-215, 120], [-280 - w, 120 + s(2), 1], [-262, 30], [-322 - w, 0 + s(3), 1], [-280, -70],
    [-346 - w, -120 + s(4), 1], [-262, -180], [-300 - w, -290 + s(5), 1], [-180, -290], [-150 - w, -400 + s(6), 1], [-60, -332],
    [10 - w * 0.6, -414 + s(7), 1], [70, -330], [180 - w * 0.4, -350 + s(8), 1], [160, -270], [262 - w * 0.4, -224 + s(9), 1], [200, -210],
    [250 - w * 0.3, -110 + s(10), 1], [186, -170], [176 - w * 0.2, -74 + s(11), 1], [140, -170], [90, -150], [60, -60 + s(12) * 0.5, 1],
    [30, -150], [-20, -120], [-30, -20 + s(13) * 0.4, 1], [-60, -110], [-110, 40], [-130, 120],
  ];
  const hair = jagPath(hp, 0.42);
  shadePath(ctx, hair, { b: PAL.hair.b, s: PAL.hair.s, w: 3, o: PAL.line }, 90);
  if (isNormal()) {
    ctx.save(); ctx.clip(hair);
    const hl = new Path2D();
    for (let i = 0; i < 7; i++) { const x = -200 + i * 50; hl.moveTo(x, -300 + Math.abs(x) * 0.15); hl.quadraticCurveTo(x + 30, -270, x + 50, -250 + Math.abs(x) * 0.1); }
    detailStroke(ctx, hl, PAL.hair.hl, 9, 0.5);
    const sp = new Path2D();
    sp.moveTo(100, -250); sp.quadraticCurveTo(190, -200, 240, -120); sp.moveTo(40, -280); sp.quadraticCurveTo(80, -180, 60, -70);
    sp.moveTo(-120, -260); sp.quadraticCurveTo(-240, -150, -300, -10); sp.moveTo(-80, -200); sp.quadraticCurveTo(-180, 0, -190, 190);
    detailStroke(ctx, sp, '#000', 3, 0.55);
    ctx.restore();
  }
}

/* ---------- Макро глаза (сверхкрупный план) ----------
   p: {bulk, open, pupil, lookX, lookY, t, reflect(ctx) — отражение в радужке, glow} */
function drawEyeMacro(ctx, p) {
  const bulk = p.bulk ?? 1, t = p.t || 0;
  const sk = bulk > 0.5 ? PAL.skin : mixSkin(bulk);
  // кожа
  const g = ctx.createRadialGradient(0, 40, 50, 0, 40, 1300);
  g.addColorStop(0, sk.b); g.addColorStop(0.6, mix(sk.b, sk.s, 0.5)); g.addColorStop(1, darken(sk.s, 0.3));
  ctx.fillStyle = g; ctx.fillRect(-1400, -900, 2800, 1800);
  const cold = p.cold ?? bulk;
  const open = p.open ?? 1;
  const ew = 640, eh = 300;
  const peak = lerp(1.0, 0.72, cold), low = lerp(0.78, 0.6, cold);
  const L = (x, y) => [x * ew, y * eh];
  const up = [L(-1, 0.16), L(-0.5, -peak * open), L(0.3, -peak * open * 1.04), L(1, -0.3 * open - 0.12)];
  const lo = [L(0.96, 0.26), L(0.15, low * open + 0.04), L(-0.85, 0.34)];
  const eye = smoothPath([...up, ...lo], true, 0.45);
  // тени глазницы и складка века
  ctx.save();
  const crease = new Path2D();
  smoothPath([L(-0.95, -peak * open - 0.1), L(-0.3, -peak * open - 0.62), L(0.5, -peak * open - 0.6), L(1.05, -0.48)], false, 0.5, crease);
  ctx.strokeStyle = rgba(darken(sk.s, 0.35), 0.7); ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.stroke(crease);
  const lidSh = ctx.createLinearGradient(0, -eh * 1.7, 0, eh * 0.6);
  lidSh.addColorStop(0, rgba(sk.s, 0)); lidSh.addColorStop(0.62, rgba(darken(sk.s, 0.2), 0.7)); lidSh.addColorStop(1, rgba(sk.s, 0));
  ctx.fillStyle = lidSh; ctx.beginPath(); ctx.ellipse(0, -eh * 0.3, ew * 1.15, eh * 1.25, 0, 0, TAU); ctx.fill();
  ctx.restore();
  // бровь сверху
  const brow = new Path2D();
  smoothPath([L(-1.25, -1.95 + (p.brow || 0) * 0.2), L(-0.4, -2.12), L(0.6, -2.0), L(1.4, -1.75), L(1.4, -1.55), L(0.5, -1.72), L(-0.4, -1.8), L(-1.25, -1.7)], true, 0.4, brow);
  ctx.fillStyle = '#141418'; ctx.fill(brow);
  const bh = new Path2D();
  for (let i = 0; i < 26; i++) { const x = -1.2 + i * 0.1; bh.moveTo(x * ew, (-1.78 - Math.sin((x + 1.2) * 1.2) * 0.2) * eh); bh.lineTo((x + 0.14) * ew, (-1.98 - Math.sin((x + 1.3) * 1.2) * 0.18) * eh); }
  detailStroke(ctx, bh, '#2a2c36', 5, 0.7);
  if (open > 0.04) {
    ctx.fillStyle = '#eee8e3'; ctx.fill(eye);
    ctx.save(); ctx.clip(eye);
    // сосудики и тень века
    const sh = ctx.createLinearGradient(0, -eh, 0, eh * 0.5);
    sh.addColorStop(0, 'rgba(90,60,60,0.6)'); sh.addColorStop(0.45, 'rgba(90,60,60,0.08)'); sh.addColorStop(1, 'rgba(90,60,60,0.0)');
    ctx.fillStyle = sh; ctx.fillRect(-ew, -eh * 1.2, ew * 2, eh * 2.4);
    const ves = new Path2D(); const R = rng(77);
    for (let i = 0; i < 9; i++) { const sx = (R() > 0.5 ? 1 : -1) * ew * (0.75 + R() * 0.25), sy = (R() - 0.5) * eh * 0.5; ves.moveTo(sx, sy); ves.quadraticCurveTo(sx * 0.82, sy + (R() - 0.5) * 50, sx * (0.6 + R() * 0.1), sy + (R() - 0.5) * 60); }
    detailStroke(ctx, ves, '#c77b78', 2, 0.35);
    // радужка
    const ir = 250, ix = (p.lookX || 0) * 220, iy = 20 + (p.lookY || 0) * 80;
    const irisCol = mix(PAL.iris0, PAL.iris1, bulk);
    const ig = ctx.createRadialGradient(ix, iy, 30, ix, iy, ir);
    ig.addColorStop(0, lighten(irisCol, 0.25)); ig.addColorStop(0.55, irisCol); ig.addColorStop(0.92, darken(irisCol, 0.45)); ig.addColorStop(1, darken(irisCol, 0.8));
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU); ctx.fill();
    // волокна радужки
    const fib = new Path2D(); const RF = rng(5);
    for (let i = 0; i < 140; i++) {
      const a = (i / 140) * TAU + RF() * 0.04, r0 = ir * (0.3 + RF() * 0.12), r1 = ir * (0.7 + RF() * 0.28);
      fib.moveTo(ix + Math.cos(a) * r0, iy + Math.sin(a) * r0);
      fib.quadraticCurveTo(ix + Math.cos(a + 0.05) * (r0 + r1) / 2, iy + Math.sin(a + 0.05) * (r0 + r1) / 2, ix + Math.cos(a) * r1, iy + Math.sin(a) * r1);
    }
    ctx.strokeStyle = rgba(lighten(irisCol, 0.45), 0.35); ctx.lineWidth = 2.2; ctx.stroke(fib);
    const fib2 = new Path2D();
    for (let i = 0; i < 70; i++) { const a = (i / 70) * TAU + 0.02, r0 = ir * 0.5, r1 = ir * 0.95; fib2.moveTo(ix + Math.cos(a) * r0, iy + Math.sin(a) * r0); fib2.lineTo(ix + Math.cos(a) * r1, iy + Math.sin(a) * r1); }
    ctx.strokeStyle = rgba(darken(irisCol, 0.5), 0.35); ctx.lineWidth = 3; ctx.stroke(fib2);
    // зрачок
    const pr = ir * lerp(0.42, 0.3, cold) * (p.pupil ?? 1);
    const pg = ctx.createRadialGradient(ix, iy, pr * 0.6, ix, iy, pr * 1.15);
    pg.addColorStop(0, '#030304'); pg.addColorStop(0.85, '#050507'); pg.addColorStop(1, rgba('#050507', 0));
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(ix, iy, pr * 1.15, 0, TAU); ctx.fill();
    // отражение (силуэт атаки и т.п.)
    if (p.reflect) { ctx.save(); ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU); ctx.clip(); ctx.translate(ix, iy); p.reflect(ctx, ir); ctx.restore(); }
    // тень верхнего века на радужке
    const ts = ctx.createLinearGradient(0, -eh * peak * open, 0, -eh * peak * open + 160);
    ts.addColorStop(0, 'rgba(0,0,0,0.6)'); ts.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ts; ctx.fillRect(-ew, -eh * 1.2, ew * 2, eh * 1.5);
    // блики: «окно» и мелкий
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.ellipse(ix + 70, iy - 90, 46, 34, -0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.ellipse(ix - 90, iy + 110, 20, 12, 0.3, 0, TAU); ctx.fill();
    // влажный блик по нижнему краю
    const wet = new Path2D(); smoothPath([L(-0.7, low * open * 0.9), L(0, low * open + 0.02), L(0.7, low * open * 0.6)], false, 0.5, wet);
    detailStroke(ctx, wet, '#ffffff', 5, 0.35);
    ctx.restore();
  }
  // ресницы и веки
  const lash = new Path2D(); smoothPath(up, false, 0.45, lash);
  ctx.lineCap = 'round'; ctx.strokeStyle = '#0c0b0f';
  ctx.lineWidth = 34; ctx.stroke(lash);
  const lashes = new Path2D(); const RL = rng(9);
  for (let i = 0; i < 34; i++) {
    const k = i / 33;
    const x = lerp(-0.9, 1.05, k) * ew;
    const y = (k < 0.5 ? lerp(0.1, -peak * open, k * 2) : lerp(-peak * open, -0.3 * open - 0.12, (k - 0.5) * 2)) * eh;
    const len = 50 + 70 * Math.sin(k * PI) + RL() * 20;
    const ang = -PI / 2 - 0.55 + k * 1.15;
    lashes.moveTo(x, y); lashes.quadraticCurveTo(x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.6, x + Math.cos(ang + 0.4) * len, y + Math.sin(ang + 0.2) * len);
  }
  ctx.lineWidth = 5; ctx.stroke(lashes);
  const lw = new Path2D(); smoothPath(lo, false, 0.45, lw);
  ctx.strokeStyle = '#3a2420'; ctx.lineWidth = 9; ctx.stroke(lw);
}
