// Motivational motion piece — monochrome, glow, minimal diagrams
const W = 1920, H = 1080, FPS = 30;   // stage (scene) space
const CW = 1080, CH = 1920;            // vertical canvas
const STAGE_K = 0.82, STAGE_Y = 930;   // stage -> screen
const cv = document.getElementById('c');
cv.width = CW; cv.height = CH;
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
const dust = (() => { const r = rng(5); return Array.from({ length: 140 }, () => ({ x: r() * CW, y: r() * CH, z: .3 + r() * 1.2, s: r() * 6.28, sp: .2 + r() * .8 })); })();
function background(t) {
  const p = t > DROP ? pulse(t) : 0;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CW, CH);
  const g = ctx.createRadialGradient(CW / 2, STAGE_Y, 0, CW / 2, STAGE_Y, CH * .55);
  const c = Math.round(22 + 10 * p + (t > DROP ? 5 : 0));
  g.addColorStop(0, `rgb(${c},${c},${c})`); g.addColorStop(.55, 'rgb(8,8,8)'); g.addColorStop(1, '#000');
  ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
  // diagonal light streaks after drop (inspired by the music visual)
  if (t > DROP - .1) {
    const a = clamp((t - DROP) * 2) * (0.05 + 0.10 * p) * (1 - lin(t, 56, 59.5));
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    const r = rng(9);
    for (let i = 0; i < 26; i++) {
      const off = ((r() * 3000 + t * (300 + r() * 500)) % 3200) - 600, len = 200 + r() * 600;
      ctx.globalAlpha = a * (.3 + r() * .7);
      ctx.beginPath(); ctx.moveTo(off, -50 + r() * 200); ctx.lineTo(off + len * .7, -50 + r() * 200 + len * .7 * 1.0);
      const y0 = r() * CH; ctx.moveTo(off - 900, y0); ctx.lineTo(off - 900 + len, y0 + len); ctx.stroke();
    }
    ctx.restore();
  }
  // dust
  ctx.save();
  for (const d of dust) {
    const x = (d.x + Math.sin(t * .3 * d.sp + d.s) * 40 + t * 6 * d.z) % CW, y = (d.y - t * 12 * d.z + CH * 10) % CH;
    ctx.globalAlpha = (.08 + .22 * d.z / 1.5) * (0.6 + 0.4 * Math.sin(t * d.sp + d.s)) * (1 + p);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, d.z * 1.4, 0, 6.28); ctx.fill();
  }
  ctx.restore();
}
function post(t) {
  // vignette
  const v = ctx.createRadialGradient(CW / 2, CH * .48, CW * .42, CW / 2, CH * .48, CH * .62);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.85)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, CW, CH);
  // grain
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .16;
  ctx.drawImage(grain[Math.floor(t * 24) % grain.length], 0, 0, 640, 360, 0, 0, CW, CH); ctx.restore();
  // flashes
  let f = 0;
  f = Math.max(f, .32 * Math.exp(-(t - DROP) * 7) * (t >= DROP ? 1 : 0));
  f = Math.max(f, .25 * Math.exp(-(t - wt('I', 1)) * 7) * (t >= wt('I', 1) ? 1 : 0));
  for (const [tt, k, d] of [[wt('O1', 1), .3, 5], [wt('O2', 5), .15, 7], [wt('O6', 0), .18, 7], [wt('O6', 1), .15, 7], [wt('O6', 3), .35, 3.5]]) f = Math.max(f, k * Math.exp(-(t - tt) * d) * (t >= tt ? 1 : 0));
  if (f > .002) { ctx.fillStyle = `rgba(235,235,235,${f})`; ctx.fillRect(0, 0, CW, CH); }
  // fade in / out
  const black = Math.max(1 - lin(t, 0, 1.2), lin(t, 58.2, 59.9), dip(t));
  if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, CW, CH); }
}
function dip(t) { return t > 19.25 && t < DROP ? eIn(lin(t, 19.25, 19.48)) : 0; } // cut to black just before the drop

// ---------- caption (spoken line, word-by-word) ----------
const FIX = { 'ПОЙМЕШЬ,': 'ПОЙМЁШЬ,', 'ВСЕ': 'ВСЁ' };
function caption(t) {
  for (const id in TL) {
    const s = TL[id]; const a = fade(t, s.t0 - .2, s.t1 + .5, .2, .35);
    if (a <= 0) continue;
    const words = s.words.map(w => w.w.toUpperCase().replace('ПОЙМЕШЬ', 'ПОЙМЁШЬ').replace(/^ВСЕ$/, 'ВСЁ').replace('УЙДЕТ', 'УЙДЁТ'));
    const size = 40, gap = 20, ls = 5, maxW = 940, lh = 62;
    const ws = words.map(w => measure(w, size, { w: 800, ls }));
    const lines = [[]]; let cur = 0;
    ws.forEach((w, i) => { if (cur + w > maxW && lines[lines.length - 1].length) { lines.push([]); cur = 0; } lines[lines.length - 1].push(i); cur += w + gap; });
    const y0 = 1560 - (lines.length - 1) * lh / 2;
    A(a, () => lines.forEach((ln, li) => {
      let x = CW / 2 - (ln.reduce((q, i) => q + ws[i], 0) + gap * (ln.length - 1)) / 2;
      ln.forEach(i => {
        const k = eOut(lin(t, s.words[i].t0 - .06, s.words[i].t0 + .15));
        const active = t >= s.words[i].t0 - .05 && t <= s.words[i].t1 + .1;
        A(.12 + .88 * k, () => txt(words[i], x + ws[i] / 2, y0 + li * lh + (1 - k) * 14, size, { w: 800, ls, color: active ? '#ffffff' : '#a9a9a9', glow: active ? .8 : 0 }));
        x += ws[i] + gap;
      });
    }));
  }
}

