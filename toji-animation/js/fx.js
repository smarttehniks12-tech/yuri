'use strict';
/* Эффекты: тряска камеры, линии скорости, ударные волны, пыль, обломки, частицы. */
const FX = {
  // затухающая тряска: возвращает смещение {x, y, r}
  shake(t, t0, amp, dur = 0.6, freq = 26) {
    const u = t - t0;
    if (u < 0 || u > dur) return { x: 0, y: 0, r: 0 };
    const k = Math.pow(1 - u / dur, 2) * amp;
    return { x: noise(u * freq, 1) * k, y: noise(u * freq, 2) * k, r: noise(u * freq * 0.7, 3) * k * 0.0012 };
  },
  addShake(...list) { return list.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y, r: a.r + b.r }), { x: 0, y: 0, r: 0 }); },

  // радиальные «манга»-линии скорости (меняются 12 раз в секунду)
  speedLines(ctx, cx, cy, t, amt, o = {}) {
    if (amt <= 0.01) return;
    const R = rng(Math.floor(t * (o.rate || 12)) + (o.seed || 0));
    const n = o.n || 90, inner = o.inner || 260, col = o.color || '#ffffff';
    ctx.save();
    ctx.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const a = R() * TAU, w = (0.004 + R() * 0.01) * amt, r0 = inner * (0.8 + R() * 0.8);
      const r1 = 1600;
      ctx.globalAlpha = (0.25 + R() * 0.6) * amt * (o.alpha ?? 1);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a - w) * r1, cy + Math.sin(a - w) * r1);
      ctx.lineTo(cx + Math.cos(a + w) * r1, cy + Math.sin(a + w) * r1);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },
  // горизонтальные полосы скорости
  streaks(ctx, t, amt, o = {}) {
    if (amt <= 0.01) return;
    const R = rng(Math.floor(t * 24) + (o.seed || 5));
    ctx.save();
    ctx.fillStyle = o.color || '#ffffff';
    const y0 = o.y0 ?? 0, y1 = o.y1 ?? H;
    for (let i = 0; i < (o.n || 40); i++) {
      const y = lerp(y0, y1, R()), x = R() * W * 1.4 - 200, len = 200 + R() * 900, th = 1 + R() * 4;
      ctx.globalAlpha = (0.15 + R() * 0.5) * amt;
      ctx.fillRect(x, y, len * (o.dir || 1), th);
    }
    ctx.restore();
  },
  // кольцо ударной волны (эллипс на земле или в воздухе)
  ring(ctx, x, y, r, alpha, squash = 0.3, width = 10, color = '#ffffff') {
    if (alpha <= 0.01 || r <= 1) return;
    ctx.save();
    ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * squash, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = alpha * 0.35; ctx.lineWidth = width * 3.5;
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.93, r * squash * 0.93, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  },
  // облако пыли из точки: клубы разлетаются и оседают
  dust(ctx, x, y, s, t, t0, o = {}) {
    const u = t - t0;
    if (u < 0) return;
    const n = o.n || 26, R = rng(o.seed || 1), life = o.life || 3;
    const col = o.color || '#c9b9a0';
    for (let i = 0; i < n; i++) {
      const a = o.dir !== undefined ? o.dir + (R() - 0.5) * (o.spread || 1.2) : (o.up ? -PI / 2 + (R() - 0.5) * 2.6 : (R() < 0.5 ? PI : 0) + (R() - 0.5) * 0.9);
      const sp = (o.speed || 900) * (0.3 + R() * 0.9);
      const drag = 2.2;
      const d = (sp / drag) * (1 - Math.exp(-drag * u));
      const px = x + Math.cos(a) * d * s, py = y + Math.sin(a) * d * s * (o.flat ?? 0.35) - (o.rise || 60) * u * s * R();
      const size = (o.size || 160) * (0.5 + R() * 0.8) * (1 + u * (o.grow || 0.8)) * s;
      const al = (o.alpha || 0.55) * clamp(1 - u / (life * (0.6 + R() * 0.4))) * clamp(u * 8);
      drawSprite(ctx, Sprites.puff(col, 1 + (i % 6)), px, py, size, al, R() * TAU);
    }
  },
  // обломки: прямоугольные/многоугольные куски с гравитацией и вращением
  debris(ctx, x, y, s, t, t0, o = {}) {
    const u = (t - t0) * (o.timeScale || 1);
    if (u < 0) return;
    const n = o.n || 30, R = rng(o.seed || 2), g = (o.g ?? 2600) * s;
    const ground = o.ground ?? Infinity;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const a = (o.dir ?? -PI / 2) + (R() - 0.5) * (o.spread ?? 2.4);
      const sp = (o.speed || 1400) * (0.35 + R() * 0.9) * s;
      let px = x + Math.cos(a) * sp * u, py = y + Math.sin(a) * sp * u + 0.5 * g * u * u;
      if (py > ground) py = ground;
      const sz = (o.size || 26) * (0.35 + R() * 1.2) * s;
      const rot = R() * TAU + u * (R() - 0.5) * 14;
      const k = 3 + Math.floor(R() * 3);
      ctx.save(); ctx.translate(px, py); ctx.rotate(rot);
      ctx.fillStyle = R() > 0.5 ? (o.color || '#8e877c') : darken(o.color || '#8e877c', 0.35);
      ctx.beginPath();
      for (let j = 0; j < k; j++) { const aa = (j / k) * TAU, rr = sz * (0.6 + R() * 0.5); ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#121014'; ctx.lineWidth = Math.max(1, 2 * s); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },
  // пылинки/искры, парящие в воздухе (в экранных координатах)
  motes(ctx, t, o = {}) {
    const R = rng(o.seed || 9), n = o.n || 60;
    ctx.save(); ctx.globalCompositeOperation = o.comp || 'lighter';
    const spr = Sprites.soft(o.color || '#ffe2b0', 16);
    const sp = o.speed ?? 1;
    for (let i = 0; i < n; i++) {
      const bx = R() * (W + 200) - 100, by = R() * (H + 200) - 100, ph = R() * 100, sz = (o.size || 6) * (0.4 + R());
      const x = (bx + Math.sin(t * 0.3 * sp + ph) * 40 + t * (o.vx || 8) * sp + W * 10) % (W + 200) - 100;
      const y = (by + Math.cos(t * 0.21 * sp + ph) * 30 + t * (o.vy || -10) * sp + H * 10) % (H + 200) - 100;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + ph);
      drawSprite(ctx, spr, x + (o.ox || 0), y + (o.oy || 0), sz * 4, (o.alpha || 0.6) * tw * (o.mask ? o.mask(x, y) : 1));
    }
    ctx.restore();
  },
  // кленовые листья
  leaves(ctx, t, o = {}) {
    const R = rng(o.seed || 31), n = o.n || 14;
    for (let i = 0; i < n; i++) {
      const sx = R() * (W + 400), ph = R() * 40, speed = (40 + R() * 60) * (o.speed || 1), sz = (o.size || 16) * (0.6 + R() * 0.8);
      const y = ((ph * 50 + t * speed) % (H + 200)) - 100;
      const x = sx - 200 + Math.sin(t * 1.3 + ph) * 60 + (o.wind || 0) * t * -60 % (W + 400);
      const xx = ((x % (W + 400)) + W + 400) % (W + 400) - 200;
      ctx.save(); ctx.translate(xx, y); ctx.rotate(t * 2 + ph); ctx.scale(1, Math.sin(t * 3 + ph));
      ctx.fillStyle = mix(o.color || '#c2412a', '#e08a2c', R());
      ctx.globalAlpha = o.alpha ?? 0.9;
      ctx.beginPath();
      for (let k = 0; k < 5; k++) { const a = -PI / 2 + (k - 2) * 0.6; ctx.lineTo(Math.cos(a) * sz, Math.sin(a) * sz); ctx.lineTo(Math.cos(a + 0.3) * sz * 0.45, Math.sin(a + 0.3) * sz * 0.45); }
      ctx.lineTo(0, sz * 0.6);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },
  // вспышка удара: белая звезда-разрыв
  burst(ctx, x, y, r, alpha, o = {}) {
    if (alpha <= 0.01) return;
    const R = rng(o.seed || 4);
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = o.color || '#ffffff';
    ctx.beginPath();
    const n = o.n || 14;
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * TAU + (o.rot || 0), rr = i % 2 ? r * (0.25 + R() * 0.15) : r * (0.7 + R() * 0.6);
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    drawSprite(ctx, Sprites.soft(o.glow || '#fff6dd', 128), x, y, r * 3, alpha * 0.8);
    ctx.restore();
  },
  // остаточное изображение (послеобраз) — полупрозрачная копия силуэта
  afterimage(ctx, fn, alpha, color = '#9ed8ff') {
    if (alpha <= 0.01) return;
    const prev = RENDER.mode, sf = SIL.fill, sr = SIL.rim;
    RENDER.mode = 'sil'; SIL.fill = color; SIL.rim = null;
    ctx.save(); ctx.globalAlpha = alpha; fn(); ctx.restore();
    RENDER.mode = prev; SIL.fill = sf; SIL.rim = sr;
  },
  // дрожащий воздух/искажение — несколько полупрозрачных концентрических дуг
  heatRing(ctx, x, y, r, a) {
    if (a <= 0) return;
    ctx.save(); ctx.strokeStyle = rgba('#ffffff', 0.25 * a); ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x, y, r * (1 + i * 0.12), 0, TAU); ctx.stroke(); }
    ctx.restore();
  },
};

// Мягкий объёмный свет (лучи) — аддитивные полосы
function godRays(ctx, x, y, ang, spread, len, color, alpha, n = 7, seed = 1) {
  const R = rng(seed);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const a = ang + (R() - 0.5) * spread, w = 0.03 + R() * 0.06;
    const g = ctx.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.addColorStop(0, rgba(color, alpha * (0.5 + R() * 0.5))); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a - w) * len, y + Math.sin(a - w) * len);
    ctx.lineTo(x + Math.cos(a + w) * len, y + Math.sin(a + w) * len);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
