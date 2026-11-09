'use strict';
/* Сцены 5–6: настоящая сила Тоджи (ночь, замедление времени) и финал на закате. */
const NIGHT = SKY.night, SUNSET = SKY.sunset;
const LNIGHT = () => setLight({ kx: 0.45, ky: -0.6, ko: 0.24, rx: -0.95, ry: -0.3, ro: 0.09, rim: '#9fe4ff', rimA: 0.95, tint: '#0e2030', tintA: 0.3 });
const GNIGHT = { sat: 0.85, con: 1.15, tint: '#3a8aff', tintA: 0.16, shadow: '#04101a', shadowA: 0.35, bloom: 0.5, vig: 0.85 };
const LSUN = () => setLight({ kx: -0.3, ky: -0.5, ko: 0.25, rx: 0.1, ry: -1, ro: 0.1, rim: '#ffb46a', rimA: 1, tint: '#4a1a20', tintA: 0.25 });
const GSUN = { sat: 1.08, con: 1.12, tint: '#ff7a3a', tintA: 0.2, shadow: '#2a0a20', shadowA: 0.3, bloom: 0.6, vig: 0.75 };

function nightBack(ctx, t, camX = 0, o = {}) {
  const cam = makeCam({ x: camX, y: o.y ?? 360, z: o.z ?? -1500, f: 1300, hy: o.hy ?? H * 0.55 });
  drawCourtyard(ctx, cam, NIGHT, t, { sky: { sunX: o.moonX ?? 1150, sunY: o.moonY ?? 200, sunR: 46, cloudA: 1.5 }, autumn: 0.1,
    buildings: COURT.buildings.concat([{ X: -8600 - 900, Z: HZ + 1500, w: 3600, h: 1500, roofH: 650, hole: { X: -9200, Y: 500, r: 520 } }]) });
  return cam;
}
function wipeBar(ctx, u) { // тёмный обломок пролетает перед камерой — скрытая склейка
  if (u <= 0 || u >= 1) return;
  const x = lerp(1500, 300, u);
  ctx.fillStyle = '#05070a';
  ctx.beginPath(); ctx.moveTo(x - 260, -200); ctx.lineTo(x + 330, -200); ctx.lineTo(x + 250, 1300); ctx.lineTo(x - 340, 1300); ctx.closePath(); ctx.fill();
}
function boneSpike(ctx, x, y, ang, s, trail = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  if (trail > 0) {
    const g = ctx.createLinearGradient(0, 0, 520, 0);
    g.addColorStop(0, 'rgba(200,230,255,0.45)'); g.addColorStop(1, 'rgba(200,230,255,0)');
    ctx.fillStyle = g; ctx.globalAlpha = trail;
    ctx.beginPath(); ctx.moveTo(40, -14); ctx.lineTo(520, -4); ctx.lineTo(520, 4); ctx.lineTo(40, 14); ctx.fill();
    ctx.globalAlpha = 1;
    FX.heatRing(ctx, 30, 0, 26, trail);
  }
  shadePath(ctx, spike(V(130, 0), V(-120, 0), 16, 0.04), { b: CPAL.bone.b, s: CPAL.bone.s, w: 2.5, o: '#0a0809' }, 30);
  ctx.restore();
}

// 5A: со спины, камера обходит — склейка через пролетающий обломок
shot(57.0, 58.75, (ctx, lt, t) => {
  LNIGHT();
  const u = lt / 1.75;
  nightBack(ctx, t, lerp(-600, 300, u), { y: 420, z: -800 });
  ctx.save();
  ctx.translate(lerp(985, 945, u), 1270); ctx.scale(2.1 * lerp(1, 0.94, u), 2.1);
  drawHeroFront(ctx, { back: true, bulk: 1, t, wind: 0.6, armOut: 0.08 });
  ctx.restore();
  FX.motes(ctx, t, { n: 40, color: '#bfe8ff', alpha: 0.4, size: 4, speed: 0.4 });
  wipeBar(ctx, seg(t, 58.45, 58.95));
}, { name: '5A', frame: { y: 560 }, grade: GNIGHT, dissolve: 0.5 });

