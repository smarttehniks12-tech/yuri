/* kits/striker.js — BLACK STRIKER (Daichi Kuroda): melee combos, counters, perfect-timing BLACK SPARK */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U, A = CA.A, FX = CA.FX;
  const TAU = U.TAU;
  const RED = '#ff2440', DARK = '#0a0006';
  const PERIOD = 1.15;

  function blackBolt(x1, y1, x2, y2, w) {
    FX.bolt(x1, y1, x2, y2, RED, (w || 3) + 1, 0.24, 0.4);
    const pts = [];
    const n = 7;
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push(U.lerp(x1, x2, t) + (i && i < n ? U.rand(-14, 14) : 0), U.lerp(y1, y2, t) + (i && i < n ? U.rand(-14, 14) : 0)); }
    FX.custom(0.22, (ctx, f, k) => {
      ctx.strokeStyle = DARK; ctx.lineWidth = (w || 3) * 1.1 * k + 0.5; ctx.lineJoin = 'round'; ctx.globalAlpha = k;
      ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke();
    });
  }
  function flowMax(p) { return [3, 4, 5, 6, 7][(p.lv.bs_spark || 1) - 1]; }
  function sparkFx(G, p, x, y, big) {
    for (let i = 0; i < (big ? 9 : 6); i++) { const a = Math.random() * TAU, l = U.rand(40, big ? 130 : 90); blackBolt(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, big ? 4 : 3); }
    FX.disc(x, y, big ? 110 : 70, 0.25, RED, 0.9);
    FX.custom(0.18, (ctx, f, k) => { ctx.fillStyle = DARK; ctx.globalAlpha = k * 0.9; ctx.beginPath(); ctx.arc(x, y, (big ? 30 : 20) * (1 - k * 0.5), 0, TAU); ctx.fill(); });
    FX.label(x, y - 40, 'BLACK SPARK', RED, big ? 20 : 16, 1.1);
    CA.Audio.play('spark'); CA.Audio.vibrate('heavy');
    G.hitstop(big ? 0.09 : 0.06); G.shake(big ? 12 : 8); G.flash('#200008', 0.25);
  }
  // all striker damage goes through here so Black Spark can trigger
  function strike(G, p, e, dmg, opt, forceSpark) {
    if (!e.alive) return false;
    const st = p.state;
    const L = p.lv.bs_spark || 1;
    let spark = forceSpark || st.nextSpark || st.allSpark || Math.random() < [0.025, 0.03, 0.04, 0.045, 0.06][L - 1] + (p.luck || 0) * 0.05;
    opt = opt || {};
    opt.src = opt.src || 'bs';
    if (spark) {
      st.nextSpark = false;
      dmg *= 2.8;
      opt.critBonus = 1; opt.big = true;
      st.flow = Math.min(flowMax(p), (st.flow || 0) + 1); st.flowT = 10;
      G.run.sparks++; CA.Store.data.stats.blackSparks++;
      p.gainCe(1.2);
      if (!st.sparkFxCd || st.sparkFxCd <= 0) { sparkFx(G, p, e.x, e.y - 6, opt.bigFx); st.sparkFxCd = 0.12; }
      if (L >= 5 || p.combos.bs_chain) {
        const near = A.inRadius(e.x, e.y, 160, []).filter((o) => o !== e).slice(0, 3);
        for (const o of near) { blackBolt(e.x, e.y, o.x, o.y, 2.5); G.hitEnemy(o, dmg * 0.4, { src: 'bs_spark' }); }
      }
      if (p.combos.bs_chain) for (const k in p.cds) if (p.cds[k] > 0) p.cds[k] = Math.max(0, p.cds[k] - 0.4);
    }
    G.hitEnemy(e, dmg, opt);
    return spark;
  }

  function breaker(G, p, L, dir, auto) {
    const dist = 230;
    const W = CA.Locations.WORLD;
    const ox = p.x, oy = p.y;
    const tx = U.clamp(p.x + Math.cos(dir) * dist, 20, W - 20), ty = U.clamp(p.y + Math.sin(dir) * dist, 20, W - 20);
    p.dashV = { x: (tx - ox) / 0.14, y: (ty - oy) / 0.14, t: 0.14 };
    p.invuln = Math.max(p.invuln, 0.3); p.atk = 1; p.aimA = dir; p.face = Math.cos(dir) < 0 ? -1 : 1;
    const dmg = A.dmg(p, [42, 52, 60, 72, 90][L - 1]) * (auto ? 0.7 : 1);
    CA.Audio.play('whoosh'); CA.Audio.play('punch');
    FX.line(ox, oy - 18, tx, ty - 18, 10, RED, 0.25);
    const list = A.inRadius((ox + tx) / 2, (oy + ty) / 2, dist / 2 + 40, []);
    for (const e of list) {
      if (U.segDist2(e.x, e.y, ox, oy, tx, ty) < (34 + e.r) ** 2) strike(G, p, e, dmg, { knock: 320, src: 'bs_dash', fx: ox, fy: oy });
    }
    G.later(0.15, () => {
      const R = (L >= 3 ? 110 : 85) * p.area;
      A.hitCircle(p.x, p.y, R, dmg * 0.6, { src: 'bs_dash', knock: 260 });
      FX.shock(p.x, p.y, R * 1.2, RED, 0.4); FX.shards(p.x, p.y, '#3a2a2a', 8, 220); G.shake(6);
    });
  }

  const K = {
    id: 'striker',
    strike, sparkFx, blackBolt,
    dmgMod(p) { return 1 + (p.state.flow || 0) * 0.08; },
    spdMod(p) { return 1 + (p.state.flow || 0) * 0.04; },
    // called by game on attack button press
    onAttackPress(G, p) {
      const st = p.state;
      const w = this.window(p);
      if (st.ring >= 1 - w) {
        st.nextSpark = true;
        st.perfectFlash = 0.35;
        FX.label(p.x, p.y - 64, 'PERFECT', '#ffffff', 15, 0.7);
        p.cds[this.basic.id] = 0;
        CA.Audio.play('select', 0.6);
        CA.Audio.vibrate('light');
      }
      st.ring = 0;
    },
    window(p) { return [0.13, 0.14, 0.16, 0.18, 0.21][(p.lv.bs_spark || 1) - 1] + ((p.state.flow || 0) >= flowMax(p) ? 0.05 : 0); },
    basic: {
      id: 'bs_basic', name: 'Rapid Combo', kanji: '連', cd: 0.3,
      desc: 'Серия молниеносных ударов с подшагом к цели.',
      levels: ['Быстрая серия ударов; каждый 3-й удар отбрасывает и бьёт по области.', 'Урон +25%.', 'Подшаг к целям дальше.', 'Дальность ударов +20%, 3-й удар сильнее.', 'Каждый удар бьёт до 3 врагов.'],
      fire(G, p, L) {
        const reach = (L >= 4 ? 100 : 84) * p.area;
        const step = L >= 3 ? 200 : 150;
        const t = A.nearest(p.x, p.y, step);
        if (!t) return false;
        let d = U.dist(p.x, p.y, t.x, t.y);
        const a = Math.atan2(t.y - p.y, t.x - p.x);
        if (d > reach) { // step-in
          const go = Math.min(d - reach * 0.6, 120);
          p.dashV = { x: Math.cos(a) * go / 0.09, y: Math.sin(a) * go / 0.09, t: 0.09 };
          d -= go;
        }
        p.atk = 1; p.aimA = a;
        const st = p.state;
        st.combo = ((st.combo || 0) + 1) % 3;
        const third = st.combo === 0;
        const dmg = A.dmg(p, L >= 2 ? 15 : 12) * (third ? (L >= 4 ? 2.2 : 1.7) : 1) * (1 + p.bonus.basicDmg);
        G.later(0.06, () => {
          const fx = p.x + Math.cos(a) * 26, fy = p.y - 18 + Math.sin(a) * 26;
          if (third) {
            const list = A.inRadius(fx, fy + 18, 70 * p.area, []);
            for (const e of list) strike(G, p, e, dmg, { knock: 300, src: 'bs_basic', fx: p.x, fy: p.y });
            FX.disc(fx, fy, 50, 0.2, RED, 0.7); FX.ring(fx, fy, 6, 60, 0.25, '#ffb0b8', 4);
            CA.Audio.play('punch'); G.shake(3);
          } else {
            const targets = L >= 5 ? A.inRadius(fx, fy + 18, 46, []).slice(0, 3) : [t];
            for (const e of targets) strike(G, p, e, dmg, { knock: 90, src: 'bs_basic', fx: p.x, fy: p.y });
            FX.disc(fx, fy, 26, 0.12, '#ffd0d8', 0.8);
            CA.Audio.play('punch', 0.5);
          }
          FX.sparks(fx, fy, '#ffe0e4', third ? 8 : 4, 260, a, 1.2);
        });
      },
    },
    passive: {
      id: 'bs_spark', name: 'Black Spark', kanji: '黒', passive: true,
      desc: 'Идеальное попадание искажает пространство: удар наносит x2.8 урона и даёт Поток.',
      levels: ['Нажмите атаку, когда кольцо сожмётся — следующий удар станет ЧЁРНОЙ ИСКРОЙ (x2.8). Шанс случайной искры 2.5%. Поток: до 3 зарядов (+8% урона).', 'Окно шире, Поток до 4.', 'Шанс 4%, Поток до 5.', 'Окно шире, Поток до 6.', 'Шанс 6%, Поток до 7; искры бьют молнией ещё 3 врагов.'],
    },
    skills: [
      {
        id: 'bs_dash', name: 'Breaker Dash', kanji: '破', cd: (L) => [5, 4.8, 4.5, 4.2, 3.8][L - 1],
        desc: 'Таранный рывок с кулаком, сметающий всех на пути.',
        levels: ['Рывок на 230 с ударом по всем на пути и ударной волной в конце.', 'Урон +25%.', 'Ударная волна шире.', 'Урон +20%.', 'Перезарядка 3.8 сек, урон +25%.'],
        cast(G, p, L) { breaker(G, p, L, p.moving ? p.dirA : A.aim(p, 300)); },
      },
      {
        id: 'bs_counter', name: 'Counter Stance', kanji: '返', cd: (L) => [8, 7.5, 7, 6.5, 6][L - 1],
        desc: 'Стойка: любой удар по магу превращается в сокрушительную контратаку.',
        levels: ['0.9 сек стойки: входящий урон отменяется, следует контратака ЧЁРНОЙ ИСКРОЙ.', 'Урон контратаки +30%.', 'Стойка 1.2 сек.', 'Контратака бьёт по большей области.', 'Каждая контратака восстанавливает 8% HP.'],
        cast(G, p, L) {
          const st = p.state;
          st.counter = (L >= 3 ? 1.2 : 0.9) + (p.combos.bs_counter ? 0.4 : 0);
          st.counterHit = false;
          p.lockMove = 0.15; p.cast = 1;
          FX.ring(p.x, p.y - 18, 50, 20, 0.3, RED, 3);
          CA.Audio.play('shield', 0.6);
        },
      },
      {
        id: 'bs_fist', name: 'Cursed Fist', kanji: '拳', cd: (L) => [10, 9.5, 9, 8.5, 8][L - 1],
        desc: 'Заряженный удар, выпускающий конус проклятой энергии.',
        levels: ['Заряд 0.35 сек и удар-конус (дальность 180). При Потоке ≥3 — гарантированная искра.', 'Урон +25%.', 'Дальность 220.', 'Урон +30%.', 'Дальность 260, оглушение 1 сек.'],
        cast(G, p, L) {
          const a = A.aim(p, 300);
          p.lockMove = 0.4; p.cast = 1.4; p.aimA = a;
          FX.implode(p.x + Math.cos(a) * 16, p.y - 20, RED, 14, 60, 0.33);
          CA.Audio.play('pull', 0.4);
          const R = [180, 180, 220, 220, 260][L - 1] * p.area;
          const dmg = A.dmg(p, [70, 88, 94, 122, 140][L - 1]);
          G.later(0.35, () => {
            p.atk = 1;
            const force = (p.state.flow || 0) >= 3;
            let first = true;
            const list = A.inRadius(p.x, p.y, R, []);
            for (const e of list) {
              const ea = Math.atan2(e.y - p.y, e.x - p.x);
              if (Math.abs(U.angDiff(a, ea)) > 0.65) continue;
              strike(G, p, e, dmg, { knock: 420, src: 'bs_fist', stun: L >= 5 ? 1 : 0.3, fx: p.x, fy: p.y, bigFx: true }, force && first);
              first = false;
            }
            // visual cone wave
            FX.custom(0.35, (ctx, f, k) => {
              const rr = R * (1 - k * k);
              ctx.globalCompositeOperation = 'lighter';
              ctx.globalAlpha = k; ctx.fillStyle = 'rgba(255,36,64,0.35)';
              ctx.beginPath(); ctx.moveTo(p.x, p.y - 18); ctx.arc(p.x, p.y - 18, rr, a - 0.65, a + 0.65); ctx.closePath(); ctx.fill();
              ctx.strokeStyle = '#ffd0d8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y - 18, rr, a - 0.65, a + 0.65); ctx.stroke();
            });
            for (let i = 0; i < 4; i++) blackBolt(p.x, p.y - 18, p.x + Math.cos(a + U.rand(-0.5, 0.5)) * R, p.y - 18 + Math.sin(a + U.rand(-0.5, 0.5)) * R, 3);
            CA.Audio.play('boom'); G.shake(10); G.hitstop(0.04);
          });
        },
      },
      {
        id: 'bs_barrage', name: 'Divergent Barrage', kanji: '乱', cd: (L) => [12, 11.5, 11, 10.5, 10][L - 1],
        desc: 'Шквал из сотни ударов по всем врагам перед собой.',
        levels: ['1.2 сек шквала ударов (14 серий) по врагам в конусе перед собой.', 'Урон каждого удара +25%.', '18 серий.', 'Область шире.', '24 серии, финальный удар — гарантированная искра.'],
        cast(G, p, L) {
          const n = [14, 14, 18, 18, 24][L - 1];
          const R = (L >= 4 ? 130 : 105) * p.area;
          const dmg = A.dmg(p, [12, 15, 15, 17, 19][L - 1]);
          p.cast = 1;
          for (let i = 0; i < n; i++) {
            G.later(i * (1.2 / n), () => {
              const t = A.nearest(p.x, p.y, R + 40);
              const a = t ? Math.atan2(t.y - p.y, t.x - p.x) : p.dirA;
              p.atk = 1; p.aimA = a; p.face = Math.cos(a) < 0 ? -1 : 1;
              const list = A.inRadius(p.x + Math.cos(a) * R * 0.5, p.y + Math.sin(a) * R * 0.5, R * 0.6, []);
              const last = i === n - 1;
              for (const e of list) strike(G, p, e, last ? dmg * 3 : dmg, { knock: last ? 300 : 30, src: 'bs_barrage', small: !last, fx: p.x, fy: p.y }, last && L >= 5);
              const fx = p.x + Math.cos(a + U.rand(-0.5, 0.5)) * U.rand(20, R * 0.8), fy = p.y - 18 + Math.sin(a + U.rand(-0.5, 0.5)) * U.rand(20, R * 0.8);
              FX.disc(fx, fy, 22, 0.12, '#ffd0d8', 0.8);
              FX.slash(fx, fy, a + Math.PI / 2, 22, 4, RED, 0.12, 0);
              if (i % 2 === 0) CA.Audio.play('punch', 0.4);
            });
          }
        },
      },
    ],
    ult: {
      id: 'bs_ult', name: 'Black Meteor', kanji: '隕', dur: () => 1.2,
      desc: 'Прыжок в небо и падение чёрным метеором. Все удары — ЧЁРНЫЕ ИСКРЫ.',
      levels: ['Прыжок и удар о землю: кратер радиусом 210, огромный урон, Поток на максимум.', 'Урон +25%.', 'Кратер 240.', 'Урон +30%, оглушение 2 сек.', 'Кратер 290 и три вторичных удара.'],
      cast(G, p, L) {
        const R = [210, 210, 240, 240, 290][L - 1] * p.area;
        const dmg = A.dmg(p, [150, 190, 200, 260, 300][L - 1]);
        p.invuln = Math.max(p.invuln, 1.3);
        p.state.airborne = 0.6;
        const t = A.densest(p.x, p.y, 360);
        const tx = t ? t.x : p.x, ty = t ? t.y : p.y;
        FX.burst(p.x, p.y, '#3a2a2a', 10, 160, 6, 0.5);
        G.telegraph({ shape: 'circle', x: tx, y: ty, r: R, t: 0.6, color: RED, friendly: true });
        G.later(0.6, () => {
          p.x = tx; p.y = ty; p.state.airborne = 0;
          p.state.flow = flowMax(p); p.state.flowT = 12;
          const list = A.inRadius(tx, ty, R, []);
          for (const e of list) strike(G, p, e, dmg, { knock: 520, src: 'bs_ult', stun: L >= 4 ? 2 : 1, fx: tx, fy: ty }, true);
          sparkFx(G, p, tx, ty - 10, true);
          FX.shock(tx, ty, R * 1.3, RED, 0.7); FX.disc(tx, ty, R, 0.5, RED, 0.9);
          FX.shards(tx, ty, '#3a2a2a', 26, 420); FX.smoke(tx, ty, '#1a1010', 12, 120, 30, 1.2);
          FX.decal(tx, ty, R * 0.8, '#000000', 6);
          for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; blackBolt(tx, ty, tx + Math.cos(a) * R, ty + Math.sin(a) * R, 5); }
          G.shake(20); CA.Audio.play('bigboom');
          if (L >= 5) for (let k = 0; k < 3; k++) G.later(0.25 + k * 0.2, () => {
            const a = Math.random() * TAU, x = tx + Math.cos(a) * R * 0.8, y = ty + Math.sin(a) * R * 0.8;
            for (const e of A.inRadius(x, y, R * 0.5, [])) strike(G, p, e, dmg * 0.5, { knock: 300, src: 'bs_ult' }, true);
            FX.shock(x, y, R * 0.6, RED, 0.4); G.shake(8); CA.Audio.play('boom');
          });
        });
      },
    },
    combos: [
      { id: 'bs_chain', name: 'Black Flash Chain', kanji: '鎖', a: 'bs_spark', al: 3, b: 'bs_barrage', bl: 3,
        desc: 'Каждая искра бьёт чёрной молнией 3 ближайших врагов и сокращает все перезарядки на 0.4 сек.' },
      { id: 'bs_counter', name: 'Counter Breaker', kanji: '撃', a: 'bs_counter', al: 3, b: 'bs_dash', bl: 3,
        desc: 'Стойка длится дольше, а каждая контратака автоматически запускает Breaker Dash сквозь врагов.' },
    ],
    init(G, p) {
      const st = p.state;
      st.ring = 0; st.flow = 0; st.flowT = 0;
      p.hooks.hurt.push((amt, src) => {
        if (st.airborne > 0) return 0;
        if (st.counter > 0) {
          if (st.counterCd > 0) return 0;
          st.counterCd = 0.25; st.counterHit = true;
          const L = p.lv.bs_counter || 1;
          const dmg = A.dmg(p, L >= 2 ? 110 : 85);
          let tx = p.x, ty = p.y;
          if (src && src.alive) { const a = Math.atan2(src.y - p.y, src.x - p.x); tx = src.x + Math.cos(a) * (src.r + 16); ty = src.y + Math.sin(a) * (src.r + 16); p.x = tx; p.y = ty; p.face = src.x < p.x ? -1 : 1; strike(G, p, src, dmg * 1.5, { knock: 500, src: 'bs_counter', bigFx: true }, true); }
          const R = (L >= 4 ? 170 : 130) * p.area;
          for (const e of A.inRadius(p.x, p.y, R, [])) if (e !== src) strike(G, p, e, dmg * 0.6, { knock: 350, src: 'bs_counter' });
          FX.shock(p.x, p.y, R * 1.2, RED, 0.5);
          FX.label(p.x, p.y - 80, 'COUNTER!', '#ffffff', 18, 1);
          p.invuln = 0.4;
          if (L >= 5) p.heal(p.maxHp * 0.08);
          if (p.combos.bs_counter) { const e = A.nearest(p.x, p.y, 300); breaker(G, p, p.lv.bs_dash || 1, e ? Math.atan2(e.y - p.y, e.x - p.x) : p.dirA, true); }
          return 0;
        }
        return amt;
      });
    },
    update(G, p, dt) {
      const st = p.state;
      st.ring += dt / PERIOD;
      if (st.ring >= 1) st.ring = 0;
      if (st.perfectFlash > 0) st.perfectFlash -= dt;
      if (st.sparkFxCd > 0) st.sparkFxCd -= dt;
      if (st.counterCd > 0) st.counterCd -= dt;
      if (st.flowT > 0) { st.flowT -= dt; if (st.flowT <= 0) st.flow = 0; }
      if (st.airborne > 0) { st.airborne -= dt; p.alpha = 0.15; } else p.alpha = 1;
      if (st.counter > 0) {
        st.counter -= dt;
        if (st.counter <= 0 && !st.counterHit) {
          const R = 110 * p.area;
          A.hitCircle(p.x, p.y, R, A.dmg(p, 35), { src: 'bs_counter', knock: 200 });
          FX.shock(p.x, p.y, R, RED, 0.35);
        }
      }
    },
    drawUnder(ctx, G, p) {
      const st = p.state;
      // timing ring around the striker
      const w = K.window(p);
      const r = 18 + (1 - st.ring) * 46;
      const inWin = st.ring >= 1 - w;
      ctx.globalAlpha = 0.35 + (inWin ? 0.5 : 0);
      ctx.strokeStyle = inWin ? '#ffffff' : RED; ctx.lineWidth = inWin ? 3 : 1.5;
      ctx.beginPath(); ctx.ellipse(p.x, p.y - 4, r, r * 0.45, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.25; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(p.x, p.y - 4, 18, 8, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      if (st.counter > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(255,36,64,0.7)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y - 20, 34 + Math.sin(p.t * 30) * 2, 0, TAU); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
    },
    drawOver(ctx, G, p) {
      const st = p.state;
      if (st.flow > 0) {
        for (let i = 0; i < st.flow; i++) {
          const a = p.t * 3 + i * TAU / st.flow;
          FX.glow(ctx, p.x + Math.cos(a) * 24, p.y - 22 + Math.sin(a) * 10, 7, RED, 0.9);
        }
        if (Math.random() < st.flow * 0.04) { const a = Math.random() * TAU; blackBolt(p.x, p.y - 22, p.x + Math.cos(a) * 30, p.y - 22 + Math.sin(a) * 30, 1.5); }
      }
      if (st.nextSpark) FX.glow(ctx, p.x, p.y - 22, 30, '#ffffff', 0.5 + Math.sin(p.t * 20) * 0.2);
    },
  };
  CA.Kits.striker = K;
})();
