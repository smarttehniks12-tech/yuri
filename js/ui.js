/* ui.js — DOM menus & overlays: main menu, character select, techniques, upgrades, collection,
 * achievements, settings, daily quests, coffers, level-up cards, chests, pause, results. */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const RAR = () => CA.A.RARITY;

  const UI = {
    root: null, screen: null, bg: null, bgCtx: null, bgT: 0, portrait: null, techTab: null, colTab: 'art', charView: null,
    init() {
      this.root = $('#ui');
      this.bg = $('#menuBg');
      this.bgCtx = this.bg.getContext('2d');
      this.root.addEventListener('click', (e) => {
        const el = e.target.closest('[data-act]');
        if (!el) return;
        CA.Audio.unlock();
        this.act(el.dataset.act, el.dataset, el);
      });
      this.root.addEventListener('input', (e) => {
        const el = e.target;
        if (el.dataset.set) { CA.Store.settings[el.dataset.set] = +el.value; CA.Audio.applySettings(); CA.Store.saveSoon(); }
      });
      window.addEventListener('resize', () => this.resizeBg());
      this.resizeBg();
    },
    resizeBg() {
      const d = Math.min(2, window.devicePixelRatio || 1);
      this.bg.width = window.innerWidth * d; this.bg.height = window.innerHeight * d;
      this.bgDpr = d;
    },
    showHUD(on) {
      document.body.classList.toggle('ingame', on);
      if (on) { this.root.innerHTML = ''; this.screen = null; }
    },
    toast(html, color) {
      const t = document.createElement('div');
      t.className = 'toast';
      t.style.borderColor = color || '#d07aff';
      t.innerHTML = html;
      $('#toasts').appendChild(t);
      setTimeout(() => t.classList.add('out'), 2800);
      setTimeout(() => t.remove(), 3400);
    },
    currencyBar() {
      const d = CA.Store.data;
      return '<div class="cur"><span class="c-sh" title="Осколки">' + CA.Icons.img('gem', '#c8a8ff') + U.fmtNum(d.shards) + '</span><span class="c-se" title="Печати">' + CA.Icons.img('seal', '#ff8aa8') + d.seals + '</span><span class="c-ch" title="Сундуки">' + CA.Icons.img('chest', '#ffd27a') + d.chests + '</span></div>';
    },
    open(html, cls) {
      this.root.innerHTML = '<div class="screen ' + (cls || '') + '">' + html + '</div>';
      this.root.scrollTop = 0;
    },
    header(title, sub) {
      return '<div class="hdr"><button class="back" data-act="menu">‹</button><div><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + this.currencyBar() + '</div>';
    },

    // ================= MAIN MENU =================
    menu() {
      CA.Game.state = 'menu';
      this.showHUD(false);
      document.body.classList.add('inmenu');
      const d = CA.Store.data;
      const ch = CA.Chars.get(d.selectedChar);
      const daily = CA.Prog.ensureDaily();
      const dailyReady = daily.quests.some((q) => q.v >= q.n && !q.claimed) || (!daily.bonusClaimed && daily.quests.every((q) => q.claimed));
      const achReady = false;
      void achReady;
      const snap = d.runSnapshot;
      this.screen = 'menu';
      this.open(
        '<div class="menu-top">' + this.currencyBar() +
          '<div class="mt-btns"><button class="icon-btn' + (dailyReady ? ' dot' : '') + '" data-act="daily">' + CA.Icons.img('calendar', '#ff8aa8') + '<small>Задания</small></button>' +
          '<button class="icon-btn' + (d.chests > 0 ? ' dot' : '') + '" data-act="coffer">' + CA.Icons.img('chest', '#ffd27a') + '<small>Сундук ' + d.chests + '</small></button></div></div>' +
        '<div class="logo"><div class="logo-k">' + CA.Icons.img('vortex', '#b06aff') + '</div><h1>CURSED ARENA</h1><div class="logo-sub">AWAKENING</div></div>' +
        '<div class="menu-char" style="--c:' + ch.color + '"><div class="mc-name">' + ch.name + '</div><div class="mc-arch">' + ch.archetype + ' · ' + ch.ru + '</div></div>' +
        '<div class="menu-btns">' +
          (snap ? '<button class="mbtn cont" data-act="continue"><b>▶ ПРОДОЛЖИТЬ ЗАБЕГ</b><small>' + esc(CA.Chars.get(snap.char).name) + ' · ' + U.fmtTime(snap.t) + ' · ур. ' + snap.level + '</small></button>' : '') +
          '<button class="mbtn play" data-act="play"><b>PLAY</b><small>Начать забег</small></button>' +
          '<div class="mgrid">' +
            '<button class="mbtn" data-act="chars"><b>CHARACTER SELECT</b><small>Персонажи</small></button>' +
            '<button class="mbtn" data-act="techs"><b>TECHNIQUES</b><small>Техники</small></button>' +
            '<button class="mbtn" data-act="upgrades"><b>UPGRADES</b><small>Улучшения</small></button>' +
            '<button class="mbtn" data-act="collection"><b>COLLECTION</b><small>Коллекция</small></button>' +
            '<button class="mbtn" data-act="achievements"><b>ACHIEVEMENTS</b><small>Достижения</small></button>' +
            '<button class="mbtn" data-act="settings"><b>SETTINGS</b><small>Настройки</small></button>' +
          '</div></div>' +
        '<div class="ver">v1.0 · офлайн · без рекламы и доната</div>', 'menu-screen');
    },
    menuFrame(dt) {
      if (!document.body.classList.contains('inmenu')) return;
      this.bgT += dt;
      const c = this.bgCtx, d = this.bgDpr, W = this.bg.width / d, H = this.bg.height / d;
      c.setTransform(d, 0, 0, d, 0, 0);
      const id = (this.screen === 'chars' && this.charView) ? this.charView : CA.Store.data.selectedChar;
      const ch = CA.Chars.get(id);
      const gr = c.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#07050d'); gr.addColorStop(0.6, U.mixHex('#07050d', ch.color, 0.12)); gr.addColorStop(1, '#030206');
      c.fillStyle = gr; c.fillRect(0, 0, W, H);
      const t = this.bgT;
      // giant element emblem
      CA.Icons.draw(c, 'char_' + id, W / 2 + Math.sin(t * 0.3) * 10, H * 0.5, Math.min(W, H) * 0.85, U.hexA(ch.color, 0.09), { fill: U.hexA(ch.color, 0.04) });
      // energy swirl
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 40; i++) {
        const a = i * 2.4 + t * (0.2 + (i % 5) * 0.05), r = 60 + (i * 37 % 200) + Math.sin(t + i) * 10;
        const x = (W > H ? W * 0.25 : W / 2) + Math.cos(a) * r, y = H * 0.56 + Math.sin(a) * r * 0.5 - ((t * 30 + i * 20) % 200) * 0.3;
        c.globalAlpha = 0.25 + 0.2 * Math.sin(t * 2 + i);
        c.drawImage(CA.FX.getGlow(ch.color), x - 6, y - 6, 12, 12);
      }
      c.globalAlpha = 0.5;
      c.drawImage(CA.FX.getSoft(ch.color), (W > H ? W * 0.25 : W / 2) - 160, H * 0.62 - 120, 320, 240);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      // silhouette character
      const land = W > H;
      const scale = land ? H / 130 * (this.screen === 'chars' ? 0.85 : 0.75) : Math.min(W / 120, H / 150) * (this.screen === 'chars' ? 0.75 : 0.9);
      const cy = land ? H * (this.screen === 'chars' ? 0.92 : 0.82) : this.screen === 'chars' ? H * 0.42 : H * 0.6;
      const cx = land ? W * (this.screen === 'chars' ? 0.2 : 0.25) : W / 2;
      c.save();
      if (this.screen !== 'menu' && this.screen !== 'chars' && this.screen !== 'results') c.globalAlpha = 0.22;
      CA.Sprites.drawCharacter(c, id, cx, cy, { t, move: 0, face: 1, scale, cast: 0.4 + Math.sin(t * 1.5) * 0.3, eyeGlow: 0.8 });
      c.restore();
      // ground glow
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35;
      c.drawImage(CA.FX.getSoft(ch.color), cx - 140, cy - 30, 280, 60);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    },

    // ================= ACTIONS =================
    act(a, ds, el) {
      const d = CA.Store.data;
      const click = () => CA.Audio.play('click');
      switch (a) {
        case 'menu': CA.Audio.play('back'); this.menu(); break;
        case 'play': click(); this.locations(); break;
        case 'continue': {
          click();
          const s = d.runSnapshot;
          if (s && CA.Chars.isUnlocked(s.char)) this.startGame(s.char, s.loc, s);
          break;
        }
        case 'chars': click(); this.chars(d.selectedChar); break;
        case 'viewchar': click(); this.chars(ds.id); break;
        case 'selchar': CA.Audio.play('select'); d.selectedChar = ds.id; CA.Store.save(); this.chars(ds.id); break;
        case 'buychar': {
          const c = CA.Chars.get(ds.id);
          if (d.shards >= c.unlock.cost) { d.shards -= c.unlock.cost; d.unlockedChars.push(c.id); d.selectedChar = c.id; CA.Store.save(); CA.Audio.play('achieve'); this.toast('Открыт персонаж <b>' + c.name + '</b>', c.color); this.chars(c.id); }
          else { CA.Audio.play('back'); this.toast('Недостаточно осколков', '#ff5a5a'); }
          break;
        }
        case 'techs': click(); this.techs(ds.id || this.techTab || d.selectedChar); break;
        case 'upgrades': click(); this.upgrades(); break;
        case 'buymeta': {
          if (CA.Prog.buyMeta(ds.id)) { CA.Audio.play('levelup'); this.upgrades(); }
          else { CA.Audio.play('back'); this.toast('Недостаточно осколков', '#ff5a5a'); }
          break;
        }
        case 'buycoffer': if (d.seals >= 1) { d.seals--; d.chests++; CA.Store.save(); CA.Audio.play('chest'); this.upgrades(); } else { CA.Audio.play('back'); this.toast('Нужна 1 печать', '#ff5a5a'); } break;
        case 'collection': click(); this.collection(ds.tab || this.colTab); break;
        case 'unlockart': {
          if (d.seals >= 3) { d.seals -= 3; CA.Artifacts.unlock(ds.id); CA.Store.save(); CA.Audio.play('achieve'); this.collection('art'); }
          else { CA.Audio.play('back'); this.toast('Нужно 3 печати', '#ff5a5a'); }
          break;
        }
        case 'achievements': click(); this.achievements(); break;
        case 'settings': click(); this.settings(ds.from); break;
        case 'toggle': {
          const k = ds.key; CA.Store.settings[k] = !CA.Store.settings[k]; CA.Store.save(); CA.Audio.applySettings(); click();
          if (k === 'vibration' && CA.Store.settings.vibration) CA.Audio.vibrate('medium');
          el.classList.toggle('on', CA.Store.settings[k]);
          break;
        }
        case 'quality': CA.Store.settings.quality = ds.v; CA.Store.save(); CA.Game.resize(); click(); this.settings(ds.from); break;
        case 'reset':
          if (confirm('Сбросить ВЕСЬ прогресс? Это действие нельзя отменить.')) { CA.Store.reset(); CA.Artifacts.ensureDefaults(); CA.Store.save(); this.toast('Прогресс сброшен'); this.menu(); }
          break;
        case 'daily': click(); this.daily(); break;
        case 'claimq': { const r = CA.Prog.claimQuest(+ds.i); if (r) { CA.Audio.play('achieve'); this.toast('+' + r + ' ◆ за задание', '#7af0ff'); } this.daily(); break; }
        case 'claimbonus': if (CA.Prog.claimDailyBonus()) { CA.Audio.play('chest'); this.toast('Бонус дня: сундук + печать!', '#ffd27a'); } this.daily(); break;
        case 'coffer': click(); this.coffer(); break;
        case 'opencoffer': this.openCoffer(); break;
        case 'loc': click(); d.selectedLocation = ds.id; CA.Store.save(); this.locations(); break;
        case 'nightmare': d.nightmare = !d.nightmare; CA.Store.save(); click(); this.locations(); break;
        case 'start': CA.Audio.play('select'); this.startGame(d.selectedChar, d.selectedLocation); break;
        // in-game
        case 'card': this.pickCard(+ds.i); break;
        case 'reroll': this.reroll(); break;
        case 'art': this.pickArtifact(+ds.i); break;
        case 'artskip': this.pickArtifact(-1); break;
        case 'resume': click(); this.root.innerHTML = ''; CA.Game.resume(); break;
        case 'quit': if (confirm('Покинуть забег? Награда будет начислена за текущий прогресс.')) { this.root.innerHTML = ''; CA.Game.quitRun(); } break;
        case 'again': click(); this.startGame(d.selectedChar, d.selectedLocation); break;
        case 'tutok': click(); $('.tut') && $('.tut').remove(); break;
        case 'pausesettings': click(); this.settings('pause'); break;
        case 'backpause': click(); this.pauseMenu(); break;
      }
    },
    startGame(charId, locId, snap) {
      document.body.classList.remove('inmenu');
      this.root.innerHTML = '';
      if (!snap) CA.Store.data.runSnapshot = null;
      CA.Game.startRun(charId, locId, snap);
    },

    // ================= LOCATIONS =================
    locations() {
      const d = CA.Store.data;
      this.screen = 'loc';
      let html = this.header('ВЫБОР АРЕНЫ', 'Каждая арена: свои духи, события и босс') + '<div class="locs">';
      for (const l of CA.Locations.LOCS) {
        const un = d.unlockedLocations.indexOf(l.id) >= 0;
        const sel = d.selectedLocation === l.id;
        const boss = CA.Bosses.DEFS[l.boss];
        html += '<div class="loc' + (sel ? ' sel' : '') + (un ? '' : ' locked') + '" style="--c:' + l.accent + '" ' + (un ? 'data-act="loc" data-id="' + l.id + '"' : '') + '>' +
          '<div class="loc-t"><b>' + l.name + '</b><span>РАНГ ' + 'I'.repeat(l.tier) + '</span></div>' +
          '<div class="loc-ru">' + l.ru + '</div>' +
          (un ? '<p>' + l.desc + '</p><div class="loc-b">Босс: <b>' + boss.ru + '</b> · Особый ранг: ' + CA.Bosses.DEFS[l.mid].ru + '</div>' : '<p class="lk">🔒 ' + l.unlockText + '</p>') +
        '</div>';
      }
      html += '</div>';
      if (d.nightmareUnlocked) html += '<button class="toggle-row' + (d.nightmare ? ' on' : '') + '" data-act="nightmare"><span>Режим КОШМАР</span><small>Враги x1.9 HP, x1.4 урона · награды x2</small><i></i></button>';
      const ch = CA.Chars.get(d.selectedChar);
      html += '<div class="start-row"><div class="sr-ch" style="--c:' + ch.color + '"><b>' + ch.name + '</b><small>' + ch.archetype + '</small></div><button class="mbtn play" data-act="start"><b>В БОЙ</b><small>~13 минут</small></button></div>';
      this.open(html);
    },

    // ================= CHARACTERS =================
    chars(id) {
      const d = CA.Store.data;
      this.screen = 'chars'; this.charView = id;
      const c = CA.Chars.get(id), kit = CA.Kits[id];
      const un = CA.Chars.isUnlocked(id);
      let tabs = '<div class="ctabs">';
      for (const r of CA.Chars.ROSTER) {
        const u = CA.Chars.isUnlocked(r.id);
        const secret = !u && r.unlock.type === 'secret' && d.stats.kills < 500;
        tabs += '<button class="ctab' + (r.id === id ? ' on' : '') + (u ? '' : ' lk') + '" style="--c:' + r.color + '" data-act="viewchar" data-id="' + r.id + '"><i>' + (secret ? '?' : CA.Icons.img('char_' + r.id, r.color)) + '</i><small>' + (secret ? '???' : r.archetype.split(' ')[0]) + '</small></button>';
      }
      tabs += '</div>';
      const secret = !un && c.unlock.type === 'secret' && d.stats.kills < 500;
      const stat = (n, v) => '<div class="st"><span>' + n + '</span><div class="pips">' + [1, 2, 3, 4, 5].map((i) => '<i class="' + (i <= v ? 'on' : '') + '"></i>').join('') + '</div></div>';
      let html = this.header('ПЕРСОНАЖИ', 'Шесть магов — шесть разных стилей боя') + tabs + '<div class="cspace"></div>';
      html += '<div class="cpanel" style="--c:' + c.color + '">';
      if (secret) {
        html += '<h3>??? </h3><p class="style">Этот маг скрыт. Говорят, он появляется лишь перед теми, кто изгнал множество проклятий…</p><p class="lk">' + CA.Chars.progressText(c) + '</p>';
      } else {
        html += '<div class="cname"><b>' + c.name + '</b><span>' + c.archetype + ' · ' + c.ru + '</span></div>';
        html += '<div class="stats">' + stat('Здоровье', c.rate.hp) + stat('Урон', c.rate.dmg) + stat('Скорость', c.rate.spd) + stat('Дальность', c.rate.range) + stat('Сложность', c.rate.diff) + '</div>';
        html += '<p class="style">' + c.style + '</p>';
        html += '<div class="abl">';
        const list = [['АТАКА', kit.basic], ['ПАССИВ', kit.passive]].concat(kit.skills.map((s, i) => ['ТЕХНИКА ' + (i + 1), s])).concat([['УЛЬТИМЕЙТ', kit.ult], ['ТЕРРИТОРИЯ', kit.domain]]);
        for (const [tag, s] of list) html += '<div class="ab"><i>' + CA.Icons.img(s.icon || 'domain', c.color) + '</i><div><b>' + s.name + '</b> <em>' + tag + '</em>' + (s.en ? '<small class="en">' + s.en + '</small>' : '') + '<p>' + s.desc + '</p></div></div>';
        html += '</div>';
        if (un) html += d.selectedChar === id ? '<button class="mbtn sel" disabled><b>ВЫБРАН</b></button>' : '<button class="mbtn play" data-act="selchar" data-id="' + id + '"><b>ВЫБРАТЬ</b></button>';
        else if (c.unlock.type === 'shards') html += '<button class="mbtn play" data-act="buychar" data-id="' + id + '"><b>ОТКРЫТЬ · ' + c.unlock.cost + ' ◆</b></button>';
        else html += '<p class="lk">🔒 ' + CA.Chars.progressText(c) + '</p>';
      }
      html += '</div>';
      this.open(html, 'chars-screen');
    },

    // ================= TECHNIQUES =================
    techs(id) {
      this.techTab = id;
      this.screen = 'techs';
      const disc = CA.Store.data.discovered;
      let tabs = '<div class="ctabs">';
      for (const r of CA.Chars.ROSTER) tabs += '<button class="ctab' + (r.id === id ? ' on' : '') + '" style="--c:' + r.color + '" data-act="techs" data-id="' + r.id + '"><i>' + CA.Icons.img('char_' + r.id, r.color) + '</i><small>' + r.archetype.split(' ')[0] + '</small></button>';
      tabs += '</div>';
      const kit = CA.Kits[id], c = CA.Chars.get(id);
      const all = CA.A.allTechs(kit);
      const found = all.filter((s) => disc.tech[s.id]).length;
      let html = this.header('ТЕХНИКИ', 'Найдено ' + found + ' / ' + all.length + ' · ' + c.name) + tabs + '<div class="tlist" style="--c:' + c.color + '">';
      const rn = ['', 'Обычная', 'Обычная', 'Редкая', 'Эпическая', 'Легендарная'];
      const rc = ['', 'common', 'common', 'rare', 'epic', 'legendary'];
      for (const s of all) {
        const f = disc.tech[s.id];
        html += '<div class="tech' + (f ? '' : ' unk') + '"><div class="th"><i>' + (f ? CA.Icons.img(s.icon || 'domain', c.color) : '?') + '</i><div><b>' + (f ? s.name : '???') + '</b>' + (f && s.en ? '<small class="en">' + s.en + '</small>' : '') + '<p>' + (f ? s.desc : 'Изучите технику в забеге, чтобы открыть её описание.') + '</p></div></div>';
        if (f) {
          html += '<ol>';
          s.levels.forEach((t, i) => { html += '<li class="r-' + rc[i + 1] + '"><span>УР.' + (i + 1) + ' · ' + rn[i + 1] + '</span>' + t + '</li>'; });
          html += '</ol>';
        }
        html += '</div>';
      }
      html += '<h3 class="sec">МИФИЧЕСКИЕ КОМБИНАЦИИ</h3>';
      for (const cb of kit.combos) {
        const f = disc.combos[cb.id];
        const a = all.find((s) => s.id === cb.a), b = all.find((s) => s.id === cb.b);
        html += '<div class="tech combo' + (f ? '' : ' unk') + '"><div class="th"><i>' + (f ? CA.Icons.img(cb.icon, '#ff3a6a') : '?') + '</i><div><b>' + (f ? cb.name : '??? Комбинация') + '</b>' + (f && cb.en ? '<small class="en">' + cb.en + '</small>' : '') + '<p>' + (f ? cb.desc : 'Подсказка: ' + a.name + ' (ур.' + cb.al + ') + ' + b.name + ' (ур.' + cb.bl + ')') + '</p></div></div></div>';
      }
      html += '</div>';
      this.open(html);
    },

    // ================= UPGRADES =================
    upgrades() {
      const d = CA.Store.data;
      this.screen = 'upg';
      let html = this.header('УЛУЧШЕНИЯ', 'Постоянные бонусы для всех магов') + '<div class="upg">';
      for (const m of CA.Prog.META) {
        const l = CA.Prog.metaLevel(m.id), max = l >= m.max, cost = CA.Prog.metaCost(m);
        html += '<div class="up"><i>' + CA.Icons.img(m.id, '#ffd27a') + '</i><div class="up-b"><b>' + m.ru + '</b><span>' + m.fmt(l * m.per) + (max ? '' : ' → ' + m.fmt((l + 1) * m.per)) + '</span>' +
          '<div class="pips">' + Array.from({ length: m.max }, (_, i) => '<i class="' + (i < l ? 'on' : '') + '"></i>').join('') + '</div></div>' +
          (max ? '<button class="buy max" disabled>MAX</button>' : '<button class="buy' + (d.shards >= cost ? '' : ' no') + '" data-act="buymeta" data-id="' + m.id + '">' + cost + ' ◆</button>') + '</div>';
      }
      html += '</div><h3 class="sec">ЛАВКА ПЕЧАТЕЙ</h3><div class="upg"><div class="up"><i>' + CA.Icons.img('chest', '#ffd27a') + '</i><div class="up-b"><b>Проклятый сундук</b><span>Осколки, печати или новый артефакт</span></div><button class="buy' + (d.seals >= 1 ? '' : ' no') + '" data-act="buycoffer">1 печать</button></div></div>';
      this.open(html);
    },

    // ================= COLLECTION =================
    collection(tab) {
      this.colTab = tab;
      this.screen = 'col';
      const d = CA.Store.data, disc = d.discovered;
      const tabs = '<div class="seg">' + [['art', 'Артефакты'], ['best', 'Бестиарий'], ['boss', 'Боссы'], ['stats', 'Статистика']].map(([k, n]) => '<button class="' + (k === tab ? 'on' : '') + '" data-act="collection" data-tab="' + k + '">' + n + '</button>').join('') + '</div>';
      let html = this.header('КОЛЛЕКЦИЯ', '') + tabs;
      if (tab === 'art') {
        const R = RAR();
        html += '<div class="arts">';
        for (const a of CA.Artifacts.LIST) {
          const un = CA.Artifacts.isUnlocked(a.id), f = disc.artifacts[a.id];
          html += '<div class="art r-' + a.rarity + (un ? '' : ' locked') + '"><i>' + (un ? CA.Icons.img(a.id, R[a.rarity].color) : '?') + '</i><div><b>' + (un ? a.ru : '???') + '</b><em style="color:' + R[a.rarity].color + '">' + R[a.rarity].ru + (f ? ' · найден' : '') + '</em><p>' + (un ? a.desc : 'Запечатан. Откройте в сундуках или за достижения.') + '</p>' +
            (un ? '' : '<button class="buy small" data-act="unlockart" data-id="' + a.id + '">Распечатать · 3 печати</button>') + '</div></div>';
        }
        html += '</div>';
      } else if (tab === 'best') {
        html += '<div class="arts">';
        for (const k in CA.Enemies.TYPES) {
          const e = CA.Enemies.TYPES[k], f = disc.enemies[k];
          html += '<div class="art best' + (f ? '' : ' locked') + '"><canvas class="ecv" data-type="' + k + '" width="96" height="96"></canvas><div><b>' + (f ? e.ru : '???') + '</b><em>' + (f ? e.name : '') + ' · убито ' + (d.stats.killsByType[k] || 0) + '</em><p>' + (f ? e.desc : 'Ещё не встречен.') + '</p></div></div>';
        }
        html += '</div>';
      } else if (tab === 'boss') {
        html += '<div class="arts">';
        for (const k in CA.Bosses.DEFS) {
          const b = CA.Bosses.DEFS[k], f = disc.bosses[k];
          html += '<div class="art bossc' + (f ? '' : ' locked') + '" style="--c:' + b.color + '"><i>' + (f ? CA.Icons.img('skull', b.color) : '?') + '</i><div><b>' + (f ? b.ru : '???') + '</b><em>' + (f ? b.name + ' · ' + b.title : '') + '</em><p>' + (f ? b.desc : 'Ещё не встречен.') + '</p><em>Побед: ' + (d.stats.bossKills[k] || 0) + '</em></div></div>';
        }
        html += '</div>';
      } else {
        const s = d.stats;
        const rows = [['Всего уничтожено духов', U.fmtNum(s.kills)], ['Рекорд убийств за забег', s.bestKillsRun], ['Забегов', s.runs], ['Побед', s.wins], ['Поражений', s.deaths], ['Лучшее время', U.fmtTime(s.bestTime)],
          ['Максимальный уровень', s.maxLevel], ['Время в игре', Math.floor(s.playTime / 60) + ' мин'], ['Ультимейтов', s.ultsUsed], ['Территорий раскрыто', s.domainsUsed], ['Сундуков в забегах', s.chestsOpened],
          ['Сундуков открыто в меню', s.coffersOpened], ['Чёрных Искр', s.blackSparks], ['Джекпотов', s.jackpots], ['Сильнейший удар', Math.round(s.maxHit)], ['Боссов изгнано', Object.values(s.bossKills).reduce((a, b) => a + b, 0)],
          ['Осколков заработано', U.fmtNum(d.totalShardsEarned)], ['Техник открыто', Object.keys(d.discovered.tech).length], ['Комбинаций открыто', Object.keys(d.discovered.combos).length]];
        html += '<div class="statsT">' + rows.map(([a, b]) => '<div><span>' + a + '</span><b>' + b + '</b></div>').join('') + '</div>';
      }
      this.open(html);
      if (tab === 'best') this.root.querySelectorAll('.ecv').forEach((cv) => {
        const k = cv.dataset.type, e = CA.Enemies.TYPES[k];
        const s = CA.Sprites.enemySprite(k, 0, false, e.r);
        const g = cv.getContext('2d');
        const sc = Math.min(1.6, 80 / s.size);
        if (!disc.enemies[k]) g.filter = 'brightness(0)';
        g.drawImage(s.c, 48 - s.half * sc, 48 - s.half * sc, s.size * sc, s.size * sc);
        if (!disc.enemies[k]) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#000'; g.fillRect(0, 0, 96, 96); }
      });
    },

    // ================= ACHIEVEMENTS =================
    achievements() {
      CA.Prog.checkAchievements();
      const d = CA.Store.data;
      this.screen = 'ach';
      const done = CA.Prog.ACH.filter((a) => d.achievements[a.id]).length;
      let html = this.header('ДОСТИЖЕНИЯ', done + ' / ' + CA.Prog.ACH.length + ' получено') + '<div class="achs">';
      for (const a of CA.Prog.ACH) {
        const got = d.achievements[a.id];
        const pr = CA.Prog.achProgress(a);
        const hide = a.secret && !got;
        html += '<div class="ach' + (got ? ' got' : '') + '"><i>' + (got ? '✓' : hide ? '?' : '◇') + '</i><div><b>' + (hide ? 'Секретное достижение' : a.ru) + '</b><p>' + (hide ? '???' : a.desc) + '</p>' +
          (got ? '' : '<div class="prog"><div style="width:' + Math.round(pr.v / pr.n * 100) + '%"></div><span>' + (hide ? '?' : U.fmtNum(pr.v) + ' / ' + U.fmtNum(pr.n)) + '</span></div>') +
          '<em>Награда: ' + (hide ? '???' : CA.Prog.rewText(a.rew)) + '</em></div></div>';
      }
      html += '</div>';
      this.open(html);
    },

    // ================= SETTINGS =================
    settings(from) {
      const s = CA.Store.settings;
      this.screen = 'set';
      const tg = (k, n, sub) => '<button class="toggle-row' + (s[k] ? ' on' : '') + '" data-act="toggle" data-key="' + k + '"><span>' + n + '</span>' + (sub ? '<small>' + sub + '</small>' : '') + '<i></i></button>';
      const back = from === 'pause' ? '<div class="hdr"><button class="back" data-act="backpause">‹</button><div><h2>НАСТРОЙКИ</h2></div></div>' : this.header('НАСТРОЙКИ', '');
      let html = back + '<div class="sets">' +
        '<h3 class="sec">ЗВУК</h3>' +
        '<label class="slider"><span>Общая громкость</span><input type="range" min="0" max="1" step="0.05" value="' + s.master + '" data-set="master"></label>' +
        '<label class="slider"><span>Громкость музыки</span><input type="range" min="0" max="1" step="0.05" value="' + s.musicVol + '" data-set="musicVol"></label>' +
        tg('music', 'Музыка', 'Процедурный эмбиент и боевые треки') + tg('sfx', 'Звуки боя', 'Удары, выстрелы, взрывы') + tg('skills', 'Звуки техник', 'Ультимейты, территории, призывы') + tg('ui', 'Звуки интерфейса') +
        '<h3 class="sec">УПРАВЛЕНИЕ</h3>' + tg('vibration', 'Вибрация / тактильный отклик', 'На iPhone — системный отклик при нажатиях') + tg('autoAttack', 'Автоатака', 'Обычная атака срабатывает сама; удержание кнопки ускоряет её на 30%') +
        '<h3 class="sec">ГРАФИКА</h3><div class="seg q">' + ['low', 'medium', 'high'].map((q) => '<button class="' + (s.quality === q ? 'on' : '') + '" data-act="quality" data-v="' + q + '" data-from="' + (from || '') + '">' + { low: 'Низкое', medium: 'Среднее', high: 'Высокое' }[q] + '</button>').join('') + '</div>' +
        tg('screenShake', 'Тряска экрана') + tg('dmgNumbers', 'Цифры урона') + tg('showFps', 'Показывать FPS') +
        (from === 'pause' ? '' : '<h3 class="sec">ДАННЫЕ</h3><p class="note">Прогресс хранится только на этом устройстве (localStorage) и работает без интернета.</p><button class="mbtn danger" data-act="reset"><b>СБРОСИТЬ ПРОГРЕСС</b></button>') +
        '<h3 class="sec">КЛАВИАТУРА (ПК)</h3><p class="note">WASD — движение · J/Пробел — атака · 1-4 — техники · Q — ультимейт · E — территория · P — пауза</p>' +
        '</div>';
      this.open(html);
    },

    // ================= DAILY =================
    daily() {
      const dl = CA.Prog.ensureDaily();
      this.screen = 'daily';
      let html = this.header('ЕЖЕДНЕВНЫЕ ЗАДАНИЯ', 'Обновляются по дате устройства · ' + dl.date) + '<div class="achs">';
      dl.quests.forEach((q, i) => {
        const def = CA.Prog.questDef(q.id);
        const done = q.v >= q.n;
        html += '<div class="ach' + (q.claimed ? ' got' : '') + '"><i>' + (q.claimed ? '✓' : CA.Icons.img('calendar', '#ff8aa8')) + '</i><div><b>' + def.ru(q.n) + '</b><div class="prog"><div style="width:' + Math.round(Math.min(1, q.v / q.n) * 100) + '%"></div><span>' + Math.floor(q.v) + ' / ' + q.n + '</span></div><em>Награда: ' + def.rew + ' ◆</em></div>' +
          (q.claimed ? '' : '<button class="buy' + (done ? '' : ' no') + '" ' + (done ? 'data-act="claimq" data-i="' + i + '"' : 'disabled') + '>Забрать</button>') + '</div>';
      });
      const all = dl.quests.every((q) => q.claimed);
      html += '<div class="ach bonus' + (dl.bonusClaimed ? ' got' : '') + '"><i>' + CA.Icons.img('chest', '#ffd27a') + '</i><div><b>Бонус за все задания</b><em>Проклятый сундук + 1 печать</em></div>' + (dl.bonusClaimed ? '' : '<button class="buy' + (all ? '' : ' no') + '" ' + (all ? 'data-act="claimbonus"' : 'disabled') + '>Забрать</button>') + '</div>';
      html += '</div>';
      this.open(html);
    },

    // ================= COFFERS =================
    coffer() {
      const d = CA.Store.data;
      this.screen = 'coffer';
      this.open(this.header('ПРОКЛЯТЫЕ СУНДУКИ', 'Сундуков: ' + d.chests) +
        '<div class="coffer-wrap"><div class="coffer" id="cofferEl"><div class="lid"></div><div class="box"><span>' + CA.Icons.img('vortex', '#ffd27a') + '</span></div></div><div id="cofferRes" class="coffer-res">' +
        (d.chests > 0 ? 'Нажмите, чтобы открыть' : 'Сундуков нет. Их дают за победы, задания и достижения, а также в лавке печатей.') + '</div>' +
        (d.chests > 0 ? '<button class="mbtn play" data-act="opencoffer"><b>ОТКРЫТЬ</b></button>' : '') + '</div>');
    },
    openCoffer() {
      const r = CA.Prog.openCoffer();
      if (!r) return;
      const el = $('#cofferEl');
      el.classList.remove('open'); void el.offsetWidth; el.classList.add('shake');
      CA.Audio.play('roll');
      const btn = this.root.querySelector('[data-act="opencoffer"]');
      if (btn) btn.disabled = true;
      setTimeout(() => {
        if (this.screen !== 'coffer') return;
        el.classList.remove('shake'); el.classList.add('open');
        CA.Audio.play('chest'); CA.Audio.vibrate('medium');
        const R = RAR();
        $('#cofferRes').innerHTML = '<b style="color:' + R[r.rarity].color + '">' + r.text + '</b>';
        for (const c of r.chars) this.toast('Открыт персонаж <b>' + c.name + '</b>!', c.color);
        for (const a of r.ach) this.toast('Достижение: <b>' + a.ru + '</b>', '#ffd27a');
        setTimeout(() => { if (this.screen !== 'coffer') return; this.coffer(); $('#cofferRes').innerHTML = '<b style="color:' + R[r.rarity].color + '">' + r.text + '</b>'; }, 1600);
      }, 900);
    },

    // ================= LEVEL UP =================
    levelUp() {
      const G = CA.Game, p = G.player;
      this.cards = CA.A.rollCards(p, 3);
      this.renderCards();
    },
    renderCards() {
      const p = CA.Game.player, R = RAR();
      let html = '<div class="lvl-t"><b>УРОВЕНЬ ' + (p.level - CA.Game.pendingLevels + 1) + '</b><small>Выберите технику или усиление</small></div><div class="cards">';
      this.cards.forEach((c, i) => {
        html += '<button class="card r-' + c.rarity + '" style="--rc:' + R[c.rarity].color + ';animation-delay:' + (i * 0.08) + 's" data-act="card" data-i="' + i + '">' +
          '<div class="cr">' + R[c.rarity].name.toUpperCase() + '</div><i>' + CA.Icons.img(c.icon, R[c.rarity].color) + '</i><div class="cb"><em>' + c.tag + '</em><b>' + esc(c.title) + '</b><p>' + esc(c.desc) + '</p></div></button>';
      });
      html += '</div>';
      if (p.rerolls > 0) html += '<button class="reroll" data-act="reroll">↻ Перебросить (' + p.rerolls + ')</button>';
      this.root.innerHTML = '<div class="overlay lvl">' + html + '</div>';
    },
    pickCard(i) {
      const G = CA.Game, c = this.cards && this.cards[i];
      if (!c || G.state !== 'levelup') return;
      CA.Audio.play('select'); CA.Audio.vibrate('light');
      c.apply();
      if (c.kind === 'stat' && c.id !== 'feast') G.run.picks.push({ id: c.id, r: c.rarity });
      G.player.recalc();
      G.pendingLevels--;
      this.cards = null;
      this.root.innerHTML = '';
      const p = G.player;
      CA.FX.ring(p.x, p.y - 20, 10, 120, 0.5, RAR()[c.rarity].color, 5);
      const pc = RAR()[c.rarity].color;
      CA.FX.custom(0.8, (ctx, f, k) => { // pillar of light
        ctx.globalCompositeOperation = 'lighter';
        const w = 26 * k + 4;
        ctx.globalAlpha = k * 0.8;
        ctx.drawImage(CA.FX.getGlow(pc), p.x - w, p.y - 260, w * 2, 280);
        ctx.globalAlpha = k;
        ctx.drawImage(CA.FX.getGlow('#ffffff'), p.x - w * 0.3, p.y - 220, w * 0.6, 230);
      });
      CA.FX.wisps(p.x, p.y, pc, 10);
      CA.FX.burst(p.x, p.y - 20, RAR()[c.rarity].color, 20, 220, 4, 0.6);
      G.state = 'play'; CA.Input.enabled = true; CA.Input.releaseAll();
      G.last = performance.now();
    },
    reroll() {
      const p = CA.Game.player;
      if (p.rerolls <= 0) return;
      p.rerolls--;
      CA.Audio.play('roll');
      this.cards = CA.A.rollCards(p, 3);
      this.renderCards();
    },

    // ================= CHEST =================
    chest(c) {
      const G = CA.Game, p = G.player;
      const arts = CA.Artifacts.roll(p, 3, c.bias);
      this.arts = arts; this.chestReady = false;
      CA.Store.data.stats.chestsOpenedLive = (CA.Store.data.stats.chestsOpenedLive || 0) + 1;
      const R = RAR();
      let html = '<div class="coffer-wrap ig"><div class="coffer shake" id="cofferEl"><div class="lid"></div><div class="box"><span>' + CA.Icons.img('vortex', '#ffd27a') + '</span></div></div></div>';
      this.root.innerHTML = '<div class="overlay chest">' + html + '</div>';
      CA.Audio.play('roll');
      setTimeout(() => {
        const el = $('#cofferEl'); if (el) { el.classList.remove('shake'); el.classList.add('open'); }
        CA.Audio.play('chest');
        setTimeout(() => {
          if (G.state !== 'chest' || this.arts !== arts) return;
          this.chestReady = true;
          let h = '<div class="lvl-t"><b>СУНДУК ПРОКЛЯТИЙ</b><small>Выберите артефакт (' + p.artifacts.length + '/6)</small></div><div class="cards">';
          if (p.artifacts.length >= 6 || !this.arts.length) {
            h += '<div class="card r-rare"><i>' + CA.Icons.img('gem', '#4fb8ff') + '</i><div class="cb"><b>+20 осколков</b><p>' + (p.artifacts.length >= 6 ? 'Все слоты артефактов заняты.' : 'Все доступные артефакты уже у вас.') + '</p></div></div>';
          } else this.arts.forEach((a, i) => {
            h += '<button class="card r-' + a.rarity + '" style="--rc:' + R[a.rarity].color + ';animation-delay:' + (i * 0.08) + 's" data-act="art" data-i="' + i + '"><div class="cr">' + R[a.rarity].name.toUpperCase() + '</div><i>' + CA.Icons.img(a.id, R[a.rarity].color) + '</i><div class="cb"><em>АРТЕФАКТ</em><b>' + a.ru + '</b><p>' + a.desc + '</p></div></button>';
          });
          h += '</div><button class="reroll" data-act="artskip">' + (p.artifacts.length >= 6 || !this.arts.length ? 'Забрать осколки' : 'Пропустить (+25 ◆)') + '</button>';
          this.root.innerHTML = '<div class="overlay lvl">' + h + '</div>';
        }, 500);
      }, 700);
    },
    pickArtifact(i) {
      const G = CA.Game, p = G.player;
      if (G.state !== 'chest' || !this.arts) return;
      if (i >= 0 && this.arts[i] && p.artifacts.length < 6) {
        const a = this.arts[i];
        CA.Artifacts.give(G, p, a);
        CA.Audio.play('select');
        CA.FX.ring(p.x, p.y - 20, 10, 140, 0.6, RAR()[a.rarity].color, 6);
        if (!a.sealed) G.banner('АРТЕФАКТ', a.ru, RAR()[a.rarity].color, 1.6);
      } else {
        G.run.shardsBonus += (p.artifacts.length >= 6 || !this.arts.length) ? 20 : 25;
        CA.Audio.play('pickup');
      }
      this.arts = null;
      this.root.innerHTML = '';
      G.state = 'play'; CA.Input.enabled = true; CA.Input.releaseAll();
      G.last = performance.now();
    },

    // ================= PAUSE =================
    pauseMenu() {
      const G = CA.Game, p = G.player, R = RAR();
      const kit = p.kit;
      let build = '';
      for (const s of CA.A.allTechs(kit)) {
        const l = p.lv[s.id] || 0;
        if (!l) continue;
        build += '<div class="bt"><i>' + CA.Icons.img(s.icon || 'domain', p.ch.color) + '</i><b>' + s.name + '</b><span>' + '★'.repeat(l) + '☆'.repeat(5 - l) + '</span></div>';
      }
      for (const c of kit.combos) if (p.combos[c.id]) build += '<div class="bt combo"><i>' + CA.Icons.img(c.icon, '#ff3a6a') + '</i><b>' + c.name + '</b><span>МИФ</span></div>';
      let arts = p.artifacts.map((a) => '<div class="bt" style="--rc:' + R[a.rarity].color + '"><i>' + CA.Icons.img(a.id, R[a.rarity].color) + '</i><b>' + a.ru + '</b></div>').join('') || '<p class="note">Нет артефактов</p>';
      this.root.innerHTML = '<div class="overlay pause"><h2>ПАУЗА</h2><div class="pinfo">' + U.fmtTime(G.t) + ' · уровень ' + p.level + ' · ☠ ' + G.run.kills + '</div>' +
        '<div class="pcols"><div><h3 class="sec">ТЕХНИКИ</h3>' + build + '</div><div><h3 class="sec">АРТЕФАКТЫ</h3>' + arts + '</div></div>' +
        '<button class="mbtn play" data-act="resume"><b>ПРОДОЛЖИТЬ</b></button><button class="mbtn" data-act="pausesettings"><b>НАСТРОЙКИ</b></button><button class="mbtn danger" data-act="quit"><b>ПОКИНУТЬ ЗАБЕГ</b></button></div>';
      this.screen = 'pause';
    },

    // ================= RESULTS =================
    results(victory, run, rew, res) {
      document.body.classList.add('inmenu');
      this.screen = 'results';
      CA.Game.state = 'menu';
      const ch = CA.Chars.get(run.char);
      let html = '<div class="res ' + (victory ? 'win' : 'lose') + '"><div class="res-k">' + CA.Icons.img(victory ? 'trophy' : 'skull', victory ? '#ffd27a' : '#ff3a4a') + '</div><h1>' + (victory ? 'ИЗГНАНИЕ ЗАВЕРШЕНО' : 'ВЫ ПАЛИ') + '</h1><p>' + ch.name + ' · ' + CA.Locations.get(run.loc).ru + '</p>' +
        '<div class="statsT">' +
        [['Время', U.fmtTime(run.time)], ['Уровень', run.level], ['Уничтожено', run.kills], ['Нанесено урона', U.fmtNum(run.dmg)], ['Сильнейший удар', Math.round(run.maxHit)], ['Боссов', run.bosses + run.mids], ['Сундуков', run.chests], ['Ультимейтов / Территорий', run.ults + ' / ' + run.domains]]
          .map(([a, b]) => '<div><span>' + a + '</span><b>' + b + '</b></div>').join('') + '</div>' +
        '<div class="rew"><div>' + CA.Icons.img('gem', '#c8a8ff') + '+' + rew.shards + '</div>' + (rew.seals ? '<div>' + CA.Icons.img('seal', '#ff8aa8') + '+' + rew.seals + '</div>' : '') + (rew.coffers ? '<div>' + CA.Icons.img('chest', '#ffd27a') + '+' + rew.coffers + '</div>' : '') + '</div>';
      if (res.unlocked.length) html += '<div class="unl">' + res.unlocked.map((u) => '<div>🔓 ' + u + '</div>').join('') + '</div>';
      if (res.ach.length) html += '<div class="unl">' + res.ach.map((a) => '<div>🏆 ' + a.ru + ' — ' + CA.Prog.rewText(a.rew) + '</div>').join('') + '</div>';
      html += '<button class="mbtn play" data-act="again"><b>ЕЩЁ РАЗ</b></button><button class="mbtn" data-act="menu"><b>В МЕНЮ</b></button></div>';
      this.open(html, 'results-screen');
      CA.Audio.play(victory ? 'jackpot' : 'back');
      for (const a of res.ach) this.toast('Достижение: <b>' + a.ru + '</b>', '#ffd27a');
    },

    tutorial() {
      const d = document.createElement('div');
      d.className = 'tut';
      d.innerHTML = '<div class="tut-in"><h3>КАК ИГРАТЬ</h3><p>👈 <b>Левая половина экрана</b> — джойстик (появляется под пальцем).</p><p>👉 <b>Большая кнопка</b> — обычная атака (работает и сама, удержание ускоряет).</p><p>🔹 <b>Кнопки вокруг</b> — техники. Новые открываются при повышении уровня.</p><p>⚡ <b>Верхняя кнопка</b> — ультимейт, когда шкала проклятой энергии полна.</p><p>⛩ <b>Территория</b> — появится после пробуждения (уровень 8+).</p><p>Собирайте фиолетовые кристаллы, чтобы расти. На 6:00 и 12:00 приходят боссы.</p><button class="mbtn play" data-act="tutok"><b>ПОНЯТНО</b></button></div>';
      this.root.appendChild(d);
      CA.Game.state = 'pause';
      CA.Input.enabled = false;
      d.querySelector('button').addEventListener('click', () => { CA.Game.state = 'play'; CA.Input.enabled = true; CA.Game.last = performance.now(); });
    },
  };
  CA.UI = UI;
})();
