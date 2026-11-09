'use strict';
/* Сцены 1–2: пробуждение и трансформация тела. */
const LIGHT = {
  bedroom: () => setLight({ kx: 0.85, ky: -0.35, ko: 0.2, rx: 0.9, ry: -0.2, ro: 0.07, rim: '#ffd2a0', rimA: 0.75, tint: '#24345e', tintA: 0.22 }),
  studio: () => setLight({ kx: 0.6, ky: -0.8, ko: 0.24, rx: -0.95, ry: -0.2, ro: 0.09, rim: '#86c0ff', rimA: 0.95, tint: '#1b2236', tintA: 0.12 }),
};

// ===================== СЦЕНА 1 =====================
// 1A: спальня, общий план, герой просыпается и садится
shot(0, 3.6, (ctx, lt, t) => {
  LIGHT.bedroom();
  const z = lerp(1.15, 1.5, E.ioS(lt / 3.6));
  cam2D(ctx, lerp(560, 590, E.ioS(lt / 3.6)), lerp(560, 440, E.ioS(lt / 3.6)), z);
  drawBedroom(ctx, t, { light: 1 });
  drawBed(ctx);
  const up = seg(t, T.sitUp, T.sitUp + 0.95, E.ioC);
  const lie = { x: 0, y: 0, lean: -1.5, neck: 0.04, aF: 2.25, eF: 0.35, aB: 2.4, eB: 0.2, lF: 1.5, kF: 0, lB: 1.5, kB: 0, fF: 0, fB: 0, hF: 0.35, hB: 0.35 };
  const sit = { x: 0, y: 0, lean: -0.14, neck: 0.28, aF: -0.15, eF: 0.55, aB: -0.55, eB: 0.15, lF: 1.5, kF: 0, lB: 1.5, kB: 0, fF: 0, fB: 0, hF: 0.4, hB: 0.2 };
  const p = mixObj(lie, sit, up);
  p.lean += Math.sin(t * 1.4) * 0.006 * (1 - up);
  const eye = t < T.wake ? 0 : t < T.wake + 0.12 ? 0.5 : t > T.wake + 0.6 && t < T.wake + 0.7 ? 0.1 : 0.85;
  ctx.save(); ctx.translate(560, 515); ctx.scale(1.3, 1.3);
  drawHeroSide(ctx, p, { bulk: 0, outfit: 'tee', eye, noLegs: true, t, scar: false });
  ctx.restore();
  drawBlanket(ctx, t, up);
  // пылинки в луче света
  FX.motes(ctx, t, { n: 70, color: '#ffe0b0', alpha: 0.5, size: 5, speed: 0.4, mask: (x, y) => clamp(1 - Math.abs(y - (130 + (1240 - x) * 0.55)) / 260) * (x < 1240 ? 1 : 0) });
}, { name: '1A', frame: { y: 470 }, grade: { sat: 0.9, con: 1.08, bri: 0.95, tint: '#ffb27a', tintA: 0.12, shadow: '#1a2a55', shadowA: 0.3, bloom: 0.45, vig: 0.7 },
  post: (ctx, lt) => fadeBlack(ctx, 1 - seg(lt, 0, 1.2, E.outQ)) });

