'use strict';
/* Главный герой: скелетная модель (вид сбоку) + вид спереди/сзади.
   bulk: 0 — обычный человек, 1 — тело Тоджи. outfit: 'tee' | 'toji'. */
const PAL = {
  skin: { b: '#dfa47d', s: '#a8664f', hl: '#f7d2b2' },
  skin0: { b: '#e7b894', s: '#b97c62', hl: '#f9dcc4' },
  hair: { b: '#16161c', s: '#09090c', hl: '#3d4458' },
  shirt: { b: '#1c1d24', s: '#0b0b0f', fold: '#3a3d49' },
  tee: { b: '#9b9ea8', s: '#676a75', fold: '#575a64' },
  pants: { b: '#ebe6dc', s: '#aba595', fold: '#8b8576' },
  sweat: { b: '#3c4050', s: '#242733', fold: '#1a1c25' },
  shoe: { b: '#26262b', s: '#121215' },
  line: '#0b0b10',
  iris0: '#5b3a28', iris1: '#2c5d52',
};

function heroDims(bulk) {
  return {
    torso: 150, neck: 22, headR: 31, upper: 92, fore: 84, hand: 32,
    thigh: 118, shin: 112, foot: 50, ankle: 14,
    shR: lerp(17, 26, bulk), ua1: lerp(14, 19.5, bulk), ua2: lerp(10.5, 15, bulk),
    fa1: lerp(11.5, 16.5, bulk), fa2: lerp(8.5, 10.5, bulk), neckR: lerp(12.5, 16.5, bulk),
  };
}

const POSE = {
  stand: { x: 0, y: -244, lean: 0.02, neck: 0.02, aF: 0.08, eF: 0.15, aB: -0.05, eB: 0.2, lF: 0.06, kF: 0.05, lB: -0.06, kB: 0.05, fF: 0, fB: 0, hF: 0.6, hB: 0.6 },
};
function pose(o) { return Object.assign({}, POSE.stand, o); }

// Прямая кинематика (вид сбоку, лицом вправо)
function heroFK(p, D) {
  const hip = V(p.x, p.y);
  const u = dirUp(p.lean), f = V(Math.cos(p.lean), Math.sin(p.lean));
  const L = (fx, uy) => V(hip.x + f.x * fx + u.x * uy, hip.y + f.y * fx + u.y * uy);
  const nb = L(2, D.torso);
  const sh = L(-4, D.torso - 18);
  const headA = p.lean + p.neck;
  const hu = dirUp(headA), hf = V(Math.cos(headA), Math.sin(headA));
  const headC = V(nb.x + hu.x * (D.neck + D.headR - 6) + hf.x * 4, nb.y + hu.y * (D.neck + D.headR - 6) + hf.y * 4);
  const arm = (a, e) => {
    const aw = a + p.lean * 0.5;
    const el = vadd(sh, vmul(dirDown(aw), D.upper));
    const wr = vadd(el, vmul(dirDown(aw + e), D.fore));
    return { el, wr, fa: aw + e, ua: aw };
  };
  const leg = (l, k, f0) => {
    const kn = vadd(hip, vmul(dirDown(l), D.thigh));
    const sa = l - k;
    const an = vadd(kn, vmul(dirDown(sa), D.shin));
    const fa = lerp(f0, -sa + f0, p.fr || 0); // fr=1: стопа следует за голенью (в воздухе/беге)
    const fdir = V(Math.cos(fa), Math.sin(fa));
    const toe = vadd(an, vadd(vmul(fdir, D.foot * 0.78), vmul(dirDown(sa), D.ankle)));
    const heel = vadd(an, vadd(vmul(fdir, -D.foot * 0.22), vmul(dirDown(sa), D.ankle)));
    return { kn, an, toe, heel, ta: l, sa };
  };
  return { hip, nb, sh, headC, headA, L, u, f, F: arm(p.aF, p.eF), B: arm(p.aB, p.eB), lF: leg(p.lF, p.kF, p.fF), lB: leg(p.lB, p.kB, p.fB) };
}

