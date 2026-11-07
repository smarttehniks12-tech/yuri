/* locations.js — 4 arenas: procedural ground, decor, ambience, enemy pools, special events */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U;
  const TAU = U.TAU;
  const WORLD = 3000;

  // ---------- ground tiles ----------
  function tileSchool() {
    const S = 512, c = U.makeCanvas(S, S), g = c.getContext('2d');
    const rng = U.mulberry32(11);
    g.fillStyle = '#17131c'; g.fillRect(0, 0, S, S);
    const ph = 32;
    for (let y = 0; y < S; y += ph) {
      let x = -((y / ph) % 2) * 90;
      while (x < S) {
        const w = 120 + rng() * 140;
        const l = 18 + rng() * 10;
        g.fillStyle = 'hsl(' + (20 + rng() * 10) + ',22%,' + l * 0.55 + '%)';
        g.fillRect(x + 1, y + 1, w - 2, ph - 2);
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
        for (let k = 0; k < 4; k++) { g.beginPath(); const yy = y + 5 + rng() * (ph - 10); g.moveTo(x + 4, yy); g.bezierCurveTo(x + w * 0.3, yy + rng() * 4 - 2, x + w * 0.6, yy + rng() * 4 - 2, x + w - 4, yy); g.stroke(); }
        g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + 5, y + ph / 2 - 1, 2, 2); g.fillRect(x + w - 7, y + ph / 2 - 1, 2, 2);
        x += w;
      }
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, y, S, 1.5);
    }
    // cracks & cursed stains
    for (let i = 0; i < 5; i++) {
      const x = rng() * S, y = rng() * S, r = 30 + rng() * 50;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(90,40,140,0.28)'); gr.addColorStop(1, 'rgba(90,40,140,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      let x = rng() * S, y = rng() * S; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += rng() * 30 - 15; y += rng() * 30 - 15; g.lineTo(x, y); }
      g.stroke();
    }
    return c;
  }
  function tileCity() {
    const S = 512, c = U.makeCanvas(S, S), g = c.getContext('2d');
    const rng = U.mulberry32(22);
    g.fillStyle = '#141720'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) {
      const v = 18 + rng() * 22;
      g.fillStyle = 'rgba(' + v + ',' + (v + 3) + ',' + (v + 10) + ',0.7)';
      g.fillRect(rng() * S, rng() * S, 2, 2);
    }
    // road lines
    g.fillStyle = 'rgba(230,200,60,0.55)';
    for (let x = 0; x < S; x += 64) g.fillRect(x + 8, S / 2 - 3, 36, 6);
    g.fillStyle = 'rgba(220,220,230,0.25)';
    g.fillRect(0, 40, S, 3); g.fillRect(0, S - 40, S, 3);
    // crosswalk
    for (let i = 0; i < 6; i++) g.fillRect(380 + i * 18, 60, 10, 120);
    // neon puddles
    const cols = ['255,60,180', '60,220,255', '160,90,255'];
    for (let i = 0; i < 6; i++) {
      const x = rng() * S, y = rng() * S, rx = 20 + rng() * 40, ry = rx * 0.45;
      g.save(); g.translate(x, y); g.scale(1, ry / rx);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
      const cc = cols[i % 3];
      gr.addColorStop(0, 'rgba(' + cc + ',0.35)'); gr.addColorStop(0.7, 'rgba(' + cc + ',0.12)'); gr.addColorStop(1, 'rgba(' + cc + ',0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill();
      g.restore();
    }
    g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      let x = rng() * S, y = rng() * S; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += rng() * 40 - 20; y += rng() * 40 - 20; g.lineTo(x, y); }
      g.stroke();
    }
    // manhole
    g.fillStyle = '#0c0e14'; g.strokeStyle = '#2a2e3a'; g.lineWidth = 3;
    g.beginPath(); g.arc(120, 380, 22, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = '#1e222c'; g.lineWidth = 1.5;
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(102, 380 + k * 7); g.lineTo(138, 380 + k * 7); g.stroke(); }
    return c;
  }
  function tileStation() {
    const S = 512, c = U.makeCanvas(S, S), g = c.getContext('2d');
    const rng = U.mulberry32(33);
    g.fillStyle = '#0d1414'; g.fillRect(0, 0, S, S);
    const T = 64;
    for (let y = 0; y < S; y += T) for (let x = 0; x < S; x += T) {
      const l = 12 + rng() * 6;
      g.fillStyle = 'hsl(175,10%,' + l + '%)'; g.fillRect(x + 2, y + 2, T - 4, T - 4);
      g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(x + 4, y + 4, T - 8, 6);
      if (rng() < 0.2) { g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + rng() * T, y); g.lineTo(x + rng() * T, y + T); g.stroke(); }
    }
    // tactile strip
    g.fillStyle = 'rgba(200,170,40,0.45)'; g.fillRect(0, 230, S, 26);
    g.fillStyle = 'rgba(120,100,20,0.6)';
    for (let x = 4; x < S; x += 10) for (let yy = 234; yy < 254; yy += 8) { g.beginPath(); g.arc(x, yy, 1.6, 0, TAU); g.fill(); }
    // grime
    for (let i = 0; i < 6; i++) {
      const x = rng() * S, y = rng() * S, r = 40 + rng() * 60;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(0,0,0,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    return c;
  }
  function tileDimension() {
    const S = 512, c = U.makeCanvas(S, S), g = c.getContext('2d');
    const rng = U.mulberry32(44);
    const gr = g.createLinearGradient(0, 0, S, S);
    gr.addColorStop(0, '#0c0618'); gr.addColorStop(0.5, '#140a26'); gr.addColorStop(1, '#0a0614');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    // hex grid fragments
    g.strokeStyle = 'rgba(150,90,255,0.16)'; g.lineWidth = 1;
    const hr = 32, hh = hr * Math.sqrt(3);
    for (let row = -1; row < S / hh + 1; row++) for (let col = -1; col < S / (hr * 1.5) + 1; col++) {
      if (rng() < 0.45) continue;
      const cx = col * hr * 1.5, cy = row * hh + (col % 2 ? hh / 2 : 0);
      g.beginPath();
      for (let k = 0; k <= 6; k++) { const a = k * TAU / 6; const px = cx + Math.cos(a) * hr, py = cy + Math.sin(a) * hr; if (k) g.lineTo(px, py); else g.moveTo(px, py); }
      g.stroke();
    }
    for (let i = 0; i < 220; i++) {
      g.fillStyle = 'rgba(' + (180 + rng() * 75) + ',' + (150 + rng() * 80) + ',255,' + (0.2 + rng() * 0.6) + ')';
      const s = rng() < 0.9 ? 1 : 2;
      g.fillRect(rng() * S, rng() * S, s, s);
    }
    for (let i = 0; i < 4; i++) {
      const x = rng() * S, y = rng() * S, r = 50 + rng() * 60;
      const gg = g.createRadialGradient(x, y, 0, x, y, r);
      gg.addColorStop(0, 'rgba(255,60,200,0.12)'); gg.addColorStop(1, 'rgba(255,60,200,0)');
      g.fillStyle = gg; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    return c;
  }

  // ---------- decor sprites ----------
  function spr(w, h, fn) { const c = U.makeCanvas(w * 2, h * 2), g = c.getContext('2d'); g.scale(2, 2); fn(g, w, h); return { c, w, h }; }
  const DECOR = {
    desk: () => spr(70, 50, (g) => {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(35, 44, 30, 5, 0, 0, TAU); g.fill();
      g.fillStyle = '#4a3226'; g.strokeStyle = '#120a08'; g.lineWidth = 2;
      g.save(); g.translate(35, 22); g.rotate(-0.15);
      g.fillRect(-28, -10, 56, 14); g.strokeRect(-28, -10, 56, 14);
      g.fillStyle = '#2a1c16'; g.fillRect(-25, 4, 4, 16); g.fillRect(20, 4, 4, 12);
      g.restore();
    }),
    lantern: () => spr(30, 60, (g) => {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(15, 56, 10, 3, 0, 0, TAU); g.fill();
      g.fillStyle = '#3a3a40'; g.fillRect(13, 22, 4, 34);
      g.fillStyle = '#f0e0c0'; g.strokeStyle = '#2a1a10'; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(15, 16, 9, 12, 0, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = '#c03020'; g.beginPath(); g.moveTo(8, 14); g.lineTo(22, 14); g.moveTo(8, 20); g.lineTo(22, 20); g.stroke();
    }),
    ofuda: () => spr(24, 30, (g) => {
      g.save(); g.translate(12, 15); g.rotate(0.3);
      g.fillStyle = '#e8dcb8'; g.fillRect(-5, -12, 10, 24);
      g.strokeStyle = '#a01818'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(-2, -8); g.lineTo(2, -4); g.lineTo(-2, 0); g.lineTo(2, 4); g.lineTo(-2, 8); g.stroke();
      g.restore();
    }),
    gate: () => spr(110, 90, (g) => {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(55, 86, 48, 5, 0, 0, TAU); g.fill();
      g.fillStyle = '#7a1a16'; g.strokeStyle = '#1a0606'; g.lineWidth = 2;
      g.fillRect(20, 20, 9, 66); g.strokeRect(20, 20, 9, 66);
      g.fillRect(81, 20, 9, 66); g.strokeRect(81, 20, 9, 66);
      g.beginPath(); g.moveTo(4, 12); g.quadraticCurveTo(55, 4, 106, 12); g.lineTo(104, 20); g.quadraticCurveTo(55, 12, 6, 20); g.closePath(); g.fill(); g.stroke();
      g.fillRect(14, 28, 82, 6); g.strokeRect(14, 28, 82, 6);
      g.fillStyle = '#120808'; g.fillRect(4, 8, 102, 3);
    }),
    car: () => spr(110, 64, (g) => {
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(55, 56, 50, 8, 0, 0, TAU); g.fill();
      g.save(); g.translate(55, 34); g.rotate(0.08);
      g.fillStyle = '#2a3346'; g.strokeStyle = '#06080c'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-50, 8); g.lineTo(-46, -6); g.lineTo(-22, -10); g.lineTo(-12, -24); g.lineTo(20, -24); g.lineTo(32, -10); g.lineTo(50, -6); g.lineTo(50, 12); g.lineTo(-50, 14); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#5a7090'; g.beginPath(); g.moveTo(-9, -21); g.lineTo(3, -21); g.lineTo(3, -11); g.lineTo(-16, -11); g.closePath(); g.fill();
      g.fillStyle = '#121620'; g.beginPath(); g.moveTo(7, -21); g.lineTo(18, -21); g.lineTo(27, -11); g.lineTo(7, -11); g.closePath(); g.fill();
      g.strokeStyle = '#8aa'; g.lineWidth = 1; g.beginPath(); g.moveTo(8, -20); g.lineTo(20, -12); g.moveTo(14, -21); g.lineTo(10, -12); g.stroke();
      g.fillStyle = '#0a0a0a'; g.beginPath(); g.arc(-30, 13, 8, 0, TAU); g.arc(30, 13, 8, 0, TAU); g.fill();
      g.fillStyle = '#ffcf6a'; g.fillRect(44, -4, 6, 4);
      g.restore();
    }),
    lamp: () => spr(40, 110, (g) => {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(14, 106, 9, 3, 0, 0, TAU); g.fill();
      g.fillStyle = '#2a2d36'; g.fillRect(12, 14, 4, 92);
      g.fillRect(12, 12, 22, 3);
      g.fillStyle = '#d8f0ff'; g.fillRect(28, 14, 8, 4);
    }),
    cone: () => spr(20, 26, (g) => {
      g.fillStyle = '#ff6a1a'; g.strokeStyle = '#2a0a00'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(10, 2); g.lineTo(17, 22); g.lineTo(3, 22); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.fillRect(6, 12, 8, 3);
      g.fillStyle = '#222'; g.fillRect(1, 22, 18, 3);
    }),
    rubble: () => spr(60, 40, (g) => {
      const rng = U.mulberry32(5);
      for (let i = 0; i < 9; i++) {
        const x = 8 + rng() * 44, y = 12 + rng() * 22, r = 4 + rng() * 8;
        g.fillStyle = 'hsl(220,8%,' + (18 + rng() * 14) + '%)'; g.strokeStyle = '#06070a'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(x - r, y); g.lineTo(x - r * 0.3, y - r * 0.9); g.lineTo(x + r, y - r * 0.4); g.lineTo(x + r * 0.7, y + r * 0.6); g.closePath(); g.fill(); g.stroke();
      }
    }),
    neon: () => spr(70, 40, (g) => {
      g.save(); g.translate(35, 22); g.rotate(-0.25);
      g.fillStyle = '#0c0c14'; g.fillRect(-32, -14, 64, 26);
      g.strokeStyle = '#ff3ab0'; g.lineWidth = 2.5; g.strokeRect(-28, -10, 56, 18);
      g.strokeStyle = '#3ae0ff'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-20, -2); g.lineTo(-12, -6); g.lineTo(-4, 2); g.lineTo(6, -6); g.lineTo(18, 2); g.stroke();
      g.restore();
    }),
    pillar: () => spr(50, 120, (g) => {
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(25, 114, 24, 6, 0, 0, TAU); g.fill();
      const gr = g.createLinearGradient(8, 0, 42, 0);
      gr.addColorStop(0, '#2a3434'); gr.addColorStop(0.5, '#4a5656'); gr.addColorStop(1, '#1a2222');
      g.fillStyle = gr; g.strokeStyle = '#060a0a'; g.lineWidth = 2;
      g.fillRect(9, 6, 32, 108); g.strokeRect(9, 6, 32, 108);
      g.fillStyle = '#c8a828'; g.fillRect(9, 60, 32, 8);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(30, 6, 11, 108);
    }),
    bench: () => spr(80, 36, (g) => {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(40, 32, 36, 4, 0, 0, TAU); g.fill();
      g.fillStyle = '#5a6a7a'; g.strokeStyle = '#0a0c10'; g.lineWidth = 1.5;
      g.fillRect(4, 10, 72, 8); g.strokeRect(4, 10, 72, 8);
      g.fillStyle = '#2a2e36'; g.fillRect(10, 18, 4, 12); g.fillRect(66, 18, 4, 12);
    }),
    vending: () => spr(44, 80, (g) => {
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(22, 76, 20, 4, 0, 0, TAU); g.fill();
      g.fillStyle = '#b02030'; g.strokeStyle = '#100406'; g.lineWidth = 2;
      g.fillRect(4, 4, 36, 72); g.strokeRect(4, 4, 36, 72);
      g.fillStyle = '#d8f4ff'; g.fillRect(8, 8, 28, 36);
      for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { g.fillStyle = ['#ff5a3a', '#3a9aff', '#ffd23a', '#5aff7a'][(r + k) % 4]; g.fillRect(10 + k * 7, 11 + r * 11, 4, 8); }
      g.fillStyle = '#100406'; g.fillRect(10, 54, 24, 8);
    }),
    rail: () => spr(160, 40, (g) => {
      g.fillStyle = '#2a1e16'; for (let x = 4; x < 160; x += 16) g.fillRect(x, 6, 8, 28);
      g.fillStyle = '#7a8088'; g.fillRect(0, 10, 160, 4); g.fillRect(0, 26, 160, 4);
    }),
    crystal: () => spr(40, 70, (g) => {
      const gr = g.createLinearGradient(0, 0, 40, 70);
      gr.addColorStop(0, '#f0c0ff'); gr.addColorStop(1, '#5a1aa8');
      g.fillStyle = gr; g.strokeStyle = '#1a0630'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(20, 2); g.lineTo(32, 26); g.lineTo(24, 60); g.lineTo(14, 60); g.lineTo(8, 26); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(20, 4); g.lineTo(18, 58); g.stroke();
    }),
    cube: () => spr(40, 40, (g) => {
      g.strokeStyle = '#d07aff'; g.lineWidth = 1.5;
      g.strokeRect(8, 12, 18, 18); g.strokeRect(14, 6, 18, 18);
      g.beginPath(); g.moveTo(8, 12); g.lineTo(14, 6); g.moveTo(26, 12); g.lineTo(32, 6); g.moveTo(26, 30); g.lineTo(32, 24); g.moveTo(8, 30); g.lineTo(14, 24); g.stroke();
    }),
    eyeglyph: () => spr(80, 50, (g) => {
      g.strokeStyle = 'rgba(255,90,210,0.6)'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(40, 25, 34, 18, 0, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(6, 25); g.quadraticCurveTo(40, 0, 74, 25); g.quadraticCurveTo(40, 50, 6, 25); g.stroke();
      g.fillStyle = 'rgba(255,90,210,0.5)'; g.beginPath(); g.arc(40, 25, 8, 0, TAU); g.fill();
    }),
  };
  const decorCache = {};
  function decor(kind) { return decorCache[kind] || (decorCache[kind] = DECOR[kind]()); }

  const LOCS = [
    {
      id: 'school', name: 'ABANDONED SCHOOL', ru: 'Заброшенная школа магов', tier: 1,
      desc: 'Полуразрушенный кампус магов. Ночь, скрип половиц, бумажные талисманы потеряли силу.',
      tile: tileSchool, bg: '#0b0a12', accent: '#8a6aff', fog: '#1a1036', ambient: 'motes', ambColor: '#9a7aff',
      decor: [['desk', 26], ['lantern', 16, '#ffaa4a'], ['ofuda', 30], ['gate', 6]],
      pool: [['larva', 0, 12], ['eyebat', 40, 5], ['bloater', 90, 3], ['hound', 150, 3], ['golem', 200, 3], ['twinface', 300, 2], ['warden', 420, 1.5], ['brute', 540, 1]],
      events: ['horde', 'bell', 'elite'], mid: 'colossus', boss: 'headmaster', unlockText: 'Доступна сразу',
    },
    {
      id: 'city', name: 'CURSED CITY', ru: 'Проклятый ночной город', tier: 2,
      desc: 'Разрушенный мегаполис, где неон отражается в лужах проклятой энергии.',
      tile: tileCity, bg: '#0a0c14', accent: '#ff3ab0', fog: '#0a1a2a', ambient: 'rain', ambColor: '#8ac8ff',
      decor: [['car', 14], ['lamp', 18, '#c8ecff'], ['cone', 22], ['rubble', 24], ['neon', 10, '#ff3ab0']],
      pool: [['larva', 0, 10], ['spitter', 30, 4], ['hound', 60, 4], ['bloater', 100, 3], ['eyebat', 140, 3], ['warden', 220, 2], ['brute', 360, 1.5], ['twinface', 420, 2]],
      events: ['horde', 'blackout', 'elite'], mid: 'headmaster', boss: 'maw', unlockText: 'Победите босса Заброшенной школы',
    },
    {
      id: 'station', name: 'UNDERGROUND STATION', ru: 'Тёмная станция метро', tier: 3,
      desc: 'Последний поезд так и не ушёл. Под землёй проклятия чувствуют себя как дома.',
      tile: tileStation, bg: '#060a0a', accent: '#3affc8', fog: '#06201a', ambient: 'dust', ambColor: '#bfe8d8',
      decor: [['pillar', 22], ['bench', 16], ['vending', 8, '#9ae8ff'], ['rail', 12], ['rubble', 14]],
      pool: [['larva', 0, 9], ['flicker', 30, 4], ['golem', 60, 3], ['spitter', 90, 3], ['cradle', 150, 2], ['warden', 200, 2.5], ['twinface', 260, 2], ['hound', 320, 3], ['brute', 400, 1.5]],
      events: ['horde', 'train', 'elite'], mid: 'maw', boss: 'train', unlockText: 'Победите босса Проклятого города',
    },
    {
      id: 'dimension', name: 'FORBIDDEN DIMENSION', ru: 'Запретное измерение', tier: 4,
      desc: 'Пространство здесь сломано. Геометрия дышит, а взгляд тысячи глаз давит на разум.',
      tile: tileDimension, bg: '#07040e', accent: '#d07aff', fog: '#240a3a', ambient: 'cubes', ambColor: '#e0a0ff',
      decor: [['crystal', 24, '#d07aff'], ['cube', 30], ['eyeglyph', 14], ['gate', 4]],
      pool: [['larva', 0, 8], ['eyebat', 0, 4], ['flicker', 40, 4], ['cradle', 80, 3], ['bloater', 100, 3], ['warden', 150, 2.5], ['spitter', 180, 3], ['twinface', 220, 2], ['brute', 280, 2], ['golem', 300, 2]],
      events: ['horde', 'gravity', 'blackout', 'elite'], mid: 'train', boss: 'seraph', unlockText: 'Победите босса Станции метро',
    },
  ];

  // ---------- runtime ----------
  const L = {
    WORLD, LOCS,
    get(id) { return LOCS.find((l) => l.id === id) || LOCS[0]; },
    cur: null, pattern: null, decorList: [], amb: [],

    build(loc, ctx) {
      this.cur = loc;
      const tile = loc._tile || (loc._tile = loc.tile());
      this.pattern = ctx.createPattern(tile, 'repeat');
      const rng = U.mulberry32(U.hashStr(loc.id) + 7);
      this.decorList = [];
      for (const [kind, n, glow] of loc.decor) {
        for (let i = 0; i < n; i++) {
          const x = 120 + rng() * (WORLD - 240), y = 120 + rng() * (WORLD - 240);
          if (Math.hypot(x - WORLD / 2, y - WORLD / 2) < 160) continue;
          this.decorList.push({ kind, x, y, glow: glow || null, ph: rng() * 10 });
        }
      }
      this.decorList.sort((a, b) => a.y - b.y);
      this.amb = [];
    },
    drawGround(ctx, view, t) {
      const loc = this.cur;
      ctx.fillStyle = loc.bg;
      ctx.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0);
      // tiled ground (pattern in world space)
      ctx.fillStyle = this.pattern;
      const x0 = Math.max(0, view.x0), y0 = Math.max(0, view.y0), x1 = Math.min(WORLD, view.x1), y1 = Math.min(WORLD, view.y1);
      if (x1 > x0 && y1 > y0) ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      // decor
      for (const d of this.decorList) {
        if (d.x < view.x0 - 120 || d.x > view.x1 + 120 || d.y < view.y0 - 120 || d.y > view.y1 + 120) continue;
        const s = decor(d.kind);
        ctx.drawImage(s.c, d.x - s.w / 2, d.y - s.h, s.w, s.h);
        if (d.glow) {
          const fl = loc.id === 'station' ? (Math.sin(t * 13 + d.ph) > 0.92 ? 0.2 : 1) : 1;
          CA.FX.glow(ctx, d.x + (d.kind === 'lamp' ? 12 : 0), d.y - s.h * 0.78, 46, d.glow, 0.35 * fl);
          if (d.kind === 'lamp') CA.FX.glow(ctx, d.x + 12, d.y - 4, 60, d.glow, 0.12 * fl);
        }
      }
      // the Veil (arena border barrier)
      const pulse = 0.5 + Math.sin(t * 2) * 0.2;
      ctx.strokeStyle = U.hexA(loc.accent, 0.25 * pulse + 0.15); ctx.lineWidth = 26;
      ctx.strokeRect(-13, -13, WORLD + 26, WORLD + 26);
      ctx.strokeStyle = U.hexA(loc.accent, 0.8); ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, WORLD, WORLD);
      ctx.fillStyle = '#020104';
      if (view.x0 < -26) ctx.fillRect(view.x0, view.y0, -26 - view.x0, view.y1 - view.y0);
      if (view.y0 < -26) ctx.fillRect(view.x0, view.y0, view.x1 - view.x0, -26 - view.y0);
      if (view.x1 > WORLD + 26) ctx.fillRect(WORLD + 26, view.y0, view.x1 - WORLD - 26, view.y1 - view.y0);
      if (view.y1 > WORLD + 26) ctx.fillRect(view.x0, WORLD + 26, view.x1 - view.x0, view.y1 - WORLD - 26);
    },
    // drifting ground mist patches (world-anchored, location tinted)
    drawFog(ctx, view, t) {
      const loc = this.cur, soft = CA.FX.getSoft(loc.fog), glow = CA.FX.getSoft(loc.accent);
      const S = 520, ox = Math.floor(view.x0 / S) - 1, oy = Math.floor(view.y0 / S) - 1;
      ctx.globalCompositeOperation = 'lighter';
      for (let gx = ox; gx <= ox + Math.ceil((view.x1 - view.x0) / S) + 2; gx++) {
        for (let gy = oy; gy <= oy + Math.ceil((view.y1 - view.y0) / S) + 2; gy++) {
          const h = ((gx * 73856093) ^ (gy * 19349663)) >>> 0;
          const x = gx * S + (h % 300) + Math.sin(t * 0.15 + h) * 60, y = gy * S + ((h >> 8) % 300) + Math.cos(t * 0.12 + h) * 40;
          const r = 220 + (h % 160);
          ctx.globalAlpha = 0.5;
          ctx.drawImage(soft, x - r, y - r * 0.6, r * 2, r * 1.2);
          if (h % 3 === 0) { ctx.globalAlpha = 0.07 + Math.sin(t * 0.8 + h) * 0.03; ctx.drawImage(glow, x - r * 0.6, y - r * 0.35, r * 1.2, r * 0.7); }
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    },
    updateAmbient(dt, view) {
      const loc = this.cur, A = this.amb;
      const target = Math.round((loc.ambient === 'rain' ? 70 : 34) * CA.FX.mult);
      while (A.length < target) {
        A.push({ x: U.rand(view.x0, view.x1), y: U.rand(view.y0, view.y1), v: U.rand(0.5, 1), ph: Math.random() * 10, life: U.rand(2, 6) });
      }
      for (const a of A) {
        a.life -= dt; a.ph += dt;
        if (loc.ambient === 'rain') { a.x -= 120 * dt * a.v; a.y += 700 * dt * a.v; }
        else if (loc.ambient === 'cubes') { a.y -= 30 * dt * a.v; a.x += Math.sin(a.ph) * 10 * dt; }
        else { a.y -= 12 * dt * a.v; a.x += Math.sin(a.ph * 0.7) * 14 * dt; }
        if (a.life <= 0 || a.x < view.x0 - 40 || a.x > view.x1 + 40 || a.y < view.y0 - 40 || a.y > view.y1 + 40) {
          a.x = U.rand(view.x0, view.x1); a.y = loc.ambient === 'rain' ? view.y0 - 20 : U.rand(view.y0, view.y1); a.life = U.rand(2, 6);
        }
      }
    },
    drawAmbient(ctx) {
      const loc = this.cur;
      const col = loc.ambColor;
      if (loc.ambient === 'rain') {
        ctx.strokeStyle = U.hexA(col, 0.25); ctx.lineWidth = 1;
        ctx.beginPath();
        for (const a of this.amb) { ctx.moveTo(a.x, a.y); ctx.lineTo(a.x - 4, a.y + 18); }
        ctx.stroke();
      } else if (loc.ambient === 'cubes') {
        ctx.strokeStyle = U.hexA(col, 0.4); ctx.lineWidth = 1;
        for (const a of this.amb) {
          const s = 3 + a.v * 4;
          ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.ph); ctx.strokeRect(-s / 2, -s / 2, s, s); ctx.restore();
        }
      } else {
        ctx.globalCompositeOperation = 'lighter';
        const g = CA.FX.getGlow(col);
        for (const a of this.amb) {
          ctx.globalAlpha = 0.25 + 0.25 * Math.sin(a.ph * 2);
          ctx.drawImage(g, a.x - 4, a.y - 4, 8, 8);
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    },
  };
  CA.Locations = L;
})();
