/* player.js — the sorcerer: stats, movement, skill slots, damage intake, hooks */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U;

  class Player {
    constructor(G, charId) {
      this.G = G;
      this.id = charId;
      this.ch = CA.Chars.get(charId);
      this.kit = CA.Kits[charId];
      this.x = CA.Locations.WORLD / 2; this.y = CA.Locations.WORLD / 2;
      this.r = 13;
      this.vx = 0; this.vy = 0; this.dirA = 0; this.face = 1; this.moving = false; this.moveMag = 0;
      this.t = 0; this.atk = 0; this.aimA = 0; this.cast = 0; this.hurtT = 0; this.invuln = 0;
      this.level = 1; this.xp = 0; this.xpNext = this.xpFor(1);
      this.ce = 0; this.domainGauge = 0;
      this.lv = {};          // tech id -> level
      this.cds = {};         // tech id -> remaining cooldown
      this.cdMax = {};
      this.combos = {};
      this.artifacts = [];
      this.buffs = [];       // {id, t, max, label, color}
      this.shieldOrbs = 0;   // generic hit-blockers
      this.reviveCharges = 0;
      this.hooks = { hit: [], kill: [], hurt: [], cast: [], tick: [] };
      this.bonus = { dmg: 0, hp: 0, spd: 0, cd: 0, crit: 0, ce: 0, magnet: 0, def: 0, area: 0, regen: 0, critDmg: 0, lifesteal: 0, atkSpd: 0, xp: 0, ultCost: 0, dur: 0, skillDmg: 0, basicDmg: 0, luck: 0 };
      this.mult = { dmg: 1, hp: 1 }; // multiplicative (artifacts)
      this.meta = CA.Prog.metaBonuses();
      this.state = {}; // per-kit scratch
      this.alpha = 1;
      this.dead = false;
      this.domainUses = 0; this.ultUses = 0;
      this.recalc();
      this.hp = this.maxHp;
      // learn starting techniques
      this.lv[this.kit.basic.id] = 1;
      this.lv[this.kit.passive.id] = 1;
      this.lv[this.kit.skills[0].id] = 1;
      this.lv[this.kit.ult.id] = 1;
      this.discover(this.kit.basic.id); this.discover(this.kit.passive.id); this.discover(this.kit.skills[0].id); this.discover(this.kit.ult.id);
      if (this.kit.init) this.kit.init(G, this);
    }
    xpFor(l) { return Math.floor(6 + l * 3.4 + l * l * 0.2); }
    recalc() {
      const b = this.bonus, m = this.meta, base = this.ch.stats;
      const oldMax = this.maxHp || 0;
      this.maxHp = Math.round(base.hp * (1 + b.hp + m.hp) * this.mult.hp);
      if (oldMax && this.hp) this.hp = Math.min(this.maxHp, this.hp + Math.max(0, this.maxHp - oldMax));
      this.speed = base.spd * (1 + b.spd + m.spd);
      this.def = U.clamp(b.def + m.def, 0, 0.7);
      this.crit = 0.05 + b.crit + m.crit;
      this.critDmg = 1.75 + b.critDmg;
      this.cdMul = Math.max(0.35, 1 - b.cd - m.cd);
      this.ceMul = 1 + b.ce + m.ce;
      this.magnet = 80 * (1 + b.magnet + m.magnet);
      this.area = 1 + b.area;
      this.regen = b.regen;
      this.luck = b.luck;
    }
    power(kind) {
      let m = (1 + this.bonus.dmg + this.meta.dmg) * this.mult.dmg * this.ch.stats.dmg;
      if (kind === 'skill') m *= 1 + this.bonus.skillDmg;
      if (kind === 'basic') m *= 1 + this.bonus.basicDmg;
      for (const b of this.buffs) if (b.dmg) m *= 1 + b.dmg;
      if (this.kit.dmgMod) m *= this.kit.dmgMod(this);
      return m;
    }
    get speedNow() {
      let s = this.speed;
      for (const b of this.buffs) if (b.spd) s *= 1 + b.spd;
      if (this.kit.spdMod) s *= this.kit.spdMod(this);
      return s;
    }
    cdRate() {
      let r = 1;
      for (const b of this.buffs) if (b.cdRate) r *= b.cdRate;
      if (this.G.domain && this.G.domain.cdRate) r *= this.G.domain.cdRate;
      return r;
    }
    addBuff(id, t, props) {
      let b = this.buffs.find((x) => x.id === id);
      if (b) { b.t = Math.max(b.t, t); b.max = Math.max(b.max, t); Object.assign(b, props); return b; }
      b = Object.assign({ id, t, max: t }, props);
      this.buffs.push(b);
      return b;
    }
    hasBuff(id) { return this.buffs.some((b) => b.id === id); }
    discover(id) {
      const d = CA.Store.data.discovered.tech;
      if (!d[id]) { d[id] = 1; }
    }
    learn(id) {
      const cur = this.lv[id] || 0;
      this.lv[id] = Math.min(5, cur + 1);
      this.discover(id);
      const isDomain = id === this.kit.domain.id;
      if (isDomain && cur === 0) {
        this.G.banner('ТЕРРИТОРИЯ ПРОБУЖДЕНА', this.kit.domain.name, this.ch.color, 2.2);
        this.domainGauge = Math.max(this.domainGauge, 35);
      }
      if (cur === 0) this.cds[id] = 0;
      const s = this.techById(id);
      if (s && s.onLearn) s.onLearn(this.G, this, this.lv[id]);
    }
    techById(id) {
      const k = this.kit;
      if (k.basic.id === id) return k.basic;
      if (k.passive.id === id) return k.passive;
      if (k.ult.id === id) return k.ult;
      if (k.domain.id === id) return k.domain;
      return k.skills.find((s) => s.id === id);
    }
    onCombo(c) {
      CA.Store.data.discovered.combos[c.id] = 1;
      this.G.run.combos++;
      this.G.banner('КОМБИНАЦИЯ!', c.name, '#ff3a6a', 2.4);
      CA.FX.ring(this.x, this.y, 10, 260, 0.9, '#ff3a6a', 8);
      CA.FX.burst(this.x, this.y, '#ff6a9a', 40, 300, 6, 1);
      CA.Audio.play('jackpot');
    }
    heal(n) {
      if (n <= 0 || this.dead) return;
      const before = this.hp;
      this.hp = Math.min(this.maxHp, this.hp + n);
      const d = this.hp - before;
      if (d >= 3) CA.FX.text(this.x, this.y - 50, '+' + Math.round(d), '#5aff8a', 13);
    }
    hurt(amount, src, bullet) {
      if (this.dead || this.invuln > 0) return false;
      for (const h of this.hooks.hurt) { amount = h(amount, src, bullet); if (amount <= 0) return false; }
      if (this.shieldOrbs > 0) {
        this.shieldOrbs--;
        CA.FX.ring(this.x, this.y - 20, 10, 40, 0.3, '#ff3a5a', 4);
        CA.Audio.play('shield', 0.5);
        this.invuln = 0.25;
        return true;
      }
      amount *= 1 - this.def;
      amount = Math.max(1, amount);
      this.hp -= amount;
      this.G.run.dmgTaken += amount;
      this.hurtT = 0.25; this.invuln = 0.35;
      CA.FX.text(this.x, this.y - 44, '-' + Math.round(amount), '#ff4a5a', 15, true);
      CA.FX.burst(this.x, this.y - 18, '#ff2a3a', 8, 140, 4, 0.4);
      CA.Audio.play('hurt');
      CA.Audio.vibrate('medium');
      this.G.shake(5);
      this.G.flash('#ff0020', 0.18);
      if (this.hp <= 0) {
        if (this.reviveCharges > 0) {
          this.reviveCharges--;
          this.hp = this.maxHp * 0.5; this.invuln = 2.5;
          this.G.banner('ВОЗРОЖДЕНИЕ', 'Обратная проклятая техника', '#5aff8a', 1.8);
          CA.FX.ring(this.x, this.y, 10, 300, 0.8, '#5aff8a', 8);
          this.G.forEnemiesIn(this.x, this.y, 300, (e) => { if (!e.bossId) { const a = Math.atan2(e.y - this.y, e.x - this.x); e.kvx += Math.cos(a) * 700; e.kvy += Math.sin(a) * 700; e.stunT = 1; } });
        } else {
          this.hp = 0; this.dead = true;
          this.G.onPlayerDeath();
        }
      }
      return true;
    }
    gainXp(n) {
      this.xp += n * (1 + this.bonus.xp);
      while (this.xp >= this.xpNext) {
        this.xp -= this.xpNext;
        this.level++;
        this.xpNext = this.xpFor(this.level);
        this.G.queueLevelUp();
      }
    }
    gainCe(n) {
      if (this.G.ultActive > 0) return;
      this.ce = Math.min(100, this.ce + n * this.ceMul);
      const dl = this.lv[this.kit.domain.id] || 0;
      if (dl > 0 && !this.G.domain) this.domainGauge = Math.min(100, this.domainGauge + n * 0.16 * this.ceMul * (1 + (this.bonus.domainGain || 0)));
    }
    ultCost() { return Math.max(40, 100 * (1 - this.bonus.ultCost)); }

    // ---------- skill use ----------
    skillReady(i) {
      const s = this.kit.skills[i];
      if (!s || !(this.lv[s.id] > 0)) return false;
      return (this.cds[s.id] || 0) <= 0;
    }
    useSkill(i) {
      const s = this.kit.skills[i];
      if (!s || !(this.lv[s.id] > 0) || this.dead) return false;
      if ((this.cds[s.id] || 0) > 0) return false;
      const L = this.lv[s.id];
      const ok = s.cast(this.G, this, L);
      if (ok === false) return false;
      const cd = (typeof s.cd === 'function' ? s.cd(L, this) : s.cd) * this.cdMul;
      this.cds[s.id] = cd; this.cdMax[s.id] = cd;
      this.cast = Math.max(this.cast, 0.6);
      for (const h of this.hooks.cast) h(s, L);
      this.G.run.casts++;
      return true;
    }
    useUlt() {
      if (this.dead || this.ce < this.ultCost() || this.G.ultActive > 0) return false;
      const u = this.kit.ult, L = this.lv[u.id] || 1;
      this.ce -= this.ultCost();
      this.ultUses++;
      this.G.run.ults++;
      CA.Store.data.stats.ultsUsed++;
      this.G.ultCinematic(this, u);
      u.cast(this.G, this, L);
      for (const h of this.hooks.cast) h(u, L);
      return true;
    }
    useDomain() {
      const d = this.kit.domain, L = this.lv[d.id] || 0;
      if (this.dead || L <= 0 || this.domainGauge < 100 || this.G.domain) return false;
      this.domainGauge = 0;
      this.domainUses++;
      this.G.run.domains++;
      CA.Domains.activate(this.G, this, d, L);
      return true;
    }

    update(dt) {
      const G = this.G;
      this.t += dt;
      if (this.atk > 0) this.atk = Math.max(0, this.atk - dt * 4);
      if (this.cast > 0) this.cast = Math.max(0, this.cast - dt * 2.2);
      if (this.hurtT > 0) this.hurtT -= dt;
      if (this.invuln > 0) this.invuln -= dt;
      // movement
      const mv = this.lockMove > 0 ? { x: 0, y: 0 } : CA.Input.move();
      if (this.lockMove > 0) this.lockMove -= dt;
      const mag = Math.hypot(mv.x, mv.y);
      this.moving = mag > 0.1;
      this.moveMag = mag;
      if (this.moving) {
        this.dirA = Math.atan2(mv.y, mv.x);
        if (Math.abs(mv.x) > 0.15) this.face = mv.x < 0 ? -1 : 1;
      }
      const sp = this.speedNow;
      this.vx = mv.x * sp; this.vy = mv.y * sp;
      if (this.dashV) {
        this.x += this.dashV.x * dt; this.y += this.dashV.y * dt;
        this.dashV.t -= dt;
        if (this.dashV.t <= 0) this.dashV = null;
      } else {
        this.x += this.vx * dt; this.y += this.vy * dt;
      }
      const W = CA.Locations.WORLD;
      this.x = U.clamp(this.x, 16, W - 16); this.y = U.clamp(this.y, 16, W - 16);
      if (this.atk > 0 && !this.moving) this.face = Math.cos(this.aimA) < 0 ? -1 : 1;
      // regen
      let regen = this.regen;
      for (const b of this.buffs) if (b.regen) regen += b.regen * this.maxHp;
      if (regen > 0) this.hp = Math.min(this.maxHp, this.hp + regen * dt);
      // passive CE trickle
      this.gainCe(0.35 * dt);
      // buffs
      for (let i = this.buffs.length - 1; i >= 0; i--) { const b = this.buffs[i]; b.t -= dt; if (b.t <= 0) { this.buffs.splice(i, 1); if (b.onEnd) b.onEnd(); } }
      // cooldowns
      const rate = this.cdRate();
      for (const k in this.cds) if (this.cds[k] > 0) this.cds[k] -= dt * rate;
      // basic attack
      const B = this.kit.basic, bl = this.lv[B.id] || 1;
      const auto = CA.Store.settings.autoAttack;
      const held = CA.Input.down.attack;
      if ((auto || held) && (this.cds[B.id] || 0) <= 0) {
        const fired = B.fire(G, this, bl, held);
        if (fired !== false) {
          let cd = (typeof B.cd === 'function' ? B.cd(bl, this) : B.cd);
          let spdMul = 1 + this.bonus.atkSpd + (held ? 0.3 : 0);
          for (const b of this.buffs) if (b.atkSpd) spdMul *= 1 + b.atkSpd;
          if (G.domain && G.domain.atkSpd) spdMul *= G.domain.atkSpd;
          this.cds[B.id] = cd / spdMul;
        } else this.cds[B.id] = 0.08;
      }
      // passive tick
      const P = this.kit.passive;
      if (P.update) P.update(G, this, this.lv[P.id] || 1, dt);
      if (this.kit.update) this.kit.update(G, this, dt);
      for (const h of this.hooks.tick) h(dt);
    }
    draw(ctx) {
      const flick = this.invuln > 0 && this.hurtT > 0 ? (Math.floor(this.t * 30) % 2 ? 0.45 : 1) : 1;
      if (this.kit.drawUnder) this.kit.drawUnder(ctx, this.G, this);
      CA.Sprites.drawCharacter(ctx, this.id, this.x, this.y, {
        t: this.t, move: this.moving ? Math.min(1, this.moveMag) : 0, face: this.face, atk: this.atk, aimA: this.aimA,
        cast: this.cast, alpha: this.alpha * flick, scale: 1.15, extraArms: this.state.extraArms, eyeGlow: this.cast > 0.2 ? this.cast : 0,
      });
      if (this.kit.drawOver) this.kit.drawOver(ctx, this.G, this);
    }
  }
  CA.Player = Player;
})();
