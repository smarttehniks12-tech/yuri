/* icons.js — vector icon set (no CJK glyphs). Canvas drawers + cached data-URL images for DOM. */
(function () {
  'use strict';
  const CA = window.CA;
  const TAU = Math.PI * 2;

  // every drawer works in a 100x100 box centred on 0,0; fill = main colour, ink = outline
  function P(ctx) { ctx.beginPath(); }
  function star(ctx, n, r1, r2, rot) { P(ctx); for (let i = 0; i <= n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + i * Math.PI / n; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); }
  function drop(ctx, x, y, s) { P(ctx); ctx.moveTo(x, y - s); ctx.bezierCurveTo(x + s * 0.2, y - s * 0.5, x + s * 0.75, y - s * 0.05, x + s * 0.7, y + s * 0.35); ctx.arc(x, y + s * 0.3, s * 0.7, 0.05, Math.PI - 0.05); ctx.bezierCurveTo(x - s * 0.75, y - s * 0.05, x - s * 0.2, y - s * 0.5, x, y - s); ctx.closePath(); }
  function bolt(ctx, s) { P(ctx); ctx.moveTo(8 * s, -42 * s); ctx.lineTo(-18 * s, 4 * s); ctx.lineTo(0, 4 * s); ctx.lineTo(-10 * s, 42 * s); ctx.lineTo(20 * s, -8 * s); ctx.lineTo(2 * s, -8 * s); ctx.closePath(); }
  function fist(ctx) {
    P(ctx); ctx.moveTo(-26, -6); ctx.lineTo(-26, 26); ctx.quadraticCurveTo(-24, 36, -12, 36); ctx.lineTo(18, 36); ctx.quadraticCurveTo(30, 34, 30, 22); ctx.lineTo(30, -6); ctx.closePath();
    ctx.fill(); ctx.stroke();
    for (let i = 0; i < 4; i++) { P(ctx); ctx.roundRect ? ctx.roundRect(-26 + i * 14, -26, 14, 26, 6) : ctx.rect(-26 + i * 14, -26, 14, 26); ctx.fill(); ctx.stroke(); }
    P(ctx); ctx.moveTo(-26, 8); ctx.quadraticCurveTo(-40, 4, -36, -10); ctx.quadraticCurveTo(-30, -16, -22, -8); ctx.stroke();
  }

  const D = {
    orb(ctx) { P(ctx); ctx.arc(0, 0, 22, 0, TAU); ctx.fill(); ctx.stroke(); P(ctx); ctx.arc(-7, -7, 7, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill(); for (let i = 0; i < 3; i++) { P(ctx); ctx.arc(0, 0, 32 + i * 6, -0.6 + i, 0.4 + i); ctx.stroke(); } },
    vortex(ctx) { ctx.lineWidth = 6; for (let a = 0; a < 3; a++) { P(ctx); for (let s = 0; s <= 24; s++) { const f = s / 24, ang = a * TAU / 3 + f * 3.4, r = 40 * (1 - f) + 4; const x = Math.cos(ang) * r, y = Math.sin(ang) * r; s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); } P(ctx); ctx.arc(0, 0, 9, 0, TAU); ctx.fillStyle = '#05060f'; ctx.fill(); ctx.stroke(); },
    burst(ctx) { star(ctx, 8, 44, 18, 0); ctx.fill(); ctx.stroke(); P(ctx); ctx.arc(0, 0, 12, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); },
    void(ctx) { P(ctx); ctx.arc(0, 0, 30, 0, TAU); ctx.fillStyle = '#12021e'; ctx.fill(); ctx.stroke(); ctx.lineWidth = 6; P(ctx); ctx.arc(0, 0, 20, 0.3, 2.6); ctx.strokeStyle = '#6ac8ff'; ctx.stroke(); P(ctx); ctx.arc(0, 0, 20, 3.4, 5.8); ctx.strokeStyle = '#ff5a6a'; ctx.stroke(); P(ctx); ctx.arc(0, 0, 7, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); },
    blink(ctx) { ctx.lineWidth = 7; ctx.setLineDash([6, 8]); P(ctx); ctx.moveTo(-40, 20); ctx.lineTo(10, -14); ctx.stroke(); ctx.setLineDash([]); P(ctx); ctx.arc(-38, 22, 8, 0, TAU); ctx.fill(); P(ctx); ctx.moveTo(30, -30); ctx.lineTo(4, -26); ctx.lineTo(24, -6); ctx.closePath(); ctx.fill(); ctx.stroke(); P(ctx); ctx.arc(26, -26, 16, 0, TAU); ctx.stroke(); },
    barrier(ctx) { ctx.lineWidth = 6; for (const r of [40, 26]) { P(ctx); for (let i = 0; i <= 6; i++) { const a = i * TAU / 6 + Math.PI / 6; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke(); } P(ctx); ctx.arc(0, 0, 9, 0, TAU); ctx.fill(); },
    cube(ctx) { ctx.lineWidth = 5; ctx.strokeRect(-26, -16, 34, 34); ctx.strokeRect(-12, -30, 34, 34); P(ctx); ctx.moveTo(-26, -16); ctx.lineTo(-12, -30); ctx.moveTo(8, -16); ctx.lineTo(22, -30); ctx.moveTo(8, 18); ctx.lineTo(22, 4); ctx.moveTo(-26, 18); ctx.lineTo(-12, 4); ctx.stroke(); P(ctx); ctx.arc(0, 0, 44, 0, TAU); ctx.stroke(); },
    claws(ctx) { ctx.lineWidth = 9; ctx.lineCap = 'round'; for (let i = -1; i <= 1; i++) { P(ctx); ctx.moveTo(-26 + i * 16, -34); ctx.quadraticCurveTo(-4 + i * 16, 0, 22 + i * 16, 34); ctx.stroke(); } },
    fang(ctx) { P(ctx); ctx.moveTo(-34, -24); ctx.quadraticCurveTo(0, -38, 34, -24); ctx.lineTo(20, -18); ctx.lineTo(10, 30); ctx.lineTo(2, -14); ctx.lineTo(-2, -14); ctx.lineTo(-10, 30); ctx.lineTo(-20, -18); ctx.closePath(); ctx.fill(); ctx.stroke(); },
    slash(ctx) { P(ctx); ctx.moveTo(-40, 34); ctx.quadraticCurveTo(-6, -2, 40, -36); ctx.quadraticCurveTo(0, 10, -40, 34); ctx.fill(); ctx.stroke(); ctx.lineWidth = 3; P(ctx); ctx.moveTo(-30, -20); ctx.lineTo(-14, -4); ctx.moveTo(14, 18); ctx.lineTo(30, 32); ctx.stroke(); },
    wave(ctx) { ctx.lineWidth = 7; ctx.lineCap = 'round'; for (let i = 0; i < 3; i++) { P(ctx); ctx.arc(-30, 30, 22 + i * 18, -Math.PI / 2 + 0.2, -0.2); ctx.stroke(); } for (let i = 0; i < 4; i++) { P(ctx); const a = -1.4 + i * 0.4; ctx.moveTo(-30 + Math.cos(a) * 64, 30 + Math.sin(a) * 64); ctx.lineTo(-30 + Math.cos(a) * 76, 30 + Math.sin(a) * 76); ctx.stroke(); } },
    flame(ctx) { P(ctx); ctx.moveTo(0, -44); ctx.bezierCurveTo(14, -20, 34, -8, 30, 14); ctx.bezierCurveTo(28, 34, 12, 42, 0, 42); ctx.bezierCurveTo(-14, 42, -30, 32, -30, 12); ctx.bezierCurveTo(-30, -4, -16, -12, -12, -26); ctx.bezierCurveTo(-4, -14, -2, -10, 0, -44); ctx.fill(); ctx.stroke(); P(ctx); ctx.moveTo(0, 0); ctx.bezierCurveTo(10, 12, 14, 22, 0, 34); ctx.bezierCurveTo(-12, 26, -10, 12, 0, 0); ctx.fillStyle = '#fff4c8'; ctx.fill(); },
    spear(ctx) { ctx.lineWidth = 6; P(ctx); ctx.moveTo(-36, 36); ctx.lineTo(22, -22); ctx.stroke(); P(ctx); ctx.moveTo(40, -40); ctx.lineTo(14, -26); ctx.lineTo(26, -14); ctx.closePath(); ctx.fill(); ctx.stroke(); P(ctx); ctx.moveTo(-36, 36); ctx.lineTo(-40, 22); ctx.moveTo(-36, 36); ctx.lineTo(-22, 40); ctx.stroke(); },
    execute(ctx) { ctx.lineWidth = 8; ctx.lineCap = 'round'; P(ctx); ctx.moveTo(-34, -34); ctx.lineTo(34, 34); ctx.moveTo(34, -34); ctx.lineTo(-34, 34); ctx.stroke(); P(ctx); ctx.arc(0, 0, 10, 0, TAU); ctx.fill(); },
    skull(ctx) { P(ctx); ctx.arc(0, -8, 30, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(18, 20); ctx.lineTo(18, 34); ctx.lineTo(-18, 34); ctx.lineTo(-18, 20); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#0a0410'; P(ctx); ctx.ellipse(-11, -4, 8, 10, 0, 0, TAU); ctx.ellipse(11, -4, 8, 10, 0, 0, TAU); ctx.fill(); P(ctx); ctx.moveTo(0, 8); ctx.lineTo(-5, 16); ctx.lineTo(5, 16); ctx.closePath(); ctx.fill(); },
    wolf(ctx) { P(ctx); ctx.moveTo(-30, -36); ctx.lineTo(-14, -14); ctx.lineTo(14, -14); ctx.lineTo(30, -36); ctx.lineTo(32, 0); ctx.lineTo(12, 36); ctx.lineTo(-12, 36); ctx.lineTo(-32, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; P(ctx); ctx.moveTo(-16, 2); ctx.lineTo(-6, 6); ctx.lineTo(-16, 8); ctx.fill(); P(ctx); ctx.moveTo(16, 2); ctx.lineTo(6, 6); ctx.lineTo(16, 8); ctx.fill(); },
    dragon(ctx) { ctx.lineWidth = 9; ctx.lineCap = 'round'; P(ctx); ctx.moveTo(-36, 34); ctx.bezierCurveTo(-40, 0, 20, 20, 10, -10); ctx.bezierCurveTo(4, -26, 20, -34, 30, -30); ctx.stroke(); ctx.lineWidth = 3; P(ctx); ctx.moveTo(30, -30); ctx.lineTo(42, -40); ctx.moveTo(30, -30); ctx.lineTo(44, -24); ctx.stroke(); P(ctx); ctx.arc(28, -28, 5, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); },
    portal(ctx) { P(ctx); ctx.ellipse(0, 20, 38, 12, 0, 0, TAU); ctx.fillStyle = '#12021e'; ctx.fill(); ctx.stroke(); ctx.lineWidth = 6; P(ctx); ctx.moveTo(0, 12); ctx.lineTo(0, -36); ctx.moveTo(-12, -22); ctx.lineTo(0, -36); ctx.lineTo(12, -22); ctx.stroke(); },
    crow(ctx) { P(ctx); ctx.moveTo(40, -6); ctx.lineTo(14, -2); ctx.lineTo(-10, -36); ctx.lineTo(-6, -4); ctx.lineTo(-40, -10); ctx.lineTo(-10, 8); ctx.lineTo(-4, 34); ctx.lineTo(12, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); },
    chimera(ctx) { D.wolf(ctx); ctx.lineWidth = 5; P(ctx); ctx.moveTo(-26, -20); ctx.quadraticCurveTo(-48, -30, -44, -46); ctx.moveTo(26, -20); ctx.quadraticCurveTo(48, -30, 44, -46); ctx.stroke(); },
    bond(ctx) { ctx.lineWidth = 7; P(ctx); ctx.arc(-12, 0, 20, 0, TAU); ctx.stroke(); P(ctx); ctx.arc(12, 0, 20, 0, TAU); ctx.stroke(); },
    drop(ctx) { drop(ctx, 0, -4, 40); ctx.fill(); ctx.stroke(); P(ctx); ctx.arc(-10, 4, 7, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill(); },
    lance(ctx) { ctx.lineWidth = 12; ctx.lineCap = 'round'; P(ctx); ctx.moveTo(-40, 30); ctx.lineTo(40, -30); ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; P(ctx); ctx.moveTo(-36, 27); ctx.lineTo(36, -27); ctx.stroke(); },
    spears(ctx) { for (let i = -1; i <= 1; i++) { ctx.save(); ctx.rotate(i * 0.5); ctx.lineWidth = 5; P(ctx); ctx.moveTo(0, 38); ctx.lineTo(0, -20); ctx.stroke(); P(ctx); ctx.moveTo(0, -42); ctx.lineTo(8, -18); ctx.lineTo(-8, -18); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); } },
    detonate(ctx) { star(ctx, 10, 44, 24, 0.2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#5a0010'; drop(ctx, 0, -2, 18); ctx.fill(); },
    shield(ctx) { P(ctx); ctx.moveTo(0, -42); ctx.lineTo(34, -28); ctx.quadraticCurveTo(34, 20, 0, 42); ctx.quadraticCurveTo(-34, 20, -34, -28); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.lineWidth = 4; P(ctx); ctx.moveTo(0, -30); ctx.lineTo(0, 30); ctx.moveTo(-22, -10); ctx.lineTo(22, -10); ctx.stroke(); },
    tide(ctx) { ctx.lineWidth = 7; for (let i = 0; i < 3; i++) { P(ctx); ctx.arc(0, 0, 14 + i * 13, i, i + 4.6); ctx.stroke(); } },
    bolt(ctx) { bolt(ctx, 1); ctx.fill(); ctx.stroke(); },
    dash(ctx) { ctx.save(); ctx.translate(10, 0); bolt(ctx, 0.85); ctx.fill(); ctx.stroke(); ctx.restore(); ctx.lineWidth = 6; ctx.lineCap = 'round'; P(ctx); ctx.moveTo(-44, -14); ctx.lineTo(-20, -14); ctx.moveTo(-40, 4); ctx.lineTo(-14, 4); ctx.moveTo(-44, 22); ctx.lineTo(-22, 22); ctx.stroke(); },
    storm(ctx) { P(ctx); ctx.arc(-14, -14, 16, Math.PI * 0.8, Math.PI * 2); ctx.arc(12, -18, 18, Math.PI, Math.PI * 2.1); ctx.arc(28, -2, 12, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-24, 10); ctx.arc(-26, -2, 12, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.save(); ctx.translate(0, 26); bolt(ctx, 0.45); ctx.fillStyle = '#ffe83a'; ctx.fill(); ctx.restore(); },
    dice(ctx) { P(ctx); ctx.roundRect ? ctx.roundRect(-34, -34, 68, 68, 14) : ctx.rect(-34, -34, 68, 68); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#1a0a04'; for (const [x, y] of [[-16, -16], [16, -16], [0, 0], [-16, 16], [16, 16]]) { P(ctx); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); } },
    field(ctx) { ctx.lineWidth = 5; for (const r of [14, 28, 42]) { P(ctx); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); } ctx.save(); ctx.scale(0.4, 0.4); bolt(ctx, 1); ctx.fill(); ctx.restore(); },
    fever(ctx) { star(ctx, 5, 44, 18, -Math.PI / 2); ctx.fill(); ctx.stroke(); ctx.save(); ctx.scale(0.4, 0.4); bolt(ctx, 1); ctx.fillStyle = '#1a1000'; ctx.fill(); ctx.restore(); },
    luck(ctx) { for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2); P(ctx); ctx.moveTo(0, 0); ctx.bezierCurveTo(-22, -10, -18, -40, 0, -30); ctx.bezierCurveTo(18, -40, 22, -10, 0, 0); ctx.fill(); ctx.stroke(); ctx.restore(); } },
    fist(ctx) { fist(ctx); },
    combo(ctx) { ctx.save(); ctx.translate(-10, 6); ctx.scale(0.7, 0.7); fist(ctx); ctx.restore(); ctx.lineWidth = 5; ctx.lineCap = 'round'; P(ctx); ctx.moveTo(18, -30); ctx.lineTo(40, -38); ctx.moveTo(22, -14); ctx.lineTo(44, -14); ctx.moveTo(18, 2); ctx.lineTo(40, 10); ctx.stroke(); },
    spark(ctx) { star(ctx, 6, 44, 10, 0.3); ctx.fillStyle = '#0a0006'; ctx.fill(); ctx.stroke(); P(ctx); ctx.arc(0, 0, 10, 0, TAU); ctx.fillStyle = '#ff2440'; ctx.fill(); },
    counter(ctx) { D.shield(ctx); ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; P(ctx); ctx.arc(0, 0, 50, -0.6, 0.9); ctx.stroke(); },
    barrage(ctx) { for (const [x, y, s] of [[-18, -16, 0.45], [16, -20, 0.45], [0, 14, 0.55]]) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); fist(ctx); ctx.restore(); } },
    meteor(ctx) { ctx.lineWidth = 8; ctx.lineCap = 'round'; P(ctx); ctx.moveTo(-40, -40); ctx.lineTo(4, 4); ctx.moveTo(-40, -16); ctx.lineTo(-8, 16); ctx.moveTo(-16, -40); ctx.lineTo(16, -8); ctx.stroke(); P(ctx); ctx.arc(18, 18, 20, 0, TAU); ctx.fill(); ctx.stroke(); },
    domain(ctx) { ctx.lineWidth = 6; P(ctx); ctx.moveTo(-42, -28); ctx.quadraticCurveTo(0, -38, 42, -28); ctx.stroke(); P(ctx); ctx.moveTo(-34, -18); ctx.lineTo(34, -18); ctx.stroke(); P(ctx); ctx.moveTo(-24, -26); ctx.lineTo(-24, 40); ctx.moveTo(24, -26); ctx.lineTo(24, 40); ctx.stroke(); P(ctx); ctx.ellipse(0, 12, 14, 9, 0, 0, TAU); ctx.fill(); ctx.stroke(); P(ctx); ctx.arc(0, 12, 4, 0, TAU); ctx.fillStyle = '#05030a'; ctx.fill(); },
    lock(ctx) { ctx.lineWidth = 7; P(ctx); ctx.arc(0, -10, 16, Math.PI, TAU); ctx.lineTo(16, 4); ctx.moveTo(-16, 4); ctx.lineTo(-16, -10); ctx.stroke(); P(ctx); ctx.roundRect ? ctx.roundRect(-26, 2, 52, 38, 8) : ctx.rect(-26, 2, 52, 38); ctx.fill(); ctx.stroke(); },
    heart(ctx) { P(ctx); ctx.moveTo(0, 36); ctx.bezierCurveTo(-46, 6, -36, -36, 0, -16); ctx.bezierCurveTo(36, -36, 46, 6, 0, 36); ctx.fill(); ctx.stroke(); },
    sword(ctx) { ctx.save(); ctx.rotate(Math.PI / 4); P(ctx); ctx.moveTo(0, -46); ctx.lineTo(7, -36); ctx.lineTo(7, 18); ctx.lineTo(-7, 18); ctx.lineTo(-7, -36); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillRect(-18, 18, 36, 7); ctx.strokeRect(-18, 18, 36, 7); ctx.fillRect(-4, 25, 8, 18); ctx.restore(); },
    boot(ctx) { P(ctx); ctx.moveTo(-18, -38); ctx.lineTo(8, -38); ctx.lineTo(8, 10); ctx.lineTo(36, 18); ctx.lineTo(36, 34); ctx.lineTo(-18, 34); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.lineWidth = 5; P(ctx); ctx.moveTo(-42, -18); ctx.lineTo(-26, -18); ctx.moveTo(-44, 2); ctx.lineTo(-26, 2); ctx.stroke(); },
    energy(ctx) { D.flame(ctx); ctx.lineWidth = 4; P(ctx); ctx.arc(0, 6, 40, 0.3, 2.8); ctx.stroke(); },
    clock(ctx) { P(ctx); ctx.arc(0, 0, 38, 0, TAU); ctx.fill(); ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = '#1a1030'; P(ctx); ctx.moveTo(0, 0); ctx.lineTo(0, -24); ctx.moveTo(0, 0); ctx.lineTo(18, 8); ctx.stroke(); },
    target(ctx) { ctx.lineWidth = 6; for (const r of [36, 20]) { P(ctx); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); } P(ctx); ctx.arc(0, 0, 7, 0, TAU); ctx.fill(); P(ctx); ctx.moveTo(0, -46); ctx.lineTo(0, -28); ctx.moveTo(0, 46); ctx.lineTo(0, 28); ctx.moveTo(-46, 0); ctx.lineTo(-28, 0); ctx.moveTo(46, 0); ctx.lineTo(28, 0); ctx.stroke(); },
    up(ctx) { P(ctx); ctx.moveTo(0, -42); ctx.lineTo(34, -4); ctx.lineTo(14, -4); ctx.lineTo(14, 40); ctx.lineTo(-14, 40); ctx.lineTo(-14, -4); ctx.lineTo(-34, -4); ctx.closePath(); ctx.fill(); ctx.stroke(); },
    magnet(ctx) { ctx.lineWidth = 16; P(ctx); ctx.arc(0, -4, 24, Math.PI, TAU); ctx.lineTo(24, 26); ctx.moveTo(-24, 26); ctx.lineTo(-24, -4); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(-32, 18, 16, 14); ctx.fillRect(16, 18, 16, 14); },
    reroll(ctx) { ctx.lineWidth = 8; P(ctx); ctx.arc(0, 0, 30, -0.4, 3.6); ctx.stroke(); P(ctx); ctx.moveTo(36, -26); ctx.lineTo(30, 4); ctx.lineTo(8, -14); ctx.closePath(); ctx.fill(); },
    chest(ctx) { P(ctx); ctx.rect(-36, -6, 72, 40); ctx.fill(); ctx.stroke(); P(ctx); ctx.moveTo(-38, -6); ctx.quadraticCurveTo(0, -40, 38, -6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffd27a'; ctx.fillRect(-7, -10, 14, 18); ctx.strokeRect(-7, -10, 14, 18); },
    calendar(ctx) { P(ctx); ctx.rect(-34, -26, 68, 60); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ff3a6a'; ctx.fillRect(-34, -26, 68, 16); ctx.lineWidth = 6; P(ctx); ctx.moveTo(-18, -36); ctx.lineTo(-18, -20); ctx.moveTo(18, -36); ctx.lineTo(18, -20); ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = '#1a1030'; P(ctx); ctx.moveTo(-16, 10); ctx.lineTo(-4, 22); ctx.lineTo(18, -2); ctx.stroke(); },
    gem(ctx) { P(ctx); ctx.moveTo(0, -40); ctx.lineTo(30, -10); ctx.lineTo(0, 40); ctx.lineTo(-30, -10); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.lineWidth = 3; P(ctx); ctx.moveTo(-30, -10); ctx.lineTo(30, -10); ctx.moveTo(0, -40); ctx.lineTo(-10, -10); ctx.lineTo(0, 40); ctx.lineTo(10, -10); ctx.lineTo(0, -40); ctx.stroke(); },
    seal(ctx) { P(ctx); ctx.rect(-18, -42, 36, 84); ctx.fill(); ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = '#c0101e'; P(ctx); ctx.moveTo(-8, -28); ctx.lineTo(8, -16); ctx.lineTo(-8, -4); ctx.lineTo(8, 8); ctx.lineTo(-8, 20); ctx.stroke(); P(ctx); ctx.arc(0, 32, 5, 0, TAU); ctx.fillStyle = '#c0101e'; ctx.fill(); },
    star(ctx) { star(ctx, 5, 42, 18, -Math.PI / 2); ctx.fill(); ctx.stroke(); },
    eye(ctx) { P(ctx); ctx.moveTo(-44, 0); ctx.quadraticCurveTo(0, -38, 44, 0); ctx.quadraticCurveTo(0, 38, -44, 0); ctx.fill(); ctx.stroke(); P(ctx); ctx.arc(0, 0, 14, 0, TAU); ctx.fillStyle = '#0a0410'; ctx.fill(); P(ctx); ctx.arc(-4, -4, 4, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); },
    mask(ctx) { P(ctx); ctx.ellipse(0, 0, 30, 40, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#0a0410'; P(ctx); ctx.ellipse(-11, -8, 8, 5, -0.3, 0, TAU); ctx.ellipse(11, -8, 8, 5, 0.3, 0, TAU); ctx.fill(); ctx.strokeStyle = '#c0101e'; ctx.lineWidth = 4; P(ctx); ctx.moveTo(-10, 18); ctx.quadraticCurveTo(0, 26, 10, 18); ctx.stroke(); },
    hourglass(ctx) { P(ctx); ctx.moveTo(-26, -40); ctx.lineTo(26, -40); ctx.lineTo(4, 0); ctx.lineTo(26, 40); ctx.lineTo(-26, 40); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.lineWidth = 6; P(ctx); ctx.moveTo(-32, -40); ctx.lineTo(32, -40); ctx.moveTo(-32, 40); ctx.lineTo(32, 40); ctx.stroke(); },
    bell(ctx) { P(ctx); ctx.moveTo(-30, 24); ctx.quadraticCurveTo(-26, -34, 0, -34); ctx.quadraticCurveTo(26, -34, 30, 24); ctx.closePath(); ctx.fill(); ctx.stroke(); P(ctx); ctx.arc(0, 32, 8, 0, TAU); ctx.fill(); ctx.stroke(); },
    prism(ctx) { P(ctx); ctx.moveTo(0, -40); ctx.lineTo(36, 30); ctx.lineTo(-36, 30); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.lineWidth = 5; for (const [c, o] of [['#ff3a6a', -8], ['#ffe83a', 0], ['#4fb8ff', 8]]) { ctx.strokeStyle = c; P(ctx); ctx.moveTo(10, 0); ctx.lineTo(46, o * 2); ctx.stroke(); } },
    halo(ctx) { ctx.lineWidth = 9; P(ctx); ctx.ellipse(0, 0, 40, 16, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = '#0a0410'; P(ctx); ctx.moveTo(12, -16); ctx.lineTo(6, -4); ctx.lineTo(14, 4); ctx.stroke(); },
    lotus(ctx) { for (let i = -2; i <= 2; i++) { ctx.save(); ctx.rotate(i * 0.45); P(ctx); ctx.moveTo(0, 30); ctx.bezierCurveTo(-16, 0, -10, -26, 0, -40); ctx.bezierCurveTo(10, -26, 16, 0, 0, 30); ctx.fill(); ctx.stroke(); ctx.restore(); } },
    mirror(ctx) { P(ctx); ctx.ellipse(-12, -6, 20, 30, 0, 0, TAU); ctx.fill(); ctx.stroke(); P(ctx); ctx.ellipse(12, 6, 20, 30, 0, 0, TAU); ctx.fill(); ctx.stroke(); },
    rosary(ctx) { for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; P(ctx); ctx.arc(Math.cos(a) * 30, Math.sin(a) * 30, 8, 0, TAU); ctx.fill(); ctx.stroke(); } },
    wind(ctx) { ctx.lineWidth = 7; ctx.lineCap = 'round'; P(ctx); ctx.moveTo(-40, -14); ctx.lineTo(16, -14); ctx.arc(16, -26, 12, Math.PI / 2, -Math.PI * 0.9, true); ctx.moveTo(-40, 6); ctx.lineTo(26, 6); ctx.moveTo(-30, 26); ctx.lineTo(10, 26); ctx.arc(10, 36, 10, -Math.PI / 2, Math.PI * 0.9); ctx.stroke(); },
    relic(ctx) { P(ctx); ctx.arc(0, 0, 38, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(-7, -24, 14, 48); ctx.fillRect(-24, -7, 48, 14); },
    amulet(ctx) { ctx.lineWidth = 4; P(ctx); ctx.moveTo(-26, -42); ctx.lineTo(0, -10); ctx.lineTo(26, -42); ctx.stroke(); P(ctx); ctx.moveTo(0, -12); ctx.lineTo(22, 12); ctx.lineTo(0, 42); ctx.lineTo(-22, 12); ctx.closePath(); ctx.fill(); ctx.stroke(); },
    chain(ctx) { ctx.lineWidth = 8; P(ctx); ctx.ellipse(-14, -10, 14, 22, -0.7, 0, TAU); ctx.stroke(); P(ctx); ctx.ellipse(14, 10, 14, 22, -0.7, 0, TAU); ctx.stroke(); },
    hunger(ctx) { D.fang(ctx); },
    trophy(ctx) { P(ctx); ctx.moveTo(-24, -36); ctx.lineTo(24, -36); ctx.lineTo(20, 0); ctx.quadraticCurveTo(0, 14, -20, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.lineWidth = 6; P(ctx); ctx.arc(-26, -18, 10, Math.PI / 2, -Math.PI / 2); ctx.moveTo(26, -28); ctx.arc(26, -18, 10, -Math.PI / 2, Math.PI / 2); ctx.stroke(); ctx.fillRect(-6, 6, 12, 16); ctx.fillRect(-20, 24, 40, 10); },
    check(ctx) { ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; P(ctx); ctx.moveTo(-30, 2); ctx.lineTo(-8, 26); ctx.lineTo(32, -24); ctx.stroke(); },
    pause(ctx) { ctx.fillRect(-22, -30, 14, 60); ctx.fillRect(8, -30, 14, 60); },
    emblem(ctx) { D.vortex(ctx); },
  };

  // technique / artifact / misc -> icon
  const MAP = {
    sp_basic: 'orb', sp_barrier: 'barrier', sp_blue: 'vortex', sp_red: 'burst', sp_void: 'void', sp_blink: 'blink', sp_ult: 'cube', sp_domain: 'domain',
    kg_basic: 'claws', kg_hunger: 'fang', kg_slash: 'slash', kg_cleave: 'wave', kg_spear: 'flame', kg_exec: 'execute', kg_ult: 'skull', kg_domain: 'domain',
    sh_basic: 'fang', sh_bond: 'bond', sh_hounds: 'wolf', sh_wyrm: 'dragon', sh_step: 'portal', sh_legion: 'crow', sh_ult: 'chimera', sh_domain: 'domain',
    bl_basic: 'drop', bl_mark: 'target', bl_beam: 'lance', bl_spears: 'spears', bl_hemo: 'detonate', bl_shield: 'shield', bl_ult: 'tide', bl_domain: 'domain',
    lg_basic: 'bolt', lg_luck: 'luck', lg_dash: 'dash', lg_storm: 'storm', lg_roulette: 'dice', lg_tesla: 'field', lg_ult: 'fever', lg_domain: 'domain',
    bs_basic: 'combo', bs_spark: 'spark', bs_dash: 'fist', bs_counter: 'counter', bs_fist: 'burst', bs_barrage: 'barrage', bs_ult: 'meteor', bs_domain: 'domain',
    sp_polarity: 'void', sp_absolute: 'barrier', kg_dismantle: 'slash', kg_hellfire: 'flame', sh_army: 'wolf', sh_nightmare: 'dragon',
    bl_cascade: 'spears', bl_barrage: 'drop', lg_electric: 'dash', lg_overcharge: 'storm', bs_chain: 'chain', bs_counter: 'counter',
    // artifacts
    amp: 'energy', amulet: 'amulet', gloves: 'fist', wind: 'wind', relic: 'relic', sealed: 'seal', lotus: 'lotus', hourglass: 'hourglass', mask: 'mask',
    fang: 'fang', bell: 'bell', prism: 'prism', eye: 'eye', magnet: 'magnet', rosary: 'rosary', clock: 'clock', mirror: 'mirror', heart: 'heart',
    halo: 'halo', die: 'dice', finger: 'claws', chain: 'chain', ember: 'flame',
    // stats / meta
    might: 'sword', vital: 'heart', swift: 'boot', focus: 'clock', precise: 'target', flow: 'energy', guard: 'shield', expanse: 'field', regen: 'relic', feast: 'star',
    hp: 'heart', dmg: 'sword', spd: 'boot', def: 'shield', ce: 'energy', cd: 'clock', crit: 'target', lvl: 'up', reroll: 'reroll',
    // characters
    char_spatial: 'vortex', char_king: 'claws', char_shadow: 'wolf', char_blood: 'drop', char_lightning: 'bolt', char_striker: 'fist',
  };

  const cache = {};
  const Icons = {
    D, MAP,
    id(key) { return MAP[key] || (D[key] ? key : 'star'); },
    // draw on canvas: centre x,y; size in px; colour
    draw(ctx, key, x, y, size, color, opts) {
      const d = D[this.id(key)];
      ctx.save();
      ctx.translate(x, y);
      const s = size / 100;
      ctx.scale(s, s);
      ctx.fillStyle = (opts && opts.fill) || '#ffffff';
      ctx.strokeStyle = color || '#ffffff';
      ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (opts && opts.alpha != null) ctx.globalAlpha = opts.alpha;
      d(ctx);
      ctx.restore();
    },
    // cached glowing icon for DOM <img>
    url(key, color, px) {
      px = px || 96; color = color || '#ffffff';
      const k = key + '|' + color + '|' + px;
      if (cache[k]) return cache[k];
      const c = document.createElement('canvas');
      c.width = c.height = px;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
      gr.addColorStop(0, CA.U.hexA(color, 0.35)); gr.addColorStop(1, CA.U.hexA(color, 0));
      g.fillStyle = gr; g.fillRect(0, 0, px, px);
      this.draw(g, key, px / 2, px / 2, px * 0.78, color, { fill: CA.U.mixHex(color, '#ffffff', 0.55) });
      cache[k] = c.toDataURL();
      return cache[k];
    },
    img(key, color, cls) { return '<img class="ico ' + (cls || '') + '" src="' + this.url(key, color) + '" alt="">'; },
  };
  CA.Icons = Icons;
})();
