/* game.js — core engine: main loop, camera, run lifecycle, spawn director, combat resolution, events */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U, FX = CA.FX;
  const TAU = U.TAU;

  const TIER_HP = [1, 1.45, 1.95, 2.6];
  const TIER_DMG = [1.1, 1.3, 1.5, 1.75];
  const MINI_AT = [180, 540];
  const MID_AT = 360;
  const BOSS_AT = 720;

  const G = {
    state: 'menu', canvas: null, ctx: null, W: 0, H: 0, dpr: 1, safe: { t: 0, b: 0, l: 0, r: 0 },
    view: { x0: 0, y0: 0, x1: 0, y1: 0 }, cam: { x: 0, y: 0, zoom: 1, base: 1, punch: 0, sx: 0, sy: 0 },
    frame: 0, t: 0, realT: 0, last: 0, fps: 60, fpsAcc: 0, fpsN: 0, debug: false,
    player: null, enemies: [], enemyFree: [], eshots: [], eshotFree: [], projs: [], projFree: [], zones: [], minions: [],
    pickups: [], timers: [], telegraphs: [], hazards: [], qbuf: [], grid: null,
    hpScale: 1, dmgScale: 1, bossHpScale: 1, enemyCap: 220, enemySlowMul: 1, enemyNoAttack: false, eventMods: {},
    shakeA: 0, flashA: 0, flashC: '#fff', hitstopT: 0, slowT: 0, slowScale: 1, darkA: 0,
    ultFx: null, domainFx: null, domain: null, ultActive: 0, bannerQ: [], banners: [],
    pendingLevels: 0, run: null, boss: null, victoryT: 0, spawnAcc: 0, nextEvent: 90, event: null,
    loc: null,

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      this.grid = new U.Grid(CA.Locations.WORLD, CA.Locations.WORLD, 64);
      CA.A.G = this;
      this.debug = /[?&]debug/.test(location.search);
      this.resize();
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
      if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.resize());
      CA.Input.init(canvas);
      CA.Input.onPress = (id) => this.onButton(id);
      this.last = performance.now();
      requestAnimationFrame((ts) => this.loop(ts));
    },
    resize() {
      const W = window.innerWidth, H = window.innerHeight;
      const q = CA.Store.settings.quality;
      const maxDpr = q === 'low' ? 1 : q === 'medium' ? 1.5 : 2;
      this.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      this.W = W; this.H = H;
      this.canvas.width = Math.round(W * this.dpr); this.canvas.height = Math.round(H * this.dpr);
      this.canvas.style.width = W + 'px'; this.canvas.style.height = H + 'px';
      const probe = document.getElementById('safeProbe');
      if (probe) {
        const cs = getComputedStyle(probe);
        this.safe = { t: parseFloat(cs.paddingTop) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0, r: parseFloat(cs.paddingRight) || 0 };
      }
      this.cam.base = U.clamp(Math.min(W, H) / 410, 0.78, 1.5);
      FX.setQuality(q);
      this.enemyCap = q === 'low' ? 130 : q === 'medium' ? 180 : 230;
      CA.HUD.layout(this);
    },

    // ================= RUN LIFECYCLE =================
    startRun(charId, locId, snap) {
      const d = CA.Store.data;
      this.loc = CA.Locations.get(locId);
      CA.Locations.build(this.loc, this.ctx);
      this.reset();
      this.nightmare = snap ? !!snap.nightmare : !!(d.nightmare && d.nightmareUnlocked);
      this.run = {
        char: charId, loc: locId, time: 0, kills: 0, level: 1, dmg: 0, maxHit: 0, dmgTaken: 0, bosses: 0, mids: 0,
        chests: 0, ults: 0, domains: 0, combos: 0, artifacts: 0, jackpots: 0, sparks: 0, casts: 0, shardsBonus: 0, sealsBonus: 0,
        bigJackpot: false, midDone: false, bossDone: false, miniDone: [false, false], picks: [],
      };
      this.t = 0;
      this.player = new CA.Player(this, charId);
      const p = this.player;
      this.cam.x = p.x; this.cam.y = p.y;
      this.updateScaling();
      if (snap) this.restoreSnapshot(snap);
      else {
        const sl = CA.Prog.metaBonuses().lvl;
        for (let i = 0; i < sl; i++) { p.level++; p.xpNext = p.xpFor(p.level); this.pendingLevels++; }
        p.rerolls = 2 + CA.Prog.metaBonuses().reroll;
      }
      this.state = 'play';
      CA.Input.enabled = true; CA.Input.releaseAll();
      CA.Audio.setIntensity(1);
      CA.UI.showHUD(true);
      this.banner(this.loc.name, this.loc.ru + (this.nightmare ? ' · КОШМАР' : ''), this.loc.accent, 2.6);
      if (!d.seenTutorial) { CA.UI.tutorial(); d.seenTutorial = true; CA.Store.saveSoon(); }
      this.saveSnapshot();
    },
    reset() {
      const recycle = (arr, free) => { for (const o of arr) free.push(o); arr.length = 0; };
      recycle(this.enemies, this.enemyFree); recycle(this.eshots, this.eshotFree); recycle(this.projs, this.projFree);
      this.zones.length = 0; this.minions.length = 0; this.pickups.length = 0; this.timers.length = 0;
      this.telegraphs.length = 0; this.hazards.length = 0; this.banners.length = 0; this.bannerQ.length = 0;
      FX.clear();
      this.domain = null; this.domainFx = null; this.ultFx = null; this.ultActive = 0; this.boss = null;
      this.pendingLevels = 0; this.victoryT = 0; this.spawnAcc = 0; this.nextEvent = 90; this.event = null; this.eventMods = {};
      this.shakeA = 0; this.flashA = 0; this.hitstopT = 0; this.slowT = 0; this.darkA = 0; this.chestQueue = [];
      this.saveT = 10;
    },
    updateScaling() {
      const tier = this.loc.tier - 1, m = this.t / 60;
      const nm = this.nightmare ? 1.9 : 1;
      // location rank ramps in over the first minutes so every arena starts fair but ends brutal
      const ramp = Math.min(1, 0.3 + m / 7);
      this.hpScale = (1 + m * 0.3 + m * m * 0.013) * (1 + (TIER_HP[tier] - 1) * ramp) * nm;
      this.dmgScale = (1 + m * 0.1) * (1 + (TIER_DMG[tier] - 1) * ramp) * (this.nightmare ? 1.4 : 1);
      this.bossHpScale = TIER_HP[tier] * nm * 1.9;
    },
    endRun(victory) {
      if (this.state === 'over') return;
      this.state = 'over';
      CA.Input.enabled = false; CA.Input.releaseAll();
      const run = this.run;
      run.time = this.t; run.level = this.player.level;
      CA.Store.data.runSnapshot = null;
      const rew = CA.Prog.computeRewards(run, victory);
      const res = CA.Prog.applyRun(run, victory, rew);
      CA.Audio.setIntensity(0);
      CA.UI.showHUD(false);
      setTimeout(() => CA.UI.results(victory, run, rew, res), victory ? 300 : 900);
    },
    onPlayerDeath() {
      this.slowmo(0.2, 1.2);
      this.flash('#ff0020', 0.6); this.shake(18);
      FX.burst(this.player.x, this.player.y - 20, '#ff2a3a', 40, 300, 6, 1);
      CA.Audio.play('bigboom'); CA.Audio.vibrate('heavy');
      this.later(1.0, () => this.endRun(false));
    },
    quitRun() { if (this.state !== 'over') { this.state = 'play'; this.endRun(false); } },
    pause() {
      if (this.state !== 'play') return;
      this.state = 'pause';
      CA.Input.enabled = false; CA.Input.releaseAll();
      this.saveSnapshot();
      CA.UI.pauseMenu();
    },
    resume() {
      if (this.state !== 'pause') return;
      this.state = 'play';
      CA.Input.enabled = true; CA.Input.releaseAll();
      this.last = performance.now();
    },

    // ---------- snapshot (restore after Safari closes) ----------
    saveSnapshot() {
      if (!this.run || this.state === 'over' || !this.player || this.player.dead) return;
      const p = this.player;
      CA.Store.data.runSnapshot = {
        v: 1, char: p.id, loc: this.loc.id, nightmare: this.nightmare, t: this.t, level: p.level, xp: p.xp, hp: p.hp, ce: p.ce, dg: p.domainGauge,
        lv: Object.assign({}, p.lv), combos: Object.assign({}, p.combos), arts: p.artifacts.map((a) => a.id), picks: this.run.picks.slice(),
        run: Object.assign({}, this.run, { picks: undefined }), rerolls: p.rerolls, pending: this.pendingLevels, revive: p.reviveCharges,
        saved: Date.now(),
      };
      CA.Store.save();
    },
    restoreSnapshot(s) {
      const p = this.player;
      Object.assign(this.run, s.run || {});
      this.run.picks = s.picks || [];
      this.t = s.t || 0;
      p.level = s.level; p.xpNext = p.xpFor(p.level); p.xp = s.xp || 0;
      for (const k in s.lv) p.lv[k] = s.lv[k];
      for (const k in s.combos) p.combos[k] = s.combos[k];
      for (const pk of this.run.picks) { const st = CA.A.STATS.find((x) => x.id === pk.id); if (st) st.apply(p, CA.A.RARITY[pk.r].mag); }
      for (const id of s.arts || []) { const a = CA.Artifacts.get(id); if (a) { if (a.sealed) { p.artifacts.push(a); p.bonus.dmg += 0.2; } else CA.Artifacts.give(this, p, a); } }
      this.run.artifacts = p.artifacts.length;
      p.recalc();
      p.hp = Math.min(p.maxHp, s.hp || p.maxHp); p.ce = s.ce || 0; p.domainGauge = s.dg || 0;
      p.rerolls = s.rerolls || 0; p.reviveCharges = Math.max(p.reviveCharges, s.revive || 0);
      this.pendingLevels = s.pending || 0;
      this.updateScaling();
      this.banner('ЗАБЕГ ВОССТАНОВЛЕН', U.fmtTime(this.t) + ' · уровень ' + p.level, '#7af0ff', 2.2);
    },

    // ================= MAIN LOOP =================
    loop(ts) {
      requestAnimationFrame((t) => this.loop(t));
      let rdt = (ts - this.last) / 1000;
      this.last = ts;
      if (rdt > 0.25) rdt = 0.016; // tab returned
      rdt = Math.min(rdt, 1 / 24);
      this.realT += rdt;
      this.fpsAcc += rdt; this.fpsN++;
      if (this.fpsAcc >= 0.5) { this.fps = this.fpsN / this.fpsAcc; this.fpsAcc = 0; this.fpsN = 0; this.adaptQuality(); }
      if (this.state === 'menu') { CA.UI.menuFrame(rdt); return; }
      if (!this.player) return;
      if (this.state === 'play') {
        if (this.hitstopT > 0) { this.hitstopT -= rdt; FX.update(rdt * 0.2); }
        else {
          let dt = rdt;
          if (this.slowT > 0) { this.slowT -= rdt; dt *= this.slowScale; }
          if (this.debug && CA.Input.keys.KeyF) dt *= 4;
          this.update(dt);
        }
        this.realUpdate(rdt);
        this.draw();
        this._drawnState = 'play';
      } else if (this._drawnState !== this.state) { // static overlay states: draw once, save battery
        this.draw();
        this._drawnState = this.state;
      }
    },
    adaptQuality() {
      // dynamic particle budget when the device struggles
      if (this.state !== 'play') return;
      if (this.fps < 45 && FX.maxParts > 220) FX.maxParts = Math.max(220, FX.maxParts - 80);
      else if (this.fps > 57 && FX.maxParts < (CA.Store.settings.quality === 'high' ? 900 : 520)) FX.maxParts += 40;
    },
    realUpdate(rdt) {
      if (this.shakeA > 0) this.shakeA = Math.max(0, this.shakeA - rdt * 40);
      if (this.flashA > 0) this.flashA = Math.max(0, this.flashA - rdt * 2.2);
      if (this.cam.punch > 0) this.cam.punch = Math.max(0, this.cam.punch - rdt * 0.6);
      if (this.ultFx) { this.ultFx.t += rdt; if (this.ultFx.t > this.ultFx.dur) this.ultFx = null; }
      if (this.domainFx) { this.domainFx.t += rdt; if (this.domainFx.t > this.domainFx.dur) this.domainFx = null; }
      for (let i = this.banners.length - 1; i >= 0; i--) { const b = this.banners[i]; b.t += rdt; if (b.t > b.dur) this.banners.splice(i, 1); }
      if (this.banners.length === 0 && this.bannerQ.length) this.banners.push(this.bannerQ.shift());
      // levelups / chests open as overlays
      if (this.state === 'play' && !this.ultFx && !this.domainFx) {
        if (this.chestQueue.length) { const c = this.chestQueue.shift(); this.state = 'chest'; CA.Input.enabled = false; CA.Input.releaseAll(); CA.UI.chest(c); }
        else if (this.pendingLevels > 0 && !this.player.dead) { this.state = 'levelup'; CA.Input.enabled = false; CA.Input.releaseAll(); CA.Audio.play('levelup'); CA.UI.levelUp(); }
      }
    },
    update(dt) {
      const p = this.player;
      this.frame++;
      this.t += dt;
      this.run.time = this.t;
      if (this.frame % 30 === 0) this.updateScaling();
      this.saveT -= dt;
      if (this.saveT <= 0) { this.saveT = 10; this.saveSnapshot(); }
      this.enemySlowMul = 1; this.enemyNoAttack = false; this.impactBudget = 10;
      if (this.ultActive > 0) this.ultActive = Math.max(0, this.ultActive - dt);
      // timers
      for (let i = this.timers.length - 1; i >= 0; i--) {
        const tm = this.timers[i];
        tm.t -= dt;
        if (tm.t <= 0) { this.timers.splice(i, 1); try { tm.fn(); } catch (e) { console.error(e); } }
      }
      CA.Domains.update(this, dt);
      // grid rebuild
      this.grid.clear();
      for (const e of this.enemies) if (e.alive) this.grid.insert(e);
      p.update(dt);
      this.director(dt);
      CA.Enemies.update(this, dt);
      CA.Enemies.updateShots(this, dt);
      CA.A.updateProjs(dt);
      CA.A.updateZones(dt);
      CA.A.updateMinions(dt);
      this.updatePickups(dt);
      this.updateTelegraphs(dt);
      this.updateEvent(dt);
      FX.update(dt);
      // compact dead enemies
      const E = this.enemies;
      for (let i = E.length - 1; i >= 0; i--) if (!E[i].alive) { this.enemyFree.push(E[i]); E[i] = E[E.length - 1]; E.pop(); }
      // camera
      const z = this.cam.base * (1 + this.cam.punch);
      this.cam.zoom = z;
      const vh = this.H / z;
      const tx = p.x, ty = p.y + vh * (this.W > this.H ? 0.04 : 0.08);
      const k = Math.min(1, dt * 8);
      this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - this.cam.y) * k;
      CA.Locations.updateAmbient(dt, this.view);
      if (this.victoryT > 0) {
        this.victoryT -= dt;
        if (this.victoryT <= 0 && this.state === 'play') this.endRun(true);
      }
    },

    // ================= SPAWN DIRECTOR =================
    director(dt) {
      const t = this.t, loc = this.loc;
      // scripted encounters
      for (let i = 0; i < MINI_AT.length; i++) {
        if (!this.run.miniDone[i] && t >= MINI_AT[i]) {
          this.run.miniDone[i] = true;
          const pos = this.spawnPos(60);
          const e = CA.Enemies.spawn(this, 'ogre', pos.x, pos.y, { hpMul: 1 + i * 0.6 });
          this.banner('МИНИ-БОСС', 'Огр особого ранга', '#ff7a2a', 2);
          CA.Audio.play('warn');
          void e;
        }
      }
      if (!this.run.midDone && t >= MID_AT) { this.run.midDone = true; this.spawnBoss(loc.mid, true); }
      if (!this.run.bossDone && t >= BOSS_AT && !(this.boss && this.boss.alive)) { this.run.bossDone = true; this.spawnBoss(loc.boss, false); }
      // regular flow
      const bossAlive = this.boss && this.boss.alive;
      let rate = 1.1 + t * 0.016 + (t / 60) * (t / 60) * 0.05;
      if (bossAlive) rate *= 0.35;
      if (this.event && this.event.id === 'blackout') rate *= 0.8;
      if (t > BOSS_AT + 5 && !bossAlive && this.run.bossDone) rate *= 1.3; // post-boss onslaught (endless until victory timer)
      this.spawnAcc += rate * dt;
      if (this.enemies.length >= this.enemyCap) { this.spawnAcc = Math.min(this.spawnAcc, 2); return; }
      while (this.spawnAcc >= 1) {
        const group = Math.min(Math.floor(this.spawnAcc), U.randi(2, 5));
        this.spawnAcc -= group;
        const type = this.pickType();
        const pos = this.spawnPos(40);
        for (let i = 0; i < group && this.enemies.length < this.enemyCap; i++) {
          const elite = t > 60 && Math.random() < 0.0015 + t * 0.000004;
          CA.Enemies.spawn(this, type, U.clamp(pos.x + U.rand(-40, 40), 20, CA.Locations.WORLD - 20), U.clamp(pos.y + U.rand(-40, 40), 20, CA.Locations.WORLD - 20), { elite });
        }
      }
      // periodic elite
      this.eliteT = (this.eliteT == null ? 70 : this.eliteT) - dt;
      if (this.eliteT <= 0) { this.eliteT = U.rand(40, 55); const pos = this.spawnPos(40); CA.Enemies.spawn(this, this.pickType(true), pos.x, pos.y, { elite: true }).chest = true; }
      // events
      this.nextEvent -= dt;
      if (this.nextEvent <= 0 && !this.event && !bossAlive) { this.nextEvent = U.rand(75, 100); this.startEvent(U.choice(loc.events)); }
    },
    pickType(strong) {
      const t = this.t;
      const pool = this.loc.pool.filter((x) => t >= x[1]);
      if (strong) { const s = pool.filter((x) => ['golem', 'brute', 'warden', 'cradle', 'twinface', 'hound', 'spitter'].indexOf(x[0]) >= 0); if (s.length) return U.choice(s)[0]; }
      return U.weighted(pool, (x) => x[2] * (x[1] > 0 ? Math.min(2, 1 + (t - x[1]) / 300) : 1))[0];
    },
    spawnPos(margin) {
      const v = this.view, W = CA.Locations.WORLD;
      for (let k = 0; k < 8; k++) {
        const side = (Math.random() * 4) | 0;
        let x, y;
        if (side === 0) { x = U.rand(v.x0, v.x1); y = v.y0 - margin; }
        else if (side === 1) { x = U.rand(v.x0, v.x1); y = v.y1 + margin; }
        else if (side === 2) { x = v.x0 - margin; y = U.rand(v.y0, v.y1); }
        else { x = v.x1 + margin; y = U.rand(v.y0, v.y1); }
        if (x > 20 && y > 20 && x < W - 20 && y < W - 20) return { x, y };
      }
      const a = Math.random() * TAU;
      return { x: U.clamp(this.player.x + Math.cos(a) * 480, 20, W - 20), y: U.clamp(this.player.y + Math.sin(a) * 480, 20, W - 20) };
    },
    spawnBoss(id, mid) {
      const e = CA.Bosses.spawn(this, id, { hpMul: mid ? 0.6 : 1, mid });
      this.boss = e;
      const def = CA.Bosses.DEFS[id];
      CA.Store.data.discovered.bosses[id] = 1;
      this.bossIntro = { t: 0, dur: 2.4, def, mid };
      this.banner(mid ? 'ПРОКЛЯТИЕ ОСОБОГО РАНГА' : 'ВЛАДЫКА ЛОКАЦИИ', def.ru + ' — ' + def.title, def.color, 3);
      CA.Audio.play('boss'); CA.Audio.setIntensity(2); CA.Audio.vibrate('heavy');
      this.shake(12); this.flash('#000000', 0.5);
      this.forEnemiesIn(this.player.x, this.player.y, 500, (o) => { if (o !== e && !o.bossId) { const a = Math.atan2(o.y - e.y, o.x - e.x); o.kvx += Math.cos(a) * 400; o.kvy += Math.sin(a) * 400; } });
      FX.ring(e.x, e.y, 10, 300, 1.0, def.color, 10);
      return e;
    },
    onBossDeath(e) {
      const def = CA.Bosses.DEFS[e.bossId];
      this.slowmo(0.25, 1.4);
      this.flash('#ffffff', 0.7); this.shake(24);
      FX.disc(e.x, e.y, 260, 1.0, def.color, 1);
      FX.explosion(e.x, e.y, 180, def.color, { debris: '#2a2030' });
      for (let i = 0; i < 4; i++) this.later(0.15 + i * 0.18, () => FX.explosion(e.x + U.rand(-90, 90), e.y + U.rand(-70, 70), U.rand(60, 110), def.color));
      FX.ring(e.x, e.y, 20, 500, 1.2, def.color, 12);
      FX.burst(e.x, e.y, def.color, 70, 500, 8, 1.4);
      FX.shards(e.x, e.y, '#2a2030', 30, 400);
      CA.Audio.play('bigboom'); CA.Audio.vibrate('heavy');
      this.banner('ИЗГНАН!', def.ru, def.color, 2.5);
      const s = CA.Store.data.stats;
      s.bossKills[e.bossId] = (s.bossKills[e.bossId] || 0) + 1;
      this.dropChest(e.x, e.y, e.isMid ? 0.8 : 1.6);
      for (let i = 0; i < 30; i++) this.dropXp(e.x + U.rand(-80, 80), e.y + U.rand(-80, 80), Math.ceil(this.player.xpNext / 12));
      this.player.gainCe(60);
      CA.Audio.setIntensity(1);
      if (e.isMid) { this.run.mids++; this.run.shardsBonus += 30; }
      else {
        this.run.bosses++; this.run.sealsBonus += 1;
        this.victoryT = 4.0;
        this.banner('ПОБЕДА БЛИЗКА', 'Соберите награду…', '#ffd27a', 2.5);
      }
      if (this.boss === e) this.boss = null;
    },

    // ================= EVENTS =================
    startEvent(id) {
      const p = this.player;
      switch (id) {
        case 'horde': {
          this.banner('ОКРУЖЕНИЕ', 'Орда проклятий стягивается к вам!', '#ff5a5a', 2.2);
          const n = Math.min(40, this.enemyCap - this.enemies.length);
          const type = this.pickType();
          for (let i = 0; i < n; i++) { const a = i / n * TAU; CA.Enemies.spawn(this, type, U.clamp(p.x + Math.cos(a) * 380, 20, CA.Locations.WORLD - 20), U.clamp(p.y + Math.sin(a) * 380, 20, CA.Locations.WORLD - 20)); }
          this.event = { id, t: 3 };
          break;
        }
        case 'bell':
          this.banner('ПРОКЛЯТЫЙ КОЛОКОЛ', 'Духи в ярости: скорость +35% на 15 сек', '#c8a0ff', 2.4);
          this.eventMods.enrage = true; this.event = { id, t: 15 };
          CA.Audio.play('boss', 0.4);
          break;
        case 'blackout':
          this.banner('БЛЭКАУТ', 'Тьма поглощает всё вокруг…', '#8a8aff', 2.4);
          this.event = { id, t: 20 };
          break;
        case 'train': {
          this.banner('ПРИЗРАЧНЫЙ ПОЕЗД', 'Уйдите с путей!', '#3affc8', 2);
          this.event = { id, t: 12, n: 3, cd: 0.5 };
          break;
        }
        case 'gravity': {
          this.banner('ГРАВИТАЦИОННЫЙ РАЗЛОМ', 'Пространство затягивает всех внутрь', '#d07aff', 2.4);
          const a = Math.random() * TAU;
          this.event = { id, t: 10, x: p.x + Math.cos(a) * 220, y: p.y + Math.sin(a) * 220 };
          break;
        }
        case 'elite':
          this.banner('ЭЛИТНЫЙ ОТРЯД', 'Особо сильные духи несут сундуки', '#ffc83a', 2.2);
          for (let i = 0; i < 3; i++) { const pos = this.spawnPos(40); CA.Enemies.spawn(this, this.pickType(true), pos.x, pos.y, { elite: true }).chest = i === 0; }
          this.event = { id, t: 2 };
          break;
      }
    },
    updateEvent(dt) {
      const ev = this.event;
      if (!ev) return;
      ev.t -= dt;
      const p = this.player;
      if (ev.id === 'train') {
        ev.cd -= dt;
        if (ev.cd <= 0 && ev.n > 0) {
          ev.n--; ev.cd = 3.5;
          const horiz = Math.random() < 0.5;
          const off = U.rand(-60, 60);
          const x1 = horiz ? p.x - 700 : p.x + off, y1 = horiz ? p.y + off : p.y - 900;
          const x2 = horiz ? p.x + 700 : p.x + off, y2 = horiz ? p.y + off : p.y + 900;
          CA.Audio.play('warn');
          this.telegraph({ shape: 'line', x: x1, y: y1, x2, y2, w: 80, t: 1.6, color: '#3affc8', onFire: () => {
            this.hurtLine(x1, y1, x2, y2, 80, 30 * this.dmgScale);
            CA.A.hitLine(x1, y1, x2, y2, 80, 400 * this.hpScale, { noCe: true, noCrit: true, src: 'train' });
            FX.beam(x1, y1, x2, y2, 70, '#3affc8', 0.5);
            for (let i = 0; i < 12; i++) FX.sparks(U.lerp(x1, x2, i / 12), U.lerp(y1, y2, i / 12), '#ffe08a', 3, 260);
            this.shake(10); CA.Audio.play('whoosh'); CA.Audio.play('boom', 0.6);
          } });
        }
      }
      if (ev.id === 'gravity') {
        const list = CA.A.inRadius(ev.x, ev.y, 420, []);
        for (const e of list) { if (e.bossId) continue; const d = U.dist(e.x, e.y, ev.x, ev.y) || 1; e.x += (ev.x - e.x) / d * 90 * dt; e.y += (ev.y - e.y) / d * 90 * dt; }
        const d = U.dist(p.x, p.y, ev.x, ev.y) || 1;
        if (d < 420) { p.x += (ev.x - p.x) / d * 55 * dt; p.y += (ev.y - p.y) / d * 55 * dt; }
        ev.tick = (ev.tick || 0) - dt;
        if (ev.tick <= 0) { ev.tick = 0.4; if (d < 50) p.hurt(8 * this.dmgScale); CA.A.hitCircle(ev.x, ev.y, 50, 60 * this.hpScale * 0.3, { noCe: true, noCrit: true, src: 'rift' }); }
        if (Math.random() < 0.8) FX.implode(ev.x, ev.y, '#d07aff', 1, 200, 0.7);
      }
      if (ev.t <= 0) {
        if (ev.id === 'bell') this.eventMods.enrage = false;
        this.event = null;
      }
    },

    // ================= COMBAT API =================
    hitEnemy(e, dmg, opt) {
      if (!e.alive || e.immune > 0 || e.hidden > 0) return 0;
      opt = opt || {};
      const p = this.player;
      let crit = false;
      if (!opt.noCrit) { crit = Math.random() < p.crit + (opt.critBonus || 0); if (crit) dmg *= p.critDmg; }
      if (p.bonus.slowOnHit && e.slowT > 0) dmg *= 1.15;
      if (e.armor) dmg *= 1 - e.armor;
      const fx = opt.fx != null ? opt.fx : p.x, fy = opt.fy != null ? opt.fy : p.y;
      if (e.def.shield && e.shieldHp > 0) {
        const facing = Math.atan2(p.y - e.y, p.x - e.x), src = Math.atan2(fy - e.y, fx - e.x);
        if (Math.abs(U.angDiff(facing, src)) < 1.25) {
          const ab = dmg * 0.7;
          e.shieldHp -= ab; dmg *= 0.3;
          if (Math.random() < 0.4) FX.sparks(e.x, e.y, '#f2ece0', 3, 160);
          if (e.shieldHp <= 0) { FX.shards(e.x, e.y - 6, '#f2ece0', 10, 220); FX.label(e.x, e.y - 30, 'МАСКА РАЗБИТА', '#f2ece0', 12, 0.8); CA.Audio.play('crit'); }
        }
      }
      if (dmg <= 0) return 0;
      e.hp -= dmg;
      e.hitFlash = 0.08;
      if (opt.knock && !e.bossId) {
        const a = Math.atan2(e.y - fy, e.x - fx), k = opt.knock / Math.sqrt(Math.max(0.5, e.mass));
        e.kvx += Math.cos(a) * k; e.kvy += Math.sin(a) * k;
      }
      if (opt.stun) e.stunT = Math.max(e.stunT, e.bossId ? opt.stun * 0.15 : opt.stun);
      if (opt.slow) { e.slowT = Math.max(e.slowT, opt.slow[1]); e.slowAmt = Math.max(e.slowAmt, opt.slow[0]); }
      if (p.bonus.slowOnHit) { e.slowT = Math.max(e.slowT, 1.5); e.slowAmt = Math.max(e.slowAmt, p.bonus.slowOnHit); }
      if (opt.burn) { e.burnDps = Math.max(e.burnDps, opt.burn[0]); e.burnT = Math.max(e.burnT, opt.burn[1]); }
      if (crit && p.bonus.critBurn) { e.burnDps = Math.max(e.burnDps, dmg * 0.1); e.burnT = Math.max(e.burnT, 2.5); }
      if (p.bonus.lifesteal) { p.lsAcc = (p.lsAcc || 0) + dmg * p.bonus.lifesteal; }
      const run = this.run;
      run.dmg += dmg;
      if (dmg > run.maxHit) { run.maxHit = dmg; if (dmg > CA.Store.data.stats.maxHit) CA.Store.data.stats.maxHit = dmg; }
      if (!opt.noText && (dmg >= 1)) {
        if (crit || opt.big) FX.text(e.x, e.y - e.r - 6, Math.round(dmg) + (crit ? '!' : ''), opt.big ? '#ff5a7a' : '#ffd84a', opt.big ? 22 : 17, true);
        else if (!opt.small || Math.random() < 0.35) FX.text(e.x, e.y - e.r - 4, '' + Math.round(dmg), '#ffffff', 12);
      }
      if (!opt.noCe && e.bossId) p.gainCe(dmg / e.maxHp * 220);
      for (const h of p.hooks.hit) h(e, dmg, opt);
      if (!opt.silent) CA.Audio.play(crit ? 'crit' : 'hit', 0.6);
      if (!opt.silent && !opt.small && this.impactBudget > 0) { this.impactBudget--; FX.impact(e.x + U.rand(-4, 4), e.y - e.r * 0.3, crit ? '#ffd84a' : (p.ch.color), crit ? 30 : 16 + Math.min(14, dmg * 0.05)); }
      if (crit) { FX.sparks(e.x, e.y, '#ffe08a', 5, 260); if (dmg > 60 && this.impactBudget > 0) FX.flare(e.x, e.y - e.r * 0.3, '#ffd84a', 40 + Math.min(60, dmg * 0.1), 0.2); }
      if (e.hp <= 0) this.killEnemy(e);
      return dmg;
    },
    killEnemy(e, silent) {
      if (!e.alive) return;
      e.alive = false;
      const p = this.player, d = e.def;
      if (e.bossId) { this.onBossDeath(e); }
      this.run.kills++;
      const st = CA.Store.data.stats;
      st.kills++;
      st.killsByType[e.type] = (st.killsByType[e.type] || 0) + 1;
      CA.Store.data.discovered.enemies[e.type] = 1;
      if (!e.noXp && e.xp > 0) this.dropXp(e.x, e.y, e.xp);
      if (e.elite || d.miniboss) {
        if (d.miniboss || e.chest || Math.random() < 0.3) this.dropChest(e.x, e.y, d.miniboss ? 0.6 : 0);
        else { this.dropPickup('heal', e.x, e.y); for (let i = 0; i < 4; i++) this.dropXp(e.x + U.rand(-30, 30), e.y + U.rand(-30, 30), 3); }
        if (d.miniboss) { for (let i = 0; i < 12; i++) this.dropXp(e.x + U.rand(-50, 50), e.y + U.rand(-50, 50), 5); this.banner('', 'Огр повержен!', '#ff7a2a', 1.4); }
      } else {
        const r = Math.random();
        if (r < 0.012) this.dropPickup('heal', e.x, e.y);
        else if (r < 0.015) this.dropPickup('magnet', e.x, e.y);
      }
      p.gainCe(e.elite ? 8 : d.miniboss ? 25 : 0.65);
      if (!silent && !e.bossId) {
        FX.burst(e.x, e.y, d.col || '#a080c0', e.elite ? 18 : 7, 160, e.r * 0.35, 0.5);
        FX.wisps(e.x, e.y - e.r * 0.3, e.elite ? '#ffc83a' : '#b48aff', e.elite ? 6 : e.r > 18 ? 3 : 1);
        if (e.elite || d.miniboss) FX.explosion(e.x, e.y, e.r * 2.4, e.elite ? '#ffc83a' : '#ff7a2a', { decal: true });
        if (Math.random() < 0.35) FX.smoke(e.x, e.y, '#1a1020', 2, 30, e.r, 0.6);
        FX.decal(e.x, e.y + e.r * 0.4, e.r * 1.1, '#140a18', 3);
        CA.Audio.play('death', 0.5);
      }
      if (d.split) for (let i = 0; i < 2; i++) { const c = CA.Enemies.spawn(this, d.split, e.x + (i ? 10 : -10), e.y, { noXp: false }); c.kvx = (i ? 1 : -1) * 220; }
      for (const h of p.hooks.kill) h(e);
    },
    forEnemiesIn(x, y, r, fn) { const l = CA.A.inRadius(x, y, r, []); for (const e of l) fn(e); },
    nearestEnemy(x, y, r) { return CA.A.nearest(x, y, r); },
    enemyShot(x, y, vx, vy, r, dmg, color, kind, boss) {
      const b = this.eshotFree.pop() || {};
      b.x = x; b.y = y; b.vx = vx; b.vy = vy; b.r = r; b.dmg = dmg; b.color = color; b.kind = kind || 'orb'; b.boss = !!boss;
      b.life = 5; b.t = 0; b.slowF = 1; b.acc = 0; b.onEnd = null;
      this.eshots.push(b);
      return b;
    },
    telegraph(o) { o.max = o.t; this.telegraphs.push(o); return o; },
    hurtCircle(x, y, r, dmg) { const p = this.player; if (U.dist2(x, y, p.x, p.y) < (r + p.r * 0.6) ** 2) p.hurt(dmg); },
    hurtLine(x1, y1, x2, y2, w, dmg) { const p = this.player; if (U.segDist2(p.x, p.y, x1, y1, x2, y2) < (w / 2 + p.r * 0.6) ** 2) p.hurt(dmg); },
    hazard(x, y, r, life, dps, color) { this.hazards.push({ x, y, r, life, max: life, dps, color, tick: 0 }); },
    updateTelegraphs(dt) {
      const T = this.telegraphs;
      for (let i = T.length - 1; i >= 0; i--) {
        const t = T[i];
        t.t -= dt;
        if (t.t <= 0) { T.splice(i, 1); if (t.onFire) t.onFire(); }
      }
      const H = this.hazards, p = this.player;
      for (let i = H.length - 1; i >= 0; i--) {
        const h = H[i];
        h.life -= dt; h.tick -= dt;
        if (h.tick <= 0) { h.tick = 0.5; if (U.dist2(h.x, h.y, p.x, p.y) < h.r * h.r) p.hurt(h.dps * 0.5); }
        if (h.life <= 0) H.splice(i, 1);
      }
      // also flush deferred enemy-shot ends
      for (const b of this.eshots) if (b.life <= 0 && b.onEnd) { const f = b.onEnd; b.onEnd = null; f(b); }
    },
    later(t, fn) { this.timers.push({ t, fn }); },
    queueLevelUp() { this.pendingLevels++; this.run.level = this.player.level; },

    // ---------- pickups ----------
    dropXp(x, y, v) {
      if (this.pickups.length > 280) {
        // merge into a nearby orb to cap object count
        let best = null, bd = 1e12;
        for (let i = 0; i < 24; i++) { const o = this.pickups[(Math.random() * this.pickups.length) | 0]; if (o.kind !== 'xp') continue; const d = U.dist2(o.x, o.y, x, y); if (d < bd) { bd = d; best = o; } }
        if (best) { best.v += v; return; }
      }
      this.pickups.push({ kind: 'xp', x, y, v, t: 0, pull: false, vx: U.rand(-40, 40), vy: U.rand(-40, 40) });
    },
    dropPickup(kind, x, y) { this.pickups.push({ kind, x, y, v: 1, t: 0, pull: false, vx: 0, vy: -60 }); },
    dropChest(x, y, bias) { this.pickups.push({ kind: 'chest', x, y, v: bias || 0, t: 0, pull: false, vx: 0, vy: -100 }); FX.ring(x, y, 5, 60, 0.5, '#ffc83a', 4); },
    updatePickups(dt) {
      const p = this.player, P = this.pickups;
      const mag = p.magnet;
      for (let i = P.length - 1; i >= 0; i--) {
        const o = P[i];
        o.t += dt;
        if (o.vx || o.vy) { o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= 0.9; o.vy *= 0.9; if (Math.abs(o.vx) + Math.abs(o.vy) < 2) o.vx = o.vy = 0; }
        const dx = p.x - o.x, dy = p.y - 14 - o.y, d = Math.hypot(dx, dy);
        const reach = o.kind === 'chest' ? 60 : mag;
        if (d < reach || o.pull) {
          o.pull = true;
          const sp = 420 + o.t * 200;
          o.x += dx / (d || 1) * sp * dt; o.y += dy / (d || 1) * sp * dt;
        }
        if (d < 22) {
          P.splice(i, 1);
          switch (o.kind) {
            case 'xp': p.gainXp(o.v); CA.Audio.play('xp', 0.4); break;
            case 'heal': p.heal(p.maxHp * 0.2); FX.ring(p.x, p.y - 20, 10, 40, 0.4, '#5aff8a', 3); CA.Audio.play('pickup'); break;
            case 'magnet': for (const q of P) if (q.kind === 'xp') q.pull = true; FX.ring(p.x, p.y, 10, 300, 0.5, '#7af0ff', 4); CA.Audio.play('pickup'); break;
            case 'chest': this.run.chests++; this.chestQueue.push({ bias: o.v }); CA.Audio.play('chest'); break;
          }
        }
      }
      if (p.lsAcc) { const h = Math.min(p.lsAcc, 6 * dt); p.hp = Math.min(p.maxHp, p.hp + h); p.lsAcc = 0; }
    },

    // ---------- feel ----------
    shake(a) { if (CA.Store.settings.screenShake) this.shakeA = Math.min(26, Math.max(this.shakeA, a)); },
    flash(c, a) { this.flashC = c; this.flashA = Math.max(this.flashA, a); },
    hitstop(t) { this.hitstopT = Math.max(this.hitstopT, t); },
    slowmo(scale, t) { this.slowScale = scale; this.slowT = Math.max(this.slowT, t); },
    banner(title, sub, color, dur) {
      const b = { title, sub, color: color || '#fff', dur: dur || 2, t: 0 };
      if (this.banners.length) { if (this.bannerQ.length < 4) this.bannerQ.push(b); } else this.banners.push(b);
    },
    ultCinematic(p, u) {
      const L = p.lv[u.id] || 1;
      this.ultActive = u.dur ? u.dur(L) : 3;
      this.ultFx = { t: 0, dur: 1.1, name: u.name, icon: u.icon || u.id, color: p.ch.color };
      this.slowmo(0.3, 0.5);
      this.cam.punch = 0.22;
      this.flash(p.ch.color, 0.35);
      CA.Audio.play('ult'); CA.Audio.vibrate('heavy');
      FX.implode(p.x, p.y - 20, p.ch.color, 30, 140, 0.4);
      FX.ring(p.x, p.y - 20, 160, 10, 0.4, '#ffffff', 4);
    },
    domainIntro(def, p) {
      this.domainFx = { t: 0, dur: 1.4, def };
      this.slowmo(0.12, 1.0);
      this.cam.punch = 0.3;
      CA.Audio.play('domain'); CA.Audio.vibrate('heavy');
    },

    onButton(id) {
      if (this.state !== 'play') return;
      const p = this.player;
      if (!p || p.dead) return;
      if (id === 'pause') { this.pause(); return; }
      if (id === 'attack') { if (p.kit.onAttackPress) p.kit.onAttackPress(this, p); CA.Audio.vibrate('light'); return; }
      if (id === 'ult') { if (p.useUlt()) return; CA.Audio.play('back', 0.4); return; }
      if (id === 'domain') { if (p.useDomain()) return; CA.Audio.play('back', 0.4); return; }
      if (id[0] === 's') {
        const i = +id[1];
        if (p.useSkill(i)) CA.Audio.vibrate('light');
        else CA.Audio.play('back', 0.3);
      }
    },

    // ================= RENDER =================
    draw() {
      const ctx = this.ctx, dpr = this.dpr, W = this.W, H = this.H, cam = this.cam;
      const z = cam.zoom || cam.base;
      let sx = 0, sy = 0;
      if (this.shakeA > 0) { sx = (Math.random() - 0.5) * this.shakeA; sy = (Math.random() - 0.5) * this.shakeA; }
      const v = this.view;
      v.x0 = cam.x - W / 2 / z; v.x1 = cam.x + W / 2 / z; v.y0 = cam.y - H / 2 / z; v.y1 = cam.y + H / 2 / z;
      ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (W / 2 - cam.x * z + sx), dpr * (H / 2 - cam.y * z + sy));
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (this.domain) this.domain.def.drawBg(ctx, this, this.domain, v);
      else CA.Locations.drawGround(ctx, v, this.realT);
      FX.drawUnder(ctx, v);
      CA.A.drawZones(ctx, true, v);
      this.drawTelegraphs(ctx);
      this.drawPickups(ctx, v);
      CA.Enemies.draw(ctx, this, v);
      CA.A.drawMinions(ctx, v);
      if (this.player) this.player.draw(ctx);
      CA.A.drawZones(ctx, false, v);
      CA.A.drawProjs(ctx, v);
      CA.Enemies.drawShots(ctx, this, v);
      FX.drawParticles(ctx, v);
      FX.drawOver(ctx, v);
      if (!this.domain) CA.Locations.drawAmbient(ctx);
      if (this.event && this.event.id === 'gravity') this.drawRift(ctx, this.event);
      FX.drawTexts(ctx);
      // ---- screen space ----
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.drawScreenFx(ctx, W, H);
      CA.HUD.draw(ctx, this);
    },
    drawRift(ctx, ev) {
      const t = this.realT;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) { ctx.globalAlpha = 0.3; ctx.strokeStyle = '#d07aff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ev.x, ev.y, 30 + ((t * 80 + i * 100) % 400), 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.drawImage(FX.getGlow('#d07aff'), ev.x - 70, ev.y - 70, 140, 140);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#05000a'; ctx.beginPath(); ctx.arc(ev.x, ev.y, 24, 0, TAU); ctx.fill();
    },
    drawTelegraphs(ctx) {
      for (const t of this.telegraphs) {
        const k = 1 - t.t / t.max;
        const col = t.color || '#ff3a3a';
        ctx.globalAlpha = 0.18 + k * 0.22;
        ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2;
        if (t.shape === 'circle') {
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, TAU); ctx.fill();
          ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, TAU); ctx.stroke();
          ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(t.x, t.y, Math.max(1, t.r * k), 0, TAU); ctx.fill();
        } else if (t.shape === 'line') {
          ctx.lineCap = 'butt';
          ctx.lineWidth = t.w; ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x2, t.y2); ctx.stroke();
          ctx.globalAlpha = 0.7; ctx.lineWidth = Math.max(2, t.w * k);
          ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x2, t.y2); ctx.stroke();
        } else if (t.shape === 'cone') {
          ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.arc(t.x, t.y, t.r, t.a - t.arc / 2, t.a + t.arc / 2); ctx.closePath(); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      for (const h of this.hazards) {
        const k = Math.min(1, h.life * 2, (h.max - h.life) * 4);
        ctx.globalAlpha = 0.35 * k; ctx.fillStyle = h.color;
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.6 * k; ctx.strokeStyle = h.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r * (0.8 + Math.sin(this.realT * 6) * 0.05), 0, TAU); ctx.stroke();
        if (Math.random() < 0.1) FX.p(h.x + U.rand(-h.r, h.r) * 0.7, h.y + U.rand(-h.r, h.r) * 0.7, 0, -30, 0.6, 3, h.color, 0, 1);
      }
      ctx.globalAlpha = 1;
    },
    drawPickups(ctx, v) {
      const t = this.realT;
      ctx.globalCompositeOperation = 'lighter';
      const g = FX.getGlow('#b06aff'), g2 = FX.getGlow('#5ad8ff');
      for (const o of this.pickups) {
        if (o.x < v.x0 - 20 || o.x > v.x1 + 20 || o.y < v.y0 - 20 || o.y > v.y1 + 20) continue;
        if (o.kind === 'xp') {
          const s = 6 + Math.min(10, Math.sqrt(o.v) * 2.2);
          ctx.drawImage(o.v >= 10 ? g2 : g, o.x - s, o.y - s + Math.sin(t * 4 + o.x) * 2, s * 2, s * 2);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const o of this.pickups) {
        if (o.x < v.x0 - 30 || o.x > v.x1 + 30 || o.y < v.y0 - 30 || o.y > v.y1 + 30) continue;
        const by = Math.sin(t * 3 + o.x) * 3;
        if (o.kind === 'xp') {
          const s = 2.5 + Math.min(4, Math.sqrt(o.v));
          ctx.fillStyle = o.v >= 10 ? '#d8f6ff' : '#ecd8ff';
          ctx.beginPath(); ctx.moveTo(o.x, o.y - s * 1.4 + by); ctx.lineTo(o.x + s, o.y + by); ctx.lineTo(o.x, o.y + s * 1.4 + by); ctx.lineTo(o.x - s, o.y + by); ctx.closePath(); ctx.fill();
        } else if (o.kind === 'heal') {
          FX.glow(ctx, o.x, o.y + by, 22, '#5aff8a', 0.7);
          ctx.fillStyle = '#e8fff0'; ctx.fillRect(o.x - 6, o.y - 2 + by, 12, 4); ctx.fillRect(o.x - 2, o.y - 6 + by, 4, 12);
        } else if (o.kind === 'magnet') {
          FX.glow(ctx, o.x, o.y + by, 22, '#7af0ff', 0.7);
          ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(o.x, o.y + by, 6, Math.PI, 0); ctx.lineTo(o.x + 6, o.y + 6 + by); ctx.moveTo(o.x - 6, o.y + by); ctx.lineTo(o.x - 6, o.y + 6 + by); ctx.stroke();
        } else if (o.kind === 'chest') {
          FX.glow(ctx, o.x, o.y + by, 46, o.v >= 1.5 ? '#ff6ad0' : '#ffc83a', 0.6 + Math.sin(t * 5) * 0.2);
          ctx.save(); ctx.translate(o.x, o.y + by);
          ctx.fillStyle = '#3a1a10'; ctx.strokeStyle = '#ffc83a'; ctx.lineWidth = 2;
          ctx.fillRect(-14, -8, 28, 18); ctx.strokeRect(-14, -8, 28, 18);
          ctx.fillStyle = '#5a2a18'; ctx.beginPath(); ctx.moveTo(-15, -8); ctx.quadraticCurveTo(0, -20, 15, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#ffc83a'; ctx.fillRect(-3, -4, 6, 7);
          ctx.restore();
        }
      }
    },
    drawScreenFx(ctx, W, H) {
      // vignette always (cheap gradient cached)
      if (!this._vig || this._vigW !== W || this._vigH !== H) {
        const c = U.makeCanvas(W, H), g = c.getContext('2d');
        const gr = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H * 0.45, Math.max(W, H) * 0.75);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.6)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        this._vig = c; this._vigW = W; this._vigH = H;
      }
      ctx.drawImage(this._vig, 0, 0, W, H);
      const z = this.cam.zoom, p = this.player;
      const psx = (p.x - this.cam.x) * z + W / 2, psy = (p.y - 20 - this.cam.y) * z + H / 2;
      // blackout event
      if (this.event && this.event.id === 'blackout') {
        const k = Math.min(1, (20 - this.event.t) * 2, this.event.t * 2);
        const gr = ctx.createRadialGradient(psx, psy, 60 * z, psx, psy, 200 * z);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,6,' + (0.94 * k) + ')');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      }
      if (this.eventMods.enrage) { ctx.fillStyle = 'rgba(120,40,200,' + (0.08 + Math.sin(this.realT * 4) * 0.04) + ')'; ctx.fillRect(0, 0, W, H); }
      // ultimate cinematic
      if (this.ultFx) {
        const u = this.ultFx, k = u.t / u.dur;
        const a = k < 0.2 ? k / 0.2 : k > 0.7 ? (1 - k) / 0.3 : 1;
        ctx.fillStyle = 'rgba(0,0,0,' + (0.55 * a) + ')'; ctx.fillRect(0, 0, W, H);
        // speed lines
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 * a) + ')'; ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 40; i++) { const an = i / 40 * TAU + i * 0.37; const r0 = 120 + (i * 37 % 80), r1 = Math.max(W, H); ctx.moveTo(psx + Math.cos(an) * r0, psy + Math.sin(an) * r0); ctx.lineTo(psx + Math.cos(an) * r1, psy + Math.sin(an) * r1); }
        ctx.stroke();
        FX.glow(ctx, psx, psy, 120 * a, u.color, 0.8 * a);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        CA.Icons.draw(ctx, u.icon, W / 2, H * 0.3, Math.min(W, H) * 0.34, u.color, { fill: U.hexA(u.color, 0.25), alpha: 0.55 });
        ctx.font = '900 italic ' + Math.round(Math.min(34, W * 0.08)) + 'px -apple-system, "Helvetica Neue", Arial';
        ctx.lineWidth = 5; ctx.strokeStyle = '#000';
        const tx = W / 2 + (1 - Math.min(1, k * 4)) * 80;
        ctx.strokeText(u.name.toUpperCase(), tx, H * 0.3 + 4);
        ctx.fillStyle = '#ffffff'; ctx.fillText(u.name.toUpperCase(), tx, H * 0.3 + 4);
        ctx.restore();
      }
      // domain overlay (screen-space part)
      if (this.domain && this.domain.def.drawScreen) this.domain.def.drawScreen(ctx, this, this.domain, W, H, this.safe.t + 70);
      if (this.domain) {
        const d = this.domain, rem = d.dur - d.t;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(W / 2 - 80, this.safe.t + 60 + (d.def.drawScreen ? 50 : 0), 160, 6);
        ctx.fillStyle = d.def.color; ctx.fillRect(W / 2 - 80, this.safe.t + 60 + (d.def.drawScreen ? 50 : 0), 160 * (rem / d.dur), 6);
      }
      if (this.domainFx) {
        const f = this.domainFx, k = f.t / f.dur;
        const R = Math.max(W, H) * U.easeIn(Math.min(1, k * 1.2));
        ctx.fillStyle = 'rgba(0,0,0,' + (k < 0.75 ? 0.9 : (1 - k) * 3.6) + ')'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = f.def.color; ctx.lineWidth = 6;
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath(); ctx.arc(psx, psy, Math.max(1, R), 0, TAU); ctx.stroke();
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(psx, psy, Math.max(1, R * 0.8), 0, TAU); ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const a = Math.min(1, k * 4) * (k > 0.85 ? (1 - k) / 0.15 : 1);
        ctx.globalAlpha = a;
        ctx.font = '700 ' + Math.round(Math.min(15, W * 0.035)) + 'px -apple-system, Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Р А С Ш И Р Е Н И Е   Т Е Р Р И Т О Р И И', W / 2, H * 0.36);
        CA.Icons.draw(ctx, 'domain', W / 2, H * 0.46, Math.min(W, H) * 0.2, f.def.color, { fill: U.mixHex(f.def.color, '#ffffff', 0.4) });
        ctx.font = '900 italic ' + Math.round(Math.min(30, W * 0.07)) + 'px -apple-system, Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(f.def.name.toUpperCase(), W / 2, H * 0.57);
        ctx.font = '600 ' + Math.round(Math.min(13, W * 0.03)) + 'px -apple-system, Arial'; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText(f.def.en || '', W / 2, H * 0.6);
        ctx.font = '600 ' + Math.round(Math.min(15, W * 0.035)) + 'px -apple-system, Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText(f.def.desc || '', W / 2, H * 0.64);
        ctx.globalAlpha = 1;
      }
      if (this.flashA > 0) { ctx.globalAlpha = Math.min(0.8, this.flashA); ctx.fillStyle = this.flashC; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      // low HP pulse
      if (p.hp < p.maxHp * 0.3 && !p.dead) {
        const a = (0.25 + Math.sin(this.realT * 6) * 0.12) * (1 - p.hp / (p.maxHp * 0.3));
        ctx.strokeStyle = 'rgba(255,0,30,' + a + ')'; ctx.lineWidth = 30; ctx.strokeRect(0, 0, W, H);
      }
    },
  };
  CA.Game = G;
})();
