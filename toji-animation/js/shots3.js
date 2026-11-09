'use strict';
/* Сцена 4: бой с проклятым духом. */
const LOM = () => setLight({ kx: 0.5, ky: -0.8, ko: 0.22, rx: 0.8, ry: -0.5, ro: 0.08, rim: '#ff5a78', rimA: 0.8, tint: '#5a2040', tintA: 0.22 });
const GOM = { sat: 0.9, con: 1.15, tint: '#ff3a5a', tintA: 0.2, shadow: '#2a0a2a', shadowA: 0.35, bloom: 0.45, vig: 0.8 };
const GSLOW = { sat: 0.35, con: 1.2, bri: 0.95, tint: '#4a7ab0', tintA: 0.35, shadow: '#0a1830', shadowA: 0.4, bloom: 0.5, vig: 0.9 };
const OMP = SKY.ominous;

function curseAt(ctx, cam, X, Y, Z, p, t, flip = true, rot = 0, o = {}) {
  const q = cam.P(X, Y, Z);
  if (!q) return null;
  ctx.save(); ctx.translate(q.x, q.y); if (rot) ctx.rotate(rot); ctx.scale(q.s * (flip ? -1 : 1), q.s);
  drawCurseSide(ctx, p, t, o);
  ctx.restore();
  return q;
}
function heroBackAt(ctx, cam, X, Z, opt) {
  const q = cam.P(X, 0, Z);
  ctx.save(); ctx.translate(q.x, q.y); ctx.scale(q.s, q.s);
  drawHeroFront(ctx, Object.assign({ back: true, bulk: 1 }, opt));
  ctx.restore();
  return q;
}
const ominousYard = (ctx, cam, t, o = {}) => drawCourtyard(ctx, cam, OMP, t, Object.assign({ sky: { sunX: 1250, sunY: 330, sunR: 50, cloudA: 2 }, autumn: 0.2 }, o));
const CPZ = {
  crouch: cpose({ y: -250, lean: 0.9, neck: 0.0, lF: 1.2, kF: 2.2, lB: 0.6, kB: 2.0, aF: 0.8, eF: 0.2, aB: 0.6, eB: 0.3 }),
  stand: cpose({}),
  run: (ph) => cpose({ y: -360, lean: 0.85, neck: 0.1, lF: 0.9 * Math.sin(ph * TAU) + 0.4, kF: 1.1, lB: -0.9 * Math.sin(ph * TAU) + 0.4, kB: 1.1, aF: -0.6 * Math.sin(ph * TAU) + 0.4, eF: 0.8, aB: 0.6 * Math.sin(ph * TAU) + 0.4, eB: 0.8, jaw: 0.5 }),
  raise: cpose({ lean: 0.35, neck: 0.1, aF: 3.0, eF: 0.3, aB: -0.3, jaw: 0.6, claw: 1 }),
  swing: cpose({ lean: 0.8, neck: 0.3, aF: 1.0, eF: 0.2, aB: -0.5, jaw: 0.4, claw: 1 }),
};

