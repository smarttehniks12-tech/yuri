'use strict';
/* Руки крупным планом: ладони от первого лица, кулак сбоку, напряжённая рука. */
const PALM = { b: '#efbfa1', s: '#c98d72' };

// Ладонь (правая; mirror=-1 — левая), запястье в (0,0), пальцы вверх. curl 0..1
function drawPalm(ctx, o) {
  const sk = o.bulk > 0.5 ? PAL.skin : mixSkin(o.bulk || 0);
  const curl = o.curl || 0;
  const pm = { b: mix(sk.b, PALM.b, 0.5), s: sk.s, w: 3, o: PAL.line };
  ctx.save();
  ctx.scale(o.mirror || 1, 1);
  // предплечье и рукав
  shadePath(ctx, capsule(V(10, 0), V(40, 520), 72, 92, 1, 1), { b: sk.b, s: sk.s, w: 3, o: PAL.line }, 140);
  const sl = smoothPath([[-70, 420], [150, 380], [190, 700], [-110, 720]], true, 0.3);
  shadePath(ctx, sl, { b: PAL.tee.b, s: PAL.tee.s, w: 3, o: PAL.line }, 160);
  // большой палец
  const tb = V(66, -50), ta = -0.75 + curl * 0.55;
  const t1 = vadd(tb, vmul(dirUp(ta), 70)), t2 = vadd(t1, vmul(dirUp(ta - 0.25 - curl * 0.5), 58 * (1 - curl * 0.3)));
  shadePath(ctx, capsule(t1, t2, 26, 21, 1.05, 1), pm, 40);
  shadePath(ctx, capsule(tb, t1, 36, 27, 1.1, 1), pm, 50);
  // ладонь
  const palm = smoothPath([[-66, -6], [-80, -90], [-74, -170], [-30, -184], [20, -186], [70, -176], [86, -110], [80, -30], [50, 10], [-30, 14]], true, 0.5);
  shadePath(ctx, palm, pm, 160);
  // пальцы
  const F = [[-56, -166, 118, 27], [-19, -178, 150, 30], [19, -180, 162, 31], [56, -170, 148, 30]];
  F.forEach(([x, y, L, w], i) => {
    const c = clamp(curl * (1.05 - i * 0.05) + (o.tremble ? noise(o.t * 9 + i * 3, i) * 0.03 : 0));
    const spread = (i - 1.5) * 0.07 * (1 - c);
    const len = L * (1 - 0.72 * c);
    const base = V(x, y);
    const tip = vadd(base, vmul(dirUp(spread), len));
    const mid = vlerp(base, tip, 0.52);
    shadePath(ctx, capsule(base, tip, w * 0.5, w * (0.42 + c * 0.12), 1.02, 1.02), pm, w);
    if (isNormal()) {
      const k = new Path2D();
      for (const q of [0.48, 0.74]) { const pq = vlerp(base, tip, q + c * 0.1); k.moveTo(pq.x - w * 0.32, pq.y); k.quadraticCurveTo(pq.x, pq.y + 4, pq.x + w * 0.32, pq.y); }
      detailStroke(ctx, k, darken(pm.s, 0.15), 2.4, 0.6);
    }
  });
  if (isNormal()) {
    const ln = new Path2D();
    ln.moveTo(-70, -140); ln.quadraticCurveTo(-10, -150, 60, -128);
    ln.moveTo(-74, -108); ln.quadraticCurveTo(-10, -100, 40, -90);
    ln.moveTo(40, -170); ln.quadraticCurveTo(14, -90, 30, 0);
    detailStroke(ctx, ln, darken(pm.s, 0.2), 3, 0.65);
    // тень тенара
    const th = new Path2D(); th.ellipse(48, -40, 34, 60, -0.3, 0, TAU);
    detailFill(ctx, th, pm.s, 0.25);
  }
  ctx.restore();
}