// ---------- части тела ----------
function drawHandSide(ctx, wr, ang, D, fist, mat, scaleSize = 1) {
  const d = dirDown(ang), n = V(d.y, -d.x); // n — сторона большого пальца (вперёд)
  const len = lerp(46, 30, fist) * scaleSize, th = lerp(20, 25, fist) * scaleSize;
  const p = new Path2D();
  const a = vadd(wr, vmul(n, th * 0.45)), b = vadd(wr, vmul(n, -th * 0.5));
  const tipF = vadd(wr, vadd(vmul(d, len), vmul(n, th * lerp(0.15, 0.3, fist))));
  const tipB = vadd(wr, vadd(vmul(d, len * lerp(0.86, 1, fist)), vmul(n, -th * lerp(0.3, 0.55, fist))));
  p.moveTo(a.x, a.y);
  const c1 = vadd(wr, vadd(vmul(d, len * 0.55), vmul(n, th * 0.62)));
  p.quadraticCurveTo(c1.x, c1.y, tipF.x, tipF.y);
  const c2 = vadd(wr, vadd(vmul(d, len * 1.12), vmul(n, -th * 0.15)));
  p.quadraticCurveTo(c2.x, c2.y, tipB.x, tipB.y);
  const c3 = vadd(wr, vadd(vmul(d, len * 0.45), vmul(n, -th * 0.72)));
  p.quadraticCurveTo(c3.x, c3.y, b.x, b.y);
  p.closePath();
  shadePath(ctx, p, mat, th);
  if (isNormal()) {
    const k = new Path2D();
    if (fist > 0.5) {
      // костяшки и сжатые пальцы
      for (let i = 0; i < 3; i++) {
        const q = vadd(wr, vadd(vmul(d, len * (0.62 + i * 0.0)), vmul(n, th * (0.25 - i * 0.28))));
        const q2 = vadd(q, vmul(d, len * 0.3));
        k.moveTo(q.x, q.y); k.lineTo(q2.x, q2.y);
      }
      const t1 = vadd(wr, vadd(vmul(d, len * 0.25), vmul(n, th * 0.42)));
      const t2 = vadd(wr, vadd(vmul(d, len * 0.62), vmul(n, th * 0.05)));
      k.moveTo(t1.x, t1.y); k.quadraticCurveTo(t2.x + n.x * 4, t2.y + n.y * 4, t2.x, t2.y);
    } else {
      for (let i = 0; i < 3; i++) {
        const q = vadd(wr, vadd(vmul(d, len * 0.55), vmul(n, th * (0.18 - i * 0.22))));
        const q2 = vadd(wr, vadd(vmul(d, len * 0.98), vmul(n, th * (0.05 - i * 0.2))));
        k.moveTo(q.x, q.y); k.lineTo(q2.x, q2.y);
      }
    }
    detailStroke(ctx, k, darken(mat.s, 0.35), 1.6 * scaleSize, 0.7);
  }
}

function drawArmSide(ctx, J, A, D, p, sk, outfit, far, fistAmt) {
  const mat = far ? { b: darken(sk.b, 0.18), s: darken(sk.s, 0.2), w: 2, o: PAL.line } : { b: sk.b, s: sk.s, w: 2.2, o: PAL.line };
  // предплечье
  const fa = capsule(A.el, A.wr, D.fa1, D.fa2, 1.15, 1.0);
  shadePath(ctx, fa, mat, D.fa1 * 2);
  drawHandSide(ctx, A.wr, A.fa, D, fistAmt, mat);
  // плечо + бицепс
  const ua = capsule(J.sh, A.el, D.ua1, D.ua2, 1.2, 1.12);
  shadePath(ctx, ua, mat, D.ua1 * 2);
  if (isNormal() && !far && D.ua1 > 17) {
    // рельеф: разделение бицепса/трицепса, вены на предплечье
    const d = vnorm(vsub(A.el, J.sh)), n = V(-d.y, d.x);
    const m1 = vadd(vlerp(J.sh, A.el, 0.45), vmul(n, -D.ua1 * 0.15));
    const m2 = vadd(vlerp(J.sh, A.el, 0.85), vmul(n, -D.ua2 * 0.3));
    const q = new Path2D(); q.moveTo(m1.x, m1.y); q.lineTo(m2.x, m2.y);
    detailStroke(ctx, q, darken(sk.s, 0.25), 1.6, 0.45);
    const d2 = vnorm(vsub(A.wr, A.el)), n2 = V(-d2.y, d2.x);
    const v1 = vadd(vlerp(A.el, A.wr, 0.15), vmul(n2, D.fa1 * 0.35));
    const v2 = vadd(vlerp(A.el, A.wr, 0.75), vmul(n2, D.fa2 * 0.1));
    const v = new Path2D(); v.moveTo(v1.x, v1.y); v.quadraticCurveTo(vlerp(v1, v2, 0.5).x + n2.x * 4, vlerp(v1, v2, 0.5).y + n2.y * 4, v2.x, v2.y);
    detailStroke(ctx, v, darken(sk.s, 0.2), 1.3, 0.35);
  }
  // рукав
  const sl = outfit === 'toji' ? PAL.shirt : PAL.tee;
  const sm = far ? { b: darken(sl.b, 0.2), s: darken(sl.s, 0.2), w: 2, o: PAL.line } : { b: sl.b, s: sl.s, w: 2.2, o: PAL.line };
  const endT = outfit === 'toji' ? 0.42 : 0.5;
  const sEnd = vlerp(J.sh, A.el, endT);
  const loose = outfit === 'toji' ? 1.5 : 4.5;
  const slv = capsule(vadd(J.sh, vmul(dirDown(p.lean), 3)), sEnd, D.ua1 + loose + 0.5, D.ua1 + loose - 1, 1.0, 1.0);
  shadePath(ctx, slv, sm, D.shR * 2);
}

