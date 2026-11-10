// Motivational motion piece — monochrome, glow, minimal diagrams
const W = 1920, H = 1080, FPS = 30;
const cv = document.getElementById('c');
cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');

// ---------- utils ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lin = (t, a, b) => clamp((t - a) / (b - a));
const eOut = x => 1 - Math.pow(1 - x, 3);
const eIn = x => x * x * x;
const eIO = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const mix = (a, b, x) => a + (b - a) * x;
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const wt = (seg, i) => TL[seg].words[i].t0;          // word start
const wte = (seg, i) => TL[seg].words[i].t1;         // word end
function fade(t, t0, t1, fi = .45, fo = .45) { return Math.min(eOut(lin(t, t0, t0 + fi)), 1 - eIn(lin(t, t1 - fo, t1))); }
function A(a, fn) { const g = ctx.globalAlpha; ctx.globalAlpha = g * clamp(a); if (a > 0.001) fn(); ctx.globalAlpha = g; }
const env = t => ENV[clamp(Math.floor(t * FPS), 0, ENV.length - 1)];
const onset = t => ONSET[clamp(Math.floor(t * FPS), 0, ONSET.length - 1)];
function pulse(t, decay = 6) { // smoothed onset with decay
  let v = 0; for (let k = 0; k < 12; k++) { const tt = t - k / FPS; if (tt < 0) break; v = Math.max(v, onset(tt) * Math.exp(-decay * k / FPS)); } return v;
}
const DROP = 19.5;

// ---------- drawing primitives ----------
const FONT = 'Inter, "Inter Display", sans-serif';
function txt(s, x, y, size, o = {}) {
  ctx.save();
  ctx.font = `${o.w || 800} ${size}px ${FONT}`;
  ctx.letterSpacing = (o.ls != null ? o.ls : size * 0.08) + 'px';
  ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = o.color || '#f2f2f2';
  const glow = o.glow != null ? o.glow : 1;
  if (glow > 0) {
    ctx.shadowColor = 'rgba(255,255,255,0.55)';
    ctx.shadowBlur = size * 0.6 * glow; ctx.fillText(s, x, y);
    ctx.shadowBlur = size * 0.18 * glow; ctx.fillText(s, x, y);
  }
  ctx.shadowBlur = 0; ctx.fillText(s, x, y);
  ctx.restore();
}
function measure(s, size, o = {}) { ctx.save(); ctx.font = `${o.w || 800} ${size}px ${FONT}`; ctx.letterSpacing = (o.ls != null ? o.ls : size * 0.08) + 'px'; const m = ctx.measureText(s).width; ctx.restore(); return m; }
function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function pill(s, x, y, size = 20) {
  const w = measure(s, size, { w: 800, ls: size * .22 }) + size * 1.6, h = size * 1.75;
  ctx.save(); ctx.shadowColor = 'rgba(255,255,255,.45)'; ctx.shadowBlur = 24;
  ctx.fillStyle = '#ececec'; rrect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill(); ctx.restore();
  txt(s, x + size * .11, y + 1, size, { w: 800, ls: size * .22, color: '#0b0b0b', glow: 0 });
}
function glowStroke(width = 3, blur = 16) { ctx.lineWidth = width; ctx.strokeStyle = '#eaeaea'; ctx.shadowColor = 'rgba(255,255,255,.6)'; ctx.shadowBlur = blur; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; }
function polyline(pts, prog = 1, width = 3, blur = 14) {
  // draws first `prog` fraction of the polyline length
  let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  let left = L * clamp(prog); if (left <= 0) return null;
  ctx.save(); glowStroke(width, blur); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  let end = pts[0];
  for (let i = 1; i < pts.length; i++) {
    if (left >= seg[i - 1]) { ctx.lineTo(pts[i][0], pts[i][1]); left -= seg[i - 1]; end = pts[i]; }
    else { const f = left / seg[i - 1]; end = [mix(pts[i - 1][0], pts[i][0], f), mix(pts[i - 1][1], pts[i][1], f)]; ctx.lineTo(end[0], end[1]); break; }
  }
  ctx.stroke(); ctx.restore(); return end;
}
function pointOn(pts, prog) {
  let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  let left = L * clamp(prog);
  for (let i = 1; i < pts.length; i++) { if (left <= seg[i - 1]) { const f = left / seg[i - 1]; return [mix(pts[i - 1][0], pts[i][0], f), mix(pts[i - 1][1], pts[i][1], f)]; } left -= seg[i - 1]; }
  return pts[pts.length - 1];
}
// stick figure (reference style: round head + rounded torso), anchored at feet
function figure(x, y, h, o = {}) {
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
  const bob = o.walk ? Math.abs(Math.sin(o.walk * Math.PI)) * h * .05 : 0;
  ctx.translate(0, -bob);
  ctx.fillStyle = o.color || '#f0f0f0';
  ctx.shadowColor = o.shadow || 'rgba(255,255,255,.55)'; ctx.shadowBlur = o.blur != null ? o.blur : 18;
  const bw = h * .46, bh = h * .52;
  ctx.beginPath(); ctx.moveTo(-bw / 2, 0); ctx.lineTo(-bw / 2, -bh + bw / 2); ctx.arc(0, -bh + bw / 2, bw / 2, Math.PI, 0); ctx.lineTo(bw / 2, 0); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -bh - h * .08 - h * .17, h * .17, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function cross(x, y, s, prog, width = 4) {
  const p1 = clamp(prog * 2), p2 = clamp(prog * 2 - 1);
  ctx.save(); glowStroke(width, 18);
  if (p1 > 0) { ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x - s + 2 * s * eOut(p1), y - s + 2 * s * eOut(p1)); ctx.stroke(); }
  if (p2 > 0) { ctx.beginPath(); ctx.moveTo(x + s, y - s); ctx.lineTo(x + s - 2 * s * eOut(p2), y - s + 2 * s * eOut(p2)); ctx.stroke(); }
  ctx.restore();
}
function check(x, y, r, prog) {
  ctx.save(); glowStroke(3, 12); ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * eOut(clamp(prog * 1.5))); ctx.stroke();
  const p = clamp(prog * 2 - 1); if (p > 0) polyline([[x - r * .45, y + r * .02], [x - r * .1, y + r * .35], [x + r * .5, y - r * .35]], eOut(p), 3, 12);
  ctx.restore();
}
function card(x, y, w, h, label, head, o = {}) {
  ctx.save(); glowStroke(2.5, 14); ctx.strokeStyle = o.dim ? '#777' : '#e6e6e6';
  rrect(x - w / 2, y - h / 2, w, h, 14); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - w / 2, y - h / 2 + 36); ctx.lineTo(x + w / 2, y - h / 2 + 36); ctx.stroke(); ctx.restore();
  txt(head, x, y - h / 2 + 19, 13, { w: 700, ls: 4, color: '#8a8a8a', glow: 0 });
  txt(label, x, y + 18, 30, { w: 800, ls: 5, color: o.dim ? '#6a6a6a' : '#f0f0f0', glow: o.dim ? 0 : .7 });
}

