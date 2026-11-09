'use strict';
/* Сцена 3: первые способности — шаг, рывок, прыжок, приземление, удар по столбу. */
const HZ = 1500;          // глубина, на которой действует герой
const X0 = -470, X1 = 6200, XL = 7150, XP = 7600;

function plant(p) {
  const D = heroDims(1);
  const h = l => D.thigh * Math.cos(l) + D.shin * Math.cos(l - (l === p.lF ? p.kF : p.kB)) + D.ankle;
  p.y = -Math.max(D.thigh * Math.cos(p.lF) + D.shin * Math.cos(p.lF - p.kF), D.thigh * Math.cos(p.lB) + D.shin * Math.cos(p.lB - p.kB)) - D.ankle;
  return p;
}
const PZ = {
  stand: pose({}),
  crouch: plant(pose({ lean: 0.55, neck: -0.4, lF: 1.25, kF: 2.1, lB: 0.55, kB: 1.95, aF: -0.5, eF: 0.8, aB: -0.7, eB: 0.7, hF: 0.9, hB: 0.9 })),
  coil: plant(pose({ lean: 0.5, neck: -0.42, lF: 0.85, kF: 1.35, lB: -0.55, kB: 0.55, fB: 0.3, aF: -0.7, eF: 1.2, aB: 0.6, eB: 1.1, hF: 1, hB: 1 })),
  land: plant(pose({ lean: 0.95, neck: -0.75, lF: 1.45, kF: 2.45, lB: 0.25, kB: 2.25, aF: 1.15, eF: 0.15, aB: -1.0, eB: 0.4, hF: 0.2, hB: 0.8, fB: 0.6 })),
  skid: plant(pose({ lean: -0.12, neck: 0.12, lF: 1.0, kF: 0.25, lB: -0.1, kB: 1.35, aF: 1.0, eF: 0.4, aB: -0.8, eB: 0.6, hF: 0.6, hB: 0.6 })),
  rise: pose({ lean: 0.12, neck: -0.1, lF: 0.25, kF: 0.35, lB: -0.35, kB: 0.6, aF: -0.15, eF: 0.3, aB: -0.3, eB: 0.3, fr: 1, fF: 0.3, fB: 0.3 }),
  apex: pose({ lean: 0.05, neck: 0.25, lF: 1.0, kF: 1.6, lB: 0.1, kB: 1.0, aF: 0.35, eF: 0.7, aB: -0.35, eB: 0.6, fr: 1, fF: 0.2, fB: 0.3 }),
  dive: pose({ lean: 0.25, neck: 0.3, lF: 0.45, kF: 1.1, lB: 0.15, kB: 0.9, aF: 2.6, eF: 0.3, aB: 2.85, eB: 0.4, fr: 1, fF: 0.1, fB: 0.2 }),
  fight: plant(pose({ lean: 0.08, neck: 0.04, lF: 0.38, kF: 0.4, lB: -0.38, kB: 0.28, aF: 0.6, eF: 1.75, aB: 0.85, eB: 1.9, hF: 1, hB: 1 })),
  wind: plant(pose({ lean: -0.03, neck: 0.06, lF: 0.42, kF: 0.55, lB: -0.48, kB: 0.38, aF: -0.55, eF: 2.1, aB: 1.15, eB: 1.35, hF: 1, hB: 1 })),
  punch: plant(pose({ lean: 0.3, neck: 0.0, lF: 0.62, kF: 0.5, lB: -0.62, kB: 0.12, aF: 1.42, eF: 0.02, aB: -0.45, eB: 1.6, hF: 1, hB: 1 })),
};