// 1B: лицо крупно — сонный, обычный парень
shot(3.6, 5.65, (ctx, lt, t) => {
  LIGHT.bedroom();
  setLight({ kx: 0.8, ky: -0.45, ko: 0.18, rx: 0.95, ry: -0.1, ro: 0.06, rim: '#ffd8a8', rimA: 0.7, tint: '#2a3a6e', tintA: 0.18 });
  // размытый фон комнаты
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#0b0f19'); g.addColorStop(0.7, '#1a2338'); g.addColorStop(1, '#3a3f58');
  ctx.fillStyle = g; ctx.fillRect(-1500, -1500, W + 3000, H + 3000);
  drawSprite(ctx, Sprites.soft('#ffcf98', 128), 1650, 250, 1100, 0.35);
  const R = rng(5);
  for (let i = 0; i < 9; i++) drawSprite(ctx, Sprites.soft(R() > 0.5 ? '#ffd8a8' : '#8fb0ff', 64), 1300 + R() * 600, R() * 600, 60 + R() * 120, 0.12 + R() * 0.1);
  const u = lt / 2.05;
  const down = seg(t, 5.0, 5.55, E.ioC);
  ctx.save();
  ctx.translate(960 + lerp(-30, 10, u), 590 + down * 26);
  const z = lerp(0.92, 1.06, E.ioS(u));
  ctx.scale(z, z); ctx.rotate(-0.03 + down * 0.04);
  const blink = t > 4.12 && t < 4.27 ? 0.05 : 1;
  drawFace(ctx, { bulk: 0, yaw: lerp(0.2, 0.08, E.ioS(u)), t, open: lerp(0.62, 0.92, seg(t, 4.3, 4.8)) * blink, lookY: down * 0.85, lookX: -0.1, outfit: 'tee', scar: 0, wind: 0 });
  ctx.restore();
  FX.motes(ctx, t, { n: 30, color: '#ffe8c0', alpha: 0.35, size: 7, speed: 0.3 });
}, { name: '1B', grade: { sat: 0.92, con: 1.06, tint: '#ffb27a', tintA: 0.1, shadow: '#1a2a55', shadowA: 0.3, bloom: 0.4, vig: 0.75 } });

// 1C: взгляд от первого лица на ладони; синие нити энергии исчезают
shot(5.65, 8.0, (ctx, lt, t) => {
  setLight({ kx: 0.75, ky: -0.5, ko: 0.16, rx: 0.9, ry: -0.3, ro: 0.05, rim: '#ffd8a8', rimA: 0.6, tint: '#2a3a6e', tintA: 0.15 });
  // размытое одеяло
  bg(ctx, '#1a2033');
  const R = rng(8);
  for (let i = 0; i < 12; i++) drawSprite(ctx, Sprites.puff(R() > 0.5 ? '#2c3858' : '#141a2a', 1 + i % 5), R() * W, 300 + R() * 800, 700, 0.8);
  drawSprite(ctx, Sprites.soft('#ffcf98', 128), 1500, 120, 1400, 0.22);
  const sh = { x: noise(t * 0.8, 3) * 10, y: noise(t * 0.7, 4) * 8, r: noise(t * 0.5, 5) * 0.008 };
  ctx.save();
  cam2D(ctx, 960, 560, lerp(1.0, 1.08, lt / 2.35), 0, sh);
  const rise = 1 - seg(t, 5.65, 6.3, E.outC);
  const curl = 0.12 + 0.35 * win(t, 6.7, 7.0, 7.3, 7.6);
  for (const [x, m, r] of [[800, -1, 0.12], [1120, 1, -0.12]]) {
    ctx.save(); ctx.translate(x, 1120 + rise * 700); ctx.rotate(r); ctx.scale(1.18, 1.18);
    drawPalm(ctx, { bulk: 0, curl, mirror: m, t, tremble: true });
    ctx.restore();
  }
  const wa = win(t, 5.9, 6.3, 6.6, 7.6, E.ioS);
  drawWisps(ctx, 800, 820 + rise * 700, t, wa, 1);
  drawWisps(ctx, 1120, 820 + rise * 700, t + 0.7, wa, 2);
  ctx.restore();
}, { name: '1C', grade: { sat: 0.95, con: 1.08, tint: '#ffb27a', tintA: 0.08, shadow: '#1a2a55', shadowA: 0.3, bloom: 0.5, vig: 0.75 },
  post: (ctx, lt, t) => fadeBlack(ctx, seg(t, 7.72, 8.0, E.inQ)) });