// ---------- background layers ----------
const grain = [];
for (let k = 0; k < 8; k++) {
  const g = document.createElement('canvas'); g.width = 640; g.height = 360; const gx = g.getContext('2d');
  const id = gx.createImageData(640, 360); const r = rng(77 + k);
  for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r() - .5) * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  gx.putImageData(id, 0, 0); grain.push(g);
}
const dust = (() => { const r = rng(5); return Array.from({ length: 140 }, () => ({ x: r() * W, y: r() * H, z: .3 + r() * 1.2, s: r() * 6.28, sp: .2 + r() * .8 })); })();
function background(t) {
  const p = t > DROP ? pulse(t) : 0;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H * .45, 0, W / 2, H * .45, W * .62);
  const c = Math.round(22 + 10 * p + (t > DROP ? 5 : 0));
  g.addColorStop(0, `rgb(${c},${c},${c})`); g.addColorStop(.55, 'rgb(8,8,8)'); g.addColorStop(1, '#000');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // diagonal light streaks after drop (inspired by the music visual)
  if (t > DROP - .1) {
    const a = clamp((t - DROP) * 2) * (0.05 + 0.10 * p) * (1 - lin(t, 56, 59.5));
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    const r = rng(9);
    for (let i = 0; i < 26; i++) {
      const off = ((r() * 3000 + t * (300 + r() * 500)) % 3200) - 600, len = 200 + r() * 600;
      ctx.globalAlpha = a * (.3 + r() * .7);
      ctx.beginPath(); ctx.moveTo(off, -50 + r() * 200); ctx.lineTo(off + len * .7, -50 + r() * 200 + len * .7 * 1.0);
      const y0 = r() * H; ctx.moveTo(off - 900, y0); ctx.lineTo(off - 900 + len, y0 + len); ctx.stroke();
    }
    ctx.restore();
  }
  // dust
  ctx.save();
  for (const d of dust) {
    const x = (d.x + Math.sin(t * .3 * d.sp + d.s) * 40 + t * 6 * d.z) % W, y = (d.y - t * 12 * d.z + H * 10) % H;
    ctx.globalAlpha = (.08 + .22 * d.z / 1.5) * (0.6 + 0.4 * Math.sin(t * d.sp + d.s)) * (1 + p);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, d.z * 1.4, 0, 6.28); ctx.fill();
  }
  ctx.restore();
}
function post(t) {
  // vignette
  const v = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .72);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.85)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  // grain
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .16;
  ctx.drawImage(grain[Math.floor(t * 24) % grain.length], 0, 0, W, H); ctx.restore();
  // flashes
  let f = 0;
  f = Math.max(f, .32 * Math.exp(-(t - DROP) * 7) * (t >= DROP ? 1 : 0));
  f = Math.max(f, .25 * Math.exp(-(t - wt('I', 1)) * 7) * (t >= wt('I', 1) ? 1 : 0));
  f = Math.max(f, .3 * Math.exp(-(t - 49.2) * 3) * (t >= 49.2 ? 1 : 0));
  if (f > .002) { ctx.fillStyle = `rgba(235,235,235,${f})`; ctx.fillRect(0, 0, W, H); }
  // fade in / out
  const black = Math.max(1 - lin(t, 0, 1.2), lin(t, 58.2, 59.9), dip(t));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, W, H); }
}
function dip(t) { return t > 19.25 && t < DROP ? eIn(lin(t, 19.25, 19.48)) : 0; } // cut to black just before the drop

