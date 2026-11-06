/* names.js — Russian display names for techniques, combos and territories (English kept as subtitle). */
(function () {
  'use strict';
  const CA = window.CA;
  const TECH = {
    sp_basic: 'Пространственный импульс', sp_barrier: 'Бесконечный барьер', sp_blue: 'Синяя сингулярность', sp_red: 'Красный удар',
    sp_void: 'Слияние пустоты', sp_blink: 'Мгновенный шаг', sp_ult: 'Пространственная сфера',
    kg_basic: 'Разрыв когтями', kg_hunger: 'Голод тирана', kg_slash: 'Невидимый разрез', kg_cleave: 'Рассекающая волна',
    kg_spear: 'Адское копьё', kg_exec: 'Багровая казнь', kg_ult: 'Алтарь руин',
    sh_basic: 'Теневой клык', sh_bond: 'Узы теней', sh_hounds: 'Теневые гончие', sh_wyrm: 'Змей бездны',
    sh_step: 'Шаг сквозь тень', sh_legion: 'Зов легиона', sh_ult: 'Химера затмения',
    bl_basic: 'Кровавая пуля', bl_mark: 'Багровая метка', bl_beam: 'Пронзающий поток', bl_spears: 'Кровавые копья',
    bl_hemo: 'Кровоизлияние', bl_shield: 'Кровавый щит', bl_ult: 'Багровый прилив',
    lg_basic: 'Искровой удар', lg_luck: 'Полоса удачи', lg_dash: 'Громовой рывок', lg_storm: 'Зов бури',
    lg_roulette: 'Проклятая рулетка', lg_tesla: 'Поле Теслы', lg_ult: 'Лихорадка джекпота',
    bs_basic: 'Быстрое комбо', bs_spark: 'Чёрная искра', bs_dash: 'Сокрушающий рывок', bs_counter: 'Контрстойка',
    bs_fist: 'Проклятый кулак', bs_barrage: 'Шквал ударов', bs_ult: 'Чёрный метеор',
  };
  const COMBO = {
    sp_polarity: 'Коллапс полярности', sp_absolute: 'Абсолютная дистанция', kg_dismantle: 'Буря рассечений', kg_hellfire: 'Адская казнь',
    sh_army: 'Армия теней', sh_nightmare: 'Змей кошмаров', bl_cascade: 'Алый каскад', bl_barrage: 'Кровавый шквал',
    lg_electric: 'Электрический режим', lg_overcharge: 'Перегруженная рулетка', bs_chain: 'Цепь чёрных искр', bs_counter: 'Сокрушающий контрудар',
  };
  for (const id in CA.Kits) {
    const k = CA.Kits[id];
    for (const s of [k.basic, k.passive, k.ult].concat(k.skills)) { if (TECH[s.id]) { s.en = s.name; s.name = TECH[s.id]; } s.icon = CA.Icons.id(s.id); }
    for (const c of k.combos) { if (COMBO[c.id]) { c.en = c.name; c.name = COMBO[c.id]; } c.icon = CA.Icons.id(c.id); }
    const d = k.domain; if (d && d.ru) { d.en = d.name; d.name = d.ru; d.icon = 'domain'; }
  }
  // replace English technique names that appear inside descriptions
  const pairs = [];
  for (const id in CA.Kits) {
    const k = CA.Kits[id];
    for (const s of [k.basic, k.passive, k.ult, k.domain].concat(k.skills).concat(k.combos)) if (s.en) pairs.push([s.en, s.name]);
  }
  pairs.sort((a, b) => b[0].length - a[0].length);
  const tr = (str) => { for (const [en, ru] of pairs) str = str.split(en).join('«' + ru + '»'); return str; };
  for (const id in CA.Kits) {
    const k = CA.Kits[id];
    for (const s of [k.basic, k.passive, k.ult, k.domain].concat(k.skills).concat(k.combos)) {
      if (s.desc) s.desc = tr(s.desc);
      if (s.levels) s.levels = s.levels.map(tr);
    }
  }
})();
