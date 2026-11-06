/* artifacts.js — cursed relics found in chests during a run. Rarity-weighted; some change play style. */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U;

  const LIST = [
    { id: 'amp', name: 'Cursed Energy Amplifier', ru: 'Усилитель проклятой энергии', kanji: '増', rarity: 'rare', desc: '+25% урона техник и +15% накопления энергии.', apply: (p) => { p.bonus.skillDmg += 0.25; p.bonus.ce += 0.15; } },
    { id: 'amulet', name: 'Warding Amulet', ru: 'Амулет защиты', kanji: '護', rarity: 'common', desc: '+12% защиты.', apply: (p) => { p.bonus.def += 0.12; } },
    { id: 'gloves', name: 'Gauntlets of Force', ru: 'Перчатки усиления', kanji: '甲', rarity: 'rare', desc: '+40% урона обычной атаки, +15% скорости атаки.', apply: (p) => { p.bonus.basicDmg += 0.4; p.bonus.atkSpd += 0.15; } },
    { id: 'wind', name: 'Wind Talisman', ru: 'Артефакт скорости', kanji: '風', rarity: 'common', desc: '+15% скорости передвижения.', apply: (p) => { p.bonus.spd += 0.15; } },
    { id: 'relic', name: 'Restoration Relic', ru: 'Реликвия восстановления', kanji: '再', rarity: 'rare', desc: 'Регенерация 1.2 HP/сек и +10% макс. здоровья.', apply: (p) => { p.bonus.regen += 1.2; p.bonus.hp += 0.1; } },
    { id: 'sealed', name: 'Sealed Object', ru: 'Запечатанный предмет', kanji: '封', rarity: 'epic', desc: 'Неизвестный эффект. Раскроется при получении…', sealed: true, apply: (p, G) => {
      const outcomes = [
        ['Печать сорвана: +45% урона, но -15% здоровья', () => { p.bonus.dmg += 0.45; p.mult.hp *= 0.85; }],
        ['Печать сорвана: перезарядки -25%', () => { p.bonus.cd += 0.25; }],
        ['Печать сорвана: шанс крита +20%, крит. урон +60%', () => { p.bonus.crit += 0.2; p.bonus.critDmg += 0.6; }],
        ['Печать сорвана: территория заряжается вдвое быстрее', () => { p.bonus.domainGain = (p.bonus.domainGain || 0) + 1; }],
        ['Печать сорвана: +1 возрождение', () => { p.reviveCharges++; }],
      ];
      const o = U.choice(outcomes); o[1](); G.banner('ЗАПЕЧАТАННЫЙ ПРЕДМЕТ', o[0], '#b35cff', 2.4);
    } },
    { id: 'lotus', name: 'Black Lotus', ru: 'Чёрный лотос', kanji: '蓮', rarity: 'legendary', desc: 'Проклятая энергия копится вдвое быстрее. Ультимейт стоит на 20% меньше.', apply: (p) => { p.bonus.ce += 1; p.bonus.ultCost += 0.2; } },
    { id: 'hourglass', name: 'Hourglass of Rewind', ru: 'Песочные часы отката', kanji: '砂', rarity: 'legendary', desc: 'Один раз воскрешает с 50% здоровья.', apply: (p) => { p.reviveCharges++; } },
    { id: 'mask', name: 'Glass Cannon Mask', ru: 'Маска стеклянной пушки', kanji: '仮', rarity: 'epic', desc: '+60% урона, но -30% макс. здоровья. Меняет стиль игры!', apply: (p) => { p.mult.dmg *= 1.6; p.mult.hp *= 0.7; } },
    { id: 'fang', name: 'Vampiric Fang', ru: 'Вампирский клык', kanji: '吸', rarity: 'epic', desc: '2% нанесённого урона восстанавливает здоровье (до 6 HP/сек).', apply: (p) => { p.bonus.lifesteal += 0.02; } },
    { id: 'bell', name: 'Thunder Bell', ru: 'Громовой колокол', kanji: '鐘', rarity: 'rare', desc: 'Каждое 12-е попадание вызывает удар молнии.', apply: (p, G) => {
      let n = 0;
      p.hooks.hit.push((e, dmg, opt) => {
        if (opt && (opt.src === 'bell' || opt.src === 'burn')) return;
        if (++n >= 12 && e.alive) { n = 0; CA.FX.bolt(e.x, e.y - 300, e.x, e.y, '#ffe83a', 3, 0.2); CA.A.hitCircle(e.x, e.y, 50, CA.A.dmg(p, 40), { src: 'bell', stun: 0.3 }); CA.Audio.play('zap', 0.5); }
      });
    } },
    { id: 'prism', name: 'Echo Prism', ru: 'Призма эха', kanji: '響', rarity: 'legendary', desc: 'Техники повторяются эхом через 0.4 сек с 45% силы. Меняет стиль игры!', apply: (p, G) => {
      p.hooks.cast.push((s, L) => {
        if (s.echo || s === p.kit.ult) return;
        G.later(0.4, () => { if (G.state !== 'play' && G.state !== 'levelup') return; const bm = p.bonus.dmg; p.bonus.dmg -= 0.55; s.echo = true; try { s.cast(G, p, L); } catch (e) { /* ignore */ } s.echo = false; p.bonus.dmg = bm; });
      });
    } },
    { id: 'eye', name: 'Eye of the Curse', ru: 'Око проклятия', kanji: '眼', rarity: 'epic', desc: '+15% шанс крита и +50% крит. урона.', apply: (p) => { p.bonus.crit += 0.15; p.bonus.critDmg += 0.5; } },
    { id: 'magnet', name: 'Soul Lodestone', ru: 'Магнит душ', kanji: '引', rarity: 'common', desc: '+80% радиус сбора энергии.', apply: (p) => { p.bonus.magnet += 0.8; } },
    { id: 'rosary', name: 'Bone Rosary', ru: 'Костяные чётки', kanji: '珠', rarity: 'rare', desc: '20% шанс, что убитый враг взорвётся, раня соседей.', apply: (p, G) => {
      p.hooks.kill.push((e) => { if (Math.random() < 0.2) { CA.FX.disc(e.x, e.y, 70, 0.3, '#e8dcc8', 0.7); CA.A.hitCircle(e.x, e.y, 70, CA.A.dmg(p, 30), { src: 'rosary', noCrit: true }); } });
    } },
    { id: 'clock', name: 'Frozen Clock', ru: 'Замёрзшие часы', kanji: '時', rarity: 'epic', desc: 'Перезарядки -20%.', apply: (p) => { p.bonus.cd += 0.2; } },
    { id: 'mirror', name: 'Twin Mirror', ru: 'Двойное зеркало', kanji: '鏡', rarity: 'mythic', desc: 'Ультимейт стоит на 40% меньше энергии и усиливает урон на 20%.', apply: (p) => { p.bonus.ultCost += 0.4; p.bonus.dmg += 0.2; } },
    { id: 'heart', name: 'Chained Heart', ru: 'Скованное сердце', kanji: '心', rarity: 'mythic', desc: 'Территория заряжается вдвое быстрее и сразу пробуждается.', apply: (p, G) => { p.bonus.domainGain = (p.bonus.domainGain || 0) + 1; const d = p.kit.domain; if (!(p.lv[d.id] > 0)) p.learn(d.id); p.domainGauge = Math.max(p.domainGauge, 50); } },
    { id: 'halo', name: 'Cracked Halo', ru: 'Треснувший нимб', kanji: '輪', rarity: 'legendary', desc: 'При получении урона — 2 сек неуязвимости (раз в 20 сек).', apply: (p, G) => {
      let cd = 0;
      p.hooks.tick.push((dt) => { if (cd > 0) cd -= dt; });
      p.hooks.hurt.push((amt) => { if (cd <= 0 && amt > 0) { cd = 20; G.later(0.01, () => { p.invuln = 2; CA.FX.ring(p.x, p.y - 20, 10, 50, 0.5, '#fff0b0', 4); }); } return amt; });
    } },
    { id: 'die', name: "Gambler's Die", ru: 'Кость игрока', kanji: '骰', rarity: 'rare', desc: '+25% опыта и +15% удачи (выше редкость карт).', apply: (p) => { p.bonus.xp += 0.25; p.bonus.luck += 0.15; } },
    { id: 'finger', name: 'Withered Finger', ru: 'Иссохший палец', kanji: '指', rarity: 'legendary', desc: '+35% урона, +10% здоровья, +10% скорости. Пульсирует злобой.', apply: (p) => { p.bonus.dmg += 0.35; p.bonus.hp += 0.1; p.bonus.spd += 0.1; } },
    { id: 'chain', name: 'Binding Chain', ru: 'Сковывающая цепь', kanji: '縛', rarity: 'epic', desc: 'Попадания замедляют врагов на 25%, по замедленным +15% урона.', apply: (p) => { p.bonus.slowOnHit = 0.25; } },
    { id: 'ember', name: 'Hellfire Ember', ru: 'Угли преисподней', kanji: '燼', rarity: 'rare', desc: 'Критические удары поджигают врагов.', apply: (p) => { p.bonus.critBurn = true; } },
  ];
  const DEFAULT_UNLOCKED = ['amp', 'amulet', 'gloves', 'wind', 'relic', 'sealed', 'fang', 'bell', 'eye', 'magnet', 'rosary', 'clock', 'die', 'chain', 'ember'];
  const RW = { common: 40, rare: 30, epic: 16, legendary: 7, mythic: 2 };

  const Art = {
    LIST,
    get(id) { return LIST.find((a) => a.id === id); },
    ensureDefaults() {
      const d = CA.Store.data;
      if (!d.unlockedArtifacts) d.unlockedArtifacts = DEFAULT_UNLOCKED.slice();
    },
    isUnlocked(id) { return CA.Store.data.unlockedArtifacts.indexOf(id) >= 0; },
    lockedList() { return LIST.filter((a) => !this.isUnlocked(a.id)); },
    unlock(id) { if (!this.isUnlocked(id)) CA.Store.data.unlockedArtifacts.push(id); },
    // roll n distinct artifacts the player doesn't own; bias>0 favours higher rarities
    roll(p, n, bias) {
      const owned = new Set(p.artifacts.map((a) => a.id));
      let pool = LIST.filter((a) => this.isUnlocked(a.id) && !owned.has(a.id));
      const out = [];
      while (out.length < n && pool.length) {
        const pick = U.weighted(pool, (a) => RW[a.rarity] * (a.rarity === 'common' ? 1 : 1 + (bias || 0) + p.luck));
        out.push(pick);
        pool = pool.filter((a) => a !== pick);
      }
      return out;
    },
    give(G, p, a) {
      p.artifacts.push(a);
      a.apply(p, G);
      p.recalc();
      CA.Store.data.discovered.artifacts[a.id] = 1;
      G.run.artifacts++;
    },
  };
  CA.Artifacts = Art;
})();