function heroAt(ctx, cam, X, Y, Z, p, look = {}, flip = false) {
  const q = cam.P(X, Y, Z);
  if (!q) return null;
  ctx.save(); ctx.translate(q.x, q.y); ctx.scale(q.s * (flip ? -1 : 1), q.s);
  drawHeroSide(ctx, p, Object.assign({ bulk: 1, outfit: 'toji' }, look));
  ctx.restore();
  return q;
}
function groundShadow(ctx, cam, X, Z, r, a = 0.35, Y = 0) {
  const q = cam.P(X, 0, Z);
  if (!q) return;
  const k = 1 / (1 + Y / 1200);
  ctx.save(); ctx.globalAlpha = a * k;
  drawSprite(ctx, Sprites.soft('#000000', 64), q.x, q.y, r * 2.2 * q.s * k, a * k);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.globalAlpha = a * k;
  ctx.beginPath(); ctx.ellipse(q.x, q.y, r * q.s * k, r * 0.18 * q.s * k, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
const LDAY = () => setLight({ kx: 0.55, ky: -0.85, ko: 0.22, rx: -0.85, ry: -0.45, ro: 0.07, rim: '#fff1d6', rimA: 0.55, tint: '#ffe6c4', tintA: 0.06 });
const GDAY = { sat: 1.05, con: 1.08, tint: '#ffcf8a', tintA: 0.12, shadow: '#3a4a7a', shadowA: 0.18, bloom: 0.35, vig: 0.5 };
// импакт-кадры: чёрные силуэты на белом с радиальными линиями
function impactFrame(ctx, t, t0, drawFn, cx, cy) {
  const k = Math.floor((t - t0) * FPS);
  if (t < t0 || k > 2) return false;
  const neg = k % 2 === 1;
  bg(ctx, neg ? '#000' : '#fff');
  RENDER.mode = neg ? 'neg' : 'impact';
  drawFn();
  RENDER.mode = 'normal';
  FX.speedLines(ctx, cx, cy, t0 + k * 0.1, 1, { color: neg ? '#fff' : '#000', n: 120, inner: 180, alpha: 1, seed: k });
  return true;
}

// 3A: общий план площадки, кран вниз, герой входит
shot(24.0, 26.6, (ctx, lt, t) => {
  LDAY();
  const u = seg(lt, 0, 2.3, E.ioC);
  const cam = makeCam({ x: lerp(-1500, -1050, lt / 2.6), y: lerp(2300, 330, u), z: lerp(-3800, -2700, u), f: 1300, hy: lerp(120, 560, u) });
  drawCourtyard(ctx, cam, SKY.day, t, { sky: { sunX: 1500, sunY: 140 } });
  const X = lerp(-1950, -820, lt / 2.6);
  groundShadow(ctx, cam, X, HZ, 120, 0.4);
  heroAt(ctx, cam, X, 0, HZ, walkPose(X / 720 + 0.1), { t, wind: 0.2 });
  FX.leaves(ctx, t, { n: 12, size: 14 });
}, { name: '3A', grade: GDAY, post: (ctx, lt) => flashWhite(ctx, 1 - seg(lt, 0, 0.35, E.outQ)) });

function walkX(t) { return t < 27.55 ? -820 + 360 * (t - 26.6) : -820 + 360 * 0.95 + 160 * E.outQ(clamp((t - 27.55) / 0.4)); }
// 3B: ноги крупно — один обычный шаг
shot(26.6, 28.05, (ctx, lt, t) => {
  LDAY();
  const X = walkX(t);
  const cam = makeCam({ x: X + 40 - lt * 30, y: 75, z: HZ - 950, f: 1500, hy: H * 0.4 });
  drawCourtyard(ctx, cam, SKY.day, t, { sky: { sunX: 1500, sunY: 60 } });
  const stop = seg(t, 27.55, 27.95);
  const ph = (X / 720) + 0.25 - (-820 + 360 * 0.55) / 720;
  const p = mixObj(walkPose(ph), PZ.stand, stop);
  groundShadow(ctx, cam, X, HZ, 120, 0.45);
  heroAt(ctx, cam, X, 0, HZ, p, { t, wind: 0.1 });
  const fq = cam.P(X + 120, 0, HZ);
  FX.dust(ctx, fq.x, fq.y, fq.s * 0.6, t, T.step1, { n: 10, seed: 3, speed: 500, size: 120, life: 1.2, alpha: 0.35, flat: 0.25 });
}, { name: '3B', grade: GDAY });

// 3B': «а второй…» — нога продавливает землю, камешки дрожат
shot(28.05, 29.0, (ctx, lt, t) => {
  LDAY();
  const X = walkX(t);
  const amp = seg(t, 28.3, 28.95, E.inQ);
  const sh = { x: noise(t * 40, 1) * 5 * amp, y: noise(t * 40, 2) * 5 * amp, r: 0 };
  const cam = makeCam({ x: X - 120, y: 45, z: HZ - 560, f: 1500, hy: H * 0.36 });
  ctx.save(); ctx.translate(sh.x, sh.y);
  drawCourtyard(ctx, cam, SKY.day, t, { sky: { sunX: 1400, sunY: -60 }, pillars: false });
  const u = seg(t, 28.1, 28.6, E.ioC);
  const p = mixObj(PZ.stand, PZ.coil, u);
  p.y += noise(t * 30, 4) * 1.5 * amp;
  const backFoot = X - 140;
  drawCracks(ctx, cam, backFoot, HZ, 900, seg(t, 28.35, 28.95, E.outQ), 5);
  groundShadow(ctx, cam, X, HZ, 140, 0.5);
  heroAt(ctx, cam, X, 0, HZ, p, { t, wind: 0.15, flutter: amp * 0.6 });
  // камешки подпрыгивают
  const R = rng(12);
  for (let i = 0; i < 18; i++) {
    const px = backFoot + (R() - 0.5) * 900, pz = HZ + (R() - 0.5) * 300;
    const hop = Math.abs(Math.sin(t * (18 + R() * 10) + i)) * 30 * amp * R();
    const q = cam.P(px, hop, pz);
    if (!q) continue;
    ctx.fillStyle = R() > 0.5 ? '#6e665b' : '#4b453e';
    ctx.beginPath(); ctx.ellipse(q.x, q.y, (6 + R() * 10) * q.s * 3, (4 + R() * 6) * q.s * 3, R() * 3, 0, TAU); ctx.fill();
  }
  ctx.restore();
}, { name: "3B'", frame: { x: 1060 }, grade: GDAY, post: (ctx, lt, t) => flashWhite(ctx, seg(t, 28.9, 29.0, E.inQ) * 0.9) });

// 3C: рывок — мгновенное ускорение, камера «хлыстом» догоняет
function dashX(t) {
  if (t < 29.02) return X0;
  if (t < 29.3) return lerp(X0, X1 - 260, E.outQ((t - 29.02) / 0.28));
  return lerp(X1 - 260, X1, E.outC(clamp((t - 29.3) / 0.45)));
}
shot(29.0, 30.75, (ctx, lt, t) => {
  LDAY();
  const camX = t < 29.06 ? X0 + 100 : lerp(X0 + 100, X1 - 60, E.ioE(clamp((t - 29.06) / 0.5)));
  const sh = FX.addShake(FX.shake(t, T.dash, 22, 0.6), FX.shake(t, 29.3, 10, 0.5));
  const cam = makeCam({ x: camX + sh.x, y: 260 + sh.y, z: HZ - 3000, f: 1250, hy: H * 0.56 });
  drawCourtyard(ctx, cam, SKY.day, t, { sky: { sunX: 1500, sunY: 150 } });
  // след разрушения: кратер на старте и борозда
  drawCracks(ctx, cam, X0 - 140, HZ, 1100, 1, 5);
  const X = dashX(t);
  const a = cam.P(X0, 0, HZ), b = cam.P(Math.max(X0, X - 200), 0, HZ);
  if (a && b && t > 29.02) {
    ctx.fillStyle = 'rgba(40,30,25,0.45)';
    ctx.beginPath(); ctx.moveTo(a.x, a.y - 4); ctx.lineTo(b.x, b.y - 2); ctx.lineTo(b.x, b.y + 4); ctx.lineTo(a.x, a.y + 8); ctx.closePath(); ctx.fill();
  }
  // поза: старт → бег (смаз) → занос → стойка
  let p;
  if (t < 29.02) p = PZ.coil;
  else if (t < 29.3) p = runPose((t - 29.02) * 6, {});
  else if (t < 29.85) p = mixObj(runPose(1.7), PZ.skid, seg(t, 29.3, 29.45, E.outQ));
  else p = mixObj(PZ.skid, pose({ neck: -0.05, aF: 0.1, aB: -0.1 }), seg(t, 29.85, 30.5, E.ioC));
  // послеобразы во время рывка
  if (t > 29.02 && t < 29.6) {
    for (let k = 1; k <= 4; k++) {
      const tx = t - k * 0.045;
      if (tx < 29.02) break;
      const q = cam.P(dashX(tx), 0, HZ);
      FX.afterimage(ctx, () => { ctx.translate(q.x, q.y); ctx.scale(q.s, q.s); drawHeroSide(ctx, runPose((tx - 29.02) * 6), { bulk: 1 }); }, 0.28 / k, '#cfeeff');
    }
  }
  groundShadow(ctx, cam, X, HZ, 130, 0.4);
  heroAt(ctx, cam, X, 0, HZ, p, { t, wind: t > 29.02 && t < 29.6 ? 1 : 0.3, flutter: t < 29.9 ? 1 : 0.3, eye: 1, lx: t > 30.1 ? -2 : 0 });
  // пыль: взрыв на старте, шлейф и брызги при заносе
  const s0 = cam.P(X0, 0, HZ);
  if (s0) {
    FX.dust(ctx, s0.x, s0.y, s0.s * 2.2, t, T.dash, { n: 30, seed: 4, speed: 1300, size: 220, life: 2.5, alpha: 0.6, up: true, flat: 0.5 });
    FX.debris(ctx, s0.x, s0.y, s0.s * 2.2, t, T.dash, { n: 26, seed: 6, speed: 1500, size: 22, ground: s0.y + 10 });
    const ra = seg(t, T.dash, T.dash + 0.45, E.outC); const rOn = t >= T.dash ? 1 : 0;
    FX.ring(ctx, s0.x + ra * 300 * s0.s, s0.y - 120 * s0.s, (40 + ra * 600) * s0.s, (1 - ra) * rOn * 0.9, 1.0, 8);
  }
  const sk = cam.P(X - 60, 0, HZ);
  if (sk) FX.dust(ctx, sk.x, sk.y, sk.s * 2, t, 29.32, { n: 22, seed: 9, dir: PI + 0.15, spread: 0.8, speed: 1500, size: 200, life: 2.2, alpha: 0.55, flat: 0.3 });
  FX.streaks(ctx, t, win(t, 29.03, 29.06, 29.4, 29.55), { n: 40, dir: -1, color: '#ffffff', y0: 250, y1: 900 });
  FX.leaves(ctx, t * (t > 29.05 ? 1.6 : 1), { n: 16, size: 15, wind: 4, seed: 33 });
}, { name: '3C', grade: GDAY,
  mb: lt => (lt > 0.0 && lt < 0.65 ? { n: 7, shutter: 1 } : 1),
  post: (ctx, lt, t) => flashWhite(ctx, win(t, 29.0, 29.01, 29.03, 29.12) * 0.8) });

// 3D: прыжок «выше крыш» — камера взмывает следом
function jumpY(t) {
  if (t < T.jump) return 0;
  if (t < T.apex) return 4300 * E.outC((t - T.jump) / (T.apex - T.jump));
  if (t < 32.05) return 4300 + 30 * Math.sin((t - T.apex) * 8);
  return 4300 - 0.5 * 9000 * Math.pow(t - 32.05, 2);
}
shot(30.75, 32.3, (ctx, lt, t) => {
  LDAY();
  const Y = jumpY(t), Yl = jumpY(Math.max(30.75, t - 0.07));
  const X = X1 + Math.max(0, t - T.jump) * 520;
  const sh = FX.shake(t, T.jump, 20, 0.5);
  const cam = makeCam({ x: X1 + 120 + Math.max(0, t - T.jump) * 480 + sh.x, y: 110 + Yl * 0.86 + sh.y, z: HZ - 1750, f: 1300, hy: lerp(H * 0.64, H * 0.95, seg(t, T.jump, T.apex)) });
  drawCourtyard(ctx, cam, SKY.day, t, { sky: { sunX: 1180, sunY: cam.hy - 1500 + (cam.y - 110) * 0.05, sunR: 80 } });
  drawCracks(ctx, cam, X1, HZ, 900, seg(t, T.jump, T.jump + 0.1), 8);
  const g = cam.P(X1, 0, HZ);
  if (g) {
    FX.dust(ctx, g.x, g.y, g.s * 1.6, t, T.jump, { n: 26, seed: 11, speed: 1100, size: 200, life: 2, alpha: 0.6, flat: 0.25 });
    FX.debris(ctx, g.x, g.y, g.s * 1.6, t, T.jump, { n: 22, seed: 13, speed: 1300, size: 20, ground: g.y + 6 });
    const ra = seg(t, T.jump, T.jump + 0.5, E.outC); const rOn = t >= T.jump ? 1 : 0;
    FX.ring(ctx, g.x, g.y, (60 + ra * 900) * g.s, (1 - ra) * rOn * 0.85, 0.22, 10);
  }
  let p;
  if (t < T.jump) p = mixObj(PZ.stand, PZ.crouch, seg(t, 30.78, T.jump, E.outQ));
  else if (t < T.apex - 0.25) p = mixObj(PZ.crouch, PZ.rise, seg(t, T.jump, T.jump + 0.12, E.outQ));
  else if (t < 32.05) p = mixObj(PZ.rise, PZ.apex, seg(t, T.apex - 0.25, T.apex + 0.05));
  else p = mixObj(PZ.apex, PZ.dive, seg(t, 32.05, 32.3));
  if (t >= T.jump) p.y = -244;
  groundShadow(ctx, cam, X, HZ, 130, 0.45, Y);
  heroAt(ctx, cam, X, Y, HZ, p, { t, wind: t > T.jump ? 0.9 : 0.2, flutter: t > T.jump ? 0.8 : 0 });
  // блик солнца на вершине
  const fl = win(t, T.apex - 0.2, T.apex, 32.05, 32.25);
  drawSprite(ctx, Sprites.soft('#fff4d6', 128), 1180, cam.hy - 1500 + (cam.y - 110) * 0.05, 900, fl * 0.5);
  FX.streaks(ctx, t, win(t, T.jump, T.jump + 0.05, T.jump + 0.4, T.apex - 0.1) * 0.7, { n: 30, color: '#ffffff', y0: 0, y1: H, seed: 2 });
}, { name: '3D', grade: GDAY, mb: lt => (lt + 30.75 > T.jump && lt + 30.75 < T.jump + 0.5 ? { n: 5, shutter: 0.8 } : 1) });

// 3E: приземление — ударная волна, трещины, пыль
shot(32.3, 33.35, (ctx, lt, t) => {
  LDAY();
  const sh = FX.shake(t, T.land, 34, 0.9, 30);
  const cam = makeCam({ x: XL - 150 + sh.x, y: 200 + sh.y, z: HZ - 2300, f: 1250, hy: H * 0.56, roll: sh.r * 2 });
  const drawAll = () => {
    const Y = t < T.land ? lerp(2700, 0, (t - 32.3) / (T.land - 32.3)) : 0;
    let p;
    if (t < T.land) p = PZ.dive;
    else if (t < 32.78) p = PZ.land;
    else p = mixObj(PZ.land, pose({ lean: 0.05, neck: 0.02, hF: 1, hB: 1 }), seg(t, 32.78, 33.3, E.ioC));
    if (t < T.land) p = Object.assign({}, p, { y: -244 });
    return { Y, p };
  };
  const st = drawAll();
  const fr = impactFrame(ctx, t, T.land, () => { const q = cam.P(XL, 0, HZ); ctx.save(); ctx.translate(q.x, q.y); ctx.scale(q.s, q.s); drawHeroSide(ctx, st.p, { bulk: 1 }); ctx.restore(); }, cam.P(XL, 120, HZ).x, cam.P(XL, 120, HZ).y);
  if (fr) return;
  withCam(ctx, cam, () => {
    drawCourtyard(ctx, cam, SKY.day, t, { sky: { sunX: 1500, sunY: 150 }, pillarList: [[XP, HZ + 2600], [3600, 3800]] });
    const prog = seg(t, T.land, T.land + 0.12, E.outQ);
    drawCracks(ctx, cam, XL, HZ, 1500, prog, 21);
    const g = cam.P(XL, 0, HZ);
    const ra = seg(t, T.land, T.land + 0.6, E.outC); const rOn = t >= T.land ? 1 : 0;
    FX.ring(ctx, g.x, g.y, (80 + ra * 1700) * g.s, (1 - ra) * rOn, 0.2, 14);
    FX.dust(ctx, g.x, g.y, g.s * 2.2, t, T.land, { n: 36, seed: 21, speed: 1500, size: 240, life: 2.4, alpha: 0.6, flat: 0.22 });
    groundShadow(ctx, cam, XL, HZ, 140, 0.5, st.Y);
    heroAt(ctx, cam, XL, st.Y, HZ, st.p, { t, wind: t < T.land ? 1 : 0.4, flutter: t < T.land + 0.3 ? 1 : 0.2 });
    FX.debris(ctx, g.x, g.y, g.s * 2, t, T.land, { n: 30, seed: 22, speed: 1600, size: 20, ground: g.y + 30 });
  });
  FX.streaks(ctx, t, t < T.land ? 0.8 : 0, { n: 30, seed: 7, color: '#ffffff' });
}, { name: '3E', grade: GDAY, mb: lt => (lt + 32.3 < T.land ? { n: 6, shutter: 1 } : 1) });

// 3F: удар по бетонному столбу
shot(33.35, 35.3, (ctx, lt, t) => {
  LDAY();
  const sh = FX.addShake(FX.shake(t, T.punch1, 30, 0.9, 30), FX.shake(t, T.punch1 + 0.12, 14, 0.8));
  const zp = seg(t, T.punch1, T.punch1 + 0.06, E.outQ) * (1 - seg(t, T.punch1 + 0.2, T.punch1 + 1.0)) * 0.12;
  const cam = makeCam({ x: 7330 + sh.x + lt * 25, y: 300 + sh.y, z: HZ - 1500 + zp * 1500, f: 1250, hy: H * 0.52, roll: sh.r });
  let p;
  if (t < 33.6) p = mixObj(PZ.stand, PZ.fight, seg(t, 33.35, 33.6));
  else if (t < 33.92) p = mixObj(PZ.fight, PZ.wind, seg(t, 33.6, 33.92, E.ioC));
  else if (t < 34.0) p = mixObj(PZ.wind, PZ.punch, seg(t, 33.92, 34.0, E.inQ));
  else p = mixObj(PZ.punch, PZ.fight, seg(t, 34.6, 35.3, E.ioC) * 0.6);
  const dx = seg(t, 33.92, 34.0) * 70 - seg(t, 34.6, 35.3) * 30;
  const fist = cam.P(XL + dx + 230, 340, HZ);
  const broken = t >= T.punch1 + 0.1;
  if (impactFrame(ctx, t, T.punch1, () => {
    drawPillar(ctx, cam, XP, HZ + 40, { r: 230, h: 1150, color: '#000' });
    heroAt(ctx, cam, XL + dx, 0, HZ, p, {});
  }, fist.x, fist.y)) return;
  withCam(ctx, cam, () => {
    drawCourtyard(ctx, cam, SKY.day, t, { sky: { sunX: 1500, sunY: 120 } });
    drawCracks(ctx, cam, XL, HZ, 1500, 1, 21);
    if (!broken) drawPillar(ctx, cam, XP, HZ + 40, { r: 230, h: 1150, cracks: seg(t, T.punch1, T.punch1 + 0.1) * 2, seed: 4 });
    else drawPillar(ctx, cam, XP, HZ + 40, { r: 230, h: 1150, broken: 380, seed: 4, rope: false });
    groundShadow(ctx, cam, XL + dx, HZ, 130, 0.45);
    heroAt(ctx, cam, XL + dx, 0, HZ, p, { t, wind: 0.4, flutter: t > T.punch1 && t < 34.6 ? 0.8 : 0.1, brow: 0.3 });
    if (broken) {
      const c = cam.P(XP, 650, HZ);
      FX.debris(ctx, c.x, c.y, c.s * 2.2, t, T.punch1 + 0.1, { n: 46, seed: 31, speed: 1500, size: 46, dir: -0.15, spread: 1.6, color: '#9a958b', timeScale: t < 34.9 ? 0.4 : 0.4, g: 1600 });
      FX.dust(ctx, c.x, c.y, c.s * 2.6, t, T.punch1 + 0.08, { n: 40, seed: 32, speed: 900, dir: -0.1, spread: 2.2, size: 260, life: 3.2, alpha: 0.65, flat: 0.6, grow: 1.2 });
    }
    const ra = seg(t, T.punch1, T.punch1 + 0.35, E.outC); const rOn = t >= T.punch1 ? 1 : 0;
    FX.ring(ctx, fist.x + ra * 60, fist.y, (20 + ra * 360) * fist.s, (1 - ra) * rOn * 0.9, 1.6, 9);
    FX.ring(ctx, fist.x + ra * 140, fist.y, (10 + ra * 240) * fist.s, (1 - ra) * rOn * 0.7, 1.6, 5);
    FX.burst(ctx, fist.x, fist.y, 140, win(t, T.punch1 + 0.1, T.punch1 + 0.12, T.punch1 + 0.16, T.punch1 + 0.3), { seed: 5 });
  });
  FX.speedLines(ctx, fist.x, fist.y, t, win(t, T.punch1 + 0.1, T.punch1 + 0.12, T.punch1 + 0.3, T.punch1 + 0.6) * 0.8, { color: '#ffffff', n: 70, inner: 300 });
}, { name: '3F', grade: GDAY, mb: lt => { const t = lt + 33.35; return t > 33.9 && t < 34.05 ? { n: 5, shutter: 1 } : 1; } });

// 3G: пыль оседает, небо темнеет — в воздухе появляется разлом
shot(35.3, 39.0, (ctx, lt, t) => {
  const om = seg(t, 36.4, 38.8, E.ioS);
  const pal = skyMix('day', 'ominous', om);
  setLight({ kx: 0.55, ky: -0.85, rx: lerp(-0.85, 0.7, om), ry: -0.4, rim: mix('#fff1d6', '#ff5a7a', om), rimA: 0.55 + om * 0.3, tint: mix('#ffe6c4', '#5a2040', om), tintA: 0.06 + om * 0.25 });
  const cam = makeCam({ x: lerp(6450, 6900, lt / 3.7), y: lerp(430, 380, lt / 3.7), z: lerp(HZ - 4300, HZ - 3500, E.ioS(lt / 3.7)), f: 1300, hy: H * 0.55 });
  drawCourtyard(ctx, cam, pal, t, { sky: { sunX: 1500, sunY: 150, cloudA: 1 + om }, autumn: 0.5 });
  drawCracks(ctx, cam, XL, HZ, 1500, 1, 21);
  drawCracks(ctx, cam, X1, HZ, 900, 1, 8);
  drawPillar(ctx, cam, XP, HZ + 40, { r: 230, h: 1150, broken: 380, seed: 4, rope: false, pal });
  // обломки на земле
  const R = rng(41);
  for (let i = 0; i < 30; i++) {
    const q = cam.P(XP + 300 + R() * 2600, 0, HZ + (R() - 0.5) * 1400);
    if (!q) continue;
    ctx.fillStyle = mix('#8e877c', pal.haze, 0.2 + R() * 0.2);
    ctx.beginPath(); ctx.ellipse(q.x, q.y, (20 + R() * 50) * q.s * 1.6, (12 + R() * 30) * q.s, R(), 0, TAU); ctx.fill();
  }
  // оседающая пыль
  for (let i = 0; i < 10; i++) {
    const q = cam.P(XP + (R() - 0.3) * 2600 + t * 60, 200 + R() * 500, HZ + R() * 800);
    if (q) drawSprite(ctx, Sprites.puff(mix('#cbb9a0', pal.haze, om * 0.7), 1 + i % 6), q.x, q.y, (1400 + R() * 800) * q.s, 0.45 * (1 - seg(t, 35.3, 38.5)));
  }
  const look = seg(t, 37.6, 38.1, E.ioC);
  const p = mixObj(PZ.fight, pose({ neck: -0.35 * look, aF: 0.12, eF: 0.3 + 0.6 * win(t, 35.6, 35.8, 36.1, 36.4), aB: -0.06, hF: 0.4 }), seg(t, 35.3, 36.0));
  groundShadow(ctx, cam, XL + 40, HZ, 130, 0.45);
  heroAt(ctx, cam, XL + 40, 0, HZ, p, { t, wind: 0.3 + om * 0.8, brow: 0.2 + look * 0.3 });
  // разлом в небе
  const rg = seg(t, T.rift, 39.0, E.inQ);
  if (rg > 0) drawRift(ctx, 1260, 250, rg, t);
  FX.leaves(ctx, t, { n: 10 + om * 10, size: 14, wind: 1 + om * 4, seed: 44, color: mix('#c2412a', '#4a1020', om) });
}, { name: '3G', grade: (lt, t) => { const om = seg(t, 36.4, 38.8, E.ioS); return { sat: lerp(1.05, 0.9, om), con: lerp(1.08, 1.15, om), tint: mix('#ffcf8a', '#ff3a5a', om), tintA: 0.12 + om * 0.1, shadow: mix('#3a4a7a', '#2a0a2a', om), shadowA: 0.18 + om * 0.2, bloom: 0.35 + om * 0.15, vig: 0.5 + om * 0.3 }; },
  post: (ctx, lt, t) => { fadeBlack(ctx, seg(t, 38.82, 39.0, E.inQ) * 0.85); } });

function drawRift(ctx, x, y, g, t) {
  const R = rng(3);
  const len = 620 * g, w = 70 * g;
  const pts = [];
  for (let i = 0; i <= 12; i++) { const k = i / 12; pts.push([x + (k - 0.5) * len, y + (k - 0.5) * len * 0.35 + (R() - 0.5) * 60 * g, (Math.sin(k * PI) * w) * (0.5 + R() * 0.8)]); }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawSprite(ctx, Sprites.soft('#b04cff', 128), x, y, 1100 * g, 0.5 * g);
  ctx.restore();
  const p = new Path2D();
  pts.forEach(([px, py, ww], i) => (i ? p.lineTo(px, py - ww) : p.moveTo(px, py - ww)));
  for (let i = pts.length - 1; i >= 0; i--) p.lineTo(pts[i][0], pts[i][1] + pts[i][2] * 0.8);
  p.closePath();
  ctx.fillStyle = '#05010a'; ctx.fill(p);
  ctx.strokeStyle = rgba('#d58cff', 0.9); ctx.lineWidth = 4; ctx.stroke(p);
  ctx.strokeStyle = rgba('#ff4f8a', 0.4 + 0.3 * Math.sin(t * 20)); ctx.lineWidth = 10; ctx.stroke(p);
}