// 5B: лицо в три четверти — шрам, лунный контровой свет
shot(58.75, 62.4, (ctx, lt, t) => {
  LNIGHT();
  setLight({ kx: 0.6, ky: -0.5, ko: 0.2, rx: -0.95, ry: -0.25, ro: 0.08, rim: '#9fe4ff', rimA: 0.95, tint: '#0e2030', tintA: 0.25 });
  bg(ctx, '#071018');
  drawSprite(ctx, Sprites.soft('#5fb0e0', 128), 600, 250, 1500, 0.25);
  const R = rng(55);
  for (let i = 0; i < 10; i++) drawSprite(ctx, Sprites.soft(R() > 0.5 ? '#9fe4ff' : '#ffffff', 64), 500 + R() * 900, R() * 900, 40 + R() * 120, 0.1 + R() * 0.12);
  // чужая проклятая энергия плывёт мимо — сквозь него
  const wa = win(t, 60.3, 60.8, 61.8, 62.4);
  drawWisps(ctx, 700 + (t - 60) * 120, 500, t, wa * 0.7, 7);
  drawWisps(ctx, 1250 - (t - 60) * 100, 380, t + 1, wa * 0.6, 8);
  const u = E.ioS(lt / 3.65);
  ctx.save();
  ctx.translate(lerp(990, 950, u), 590); const z = lerp(0.98, 1.08, u); ctx.scale(z, z);
  drawFace(ctx, { bulk: 1, yaw: lerp(0.45, 0.28, u), t, open: 0.68, cold: 1, brow: 0.3, lookX: 0.2, wind: 0.45, scar: 1 });
  ctx.restore();
}, { name: '5B', grade: GNIGHT });

// 5C: низкий ракурс, камера поднимается от ног к лицу — тело другого уровня
shot(62.4, 65.6, (ctx, lt, t) => {
  LNIGHT();
  setLight({ kx: 0.3, ky: -0.4, ko: 0.24, rx: 0.0, ry: -1, ro: 0.1, rim: '#bfeeff', rimA: 1, tint: '#0e2030', tintA: 0.3 });
  const g = ctx.createLinearGradient(0, -300, 0, 1300);
  g.addColorStop(0, '#050a14'); g.addColorStop(0.6, '#10283a'); g.addColorStop(1, '#1f4050');
  ctx.fillStyle = g; ctx.fillRect(-1500, -1500, W + 3000, H + 3000);
  // луна за головой
  drawSprite(ctx, Sprites.soft('#bfe8ff', 128), 990, 300, 1300, 0.45);
  ctx.fillStyle = '#e6f6ff'; ctx.beginPath(); ctx.arc(990, 300, 150, 0, TAU); ctx.fill();
  // быстрые облака
  for (let i = 0; i < 6; i++) { const x = ((i * 380 + t * 260) % 1900) - 200; drawSprite(ctx, Sprites.puff('#0a1824', 1 + i), x, 200 + (i % 3) * 140, 700, 0.75); }
  ctx.fillStyle = '#0a141c'; ctx.fillRect(-1500, 1290, W + 3000, 800);
  ctx.save();
  ctx.translate(960, 1300); ctx.scale(2.15, 2.15);
  drawHeroFront(ctx, { bulk: 1, t, wind: 0.8, breath: 1.2, armOut: 0.1, stance: 10, face: { open: 0.66, cold: 1, brow: 0.35, lookY: 0.25, scar: 1 } });
  ctx.restore();
  FX.motes(ctx, t, { n: 50, color: '#bfe8ff', alpha: 0.5, size: 4, speed: 0.6, vx: -30 });
}, { name: '5C', frame: (lt) => ({ x: 960, y: lerp(820, 380, E.ioS(lt / 3.2)), k: 1.55 }), grade: GNIGHT });

// 5D: «слышишь каждый шорох» — профиль, глаза закрыты, круги звука
shot(65.6, 67.35, (ctx, lt, t) => {
  setLight({ kx: 0.5, ky: -0.6, rx: -0.9, ry: -0.3, ro: 0.08, rim: '#9fe4ff', rimA: 0.9, tint: '#0e2030', tintA: 0.25 });
  bg(ctx, '#060d14');
  drawSprite(ctx, Sprites.soft('#3a7aa0', 128), 1300, 300, 1300, 0.3);
  // звуковые круги от далёких событий
  for (const [x, y, t0] of [[1250, 900, 65.9], [700, 220, 66.35], [1300, 300, 66.8]]) {
    for (let k = 0; k < 3; k++) {
      const u = (t - t0 - k * 0.12) / 0.9;
      if (u < 0 || u > 1) continue;
      ctx.strokeStyle = rgba('#bfeeff', (1 - u) * 0.6); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 20 + u * 260, 0, TAU); ctx.stroke();
    }
    if (t > t0) drawSprite(ctx, Sprites.soft('#ffffff', 16), x, y, 26, clamp(1 - (t - t0)));
  }
  ctx.save();
  ctx.translate(910, 600); ctx.scale(0.86, 0.86);
  drawProfile(ctx, { bulk: 1, open: 0.04, t, wind: 0.3, brow: win(t, 65.9, 66.0, 66.2, 66.5) * 0.5 });
  ctx.restore();
}, { name: '5D', grade: GNIGHT });