// ---------- scenes ----------
const S0 = id => TL[id].t0, S1 = id => TL[id].t1;
function sceneChoice(t) {
  const end = S0('B') + .2;
  const a = fade(t, .15, end, .45, .35); if (a <= 0) return;
  A(a, () => {
    const gy = 650, fx = 960;
    pill('ВЫБОР', W / 2, 250);
    polyline([[340, gy], [fx, gy]], eOut(lin(t, .2, 1.0)));
    const st = []; let x = fx, y = gy; st.push([x, y]); for (let i = 0; i < 5; i++) { y -= 56; st.push([x, y]); x += 84; st.push([x, y]); }
    const weakT = wt('A', 1);
    A(1 - .72 * eOut(lin(t, weakT + .1, weakT + .6)), () => { polyline(st, eOut(lin(t, .5, 1.3))); A(lin(t, 1.0, 1.3), () => txt('СИЛА', x - 42, y - 44, 22, { w: 800, ls: 7, glow: .6 })); });
    polyline([[fx, gy], [1580, gy]], eOut(lin(t, .5, 1.3)));
    A(lin(t, weakT, weakT + .3), () => txt('СЛАБОСТЬ', 1300, gy + 42, 22, { w: 800, ls: 7, glow: .9 }));
    let px = mix(420, fx - 30, eIO(lin(t, .3, 1.4)));
    px = mix(px, 1300, eIO(lin(t, weakT + .15, end)));
    const walking = (t > .3 && t < 1.4) || t > weakT + .15;
    figure(px, gy, 74, { walk: walking ? t * 2.8 : 0 });
    A(lin(t, wt('A', 2), wt('A', 2) + .3), () => txt('ОДНАЖДЫ', W / 2, 120, 84, { w: 800, ls: 18, glow: 1 }));
  });
}
function sceneDreams(t) {
  const a = fade(t, S0('B') - .2, S0('C') + .15, .35, .35); if (a <= 0) return;
  const labels = ['ЦЕЛЬ', 'СВОБОДА', 'СЕМЬЯ', 'УВАЖЕНИЕ', 'ДОМ', 'СИЛА', 'МЕЧТА'];
  const tDie = wt('B', 6);
  A(a, () => {
    pill('ТВОИ МЕЧТЫ', W / 2, 250);
    labels.forEach((L, i) => {
      const x = 600 + i * 120, appear = S0('B') + .05 + i * .12;
      const die = tDie - .2 + i * .08;
      const k = eBack(lin(t, appear, appear + .4)), dd = lin(t, die, die + 1.1);
      const y = 470 + Math.sin(t * 1.3 + i) * 6 + eIn(dd) * 380;
      const bright = (1 - lin(t, die, die + .2)) * (0.85 + .15 * Math.sin(t * 5 + i));
      A(k * (1 - eIn(dd)), () => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(eIn(dd) * (i % 2 ? 1.2 : -1.2));
        ctx.shadowColor = 'rgba(255,255,255,.8)'; ctx.shadowBlur = 30 * bright;
        ctx.fillStyle = `rgba(240,240,240,${.18 + .82 * bright})`;
        ctx.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? 9 : 22, an = -Math.PI / 2 + j * Math.PI / 5; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ctx.closePath(); ctx.fill();
        ctx.restore();
        A(1 - lin(t, die, die + .3), () => txt(L, x, 525, 13, { w: 700, ls: 3, color: '#9a9a9a', glow: 0 }));
      });
    });
    const kd = eOut(lin(t, tDie, tDie + .4));
    A(kd, () => txt('ПОГИБЛИ', W / 2, 640 + (1 - kd) * 20, 120, { w: 800, ls: 26, glow: 1.1 }));
  });
}
function sceneCards(t) {
  const a = fade(t, S0('C') - .1, S0('E') - .1, .35, .35); if (a <= 0) return;
  A(a, () => {
    pill('ТВОЙ ВЫБОР', W / 2, 250);
    const kL = eOut(lin(t, S0('C') + .05, S0('C') + .5)), kR = eOut(lin(t, wt('D', 0) - .2, wt('D', 0) + .3));
    const slide = eIO(lin(t, wt('D', 0) - .3, wt('D', 0) + .3));
    const lx = mix(W / 2, W / 2 - 230, slide), rx = W / 2 + 230;
    const xT = wt('D', 4);
    A(kL, () => { card(lx, 500 + (1 - kL) * 30, 380, 210, 'БЫТЬ СЛАБЫМ', 'ВЫБОР № 1'); check(lx, 680, 24, lin(t, wt('C', 6), wt('C', 6) + .5)); });
    A(kR, () => { card(rx, 500 + (1 - kR) * 30, 380, 210, 'СТАТЬ СИЛЬНЕЕ', 'ВЫБОР № 2', { dim: t > xT + .25 }); cross(rx, 518, 80, lin(t, xT, xT + .4), 5); });
    A(lin(t, wt('C', 4), wt('C', 4) + .3) * (1 - kR), () => txt('ТЫ ВЫБРАЛ', W / 2, 720, 26, { w: 700, ls: 10, color: '#bbb', glow: .3 }));
  });
}
function sceneBlame(t) {
  const t0 = S0('E') - .2;
  const a = fade(t, t0, 19.5, .4, .05); if (a <= 0) return;
  const gy = 690;
  A(a, () => {
    const zoom = 1 + .2 * eIn(lin(t, S1('F') - .3, 19.45));
    ctx.save(); ctx.translate(W / 2, gy - 60); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -(gy - 60));
    const sp = eOut(lin(t, t0 + .1, t0 + .7));
    ctx.save(); ctx.globalAlpha *= .14 * sp;
    const lg = ctx.createLinearGradient(0, 0, 0, gy); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(W / 2 - 40, 0); ctx.lineTo(W / 2 + 40, 0); ctx.lineTo(W / 2 + 190, gy); ctx.lineTo(W / 2 - 190, gy); ctx.closePath(); ctx.fill(); ctx.restore();
    A(.4 * sp, () => { ctx.save(); ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.ellipse(W / 2, gy, 190, 16, 0, 0, 6.28); ctx.fill(); ctx.restore(); });
    polyline([[460, gy], [1460, gy]], eOut(lin(t, t0, t0 + .7)), 2);
    const gone = lin(t, wt('E', 2), wt('E', 2) + .5);
    [-420, -280, 280, 420].forEach((dx, i) => A((1 - gone) * eOut(lin(t, t0 + .1 + i * .07, t0 + .5 + i * .07)) * .55, () => figure(W / 2 + dx + Math.sign(dx) * gone * 80, gy, 60, { color: '#777', blur: 0 })));
    figure(W / 2, gy, 78);
    A(lin(t, wt('E', 0), wt('E', 0) + .3) * (1 - lin(t, wt('F', 0) - .2, wt('F', 0) + .15)), () => txt('НЕКОГО ВИНИТЬ', W / 2, 330, 64, { w: 800, ls: 16 }));
    const conv = eOut(lin(t, wt('F', 0), wt('F', 1) + .3));
    [[-1, 0], [1, 0], [-.7, -.7], [.7, -.7]].forEach(([dx, dy]) => {
      const r0 = 420 - 210 * conv, cx = W / 2, cy = gy - 50;
      const x1 = cx + dx * r0, y1 = cy + dy * r0, x2 = cx + dx * (r0 - 90), y2 = cy + dy * (r0 - 90);
      A(conv, () => { polyline([[x1, y1], [x2, y2]], 1, 3); const an = Math.atan2(y2 - y1, x2 - x1); polyline([[x2 - 18 * Math.cos(an - .5), y2 - 18 * Math.sin(an - .5)], [x2, y2], [x2 - 18 * Math.cos(an + .5), y2 - 18 * Math.sin(an + .5)]], 1, 3); });
    });
    const ks = eOut(lin(t, wt('F', 1), wt('F', 1) + .3));
    A(ks, () => txt('КРОМЕ СЕБЯ', W / 2, 330 + (1 - ks) * 16, 84, { w: 800, ls: 20, glow: 1.2 }));
    ctx.restore();
  });
}
function sceneFeeling(t) {
  const end = S0('I') - .25;
  const a = fade(t, DROP, end, .05, .35); if (a <= 0) return;
  A(a, () => {
    const k1 = eOut(lin(t, wt('G', 1) - .1, wt('G', 1) + .3)), out1 = lin(t, wt('G', 3) - .2, wt('G', 3) + .1);
    A(k1 * (1 - out1), () => {
      const s = 1.25 - .25 * k1 + .03 * pulse(t);
      ctx.save(); ctx.translate(W / 2, 470); ctx.scale(s, s);
      txt('ЭТО', 0, -110, 34, { w: 700, ls: 16, color: '#bbb', glow: .4 });
      txt('ЧУВСТВО', 0, 0, 160, { w: 800, ls: 30, glow: 1.3 * lin(t, wt('G', 2), wt('G', 2) + .2) + .3 });
      ctx.restore();
    });
    const k2 = fade(t, wt('G', 3) - .1, S0('H') - .05, .3, .3);
    A(k2, () => {
      const gy = 690; polyline([[300, gy], [1620, gy]], 1, 2);
      const px = mix(760, 1260, lin(t, wt('G', 3), S0('H')));
      const lag = .55 + .1 * Math.sin(t * 2);
      for (let k = 5; k >= 0; k--) A(.08 + .05 * (5 - k), () => figure(px - 240 - k * 26 + Math.sin(t * 3 + k) * 4, gy, 130 + k * 4, { color: '#2a2a2a', shadow: 'rgba(0,0,0,0)', blur: 0, walk: t * 2.4 - lag }));
      figure(px - 240, gy, 130, { color: '#3a3a3a', shadow: 'rgba(255,255,255,.15)', blur: 40, walk: t * 2.4 - lag });
      figure(px, gy, 78, { walk: t * 2.6 });
      const kp = eOut(lin(t, wt('G', 4), wt('G', 4) + .3));
      A(kp, () => txt('ПРЕСЛЕДОВАТЬ', W / 2, 330, 86, { w: 800, ls: 18, glow: 1 }));
      A(lin(t, wt('G', 5), wt('G', 5) + .25), () => txt('ТЕБЯ', W / 2, 425, 30, { w: 700, ls: 14, color: '#bbb', glow: .4 }));
    });
    const k3 = fade(t, S0('H') - .25, end, .35, .35);
    A(k3, () => {
      const cx = W / 2, cy = 520, R = 220;
      pill('ДО КОНЦА ТВОИХ ДНЕЙ', W / 2, 200);
      ctx.save(); glowStroke(2, 12); ctx.strokeStyle = '#555'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.28); ctx.stroke(); ctx.restore();
      const prog = eIO(lin(t, S0('H') - .1, S1('H') + .3));
      ctx.save(); glowStroke(3.5, 18); ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + prog * 6.283); ctx.stroke(); ctx.restore();
      const an = -Math.PI / 2 + prog * 6.283;
      ctx.save(); ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(cx + Math.cos(an) * R, cy + Math.sin(an) * R, 11, 0, 6.28); ctx.fill(); ctx.restore();
      ['20', '30', '40', '50', '60', '70', '80'].forEach((L, i) => { const b = -Math.PI / 2 + (i + .5) * 6.283 / 7; txt(L, cx + Math.cos(b) * (R + 42), cy + Math.sin(b) * (R + 42), 16, { w: 700, ls: 3, color: prog * 7 > i + .5 ? '#ddd' : '#555', glow: 0 }); });
      txt('СОЖАЛЕНИЕ', cx, cy - 6, 30, { w: 800, ls: 9, glow: .9 });
      txt('КАЖДЫЙ ДЕНЬ', cx, cy + 34, 13, { w: 700, ls: 5, color: '#888', glow: 0 });
    });
  });
}
function sceneDont(t) {
  const a = fade(t, S0('I') - .25, S0('J') - .1, .15, .35); if (a <= 0) return;
  A(a, () => {
    const z = 1 + .06 * lin(t, S0('I'), S0('J')) + .02 * pulse(t);
    ctx.save(); ctx.translate(W / 2, 480); ctx.scale(z, z);
    const w0 = wt('I', 0), w1 = wt('I', 1), w2 = wt('I', 2);
    const k0 = eOut(lin(t, w0 - .05, w0 + .2)), k1 = lin(t, w1 - .05, w1 + .2), k2 = lin(t, w2 - .05, w2 + .2);
    A(k0, () => txt('НЕ', 0, -170, 44, { w: 700, ls: 20, color: '#cfcfcf', glow: .5 }));
    A(eOut(k1), () => { const s = 1.5 - .5 * eOut(k1); ctx.save(); ctx.scale(s, s); txt('ДОПУСТИ', 0, -40, 150, { w: 900, ls: 22, glow: 1.4 }); ctx.restore(); });
    A(eOut(k2), () => { const s = 1.5 - .5 * eOut(k2); ctx.save(); ctx.scale(s, s); txt('ЭТОГО', 0, 110, 150, { w: 900, ls: 22, glow: 1.4 }); ctx.restore(); });
    ctx.restore();
  });
}
function sceneSummit(t) {
  const t0 = S0('J') - .2, end = S0('L') - .15;
  const mt = [[360, 780], [620, 610], [720, 660], [960, 360], [1140, 560], [1240, 520], [1560, 780]];
  const a = fade(t, t0, end, .35, .3); if (a <= 0) return;
  A(a, () => {
    const pre = [[360, 780], [620, 610], [720, 660], [960, 360]];
    polyline(mt, eIO(lin(t, t0 + .1, t0 + 1.2)), 3);
    const kv = eOut(lin(t, wt('J', 3), wt('J', 3) + .3)), gone = 1 - lin(t, wt('K', 0) - .15, wt('K', 0) + .15);
    A(kv * gone, () => txt('ВЕЛИКИМ', W / 2, 220, 110, { w: 800, ls: 26, glow: 1.1 }));
    A(lin(t, wt('J', 1), wt('J', 1) + .3) * gone, () => txt('ЧЕЛОВЕК СТАНОВИТСЯ', W / 2, 135, 26, { w: 700, ls: 10, color: '#aaa', glow: .3 }));
    const cp = eIO(lin(t, wt('K', 0), wt('K', 5) + .15));
    const [fx, fy] = pointOn(pre, cp);
    A(lin(t, t0 + .8, t0 + 1.2), () => figure(fx, fy, 52, { walk: cp > 0 && cp < 1 ? t * 3.4 : 0 }));
    const fl = eOut(lin(t, wt('K', 5), wt('K', 5) + .3));
    A(fl, () => { polyline([[985, 360], [985, 360 - 80 * fl]], 1, 3); ctx.save(); ctx.fillStyle = '#ddd'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.moveTo(985, 280); ctx.lineTo(985 + 46 * fl, 293); ctx.lineTo(985, 306); ctx.fill(); ctx.restore(); });
    A(lin(t, wt('K', 4), wt('K', 4) + .3), () => pill('ВЕРШИНА', 960, 180));
    const xT = S1('K') - .05;
    cross(960, 330, 110, lin(t, xT, xT + .35), 6);
    A(lin(t, xT + .1, xT + .4), () => txt('НЕ ТОГДА', W / 2, 840, 40, { w: 800, ls: 14, glow: .8 }));
  });
}
function sceneAbyss(t) {
  const t0 = S0('L') - .15, end = S0('N') - .2;
  const a = fade(t, t0, end, .3, .35); if (a <= 0) return;
  const tf0 = wt('L', 2) - .1, tLand = S1('L') + .2;
  const depth = 2600;
  const fall = eIn(lin(t, tf0, tLand));
  const camY = mix(0, depth, eIO(lin(t, tf0 - .25, tLand + .1)));
  A(a, () => {
    const land = t > tLand ? Math.exp(-(t - tLand) * 6) : 0;
    ctx.save(); ctx.translate(Math.sin(t * 90) * 14 * land, -camY + Math.cos(t * 80) * 10 * land);
    const r = rng(3); const left = [], right = [];
    for (let y = 560; y <= 560 + depth + 900; y += 90) { left.push([700 - r() * 70 - (y < 700 ? 0 : 20), y]); right.push([1220 + r() * 70 + (y < 700 ? 0 : 20), y]); }
    polyline([[200, 560], [700, 560], ...left], 1, 3); polyline([[1720, 560], [1220, 560], ...right], 1, 3);
    const by = 560 + depth + 120;
    polyline([[640, by], [1280, by]], 1, 3);
    if (t > tf0 && t < tLand + .2) {
      const sp = Math.sin(Math.PI * lin(t, tf0, tLand + .2));
      ctx.save(); ctx.globalAlpha *= .35 * sp; ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2; const rr = rng(Math.floor(t * 20));
      for (let i = 0; i < 18; i++) { const x = 780 + rr() * 360, y = camY + rr() * H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 80 + rr() * 160); ctx.stroke(); } ctx.restore();
    }
    const up = eIO(lin(t, wt('M', 2), wt('M', 4) + .4));
    let fx = mix(820, 960, eIO(lin(t, t0 + .1, tf0))), fy = 560 + fall * (by - 560);
    let rot = fall * 5.5;
    if (t >= tLand) { fy = by; rot = mix(Math.PI / 2, 0, up); }
    figure(fx, fy, 70, { rot, walk: t < tf0 ? t * 3 : 0 });
    if (t >= tLand) {
      const d = lin(t, tLand, tLand + 1.0); const rr = rng(11);
      A(1 - d, () => { for (let i = 0; i < 26; i++) { const an = Math.PI + rr() * Math.PI, sp = 60 + rr() * 220; ctx.fillStyle = '#bbb'; ctx.beginPath(); ctx.arc(960 + Math.cos(an) * sp * eOut(d), by + Math.sin(an) * sp * .35 * eOut(d), 2 + rr() * 3, 0, 6.28); ctx.fill(); } });
      const lb = eOut(lin(t, wt('M', 0), wt('M', 4) + .3));
      ctx.save(); ctx.globalAlpha *= .18 * lb; const lg = ctx.createLinearGradient(0, by - 900, 0, by); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(1, '#fff'); ctx.fillStyle = lg;
      ctx.beginPath(); ctx.moveTo(930, by - 900); ctx.lineTo(990, by - 900); ctx.lineTo(1100, by); ctx.lineTo(820, by); ctx.fill(); ctx.restore();
      const ring = lin(t, wt('M', 0), wt('M', 3) + .2);
      A(fade(t, wt('M', 0), end, .3, .35), () => { ctx.save(); glowStroke(3, 16); ctx.beginPath(); ctx.arc(960, by - 45, 85, -Math.PI / 2, -Math.PI / 2 + 6.283 * eIO(ring)); ctx.stroke(); ctx.restore(); });
    }
    ctx.restore();
    const dm = Math.round(camY / depth * 300);
    A(fade(t, tf0, end, .3, .35), () => txt(`ГЛУБИНА: −${String(dm).padStart(3, '0')} М`, W / 2, -40, 22, { w: 700, ls: 6, color: '#9a9a9a', glow: 0 }));
    A(lin(t, wt('L', 4), wt('L', 4) + .25) * (1 - lin(t, tLand + .3, tLand + .6)), () => txt('ПРОПАСТЬ', W / 2, 240, 110, { w: 800, ls: 28, glow: 1.1 }));
    A(eOut(lin(t, wt('M', 3), wt('M', 3) + .3)), () => txt('СИЛЫ', W / 2, 100, 30, { w: 700, ls: 16, color: '#bbb', glow: .4 }));
    const ku = eOut(lin(t, wt('M', 4), wt('M', 4) + .3));
    A(ku, () => txt('ПОДНЯТЬСЯ', W / 2, 290 + (1 - ku) * 24, 120, { w: 800, ls: 26, glow: 1.2 }));
  });
}
function sceneRestart(t) {            // N + «Так поднимись!»
  const t0 = S0('N') - .2, end = S0('O2') - .1, top = wt('O1', 1);
  const a = fade(t, t0, end, .35, .3); if (a <= 0) return;
  const N = 9, sx = 420, sy = 860, dw = 120, dh = 70;
  const pts = [[sx - 140, sy]]; for (let i = 0; i < N; i++) { pts.push([sx + i * dw, sy - i * dh]); pts.push([sx + i * dw, sy - (i + 1) * dh]); } pts.push([sx + N * dw + 60, sy - N * dh]);
  A(a, () => {
    const cam = eIO(lin(t, t0 + .2, top));
    ctx.save(); ctx.translate(-cam * 260, cam * 330);
    polyline(pts, eOut(lin(t, t0, t0 + .9)), 3);
    const prog = lin(t, wt('N', 1), top); const sf = prog * N; const si = Math.min(N - 1, Math.floor(sf)), f = sf - si;
    const fails = [1, 2, 4, 6];
    fails.forEach(s => { if (sf > s + .5) cross(sx + s * dw + 40, sy - (s + 1) * dh - 30, 13, clamp((sf - s - .5) * 3), 3); });
    let x, y; if (prog <= 0) { x = sx - 80; y = sy; }
    else if (prog >= 1) { x = sx + N * dw + 20; y = sy - N * dh; }
    else { const hop = Math.sin(Math.PI * clamp(f * 1.6)); x = sx + si * dw + 20 + f * dw; y = sy - (si + 1) * dh - hop * 26; if (si === 0 && f < .2) y = sy - dh * eOut(f / .2); }
    figure(x, y, 56 + 10 * eOut(lin(t, top, top + .4)), { walk: prog > 0 && prog < 1 ? t * 3.6 : 0, blur: 18 + 30 * lin(t, top, top + .3) });
    ctx.restore();
    const kn = eOut(lin(t, wt('N', 3), wt('N', 3) + .35));
    A(kn * (1 - lin(t, S0('O1') - .2, S0('O1') + .1)), () => { txt('НАЧАТЬ ВСЁ', W / 2, 60, 32, { w: 700, ls: 14, color: '#bbb', glow: .4 }); txt('СНАЧАЛА', W / 2, 150, 120, { w: 800, ls: 26, glow: 1.2 }); });
    const cnt = fails.filter(s => sf > s + .5).length;
    A(lin(t, t0 + .6, t0 + 1.0) * (1 - lin(t, top - .2, top)), () => { txt(`ПАДЕНИЙ: ${cnt}`, 360, 40, 20, { w: 800, ls: 6, glow: .4, align: 'left' }); txt(`ПОДЪЁМОВ: ${cnt + (sf > .2 ? 1 : 0)}`, 360, 76, 20, { w: 800, ls: 6, color: '#9a9a9a', glow: 0, align: 'left' }); });
    const kp = lin(t, top - .05, top + .2);
    A(eOut(kp), () => { const s = 1.4 - .4 * eOut(kp); ctx.save(); ctx.translate(W / 2, 150); ctx.scale(s, s); txt('ТАК', 0, -100, 34, { w: 700, ls: 16, color: '#cfcfcf', glow: .4 }); txt('ПОДНИМИСЬ', 0, 0, 112, { w: 900, ls: 22, glow: 1.4 }); ctx.restore(); });
  });
}
function sceneUnbroken(t) {           // «Ты падал, но ты не сломлен.»
  const t0 = S0('O2') - .15, end = S0('O3') - .05;
  const a = fade(t, t0, end, .25, .25); if (a <= 0) return;
  A(a, () => {
    const split = eOut(lin(t, wt('O2', 1), wt('O2', 1) + .35)) * (1 - eBack(lin(t, wt('O2', 5) - .05, wt('O2', 5) + .3)));
    A(lin(t, t0, t0 + .3), () => txt('ТЫ ПАДАЛ', W / 2, 300, 30, { w: 700, ls: 14, color: '#aaa', glow: .3 }));
    A(lin(t, wt('O2', 4), wt('O2', 4) + .2), () => txt('НЕ', W / 2, 410, 44, { w: 800, ls: 20, glow: .6 }));
    // the word split along a diagonal crack, then snapped back
    const word = 'СЛОМЛЕН', cy = 540, size = 134;
    [[1, -1], [-1, 1]].forEach(([sgn]) => {
      ctx.save(); ctx.translate(-sgn * 40 * split, -sgn * 34 * split); ctx.rotate(-sgn * .03 * split); ctx.beginPath();
      if (sgn > 0) { ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, cy - 60); ctx.lineTo(0, cy + 40); }
      else { ctx.moveTo(0, cy + 40); ctx.lineTo(W, cy - 60); ctx.lineTo(W, H); ctx.lineTo(0, H); }
      ctx.closePath(); ctx.clip();
      txt(word, W / 2, cy, size, { w: 900, ls: 30, glow: 1.2 + .8 * Math.exp(-Math.max(0, t - wt('O2', 5)) * 5) * (t > wt('O2', 5) ? 1 : 0), color: split > .05 ? '#cfcfcf' : '#f4f4f4' });
      ctx.restore();
    });
    A(split, () => { ctx.save(); glowStroke(2, 10); ctx.beginPath(); ctx.moveTo(440, cy + 40 - 100 * (440 / W)); ctx.lineTo(1480, cy + 40 - 100 * (1480 / W)); ctx.setLineDash([6, 10]); ctx.stroke(); ctx.restore(); });
  });
}
function scenePain(t) {               // «Боль уйдёт, а сила останется.»
  const t0 = S0('O3') - .1, end = S0('O4') - .05;
  const a = fade(t, t0, end, .25, .25); if (a <= 0) return;
  A(a, () => {
    const bx = 620, bw = 680;
    const pain = 1 - eIO(lin(t, wt('O3', 1), wt('O3', 1) + .9));
    const str = eIO(lin(t, wt('O3', 3) - .1, wt('O3', 4) + .4));
    [['БОЛЬ', 430, pain, 'ВРЕМЕННО', wt('O3', 1)], ['СИЛА', 610, str, 'НАВСЕГДА', wt('O3', 4)]].forEach(([L, y, v, tag, tt], i) => {
      A(lin(t, t0 + i * .1, t0 + .3 + i * .1), () => {
        txt(L, bx - 40, y, 44, { w: 800, ls: 12, align: 'right', glow: i ? .9 : .3, color: i ? '#f2f2f2' : '#b5b5b5' });
        ctx.save(); glowStroke(2, 8); ctx.strokeStyle = '#555'; rrect(bx, y - 22, bw, 44, 22); ctx.stroke(); ctx.restore();
        if (v > .005) { ctx.save(); ctx.fillStyle = i ? '#eee' : '#888'; ctx.shadowColor = 'rgba(255,255,255,.6)'; ctx.shadowBlur = i ? 26 : 6; rrect(bx + 5, y - 17, (bw - 10) * v, 34, 17); ctx.fill(); ctx.restore(); }
        txt(`${Math.round(v * 100)}%`, bx + bw + 30, y, 26, { w: 800, ls: 4, align: 'left', glow: i ? .6 : 0, color: i ? '#eee' : '#999' });
        A(lin(t, tt + .2, tt + .5), () => txt(tag, bx + bw / 2, y + 52, 15, { w: 700, ls: 8, color: '#8a8a8a', glow: 0 }));
      });
    });
  });
}
function sceneStronger(t) {           // «Каждое падение делает тебя крепче.»
  const t0 = S0('O4') - .05, end = S0('O5') - .05;
  const a = fade(t, t0, end, .25, .25); if (a <= 0) return;
  A(a, () => {
    const pts = [[380, 800]]; let y = 800;
    for (let i = 0; i < 7; i++) { y -= 120; pts.push([380 + (i * 2 + 1) * 80, y]); y += 60; pts.push([380 + (i * 2 + 2) * 80, y]); }
    pts.push([1560, y - 150]);
    ctx.save(); glowStroke(1.5, 0); ctx.strokeStyle = '#444'; ctx.beginPath(); ctx.moveTo(360, 220); ctx.lineTo(360, 820); ctx.lineTo(1600, 820); ctx.stroke(); ctx.restore();
    txt('СИЛА', 330, 230, 14, { w: 700, ls: 5, color: '#777', glow: 0, align: 'right' });
    txt('ПАДЕНИЯ', 1580, 850, 14, { w: 700, ls: 5, color: '#777', glow: 0, align: 'right' });
    const p = eIO(lin(t, t0 + .1, S1('O4') + .1));
    const head = polyline(pts, p, 3.5, 16);
    for (let i = 0; i < 7; i++) { const q = pts[i * 2 + 2]; const qp = (i * 2 + 2) / (pts.length - 1); if (p > qp * .97) A(lin(p, qp * .97, qp * .97 + .05), () => cross(q[0], q[1] + 26, 9, 1, 2.5)); }
    if (head) { ctx.save(); ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 26; ctx.beginPath(); ctx.arc(head[0], head[1], 10, 0, 6.28); ctx.fill(); ctx.restore(); }
    const kk = eOut(lin(t, wt('O4', 4), wt('O4', 4) + .3));
    A(kk, () => txt('КРЕПЧЕ', W / 2, 90 + (1 - kk) * 20, 120, { w: 900, ls: 26, glow: 1.2 }));
    A(lin(t, wt('O4', 1), wt('O4', 1) + .3), () => pill('КАЖДОЕ ПАДЕНИЕ', W / 2, -30, 20));
  });
}
function sceneToday(t) {             // «Сегодня твой новый старт.»
  const t0 = S0('O5') - .05, end = S0('O6') - .05;
  const a = fade(t, t0, end, .2, .25); if (a <= 0) return;
  A(a, () => {
    pill('НОВЫЙ СТАРТ', W / 2, 260);
    const xs = [W / 2 - 440, W / 2, W / 2 + 440];
    const k = i => eOut(lin(t, t0 + i * .12, t0 + .35 + i * .12));
    A(k(0), () => { card(xs[0], 520, 360, 210, 'ЗАВТРА', 'НАЧНУ', { dim: true }); cross(xs[0], 538, 70, lin(t, t0 + .25, t0 + .55), 4); });
    A(k(1), () => { card(xs[1], 520, 360, 210, 'ПОТОМ', 'НАЧНУ', { dim: true }); cross(xs[1], 538, 70, lin(t, t0 + .45, t0 + .75), 4); });
    const ks = eBack(lin(t, wt('O5', 0) + .05, wt('O5', 0) + .45));
    A(clamp(ks), () => { ctx.save(); ctx.translate(xs[2], 520); const s = .85 + .15 * ks + .02 * pulse(t); ctx.scale(s, s); card(0, 0, 360, 210, 'СЕГОДНЯ', 'НАЧИНАЮ'); ctx.restore(); });
    A(lin(t, wt('O5', 3), wt('O5', 3) + .3), () => { check(xs[2], 700, 24, lin(t, wt('O5', 3), wt('O5', 3) + .5)); txt('ДЕНЬ 1', W / 2, 820, 56, { w: 900, ls: 22, glow: 1 }); });
  });
}
function sceneFinale(t) {            // «Встань, иди и выбери силу» → end
  const t0 = S0('O6') - .1;
  const a = fade(t, t0, 60, .3, .1); if (a <= 0) return;
  A(a, () => {
    const cx = W / 2, gy = 740, p = pulse(t);
    const kr = eOut(lin(t, wt('O6', 3) - .2, wt('O6', 3) + .8)) * .7 + .3 * eOut(lin(t, t0, t0 + .6));
    ctx.save(); ctx.translate(cx, gy - 60); ctx.rotate(t * .05);
    for (let i = 0; i < 36; i++) { ctx.rotate(6.283 / 36); ctx.globalAlpha = a * kr * (.035 + .03 * (i % 3 === 0) + .05 * p); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1400, -46); ctx.lineTo(1400, 46); ctx.fill(); }
    ctx.restore();
    const halo = ctx.createRadialGradient(cx, gy - 60, 0, cx, gy - 60, 380); halo.addColorStop(0, `rgba(255,255,255,${.22 * kr})`); halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
    polyline([[cx - 380 * kr, gy], [cx + 380 * kr, gy]], 1, 3);
    // figure: kneeling → stands on «Встань», walks forward on «иди»
    const st = eOut(lin(t, wt('O6', 0), wt('O6', 0) + .35));
    figure(cx, gy, (70 + 30 * st) + 4 * p, { blur: 22 + 20 * st, walk: t > wt('O6', 1) && t < wt('O6', 3) ? t * 3 : 0 });
    // word slams
    const slam = (s, tt, tOut, y, size) => { const k = lin(t, tt - .04, tt + .18); const o = tOut ? 1 - lin(t, tOut - .08, tOut + .05) : 1; A(eOut(k) * o, () => { const sc = 1.45 - .45 * eOut(k); ctx.save(); ctx.translate(cx, y); ctx.scale(sc, sc); txt(s, 0, 0, size, { w: 900, ls: size * .2, glow: 1.4 + .3 * p }); ctx.restore(); }); };
    slam('ВСТАНЬ', wt('O6', 0), wt('O6', 1), 330, 170);
    slam('ИДИ', wt('O6', 1), wt('O6', 3) - .15, 330, 170);
    A(lin(t, wt('O6', 2), wt('O6', 2) + .15), () => txt('И ВЫБЕРИ', cx, 215, 34, { w: 700, ls: 16, color: '#cfcfcf', glow: .4 }));
    slam('СИЛУ', wt('O6', 3), 0, 340, 190);
    A(lin(t, 56.6, 57.3), () => txt('ЧЕЛОВЕК СТАНОВИТСЯ ВЕЛИКИМ, КОГДА ПОДНИМАЕТСЯ', cx, 880, 20, { w: 700, ls: 8, color: '#9a9a9a', glow: 0 }));
  });
}