// 4A: через плечо героя — проклятие падает из разлома
shot(39.0, 42.2, (ctx, lt, t) => {
  LOM();
  const sh = FX.shake(t, T.curseLand, 14, 0.7);
  const cam = makeCam({ x: 60 + sh.x, y: 330 + sh.y, z: lerp(HZ - 1300, HZ - 1050, E.ioS(lt / 3.2)), f: 1300, hy: H * 0.5 });
  ominousYard(ctx, cam, t);
  drawRift(ctx, 1060, 210, 1 - seg(t, 41.0, 42.2) * 0.5, t);
  const Y = t < 39.9 ? 9000 : t < T.curseLand ? lerp(4200, 0, E.inQ((t - 39.9) / (T.curseLand - 39.9))) : 0;
  const cp = t < T.curseLand ? cpose({ lean: 0.4, aF: 2.6, aB: 2.4, lF: 0.6, kF: 1.2 }) : t < 40.75 ? CPZ.crouch : mixObj(CPZ.crouch, CPZ.stand, seg(t, 40.75, 41.2));
  cp.eyes = seg(t, T.curseEyes, T.curseEyes + 0.3);
  const g = cam.P(330, 0, 7000);
  if (t > 39.9) curseAt(ctx, cam, 330, Y, 7000, cp, t, true);
  if (g) {
    FX.dust(ctx, g.x, g.y, g.s * 2.4, t, T.curseLand, { n: 30, seed: 51, speed: 1400, size: 260, life: 3, alpha: 0.65, color: '#5a3a46', flat: 0.25 });
    const ra = seg(t, T.curseLand, T.curseLand + 0.6, E.outC); const rOn = t >= T.curseLand ? 1 : 0;
    FX.ring(ctx, g.x, g.y, (80 + ra * 1600) * g.s, (1 - ra) * rOn * 0.7, 0.22, 6, '#ffb0c0');
  }
  heroBackAt(ctx, cam, -250, HZ, { t, wind: 0.7, breath: 1, armOut: 0.1 });
  FX.leaves(ctx, t, { n: 10, size: 14, wind: 3, seed: 61, color: '#4a1020' });
}, { name: '4A', frame: { x: 900, y: 520 }, grade: GOM, post: (ctx, lt) => fadeBlack(ctx, 1 - seg(lt, 0, 0.4)) });

// 4B: морда проклятия — глаза открываются, рёв
shot(42.2, 43.05, (ctx, lt, t) => {
  setLight({ kx: 0.3, ky: -0.9, rx: 0.9, ry: -0.3, rim: '#ff6a8a', rimA: 0.8, tint: '#3a1030', tintA: 0.15 });
  bg(ctx, '#12050c');
  drawSprite(ctx, Sprites.soft('#ff3a5a', 128), 960, 300, 1600, 0.25);
  const sh = FX.shake(t, T.roar, 26, 0.8, 30);
  ctx.save();
  cam2D(ctx, 0, -40, lerp(0.62, 0.7, lt / 0.85), 0, sh);
  drawCurseFace(ctx, { t, eyes: seg(t, 42.2, 42.42, E.outQ), jaw: seg(t, T.roar, T.roar + 0.2, E.outB) });
  ctx.restore();
  FX.speedLines(ctx, 960, 620, t, seg(t, T.roar, T.roar + 0.1) * 0.9, { color: '#000000', n: 110, inner: 380, alpha: 0.8 });
}, { name: '4B', grade: { sat: 0.95, con: 1.2, tint: '#ff3a5a', tintA: 0.2, shadow: '#2a0a2a', shadowA: 0.3, bloom: 0.5, vig: 0.9 } });

// 4C: рывок проклятия к герою
shot(43.05, 43.6, (ctx, lt, t) => {
  LOM();
  const u = lt / 0.55;
  const sh = FX.shake(t, 43.05, 12, 0.6);
  const cam = makeCam({ x: 60 + sh.x, y: 300 + sh.y, z: HZ - 1150, f: 1300, hy: H * 0.5 });
  ominousYard(ctx, cam, t);
  const Z = lerp(7000, 2900, E.inQ(u)), X = lerp(330, 420, u);
  const g = cam.P(X, 0, Z);
  if (g) FX.dust(ctx, g.x, g.y, g.s * 2, t, 43.0, { n: 20, seed: 71, dir: -PI / 2, spread: 1.6, speed: 600, size: 240, life: 1.5, alpha: 0.5, color: '#5a3a46' });
  curseAt(ctx, cam, X, 0, Z, CPZ.run(t * 2.2), t, true);
  heroBackAt(ctx, cam, -250, HZ, { t, wind: 1, armOut: 0.1 });
  FX.streaks(ctx, t, 0.5, { n: 25, color: '#ffd0e0', seed: 3 });
}, { name: '4C', frame: { x: 900, y: 520 }, grade: GOM, mb: () => ({ n: 4, shutter: 1 }) });

