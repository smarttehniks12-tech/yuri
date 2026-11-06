/* input.js — multi-touch virtual joystick + canvas buttons + keyboard fallback */
(function () {
  'use strict';
  const CA = window.CA;

  const Input = {
    el: null,
    joy: { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0, mag: 0, radius: 56 },
    buttons: [],          // [{id,x,y,r,enabled}] in CSS px — set by HUD
    down: {},             // id -> bool
    pressT: {},           // id -> last press time (for press animation)
    owners: {},           // pointerId -> button id
    keys: {},
    onPress: null,        // fn(id)
    onRelease: null,
    joyZone: { x0: 0, y0: 0, x1: 0, y1: 0 },
    enabled: false,

    init(el) {
      this.el = el;
      const opts = { passive: false };
      el.addEventListener('pointerdown', (e) => this.pDown(e), opts);
      el.addEventListener('pointermove', (e) => this.pMove(e), opts);
      el.addEventListener('pointerup', (e) => this.pUp(e), opts);
      el.addEventListener('pointercancel', (e) => this.pUp(e), opts);
      el.addEventListener('lostpointercapture', (e) => this.pUp(e), opts);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      window.addEventListener('keydown', (e) => this.kDown(e));
      window.addEventListener('keyup', (e) => this.kUp(e));
      window.addEventListener('blur', () => this.releaseAll());
    },
    releaseAll() {
      this.joy.active = false; this.joy.id = -1; this.joy.dx = this.joy.dy = this.joy.mag = 0;
      for (const k in this.down) this.down[k] = false;
      this.owners = {};
      this.keys = {};
    },
    hitButton(x, y) {
      let best = null, bd = 1e9;
      for (const b of this.buttons) {
        if (b.hidden) continue;
        const d = Math.hypot(x - b.x, y - b.y);
        const reach = b.r + 14; // generous finger slop
        if (d < reach && d < bd) { best = b; bd = d; }
      }
      return best;
    },
    pDown(e) {
      e.preventDefault();
      CA.Audio.unlock();
      if (!this.enabled) return;
      try { this.el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      const x = e.clientX, y = e.clientY;
      const b = this.hitButton(x, y);
      if (b) {
        this.owners[e.pointerId] = b.id;
        this.down[b.id] = true;
        this.pressT[b.id] = performance.now();
        if (this.onPress) this.onPress(b.id);
        return;
      }
      const z = this.joyZone;
      if (!this.joy.active && x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1) {
        const j = this.joy;
        j.active = true; j.id = e.pointerId; j.ox = x; j.oy = y; j.x = x; j.y = y; j.dx = j.dy = j.mag = 0;
      }
    },
    pMove(e) {
      if (!this.enabled) return;
      const j = this.joy;
      if (j.active && e.pointerId === j.id) {
        e.preventDefault();
        let dx = e.clientX - j.ox, dy = e.clientY - j.oy;
        const d = Math.hypot(dx, dy);
        const R = j.radius;
        if (d > R) { // drag the base along (floating joystick)
          const k = (d - R) / d;
          j.ox += dx * k; j.oy += dy * k;
          dx = e.clientX - j.ox; dy = e.clientY - j.oy;
        }
        j.x = e.clientX; j.y = e.clientY;
        const dd = Math.hypot(dx, dy);
        j.mag = Math.min(1, dd / R);
        if (dd > 4) { j.dx = dx / dd; j.dy = dy / dd; } else { j.dx = j.dy = 0; j.mag = 0; }
      }
    },
    pUp(e) {
      const j = this.joy;
      if (j.active && e.pointerId === j.id) {
        j.active = false; j.id = -1; j.dx = j.dy = j.mag = 0;
      }
      const bid = this.owners[e.pointerId];
      if (bid) {
        delete this.owners[e.pointerId];
        this.down[bid] = false;
        if (this.onRelease) this.onRelease(bid);
      }
    },
    KEYMAP: { KeyJ: 'attack', Space: 'attack', Digit1: 's0', Digit2: 's1', Digit3: 's2', Digit4: 's3', KeyQ: 'ult', KeyE: 'domain', KeyU: 's0', KeyI: 's1', KeyO: 's2', KeyK: 's3' },
    kDown(e) {
      if (e.repeat) return;
      this.keys[e.code] = true;
      if (!this.enabled) return;
      const id = this.KEYMAP[e.code];
      if (id) {
        e.preventDefault();
        this.down[id] = true; this.pressT[id] = performance.now();
        if (this.onPress) this.onPress(id);
      }
      if ((e.code === 'Escape' || e.code === 'KeyP') && this.onPress) this.onPress('pause');
    },
    kUp(e) {
      this.keys[e.code] = false;
      const id = this.KEYMAP[e.code];
      if (id) { this.down[id] = false; if (this.onRelease) this.onRelease(id); }
    },
    // movement vector (joystick or keyboard)
    move() {
      const j = this.joy;
      if (j.active && j.mag > 0.05) return { x: j.dx * Math.min(1, j.mag * 1.25), y: j.dy * Math.min(1, j.mag * 1.25) };
      let x = 0, y = 0;
      const k = this.keys;
      if (k.KeyA || k.ArrowLeft) x -= 1;
      if (k.KeyD || k.ArrowRight) x += 1;
      if (k.KeyW || k.ArrowUp) y -= 1;
      if (k.KeyS || k.ArrowDown) y += 1;
      const d = Math.hypot(x, y);
      if (d > 0) { x /= d; y /= d; }
      return { x, y };
    },
  };
  CA.Input = Input;
})();
