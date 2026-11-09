'use strict';
/* Пост-обработка: цветокоррекция, свечение (bloom), виньетка, зерно плёнки, текст. */
const Post = {
  init() {
    this.small = makeCanvas(270, 480);
    this.sctx = this.small.getContext('2d');
    this.vig = makeCanvas(OW, OH);
    const v = this.vig.getContext('2d');
    v.save(); v.translate(OW / 2, OH / 2); v.scale(1, OH / OW);
    const g = v.createRadialGradient(0, 0, OW * 0.32, 0, 0, OW * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.85)');
    v.fillStyle = g; v.fillRect(-OW, -OW, OW * 2, OW * 2); v.restore();
    this.grain = [];
    for (let k = 0; k < 4; k++) {
      const c = makeCanvas(512, 512), g2 = c.getContext('2d');
      const id = g2.createImageData(512, 512), R = rng(100 + k);
      for (let i = 0; i < id.data.length; i += 4) { const n = 128 + (R() - 0.5) * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = n; id.data[i + 3] = 255; }
      g2.putImageData(id, 0, 0);
      this.grain.push(c);
    }
  },
  // g: {sat, con, bri, tint, tintA, shadow, shadowA, bloom, vig, grain, hue}
  apply(dst, src, g, t, quality = 1) {
    const sat = g.sat ?? 1, con = g.con ?? 1.05, bri = g.bri ?? 1;
    dst.save();
    dst.filter = `saturate(${sat}) contrast(${con}) brightness(${bri})` + (g.hue ? ` hue-rotate(${g.hue}deg)` : '');
    dst.drawImage(src, 0, 0);
    dst.filter = 'none';
    // тонирование: тени в холодный/тёплый, света — тинт
    if (g.shadow) { dst.globalCompositeOperation = 'multiply'; dst.globalAlpha = g.shadowA ?? 0.25; dst.fillStyle = g.shadow; dst.fillRect(0, 0, OW, OH); }
    if (g.tint) { dst.globalCompositeOperation = 'soft-light'; dst.globalAlpha = g.tintA ?? 0.3; dst.fillStyle = g.tint; dst.fillRect(0, 0, OW, OH); }
    dst.globalAlpha = 1; dst.globalCompositeOperation = 'source-over';
    // bloom
    const bl = g.bloom ?? 0.35;
    if (bl > 0 && quality > 0) {
      const s = this.sctx;
      s.globalCompositeOperation = 'copy';
      s.filter = 'brightness(0.75) contrast(2.4) blur(5px)';
      s.drawImage(dst.canvas, 0, 0, 270, 480);
      s.filter = 'none'; s.globalCompositeOperation = 'source-over';
      dst.globalCompositeOperation = 'screen'; dst.globalAlpha = bl;
      dst.drawImage(this.small, 0, 0, OW, OH);
      dst.globalCompositeOperation = 'source-over'; dst.globalAlpha = 1;
    }
    // виньетка
    const va = g.vig ?? 0.55;
    if (va > 0) { dst.globalAlpha = va; dst.drawImage(this.vig, 0, 0); dst.globalAlpha = 1; }
    // зерно
    const ga = g.grain ?? 0.07;
    if (ga > 0 && quality > 0) {
      const f = Math.floor(t * 24);
      const gc = this.grain[f % 4];
      dst.globalCompositeOperation = 'overlay'; dst.globalAlpha = ga;
      const ox = (f * 173) % 512, oy = (f * 311) % 512;
      for (let x = -ox; x < OW; x += 512) for (let y = -oy; y < OH; y += 512) dst.drawImage(gc, x, y);
      dst.globalCompositeOperation = 'source-over'; dst.globalAlpha = 1;
    }
    dst.restore();
  },
};

// ---------- текст ----------
function drawTitle(ctx, text, x, y, size, o = {}) {
  ctx.save();
  ctx.font = `700 ${size}px Oswald, 'Arial Narrow', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (o.spacing) ctx.letterSpacing = o.spacing + 'px';
  ctx.globalAlpha = o.alpha ?? 1;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowR || 30; }
  if (o.stroke) { ctx.lineWidth = o.stroke; ctx.strokeStyle = o.strokeColor || '#000'; ctx.strokeText(text, x, y); }
  ctx.fillStyle = o.color || '#ffffff';
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Субтитры: фраза с подсветкой текущего слова
const CAPS = VO.flatMap(v => v.phrases.map(([a, b, text]) => [v.at + a, v.at + b, text])).sort((x, y) => x[0] - y[0]);
function drawCaption(ctx, t) {
  for (let ci = 0; ci < CAPS.length; ci++) {
    {
      const [t0, t1, text] = CAPS[ci];
      const next = CAPS[ci + 1] ? CAPS[ci + 1][0] - 0.06 : 1e9;
      const end = Math.min(t1 + 0.35, next);
      if (t < t0 - 0.05 || t > end) continue;
      const appear = clamp((t - t0 + 0.05) / 0.12), vanish = 1 - clamp((t - (end - Math.min(0.35, end - t1 > 0.05 ? end - t1 : 0.1))) / Math.max(0.06, Math.min(0.35, end - t1)));
      const alpha = Math.min(appear, vanish);
      const words = text.split(' ');
      // время слова пропорционально длине
      const lens = words.map(w => w.replace(/[^А-Яа-яЁёA-Za-z0-9]/g, '').length + 1.5);
      const tot = lens.reduce((x, y) => x + y, 0);
      let acc = 0;
      const prog = (t - t0) / (t1 - t0);
      ctx.save();
      ctx.font = "800 50px Montserrat, 'Arial', sans-serif";
      ctx.textBaseline = 'middle';
      // перенос на две строки при необходимости
      const maxW = 900;
      const lines = [[]];
      let lw = 0;
      words.forEach((w, i) => {
        const ww = ctx.measureText(w + ' ').width;
        if (lw + ww > maxW && lines[lines.length - 1].length) { lines.push([]); lw = 0; }
        lines[lines.length - 1].push(i); lw += ww;
      });
      const lh = 64, baseY = OH * 0.735 - (lines.length - 1) * lh / 2;
      lines.forEach((ln, li) => {
        const full = ln.map(i => words[i]).join(' ');
        let x = OW / 2 - ctx.measureText(full).width / 2;
        const y = baseY + li * lh + (1 - appear) * 12;
        for (const i of ln) {
          const w = words[i];
          const ws = lens.slice(0, i).reduce((p, q) => p + q, 0) / tot;
          const active = prog >= ws - 0.02;
          ctx.globalAlpha = alpha * (active ? 1 : 0.55);
          ctx.lineWidth = 11; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineJoin = 'round';
          ctx.strokeText(w, x, y);
          const hot = /Тоджи|Фусигуро|проклят|сильнейш|хищника|медленно|быстрый|Сильный|бетон|бой|удар|Небесн|страшное/i.test(w);
          ctx.fillStyle = active && hot ? '#ffd166' : '#ffffff';
          ctx.fillText(w, x, y);
          x += ctx.measureText(w + ' ').width;
        }
      });
      ctx.restore();
    }
  }
}
