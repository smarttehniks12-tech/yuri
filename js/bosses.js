/* bosses.js — 5 Special Grade curses with unique models, attacks, telegraphs and 2nd phases */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U;
  const TAU = U.TAU;
  const OUT = '#08040a';

  function aimAt(e, p) { return Math.atan2(p.y - e.y, p.x - e.x); }
  function fan(G, e, n, spread, spd, dmg, color, kind, r) {
    const a0 = aimAt(e, G.player);
    for (let i = 0; i < n; i++) {
      const a = a0 + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0);
      G.enemyShot(e.x + Math.cos(a) * e.r * 0.6, e.y + Math.sin(a) * e.r * 0.6, Math.cos(a) * spd, Math.sin(a) * spd, r || 6, dmg, color, kind, true);
    }
  }
  function ringShots(G, x, y, n, spd, dmg, color, off, r) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (off || 0);
      G.enemyShot(x, y, Math.cos(a) * spd, Math.sin(a) * spd, r || 6, dmg, color, 'orb', true);
    }
  }
  function moveToward(e, G, dt, keep, spdMul) {
    const p = G.player;
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    const slow = Math.sqrt(G.enemySlowMul) * (e.stunT > 0 ? 0.3 : 1);
    const sp = e.spd * (spdMul || 1) * slow;
    if (d > keep + 20) { e.x += dx / d * sp * dt; e.y += dy / d * sp * dt; }
    else if (d < keep - 40) { e.x -= dx / d * sp * 0.6 * dt; e.y -= dy / d * sp * 0.6 * dt; }
    else { e.x += -dy / d * sp * 0.4 * dt * e.orbit; e.y += dx / d * sp * 0.4 * dt * e.orbit; }
    e.face = dx < 0 ? -1 : 1;
  }

  // shared boss runtime
  function baseUpdate(e, G, dt, def) {
    if (e.stunT > 0) e.stunT -= dt;
    if (e.slowT > 0) e.slowT -= dt;
    if (e.burnT > 0) { e.burnT -= dt; G.hitEnemy(e, e.burnDps * dt, { noText: true, noCe: true, silent: true }); }
    if (e.markT > 0) { e.markT -= dt; if (e.markT <= 0) e.marks = 0; }
    if (e.intro > 0) {
      e.intro -= dt; e.immune = 0.2;
      if (Math.random() < 0.6) CA.FX.burst(e.x + U.rand(-e.r, e.r), e.y + e.r * 0.5, def.color, 2, 160, 5, 0.6);
      return false;
    }
    if (e.phase === 1 && e.hp < e.maxHp * 0.5) {
      e.phase = 2;
      e.immune = 1.2;
      G.banner('ФАЗА 2', def.ru + ' в ярости!', def.color, 1.8);
      G.shake(16); G.flash(def.color, 0.35);
      CA.FX.ring(e.x, e.y, e.r, 420, 0.8, def.color, 8);
      CA.FX.burst(e.x, e.y, def.color, 40, 380, 7, 1);
      CA.Audio.play('boss', 0.8);
      // clear nearby trash (dramatic shockwave)
      G.forEnemiesIn(e.x, e.y, 260, (o) => { if (!o.boss) { const a = Math.atan2(o.y - e.y, o.x - e.x); o.kvx += Math.cos(a) * 500; o.kvy += Math.sin(a) * 500; } });
      if (def.onPhase2) def.onPhase2(e, G);
    }
    if (def.onTick) def.onTick(e, G, dt);
    const atkRate = (G.enemyNoAttack ? 0.3 : 1) * (e.stunT > 0 ? 0 : 1) * (e.phase === 2 ? 1.35 : 1);
    if (e.busy > 0) { e.busy -= dt * atkRate; return true; }
    e.atkT -= dt * atkRate;
    if (e.atkT <= 0) {
      const list = e.phase === 2 && def.attacks2 ? def.attacks2 : def.attacks;
      let pick;
      do { pick = U.choice(list); } while (list.length > 1 && pick === e.lastAtk);
      e.lastAtk = pick;
      const rec = def[pick](e, G) || 1.5;
      e.atkT = rec * (e.phase === 2 ? 0.75 : 1);
    }
    return true;
  }

  function drawBossShadow(ctx, e, k) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * (k || 0.9), e.r * 1.1, e.r * 0.32, 0, 0, TAU); ctx.fill();
  }
  function introAlpha(e) { return e.intro > 0 ? 1 - e.intro / e.introMax : 1; }

  const DEFS = {
    // ===================== 1. HOLLOW HEADMASTER =====================
    headmaster: {
      name: 'HOLLOW HEADMASTER', ru: 'Пустой Директор', title: 'Кукловод заброшенной школы', color: '#c8a0ff', r: 40, hp: 7000, spd: 55,
      desc: 'Марионетка на проклятых нитях. Атакует веерами игл, нитями-ловушками и призывает кукол.',
      attacks: ['needleFan', 'snare', 'puppets', 'needleFan'],
      attacks2: ['needleFan', 'snare', 'waltz', 'puppets', 'waltz'],
      update(e, G, dt) {
        if (!baseUpdate(e, G, dt, this)) return;
        if (!e.busy || e.busy <= 0) moveToward(e, G, dt, 190, e.phase === 2 ? 1.4 : 1);
        if (e.spin > 0) {
          e.spin -= dt;
          e.spinA += dt * 2.6;
          e.spinCd -= dt;
          if (e.spinCd <= 0) {
            e.spinCd = 0.09;
            for (let k = 0; k < 3; k++) {
              const a = e.spinA + k * TAU / 3;
              G.enemyShot(e.x, e.y, Math.cos(a) * 190, Math.sin(a) * 190, 5, 11 * G.dmgScale, '#c8a0ff', 'needle', true);
            }
          }
        }
      },
      needleFan(e, G) {
        e.busy = 1.0; e.pose = 1;
        for (let v = 0; v < 3; v++) G.later(0.25 + v * 0.3, () => { if (e.alive) { fan(G, e, e.phase === 2 ? 11 : 9, 1.25, 270, 12 * G.dmgScale, '#d8c0ff', 'needle', 5); CA.Audio.play('shoot', 0.6); } });
        return 2.2;
      },
      snare(e, G) {
        e.busy = 0.6; e.pose = 2;
        const p = G.player, n = e.phase === 2 ? 6 : 4;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI;
          const ox = U.rand(-60, 60), oy = U.rand(-60, 60);
          const x1 = p.x + ox - Math.cos(a) * 420, y1 = p.y + oy - Math.sin(a) * 420;
          const x2 = p.x + ox + Math.cos(a) * 420, y2 = p.y + oy + Math.sin(a) * 420;
          G.telegraph({ shape: 'line', x: x1, y: y1, x2, y2, w: 20, t: 1.1 + i * 0.12, color: '#c8a0ff', onFire: () => {
            G.hurtLine(x1, y1, x2, y2, 20, 18 * G.dmgScale);
            CA.FX.line(x1, y1, x2, y2, 3, '#e8d8ff', 0.3);
            CA.Audio.play('slash', 0.5);
          } });
        }
        return 2.4;
      },
      puppets(e, G) {
        e.busy = 0.8; e.pose = 2;
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * TAU;
          const t = i < 5 ? 'larva' : 'twinface';
          CA.Enemies.spawn(G, t, e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70, { noXp: true });
          CA.FX.burst(e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70, '#c8a0ff', 6, 100, 4, 0.5);
        }
        CA.Audio.play('summon', 0.7);
        return 2.6;
      },
      waltz(e, G) {
        e.busy = 3.0; e.spin = 3.0; e.spinA = Math.random() * TAU; e.spinCd = 0; e.pose = 3;
        G.banner('', 'Вальс марионетки', '#c8a0ff', 1);
        return 3.6;
      },
      draw(ctx, e, G) {
        const a = introAlpha(e), t = e.t;
        const lift = e.intro > 0 ? (e.intro / e.introMax) * 160 : 0;
        const x = e.x, y = e.y - lift, r = e.r;
        drawBossShadow(ctx, e, 1.1);
        ctx.save(); ctx.globalAlpha = a;
        // strings going up
        ctx.strokeStyle = 'rgba(220,200,255,0.45)'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (const sx of [-0.9, -0.4, 0.4, 0.9]) { ctx.moveTo(x + sx * r, y - r * 0.2 + Math.sin(t * 3 + sx) * 4); ctx.lineTo(x + sx * r * 1.6, y - 700); }
        ctx.stroke();
        CA.FX.glow(ctx, x, y, r * 2.4, '#7a3aff', 0.35);
        const spinR = e.spin > 0 ? e.spinA : Math.sin(t * 1.5) * 0.08;
        ctx.translate(x, y);
        ctx.rotate(spinR * (e.spin > 0 ? 1 : 1));
        // robe
        const gr = ctx.createLinearGradient(0, -r, 0, r * 1.3);
        gr.addColorStop(0, '#2a1840'); gr.addColorStop(1, '#0a0612');
        ctx.fillStyle = gr; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-r * 0.45, -r * 0.6);
        ctx.lineTo(r * 0.45, -r * 0.6);
        ctx.quadraticCurveTo(r * 1.0, r * 0.3, r * 0.95 + Math.sin(t * 4) * 4, r * 1.25);
        for (let i = 0; i < 6; i++) ctx.lineTo(r * (0.75 - i * 0.32), r * (1.05 + (i % 2) * 0.22));
        ctx.quadraticCurveTo(-r * 1.0, r * 0.3, -r * 0.45, -r * 0.6);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // gold trims
        ctx.strokeStyle = '#b8902a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -r * 0.55); ctx.lineTo(0, r * 1.1); ctx.stroke();
        // arms with needle fingers
        const armA = e.pose === 1 ? -0.3 : e.pose === 2 ? -1.2 : 0.4;
        for (const s of [-1, 1]) {
          ctx.save(); ctx.translate(s * r * 0.5, -r * 0.4); ctx.rotate(s * (0.9 + armA) + Math.sin(t * 3) * 0.1 * s);
          ctx.strokeStyle = '#120818'; ctx.lineWidth = 7; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, r * 0.75); ctx.stroke();
          ctx.strokeStyle = '#e8e0ff'; ctx.lineWidth = 1.6;
          for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(0, r * 0.75); ctx.lineTo(k * 4, r * 1.15); ctx.stroke(); }
          ctx.restore();
        }
        // porcelain mask head
        ctx.fillStyle = '#efe8f4'; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(0, -r * 0.95, r * 0.42, r * 0.52, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#05020a';
        ctx.beginPath(); ctx.ellipse(-r * 0.16, -r * 1.0, r * 0.1, r * 0.13, 0, 0, TAU); ctx.ellipse(r * 0.16, -r * 1.0, r * 0.1, r * 0.13, 0, 0, TAU); ctx.fill();
        CA.FX.glow(ctx, -r * 0.16, -r * 1.0, 8, '#c8a0ff', 0.9); CA.FX.glow(ctx, r * 0.16, -r * 1.0, 8, '#c8a0ff', 0.9);
        ctx.strokeStyle = '#05020a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-r * 0.15, -r * 0.7); ctx.lineTo(r * 0.15, -r * 0.7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 1.45); ctx.lineTo(r * 0.02, -r * 1.15); ctx.lineTo(r * 0.14, -r * 0.95); ctx.stroke();
        // academic cap
        ctx.fillStyle = '#120a1a'; ctx.fillRect(-r * 0.5, -r * 1.52, r, r * 0.12);
        ctx.fillRect(-r * 0.3, -r * 1.48, r * 0.6, r * 0.2);
        ctx.restore();
        if (e.hitFlash > 0) CA.FX.glow(ctx, x, y, r * 1.6, '#ffffff', e.hitFlash * 4);
      },
    },

    // ===================== 2. NEON MAW =====================
    maw: {
      name: 'NEON MAW', ru: 'Неоновая Пасть', title: 'Пожиратель ночного города', color: '#ff3ab0', r: 48, hp: 8500, spd: 60,
      desc: 'Гигантская пасть на четырёх лапах. Топчет землю ударными волнами, извергает кислоту и делает рывки.',
      attacks: ['stomp', 'vomit', 'lunge', 'stomp'],
      attacks2: ['stomp', 'vomit', 'lunge', 'lunge', 'brood'],
      update(e, G, dt) {
        if (!baseUpdate(e, G, dt, this)) return;
        if (e.dash > 0) {
          e.dash -= dt;
          e.x += e.ax * 760 * dt; e.y += e.ay * 760 * dt;
          CA.Enemies.physics(G, e, dt);
          if (U.dist(e.x, e.y, G.player.x, G.player.y) < e.r + G.player.r) G.player.hurt(26 * G.dmgScale, e);
          if (Math.random() < 0.7) CA.FX.smoke(e.x, e.y + e.r * 0.6, '#3a1030', 1, 40, 14, 0.6);
          if (e.phase === 2 && Math.random() < 0.25) G.hazard(e.x, e.y, 40, 4, 10 * G.dmgScale, '#9aff3a');
          return;
        }
        if (!e.busy || e.busy <= 0) moveToward(e, G, dt, 120, 1);
      },
      onPhase2(e, G) { this.brood(e, G); },
      stomp(e, G) {
        e.busy = 1.0; e.pose = 1;
        G.telegraph({ shape: 'circle', x: e.x, y: e.y, r: 170, t: 0.85, color: '#ff3ab0', onFire: () => {
          if (!e.alive) return;
          G.hurtCircle(e.x, e.y, 170, 22 * G.dmgScale);
          CA.FX.shock(e.x, e.y, 200, '#ff6ad0', 0.6); G.shake(14); CA.Audio.play('boom');
          ringShots(G, e.x, e.y, e.phase === 2 ? 22 : 16, 170, 11 * G.dmgScale, '#ff6ad0', Math.random());
          if (e.phase === 2) G.later(0.35, () => e.alive && ringShots(G, e.x, e.y, 22, 140, 11 * G.dmgScale, '#3ae0ff', Math.random()));
        } });
        return 2.2;
      },
      vomit(e, G) {
        e.busy = 1.2; e.pose = 2;
        const a = aimAt(e, G.player);
        for (let i = 0; i < 6; i++) {
          const aa = a + (Math.random() - 0.5) * 0.9, dd = U.rand(80, 300);
          const x = e.x + Math.cos(aa) * dd, y = e.y + Math.sin(aa) * dd;
          G.telegraph({ shape: 'circle', x, y, r: 55, t: 0.7 + i * 0.08, color: '#9aff3a', onFire: () => {
            G.hazard(x, y, 55, 5, 14 * G.dmgScale, '#9aff3a');
            CA.FX.burst(x, y, '#9aff3a', 10, 140, 5, 0.5);
          } });
        }
        CA.Audio.play('blood', 0.8);
        return 2.4;
      },
      lunge(e, G) {
        const a = aimAt(e, G.player);
        e.ax = Math.cos(a); e.ay = Math.sin(a);
        e.busy = 1.4; e.pose = 3;
        G.telegraph({ shape: 'line', x: e.x, y: e.y, x2: e.x + e.ax * 520, y2: e.y + e.ay * 520, w: e.r * 2, t: 0.7, color: '#ff3ab0', onFire: () => { if (e.alive) { e.dash = 0.68; CA.Audio.play('whoosh'); } } });
        return 2.2;
      },
      brood(e, G) {
        for (let i = 0; i < 4; i++) {
          const a = i / 4 * TAU + 0.4;
          CA.Enemies.spawn(G, 'spitter', e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90, { noXp: true });
        }
        CA.Audio.play('summon', 0.7);
        return 2;
      },
      draw(ctx, e, G) {
        const a = introAlpha(e), t = e.t, r = e.r;
        const rise = e.intro > 0 ? (e.intro / e.introMax) : 0;
        drawBossShadow(ctx, e, 1.0);
        ctx.save(); ctx.globalAlpha = a;
        ctx.translate(e.x, e.y + rise * 40);
        ctx.scale(1, 1 - rise * 0.6);
        CA.FX.glow(ctx, 0, 0, r * 2.6, '#ff3ab0', 0.3);
        // legs
        ctx.strokeStyle = '#1a0a18'; ctx.lineWidth = 11; ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
          const sx = i < 2 ? -1 : 1, fw = i % 2 ? 0.35 : -0.35;
          const step = Math.sin(t * 8 + i * 1.6) * 6 * (e.dash > 0 ? 2 : 1);
          ctx.beginPath(); ctx.moveTo(sx * r * 0.5, r * 0.3); ctx.lineTo(sx * r * 1.05, r * 0.5 + fw * 10); ctx.lineTo(sx * r * (0.9 + fw * 0.2) + step, r * 1.05); ctx.stroke();
        }
        // body
        const gr = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 4, 0, 0, r * 1.1);
        gr.addColorStop(0, '#5a2a5a'); gr.addColorStop(1, '#14061a');
        ctx.fillStyle = gr; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 0, r * 1.05, r * 0.85, 0, 0, TAU); ctx.fill(); ctx.stroke();
        // vertical giant mouth
        const open = e.pose === 2 ? 0.75 : e.pose === 1 ? 0.25 : 0.45 + Math.sin(t * 3) * 0.1;
        ctx.fillStyle = '#0a0006';
        ctx.beginPath(); ctx.ellipse(r * 0.15, r * 0.05, r * 0.42 * open + 4, r * 0.62, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#ff3ab0'; ctx.lineWidth = 2.5;
        ctx.stroke();
        CA.FX.glow(ctx, r * 0.15, r * 0.05, r * 0.7, '#ff3ab0', 0.4);
        // neon teeth
        ctx.strokeStyle = '#ffd0f0'; ctx.lineWidth = 2;
        for (let i = -3; i <= 3; i++) {
          const yy = r * 0.05 + i * r * 0.15;
          const w = Math.sqrt(Math.max(0, 1 - (i / 4) * (i / 4))) * (r * 0.42 * open + 4);
          ctx.beginPath(); ctx.moveTo(r * 0.15 - w, yy); ctx.lineTo(r * 0.15 - w + 9, yy + 3); ctx.moveTo(r * 0.15 + w, yy); ctx.lineTo(r * 0.15 + w - 9, yy + 3); ctx.stroke();
        }
        // many cyan eyes
        const eyes = [[-0.65, -0.35], [-0.5, -0.6], [-0.75, 0.05], [0.7, -0.5], [0.8, -0.1], [-0.2, -0.7], [0.45, -0.72]];
        for (let i = 0; i < eyes.length; i++) {
          const [ex, ey] = eyes[i];
          const blink = Math.sin(t * 2 + i * 1.3) > 0.95 ? 0.2 : 1;
          ctx.fillStyle = '#e0faff'; ctx.beginPath(); ctx.ellipse(ex * r, ey * r, 5, 5 * blink, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#00c8ff'; ctx.beginPath(); ctx.arc(ex * r + 1, ey * r, 2.6 * blink, 0, TAU); ctx.fill();
        }
        // neon sign shard stuck in back
        ctx.strokeStyle = '#3ae0ff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.8); ctx.lineTo(-r * 0.1, -r * 1.2); ctx.lineTo(r * 0.15, -r * 0.85); ctx.stroke();
        CA.FX.glow(ctx, -r * 0.1, -r * 1.05, 26, '#3ae0ff', 0.6);
        ctx.restore();
        if (e.hitFlash > 0) CA.FX.glow(ctx, e.x, e.y, r * 1.6, '#ffffff', e.hitFlash * 4);
      },
    },

    // ===================== 3. LAST TRAIN =====================
    train: {
      name: 'LAST TRAIN', ru: 'Последний Поезд', title: 'Призрак, что не доехал до конечной', color: '#3affc8', r: 46, hp: 10500, spd: 70,
      desc: 'Костяной поезд-призрак. Проносится по рельсам через всю арену, светит смертоносным прожектором.',
      attacks: ['charge', 'headlight', 'passengers', 'charge'],
      attacks2: ['doubleCharge', 'headlight', 'sparks', 'charge', 'passengers'],
      onTick(e, G) {
        // trailing cars follow the head
        const tr = e.trail;
        if (!tr) return;
        const last = tr[0];
        if (!last || U.dist(last.x, last.y, e.x, e.y) > 8) { tr.unshift({ x: e.x, y: e.y }); if (tr.length > 60) tr.pop(); }
      },
      update(e, G, dt) {
        if (!e.trail) e.trail = [];
        if (!baseUpdate(e, G, dt, this)) return;
        if (e.dash > 0) {
          e.dash -= dt;
          e.x += e.ax * 980 * dt; e.y += e.ay * 980 * dt;
          if (U.segDist2(G.player.x, G.player.y, e.x - e.ax * 30, e.y - e.ay * 30, e.x + e.ax * 30, e.y + e.ay * 30) < (e.r + G.player.r) ** 2) G.player.hurt(30 * G.dmgScale, e);
          // trains run over cursed spirits too
          G.forEnemiesIn(e.x, e.y, e.r, (o) => { if (!o.boss) G.hitEnemy(o, 200, { noCe: true, noCrit: true, noText: true }); });
          if (Math.random() < 0.8) CA.FX.sparks(e.x - e.ax * e.r, e.y - e.ay * e.r + e.r * 0.5, '#ffe08a', 2, 300, Math.atan2(-e.ay, -e.ax), 0.8);
          const W = CA.Locations.WORLD;
          e.x = U.clamp(e.x, -200, W + 200); e.y = U.clamp(e.y, -200, W + 200);
          if (e.dash <= 0) {
            // re-enter from a side near player
            if (e.queue > 0) { e.queue--; G.later(0.1, () => this.charge(e, G, true)); }
            else {
              const a = Math.random() * TAU;
              e.x = G.player.x + Math.cos(a) * 320; e.y = G.player.y + Math.sin(a) * 320;
              e.trail.length = 0;
              CA.FX.burst(e.x, e.y, '#3affc8', 20, 200, 5, 0.6);
            }
          }
          return;
        }
        if (e.beam > 0) {
          e.beam -= dt;
          e.beamA += e.beamV * dt;
          const L = 420, x2 = e.x + Math.cos(e.beamA) * L, y2 = e.y + Math.sin(e.beamA) * L;
          e.beamTick -= dt;
          if (e.beamTick <= 0) { e.beamTick = 0.15; G.hurtLine(e.x, e.y, x2, y2, 34, 9 * G.dmgScale); }
          return;
        }
        if (!e.busy || e.busy <= 0) moveToward(e, G, dt, 230, 1);
      },
      charge(e, G, chained) {
        const p = G.player;
        const a = Math.random() * TAU;
        const sx = p.x + Math.cos(a) * 560, sy = p.y + Math.sin(a) * 560;
        e.x = sx; e.y = sy; if (e.trail) e.trail.length = 0;
        const da = Math.atan2(p.y - sy, p.x - sx);
        e.ax = Math.cos(da); e.ay = Math.sin(da);
        e.busy = 2.2; e.hidden = 1.15;
        G.telegraph({ shape: 'line', x: sx, y: sy, x2: sx + e.ax * 1150, y2: sy + e.ay * 1150, w: 92, t: 1.15, color: '#3affc8', onFire: () => { if (e.alive) { e.dash = 1.2; e.hidden = 0; CA.Audio.play('whoosh'); G.shake(8); } } });
        CA.Audio.play('warn');
        return chained ? 1 : 2.4;
      },
      doubleCharge(e, G) { e.queue = 1; return this.charge(e, G) + 1.4; },
      headlight(e, G) {
        e.busy = 0.1;
        const a = aimAt(e, G.player);
        const dir = Math.random() < 0.5 ? 1 : -1;
        e.beamA = a - dir * 1.3; e.beamV = dir * 1.3; e.beamTick = 0;
        G.telegraph({ shape: 'cone', x: e.x, y: e.y, a: a, arc: 2.6, r: 420, t: 0.8, color: '#fff5a0', onFire: () => { if (e.alive) { e.beam = 2.0; CA.Audio.play('beam'); } } });
        return 3.2;
      },
      passengers(e, G) {
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * TAU;
          CA.Enemies.spawn(G, 'flicker', e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, { noXp: true });
        }
        CA.Audio.play('summon', 0.7);
        return 2;
      },
      sparks(e, G) {
        const p = G.player;
        for (let i = 0; i < 10; i++) {
          const x = p.x + U.rand(-200, 200), y = p.y + U.rand(-200, 200);
          G.telegraph({ shape: 'circle', x, y, r: 46, t: 0.6 + i * 0.12, color: '#ffe08a', onFire: () => {
            G.hurtCircle(x, y, 46, 14 * G.dmgScale);
            CA.FX.sparks(x, y, '#ffe08a', 10, 260); CA.FX.disc(x, y, 50, 0.25, '#ffe08a', 0.7);
          } });
        }
        return 2.6;
      },
      draw(ctx, e, G) {
        if (e.hidden > 0) return;
        const a = introAlpha(e), t = e.t, r = e.r;
        ctx.save(); ctx.globalAlpha = a;
        // cars (trail)
        const tr = e.trail || [];
        for (let i = 4; i >= 1; i--) {
          const idx = Math.min(tr.length - 1, i * 11);
          if (idx < 1) continue;
          const c = tr[idx];
          ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(c.x, c.y + r * 0.7, r * 0.9, r * 0.25, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#1e2a28'; ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.roundRect ? ctx.roundRect(c.x - r * 0.8, c.y - r * 0.7, r * 1.6, r * 1.3, 8) : ctx.rect(c.x - r * 0.8, c.y - r * 0.7, r * 1.6, r * 1.3); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(58,255,200,0.35)';
          for (let k = 0; k < 3; k++) ctx.fillRect(c.x - r * 0.65 + k * r * 0.45, c.y - r * 0.5, r * 0.32, r * 0.35);
          ctx.fillStyle = '#d8d0c0';
          ctx.fillRect(c.x - r * 0.6, c.y - r * 0.5 + Math.sin(t * 5 + i) * 2, 3, 6);
        }
        drawBossShadow(ctx, e, 0.8);
        ctx.translate(e.x, e.y);
        CA.FX.glow(ctx, 0, 0, r * 2.4, '#3affc8', 0.25);
        // locomotive skull front
        const gr = ctx.createLinearGradient(-r, -r, r, r);
        gr.addColorStop(0, '#3a4a46'); gr.addColorStop(1, '#0c1412');
        ctx.fillStyle = gr; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-r * 0.9, -r * 0.6); ctx.lineTo(r * 0.9, -r * 0.6); ctx.lineTo(r * 1.0, r * 0.7); ctx.lineTo(-r * 1.0, r * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
        // bone ribs
        ctx.strokeStyle = '#d8d0b8'; ctx.lineWidth = 3;
        for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * r * 0.35, -r * 0.55); ctx.quadraticCurveTo(k * r * 0.42, 0, k * r * 0.3, r * 0.65); ctx.stroke(); }
        // jaw/grill
        ctx.fillStyle = '#0a0806'; ctx.fillRect(-r * 0.7, r * 0.3, r * 1.4, r * 0.32);
        CA.Sprites.teeth(ctx, 0, r * 0.3, r * 1.4, r * 0.18, 9, false);
        // smokestack
        ctx.fillStyle = '#1a1e1c'; ctx.fillRect(-r * 0.6, -r * 1.05, r * 0.3, r * 0.48);
        if (Math.random() < 0.3) CA.FX.smoke(e.x - r * 0.45, e.y - r * 1.1, '#2a3a36', 1, 20, 14, 1.2);
        // headlight eye
        const hb = 0.7 + Math.sin(t * 6) * 0.2;
        ctx.fillStyle = '#fff8c8'; ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 0.24, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ff3a2a'; ctx.beginPath(); ctx.ellipse(0, -r * 0.15, r * 0.06, r * 0.18, 0, 0, TAU); ctx.fill();
        CA.FX.glow(ctx, 0, -r * 0.15, r * 1.1, '#fff5a0', hb);
        ctx.restore();
        if (e.beam > 0) {
          const L = 420, x2 = e.x + Math.cos(e.beamA) * L, y2 = e.y + Math.sin(e.beamA) * L;
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = 'rgba(255,245,160,0.25)'; ctx.lineWidth = 60; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,250,210,0.8)'; ctx.lineWidth = 22; ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
        if (e.hitFlash > 0) CA.FX.glow(ctx, e.x, e.y, r * 1.6, '#ffffff', e.hitFlash * 4);
      },
    },

    // ===================== 4. EYELESS SERAPH =====================
    seraph: {
      name: 'EYELESS SERAPH', ru: 'Безглазый Серафим', title: 'Страж Запретного измерения', color: '#ffd27a', r: 44, hp: 13500, spd: 50,
      desc: 'Геометрический ангел. Вращающиеся лучи, спирали снарядов и печати, делающие его неуязвимым.',
      attacks: ['cross', 'spiral', 'blink', 'spiral'],
      attacks2: ['cross', 'spiral', 'blink', 'cross', 'spiral'],
      onPhase2(e, G) { this.seal(e, G); },
      onTick(e, G, dt) {
        // sealed: damage reduced while seal orbs alive
        if (e.seals) {
          let alive = 0;
          for (const s of e.seals) if (s.alive) alive++;
          e.armor = alive > 0 ? 0.9 : 0;
          if (alive === 0) { e.seals = null; G.banner('', 'Печати разрушены!', '#ffd27a', 1.2); CA.Audio.play('bigboom', 0.6); G.shake(12); e.stunT = 2; }
        }
        if (e.phase === 2 && !e.seal2 && e.hp < e.maxHp * 0.25) { e.seal2 = true; this.seal(e, G); }
      },
      update(e, G, dt) {
        if (!baseUpdate(e, G, dt, this)) return;
        if (e.lasers > 0) {
          e.lasers -= dt; e.laserA += e.laserV * dt;
          e.beamTick -= dt;
          const n = e.phase === 2 ? 6 : 4;
          if (e.beamTick <= 0) {
            e.beamTick = 0.12;
            for (let k = 0; k < n; k++) { const a = e.laserA + k * TAU / n; G.hurtLine(e.x, e.y, e.x + Math.cos(a) * 600, e.y + Math.sin(a) * 600, 22, 8 * G.dmgScale); }
          }
          return;
        }
        if (e.spiral > 0) {
          e.spiral -= dt; e.spinA += dt * (e.phase === 2 ? 2.2 : 1.7);
          e.spinCd -= dt;
          if (e.spinCd <= 0) {
            e.spinCd = 0.1;
            const arms = e.phase === 2 ? 4 : 3;
            for (let k = 0; k < arms; k++) { const a = e.spinA + k * TAU / arms; G.enemyShot(e.x, e.y, Math.cos(a) * 170, Math.sin(a) * 170, 6, 11 * G.dmgScale, '#ffd27a', 'orb', true); }
          }
          return;
        }
        if (!e.busy || e.busy <= 0) moveToward(e, G, dt, 230, 1);
      },
      cross(e, G) {
        const n = e.phase === 2 ? 6 : 4;
        e.laserA = Math.random() * TAU; e.laserV = (Math.random() < 0.5 ? 1 : -1) * 0.75;
        for (let k = 0; k < n; k++) {
          const a = e.laserA + k * TAU / n;
          G.telegraph({ shape: 'line', x: e.x, y: e.y, x2: e.x + Math.cos(a) * 600, y2: e.y + Math.sin(a) * 600, w: 22, t: 0.9, color: '#ffd27a', onFire: k ? null : () => { if (e.alive) { e.lasers = 3.2; e.beamTick = 0; CA.Audio.play('beam'); } } });
        }
        e.busy = 0.9;
        return 4.6;
      },
      spiral(e, G) { e.spiral = 3.0; e.spinA = Math.random() * TAU; e.spinCd = 0; return 3.8; },
      blink(e, G) {
        const p = G.player;
        const a = Math.random() * TAU;
        const x = p.x + Math.cos(a) * 130, y = p.y + Math.sin(a) * 130;
        e.busy = 1.0;
        G.telegraph({ shape: 'circle', x, y, r: 110, t: 0.9, color: '#ffd27a', onFire: () => {
          if (!e.alive) return;
          CA.FX.burst(e.x, e.y, '#ffd27a', 16, 200, 5, 0.5);
          e.x = x; e.y = y;
          G.hurtCircle(x, y, 110, 22 * G.dmgScale);
          CA.FX.ring(x, y, 10, 140, 0.4, '#fff0b0', 6); CA.FX.disc(x, y, 130, 0.3, '#ffd27a', 0.8);
          ringShots(G, x, y, 20, 160, 10 * G.dmgScale, '#ffd27a', 0);
          CA.Audio.play('boom', 0.7); G.shake(8);
        } });
        return 2.4;
      },
      seal(e, G) {
        e.seals = [];
        for (let k = 0; k < 4; k++) {
          const o = CA.Enemies.spawn(G, 'eyebat', e.x, e.y, { hpMul: 14, noXp: true, scale: 1.3 });
          o.sealOf = e; o.sealA = k * TAU / 4; o.def = SEAL_DEF; o.boss = SEAL_BEHAVIOR;
          e.seals.push(o);
        }
        G.banner('', 'Печати Серафима: разбейте 4 печати!', '#ffd27a', 2.2);
        CA.Audio.play('shield');
        return 1;
      },
      draw(ctx, e, G) {
        const a = introAlpha(e), t = e.t, r = e.r;
        const descend = e.intro > 0 ? (e.intro / e.introMax) * 200 : 0;
        drawBossShadow(ctx, e, 1.3);
        ctx.save(); ctx.globalAlpha = a;
        ctx.translate(e.x, e.y - 14 - descend + Math.sin(t * 2) * 5);
        CA.FX.glow(ctx, 0, 0, r * 3.2, '#ffd27a', 0.35);
        // wings: triangles of light
        ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 6; k++) {
          const s = k < 3 ? -1 : 1, i = k % 3;
          const ang = s * (0.4 + i * 0.45) + Math.sin(t * 2 + i) * 0.08;
          ctx.save(); ctx.rotate(ang - Math.PI / 2 * s);
          ctx.fillStyle = 'rgba(255,220,140,' + (0.18 + i * 0.05) + ')';
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * r * (2.1 - i * 0.3), -r * 0.25); ctx.lineTo(s * r * (1.8 - i * 0.3), r * 0.25); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        ctx.globalCompositeOperation = 'source-over';
        // rotating rings
        ctx.strokeStyle = '#ffe8b0'; ctx.lineWidth = 2;
        for (let k = 0; k < 3; k++) {
          ctx.save(); ctx.rotate(t * (0.6 + k * 0.4) * (k % 2 ? -1 : 1));
          ctx.beginPath(); ctx.ellipse(0, 0, r * (0.9 + k * 0.25), r * (0.35 + k * 0.1), k * 0.6, 0, TAU); ctx.stroke();
          for (let j = 0; j < 6; j++) { const aa = j * TAU / 6; ctx.fillStyle = '#fff4d0'; ctx.fillRect(Math.cos(aa) * r * (0.9 + k * 0.25) - 2, Math.sin(aa) * r * (0.35 + k * 0.1) - 2, 4, 4); }
          ctx.restore();
        }
        // diamond core
        const gr = ctx.createLinearGradient(0, -r, 0, r);
        gr.addColorStop(0, '#fff6dc'); gr.addColorStop(0.5, '#d8a84a'); gr.addColorStop(1, '#6a4a10');
        ctx.fillStyle = gr; ctx.strokeStyle = '#3a2808'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(0, -r * 0.95); ctx.lineTo(r * 0.45, 0); ctx.lineTo(0, r * 0.95); ctx.lineTo(-r * 0.45, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        // closed sewn eye
        ctx.strokeStyle = '#3a1808'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-r * 0.22, 0); ctx.quadraticCurveTo(0, r * 0.12, r * 0.22, 0); ctx.stroke();
        for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * r * 0.08, -r * 0.04 + Math.abs(k) * 1); ctx.lineTo(k * r * 0.08, r * 0.1); ctx.stroke(); }
        // halo
        ctx.strokeStyle = '#fff0b0'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, -r * 1.2, r * 0.45, r * 0.12, 0, 0, TAU); ctx.stroke();
        CA.FX.glow(ctx, 0, -r * 1.2, r * 0.7, '#ffd27a', 0.6);
        if (e.armor > 0) {
          ctx.strokeStyle = 'rgba(255,230,150,' + (0.5 + Math.sin(t * 8) * 0.2) + ')'; ctx.lineWidth = 4;
          ctx.beginPath();
          for (let k = 0; k <= 6; k++) { const aa = k * TAU / 6 + t; const px = Math.cos(aa) * r * 1.5, py = Math.sin(aa) * r * 1.5; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
          ctx.stroke();
        }
        ctx.restore();
        if (e.lasers > 0) {
          const n = e.phase === 2 ? 6 : 4;
          ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
          for (let k = 0; k < n; k++) {
            const aa = e.laserA + k * TAU / n, x2 = e.x + Math.cos(aa) * 600, y2 = e.y + Math.sin(aa) * 600;
            ctx.strokeStyle = 'rgba(255,200,90,0.3)'; ctx.lineWidth = 40;
            ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(x2, y2); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,240,190,0.9)'; ctx.lineWidth = 12; ctx.stroke();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
          }
          ctx.globalCompositeOperation = 'source-over';
        }
        if (e.hitFlash > 0) CA.FX.glow(ctx, e.x, e.y, r * 1.6, '#ffffff', e.hitFlash * 4);
      },
    },

    // ===================== 5. WEEPING COLOSSUS =====================
    colossus: {
      name: 'WEEPING COLOSSUS', ru: 'Плачущий Колосс', title: 'Каменная скорбь', color: '#7ac8ff', r: 52, hp: 6000, spd: 38,
      desc: 'Каменный гигант, чьи слёзы падают с неба. Сокрушительные удары по земле и бросок валунов.',
      attacks: ['slam', 'tears', 'rocks', 'slam'],
      attacks2: ['slam', 'tears', 'rocks', 'tears', 'slam'],
      update(e, G, dt) {
        if (!baseUpdate(e, G, dt, this)) return;
        if (!e.busy || e.busy <= 0) moveToward(e, G, dt, 110, 1);
        if (Math.random() < dt * 4) CA.FX.p(e.x + U.rand(-10, 10), e.y - e.r * 0.4, U.rand(-10, 10), 60, 0.8, 3, '#7ac8ff', 0, 0.5, 120);
      },
      slam(e, G) {
        const p = G.player;
        const x = p.x, y = p.y;
        e.busy = 1.1; e.pose = 1;
        G.telegraph({ shape: 'circle', x, y, r: 125, t: 1.0, color: '#7ac8ff', onFire: () => {
          if (!e.alive) return;
          G.hurtCircle(x, y, 125, 26 * G.dmgScale);
          CA.FX.shock(x, y, 160, '#9ad8ff', 0.6); CA.FX.shards(x, y, '#5a6a7a', 18, 300);
          CA.FX.smoke(x, y, '#2a3440', 8, 80, 24, 1);
          G.shake(14); CA.Audio.play('boom');
          if (e.phase === 2) ringShots(G, x, y, 14, 150, 10 * G.dmgScale, '#7ac8ff', 0);
        } });
        return 2.3;
      },
      tears(e, G) {
        const p = G.player, n = e.phase === 2 ? 14 : 8;
        e.pose = 2; e.busy = 0.6;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * TAU, d = Math.random() * 190;
          const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
          G.telegraph({ shape: 'circle', x, y, r: 48, t: 0.75 + i * 0.1, color: '#4a9aff', onFire: () => {
            G.hurtCircle(x, y, 48, 14 * G.dmgScale);
            CA.FX.burst(x, y, '#7ac8ff', 10, 160, 4, 0.5); CA.FX.ring(x, y, 5, 55, 0.3, '#bfe6ff', 3);
          } });
        }
        return 2.6;
      },
      rocks(e, G) {
        e.pose = 1; e.busy = 0.8;
        const a0 = aimAt(e, G.player);
        for (let i = -1; i <= 1; i++) {
          const a = a0 + i * 0.35;
          const b = G.enemyShot(e.x, e.y - e.r * 0.5, Math.cos(a) * 150, Math.sin(a) * 150, 15, 20 * G.dmgScale, '#8a9aaa', 'rock', true);
          b.life = 1.6;
          b.onEnd = (bb) => { for (let k = 0; k < 6; k++) { const aa = k * TAU / 6; G.enemyShot(bb.x, bb.y, Math.cos(aa) * 180, Math.sin(aa) * 180, 6, 9 * G.dmgScale, '#7ac8ff', 'orb', true); } CA.FX.shards(bb.x, bb.y, '#5a6a7a', 8, 200); };
        }
        return 2.2;
      },
      draw(ctx, e, G) {
        const a = introAlpha(e), t = e.t, r = e.r;
        const rise = e.intro > 0 ? (e.intro / e.introMax) : 0;
        drawBossShadow(ctx, e, 0.95);
        ctx.save(); ctx.globalAlpha = a;
        ctx.translate(e.x, e.y + rise * r);
        ctx.beginPath(); ctx.rect(-r * 3, -r * 3, r * 6, r * 3.95); ctx.clip();
        // arms
        const lift = e.pose === 1 ? -r * 0.6 : 0;
        ctx.fillStyle = '#4a5260'; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
        for (const s of [-1, 1]) {
          ctx.beginPath(); ctx.ellipse(s * r * 1.05, r * 0.2 + lift + Math.sin(t * 2 + s) * 3, r * 0.38, r * 0.7, s * 0.3, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(s * r * 1.15, r * 0.85 + lift, r * 0.32, r * 0.25, 0, 0, TAU); ctx.fill(); ctx.stroke();
        }
        // torso/head block
        const gr = ctx.createLinearGradient(0, -r, 0, r);
        gr.addColorStop(0, '#8a96a6'); gr.addColorStop(1, '#2a303a');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(-r * 0.75, -r * 0.95); ctx.lineTo(r * 0.7, -r * 1.0); ctx.lineTo(r * 0.95, r * 0.9); ctx.lineTo(-r * 0.9, r * 0.95); ctx.closePath(); ctx.fill(); ctx.stroke();
        // cracks
        ctx.strokeStyle = '#1a1e26'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.95); ctx.lineTo(-r * 0.3, -r * 0.5); ctx.lineTo(-r * 0.5, -r * 0.1); ctx.moveTo(r * 0.5, r * 0.2); ctx.lineTo(r * 0.3, r * 0.6); ctx.lineTo(r * 0.45, r * 0.9); ctx.stroke();
        // sorrowful face
        ctx.fillStyle = '#0a0c12';
        ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.45, r * 0.16, r * 0.1, 0.3, 0, TAU); ctx.ellipse(r * 0.3, -r * 0.45, r * 0.16, r * 0.1, -0.3, 0, TAU); ctx.fill();
        CA.FX.glow(ctx, -r * 0.3, -r * 0.45, r * 0.3, '#7ac8ff', 0.7); CA.FX.glow(ctx, r * 0.3, -r * 0.45, r * 0.3, '#7ac8ff', 0.7);
        ctx.strokeStyle = '#0a0c12'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, r * 0.35, r * 0.3, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
        // tear streams
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(122,200,255,0.7)'; ctx.lineWidth = 3;
        for (const s of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(s * r * 0.3, -r * 0.38);
          ctx.quadraticCurveTo(s * r * 0.35 + Math.sin(t * 3) * 2, 0, s * r * 0.28, r * 0.9); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
        if (e.hitFlash > 0) CA.FX.glow(ctx, e.x, e.y, r * 1.6, '#ffffff', e.hitFlash * 4);
      },
    },
  };

  // seal orbs for seraph phase
  const SEAL_DEF = Object.assign({}, CA.Enemies.TYPES.eyebat, { name: 'Seal', ru: 'Печать', col: '#ffd27a', fly: true, ai: 'seal' });
  const SEAL_BEHAVIOR = {
    update(o, G, dt) {
      const b = o.sealOf;
      if (!b || !b.alive) { o.hp = 0; G.killEnemy(o, true); return; }
      o.sealA += dt * 0.9;
      o.x = b.x + Math.cos(o.sealA) * 140; o.y = b.y + Math.sin(o.sealA) * 140;
      o.cd -= dt;
      if (o.cd <= 0) { o.cd = 2.4; const a = Math.atan2(G.player.y - o.y, G.player.x - o.x); G.enemyShot(o.x, o.y, Math.cos(a) * 180, Math.sin(a) * 180, 6, 10 * G.dmgScale, '#ffd27a', 'orb', true); }
    },
    draw(ctx, o) {
      CA.FX.glow(ctx, o.x, o.y, 34, '#ffd27a', 0.8);
      ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.t * 2);
      ctx.strokeStyle = '#fff0b0'; ctx.lineWidth = 2.5;
      ctx.strokeRect(-11, -11, 22, 22);
      ctx.rotate(Math.PI / 4); ctx.strokeRect(-11, -11, 22, 22);
      ctx.restore();
      ctx.fillStyle = '#3a2808'; ctx.beginPath(); ctx.arc(o.x, o.y, 6, 0, TAU); ctx.fill();
      const bw = 30;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(o.x - bw / 2, o.y - 24, bw, 4);
      ctx.fillStyle = '#ffd27a'; ctx.fillRect(o.x - bw / 2, o.y - 24, bw * Math.max(0, o.hp / o.maxHp), 4);
      if (o.hitFlash > 0) CA.FX.glow(ctx, o.x, o.y, 20, '#ffffff', o.hitFlash * 5);
    },
  };

  const B = {
    DEFS,
    spawn(G, id, opts) {
      opts = opts || {};
      const def = DEFS[id];
      const p = G.player;
      const a = Math.random() * TAU;
      const W = CA.Locations.WORLD;
      const x = U.clamp(p.x + Math.cos(a) * 240, 100, W - 100), y = U.clamp(p.y + Math.sin(a) * 240, 100, W - 100);
      const e = CA.Enemies.spawn(G, 'golem', x, y, { noXp: true });
      e.type = 'boss_' + id;
      e.bossId = id;
      e.boss = Object.assign(Object.create(def), { update: def.update.bind(def), draw: def.draw.bind(def) });
      e.def = { name: def.name, ru: def.ru, col: def.color, xp: 0, mass: 100, ai: 'boss' };
      e.r = def.r; e.sprR = def.r;
      e.maxHp = e.hp = Math.round(def.hp * G.bossHpScale * (opts.hpMul || 1));
      e.spd = def.spd; e.dmg = 20 * G.dmgScale; e.mass = 100;
      e.intro = e.introMax = 2.2; e.phase = 1; e.atkT = 1.0; e.busy = 0; e.pose = 0; e.orbit = Math.random() < 0.5 ? 1 : -1;
      e.armor = 0; e.isMid = !!opts.mid; e.xp = 0;
      e.spin = 0; e.dash = 0; e.beam = 0; e.lasers = 0; e.spiral = 0; e.hidden = 0; e.queue = 0;
      return e;
    },
  };
  CA.Bosses = B;
})();
