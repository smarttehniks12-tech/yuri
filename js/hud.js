/* hud.js — in-game canvas HUD + touch controls rendering & layout (thumb-friendly, safe-area aware) */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U, FX = CA.FX;
  const TAU = U.TAU;
  const FONT = '-apple-system, "Helvetica Neue", Arial, sans-serif';
  const JP = '"Hiragino Mincho ProN", "Hiragino Sans", "Yu Mincho", "Noto Serif CJK JP", serif';

  const HUD = {
    L: {},
    layout(G) {
      const W = G.W, H = G.H, s = G.safe;
      const sc = U.clamp(Math.min(W / 430, H / 900), 0.78, 1.25);
      const bottom = H - s.b - 18 * sc;
      const right = W - s.r - 16 * sc;
      const L = this.L;
      L.sc = sc;
      L.atk = { id: 'attack', x: right - 44 * sc, y: bottom - 50 * sc, r: 44 * sc };
      const dist = 104 * sc, sr = 25 * sc;
      const angs = [Math.PI, Math.PI * 1.17, Math.PI * 1.33, Math.PI * 1.5];
      L.skills = angs.map((a, i) => ({ id: 's' + i, x: L.atk.x + Math.cos(a) * dist, y: L.atk.y + Math.sin(a) * dist, r: sr }));
      L.ult = { id: 'ult', x: L.atk.x - 8 * sc, y: L.atk.y - dist - 72 * sc, r: 33 * sc };
      L.domain = { id: 'domain', x: L.ult.x - 76 * sc, y: L.ult.y + 18 * sc, r: 25 * sc };
      L.pause = { id: 'pause', x: W - s.r - 26, y: s.t + 30, r: 18 };
      L.top = s.t;
      CA.Input.buttons = [L.atk].concat(L.skills).concat([L.ult, L.domain, L.pause]);
      CA.Input.joyZone = { x0: s.l, y0: H * 0.3, x1: Math.min(W * 0.6, L.domain.x - L.domain.r - 10), y1: H };
      CA.Input.joy.radius = 56 * sc;
      L.joyHome = { x: s.l + 90 * sc, y: bottom - 70 * sc };
    },

    btn(ctx, b, opts) {
      const down = CA.Input.down[b.id];
      const pt = CA.Input.pressT[b.id] || 0;
      const since = (performance.now() - pt) / 1000;
      const scale = down ? 0.9 : since < 0.15 ? 0.9 + since / 0.15 * 0.1 : 1;
      const r = b.r * scale;
      ctx.save();
      ctx.translate(b.x, b.y);
      // base
      const gr = ctx.createRadialGradient(0, -r * 0.3, r * 0.1, 0, 0, r);
      gr.addColorStop(0, opts.locked ? 'rgba(40,40,52,0.7)' : 'rgba(40,30,70,0.82)');
      gr.addColorStop(1, opts.locked ? 'rgba(10,10,16,0.7)' : 'rgba(8,6,18,0.86)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = opts.locked ? 'rgba(120,120,140,0.4)' : U.hexA(opts.color, opts.ready ? 0.95 : 0.45);
      ctx.stroke();
      if (opts.ready && !opts.locked) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.25 + Math.sin(performance.now() / 300) * 0.1;
        ctx.drawImage(FX.getSoft(opts.color), -r * 1.4, -r * 1.4, r * 2.8, r * 2.8);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      // icon
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '900 ' + Math.round(r * (opts.big ? 0.8 : 0.9)) + 'px ' + JP;
      ctx.fillStyle = opts.locked ? 'rgba(160,160,180,0.35)' : '#ffffff';
      ctx.fillText(opts.locked ? '封' : opts.kanji, 0, 1);
      // cooldown pie
      if (opts.cd > 0 && !opts.locked) {
        ctx.fillStyle = 'rgba(0,0,0,0.62)';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + TAU * opts.cdFrac); ctx.closePath(); ctx.fill();
        ctx.font = '800 ' + Math.round(r * 0.55) + 'px ' + FONT;
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        const txt = opts.cd >= 1 ? '' + Math.ceil(opts.cd) : opts.cd.toFixed(1);
        ctx.strokeText(txt, 0, 1); ctx.fillText(txt, 0, 1);
      }
      if (opts.level) {
        ctx.font = '800 ' + Math.round(r * 0.36) + 'px ' + FONT;
        ctx.fillStyle = U.hexA(opts.color, 1);
        ctx.fillText('' + opts.level, r * 0.62, r * 0.68);
      }
      // ripple
      if (since < 0.35) {
        ctx.globalAlpha = 1 - since / 0.35;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r + since * 60, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    },
    ring(ctx, b, frac, color, w) {
      ctx.lineWidth = w; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + w, 0, TAU); ctx.stroke();
      ctx.strokeStyle = color;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + w, -Math.PI / 2, -Math.PI / 2 + TAU * U.clamp(frac, 0, 1)); ctx.stroke();
    },
    bar(ctx, x, y, w, h, frac, c1, c2, back) {
      ctx.fillStyle = back || 'rgba(0,0,0,0.55)';
      this.rr(ctx, x, y, w, h, h / 2); ctx.fill();
      if (frac > 0) {
        const gr = ctx.createLinearGradient(x, y, x + w, y);
        gr.addColorStop(0, c1); gr.addColorStop(1, c2);
        ctx.fillStyle = gr;
        this.rr(ctx, x, y, Math.max(h, w * U.clamp(frac, 0, 1)), h, h / 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
      this.rr(ctx, x, y, w, h, h / 2); ctx.stroke();
    },
    rr(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
    },

    draw(ctx, G) {
      const p = G.player;
      if (!p) return;
      const L = this.L, W = G.W, sc = L.sc;
      const top = L.top + 6;
      const col = p.ch.color;
      ctx.textBaseline = 'middle';
      // XP bar
      this.bar(ctx, 10, top, W - 20, 6, p.xp / p.xpNext, '#7a3aff', '#d07aff');
      // portrait badge
      const bx = 34, by = top + 34;
      ctx.fillStyle = 'rgba(8,6,18,0.85)';
      ctx.beginPath(); ctx.arc(bx, by, 22, 0, TAU); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = '900 22px ' + JP; ctx.fillStyle = col; ctx.fillText(p.ch.kanji, bx, by);
      ctx.fillStyle = '#0a0812'; ctx.beginPath(); ctx.arc(bx + 16, by + 15, 10, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#d07aff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = '800 11px ' + FONT; ctx.fillStyle = '#fff'; ctx.fillText('' + p.level, bx + 16, by + 15.5);
      // HP
      const hx = 62, hw = Math.min(W * 0.46, 210);
      this.bar(ctx, hx, top + 16, hw, 13, p.hp / p.maxHp, p.hp < p.maxHp * 0.3 ? '#ff2a3a' : '#2ad870', p.hp < p.maxHp * 0.3 ? '#ff7a5a' : '#8affb0');
      ctx.textAlign = 'left'; ctx.font = '800 10px ' + FONT; ctx.fillStyle = '#fff';
      ctx.fillText(Math.ceil(p.hp) + ' / ' + p.maxHp, hx + 6, top + 23);
      if (p.shieldOrbs > 0) { ctx.fillStyle = '#ff5a7a'; ctx.fillText('◆'.repeat(Math.min(6, p.shieldOrbs)), hx + hw - 44, top + 23); }
      // CE bar
      const ceF = p.ce / p.ultCost();
      this.bar(ctx, hx, top + 33, hw, 8, Math.min(1, ceF), U.mixHex(col, '#000000', 0.2), '#ffffff');
      ctx.font = '800 9px ' + FONT; ctx.fillStyle = ceF >= 1 ? '#fff' : 'rgba(255,255,255,0.75)';
      ctx.fillText(ceF >= 1 ? 'ПРОКЛЯТАЯ ЭНЕРГИЯ — ГОТОВО!' : 'ПРОКЛЯТАЯ ЭНЕРГИЯ', hx + 4, top + 49);
      // buffs
      let bxp = hx;
      for (const b of p.buffs) {
        if (!b.label) continue;
        ctx.font = '800 9px ' + FONT;
        const tw = ctx.measureText(b.label).width + 10;
        ctx.fillStyle = U.hexA(b.color || '#ffffff', 0.25); this.rr(ctx, bxp, top + 56, tw, 14, 7); ctx.fill();
        ctx.fillStyle = b.color || '#fff'; ctx.fillText(b.label, bxp + 5, top + 63.5);
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(bxp + 4, top + 68, (tw - 8) * (b.t / b.max), 1.5);
        bxp += tw + 4;
      }
      if (p.kit.id === 'king' && p.state.hunger >= 1) { ctx.fillStyle = '#ff5a6a'; ctx.font = '800 10px ' + FONT; ctx.fillText('ГОЛОД x' + Math.floor(p.state.hunger), bxp + 2, top + 63.5); }
      if (p.kit.id === 'striker' && p.state.flow > 0) { ctx.fillStyle = '#ff5a6a'; ctx.font = '800 10px ' + FONT; ctx.fillText('ПОТОК x' + p.state.flow, bxp + 2, top + 63.5); }
      // timer & kills
      ctx.textAlign = 'center';
      ctx.font = '900 18px ' + FONT; ctx.fillStyle = '#fff';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      const tstr = U.fmtTime(G.t);
      const tx = Math.max(hx + hw + 40, W * 0.66);
      ctx.strokeText(tstr, tx, top + 22); ctx.fillText(tstr, tx, top + 22);
      ctx.font = '700 11px ' + FONT; ctx.fillStyle = '#d8c8ff';
      const ks = '☠ ' + U.fmtNum(G.run.kills);
      ctx.strokeText(ks, tx, top + 40); ctx.fillText(ks, tx, top + 40);
      // next threat
      const nt = G.t < 360 ? [360, 'Особый ранг'] : G.t < 720 ? [720, 'Босс локации'] : null;
      if (nt && nt[0] - G.t < 30) { ctx.fillStyle = '#ff7a7a'; ctx.font = '800 10px ' + FONT; ctx.fillText(nt[1] + ' через ' + Math.ceil(nt[0] - G.t), tx, top + 55); }
      // pause button
      const pb = L.pause;
      ctx.fillStyle = 'rgba(8,6,18,0.7)'; ctx.beginPath(); ctx.arc(pb.x, pb.y, pb.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(pb.x - 5, pb.y - 6, 3.5, 12); ctx.fillRect(pb.x + 1.5, pb.y - 6, 3.5, 12);
      // boss bar
      const boss = G.boss && G.boss.alive ? G.boss : null;
      if (boss) {
        const def = CA.Bosses.DEFS[boss.bossId];
        const y = top + 84;
        ctx.font = '900 12px ' + FONT; ctx.textAlign = 'center'; ctx.fillStyle = def.color;
        ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3;
        const nm = def.ru.toUpperCase() + (boss.phase === 2 ? ' · ФАЗА 2' : '');
        ctx.strokeText(nm, W / 2, y); ctx.fillText(nm, W / 2, y);
        this.bar(ctx, 24, y + 9, W - 48, 10, boss.hp / boss.maxHp, '#ff1a3a', def.color, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(W / 2 - 1, y + 9, 2, 10);
        if (boss.armor > 0) { ctx.font = '800 10px ' + FONT; ctx.fillStyle = '#ffd27a'; ctx.fillText('ЗАЩИЩЁН ПЕЧАТЯМИ', W / 2, y + 30); }
      }
      // banners
      for (const b of G.banners) this.drawBanner(ctx, G, b);

      // ---------- controls ----------
      const j = CA.Input.joy;
      if (j.active) {
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(j.ox, j.oy, j.radius, 0, TAU); ctx.fill(); ctx.stroke();
        const kx = j.ox + j.dx * j.mag * j.radius, ky = j.oy + j.dy * j.mag * j.radius;
        FX.glow(ctx, kx, ky, 40, col, 0.5);
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(kx, ky, 22 * sc, 0, TAU); ctx.fill();
      } else {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.arc(L.joyHome.x, L.joyHome.y, 50 * sc, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(L.joyHome.x, L.joyHome.y, 18 * sc, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
      const kit = p.kit;
      // attack
      this.btn(ctx, L.atk, { kanji: kit.basic.kanji, color: col, ready: true, big: true, level: p.lv[kit.basic.id] });
      if (kit.id === 'striker') {
        const st = p.state, w = kit.window(p);
        const inWin = st.ring >= 1 - w;
        const rr = L.atk.r + 4 + (1 - st.ring) * 34 * sc;
        ctx.strokeStyle = inWin ? '#ffffff' : 'rgba(255,36,64,0.7)'; ctx.lineWidth = inWin ? 4 : 2;
        ctx.beginPath(); ctx.arc(L.atk.x, L.atk.y, rr, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(L.atk.x, L.atk.y, L.atk.r + 4 + w * 34 * sc, 0, TAU); ctx.stroke();
        if (st.perfectFlash > 0) FX.glow(ctx, L.atk.x, L.atk.y, L.atk.r * 2, '#ffffff', st.perfectFlash * 2);
      }
      // skills
      for (let i = 0; i < 4; i++) {
        const s = kit.skills[i], b = L.skills[i];
        const lv = p.lv[s.id] || 0;
        const cd = Math.max(0, p.cds[s.id] || 0), mx = p.cdMax[s.id] || 1;
        this.btn(ctx, b, { kanji: s.kanji, color: col, locked: lv === 0, cd, cdFrac: cd / mx, ready: lv > 0 && cd <= 0, level: lv });
      }
      // ult
      const uReady = p.ce >= p.ultCost() && !(G.ultActive > 0);
      this.ring(ctx, L.ult, p.ce / p.ultCost(), uReady ? '#ffffff' : col, 4);
      this.btn(ctx, L.ult, { kanji: kit.ult.kanji, color: uReady ? '#ffffff' : col, ready: uReady, big: true, level: p.lv[kit.ult.id] });
      if (uReady) {
        ctx.font = '900 10px ' + FONT; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
        ctx.fillText('УЛЬТА', L.ult.x, L.ult.y + L.ult.r + 14);
      }
      // domain
      const dl = p.lv[kit.domain.id] || 0;
      L.domain.hidden = dl === 0;
      if (dl > 0) {
        const dReady = p.domainGauge >= 100 && !G.domain;
        this.ring(ctx, L.domain, p.domainGauge / 100, dReady ? '#ffd27a' : U.hexA('#ffd27a', 0.6), 3);
        this.btn(ctx, L.domain, { kanji: '域', color: '#ffd27a', ready: dReady, level: dl });
        ctx.font = '800 9px ' + FONT; ctx.textAlign = 'center'; ctx.fillStyle = dReady ? '#ffd27a' : 'rgba(255,210,122,0.6)';
        ctx.fillText(dReady ? 'ТЕРРИТОРИЯ' : Math.floor(p.domainGauge) + '%', L.domain.x, L.domain.y + L.domain.r + 12);
      }
      if (CA.Store.settings.showFps) {
        ctx.textAlign = 'left'; ctx.font = '700 11px ' + FONT; ctx.fillStyle = '#7aff9a';
        ctx.fillText(Math.round(G.fps) + ' FPS · ' + G.enemies.length + ' враг. · ' + FX.parts.length + ' част.', 10, G.H - G.safe.b - 8);
      }
    },
    drawBanner(ctx, G, b) {
      const W = G.W, k = b.t / b.dur;
      const a = k < 0.12 ? k / 0.12 : k > 0.8 ? (1 - k) / 0.2 : 1;
      const y = G.H * 0.27;
      const slide = (1 - Math.min(1, k * 6)) * 60;
      ctx.save();
      ctx.globalAlpha = a;
      const gr = ctx.createLinearGradient(0, 0, W, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.2, 'rgba(0,0,0,0.65)'); gr.addColorStop(0.8, 'rgba(0,0,0,0.65)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr;
      const h = b.title ? 62 : 34;
      ctx.fillRect(0, y - h / 2, W, h);
      ctx.fillStyle = b.color; ctx.fillRect(W * 0.15, y - h / 2, W * 0.7, 2); ctx.fillRect(W * 0.15, y + h / 2 - 2, W * 0.7, 2);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (b.title) {
        ctx.font = '900 italic ' + Math.round(Math.min(26, W * 0.062)) + 'px ' + FONT;
        ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(b.title, W / 2 + slide, y - 9);
        ctx.fillStyle = b.color; ctx.fillText(b.title, W / 2 + slide, y - 9);
        ctx.font = '700 13px ' + FONT; ctx.fillStyle = '#fff';
        ctx.fillText(b.sub || '', W / 2 - slide, y + 16);
      } else {
        ctx.font = '800 14px ' + FONT; ctx.fillStyle = b.color;
        ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(b.sub || '', W / 2, y); ctx.fillText(b.sub || '', W / 2, y);
      }
      ctx.restore();
    },
  };
  CA.HUD = HUD;
})();
