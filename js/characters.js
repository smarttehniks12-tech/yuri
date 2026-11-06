/* characters.js — roster metadata (stats, unlock conditions, descriptions). Abilities live in js/kits/*.js */
(function () {
  'use strict';
  const CA = window.CA;

  const ROSTER = [
    {
      id: 'spatial', name: 'HARU AMANE', archetype: 'SPATIAL SORCERER', ru: 'Маг пространства', color: '#4fb8ff', kanji: '空',
      stats: { hp: 100, spd: 150, dmg: 1.0 },
      rate: { hp: 3, dmg: 4, spd: 3, range: 5, diff: 3 },
      style: 'Контроль дистанции. Бесконечный барьер замедляет всё, что приближается, а синяя и красная энергии притягивают и отталкивают целые толпы. Объединяет их в сокрушительную пустоту.',
      unlock: { type: 'free' },
    },
    {
      id: 'king', name: 'KAZAN', archetype: 'CURSED KING', ru: 'Король проклятий', color: '#ff2a3d', kanji: '王',
      stats: { hp: 115, spd: 158, dmg: 1.1 },
      rate: { hp: 4, dmg: 5, spd: 4, range: 2, diff: 2 },
      style: 'Агрессия и абсолютная разрушительная сила. Невидимые разрезы, рассекающие волны, огненное копьё и серии казней. Каждое убийство делает его ещё сильнее.',
      unlock: { type: 'free' },
    },
    {
      id: 'shadow', name: 'REN KAGEHARA', archetype: 'SHADOW MASTER', ru: 'Повелитель теней', color: '#8f5bff', kanji: '影',
      stats: { hp: 95, spd: 148, dmg: 0.95 },
      rate: { hp: 3, dmg: 3, spd: 3, range: 4, diff: 4 },
      style: 'Призыватель. Сражается армией теневых волков, драконом бездны и стаями воронов, телепортируясь между тенями. Ультимейт сливает всех призванных в химеру.',
      unlock: { type: 'shards', cost: 600 },
    },
    {
      id: 'blood', name: 'AKANE CHIMURA', archetype: 'BLOOD CONTROLLER', ru: 'Повелительница крови', color: '#ff1f44', kanji: '血',
      stats: { hp: 105, spd: 152, dmg: 1.05 },
      rate: { hp: 3, dmg: 5, spd: 3, range: 4, diff: 4 },
      style: 'Риск и контроль. Техники тратят кровь (здоровье), но метят врагов и детонируют метки. Чем ниже здоровье — тем выше урон. Убийства по меткам лечат.',
      unlock: { type: 'boss', boss: 'headmaster', hint: 'Победите Пустого Директора (босс Заброшенной школы)' },
    },
    {
      id: 'lightning', name: 'JIN RAIJO', archetype: 'LIGHTNING GAMBLER', ru: 'Громовой игрок', color: '#ffe83a', kanji: '雷',
      stats: { hp: 100, spd: 165, dmg: 1.0 },
      rate: { hp: 3, dmg: 4, spd: 5, range: 3, diff: 3 },
      style: 'Скорость и удача. Цепные молнии, рывки, рулетка с джекпотом. Каждый удар может выбить случайное усиление. Ультимейт — режим лихорадки с бешеной скоростью и восстановлением.',
      unlock: { type: 'coffers', cost: 5, hint: 'Откройте 5 проклятых сундуков в меню' },
    },
    {
      id: 'striker', name: 'DAICHI KURODA', archetype: 'BLACK STRIKER', ru: 'Чёрный ударник', color: '#ff2440', kanji: '拳',
      stats: { hp: 120, spd: 160, dmg: 1.05 },
      rate: { hp: 5, dmg: 5, spd: 4, range: 1, diff: 5 },
      style: 'Рукопашный бой без техник-снарядов. Молниеносные комбо, рывки и контратаки. Нажмите атаку в момент сжатия кольца — и ударьте ЧЁРНОЙ ИСКРОЙ с тройным уроном.',
      unlock: { type: 'secret', kills: 2000, hint: '??? Секрет: уничтожьте 2000 проклятых духов за всё время' },
    },
  ];

  const Chars = {
    ROSTER,
    get(id) { return ROSTER.find((c) => c.id === id) || ROSTER[0]; },
    isUnlocked(id) { return CA.Store.data.unlockedChars.indexOf(id) >= 0; },
    // check automatic unlocks (boss/secret/coffers); returns newly unlocked list
    checkUnlocks() {
      const d = CA.Store.data, out = [];
      for (const c of ROSTER) {
        if (this.isUnlocked(c.id)) continue;
        const u = c.unlock;
        let ok = false;
        if (u.type === 'boss') ok = (d.stats.bossKills[u.boss] || 0) > 0;
        if (u.type === 'secret') ok = d.stats.kills >= u.kills;
        if (u.type === 'coffers') ok = d.stats.coffersOpened >= u.cost;
        if (ok) { d.unlockedChars.push(c.id); out.push(c); }
      }
      return out;
    },
    progressText(c) {
      const d = CA.Store.data, u = c.unlock;
      if (u.type === 'shards') return 'Стоимость: ' + u.cost + ' осколков';
      if (u.type === 'boss') return u.hint;
      if (u.type === 'coffers') return u.hint + ' (' + Math.min(u.cost, d.stats.coffersOpened) + '/' + u.cost + ')';
      if (u.type === 'secret') return d.stats.kills >= 500 ? 'Секрет: уничтожьте ' + u.kills + ' духов (' + d.stats.kills + '/' + u.kills + ')' : '??? Секретное условие';
      return '';
    },
  };
  CA.Chars = Chars;
  CA.Kits = CA.Kits || {};
})();