// 4D: гигант заносит когти — герой стоит спокойно
shot(43.6, 44.8, (ctx, lt, t) => {
  LOM();
  const cam = makeCam({ x: 300, y: 70, z: HZ - 1900, f: 1300, hy: H * 0.66 });
  ominousYard(ctx, cam, t, { sky: { sunX: 1300, sunY: 120, sunR: 50, cloudA: 2 } });
  const cp = t < 44.3 ? mixObj(CPZ.stand, CPZ.raise, seg(t, 43.6, 44.2, E.outC)) : mixObj(CPZ.raise, CPZ.swing, seg(t, 44.3, 44.8, E.inQ));
  cp.x = 0; cp.jaw = 0.4 + 0.2 * Math.sin(t * 9);
  groundShadow(ctx, cam, 700, HZ + 200, 260, 0.45);
  curseAt(ctx, cam, 700, 0, HZ + 200, cp, t, true);
  groundShadow(ctx, cam, 0, HZ, 120, 0.45);
  heroAt(ctx, cam, 0, 0, HZ, pose({ lean: 0.0, neck: -0.08, aF: 0.05, aB: -0.04, hF: 0.4 }), { t, wind: 0.6, eye: 0.55, brow: 0.2 });
  // след когтей
  const sw = seg(t, 44.3, 44.8, E.inQ);
  if (sw > 0) {
    const c = cam.P(480, 900, HZ);
    ctx.save(); ctx.strokeStyle = 'rgba(255,230,240,0.85)'; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.lineWidth = 10 - i * 2; ctx.globalAlpha = 0.8 - i * 0.2;
      ctx.beginPath(); ctx.arc(c.x + 120, c.y + 40 + i * 40, 420 + i * 30, -1.6, -1.6 + sw * 2.2); ctx.stroke();
    }
    ctx.restore();
  }
}, { name: '4D', frame: { x: 1000, y: 470 }, grade: GOM });

// 4E: замедление — когти проходят в сантиметрах от лица
function clawsPass(ctx, u, x0, y0, s = 1) {
  for (let i = 0; i < 3; i++) {
    const cx = x0 - u * 520 + i * 70, cy = y0 + u * 900 - i * 40;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(2.2); ctx.scale(s, s);
    shadePath(ctx, spike(V(-260, 0), V(260, 0), 46 - i * 6, 0.12), { b: CPAL.claw.b, s: CPAL.claw.s, w: 4, o: '#000', r: '#9ab8ff' }, 60);
    ctx.restore();
  }
}
shot(44.8, 46.2, (ctx, lt, t) => {
  setLight({ kx: -0.4, ky: -0.8, rx: 0.95, ry: -0.2, ro: 0.08, rim: '#bfe0ff', rimA: 0.9, tint: '#203050', tintA: 0.2 });
  bg(ctx, '#1a1a26');
  drawSprite(ctx, Sprites.soft('#ff5a7a', 128), 1300, 200, 1200, 0.25);
  FX.motes(ctx, t * 0.05, { n: 60, color: '#ffffff', alpha: 0.5, size: 4, comp: 'source-over' });
  const u = lt / 1.4;
  ctx.save();
  ctx.translate(900 - u * 30, 560); ctx.rotate(-0.06 - u * 0.05); ctx.scale(0.9, 0.9);
  drawProfile(ctx, { bulk: 1, open: 0.55, t: 44.8 + lt * 0.15, wind: 0.6 + u * 0.4, brow: 0.1 });
  ctx.restore();
  // срезанная прядь
  const hs = new Path2D(); hs.moveTo(0, 0); hs.quadraticCurveTo(30, -10, 70, 6);
  ctx.save(); ctx.translate(1180 - u * 80, 260 + u * 120); ctx.rotate(u * 1.2); detailStroke(ctx, hs, '#111', 5, seg(t, 45.2, 45.4)); ctx.restore();
  clawsPass(ctx, u, 1500, -180, 1.1);
}, { name: '4E', grade: GSLOW, post: (ctx, lt) => letterbox(ctx, 1, 150) });

