/* kits/shadow.js — SHADOW MASTER (Ren Kagehara): summons, shadow step, chimera fusion */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U, A = CA.A, FX = CA.FX;
  const TAU = U.TAU;
  const VIO = '#8f5bff', DEEP = '#2a0a5a', PALE = '#d8b8ff';

  function bondMul(p) { return 1 + [0.1, 0.2, 0.3, 0.4, 0.55][(p.lv.sh_bond || 1) - 1]; }
  function summonEnd(G, p, m) {
    FX.smoke(m.x, m.y, '#140828', 6, 40, 16, 0.8);
    if ((p.lv.sh_bond || 1) >= 5) {
      A.hitCircle(m.x, m.y, 80 * p.area, A.dmg(p, 40) * bondMul(p), { src: 'sh_bond' });
      FX.disc(m.x, m.y, 90, 0.35, VIO, 0.8); FX.ring(m.x, m.y, 5, 80, 0.3, PALE, 3);
    }
    if (m.kind === 'wolf' && p.combos.sh_army && !m.respawned && G.state === 'play') {
      G.later(0.6, () => { const w = spawnWolf(G, p, m.x, m.y, 6); w.respawned = true; });
    }
  }
  function emerge(x, y) {
    FX.custom(0.5, (ctx, f, k) => {
      ctx.globalAlpha = k * 0.8; ctx.fillStyle = '#0a0414';
      ctx.beginPath(); ctx.ellipse(x, y + 6, 26 * (1 - k * 0.3), 9, 0, 0, TAU); ctx.fill();
    }, true);
    FX.burst(x, y, VIO, 8, 120, 4, 0.5);
  }

  function spawnWolf(G, p, x, y, life) {
    const L = p.lv.sh_hounds || 1;
    emerge(x, y);
    return A.minion({
      kind: 'wolf', x, y, r: 12, life: life || [10, 12, 12, 14, 16][L - 1], spd: 250, cd: 0,
      dmg: A.dmg(p, [18, 22, 28, 32, 40][L - 1]),
      update(m, dt) {
        m.cd -= dt;
        if (!m.target || !m.target.alive || U.dist2(m.x, m.y, m.target.x, m.target.y) > 400 * 400) m.target = A.nearest(m.x, m.y, 360) || A.nearest(p.x, p.y, 360);
        let tx, ty;
        if (m.target) { tx = m.target.x; ty = m.target.y; }
        else { const a = m.t * 0.8 + m.max; tx = p.x + Math.cos(a) * 60; ty = p.y + Math.sin(a) * 60; }
        const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy) || 1;
        const sp = m.spd * (m.target ? 1 : Math.min(1, d / 80));
        if (d > (m.target ? m.target.r + m.r : 10)) { m.x += dx / d * sp * dt; m.y += dy / d * sp * dt; }
        m.face = dx < 0 ? -1 : 1;
        if (m.target && d < m.target.r + m.r + 10 && m.cd <= 0) {
          m.cd = 0.5;
          G.hitEnemy(m.target, m.dmg * bondMul(p), { src: 'sh_hounds', knock: 60, fx: m.x, fy: m.y });
          FX.slash(m.target.x, m.target.y, Math.random() * TAU, 22, 5, VIO, 0.15, 0.3);
          CA.Audio.play('hit', 0.4);
          m.lunge = 0.15;
        }
        if (m.lunge > 0) m.lunge -= dt;
      },
      draw(ctx, m) {
        const k = Math.min(1, m.t * 3, m.life * 2);
        ctx.globalAlpha = k;
        ctx.fillStyle = 'rgba(10,4,20,0.5)'; ctx.beginPath(); ctx.ellipse(m.x, m.y + 10, 14, 4, 0, 0, TAU); ctx.fill();
        FX.glow(ctx, m.x, m.y, 26, VIO, 0.35 * k);
        const s = CA.Sprites.summonSprite('wolf', Math.floor(m.t * 10) & 1, m.face < 0, 12);
        const sc = m.lunge > 0 ? 1.15 : 1;
        ctx.drawImage(s.c, m.x - s.half * sc, m.y - s.half * sc, s.size * sc, s.size * sc);
        ctx.globalAlpha = 1;
      },
      onEnd(m) { summonEnd(G, p, m); },
    });
  }

  function spawnCrow(G, p, x, y, life, dmg) {
    return A.minion({
      kind: 'crow', x, y, r: 8, life, spd: 380, cd: 0, dmg, vx: U.rand(-100, 100), vy: -150,
      update(m, dt) {
        m.cd -= dt;
        if (!m.target || !m.target.alive) m.target = A.nearest(m.x, m.y, 420) || null;
        let ax = 0, ay = 0;
        if (m.target) { const dx = m.target.x - m.x, dy = m.target.y - m.y, d = Math.hypot(dx, dy) || 1; ax = dx / d * 1400; ay = dy / d * 1400; }
        else { const dx = p.x - m.x, dy = p.y - 60 - m.y, d = Math.hypot(dx, dy) || 1; ax = dx / d * 600; ay = dy / d * 600; }
        m.vx += ax * dt; m.vy += ay * dt;
        const sp = Math.hypot(m.vx, m.vy);
        if (sp > m.spd) { m.vx *= m.spd / sp; m.vy *= m.spd / sp; }
        m.x += m.vx * dt; m.y += m.vy * dt;
        m.face = m.vx < 0 ? -1 : 1;
        if (m.target && m.cd <= 0 && U.dist2(m.x, m.y, m.target.x, m.target.y) < (m.target.r + 10) ** 2) {
          m.cd = 0.35;
          G.hitEnemy(m.target, m.dmg * bondMul(p), { src: 'sh_legion', fx: m.x, fy: m.y });
          FX.sparks(m.x, m.y, PALE, 3, 160);
          m.vx = -m.vx * 0.8 + U.rand(-120, 120); m.vy = -m.vy * 0.8 + U.rand(-120, 120);
        }
      },
      draw(ctx, m) {
        const k = Math.min(1, m.t * 4, m.life * 2);
        ctx.globalAlpha = k;
        FX.glow(ctx, m.x, m.y, 16, VIO, 0.4 * k);
        const s = CA.Sprites.summonSprite('crow', Math.floor(m.t * 14) & 1, m.face < 0, 9);
        ctx.drawImage(s.c, m.x - s.half, m.y - s.half, s.size, s.size);
        ctx.globalAlpha = 1;
      },
      onEnd(m) { FX.burst(m.x, m.y, VIO, 5, 80, 3, 0.4); },
    });
  }

  function spawnWyrm(G, p, life, L) {
    const segs = [];
    for (let i = 0; i < 16; i++) segs.push({ x: p.x, y: p.y });
    CA.Audio.play('summon');
    return A.minion({
      kind: 'wyrm', x: p.x, y: p.y, r: 18, life, segs, cd: 1, tick: 0, big: true,
      dmg: A.dmg(p, [14, 17, 20, 24, 30][L - 1]), breath: A.dmg(p, [28, 34, 42, 50, 62][L - 1]),
      update(m, dt) {
        const R = 105 * p.area + Math.sin(m.t * 1.3) * 20;
        const a = m.t * 1.9;
        m.x = p.x + Math.cos(a) * R; m.y = p.y - 10 + Math.sin(a) * R * 0.75;
        // segments follow
        let px = m.x, py = m.y;
        for (const s of m.segs) {
          const dx = px - s.x, dy = py - s.y, d = Math.hypot(dx, dy) || 1;
          if (d > 10) { s.x = px - dx / d * 10; s.y = py - dy / d * 10; }
          px = s.x; py = s.y;
        }
        m.tick -= dt;
        if (m.tick <= 0) {
          m.tick = 0.3;
          for (let i = 0; i < m.segs.length; i += 3) A.hitCircle(m.segs[i].x, m.segs[i].y, 20, m.dmg * bondMul(p) * 0.6, { src: 'sh_wyrm', small: true, knock: 120 });
        }
        m.cd -= dt;
        if (m.cd <= 0) {
          const t = A.nearest(m.x, m.y, 270);
          if (t) {
            m.cd = 1.15;
            const ba = Math.atan2(t.y - m.y, t.x - m.x);
            A.hitCone(m.x, m.y, ba, 0.8, 200 * p.area, m.breath * bondMul(p), { src: 'sh_wyrm', burn: [m.breath * 0.05, 2] });
            for (let i = 0; i < 18; i++) { const aa = ba + U.rand(-0.4, 0.4), sp = U.rand(200, 420); FX.p(m.x, m.y, Math.cos(aa) * sp, Math.sin(aa) * sp, 0.45, 7, i % 2 ? VIO : '#3a1a8a', 0, 2); }
            CA.Audio.play('fire', 0.5);
          } else m.cd = 0.3;
        }
      },
      draw(ctx, m) {
        const k = Math.min(1, m.t * 3, m.life * 2);
        ctx.globalAlpha = k;
        for (let i = m.segs.length - 1; i >= 0; i--) {
          const s = m.segs[i], sz = 13 - i * 0.55;
          ctx.fillStyle = '#0c0618'; ctx.strokeStyle = VIO; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(s.x, s.y - 20, sz, 0, TAU); ctx.fill(); ctx.stroke();
          if (i % 2 === 0) { ctx.fillStyle = '#3a1a7a'; ctx.beginPath(); ctx.moveTo(s.x - 3, s.y - 20 - sz); ctx.lineTo(s.x, s.y - 28 - sz); ctx.lineTo(s.x + 3, s.y - 20 - sz); ctx.fill(); }
        }
        // head
        const h = m.segs[0];
        const ha = Math.atan2(m.y - h.y, m.x - h.x);
        ctx.save(); ctx.translate(m.x, m.y - 20); ctx.rotate(ha);
        FX.glow(ctx, 0, 0, 40, VIO, 0.5);
        ctx.fillStyle = '#0c0618'; ctx.strokeStyle = PALE; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(4, -12); ctx.lineTo(-12, -10); ctx.lineTo(-14, 0); ctx.lineTo(-12, 10); ctx.lineTo(4, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-4, -10); ctx.lineTo(-20, -22); ctx.lineTo(-10, -8); ctx.moveTo(-4, 10); ctx.lineTo(-20, 22); ctx.lineTo(-10, 8); ctx.stroke();
        ctx.fillStyle = '#f0d8ff'; ctx.beginPath(); ctx.arc(6, -5, 2.4, 0, TAU); ctx.arc(6, 5, 2.4, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      },
      onEnd(m) { for (const s of m.segs) FX.smoke(s.x, s.y - 20, '#140828', 1, 30, 12, 0.7); summonEnd(G, p, m); },
    });
  }

  function spawnChimera(G, p, L, absorbed) {
    const size = 1 + Math.min(1, absorbed * 0.06);
    const dur = [8, 9, 10, 11, 12][L - 1];
    const dmg = A.dmg(p, [70, 85, 100, 120, 150][L - 1]) * (1 + absorbed * 0.08) * bondMul(p);
    return A.minion({
      kind: 'chimera', x: p.x, y: p.y - 10, r: 34 * size, life: dur, cd: 0.6, big: true, spd: 240, face: 1,
      update(m, dt) {
        if (!m.target || !m.target.alive || Math.random() < dt) m.target = A.densest(p.x, p.y, 520) || A.nearest(m.x, m.y, 600);
        if (m.target) {
          const dx = m.target.x - m.x, dy = m.target.y - m.y, d = Math.hypot(dx, dy) || 1;
          if (d > 30) { m.x += dx / d * m.spd * dt; m.y += dy / d * m.spd * dt; }
          m.face = dx < 0 ? -1 : 1;
        } else {
          const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1;
          if (d > 80) { m.x += dx / d * m.spd * dt; m.y += dy / d * m.spd * dt; }
        }
        m.cd -= dt;
        if (m.cd <= 0) {
          m.cd = 0.7; m.slam = 0.25;
          const R = 120 * size * p.area;
          A.hitCircle(m.x, m.y, R, dmg, { src: 'sh_ult', knock: 300 });
          FX.shock(m.x, m.y + 10, R * 1.2, VIO, 0.45); FX.disc(m.x, m.y, R, 0.25, VIO, 0.6);
          FX.shards(m.x, m.y, '#2a1a40', 8, 260);
          G.shake(6); CA.Audio.play('boom', 0.6);
        }
        if (m.slam > 0) m.slam -= dt;
        if (Math.random() < 0.6) FX.smoke(m.x + U.rand(-20, 20), m.y + 10, '#120624', 1, 30, 18, 0.8);
      },
      draw(ctx, m) {
        const k = Math.min(1, m.t * 2.5, m.life * 2);
        const s = 34 * size * (1 + (m.slam > 0 ? 0.08 : 0));
        ctx.globalAlpha = k;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(m.x, m.y + s * 0.9, s * 1.3, s * 0.35, 0, 0, TAU); ctx.fill();
        FX.glow(ctx, m.x, m.y - s * 0.3, s * 3, VIO, 0.45);
        ctx.save(); ctx.translate(m.x, m.y - s * 0.4); ctx.scale(m.face, 1);
        // wings
        ctx.fillStyle = '#0a0414'; ctx.strokeStyle = VIO; ctx.lineWidth = 2;
        const wf = Math.sin(m.t * 6) * 0.3;
        for (const sd of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.3);
          ctx.lineTo(-s * 1.2, -s * (1.3 + wf * sd)); ctx.lineTo(-s * 0.9, -s * 0.6); ctx.lineTo(-s * 1.5, -s * (0.7 + wf * sd)); ctx.lineTo(-s * 0.6, -s * 0.1);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        // body
        ctx.fillStyle = '#0c0618';
        ctx.beginPath(); ctx.ellipse(0, 0, s * 1.05, s * 0.7, 0, 0, TAU); ctx.fill(); ctx.stroke();
        // legs
        ctx.strokeStyle = '#0c0618'; ctx.lineWidth = s * 0.25; ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) { const lx = -s * 0.6 + i * s * 0.4; ctx.beginPath(); ctx.moveTo(lx, s * 0.3); ctx.lineTo(lx + Math.sin(m.t * 10 + i) * 6, s * 1.2); ctx.stroke(); }
        // wolf-dragon head
        ctx.fillStyle = '#0c0618'; ctx.strokeStyle = PALE; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(s * 0.7, -s * 0.5); ctx.lineTo(s * 1.7, -s * 0.2); ctx.lineTo(s * 1.75, s * 0.05); ctx.lineTo(s * 1.2, s * 0.15); ctx.lineTo(s * 0.7, s * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s * 0.9, -s * 0.45); ctx.lineTo(s * 0.8, -s * 1.0); ctx.lineTo(s * 1.15, -s * 0.5); ctx.stroke();
        for (let i = 0; i < 3; i++) { ctx.fillStyle = '#f0d8ff'; ctx.beginPath(); ctx.arc(s * (1.1 + i * 0.18), -s * 0.25 + (i % 2) * 4, 2.6, 0, TAU); ctx.fill(); }
        FX.glow(ctx, s * 1.3, -s * 0.2, s * 0.7, '#c8a0ff', 0.6);
        ctx.restore();
        ctx.globalAlpha = 1;
      },
      onEnd(m) {
        A.hitCircle(m.x, m.y, 180 * p.area, dmg * 1.5, { src: 'sh_ult', big: true });
        FX.disc(m.x, m.y, 200, 0.5, VIO, 0.9); FX.burst(m.x, m.y, VIO, 30, 340, 6, 0.8); G.shake(10); CA.Audio.play('bigboom', 0.6);
      },
    });
  }

  const K = {
    id: 'shadow',
    spawnWolf, spawnCrow,
    basic: {
      id: 'sh_basic', name: 'Shade Fang', kanji: '牙', cd: 0.62,
      desc: 'Теневые клыки, вылетающие из-под ног.',
      levels: ['Теневой клык летит в ближайшего врага.', 'Урон +30%.', 'Два клыка.', 'Клыки пробивают 1 цель и летят быстрее.', 'Убийство клыком призывает теневого ворона.'],
      fire(G, p, L) {
        const t = A.nearest(p.x, p.y, 400);
        if (!t) return false;
        const a0 = Math.atan2(t.y - p.y, t.x - p.x);
        p.atk = 1; p.aimA = a0;
        const n = L >= 3 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const a = a0 + (i - (n - 1) / 2) * 0.3;
          A.proj({ x: p.x, y: p.y - 18, a, speed: L >= 4 ? 520 : 420, r: 7, life: 1.2, homing: 5, color: VIO, core: PALE, pierce: L >= 4 ? 1 : 0, trail: 0.8,
            dmg: A.dmg(p, L >= 2 ? 13 : 10) * (1 + p.bonus.basicDmg), opt: { src: 'sh_basic' },
            onHit: L >= 5 ? (pr, e) => { if (!e.alive && A.countMinions('crow') < 14) spawnCrow(G, p, e.x, e.y, 5, A.dmg(p, 10)); } : null,
          });
        }
        CA.Audio.play('shoot', 0.4);
      },
    },
    passive: {
      id: 'sh_bond', name: 'Shadow Bond', kanji: '絆', passive: true,
      desc: 'Связь с тенями усиливает всех призванных существ.',
      levels: ['Призванные существа наносят +10% урона.', '+20% урона существ.', '+30% урона, лимит волков +1.', '+40% урона существ.', '+55% урона; исчезая, существа взрываются тенью.'],
    },
    skills: [
      {
        id: 'sh_hounds', name: 'Shadow Hounds', kanji: '狼', cd: (L) => [10, 10, 9, 9, 8][L - 1],
        desc: 'Призыв стаи теневых волков.',
        levels: ['Призывает 2 теневых волков на 10 сек.', 'Волки живут 12 сек, урон выше.', '3 волка.', '14 сек, урон +15%.', '4 волка на 16 сек.'],
        cast(G, p, L) {
          const n = [2, 2, 3, 3, 4][L - 1];
          let cap = 4 + ((p.lv.sh_bond || 1) >= 3 ? 1 : 0) + (L >= 5 ? 2 : 0);
          if (p.combos.sh_army) cap *= 2;
          const have = A.countMinions('wolf');
          // refresh existing when at cap
          for (const m of G.minions) if (m.kind === 'wolf') m.life = Math.max(m.life, 6);
          const k = Math.min(n, Math.max(1, cap - have));
          CA.Audio.play('summon');
          p.cast = 1;
          for (let i = 0; i < k; i++) { const a = i / k * TAU; spawnWolf(G, p, p.x + Math.cos(a) * 40, p.y + Math.sin(a) * 40); }
        },
      },
      {
        id: 'sh_wyrm', name: 'Abyss Wyrm', kanji: '竜', cd: (L) => [18, 17, 16, 15, 14][L - 1],
        desc: 'Теневой дракон, кружащий вокруг мага и выдыхающий пламя тьмы.',
        levels: ['Дракон кружит вокруг 8 сек, ранит телом и дышит тьмой.', 'Живёт 10 сек.', 'Урон +20%, дыхание поджигает.', '12 сек.', '14 сек, урон тела и дыхания +25%.'],
        cast(G, p, L) {
          p.cast = 1.2;
          FX.ring(p.x, p.y, 10, 120, 0.5, VIO, 5);
          spawnWyrm(G, p, [8, 10, 10, 12, 14][L - 1], L);
        },
      },
      {
        id: 'sh_step', name: 'Shade Step', kanji: '移', cd: (L) => [6, 6, 5, 5, 4.5][L - 1],
        desc: 'Телепортация через тени к скоплению врагов с извержением тьмы.',
        levels: ['Перемещение к скоплению врагов (до 320) с извержением тьмы.', 'Урон +30%.', 'Перезарядка короче.', 'Извержение и в точке отправления.', 'Огромное извержение, враги оглушены.'],
        cast(G, p, L) {
          const t = A.densest(p.x, p.y, 320);
          let tx, ty;
          if (t) { tx = t.x; ty = t.y; } else { tx = p.x + Math.cos(p.dirA) * 180; ty = p.y + Math.sin(p.dirA) * 180; }
          const ox = p.x, oy = p.y;
          const R = (L >= 5 ? 140 : 95) * p.area;
          const dmg = A.dmg(p, [34, 44, 46, 50, 64][L - 1]);
          const erupt = (x, y) => {
            A.hitCircle(x, y, R, dmg, { src: 'sh_step', knock: 260, stun: L >= 5 ? 1 : 0 });
            FX.disc(x, y, R * 1.1, 0.35, VIO, 0.8);
            FX.custom(0.5, (ctx, f, k) => {
              ctx.fillStyle = '#05020a'; ctx.globalAlpha = k;
              for (let i = 0; i < 9; i++) {
                const a = i / 9 * TAU + f.data, rr = R * (0.4 + (i % 3) * 0.2);
                const sx = x + Math.cos(a) * rr, sy = y + Math.sin(a) * rr * 0.7;
                const h = 40 * (1 - Math.abs(k - 0.5) * 2) + 10;
                ctx.beginPath(); ctx.moveTo(sx - 6, sy); ctx.lineTo(sx, sy - h); ctx.lineTo(sx + 6, sy); ctx.fill();
              }
            }, false, Math.random());
            FX.burst(x, y, VIO, 16, 260, 5, 0.5);
          };
          FX.smoke(ox, oy, '#100620', 6, 40, 16, 0.6);
          p.x = tx; p.y = ty; p.invuln = Math.max(p.invuln, 0.4);
          CA.Audio.play('whoosh'); G.shake(6);
          erupt(tx, ty);
          if (L >= 4) erupt(ox, oy);
          if (p.combos.sh_nightmare) spawnWyrm(G, p, 5, Math.max(1, p.lv.sh_wyrm || 1));
        },
      },
      {
        id: 'sh_legion', name: 'Legion Call', kanji: '群', cd: (L) => [20, 19, 18, 17, 16][L - 1],
        desc: 'Призыв множества теневых существ одновременно.',
        levels: ['Призывает стаю из 6 теневых воронов на 8 сек.', '9 воронов.', 'Вороны живут 11 сек.', '12 воронов + 1 волк.', '16 воронов + 2 волка.'],
        cast(G, p, L) {
          const n = [6, 9, 9, 12, 16][L - 1];
          const life = L >= 3 ? 11 : 8;
          const dmg = A.dmg(p, [11, 12, 14, 15, 17][L - 1]);
          CA.Audio.play('summon'); p.cast = 1.2;
          FX.ring(p.x, p.y, 10, 90, 0.5, VIO, 4);
          for (let i = 0; i < n; i++) G.later(i * 0.04, () => spawnCrow(G, p, p.x + U.rand(-20, 20), p.y - 20, life, dmg));
          const wolves = (L >= 5 ? 2 : L >= 4 ? 1 : 0) + (p.combos.sh_army ? 2 : 0);
          for (let i = 0; i < wolves; i++) spawnWolf(G, p, p.x + U.rand(-40, 40), p.y + U.rand(-40, 40));
        },
      },
    ],
    ult: {
      id: 'sh_ult', name: 'Eclipse Chimera', kanji: '蝕', dur: (L) => [8, 9, 10, 11, 12][L - 1],
      desc: 'Все призванные тени сливаются в чудовищную химеру.',
      levels: ['Сливает всех существ в химеру на 8 сек. Чем больше поглощено — тем она сильнее.', '9 сек, урон +20%.', '10 сек.', '11 сек, урон +20%.', '12 сек; после неё остаются 3 волка.'],
      cast(G, p, L) {
        let absorbed = 0;
        for (const m of G.minions) {
          if (m.kind === 'chimera') continue;
          absorbed++;
          const mx = m.x, my = m.y;
          FX.custom(0.5, (ctx, f, k) => { const t = 1 - k; FX.glow(ctx, U.lerp(mx, p.x, t), U.lerp(my, p.y - 20, t), 14, VIO, 1); });
          m.life = 0; m.onEnd = null;
        }
        G.shake(10);
        FX.implode(p.x, p.y, VIO, 30, 160, 0.5);
        G.later(0.5, () => {
          const c = spawnChimera(G, p, L, absorbed);
          FX.disc(c.x, c.y, 160, 0.5, VIO, 0.9); FX.ring(c.x, c.y, 10, 220, 0.5, PALE, 6);
          CA.Audio.play('summon'); CA.Audio.play('bigboom', 0.5);
          if (L >= 5) c.onEnd = ((orig) => function (m) { orig(m); for (let i = 0; i < 3; i++) spawnWolf(G, p, m.x, m.y, 10); })(c.onEnd);
        });
      },
    },
    combos: [
      { id: 'sh_army', name: 'Army of Shadows', kanji: '軍', a: 'sh_hounds', al: 3, b: 'sh_legion', bl: 3,
        desc: 'Лимит волков удвоен, Legion Call добавляет 2 волков, а павшие волки один раз возрождаются.' },
      { id: 'sh_nightmare', name: 'Nightmare Wyrm', kanji: '夢', a: 'sh_wyrm', al: 3, b: 'sh_step', bl: 3,
        desc: 'Каждый Shade Step призывает дополнительного Абиссального дракона на 5 сек.' },
    ],
    init(G, p) { spawnWolf(G, p, p.x + 40, p.y, 8); },
  };
  CA.Kits.shadow = K;
})();
