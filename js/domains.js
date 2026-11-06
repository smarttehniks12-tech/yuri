/* domains.js — Barrier Territories ("domain"-style ultimate arenas), one per sorcerer.
 * Rare: unlocked by a Legendary card at level 8+, charged by a separate slow gauge. */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U, A = CA.A, FX = CA.FX;
  const TAU = U.TAU;

  function inView(G) { const v = G.view; return A.inRadius((v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2, Math.hypot(v.x1 - v.x0, v.y1 - v.y0) / 2, []); }
  const DUR = [8, 9, 10, 11, 12];

  const DEFS = {
    spatial: {
      id: 'sp_domain', name: 'Endless Horizon', ru: 'Бесконечный Горизонт', kanji: '無限', color: '#4fb8ff', dur: (L) => DUR[L - 1],
      desc: 'Пространство становится бесконечным: враги почти замирают и не могут атаковать.',
      levels: ['Территория на 8 сек: враги замедлены на 90% и не атакуют, получают урон; перезарядки x3.', '9 сек, урон +25%.', '10 сек, «перегрузки» поражают больше врагов.', '11 сек, урон +30%.', '12 сек; финальный коллапс стирает слабых врагов.'],
      start(G, p, L, d) { d.cdRate = 3; },
      tick(G, p, L, dt, d) {
        G.enemySlowMul = 0.1; G.enemyNoAttack = true;
        const dps = A.dmg(p, [26, 32, 36, 46, 56][L - 1]);
        A.every(d, dt, 0.3, () => { for (const e of inView(G)) G.hitEnemy(e, dps * 0.3, { src: 'sp_domain', small: true, noCrit: true }); });
        d.burst = (d.burst || 0) - dt;
        if (d.burst <= 0) {
          d.burst = 0.8;
          const list = inView(G); U.shuffle(list);
          for (const e of list.slice(0, L >= 3 ? 10 : 6)) {
            G.hitEnemy(e, dps * 3, { src: 'sp_domain' });
            FX.ring(e.x, e.y, 4, 34, 0.3, '#e8f8ff', 2); FX.disc(e.x, e.y, 30, 0.2, '#ffffff', 0.7);
          }
        }
      },
      end(G, p, L) {
        if (L >= 5) for (const e of inView(G)) { if (!e.bossId && e.hp < e.maxHp * 0.35) G.hitEnemy(e, e.hp + 1, { src: 'sp_domain', noCrit: true }); else G.hitEnemy(e, A.dmg(p, 120), { src: 'sp_domain' }); }
      },
      drawBg(ctx, G, d, v) {
        const cx = G.player.x, cy = G.player.y, t = d.t;
        const gr = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(v.x1 - v.x0, v.y1 - v.y0));
        gr.addColorStop(0, '#0a1a3a'); gr.addColorStop(0.4, '#050a1c'); gr.addColorStop(1, '#000005');
        ctx.fillStyle = gr; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
        // warp streaks
        ctx.globalCompositeOperation = 'lighter';
        const rng = U.mulberry32(7);
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 90; i++) {
          const a = rng() * TAU, sp = 0.2 + rng() * 0.8;
          const r0 = ((rng() * 600 + t * 260 * sp) % 620) + 20;
          const len = 10 + r0 * 0.12;
          ctx.strokeStyle = 'rgba(' + (150 + rng() * 100) + ',' + (200 + rng() * 55) + ',255,' + Math.min(0.8, r0 / 400) + ')';
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len)); ctx.stroke();
        }
        // perspective grid
        ctx.strokeStyle = 'rgba(79,184,255,0.18)'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = -12; i <= 12; i++) { ctx.moveTo(cx, cy); ctx.lineTo(cx + i * 120, v.y1 + 50); ctx.moveTo(cx, cy); ctx.lineTo(cx + i * 120, v.y0 - 50); }
        for (let k = 1; k < 12; k++) { const rr = ((k * 60 + t * 80) % 720); ctx.moveTo(cx - rr * 2, cy + rr * 0.6); ctx.lineTo(cx + rr * 2, cy + rr * 0.6); ctx.moveTo(cx - rr * 2, cy - rr * 0.6); ctx.lineTo(cx + rr * 2, cy - rr * 0.6); }
        ctx.stroke();
        // wireframe polyhedra
        ctx.strokeStyle = 'rgba(200,236,255,0.5)';
        for (let i = 0; i < 5; i++) {
          const a = t * 0.2 + i * TAU / 5, rr = 210 + Math.sin(t + i) * 30;
          const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.8, s = 22 + i * 3;
          ctx.save(); ctx.translate(x, y); ctx.rotate(t * (0.5 + i * 0.1));
          ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0); ctx.closePath(); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.stroke();
          ctx.restore();
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    },
    king: {
      id: 'kg_domain', name: 'Crimson Ossuary', ru: 'Багровый Оссуарий', kanji: '骨殿', color: '#ff2a3d', dur: (L) => DUR[L - 1],
      desc: 'Арена становится красно-чёрным святилищем костей, где всё непрерывно рассекается.',
      levels: ['Территория на 8 сек: непрерывные разрезы по всем врагам в поле зрения.', '9 сек, частота разрезов +25%.', '10 сек, базовый урон по всем +30%.', '11 сек.', '12 сек; финальное рассечение всей арены.'],
      start(G, p, L, d) {},
      tick(G, p, L, dt, d) {
        G.enemySlowMul = 0.6;
        const cut = A.dmg(p, [30, 32, 36, 42, 50][L - 1]);
        A.every(d, dt, L >= 2 ? 0.04 : 0.05, () => {
          const list = inView(G);
          if (!list.length) return;
          const e = list[(Math.random() * list.length) | 0];
          const a = Math.random() * Math.PI, l = e.r * 2.5 + 20;
          FX.line(e.x - Math.cos(a) * l, e.y - Math.sin(a) * l, e.x + Math.cos(a) * l, e.y + Math.sin(a) * l, 2, '#ff2a3d', 0.15);
          G.hitEnemy(e, cut, { src: 'kg_domain', small: true });
        });
        d.base = (d.base || 0) - dt;
        if (d.base <= 0) { d.base = 0.5; for (const e of inView(G)) G.hitEnemy(e, A.dmg(p, L >= 3 ? 20 : 14), { src: 'kg_domain', small: true, noCrit: true }); }
        if (Math.random() < dt * 10) CA.Audio.play('slash', 0.3);
      },
      end(G, p, L) {
        if (L >= 5) { G.flash('#ff0020', 0.6); for (const e of inView(G)) G.hitEnemy(e, A.dmg(p, 260), { src: 'kg_domain', big: true }); G.shake(20); CA.Audio.play('bigboom'); }
      },
      drawBg(ctx, G, d, v) {
        const t = d.t;
        const gr = ctx.createLinearGradient(0, v.y0, 0, v.y1);
        gr.addColorStop(0, '#2a0006'); gr.addColorStop(0.5, '#120003'); gr.addColorStop(1, '#050001');
        ctx.fillStyle = gr; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
        const mx = (v.x0 + v.x1) / 2, my = v.y0 + (v.y1 - v.y0) * 0.18;
        FX.glow(ctx, mx, my, 220, '#ff1a2a', 0.45);
        ctx.fillStyle = '#c0101e'; ctx.beginPath(); ctx.arc(mx, my, 70, 0, TAU); ctx.fill();
        ctx.fillStyle = '#7a0010'; ctx.beginPath(); ctx.arc(mx + 18, my - 10, 60, 0, TAU); ctx.fill();
        // bone spires around the player
        const cx = G.player.x, cy = G.player.y;
        ctx.fillStyle = '#d8cbb4'; ctx.strokeStyle = '#2a0a0a'; ctx.lineWidth = 2;
        for (let i = 0; i < 16; i++) {
          const a = i / 16 * TAU, rr = 330 + (i % 3) * 40;
          const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.8;
          const h = 60 + (i % 4) * 22;
          ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.quadraticCurveTo(x - 4, y - h * 0.6, x + (i % 2 ? 8 : -8), y - h); ctx.quadraticCurveTo(x + 4, y - h * 0.5, x + 10, y); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        // blood floor cracks
        ctx.strokeStyle = 'rgba(255,40,60,0.25)'; ctx.lineWidth = 2;
        const rng = U.mulberry32(3);
        ctx.beginPath();
        for (let i = 0; i < 18; i++) { let x = cx + (rng() - 0.5) * 800, y = cy + (rng() - 0.5) * 1200; ctx.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rng() - 0.5) * 90; y += (rng() - 0.5) * 90; ctx.lineTo(x, y); } }
        ctx.stroke();
        // falling ash
        ctx.fillStyle = 'rgba(255,120,120,0.5)';
        for (let i = 0; i < 50; i++) { const x = v.x0 + ((i * 97 + t * 30) % (v.x1 - v.x0)), y = v.y0 + ((i * 53 + t * 60 * (1 + i % 3)) % (v.y1 - v.y0)); ctx.fillRect(x, y, 2, 2); }
      },
    },
    shadow: {
      id: 'sh_domain', name: 'Umbral Garden', ru: 'Сад Тьмы', kanji: '影庭', color: '#8f5bff', dur: (L) => DUR[L - 1],
      desc: 'Арена погружается во тьму, из земли тянутся руки теней и выходят звери.',
      levels: ['8 сек: тени хватают врагов, каждые 2 сек появляются волки, враги замедлены.', '9 сек, хватки сильнее.', '10 сек, по 3 волка.', '11 сек, урон +30%.', '12 сек; после территории остаётся армия воронов.'],
      start(G, p, L, d) {},
      tick(G, p, L, dt, d) {
        G.enemySlowMul = 0.5;
        const dmg = A.dmg(p, [26, 32, 34, 44, 50][L - 1]);
        A.every(d, dt, 0.18, () => {
          const list = inView(G);
          if (!list.length) return;
          const e = list[(Math.random() * list.length) | 0];
          G.hitEnemy(e, dmg, { src: 'sh_domain', stun: 0.6 });
          const x = e.x, y = e.y + e.r * 0.6;
          FX.custom(0.6, (ctx, f, k) => {
            const h = 50 * Math.sin((1 - k) * Math.PI);
            ctx.fillStyle = '#05010c'; ctx.strokeStyle = '#8f5bff'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.quadraticCurveTo(x - 10, y - h * 0.6, x - 4, y - h); ctx.lineTo(x + 2, y - h - 6); ctx.lineTo(x + 5, y - h + 2); ctx.quadraticCurveTo(x + 10, y - h * 0.5, x + 7, y); ctx.closePath(); ctx.fill(); ctx.stroke();
          });
        });
        d.wolfT = (d.wolfT || 0) - dt;
        if (d.wolfT <= 0) {
          d.wolfT = 2;
          if (A.countMinions('wolf') < 12) for (let i = 0; i < (L >= 3 ? 3 : 2); i++) CA.Kits.shadow.spawnWolf(G, p, p.x + U.rand(-120, 120), p.y + U.rand(-120, 120), 8);
        }
      },
      end(G, p, L) { if (L >= 5) for (let i = 0; i < 12; i++) CA.Kits.shadow.spawnCrow(G, p, p.x, p.y - 20, 10, A.dmg(p, 16)); },
      drawBg(ctx, G, d, v) {
        const t = d.t, cx = G.player.x, cy = G.player.y;
        ctx.fillStyle = '#04020a'; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 14; i++) {
          const a = i * 2.4 + t * 0.1, rr = 120 + (i * 53) % 400;
          FX.soft(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 140, '#3a1a7a', 0.35);
        }
        ctx.globalCompositeOperation = 'source-over';
        // shadow lilies
        for (let i = 0; i < 26; i++) {
          const a = i * 1.7, rr = 150 + (i * 37) % 420;
          const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
          ctx.strokeStyle = 'rgba(143,91,255,0.5)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.sin(t + i) * 8, y - 20, x, y - 34); ctx.stroke();
          ctx.fillStyle = 'rgba(30,10,60,0.9)';
          for (let k = 0; k < 5; k++) { const pa = k / 5 * TAU + t * 0.3; ctx.beginPath(); ctx.ellipse(x + Math.cos(pa) * 6, y - 34 + Math.sin(pa) * 4, 6, 3, pa, 0, TAU); ctx.fill(); }
          FX.glow(ctx, x, y - 34, 8, '#b58cff', 0.6);
        }
      },
    },
    blood: {
      id: 'bl_domain', name: 'Sanguine Sea', ru: 'Кровавое Море', kanji: '血海', color: '#ff1f44', dur: (L) => DUR[L - 1],
      desc: 'Пол становится морем крови: враги кровоточат и покрываются метками, маг восстанавливается.',
      levels: ['8 сек: метки и кровотечение у всех врагов, авто-детонация каждые 2 сек, регенерация 3%/сек, техники без затрат HP.', '9 сек.', '10 сек, детонации сильнее.', '11 сек, кровотечение +30%.', '12 сек; финальная детонация удваивает урон.'],
      start(G, p, L, d) { d.freeBlood = true; },
      tick(G, p, L, dt, d) {
        G.enemySlowMul = 0.6;
        p.heal(p.maxHp * 0.03 * dt);
        const bleed = A.dmg(p, [14, 16, 18, 24, 28][L - 1]);
        A.every(d, dt, 0.5, () => { for (const e of inView(G)) { CA.Kits.blood.mark(p, e, 1); G.hitEnemy(e, bleed * 0.5, { src: 'bl_domain', small: true, noCrit: true }); } });
        d.det = (d.det || 2) - dt;
        if (d.det <= 0) {
          d.det = 2;
          const per = A.dmg(p, L >= 3 ? 30 : 22);
          for (const e of inView(G)) if (e.marks >= 2) CA.Kits.blood.hemorrhage(G, p, e, per, 50);
          G.shake(6); CA.Audio.play('blood');
        }
      },
      end(G, p, L) { const per = A.dmg(p, L >= 5 ? 60 : 30); for (const e of inView(G)) CA.Kits.blood.hemorrhage(G, p, e, per, 60); G.shake(12); CA.Audio.play('bigboom'); },
      drawBg(ctx, G, d, v) {
        const t = d.t, cx = G.player.x, cy = G.player.y;
        const gr = ctx.createRadialGradient(cx, cy, 20, cx, cy, 700);
        gr.addColorStop(0, '#5a0012'); gr.addColorStop(1, '#14000a');
        ctx.fillStyle = gr; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
        ctx.strokeStyle = 'rgba(255,90,110,0.25)'; ctx.lineWidth = 2;
        for (let i = 0; i < 7; i++) {
          const rr = ((t * 70 + i * 100) % 700);
          ctx.globalAlpha = 1 - rr / 700;
          ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr * 0.55, 0, 0, TAU); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,60,90,0.45)'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 60; i++) { const x = v.x0 + ((i * 131) % (v.x1 - v.x0)), y = v.y0 + ((i * 71 + t * 500) % (v.y1 - v.y0)); ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 14); }
        ctx.stroke();
      },
    },
    lightning: {
      id: 'lg_domain', name: "Fortune's Tempest", ru: 'Буря Фортуны', kanji: '雷賭', color: '#ffe83a', dur: (L) => DUR[L - 1] + 1,
      desc: 'Небесные барабаны крутятся без остановки, каждый выигрыш — шквал молний. В конце гарантирован джекпот.',
      levels: ['9 сек: каждые 1.5 сек вращение небесных барабанов вызывает шторм молний. В конце — Лихорадка.', '10 сек, больше молний.', '11 сек, оглушение сильнее.', '12 сек, урон +30%.', '13 сек; финальный джекпот длится вдвое дольше.'],
      start(G, p, L, d) { d.reels = [0, 0, 0]; d.spinT = 0; d.res = null; },
      tick(G, p, L, dt, d) {
        G.enemySlowMul = 0.6;
        d.spinT -= dt;
        if (d.spinT <= 0) {
          d.spinT = 1.5;
          const r = Math.random();
          const res = r < 0.2 ? [0, 0, 0] : r < 0.55 ? [1, 1, U.randi(2, 4)] : [U.randi(0, 4), U.randi(0, 4), U.randi(0, 4)];
          d.res = res; d.resT = 0.6;
          const matches = res[0] === res[1] && res[1] === res[2] ? 3 : (res[0] === res[1] || res[1] === res[2] || res[0] === res[2]) ? 2 : 1;
          const n = [4, 10, 22][matches - 1] + L * 2;
          const dmg = A.dmg(p, [36, 42, 46, 60, 66][L - 1]);
          for (let i = 0; i < n; i++) G.later(0.6 + i * 0.03, () => {
            const list = inView(G);
            if (!list.length) return;
            const e = list[(Math.random() * list.length) | 0];
            CA.Kits.lightning.strike(G, p, e.x, e.y, 48, dmg);
          });
          G.later(0.6, () => { CA.Audio.play(matches === 3 ? 'jackpot' : 'zap'); G.flash('#fff8c8', 0.15 * matches); });
          CA.Audio.play('roll', 0.6);
        }
        if (d.resT > 0) d.resT -= dt;
      },
      end(G, p, L) {
        G.banner('JACKPOT!!!', 'Гарантированная лихорадка', '#ffe83a', 1.8);
        p.addBuff('fever', L >= 5 ? 16 : 8, { spd: 0.6, cdRate: 4, regen: 0.03, atkSpd: 0.8, dmg: 0.3, label: 'FEVER', color: '#ffe83a' });
        p.gainCe(50);
        CA.Audio.play('jackpot');
      },
      drawBg(ctx, G, d, v) {
        const t = d.t;
        const gr = ctx.createLinearGradient(0, v.y0, 0, v.y1);
        gr.addColorStop(0, '#12100a'); gr.addColorStop(1, '#040408');
        ctx.fillStyle = gr; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
        // storm clouds
        for (let i = 0; i < 12; i++) FX.soft(ctx, v.x0 + ((i * 113 + t * 20) % (v.x1 - v.x0 + 200)) - 100, v.y0 + 60 + (i % 3) * 50, 160, '#3a3420', 0.6);
        // casino floor tiles
        ctx.strokeStyle = 'rgba(255,232,58,0.12)'; ctx.lineWidth = 1;
        const s = 80, ox = Math.floor(v.x0 / s) * s, oy = Math.floor(v.y0 / s) * s;
        ctx.beginPath();
        for (let x = ox; x < v.x1; x += s) { ctx.moveTo(x, v.y0); ctx.lineTo(x, v.y1); }
        for (let y = oy; y < v.y1; y += s) { ctx.moveTo(v.x0, y); ctx.lineTo(v.x1, y); }
        ctx.stroke();
        if (Math.random() < 0.08) G.flash('#fff8c8', 0.06);
      },
      drawScreen(ctx, G, d, W, H, top) {
        const SY = ['7', '⚡', '🍒', '☠', '◆'];
        const y = top + 70, x = W / 2;
        ctx.fillStyle = 'rgba(20,16,4,0.8)'; ctx.strokeStyle = '#ffe83a'; ctx.lineWidth = 3;
        ctx.fillRect(x - 96, y - 30, 192, 60); ctx.strokeRect(x - 96, y - 30, 192, 60);
        ctx.font = '900 34px -apple-system, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let i = 0; i < 3; i++) {
          const spinning = d.spinT > 0.9 - i * 0.15 && d.resT <= 0;
          const sym = spinning || !d.res ? SY[Math.floor(d.t * 20 + i * 2) % 5] : SY[d.res[i]];
          ctx.fillStyle = spinning ? '#8a7a40' : (d.res && d.res[0] === 0 && d.res[1] === 0 && d.res[2] === 0 ? '#ff3a3a' : '#fff8c8');
          ctx.fillText(sym, x - 60 + i * 60, y + 2);
        }
      },
    },
    striker: {
      id: 'bs_domain', name: 'Zone of Absolute Flow', ru: 'Зона Абсолютного Потока', kanji: '黒閃域', color: '#ff2440', dur: (L) => DUR[L - 1],
      desc: 'Мир превращается в чёрно-белый набросок тушью. Каждый удар — Чёрная Искра.',
      levels: ['8 сек: все удары — Чёрные Искры, враги замедлены на 70%, скорость атак x2.', '9 сек.', '10 сек, Поток не угасает 15 сек после.', '11 сек, скорость атак x2.5.', '12 сек; территория завершается чёрным метеором.'],
      start(G, p, L, d) { p.state.allSpark = true; d.atkSpd = L >= 4 ? 2.5 : 2; },
      tick(G, p, L, dt, d) { G.enemySlowMul = 0.3; p.state.flow = [3, 4, 5, 6, 7][(p.lv.bs_spark || 1) - 1]; p.state.flowT = L >= 3 ? 15 : 8; },
      end(G, p, L) { p.state.allSpark = false; if (L >= 5) CA.Kits.striker.ult.cast(G, p, Math.max(1, p.lv.bs_ult || 1)); },
      drawBg(ctx, G, d, v) {
        const t = d.t, cx = G.player.x, cy = G.player.y;
        ctx.fillStyle = '#e8e2d6'; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
        // ink wash circles
        ctx.strokeStyle = 'rgba(10,6,8,0.75)';
        for (let i = 0; i < 4; i++) {
          ctx.lineWidth = 18 - i * 3;
          ctx.beginPath(); ctx.arc(cx, cy, 160 + i * 120 + Math.sin(t + i) * 6, i * 0.7 + t * 0.1, i * 0.7 + t * 0.1 + TAU * 0.85); ctx.stroke();
        }
        // red sun
        const sx = (v.x0 + v.x1) / 2, sy = v.y0 + (v.y1 - v.y0) * 0.16;
        ctx.fillStyle = '#d8102a'; ctx.beginPath(); ctx.arc(sx, sy, 60, 0, TAU); ctx.fill();
        // brush strokes
        ctx.fillStyle = 'rgba(10,6,8,0.6)';
        const rng = U.mulberry32(9);
        for (let i = 0; i < 16; i++) {
          const x = cx + (rng() - 0.5) * 900, y = cy + (rng() - 0.5) * 1300, w = 60 + rng() * 140;
          ctx.save(); ctx.translate(x, y); ctx.rotate(rng() * Math.PI);
          ctx.beginPath(); ctx.ellipse(0, 0, w, 3 + rng() * 5, 0, 0, TAU); ctx.fill(); ctx.restore();
        }
      },
    },
  };

  const D = {
    DEFS,
    activate(G, p, def, L) {
      const d = { def, L, t: 0, dur: def.dur(L), tick: 0, intro: 1.1 };
      G.domainIntro(def, p);
      CA.Store.data.stats.domainsUsed++;
      CA.Store.data.stats.domainChars[p.id] = 1;
      G.later(1.0, () => {
        G.domain = d;
        if (def.start) def.start(G, p, L, d);
        CA.FX.ring(p.x, p.y, 10, 900, 0.9, def.color, 14);
        G.shake(18);
      });
    },
    update(G, dt) {
      const d = G.domain;
      if (!d) return;
      d.t += dt;
      d.def.tick(G, G.player, d.L, dt, d);
      if (d.t >= d.dur) {
        if (d.def.end) d.def.end(G, G.player, d.L, d);
        G.domain = null;
        CA.FX.ring(G.player.x, G.player.y, 900, 10, 0.6, d.def.color, 10);
        G.flash(d.def.color, 0.3);
      }
    },
  };
  // attach domains to kits
  for (const id in DEFS) if (CA.Kits[id]) CA.Kits[id].domain = DEFS[id];
  CA.Domains = D;
})();