// 1D: титр «Небесное ограничение»
shot(8.0, 9.0, (ctx, lt, t) => {
  bg(ctx, '#000');
}, { name: '1D', grade: { bloom: 0.6, vig: 0.4, grain: 0.1 },
  post: (ctx, lt, t) => {
    const a = seg(t, T.title1, T.title1 + 0.08, E.outQ);
    const sc = lerp(1.25, 1.0, seg(t, T.title1, T.title1 + 0.35, E.outE)) + seg(t, 8.6, 9.0, E.inE) * 0.6;
    const sh = FX.shake(t, T.title1, 14, 0.5);
    ctx.save(); ctx.translate(OW / 2 + sh.x, OH * 0.47 + sh.y); ctx.scale(sc, sc);
    const lw = seg(t, T.title1 + 0.05, T.title1 + 0.45, E.outC) * 640;
    ctx.fillStyle = '#c3122d'; ctx.fillRect(-lw / 2, 150, lw, 7);
    drawTitle(ctx, 'НЕБЕСНОЕ', 0, -10, 150, { color: '#f4f1ea', spacing: 10, alpha: a, glow: 'rgba(255,255,255,0.35)', glowR: 24 });
    drawTitle(ctx, 'ОГРАНИЧЕНИЕ', 0, 95, 92, { color: '#f4f1ea', spacing: 8, alpha: a, glow: 'rgba(255,255,255,0.35)', glowR: 24 });
    drawTitle(ctx, '天与呪縛', 0, -150, 40, { color: '#c3122d', spacing: 30, alpha: a * 0.9 });
    ctx.restore();
    flashWhite(ctx, win(t, T.title1, T.title1 + 0.02, T.title1 + 0.04, T.title1 + 0.18) * 0.7);
    flashWhite(ctx, seg(t, 8.85, 9.0, E.inQ));
  } });

// ===================== СЦЕНА 2 =====================
function darkStudio(ctx, t, warm = '#ffb978', cold = '#4f7ad0') {
  bg(ctx, '#06070b');
  drawSprite(ctx, Sprites.soft(warm, 128), 1500, 200, 1600, 0.16);
  drawSprite(ctx, Sprites.soft(cold, 128), 300, 900, 1500, 0.14);
}
const heartPulse = t => Math.max(...[T.heart1, T.heart2, T.heart3].map(h => Math.exp(-Math.pow((t - h) * 7, 2))));

// 2A: кулак сжимается, проступают вены
shot(9.0, 11.6, (ctx, lt, t) => {
  LIGHT.studio();
  darkStudio(ctx, t);
  const hp = heartPulse(t);
  const sh = FX.addShake(FX.shake(t, T.fistCrack, 6, 0.35), { x: 0, y: 0, r: 0 });
  ctx.save();
  cam2D(ctx, 1000, 560, lerp(1.0, 1.12, E.ioS(lt / 2.6)) + hp * 0.025, -0.02, sh);
  ctx.translate(880, 610); ctx.rotate(-0.1); ctx.scale(1.4, 1.4);
  const curl = seg(t, 9.35, 10.55, E.ioC) + noise(t * 14, 2) * 0.01 * seg(t, 10.55, 11);
  drawFistSide(ctx, { bulk: lerp(0.1, 0.5, seg(t, 9.3, 11.4)), curl: clamp(curl), veins: seg(t, 10.2, 11.4, E.outQ), t });
  ctx.restore();
  FX.motes(ctx, t, { n: 40, color: '#ffd8b0', alpha: 0.35, size: 5, speed: 0.5 });
}, { name: '2A', frame: { x: 1030, y: 470 }, grade: (lt, t) => ({ sat: 0.95, con: 1.15, bri: 1, tint: '#ff9a5a', tintA: 0.12, shadow: '#0d1530', shadowA: 0.35, bloom: 0.45, vig: 0.85 + heartPulse(t) * 0.12 }),
  post: (ctx, lt) => flashWhite(ctx, 1 - seg(lt, 0, 0.25, E.outQ)) });

