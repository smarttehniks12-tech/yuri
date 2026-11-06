/* kits/spatial.js — SPATIAL SORCERER (Haru Amane): distance control, pull/push, void */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U, A = CA.A, FX = CA.FX;
  const TAU = U.TAU;
  const BLUE = '#4fb8ff', RED = '#ff3a4a', PURPLE = '#b06aff';

  function drawSingularity(ctx, z, k, big) {
    const t = z.t, r = z.r;
    const grow = Math.min(1, z.t * 5);
    const fade = Math.min(1, z.life * 3);
    const R = r * grow;
    // distortion rings
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < (big ? 5 : 3); i++) {
      const rr = R * (1 - ((t * 0.9 + i / (big ? 5 : 3)) % 1));
      ctx.globalAlpha = 0.25 * fade * (rr / R);
      ctx.strokeStyle = BLUE; ctx.lineWidth = 2 + (big ? 2 : 0);
      ctx.beginPath(); ctx.arc(z.x, z.y, Math.max(1, rr), 0, TAU); ctx.stroke();
    }
    // swirling arms
    ctx.globalAlpha = 0.6 * fade;
    ctx.strokeStyle = '#9ad8ff'; ctx.lineWidth = 2;
    for (let a = 0; a < 4; a++) {
      ctx.beginPath();
      for (let s = 0; s <= 16; s++) {
        const f = s / 16, ang = a * TAU / 4 + t * 4 + f * 3.2, rr = R * (1 - f) * 0.9;
        const px = z.x + Math.cos(ang) * rr, py = z.y + Math.sin(ang) * rr * 0.85;
        if (s) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = fade;
    ctx.drawImage(FX.getGlow(BLUE), z.x - R * 0.9, z.y - R * 0.9, R * 1.8, R * 1.8);
    ctx.globalCompositeOperation = 'source-over';
    // dark core
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillStyle = '#02040c';
    ctx.beginPath(); ctx.arc(z.x, z.y, 9 + (big ? 8 : 0) + Math.sin(t * 20) * 1.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c8f0ff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function blueZone(G, p, x, y, L, scale) {
    const r = [110, 140, 140, 165, 230][L - 1] * p.area * (scale || 1);
    const dur = [2.4, 2.5, 3.4, 3.5, 4.4][L - 1] * (scale || 1);
    const pull = [150, 160, 170, 240, 300][L - 1];
    const dps = A.dmg(p, [9, 11, 13, 20, 28][L - 1]);
    CA.Audio.play('pull');
    FX.ring(x, y, r, 10, 0.4, BLUE, 4);
    return A.zone({
      x, y, r, life: dur, under: false, tick: 0,
      update(z, dt) {
        if (Math.random() < 0.9) FX.implode(z.x, z.y, Math.random() < 0.5 ? BLUE : '#c8f0ff', 1, z.r, 0.5);
        const list = A.inRadius(z.x, z.y, z.r * 1.15, []);
        for (const e of list) {
          const dx = z.x - e.x, dy = z.y - e.y, d = Math.hypot(dx, dy) || 1;
          if (d < 6) continue;
          const resist = e.bossId ? 0.12 : 1 / Math.max(1, e.mass * 0.35);
          const f = Math.min(d, pull * (0.6 + 0.6 * (1 - d / z.r)) * dt * resist * 1.4);
          e.x += dx / d * f; e.y += dy / d * f;
        }
        A.every(z, dt, 0.25, () => { for (const e of list) G.hitEnemy(e, dps * 0.25, { noText: false, src: 'sp_blue', small: true }); });
        if (L >= 5 && Math.random() < dt * 3) G.shake(1.5);
      },
      draw(ctx, z, k) { drawSingularity(ctx, z, k, L >= 5); },
      onEnd(z) {
        if (p.combos.sp_polarity) redBlast(G, p, z.x, z.y, z.r * 0.9, A.dmg(p, 70 + L * 12), 520);
        else { FX.ring(z.x, z.y, 6, z.r * 0.6, 0.3, BLUE, 3); FX.burst(z.x, z.y, BLUE, 12, 200, 4, 0.4); }
      },
    });
  }

  function redBlast(G, p, x, y, r, dmg, knock, stun) {
    FX.explosion(x, y, r, RED, { core: '#ffd8d8', noDebris: true, smoke: '#2a0610' });
    CA.Audio.play('boom', 0.8);
    G.shake(7);
    A.hitCircle(x, y, r, dmg, { knock, src: 'sp_red', stun: stun || 0 });
  }

  const K = {
    id: 'spatial',
    basic: {
      id: 'sp_basic', name: 'Spatial Pulse', kanji: '弾', cd: 0.62,
      desc: 'Самонаводящиеся сгустки сжатого пространства.',
      levels: ['Выпускает самонаводящийся сгусток пространства.', 'Урон +30%.', 'Два сгустка за выстрел.', 'Сгустки пробивают 2 цели.', 'Три сгустка; попадание слегка притягивает врагов.'],
      fire(G, p, L) {
        const t = A.nearest(p.x, p.y, 420);
        if (!t) return false;
        const n = L >= 5 ? 3 : L >= 3 ? 2 : 1;
        const base = Math.atan2(t.y - p.y, t.x - p.x);
        p.atk = 1; p.aimA = base;
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.35;
          A.proj({
            x: p.x + Math.cos(a) * 14, y: p.y - 22, a, speed: 430, r: 6, life: 1.3, homing: 7, color: BLUE, core: '#e8f8ff',
            dmg: A.dmg(p, L >= 2 ? 12 : 9) * (1 + p.bonus.basicDmg), pierce: L >= 4 ? 2 : 0, trail: 0.6,
            onHit: L >= 5 ? (pr, e) => { if (!e.bossId) { const d = U.dist(p.x, p.y, e.x, e.y) || 1; e.kvx += (p.x - e.x) / d * 60; e.kvy += (p.y - e.y) / d * 60; } } : null,
          });
        }
        CA.Audio.play('shoot', 0.45);
      },
    },
    passive: {
      id: 'sp_barrier', name: 'Infinite Barrier', kanji: '無', passive: true,
      desc: 'Пространство вокруг мага бесконечно делится — враги замедляются тем сильнее, чем ближе подходят.',
      levels: ['Барьер замедляет и отталкивает приближающихся врагов, снаряды вязнут. Урон от касаний -28%.', 'Радиус барьера +15%.', 'Сильнее замедление; урон от касаний -44%.', 'Радиус +15%, снаряды почти останавливаются.', 'Касание барьера наносит урон; урон от касаний -60%.'],
      onLearn(G, p) { /* handled by update */ },
      update(G, p, L, dt) {
        const st = p.state;
        const absolute = st.absoluteT > 0;
        if (absolute) st.absoluteT -= dt;
        const R = (58 + (L >= 2 ? 10 : 0) + (L >= 4 ? 10 : 0)) * p.area * (absolute ? 1.9 : 1);
        st.barrierR = R;
        const list = A.inRadius(p.x, p.y, R, []);
        st.barrierHits = list.length;
        const slowMax = L >= 3 ? 0.9 : 0.75;
        for (const e of list) {
          if (e.bossId) continue;
          const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
          const k = 1 - d / (R + e.r);
          e.slowT = Math.max(e.slowT, 0.12); e.slowAmt = Math.max(e.slowAmt, Math.min(slowMax, 0.3 + k * 0.9));
          const push = (40 + k * 160) * dt / Math.max(1, e.mass * 0.5);
          e.x += dx / d * push; e.y += dy / d * push;
        }
        if (L >= 5 || absolute) {
          st.barrierTick = (st.barrierTick || 0) - dt;
          if (st.barrierTick <= 0) {
            st.barrierTick = 0.3;
            const dmg = A.dmg(p, absolute ? 14 : 6);
            for (const e of list) G.hitEnemy(e, dmg, { src: 'sp_barrier', small: true, noCrit: true });
          }
        }
        // slow enemy bullets inside barrier
        const B = G.eshots;
        for (const b of B) {
          const d2 = U.dist2(b.x, b.y, p.x, p.y);
          if (d2 < R * R * 1.4) {
            if (absolute && !b.boss) { b.life = 0; FX.sparks(b.x, b.y, BLUE, 3, 100); continue; }
            const d = Math.sqrt(d2);
            b.slowF = Math.min(b.slowF || 1, Math.max(L >= 4 ? 0.06 : 0.18, d / (R * 1.2)));
          }
        }
      },
      hurtHook: true,
    },
    skills: [
      {
        id: 'sp_blue', name: 'Blue Singularity', kanji: '引', cd: (L) => [7, 7, 6.5, 6.5, 6][L - 1],
        desc: 'Точка сжатого пространства, притягивающая всех врагов.',
        levels: ['Создаёт сингулярность, затягивающую врагов в точку.', 'Радиус притяжения увеличен.', 'Длительность увеличена.', 'Притяжение сильнее, урон выше.', 'Огромная область притяжения с искажением пространства.'],
        cast(G, p, L) {
          const t = A.densest(p.x, p.y, 340);
          let x, y;
          if (t) { x = t.x; y = t.y; } else { x = p.x + Math.cos(p.dirA) * 160; y = p.y + Math.sin(p.dirA) * 160; }
          A.chargeFx(p, BLUE, 0.2);
          blueZone(G, p, x, y, L);
        },
      },
      {
        id: 'sp_red', name: 'Red Impact', kanji: '斥', cd: (L) => [6, 6, 5.5, 5.5, 5][L - 1],
        desc: 'Направленный взрыв отталкивающей энергии.',
        levels: ['Выпускает красный заряд, взрывающийся с мощным отбрасыванием.', 'Урон и радиус взрыва +20%.', 'Пробивает и отбрасывает всех на пути.', 'Взрыв оглушает врагов на 0.8 сек.', 'Три заряда веером, огромный взрыв.'],
        cast(G, p, L) {
          const a0 = A.aim(p, 420);
          p.atk = 1; p.aimA = a0;
          const n = L >= 5 ? 3 : 1;
          const r = (L >= 2 ? 105 : 88) * p.area * (L >= 5 ? 1.25 : 1);
          const dmg = A.dmg(p, [42, 52, 62, 76, 96][L - 1]);
          CA.Audio.play('whoosh');
          for (let i = 0; i < n; i++) {
            const a = a0 + (i - (n - 1) / 2) * 0.45;
            A.proj({
              x: p.x + Math.cos(a) * 16, y: p.y - 20, a, speed: 560, r: 13, life: 0.38, color: RED, core: '#fff0f0', size: 34, trail: 1,
              dmg: dmg * 0.4, pierce: L >= 3 ? 99 : 0, opt: { knock: 380, src: 'sp_red' },
              onEnd: (pr) => {
                redBlast(G, p, pr.x, pr.y, r, dmg, 560, L >= 4 ? 0.8 : 0);
                if (p.combos.sp_polarity) blueZone(G, p, pr.x, pr.y, 1, 0.55);
              },
            });
          }
        },
      },
      {
        id: 'sp_void', name: 'Void Fusion', kanji: '虚', cd: (L) => [16, 15, 14, 13, 12][L - 1],
        desc: 'Слияние притяжения и отталкивания в сферу, стирающую всё на пути.',
        levels: ['Объединяет синюю и красную энергию в стирающую сферу, пробивающую всё.', 'Урон +30%.', 'Сфера больше и летит дальше.', 'Урон +35%, перезарядка короче.', 'Колоссальная сфера пустоты, оставляющая разлом.'],
        cast(G, p, L) {
          const a = A.aim(p, 600);
          const R = [34, 36, 44, 46, 66][L - 1] * p.area;
          const dmg = A.dmg(p, [130, 170, 190, 260, 360][L - 1]) * (1 + p.bonus.skillDmg);
          p.lockMove = 0.4; p.cast = 1.4; p.aimA = a;
          CA.Audio.play('beam', 0.7);
          // converging blue & red orbs
          FX.custom(0.45, (ctx, f, k) => {
            const t = 1 - k, off = 34 * (1 - t);
            const cx = p.x + Math.cos(a) * 18, cy = p.y - 24;
            const px = Math.cos(a + Math.PI / 2) * off, py = Math.sin(a + Math.PI / 2) * off;
            FX.glow(ctx, cx + px, cy + py, 18, BLUE, 1);
            FX.glow(ctx, cx - px, cy - py, 18, RED, 1);
            if (t > 0.7) FX.glow(ctx, cx, cy, 30 * t, PURPLE, t);
          });
          G.later(0.42, () => {
            G.shake(10); G.flash(PURPLE, 0.25); G.hitstop(0.05);
            CA.Audio.play('bigboom', 0.6);
            FX.ring(p.x, p.y - 20, 10, 90, 0.4, PURPLE, 6);
            A.proj({
              x: p.x + Math.cos(a) * 20, y: p.y - 20, a, speed: L >= 3 ? 400 : 340, r: R, life: L >= 3 ? 2.4 : 2.0, pierce: 999, trail: 0,
              dmg, opt: { src: 'sp_void', big: true, knock: 120 }, color: PURPLE,
              update(pr, dt) {
                if (Math.random() < 0.9) FX.p(pr.x + U.rand(-R, R) * 0.6, pr.y + U.rand(-R, R) * 0.6, -pr.vx * 0.3, -pr.vy * 0.3, 0.6, R * 0.25, PURPLE, 0, 2);
                if (L >= 5 && Math.random() < dt * 14) FX.decal(pr.x, pr.y, R * 1.2, '#2a0050', 3);
              },
              onHit: (pr, e) => { FX.sparks(e.x, e.y, '#e8c8ff', 6, 300); },
              draw(ctx, pr) {
                const t = pr.t;
                ctx.globalCompositeOperation = 'lighter';
                ctx.drawImage(FX.getGlow(PURPLE), pr.x - R * 2.2, pr.y - R * 2.2, R * 4.4, R * 4.4);
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = '#0a0014';
                ctx.beginPath(); ctx.arc(pr.x, pr.y, R * 0.92, 0, TAU); ctx.fill();
                ctx.strokeStyle = '#d8a8ff'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(pr.x, pr.y, R * 0.92, 0, TAU); ctx.stroke();
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = BLUE; ctx.lineWidth = 2.5;
                ctx.beginPath(); ctx.arc(pr.x, pr.y, R * 0.7, t * 9, t * 9 + 2.2); ctx.stroke();
                ctx.strokeStyle = RED;
                ctx.beginPath(); ctx.arc(pr.x, pr.y, R * 0.7, t * 9 + Math.PI, t * 9 + Math.PI + 2.2); ctx.stroke();
                ctx.drawImage(FX.getGlow('#ffffff'), pr.x - R * 0.35, pr.y - R * 0.35, R * 0.7, R * 0.7);
                ctx.globalCompositeOperation = 'source-over';
              },
              onEnd(pr) { FX.disc(pr.x, pr.y, R * 2, 0.4, PURPLE, 0.8); FX.burst(pr.x, pr.y, PURPLE, 20, 300, 6, 0.6); },
            });
          });
        },
      },
      {
        id: 'sp_blink', name: 'Blink Step', kanji: '跳', cd: (L) => [5, 5, 3.8, 3.8, 3.5][L - 1],
        desc: 'Мгновенное перемещение через сжатое пространство, оставляющее разлом.',
        levels: ['Телепортация на 170 единиц; на месте старта — разрыв, ранящий врагов.', 'Урон разрыва +40%.', 'Перезарядка короче на 25%.', 'Неуязвимость дольше, разрыв больше.', 'Разрыв становится малой сингулярностью.'],
        cast(G, p, L) {
          let a;
          if (p.moving) a = p.dirA;
          else { const e = A.nearest(p.x, p.y, 300); a = e ? Math.atan2(p.y - e.y, p.x - e.x) : p.dirA; }
          const ox = p.x, oy = p.y;
          const W = CA.Locations.WORLD;
          p.x = U.clamp(p.x + Math.cos(a) * 170, 20, W - 20); p.y = U.clamp(p.y + Math.sin(a) * 170, 20, W - 20);
          p.invuln = Math.max(p.invuln, L >= 4 ? 0.7 : 0.4);
          CA.Audio.play('whoosh');
          FX.line(ox, oy - 20, p.x, p.y - 20, 6, BLUE, 0.25);
          FX.burst(p.x, p.y - 20, BLUE, 14, 220, 4, 0.4);
          FX.ring(p.x, p.y - 10, 30, 6, 0.25, '#c8f0ff', 3);
          const rr = (L >= 4 ? 90 : 70) * p.area;
          if (L >= 5) blueZone(G, p, ox, oy, 2, 0.75);
          G.later(0.12, () => {
            A.hitCircle(ox, oy, rr, A.dmg(p, L >= 2 ? 42 : 30), { src: 'sp_blink' });
            FX.disc(ox, oy, rr, 0.3, BLUE, 0.7); FX.ring(ox, oy, 4, rr, 0.3, '#c8f0ff', 4);
          });
          if (p.combos.sp_absolute) { p.state.absoluteT = 3; FX.ring(p.x, p.y, 20, 140, 0.5, '#e8f8ff', 6); }
        },
      },
    ],
    ult: {
      id: 'sp_ult', name: 'Spatial Domain', kanji: '界', dur: (L) => [5, 5.5, 6, 7, 8][L - 1],
      desc: 'Сфера абсолютного пространства: враги внутри застывают и не могут атаковать.',
      levels: ['Сфера радиусом 240 на 5 сек: враги замирают, снаряды исчезают, получают урон.', 'Радиус и длительность больше.', 'Урон внутри +40%.', 'Длительность 7 сек, радиус 300.', 'Сфера 340, 8 сек, финальный коллапс наносит огромный урон.'],
      cast(G, p, L) {
        const R = [240, 260, 280, 300, 340][L - 1] * p.area;
        const dur = this.dur(L);
        const dps = A.dmg(p, [30, 34, 48, 54, 70][L - 1]);
        G.shake(14); G.flash('#c8f0ff', 0.5);
        FX.ring(p.x, p.y, 10, R, 0.6, '#e8f8ff', 10);
        A.zone({
          x: p.x, y: p.y, r: R, life: dur, follow: p, tick: 0, global: true,
          update(z, dt) {
            const list = A.inRadius(z.x, z.y, z.r, []);
            for (const e of list) { e.stunT = Math.max(e.stunT, e.bossId ? 0.05 : 0.2); e.slowT = 0.2; e.slowAmt = 0.95; }
            A.every(z, dt, 0.25, () => { for (const e of list) G.hitEnemy(e, dps * 0.25, { src: 'sp_ult', small: true }); });
            for (const b of G.eshots) if (U.dist2(b.x, b.y, z.x, z.y) < z.r * z.r) { b.life = 0; }
            if (Math.random() < 0.5) FX.p(z.x + U.rand(-z.r, z.r), z.y + U.rand(-z.r, z.r), 0, -20, 0.8, 3, '#c8f0ff', 0, 0.5);
          },
          draw(ctx, z, k) {
            const t = z.t, R2 = z.r * Math.min(1, t * 4);
            const fade = Math.min(1, z.life * 2);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.18 * fade;
            ctx.drawImage(FX.getSoft('#4fb8ff'), z.x - R2, z.y - R2, R2 * 2, R2 * 2);
            // geometric lattice
            ctx.globalAlpha = 0.35 * fade;
            ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = 1.2;
            ctx.save(); ctx.beginPath(); ctx.arc(z.x, z.y, R2, 0, TAU); ctx.clip();
            const step = 46, off = (t * 30) % step;
            ctx.beginPath();
            for (let gx = -R2 - step + off; gx < R2 + step; gx += step) { ctx.moveTo(z.x + gx, z.y - R2); ctx.lineTo(z.x + gx + R2 * 0.3, z.y + R2); }
            for (let gy = -R2 - step + off; gy < R2 + step; gy += step) { ctx.moveTo(z.x - R2, z.y + gy); ctx.lineTo(z.x + R2, z.y + gy - R2 * 0.2); }
            ctx.stroke();
            // rotating cubes
            for (let i = 0; i < 6; i++) {
              const a = t * 0.6 + i * TAU / 6, rr = R2 * 0.62;
              const cx = z.x + Math.cos(a) * rr, cy = z.y + Math.sin(a) * rr * 0.8;
              const s = 14 + Math.sin(t * 2 + i) * 4;
              ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * (i % 2 ? 1 : -1));
              ctx.strokeRect(-s / 2, -s / 2, s, s); ctx.strokeRect(-s / 2 + 5, -s / 2 - 5, s, s);
              ctx.restore();
            }
            ctx.restore();
            ctx.globalAlpha = 0.85 * fade; ctx.strokeStyle = '#e8f8ff'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(z.x, z.y, R2, 0, TAU); ctx.stroke();
            ctx.globalAlpha = 0.3 * fade; ctx.lineWidth = 12; ctx.strokeStyle = BLUE;
            ctx.beginPath(); ctx.arc(z.x, z.y, R2, 0, TAU); ctx.stroke();
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          },
          onEnd(z) {
            if (L >= 5) {
              A.hitCircle(z.x, z.y, z.r, A.dmg(p, 260), { src: 'sp_ult', big: true });
              FX.disc(z.x, z.y, z.r, 0.5, '#e8f8ff', 0.9); G.shake(14); CA.Audio.play('bigboom');
            }
            FX.ring(z.x, z.y, z.r, 10, 0.4, '#e8f8ff', 6);
          },
        });
      },
    },
    combos: [
      { id: 'sp_polarity', name: 'Polarity Collapse', kanji: '極', a: 'sp_blue', al: 3, b: 'sp_red', bl: 3,
        desc: 'Притяжение + отталкивание: сингулярности в конце взрываются красной энергией, а каждый Red Impact порождает малую сингулярность.' },
      { id: 'sp_absolute', name: 'Absolute Distance', kanji: '絶', a: 'sp_barrier', al: 3, b: 'sp_blink', bl: 3,
        desc: 'После Blink Step барьер на 3 сек расширяется почти вдвое, ранит врагов и уничтожает вражеские снаряды.' },
    ],
    init(G, p) {
      p.hooks.hurt.push((amt, src) => {
        const L = p.lv.sp_barrier || 1;
        if (src && !src.bossId) amt *= 1 - [0.28, 0.28, 0.44, 0.44, 0.6][L - 1];
        return amt;
      });
    },
    drawUnder(ctx, G, p) {
      const R = p.state.barrierR || 60;
      const k = Math.min(1, (p.state.barrierHits || 0) / 4);
      const abs = p.state.absoluteT > 0;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.12 + k * 0.3 + (abs ? 0.3 : 0);
      ctx.strokeStyle = abs ? '#e8f8ff' : BLUE; ctx.lineWidth = 1.5 + k * 2;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) { const a = i * TAU / 6 + p.t * 0.3; const px = p.x + Math.cos(a) * R, py = p.y - 12 + Math.sin(a) * R * 0.85; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.stroke();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    },
  };
  CA.Kits.spatial = K;
})();
