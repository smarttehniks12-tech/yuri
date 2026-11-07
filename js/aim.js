/* aim.js — manual aiming & steering for techniques.
 * Tap a skill button  -> auto-aim (as before).
 * Press and drag      -> aim stick: direction (and distance for area skills); release to cast there.
 * Hold the button of a live steerable technique (Blue singularity, Void sphere) and drag -> steer it. */
(function () {
  'use strict';
  const CA = window.CA;
  const U = CA.U;
  const TAU = U.TAU;

  // type: 'dir' (direction) or 'point' (target spot within range); r = indicator radius; steer = can be steered after cast
  const AIM = {
    sp_blue: { type: 'point', range: 360, r: 120, steer: true }, sp_red: { type: 'dir', range: 260 }, sp_void: { type: 'dir', range: 640, steer: true }, sp_blink: { type: 'dir', range: 170 },
    kg_slash: { type: 'point', range: 300, r: 200 }, kg_spear: { type: 'point', range: 480, r: 130 }, kg_exec: { type: 'point', range: 300, r: 160 },
    sh_step: { type: 'point', range: 320, r: 100 }, sh_wyrm: null,
    bl_beam: { type: 'dir', range: 520 }, bl_spears: { type: 'point', range: 420, r: 160 }, bl_hemo: { type: 'point', range: 360, r: 260 },
    lg_dash: { type: 'dir', range: 210 }, lg_storm: { type: 'point', range: 320, r: 220 },
    bs_dash: { type: 'dir', range: 230 }, bs_fist: { type: 'dir', range: 220 }, bs_barrage: { type: 'dir', range: 120 },
  };
  const DEAD = 0.22; // drag below this = plain tap (auto-aim)

  const Aim = {
    AIM,
    def(s) { return s ? AIM[s.id] || null : null; },
    vec(i) { const a = CA.Input.aim['s' + i]; return a && a.mag >= DEAD ? a : null; },
    // target point for the current drag
    point(p, d, v) { return { x: U.clamp(p.x + v.x * d.range * v.mag, 20, CA.Locations.WORLD - 20), y: U.clamp(p.y + v.y * d.range * v.mag, 20, CA.Locations.WORLD - 20) }; },

    press(G, p, i) {
      const s = p.kit.skills[i];
      if (!s || !(p.lv[s.id] > 0)) return false;
      const d = this.def(s);
      const st = p.steer && p.steer[s.id];
      if ((p.cds[s.id] || 0) > 0) {
        if (d && d.steer && st && this.alive(st)) { p.steerSlot = i; return true; }
        return false;
      }
      if (!d) return p.useSkill(i); // non-aimable: instant cast
      p.aimSlot = i;
      return true;
    },
    release(G, p, i) {
      if (p.steerSlot === i) { p.steerSlot = -1; return; }
      if (p.aimSlot !== i) return;
      p.aimSlot = -1;
      const s = p.kit.skills[i], d = this.def(s), v = this.vec(i);
      let ok;
      if (v) {
        const a = Math.atan2(v.y, v.x);
        const pt = this.point(p, d, v);
        const save = { dirA: p.dirA, moving: p.moving };
        p.aimOverride = { a, pt: d.type === 'point' ? pt : { x: p.x + v.x * d.range, y: p.y + v.y * d.range } };
        p.dirA = a; p.moving = true;
        ok = p.useSkill(i);
        p.aimOverride = null; p.dirA = save.dirA; p.moving = save.moving;
      } else ok = p.useSkill(i);
      if (ok) CA.Audio.vibrate('light'); else CA.Audio.play('back', 0.3);
    },
    alive(st) {
      if (!st || !st.obj) return false;
      const o = st.obj;
      if (st.kind === 'zone') return o.life > 0;
      return !o.dead && o.life > 0 && o.steerTok === st.tok;
    },
    register(p, id, obj, kind) {
      p.steer = p.steer || {};
      const tok = Math.random();
      if (kind === 'proj') obj.steerTok = tok;
      p.steer[id] = { obj, kind, tok };
    },
    update(G, p, dt) {
      if (p.steerSlot >= 0) {
        const s = p.kit.skills[p.steerSlot], st = p.steer && p.steer[s.id];
        const a = CA.Input.aim['s' + p.steerSlot];
        if (!st || !this.alive(st)) { p.steerSlot = -1; return; }
        if (a && a.mag >= DEAD) {
          const o = st.obj;
          if (st.kind === 'zone') {
            const sp = 300 * a.mag;
            o.x = U.clamp(o.x + a.x * sp * dt, 30, CA.Locations.WORLD - 30); o.y = U.clamp(o.y + a.y * sp * dt, 30, CA.Locations.WORLD - 30);
            if (Math.random() < 0.6) CA.FX.p(o.x, o.y, -a.x * 120, -a.y * 120, 0.4, 4, '#4fb8ff', 0, 2);
          } else {
            const want = Math.atan2(a.y, a.x), cur = Math.atan2(o.vy, o.vx), spd = Math.hypot(o.vx, o.vy);
            const na = cur + U.clamp(U.angDiff(cur, want), -5 * dt, 5 * dt);
            o.vx = Math.cos(na) * spd; o.vy = Math.sin(na) * spd;
            o.life = Math.max(o.life, 0.3); // keep it alive while it is being steered (capped below)
            o.steerTime = (o.steerTime || 0) + dt;
            if (o.steerTime > 2.5) o.life = Math.min(o.life, 0.3);
          }
        }
      }
    },
    // world-space indicator while aiming / steering
    draw(ctx, G, p) {
      const col = p.ch.color;
      if (p.aimSlot >= 0) {
        const s = p.kit.skills[p.aimSlot], d = this.def(s), v = this.vec(p.aimSlot);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        if (!v) { // auto-aim hint
          ctx.globalAlpha = 0.35; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
          ctx.beginPath(); ctx.arc(p.x, p.y - 10, d.range, 0, TAU); ctx.stroke();
          ctx.restore();
          return;
        }
        const t = G.realT;
        if (d.type === 'dir') {
          const a = Math.atan2(v.y, v.x), L = d.range;
          ctx.translate(p.x, p.y - 14); ctx.rotate(a);
          const gr = ctx.createLinearGradient(0, 0, L, 0);
          gr.addColorStop(0, U.hexA(col, 0.05)); gr.addColorStop(1, U.hexA(col, 0.45));
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.moveTo(10, -10); ctx.lineTo(L - 24, -14); ctx.lineTo(L - 24, -26); ctx.lineTo(L, 0); ctx.lineTo(L - 24, 26); ctx.lineTo(L - 24, 14); ctx.lineTo(10, 10); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 0.9; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.globalAlpha = 0.6; ctx.fillStyle = '#ffffff';
          for (let k = 0; k < 4; k++) { const x = ((t * 260 + k * L / 4) % (L - 30)) + 14; ctx.fillRect(x, -1.5, 14, 3); }
        } else {
          const pt = this.point(p, d, v), R = d.r * p.area;
          ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -t * 40;
          ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(p.x, p.y - 14); ctx.lineTo(pt.x, pt.y); ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 0.18; ctx.drawImage(CA.FX.getSoft(col), pt.x - R, pt.y - R, R * 2, R * 2);
          ctx.globalAlpha = 0.85; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(pt.x, pt.y, R, 0, TAU); ctx.stroke();
          ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(pt.x, pt.y, R * (0.3 + ((t * 1.5) % 1) * 0.7), 0, TAU); ctx.stroke();
          ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }
      if (p.steerSlot >= 0) {
        const s = p.kit.skills[p.steerSlot], st = p.steer && p.steer[s.id], a = CA.Input.aim['s' + p.steerSlot];
        if (st && this.alive(st) && a && a.mag >= DEAD) {
          const o = st.obj, L = 70 + a.mag * 60;
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.globalAlpha = 0.8;
          ctx.translate(o.x, o.y); ctx.rotate(Math.atan2(a.y, a.x));
          ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(L, 0); ctx.moveTo(L - 12, -9); ctx.lineTo(L, 0); ctx.lineTo(L - 12, 9); ctx.stroke();
          ctx.restore();
        }
      }
    },
  };
  CA.Aim = Aim;
})();