// ---------- caption (spoken line, word-by-word) ----------
const FIX = { 'ПОЙМЕШЬ,': 'ПОЙМЁШЬ,', 'ВСЕ': 'ВСЁ' };
function caption(t) {
  for (const id in TL) {
    const s = TL[id]; const a = fade(t, s.t0 - .25, s.t1 + .7, .25, .45);
    if (a <= 0) continue;
    const words = s.words.map(w => w.w.toUpperCase().replace('ПОЙМЕШЬ', 'ПОЙМЁШЬ').replace(/^ВСЕ$/, 'ВСЁ'));
    const size = 30, gap = 18, ls = 6;
    const ws = words.map(w => measure(w, size, { w: 700, ls }));
    let x = W / 2 - (ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1)) / 2;
    A(a, () => {
      words.forEach((w, i) => {
        const k = eOut(lin(t, s.words[i].t0 - .06, s.words[i].t0 + .18));
        const active = t >= s.words[i].t0 - .05 && t <= s.words[i].t1 + .1;
        A(.12 + .88 * k, () => txt(w, x + ws[i] / 2, 968 + (1 - k) * 14, size, { w: 700, ls, color: active ? '#ffffff' : '#a9a9a9', glow: active ? .8 : 0 }));
        x += ws[i] + gap;
      });
    });
  }
}

