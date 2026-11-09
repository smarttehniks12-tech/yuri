'use strict';
/* Режиссёр: список планов, переходы, временной motion blur (усреднение субкадров),
   цветокоррекция и наложения. Любой кадр — чистая функция времени t. */
const SHOTS = [];
function shot(a, b, draw, o = {}) { SHOTS.push(Object.assign({ a, b, draw }, o)); }

// Камера для 2D-композиций: центр кадра смотрит в (cx, cy) с масштабом z
function cam2D(ctx, cx, cy, z, rot = 0, sh = null) {
  const s = sh || { x: 0, y: 0, r: 0 };
  ctx.translate(W / 2 + s.x, H / 2 + s.y);
  ctx.rotate(rot + s.r);
  ctx.scale(z, z);
  ctx.translate(-cx, -cy);
}
// заливка фона с запасом (вертикальное кадрирование видит за пределы 1920x1080)
const bg = (ctx, c) => { ctx.fillStyle = c; ctx.fillRect(-1500, -1500, W + 3000, H + 3000); };
// наложения рисуются в координатах выходного кадра OW x OH
const fadeBlack = (ctx, a) => { if (a > 0.001) { ctx.fillStyle = `rgba(0,0,0,${clamp(a)})`; ctx.fillRect(0, 0, OW, OH); } };
const flashWhite = (ctx, a, col = '255,255,255') => { if (a > 0.001) { ctx.fillStyle = `rgba(${col},${clamp(a)})`; ctx.fillRect(0, 0, OW, OH); } };
function letterbox(ctx, a, h = 160) {
  if (a <= 0) return;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, OW, h * a); ctx.fillRect(0, OH - h * a, OW, h * a);
}
// Вертикальное кадрирование: какая точка логической сцены попадает в центр и с каким масштабом
const FRAME_K = 1.6;
function frameOf(s, lt, t) {
  const f = typeof s.frame === 'function' ? s.frame(lt, t) : (s.frame || {});
  return { x: f.x ?? W / 2, y: f.y ?? H / 2, k: f.k ?? FRAME_K };
}

const Director = {
  init(canvas) {
    this.canvas = canvas;
    this.out = canvas.getContext('2d');
    this.scene = makeCanvas(OW, OH); this.sctx = this.scene.getContext('2d');
    this.tmp = makeCanvas(OW, OH); this.tctx = this.tmp.getContext('2d');
    this.tmp2 = makeCanvas(OW, OH); this.t2ctx = this.tmp2.getContext('2d');
    Post.init();
    SHOTS.sort((a, b) => a.a - b.a);
  },
  idx(t) {
    for (let i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].a) return i;
    return 0;
  },
  drawShot(ctx, s, t) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    RENDER.mode = 'normal';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, OW, OH);
    const f = frameOf(s, t - s.a, t);
    ctx.setTransform(f.k, 0, 0, f.k, OW / 2 - f.x * f.k, OH / 2 - f.y * f.k);
    try { s.draw(ctx, t - s.a, t, s); } catch (e) { console.error('shot', s.name, e); }
    ctx.restore();
    RENDER.mode = 'normal';
  },
  // кадр без пост-обработки (с наплывом между планами)
  composite(ctx, t) {
    const i = this.idx(t), s = SHOTS[i];
    const d = s.dissolve || 0;
    if (d > 0 && i > 0 && t - s.a < d) {
      this.drawShot(ctx, SHOTS[i - 1], t);
      this.drawShot(this.t2ctx, s, t);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = E.ioS(clamp((t - s.a) / d));
      ctx.drawImage(this.tmp2, 0, 0);
      ctx.restore();
    } else this.drawShot(ctx, s, t);
  },
  gradeAt(t) {
    const i = this.idx(t), s = SHOTS[i];
    const g = typeof s.grade === 'function' ? s.grade(t - s.a, t) : (s.grade || {});
    return g;
  },
  frame(t, opt = {}) {
    t = clamp(t, 0, DURATION - 1e-4);
    const i = this.idx(t), s = SHOTS[i], lt = t - s.a;
    let n = 1, shutter = 0.5;
    if (opt.motionBlur !== false && s.mb) {
      const m = s.mb(lt, t);
      if (typeof m === 'number') n = m; else if (m) { n = m.n; shutter = m.shutter ?? 0.5; }
      if (opt.maxSamples) n = Math.min(n, opt.maxSamples);
    }
    if (n <= 1) this.composite(this.sctx, t);
    else {
      const dt = shutter / FPS;
      for (let k = 0; k < n; k++) {
        const tk = Math.max(s.a, t - dt * (k / (n - 1)));
        const target = k === 0 ? this.sctx : this.tctx;
        this.composite(target, tk);
        if (k > 0) {
          this.sctx.save(); this.sctx.setTransform(1, 0, 0, 1, 0, 0);
          this.sctx.globalAlpha = 1 / (k + 1);
          this.sctx.drawImage(this.tmp, 0, 0);
          this.sctx.restore();
        }
      }
    }
    const o = this.out;
    o.setTransform(1, 0, 0, 1, 0, 0);
    Post.apply(o, this.scene, this.gradeAt(t), t, opt.quality ?? 1);
    if (s.post) { o.save(); s.post(o, lt, t, s); o.restore(); }
    if (opt.captions !== false) drawCaption(o, t);
  },
};
