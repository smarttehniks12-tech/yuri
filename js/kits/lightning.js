/* kits/lightning.js — LIGHTNING GAMBLER (Jin Raijo): chain lightning, dashes, luck & jackpots */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U, A = CA.A, FX = CA.FX;
  const TAU = U.TAU;
  const Y = '#ffe83a', W = '#fff8c8', CYAN = '#7af0ff';

  const JACKPOTS = [
    { id: 'hot', label: 'HOT HAND', ru: 'Горячая рука: урон x1.6', color: '#ff7a3a', apply: (p, d) => p.addBuff('hot', 8 * d, { dmg: 0.6, label: 'HOT', color: '#ff7a3a' }) },
    { id: 'spin', label: 'FREE SPIN', ru: 'Все перезарядки сброшены', color: Y, apply: (p) => { for (const k in p.cds) p.cds[k] = 0; } },
    { id: 'wind', label: 'SECOND WIND', ru: 'Лечение 20%', color: '#5aff8a', apply: (p) => p.heal(p.maxHp * 0.2) },
    { id: 'lane', label: 'FAST LANE', ru: 'Скорость и атака x2', color: CYAN, apply: (p, d) => p.addBuff('lane', 8 * d, { spd: 0.4, atkSpd: 1, label: 'FAST', color: CYAN }) },
    { id: 'over', label: 'OVERFLOW', ru: '+30 проклятой энергии', color: '#b06aff', apply: (p) => p.gainCe(30) },
  ];
  function jackpot(G, p, forced) {
    const L = p.lv.lg_luck || 1;
    const dur = L >= 5 ? 1.5 : 1;
    const j = forced || U.choice(JACKPOTS);
    j.apply(p, dur);
    G.run.jackpots++;
    CA.Store.data.stats.jackpots++;
    FX.label(p.x, p.y - 70, j.label + '!', j.color, 18, 1.4);
    FX.ring(p.x, p.y - 20, 10, 90, 0.4, j.color, 4);
    FX.burst(p.x, p.y - 20, j.color, 16, 220, 4, 0.6);
    CA.Audio.play('jackpot', 0.6);
  }

  function chain(G, p, from, first, n, dmg, color, range) {
    let cur = first, px = from.x, py = from.y;
    const hit = new Set();
    for (let i = 0; i <= n && cur; i++) {
      hit.add(cur);
      FX.bolt(px, py, cur.x, cur.y - 4, color || Y, 2.2, 0.16);
      G.hitEnemy(cur, dmg * (i ? 0.85 : 1), { src: 'lg_basic', stun: 0.05, fx: px, fy: py });
      FX.sparks(cur.x, cur.y, W, 3, 200);
      px = cur.x; py = cur.y;
      let next = null, bd = (range || 170) ** 2;
      for (const e of A.inRadius(px, py, range || 170, [])) {
        if (hit.has(e)) continue;
        const d = U.dist2(px, py, e.x, e.y);
        if (d < bd) { bd = d; next = e; }
      }
      cur = next;
    }
  }
  function strike(G, p, x, y, r, dmg) {
    FX.bolt(x + U.rand(-30, 30), y - 420, x, y, Y, 4, 0.25, 0.35);
    FX.bolt(x + U.rand(-30, 30), y - 420, x, y, W, 2, 0.2, 0.4);
    FX.disc(x, y, r * 1.2, 0.25, Y, 0.9);
    FX.ring(x, y, 5, r, 0.25, W, 3);
    FX.sparks(x, y, Y, 10, 300);
    A.hitCircle(x, y, r, dmg, { src: 'lg_storm', stun: 0.35 });
  }

  function dash(G, p, L, dir) {
    const dist = 210;
    const ox = p.x, oy = p.y;
    const Wd = CA.Locations.WORLD;
    const tx = U.clamp(p.x + Math.cos(dir) * dist, 20, Wd - 20), ty = U.clamp(p.y + Math.sin(dir) * dist, 20, Wd - 20);
    p.x = tx; p.y = ty; p.invuln = Math.max(p.invuln, 0.35);
    const dmg = A.dmg(p, [32, 42, 48, 60, 80][L - 1]);
    FX.bolt(ox, oy - 18, tx, ty - 18, Y, 5, 0.3, 0.15);
    FX.bolt(ox, oy - 18, tx, ty - 18, CYAN, 2, 0.3, 0.3);
    FX.burst(tx, ty - 18, Y, 14, 260, 4, 0.4);
    A.hitLine(ox, oy, tx, ty, 50 * p.area, dmg, { src: 'lg_dash', stun: 0.3, knock: 120 });
    CA.Audio.play('zap'); CA.Audio.play('whoosh', 0.6);
    G.shake(4);
    // static trail
    const life = p.combos.lg_electric ? 4 : 2;
    const tdmg = A.dmg(p, L >= 3 ? 14 : 8);
    A.zone({ x: (ox + tx) / 2, y: (oy + ty) / 2, r: dist / 2 + 30, life, under: true, tick: 0,
      update(z, dt) { A.every(z, dt, 0.3, () => A.hitLine(ox, oy, tx, ty, 40, tdmg, { src: 'lg_dash', small: true, noCrit: true })); },
      draw(ctx, z, k) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k * 0.6;
        ctx.strokeStyle = Y; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ox, oy);
        const n = 10;
        for (let i = 1; i <= n; i++) ctx.lineTo(U.lerp(ox, tx, i / n) + U.rand(-8, 8), U.lerp(oy, ty, i / n) + U.rand(-8, 8));
        ctx.stroke();
      } });
    if (p.combos.lg_electric) {
      p.addBuff('electric', 4, { spd: 0.5, atkSpd: 0.6, label: 'ELECTRIC', color: CYAN });
      p.state.electric = 4;
    }
  }

  const SYMBOLS = ['7', '⚡', '🍒', '☠', '◆'];
  function roulette(G, p, L, fromDomain) {
    const jp = [0.05, 0.07, 0.09, 0.12, 0.16][L - 1] + p.luck * 0.1;
    const r = Math.random();
    let res;
    if (r < jp) res = [0, 0, 0];
    else if (r < jp + 0.28) { const s = U.randi(1, 4); res = [s, s, s]; }
    else if (r < jp + 0.7) { const s = U.randi(1, 4); let o = U.randi(0, 4); if (o === s) o = (o + 1) % 5; res = U.shuffle([s, s, o]); }
    else { res = U.shuffle([0, 1, 2, 3, 4]).slice(0, 3); if (res[0] === res[1] && res[1] === res[2]) res[2] = (res[2] + 1) % 5; }
    const spinT = fromDomain ? 0.7 : 0.9;
    CA.Audio.play('roll');
    const t0 = G.t;
    FX.custom(spinT + 0.6, (ctx, f) => {
      const el = G.t - t0;
      const x = p.x, y = p.y - 92;
      ctx.fillStyle = 'rgba(20,16,4,0.85)'; ctx.strokeStyle = Y; ctx.lineWidth = 2;
      ctx.fillRect(x - 48, y - 18, 96, 36); ctx.strokeRect(x - 48, y - 18, 96, 36);
      ctx.font = '900 20px -apple-system, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < 3; i++) {
        const stop = spinT * (0.55 + i * 0.22);
        const sym = el < stop ? SYMBOLS[Math.floor(el * 22 + i * 3) % 5] : SYMBOLS[res[i]];
        ctx.fillStyle = el < stop ? '#8a8060' : (res[0] === 0 && res[1] === 0 && res[2] === 0 ? '#ff3a3a' : W);
        ctx.fillText(sym, x - 30 + i * 30, y + 1);
      }
      if (el > spinT) FX.glow(ctx, x, y, 60, Y, 0.4);
    });
    G.later(spinT, () => {
      const dmgBase = A.dmg(p, [40, 50, 60, 72, 90][L - 1]);
      if (res[0] === 0 && res[1] === 0 && res[2] === 0) {
        G.banner('JACKPOT!!!', 'Лихорадка удачи', Y, 2);
        p.addBuff('fever', 6, { spd: 0.6, atkSpd: 1.5, dmg: 0.5, cdRate: 3, regen: 0.02, label: 'FEVER', color: Y });
        A.hitCircle(p.x, p.y, 260, dmgBase * 3, { src: 'lg_roulette', stun: 1 });
        FX.disc(p.x, p.y, 280, 0.5, Y, 1); G.shake(14); CA.Audio.play('jackpot'); CA.Audio.play('bigboom', 0.6);
        G.run.jackpots++; CA.Store.data.stats.jackpots++;
        G.run.bigJackpot = true;
      } else if (res[0] === res[1] && res[1] === res[2]) {
        const s = res[0];
        FX.label(p.x, p.y - 120, 'TRIPLE ' + SYMBOLS[s], Y, 18, 1.4);
        if (s === 1) { for (let i = 0; i < 12; i++) G.later(i * 0.06, () => { const e = A.nearest(p.x + U.rand(-250, 250), p.y + U.rand(-250, 250), 200); if (e) strike(G, p, e.x, e.y, 50, dmgBase); }); }
        else if (s === 2) { p.heal(p.maxHp * 0.4); FX.ring(p.x, p.y, 10, 120, 0.5, '#5aff8a', 6); }
        else if (s === 3) { A.hitCircle(p.x, p.y, 300, dmgBase * 2.2, { src: 'lg_roulette', knock: 400 }); FX.disc(p.x, p.y, 300, 0.4, '#b06aff', 0.9); G.shake(10); CA.Audio.play('bigboom', 0.6); }
        else { G.run.shardsBonus += 8; p.gainXp(p.xpNext * 0.5); FX.label(p.x, p.y - 100, '+8 осколков', '#7af0ff', 14, 1.2); }
        CA.Audio.play('jackpot', 0.7);
      } else if (res[0] === res[1] || res[1] === res[2] || res[0] === res[2]) {
        jackpot(G, p);
      } else {
        A.hitCircle(p.x, p.y, 160, dmgBase, { src: 'lg_roulette', stun: 0.4 });
        FX.ring(p.x, p.y, 10, 160, 0.3, Y, 4); CA.Audio.play('zap');
      }
      if (p.combos.lg_overcharge) for (let i = 0; i < 4; i++) G.later(i * 0.08, () => { const e = A.nearest(p.x + U.rand(-200, 200), p.y + U.rand(-200, 200), 200); if (e) strike(G, p, e.x, e.y, 50, A.dmg(p, 40)); });
    });
  }

  const K = {
    id: 'lightning',
    jackpot, strike, roulette, chain,
    basic: {
      id: 'lg_basic', name: 'Spark Jab', kanji: '電', cd: 0.55,
      desc: 'Цепная молния, перескакивающая между врагами.',
      levels: ['Молния бьёт врага и перескакивает на 1 цель.', '2 перескока, урон +20%.', 'Урон +25%.', '3 перескока, дальность больше.', '4 перескока, удар оглушает.'],
      fire(G, p, L) {
        const range = L >= 4 ? 320 : 270;
        const t = A.nearest(p.x, p.y, range);
        if (!t) return false;
        p.atk = 1; p.aimA = Math.atan2(t.y - p.y, t.x - p.x);
        let n = [1, 2, 2, 3, 4][L - 1];
        if (p.state.electric > 0 || p.hasBuff('electric')) n += 3;
        chain(G, p, { x: p.x + Math.cos(p.aimA) * 10, y: p.y - 22 }, t, n, A.dmg(p, [11, 13, 16, 17, 19][L - 1]) * (1 + p.bonus.basicDmg), Y, L >= 4 ? 200 : 170);
        CA.Audio.play('zap', 0.4);
      },
    },
    passive: {
      id: 'lg_luck', name: 'Lucky Streak', kanji: '運', passive: true,
      desc: 'Каждый удар — ставка. Иногда судьба выдаёт джекпот.',
      levels: ['1.2% шанс за удар выбить случайный бонус (урон, сброс КД, лечение, скорость, энергия).', 'Шанс 1.8%.', 'Шанс 2.4%, +10% удачи для редкостей.', 'Шанс 3%, бонусы не чаще раза в 7 сек.', 'Бонусы длятся на 50% дольше; шанс удвоен при HP < 30%.'],
      onLearn(G, p, L) { if (L === 3) p.bonus.luck += 0.1; },
    },
    skills: [
      {
        id: 'lg_dash', name: 'Thunder Dash', kanji: '疾', cd: (L) => [5, 4.6, 4.2, 3.8, 3.2][L - 1],
        desc: 'Молниеносный рывок, оставляющий за собой след статики.',
        levels: ['Рывок на 210 в направлении движения, поражая и оглушая врагов на пути.', 'Урон +30%.', 'След статики сильнее.', 'Урон +25%, перезарядка короче.', 'Двойной рывок: второй — к ближайшему врагу.'],
        cast(G, p, L) {
          const dir = p.moving ? p.dirA : A.aim(p);
          dash(G, p, L, dir);
          if (L >= 5) G.later(0.18, () => { const e = A.nearest(p.x, p.y, 300); dash(G, p, L, e ? Math.atan2(e.y - p.y, e.x - p.x) : p.dirA); });
        },
      },
      {
        id: 'lg_storm', name: 'Storm Call', kanji: '嵐', cd: (L) => [9, 8.5, 8, 7.5, 7][L - 1],
        desc: 'Удары молний с неба по врагам вокруг.',
        levels: ['4 молнии бьют по случайным врагам в радиусе 330.', '6 молний.', 'Урон +30%, радиус удара больше.', '8 молний.', '11 молний, каждая разветвляется цепью.'],
        cast(G, p, L) {
          const list = A.inRadius(p.x, p.y, 330, []);
          if (!list.length) return false;
          const n = [4, 6, 6, 8, 11][L - 1];
          const dmg = A.dmg(p, [36, 40, 52, 56, 62][L - 1]);
          const r = (L >= 3 ? 55 : 42) * p.area;
          p.cast = 1.2;
          G.flash('#fff8c8', 0.12);
          for (let i = 0; i < n; i++) G.later(i * 0.07, () => {
            const e = list[(Math.random() * list.length) | 0];
            if (!e) return;
            strike(G, p, e.x, e.y, r, dmg);
            if (L >= 5) { const o = A.nearest(e.x, e.y, 150, e); if (o) chain(G, p, e, o, 1, dmg * 0.5, CYAN); }
            CA.Audio.play('zap');
          });
          G.shake(6);
          if (p.combos.lg_overcharge) G.later(n * 0.07 + 0.1, () => roulette(G, p, 1, true));
        },
      },
      {
        id: 'lg_roulette', name: 'Cursed Roulette', kanji: '賭', cd: (L) => [14, 13, 12, 11, 10][L - 1],
        desc: 'Барабаны судьбы. Три семёрки — ДЖЕКПОТ.',
        levels: ['Крутит 3 барабана: тройка, пара или ничего — разные эффекты. 777 = лихорадка.', 'Шанс джекпота выше.', 'Урон эффектов +20%.', 'Шанс джекпота 12%.', 'Шанс джекпота 16%, перезарядка 10 сек.'],
        cast(G, p, L) { p.cast = 1; roulette(G, p, L); },
      },
      {
        id: 'lg_tesla', name: 'Tesla Field', kanji: '磁', cd: (L) => [12, 12, 11, 10, 9][L - 1],
        desc: 'Поле статики, бьющее током ближайших врагов.',
        levels: ['Поле радиусом 100 на 5 сек бьёт током 2 врагов каждые 0.3 сек.', 'Радиус 120, 3 цели.', '7 сек.', 'Урон +30%, 4 цели.', 'Радиус 150, 9 сек, 5 целей.'],
        cast(G, p, L) {
          const R = [100, 120, 120, 120, 150][L - 1] * p.area;
          const n = [2, 3, 3, 4, 5][L - 1];
          const dmg = A.dmg(p, L >= 4 ? 16 : 12);
          CA.Audio.play('zap'); p.cast = 1;
          A.zone({ x: p.x, y: p.y, r: R, life: [5, 5, 7, 7, 9][L - 1], follow: p, tick: 0,
            update(z, dt) {
              A.every(z, dt, 0.3, () => {
                const list = A.inRadius(z.x, z.y, z.r, []);
                for (let i = 0; i < Math.min(n, list.length); i++) {
                  const e = list[(Math.random() * list.length) | 0];
                  FX.bolt(z.x + U.rand(-10, 10), z.y - 20, e.x, e.y, CYAN, 1.6, 0.12);
                  G.hitEnemy(e, dmg, { src: 'lg_tesla', stun: 0.1, small: true });
                }
                if (list.length) CA.Audio.play('zap', 0.25);
              });
            },
            draw(ctx, z, k) {
              ctx.globalCompositeOperation = 'lighter';
              ctx.globalAlpha = 0.35 * Math.min(1, k * 4);
              ctx.strokeStyle = CYAN; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.arc(z.x, z.y - 6, z.r, 0, TAU); ctx.stroke();
              ctx.globalAlpha = 0.5 * Math.min(1, k * 4);
              for (let i = 0; i < 3; i++) {
                const a = z.t * 4 + i * 2.1;
                ctx.beginPath(); ctx.arc(z.x, z.y - 6, z.r * 0.9, a, a + 0.6); ctx.stroke();
              }
              ctx.globalAlpha = 0.1; ctx.drawImage(FX.getSoft(CYAN), z.x - z.r, z.y - z.r, z.r * 2, z.r * 2);
            } });
        },
      },
    ],
    ult: {
      id: 'lg_ult', name: 'Jackpot Fever', kanji: '狂', dur: (L) => [8, 9, 10, 11, 12][L - 1],
      desc: 'Режим невероятной скорости: перезарядки тают, энергия и здоровье восстанавливаются.',
      levels: ['8 сек: скорость +60%, перезарядки x4, регенерация 3%/сек, молнии вокруг. Начинается громовым ударом.', '9 сек, громовой удар сильнее.', '10 сек, атаки цепляют +2 цели.', '11 сек.', '12 сек; в конце — гарантированный джекпот.'],
      cast(G, p, L) {
        const dur = this.dur(L);
        A.hitCircle(p.x, p.y, 240 * p.area, A.dmg(p, L >= 2 ? 160 : 110), { src: 'lg_ult', stun: 1.2, knock: 300 });
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; FX.bolt(p.x, p.y - 20, p.x + Math.cos(a) * 240, p.y + Math.sin(a) * 240, Y, 3, 0.35); }
        FX.disc(p.x, p.y, 260, 0.5, Y, 1); G.shake(14);
        p.addBuff('fever', dur, { spd: 0.6, cdRate: 4, regen: 0.03, atkSpd: 0.8, dmg: 0.2, label: 'FEVER', color: Y,
          onEnd: L >= 5 ? () => jackpot(G, p) : null });
        p.state.feverLv = L;
      },
    },
    combos: [
      { id: 'lg_electric', name: 'Electric Mode', kanji: '閃', a: 'lg_dash', al: 3, b: 'lg_tesla', bl: 3,
        desc: 'Молния + скорость: после рывка — Электрический режим на 4 сек (скорость +50%, атака +60%, +3 цели цепи), след держится дольше.' },
      { id: 'lg_overcharge', name: 'Overcharge Roulette', kanji: '盛', a: 'lg_storm', al: 3, b: 'lg_roulette', bl: 3,
        desc: 'Storm Call завершается бесплатным вращением рулетки, а каждая рулетка вызывает 4 доп. молнии.' },
    ],
    init(G, p) {
      p.hooks.hit.push((e, dmg, opt) => {
        if (opt && opt.src === 'burn') return;
        const L = p.lv.lg_luck || 1;
        let ch = [0.012, 0.018, 0.024, 0.03, 0.03][L - 1] * (1 + p.luck);
        if (L >= 5 && p.hp < p.maxHp * 0.3) ch *= 2;
        if ((p.state.jpCd || 0) <= 0 && Math.random() < ch) { p.state.jpCd = L >= 5 ? 5 : 7; jackpot(G, p); }
      });
    },
    update(G, p, dt) {
      if (p.state.electric > 0) p.state.electric -= dt;
      if (p.state.jpCd > 0) p.state.jpCd -= dt;
      if (p.hasBuff('fever')) {
        p.state.fevTick = (p.state.fevTick || 0) - dt;
        if (p.state.fevTick <= 0) {
          p.state.fevTick = 0.25;
          const e = A.nearest(p.x, p.y, 200);
          if (e) { FX.bolt(p.x, p.y - 20, e.x, e.y, Y, 2, 0.12); G.hitEnemy(e, A.dmg(p, 14), { src: 'lg_ult', small: true }); }
        }
        if (Math.random() < 0.5) FX.sparks(p.x, p.y - 20, Y, 1, 200);
        p.gainCe(0); // keep gauge stable
      }
    },
    drawOver(ctx, G, p) {
      if (Math.random() < 0.25 || p.hasBuff('fever')) {
        const a = Math.random() * TAU;
        FX.bolt(p.x + Math.cos(a) * 6, p.y - 24 + Math.sin(a) * 6, p.x + Math.cos(a) * 22, p.y - 24 + Math.sin(a) * 18, Y, 1, 0.06, 0.6);
      }
      if (p.hasBuff('fever') || p.hasBuff('electric')) FX.glow(ctx, p.x, p.y - 22, 46, Y, 0.35 + Math.random() * 0.15);
    },
  };
  CA.Kits.lightning = K;
})();
