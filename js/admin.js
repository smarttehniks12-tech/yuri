/* admin.js — password-protected admin / cheat panel (local single-player only).
 * Only a hash of the password is stored here. Note: client-side code can always be read, so this is a lock
 * against accidental access, not real security. Unlock lasts until the app is closed. */
(function () {
  'use strict';
  const CA = window.CA;
  const HASH = 2532436631; // CA.U.hashStr('ca-admin:' + password)

  const Admin = {
    ok: false,
    check(pw) { return CA.U.hashStr('ca-admin:' + String(pw).trim()) === HASH; },

    open(from) {
      const UI = CA.UI;
      if (!this.ok) {
        UI.open('<div class="hdr"><button class="back" data-act="' + (from === 'pause' ? 'backpause' : 'menu') + '">‹</button><div><h2>АДМИН-ПАНЕЛЬ</h2><p>Введите пароль</p></div></div>' +
          '<div class="adm-login"><input id="admPw" type="password" inputmode="numeric" autocomplete="off" placeholder="Пароль">' +
          '<button class="mbtn play" data-act="admlogin" data-from="' + (from || '') + '"><b>ВОЙТИ</b></button><p class="note" id="admErr"></p></div>');
        setTimeout(() => { const i = document.getElementById('admPw'); if (i) { i.focus(); i.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.login(from); }); } }, 50);
        return;
      }
      const d = CA.Store.data, s = CA.Store.settings, inRun = from === 'pause' && CA.Game.player;
      const btn = (act, label, extra) => '<button class="mbtn" data-act="adm" data-op="' + act + '"' + (extra || '') + '><b>' + label + '</b></button>';
      const tg = (k, n, sub) => '<button class="toggle-row' + (s[k] ? ' on' : '') + '" data-act="toggle" data-key="' + k + '"><span>' + n + '</span>' + (sub ? '<small>' + sub + '</small>' : '') + '<i></i></button>';
      let html = '<div class="hdr"><button class="back" data-act="' + (from === 'pause' ? 'backpause' : 'menu') + '">‹</button><div><h2>АДМИН-ПАНЕЛЬ</h2><p>Осколков ' + d.shards + ' · печатей ' + d.seals + ' · сундуков ' + d.chests + '</p></div></div><div class="adm">';
      html += '<h3 class="sec">ВАЛЮТА</h3><div class="adm-grid">' +
        btn('shards1k', '+1 000 осколков') + btn('shards10k', '+10 000 осколков') + btn('shards100k', '+100 000 осколков') +
        btn('seals', '+10 печатей') + btn('chests', '+10 сундуков') + btn('zero', 'Обнулить валюту') + '</div>';
      html += '<h3 class="sec">ОТКРЫТИЯ</h3><div class="adm-grid">' +
        btn('chars', 'Все персонажи') + btn('locs', 'Все локации + Кошмар') + btn('arts', 'Все артефакты') +
        btn('meta', 'Все улучшения на максимум') + btn('codex', 'Открыть всю коллекцию') + btn('daily', 'Выполнить задания дня') +
        btn('achs', 'Все достижения') + btn('stats2k', '+2000 убийств в статистику') + '</div>';
      html += '<h3 class="sec">ЧИТЫ В БОЮ</h3>' +
        tg('cheatGod', 'Бессмертие', 'Персонаж не получает урон') +
        tg('cheatEnergy', 'Бесконечная энергия', 'Ультимейт и территория всегда готовы') +
        tg('cheatNoCd', 'Без перезарядки', 'Техники можно применять без ожидания') +
        tg('cheatDmg', 'Урон x10');
      if (inRun) html += '<h3 class="sec">ТЕКУЩИЙ ЗАБЕГ</h3><div class="adm-grid">' +
        btn('lvl5', '+5 уровней') + btn('maxskills', 'Все техники на 5 уровень') + btn('heal', 'Полное лечение') +
        btn('chest', 'Выдать сундук артефактов') + btn('boss', 'Призвать босса локации') + btn('time', 'Перемотать +1 минуту') +
        btn('kill', 'Убить всех врагов на экране') + btn('win', 'Мгновенная победа') + '</div>';
      html += '<h3 class="sec">ДАННЫЕ</h3><div class="adm-grid">' + btn('logout', 'Выйти из админки') + '</div><p class="note">Изменения сохраняются сразу.</p></div>';
      UI.open(html);
      UI.screen = 'admin'; this.from = from;
    },
    login(from) {
      const i = document.getElementById('admPw');
      if (i && this.check(i.value)) { this.ok = true; CA.Audio.play('achieve'); this.open(from); }
      else { CA.Audio.play('warn'); const e = document.getElementById('admErr'); if (e) e.textContent = 'Неверный пароль'; if (i) i.value = ''; }
    },
    op(name) {
      if (!this.ok) return;
      const d = CA.Store.data, G = CA.Game, p = G.player, UI = CA.UI;
      const toast = (t) => UI.toast(t, '#ffd27a');
      switch (name) {
        case 'shards1k': d.shards += 1000; break;
        case 'shards10k': d.shards += 10000; break;
        case 'shards100k': d.shards += 100000; break;
        case 'seals': d.seals += 10; break;
        case 'chests': d.chests += 10; break;
        case 'zero': d.shards = 0; d.seals = 0; d.chests = 0; break;
        case 'chars': for (const c of CA.Chars.ROSTER) if (d.unlockedChars.indexOf(c.id) < 0) d.unlockedChars.push(c.id); toast('Все персонажи открыты'); break;
        case 'locs': for (const l of CA.Locations.LOCS) if (d.unlockedLocations.indexOf(l.id) < 0) d.unlockedLocations.push(l.id); d.nightmareUnlocked = true; toast('Все локации и Кошмар открыты'); break;
        case 'arts': for (const a of CA.Artifacts.LIST) CA.Artifacts.unlock(a.id); toast('Все артефакты распечатаны'); break;
        case 'meta': for (const m of CA.Prog.META) d.meta[m.id] = m.max; toast('Улучшения на максимуме'); break;
        case 'codex': {
          const ds = d.discovered;
          for (const id in CA.Kits) { const k = CA.Kits[id]; for (const t of CA.A.allTechs(k)) ds.tech[t.id] = 1; for (const c of k.combos) ds.combos[c.id] = 1; }
          for (const a of CA.Artifacts.LIST) ds.artifacts[a.id] = 1;
          for (const e in CA.Enemies.TYPES) ds.enemies[e] = 1;
          for (const b in CA.Bosses.DEFS) ds.bosses[b] = 1;
          toast('Коллекция открыта'); break;
        }
        case 'daily': { const dl = CA.Prog.ensureDaily(); for (const q of dl.quests) q.v = q.n; toast('Задания выполнены — заберите награду'); break; }
        case 'achs': for (const a of CA.Prog.ACH) if (!d.achievements[a.id]) { d.achievements[a.id] = Date.now(); CA.Prog.grant(a.rew); } toast('Все достижения получены'); break;
        case 'stats2k': d.stats.kills += 2000; CA.Chars.checkUnlocks(); break;
        case 'logout': this.ok = false; CA.Store.save(); if (this.from === 'pause') UI.pauseMenu(); else UI.menu(); return;
        // in-run
        case 'lvl5': if (p) { for (let i = 0; i < 5; i++) { p.level++; p.xpNext = p.xpFor(p.level); G.pendingLevels++; } toast('+5 уровней — выбор после продолжения'); } break;
        case 'maxskills': if (p) { for (const t of CA.A.allTechs(p.kit)) p.lv[t.id] = 5; for (const t of CA.A.allTechs(p.kit)) p.discover(t.id); toast('Все техники 5 уровня'); } break;
        case 'heal': if (p) p.hp = p.maxHp; break;
        case 'chest': if (p) { G.chestQueue.push({ bias: 2 }); toast('Сундук откроется после продолжения'); } break;
        case 'boss': if (p) { G.spawnBoss(G.loc.boss, false); G.run.bossDone = true; toast('Босс призван'); } break;
        case 'time': if (p) { G.t += 60; G.updateScaling(); } break;
        case 'kill': if (p) { for (const e of G.enemies.slice()) if (e.alive && !e.bossId) { e.hp = 0; G.killEnemy(e); } } break;
        case 'win': if (p) { UI.root.innerHTML = ''; G.state = 'play'; G.endRun(true); return; } break;
      }
      CA.Store.save();
      CA.Audio.play('click');
      this.open(this.from);
    },
    // per-frame cheat effects during a run
    tick(p) {
      const s = CA.Store.settings;
      if (s.cheatEnergy) { p.ce = 100; if (p.lv[p.kit.domain.id] > 0) p.domainGauge = 100; }
      if (s.cheatNoCd) for (const k in p.cds) if (k !== p.kit.basic.id) p.cds[k] = 0;
    },
  };
  CA.Admin = Admin;
})();