// 5E: «видишь каждое движение» — глаз открывается
shot(67.35, 69.4, (ctx, lt, t) => {
  ctx.save();
  ctx.translate(W / 2, H / 2);
  const z = lerp(0.72, 0.84, lt / 2.05); ctx.scale(z, z);
  drawEyeMacro(ctx, { bulk: 1, open: lerp(0.05, 0.78, seg(t, 67.45, 67.95, E.outC)), cold: 1, t, pupil: lerp(1.25, 0.6, seg(t, 68.0, 68.2, E.outE)) + Math.sin(t * 3) * 0.03,
    lookX: noise(t * 1.6, 9) * 0.25, lookY: noise(t * 1.3, 11) * 0.15,
    reflect: (c, ir) => { const R = rng(3); for (let i = 0; i < 9; i++) { const a = R() * TAU + t * (R() - 0.5), r = ir * (0.4 + R() * 0.5); drawSprite(c, Sprites.soft('#ffffff', 16), Math.cos(a) * r, Math.sin(a) * r, 18, 0.6); } } });
  ctx.restore();
}, { name: '5E', frame: { k: 1.3 }, grade: GNIGHT });

// Замедленная атака: шипы летят из темноты справа
const SPK = [ // [смещение по y, опережение (с)] — шип 0 он ловит
  [0, 0], [-90, -0.5], [150, -0.9], [60, 0.7], [250, 0.3],
];
function spikePos(i, t) {
  const [dy, d] = SPK[i];
  const slow = 110; // пикс/с в замедлении
  let x = 1090 + (T.catchSpike + d - Math.min(t, T.snap)) * slow;
  if (t > T.snap) x -= (t - T.snap) * 4200;
  return { x, y: 440 + dy };
}
// 5F1: время замедляется — шипы входят в кадр
shot(69.4, 71.3, (ctx, lt, t) => {
  LNIGHT();
  nightBack(ctx, t, 300 + lt * 40, { y: 300, z: -900 });
  ctx.save(); ctx.translate(900, 1060); ctx.scale(1.5, 1.5);
  drawHeroSide(ctx, pose({ neck: -0.02 + seg(t, 70.4, 71.2) * 0.08, aF: 0.08, aB: -0.05 }), { bulk: 1, t: 69.4 + lt * 0.1, wind: 0.2, eye: 0.6, lx: 1 });
  ctx.restore();
  for (let i = 0; i < SPK.length; i++) { const p = spikePos(i, t); boneSpike(ctx, p.x, p.y, PI, 1.15, 1); }
  // волна замедления
  const u = seg(t, 69.55, 70.4, E.outC);
  if (u > 0 && u < 1) { ctx.strokeStyle = rgba('#ffffff', (1 - u) * 0.7); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(900, 400, 50 + u * 900, 0, TAU); ctx.stroke(); }
}, { name: '5F1', frame: { x: 1100 }, grade: GSLOW, post: (ctx, lt) => letterbox(ctx, seg(lt, 0, 0.5), 150) });

// 5F2: профиль — взгляд спокойно скользит к шипу
shot(71.3, 72.4, (ctx, lt, t) => {
  setLight({ kx: 0.5, ky: -0.6, rx: -0.9, ry: -0.3, ro: 0.08, rim: '#9fe4ff', rimA: 0.9, tint: '#0e2030', tintA: 0.25 });
  bg(ctx, '#0a1018');
  drawSprite(ctx, Sprites.soft('#3a6a90', 128), 1300, 400, 1300, 0.3);
  FX.motes(ctx, 70 + lt * 0.05, { n: 50, color: '#ffffff', alpha: 0.4, size: 4, comp: 'source-over' });
  ctx.save(); ctx.translate(860, 600); ctx.scale(0.86, 0.86);
  drawProfile(ctx, { bulk: 1, open: 0.62, t: 71 + lt * 0.15, wind: 0.25, lookX: seg(t, 71.5, 72.1, E.ioC) * 1.4, brow: 0.1 });
  ctx.restore();
  boneSpike(ctx, lerp(1560, 1400, lt / 1.1), 330, PI + 0.05, 1.6, 1);
}, { name: '5F2', grade: GSLOW, post: ctx => letterbox(ctx, 1, 150) });