// 4F: глаз — отражение когтей, взгляд уходит в сторону
shot(46.2, 47.75, (ctx, lt, t) => {
  ctx.save();
  ctx.translate(W / 2, H / 2);
  const z = lerp(0.74, 0.86, lt / 1.55); ctx.scale(z, z);
  drawEyeMacro(ctx, { bulk: 1, open: 0.62, cold: 1, t, pupil: lerp(1.0, 0.55, seg(t, 46.45, 46.6, E.outE)), lookX: seg(t, 47.3, 47.45, E.outE) * 0.9, reflect: (c, ir) => {
    const v = (t - 46.2) / 1.55;
    c.globalAlpha = 0.75; c.fillStyle = '#05050a';
    for (let i = 0; i < 3; i++) { c.save(); c.translate(ir * 0.9 - v * ir * 1.4 + i * 30, -ir * 0.8 + v * ir * 1.5 - i * 20); c.rotate(2.2); c.fill(spike(V(-120, 0), V(120, 0), 18, 0.1)); c.restore(); }
    c.globalAlpha = 1;
  } });
  ctx.restore();
}, { name: '4F', frame: { k: 1.3 }, grade: GSLOW, post: (ctx, lt) => letterbox(ctx, 1 - seg(lt, 1.3, 1.55), 150) });

// 4G: удар когтями мимо — герой уже за спиной проклятия
shot(47.75, 49.0, (ctx, lt, t) => {
  LOM();
  const sh = FX.shake(t, 47.95, 18, 0.6);
  const camX = lerp(250, 1250, seg(t, 48.15, 48.65, E.ioC));
  const cam = makeCam({ x: camX + sh.x, y: 320 + sh.y, z: HZ - 2500, f: 1300, hy: H * 0.55 });
  ominousYard(ctx, cam, t);
  drawCracks(ctx, cam, 0, HZ, 1100, seg(t, 47.95, 48.05), 77, '#1a0a12');
  const cp = mixObj(CPZ.swing, cpose({ lean: 0.95, aF: 0.6, eF: 0.1, jaw: 0.3, claw: 1 }), seg(t, 47.75, 47.95, E.inQ));
  cp.neck = 0.25 - seg(t, 48.6, 49.0) * 0.5; cp.eyes = 1;
  groundShadow(ctx, cam, 650, HZ + 200, 260, 0.45);
  curseAt(ctx, cam, 650, 0, HZ + 200, cp, t, true);
  // послеобраз на прежнем месте
  const q0 = cam.P(0, 0, HZ);
  FX.afterimage(ctx, () => { ctx.translate(q0.x, q0.y); ctx.scale(q0.s, q0.s); drawHeroSide(ctx, pose({}), { bulk: 1 }); }, 0.7 * (1 - seg(t, 47.75, 47.98)), '#d6eaff');
  const g = cam.P(0, 0, HZ);
  FX.dust(ctx, g.x, g.y, g.s * 2, t, 47.95, { n: 26, seed: 81, speed: 1100, size: 230, life: 2.2, alpha: 0.6, color: '#5a3a46', flat: 0.3 });
  FX.debris(ctx, g.x, g.y, g.s * 2, t, 47.95, { n: 18, seed: 82, speed: 1200, size: 18, ground: g.y + 20, color: '#5a4a4e' });
  if (t >= T.behind) {
    groundShadow(ctx, cam, 1650, HZ, 120, 0.45);
    heroAt(ctx, cam, 1650, 0, HZ, pose({ lean: 0.02, neck: 0.04, aF: 0.05, aB: -0.05 }), { t, wind: 0.4, eye: 0.6 }, true);
    const h = cam.P(1650, 0, HZ);
    FX.dust(ctx, h.x, h.y, h.s * 1.2, t, T.behind, { n: 12, seed: 83, speed: 500, size: 160, life: 1.2, alpha: 0.4, color: '#7a5a66', flat: 0.25 });
  }
}, { name: '4G', grade: GOM, mb: lt => (lt < 0.2 ? { n: 4, shutter: 1 } : 1) });