// ---------- scenes ----------
function sceneChoice(t) {           // 0.8 – 4.9
  const a = fade(t, .8, 4.9, .6, .5); if (a <= 0) return;
  A(a, () => {
    const gy = 650, fx = 960;
    A(fade(t, 1.0, 9, .5, .1), () => pill('ВЫБОР', W / 2, 250));
    const draw = eOut(lin(t, .9, 2.0));
    polyline([[340, gy], [fx, gy]], draw);
    const st = []; let x = fx, y = gy; st.push([x, y]); for (let i = 0; i < 5; i++) { y -= 56; st.push([x, y]); x += 84; st.push([x, y]); }
    const weakT = wt('A', 1);
    A(1 - .72 * eOut(lin(t, weakT + .2, weakT + .9)), () => { polyline(st, eOut(lin(t, 1.4, 2.4))); A(lin(t, 2.0, 2.4), () => txt('СИЛА', x - 42, y - 44, 22, { w: 800, ls: 7, glow: .6 })); });
    polyline([[fx, gy], [1580, gy]], eOut(lin(t, 1.4, 2.4)));
    A(lin(t, weakT, weakT + .4), () => txt('СЛАБОСТЬ', 1300, gy + 42, 22, { w: 800, ls: 7, glow: .9 }));
    // figure walks to fork, hesitates, then takes the flat road
    let px = mix(420, fx - 30, eIO(lin(t, 1.0, 2.1)));
    px = mix(px, 1280, eIO(lin(t, weakT + .3, 4.6)));
    const walking = (t > 1 && t < 2.1) || t > weakT + .3;
    figure(px, gy, 74, { walk: walking ? t * 2.4 : 0 });
    A(lin(t, wt('A', 2), wt('A', 2) + .4), () => txt('ОДНАЖДЫ', W / 2 - 330, 430, 56, { w: 800, ls: 18, glow: 1 }));
  });
}
function sceneDreams(t) {          // 4.7 – 9.3
  const a = fade(t, 4.6, 9.4, .45, .5); if (a <= 0) return;
  const labels = ['ЦЕЛЬ', 'СВОБОДА', 'СЕМЬЯ', 'УВАЖЕНИЕ', 'ДОМ', 'СИЛА', 'МЕЧТА'];
  const tDie = wt('B', 6);
  A(a, () => {
    pill('ТВОИ МЕЧТЫ', W / 2, 250);
    labels.forEach((L, i) => {
      const x = 600 + i * 120, appear = 4.9 + i * .18;
      const die = tDie - .25 + i * .12;
      const k = eBack(lin(t, appear, appear + .5)), dd = lin(t, die, die + 1.4);
      const y = 470 + Math.sin(t * 1.3 + i) * 6 + eIn(dd) * 380;
      const bright = (1 - lin(t, die, die + .25)) * (0.85 + .15 * Math.sin(t * 5 + i));
      A(k * (1 - eIn(dd)), () => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(eIn(dd) * (i % 2 ? 1.2 : -1.2));
        ctx.shadowColor = 'rgba(255,255,255,.8)'; ctx.shadowBlur = 30 * bright;
        ctx.fillStyle = `rgba(240,240,240,${.18 + .82 * bright})`;
        ctx.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? 9 : 22, an = -Math.PI / 2 + j * Math.PI / 5; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ctx.closePath(); ctx.fill();
        ctx.restore();
        A(1 - lin(t, die, die + .4), () => txt(L, x, 525, 13, { w: 700, ls: 3, color: '#9a9a9a', glow: 0 }));
      });
    });
    const kd = eOut(lin(t, tDie, tDie + .5));
    A(kd, () => txt('ПОГИБЛИ', W / 2, 640 + (1 - kd) * 20, 120, { w: 800, ls: 26, glow: 1.1 }));
  });
}
function sceneCards(t) {          // 9.3 – 16.0
  const a = fade(t, 9.2, 16.0, .45, .45); if (a <= 0) return;
  A(a, () => {
    pill('ТВОЙ ВЫБОР', W / 2, 250);
    const kL = eOut(lin(t, 9.5, 10.1)), kR = eOut(lin(t, wt('D', 0) - .2, wt('D', 0) + .4));
    const slide = eIO(lin(t, wt('D', 0) - .3, wt('D', 0) + .4));
    const lx = mix(W / 2, W / 2 - 230, slide), rx = W / 2 + 230;
    const xT = wt('D', 4);
    A(kL, () => {
      card(lx, 500 + (1 - kL) * 30, 380, 210, 'БЫТЬ СЛАБЫМ', 'ВЫБОР № 1');
      check(lx, 680, 24, lin(t, wt('C', 6), wt('C', 6) + .6));
    });
    A(kR, () => {
      card(rx, 500 + (1 - kR) * 30, 380, 210, 'СТАТЬ СИЛЬНЕЕ', 'ВЫБОР № 2', { dim: t > xT + .3 });
      cross(rx, 518, 80, lin(t, xT, xT + .5), 5);
    });
    A(lin(t, wt('C', 4), wt('C', 4) + .4) * (1 - kR), () => txt('ТЫ ВЫБРАЛ', W / 2, 720, 26, { w: 700, ls: 10, color: '#bbb', glow: .3 }));
  });
}
function sceneBlame(t) {         // 16.0 – 19.45
  const a = fade(t, 15.9, 19.5, .5, .05); if (a <= 0) return;
  const gy = 690;
  A(a, () => {
    const zoom = 1 + .18 * eIn(lin(t, 17.5, 19.45));
    ctx.save(); ctx.translate(W / 2, gy - 60); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -(gy - 60));
    // spotlight
    const sp = eOut(lin(t, 16.1, 16.8));
    ctx.save(); ctx.globalAlpha *= .14 * sp;
    const lg = ctx.createLinearGradient(0, 0, 0, gy); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(W / 2 - 40, 0); ctx.lineTo(W / 2 + 40, 0); ctx.lineTo(W / 2 + 190, gy); ctx.lineTo(W / 2 - 190, gy); ctx.closePath(); ctx.fill(); ctx.restore();
    A(.4 * sp, () => { ctx.save(); ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.ellipse(W / 2, gy, 190, 16, 0, 0, 6.28); ctx.fill(); ctx.restore(); });
    polyline([[460, gy], [1460, gy]], eOut(lin(t, 16.0, 16.8)), 2);
    // others vanish on «некого»
    const gone = lin(t, wt('E', 2), wt('E', 2) + .6);
    [-420, -280, 280, 420].forEach((dx, i) => A((1 - gone) * eOut(lin(t, 16.1 + i * .08, 16.6 + i * .08)) * .55, () => figure(W / 2 + dx + Math.sign(dx) * gone * 80, gy, 60, { color: '#777', blur: 0 })));
    figure(W / 2, gy, 78);
    A(lin(t, wt('E', 0), wt('E', 0) + .4) * (1 - lin(t, wt('F', 0) - .2, wt('F', 0) + .2)), () => txt('НЕКОГО ВИНИТЬ', W / 2, 330, 64, { w: 800, ls: 16 }));
    // arrows converge on «кроме себя самого»
    const conv = eOut(lin(t, wt('F', 0), wt('F', 1) + .3));
    [[-1, 0], [1, 0], [-.7, -.7], [.7, -.7]].forEach(([dx, dy], i) => {
      const r0 = 420 - 210 * conv, cx = W / 2, cy = gy - 50;
      const x1 = cx + dx * r0, y1 = cy + dy * r0, x2 = cx + dx * (r0 - 90), y2 = cy + dy * (r0 - 90);
      A(conv, () => { polyline([[x1, y1], [x2, y2]], 1, 3); const an = Math.atan2(y2 - y1, x2 - x1); polyline([[x2 - 18 * Math.cos(an - .5), y2 - 18 * Math.sin(an - .5)], [x2, y2], [x2 - 18 * Math.cos(an + .5), y2 - 18 * Math.sin(an + .5)]], 1, 3); });
    });
    const ks = eOut(lin(t, wt('F', 1), wt('F', 1) + .35));
    A(ks, () => txt('КРОМЕ СЕБЯ', W / 2, 330 + (1 - ks) * 16, 84, { w: 800, ls: 20, glow: 1.2 }));
    ctx.restore();
  });
}
function sceneFeeling(t) {        // 19.5 – 26.4
  const a = fade(t, DROP, 26.5, .05, .5); if (a <= 0) return;
  A(a, () => {
    // «ЭТО ЧУВСТВО»
    const k1 = eOut(lin(t, wt('G', 1) - .1, wt('G', 1) + .35)), out1 = lin(t, wt('G', 3) - .25, wt('G', 3) + .1);
    A(k1 * (1 - out1), () => {
      const s = 1.25 - .25 * k1 + .03 * pulse(t);
      ctx.save(); ctx.translate(W / 2, 470); ctx.scale(s, s);
      txt('ЭТО', 0, -110, 34, { w: 700, ls: 16, color: '#bbb', glow: .4 });
      txt('ЧУВСТВО', 0, 0, 160, { w: 800, ls: 30, glow: 1.3 * (lin(t, wt('G', 2), wt('G', 2) + .2)) + .3 });
      ctx.restore();
    });
    // follower shadow
    const k2 = fade(t, wt('G', 3) - .1, 23.3, .4, .4);
    A(k2, () => {
      const gy = 690; polyline([[300, gy], [1620, gy]], 1, 2);
      const px = mix(760, 1240, lin(t, wt('G', 3), 23.3));
      const lag = .55 + .1 * Math.sin(t * 2);
      for (let k = 5; k >= 0; k--) A(.08 + .05 * (5 - k), () => figure(px - 240 - k * 26 + Math.sin(t * 3 + k) * 4, gy, 130 + k * 4, { color: '#2a2a2a', shadow: 'rgba(0,0,0,0)', blur: 0, walk: t * 2 - lag }));
      figure(px - 240, gy, 130, { color: '#3a3a3a', shadow: 'rgba(255,255,255,.15)', blur: 40, walk: t * 2 - lag });
      figure(px, gy, 78, { walk: t * 2.2 });
      const kp = eOut(lin(t, wt('G', 4), wt('G', 4) + .4));
      A(kp, () => txt('ПРЕСЛЕДОВАТЬ', W / 2, 330, 92, { w: 800, ls: 22, glow: 1 }));
      A(lin(t, wt('G', 5), wt('G', 5) + .3), () => txt('ТЕБЯ', W / 2, 425, 30, { w: 700, ls: 14, color: '#bbb', glow: .4 }));
    });
    // life circle «до конца твоих дней»
    const k3 = fade(t, 23.1, 26.5, .45, .5);
    A(k3, () => {
      const cx = W / 2, cy = 520, R = 220;
      A(1, () => pill('ДО КОНЦА ТВОИХ ДНЕЙ', W / 2, 200));
      ctx.save(); glowStroke(2, 12); ctx.strokeStyle = '#555'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.28); ctx.stroke(); ctx.restore();
      const prog = eIO(lin(t, 23.4, 26.0));
      ctx.save(); glowStroke(3.5, 18); ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + prog * 6.283); ctx.stroke(); ctx.restore();
      const an = -Math.PI / 2 + prog * 6.283;
      ctx.save(); ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(cx + Math.cos(an) * R, cy + Math.sin(an) * R, 11, 0, 6.28); ctx.fill(); ctx.restore();
      ['20', '30', '40', '50', '60', '70', '80'].forEach((L, i) => { const b = -Math.PI / 2 + (i + .5) * 6.283 / 7; txt(L, cx + Math.cos(b) * (R + 42), cy + Math.sin(b) * (R + 42), 16, { w: 700, ls: 3, color: prog * 7 > i + .5 ? '#ddd' : '#555', glow: 0 }); });
      txt('СОЖАЛЕНИЕ', cx, cy - 6, 30, { w: 800, ls: 9, glow: .9 });
      txt('КАЖДЫЙ ДЕНЬ', cx, cy + 34, 13, { w: 700, ls: 5, color: '#888', glow: 0 });
    });
  });
}
function sceneDont(t) {           // 26.6 – 29.8
  const a = fade(t, 26.6, 29.9, .2, .5); if (a <= 0) return;
  A(a, () => {
    const z = 1 + .06 * lin(t, 27, 29.8) + .02 * pulse(t);
    ctx.save(); ctx.translate(W / 2, 480); ctx.scale(z, z);
    const w0 = wt('I', 0), w1 = wt('I', 1), w2 = wt('I', 2);
    const k0 = eOut(lin(t, w0 - .05, w0 + .2)), k1 = lin(t, w1 - .05, w1 + .22), k2 = lin(t, w2 - .05, w2 + .22);
    A(k0, () => txt('НЕ', 0, -170, 44, { w: 700, ls: 20, color: '#cfcfcf', glow: .5 }));
    A(eOut(k1), () => { const s = 1.5 - .5 * eOut(k1); ctx.save(); ctx.scale(s, s); txt('ДОПУСТИ', 0, -40, 170, { w: 900, ls: 26, glow: 1.4 }); ctx.restore(); });
    A(eOut(k2), () => { const s = 1.5 - .5 * eOut(k2); ctx.save(); ctx.scale(s, s); txt('ЭТОГО', 0, 130, 170, { w: 900, ls: 26, glow: 1.4 }); ctx.restore(); });
    ctx.restore();
  });
}
function sceneSummit(t) {        // 29.9 – 35.9
  const a = fade(t, 29.8, 35.95, .45, .45); if (a <= 0) return;
  const mt = [[360, 780], [620, 610], [720, 660], [960, 360], [1140, 560], [1240, 520], [1560, 780]];
  A(a, () => {
    const pre = [[360, 780], [620, 610], [720, 660], [960, 360]];
    polyline(mt, eIO(lin(t, 30.0, 31.6)), 3);
    const kv = eOut(lin(t, wt('J', 3), wt('J', 3) + .4));
    A(kv * (1 - lin(t, wt('K', 0) - .2, wt('K', 0) + .2)), () => txt('ВЕЛИКИМ', W / 2, 220, 110, { w: 800, ls: 26, glow: 1.1 }));
    A(lin(t, wt('J', 1), wt('J', 1) + .4) * (1 - lin(t, wt('K', 0) - .2, wt('K', 0) + .2)), () => txt('ЧЕЛОВЕК СТАНОВИТСЯ', W / 2, 135, 26, { w: 700, ls: 10, color: '#aaa', glow: .3 }));
    // climb
    const cp = eIO(lin(t, wt('K', 0), wt('K', 5) + .2));
    const [fx, fy] = pointOn(pre, cp);
    A(lin(t, 31.0, 31.5), () => figure(fx, fy, 52, { walk: cp > 0 && cp < 1 ? t * 3 : 0 }));
    // flag on the summit
    const fl = eOut(lin(t, wt('K', 5), wt('K', 5) + .4));
    A(fl, () => { polyline([[985, 360], [985, 360 - 80 * fl]], 1, 3); ctx.save(); ctx.fillStyle = '#ddd'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.moveTo(985, 280); ctx.lineTo(985 + 46 * fl, 293); ctx.lineTo(985, 306); ctx.fill(); ctx.restore(); });
    A(lin(t, wt('K', 4), wt('K', 4) + .4), () => pill('ВЕРШИНА', 960, 180));
    const xT = TL.K.t1 - .1;
    cross(960, 330, 110, lin(t, xT, xT + .45), 6);
    A(lin(t, xT + .2, xT + .6), () => txt('НЕ ТОГДА', W / 2, 880 - 40, 40, { w: 800, ls: 14, glow: .8 }));
  });
}
function sceneAbyss(t) {         // 35.9 – 42.9
  const a = fade(t, 35.9, 42.9, .4, .6); if (a <= 0) return;
  const tf0 = wt('L', 2) - .1, tLand = TL.L.t1 + .25;
  const depth = 2600;               // world height of the fall
  const fall = eIn(lin(t, tf0, tLand));
  const camY = mix(0, depth, eIO(lin(t, tf0 - .3, tLand + .1)));
  A(a, () => {
    const land = t > tLand ? Math.exp(-(t - tLand) * 6) : 0;
    ctx.save(); ctx.translate(Math.sin(t * 90) * 14 * land, -camY + Math.cos(t * 80) * 10 * land);
    // cliff walls (jagged)
    const r = rng(3); const left = [], right = [];
    for (let y = 560; y <= 560 + depth + 900; y += 90) { left.push([700 - r() * 70 - (y < 700 ? 0 : 20), y]); right.push([1220 + r() * 70 + (y < 700 ? 0 : 20), y]); }
    polyline([[200, 560], [700, 560], ...left], 1, 3); polyline([[1720, 560], [1220, 560], ...right], 1, 3);
    // bottom
    const by = 560 + depth + 120;
    polyline([[640, by], [1280, by]], 1, 3);
    // speed lines during fall
    if (t > tf0 && t < tLand + .2) {
      const sp = Math.sin(Math.PI * lin(t, tf0, tLand + .2));
      ctx.save(); ctx.globalAlpha *= .35 * sp; ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2; const rr = rng(Math.floor(t * 20));
      for (let i = 0; i < 18; i++) { const x = 780 + rr() * 360, y = camY + rr() * H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 80 + rr() * 160); ctx.stroke(); } ctx.restore();
    }
    // figure: at the edge, falls, lands, gets up
    const up = eIO(lin(t, wt('M', 2), wt('M', 4) + .5));
    let fx = mix(820, 960, eIO(lin(t, 36.1, tf0))), fy = 560 + fall * (by - 560);
    let rot = fall * 5.5;
    if (t >= tLand) { fy = by; rot = mix(Math.PI / 2, 0, up); }
    figure(fx, fy, 70, { rot, walk: t < tf0 ? t * 2.5 : 0 });
    if (t >= tLand) { // impact dust
      const d = lin(t, tLand, tLand + 1.2); const rr = rng(11);
      A(1 - d, () => { for (let i = 0; i < 26; i++) { const an = Math.PI + rr() * Math.PI, sp = 60 + rr() * 220; ctx.fillStyle = '#bbb'; ctx.beginPath(); ctx.arc(960 + Math.cos(an) * sp * eOut(d), by + Math.sin(an) * sp * .35 * eOut(d), 2 + rr() * 3, 0, 6.28); ctx.fill(); } });
      // light from above as he rises
      const lb = eOut(lin(t, wt('M', 0), wt('M', 4) + .3));
      ctx.save(); ctx.globalAlpha *= .18 * lb; const lg = ctx.createLinearGradient(0, by - 900, 0, by); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(1, '#fff'); ctx.fillStyle = lg;
      ctx.beginPath(); ctx.moveTo(930, by - 900); ctx.lineTo(990, by - 900); ctx.lineTo(1100, by); ctx.lineTo(820, by); ctx.fill(); ctx.restore();
      // strength ring
      const ring = lin(t, wt('M', 0), wt('M', 3) + .2);
      A(fade(t, wt('M', 0), 42.9, .3, .6), () => { ctx.save(); glowStroke(3, 16); ctx.beginPath(); ctx.arc(960, by - 45, 85, -Math.PI / 2, -Math.PI / 2 + 6.283 * eIO(ring)); ctx.stroke(); ctx.restore(); });
    }
    ctx.restore();
    // HUD (screen space)
    const dm = Math.round(camY / depth * 300);
    A(fade(t, tf0, 42.9, .3, .6), () => txt(`ГЛУБИНА: −${String(dm).padStart(3, '0')} М`, 1560, 200, 20, { w: 700, ls: 6, color: '#9a9a9a', glow: 0, align: 'center' }));
    A(lin(t, wt('L', 4), wt('L', 4) + .3) * (1 - lin(t, tLand + .3, tLand + .7)), () => txt('ПРОПАСТЬ', W / 2, 240, 110, { w: 800, ls: 28, glow: 1.1 }));
    A(eOut(lin(t, wt('M', 3), wt('M', 3) + .4)), () => txt('СИЛЫ', W / 2, 165, 30, { w: 700, ls: 16, color: '#bbb', glow: .4 }));
    const ku = eOut(lin(t, wt('M', 4), wt('M', 4) + .4));
    A(ku, () => txt('ПОДНЯТЬСЯ', W / 2, 290 + (1 - ku) * 24, 120, { w: 800, ls: 26, glow: 1.2 }));
  });
}
function sceneRestart(t) {      // 42.9 – 50.3
  const a = fade(t, 42.8, 50.4, .5, .6); if (a <= 0) return;
  const N = 9, sx = 420, sy = 860, dw = 120, dh = 70;
  const pts = [[sx - 140, sy]]; for (let i = 0; i < N; i++) { pts.push([sx + i * dw, sy - i * dh]); pts.push([sx + i * dw, sy - (i + 1) * dh]); } pts.push([sx + N * dw + 60, sy - N * dh]);
  A(a, () => {
    const cam = eIO(lin(t, 43.2, 49.6));
    ctx.save(); ctx.translate(-cam * 260, cam * 330);
    polyline(pts, eOut(lin(t, 42.9, 44.2)), 3);
    // climb: step index over time with stumbles marked by crosses
    const prog = lin(t, wt('N', 1), 49.4); const sf = prog * N; const si = Math.min(N - 1, Math.floor(sf)), f = sf - si;
    const fails = [1, 2, 4, 6];
    fails.forEach((s, j) => { if (sf > s + .5) A(lin(t, 0, 1) * .9, () => cross(sx + s * dw + 40, sy - (s + 1) * dh - 30, 13, clamp((sf - s - .5) * 3), 3)); });
    // position along step
    let x, y; if (prog <= 0) { x = sx - 80; y = sy; }
    else if (prog >= 1) { x = sx + N * dw + 20; y = sy - N * dh; }
    else { const hop = Math.sin(Math.PI * clamp(f * 1.6)); x = sx + si * dw + 20 + f * dw; y = sy - (si + 1) * dh - hop * 26 + (f < .35 ? (1 - f / .35) * dh * 0 : 0); if (si === 0 && f < .2) y = sy - dh * eOut(f / .2); }
    figure(x, y, 56, { walk: prog > 0 && prog < 1 ? t * 3 : 0 });
    ctx.restore();
    const kn = eOut(lin(t, wt('N', 3), wt('N', 3) + .45));
    A(kn * (1 - lin(t, 47.3, 47.8)), () => { txt('НАЧАТЬ ВСЁ', 640, 300, 32, { w: 700, ls: 14, color: '#bbb', glow: .4 }); txt('СНАЧАЛА', 640, 390, 120, { w: 800, ls: 26, glow: 1.2 }); });
    const cnt = Math.min(fails.length, fails.filter(s => sf > s + .5).length);
    A(lin(t, 44.0, 44.5), () => { txt(`ПАДЕНИЙ: ${cnt}`, 260, 160, 20, { w: 800, ls: 6, glow: .4, align: 'left' }); txt(`ПОДЪЁМОВ: ${cnt + (sf > .2 ? 1 : 0)}`, 260, 196, 20, { w: 800, ls: 6, color: '#9a9a9a', glow: 0, align: 'left' }); });
    A(lin(t, 47.6, 48.2), () => pill('ПАДАЙ. ВСТАВАЙ. ИДИ.', 640, 340, 20));
  });
}
function sceneFinale(t) {        // 49.6 – 60
  const a = fade(t, 49.6, 60, .5, .1); if (a <= 0) return;
  A(a, () => {
    const cx = W / 2, gy = 720, p = pulse(t);
    // rays
    ctx.save(); ctx.translate(cx, gy - 60); ctx.rotate(t * .04);
    const kr = eOut(lin(t, 49.6, 51.5));
    for (let i = 0; i < 36; i++) { ctx.rotate(6.283 / 36); ctx.globalAlpha = a * kr * (.035 + .03 * (i % 3 === 0) + .04 * p); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1400, -46); ctx.lineTo(1400, 46); ctx.fill(); }
    ctx.restore();
    const halo = ctx.createRadialGradient(cx, gy - 60, 0, cx, gy - 60, 380); halo.addColorStop(0, `rgba(255,255,255,${.22 * kr})`); halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
    polyline([[cx - 380 * kr, gy], [cx + 380 * kr, gy]], 1, 3);
    figure(cx, gy, 96 + 4 * p, { blur: 30 });
    const k1 = eOut(lin(t, 50.6, 51.3)), k2 = eOut(lin(t, 52.4, 53.1)), k3 = eOut(lin(t, 54.4, 55.0));
    A(k1, () => txt('ПОДНИМИСЬ', cx, 300 + (1 - k1) * 20, 150, { w: 900, ls: 34, glow: 1.3 + .4 * p }));
    A(k2, () => txt('И НАЧНИ ВСЁ СНАЧАЛА', cx, 432, 32, { w: 700, ls: 16, color: '#cfcfcf', glow: .5 }));
    A(k3, () => pill('ВЫБЕРИ СИЛУ', cx, 840, 22));
    A(lin(t, 55.6, 56.4), () => txt('ВЕЛИЧИЕ — ЭТО ПОДНЯТЬСЯ ПОСЛЕ ПАДЕНИЯ', cx, 920, 18, { w: 700, ls: 8, color: '#8a8a8a', glow: 0 }));
  });
}

// ---------- camera + frame ----------
function render(frame) {
  const t = frame / FPS;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  background(t);
  // camera: slow drift + beat shake after drop
  const p = t > DROP ? pulse(t, 10) : 0;
  const hit = Math.max(t >= DROP ? Math.exp(-(t - DROP) * 4) : 0, t >= wt('I', 1) ? Math.exp(-(t - wt('I', 1)) * 6) * .7 : 0, t >= wt('I', 2) ? Math.exp(-(t - wt('I', 2)) * 6) * .7 : 0);
  const sh = 14 * hit + 3 * p;
  const z = 1.0 + .015 * Math.sin(t * .35) + .02 * p;
  ctx.translate(W / 2 + Math.sin(t * 61) * sh + Math.sin(t * .4) * 6, H / 2 + Math.cos(t * 53) * sh + Math.cos(t * .3) * 4);
  ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  sceneChoice(t); sceneDreams(t); sceneCards(t); sceneBlame(t);
  sceneFeeling(t); sceneDont(t); sceneSummit(t); sceneAbyss(t); sceneRestart(t); sceneFinale(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  caption(t);
  post(t);
}
window.render = render;
