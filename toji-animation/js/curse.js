'use strict';
/* Противник — проклятый дух: сгорбленный гигант с длинными когтями и множеством глаз.
   Рисуется сбоку (лицом вправо; для разворота — scale(-1,1)) и крупным планом анфас. */
const CPAL = {
  skin: { b: '#4a4356', s: '#26212f' }, belly: { b: '#7b708a', s: '#4d4458' },
  bone: { b: '#d9d2c2', s: '#9a917f' }, claw: { b: '#1b1820', s: '#0a090c' },
  eye: '#ffd54a', mouth: '#4a0c16', glow: '#b45cff',
};
const CPOSE = { x: 0, y: -380, lean: 0.55, neck: 0.25, jaw: 0.1, aF: 0.2, eF: 0.5, aB: -0.1, eB: 0.6, lF: 0.35, kF: 0.9, lB: -0.15, kB: 0.8, eyes: 1, claw: 0.3, sq: 1 };
const cpose = o => Object.assign({}, CPOSE, o);

function drawCurseSide(ctx, p, t = 0, o = {}) {
  const D = { torso: 280, neck: 70, upper: 230, fore: 220, thigh: 200, shin: 190, foot: 110 };
  const hip = V(p.x, p.y);
  const u = dirUp(p.lean), f = V(Math.cos(p.lean), Math.sin(p.lean));
  const L = (fx, uy) => V(hip.x + f.x * fx + u.x * uy, hip.y + f.y * fx + u.y * uy);
  const nb = L(40, D.torso);
  const sh = L(10, D.torso - 40);
  const ha = p.lean + p.neck + 0.9;
  const head = vadd(nb, vmul(dirUp(p.lean + p.neck), D.neck));
  const breath = Math.sin(t * 2.4) * 4;
  const skin = { b: CPAL.skin.b, s: CPAL.skin.s, w: 3, o: '#07060a' };
  const far = { b: darken(CPAL.skin.b, 0.25), s: darken(CPAL.skin.s, 0.2), w: 3, o: '#07060a' };
  // аура
  if (o.aura !== false && isNormal()) {
    const R = rng(3);
    for (let i = 0; i < 16; i++) {
      const base = L((R() - 0.5) * 200, R() * D.torso);
      const ph = R() * 10, up = ((t * 60 + ph * 40) % 240);
      drawSprite(ctx, Sprites.puff('#120818', 2 + (i % 5)), base.x + noise(t + i, 4) * 40, base.y - up, 260 + up, 0.5 * (1 - up / 240));
      drawSprite(ctx, Sprites.soft(CPAL.glow, 64), base.x + noise(t + i, 4) * 40, base.y - up, 140, 0.08 * (1 - up / 240));
    }
  }
  const limb = (a0, len, ang) => vadd(a0, vmul(dirDown(ang), len));
  // дальние конечности
  const drawLeg = (l, k, mat) => {
    const kn = limb(hip, D.thigh, l);
    const an = limb(kn, D.shin, l - k);
    const ft = vadd(an, vmul(dirDown(l - k + 1.4), D.foot));
    shadePath(ctx, capsule(an, ft, 24, 16, 1, 1), mat, 40);
    for (let i = 0; i < 3; i++) {
      const c0 = vadd(ft, V(i * 6 - 6, 0)), c1 = vadd(c0, vmul(dirDown(l - k + 1.9 + i * 0.12), 52));
      shadePath(ctx, spike(c0, c1, 8, -0.15), { b: CPAL.claw.b, s: CPAL.claw.s, w: 2, o: '#000' }, 14);
    }
    shadePath(ctx, capsule(kn, an, 36, 24, 1.25, 1.1), mat, 60);
    shadePath(ctx, capsule(hip, kn, 58, 38, 1.2, 1.2), mat, 90);
  };
  const drawArm = (a, e, mat) => {
    const el = limb(sh, D.upper, a + p.lean * 0.4);
    const wr = limb(el, D.fore, a + p.lean * 0.4 + e);
    const fa = a + p.lean * 0.4 + e;
    shadePath(ctx, capsule(el, wr, 36, 22, 1.3, 1.05), mat, 60);
    // кисть и когти
    const hc = vadd(wr, vmul(dirDown(fa), 30));
    shadePath(ctx, capsule(wr, hc, 24, 20, 1, 1), mat, 40);
    for (let i = 0; i < 3; i++) {
      const sp = (i - 1) * (0.25 + p.claw * 0.35);
      const c0 = vadd(hc, vmul(dirDown(fa + sp), 10));
      const c1 = vadd(c0, vmul(dirDown(fa + sp + 0.25), 120 + i * 10));
      shadePath(ctx, spike(c0, c1, 10, -0.18), { b: CPAL.claw.b, s: CPAL.claw.s, w: 2.5, o: '#000', r: '#c08cff' }, 20);
    }
    shadePath(ctx, capsule(sh, el, 52, 36, 1.3, 1.15), mat, 90);
    return { el, wr, hc };
  };
  drawArm(p.aB, p.eB, far);
  drawLeg(p.lB, p.kB, far);
  // торс с горбом
  const tp = [[-40, -10], [-60, 60], [-88, 150 + breath * 0.3], [-80, 240], [-30, 300], [30, 300], [70, 270], [86, 200], [92, 130 + breath], [70, 60], [50, 10]];
  const torso = smoothPath(tp.map(q => { const v = L(q[0], q[1]); return [v.x, v.y]; }), true, 0.5);
  shadePath(ctx, torso, skin, 160);
  if (isNormal()) {
    ctx.save(); ctx.clip(torso);
    // светлое брюхо/грудь
    const bp = smoothPath([[70, 40], [96, 140], [80, 240], [40, 250], [30, 140], [40, 50]].map(q => { const v = L(q[0], q[1]); return [v.x, v.y]; }), true, 0.5);
    shadePath(ctx, bp, { b: CPAL.belly.b, s: CPAL.belly.s }, 60);
    // рёбра
    const rb = new Path2D();
    for (let i = 0; i < 5; i++) { const a = L(84, 100 + i * 30), b = L(20, 120 + i * 30); rb.moveTo(a.x, a.y); rb.quadraticCurveTo(L(56, 112 + i * 30).x, L(56, 112 + i * 30).y + 8, b.x, b.y); }
    detailStroke(ctx, rb, '#2a2232', 4, 0.6);
    // светящиеся трещины
    const cr = new Path2D(); const R = rng(8);
    for (let i = 0; i < 6; i++) { let q = L(-60 + R() * 80, 40 + R() * 220); cr.moveTo(q.x, q.y); for (let k = 0; k < 4; k++) { q = vadd(q, V((R() - 0.5) * 40, (R() - 0.5) * 40)); cr.lineTo(q.x, q.y); } }
    detailStroke(ctx, cr, CPAL.glow, 3, 0.7);
    ctx.restore();
  }
  // костяные шипы вдоль спины
  for (let i = 0; i < 6; i++) {
    const r0 = L(-78 + i * 10, 90 + i * 34), tip = vadd(r0, vmul(dirUp(p.lean - 0.9 + i * 0.12), 70 - i * 6));
    shadePath(ctx, spike(r0, tip, 13, 0.1), { b: CPAL.bone.b, s: CPAL.bone.s, w: 2.5, o: '#0a0809' }, 24);
  }
  drawLeg(p.lF, p.kF, skin);
  // голова
  ctx.save();
  ctx.translate(head.x, head.y); ctx.rotate(ha - PI / 2 + 0.25);
  const jaw = p.jaw;
  // нижняя челюсть
  ctx.save(); ctx.rotate(jaw * 0.6);
  const jp = smoothPath([[-30, 10], [60, 30], [170, 36], [190, 20], [120, 8], [20, -6]], true, 0.4);
  shadePath(ctx, jp, skin, 50);
  if (isNormal()) for (let i = 0; i < 6; i++) { const x = 40 + i * 24; shadePath(ctx, spike(V(x, 14), V(x + 6, -14), 7, 0), { b: '#e8e0cc', s: '#a59c88', w: 1.5, o: '#000' }, 10); }
  ctx.restore();
  if (isNormal() && jaw > 0.05) {
    ctx.fillStyle = CPAL.mouth; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(180, -4); ctx.lineTo(170, 30 * jaw + 10); ctx.lineTo(10, 10); ctx.closePath(); ctx.fill();
  }
  // череп
  const sk = smoothPath([[-50, 20], [-60, -40], [-10, -90], [80, -84], [170, -50], [214, -16], [196, 0], [130, 6], [30, 14]], true, 0.45);
  shadePath(ctx, sk, skin, 80);
  if (isNormal()) {
    for (let i = 0; i < 7; i++) { const x = 60 + i * 22; shadePath(ctx, spike(V(x, -2), V(x + 4, 22 + (i % 2) * 8), 7, 0), { b: '#ece5d2', s: '#a59c88', w: 1.5, o: '#000' }, 10); }
    // множество глаз
    const eyes = [[70, -48, 13], [118, -40, 10], [150, -26, 8], [36, -62, 8], [96, -64, 6]];
    for (const [ex, ey, er] of eyes) {
      const glow = p.eyes;
      drawSprite(ctx, Sprites.soft(CPAL.eye, 32), ex, ey, er * 7, 0.55 * glow);
      ctx.fillStyle = mix('#3a3020', CPAL.eye, glow);
      ctx.beginPath(); ctx.ellipse(ex, ey, er * 1.3, er * 0.7, -0.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#100808'; ctx.beginPath(); ctx.ellipse(ex + 2, ey, er * 0.25, er * 0.6, 0, 0, TAU); ctx.fill();
    }
    // рога
    shadePath(ctx, spike(V(-20, -80), V(-110, -150), 16, 0.15), { b: CPAL.bone.b, s: CPAL.bone.s, w: 2.5, o: '#000' }, 30);
    shadePath(ctx, spike(V(20, -88), V(-40, -170), 13, 0.1), { b: CPAL.bone.b, s: CPAL.bone.s, w: 2.5, o: '#000' }, 30);
  }
  ctx.restore();
  return drawArm(p.aF, p.eF, skin);
}

// Крупный план «морды» проклятия анфас; jaw 0..1, eyes 0..1 (открытие глаз), t
function drawCurseFace(ctx, o) {
  const jaw = o.jaw || 0, t = o.t || 0, eyes = o.eyes ?? 1;
  const skin = { b: '#6a6074', s: '#2c2634', w: 4, o: '#060508' };
  // дымная аура
  const R = rng(12);
  for (let i = 0; i < 22; i++) {
    const a = R() * TAU, r = 520 + R() * 260, up = (t * 90 + R() * 300) % 400;
    drawSprite(ctx, Sprites.puff('#0d0612', 1 + (i % 6)), Math.cos(a) * r, Math.sin(a) * r * 0.7 - up, 600, 0.6);
  }
  // голова
  const head = smoothPath([[-430, -40], [-400, -330], [-200, -470], [0, -500], [200, -470], [400, -330], [430, -40], [360, 160], [220, 260 + jaw * 120], [0, 300 + jaw * 160], [-220, 260 + jaw * 120], [-360, 160]], true, 0.5);
  shadePath(ctx, head, skin, 300);
  // пасть
  const mw = 300, my = 120;
  const mouth = new Path2D();
  mouth.moveTo(-mw, my); mouth.quadraticCurveTo(0, my - 60, mw, my);
  mouth.quadraticCurveTo(mw * 0.7, my + 40 + jaw * 260, 0, my + 60 + jaw * 300);
  mouth.quadraticCurveTo(-mw * 0.7, my + 40 + jaw * 260, -mw, my); mouth.closePath();
  ctx.fillStyle = '#1a0308'; ctx.fill(mouth);
  if (isNormal()) {
    ctx.save(); ctx.clip(mouth);
    const mg = ctx.createRadialGradient(0, my + 120 * jaw, 10, 0, my + 120 * jaw, 300);
    mg.addColorStop(0, rgba('#7a0f22', 0.9)); mg.addColorStop(1, rgba('#1a0308', 0));
    ctx.fillStyle = mg; ctx.fillRect(-400, -100, 800, 700);
    // зубы
    for (let i = 0; i < 13; i++) {
      const x = -mw + 30 + i * ((mw * 2 - 60) / 12), yT = my - 50 * Math.cos((x / mw) * PI / 2) + 10;
      shadePath(ctx, spike(V(x - 2, yT - 10), V(x + 4, yT + 70 + (i % 3) * 20), 18, 0), { b: '#efe8d6', s: '#a69d88', w: 2, o: '#000' }, 30);
      const yB = my + 40 + jaw * 270 * Math.cos((x / mw) * PI / 2.2);
      shadePath(ctx, spike(V(x + 6, yB + 10), V(x + 2, yB - 60 - (i % 2) * 18), 15, 0), { b: '#e8e0cc', s: '#a59c88', w: 2, o: '#000' }, 30);
    }
    ctx.restore();
  }
  ctx.strokeStyle = '#060508'; ctx.lineWidth = 5; ctx.stroke(mouth);
  if (isNormal()) {
    // вены и трещины
    const v = new Path2D(); const RV = rng(4);
    for (let i = 0; i < 10; i++) { let x = (RV() - 0.5) * 700, y = -300 + RV() * 300; v.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (RV() - 0.5) * 70; y += (RV() - 0.5) * 70; v.lineTo(x, y); } }
    detailStroke(ctx, v, CPAL.glow, 5, 0.55);
    // глаза — разного размера, асимметрично
    const E = [[-190, -150, 70, -0.15], [170, -170, 62, 0.2], [0, -300, 48, 0], [-300, -10, 34, -0.4], [300, -30, 30, 0.4], [-80, -360, 26, 0.1]];
    E.forEach(([x, y, r, rot], i) => {
      const op = clamp(eyes * 1.6 - i * 0.12);
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.fillStyle = '#1a141e'; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.25, r * 0.85, 0, 0, TAU); ctx.fill();
      if (op > 0.02) {
        ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, r * 1.2, r * 0.8 * op, 0, 0, TAU); ctx.clip();
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.2);
        g.addColorStop(0, '#fff6b0'); g.addColorStop(0.5, CPAL.eye); g.addColorStop(1, '#b56a10');
        ctx.fillStyle = g; ctx.fillRect(-r * 1.3, -r, r * 2.6, r * 2);
        ctx.fillStyle = '#0a0404'; ctx.beginPath(); ctx.ellipse(Math.sin(t * 3 + i) * r * 0.15, 0, r * 0.14, r * 0.7, 0, 0, TAU); ctx.fill();
        ctx.restore();
        drawSprite(ctx, Sprites.soft(CPAL.eye, 64), 0, 0, r * 4.5, 0.35 * op);
      }
      ctx.strokeStyle = '#060508'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.25, r * 0.85, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    });
    // рога
    shadePath(ctx, spike(V(-320, -320), V(-520, -620), 50, 0.2), { b: CPAL.bone.b, s: CPAL.bone.s, w: 4, o: '#000' }, 80);
    shadePath(ctx, spike(V(320, -320), V(520, -620), 50, -0.2), { b: CPAL.bone.b, s: CPAL.bone.s, w: 4, o: '#000' }, 80);
  }
}
