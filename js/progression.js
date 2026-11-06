/* progression.js — permanent meta-upgrades, run rewards, achievements, daily offline quests, coffers */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U;

  const META = [
    { id: 'hp', ru: 'Макс. здоровье', kanji: '命', per: 0.08, max: 10, base: 50, fmt: (v) => '+' + Math.round(v * 100) + '%' },
    { id: 'dmg', ru: 'Урон', kanji: '力', per: 0.06, max: 10, base: 60, fmt: (v) => '+' + Math.round(v * 100) + '%' },
    { id: 'spd', ru: 'Скорость', kanji: '速', per: 0.03, max: 8, base: 50, fmt: (v) => '+' + Math.round(v * 100) + '%' },
    { id: 'def', ru: 'Защита', kanji: '守', per: 0.025, max: 8, base: 60, fmt: (v) => '+' + (v * 100).toFixed(1) + '%' },
    { id: 'ce', ru: 'Проклятая энергия', kanji: '気', per: 0.08, max: 8, base: 55, fmt: (v) => '+' + Math.round(v * 100) + '%' },
    { id: 'cd', ru: 'Восстановление техник', kanji: '時', per: 0.03, max: 8, base: 70, fmt: (v) => '-' + Math.round(v * 100) + '%' },
    { id: 'crit', ru: 'Шанс крит. удара', kanji: '的', per: 0.02, max: 8, base: 65, fmt: (v) => '+' + Math.round(v * 100) + '%' },
    { id: 'lvl', ru: 'Начальный уровень', kanji: '段', per: 1, max: 5, base: 180, mul: 1.9, fmt: (v) => '+' + v },
    { id: 'magnet', ru: 'Радиус сбора', kanji: '磁', per: 0.15, max: 5, base: 40, fmt: (v) => '+' + Math.round(v * 100) + '%' },
    { id: 'reroll', ru: 'Перебросы карт', kanji: '転', per: 1, max: 3, base: 120, mul: 2.2, fmt: (v) => '+' + v },
  ];

  const ACH = [
    { id: 'k500', ru: 'Экзорцист I', desc: 'Уничтожьте 500 проклятых духов', rew: { shards: 100 }, prog: (s) => [s.kills, 500] },
    { id: 'k5000', ru: 'Экзорцист II', desc: 'Уничтожьте 5 000 проклятых духов', rew: { shards: 300, coffers: 1 }, prog: (s) => [s.kills, 5000] },
    { id: 'k25000', ru: 'Экзорцист III', desc: 'Уничтожьте 25 000 проклятых духов', rew: { shards: 800, seals: 2 }, prog: (s) => [s.kills, 25000] },
    { id: 'surv5', ru: 'Выживший', desc: 'Продержитесь 5 минут в одном забеге', rew: { shards: 80 }, prog: (s) => [Math.floor(s.bestTime), 300] },
    { id: 'surv10', ru: 'Непоколебимый', desc: 'Продержитесь 10 минут в одном забеге', rew: { shards: 200, coffers: 1 }, prog: (s) => [Math.floor(s.bestTime), 600] },
    { id: 'boss1', ru: 'Особый ранг', desc: 'Победите любого босса', rew: { shards: 150 }, prog: (s) => [Object.keys(s.bossKills).length, 1] },
    { id: 'bossAll', ru: 'Охотник на бедствия', desc: 'Победите всех 5 боссов', rew: { shards: 1000, seals: 3, art: 'finger' }, prog: (s) => [Object.keys(s.bossKills).length, 5] },
    { id: 'win1', ru: 'Первая победа', desc: 'Завершите забег победой над боссом локации', rew: { shards: 200, coffers: 1 }, prog: (s) => [s.wins, 1] },
    { id: 'win3c', ru: 'Мастер стилей', desc: 'Победите тремя разными персонажами', rew: { shards: 500, art: 'mirror' }, prog: (s) => [Object.keys(s.winsByChar).length, 3] },
    { id: 'dom1', ru: 'Пробуждение', desc: 'Раскройте территорию', rew: { shards: 120, art: 'heart' }, prog: (s) => [s.domainsUsed, 1] },
    { id: 'domAll', ru: 'Владыка территорий', desc: 'Раскройте территорию всеми 6 магами', rew: { shards: 800, seals: 2 }, prog: (s) => [Object.keys(s.domainChars).length, 6] },
    { id: 'ult50', ru: 'Без ограничений', desc: 'Используйте ультимейт 50 раз', rew: { shards: 250, art: 'lotus' }, prog: (s) => [s.ultsUsed, 50] },
    { id: 'lv20', ru: 'Восхождение', desc: 'Достигните 20 уровня за забег', rew: { shards: 120 }, prog: (s) => [s.maxLevel, 20] },
    { id: 'lv35', ru: 'Сильнейший', desc: 'Достигните 35 уровня за забег', rew: { shards: 400, art: 'prism' }, prog: (s) => [s.maxLevel, 35] },
    { id: 'combo1', ru: 'Мифическое слияние', desc: 'Откройте комбинацию техник', rew: { shards: 150, art: 'hourglass' }, prog: (s) => [Object.keys(CA.Store.data.discovered.combos).length, 1] },
    { id: 'combo6', ru: 'Коллекционер комбо', desc: 'Откройте 6 разных комбинаций', rew: { shards: 600, seals: 2, art: 'halo' }, prog: (s) => [Object.keys(CA.Store.data.discovered.combos).length, 6] },
    { id: 'chest10', ru: 'Кладоискатель', desc: 'Откройте 10 сундуков в забегах', rew: { shards: 200, art: 'mask' }, prog: (s) => [s.chestsOpened, 10] },
    { id: 'jackpot', ru: '777', desc: 'Секрет: выбейте тройную семёрку', secret: true, rew: { shards: 300, coffers: 2 }, prog: (s) => [s.bigJackpot ? 1 : 0, 1] },
    { id: 'spark100', ru: 'Искра судьбы', desc: 'Секрет: нанесите 100 Чёрных Искр', secret: true, rew: { shards: 400, seals: 1 }, prog: (s) => [s.blackSparks, 100] },
    { id: 'forbidden', ru: 'За гранью', desc: 'Откройте Запретное измерение', rew: { shards: 300 }, prog: () => [CA.Store.data.unlockedLocations.indexOf('dimension') >= 0 ? 1 : 0, 1] },
    { id: 'nightmare', ru: 'Кошмар наяву', desc: 'Победите в режиме Кошмара', rew: { shards: 1500, seals: 5 }, prog: (s) => [s.nightmareWins, 1] },
    { id: 'rich', ru: 'Богатство проклятий', desc: 'Заработайте 5 000 осколков за всё время', rew: { coffers: 3 }, prog: () => [CA.Store.data.totalShardsEarned, 5000] },
    { id: 'hit', ru: 'Сокрушительный удар', desc: 'Нанесите 2 000 урона одним ударом', rew: { shards: 250 }, prog: (s) => [Math.floor(s.maxHit), 2000] },
    { id: 'runs10', ru: 'Ветеран', desc: 'Сыграйте 10 забегов', rew: { shards: 150, coffers: 1 }, prog: (s) => [s.runs, 10] },
  ];

  const QUESTS = [
    { id: 'kills', ru: (n) => 'Уничтожьте ' + n + ' духов', ns: [300, 600, 1000], rew: 60, val: (r) => r.kills, cum: true },
    { id: 'survive', ru: (n) => 'Продержитесь ' + (n / 60) + ' мин. в одном забеге', ns: [240, 420, 600], rew: 70, val: (r) => r.time, cum: false },
    { id: 'ults', ru: (n) => 'Используйте ультимейт ' + n + ' раз', ns: [3, 6, 10], rew: 50, val: (r) => r.ults, cum: true },
    { id: 'domain', ru: () => 'Раскройте территорию', ns: [1], rew: 90, val: (r) => r.domains, cum: true },
    { id: 'boss', ru: () => 'Победите босса', ns: [1], rew: 120, val: (r) => r.bosses, cum: true },
    { id: 'chests', ru: (n) => 'Откройте ' + n + ' сундука в забегах', ns: [2, 3], rew: 60, val: (r) => r.chests, cum: true },
    { id: 'level', ru: (n) => 'Достигните ' + n + ' уровня', ns: [12, 18, 25], rew: 60, val: (r) => r.level, cum: false },
    { id: 'combo', ru: () => 'Получите комбинацию техник в забеге', ns: [1], rew: 80, val: (r) => r.combos, cum: true },
  ];

  const P = {
    META, ACH, QUESTS,
    metaLevel(id) { return CA.Store.data.meta[id] || 0; },
    metaCost(m) { const l = this.metaLevel(m.id); return Math.round(m.base * Math.pow(m.mul || 1.45, l)); },
    buyMeta(id) {
      const m = META.find((x) => x.id === id), d = CA.Store.data;
      const l = this.metaLevel(id);
      if (l >= m.max) return false;
      const c = this.metaCost(m);
      if (d.shards < c) return false;
      d.shards -= c; d.meta[id] = l + 1;
      CA.Store.save();
      return true;
    },
    metaBonuses() {
      const out = {};
      for (const m of META) out[m.id] = this.metaLevel(m.id) * m.per;
      return out;
    },

    // ---------- run rewards ----------
    computeRewards(run, victory) {
      const nm = CA.Store.data.nightmare ? 2 : 1;
      const tier = CA.Locations.get(run.loc).tier;
      let shards = Math.floor(run.kills * 0.12 + (run.time / 60) * 10 + run.level * 3 + run.bosses * 90 + run.mids * 40 + (victory ? 150 : 0));
      shards = Math.floor(shards * (1 + (tier - 1) * 0.25) * nm) + run.shardsBonus;
      const seals = (victory ? 1 + (tier >= 3 ? 1 : 0) : 0) + run.sealsBonus;
      const coffers = victory ? 1 : 0;
      return { shards, seals, coffers };
    },
    applyRun(run, victory, rew) {
      const d = CA.Store.data, s = d.stats;
      d.shards += rew.shards; d.totalShardsEarned += rew.shards;
      d.seals += rew.seals; d.chests += rew.coffers;
      s.runs++;
      if (victory) { s.wins++; s.winsByChar[run.char] = (s.winsByChar[run.char] || 0) + 1; if (d.nightmare) s.nightmareWins++; }
      else s.deaths++;
      s.bestTime = Math.max(s.bestTime, run.time);
      s.maxLevel = Math.max(s.maxLevel, run.level);
      s.playTime += run.time;
      s.chestsOpened += run.chests;
      s.bestKillsRun = Math.max(s.bestKillsRun, run.kills);
      if (run.bigJackpot) s.bigJackpot = 1;
      // location unlocks
      const unlocked = [];
      if (victory) {
        const order = CA.Locations.LOCS.map((l) => l.id);
        const i = order.indexOf(run.loc);
        if (i >= 0 && i + 1 < order.length && d.unlockedLocations.indexOf(order[i + 1]) < 0) { d.unlockedLocations.push(order[i + 1]); unlocked.push('Локация: ' + CA.Locations.get(order[i + 1]).ru); }
        if (run.loc === 'dimension' && !d.nightmareUnlocked) { d.nightmareUnlocked = true; unlocked.push('Режим КОШМАР'); }
      }
      this.questProgress(run);
      const chars = CA.Chars.checkUnlocks();
      for (const c of chars) unlocked.push('Персонаж: ' + c.name);
      const ach = this.checkAchievements();
      CA.Store.save();
      return { unlocked, ach };
    },

    // ---------- achievements ----------
    achProgress(a) { const [v, n] = a.prog(CA.Store.data.stats); return { v: Math.min(v, n), n, done: v >= n }; },
    checkAchievements() {
      const d = CA.Store.data, got = [];
      for (const a of ACH) {
        if (d.achievements[a.id]) continue;
        if (this.achProgress(a).done) {
          d.achievements[a.id] = Date.now();
          this.grant(a.rew);
          got.push(a);
        }
      }
      if (got.length) CA.Store.save();
      return got;
    },
    grant(r) {
      const d = CA.Store.data;
      if (r.shards) { d.shards += r.shards; d.totalShardsEarned += r.shards; }
      if (r.seals) d.seals += r.seals;
      if (r.coffers) d.chests += r.coffers;
      if (r.art) CA.Artifacts.unlock(r.art);
    },
    rewText(r) {
      const p = [];
      if (r.shards) p.push(r.shards + ' ◆');
      if (r.seals) p.push(r.seals + ' печ.');
      if (r.coffers) p.push(r.coffers + ' сунд.');
      if (r.art) { const a = CA.Artifacts.get(r.art); p.push('артефакт «' + (a ? a.ru : r.art) + '»'); }
      return p.join(' + ');
    },

    // ---------- daily quests (local date based, offline) ----------
    ensureDaily() {
      const d = CA.Store.data, key = U.todayKey();
      if (d.daily.date === key && d.daily.quests.length) return d.daily;
      const rng = U.mulberry32(U.hashStr('daily' + key));
      const pool = U.shuffle(QUESTS.slice(), rng).slice(0, 3);
      d.daily = { date: key, bonusClaimed: false, quests: pool.map((q) => { const n = q.ns[Math.floor(rng() * q.ns.length)]; return { id: q.id, n, v: 0, claimed: false }; }) };
      CA.Store.save();
      return d.daily;
    },
    questDef(id) { return QUESTS.find((q) => q.id === id); },
    questProgress(run) {
      const dl = this.ensureDaily();
      for (const q of dl.quests) {
        const def = this.questDef(q.id);
        const v = def.val(run) || 0;
        q.v = def.cum ? Math.min(q.n, q.v + v) : Math.max(q.v, Math.min(q.n, v));
      }
    },
    claimQuest(i) {
      const dl = this.ensureDaily(), q = dl.quests[i];
      if (!q || q.claimed || q.v < q.n) return 0;
      q.claimed = true;
      const r = this.questDef(q.id).rew;
      CA.Store.data.shards += r; CA.Store.data.totalShardsEarned += r;
      CA.Store.save();
      return r;
    },
    claimDailyBonus() {
      const dl = this.ensureDaily();
      if (dl.bonusClaimed || !dl.quests.every((q) => q.claimed)) return false;
      dl.bonusClaimed = true; CA.Store.data.chests += 1; CA.Store.data.seals += 1;
      CA.Store.save();
      return true;
    },

    // ---------- menu coffers ----------
    openCoffer() {
      const d = CA.Store.data;
      if (d.chests <= 0) return null;
      d.chests--; d.stats.coffersOpened++;
      const r = Math.random();
      let res;
      const locked = CA.Artifacts.lockedList();
      if (r < 0.2 && locked.length) { const a = U.choice(locked); CA.Artifacts.unlock(a.id); res = { kind: 'art', art: a, text: 'Новый артефакт: ' + a.ru, rarity: a.rarity }; }
      else if (r < 0.45) { d.seals += 1; d.shards += 50; d.totalShardsEarned += 50; res = { kind: 'seal', text: '1 Проклятая печать + 50 осколков', rarity: 'epic' }; }
      else { const n = U.randi(90, 240); d.shards += n; d.totalShardsEarned += n; res = { kind: 'shards', text: n + ' осколков проклятия', rarity: n > 180 ? 'rare' : 'common' }; }
      res.chars = CA.Chars.checkUnlocks();
      res.ach = this.checkAchievements();
      CA.Store.save();
      return res;
    },
  };
  CA.Prog = P;
})();