// 2B: рука напрягается, камера скользит к бицепсу и плечу
shot(11.6, 14.2, (ctx, lt, t) => {
  LIGHT.studio();
  darkStudio(ctx, t, '#ffc28a', '#5a86e0');
  const u = E.ioS(lt / 2.6);
  const hp = heartPulse(t);
  ctx.save();
  cam2D(ctx, lerp(1360, 720, u), lerp(420, 610, u), lerp(1.18, 1.0, u) + hp * 0.02, 0.03);
  ctx.translate(1100, 700); ctx.scale(0.75, 0.75);
  drawArmFlex(ctx, { bulk: lerp(0.35, 0.85, seg(t, 11.8, 13.9)), flex: lerp(0.7, 1, seg(t, 11.7, 12.6)), t, outfit: 'tee' });
  ctx.restore();
  FX.motes(ctx, t, { n: 40, color: '#ffd8b0', alpha: 0.3, size: 5, speed: 0.5, seed: 4 });
}, { name: '2B', grade: { sat: 0.95, con: 1.15, tint: '#ff9a5a', tintA: 0.12, shadow: '#0d1530', shadowA: 0.35, bloom: 0.45, vig: 0.85 } });

// 2C: торс — «Мышцы плотнее стали», камера поднимается от пресса к плечам
shot(14.2, 16.1, (ctx, lt, t) => {
  setLight({ kx: 0.7, ky: -0.7, ko: 0.26, rx: -0.9, ry: -0.35, ro: 0.1, rim: '#8cc6ff', rimA: 1, tint: '#141a2c', tintA: 0.12 });
  darkStudio(ctx, t, '#ffc28a', '#4f7ad0');
  const u = E.ioS(lt / 1.9);
  ctx.save();
  cam2D(ctx, lerp(-30, 10, u), lerp(-286, -372, u), lerp(3.5, 3.1, u), 0.02);
  const bulk = lerp(0.55, 0.95, seg(t, 14.3, 15.9));
  drawHeroFront(ctx, { bulk, t, outfit: 'tee', breath: 3, face: { open: 0.75, cold: 0.6, lookY: 0.2, scar: 0 } });
  ctx.restore();
  FX.motes(ctx, t, { n: 30, color: '#ffd8b0', alpha: 0.3, size: 5, speed: 0.5, seed: 7 });
}, { name: '2C', grade: { sat: 0.92, con: 1.18, tint: '#ff9a5a', tintA: 0.1, shadow: '#0d1530', shadowA: 0.35, bloom: 0.5, vig: 0.85 } });

