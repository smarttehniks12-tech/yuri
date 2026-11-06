/* enemies.js — 13 cursed spirit types, AI behaviours, enemy projectiles, rendering */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U;
  const TAU = U.TAU;

  const TYPES = {
    larva:    { name: 'Wailing Larva', ru: 'Воющая личинка', r: 10, hp: 14, spd: 64, dmg: 6, xp: 1, mass: 1, ai: 'chase', col: '#b8a6d6', anim: 6, desc: 'Слабый, но быстрый дух. Нападает стаями.' },
    eyebat:   { name: 'Eye Bat', ru: 'Глазокрыл', r: 11, hp: 12, spd: 92, dmg: 5, xp: 1, mass: 0.6, ai: 'flyer', col: '#9a5aff', anim: 9, fly: true, desc: 'Летающий глаз. Двигается зигзагом и игнорирует толпу.' },
    golem:    { name: 'Flesh Golem', ru: 'Мясной голем', r: 22, hp: 95, spd: 34, dmg: 14, xp: 4, mass: 5, ai: 'chase', col: '#9c4a5a', anim: 3, desc: 'Медленная и очень живучая груда плоти.' },
    spitter:  { name: 'Spitting Maw', ru: 'Плюющая пасть', r: 14, hp: 32, spd: 46, dmg: 6, xp: 2, mass: 1.5, ai: 'ranged', range: 240, fireCd: 2.6, col: '#8fbf6a', anim: 3, desc: 'Держит дистанцию и плюётся кислотой.' },
    bloater:  { name: 'Boil Sac', ru: 'Гнойный мешок', r: 15, hp: 26, spd: 72, dmg: 4, xp: 2, mass: 1.2, ai: 'exploder', boomR: 72, boomDmg: 20, col: '#ff9a4a', anim: 4, desc: 'Подбегает и взрывается. Взрыв ранит и других проклятий.' },
    warden:   { name: 'Mask Warden', ru: 'Страж в маске', r: 16, hp: 75, spd: 42, dmg: 10, xp: 4, mass: 3, ai: 'chase', shield: true, col: '#8a6aff', anim: 3, desc: 'Маска поглощает 70% урона спереди, пока не будет разбита.' },
    flicker:  { name: 'Flicker Shade', ru: 'Мерцающая тень', r: 12, hp: 30, spd: 55, dmg: 9, xp: 3, mass: 1, ai: 'teleport', blinkCd: 3.6, col: '#b35cff', anim: 5, desc: 'Телепортируется прямо к магу.' },
    hound:    { name: 'Stitched Hound', ru: 'Сшитый пёс', r: 14, hp: 36, spd: 72, dmg: 9, xp: 2, mass: 1.5, ai: 'charger', col: '#8a6a72', anim: 8, desc: 'Делает стремительный рывок по прямой.' },
    twinface: { name: 'Twin-Faced', ru: 'Двуликий', r: 15, hp: 48, spd: 58, dmg: 8, xp: 3, mass: 2, ai: 'chase', split: 'halfface', col: '#c9b8a0', anim: 4, desc: 'После смерти распадается на две половины.' },
    halfface: { name: 'Half Face', ru: 'Полулик', r: 9, hp: 14, spd: 88, dmg: 5, xp: 1, mass: 0.8, ai: 'chase', col: '#c9b8a0', anim: 7, desc: 'Осколок Двуликого.' },
    cradle:   { name: 'Cursed Cradle', ru: 'Проклятая колыбель', r: 18, hp: 120, spd: 30, dmg: 8, xp: 6, mass: 4, ai: 'summoner', col: '#e08ab8', anim: 3, desc: 'Порождает личинок, держась поодаль.' },
    brute:    { name: 'Grade-1 Brute', ru: 'Громила 1 ранга', r: 24, hp: 240, spd: 50, dmg: 18, xp: 10, mass: 7, ai: 'charger', col: '#ff3a4a', anim: 4, desc: 'Элитный рогатый дух. Таранит с огромной силой.' },
    ogre:     { name: 'Special Grade Ogre', ru: 'Огр особого ранга', r: 38, hp: 1600, spd: 42, dmg: 24, xp: 60, mass: 30, ai: 'ogre', col: '#6a7a9a', anim: 2, miniboss: true, desc: 'Мини-босс. Сокрушает землю дубиной.' },
  };

  let nextId = 1;
  // pre-rendered soft shadow (cheaper than a path fill per enemy)
  const SHADOW = U.makeCanvas(64, 24);
  (function () { const g = SHADOW.getContext('2d'); const gr = g.createRadialGradient(32, 12, 2, 32, 12, 32); gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.setTransform(1, 0, 0, 0.375, 0, 7.5); g.fillStyle = gr; g.fillRect(0, -20, 64, 64); })();

  const E = {
    TYPES,
    spawn(G, type, x, y, opts) {
      const d = TYPES[type];
      opts = opts || {};
      const e = G.enemyFree.pop() || {};
      const elite = !!opts.elite;
      const hpM = G.hpScale * (elite ? 5.5 : 1) * (opts.hpMul || 1);
      e.id = nextId++; e.type = type; e.def = d; e.boss = null; e.bossId = null; e.isMid = false; e.sealOf = null; e.armor = 0; e.hidden = 0; e.intro = 0; e.seals = null; e.trail = null; e.sepx = 0; e.sepy = 0; e.phase = 0; e.chest = false;
      e.x = x; e.y = y; e.kvx = 0; e.kvy = 0;
      e.r = d.r * (elite ? 1.35 : 1) * (opts.scale || 1);
      e.maxHp = e.hp = Math.round(d.hp * hpM);
      e.spd = d.spd * (0.92 + Math.random() * 0.16) * (elite ? 0.95 : 1);
      e.dmg = d.dmg * G.dmgScale * (elite ? 1.5 : 1);
      e.xp = d.xp * (elite ? 10 : 1);
      e.mass = d.mass * (elite ? 3 : 1);
      e.elite = elite; e.alive = true; e.t = Math.random() * 10;
      e.hitFlash = 0; e.slowT = 0; e.slowAmt = 0; e.stunT = 0; e.burnT = 0; e.burnDps = 0; e.marks = 0; e.markT = 0;
      e.atkCd = 0.5; e.st = 0; e.stT = 0; e.cd = U.rand(0.5, 2); e.ax = 0; e.ay = 0;
      e.shieldHp = d.shield ? e.maxHp * 0.6 : 0;
      e.face = 1; e.seen = false; e.noXp = !!opts.noXp; e.hitBy = 0; e.immune = 0;
      e.sprR = Math.round(d.r);
      G.enemies.push(e);
      return e;
    },

    update(G, dt) {
      const p = G.player;
      const ens = G.enemies;
      const grid = G.grid;
      const globalSlow = G.enemySlowMul;   // from domains
      const noAtk = G.enemyNoAttack;
      const frame = G.frame;
      for (let i = 0; i < ens.length; i++) {
        const e = ens[i];
        if (!e.alive) continue;
        e.t += dt;
        if (e.hitFlash > 0) e.hitFlash -= dt;
        if (e.immune > 0) e.immune -= dt;
        if (e.boss) { e.boss.update(e, G, dt); this.physics(G, e, dt); continue; }
        if (e.burnT > 0) {
          e.burnT -= dt;
          G.hitEnemy(e, e.burnDps * dt, { noText: true, noCe: true, src: 'burn', silent: true });
          if (!e.alive) continue;
          if (Math.random() < dt * 8) CA.FX.embers(e.x, e.y - e.r * 0.3, '#ff7a1a', 1, e.r);
        }
        if (e.markT > 0) { e.markT -= dt; if (e.markT <= 0) e.marks = 0; }
        let spdMul = globalSlow;
        if (e.slowT > 0) { e.slowT -= dt; spdMul *= 1 - e.slowAmt; } else e.slowAmt = 0;
        if (e.stunT > 0) { e.stunT -= dt; spdMul = 0; }
        if (G.eventMods.enrage) spdMul *= 1.35;
        const dx = p.x - e.x, dy = p.y - e.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = dx / dist, ny = dy / dist;
        e.face = dx < 0 ? -1 : 1;
        let mx = 0, my = 0;
        const sp = e.spd * spdMul;
        const d = e.def;
        if (e.atkCd > 0) e.atkCd -= dt;
        switch (d.ai) {
          case 'chase':
            mx = nx * sp; my = ny * sp;
            break;
          case 'flyer': {
            const w = Math.sin(e.t * 3 + e.id) * 0.9;
            mx = (nx - ny * w) * sp; my = (ny + nx * w) * sp;
            break;
          }
          case 'ranged': {
            const R = d.range;
            if (dist > R * 0.95) { mx = nx * sp; my = ny * sp; }
            else if (dist < R * 0.6) { mx = -nx * sp * 0.8; my = -ny * sp * 0.8; }
            else { const s = (e.id % 2 ? 1 : -1) * 0.6; mx = -ny * sp * s; my = nx * sp * s; }
            e.cd -= dt * (spdMul > 0 ? 1 : 0);
            if (e.cd <= 0 && dist < R * 1.25 && !noAtk) {
              e.cd = d.fireCd * U.rand(0.85, 1.2);
              const a = Math.atan2(dy, dx);
              const n = e.elite ? 3 : 1;
              for (let k = 0; k < n; k++) {
                const aa = a + (k - (n - 1) / 2) * 0.22;
                G.enemyShot(e.x, e.y, Math.cos(aa) * 175, Math.sin(aa) * 175, 7, 9 * G.dmgScale, '#b5ff3a', 'acid');
              }
              e.hitFlash = 0.05;
            }
            break;
          }
          case 'exploder': {
            if (e.st === 0) {
              mx = nx * sp * 1.1; my = ny * sp * 1.1;
              if (dist < 46 + e.r && !noAtk) { e.st = 1; e.stT = 0.6; }
            } else {
              e.stT -= dt;
              if (e.stT <= 0) { this.explode(G, e); continue; }
            }
            break;
          }
          case 'teleport': {
            mx = nx * sp; my = ny * sp;
            e.cd -= dt;
            if (e.st === 1) { e.stT -= dt; mx = my = 0; if (e.stT <= 0) e.st = 0; }
            else if (e.cd <= 0 && dist > 120 && spdMul > 0) {
              e.cd = d.blinkCd * U.rand(0.8, 1.3);
              CA.FX.burst(e.x, e.y, '#b35cff', 8, 120, 4, 0.4);
              const a = Math.random() * TAU, rr = U.rand(85, 140);
              e.x = U.clamp(p.x + Math.cos(a) * rr, 20, CA.Locations.WORLD - 20);
              e.y = U.clamp(p.y + Math.sin(a) * rr, 20, CA.Locations.WORLD - 20);
              CA.FX.burst(e.x, e.y, '#b35cff', 10, 140, 4, 0.4);
              CA.FX.ring(e.x, e.y, 4, 30, 0.3, '#b35cff', 2);
              e.st = 1; e.stT = 0.45;
            }
            break;
          }
          case 'charger': {
            if (e.st === 0) {
              mx = nx * sp; my = ny * sp;
              e.cd -= dt;
              if (e.cd <= 0 && dist < 240 && spdMul > 0 && !noAtk) { e.st = 1; e.stT = 0.55; e.ax = nx; e.ay = ny; }
            } else if (e.st === 1) { // windup
              e.stT -= dt;
              if (e.stT <= 0) { e.st = 2; e.stT = e.type === 'brute' ? 0.6 : 0.45; }
            } else {
              const v = e.spd * 4.2 * (spdMul > 0 ? Math.max(0.35, spdMul) : 0);
              mx = e.ax * v; my = e.ay * v;
              e.stT -= dt;
              if (Math.random() < 0.5) CA.FX.smoke(e.x, e.y + e.r * 0.5, '#2a2030', 1, 20, 8, 0.5);
              if (e.stT <= 0) { e.st = 0; e.cd = U.rand(2.5, 4); }
            }
            break;
          }
          case 'summoner': {
            if (dist > 300) { mx = nx * sp; my = ny * sp; }
            else if (dist < 200) { mx = -nx * sp; my = -ny * sp; }
            e.cd -= dt;
            if (e.cd <= 0 && !noAtk && G.enemies.length < G.enemyCap) {
              e.cd = 5.5;
              for (let k = 0; k < (e.elite ? 5 : 3); k++) {
                const a = Math.random() * TAU;
                const c = this.spawn(G, 'larva', e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20, { noXp: k > 0 });
                c.kvx = Math.cos(a) * 200; c.kvy = Math.sin(a) * 200;
              }
              CA.FX.burst(e.x, e.y, '#ff6ad0', 12, 140, 5, 0.5);
            }
            break;
          }
          case 'ogre': {
            if (e.st === 0) {
              mx = nx * sp; my = ny * sp;
              e.cd -= dt;
              if (e.cd <= 0 && dist < 170 && !noAtk) {
                e.st = 1; e.stT = 0.9;
                const ex = e.x + nx * 60, ey = e.y + ny * 60;
                e.ax = ex; e.ay = ey;
                G.telegraph({ shape: 'circle', x: ex, y: ey, r: 115, t: 0.9, color: '#ff4a2a', onFire: () => {
                  if (!e.alive) return;
                  G.hurtCircle(ex, ey, 115, 26 * G.dmgScale);
                  CA.FX.shock(ex, ey, 140, '#ffaa66', 0.5);
                  CA.FX.shards(ex, ey, '#6a5a50', 14, 260);
                  G.shake(10); CA.Audio.play('boom');
                } });
              }
            } else {
              e.stT -= dt;
              if (e.stT <= 0) { e.st = 0; e.cd = 3.2; }
            }
            break;
          }
        }
        // separation (alternate frames for cost)
        if (((e.id + frame) & 1) === 0 && !d.fly) {
          const near = grid.query(e.x, e.y, e.r * 2 + 8, G.qbuf);
          let sx = 0, sy = 0;
          for (let k = 0; k < near.length; k++) {
            const o = near[k];
            if (o === e || !o.alive) continue;
            const ox = e.x - o.x, oy = e.y - o.y;
            const rr = e.r + o.r;
            const d2 = ox * ox + oy * oy;
            if (d2 < rr * rr && d2 > 0.01) {
              const dd = Math.sqrt(d2), push = (rr - dd) / rr;
              const w = o.mass / (o.mass + e.mass);
              sx += ox / dd * push * w; sy += oy / dd * push * w;
            }
          }
          e.sepx = sx * 260; e.sepy = sy * 260;
        }
        mx += e.sepx || 0; my += e.sepy || 0;
        e.x += mx * dt; e.y += my * dt;
        this.physics(G, e, dt);
        // contact damage
        if (!noAtk && e.atkCd <= 0 && e.stunT <= 0) {
          const rr = e.r + p.r;
          if (dist < rr) {
            e.atkCd = 0.85;
            p.hurt(e.dmg * (d.ai === 'charger' && e.st === 2 ? 1.6 : 1), e);
          }
        }
      }
    },
    physics(G, e, dt) {
      if (e.kvx || e.kvy) {
        e.x += e.kvx * dt; e.y += e.kvy * dt;
        const k = Math.max(0, 1 - 7 * dt);
        e.kvx *= k; e.kvy *= k;
        if (Math.abs(e.kvx) < 1 && Math.abs(e.kvy) < 1) { e.kvx = 0; e.kvy = 0; }
      }
      const W = CA.Locations.WORLD;
      if (e.x < e.r) e.x = e.r; else if (e.x > W - e.r) e.x = W - e.r;
      if (e.y < e.r) e.y = e.r; else if (e.y > W - e.r) e.y = W - e.r;
    },
    explode(G, e) {
      const d = e.def;
      const R = d.boomR * (e.elite ? 1.4 : 1);
      CA.FX.disc(e.x, e.y, R * 1.2, 0.35, '#ff7a1a', 0.9);
      CA.FX.ring(e.x, e.y, 10, R, 0.35, '#ffb04a', 5);
      CA.FX.burst(e.x, e.y, '#ff8a2a', 18, 260, 6, 0.6);
      CA.FX.smoke(e.x, e.y, '#3a2010', 6, 60, 18, 0.9);
      CA.Audio.play('boom', 0.7);
      G.shake(5);
      if (!G.enemyNoAttack) G.hurtCircle(e.x, e.y, R, d.boomDmg * G.dmgScale * (e.elite ? 1.5 : 1));
      // collateral damage to other spirits
      G.forEnemiesIn(e.x, e.y, R, (o) => { if (o !== e) G.hitEnemy(o, 30 * G.hpScale * 0.5, { noCe: true, src: 'boom', noCrit: true }); });
      e.hp = 0;
      G.killEnemy(e, true);
    },

    draw(ctx, G, view) {
      const ens = G.enemies;
      const p = G.player;
      const showFlash = true;
      for (let i = 0; i < ens.length; i++) {
        const e = ens[i];
        if (!e.alive) continue;
        if (e.x < view.x0 - 80 || e.x > view.x1 + 80 || e.y < view.y0 - 80 || e.y > view.y1 + 80) continue;
        if (e.boss) { e.boss.draw(ctx, e, G); continue; }
        const d = e.def;
        const scale = e.r / e.sprR;
        // shadow
        const fy = d.fly ? e.r * 1.5 : e.r * 0.8;
        ctx.drawImage(SHADOW, e.x - e.r * 0.9, e.y + fy - e.r * 0.32, e.r * 1.8, e.r * 0.64);
        if (e.elite) {
          CA.FX.glow(ctx, e.x, e.y, e.r * 2.6, '#ffc83a', 0.45 + Math.sin(e.t * 5) * 0.15);
        }
        const fr = Math.floor(e.t * d.anim) & 1;
        const flip = e.face < 0;
        const s = CA.Sprites.enemySprite(d.ai === 'ogre' ? 'ogre' : e.type, fr, flip, e.sprR);
        let ox = 0, oy = d.fly ? Math.sin(e.t * 4 + e.id) * 4 - 6 : 0;
        if (d.ai === 'teleport' && Math.random() < 0.06) ox = (Math.random() - 0.5) * 8;
        let sc = scale;
        if (d.ai === 'exploder' && e.st === 1) sc *= 1 + Math.sin(e.t * 40) * 0.08 + (0.6 - e.stT) * 0.5;
        if (d.ai === 'charger' && e.st === 1) ox += (Math.random() - 0.5) * 4;
        const w = s.size * sc, hh = s.half * sc;
        ctx.drawImage(s.c, e.x - hh + ox, e.y - hh + oy, w, w);
        if (showFlash && e.hitFlash > 0) {
          ctx.globalAlpha = Math.min(1, e.hitFlash * 8);
          ctx.drawImage(s.w, e.x - hh + ox, e.y - hh + oy, w, w);
          ctx.globalAlpha = 1;
        }
        if (d.ai === 'exploder' && e.st === 1) {
          CA.FX.glow(ctx, e.x, e.y, e.r * 3, '#ff5a1a', 0.5 + Math.sin(e.t * 40) * 0.4);
          ctx.strokeStyle = 'rgba(255,90,30,0.5)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(e.x, e.y, Math.max(1, d.boomR * (e.elite ? 1.4 : 1) * (1 - e.stT / 0.6)), 0, TAU); ctx.stroke();
        }
        if (d.ai === 'charger' && e.st === 1) {
          ctx.strokeStyle = 'rgba(255,40,40,0.45)'; ctx.lineWidth = e.r * 1.4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + e.ax * 230, e.y + e.ay * 230); ctx.stroke();
        }
        if (d.shield && e.shieldHp > 0) this.drawMask(ctx, e, p);
        if (e.stunT > 0) {
          ctx.fillStyle = '#ffe66a';
          for (let k = 0; k < 3; k++) { const a = e.t * 6 + k * 2.1; ctx.fillRect(e.x + Math.cos(a) * e.r * 0.8 - 1.5, e.y - e.r - 6 + Math.sin(a) * 3, 3, 3); }
        }
        if (e.slowT > 0 && e.slowAmt > 0.2) {
          ctx.strokeStyle = 'rgba(120,200,255,0.5)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 3, 0, TAU); ctx.stroke();
        }
        if (e.marks > 0) {
          ctx.fillStyle = '#ff2244';
          for (let k = 0; k < Math.min(8, e.marks); k++) {
            ctx.beginPath(); ctx.arc(e.x - (Math.min(8, e.marks) - 1) * 3 + k * 6, e.y - e.r - 7, 2.2, 0, TAU); ctx.fill();
          }
        }
        if (e.elite || d.miniboss) {
          const bw = e.r * 2;
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - bw / 2, e.y - e.r - 14, bw, 4);
          ctx.fillStyle = d.miniboss ? '#ff4a2a' : '#ffc83a'; ctx.fillRect(e.x - bw / 2, e.y - e.r - 14, bw * Math.max(0, e.hp / e.maxHp), 4);
        }
      }
    },
    drawMask(ctx, e, p) {
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      const mx = e.x + Math.cos(a) * e.r * 0.7, my = e.y + Math.sin(a) * e.r * 0.5 - e.r * 0.3;
      ctx.save(); ctx.translate(mx, my); ctx.rotate(a * 0.2);
      const k = e.shieldHp / (e.maxHp * 0.6);
      ctx.fillStyle = '#f2ece0'; ctx.strokeStyle = '#120a14'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, e.r * 0.62, e.r * 0.8, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#120a14';
      ctx.beginPath(); ctx.ellipse(-e.r * 0.22, -e.r * 0.15, e.r * 0.12, e.r * 0.06, -0.3, 0, TAU); ctx.ellipse(e.r * 0.22, -e.r * 0.15, e.r * 0.12, e.r * 0.06, 0.3, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#c0182a'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-e.r * 0.2, e.r * 0.35); ctx.quadraticCurveTo(0, e.r * 0.5, e.r * 0.2, e.r * 0.35); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-e.r * 0.35, -e.r * 0.45); ctx.lineTo(-e.r * 0.15, -e.r * 0.3); ctx.moveTo(e.r * 0.35, -e.r * 0.45); ctx.lineTo(e.r * 0.15, -e.r * 0.3); ctx.stroke();
      if (k < 0.6) { ctx.strokeStyle = '#120a14'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -e.r * 0.8); ctx.lineTo(e.r * 0.1, -e.r * 0.2); ctx.lineTo(-e.r * 0.1, e.r * 0.3); ctx.stroke(); }
      if (k < 0.3) { ctx.beginPath(); ctx.moveTo(e.r * 0.5, -e.r * 0.3); ctx.lineTo(e.r * 0.1, 0); ctx.stroke(); }
      ctx.restore();
    },

    // ---------- enemy projectiles ----------
    updateShots(G, dt) {
      const B = G.eshots, p = G.player;
      for (let i = B.length - 1; i >= 0; i--) {
        const b = B[i];
        let k = b.slowF || 1; b.slowF = 1;
        if (G.enemyNoAttack && !b.boss) k *= 0.15;
        b.x += b.vx * dt * k; b.y += b.vy * dt * k;
        if (b.acc) { b.vx *= 1 + b.acc * dt; b.vy *= 1 + b.acc * dt; }
        b.life -= dt; b.t += dt;
        let dead = b.life <= 0;
        if (!dead) {
          const rr = b.r + p.r * 0.7;
          if (U.dist2(b.x, b.y, p.x, p.y) < rr * rr) {
            if (p.hurt(b.dmg, null, b)) { CA.FX.burst(b.x, b.y, b.color, 6, 100, 4, 0.3); }
            dead = true;
          }
        }
        if (dead) { if (b.onEnd && b.life <= 0) { const f = b.onEnd; b.onEnd = null; f(b); } B[i] = B[B.length - 1]; B.pop(); G.eshotFree.push(b); }
      }
    },
    drawShots(ctx, G, view) {
      ctx.globalCompositeOperation = 'lighter';
      for (const b of G.eshots) {
        if (b.x < view.x0 - 20 || b.x > view.x1 + 20 || b.y < view.y0 - 20 || b.y > view.y1 + 20) continue;
        ctx.drawImage(CA.FX.getGlow(b.color), b.x - b.r * 2.4, b.y - b.r * 2.4, b.r * 4.8, b.r * 4.8);
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const b of G.eshots) {
        if (b.x < view.x0 - 20 || b.x > view.x1 + 20 || b.y < view.y0 - 20 || b.y > view.y1 + 20) continue;
        ctx.fillStyle = b.kind === 'needle' ? '#e8e0ff' : '#1a0a14';
        ctx.beginPath();
        if (b.kind === 'needle') {
          const a = Math.atan2(b.vy, b.vx);
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
          ctx.fillRect(-b.r * 1.6, -1.2, b.r * 3.2, 2.4); ctx.restore();
        } else {
          ctx.arc(b.x, b.y, b.r * 0.45, 0, TAU); ctx.fill();
        }
      }
    },
  };
  CA.Enemies = E;
})();
