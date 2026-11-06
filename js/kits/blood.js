/* kits/blood.js — BLOOD CONTROLLER (Akane Chimura): blood marks, spears, detonations, HP-as-resource */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U, A = CA.A, FX = CA.FX;
  const TAU = U.TAU;
  const BLOOD = '#ff1f44', DARK = '#8a0018', PALE = '#ffc8d0';

  function maxMarks(p) { return [3, 4, 5, 6, 8][(p.lv.bl_mark || 1) - 1]; }
  function mark(p, e, n) {
    if (!e.alive) return;
    e.marks = Math.min(maxMarks(p), (e.marks || 0) + n);
    e.markT = 6;
  }
  function bloodCost(G, p, pct) {
    if (G.domain && G.domain.freeBlood) return;
    const c = p.hp * pct;
    if (p.hp - c > 1) { p.hp -= c; FX.burst(p.x, p.y - 20, BLOOD, 5, 80, 3, 0.4); }
  }
  function drawDrop(ctx, pr, size) {
    ctx.translate(pr.x, pr.y); ctx.rotate(Math.atan2(pr.vy, pr.vx));
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(FX.getGlow(BLOOD), -size * 1.6, -size * 1.6, size * 3.2, size * 3.2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#c00020';
    ctx.beginPath(); ctx.moveTo(size * 1.3, 0); ctx.quadraticCurveTo(0, -size * 0.7, -size, 0); ctx.quadraticCurveTo(0, size * 0.7, size * 1.3, 0); ctx.fill();
    ctx.fillStyle = PALE; ctx.beginPath(); ctx.arc(size * 0.3, -size * 0.15, size * 0.18, 0, TAU); ctx.fill();
  }
  function drawSpear(ctx, x, y, a, len) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(FX.getGlow(BLOOD), -len, -10, len * 2, 20);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#b00018'; ctx.strokeStyle = '#3a0008'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(len * 0.6, 0); ctx.lineTo(len * 0.25, -4); ctx.lineTo(-len * 0.6, -1.5); ctx.lineTo(-len * 0.6, 1.5); ctx.lineTo(len * 0.25, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PALE; ctx.fillRect(-len * 0.3, -0.6, len * 0.6, 1.2);
    ctx.restore();
  }
  function spear(G, p, x, y, target, dmg, delay) {
    const a0 = target ? Math.atan2(target.y - y, target.x - x) : Math.random() * TAU;
    return A.proj({ x, y, a: a0, speed: 620, r: 8, life: 1.1, homing: 9, dmg, pierce: 1, color: BLOOD, trail: 0.5, opt: { src: 'bl_spears', knock: 120 },
      update(pr) { if (target && target.alive) pr.target = target; },
      onHit(pr, e) { mark(p, e, 1); FX.sparks(e.x, e.y, BLOOD, 5, 200); },
      draw(ctx, pr) { drawSpear(ctx, pr.x, pr.y, Math.atan2(pr.vy, pr.vx), 30); },
    });
  }
  function hemorrhage(G, p, e, perMark, splashR) {
    const m = e.marks || 0;
    if (m <= 0) return;
    e.marks = 0;
    const dmg = perMark * m;
    G.hitEnemy(e, dmg, { src: 'bl_hemo', big: m >= 5 });
    A.hitCircle(e.x, e.y, splashR * (0.7 + m * 0.1), dmg * 0.35, { src: 'bl_hemo', small: true });
    FX.disc(e.x, e.y, splashR * (0.8 + m * 0.1), 0.3, BLOOD, 0.85);
    FX.burst(e.x, e.y, BLOOD, 8 + m * 2, 260, 5, 0.6);
    FX.decal(e.x, e.y, 26 + m * 4, '#5a0010', 5);
    if (p.combos.bl_cascade) {
      const t = A.nearest(e.x, e.y, 260, e);
      spear(G, p, e.x, e.y, t, A.dmg(p, 30));
    }
  }

  const K = {
    id: 'blood',
    mark, hemorrhage,
    dmgMod(p) {
      const L = p.lv.bl_mark || 1;
      return p.hp < p.maxHp * 0.5 ? 1 + [0.1, 0.15, 0.2, 0.25, 0.3][L - 1] : 1;
    },
    basic: {
      id: 'bl_basic', name: 'Blood Bullet', kanji: '滴', cd: 0.5,
      desc: 'Сжатые капли крови, летящие с огромной скоростью.',
      levels: ['Пробивающая капля крови, ставящая метку.', 'Урон +30%.', 'Две капли.', 'Пробивание +1.', 'Три капли, каждое попадание лечит.'],
      fire(G, p, L) {
        const t = A.nearest(p.x, p.y, 430);
        if (!t) return false;
        const a0 = Math.atan2(t.y - p.y, t.x - p.x);
        p.atk = 1; p.aimA = a0;
        const n = L >= 5 ? 3 : L >= 3 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const a = a0 + (i - (n - 1) / 2) * 0.16;
          A.proj({ x: p.x, y: p.y - 18, a, speed: 640, r: 5, life: 0.9, pierce: L >= 4 ? 2 : 1, color: BLOOD, trail: 0.4,
            dmg: A.dmg(p, L >= 2 ? 12 : 9) * (1 + p.bonus.basicDmg), opt: { src: 'bl_basic' },
            onHit: (pr, e) => { mark(p, e, 1); if (L >= 5) p.heal(0.25); },
            draw: (ctx, pr) => drawDrop(ctx, pr, 6) });
        }
        CA.Audio.play('blood', 0.35);
      },
    },
    passive: {
      id: 'bl_mark', name: 'Crimson Mark', kanji: '印', passive: true,
      desc: 'Кровь мага оставляет на врагах метки. При низком здоровье её сила растёт.',
      levels: ['Попадания ставят метки (макс. 3). Ниже 50% HP урон +10%. Убийство меченого лечит.', 'Макс. 4 метки, +15% урона.', 'Макс. 5 меток, +20%.', 'Макс. 6 меток, +25%.', 'Макс. 8 меток, +30%; лечение за метки удвоено.'],
    },
    skills: [
      {
        id: 'bl_beam', name: 'Piercing Flow', kanji: '穿', cd: (L) => [7, 7, 6.5, 6, 5.5][L - 1],
        desc: 'Сжатый под давлением поток крови, разрезающий линию врагов.',
        levels: ['Кровяной луч длиной 520, ставит 2 метки. Стоит 2% HP.', 'Урон +25%.', 'Луч шире.', 'Урон +30%.', 'Луч стреляет веером из трёх.'],
        cast(G, p, L) {
          const a0 = A.aim(p, 520);
          const w = (L >= 3 ? 26 : 16) * p.area;
          const dmg = A.dmg(p, [55, 68, 72, 92, 100][L - 1]);
          bloodCost(G, p, 0.02);
          p.cast = 1; p.aimA = a0; p.atk = 1; p.lockMove = 0.2;
          FX.implode(p.x, p.y - 20, BLOOD, 12, 50, 0.2);
          CA.Audio.play('beam', 0.7);
          G.later(0.18, () => {
            const n = L >= 5 ? 3 : 1;
            for (let i = 0; i < n; i++) {
              const a = a0 + (i - (n - 1) / 2) * 0.28;
              const x1 = p.x + Math.cos(a) * 14, y1 = p.y - 20, x2 = x1 + Math.cos(a) * 520, y2 = y1 + Math.sin(a) * 520;
              FX.beam(x1, y1, x2, y2, w, BLOOD, 0.35);
              FX.sparks(x2, y2, PALE, 10, 300);
              A.hitLine(x1, y1, x2, y2, w, dmg, { src: 'bl_beam', knock: 140 }, (e) => mark(p, e, 2));
            }
            G.shake(5);
          });
        },
      },
      {
        id: 'bl_spears', name: 'Blood Spears', kanji: '槍', cd: (L) => [9, 8.5, 8, 7.5, 7][L - 1],
        desc: 'Мага окружают копья крови, каждое из которых само находит цель.',
        levels: ['3 кровавых копья кружат и разлетаются по разным целям. Стоит 2% HP.', '4 копья.', '5 копий, урон +20%.', '6 копий.', '8 копий.'],
        cast(G, p, L) {
          const n = [3, 4, 5, 6, 8][L - 1];
          const dmg = A.dmg(p, [32, 36, 44, 48, 52][L - 1]);
          const list = A.inRadius(p.x, p.y, 480, []);
          if (!list.length) return false;
          bloodCost(G, p, 0.02);
          list.sort((a, b) => U.dist2(p.x, p.y, a.x, a.y) - U.dist2(p.x, p.y, b.x, b.y));
          p.cast = 1.2;
          CA.Audio.play('blood');
          const t0 = G.t;
          // orbit phase then launch
          FX.custom(0.5, (ctx, f, k) => {
            for (let i = 0; i < n; i++) {
              const a = i / n * TAU + (G.t - t0) * 9;
              drawSpear(ctx, p.x + Math.cos(a) * 34, p.y - 20 + Math.sin(a) * 34, a + Math.PI / 2, 26);
            }
          });
          G.later(0.5, () => {
            for (let i = 0; i < n; i++) {
              const a = i / n * TAU + (G.t - t0) * 9;
              spear(G, p, p.x + Math.cos(a) * 34, p.y - 20 + Math.sin(a) * 34, list[i % list.length], dmg);
            }
            CA.Audio.play('whoosh', 0.7);
          });
        },
      },
      {
        id: 'bl_hemo', name: 'Hemorrhage', kanji: '爆', cd: (L) => [10, 9.5, 9, 8.5, 8][L - 1],
        desc: 'Взрывает кровь во всех меченых врагах.',
        levels: ['Детонирует все метки в радиусе 420: урон за каждую метку.', 'Урон за метку +25%.', 'Радиус брызг +30%.', 'Урон за метку +30%.', 'После взрыва все задетые получают по 2 новые метки.'],
        cast(G, p, L) {
          const list = A.inRadius(p.x, p.y, 420, []).filter((e) => e.marks > 0);
          if (!list.length) return false;
          const per = A.dmg(p, [22, 27, 28, 36, 40][L - 1]);
          const sr = (L >= 3 ? 70 : 54) * p.area;
          p.cast = 1.2;
          CA.Audio.play('bigboom', 0.5); CA.Audio.play('blood');
          G.shake(8);
          list.forEach((e, i) => G.later(i * 0.02, () => {
            if (!e.alive) return;
            hemorrhage(G, p, e, per, sr);
            if (L >= 5) A.inRadius(e.x, e.y, sr, []).forEach((o) => mark(p, o, 2));
          }));
        },
      },
      {
        id: 'bl_shield', name: 'Blood Shield', kanji: '盾', cd: (L) => [16, 15, 14, 13, 12][L - 1],
        desc: 'Сферы крови вращаются вокруг мага, блокируя удары и раня врагов.',
        levels: ['3 сферы на 6 сек: каждая блокирует удар и ранит врагов.', '4 сферы.', '5 сфер, 8 сек.', 'Урон сфер +40%.', '6 сфер на 10 сек.'],
        cast(G, p, L) {
          const n = [3, 4, 5, 5, 6][L - 1];
          p.shieldOrbs = Math.max(p.shieldOrbs, n);
          p.state.shieldT = [6, 6, 8, 8, 10][L - 1];
          p.state.shieldDmg = A.dmg(p, L >= 4 ? 22 : 15);
          CA.Audio.play('shield');
          FX.ring(p.x, p.y - 20, 60, 10, 0.4, BLOOD, 4);
        },
      },
    ],
    ult: {
      id: 'bl_ult', name: 'Crimson Tide', kanji: '潮', dur: (L) => [2.5, 3, 3.5, 4, 5][L - 1],
      desc: 'Кровавые кольца прокатываются по арене, рассекая всё и леча мага.',
      levels: ['2 волны кровавого кольца (до 320), каждое ставит 3 метки. Лечит 15% HP.', '3 волны.', 'После волн — автоматический Hemorrhage.', '4 волны, урон +25%.', '5 волн, лечение 30%.'],
      cast(G, p, L) {
        const waves = [2, 3, 3, 4, 5][L - 1];
        const dmg = A.dmg(p, [60, 70, 80, 100, 115][L - 1]);
        p.heal(p.maxHp * (L >= 5 ? 0.3 : 0.15));
        for (let w = 0; w < waves; w++) {
          G.later(w * 0.55, () => {
            const cx = p.x, cy = p.y, hit = new Set();
            CA.Audio.play('blood'); CA.Audio.play('whoosh', 0.8); G.shake(8);
            let t = 0;
            A.zone({ x: cx, y: cy, r: 320, life: 0.5, update(z, dt) {
              t += dt;
              const rr = 320 * p.area * U.easeOut(Math.min(1, t / 0.5));
              for (const e of A.inRadius(cx, cy, rr, [])) {
                if (hit.has(e)) continue;
                hit.add(e);
                G.hitEnemy(e, dmg, { src: 'bl_ult', knock: 240, fx: cx, fy: cy });
                mark(p, e, 3);
              }
            }, draw(ctx, z) {
              const rr = 320 * p.area * U.easeOut(Math.min(1, t / 0.5));
              const k = 1 - t / 0.5;
              ctx.globalCompositeOperation = 'lighter';
              ctx.globalAlpha = 0.5 * k + 0.2; ctx.strokeStyle = BLOOD; ctx.lineWidth = 26 * k + 6;
              ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, rr), 0, TAU); ctx.stroke();
              ctx.globalAlpha = 0.9; ctx.strokeStyle = PALE; ctx.lineWidth = 3;
              ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, rr), 0, TAU); ctx.stroke();
              for (let i = 0; i < 24; i++) { const a = i / 24 * TAU + t * 3; drawSpear(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, a + Math.PI / 2, 22); }
            } });
          });
        }
        if (L >= 3) G.later(waves * 0.55 + 0.35, () => {
          const per = A.dmg(p, 30);
          A.inRadius(p.x, p.y, 460, []).forEach((e, i) => G.later(i * 0.015, () => e.alive && hemorrhage(G, p, e, per, 60)));
          G.shake(12); CA.Audio.play('bigboom');
        });
      },
    },
    combos: [
      { id: 'bl_cascade', name: 'Scarlet Cascade', kanji: '瀑', a: 'bl_spears', al: 3, b: 'bl_hemo', bl: 3,
        desc: 'Каждый взрыв метки выпускает самонаводящееся кровавое копьё в следующего врага.' },
      { id: 'bl_barrage', name: 'Sanguine Barrage', kanji: '弾', a: 'bl_basic', al: 3, b: 'bl_shield', bl: 3,
        desc: 'Кровавые сферы щита сами стреляют каплями крови в ближайших врагов.' },
    ],
    init(G, p) {
      p.hooks.kill.push((e) => {
        if (e.marks > 0) {
          const L = p.lv.bl_mark || 1;
          p.heal((0.6 + e.marks * 0.25) * (L >= 5 ? 2 : 1));
        }
      });
    },
    update(G, p, dt) {
      const st = p.state;
      if (st.shieldT > 0) {
        st.shieldT -= dt;
        if (st.shieldT <= 0) p.shieldOrbs = 0;
        st.orbTick = (st.orbTick || 0) - dt;
        const n = p.shieldOrbs;
        if (st.orbTick <= 0 && n > 0) {
          st.orbTick = 0.25;
          for (let i = 0; i < n; i++) {
            const a = i / n * TAU + p.t * 3;
            A.hitCircle(p.x + Math.cos(a) * 52, p.y - 16 + Math.sin(a) * 44, 14, st.shieldDmg * 0.5, { src: 'bl_shield', small: true, knock: 100, noCrit: true });
          }
        }
        if (p.combos.bl_barrage && n > 0) {
          st.barrageCd = (st.barrageCd || 0) - dt;
          if (st.barrageCd <= 0) {
            st.barrageCd = 0.35;
            const i = Math.floor(Math.random() * n), a = i / n * TAU + p.t * 3;
            const ox = p.x + Math.cos(a) * 52, oy = p.y - 16 + Math.sin(a) * 44;
            const t = A.nearest(ox, oy, 380);
            if (t) A.proj({ x: ox, y: oy, a: Math.atan2(t.y - oy, t.x - ox), speed: 600, r: 5, life: 0.8, pierce: 1, color: BLOOD, dmg: A.dmg(p, 12), opt: { src: 'bl_basic' }, onHit: (pr, e) => mark(p, e, 1), draw: (ctx, pr) => drawDrop(ctx, pr, 5) });
          }
        }
      } else if (p.shieldOrbs > 0 && !(st.shieldT > 0)) p.shieldOrbs = 0;
    },
    drawOver(ctx, G, p) {
      const n = p.shieldOrbs;
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + p.t * 3;
        const x = p.x + Math.cos(a) * 52, y = p.y - 16 + Math.sin(a) * 44;
        FX.glow(ctx, x, y, 18, BLOOD, 0.9);
        ctx.fillStyle = '#a00018'; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
        ctx.fillStyle = PALE; ctx.beginPath(); ctx.arc(x - 1.5, y - 1.5, 1.6, 0, TAU); ctx.fill();
      }
      // floating droplets
      for (let i = 0; i < 3; i++) {
        const a = p.t * 1.5 + i * 2.1;
        FX.glow(ctx, p.x + Math.cos(a) * 18, p.y - 46 + Math.sin(a * 1.3) * 4, 5, BLOOD, 0.8);
      }
    },
  };
  CA.Kits.blood = K;
})();