// 2D: осанка — силуэт на фоне окна, распрямляется
shot(16.1, 17.9, (ctx, lt, t) => {
  setLight({ rx: 0.95, ry: -0.25 });
  // фон: огромное яркое окно
  bg(ctx, '#0a0c12');
  const wx = 760, wy = 60, ww = 820, wh = 760;
  const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
  sky.addColorStop(0, '#9ec0ec'); sky.addColorStop(0.6, '#ffe2bf'); sky.addColorStop(1, '#ffc58a');
  ctx.fillStyle = sky; ctx.fillRect(wx, wy, ww, wh);
  for (let i = 0; i < 18; i++) { ctx.fillStyle = 'rgba(255,248,236,0.65)'; ctx.fillRect(wx, wy + i * (wh / 18), ww, 14); }
  ctx.strokeStyle = '#050608'; ctx.lineWidth = 30; ctx.strokeRect(wx, wy, ww, wh);
  godRays(ctx, wx + ww / 2, wy + wh / 2, PI * 0.82, 0.9, 1500, '#ffd9a8', 0.12, 9, 3);
  ctx.fillStyle = '#07080c'; ctx.fillRect(0, 900, W, 200);
  const u = seg(t, T.posture, T.posture + 0.75, E.ioC);
  const slouch = { x: 0, y: -236, lean: 0.24, neck: 0.32, aF: 0.28, eF: 0.25, aB: 0.18, eB: 0.2, lF: 0.06, kF: 0.14, lB: -0.06, kB: 0.1, fF: 0, fB: 0, hF: 0.5, hB: 0.5 };
  const tall = { x: 0, y: -244, lean: -0.035, neck: -0.06, aF: 0.04, eF: 0.12, aB: -0.08, eB: 0.12, lF: 0.05, kF: 0.03, lB: -0.05, kB: 0.03, fF: 0, fB: 0, hF: 0.9, hB: 0.7 };
  const p = mixObj(slouch, tall, u);
  ctx.save();
  cam2D(ctx, 960, 560, lerp(1.0, 1.07, lt / 1.8));
  ctx.translate(930, 1010); ctx.scale(1.55, 1.55);
  RENDER.mode = 'sil'; SIL.fill = '#06070a'; SIL.rim = '#ffd2a0';
  drawHeroSide(ctx, p, { bulk: lerp(0.8, 0.97, u), outfit: 'tee', t });
  RENDER.mode = 'normal';
  ctx.restore();
  FX.motes(ctx, t, { n: 80, color: '#ffe8c8', alpha: 0.6, size: 5, speed: 0.4, seed: 12 });
}, { name: '2D', frame: { x: 990 }, grade: { sat: 0.95, con: 1.1, tint: '#ffb27a', tintA: 0.15, bloom: 0.7, vig: 0.7 } });

// 2E: стакан падает — рука ловит его в воздухе
shot(17.9, 20.2, (ctx, lt, t) => {
  LIGHT.bedroom();
  const caught = t >= T.glassCatch;
  const sh = FX.shake(t, T.glassCatch, 10, 0.35);
  const punch = seg(t, T.glassCatch, T.glassCatch + 0.12, E.outQ) * (1 - seg(t, T.glassCatch + 0.3, T.glassCatch + 1.0)) * 0.12;
  ctx.save();
  cam2D(ctx, lerp(1340, 1400, lt / 2.3), lerp(690, 720, lt / 2.3), 1.85 + punch, 0, sh);
  drawBedroom(ctx, t, { glass: false });
  // траектория стакана
  const tip = seg(t, T.glassTip, T.glassTip + 0.5, E.inQ);
  let gx = 1405 + tip * 60, gy = 630, gr = tip * 1.3;
  const tf = T.glassTip + 0.5;
  if (t > tf) { const u = Math.min(t, T.glassCatch) - tf; gy += 0.5 * 1000 * u * u; gx += u * 50; gr += u * 1.6; }
  if (caught) gr = lerp(gr, 0.05, seg(t, T.glassCatch + 0.05, T.glassCatch + 0.6, E.outB));
  // капли воды
  const R = rng(17);
  ctx.fillStyle = 'rgba(170,215,255,0.85)';
  for (let i = 0; i < 26; i++) {
    const t0 = T.glassTip + 0.3 + R() * 0.55, vx = 40 + R() * 160, vy = -60 - R() * 140;
    let u = t - t0;
    if (u < 0) { R(); continue; }
    if (caught) u = Math.min(u, T.glassCatch - t0) + Math.max(0, t - T.glassCatch - 0.35) * 0.9; // «зависают» на миг
    const x = 1452 + vx * u + R() * 10, y = 600 + vy * u + 0.5 * 1000 * u * u;
    if (y > 1100) continue;
    ctx.beginPath(); ctx.ellipse(x, y, 3.5 + (i % 3), 5 + (i % 4), Math.atan2(vy + 1000 * u, vx), 0, TAU); ctx.fill();
  }
  drawGlass(ctx, gx, gy, 1, gr, 1 - tip * 0.4);
  // рука
  const handIn = seg(t, T.glassCatch - 0.06, T.glassCatch, E.outQ);
  if (handIn > 0) {
    ctx.save();
    ctx.translate(gx - 100 - (1 - handIn) * 700, gy - 70); ctx.rotate(0.05); ctx.scale(0.44, 0.44);
    drawFistSide(ctx, { bulk: 0.95, curl: lerp(0.2, 0.62, handIn), veins: 0.4, t });
    ctx.restore();
    if (handIn < 1) FX.streaks(ctx, t, 1, { y0: gy - 80, y1: gy + 40, n: 14, dir: -1, color: '#fff2dc' });
  }
  ctx.restore();
}, { name: '2E', frame: { x: 1080 }, grade: { sat: 0.95, con: 1.1, tint: '#ffb27a', tintA: 0.12, shadow: '#1a2a55', shadowA: 0.28, bloom: 0.45, vig: 0.7 },
  mb: lt => (Math.abs(lt + 17.9 - T.glassCatch) < 0.12 ? { n: 6, shutter: 1 } : 1) });