function drawLegSide(ctx, Lg, D, p, outfit, far, flutter = 0) {
  const pm = outfit === 'toji' ? PAL.pants : PAL.sweat;
  const mat = far ? { b: darken(pm.b, 0.16), s: darken(pm.s, 0.18), w: 2, o: PAL.line } : { b: pm.b, s: pm.s, w: 2.2, o: PAL.line };
  const hip = V(p.x, p.y);
  const d1 = vnorm(vsub(Lg.kn, hip)), d2 = vnorm(vsub(Lg.an, Lg.kn));
  const nf1 = V(d1.y, -d1.x), nf2 = V(d2.y, -d2.x);
  const nk = vnorm(vadd(nf1, nf2));
  const baggy = outfit === 'toji' ? 1 : 0.55;
  const fl = flutter;
  const pts = [];
  const P = (pt, nn, w) => pts.push([pt.x + nn.x * w, pt.y + nn.y * w]);
  // перед
  P(vadd(hip, vmul(dirUp(p.lean), 26)), nf1, 30);
  P(vlerp(hip, Lg.kn, 0.5), nf1, 28 + 3 * baggy);
  P(Lg.kn, nk, 23 + 3 * baggy);
  P(vlerp(Lg.kn, Lg.an, 0.5), nf2, 21 + 5 * baggy + fl * 4);
  P(vlerp(Lg.kn, Lg.an, 0.86), nf2, 17 + 4 * baggy);
  P(Lg.an, nf2, 11);
  // манжета
  const cuff = vadd(Lg.an, vmul(d2, 6));
  P(cuff, nf2, 9); P(cuff, nf2, -9);
  // зад
  P(Lg.an, nf2, -12);
  P(vlerp(Lg.kn, Lg.an, 0.8), nf2, -(20 + 7 * baggy) - fl * 8);
  P(vlerp(Lg.kn, Lg.an, 0.45), nf2, -(23 + 6 * baggy) - fl * 6);
  P(Lg.kn, nk, -(24 + 3 * baggy));
  P(vlerp(hip, Lg.kn, 0.45), nf1, -(31 + 3 * baggy));
  P(vadd(hip, vmul(dirUp(p.lean), 26)), nf1, -34);
  // обувь (под штаниной)
  const sm = far ? { b: darken(PAL.shoe.b, 0.2), s: PAL.shoe.s, w: 2, o: PAL.line } : { b: PAL.shoe.b, s: PAL.shoe.s, w: 2, o: PAL.line };
  const fd = vnorm(vsub(Lg.toe, Lg.heel)), fu = V(fd.y, -fd.x);
  const sh = new Path2D();
  const up = (pt, k) => vadd(pt, vmul(fu, k));
  const h0 = up(Lg.heel, -1), t0 = up(Lg.toe, -1);
  sh.moveTo(h0.x, h0.y);
  sh.lineTo(t0.x, t0.y);
  const tc = up(Lg.toe, 12);
  sh.quadraticCurveTo(Lg.toe.x + fd.x * 6 + fu.x * 4, Lg.toe.y + fd.y * 6 + fu.y * 4, tc.x, tc.y);
  const ins = vadd(Lg.an, vmul(fd, 10));
  sh.quadraticCurveTo(ins.x + fu.x * 8, ins.y + fu.y * 8, Lg.an.x + fd.x * 2, Lg.an.y + fd.y * 2);
  const hb = up(Lg.heel, 14);
  sh.lineTo(hb.x, hb.y);
  sh.closePath();
  shadePath(ctx, sh, sm, 16);
  const path = smoothPath(pts, true, 0.45);
  shadePath(ctx, path, mat, 40);
  if (isNormal()) {
    // складки ткани
    const k = new Path2D();
    const bend = p.lF !== undefined ? Math.abs(Lg.ta - Lg.sa) : 0;
    const kb = vadd(Lg.kn, vmul(nk, -14));
    if (bend > 0.25) {
      k.moveTo(kb.x - d1.x * 18, kb.y - d1.y * 18); k.quadraticCurveTo(kb.x + nk.x * 8, kb.y + nk.y * 8, kb.x + d2.x * 18, kb.y + d2.y * 18);
    }
    const kf = vadd(Lg.kn, vmul(nk, 12));
    k.moveTo(kf.x - d1.x * 26, kf.y - d1.y * 26); k.quadraticCurveTo(kf.x - nk.x * 10, kf.y - nk.y * 10, kf.x + d2.x * 4, kf.y + d2.y * 4);
    const c1 = vadd(Lg.an, vmul(d2, -16));
    for (let i = 0; i < 3; i++) {
      const q = vadd(c1, vmul(d2, -i * 9));
      k.moveTo(q.x + nf2.x * (14 + i * 2), q.y + nf2.y * (14 + i * 2));
      k.quadraticCurveTo(q.x + d2.x * 6, q.y + d2.y * 6, q.x - nf2.x * (16 + i * 2), q.y - nf2.y * (16 + i * 2));
    }
    const th = vlerp(hip, Lg.kn, 0.3);
    k.moveTo(th.x - nf1.x * 22, th.y - nf1.y * 22); k.quadraticCurveTo(th.x + d1.x * 30, th.y + d1.y * 30, th.x - nf1.x * 8 + d1.x * 50, th.y - nf1.y * 8 + d1.y * 50);
    detailStroke(ctx, k, pm.fold, 1.8, 0.55);
  }
}

