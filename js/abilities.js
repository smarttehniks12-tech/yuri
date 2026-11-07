/* abilities.js — shared ability toolkit: targeting, projectiles, zones, summons, damage shapes,
 * plus the level-up card system (rarities, skill evolution, combos). Character kits live in js/kits/. */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U;
  const TAU = U.TAU;

  const RARITY = {
    common:    { id: 'common', name: 'Common', ru: 'Обычная', color: '#b8c4d8', mag: 1, w: 60 },
    rare:      { id: 'rare', name: 'Rare', ru: 'Редкая', color: '#4fb8ff', mag: 1.5, w: 28 },
    epic:      { id: 'epic', name: 'Epic', ru: 'Эпическая', color: '#b35cff', mag: 2.2, w: 9 },
    legendary: { id: 'legendary', name: 'Legendary', ru: 'Легендарная', color: '#ffb02a', mag: 3.2, w: 3 },
    mythic:    { id: 'mythic', name: 'Mythic', ru: 'Мифическая', color: '#ff3a6a', mag: 4.5, w: 0 },
  };
  const LV_RARITY = [null, 'rare', 'common', 'rare', 'epic', 'legendary'];

  const A = {
    RARITY,
    G: null,
    tmp: [],
    // ---------- targeting ----------
    nearest(x, y, range, skip) {
      const G = this.G;
      let best = null, bd = range * range;
      const list = G.grid.query(x, y, range, G.qbuf);
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e.alive || e === skip || e.hidden > 0) continue;
        const d = U.dist2(x, y, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    },
    inRadius(x, y, r, out) {
      const G = this.G;
      out = out || this.tmp; out.length = 0;
      const list = G.grid.query(x, y, r + 50, G.qbuf);
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e.alive || e.hidden > 0) continue;
        const rr = r + e.r;
        if (U.dist2(x, y, e.x, e.y) < rr * rr) out.push(e);
      }
      return out;
    },
    // densest cluster point among enemies within range of (x,y)
    // manual aim (drag on a skill button) overrides auto-targeting during that cast
    cx(p) { return p.aimOverride ? p.aimOverride.pt.x : p.x; },
    cy(p) { return p.aimOverride ? p.aimOverride.pt.y : p.y; },
    densest(x, y, range) {
      const G = this.G;
      const ov = G.player && G.player.aimOverride;
      if (ov && x === G.player.x && y === G.player.y) return { x: ov.pt.x, y: ov.pt.y, r: 0, alive: true };
      const list = this.inRadius(x, y, range, []);
      if (!list.length) return null;
      let best = list[0], bc = -1;
      const n = Math.min(list.length, 14);
      for (let i = 0; i < n; i++) {
        const a = list[(Math.random() * list.length) | 0];
        let c = 0;
        for (let j = 0; j < list.length; j++) if (U.dist2(a.x, a.y, list[j].x, list[j].y) < 90 * 90) c++;
        if (a.bossId) c += 6;
        if (c > bc) { bc = c; best = a; }
      }
      void G;
      return best;
    },
    // aim: towards nearest enemy, else movement direction
    aim(p, range) {
      if (p.aimOverride) return p.aimOverride.a;
      const e = this.nearest(p.x, p.y, range || 520);
      if (e) return Math.atan2(e.y - p.y, e.x - p.x);
      return p.dirA;
    },
    moveAim(p) { // movement direction if moving, else aim at nearest
      if (p.moving) return p.dirA;
      return this.aim(p);
    },
    // damage scaled by player power
    dmg(p, base) { return base * p.power(); },

    // ---------- damage shapes ----------
    hitCircle(x, y, r, dmg, opt) {
      const list = this.inRadius(x, y, r, []);
      for (const e of list) this.G.hitEnemy(e, dmg, opt ? Object.assign({ fx: x, fy: y }, opt) : { fx: x, fy: y });
      return list;
    },
    hitCone(x, y, ang, arc, r, dmg, opt) {
      const list = this.inRadius(x, y, r, []);
      const out = [];
      for (const e of list) {
        const a = Math.atan2(e.y - y, e.x - x);
        if (Math.abs(U.angDiff(ang, a)) <= arc / 2 + Math.atan2(e.r, Math.max(1, U.dist(x, y, e.x, e.y)))) {
          this.G.hitEnemy(e, dmg, opt ? Object.assign({ fx: x, fy: y }, opt) : { fx: x, fy: y });
          out.push(e);
        }
      }
      return out;
    },
    hitLine(x1, y1, x2, y2, w, dmg, opt, onEach) {
      const G = this.G;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const half = U.dist(x1, y1, x2, y2) / 2 + w;
      const list = this.inRadius(mx, my, half, []);
      const out = [];
      for (const e of list) {
        const rr = w / 2 + e.r;
        if (U.segDist2(e.x, e.y, x1, y1, x2, y2) < rr * rr) {
          G.hitEnemy(e, dmg, opt ? Object.assign({ fx: x1, fy: y1 }, opt) : { fx: x1, fy: y1 });
          out.push(e);
          if (onEach) onEach(e);
        }
      }
      return out;
    },

    // ---------- projectiles ----------
    proj(o) {
      const G = this.G;
      const p = G.projFree.pop() || {};
      p.x = o.x; p.y = o.y;
      const sp = o.speed || 400, a = o.a || 0;
      p.vx = o.vx != null ? o.vx : Math.cos(a) * sp; p.vy = o.vy != null ? o.vy : Math.sin(a) * sp;
      p.speed = sp; p.r = o.r || 6; p.dmg = o.dmg || 10; p.pierce = o.pierce || 0; p.life = o.life || 1.5; p.max = p.life;
      p.color = o.color || '#ffffff'; p.core = o.core || '#ffffff'; p.homing = o.homing || 0; p.target = null;
      p.onHit = o.onHit || null; p.onEnd = o.onEnd || null; p.draw = o.draw || null; p.update = o.update || null;
      p.opt = o.opt || null; p.trail = o.trail == null ? 0.5 : o.trail; p.hits = p.hits || []; p.hits.length = 0;
      p.size = o.size || p.r * 2.6; p.t = 0; p.kind = o.kind || ''; p.data = o.data || null; p.dead = false; p.rehit = o.rehit || 0; p.hitT = 0;
      p.noHit = !!o.noHit; p.tp = p.tp || []; p.tp.length = 0;
      G.projs.push(p);
      return p;
    },
    updateProjs(dt) {
      const G = this.G, P = G.projs;
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        p.t += dt; p.life -= dt;
        if (p.update) p.update(p, dt);
        if (p.homing && !p.dead) {
          if (!p.target || !p.target.alive) p.target = this.nearest(p.x, p.y, 420);
          if (p.target) {
            const want = Math.atan2(p.target.y - p.y, p.target.x - p.x);
            const cur = Math.atan2(p.vy, p.vx);
            const na = cur + U.clamp(U.angDiff(cur, want), -p.homing * dt, p.homing * dt);
            const sp = Math.hypot(p.vx, p.vy);
            p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
          }
        }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (!p.draw) { const tp = p.tp; tp.push(p.x, p.y); if (tp.length > 16) tp.splice(0, 2); }
        if (p.trail && Math.random() < p.trail) CA.FX.p(p.x, p.y, -p.vx * 0.05 + U.rand(-15, 15), -p.vy * 0.05 + U.rand(-15, 15), 0.3, p.r * 0.7, p.color, 0, 3);
        if (!p.noHit && !p.dead) {
          if (p.hitT > 0) p.hitT -= dt;
          const list = G.grid.query(p.x, p.y, p.r + 40, G.qbuf);
          for (let k = 0; k < list.length; k++) {
            const e = list[k];
            if (!e.alive || e.hidden > 0) continue;
            const rr = p.r + e.r;
            if (U.dist2(p.x, p.y, e.x, e.y) > rr * rr) continue;
            if (p.hits.indexOf(e.id) >= 0) { if (!p.rehit) continue; }
            if (p.rehit) { if (p.hitT > 0) continue; p.hitT = p.rehit; }
            else p.hits.push(e.id);
            const opt = p.opt || {};
            opt.fx = p.x - p.vx * 0.05; opt.fy = p.y - p.vy * 0.05;
            G.hitEnemy(e, p.dmg, opt);
            if (p.onHit) p.onHit(p, e);
            if (!p.rehit) {
              if (p.pierce <= 0) { p.dead = true; break; }
              p.pierce--;
            }
          }
        }
        const W = CA.Locations.WORLD;
        if (p.x < -60 || p.y < -60 || p.x > W + 60 || p.y > W + 60) p.dead = true;
        if (p.life <= 0) p.dead = true;
        if (p.dead) {
          if (p.onEnd) p.onEnd(p);
          P[i] = P[P.length - 1]; P.pop(); G.projFree.push(p);
        }
      }
    },
    drawProjs(ctx, view) {
      const P = this.G.projs;
      for (const p of P) {
        if (p.x < view.x0 - 80 || p.x > view.x1 + 80 || p.y < view.y0 - 80 || p.y > view.y1 + 80) continue;
        if (p.draw) { ctx.save(); p.draw(ctx, p); ctx.restore(); continue; }
        ctx.globalCompositeOperation = 'lighter';
        const s = p.size;
        const tp = p.tp;
        if (tp && tp.length >= 6) { // tapered ribbon trail
          ctx.lineCap = 'round'; ctx.strokeStyle = p.color;
          for (let i = 2; i < tp.length; i += 2) {
            const k = i / tp.length;
            ctx.globalAlpha = k * 0.55; ctx.lineWidth = p.r * 1.6 * k;
            ctx.beginPath(); ctx.moveTo(tp[i - 2], tp[i - 1]); ctx.lineTo(tp[i], tp[i + 1]); ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        ctx.drawImage(CA.FX.getGlow(p.color), p.x - s, p.y - s, s * 2, s * 2);
        ctx.globalAlpha = 0.9;
        ctx.drawImage(CA.FX.getGlow(p.core), p.x - s * 0.35, p.y - s * 0.35, s * 0.7, s * 0.7);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    },

    // ---------- zones (persistent areas) ----------
    zone(o) {
      const z = Object.assign({ x: 0, y: 0, r: 50, life: 1, t: 0, tick: 0, under: false }, o);
      z.max = z.life;
      this.G.zones.push(z);
      return z;
    },
    updateZones(dt) {
      const Z = this.G.zones;
      for (let i = Z.length - 1; i >= 0; i--) {
        const z = Z[i];
        z.t += dt; z.life -= dt;
        if (z.follow) { z.x = z.follow.x + (z.fox || 0); z.y = z.follow.y + (z.foy || 0); }
        if (z.update) z.update(z, dt);
        if (z.life <= 0) { if (z.onEnd) z.onEnd(z); Z.splice(i, 1); }
      }
    },
    drawZones(ctx, under, view) {
      for (const z of this.G.zones) {
        if (!!z.under !== under || !z.draw) continue;
        if (z.x + z.r + 200 < view.x0 || z.x - z.r - 200 > view.x1 || z.y + z.r + 200 < view.y0 || z.y - z.r - 200 > view.y1) { if (!z.global) continue; }
        ctx.save(); z.draw(ctx, z, z.life / z.max); ctx.restore();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    },
    // ticking damage helper for zones: calls fn every `every` sec
    every(z, dt, every, fn) {
      z.tick -= dt;
      while (z.tick <= 0) { z.tick += every; fn(); }
    },

    // ---------- summons / minions ----------
    minion(o) {
      const m = Object.assign({ x: 0, y: 0, vx: 0, vy: 0, r: 10, life: 10, t: 0, cd: 0, face: 1, alive: true }, o);
      m.max = m.life;
      this.G.minions.push(m);
      return m;
    },
    updateMinions(dt) {
      const M = this.G.minions;
      for (let i = M.length - 1; i >= 0; i--) {
        const m = M[i];
        m.t += dt; m.life -= dt;
        if (m.update) m.update(m, dt);
        const W = CA.Locations.WORLD;
        m.x = U.clamp(m.x, 10, W - 10); m.y = U.clamp(m.y, 10, W - 10);
        if (m.life <= 0 || !m.alive) { m.alive = false; if (m.onEnd) m.onEnd(m); M.splice(i, 1); }
      }
    },
    drawMinions(ctx, view) {
      for (const m of this.G.minions) {
        if (m.x < view.x0 - 120 || m.x > view.x1 + 120 || m.y < view.y0 - 120 || m.y > view.y1 + 120) { if (!m.big) continue; }
        if (m.draw) { ctx.save(); m.draw(ctx, m); ctx.restore(); }
      }
    },
    countMinions(kind) { let n = 0; for (const m of this.G.minions) if (!kind || m.kind === kind) n++; return n; },

    // ---------- cast helpers ----------
    chargeFx(p, color, t) {
      CA.FX.implode(p.x, p.y - 20, color, 14, 70, t || 0.35);
      p.cast = Math.max(p.cast, 1);
    },

    // ================= LEVEL-UP CARDS =================
    STATS: [
      { id: 'might', ru: 'Сила проклятия', kanji: '力', desc: (m) => '+' + Math.round(8 * m) + '% урона', apply: (p, m) => { p.bonus.dmg += 0.08 * m; } },
      { id: 'vital', ru: 'Живучесть', kanji: '命', desc: (m) => '+' + Math.round(12 * m) + '% макс. здоровья и лечение', apply: (p, m) => { p.bonus.hp += 0.12 * m; p.recalc(); p.heal(p.maxHp * 0.25); } },
      { id: 'swift', ru: 'Стремительность', kanji: '速', desc: (m) => '+' + Math.round(6 * m) + '% скорости', apply: (p, m) => { p.bonus.spd += 0.06 * m; } },
      { id: 'focus', ru: 'Концентрация', kanji: '集', desc: (m) => '-' + Math.round(5 * m) + '% перезарядки', apply: (p, m) => { p.bonus.cd += 0.05 * m; } },
      { id: 'precise', ru: 'Точность', kanji: '的', desc: (m) => '+' + Math.round(4 * m) + '% шанс крита', apply: (p, m) => { p.bonus.crit += 0.04 * m; } },
      { id: 'flow', ru: 'Поток энергии', kanji: '流', desc: (m) => '+' + Math.round(12 * m) + '% накопления энергии', apply: (p, m) => { p.bonus.ce += 0.12 * m; } },
      { id: 'magnet', ru: 'Притяжение душ', kanji: '磁', desc: (m) => '+' + Math.round(25 * m) + '% радиус сбора', apply: (p, m) => { p.bonus.magnet += 0.25 * m; } },
      { id: 'guard', ru: 'Защитный покров', kanji: '守', desc: (m) => '+' + Math.round(4 * m) + '% защиты', apply: (p, m) => { p.bonus.def += 0.04 * m; } },
      { id: 'expanse', ru: 'Расширение', kanji: '広', desc: (m) => '+' + Math.round(6 * m) + '% область техник', apply: (p, m) => { p.bonus.area += 0.06 * m; } },
      { id: 'regen', ru: 'Обратная техника', kanji: '癒', desc: (m) => '+' + (0.4 * m).toFixed(1) + ' HP/сек регенерации', apply: (p, m) => { p.bonus.regen += 0.4 * m; } },
    ],
    rollRarity(luck) {
      const list = [RARITY.common, RARITY.rare, RARITY.epic, RARITY.legendary];
      return U.weighted(list, (r) => r.w * (r.id === 'common' ? 1 : 1 + luck)).id;
    },
    rollCards(p, n) {
      const kit = p.kit;
      const pool = [];
      const lv = p.lv;
      // combos (mythic) — strongly weighted when available
      for (const c of kit.combos) {
        if (p.combos[c.id]) continue;
        if ((lv[c.a] || 0) >= c.al && (lv[c.b] || 0) >= c.bl) {
          pool.push({ w: 120, card: { kind: 'combo', id: c.id, rarity: 'mythic', title: c.name, icon: c.icon || c.id, desc: c.desc, tag: 'КОМБИНАЦИЯ', apply: () => { p.combos[c.id] = true; p.onCombo(c); } } });
        }
      }
      const techs = [kit.basic, kit.passive].concat(kit.skills).concat([kit.ult]);
      for (const s of techs) {
        const cur = lv[s.id] || 0;
        if (cur >= 5) continue;
        const isNew = cur === 0;
        const rar = isNew ? 'rare' : LV_RARITY[cur + 1];
        const w = isNew ? 22 : (s === kit.ult ? 8 : 14);
        pool.push({ w, card: {
          kind: 'tech', id: s.id, rarity: rar, title: s.name, icon: s.icon || s.id,
          desc: s.levels[cur], tag: isNew ? 'НОВАЯ ТЕХНИКА' : 'УР. ' + cur + ' → ' + (cur + 1), lvl: cur + 1,
          apply: () => { p.learn(s.id); },
        } });
      }
      // domain awakening
      const dom = kit.domain;
      const dl = lv[dom.id] || 0;
      if (dl < 5 && (dl > 0 || p.level >= 8)) {
        pool.push({ w: dl === 0 ? 30 : 7, card: {
          kind: 'tech', id: dom.id, rarity: dl === 0 ? 'legendary' : LV_RARITY[dl + 1] === 'common' ? 'epic' : 'legendary',
          title: dom.name, icon: 'domain', desc: dom.levels[dl], tag: dl === 0 ? 'ПРОБУЖДЕНИЕ ТЕРРИТОРИИ' : 'УР. ' + dl + ' → ' + (dl + 1), lvl: dl + 1,
          apply: () => { p.learn(dom.id); },
        } });
      }
      // generic stats
      const luck = p.luck;
      for (const st of this.STATS) {
        const rar = this.rollRarity(luck);
        const m = RARITY[rar].mag;
        pool.push({ w: 9, card: { kind: 'stat', id: st.id, rarity: rar, title: st.ru, icon: st.id, desc: st.desc(m), tag: 'УСИЛЕНИЕ', apply: () => st.apply(p, m) } });
      }
      // pick n distinct
      const out = [];
      const used = {};
      // guarantee a combo slot if any combo exists
      const combos = pool.filter((x) => x.card.kind === 'combo');
      if (combos.length) { const c = combos[0]; out.push(c.card); used[c.card.id] = 1; }
      let guard = 0;
      while (out.length < n && guard++ < 200) {
        const avail = pool.filter((x) => !used[x.card.id]);
        if (!avail.length) break;
        const pick = U.weighted(avail, 'w');
        used[pick.card.id] = 1;
        out.push(pick.card);
      }
      if (!out.length) {
        out.push({ kind: 'stat', id: 'feast', rarity: 'epic', title: 'Проклятый пир', icon: 'star', desc: 'Полное лечение и +40 осколков', tag: 'НАГРАДА', apply: () => { p.heal(p.maxHp); this.G.run.shardsBonus += 40; } });
      }
      return out;
    },
    // nice text for collection/techniques screen
    allTechs(kit) { return [kit.basic, kit.passive].concat(kit.skills).concat([kit.ult, kit.domain]); },
  };
  CA.A = A;
})();