// 2F: лицо после трансформации — холодный взгляд
shot(20.2, 21.9, (ctx, lt, t) => {
  setLight({ kx: -0.85, ky: -0.45, ko: 0.22, rx: 0.95, ry: -0.2, ro: 0.08, rim: '#7fe0ff', rimA: 0.9, tint: '#101826', tintA: 0.2 });
  darkStudio(ctx, t, '#ff9f60', '#3f8fb0');
  const u = E.ioS(lt / 1.7);
  ctx.save();
  ctx.translate(lerp(940, 980, u), lerp(600, 590, u));
  const z = lerp(0.98, 1.1, u); ctx.scale(z, z);
  drawFace(ctx, { bulk: 1, yaw: lerp(0.3, 0.16, u), t, open: lerp(0.55, 0.74, seg(t, 20.4, 20.9)), cold: 1, brow: 0.45, lookX: -0.05, outfit: 'tee', scar: seg(t, 20.3, 21.2) });
  ctx.restore();
}, { name: '2F', grade: { sat: 0.9, con: 1.18, tint: '#4ab0c8', tintA: 0.12, shadow: '#0a1424', shadowA: 0.35, bloom: 0.4, vig: 0.85 } });

// 2G: глаз — зрачок сужается, взгляд хищника
shot(21.9, 24.0, (ctx, lt, t) => {
  const u = E.ioS(lt / 2.1);
  ctx.save();
  ctx.translate(W / 2, H / 2 + 20);
  const z = lerp(0.68, 0.84, u) + seg(t, T.eyeCold, T.eyeCold + 0.1, E.outQ) * 0.04 * (1 - seg(t, T.eyeCold + 0.1, T.eyeCold + 0.6));
  ctx.scale(z, z); ctx.rotate(lerp(-0.04, 0.02, u));
  drawEyeMacro(ctx, { bulk: lerp(0.55, 1, seg(t, 21.9, 22.6)), open: lerp(0.6, 0.8, seg(t, 22.0, 22.4)), pupil: lerp(1.2, 0.58, seg(t, T.eyeCold, T.eyeCold + 0.18, E.outE)), cold: 1, t, brow: 0.3 });
  ctx.restore();
  FX.burst(ctx, W / 2 + 110, H / 2 - 50, 120, win(t, T.eyeCold, T.eyeCold + 0.05, T.eyeCold + 0.1, T.eyeCold + 0.35) * 0.8, { n: 4, rot: 0.3 });
}, { name: '2G', frame: { k: 1.3 }, grade: { sat: 0.95, con: 1.15, tint: '#2fa08a', tintA: 0.1, shadow: '#08101a', shadowA: 0.3, bloom: 0.45, vig: 0.85 },
  post: (ctx, lt, t) => flashWhite(ctx, seg(t, 23.75, 24.0, E.inQ)) });