// 4H: удар — импакт-кадры
shot(49.0, 49.6, (ctx, lt, t) => {
  LOM();
  const sh = FX.shake(t, T.punch2, 40, 0.6, 32);
  const cam = makeCam({ x: 1330 + sh.x, y: 170 + sh.y, z: HZ - 1350, f: 1300, hy: H * 0.62, roll: sh.r * 2 });
  let p;
  const PW = plant(pose({ lean: -0.05, lF: 0.45, kF: 0.6, lB: -0.5, kB: 0.4, aF: -0.6, eF: 2.1, aB: 1.1, eB: 1.4, hF: 1, hB: 1 }));
  if (t < 49.38) p = mixObj(pose({}), PW, seg(t, 49.0, 49.38, E.ioC));
  else p = mixObj(PW, PZ.punch, seg(t, 49.38, T.punch2, E.inQ));
  const hit = t >= T.punch2;
  const cX = 750 - (hit ? E.outQ(clamp((t - T.punch2) / 0.15)) * 260 : 0);
  const cp = cpose({ lean: hit ? 1.2 : 0.95, neck: hit ? 0.9 : -0.25, aF: 0.6, eF: 0.1, jaw: hit ? 1 : 0.3, claw: 1, eyes: 1 });
  const fist = cam.P(1650 - 230, 330, HZ);
  if (impactFrame(ctx, t, T.punch2, () => { curseAt(ctx, cam, cX, 0, HZ + 200, cp, t, true, 0, { aura: false }); heroAt(ctx, cam, 1650, 0, HZ, p, {}, true); }, fist.x, fist.y)) return;
  withCam(ctx, cam, () => {
    ominousYard(ctx, cam, t);
    groundShadow(ctx, cam, cX, HZ + 200, 260, 0.45);
    curseAt(ctx, cam, cX, 0, HZ + 200, cp, t, true);
    groundShadow(ctx, cam, 1650, HZ, 120, 0.45);
    heroAt(ctx, cam, 1650, 0, HZ, p, { t, wind: 0.8, flutter: hit ? 1 : 0.2, brow: 0.4 }, true);
    const ra = seg(t, T.punch2, T.punch2 + 0.3, E.outC); const rOn = t >= T.punch2 ? 1 : 0;
    FX.ring(ctx, fist.x - ra * 80, fist.y, (30 + ra * 420) * fist.s, (1 - ra) * rOn, 1.5, 10);
    FX.ring(ctx, fist.x - ra * 160, fist.y, (20 + ra * 260) * fist.s, (1 - ra) * rOn * 0.8, 1.5, 6);
    FX.burst(ctx, fist.x, fist.y, 170, win(t, T.punch2 + 0.08, T.punch2 + 0.1, T.punch2 + 0.14, T.punch2 + 0.3), { seed: 9 });
  });
  FX.speedLines(ctx, fist.x, fist.y, t, seg(t, T.punch2 + 0.08, T.punch2 + 0.12), { color: '#ffffff', n: 90, inner: 260 });
}, { name: '4H', frame: { x: 1000, y: 520 }, grade: GOM, mb: lt => (lt > 0.36 && lt < 0.5 ? { n: 5, shutter: 1 } : 1) });