function torsoPts(bulk) {
  const A = { // Тоджи
    back: [[-14, 152], [-31, 139], [-41, 117], [-39, 92], [-31, 62], [-25, 36], [-29, 14], [-31, -8]],
    front: [[27, -8], [29, 14], [31, 36], [34, 60], [40, 80], [47, 98], [41, 122], [27, 138], [14, 150]],
  };
  const B = { // обычный
    back: [[-12, 150], [-24, 136], [-30, 114], [-29, 90], [-26, 62], [-24, 36], [-27, 14], [-29, -8]],
    front: [[28, -8], [32, 14], [34, 36], [32, 60], [33, 80], [36, 98], [31, 122], [22, 138], [12, 150]],
  };
  const m = (a, b) => a.map((v, i) => [lerp(b[i][0], v[0], bulk), lerp(b[i][1], v[1], bulk)]);
  return { back: m(A.back, B.back), front: m(A.front, B.front) };
}

function drawTorsoSide(ctx, J, D, p, bulk, outfit, breath = 0) {
  const tp = torsoPts(bulk);
  const W2 = (pt, k = 1) => { const q = J.L(pt[0] * (1 + breath * 0.02 * k), pt[1]); return [q.x, q.y]; };
  const loose = outfit === 'tee';
  let pts;
  if (loose) {
    // свободная футболка висит от груди вниз
    const fr = tp.front.map(v => v.slice());
    const chest = fr[5];
    for (let i = 0; i < 5; i++) fr[i][0] = Math.max(fr[i][0], chest[0] - 2 + (4 - i) * 0.8) + 3;
    fr[0][1] = -18;
    const bk = tp.back.map(v => [v[0] - 3, v[1]]);
    bk[bk.length - 1][1] = -18;
    pts = [...bk.map(v => W2(v)), ...fr.map(v => W2(v, 1))];
  } else {
    pts = [...tp.back.map(v => W2([v[0] - 1, v[1]])), ...tp.front.map(v => W2([v[0] + 1, v[1]]))];
  }
  const sl = outfit === 'toji' ? PAL.shirt : PAL.tee;
  // шея
  const neckEnd = vadd(J.headC, vmul(dirUp(J.headA), -16));
  shadePath(ctx, capsule(J.nb, neckEnd, D.neckR, D.neckR * 0.9, 1.05, 1.1), { b: PAL.skin.b, s: PAL.skin.s, w: 2, o: PAL.line }, 30);
  const path = smoothPath(pts, true, 0.5);
  shadePath(ctx, path, { b: sl.b, s: sl.s, w: 2.4, o: PAL.line }, 60);
  if (isNormal()) {
    const k = new Path2D();
    const Lp = (x, y) => J.L(x, y);
    if (!loose) {
      // рельеф груди и пресса под облегающей тканью
      const a = Lp(41 * bulk + 30 * (1 - bulk), 84), b = Lp(18, 80), c = Lp(4, 92);
      k.moveTo(a.x, a.y); k.quadraticCurveTo(b.x, b.y, c.x, c.y);
      for (let i = 0; i < 3; i++) {
        const y = 62 - i * 20;
        const q1 = Lp(30, y), q2 = Lp(18, y - 3);
        k.moveTo(q1.x, q1.y); k.lineTo(q2.x, q2.y);
      }
      const l1 = Lp(-30, 110), l2 = Lp(-12, 60);
      k.moveTo(l1.x, l1.y); k.quadraticCurveTo(Lp(-14, 92).x, Lp(-14, 92).y, l2.x, l2.y);
      detailStroke(ctx, k, sl.fold, 2, 0.55 * bulk + 0.1);
      // блик ткани на груди
      const g = new Path2D();
      const h1 = Lp(38, 112), h2 = Lp(44, 96);
      g.moveTo(h1.x, h1.y); g.quadraticCurveTo(Lp(47, 104).x, Lp(47, 104).y, h2.x, h2.y);
      detailStroke(ctx, g, '#5a5e6e', 3, 0.5);
    } else {
      for (let i = 0; i < 4; i++) {
        const q1 = Lp(30 - i * 6, 70 - i * 18), q2 = Lp(8 - i * 5, 40 - i * 16);
        k.moveTo(q1.x, q1.y); k.quadraticCurveTo(Lp(22, 50 - i * 16).x, Lp(22, 50 - i * 16).y, q2.x, q2.y);
      }
      detailStroke(ctx, k, sl.fold, 2, 0.5);
    }
  }
}