// 5F3: ловит шип двумя пальцами, остальные проходят в сантиметрах
shot(72.4, 73.9, (ctx, lt, t) => {
  LNIGHT();
  nightBack(ctx, t, 380, { y: 300, z: -900 });
  const c = seg(t, 72.35, T.catchSpike, E.outQ);
  const p = pose({ lean: -0.05 * c, neck: -0.12 * c, aF: lerp(0.08, 2.05, c), eF: lerp(0.15, 1.1, c), aB: -0.05, hF: 0.4 });
  ctx.save(); ctx.translate(900, 1060); ctx.scale(1.5, 1.5);
  const J = drawHeroSide(ctx, p, { bulk: 1, t: 72 + lt * 0.1, wind: 0.25, eye: 0.6, lx: 1.5 });
  ctx.restore();
  const hand = V(900 + J.F.wr.x * 1.5 + dirDown(J.F.fa).x * 30, 1060 + J.F.wr.y * 1.5 + dirDown(J.F.fa).y * 30);
  for (let i = 0; i < SPK.length; i++) {
    if (i === 0 && t >= T.catchSpike) { boneSpike(ctx, hand.x + 100, hand.y, PI, 1.15, 0); continue; }
    const q = spikePos(i, t);
    boneSpike(ctx, q.x, q.y, PI, 1.15, 1);
  }
  FX.burst(ctx, hand.x, hand.y, 60, win(t, T.catchSpike, T.catchSpike + 0.03, T.catchSpike + 0.06, T.catchSpike + 0.25), { n: 6 });
}, { name: '5F3', frame: { x: 1050 }, grade: GSLOW, post: (ctx, lt) => letterbox(ctx, 1 - seg(lt, 1.3, 1.5), 150) });

// 5G: время возвращается — шипы взрываются о стену, он раздавливает пойманный
shot(73.9, 75.0, (ctx, lt, t) => {
  LNIGHT();
  const sh = FX.addShake(FX.shake(t, 74.0, 22, 0.6), FX.shake(t, 74.3, 14, 0.4));
  nightBack(ctx, t, 380 + sh.x, { y: 300 + sh.y, z: -900 });
  const p = pose({ lean: -0.05, neck: -0.12, aF: lerp(2.05, 1.6, seg(t, 74.3, 74.6)), eF: 1.1, aB: -0.05, hF: lerp(0.4, 1, seg(t, 74.2, 74.3)) });
  ctx.save(); ctx.translate(900 + sh.x, 1060 + sh.y); ctx.scale(1.5, 1.5);
  const J = drawHeroSide(ctx, p, { bulk: 1, t, wind: 0.6, eye: 0.6, lx: 1.5 });
  ctx.restore();
  for (let i = 1; i < SPK.length; i++) {
    const q = spikePos(i, t);
    if (q.x > -200) boneSpike(ctx, q.x, q.y, PI, 1.15, 1);
  }
  // взрывы позади (слева)
  for (const [x, y, t0] of [[420, 420, 74.0], [520, 640, 74.06], [380, 260, 74.12]]) {
    FX.burst(ctx, x, y, 140, win(t, t0, t0 + 0.02, t0 + 0.05, t0 + 0.25), { seed: x, color: '#e8f6ff' });
    FX.dust(ctx, x, y, 1, t, t0, { n: 14, seed: x, speed: 700, size: 220, life: 1.5, alpha: 0.55, color: '#9fb6c6', up: true, flat: 0.8 });
  }
  const hand = V(900 + J.F.wr.x * 1.5, 1060 + J.F.wr.y * 1.5);
  if (t < 74.25) boneSpike(ctx, hand.x + 100, hand.y + 20, PI, 1.15, 0);
  else FX.debris(ctx, hand.x + 30, hand.y, 0.7, t, 74.25, { n: 18, seed: 7, speed: 700, size: 16, color: '#d9d2c2', g: 1500 });
}, { name: '5G', frame: { x: 1000 }, grade: GNIGHT, post: (ctx, lt, t) => { flashWhite(ctx, win(t, 73.9, 73.92, 73.95, 74.1) * 0.6); fadeBlack(ctx, seg(t, 74.6, 75.0)); } });

