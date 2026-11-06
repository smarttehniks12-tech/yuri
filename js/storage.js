/* storage.js — local persistent save (localStorage, versioned, with backup slot) */
(function () {
  'use strict';
  const CA = window.CA;
  const KEY = 'cursed_arena_save_v1';
  const BACKUP = 'cursed_arena_save_v1_bak';

  function defaults() {
    return {
      version: 1,
      shards: 0,
      seals: 0,
      chests: 1, // menu chests ("Cursed Coffers")
      totalShardsEarned: 0,
      meta: { hp: 0, dmg: 0, spd: 0, def: 0, ce: 0, cd: 0, crit: 0, lvl: 0, magnet: 0, reroll: 0 },
      unlockedChars: ['spatial', 'king'],
      selectedChar: 'spatial',
      unlockedLocations: ['school'],
      selectedLocation: 'school',
      nightmareUnlocked: false,
      nightmare: false,
      unlockedArtifacts: null, // filled on first load by artifacts.js defaults
      stats: {
        kills: 0, killsByType: {}, runs: 0, wins: 0, deaths: 0,
        bestTime: 0, maxLevel: 0, bossKills: {}, playTime: 0,
        ultsUsed: 0, domainsUsed: 0, domainChars: {}, chestsOpened: 0, coffersOpened: 0,
        blackSparks: 0, jackpots: 0, maxHit: 0, combosFound: 0, winsByChar: {},
        nightmareWins: 0, bestKillsRun: 0,
      },
      achievements: {},
      discovered: { tech: {}, combos: {}, artifacts: {}, enemies: {}, bosses: {} },
      settings: {
        master: 0.8, sfx: true, skills: true, ui: true, music: true,
        musicVol: 0.5, vibration: true, quality: 'high', autoAttack: true,
        dmgNumbers: true, showFps: false, screenShake: true, lang: 'ru',
      },
      daily: { date: '', quests: [], bonusClaimed: false },
      runSnapshot: null,
      seenTutorial: false,
    };
  }

  function deepMerge(base, src) {
    if (!src || typeof src !== 'object') return base;
    for (const k of Object.keys(src)) {
      const v = src[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        deepMerge(base[k], v);
      } else {
        base[k] = v;
      }
    }
    return base;
  }

  const Store = {
    data: defaults(),
    _timer: 0,
    ok: true,
    load() {
      let raw = null;
      try { raw = localStorage.getItem(KEY); } catch (e) { this.ok = false; }
      let parsed = null;
      if (raw) {
        try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
      }
      if (!parsed) {
        try { const b = localStorage.getItem(BACKUP); if (b) parsed = JSON.parse(b); } catch (e) { parsed = null; }
      }
      this.data = deepMerge(defaults(), parsed || {});
      return this.data;
    },
    save() {
      clearTimeout(this._timer);
      try {
        const s = JSON.stringify(this.data);
        localStorage.setItem(KEY, s);
        localStorage.setItem(BACKUP, s);
        this.ok = true;
      } catch (e) { this.ok = false; }
    },
    saveSoon() {
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this.save(), 400);
    },
    reset() {
      const settings = this.data.settings;
      this.data = defaults();
      this.data.settings = settings;
      this.save();
    },
    get settings() { return this.data.settings; },
  };
  CA.Store = Store;
})();
