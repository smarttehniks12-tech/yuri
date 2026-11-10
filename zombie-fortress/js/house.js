// The house: walls with real window/door openings, trim, porch, roof, chimney, basement windows,
// plus the two upgrades that live on the house itself (armoured glass + roller shutters, steel door).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, lerp, prog, smooth, easeOut, easeIn, easeIn2, easeInOut, backOut, bounceOut, mulberry32, fbm, mesh, worldUV, setVisible } from './util.js';
import { L } from './world.js';

/** Collects static geometry per material and merges it into one mesh each (keeps draw calls low). */
export class Batch {
  constructor() { this.map = new Map(); }
  add(geo, mat, matrix, wuv = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (wuv) worldUV(g, wuv);
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(g);
    return this;
  }
  /** Box centred at (x, y, z) in the optional frame, optional Euler rotation [rx, ry, rz]. */
  box(mat, w, h, d, x, y, z, frame, rot, wuv = 0) {
    const m = new THREE.Matrix4();
    if (rot) m.makeRotationFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
    m.setPosition(x, y, z);
    if (frame) m.premultiply(frame);
    return this.add(new THREE.BoxGeometry(w, h, d), mat, m, wuv);
  }
  /** Merges everything collected so far into a single geometry (for instancing) and empties the batch. */
  toGeometry() { const all = []; for (const l of this.map.values()) all.push(...l); this.map.clear(); return mergeGeometries(all, false); }
  build(parent, { cast = true, receive = true } = {}) {
    const out = [];
    for (const [mat, list] of this.map) { const m = new THREE.Mesh(mergeGeometries(list, false), mat); m.castShadow = cast; m.receiveShadow = receive; parent.add(m); out.push(m); }
    this.map.clear();
    return out;
  }
}