// ===================== СЦЕНА 6 =====================
function ruinsYard(ctx, cam, t) {
  drawCourtyard(ctx, cam, SUNSET, t, { sky: { sunX: 960, sunY: cam.hy - 70, sunR: 120, cloudA: 1.2 }, autumn: 0.3, pillars: false,
    buildings: COURT.buildings.concat([{ X: -8600 - 900, Z: HZ + 1500, w: 3600, h: 1500, roofH: 650, hole: { X: -9200, Y: 500, r: 520 } }]) });
  drawCracks(ctx, cam, XL, HZ, 1500, 1, 21);
  drawCracks(ctx, cam, 0, HZ + 600, 1300, 1, 5);
  drawCracks(ctx, cam, -900, HZ - 300, 1000, 1, 8);
  for (const [X, Z, hb, sd] of [[-3400, 4200, 300, 2], [3600, 3800, 520, 3], [-6500, 6800, 700, 5], [6800, 6500, 260, 6], [1800, HZ + 400, 380, 4]]) drawPillar(ctx, cam, X, Z, { r: 220, h: 1100, broken: hb, seed: sd, rope: false, pal: SUNSET });
  // столбы дыма
  for (let k = 0; k < 4; k++) {
    const X = [-5200, 4200, -9000, 1200][k], Z = [7000, 8000, HZ + 1500, 9500][k];
    for (let i = 0; i < 8; i++) {
      const ph = (t * 0.12 + i / 8) % 1;
      const q = cam.P(X + ph * 900 + noise(i + k, 3) * 200, ph * 3600, Z);
      if (q) drawSprite(ctx, Sprites.puff('#3a2226', 1 + (i % 6)), q.x, q.y, (700 + ph * 1600) * q.s, 0.5 * (1 - ph));
    }
  }
}
const embers = (ctx, t, n = 50) => FX.motes(ctx, t, { n, color: '#ffb060', alpha: 0.8, size: 4, speed: 1.2, vy: -40, vx: 20 });

// 6A: общий план разрушенной площадки на закате
shot(75.0, 79.0, (ctx, lt, t) => {
  LSUN();
  const u = E.ioS(lt / 4);
  const cam = makeCam({ x: 0, y: lerp(900, 420, u), z: lerp(HZ - 6200, HZ - 3600, u), f: 1300, hy: lerp(H * 0.4, H * 0.5, u) });
  ruinsYard(ctx, cam, t);
  const q = cam.P(0, 0, HZ);
  groundShadow(ctx, cam, 0, HZ, 120, 0.5);
  ctx.save(); ctx.translate(q.x, q.y); ctx.scale(q.s, q.s);
  drawHeroFront(ctx, { bulk: 1, t, wind: 0.7, armOut: 0.1, face: { open: 0.6, cold: 1, lookY: 0.4, scar: 1 } });
  ctx.restore();
  embers(ctx, t, 60);
}, { name: '6A', grade: GSUN, dissolve: 0.6 });

// 6B: по пояс — поднимает голову
shot(79.0, 82.6, (ctx, lt, t) => {
  LSUN();
  const u = E.ioS(lt / 3.6);
  const cam = makeCam({ x: 0, y: 420, z: HZ - 3000, f: 1300, hy: H * 0.5 });
  ruinsYard(ctx, cam, t);
  const up = seg(t, 80.2, 81.0, E.ioC);
  ctx.save(); ctx.translate(960, 1660); const z = lerp(2.75, 3.0, u); ctx.scale(z, z);
  drawHeroFront(ctx, { bulk: 1, t, wind: 0.6, breath: 1, armOut: 0.1, headTilt: 0, headDY: lerp(10, 0, up), face: { open: lerp(0.45, 0.66, up), cold: 1, lookY: lerp(0.9, 0, up), brow: 0.3, scar: 1 } });
  ctx.restore();
  embers(ctx, t, 60);
}, { name: '6B', frame: { y: 470 }, grade: GSUN });