// ---------- camera + frame ----------
function render(frame) {
  const t = frame / FPS;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  background(t);
  const p = t > DROP ? pulse(t, 10) : 0;
  const hit = Math.max(t >= DROP ? Math.exp(-(t - DROP) * 4) : 0, t >= wt('I', 1) ? Math.exp(-(t - wt('I', 1)) * 6) * .7 : 0, t >= wt('I', 2) ? Math.exp(-(t - wt('I', 2)) * 6) * .7 : 0, t >= wt('O1', 1) ? Math.exp(-(t - wt('O1', 1)) * 6) * .6 : 0, t >= wt('O6', 3) ? Math.exp(-(t - wt('O6', 3)) * 5) * .8 : 0);
  const sh = 12 * hit + 3 * p;
  const z = STAGE_K * (1.0 + .015 * Math.sin(t * .35) + .02 * p);
  ctx.translate(CW / 2 + Math.sin(t * 61) * sh + Math.sin(t * .4) * 5, STAGE_Y + Math.cos(t * 53) * sh + Math.cos(t * .3) * 4);
  ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  sceneChoice(t); sceneDreams(t); sceneCards(t); sceneBlame(t);
  sceneFeeling(t); sceneDont(t); sceneSummit(t); sceneAbyss(t); sceneRestart(t);
  sceneUnbroken(t); scenePain(t); sceneStronger(t); sceneToday(t); sceneFinale(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  caption(t);
  post(t);
}
window.render = render;