export function makeMaterials(TX) {
  const S = (o) => new THREE.MeshStandardMaterial(o);
  const roofMap = TX.shingles.map.clone(), roofN = TX.shingles.normalMap.clone();
  roofMap.repeat.set(9, 6); roofN.repeat.set(9, 6); roofMap.needsUpdate = roofN.needsUpdate = true;
  const M = {
    siding: S({ map: TX.siding.map, normalMap: TX.siding.normalMap, color: 0xe3d8bf, roughness: 0.82 }),
    trim: S({ color: 0xf3f0e8, roughness: 0.6 }),
    roof: S({ map: roofMap, normalMap: roofN, roughness: 0.85 }),
    roofSm: S({ map: TX.shingles.map, normalMap: TX.shingles.normalMap, roughness: 0.85 }),
    brick: S({ map: TX.brick.map, normalMap: TX.brick.normalMap, roughness: 0.9 }),
    concrete: S({ map: TX.concrete.map, normalMap: TX.concrete.normalMap, color: 0xcfcdc6, roughness: 0.93 }),
    wallConc: S({ map: TX.concrete.map, normalMap: TX.concrete.normalMap, color: 0xdedbd2, roughness: 0.9 }),
    deck: S({ map: TX.wood.map, normalMap: TX.wood.normalMap, color: 0xb9936c, roughness: 0.75 }),
    woodRed: S({ map: TX.wood.map, normalMap: TX.wood.normalMap, color: 0xa63a30, roughness: 0.5 }),
    woodDark: S({ map: TX.wood.map, normalMap: TX.wood.normalMap, color: 0x7a5a3c, roughness: 0.8 }),
    woodPale: S({ map: TX.wood.map, normalMap: TX.wood.normalMap, color: 0xd9c19a, roughness: 0.85 }),
    fence: S({ map: TX.wood.map, color: 0xfaf8f2, roughness: 0.7 }),
    steel: S({ color: 0xb4bac1, metalness: 0.85, roughness: 0.36, normalMap: TX.slat.normalMap }),
    steelPlain: S({ color: 0xaeb4bb, metalness: 0.85, roughness: 0.4 }),
    darkSteel: S({ color: 0x3b4149, metalness: 0.9, roughness: 0.42 }),
    black: S({ color: 0x17191c, metalness: 0.4, roughness: 0.6 }),
    brass: S({ color: 0xd9b25a, metalness: 1, roughness: 0.3 }),
    glass: S({ color: 0x22323c, metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.5, envMapIntensity: 2.4 }),
    armGlass: S({ color: 0x7fbfa8, metalness: 0.0, roughness: 0.03, transparent: true, opacity: 0.34, envMapIntensity: 2.6, side: THREE.DoubleSide }),
    armPoly: S({ color: 0x9ad0ff, metalness: 0.0, roughness: 0.08, transparent: true, opacity: 0.30, envMapIntensity: 1.6, side: THREE.DoubleSide }),
    interior: S({ color: 0x1b1e24, roughness: 1, emissive: 0xffb469, emissiveIntensity: 0 }),
    curtain: S({ color: 0xe9e4d8, roughness: 1, emissive: 0xffc27a, emissiveIntensity: 0, side: THREE.DoubleSide }),
    leaf: S({ color: 0x3e7a34, roughness: 0.9 }),
    leafDark: S({ color: 0x2f6330, roughness: 0.9 }),
    soil: S({ map: TX.dirt.map, color: 0x8a6a50, roughness: 1 }),
    gutter: S({ color: 0x5a6068, metalness: 0.7, roughness: 0.45, side: THREE.DoubleSide }),
    lampGlass: new THREE.MeshBasicMaterial({ color: 0xfff1d0 }),
    xray: new THREE.MeshBasicMaterial({ color: 0xffb02e, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    xrayDim: new THREE.MeshBasicMaterial({ color: 0xff7a1e, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  };
  return M;
}

const Y = new THREE.Vector3(0, 1, 0);
const frameOf = (ox, oy, oz, U, N) => new THREE.Matrix4().makeBasis(U, Y, N).setPosition(ox, oy, oz);

export function buildHouse(scene, TX, M, T) {
  const { hx, hz, base, wallH, rise, thick } = L.house;
  const H = { windows: [], group: new THREE.Group() };
  scene.add(H.group);
  const B = new Batch();
  const R = mulberry32(99);

  // ---------------------------------------------------------------- walls with openings
  const WALLS = [
    { id: 'front', w: hx * 2, frame: frameOf(-hx, base, hz, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1)), gable: false,
      open: [{ k: 'door', u: 5, y: 1.1, w: 1.1, h: 2.2 }, { k: 'win', u: 1.9, y: 1.6, w: 1.5, h: 1.5, hero: true, box: true }, { k: 'win', u: 8.1, y: 1.6, w: 1.5, h: 1.5, box: true },
        { k: 'win', u: 1.9, y: 4.35, w: 1.4, h: 1.4 }, { k: 'win', u: 5, y: 4.35, w: 1.4, h: 1.4 }, { k: 'win', u: 8.1, y: 4.35, w: 1.4, h: 1.4 }] },
    { id: 'right', w: hz * 2, frame: frameOf(hx, base, hz, new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0)), gable: true,
      open: [{ k: 'win', u: 2.1, y: 1.6, w: 1.4, h: 1.5 }, { k: 'win', u: 5.9, y: 1.6, w: 1.4, h: 1.5 }, { k: 'win', u: 2.1, y: 4.35, w: 1.3, h: 1.4 }, { k: 'win', u: 5.9, y: 4.35, w: 1.3, h: 1.4 }] },
    { id: 'back', w: hx * 2, frame: frameOf(hx, base, -hz, new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, -1)), gable: false,
      open: [{ k: 'win', u: 2.2, y: 1.6, w: 1.5, h: 1.5 }, { k: 'win', u: 7.8, y: 1.6, w: 1.5, h: 1.5 }, { k: 'win', u: 2.2, y: 4.35, w: 1.4, h: 1.4 }, { k: 'win', u: 7.8, y: 4.35, w: 1.4, h: 1.4 }] },
    { id: 'left', w: hz * 2, frame: frameOf(-hx, base, -hz, new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0)), gable: true,
      open: [{ k: 'win', u: 2.1, y: 1.6, w: 1.4, h: 1.5 }, { k: 'win', u: 5.9, y: 1.6, w: 1.4, h: 1.5 }, { k: 'win', u: 2.1, y: 4.35, w: 1.3, h: 1.4 }, { k: 'win', u: 5.9, y: 4.35, w: 1.3, h: 1.4 }] },
  ];

  // shared geometries for the animated window parts
  const slatGeo = new THREE.BoxGeometry(1, 0.086, 0.02);
  const SLAT_H = 0.09;
  let slatCount = 0;
  for (const wl of WALLS) for (const o of wl.open) if (o.k === 'win') slatCount += Math.ceil((o.h + 0.06) / SLAT_H) + 1;
  const slats = new THREE.InstancedMesh(slatGeo, M.steel, slatCount);
  slats.castShadow = true; slats.receiveShadow = true; slats.frustumCulled = false;
  H.group.add(slats);
  const slitMat = new THREE.MeshBasicMaterial({ color: 0xffc680, toneMapped: false, transparent: true, opacity: 0 });
  const slitList = [];
  let slatBase = 0, winIndex = 0;
  const zeroM = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < slatCount; i++) slats.setMatrixAt(i, zeroM);

  const curtainTex = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d');
    for (let i = 0; i < 128; i++) { const v = 205 + Math.sin(i * 0.42) * 26 + Math.sin(i * 0.11) * 12; x.fillStyle = `rgb(${v | 0},${(v * 0.98) | 0},${(v * 0.93) | 0})`; x.fillRect(i, 0, 1, 128); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  M.curtain.map = curtainTex;

  for (const wl of WALLS) {
    // wall slab with holes
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(wl.w, 0); shape.lineTo(wl.w, wallH);
    if (wl.gable) shape.lineTo(wl.w / 2, wallH + rise);
    shape.lineTo(0, wallH); shape.closePath();
    for (const o of wl.open) {
      const hole = new THREE.Path(); const x0 = o.u - o.w / 2, x1 = o.u + o.w / 2, y0 = o.y - o.h / 2, y1 = o.y + o.h / 2;
      hole.moveTo(x0, y0); hole.lineTo(x0, y1); hole.lineTo(x1, y1); hole.lineTo(x1, y0); hole.closePath(); shape.holes.push(hole);
    }
    const wg = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false }); wg.translate(0, 0, -thick);
    B.add(wg, M.siding, wl.frame);
    // corner boards + band between floors
    B.box(M.trim, 0.16, wallH, 0.05, 0.08, wallH / 2, 0.025, wl.frame).box(M.trim, 0.16, wallH, 0.05, wl.w - 0.08, wallH / 2, 0.025, wl.frame);
    B.box(M.trim, wl.w, 0.14, 0.035, wl.w / 2, 2.82, 0.018, wl.frame);
    B.box(M.trim, wl.w + 0.06, 0.12, 0.05, wl.w / 2, 0.06, 0.025, wl.frame); // water table
    if (wl.gable) { // round attic vent
      const ring = new THREE.TorusGeometry(0.42, 0.06, 8, 28); B.add(ring, M.trim, new THREE.Matrix4().makeTranslation(wl.w / 2, wallH + 1.05, 0.02).premultiply(wl.frame));
      const disc = new THREE.CircleGeometry(0.42, 28); B.add(disc, M.black, new THREE.Matrix4().makeTranslation(wl.w / 2, wallH + 1.05, 0.012).premultiply(wl.frame));
      for (let i = -3; i <= 3; i++) B.box(M.trim, 0.8 * Math.sqrt(1 - (i * 0.105 / 0.42) ** 2), 0.035, 0.03, wl.w / 2, wallH + 1.05 + i * 0.105, 0.03, wl.frame, [0.5, 0, 0]);
    }
    const wallG = new THREE.Group(); wallG.matrixAutoUpdate = false; wallG.matrix.copy(wl.frame); H.group.add(wallG);
    wl.group = wallG;

    for (const o of wl.open) {
      if (o.k !== 'win') continue;
      const { u, y, w, h } = o;
      const at = (x, yy, n) => new THREE.Matrix4().makeTranslation(u + x, y + yy, n).premultiply(wl.frame);
      // casing, sill, jamb liners (static)
      B.add(new THREE.BoxGeometry(0.11, h + 0.14, 0.06), M.trim, at(-w / 2 - 0.055, 0.0, 0.03)).add(new THREE.BoxGeometry(0.11, h + 0.14, 0.06), M.trim, at(w / 2 + 0.055, 0.0, 0.03));
      B.add(new THREE.BoxGeometry(w + 0.3, 0.15, 0.07), M.trim, at(0, h / 2 + 0.075, 0.035)).add(new THREE.BoxGeometry(w + 0.38, 0.045, 0.11), M.trim, at(0, h / 2 + 0.17, 0.055));
      B.add(new THREE.BoxGeometry(w + 0.32, 0.06, 0.17), M.trim, at(0, -h / 2 - 0.03, 0.065)).add(new THREE.BoxGeometry(w + 0.16, 0.11, 0.04), M.trim, at(0, -h / 2 - 0.115, 0.02));
      B.add(new THREE.BoxGeometry(0.025, h, thick), M.trim, at(-w / 2 + 0.0125, 0, -thick / 2)).add(new THREE.BoxGeometry(0.025, h, thick), M.trim, at(w / 2 - 0.0125, 0, -thick / 2));
      B.add(new THREE.BoxGeometry(w, 0.025, thick), M.trim, at(0, h / 2 - 0.0125, -thick / 2)).add(new THREE.BoxGeometry(w, 0.03, thick), M.trim, at(0, -h / 2 + 0.015, -thick / 2));
      // interior card + curtains (static)
      B.add(new THREE.PlaneGeometry(w + 0.3, h + 0.3), M.interior, at(0, 0, -0.55));
      B.add(new THREE.PlaneGeometry(w * 0.34, h), M.curtain, at(-w / 2 + w * 0.17, 0, -0.24)).add(new THREE.PlaneGeometry(w * 0.34, h), M.curtain, at(w / 2 - w * 0.17, 0, -0.24));
      if (o.box) { // flower box
        B.add(new THREE.BoxGeometry(w + 0.1, 0.2, 0.24), M.woodDark, at(0, -h / 2 - 0.3, 0.14));
        for (let i = 0; i < 9; i++) {
          const fx = -w / 2 + 0.12 + (i / 8) * (w - 0.24);
          B.add(new THREE.IcosahedronGeometry(0.11 + R() * 0.05, 1), M.leaf, at(fx, -h / 2 - 0.17 + R() * 0.04, 0.14 + (R() - 0.5) * 0.08));
          const fm = [M.flowerA, M.flowerB, M.flowerC][i % 3] || (M.flowerA = new THREE.MeshStandardMaterial({ color: 0xe8557a, roughness: 0.7 }), M.flowerB = new THREE.MeshStandardMaterial({ color: 0xf5c84a, roughness: 0.7 }), M.flowerC = new THREE.MeshStandardMaterial({ color: 0xf2f0ff, roughness: 0.7 }), M.flowerA);
          B.add(new THREE.IcosahedronGeometry(0.045, 0), fm, at(fx + (R() - 0.5) * 0.1, -h / 2 - 0.06 + R() * 0.05, 0.16 + (R() - 0.5) * 0.1));
        }
      }
      // ---- animated parts
      const g = new THREE.Group(); g.position.set(u, y, 0); wallG.add(g);
      // old sash: frame + mullions (one merged mesh) + pane
      const sb = new Batch();
      sb.box(M.trim, 0.06, h - 0.05, 0.05, -w / 2 + 0.055, 0, -0.1).box(M.trim, 0.06, h - 0.05, 0.05, w / 2 - 0.055, 0, -0.1)
        .box(M.trim, w - 0.05, 0.06, 0.05, 0, h / 2 - 0.055, -0.1).box(M.trim, w - 0.05, 0.07, 0.05, 0, -h / 2 + 0.06, -0.1)
        .box(M.trim, 0.035, h - 0.1, 0.04, 0, 0, -0.1).box(M.trim, w - 0.1, 0.035, 0.04, 0, 0.02, -0.1);
      const sashHolder = new THREE.Group(); g.add(sashHolder); sb.build(sashHolder);
      const oldGlass = mesh(new THREE.PlaneGeometry(w - 0.12, h - 0.12), M.glass, { cast: false, pos: [0, 0, -0.112] }); sashHolder.add(oldGlass);
      // armoured glass: three laminated layers + steel inner frame
      const layers = [];
      [M.armGlass, M.armPoly, M.armGlass].forEach((mat, i) => { const lm = mesh(new THREE.BoxGeometry(w - 0.05, h - 0.05, 0.016), mat, { cast: false }); lm.visible = false; lm.renderOrder = 2 + i; g.add(lm); layers.push(lm); });
      const fb = new Batch();
      fb.box(M.darkSteel, 0.055, h - 0.03, 0.1, -w / 2 + 0.05, 0, -0.07).box(M.darkSteel, 0.055, h - 0.03, 0.1, w / 2 - 0.05, 0, -0.07)
        .box(M.darkSteel, w - 0.03, 0.055, 0.1, 0, h / 2 - 0.05, -0.07).box(M.darkSteel, w - 0.03, 0.055, 0.1, 0, -h / 2 + 0.05, -0.07);
      const steelFrame = new THREE.Group(); g.add(steelFrame); fb.build(steelFrame); steelFrame.visible = false;
      // shutter housing + guide rails
      const hb = new Batch();
      hb.box(M.steelPlain, w + 0.3, 0.26, 0.22, 0, 0, 0).box(M.darkSteel, 0.03, 0.28, 0.24, -w / 2 - 0.15, 0, 0).box(M.darkSteel, 0.03, 0.28, 0.24, w / 2 + 0.15, 0, 0);
      const housing = new THREE.Group(); housing.position.set(0, h / 2 + 0.19, 0.115); g.add(housing); hb.build(housing); housing.visible = false;
      const rb = new Batch();
      rb.box(M.darkSteel, 0.075, h + 0.06, 0.07, -w / 2 - 0.02, -(h + 0.06) / 2, 0).box(M.darkSteel, 0.075, h + 0.06, 0.07, w / 2 + 0.02, -(h + 0.06) / 2, 0);
      const rails = new THREE.Group(); rails.position.set(0, h / 2 + 0.06, 0.1); g.add(rails); rb.build(rails); rails.visible = false;
      const n = Math.ceil((h + 0.06) / SLAT_H) + 1;
      // night light leaking through two vision slits
      for (const sy of [0.24, 0.33]) { const sm = mesh(new THREE.PlaneGeometry(w * 0.78, 0.014), slitMat, { cast: false, receive: false, pos: [0, sy, 0.1115] }); sm.visible = false; g.add(sm); slitList.push(sm); }
      const i = winIndex++;
      const center = new THREE.Vector3(u, y, 0).applyMatrix4(wl.frame);
      const win = { ...o, wall: wl, g, sashHolder, oldGlass, layers, steelFrame, housing, rails, n, base: slatBase, q: -1, center,
        tBreak: o.hero ? T.break + 0.12 : T.bronya - 0.2, tGlass: o.hero ? T.bronya + 0.32 : T.bronya + 0.45 + (i % 5) * 0.03,
        tShut: o.hero ? T.rolls + 0.12 : T.rolls + 0.72 + (wl.id === 'front' ? (i % 6) * 0.06 : 0.1 + (i % 4) * 0.05) };
      slatBase += n;
      H.windows.push(win);
      if (o.hero) H.hero = win;
    }
  }

  // ---------------------------------------------------------------- hero window: cracks + shards
  {
    const w = H.hero, cw = w.w - 0.12, ch = w.h - 0.12;
    const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d'); const r = mulberry32(5);
    const ix = 300, iy = 290; x.strokeStyle = 'rgba(235,245,255,0.95)'; x.lineCap = 'round';
    for (let k = 0; k < 15; k++) {
      let a = (k / 15) * Math.PI * 2 + r() * 0.3, px = ix, py = iy; x.lineWidth = 2.6; x.beginPath(); x.moveTo(px, py);
      for (let s = 0; s < 9; s++) { a += (r() - 0.5) * 0.5; const l = 26 + r() * 46; px += Math.cos(a) * l; py += Math.sin(a) * l; x.lineTo(px, py); if (s === 3) { x.stroke(); x.lineWidth = 1.4; x.beginPath(); x.moveTo(px, py); } }
      x.stroke();
    }
    x.lineWidth = 1.2; for (const rr of [46, 96, 160, 230]) { x.beginPath(); for (let k = 0; k <= 30; k++) { const a = (k / 30) * Math.PI * 2, q = rr * (0.85 + r() * 0.3); k ? x.lineTo(ix + Math.cos(a) * q, iy + Math.sin(a) * q) : x.moveTo(ix + Math.cos(a) * q, iy + Math.sin(a) * q); } x.stroke(); }
    const g = x.createRadialGradient(ix, iy, 0, ix, iy, 60); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const crack = mesh(new THREE.PlaneGeometry(cw, ch), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false }), { cast: false, receive: false, pos: [0, 0, -0.108] });
    crack.renderOrder = 5; w.g.add(crack); H.crack = crack;
    // shards
    const N = 70, tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.4, 0, 0.5, -0.3, 0, 0.05, 0.55, 0], 3)); tri.computeVertexNormals();
    const sm = new THREE.InstancedMesh(tri, new THREE.MeshStandardMaterial({ color: 0xcfe6f2, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.78, side: THREE.DoubleSide, envMapIntensity: 2.5 }), N);
    sm.frustumCulled = false; sm.castShadow = true; sm.visible = false; w.wall.group.add(sm);
    const sh = [];
    for (let i = 0; i < N; i++) {
      const px = (r() - 0.5) * cw, py = (r() - 0.5) * ch, dx = px - (ix / 512 - 0.5) * cw, dy = py - (0.5 - iy / 512) * ch, dl = Math.hypot(dx, dy) + 0.2;
      sh.push({ p: [w.u + px, w.y + py, -0.1], v: [dx / dl * (0.6 + r() * 1.4), dy / dl * (0.4 + r()) + 0.6 + r() * 1.2, 1.2 + r() * 3.6], s: 0.08 + r() * 0.2, ax: [r() - 0.5, r() - 0.5, r() - 0.5], w: 4 + r() * 10, ph: r() * 6 });
    }
    H.shards = { mesh: sm, list: sh };
  }

  // ---------------------------------------------------------------- door
  const FF = WALLS[0].frame;
  const doorG = new THREE.Group(); doorG.position.set(5, 0, 0); WALLS[0].group.add(doorG);
  {
    const at = (x, y, n) => new THREE.Matrix4().makeTranslation(5 + x, y, n).premultiply(FF);
    B.add(new THREE.BoxGeometry(0.13, 2.26, 0.07), M.trim, at(-0.615, 1.13, 0.035)).add(new THREE.BoxGeometry(0.13, 2.26, 0.07), M.trim, at(0.615, 1.13, 0.035));
    B.add(new THREE.BoxGeometry(1.5, 0.17, 0.08), M.trim, at(0, 2.285, 0.04)).add(new THREE.BoxGeometry(1.62, 0.05, 0.13), M.trim, at(0, 2.395, 0.065));
    B.add(new THREE.BoxGeometry(1.14, 0.04, 0.32), M.woodDark, at(0, 0.0, -0.02));
    B.add(new THREE.PlaneGeometry(1.4, 2.5), M.interior, at(0, 1.1, -0.6));
    // old wooden door (falls outwards around its bottom edge)
    const fall = new THREE.Group(); doorG.add(fall);
    const db = new Batch();
    db.box(M.woodRed, 1.08, 2.18, 0.05, 0, 1.1, -0.07);
    for (const px of [-0.26, 0.26]) { db.box(M.woodRed, 0.4, 0.62, 0.022, px, 0.48, -0.04); db.box(M.woodRed, 0.4, 0.62, 0.022, px, 1.2, -0.04); db.box(M.trim, 0.42, 0.36, 0.02, px, 1.8, -0.045); }
    db.add(new THREE.SphereGeometry(0.042, 16, 12), M.brass, new THREE.Matrix4().makeTranslation(0.42, 1.05, 0.0)).add(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 12).rotateX(Math.PI / 2), M.brass, new THREE.Matrix4().makeTranslation(0.42, 1.05, -0.03));
    db.build(fall);
    for (const px of [-0.26, 0.26]) fall.add(mesh(new THREE.PlaneGeometry(0.36, 0.3), M.glass, { cast: false, pos: [px, 1.8, -0.033] }));
    // steel frame (slides in) + steel door (swings shut)
    const frame = new THREE.Group(); doorG.add(frame); frame.visible = false;
    const fb = new Batch();
    fb.box(M.darkSteel, 0.17, 2.3, 0.22, -0.635, 1.15, -0.03).box(M.darkSteel, 0.17, 2.3, 0.22, 0.635, 1.15, -0.03).box(M.darkSteel, 1.44, 0.17, 0.22, 0, 2.3, -0.03);
    for (const px of [-0.635, 0.635]) for (let k = 0; k < 6; k++) fb.add(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 10).rotateX(Math.PI / 2), M.steelPlain, new THREE.Matrix4().makeTranslation(px, 0.25 + k * 0.38, 0.085));
    fb.build(frame);
    const hinge = new THREE.Group(); hinge.position.set(-0.55, 0, -0.03); doorG.add(hinge); hinge.visible = false;
    const sb = new Batch(), steelDoor = M.darkSteel.clone(); steelDoor.color.set(0x4a525c);
    sb.box(steelDoor, 1.1, 2.2, 0.09, 0.55, 1.1, 0);
    for (const py of [0.34, 1.1, 1.86]) { sb.box(M.darkSteel, 1.1, 0.13, 0.022, 0.55, py, 0.055); for (let k = 0; k < 8; k++) sb.add(new THREE.SphereGeometry(0.02, 10, 8), M.steelPlain, new THREE.Matrix4().makeTranslation(0.09 + k * 0.132, py, 0.068)); }
    for (const px of [0.05, 1.05]) for (let k = 0; k < 9; k++) sb.add(new THREE.SphereGeometry(0.016, 8, 6), M.steelPlain, new THREE.Matrix4().makeTranslation(px, 0.14 + k * 0.24, 0.048));
    sb.box(M.black, 0.36, 0.075, 0.03, 0.55, 1.56, 0.04).box(M.darkSteel, 0.42, 0.13, 0.014, 0.55, 1.56, 0.052).box(M.black, 0.3, 0.04, 0.02, 0.55, 1.56, 0.056);
    sb.add(new THREE.CylinderGeometry(0.022, 0.022, 0.52, 12), M.steelPlain, new THREE.Matrix4().makeTranslation(0.95, 1.1, 0.1)).box(M.steelPlain, 0.03, 0.03, 0.06, 0.95, 0.88, 0.07).box(M.steelPlain, 0.03, 0.03, 0.06, 0.95, 1.32, 0.07);
    sb.box(M.steelPlain, 0.09, 0.16, 0.012, 0.83, 1.1, 0.051).add(new THREE.CylinderGeometry(0.018, 0.018, 0.016, 12).rotateX(Math.PI / 2), M.black, new THREE.Matrix4().makeTranslation(0.83, 1.1, 0.058));
    sb.build(hinge);
    // x-ray view of what is inside: three deadbolts + a cross bar
    const bolts = [];
    for (const py of [0.5, 1.1, 1.7]) {
      const body = mesh(new THREE.BoxGeometry(0.42, 0.1, 0.01), M.xrayDim, { cast: false, receive: false, pos: [0.28, py, 0.02] }); body.renderOrder = 20; doorG.add(body);
      const bolt = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 14).rotateZ(Math.PI / 2), M.xray, { cast: false, receive: false, pos: [0.3, py, 0.02] }); bolt.renderOrder = 21; doorG.add(bolt); bolts.push(bolt);
    }
    const bar = mesh(new THREE.BoxGeometry(1.62, 0.12, 0.012), M.xray, { cast: false, receive: false, pos: [0, 1.4, 0.02] }); bar.renderOrder = 21; doorG.add(bar);
    const brk = [];
    for (const px of [-0.72, 0.72]) { const b1 = mesh(new THREE.BoxGeometry(0.14, 0.26, 0.01), M.xrayDim, { cast: false, receive: false, pos: [px, 1.42, 0.02] }); b1.renderOrder = 20; doorG.add(b1); brk.push(b1); }
    H.door = { fall, frame, hinge, bolts, bar, center: new THREE.Vector3(0, base + 1.1, hz) };
  }

  // ---------------------------------------------------------------- foundation + basement windows
  {
    B.add(new THREE.BoxGeometry(hx * 2 + 0.2, base, hz * 2 + 0.2).translate(0, base / 2, 0), M.concrete, null, 0.5);
    H.basement = [];
    const mk = (x, z, ry, special) => {
      const g = new THREE.Group(); g.position.set(x, 0.37, z); g.rotation.y = ry; H.group.add(g);
      const bb = new Batch();
      bb.box(M.trim, 1.02, 0.05, 0.05, 0, 0.19, 0.012).box(M.trim, 1.02, 0.05, 0.05, 0, -0.19, 0.012).box(M.trim, 0.05, 0.43, 0.05, -0.485, 0, 0.012).box(M.trim, 0.05, 0.43, 0.05, 0.485, 0, 0.012).box(M.trim, 0.03, 0.34, 0.04, 0, 0, 0.012);
      bb.build(g);
      let lit = null;
      if (special) {
        const c = document.createElement('canvas'); c.width = 384; c.height = 136;
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
        lit = { canvas: c, tex: t, mat: new THREE.MeshBasicMaterial({ map: t, toneMapped: false, color: 0x8a8a8a }) };
        g.add(mesh(new THREE.PlaneGeometry(0.94, 0.34), lit.mat, { cast: false, receive: false, pos: [0, 0, 0.004] }));
      } else g.add(mesh(new THREE.PlaneGeometry(0.94, 0.34), M.black, { cast: false, pos: [0, 0, 0.004] }));
      g.add(mesh(new THREE.PlaneGeometry(0.94, 0.34), M.glass, { cast: false, pos: [0, 0, 0.02] }));
      return lit;
    };
    mk(-3.1, hz + 0.1, 0, false);
    H.basementLit = mk(3.1, hz + 0.1, 0, true);
    mk(hx + 0.1, 1.2, Math.PI / 2, false); mk(-hx - 0.1, 1.2, -Math.PI / 2, false);
    H.basementPos = new THREE.Vector3(3.1, 0.37, hz + 0.1);
    H.basementLight = new THREE.PointLight(0xc8ff9a, 0, 7, 1.6); H.basementLight.position.set(3.1, 0.5, hz + 0.9); scene.add(H.basementLight);
  }

  // ---------------------------------------------------------------- porch
  {
    const z0 = hz, z1 = hz + 1.75;
    B.box(M.trim, 4.0, base - 0.08, z1 - z0, 0, (base - 0.08) / 2, (z0 + z1) / 2);
    B.add(new THREE.BoxGeometry(4.1, 0.08, z1 - z0 + 0.08).translate(0, base - 0.04, (z0 + z1) / 2 + 0.04), M.deck, null, 1.4);
    for (let k = 0; k < 3; k++) { const top = base - (k + 1) * 0.175; B.add(new THREE.BoxGeometry(2.4, top, 0.36).translate(0, top / 2, z1 + 0.18 + k * 0.36), M.concrete, null, 0.5); B.add(new THREE.BoxGeometry(2.5, 0.05, 0.4).translate(0, top, z1 + 0.18 + k * 0.36), M.deck, null, 1.4); }
    const colTop = 3.25;
    for (const px of [-1.85, 1.85]) {
      B.box(M.trim, 0.17, colTop - base, 0.17, px, (colTop + base) / 2, z1 - 0.18).box(M.trim, 0.26, 0.14, 0.26, px, base + 0.07, z1 - 0.18).box(M.trim, 0.26, 0.1, 0.26, px, colTop - 0.05, z1 - 0.18);
      // side railings
      B.box(M.trim, 0.07, 0.06, z1 - z0 - 0.3, px, base + 0.92, (z0 + z1) / 2 - 0.1).box(M.trim, 0.06, 0.05, z1 - z0 - 0.3, px, base + 0.14, (z0 + z1) / 2 - 0.1);
      for (let k = 0; k < 8; k++) B.box(M.trim, 0.04, 0.76, 0.04, px, base + 0.53, z0 + 0.12 + k * 0.18);
    }
    // beam + small gable roof (ridge runs towards the viewer)
    B.box(M.trim, 4.0, 0.2, 0.16, 0, colTop + 0.1, z1 - 0.18).box(M.trim, 0.16, 0.2, z1 - z0, -1.85, colTop + 0.1, (z0 + z1) / 2).box(M.trim, 0.16, 0.2, z1 - z0, 1.85, colTop + 0.1, (z0 + z1) / 2);
    const pr = 0.62, half = 2.25, ang = Math.atan2(pr, half), sl = Math.hypot(pr, half) + 0.12;
    for (const s of [-1, 1]) {
      const m = new THREE.Matrix4().makeRotationZ(-s * ang).setPosition(s * (half / 2 + 0.02), colTop + 0.2 + pr / 2 + 0.05, (z0 + z1) / 2 + 0.12);
      const g = new THREE.BoxGeometry(sl, 0.09, z1 - z0 + 0.3); g.applyMatrix4(m);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) * 2.2, uv.getX(i) * 2.6);
      B.add(g, M.roofSm);
    }
    const tri = new THREE.Shape(); tri.moveTo(-half, 0); tri.lineTo(half, 0); tri.lineTo(0, pr); tri.closePath();
    B.add(new THREE.ExtrudeGeometry(tri, { depth: 0.06, bevelEnabled: false }).translate(0, colTop + 0.2, z1 - 0.1), M.siding);
    B.box(M.trim, 4.5, 0.06, 0.1, 0, colTop + 0.21, z1 - 0.02);
    // lamp, mat, house number
    B.box(M.black, 0.12, 0.2, 0.08, 0.98, base + 2.05, hz + 0.05).box(M.black, 0.16, 0.03, 0.16, 0.98, base + 2.2, hz + 0.12);
    const lamp = mesh(new THREE.SphereGeometry(0.065, 12, 10), M.lampGlass, { cast: false, receive: false, pos: [0.98, base + 2.08, hz + 0.14] }); H.group.add(lamp);
    H.porchLight = new THREE.PointLight(0xffc78a, 0, 14, 1.7); H.porchLight.position.set(0.9, base + 2.0, hz + 0.6); scene.add(H.porchLight);
    H.lampMat = M.lampGlass;
    B.box(M.woodDark, 0.9, 0.02, 0.5, 0, base + 0.01, hz + 0.45);
  }

  // ---------------------------------------------------------------- main roof, chimney, gutters
  {
    const top = base + wallH, th = 0.16, over = 0.55, sideOver = 0.45;
    const ang = Math.atan2(rise, hz), run = hz + over, len = run / Math.cos(ang), wid = hx * 2 + sideOver * 2;
    const mats = [M.trim, M.trim, M.roof, M.trim, M.trim, M.trim];
    const ny = Math.cos(ang), nz = Math.sin(ang);
    for (const s of [1, -1]) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(wid, th, len), mats);
      slab.position.set(0, top + rise - (run / 2) * Math.tan(ang) + ny * th / 2, s * (run / 2 + nz * th / 2));
      slab.rotation.x = s * ang; slab.castShadow = slab.receiveShadow = true; H.group.add(slab);
      // fascia + gutter
      const ey = top + rise - run * Math.tan(ang);
      B.box(M.trim, wid, 0.2, 0.04, 0, ey + 0.02, s * (run + 0.02));
      B.add(new THREE.CylinderGeometry(0.085, 0.085, wid, 14, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI), M.gutter, new THREE.Matrix4().makeTranslation(0, ey + 0.02, s * (run + 0.11)));
    }
    B.add(new THREE.CylinderGeometry(0.13, 0.13, wid, 12).rotateZ(Math.PI / 2), M.gutter, new THREE.Matrix4().makeTranslation(0, top + rise + 0.13, 0));
    // downpipe at the front-right corner (later feeds the rain tank)
    const ey = top + rise - run * Math.tan(ang);
    B.add(new THREE.CylinderGeometry(0.05, 0.05, ey - 0.6, 10), M.gutter, new THREE.Matrix4().makeTranslation(hx + 0.12, (ey - 0.3 + 0.3) / 2, hz + 0.12));
    B.add(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 10).rotateX(0.95), M.gutter, new THREE.Matrix4().makeTranslation(hx + 0.12, ey - 0.2, hz + 0.38));
    B.add(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 10).rotateX(-1.0), M.gutter, new THREE.Matrix4().makeTranslation(hx + 0.12, 0.3, hz + 0.28));
    H.downpipe = new THREE.Vector3(hx + 0.12, 2.45, hz + 0.12);
    H.roof = { top, ang, run, len, th, ny, nz, ridgeY: top + rise };
    // chimney
    B.add(new THREE.BoxGeometry(0.95, 4.0, 0.95).translate(3.0, 8.3, -1.6), M.brick, null, 1);
    B.box(M.concrete, 1.15, 0.14, 1.15, 3.0, 10.34, -1.6).box(M.black, 0.6, 0.1, 0.6, 3.0, 10.44, -1.6);
    H.chimneyTop = new THREE.Vector3(3.0, 10.5, -1.6);
  }

  // ---------------------------------------------------------------- shrubs along the foundation
  {
    const blob = (x, y, z, r, mat) => { const g = new THREE.IcosahedronGeometry(r, 2), p = g.attributes.position; for (let k = 0; k < p.count; k++) { const s = 1 + (fbm(p.getX(k) * 2.2 + x, p.getY(k) * 2.2 + p.getZ(k) + z, 2) - 0.5) * 0.4; p.setXYZ(k, p.getX(k) * s, p.getY(k) * s * 0.8, p.getZ(k) * s); } g.computeVertexNormals(); B.add(g, mat, new THREE.Matrix4().makeTranslation(x, y, z)); };
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { if (s > 0 && i < 2) continue; /* keep the basement window on the right clear */ const x = s * (2.7 + i * 0.72), r = 0.42 + R() * 0.16; blob(x, r * 0.62, hz + 0.75 + R() * 0.25, r, i % 2 ? M.leafDark : M.leaf); }
    for (let i = 0; i < 5; i++) { blob(-hx - 0.8 - R() * 0.2, 0.4, -2.6 + i * 1.3, 0.5 + R() * 0.15, i % 2 ? M.leaf : M.leafDark); }
  }
  B.build(H.group);

  // ================================================================ per-frame state (pure function of story time)
  const m4 = new THREE.Matrix4(), v3 = new THREE.Vector3(), q4 = new THREE.Quaternion(), s3 = new THREE.Vector3(), e3 = new THREE.Euler();
  const wallM = new THREE.Matrix4();

  function updateWindow(w, t) {
    const hero = !!w.hero;
    // old sash
    setVisible(w.sashHolder, t < w.tBreak);
    // armoured glass layers: fly in separated ("exploded view"), then press into the frame
    const a = prog(t, w.tGlass - 0.75, w.tGlass - 0.2), b = easeIn(prog(t, w.tGlass - 0.16, w.tGlass + 0.06));
    const vis = t > w.tGlass - 0.75;
    w.layers.forEach((lm, i) => {
      setVisible(lm, vis);
      if (!vis) return;
      const ai = easeOut(clamp(a * 1.5 - i * 0.22));
      const spread = lerp(0.42 + i * 0.3, -0.105 + i * 0.018, b);
      lm.position.set(lerp(-2.6 - i * 0.5, 0, ai), lerp(0.25, 0, ai), spread);
      lm.rotation.y = lerp(-0.5, 0, ai) * (1 - b);
    });
    setVisible(w.steelFrame, t > w.tGlass + 0.04);
    if (w.steelFrame.visible) { const k = backOut(prog(t, w.tGlass + 0.04, w.tGlass + 0.24), 2.4); w.steelFrame.scale.setScalar(lerp(1.12, 1, k)); }
    // shutter: housing drops on, rails grow, curtain rolls down
    const hk = prog(t, w.tShut - 0.46, w.tShut - 0.2);
    setVisible(w.housing, hk > 0);
    if (hk > 0) { w.housing.position.y = w.h / 2 + 0.19 + (1 - bounceOut(hk)) * 0.9; }
    const rk = easeOut(prog(t, w.tShut - 0.22, w.tShut - 0.02));
    setVisible(w.rails, rk > 0);
    if (rk > 0) w.rails.scale.y = Math.max(rk, 0.001);
    const q = easeInOut(prog(t, w.tShut, w.tShut + 0.62));
    if (q !== w.q) {
      w.q = q; wallM.copy(w.wall.frame);
      const Hc = w.h + 0.06, topLimit = w.h / 2 + 0.07;
      for (let i = 0; i < w.n; i++) {
        const yf = -w.h / 2 + 0.045 + i * SLAT_H, yy = yf + (1 - q) * Hc;
        if (q <= 0 || yy > topLimit) { slats.setMatrixAt(w.base + i, zeroM); continue; }
        m4.makeScale(w.w + 0.02, i === 0 ? 1.25 : 1, i === 0 ? 1.8 : 1).setPosition(w.u, w.y + yy, 0.1).premultiply(wallM);
        slats.setMatrixAt(w.base + i, m4);
      }
      slats.instanceMatrix.needsUpdate = true;
    }
    return hero;
  }

  H.update = (t, nightK, realT) => {
    for (const w of H.windows) updateWindow(w, t);
    // hero window: cracks then shards
    const w = H.hero;
    const ck = prog(t, w.tBreak - 0.55, w.tBreak - 0.12);
    H.crack.material.opacity = t < w.tBreak ? ck : 0; H.crack.visible = ck > 0 && t < w.tBreak;
    if (H.crack.visible) { const s = lerp(0.35, 1, easeOut(ck)); H.crack.scale.set(s, s, 1); H.crack.position.set((300 / 512 - 0.5) * (w.w - 0.12) * (1 - s), (0.5 - 290 / 512) * (w.h - 0.12) * (1 - s), -0.108); }
    const st = t - w.tBreak, sv = st > 0 && st < 1.5;
    setVisible(H.shards.mesh, sv);
    if (sv) {
      H.shards.list.forEach((s, i) => {
        const k = prog(st, 1.0, 1.5), sc = s.s * (1 - k);
        v3.set(s.p[0] + s.v[0] * st, Math.max(s.p[1] + s.v[1] * st - 4.9 * st * st, -0.62 + (i % 5) * 0.004), s.p[2] + s.v[2] * st * (1 - Math.min(st, 1) * 0.3));
        e3.set(s.ax[0] * s.w * st + s.ph, s.ax[1] * s.w * st, s.ax[2] * s.w * st + s.ph); q4.setFromEuler(e3);
        m4.compose(v3, q4, s3.set(sc, sc, sc)); H.shards.mesh.setMatrixAt(i, m4);
      });
      H.shards.mesh.instanceMatrix.needsUpdate = true;
    }

    // ---- door
    const D = H.door;
    const rattle = prog(t, T.D + 0.7, T.D + 2.0), ra = rattle > 0 && rattle < 1 ? Math.sin(rattle * Math.PI * 9) * Math.pow(Math.sin(rattle * Math.PI), 0.5) * 0.035 : 0;
    const fk = prog(t, T.menyaem + 0.02, T.menyaem + 0.44), gone = prog(t, T.menyaem + 0.46, T.menyaem + 0.74);
    setVisible(D.fall, gone < 1);
    D.fall.rotation.x = bounceOut(fk) * (Math.PI / 2 - 0.02) + ra;
    D.fall.position.set(-easeIn2(gone) * 5.5, 0.03 * Math.sin(fk * Math.PI), 0);
    const fr = prog(t, T.menyaem + 0.34, T.menyaem + 0.66);
    setVisible(D.frame, fr > 0);
    D.frame.position.z = (1 - backOut(fr, 1.2)) * 2.2;
    const dk = prog(t, T.steel - 0.02, T.steel + 0.36);
    setVisible(D.hinge, dk > 0);
    D.hinge.rotation.y = lerp(-2.0, 0, easeIn2(dk));
    D.hinge.scale.setScalar(lerp(0.6, 1, easeOut(Math.min(1, dk * 4))));
    // x-ray mechanism
    const xr = smooth(prog(t, T.bolts - 0.3, T.bolts - 0.05)) * (1 - smooth(prog(t, T.E - 0.35, T.E)));
    M.xray.opacity = xr * 0.95; M.xrayDim.opacity = xr * 0.28;
    D.bolts.forEach((b, i) => { const k = easeOut(prog(t, T.bolts + 0.05 + i * 0.17, T.bolts + 0.17 + i * 0.17)); b.position.x = 0.3 + k * 0.3; });
    const bk = prog(t, T.bar, T.bar + 0.3);
    D.bar.position.y = lerp(2.05, 1.4, bounceOut(bk)); D.bar.visible = t > T.bar - 0.35;

    // ---- night lighting
    M.interior.emissiveIntensity = nightK * 0.9; M.curtain.emissiveIntensity = nightK * 0.35;
    H.porchLight.intensity = nightK * 7; M.lampGlass.color.setScalar(0.25 + nightK * 2.4);
    slitMat.opacity = nightK;
    for (let i = 0; i < slitList.length; i++) setVisible(slitList[i], nightK > 0.02 && H.windows[i >> 1].q >= 1);
  };

  /** Draws the lit basement window (the twist). k = light level 0..1, sx = silhouette x in -1..1 (null = none), eyes 0..1. */
  H.drawBasement = (k, sx, eyes) => {
    const b = H.basementLit, c = b.canvas, x = c.getContext('2d');
    x.fillStyle = '#050505'; x.fillRect(0, 0, c.width, c.height);
    if (k > 0.001) {
      const g = x.createRadialGradient(c.width * 0.5, c.height * 0.1, 10, c.width * 0.5, c.height * 0.4, c.width * 0.75);
      g.addColorStop(0, `rgba(${255 * k | 0},${250 * k | 0},${190 * k | 0},1)`); g.addColorStop(0.5, `rgba(${226 * k | 0},${216 * k | 0},${120 * k | 0},1)`); g.addColorStop(1, `rgba(${120 * k | 0},${110 * k | 0},${40 * k | 0},1)`);
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = `rgba(60,50,20,${0.35 * k})`; for (let i = 0; i < 5; i++) x.fillRect(20 + i * 78, 96, 50, 40); // shelf clutter
    }
    if (sx !== null) {
      const px = c.width * (0.5 + sx * 0.62);
      x.save(); x.filter = 'blur(5px)'; x.fillStyle = 'rgba(4,4,4,0.97)';
      x.beginPath(); x.ellipse(px, 46, 30, 36, 0, 0, 7); x.fill();
      x.beginPath(); x.ellipse(px, 150, 78, 70, 0, 0, 7); x.fill(); x.restore();
      if (eyes > 0) { x.fillStyle = `rgba(215,255,120,${eyes})`; x.shadowColor = '#d8ff7a'; x.shadowBlur = 12; x.beginPath(); x.arc(px - 11, 42, 4.2, 0, 7); x.arc(px + 11, 42, 4.2, 0, 7); x.fill(); x.shadowBlur = 0; }
    }
    b.tex.needsUpdate = true;
    H.basementLight.intensity = k * 1.0;
  };
  H.drawBasement(0, null, 0);
  return H;
}