// 6C: лицо — лёгкая ухмылка
shot(82.6, 86.45, (ctx, lt, t) => {
  LSUN();
  setLight({ kx: -0.5, ky: -0.4, ko: 0.24, rx: 0.9, ry: -0.4, ro: 0.09, rim: '#ffb46a', rimA: 1, tint: '#4a1a20', tintA: 0.22 });
  const g = ctx.createLinearGradient(0, -300, 0, 1300);
  g.addColorStop(0, '#2a1630'); g.addColorStop(0.5, '#8b2f3a'); g.addColorStop(1, '#ff8a3d');
  ctx.fillStyle = g; ctx.fillRect(-1500, -1500, W + 3000, H + 3000);
  drawSprite(ctx, Sprites.soft('#ffd27a', 128), 1350, 700, 1400, 0.5);
  const u = E.ioS(lt / 3.85);
  ctx.save();
  ctx.translate(960, lerp(600, 620, u)); const z = lerp(1.0, 1.2, u); ctx.scale(z, z);
  const sm = seg(t, T.smile, T.smile + 0.6, E.ioC);
  drawFace(ctx, { bulk: 1, yaw: lerp(0.14, 0.05, u), t, open: lerp(0.66, 0.58, sm), cold: 1, brow: 0.25, smile: sm * 0.85, scar: 1, wind: 0.5, eyeGlint: win(t, 85.5, 85.6, 85.8, 86.1) * 0.8 });
  ctx.restore();
  embers(ctx, t, 40);
}, { name: '6C', grade: GSUN });

// 6D: силуэт на фоне солнца и название
shot(86.45, 89.3, (ctx, lt, t) => {
  setLight({ rx: 0, ry: -1 });
  const g = ctx.createLinearGradient(0, -300, 0, 1300);
  g.addColorStop(0, '#12050e'); g.addColorStop(0.45, '#6a1424'); g.addColorStop(0.75, '#ff5a2a'); g.addColorStop(1, '#ffb050');
  ctx.fillStyle = g; ctx.fillRect(-1500, -1500, W + 3000, H + 3000);
  drawSprite(ctx, Sprites.soft('#ffcf7a', 128), 960, 760, 1800, 0.6);
  ctx.fillStyle = '#ffe6b0'; ctx.beginPath(); ctx.arc(960, 760, 300, 0, TAU); ctx.fill();
  ctx.fillStyle = '#08040a'; ctx.fillRect(-1500, 1020, W + 3000, 1200);
  ctx.save(); ctx.translate(960, 1030); const z = lerp(1.32, 1.42, lt / 2.85); ctx.scale(z, z);
  RENDER.mode = 'sil'; SIL.fill = '#07040a'; SIL.rim = '#ffcf8a';
  drawHeroFront(ctx, { bulk: 1, t, wind: 0.7, armOut: 0.1, stance: 12 });
  RENDER.mode = 'normal';
  ctx.restore();
  embers(ctx, t, 70);
}, { name: '6D', frame: { y: 600 }, grade: { sat: 1.1, con: 1.15, tint: '#ff6a2a', tintA: 0.15, bloom: 0.7, vig: 0.7 },
  post: (ctx, lt, t) => {
    const a = seg(t, T.finalTitle, T.finalTitle + 0.06);
    const sc = lerp(1.35, 1, seg(t, T.finalTitle, T.finalTitle + 0.3, E.outE));
    const sh = FX.shake(t, T.finalTitle, 18, 0.6);
    ctx.save(); ctx.translate(OW / 2 + sh.x, OH * 0.13 + sh.y); ctx.scale(sc, sc);
    drawTitle(ctx, 'НЕБЕСНОЕ', 0, 0, 160, { color: '#ffffff', spacing: 10, alpha: a, stroke: 4, strokeColor: 'rgba(0,0,0,0.6)', glow: 'rgba(255,120,60,0.7)', glowR: 40 });
    drawTitle(ctx, 'ОГРАНИЧЕНИЕ', 0, 128, 98, { color: '#ffffff', spacing: 8, alpha: a, stroke: 3, strokeColor: 'rgba(0,0,0,0.6)', glow: 'rgba(255,120,60,0.7)', glowR: 40 });
    const lw = seg(t, T.finalTitle + 0.1, T.finalTitle + 0.6, E.outC) * 620;
    ctx.fillStyle = '#c3122d'; ctx.fillRect(-lw / 2, 200, lw, 8);
    drawTitle(ctx, 'ТОДЖИ ФУСИГУРО', 0, 262, 44, { color: '#ffe0c0', spacing: 16, alpha: seg(t, 87.2, 87.7) });
    ctx.restore();
    flashWhite(ctx, win(t, T.finalTitle, T.finalTitle + 0.02, T.finalTitle + 0.04, T.finalTitle + 0.2) * 0.75);
  } });

// финальная чернота
shot(T.finalCut, DURATION, ctx => bg(ctx, '#000'), { name: 'END', grade: { bloom: 0, vig: 0, grain: 0.04 } });
