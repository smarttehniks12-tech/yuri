/* CURSED ARENA: AWAKENING — utils.js
 * Math helpers, RNG, spatial hash grid. Global namespace: window.CA */
(function () {
  'use strict';
  const CA = (window.CA = window.CA || {});
  const TAU = Math.PI * 2;

  const U = {
    TAU,
    rand: (a, b) => a + Math.random() * (b - a),
    randi: (a, b) => (a + Math.floor(Math.random() * (b - a + 1))),
    chance: (p) => Math.random() < p,
    choice: (arr) => arr[(Math.random() * arr.length) | 0],
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    dist2: (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; },
    ang: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
    wrapAngle(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; },
    angDiff(a, b) { return U.wrapAngle(b - a); },
    easeOut: (t) => 1 - Math.pow(1 - t, 3),
    easeIn: (t) => t * t * t,
    easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    fmtTime(s) {
      s = Math.max(0, Math.floor(s));
      const m = Math.floor(s / 60), r = s % 60;
      return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
    },
    fmtNum(n) {
      n = Math.floor(n);
      if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
      if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
      return '' + n;
    },
    mulberry32(seed) {
      let a = seed >>> 0;
      return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    hashStr(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return h >>> 0;
    },
    shuffle(arr, rng) {
      rng = rng || Math.random;
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
      return arr;
    },
    // squared distance from point to segment
    segDist2(px, py, x1, y1, x2, y2) {
      const dx = x2 - x1, dy = y2 - y1;
      const l2 = dx * dx + dy * dy;
      let t = l2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = x1 + dx * t - px, qy = y1 + dy * t - py;
      return qx * qx + qy * qy;
    },
    weighted(list, wKey, rng) {
      rng = rng || Math.random;
      let sum = 0;
      for (const it of list) sum += (typeof wKey === 'function' ? wKey(it) : it[wKey]) || 0;
      let r = rng() * sum;
      for (const it of list) {
        r -= (typeof wKey === 'function' ? wKey(it) : it[wKey]) || 0;
        if (r <= 0) return it;
      }
      return list[list.length - 1];
    },
    todayKey() {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    hexA(hex, a) { // '#rrggbb' -> rgba string
      const n = parseInt(hex.slice(1), 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    },
    mixHex(h1, h2, t) {
      const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
      const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
      const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
      const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
      return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
    },
    makeCanvas(w, h) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
      return c;
    },
  };

  /* Spatial hash grid — rebuilt every frame for enemies. No allocations in steady state. */
  class Grid {
    constructor(worldW, worldH, cell) {
      this.cell = cell;
      this.cols = Math.ceil(worldW / cell) + 2;
      this.rows = Math.ceil(worldH / cell) + 2;
      this.cells = new Array(this.cols * this.rows);
      for (let i = 0; i < this.cells.length; i++) this.cells[i] = [];
      this.used = [];
      this.tmp = [];
    }
    clear() {
      for (let i = 0; i < this.used.length; i++) this.cells[this.used[i]].length = 0;
      this.used.length = 0;
    }
    idx(x, y) {
      let cx = Math.floor(x / this.cell) + 1, cy = Math.floor(y / this.cell) + 1;
      if (cx < 0) cx = 0; else if (cx >= this.cols) cx = this.cols - 1;
      if (cy < 0) cy = 0; else if (cy >= this.rows) cy = this.rows - 1;
      return cy * this.cols + cx;
    }
    insert(o) {
      const i = this.idx(o.x, o.y);
      const c = this.cells[i];
      if (c.length === 0) this.used.push(i);
      c.push(o);
    }
    // returns shared temp array of objects whose cell overlaps circle (caller must filter by distance)
    query(x, y, r, out) {
      out = out || this.tmp; out.length = 0;
      const cs = this.cell;
      let x0 = Math.floor((x - r) / cs) + 1, x1 = Math.floor((x + r) / cs) + 1;
      let y0 = Math.floor((y - r) / cs) + 1, y1 = Math.floor((y + r) / cs) + 1;
      if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0;
      if (x1 >= this.cols) x1 = this.cols - 1; if (y1 >= this.rows) y1 = this.rows - 1;
      for (let cy = y0; cy <= y1; cy++) {
        const row = cy * this.cols;
        for (let cx = x0; cx <= x1; cx++) {
          const c = this.cells[row + cx];
          for (let k = 0; k < c.length; k++) out.push(c[k]);
        }
      }
      return out;
    }
  }
  U.Grid = Grid;
  CA.U = U;
})();