// Кулак сбоку: запястье (0,0), предплечье уходит влево. curl 0..1, veins 0..1
function drawFistSide(ctx, o) {
  const bulk = o.bulk ?? 1, curl = o.curl || 0, t = o.t || 0;
  const sk = bulk > 0.5 ? PAL.skin : mixSkin(bulk);
  const mat = { b: sk.b, s: sk.s, w: 4, o: PAL.line };
  const back = { b: darken(sk.b, 0.15), s: darken(sk.s, 0.15), w: 4, o: PAL.line };
  // предплечье
  const fr = lerp(62, 80, bulk);
  const fore = capsule(V(-1100, 70), V(-10, 0), fr, lerp(44, 52, bulk), lerp(1.05, 1.25, bulk), lerp(1, 1.12, bulk));
  shadePath(ctx, fore, mat, 180);
  if (isNormal()) {
    ctx.save(); ctx.clip(fore);
    // мышечный рельеф
    const m = new Path2D(); m.moveTo(-1000, 40); m.quadraticCurveTo(-640, -20 - bulk * 30, -300, 14);
    detailStroke(ctx, m, darken(sk.s, 0.1), 5, 0.5 * bulk + 0.15);
    // вены
    const vv = o.veins || 0;
    if (vv > 0.01) {
      const R = rng(14);
      for (let i = 0; i < 4; i++) {
        const v = new Path2D(); let x = -980 + R() * 80, y = -20 + R() * 70;
        v.moveTo(x, y);
        for (let k = 0; k < 6; k++) { const nx = x + 150 + R() * 40, ny = y + (R() - 0.5) * 50; v.quadraticCurveTo((x + nx) / 2, (y + ny) / 2 + (R() - 0.5) * 30, nx, ny); x = nx; y = ny; if (x > -60) break; }
        ctx.save(); ctx.setLineDash([2000]); ctx.lineDashOffset = 2000 * (1 - clamp(vv * 1.3 - i * 0.1));
        detailStroke(ctx, v, darken(sk.s, 0.05), 11, 0.55);
        detailStroke(ctx, v, lighten(sk.b, 0.25), 4, 0.7);
        ctx.restore();
      }
    }
    // сухожилия у запястья
    const tn = new Path2D(); tn.moveTo(-260, -24); tn.lineTo(-40, -30); tn.moveTo(-240, 10); tn.lineTo(-30, 4);
    detailStroke(ctx, tn, lighten(sk.b, 0.2), 4, 0.35 * curl);
    ctx.restore();
  }
  // пальцы (дальние — за указательным)
  const seg = [74, 48, 38], wd = [34, 31, 27];
  const finger = (kx, ky, m, scale, dc) => {
    const c = clamp(curl + dc);
    let a = c * 1.45, p = V(kx, ky);
    const pts = [p];
    const angs = [c * 1.45, c * 1.45 + c * 1.75, c * 1.45 + c * 1.75 + c * 1.2];
    for (let i = 0; i < 3; i++) { a = angs[i]; p = vadd(p, V(Math.cos(a) * seg[i] * scale, Math.sin(a) * seg[i] * scale)); pts.push(p); }
    for (let i = 2; i >= 0; i--) shadePath(ctx, capsule(pts[i], pts[i + 1], wd[i] * scale, wd[Math.min(i + 1, 2)] * scale * 0.92, 1, 1), m, 50);
    return pts;
  };
  finger(160, -40, back, 0.9, -0.04);
  finger(170, -22, back, 0.95, -0.02);
  finger(172, -4, back, 1, 0);
  // ладонь/тыльная сторона
  const hand = smoothPath([[-20, -48], [80, -62], [170, -48], [196, -10], [186, 40], [120, 64], [30, 70], [-20, 46]], true, 0.5);
  shadePath(ctx, hand, mat, 110);
  const idx = finger(176, 14, mat, 1.06, 0.02);
  if (isNormal()) {
    // костяшки
    const k = new Path2D();
    for (let i = 0; i < 3; i++) { const x = 168 - i * 6, y = -40 + i * 20; k.moveTo(x - 12, y); k.quadraticCurveTo(x + 6, y - 6, x + 18, y + 2); }
    detailStroke(ctx, k, darken(sk.s, 0.2), 4, 0.6 * curl + 0.2);
    const tdn = new Path2D(); tdn.moveTo(10, -40); tdn.lineTo(150, -46); tdn.moveTo(14, -20); tdn.lineTo(150, -26);
    detailStroke(ctx, tdn, lighten(sk.b, 0.2), 4, 0.3 + curl * 0.3);
  }
  // большой палец
  const ta = lerp(0.5, -0.15, curl), tb = V(60, 40);
  const t1 = vadd(tb, V(Math.cos(ta) * 80, Math.sin(ta) * 80));
  const ta2 = ta + lerp(0.25, 0.9, curl);
  const t2 = vadd(t1, V(Math.cos(ta2) * 62, Math.sin(ta2) * 62));
  shadePath(ctx, capsule(t1, t2, 30, 25, 1, 1), mat, 50);
  shadePath(ctx, capsule(tb, t1, 44, 31, 1.1, 1), mat, 70);
  if (isNormal()) {
    const nl = new Path2D(); const nd = vnorm(vsub(t2, t1)), nn = V(-nd.y, nd.x);
    const n0 = vadd(t2, vmul(nd, -18)), n1 = vadd(n0, vmul(nn, -12));
    nl.moveTo(n1.x, n1.y); nl.quadraticCurveTo(t2.x + nd.x * 10 - nn.x * 14, t2.y + nd.y * 10 - nn.y * 14, t2.x + nd.x * 6, t2.y + nd.y * 6);
    detailStroke(ctx, nl, '#c48a76', 3, 0.7);
  }
  return idx;
}

