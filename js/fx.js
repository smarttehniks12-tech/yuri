/* fx.js — particles & visual effects with pooling. Additive glow via cached sprites (no shadowBlur). */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U;
  const TAU = U.TAU;

  const glowCache = {};
  function getGlow(color) {
    let c = glowCache[color];
    if (c) return c;
    const s = 64;
    c = U.makeCanvas(s, s);
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)');
    gr.addColorStop(0.18, U.hexA(color, 0.9));
    gr.addColorStop(0.45, U.hexA(color, 0.35));
    gr.addColorStop(1, U.hexA(color, 0));
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    glowCache[color] = c;
    return c;
  }
  const softCache = {};
  function getSoft(color) { // no white core — for auras / smoke
    let c = softCache[color];
    if (c) return c;
    const s = 64;
    c = U.makeCanvas(s, s);
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, U.hexA(color, 0.8));
    gr.addColorStop(0.5, U.hexA(color, 0.3));
    gr.addColorStop(1, U.hexA(color, 0));
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    softCache[color] = c;
    return c;
  }

  const FX = {
    parts: [], partFree: [], maxParts: 900,
    fx: [], fxFree: [],
    under: [],
    texts: [], maxTexts: 46,
    getGlow, getSoft,
    mult: 1, // particle density multiplier (quality)

    setQuality(q) {
      this.maxParts = q === 'low' ? 260 : q === 'medium' ? 520 : 900;
      this.mult = q === 'low' ? 0.45 : q === 'medium' ? 0.7 : 1;
    },
    clear() {
      for (const p of this.parts) this.partFree.push(p);
      this.parts.length = 0;
      for (const f of this.fx) this.fxFree.push(f);
      this.fx.length = 0;
      for (const f of this.under) this.fxFree.push(f);
      this.under.length = 0;
      this.texts.length = 0;
    },

    // ---------- particles ----------
    // type: 0 glow dot, 1 streak spark, 2 smoke (normal blend), 3 shard, 4 ember (glow with gravity up)
    p(x, y, vx, vy, life, size, color, type, drag, grav) {
      if (this.parts.length >= this.maxParts) return null;
      const o = this.partFree.pop() || {};
      o.x = x; o.y = y; o.vx = vx; o.vy = vy; o.life = life; o.max = life; o.size = size; o.color = color;
      o.type = type || 0; o.drag = drag == null ? 2.5 : drag; o.grav = grav || 0; o.rot = Math.random() * TAU; o.vr = (Math.random() - 0.5) * 10;
      this.parts.push(o);
      return o;
    },
    burst(x, y, color, n, speed, size, life, type) {
      n = Math.max(1, Math.round(n * this.mult));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, s = speed * (0.35 + Math.random() * 0.75);
        this.p(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.7), color, type == null ? 0 : type);
      }
    },
    sparks(x, y, color, n, speed, ang, spread) {
      n = Math.max(1, Math.round(n * this.mult));
      for (let i = 0; i < n; i++) {
        const a = ang == null ? Math.random() * TAU : ang + (Math.random() - 0.5) * (spread || 1);
        const s = speed * (0.4 + Math.random() * 0.8);
        this.p(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.25 + Math.random() * 0.25, 2 + Math.random() * 2, color, 1, 4);
      }
    },
    smoke(x, y, color, n, speed, size, life) {
      n = Math.max(1, Math.round(n * this.mult));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, s = speed * Math.random();
        this.p(x, y, Math.cos(a) * s, Math.sin(a) * s - 10, life * (0.7 + Math.random() * 0.5), size * (0.7 + Math.random() * 0.6), color, 2, 1.5);
      }
    },
    shards(x, y, color, n, speed) {
      n = Math.max(1, Math.round(n * this.mult));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, s = speed * (0.4 + Math.random() * 0.8);
        this.p(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.5 + Math.random() * 0.4, 3 + Math.random() * 4, color, 3, 3, 200);
      }
    },
    embers(x, y, color, n, spread) {
      n = Math.max(1, Math.round(n * this.mult));
      for (let i = 0; i < n; i++) {
        this.p(x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread, (Math.random() - 0.5) * 30, -20 - Math.random() * 50, 0.6 + Math.random() * 0.8, 2 + Math.random() * 3, color, 4, 1);
      }
    },
    // particles spiralling inward (for pulls/charges)
    implode(x, y, color, n, radius, life) {
      n = Math.max(1, Math.round(n * this.mult));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, r = radius * (0.6 + Math.random() * 0.5);
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        const L = life * (0.7 + Math.random() * 0.4);
        const t = a + Math.PI / 2;
        this.p(px, py, (x - px) / L + Math.cos(t) * 40, (y - py) / L + Math.sin(t) * 40, L, 2.5 + Math.random() * 2.5, color, 1, 0);
      }
    },

    // ---------- shaped effects ----------
    _fx(list) {
      const o = this.fxFree.pop() || {};
      o.draw = null; o.pts = null; o.str = null; o.under = false;
      list.push(o);
      return o;
    },
    ring(x, y, r0, r1, life, color, w, under) {
      const o = this._fx(under ? this.under : this.fx);
      o.k = 'ring'; o.x = x; o.y = y; o.r0 = r0; o.r1 = r1; o.life = o.max = life; o.color = color; o.w = w || 4;
      return o;
    },
    disc(x, y, r, life, color, alpha) { // filled additive flash disc
      const o = this._fx(this.fx);
      o.k = 'disc'; o.x = x; o.y = y; o.r0 = r; o.life = o.max = life; o.color = color; o.a = alpha == null ? 0.8 : alpha;
      return o;
    },
    slash(x, y, a, len, w, color, life, curve) {
      const o = this._fx(this.fx);
      o.k = 'slash'; o.x = x; o.y = y; o.a = a; o.len = len; o.w = w; o.color = color; o.life = o.max = life || 0.22; o.curve = curve == null ? 0.35 : curve;
      return o;
    },
    line(x1, y1, x2, y2, w, color, life) {
      const o = this._fx(this.fx);
      o.k = 'line'; o.x = x1; o.y = y1; o.x2 = x2; o.y2 = y2; o.w = w; o.color = color; o.life = o.max = life || 0.2;
      return o;
    },
    bolt(x1, y1, x2, y2, color, w, life, jag) {
      const o = this._fx(this.fx);
      o.k = 'bolt'; o.color = color; o.w = w || 3; o.life = o.max = life || 0.18;
      const pts = o.pts || [];
      pts.length = 0;
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
      const segs = Math.max(3, Math.min(14, Math.round(len / 22)));
      const nx = -dy / len, ny = dx / len;
      const J = (jag == null ? 0.22 : jag) * Math.min(len, 160);
      pts.push(x1, y1);
      for (let i = 1; i < segs; i++) {
        const t = i / segs, off = (Math.random() - 0.5) * J;
        pts.push(x1 + dx * t + nx * off, y1 + dy * t + ny * off);
      }
      pts.push(x2, y2);
      o.pts = pts;
      return o;
    },
    beam(x1, y1, x2, y2, w, color, life) {
      const o = this._fx(this.fx);
      o.k = 'beam'; o.x = x1; o.y = y1; o.x2 = x2; o.y2 = y2; o.w = w; o.color = color; o.life = o.max = life || 0.35;
      return o;
    },
    shock(x, y, r, color, life) { // ground shockwave ellipse
      const o = this._fx(this.under);
      o.k = 'shock'; o.x = x; o.y = y; o.r0 = r; o.color = color; o.life = o.max = life || 0.5;
      return o;
    },
    decal(x, y, r, color, life) {
      const o = this._fx(this.under);
      o.k = 'decal'; o.x = x; o.y = y; o.r0 = r; o.color = color; o.life = o.max = life || 4;
      return o;
    },
    custom(life, draw, under, data) { // draw(ctx, o, k) where k = remaining fraction
      const o = this._fx(under ? this.under : this.fx);
      o.k = 'custom'; o.life = o.max = life; o.draw = draw; o.data = data;
      return o;
    },
    text(x, y, str, color, size, crit) {
      if (!CA.Store.settings.dmgNumbers && !crit) return;
      if (this.texts.length >= this.maxTexts) this.texts.shift();
      this.texts.push({ x: x + (Math.random() - 0.5) * 10, y, str, color, size: size || 14, life: crit ? 0.9 : 0.6, max: crit ? 0.9 : 0.6, crit: !!crit });
    },
    label(x, y, str, color, size, life) { // always-shown status text
      if (this.texts.length >= this.maxTexts) this.texts.shift();
      this.texts.push({ x, y, str, color, size: size || 16, life: life || 1.2, max: life || 1.2, crit: true, label: true });
    },

    update(dt) {
      const P = this.parts;
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        p.life -= dt;
        if (p.life <= 0) { P[i] = P[P.length - 1]; P.pop(); this.partFree.push(p); continue; }
        const dr = Math.max(0, 1 - p.drag * dt);
        p.vx *= dr; p.vy = p.vy * dr + p.grav * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      }
      for (const L of [this.fx, this.under]) {
        for (let i = L.length - 1; i >= 0; i--) {
          const f = L[i];
          f.life -= dt;
          if (f.life <= 0) { L[i] = L[L.length - 1]; L.pop(); this.fxFree.push(f); }
        }
      }
      const T = this.texts;
      for (let i = T.length - 1; i >= 0; i--) {
        const t = T[i]; t.life -= dt; t.y -= (t.label ? 24 : 40) * dt;
        if (t.life <= 0) T.splice(i, 1);
      }
    },

    drawUnder(ctx, view) {
      for (const f of this.under) this.drawFx(ctx, f, view);
    },
    drawParticles(ctx, view) {
      const P = this.parts;
      // smoke first (normal blend)
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < P.length; i++) {
        const p = P[i];
        if (p.type !== 2 && p.type !== 3) continue;
        if (p.x < view.x0 || p.x > view.x1 || p.y < view.y0 || p.y > view.y1) continue;
        const k = p.life / p.max;
        if (p.type === 2) {
          ctx.globalAlpha = k * 0.55;
          const s = p.size * (2 - k);
          ctx.drawImage(getSoft(p.color), p.x - s, p.y - s, s * 2, s * 2);
        } else {
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.fillStyle = p.color;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.beginPath(); ctx.moveTo(-p.size, -p.size * 0.4); ctx.lineTo(p.size, 0); ctx.lineTo(-p.size * 0.6, p.size * 0.5); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < P.length; i++) {
        const p = P[i];
        if (p.type === 2 || p.type === 3) continue;
        if (p.x < view.x0 || p.x > view.x1 || p.y < view.y0 || p.y > view.y1) continue;
        const k = p.life / p.max;
        ctx.globalAlpha = Math.min(1, k * 1.6);
        if (p.type === 1) {
          ctx.strokeStyle = p.color; ctx.lineWidth = p.size * 0.6 * k + 0.5;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke();
        } else {
          const s = p.size * (p.type === 4 ? 1.6 : 2.2) * (0.5 + k * 0.5);
          ctx.drawImage(getGlow(p.color), p.x - s, p.y - s, s * 2, s * 2);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
    drawOver(ctx, view) {
      for (const f of this.fx) this.drawFx(ctx, f, view);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    },
    drawFx(ctx, f, view) {
      const k = f.life / f.max;
      switch (f.k) {
        case 'ring': {
          const t = 1 - k, rr = f.r0 + (f.r1 - f.r0) * U.easeOut(t);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = k;
          ctx.strokeStyle = f.color; ctx.lineWidth = f.w * (0.4 + k);
          ctx.beginPath(); ctx.arc(f.x, f.y, Math.max(0.1, rr), 0, TAU); ctx.stroke();
          ctx.globalAlpha = k * 0.35; ctx.lineWidth = f.w * 3 * k;
          ctx.beginPath(); ctx.arc(f.x, f.y, Math.max(0.1, rr), 0, TAU); ctx.stroke();
          break;
        }
        case 'disc': {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = f.a * k;
          const s = f.r0 * (1.4 - k * 0.4);
          ctx.drawImage(getGlow(f.color), f.x - s, f.y - s, s * 2, s * 2);
          break;
        }
        case 'slash': {
          ctx.save();
          ctx.translate(f.x, f.y); ctx.rotate(f.a);
          ctx.globalCompositeOperation = 'lighter';
          const L = f.len, w = f.w * (0.3 + 0.7 * k), c = f.curve * L;
          const grow = Math.min(1, (1 - k) * 4 + 0.25);
          const h = L / 2 * grow;
          ctx.globalAlpha = Math.min(1, k * 1.5);
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.moveTo(-h, 0);
          ctx.quadraticCurveTo(0, -c - w, h, 0);
          ctx.quadraticCurveTo(0, -c + w * 0.3, -h, 0);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = Math.min(1, k * 1.2);
          ctx.beginPath();
          ctx.moveTo(-h * 0.9, 0);
          ctx.quadraticCurveTo(0, -c - w * 0.45, h * 0.9, 0);
          ctx.quadraticCurveTo(0, -c - w * 0.05, -h * 0.9, 0);
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'line': {
          ctx.globalCompositeOperation = 'lighter';
          ctx.lineCap = 'round';
          ctx.globalAlpha = k * 0.5; ctx.strokeStyle = f.color; ctx.lineWidth = f.w * 3 * k + 1;
          ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
          ctx.globalAlpha = k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(0.6, f.w * k);
          ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
          break;
        }
        case 'bolt': {
          const p = f.pts;
          ctx.globalCompositeOperation = 'lighter';
          ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          ctx.globalAlpha = k * 0.55; ctx.strokeStyle = f.color; ctx.lineWidth = f.w * 3;
          ctx.beginPath(); ctx.moveTo(p[0], p[1]);
          for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
          ctx.stroke();
          ctx.globalAlpha = Math.min(1, k * 1.5); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, f.w * 0.8);
          ctx.stroke();
          break;
        }
        case 'beam': {
          ctx.globalCompositeOperation = 'lighter';
          ctx.lineCap = 'round';
          const w = f.w * (k < 0.3 ? k / 0.3 : 1);
          ctx.globalAlpha = 0.35 * k; ctx.strokeStyle = f.color; ctx.lineWidth = w * 2.4;
          ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
          ctx.globalAlpha = 0.8 * k; ctx.lineWidth = w;
          ctx.stroke();
          ctx.globalAlpha = k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = w * 0.35;
          ctx.stroke();
          break;
        }
        case 'shock': {
          const t = 1 - k, r = f.r0 * U.easeOut(t);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = k * 0.8; ctx.strokeStyle = f.color; ctx.lineWidth = 3 + 8 * k;
          ctx.beginPath(); ctx.ellipse(f.x, f.y, Math.max(0.1, r), Math.max(0.1, r * 0.82), 0, 0, TAU); ctx.stroke();
          break;
        }
        case 'decal': {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = Math.min(1, k * 2) * 0.55;
          ctx.drawImage(getSoft(f.color), f.x - f.r0, f.y - f.r0, f.r0 * 2, f.r0 * 2);
          break;
        }
        case 'custom':
          ctx.save(); f.draw(ctx, f, k); ctx.restore();
          break;
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    },
    drawTexts(ctx) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      for (const t of this.texts) {
        const k = t.life / t.max;
        const pop = t.crit ? 1 + Math.max(0, (k - 0.75)) * 3 : 1;
        const s = Math.round(t.size * pop);
        ctx.font = (t.crit ? '900 ' : '800 ') + s + 'px -apple-system, "Helvetica Neue", Arial, sans-serif';
        ctx.globalAlpha = Math.min(1, k * 2.5);
        ctx.lineWidth = t.crit ? 4 : 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.strokeText(t.str, t.x, t.y);
        ctx.fillStyle = t.color;
        ctx.fillText(t.str, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    },
    // immediate-mode glow helper
    glow(ctx, x, y, r, color, alpha) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.drawImage(getGlow(color), x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },
    soft(ctx, x, y, r, color, alpha) {
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.drawImage(getSoft(color), x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    },
  };
  CA.FX = FX;
})();
