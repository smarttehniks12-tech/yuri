/* sprites.js — original procedural art: anime-style sorcerers + cursed spirit sprites (cached to offscreen canvases) */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U;
  const TAU = U.TAU;
  const OUT = '#0b0710';

  // ============ CHARACTER STYLES ============
  const STYLE = {
    spatial: {
      skin: '#f3dccb', hair: '#f4f7ff', hairDark: '#a9b8d8', outfit: '#1b2140', outfitDark: '#0d1024', trim: '#3b4a8a',
      accent: '#4fb8ff', eye: '#8fe3ff', coat: 'long', shoulder: 7, hairStyle: 'upSpikes', face: 'blindfold',
    },
    king: {
      skin: '#f0d0bd', hair: '#ff7a9a', hairDark: '#b33a5a', outfit: '#efe6da', outfitDark: '#8f8678', trim: '#2a0b10',
      accent: '#ff2a3d', eye: '#ff3a3a', coat: 'kimono', shoulder: 7.5, hairStyle: 'backSpikes', face: 'markings',
    },
    shadow: {
      skin: '#ead3c2', hair: '#17141f', hairDark: '#05040a', outfit: '#141225', outfitDark: '#07060e', trim: '#3c2f6e',
      accent: '#8f5bff', eye: '#b58cff', coat: 'jacket', shoulder: 6.5, hairStyle: 'messy', face: 'calm',
    },
    blood: {
      skin: '#f1d6c8', hair: '#1a1014', hairDark: '#060305', outfit: '#e9e0dc', outfitDark: '#8b1a2b', trim: '#b0122c',
      accent: '#ff1f44', eye: '#ff4466', coat: 'robe', shoulder: 6.5, hairStyle: 'ponytail', face: 'bloodmark',
    },
    lightning: {
      skin: '#efd1b8', hair: '#ffe066', hairDark: '#c99a1a', outfit: '#d8dbe6', outfitDark: '#2a2c38', trim: '#ffd21a',
      accent: '#ffe83a', eye: '#ffe066', coat: 'openJacket', shoulder: 7, hairStyle: 'pompadour', face: 'grin',
    },
    striker: {
      skin: '#d9a888', hair: '#1a1416', hairDark: '#070506', outfit: '#121014', outfitDark: '#050405', trim: '#c4122a',
      accent: '#ff2440', eye: '#ffffff', coat: 'gi', shoulder: 9, hairStyle: 'buzz', face: 'scar',
    },
  };

  function limb(ctx, x, y, a, len, w, col) {
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUT; ctx.lineWidth = w + 2.4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
    return [x2, y2];
  }
  function limb2(ctx, x, y, a1, l1, a2, l2, w, col, col2) { // two-segment limb
    const [kx, ky] = limb(ctx, x, y, a1, l1, w, col);
    const e = limb(ctx, kx, ky, a2, l2, w * 0.92, col2 || col);
    return e;
  }

  function spikes(ctx, cx, cy, r, list, fill, dark) {
    // list: [angleFromUp(rad), len, width(rad)]
    const gr = ctx.createLinearGradient(cx, cy - r - 14, cx, cy + r);
    gr.addColorStop(0, fill); gr.addColorStop(1, dark);
    ctx.fillStyle = gr;
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < list.length; i++) {
      const [a, len, w] = list[i];
      const a0 = a - w, a1 = a + w;
      const bx0 = cx + Math.sin(a0) * r, by0 = cy - Math.cos(a0) * r;
      const tx = cx + Math.sin(a) * (r + len), ty = cy - Math.cos(a) * (r + len);
      const bx1 = cx + Math.sin(a1) * r, by1 = cy - Math.cos(a1) * r;
      if (i === 0) ctx.moveTo(bx0, by0); else ctx.lineTo(bx0, by0);
      ctx.lineTo(tx, ty); ctx.lineTo(bx1, by1);
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  function drawHair(ctx, s, hx, hy, R, t, id) {
    switch (s.hairStyle) {
      case 'upSpikes': {
        const w = Math.sin(t * 3) * 0.04;
        spikes(ctx, hx, hy, R * 0.98, [
          [-1.75, 5, 0.32], [-1.25, 9, 0.3], [-0.8, 13, 0.28], [-0.35 + w, 16, 0.26], [0.1 + w, 17, 0.26],
          [0.55 + w, 15, 0.27], [1.0, 11, 0.28], [1.45, 7, 0.3], [1.85, 4, 0.3],
        ], s.hair, s.hairDark);
        break;
      }
      case 'backSpikes': {
        spikes(ctx, hx, hy, R * 0.96, [
          [-1.9, 7, 0.32], [-1.4, 10, 0.3], [-0.95, 10, 0.3], [-0.45, 9, 0.3], [0.05, 8, 0.32], [0.55, 6, 0.32], [1.1, 4, 0.34], [1.6, 2.5, 0.35],
        ], s.hair, s.hairDark);
        break;
      }
      case 'messy': {
        const w = Math.sin(t * 2) * 0.05;
        spikes(ctx, hx, hy, R * 0.98, [
          [-2.1, 7, 0.3], [-1.6, 10, 0.28], [-1.1 + w, 12, 0.28], [-0.6, 13, 0.27], [-0.1 + w, 12, 0.3], [0.4, 12, 0.28],
          [0.9 + w, 10, 0.3], [1.35, 8, 0.3], [1.8, 6, 0.3], [2.3, 4, 0.3],
        ], s.hair, s.hairDark);
        break;
      }
      case 'ponytail': {
        // ponytail behind (to the left when facing right), flowing
        const sway = Math.sin(t * 4) * 3;
        ctx.fillStyle = s.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(hx - R * 0.5, hy - R * 0.9);
        ctx.quadraticCurveTo(hx - R * 2.2, hy - R * 0.6 + sway, hx - R * 2.0 + sway, hy + R * 1.7);
        ctx.quadraticCurveTo(hx - R * 1.2, hy + R * 0.6, hx - R * 0.6, hy - R * 0.2);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // tie
        ctx.fillStyle = s.trim; ctx.beginPath(); ctx.arc(hx - R * 0.65, hy - R * 0.75, 2.2, 0, TAU); ctx.fill();
        spikes(ctx, hx, hy, R * 0.98, [[-1.6, 3, 0.4], [-0.9, 4, 0.4], [-0.2, 4, 0.4], [0.5, 3, 0.4], [1.2, 2, 0.4], [1.8, 1, 0.4]], s.hair, s.hairDark);
        // bangs
        ctx.fillStyle = s.hair;
        ctx.beginPath(); ctx.moveTo(hx + R * 0.1, hy - R * 0.9); ctx.lineTo(hx + R * 1.05, hy - R * 0.1); ctx.lineTo(hx + R * 0.55, hy - R * 0.35); ctx.closePath(); ctx.fill();
        break;
      }
      case 'pompadour': {
        spikes(ctx, hx, hy, R * 0.97, [
          [-1.8, 3, 0.4], [-1.2, 5, 0.38], [-0.6, 7, 0.36], [0.0, 8, 0.36], [0.55, 10, 0.32], [1.05, 9, 0.28],
        ], s.hair, s.hairDark);
        // slick curl front
        ctx.strokeStyle = s.hairDark; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(hx + R * 0.7, hy - R * 1.2, 4, -2.5, 0.6); ctx.stroke();
        break;
      }
      case 'buzz': {
        ctx.fillStyle = s.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(hx, hy - 1, R * 1.02, Math.PI * 1.02, Math.PI * 2.02); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.arc(hx + 2, hy - R * 0.6, R * 0.5, Math.PI, TAU); ctx.fill();
        break;
      }
    }
  }

  function drawFace(ctx, s, hx, hy, R, t, st) {
    const blink = (Math.sin(t * 1.7 + 1) > 0.985) ? 0.2 : 1;
    const ex1 = hx + R * 0.25, ex2 = hx + R * 0.72, ey = hy + R * 0.05;
    switch (s.face) {
      case 'blindfold': {
        ctx.fillStyle = '#07070c';
        ctx.beginPath(); ctx.moveTo(hx - R * 1.0, ey - 3.2); ctx.lineTo(hx + R * 1.02, ey - 3.6); ctx.lineTo(hx + R * 1.02, ey + 2.6); ctx.lineTo(hx - R * 1.0, ey + 2.8); ctx.closePath(); ctx.fill();
        // knot trailing
        ctx.strokeStyle = '#07070c'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(hx - R, ey); ctx.quadraticCurveTo(hx - R - 6, ey + 2 + Math.sin(t * 5) * 2, hx - R - 10, ey + 6); ctx.stroke();
        // leak glow
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.2;
        ctx.drawImage(CA.FX.getGlow(s.accent), ex2 - 6, ey - 6, 12, 12);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        break;
      }
      default: {
        // eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(ex1, ey, 2.0, 2.4 * blink, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(ex2, ey, 1.6, 2.2 * blink, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = s.eye;
        ctx.beginPath(); ctx.ellipse(ex1 + 0.5, ey + 0.2, 1.3, 1.7 * blink, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(ex2 + 0.4, ey + 0.2, 1.1, 1.5 * blink, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.fillRect(ex1 + 0.3, ey - 0.6 * blink, 0.9, 1.2 * blink);
        ctx.fillRect(ex2 + 0.2, ey - 0.6 * blink, 0.8, 1.2 * blink);
        // brows
        ctx.strokeStyle = OUT; ctx.lineWidth = 1.1;
        const angry = s.face === 'markings' || s.face === 'scar' ? 0.8 : 0;
        ctx.beginPath(); ctx.moveTo(ex1 - 2, ey - 3.6 - angry * 0.4); ctx.lineTo(ex1 + 2, ey - 3.2 + angry); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex2 - 1.5, ey - 3.0 + angry); ctx.lineTo(ex2 + 2, ey - 3.6); ctx.stroke();
        if (s.face === 'markings') {
          ctx.strokeStyle = '#1a0a10'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(ex1 - 1.5, ey + 3); ctx.lineTo(ex1 + 1.5, ey + 3.5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ex2 - 1.2, ey + 3); ctx.lineTo(ex2 + 1.5, ey + 3.4); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(hx + R * 0.3, hy - R * 0.55); ctx.lineTo(hx + R * 0.6, hy - R * 0.45); ctx.stroke();
          // second pair of eyes (lower, faint)
          ctx.fillStyle = s.accent; ctx.globalAlpha = 0.85;
          ctx.fillRect(ex1 - 0.2, ey + 5, 1.6, 0.9); ctx.fillRect(ex2 - 0.2, ey + 5, 1.3, 0.9);
          ctx.globalAlpha = 1;
          // grin
          ctx.strokeStyle = OUT; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(hx + R * 0.25, hy + R * 0.62); ctx.quadraticCurveTo(hx + R * 0.55, hy + R * 0.82, hx + R * 0.9, hy + R * 0.5); ctx.stroke();
        } else if (s.face === 'bloodmark') {
          ctx.fillStyle = s.accent;
          ctx.fillRect(hx + R * 0.35, hy - R * 0.15, 3.5, 1.2);
          ctx.strokeStyle = OUT; ctx.lineWidth = 0.9;
          ctx.beginPath(); ctx.moveTo(hx + R * 0.35, hy + R * 0.6); ctx.lineTo(hx + R * 0.75, hy + R * 0.58); ctx.stroke();
        } else if (s.face === 'grin') {
          ctx.fillStyle = '#fff'; ctx.strokeStyle = OUT; ctx.lineWidth = 0.9;
          ctx.beginPath(); ctx.moveTo(hx + R * 0.2, hy + R * 0.5); ctx.quadraticCurveTo(hx + R * 0.6, hy + R * 0.85, hx + R * 0.95, hy + R * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
        } else if (s.face === 'scar') {
          ctx.strokeStyle = '#8a3a3a'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(ex2 - 1, ey - 6); ctx.lineTo(ex2 + 2, ey + 5); ctx.stroke();
          ctx.strokeStyle = OUT; ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.moveTo(hx + R * 0.3, hy + R * 0.62); ctx.lineTo(hx + R * 0.8, hy + R * 0.6); ctx.stroke();
        } else {
          ctx.strokeStyle = OUT; ctx.lineWidth = 0.9;
          ctx.beginPath(); ctx.moveTo(hx + R * 0.35, hy + R * 0.6); ctx.lineTo(hx + R * 0.7, hy + R * 0.6); ctx.stroke();
        }
        if (st && st.eyeGlow) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = st.eyeGlow;
          ctx.drawImage(CA.FX.getGlow(s.accent), ex1 - 5, ey - 5, 10, 10);
          ctx.drawImage(CA.FX.getGlow(s.accent), ex2 - 4, ey - 4, 8, 8);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }
      }
    }
  }

  function torso(ctx, s, sy, hipY, bob) {
    const sw = s.shoulder;
    const top = sy, bottom = hipY;
    const gr = ctx.createLinearGradient(-sw, top, sw, bottom);
    gr.addColorStop(0, s.outfit); gr.addColorStop(1, s.outfitDark);
    ctx.fillStyle = gr; ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    ctx.beginPath();
    switch (s.coat) {
      case 'long': // high collar long coat
        ctx.moveTo(-sw, top); ctx.lineTo(sw, top);
        ctx.lineTo(sw + 2.5, bottom + 11 + bob); ctx.lineTo(-sw - 3.5, bottom + 12 + bob);
        break;
      case 'kimono':
        ctx.moveTo(-sw, top); ctx.lineTo(sw, top); ctx.lineTo(sw + 1.5, bottom + 2); ctx.lineTo(-sw - 1.5, bottom + 2);
        break;
      case 'robe':
        ctx.moveTo(-sw, top); ctx.lineTo(sw, top); ctx.lineTo(sw + 4, bottom + 13 + bob); ctx.lineTo(-sw - 5, bottom + 14 + bob);
        break;
      case 'gi':
        ctx.moveTo(-sw - 1, top); ctx.lineTo(sw + 1, top); ctx.lineTo(sw - 1, bottom + 2); ctx.lineTo(-sw + 1, bottom + 2);
        break;
      default:
        ctx.moveTo(-sw, top); ctx.lineTo(sw, top); ctx.lineTo(sw + 1, bottom + 3); ctx.lineTo(-sw - 1, bottom + 3);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // details
    ctx.lineWidth = 1.2;
    switch (s.coat) {
      case 'long':
        ctx.fillStyle = s.outfitDark; ctx.fillRect(-sw + 1, top - 3, sw * 2 - 2, 4); // high collar
        ctx.strokeStyle = s.trim; ctx.beginPath(); ctx.moveTo(1, top + 2); ctx.lineTo(1.5, bottom + 10); ctx.stroke();
        ctx.fillStyle = '#c9b46a'; ctx.beginPath(); ctx.arc(2.5, top + 1, 1.2, 0, TAU); ctx.fill();
        break;
      case 'kimono':
        ctx.strokeStyle = s.outfitDark; ctx.beginPath(); ctx.moveTo(-sw + 2, top); ctx.lineTo(3, top + 9); ctx.lineTo(sw - 1, top); ctx.stroke();
        ctx.fillStyle = s.trim; ctx.fillRect(-sw - 1, bottom - 4, sw * 2 + 2, 4.5); // sash
        break;
      case 'robe':
        ctx.strokeStyle = s.trim; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-sw + 1, top + 1); ctx.lineTo(sw - 1, bottom - 2); ctx.stroke();
        ctx.fillStyle = s.trim; ctx.fillRect(-sw - 1, top - 2, sw * 2 + 2, 3.5); // scarf
        break;
      case 'openJacket':
        ctx.fillStyle = s.outfitDark; ctx.beginPath(); ctx.moveTo(-1.5, top); ctx.lineTo(3.5, top); ctx.lineTo(4, bottom + 2); ctx.lineTo(-2, bottom + 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = s.trim; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-1.5, top); ctx.lineTo(-2, bottom + 2); ctx.moveTo(3.5, top); ctx.lineTo(4, bottom + 2); ctx.stroke();
        break;
      case 'gi':
        ctx.strokeStyle = '#2a262c'; ctx.beginPath(); ctx.moveTo(-sw + 1, top); ctx.lineTo(2, top + 8); ctx.lineTo(sw - 1, top); ctx.stroke();
        ctx.fillStyle = s.trim; ctx.fillRect(-sw, bottom - 3.5, sw * 2, 3.5); // red belt
        break;
      case 'jacket':
        ctx.strokeStyle = s.trim; ctx.beginPath(); ctx.moveTo(0.5, top + 1); ctx.lineTo(0.5, bottom + 2); ctx.stroke();
        ctx.fillStyle = s.outfitDark; ctx.fillRect(-sw + 1, top - 2.5, sw * 2 - 2, 3);
        break;
    }
  }

  /* st: { t, move, face, atk(0..1), aimA, cast(0..1), hurt(0..1), extraArms, alpha, scale } */
  function drawCharacter(ctx, id, x, y, st) {
    const s = STYLE[id] || STYLE.spatial;
    const t = st.t || 0, mv = st.move || 0, face = st.face || 1;
    ctx.save();
    ctx.translate(x, y);
    if (st.scale) ctx.scale(st.scale, st.scale);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); ctx.ellipse(0, 1, 13, 4.5, 0, 0, TAU); ctx.fill();
    // aura at feet
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 3) + (st.cast || 0) * 0.4;
    ctx.drawImage(CA.FX.getSoft(s.accent), -22, -14, 44, 28);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (id === 'shadow') { // swirling shadow puddle
      ctx.fillStyle = 'rgba(20,6,40,0.75)';
      ctx.beginPath(); ctx.ellipse(0, 1, 17 + Math.sin(t * 2) * 1.5, 5.5, 0, 0, TAU); ctx.fill();
    }
    ctx.scale(face, 1);
    if (st.alpha != null) ctx.globalAlpha = st.alpha;

    const phase = t * 11;
    const sw = Math.sin(phase) * 0.75 * mv;
    const bob = Math.abs(Math.sin(phase)) * -1.6 * mv + Math.sin(t * 2.2) * 0.4 * (1 - mv);
    const hipY = -17 + bob, shY = -31 + bob;
    const legW = id === 'striker' ? 5.2 : 4.2;
    const pants = (s.coat === 'kimono') ? '#3a1018' : (id === 'blood' ? '#2a0d14' : (id === 'lightning' ? '#2a2c38' : s.outfitDark));
    const shoe = '#0d0a0f';

    // back leg
    limb2(ctx, -1.5, hipY, Math.PI / 2 - sw, 9, Math.PI / 2 - sw * 0.4 + Math.max(0, sw) * 0.6, 9, legW, pants, shoe);
    // back arm
    const atk = st.atk || 0, cast = st.cast || 0;
    const armCol = id === 'striker' ? s.skin : s.outfitDark;
    const backArmA = Math.PI / 2 + sw * 0.9 + 0.15 - cast * 2.0;
    const be = limb2(ctx, -s.shoulder + 1.5, shY + 2, backArmA, 7.5, backArmA - 0.3 - cast * 0.3, 7, 3.6, armCol, id === 'striker' ? '#e8e2d8' : s.skin);
    if (cast > 0.05) CA.FX.glow(ctx, be[0], be[1], 8 + cast * 6, s.accent, 0.8 * cast);
    // front leg
    limb2(ctx, 1.5, hipY, Math.PI / 2 + sw, 9, Math.PI / 2 + sw * 0.4 - Math.max(0, -sw) * 0.6, 9, legW, pants, shoe);
    // torso
    torso(ctx, s, shY, hipY, bob);
    // extra arms (cursed king ult)
    if (st.extraArms) {
      limb2(ctx, -s.shoulder + 2, shY + 7, Math.PI * 0.85 + Math.sin(t * 9) * 0.3, 8, Math.PI * 1.1, 7, 3.2, s.skin, s.skin);
      limb2(ctx, s.shoulder - 2, shY + 7, Math.PI * 0.15 - Math.sin(t * 9) * 0.3, 8, -0.1, 7, 3.2, s.skin, s.skin);
    }
    // head
    const R = 9.5, hx = 1.2, hy = shY - 10.5;
    if (s.hairStyle === 'ponytail') drawHair(ctx, s, hx, hy, R, t, id); // ponytail behind head
    ctx.fillStyle = s.skin; ctx.strokeStyle = OUT; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(hx, hy, R * 0.98, R, 0, 0, TAU); ctx.fill(); ctx.stroke();
    // cheek shade
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.beginPath(); ctx.ellipse(hx - R * 0.45, hy + 1, R * 0.45, R * 0.75, 0, 0, TAU); ctx.fill();
    drawFace(ctx, s, hx, hy, R, t, st);
    if (s.hairStyle !== 'ponytail') drawHair(ctx, s, hx, hy, R, t, id);
    // front arm (attack arm)
    let fa1, fa2;
    if (atk > 0) {
      let aim = st.aimA || 0;
      // convert world aim to local (we're flipped by face)
      let ax = Math.cos(aim) * face, ay = Math.sin(aim);
      const la = Math.atan2(ay, ax);
      const ext = Math.sin(Math.min(1, atk) * Math.PI);
      fa1 = U.lerp(Math.PI / 2 + 0.2, la, ext);
      fa2 = U.lerp(Math.PI / 2 - 0.2, la, ext);
    } else if (cast > 0) {
      fa1 = -Math.PI / 2 + 0.6 - cast * 0.3; fa2 = -Math.PI / 2 + 0.2;
    } else {
      fa1 = Math.PI / 2 - sw * 0.9 - 0.15; fa2 = fa1 - 0.35;
    }
    const fe = limb2(ctx, s.shoulder - 1.5, shY + 2, fa1, 7.5, fa2, 7, 3.8, id === 'striker' ? s.skin : s.outfit, s.skin);
    if (id === 'striker' || id === 'king') { // fists / claws glow
      ctx.fillStyle = id === 'striker' ? '#efe6dc' : s.skin;
      ctx.beginPath(); ctx.arc(fe[0], fe[1], id === 'striker' ? 3.2 : 2.2, 0, TAU); ctx.fill();
    }
    if (atk > 0.1 || cast > 0.1) CA.FX.glow(ctx, fe[0], fe[1], 10 + Math.max(atk, cast) * 8, s.accent, 0.9);
    ctx.restore();
    // hurt flash overlay (white blink handled by alpha)
  }

  // ============ ENEMY SPRITES ============
  function eye(ctx, x, y, r, iris, look) {
    ctx.fillStyle = '#f4efe6'; ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1, r * 0.18);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
    // veins
    ctx.strokeStyle = 'rgba(200,30,40,0.55)'; ctx.lineWidth = Math.max(0.5, r * 0.07);
    for (let i = 0; i < 4; i++) { const a = i * 1.7 + 0.4; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95); ctx.lineTo(x + Math.cos(a + 0.3) * r * 0.55, y + Math.sin(a + 0.3) * r * 0.55); ctx.stroke(); }
    const lx = (look || 0.25) * r;
    ctx.fillStyle = iris; ctx.beginPath(); ctx.arc(x + lx, y, r * 0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#050205'; ctx.beginPath(); ctx.ellipse(x + lx, y, r * 0.16, r * 0.38, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(x + lx - r * 0.18, y - r * 0.2, r * 0.12, 0, TAU); ctx.fill();
  }
  function teeth(ctx, x, y, w, h, n, up) {
    ctx.fillStyle = '#efe8d6';
    for (let i = 0; i < n; i++) {
      const tx = x - w / 2 + (i + 0.5) * (w / n);
      ctx.beginPath(); ctx.moveTo(tx - w / n / 2, y); ctx.lineTo(tx, y + (up ? -h : h)); ctx.lineTo(tx + w / n / 2, y); ctx.closePath(); ctx.fill();
    }
  }
  function blob(ctx, r, col1, col2, bumps, wob, seed) {
    const gr = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
    gr.addColorStop(0, col1); gr.addColorStop(1, col2);
    ctx.fillStyle = gr; ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.5, r * 0.09);
    ctx.beginPath();
    const n = 28;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const rr = r * (1 + Math.sin(a * bumps + seed) * wob + Math.sin(a * (bumps + 3) + seed * 2) * wob * 0.5);
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  const EDRAW = {
    larva(ctx, r, f) {
      const w = f ? 1.08 : 0.94;
      // tail segments
      for (let i = 3; i >= 1; i--) {
        ctx.fillStyle = i % 2 ? '#8b7d9e' : '#a596b7'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(-r * 0.55 * i, Math.sin(i + f * 2) * r * 0.12, r * (0.75 - i * 0.12), r * (0.7 - i * 0.1) * w, 0, 0, TAU); ctx.fill(); ctx.stroke();
      }
      ctx.save(); ctx.scale(1, w); blob(ctx, r, '#d8cde6', '#6f5f86', 3, 0.05, 1); ctx.restore();
      eye(ctx, r * 0.15, -r * 0.2, r * 0.48, '#e02a3a', 0.3);
      ctx.fillStyle = '#2a0a12'; ctx.beginPath(); ctx.ellipse(r * 0.25, r * 0.45, r * 0.42, r * (f ? 0.22 : 0.12), 0, 0, TAU); ctx.fill();
      teeth(ctx, r * 0.25, r * 0.38, r * 0.7, r * 0.15, 5, false);
    },
    golem(ctx, r, f) {
      // stubby arms
      ctx.fillStyle = '#5a1e2c'; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(-r * 0.95, r * 0.25 + (f ? 2 : -2), r * 0.32, r * 0.5, 0.4, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(r * 0.95, r * 0.25 + (f ? -2 : 2), r * 0.32, r * 0.5, -0.4, 0, TAU); ctx.fill(); ctx.stroke();
      blob(ctx, r, '#9c4a5a', '#3a0f1c', 5, 0.07, 3);
      // stitches
      ctx.strokeStyle = '#1a0508'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.5); ctx.quadraticCurveTo(0, -r * 0.1, r * 0.55, -r * 0.6); ctx.stroke();
      for (let i = 0; i < 6; i++) { const tx = -r * 0.5 + i * r * 0.2; ctx.beginPath(); ctx.moveTo(tx, -r * 0.48 + Math.abs(i - 2.5) * 0.04 * r); ctx.lineTo(tx + 2, -r * 0.3); ctx.stroke(); }
      const eyes = [[-0.45, -0.05, 0.15], [-0.1, 0.1, 0.2], [0.3, -0.05, 0.17], [0.55, 0.2, 0.11], [-0.65, 0.25, 0.1], [0.1, -0.35, 0.1]];
      for (const e of eyes) eye(ctx, e[0] * r, e[1] * r, e[2] * r, '#e8c21a', 0.2);
      ctx.fillStyle = '#1a0408'; ctx.beginPath(); ctx.ellipse(0, r * 0.55, r * 0.5, r * (f ? 0.18 : 0.1), 0, 0, TAU); ctx.fill();
      teeth(ctx, 0, r * 0.48, r * 0.8, r * 0.14, 7, false);
    },
    eyebat(ctx, r, f) {
      const up = f ? -1 : 0.3;
      ctx.fillStyle = '#3a1f4a'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * r * 0.6, 0);
        ctx.lineTo(sx * r * 1.9, -r * 0.9 * up - r * 0.3);
        ctx.lineTo(sx * r * 1.6, r * 0.1 - r * 0.2 * up);
        ctx.lineTo(sx * r * 1.25, -r * 0.1 * up);
        ctx.lineTo(sx * r * 1.05, r * 0.45);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      eye(ctx, 0, 0, r, '#7a2cff', 0.25);
      ctx.fillStyle = '#3a1f4a';
      ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.95); ctx.lineTo(-r * 0.15, -r * 1.35); ctx.lineTo(0, -r * 0.98); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.05, -r * 0.98); ctx.lineTo(r * 0.25, -r * 1.35); ctx.lineTo(r * 0.35, -r * 0.92); ctx.fill();
    },
    spitter(ctx, r, f) {
      blob(ctx, r, '#8fbf6a', '#2c4a1a', 4, 0.06, 5);
      // huge mouth with lips
      const open = f ? 0.55 : 0.3;
      ctx.fillStyle = '#c24a6a'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(r * 0.2, r * 0.15, r * 0.72, r * open + 3, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a0610'; ctx.beginPath(); ctx.ellipse(r * 0.2, r * 0.15, r * 0.56, r * open * 0.75, 0, 0, TAU); ctx.fill();
      teeth(ctx, r * 0.2, r * 0.15 - r * open * 0.7, r * 0.9, r * 0.2, 6, false);
      teeth(ctx, r * 0.2, r * 0.15 + r * open * 0.7, r * 0.9, r * 0.2, 6, true);
      ctx.fillStyle = '#b5ff3a';
      ctx.beginPath(); ctx.arc(r * 0.35, r * 0.15 + r * open * 0.7 + 3, 2.2, 0, TAU); ctx.fill();
      eye(ctx, -r * 0.35, -r * 0.6, r * 0.22, '#ffcc00', 0.3);
      eye(ctx, r * 0.25, -r * 0.7, r * 0.18, '#ffcc00', 0.3);
    },
    bloater(ctx, r, f) {
      const s = f ? 1.08 : 1;
      ctx.save(); ctx.scale(s, s);
      blob(ctx, r, '#ffb26a', '#8a2a10', 6, 0.05, 7);
      ctx.strokeStyle = '#ff5a1a'; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.8;
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(Math.cos(a + 0.4) * r * 0.5, Math.sin(a + 0.4) * r * 0.5, Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      ctx.fillStyle = '#2a0a04';
      ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.15, r * 0.1, 0, TAU); ctx.arc(r * 0.2, -r * 0.15, r * 0.1, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(0, r * 0.2, r * 0.15, 0, Math.PI); ctx.fill();
    },
    warden(ctx, r, f) {
      // robed body
      ctx.fillStyle = '#20182c'; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.2);
      ctx.quadraticCurveTo(r * 1.1, -r * 0.6, r * 0.95, r * 1.0);
      ctx.lineTo(r * 0.4, r * 0.8 + (f ? 3 : 0)); ctx.lineTo(0, r * 1.1); ctx.lineTo(-r * 0.4, r * 0.8 + (f ? 0 : 3)); ctx.lineTo(-r * 0.95, r * 1.0);
      ctx.quadraticCurveTo(-r * 1.1, -r * 0.6, 0, -r * 1.2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#6a4aa8'; ctx.fillRect(-r * 0.8, r * 0.1, r * 1.6, r * 0.14);
      ctx.fillStyle = '#ff3a6a';
      ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.55, r * 0.1, 0, TAU); ctx.arc(r * 0.25, -r * 0.55, r * 0.1, 0, TAU); ctx.fill();
    },
    flicker(ctx, r, f) {
      ctx.strokeStyle = '#0a0610'; ctx.lineCap = 'round';
      // long limbs
      ctx.lineWidth = r * 0.22;
      ctx.beginPath(); ctx.moveTo(-r * 0.3, 0); ctx.lineTo(-r * 1.0, r * 0.9 + (f ? 2 : 0)); ctx.lineTo(-r * 1.2, r * 1.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.3, 0); ctx.lineTo(r * 1.0, r * 0.9 + (f ? 0 : 2)); ctx.lineTo(r * 1.3, r * 1.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.15, r * 0.6); ctx.lineTo(-r * 0.35, r * 1.8); ctx.moveTo(r * 0.15, r * 0.6); ctx.lineTo(r * 0.35, r * 1.8); ctx.stroke();
      ctx.fillStyle = '#100a18'; ctx.beginPath(); ctx.ellipse(0, r * 0.2, r * 0.45, r * 0.75, 0, 0, TAU); ctx.fill();
      // white face with smile
      ctx.fillStyle = '#ece6f4'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(0, -r * 0.75, r * 0.55, r * 0.65, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.85, r * 0.1, r * 0.16, 0, 0, TAU); ctx.ellipse(r * 0.2, -r * 0.85, r * 0.1, r * 0.16, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(-r * 0.35, -r * 0.55); ctx.quadraticCurveTo(0, -r * 0.25, r * 0.35, -r * 0.55); ctx.stroke();
      ctx.fillStyle = '#b35cff'; ctx.globalAlpha = 0.6;
      ctx.fillRect(-r * 0.6, -r * 0.2 + (f ? 3 : -3), r * 1.2, 1.5);
      ctx.globalAlpha = 1;
    },
    brute(ctx, r, f) {
      // horns
      ctx.fillStyle = '#e8dcc0'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
      for (const sx of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(sx * r * 0.35, -r * 0.7); ctx.quadraticCurveTo(sx * r * 0.9, -r * 1.2, sx * r * 0.7, -r * 1.55); ctx.quadraticCurveTo(sx * r * 0.6, -r * 1.05, sx * r * 0.15, -r * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // arms
      ctx.fillStyle = '#5a0c14';
      ctx.beginPath(); ctx.ellipse(-r * 0.95, r * 0.15 + (f ? 2 : -1), r * 0.35, r * 0.6, 0.25, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(r * 0.95, r * 0.15 + (f ? -1 : 2), r * 0.35, r * 0.6, -0.25, 0, TAU); ctx.fill(); ctx.stroke();
      blob(ctx, r * 0.9, '#c23040', '#3a0610', 4, 0.05, 9);
      ctx.strokeStyle = '#1a0004'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.1); ctx.lineTo(0, r * 0.35); ctx.lineTo(r * 0.4, r * 0.1); ctx.stroke();
      ctx.fillStyle = '#ffde3a';
      ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.3); ctx.lineTo(-r * 0.12, -r * 0.18); ctx.lineTo(-r * 0.4, -r * 0.12); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.45, -r * 0.3); ctx.lineTo(r * 0.12, -r * 0.18); ctx.lineTo(r * 0.4, -r * 0.12); ctx.fill();
      ctx.fillStyle = '#1a0004'; ctx.fillRect(-r * 0.3, r * 0.45, r * 0.6, r * 0.12);
      teeth(ctx, 0, r * 0.45, r * 0.6, r * 0.12, 5, false);
    },
    cradle(ctx, r, f) {
      // tendrils
      ctx.strokeStyle = '#6a2a5a'; ctx.lineCap = 'round'; ctx.lineWidth = r * 0.14;
      for (let i = 0; i < 5; i++) {
        const x0 = (i - 2) * r * 0.3;
        ctx.beginPath(); ctx.moveTo(x0, r * 0.5);
        ctx.quadraticCurveTo(x0 + (f ? 5 : -5) * (i % 2 ? 1 : -1), r * 1.1, x0 + (i - 2) * 3, r * 1.6); ctx.stroke();
      }
      ctx.save(); ctx.scale(1.15, 0.9); blob(ctx, r, '#e08ab8', '#5a1440', 3, 0.04, 11); ctx.restore();
      // inner glowing womb with eye
      ctx.fillStyle = '#2a0820'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.6, r * 0.45, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff6ad0'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.5, r * 0.36, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      eye(ctx, 0, 0, r * 0.3, '#20ff9a', f ? 0.1 : -0.1);
    },
    twinface(ctx, r, f) {
      blob(ctx, r, '#c9b8a0', '#4a3a2a', 3, 0.04, 13);
      ctx.strokeStyle = '#2a0a0a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
      // left: crying face; right: laughing face
      eye(ctx, -r * 0.45, -r * 0.2, r * 0.2, '#3a7aff', 0);
      eye(ctx, r * 0.45, -r * 0.2, r * 0.2, '#ff3a3a', 0);
      ctx.strokeStyle = '#1a0606'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(-r * 0.45, r * 0.5, r * 0.22, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 0.45, r * 0.3, r * 0.22, 0.1, Math.PI - 0.1); ctx.stroke();
      ctx.fillStyle = '#6ab0ff'; ctx.beginPath(); ctx.ellipse(-r * 0.5, r * (f ? 0.15 : 0.1), 1.6, 3, 0, 0, TAU); ctx.fill();
    },
    halfface(ctx, r, f) {
      blob(ctx, r, '#c9b8a0', '#4a3a2a', 3, 0.06, 17);
      eye(ctx, 0, -r * 0.15, r * 0.35, f ? '#ff3a3a' : '#3a7aff', 0.2);
      ctx.strokeStyle = '#1a0606'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(0, r * 0.4, r * 0.25, 0.2, Math.PI - 0.2); ctx.stroke();
    },
    hound(ctx, r, f) {
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
      // legs
      ctx.strokeStyle = '#3a2a30'; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round';
      const l1 = f ? 0.4 : -0.4;
      ctx.beginPath(); ctx.moveTo(-r * 0.6, r * 0.2); ctx.lineTo(-r * 0.6 + l1 * r, r * 0.95); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.5, r * 0.2); ctx.lineTo(r * 0.5 - l1 * r, r * 0.95); ctx.stroke();
      // body
      ctx.fillStyle = '#6a4a54'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.0, r * 0.55, 0, 0, TAU); ctx.fill(); ctx.stroke();
      // stitches
      ctx.strokeStyle = '#1a0a10'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.1); ctx.lineTo(r * 0.4, -r * 0.15); ctx.stroke();
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.5 + i * r * 0.2, -r * 0.25); ctx.lineTo(-r * 0.48 + i * r * 0.2, -r * 0.02); ctx.stroke(); }
      // head
      ctx.fillStyle = '#8a6a72'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(r * 0.95, -r * 0.3, r * 0.5, r * 0.4, 0.2, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a0408'; ctx.beginPath(); ctx.moveTo(r * 1.0, -r * 0.15); ctx.lineTo(r * 1.5, -r * 0.05); ctx.lineTo(r * 1.0, r * 0.05); ctx.fill();
      teeth(ctx, r * 1.2, -r * 0.1, r * 0.4, r * 0.12, 4, false);
      ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.arc(r * 1.05, -r * 0.42, r * 0.09, 0, TAU); ctx.fill();
      ctx.fillStyle = '#4a3038'; ctx.beginPath(); ctx.moveTo(r * 0.7, -r * 0.6); ctx.lineTo(r * 0.75, -r * 0.95); ctx.lineTo(r * 0.9, -r * 0.62); ctx.fill();
    },
    ogre(ctx, r, f) {
      // club
      ctx.save(); ctx.translate(r * 0.9, -r * 0.1); ctx.rotate(f ? -0.5 : -0.2);
      ctx.fillStyle = '#4a3020'; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(7, -r * 1.2); ctx.lineTo(-7, -r * 1.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ccc'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc((i % 2 ? 6 : -6), -r * (0.5 + i * 0.17), 2, 0, TAU); ctx.fill(); }
      ctx.restore();
      blob(ctx, r, '#6a7a9a', '#1a2030', 4, 0.04, 21);
      ctx.fillStyle = '#d8cfba';
      ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.85); ctx.lineTo(-r * 0.1, -r * 1.25); ctx.lineTo(0, -r * 0.85); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.85); ctx.lineTo(r * 0.25, -r * 1.2); ctx.lineTo(r * 0.35, -r * 0.82); ctx.fill();
      eye(ctx, 0, -r * 0.3, r * 0.33, '#ff7a00', 0.15);
      ctx.fillStyle = '#12060a'; ctx.beginPath(); ctx.ellipse(0, r * 0.35, r * 0.5, r * (f ? 0.25 : 0.15), 0, 0, TAU); ctx.fill();
      teeth(ctx, 0, r * 0.22, r * 0.8, r * 0.18, 6, false);
      teeth(ctx, 0, r * 0.5, r * 0.8, r * 0.14, 6, true);
    },
  };

  const spriteCache = {};
  // per-type sprite bounds (keeps transparent overdraw low on mobile GPUs)
  const PAD = { larva: 2.1, eyebat: 2.0, golem: 1.45, spitter: 1.3, bloater: 1.35, warden: 1.3, flicker: 1.9, brute: 1.65, cradle: 1.75, twinface: 1.25, halfface: 1.25, hound: 1.6, ogre: 2.2 };
  const SCALE = 2;
  function enemySprite(type, frame, flip, r) {
    const key = type + '|' + frame + '|' + (flip ? 1 : 0) + '|' + r;
    let s = spriteCache[key];
    if (s) return s;
    const pad = r * (PAD[type] || 1.45) + 4;
    const size = Math.ceil(pad * 2);
    const c = U.makeCanvas(size * SCALE, size * SCALE);
    const ctx = c.getContext('2d');
    ctx.scale(SCALE, SCALE);
    ctx.translate(size / 2, size / 2);
    if (flip) ctx.scale(-1, 1);
    (EDRAW[type] || EDRAW.larva)(ctx, r, frame);
    // white flash silhouette
    const w = U.makeCanvas(c.width, c.height);
    const wc = w.getContext('2d');
    wc.drawImage(c, 0, 0);
    wc.globalCompositeOperation = 'source-atop';
    wc.fillStyle = '#ffffff'; wc.fillRect(0, 0, w.width, w.height);
    s = { c, w, half: size / 2, size };
    spriteCache[key] = s;
    return s;
  }

  // ============ SUMMON SPRITES (shadow master) ============
  const SUMMON = {
    wolf(ctx, r, f) {
      ctx.fillStyle = '#0d0818'; ctx.strokeStyle = '#7a4aff'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-r * 1.2, -r * 0.1);
      ctx.lineTo(-r * 0.6, -r * 0.5); ctx.lineTo(r * 0.5, -r * 0.5);
      ctx.lineTo(r * 0.8, -r * 1.1); ctx.lineTo(r * 1.0, -r * 0.6); ctx.lineTo(r * 1.15, -r * 1.05); ctx.lineTo(r * 1.25, -r * 0.5);
      ctx.lineTo(r * 1.7, -r * 0.2); ctx.lineTo(r * 1.2, r * 0.1);
      ctx.lineTo(r * 0.8, r * 0.2); ctx.lineTo(r * 0.7 + (f ? 4 : -2), r * 0.9); ctx.lineTo(r * 0.5, r * 0.25);
      ctx.lineTo(-r * 0.5, r * 0.25); ctx.lineTo(-r * 0.6 + (f ? -3 : 3), r * 0.9); ctx.lineTo(-r * 0.8, r * 0.15);
      ctx.lineTo(-r * 1.6, r * 0.0 + (f ? -3 : 3));
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d8b8ff'; ctx.beginPath(); ctx.arc(r * 1.15, -r * 0.4, r * 0.1, 0, TAU); ctx.fill();
    },
    crow(ctx, r, f) {
      ctx.fillStyle = '#0d0818'; ctx.strokeStyle = '#7a4aff'; ctx.lineWidth = 1;
      const u = f ? -0.8 : 0.4;
      ctx.beginPath();
      ctx.moveTo(r * 1.1, 0); ctx.lineTo(r * 0.4, -r * 0.2);
      ctx.lineTo(-r * 0.2, -r * 1.2 * u - r * 0.2); ctx.lineTo(-r * 0.4, -r * 0.1);
      ctx.lineTo(-r * 1.0, -r * 0.25); ctx.lineTo(-r * 0.8, r * 0.1);
      ctx.lineTo(-r * 0.2, r * 1.0 * u + r * 0.2); ctx.lineTo(r * 0.3, r * 0.2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d8b8ff'; ctx.beginPath(); ctx.arc(r * 0.6, -r * 0.05, r * 0.1, 0, TAU); ctx.fill();
    },
  };
  function summonSprite(kind, frame, flip, r) {
    const key = 'S' + kind + '|' + frame + '|' + (flip ? 1 : 0) + '|' + r;
    let s = spriteCache[key];
    if (s) return s;
    const size = Math.ceil((r * 2.2 + 6) * 2);
    const c = U.makeCanvas(size * SCALE, size * SCALE);
    const ctx = c.getContext('2d');
    ctx.scale(SCALE, SCALE); ctx.translate(size / 2, size / 2);
    if (flip) ctx.scale(-1, 1);
    SUMMON[kind](ctx, r, frame);
    s = { c, half: size / 2, size };
    spriteCache[key] = s;
    return s;
  }

  // ============ PORTRAIT (menus) ============
  function drawPortrait(canvas, id, t, opts) {
    opts = opts || {};
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const s = STYLE[id];
    if (!opts.noBg) {
      const gr = ctx.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, H * 0.7);
      gr.addColorStop(0, U.hexA(s.accent, 0.35)); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    }
    const scale = (opts.scale || 1) * H / 62;
    if (opts.silhouette) ctx.globalAlpha = 0.95;
    drawCharacter(ctx, id, W / 2, H * 0.93, { t: t || 0, move: 0, face: 1, scale, cast: opts.cast || 0, eyeGlow: 0.6 });
    ctx.globalAlpha = 1;
  }

  CA.Sprites = { STYLE, drawCharacter, enemySprite, summonSprite, drawPortrait, eye, teeth, blob, OUT };
})();