// 4I: проклятие улетает и пробивает здание
const BX = -8600;
function curseFlyX(t) { return t < T.crash ? lerp(490, BX + 600, E.outQ(clamp((t - T.punch2) / (T.crash - T.punch2)))) : BX + 600; }
shot(49.6, 51.4, (ctx, lt, t) => {
  LOM();
  const sh = FX.addShake(FX.shake(t, T.crash, 36, 1.0, 28), FX.shake(t, 49.6, 14, 0.4));
  const X = curseFlyX(t), Xl = curseFlyX(Math.max(49.6, t - 0.12));
  const cam = makeCam({ x: Xl + 250 + sh.x, y: 420 + sh.y, z: HZ - 3300, f: 1300, hy: H * 0.55 });
  const crashed = t >= T.crash;
  const blds = COURT.buildings.map(b => Object.assign({}, b)).concat([{ X: BX - 900, Z: HZ + 1500, w: 3600, h: 1500, roofH: 650, hole: crashed ? { X: BX - 600, Y: 500, r: 520 } : null }]);
  drawCourtyard(ctx, cam, OMP, t, { sky: { sunX: 1250, sunY: 330, sunR: 50, cloudA: 2 }, buildings: blds });
  // борозда по земле
  const a = cam.P(400, 0, HZ + 200), b = cam.P(Math.max(X, BX + 600), 0, HZ + 200);
  if (a && b) { ctx.fillStyle = 'rgba(30,10,20,0.5)'; ctx.fillRect(Math.min(a.x, b.x), a.y - 6, Math.abs(a.x - b.x), 12); }
  if (!crashed) {
    const q = cam.P(X, 220, HZ + 200);
    for (let k = 0; k < 8; k++) { const qq = cam.P(X + k * 500, 60, HZ + 200); if (qq) drawSprite(ctx, Sprites.puff('#5a3a46', 1 + k % 5), qq.x, qq.y, 500 * qq.s * (1 + k * 0.2), 0.45 * (1 - k / 8)); }
    curseAt(ctx, cam, X, 220, HZ + 200, cpose({ lean: 1.6, neck: 0.8, jaw: 1, aF: 2.2, aB: 2.8, lF: -0.5, lB: -0.9, kF: 0.4, kB: 0.6, eyes: 0.6 }), t, true, -(t - 49.6) * 9, { aura: false });
    if (q) FX.streaks(ctx, t, 0.6, { n: 20, y0: q.y - 200, y1: q.y + 100, color: '#ffd0e0', dir: 1 });
  }
  const c = cam.P(BX - 400, 500, HZ + 1450);
  if (c) {
    FX.burst(ctx, c.x, c.y, 260, win(t, T.crash, T.crash + 0.03, T.crash + 0.08, T.crash + 0.3), { seed: 4, color: '#ffe0e8' });
    FX.debris(ctx, c.x, c.y, c.s * 3, t, T.crash, { n: 50, seed: 91, speed: 1500, size: 30, dir: -PI / 2 + 0.6, spread: 2.6, color: '#d9d0bf' });
    FX.debris(ctx, c.x, c.y, c.s * 3, t, T.crash, { n: 30, seed: 92, speed: 1300, size: 22, dir: -PI / 2 + 0.6, spread: 2.6, color: '#4b3022' });
    FX.dust(ctx, c.x, c.y, c.s * 3.5, t, T.crash, { n: 44, seed: 93, speed: 1300, size: 300, life: 3.5, alpha: 0.7, color: '#7a6066', up: true, flat: 0.7, grow: 1.3 });
  }
  heroAt(ctx, cam, 1650, 0, HZ, mixObj(PZ.punch, PZ.fight, seg(t, 49.8, 50.6)), { t, wind: 0.6 }, true);
}, { name: '4I', grade: GOM, mb: lt => (lt < 1.3 ? { n: 6, shutter: 1 } : 1) });

