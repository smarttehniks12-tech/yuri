/* kits/king.js — CURSED KING (Kazan): slashes, cleaving waves, fire spear, executions */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U, A = CA.A, FX = CA.FX;
  const TAU = U.TAU;
  const RED = '#ff2a3d', CRIM = '#c0001a', FIRE = '#ff7a1a';

  function invisibleCut(G, p, e, dmg) {
    const a = Math.random() * Math.PI;
    const L = e.r * 2.6 + 18;
    const dx = Math.cos(a) * L, dy = Math.sin(a) * L;
    FX.line(e.x - dx, e.y - dy, e.x + dx, e.y + dy, 2.2, RED, 0.18);
    G.later(0.05, () => {
      if (!e.alive) return;
      G.hitEnemy(e, dmg, { src: 'kg_slash', fx: p.x, fy: p.y, knock: 60 });
      FX.sparks(e.x, e.y, '#ff5a6a', 5, 260, a, 0.6);
    });
  }

  function fireExplosion(G, p, x, y, r, dmg) {
    FX.explosion(x, y, r, FIRE, { core: '#fff2c8', smoke: '#2a1008' });
    FX.embers(x, y, '#ffb04a', 10, r);
    A.hitCircle(x, y, r, dmg, { src: 'kg_spear', knock: 300, burn: [dmg * 0.08, 3] });
    CA.Audio.play('boom'); G.shake(10);
  }

  const K = {
    id: 'king',
    dmgMod(p) { return 1 + (p.state.hunger || 0) * 0.015; },
    spdMod(p) { return 1 + ((p.lv.kg_hunger || 1) >= 3 ? (p.state.hunger || 0) * 0.006 : 0); },
    basic: {
      id: 'kg_basic', name: 'Talon Rend', kanji: '爪', cd: 0.46,
      desc: 'Стремительные удары когтями проклятой энергии.',
      levels: ['Широкий взмах когтями по ближайшей цели.', 'Урон +30%.', 'Двойной взмах крест-накрест.', 'Дальность и ширина удара +25%.', 'Взмахи выпускают летящие клинки.'],
      fire(G, p, L) {
        const reach = (L >= 4 ? 120 : 98) * p.area;
        const t = A.nearest(p.x, p.y, L >= 5 ? 300 : reach + 30);
        if (!t) return false;
        const a = Math.atan2(t.y - p.y, t.x - p.x);
        p.atk = 1; p.aimA = a;
        const dmg = A.dmg(p, L >= 2 ? 17 : 13) * (1 + p.bonus.basicDmg);
        const arc = L >= 4 ? 2.3 : 1.9;
        const sw = (off, delay) => G.later(delay, () => {
          const cx = p.x + Math.cos(a) * reach * 0.5, cy = p.y - 14 + Math.sin(a) * reach * 0.5;
          FX.slash(cx, cy, a + Math.PI / 2 + off, reach * 1.3, 9, RED, 0.2, 0.4);
          A.hitCone(p.x, p.y, a, arc, reach, dmg, { knock: 90, src: 'kg_basic' });
          CA.Audio.play('slash', 0.5);
        });
        sw(0.4, 0);
        if (L >= 3) sw(-0.4, 0.1);
        if (L >= 5 && U.dist(p.x, p.y, t.x, t.y) > reach * 0.7) {
          A.proj({ x: p.x, y: p.y - 16, a, speed: 520, r: 14, life: 0.5, pierce: 3, dmg: dmg * 0.8, color: RED, trail: 0.4, opt: { src: 'kg_basic' },
            draw(ctx, pr) { ctx.translate(pr.x, pr.y); ctx.rotate(Math.atan2(pr.vy, pr.vx)); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,60,80,0.9)'; ctx.beginPath(); ctx.moveTo(-6, -16); ctx.quadraticCurveTo(14, 0, -6, 16); ctx.quadraticCurveTo(4, 0, -6, -16); ctx.fill(); } });
        }
      },
    },
    passive: {
      id: 'kg_hunger', name: "Tyrant's Hunger", kanji: '飢', passive: true,
      desc: 'Каждое убийство разжигает жажду разрушения.',
      levels: ['Убийства дают +1.5% урона (до 10 зарядов), заряды угасают без убийств.', 'Максимум 15 зарядов.', 'Заряды также дают скорость.', 'Максимум 22 заряда, угасание медленнее.', 'Максимум 30; каждое убийство лечит 0.6 HP.'],
      update(G, p, L, dt) {
        const st = p.state;
        st.hungerT = (st.hungerT || 0) - dt;
        if (st.hungerT <= 0 && st.hunger > 0) { st.hunger = Math.max(0, st.hunger - dt * 4); }
      },
    },
    skills: [
      {
        id: 'kg_slash', name: 'Invisible Slash', kanji: '断', cd: (L) => [4, 4, 3.6, 3.4, 3][L - 1],
        desc: 'Мгновенные невидимые разрезы по всем врагам вокруг.',
        levels: ['5 невидимых разрезов по случайным врагам в радиусе 260.', '7 разрезов.', 'Урон +25%, перезарядка короче.', '10 разрезов, радиус 320.', '15 разрезов, каждый может рассечь дважды.'],
        cast(G, p, L) {
          const n = [5, 7, 7, 10, 15][L - 1];
          const R = (L >= 4 ? 320 : 260) * p.area;
          const list = A.inRadius(p.x, p.y, R, []);
          if (!list.length) return false;
          U.shuffle(list);
          const dmg = A.dmg(p, [24, 26, 32, 36, 42][L - 1]);
          p.cast = 0.8;
          CA.Audio.play('slash');
          for (let i = 0; i < n; i++) {
            const e = list[i % list.length];
            G.later(i * 0.035, () => { if (e.alive) { invisibleCut(G, p, e, dmg); if (L >= 5 && Math.random() < 0.35) G.later(0.08, () => e.alive && invisibleCut(G, p, e, dmg)); } });
          }
        },
      },
      {
        id: 'kg_cleave', name: 'Cleaving Wave', kanji: '裂', cd: (L) => [8, 7.5, 7, 6.5, 6][L - 1],
        desc: 'Расходящаяся волна рассечений, кромсающая всё вокруг.',
        levels: ['Кольцо разрезов расходится до радиуса 190.', 'Радиус 220.', 'Урон +30%.', 'Радиус 250, враги отбрасываются.', 'Вторая волна следом.'],
        cast(G, p, L) {
          const R = [190, 220, 220, 250, 250][L - 1] * p.area;
          const dmg = A.dmg(p, [40, 46, 60, 66, 72][L - 1]);
          const wave = (delay) => G.later(delay, () => {
            const cx = p.x, cy = p.y;
            const hit = new Set();
            CA.Audio.play('slash'); CA.Audio.play('whoosh', 0.6);
            G.shake(6);
            FX.custom(0.4, (ctx, f, k) => {
              const rr = R * (1 - k * k);
              ctx.globalCompositeOperation = 'lighter';
              ctx.globalAlpha = k;
              ctx.strokeStyle = RED; ctx.lineWidth = 3;
              for (let i = 0; i < 28; i++) {
                const a = i / 28 * TAU + f.data;
                const x1 = cx + Math.cos(a) * rr, y1 = cy + Math.sin(a) * rr;
                const ta = a + Math.PI / 2 + Math.sin(i * 7) * 0.6;
                ctx.beginPath(); ctx.moveTo(x1 - Math.cos(ta) * 22, y1 - Math.sin(ta) * 22); ctx.lineTo(x1 + Math.cos(ta) * 22, y1 + Math.sin(ta) * 22); ctx.stroke();
              }
              ctx.globalAlpha = k * 0.4; ctx.lineWidth = 10;
              ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.stroke();
            }, false, Math.random() * TAU);
            let t = 0;
            A.zone({ x: cx, y: cy, r: R, life: 0.4, update(z, dt) {
              t += dt;
              const rr = R * Math.min(1, t / 0.4);
              const list = A.inRadius(cx, cy, rr, []);
              for (const e of list) {
                if (hit.has(e)) continue;
                hit.add(e);
                G.hitEnemy(e, dmg, { src: 'kg_cleave', knock: L >= 4 ? 260 : 80, fx: cx, fy: cy });
                FX.slash(e.x, e.y, Math.random() * TAU, e.r * 3, 5, RED, 0.18, 0.1);
                if (p.combos.kg_dismantle) invisibleCut(G, p, e, A.dmg(p, 30));
              }
            } });
          });
          wave(0);
          if (L >= 5) wave(0.35);
          p.cast = 1;
        },
      },
      {
        id: 'kg_spear', name: 'Infernal Spear', kanji: '炎', cd: (L) => [12, 11, 10, 10, 9][L - 1],
        desc: 'Огненное копьё, выпущенное из лука пламени, с гигантским взрывом.',
        levels: ['Огненная стрела с мощным взрывом (радиус 115) и горящей землёй.', 'Урон +25%.', 'Радиус взрыва 145.', 'Горящая земля сильнее и дольше.', 'Взрыв порождает кольцо из 6 малых взрывов.'],
        cast(G, p, L) {
          const t = A.densest(p.x, p.y, 480);
          const a = t ? Math.atan2(t.y - p.y, t.x - p.x) : p.dirA;
          const dist = t ? Math.min(480, U.dist(p.x, p.y, t.x, t.y)) : 300;
          const R = (L >= 3 ? 145 : 115) * p.area;
          const dmg = A.dmg(p, [90, 112, 120, 130, 150][L - 1]);
          p.cast = 1.2; p.aimA = a; p.atk = 1; p.lockMove = 0.25;
          // flame bow
          FX.custom(0.35, (ctx, f, k) => {
            const bx = p.x + Math.cos(a) * 16, by = p.y - 22 + Math.sin(a) * 16;
            ctx.translate(bx, by); ctx.rotate(a);
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = FIRE; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(-10, 0, 22, -1.1, 1.1); ctx.stroke();
            ctx.strokeStyle = '#ffd08a'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(-10 + Math.cos(-1.1) * 22, Math.sin(-1.1) * 22); ctx.lineTo(-20 + k * 10, 0); ctx.lineTo(-10 + Math.cos(1.1) * 22, Math.sin(1.1) * 22); ctx.stroke();
            ctx.drawImage(FX.getGlow(FIRE), -30, -30, 60, 60);
          });
          FX.embers(p.x, p.y - 20, FIRE, 10, 30);
          CA.Audio.play('fire');
          G.later(0.3, () => {
            A.proj({ x: p.x + Math.cos(a) * 20, y: p.y - 20, a, speed: 760, r: 10, life: dist / 760, noHit: true, color: FIRE, trail: 1,
              draw(ctx, pr) {
                ctx.translate(pr.x, pr.y); ctx.rotate(Math.atan2(pr.vy, pr.vx));
                ctx.globalCompositeOperation = 'lighter';
                ctx.drawImage(FX.getGlow(FIRE), -34, -16, 68, 32);
                ctx.fillStyle = '#fff2c8'; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-20, -4); ctx.lineTo(-20, 4); ctx.closePath(); ctx.fill();
              },
              onEnd(pr) {
                fireExplosion(G, p, pr.x, pr.y, R, dmg);
                const bd = A.dmg(p, L >= 4 ? 22 : 12);
                A.zone({ x: pr.x, y: pr.y, r: R * 0.8, life: L >= 4 ? 4.5 : 3, under: true, tick: 0,
                  update(z, dt) { A.every(z, dt, 0.3, () => A.hitCircle(z.x, z.y, z.r, bd * 0.3, { src: 'kg_spear', small: true, noCrit: true })); if (Math.random() < 0.6) FX.embers(z.x, z.y, FIRE, 1, z.r * 1.4); },
                  draw(ctx, z, k) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, k * 3) * 0.35; ctx.drawImage(FX.getSoft(FIRE), z.x - z.r, z.y - z.r * 0.8, z.r * 2, z.r * 1.6); },
                });
                if (L >= 5) for (let i = 0; i < 6; i++) { const aa = i / 6 * TAU; G.later(0.15 + i * 0.05, () => fireExplosion(G, p, pr.x + Math.cos(aa) * R, pr.y + Math.sin(aa) * R, R * 0.5, dmg * 0.4)); }
              } });
          });
        },
      },
      {
        id: 'kg_exec', name: 'Crimson Execution', kanji: '処', cd: (L) => [10, 9.5, 9, 8.5, 8][L - 1],
        desc: 'Серия молниеносных казней ближайших врагов.',
        levels: ['Король рывками казнит 3 ближайших врагов.', '4 цели.', 'Урон +30%.', '6 целей.', '8 целей, каждый удар — крестообразный разрез.'],
        cast(G, p, L) {
          const n = [3, 4, 4, 6, 8][L - 1];
          const list = A.inRadius(p.x, p.y, 320, []);
          if (!list.length) return false;
          list.sort((a, b) => (b.bossId ? 1e9 : 0) - (a.bossId ? 1e9 : 0) || U.dist2(p.x, p.y, a.x, a.y) - U.dist2(p.x, p.y, b.x, b.y));
          const dmg = A.dmg(p, [55, 60, 78, 82, 90][L - 1]);
          p.invuln = Math.max(p.invuln, n * 0.09 + 0.3);
          p.state.extraArms = true;
          CA.Audio.play('whoosh');
          for (let i = 0; i < n; i++) {
            G.later(i * 0.09, () => {
              const e = list[i % list.length];
              if (!e.alive) return;
              const ox = p.x, oy = p.y;
              const a = Math.random() * TAU;
              p.x = e.x + Math.cos(a) * (e.r + 14); p.y = e.y + Math.sin(a) * (e.r + 14);
              p.face = e.x < p.x ? -1 : 1; p.atk = 1; p.aimA = Math.atan2(e.y - p.y, e.x - p.x);
              FX.line(ox, oy - 16, p.x, p.y - 16, 3, CRIM, 0.2);
              FX.slash(e.x, e.y, Math.random() * TAU, e.r * 3.5 + 20, 10, RED, 0.25, 0.2);
              if (L >= 5) FX.slash(e.x, e.y, Math.random() * TAU, e.r * 3.5 + 20, 10, RED, 0.25, 0.2);
              G.hitEnemy(e, dmg * (L >= 5 ? 1.3 : 1), { src: 'kg_exec', knock: 200, critBonus: 0.25 });
              G.hitstop(0.03);
              CA.Audio.play('slash');
              if (p.combos.kg_hellfire) fireExplosion(G, p, e.x, e.y, 70 * p.area, A.dmg(p, 40));
            });
          }
          G.later(n * 0.09 + 0.1, () => { p.state.extraArms = false; });
        },
      },
    ],
    ult: {
      id: 'kg_ult', name: 'Ruin Altar', kanji: '祭', dur: (L) => [6, 6.5, 7, 7.5, 9][L - 1],
      desc: 'Алтарь руин: огромная область непрерывных разрушительных разрезов.',
      levels: ['Алтарь (радиус 270) 6 сек непрерывно рассекает всех врагов внутри.', 'Радиус 290, дольше.', 'Частота разрезов +40%.', 'Радиус 320, враги внутри замедлены.', 'Радиус 360, 9 сек; финальный разрез по всей области.'],
      cast(G, p, L) {
        const R = [270, 290, 290, 320, 360][L - 1] * p.area;
        const dur = this.dur(L);
        const dmg = A.dmg(p, [20, 22, 24, 28, 32][L - 1]);
        const rate = L >= 3 ? 0.06 : 0.085;
        p.state.extraArms = true;
        G.shake(16); G.flash('#ff0020', 0.5);
        const cx = p.x, cy = p.y;
        A.zone({
          x: cx, y: cy, r: R, life: dur, tick: 0, under: true, global: true,
          update(z, dt) {
            const list = A.inRadius(z.x, z.y, z.r, []);
            if (L >= 4) for (const e of list) { e.slowT = 0.2; e.slowAmt = Math.max(e.slowAmt, 0.4); }
            A.every(z, dt, rate, () => {
              for (let i = 0; i < 3 && list.length; i++) invisibleCut(G, p, list[(Math.random() * list.length) | 0], dmg);
              // ambient slash visuals across the altar
              const a = Math.random() * TAU, rr = Math.random() * z.r;
              FX.line(z.x + Math.cos(a) * rr - 40, z.y + Math.sin(a) * rr - 30, z.x + Math.cos(a) * rr + 40, z.y + Math.sin(a) * rr + 30, 1.5, RED, 0.15);
            });
            if (Math.random() < dt * 8) CA.Audio.play('slash', 0.35);
          },
          draw(ctx, z, k) {
            const t = z.t, fade = Math.min(1, z.life * 2, t * 3);
            ctx.globalAlpha = 0.45 * fade;
            ctx.fillStyle = '#1a0004';
            ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.fill();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.7 * fade;
            ctx.strokeStyle = RED; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, TAU); ctx.stroke();
            ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 0.92, t, t + TAU * 0.8); ctx.stroke();
            // seal glyphs
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
              const a = i / 8 * TAU - t * 0.4;
              const gx = z.x + Math.cos(a) * z.r * 0.96, gy = z.y + Math.sin(a) * z.r * 0.96;
              ctx.save(); ctx.translate(gx, gy); ctx.rotate(a);
              ctx.strokeRect(-6, -6, 12, 12); ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
              ctx.restore();
            }
            ctx.globalCompositeOperation = 'source-over';
            // altar shrine (skulls & horns)
            ctx.globalAlpha = fade;
            const sx = z.x, sy = z.y - 30;
            ctx.fillStyle = '#120408'; ctx.strokeStyle = '#3a0a12'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(sx - 46, sy + 30); ctx.lineTo(sx - 36, sy - 26); ctx.lineTo(sx, sy - 44); ctx.lineTo(sx + 36, sy - 26); ctx.lineTo(sx + 46, sy + 30); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#e8dcc8';
            for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(sx + i * 22, sy + 10 - Math.abs(i) * 6, 7, 0, TAU); ctx.fill(); }
            ctx.fillStyle = '#120408';
            for (let i = -1; i <= 1; i++) { ctx.fillRect(sx + i * 22 - 4, sy + 8 - Math.abs(i) * 6, 3, 3); ctx.fillRect(sx + i * 22 + 1, sy + 8 - Math.abs(i) * 6, 3, 3); }
            FX.glow(ctx, sx, sy - 20, 60, RED, 0.5 + Math.sin(t * 6) * 0.2);
            ctx.globalAlpha = 1;
          },
          onEnd(z) {
            p.state.extraArms = false;
            if (L >= 5) {
              G.flash('#ff0020', 0.5); G.shake(16); CA.Audio.play('bigboom');
              for (let i = 0; i < 6; i++) FX.line(z.x - z.r + Math.random() * 40, z.y - z.r + i * z.r / 3, z.x + z.r, z.y - z.r + i * z.r / 3 + 80, 5, RED, 0.4);
              A.hitCircle(z.x, z.y, z.r, A.dmg(p, 220), { src: 'kg_ult', big: true });
            }
          },
        });
      },
    },
    combos: [
      { id: 'kg_dismantle', name: 'Dismantle Storm', kanji: '解', a: 'kg_slash', al: 3, b: 'kg_cleave', bl: 3,
        desc: 'Каждый враг, задетый Cleaving Wave, дополнительно получает невидимый разрез.' },
      { id: 'kg_hellfire', name: 'Hellfire Execution', kanji: '獄', a: 'kg_spear', al: 3, b: 'kg_exec', bl: 3,
        desc: 'Каждый удар Crimson Execution вызывает огненный взрыв вокруг жертвы.' },
    ],
    init(G, p) {
      p.state.hunger = 0;
      p.hooks.kill.push(() => {
        const L = p.lv.kg_hunger || 1;
        const max = [10, 15, 15, 22, 30][L - 1];
        p.state.hunger = Math.min(max, (p.state.hunger || 0) + 1);
        p.state.hungerT = L >= 4 ? 4.5 : 3;
        if (L >= 5) p.heal(0.6);
      });
    },
    drawOver(ctx, G, p) {
      const h = p.state.hunger || 0;
      if (h > 3) FX.glow(ctx, p.x, p.y - 24, 18 + h * 0.8, RED, Math.min(0.5, h / 40));
    },
  };
  CA.Kits.king = K;
})();