// Напряжённая согнутая рука (сбоку): плечо слева, локоть, кулак вверху
function drawArmFlex(ctx, o) {
  const bulk = o.bulk ?? 1, flex = o.flex ?? 1, t = o.t || 0;
  const sk = bulk > 0.5 ? PAL.skin : mixSkin(bulk);
  const mat = { b: sk.b, s: sk.s, w: 4, o: PAL.line };
  const sh = V(-700, -40), el = V(0, 60);
  const fa = -PI / 2 + 0.45 - flex * 0.35;
  const wr = vadd(el, V(Math.cos(fa) * 560, Math.sin(fa) * 560));
  // предплечье
  shadePath(ctx, capsule(el, wr, lerp(72, 92, bulk), lerp(46, 56, bulk), lerp(1.05, 1.3, bulk), 1.05), mat, 170);
  // кулак
  ctx.save(); ctx.translate(wr.x, wr.y); ctx.rotate(fa);
  const fist = smoothPath([[-10, -70], [90, -76], [150, -50], [160, 10], [150, 70], [60, 80], [-10, 66]], true, 0.5);
  shadePath(ctx, fist, mat, 120);
  if (isNormal()) {
    const k = new Path2D(); for (let i = 0; i < 4; i++) { const y = -54 + i * 36; k.moveTo(110, y); k.quadraticCurveTo(140, y + 6, 150, y + 18); }
    detailStroke(ctx, k, darken(sk.s, 0.2), 4, 0.6);
  }
  ctx.restore();
  // плечо с бицепсом
  const bic = lerp(1.0, 1.6, bulk * flex);
  const ua = capsule(sh, el, lerp(100, 128, bulk), lerp(70, 82, bulk), bic, lerp(1.0, 1.25, bulk));
  shadePath(ctx, ua, mat, 220);
  if (isNormal()) {
    ctx.save(); ctx.clip(ua);
    // рельеф: разделение бицепс/трицепс, блик на бицепсе
    const d = new Path2D(); d.moveTo(-620, 20); d.quadraticCurveTo(-330, 70 - bulk * 30, -40, 44);
    detailStroke(ctx, d, darken(sk.s, 0.12), 6, 0.35 + bulk * 0.35);
    const hl = new Path2D(); hl.ellipse(-330, -60 - bulk * 30, 170, 30 + bulk * 18, 0.04, 0, TAU);
    detailFill(ctx, hl, lighten(sk.b, 0.3), 0.25 + bulk * 0.2);
    const vv = new Path2D(); vv.moveTo(-560, -20); vv.bezierCurveTo(-400, -40, -300, 20, -120, -10);
    detailStroke(ctx, vv, darken(sk.s, 0.05), 9, 0.4 * bulk);
    detailStroke(ctx, vv, lighten(sk.b, 0.2), 3, 0.5 * bulk);
    ctx.restore();
  }
  // рукав
  const sl = smoothPath([[-1300, -260], [-560, -190], [-470, -60], [-500, 120], [-1300, 200]], true, 0.4);
  const cl = o.outfit === 'toji' ? PAL.shirt : PAL.tee;
  shadePath(ctx, sl, { b: cl.b, s: cl.s, w: 4, o: PAL.line }, 200);
  if (isNormal()) {
    const f = new Path2D(); f.moveTo(-600, -150); f.quadraticCurveTo(-540, -60, -580, 60);
    detailStroke(ctx, f, cl.fold, 5, 0.6);
  }
  return { sh, el, wr };
}

// Синие «нити» проклятой энергии, исчезающие с ладоней
function drawWisps(ctx, x, y, t, amt, seed = 1) {
  if (amt <= 0.01) return;
  const R = rng(seed);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 18; i++) {
    const ph = R() * 10, sp = 60 + R() * 80;
    const u = (t * 0.9 + ph) % 2.2;
    const px = x + (R() - 0.5) * 260 + Math.sin(t * 2 + ph) * 30, py = y - u * sp * 2.2 + (R() - 0.5) * 80;
    const a = amt * clamp(1 - u / 2.2) * 0.8;
    drawSprite(ctx, Sprites.soft('#5ab8ff', 32), px, py, 60 + u * 40, a);
    drawSprite(ctx, Sprites.soft('#c8ecff', 16), px, py, 18, a);
  }
  ctx.restore();
}