// 4J: герой опускает кулак — пар от костяшек, вдали оседает здание
shot(51.4, 54.3, (ctx, lt, t) => {
  LOM();
  const u = E.ioS(lt / 2.9);
  const cam = makeCam({ x: lerp(1500, 1560, u), y: 360, z: lerp(HZ - 1150, HZ - 900, u), f: 1300, hy: H * 0.5 });
  const blds = COURT.buildings.concat([{ X: BX - 900, Z: HZ + 1500, w: 3600, h: 1500, roofH: 650, hole: { X: BX - 600, Y: 500, r: 520 } }]);
  drawCourtyard(ctx, cam, OMP, t, { sky: { sunX: 1250, sunY: 330, sunR: 50, cloudA: 2 }, buildings: blds });
  const c = cam.P(BX - 400, 500, HZ + 1450);
  if (c) FX.dust(ctx, c.x, c.y, c.s * 3.5, t, T.crash, { n: 44, seed: 93, speed: 1300, size: 300, life: 6, alpha: 0.7, color: '#7a6066', up: true, flat: 0.7, grow: 1.3 });
  const shake = win(t, 52.2, 52.3, 52.6, 52.8);
  const p = mixObj(mixObj(PZ.punch, PZ.fight, 0.6), pose({ lean: 0.03, neck: 0.05, aF: 0.12 + shake * 0.3 * Math.sin(t * 40), eF: 0.35, aB: -0.05, hF: 0.3 }), seg(t, 51.5, 52.3, E.ioC));
  heroAt(ctx, cam, 1650, 0, HZ, p, { t, wind: 0.5, eye: 0.55, brow: 0.15 }, true);
  // пар от кулака
  const J = heroFK(p, heroDims(1));
  const q = cam.P(1650, 0, HZ);
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.6 + i / 6) % 1;
    drawSprite(ctx, Sprites.puff('#e8e0e8', 1 + i), q.x - J.F.wr.x * q.s + noise(t + i, 3) * 10, q.y + J.F.wr.y * q.s - ph * 90, 50 + ph * 80, 0.35 * (1 - ph) * (1 - seg(t, 52.5, 54)));
  }
}, { name: '4J', frame: (lt) => ({ x: 1050, y: lerp(560, 480, lt / 2.9) }), grade: GOM });

// 4K: проклятие рассыпается пеплом, ночь опускается; герой смотрит со спины
shot(54.3, 57.0, (ctx, lt, t) => {
  const nt = seg(t, 54.6, 56.8, E.ioS);
  const pal = skyMix('ominous', 'night', nt);
  setLight({ kx: 0.4, ky: -0.8, rx: lerp(0.8, -0.8, nt), ry: -0.4, rim: mix('#ff5a78', '#9fd8ff', nt), rimA: 0.8, tint: mix('#5a2040', '#1a3040', nt), tintA: 0.22 });
  const cam = makeCam({ x: lerp(900, 600, lt / 2.7), y: lerp(330, 480, lt / 2.7), z: lerp(HZ - 1500, HZ - 1900, E.ioS(lt / 2.7)), f: 1300, hy: H * 0.5 });
  const blds = COURT.buildings.concat([{ X: BX - 900, Z: HZ + 1500, w: 3600, h: 1500, roofH: 650, hole: { X: BX - 600, Y: 500, r: 520 } }]);
  drawCourtyard(ctx, cam, pal, t, { sky: { sunX: 1250, sunY: lerp(330, 180, nt), sunR: 50, cloudA: 2 }, buildings: blds });
  // пепел поднимается
  const R = rng(101);
  ctx.save();
  for (let i = 0; i < 90; i++) {
    const t0 = 54.3 + R() * 1.6, u = t - t0;
    if (u < 0) { R(); R(); continue; }
    const q = cam.P(-1600 + (R() - 0.5) * 3000 + u * 200, 200 + u * (300 + R() * 400), 9000);
    if (!q) continue;
    ctx.globalAlpha = clamp(1 - u / 2.6) * 0.9;
    ctx.fillStyle = i % 4 ? '#0b0610' : '#b45cff';
    ctx.beginPath(); ctx.ellipse(q.x, q.y, 6 + (i % 3) * 3, 3, t * 2 + i, 0, TAU); ctx.fill();
  }
  ctx.restore();
  heroBackAt(ctx, cam, 900, HZ, { t, wind: 0.5, armOut: 0.08 });
}, { name: '4K', frame: (lt) => ({ x: 980, y: 520 }), grade: (lt, t) => { const nt = seg(t, 54.6, 56.8); return { sat: lerp(0.9, 0.85, nt), con: 1.12, tint: mix('#ff3a5a', '#3a8aff', nt), tintA: 0.2, shadow: mix('#2a0a2a', '#04101a', nt), shadowA: 0.35, bloom: 0.45, vig: 0.8 }; } });