// Голова сбоку (лицом вправо). det — уровень детализации (0..1)
function drawHeadSide(ctx, J, p, look) {
  const o = look || {};
  const bulk = o.bulk ?? 1;
  ctx.save();
  ctx.translate(J.headC.x, J.headC.y);
  ctx.rotate(J.headA);
  const sk = bulk > 0.5 ? PAL.skin : PAL.skin0;
  const jaw = lerp(0, 3, bulk);
  const face = smoothPath([
    [-12, 27], [-25, 15], [-32, -3], [-24, -27], [-6, -35], [12, -32], [24, -23], [29, -11], [27, -6],
    [30, -1], [35.5, 6], [30.5, 10], [31, 14], [29, 17], [30.5, 19.5], [29.5, 26 + jaw * 0.3], [23, 32 + jaw * 0.5], [8, 31 + jaw * 0.3], [-4, 23 + jaw], [-10, 27],
  ], true, 0.42);
  shadePath(ctx, face, { b: sk.b, s: sk.s, w: 2, o: PAL.line }, 40);
  if (isNormal()) {
    // ухо
    const ear = new Path2D(); ear.ellipse(-7, 1, 5.5, 9, -0.15, 0, TAU);
    shadePath(ctx, ear, { b: sk.b, s: sk.s, w: 1.6, o: PAL.line }, 10);
    const ei = new Path2D(); ei.moveTo(-6, -4); ei.quadraticCurveTo(-10, 1, -6, 6);
    detailStroke(ctx, ei, sk.s, 1.3, 0.8);
    // челюсть
    const jl = new Path2D(); jl.moveTo(-3, 21); jl.quadraticCurveTo(8, 29, 22, 30);
    detailStroke(ctx, jl, sk.s, 1.4, 0.55);
    // глаз
    const open = o.eye ?? 1;
    const ey = -4;
    if (open > 0.15) {
      const ew = new Path2D();
      ew.moveTo(13.5, ey - 0.5); ew.quadraticCurveTo(18, ey - 4.2 * open, 23.5, ey - 1.6); ew.quadraticCurveTo(19, ey + 2.4 * open, 13.5, ey - 0.5);
      ctx.fillStyle = '#efe9e4'; ctx.fill(ew);
      ctx.save(); ctx.clip(ew);
      ctx.fillStyle = bulk > 0.5 ? PAL.iris1 : PAL.iris0;
      ctx.beginPath(); ctx.ellipse(20.5 + (o.lx || 0), ey - 0.5, 2.6, 3.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#050505'; ctx.beginPath(); ctx.ellipse(21 + (o.lx || 0), ey - 0.4, 1.2, 1.8, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    const lid = new Path2D();
    lid.moveTo(13, ey - 0.2); lid.quadraticCurveTo(18, ey - 4.6 * Math.max(open, 0.25), 24.5, ey - 1.8);
    detailStroke(ctx, lid, '#0b0b10', 2.2, 1);
    const brow = new Path2D(); const bd = o.brow ?? 0;
    brow.moveTo(12, -12 + bd * 0.3); brow.quadraticCurveTo(19, -14 + bd, 27.5, -11.5 + bd * 1.2);
    detailStroke(ctx, brow, '#101014', 2.6, 1);
    // нос, рот
    const ns = new Path2D(); ns.moveTo(29.5, 8.5); ns.quadraticCurveTo(31.5, 9.8, 33, 8.4);
    detailStroke(ctx, ns, sk.s, 1.2, 0.9);
    const m = new Path2D(); m.moveTo(24.5, 17.2 - (o.smile || 0) * 1.2); m.quadraticCurveTo(27, 17.6, 29.6, 17);
    detailStroke(ctx, m, '#5a2a22', 1.4, 0.9);
    if (bulk > 0.6 && o.scar !== false) {
      const sc = new Path2D(); sc.moveTo(27.4, 13.2); sc.lineTo(28.4, 20.8);
      detailStroke(ctx, sc, '#f1c4b0', 1.1, 0.8);
    }
  }
  drawHairSide(ctx, o.wind || 0, o.t || 0, bulk);
  ctx.restore();
}

function drawHairSide(ctx, wind, t, bulk) {
  const hm = { b: PAL.hair.b, s: PAL.hair.s, w: 1.6, o: PAL.line };
  const w = wind, s = i => noise(t * 2.2 + i * 1.7, i) * 1.6;
  // один контур: чёлка вперёд-вниз, макушка, затылок — немного «лохматый»
  const pts = [
    [-14, 15], [-24, 22 + s(1), 1], [-27, 10], [-37 - w * 6, 9 + s(2), 1], [-33, -2],
    [-42 - w * 8, -10 + s(3), 1], [-34, -17], [-40 - w * 9, -30 + s(4), 1], [-25, -31],
    [-22 - w * 8, -45 + s(5), 1], [-10, -37], [0 - w * 6, -46 + s(6), 1], [8, -37], [20 - w * 4, -40 + s(7), 1],
    [22, -30], [34 - w * 5, -22 + s(8), 1], [26, -20], [33 - w * 4, -8 + s(9), 1], [22, -15],
    [20 - w * 2, -4 + s(10), 1], [14, -17], [5, -16], [0, -4 + s(11) * 0.5, 1], [-6, -14], [-10, 4], [-14, 6],
  ];
  const mass = jagPath(pts, 0.42);
  shadePath(ctx, mass, hm, 30);
  if (isNormal()) {
    const hl = new Path2D();
    hl.moveTo(-20, -28); hl.quadraticCurveTo(-6, -36, 10, -31);
    hl.moveTo(-28, -14); hl.quadraticCurveTo(-27, -22, -20, -27);
    detailStroke(ctx, hl, PAL.hair.hl, 1.8, 0.55);
    const sp = new Path2D();
    sp.moveTo(12, -26); sp.lineTo(26, -12); sp.moveTo(-4, -28); sp.lineTo(-24, -14); sp.moveTo(-12, -30); sp.lineTo(-30, -26);
    detailStroke(ctx, sp, '#000', 1.2, 0.5);
  }
}

// Полная фигура сбоку. look: {bulk, outfit, eye, brow, wind, t, flutter, breath, sk}
function drawHeroSide(ctx, p, look = {}) {
  const bulk = look.bulk ?? 1, outfit = look.outfit || 'toji';
  const D = heroDims(bulk);
  const J = heroFK(p, D);
  const sk = bulk > 0.5 ? PAL.skin : mixSkin(bulk);
  drawArmSide(ctx, J, J.B, D, p, sk, outfit, true, p.hB);
  if (!look.noLegs) {
    drawLegSide(ctx, J.lB, D, p, outfit, true, (look.flutter || 0) * 0.8);
    drawLegSide(ctx, J.lF, D, p, outfit, false, look.flutter || 0);
  }
  drawTorsoSide(ctx, J, D, p, bulk, outfit, look.breath || 0);
  drawHeadSide(ctx, J, p, look);
  drawArmSide(ctx, J, J.F, D, p, sk, outfit, false, p.hF);
  return J;
}
function mixSkin(bulk) { return { b: mix(PAL.skin0.b, PAL.skin.b, bulk), s: mix(PAL.skin0.s, PAL.skin.s, bulk) }; }

// Циклы движения
function walkPose(ph, amt = 1, o = {}) {
  const s = Math.sin(ph * TAU), c = Math.cos(ph * TAU);
  return pose(Object.assign({
    y: -244 + Math.abs(c) * -5 * amt + 4,
    lean: 0.04 * amt,
    lF: 0.38 * s * amt, kF: (0.1 + 0.45 * Math.max(0, -c)) * amt * (s < 0 ? 1 : 0.4),
    lB: -0.38 * s * amt, kB: (0.1 + 0.45 * Math.max(0, c)) * amt * (s > 0 ? 1 : 0.4),
    fF: -0.15 * Math.max(0, s) * amt, fB: -0.15 * Math.max(0, -s) * amt,
    aF: -0.32 * s * amt + 0.05, eF: 0.25 + 0.15 * Math.max(0, -s),
    aB: 0.32 * s * amt, eB: 0.25 + 0.15 * Math.max(0, s),
    neck: -0.02, hF: 0.55, hB: 0.55,
  }, o));
}
function runPose(ph, o = {}) {
  const s = Math.sin(ph * TAU), c = Math.cos(ph * TAU);
  return pose(Object.assign({
    y: -232 - Math.abs(s) * 14,
    lean: 0.42,
    neck: -0.3,
    lF: 0.95 * s + 0.15, kF: 0.35 + 1.25 * Math.max(0, -s) + 0.4 * Math.max(0, c),
    lB: -0.95 * s + 0.15, kB: 0.35 + 1.25 * Math.max(0, s) + 0.4 * Math.max(0, -c),
    fF: 0.25, fB: 0.25, fr: 1,
    aF: -1.0 * s - 0.1, eF: 1.5, aB: 1.0 * s - 0.1, eB: 1.5,
    hF: 0.9, hB: 0.9,
  }, o));
}

// ---------------- Вид спереди / сзади ----------------
// opt: {back, bulk, t, wind, breath, armOut, elbow, headYaw, face:{...}, scaleFace}
function drawHeroFront(ctx, opt = {}) {
  const bulk = opt.bulk ?? 1, back = !!opt.back, t = opt.t || 0;
  const br = Math.sin(t * 1.6) * (opt.breath ?? 1);
  const sw = opt.shoulderW ?? lerp(74, 86, bulk);
  const sy = -380 - br * 1.5;
  const wind = opt.wind || 0;
  const flap = i => fbm(t * 3 + i * 3.1, i) * wind;
  const sk = bulk > 0.5 ? PAL.skin : mixSkin(bulk);
  const skin = { b: sk.b, s: sk.s, w: 2.2, o: PAL.line };
  const armO = opt.armOut ?? 0.08, elb = opt.elbow ?? 0.12;
  const arms = [-1, 1].map(sd => {
    const shp = V(sd * sw * 0.92, sy + 4);
    const a = sd * (armO + (opt.armSwing ? opt.armSwing * sd : 0));
    const el = vadd(shp, vmul(dirDown(a), 92));
    const wr = vadd(el, vmul(dirDown(a - sd * elb * -1 + (opt.foreOut || 0) * sd), 84));
    return { sd, shp, el, wr };
  });
  // ноги/штаны
  const tee = opt.outfit === 'tee';
  const pm = tee ? PAL.sweat : PAL.pants;
  const legs = [-1, 1].map(sd => {
    const hx = sd * 30, kx = sd * (34 + (opt.stance || 0) * 0.5), ax = sd * (38 + (opt.stance || 0));
    return { sd, hx, kx, ax };
  });
  for (const L of legs) {
    const s = L.sd, f = flap(L.sd + 3) * 10;
    const pts = [
      [s * 6, -228], [L.hx + s * 34, -246], [L.kx + s * 34 + f * 0.4, -130], [L.ax + s * 33 + f, -60], [L.ax + s * 20, -18], [L.ax + s * 17, -10],
      [L.ax - s * 17, -10], [L.ax - s * 20, -18], [L.ax - s * 29 + f, -64], [L.kx - s * 28 + f * 0.5, -132], [s * 4, -200],
    ];
    const path = smoothPath(pts, true, 0.45);
    // обувь
    const sh = new Path2D(); sh.ellipse(L.ax + s * 2, -6, 22, 11, 0, 0, TAU);
    shadePath(ctx, sh, { b: PAL.shoe.b, s: PAL.shoe.s, w: 2, o: PAL.line }, 18);
    shadePath(ctx, path, { b: pm.b, s: pm.s, w: 2.2, o: PAL.line }, 44);
    if (isNormal()) {
      const k = new Path2D();
      for (let i = 0; i < 3; i++) {
        const y = -40 - i * 10;
        k.moveTo(L.ax - s * 22, y); k.quadraticCurveTo(L.ax, y + 6, L.ax + s * 24, y - 2);
      }
      k.moveTo(L.kx - s * 10, -170); k.quadraticCurveTo(L.kx + s * 4, -150, L.kx + s * 2, -120);
      k.moveTo(L.hx + s * 20, -228); k.quadraticCurveTo(L.kx + s * 10, -190, L.kx + s * 24, -150);
      detailStroke(ctx, k, pm.fold, 2, 0.5);
    }
  }
  // руки (за торсом: дальняя часть плеч)
  const drawArm = A => {
    const fa = capsule(A.el, A.wr, lerp(12.5, 18, bulk), lerp(9, 11.5, bulk), 1.14, 1.1);
    shadePath(ctx, fa, skin, 30);
    // кисть
    const d = vnorm(vsub(A.wr, A.el));
    const hp = new Path2D();
    const hc = vadd(A.wr, vmul(d, 16));
    hp.ellipse(hc.x, hc.y, 12, 19, Math.atan2(d.y, d.x) - PI / 2, 0, TAU);
    shadePath(ctx, hp, skin, 22);
    const ua = capsule(A.shp, A.el, lerp(15, 22, bulk), lerp(11, 15.5, bulk), 1.15, 1.15);
    shadePath(ctx, ua, skin, 36);
  };
  arms.forEach(drawArm);
  // рукава
  for (const A of arms) {
    const se = vlerp(A.shp, A.el, 0.42);
    const sl = capsule(vadd(A.shp, V(-A.sd * 3, -2)), se, lerp(17, 23.5, bulk), lerp(15, 20.5, bulk), 1.03, 1.03);
    const SC = tee ? PAL.tee : PAL.shirt;
    shadePath(ctx, sl, { b: SC.b, s: SC.s, w: 2.2, o: PAL.line }, 40);
  }
  // торс (рубашка)
  const S = tee ? PAL.tee : PAL.shirt;
  const neckW = lerp(15, 21, bulk);
  const tw = sw, waist = lerp(52, 54, bulk), lat = lerp(62, 76, bulk);
  const tor = smoothPath([
    [-neckW, -408], [-tw * 0.55, -398 - br], [-tw * 0.96, -386 - br], [-tw * 1.02, -368], [-tw * 0.88, -338], [-lat, -306], [-waist, -262], [-58, -232],
    [0, -228], [58, -232], [waist, -262], [lat, -306], [tw * 0.88, -338], [tw * 1.02, -368], [tw * 0.96, -386 - br], [tw * 0.55, -398 - br], [neckW, -408],
  ], true, 0.5);
  // шея
  const neck = new Path2D();
  neck.moveTo(-neckW, -400); neck.lineTo(-neckW * 0.9, -445); neck.lineTo(neckW * 0.9, -445); neck.lineTo(neckW, -400); neck.closePath();
  shadePath(ctx, neck, skin, 30);
  shadePath(ctx, tor, { b: S.b, s: S.s, w: 2.4, o: PAL.line }, 90);
  if (isNormal()) {
    const k = new Path2D();
    if (!back) {
      // ворот
      k.moveTo(-neckW - 6, -404); k.quadraticCurveTo(0, -390, neckW + 6, -404);
      // грудные
      k.moveTo(-6, -386); k.quadraticCurveTo(-44, -338, -70, -350);
      k.moveTo(6, -386); k.quadraticCurveTo(44, -338, 70, -350);
      k.moveTo(0, -372); k.lineTo(0, -250);
      for (let i = 0; i < 3; i++) { const y = -318 + i * 22; k.moveTo(-26, y); k.quadraticCurveTo(-12, y + 4, -3, y); k.moveTo(26, y); k.quadraticCurveTo(12, y + 4, 3, y); }
    } else {
      k.moveTo(0, -400); k.lineTo(0, -240);
      k.moveTo(-14, -380); k.quadraticCurveTo(-54, -360, -48, -318);
      k.moveTo(14, -380); k.quadraticCurveTo(54, -360, 48, -318);
      k.moveTo(-60, -300); k.quadraticCurveTo(-40, -280, -20, -284);
      k.moveTo(60, -300); k.quadraticCurveTo(40, -280, 20, -284);
    }
    detailStroke(ctx, k, S.fold, 2.2, 0.55);
  }
  // голова
  ctx.save();
  ctx.translate(0, -440 + (opt.headDY || 0));
  ctx.rotate(opt.headTilt || 0);
  const fs = 68 / 560;
  ctx.translate(0, -4);
  ctx.scale(fs, fs);
  drawFace(ctx, Object.assign({ yaw: 0, bulk, t, back, wind, detail: 0.6, noNeck: true, outfit: opt.outfit }, opt.face || {}));
  ctx.restore();
  return { arms };
}
