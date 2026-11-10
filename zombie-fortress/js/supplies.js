// Decoy siren tower on the hill, and the self-sufficiency upgrades: solar roof, rain-water tank, raised beds.
import * as THREE from 'three';
import { clamp, lerp, prog, smooth, easeOut, easeIn2, easeInOut, backOut, bounceOut, mulberry32, fbm, mesh, worldUV, setVisible } from './util.js';
import { L, groundH } from './world.js';
import { Batch } from './house.js';
import { IMPACTS } from './fortify.js';

const UP = new THREE.Vector3(0, 1, 0);
function strut(batch, mat, a, b, r, seg = 6) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const m = new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()), new THREE.Vector3(1, 1, 1));
  batch.add(new THREE.CylinderGeometry(r, r, len, seg), mat, m);
}

export function buildSupplies(scene, TX, M, T, H, dust) {
  const S = {};
  const R = mulberry32(77);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ================================================================ siren decoy tower
  const hillY = groundH(L.hill.x, L.hill.z);
  S.sirenPos = V(L.hill.x, hillY, L.hill.z);
  const tS = T.stavimSiren + 0.05, tOn = T.sirena + 0.18;
  const siren = { segs: [] };
  {
    const g = new THREE.Group(); g.position.copy(S.sirenPos); g.position.y -= 0.1; scene.add(g);
    const red = new THREE.MeshStandardMaterial({ color: 0xc9382f, roughness: 0.45, metalness: 0.3 }), yel = new THREE.MeshStandardMaterial({ color: 0xe9bb3c, roughness: 0.45, metalness: 0.3, side: THREE.DoubleSide });
    const base = mesh(worldUV(new THREE.BoxGeometry(2.0, 0.5, 2.0).translate(0, 0.25, 0), 0.5), M.concrete); g.add(base); siren.base = base;
    const SEG = 4, SH = 2.1, hw = y => lerp(0.72, 0.3, y / (SEG * SH));
    for (let i = 0; i < SEG; i++) {
      const y0 = i * SH, y1 = y0 + SH, a = hw(y0), b = hw(y1), bt = new Batch(), sg = new THREE.Group(); sg.position.y = 0.5 + y0; g.add(sg);
      const c0 = [V(-a, 0, -a), V(a, 0, -a), V(a, 0, a), V(-a, 0, a)], c1 = [V(-b, SH, -b), V(b, SH, -b), V(b, SH, b), V(-b, SH, b)];
      for (let k = 0; k < 4; k++) { const n = (k + 1) % 4; strut(bt, M.steelPlain, c0[k], c1[k], 0.045); strut(bt, M.steelPlain, c1[k], c1[n], 0.028); strut(bt, M.steelPlain, (i + k) % 2 ? c0[k] : c0[n], (i + k) % 2 ? c1[n] : c1[k], 0.022); }
      bt.build(sg); siren.segs.push(sg);
    }
    const topY = 0.5 + SEG * SH;
    const top = new THREE.Group(); top.position.y = topY; g.add(top); siren.top = top;
    const tb = new Batch();
    tb.box(M.darkSteel, 0.95, 0.07, 0.95, 0, 0.035, 0);
    tb.add(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 10).translate(0, 0.4, 0), M.darkSteel);
    // small solar panel + battery box feeding the siren
    tb.box(M.black, 0.36, 0.3, 0.2, 0.3, 0.22, -0.25);
    tb.build(top);
    const sp = mesh(new THREE.BoxGeometry(0.9, 0.03, 0.6), new THREE.MeshStandardMaterial({ map: TX.solar.map, roughness: 0.25, metalness: 0.5 }), { pos: [-0.55, 0.45, -0.35], rot: [-0.6, 0.5, 0] }); top.add(sp);
    const head = new THREE.Group(); head.position.y = 1.05; top.add(head); siren.head = head;
    const hb = new Batch();
    hb.add(new THREE.CylinderGeometry(0.3, 0.3, 0.46, 20), red).add(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 20).translate(0, 0.25, 0), M.darkSteel).add(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 20).translate(0, -0.25, 0), M.darkSteel);
    for (const s of [-1, 1]) hb.add(new THREE.CylinderGeometry(0.5, 0.12, 0.95, 20, 1, true).rotateZ(s * Math.PI / 2).translate(s * 0.72, 0, 0), yel);
    hb.build(head);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x551111, toneMapped: false });
    const beacon = mesh(new THREE.SphereGeometry(0.11, 14, 10), beaconMat, { cast: false, receive: false, pos: [0, 1.5, 0] }); top.add(beacon);
    siren.beaconMat = beaconMat;
    siren.light = new THREE.PointLight(0xff3020, 0, 40, 1.4); siren.light.position.set(S.sirenPos.x, S.sirenPos.y + topY + 1.6, S.sirenPos.z); scene.add(siren.light);
    // sound rings
    siren.rings = [];
    for (let i = 0; i < 4; i++) {
      const rm = new THREE.Mesh(new THREE.TorusGeometry(1, 0.018, 6, 96).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd89a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
      rm.position.set(S.sirenPos.x, S.sirenPos.y + topY + 1.0, S.sirenPos.z); rm.frustumCulled = false; rm.renderOrder = 9; scene.add(rm); siren.rings.push(rm);
    }
    siren.g = g; siren.topY = topY;
    S.sirenTop = V(S.sirenPos.x, S.sirenPos.y + topY + 1.0, S.sirenPos.z);
    // ground marker ("put it here") shown before the tower is built
    const mk = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.72, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffb02e, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }));
    mk.position.copy(S.sirenPos).setY(S.sirenPos.y + 0.25); scene.add(mk); siren.marker = mk;
    IMPACTS.push({ t: tS + 0.22, a: 0.1 });
    dust.burst({ t: tS + 0.22, pos: [S.sirenPos.x, S.sirenPos.y + 0.2, S.sirenPos.z], n: 14, dir: [0, 0.5, 0], speed: 1.8, spread: 3, size: 1.1, life: 0.9, color: [0.8, 0.78, 0.7], jitter: 1.4 });
  }
  function updateSiren(t, nightK, realT) {
    const mk = smooth(prog(t, T.G + 0.15, T.G + 0.45)) * (1 - smooth(prog(t, tS, tS + 0.3)));
    siren.marker.material.opacity = mk * (0.55 + 0.35 * Math.sin(realT * 9)); siren.marker.visible = mk > 0.01;
    siren.marker.scale.setScalar(1 + 0.08 * Math.sin(realT * 9));
    const b = (t - tS) / 0.22;
    setVisible(siren.g, b > 0);
    if (b <= 0) { siren.light.intensity = 0; for (const r of siren.rings) r.visible = false; return; }
    siren.base.position.y = b < 1 ? 7 * (1 - easeIn2(b)) : 0;
    siren.segs.forEach((sg, i) => { const a = backOut(prog(t, tS + 0.2 + i * 0.1, tS + 0.4 + i * 0.1), 1.3); setVisible(sg, a > 0); sg.scale.set(1, Math.max(a, 0.001), 1); });
    const ta = backOut(prog(t, tS + 0.58, tS + 0.84), 2);
    setVisible(siren.top, ta > 0); siren.top.scale.setScalar(Math.max(ta, 0.001));
    const on = smooth(prog(t, tOn, tOn + 0.35));
    siren.head.rotation.y = on > 0 ? (t - tOn) * 9 * on : 0;
    const blink = on * (0.5 + 0.5 * Math.sin(t * 11));
    siren.beaconMat.color.setRGB(0.3 + blink * 3.2, 0.06 + blink * 0.25, 0.05 + blink * 0.2);
    siren.light.intensity = blink * (20 + nightK * 60);
    siren.rings.forEach((r, i) => {
      const age = ((((t - tOn) / 1.7 + i / 4) % 1) + 1) % 1;
      r.visible = on > 0 && t > tOn + (i / 4) * 1.7;
      r.scale.setScalar(1 + age * 30); r.material.opacity = on * (1 - age) * (1 - age) * (0.75 - nightK * 0.3);
    });
  }

  // ================================================================ solar roof
  const solar = { panels: [] };
  {
    const r = H.roof, run = r.run, th = r.th;
    const g = new THREE.Group();
    g.position.set(0, r.top + L.house.rise - (run / 2) * Math.tan(r.ang) + r.ny * th, run / 2 + r.nz * th);
    g.rotation.x = r.ang; H.group.add(g);
    const alu = new THREE.MeshStandardMaterial({ color: 0xc7ccd2, metalness: 0.9, roughness: 0.35 });
    const cell = new THREE.MeshStandardMaterial({ map: TX.solar.map, roughness: 0.16, metalness: 0.55, envMapIntensity: 1.5 });
    solar.rails = [];
    for (const z of [-1.5, -0.42, 0.42, 1.42]) { const rail = mesh(new THREE.BoxGeometry(7.7, 0.05, 0.05), alu, { pos: [0, 0.03, z - 0.18] }); g.add(rail); solar.rails.push(rail); }
    const fg = new THREE.BoxGeometry(1.0, 0.04, 1.62), cg = new THREE.PlaneGeometry(0.955, 1.575).rotateX(-Math.PI / 2);
    let k = 0;
    for (const z of [-1.14, 0.54]) for (let i = 0; i < 7; i++) {
      const p = new THREE.Group(); p.add(mesh(fg, alu), mesh(cg, cell, { cast: false, pos: [0, 0.0215, 0] }));
      p.userData = { x: (i - 3) * 1.06, z, t: T.paneli - 0.42 + k * 0.07 }; g.add(p); solar.panels.push(p); k++;
    }
    for (let i = 0; i < 14; i += 3) IMPACTS.push({ t: T.paneli - 0.42 + i * 0.07 + 0.3, a: 0.025 });
  }
  function updateSolar(t) {
    const rk = easeOut(prog(t, T.krysha + 0.05, T.krysha + 0.4));
    for (const r of solar.rails) { setVisible(r, rk > 0); r.scale.x = Math.max(rk, 0.001); }
    for (const p of solar.panels) {
      const a = prog(t, p.userData.t, p.userData.t + 0.3), e = backOut(a, 1.1);
      setVisible(p, a > 0);
      if (a > 0) { p.position.set(p.userData.x, 0.085 + (1 - e) * 3.2, p.userData.z - (1 - e) * 1.2); p.rotation.x = (1 - e) * -1.1; p.rotation.z = (1 - e) * 0.4; }
    }
  }

  // ================================================================ rain-water tank
  const tank = {};
  const tTank = T.dvor + 0.12;
  {
    const tx = 6.25, tz = 4.95;
    const g = new THREE.Group(); g.position.set(tx, 0, tz); scene.add(g);
    const body = new THREE.MeshStandardMaterial({ color: 0x2f7d95, roughness: 0.5, metalness: 0.05 });
    const pts = [];
    const r0 = 0.86;
    pts.push(new THREE.Vector2(0.0, 0)); pts.push(new THREE.Vector2(r0 - 0.03, 0));
    for (let i = 0; i <= 36; i++) { const y = 0.03 + (i / 36) * 1.72; pts.push(new THREE.Vector2(r0 + Math.max(0, Math.sin((i / 36) * Math.PI * 6)) * 0.035, y)); }
    for (let i = 1; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; pts.push(new THREE.Vector2(0.3 + (r0 - 0.3) * Math.cos(a), 1.75 + Math.sin(a) * 0.3)); }
    pts.push(new THREE.Vector2(0.0, 2.05));
    const b = new Batch();
    b.add(worldUV(new THREE.BoxGeometry(2.0, 0.3, 2.0).translate(0, 0.15, 0), 0.5), M.concrete);
    b.add(new THREE.LatheGeometry(pts, 40).translate(0, 0.3, 0), body);
    b.add(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 20).translate(0, 2.39, 0), M.black);
    b.add(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 10).rotateX(Math.PI / 2).translate(0, 0.52, 0.93), M.brass).add(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 10).translate(0, 0.47, 1.0), M.brass);
    b.box(M.black, 0.09, 1.56, 0.03, 0.0, 1.2, 0.905);
    b.build(g);
    const water = mesh(new THREE.BoxGeometry(0.055, 1.5, 0.02).translate(0, 0.75, 0), new THREE.MeshStandardMaterial({ color: 0x5fd0ff, emissive: 0x1d86c9, emissiveIntensity: 0.9, roughness: 0.2 }), { cast: false, pos: [0, 0.45, 0.925] }); g.add(water);
    // diverter pipe from the downpipe into the tank lid
    const a = H.downpipe.clone(), c = V(tx, 2.52, tz), mid = V(a.x + 0.25, a.y - 0.05, a.z + 0.35);
    const curve = new THREE.CatmullRomCurve3([a, mid, V(tx - 0.25, 2.62, tz - 0.25), c]);
    const pipe = mesh(new THREE.TubeGeometry(curve, 24, 0.05, 10, false), M.gutter); scene.add(pipe);
    Object.assign(tank, { g, water, pipe, total: pipe.geometry.index.count, pos: V(tx, 0, tz) });
    S.tankPos = tank.pos;
    IMPACTS.push({ t: tTank + 0.3, a: 0.12 });
    dust.burst({ t: tTank + 0.3, pos: [tx, 0.15, tz], n: 12, dir: [0, 0.4, 0], speed: 1.6, spread: 2.6, size: 0.9, life: 0.8, color: [0.8, 0.76, 0.66], jitter: 1.0 });
    dust.burst({ t: T.bak + 0.05, pos: [tx, 2.5, tz], n: 14, dir: [0, 0.6, 0], speed: 1.3, spread: 1.0, size: 0.16, life: 0.55, color: [0.6, 0.85, 1.0], grav: 7, jitter: 0.15, stagger: 0.9 });
  }
  function updateTank(t) {
    const a = (t - tTank) / 0.3;
    setVisible(tank.g, a > 0);
    if (a > 0) { tank.g.position.y = a < 1 ? 7 * (1 - easeIn2(a)) : 0; const sq = a >= 1 ? 1 - 0.06 * Math.exp(-(a - 1) * 5) * Math.cos((a - 1) * 8) : 1; tank.g.scale.set(2 - sq, sq, 2 - sq); }
    const pk = easeInOut(prog(t, T.bak - 0.5, T.bak - 0.05));
    setVisible(tank.pipe, pk > 0); tank.pipe.geometry.setDrawRange(0, Math.floor((pk * tank.total) / 60) * 60);
    tank.water.scale.y = Math.max(0.001, easeInOut(prog(t, T.bak, T.bak + 1.1)) * 0.86);
  }

  // ================================================================ raised garden beds
  const garden = { beds: [], state: -1 };
  const tBeds = T.gryadki - 0.5;
  {
    const lettuceG = (() => { const b = new Batch(); const m = M.leaf; for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.283, g = new THREE.SphereGeometry(0.13, 8, 6).scale(1, 0.32, 0.62).rotateZ(0.5).translate(0.1, 0.07, 0).rotateY(a); b.add(g, m); } b.add(new THREE.SphereGeometry(0.09, 8, 6).scale(1, 0.8, 1).translate(0, 0.08, 0), m); return b.toGeometry(); })();
    const bushG = (() => { const b = new Batch(); for (let i = 0; i < 5; i++) b.add(new THREE.IcosahedronGeometry(0.16, 1).translate(Math.cos(i * 1.3) * 0.1, 0.3 + i * 0.11, Math.sin(i * 1.3) * 0.1), M.leaf); return b.toGeometry(); })();
    const tomG = (() => { const b = new Batch(); for (const [x, y, z] of [[0.15, 0.35, 0.06], [-0.12, 0.5, 0.1], [0.04, 0.62, -0.14], [-0.06, 0.27, -0.13]]) b.add(new THREE.SphereGeometry(0.05, 8, 6).translate(x, y, z), M.leaf); return b.toGeometry(); })();
    const stakeG = new THREE.CylinderGeometry(0.012, 0.012, 0.95, 5).translate(0, 0.475, 0);
    const tuftG = (() => { const b = new Batch(); for (let i = 0; i < 6; i++) b.add(new THREE.ConeGeometry(0.035, 0.34, 5).translate(0, 0.17, 0).rotateZ(0.5).rotateY(i * 1.05), M.leaf); b.add(new THREE.ConeGeometry(0.03, 0.36, 5).translate(0, 0.18, 0), M.leaf); return b.toGeometry(); })();
    const mats = { lettuce: new THREE.MeshStandardMaterial({ color: 0x7fc24a, roughness: 0.8 }), bush: new THREE.MeshStandardMaterial({ color: 0x3f8a3a, roughness: 0.85 }), tom: new THREE.MeshStandardMaterial({ color: 0xe23b2a, roughness: 0.4 }), stake: M.woodPale, tuft: new THREE.MeshStandardMaterial({ color: 0x4fa23a, roughness: 0.85 }) };
    const items = { lettuce: [], bush: [], tom: [], stake: [], tuft: [] };
    const bedX = -9.3, bw = 4.4, bd = 1.3;
    [5.3, 7.45, 9.6].forEach((bz, bi) => {
      const g = new THREE.Group(); g.position.set(bedX, 0, bz); scene.add(g);
      const b = new Batch();
      for (const s of [-1, 1]) { b.add(worldUV(new THREE.BoxGeometry(bw, 0.34, 0.07).translate(0, 0.17, s * bd / 2), 1.2), M.woodPale); b.add(worldUV(new THREE.BoxGeometry(0.07, 0.34, bd).translate(s * bw / 2, 0.17, 0), 1.2), M.woodPale); }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(M.woodDark, 0.1, 0.4, 0.1, sx * (bw / 2 - 0.02), 0.2, sz * (bd / 2 - 0.02));
      b.add(worldUV(new THREE.BoxGeometry(bw - 0.08, 0.06, bd - 0.08).translate(0, 0.27, 0), 1), M.soil);
      b.build(g);
      garden.beds.push({ g, t: tBeds + bi * 0.1 });
      IMPACTS.push({ t: tBeds + bi * 0.1 + 0.24, a: 0.05 });
      dust.burst({ t: tBeds + bi * 0.1 + 0.24, pos: [bedX, 0.1, bz], n: 8, dir: [0, 0.4, 0], speed: 1.2, spread: 2.6, size: 0.7, life: 0.7, color: [0.78, 0.72, 0.6], jitter: 1.6 });
      const rows = bi === 2 ? 3 : 2, cols = bi === 2 ? 12 : bi === 1 ? 7 : 9;
      for (let rj = 0; rj < rows; rj++) for (let ci = 0; ci < cols; ci++) {
        const x = bedX - bw / 2 + 0.3 + (ci / (cols - 1)) * (bw - 0.6), z = bz - bd / 2 + 0.28 + (rows > 1 ? (rj / (rows - 1)) * (bd - 0.56) : 0);
        const t = T.gryadki - 0.12 + bi * 0.16 + ci * 0.035 + rj * 0.05, s = 0.85 + R() * 0.35, ry = R() * 6.28;
        if (bi === 0) items.lettuce.push({ x, z, t, s, ry });
        else if (bi === 1) { items.bush.push({ x, z, t, s, ry }); items.tom.push({ x, z, t: t + 0.12, s, ry }); items.stake.push({ x, z, t: t - 0.05, s: 1, ry }); }
        else items.tuft.push({ x, z, t, s, ry });
      }
    });
    garden.sets = [];
    for (const [k, geo] of [['lettuce', lettuceG], ['bush', bushG], ['tom', tomG], ['stake', stakeG], ['tuft', tuftG]]) {
      const im = new THREE.InstancedMesh(geo, mats[k], items[k].length); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; scene.add(im);
      garden.sets.push({ im, list: items[k] });
    }
    S.bedsPos = V(bedX, 0.3, 7.45);
  }
  const dummy = new THREE.Object3D(), zeroM = new THREE.Matrix4().makeScale(0, 0, 0);
  function updateGarden(t) {
    for (const b of garden.beds) { const a = (t - b.t) / 0.24; setVisible(b.g, a > 0); if (a > 0) b.g.position.y = a < 1 ? 5 * (1 - easeIn2(a)) : 0; }
    const k = prog(t, T.gryadki - 0.2, T.gryadki + 1.6);
    if (k === garden.state) return; garden.state = k;
    for (const set of garden.sets) {
      set.list.forEach((p, i) => {
        const a = backOut(prog(t, p.t, p.t + 0.34), 2.2);
        if (a <= 0) { set.im.setMatrixAt(i, zeroM); return; }
        dummy.position.set(p.x, 0.3, p.z); dummy.rotation.set(0, p.ry, 0); dummy.scale.set(p.s * a, p.s * a, p.s * a); dummy.updateMatrix(); set.im.setMatrixAt(i, dummy.matrix);
      });
      set.im.instanceMatrix.needsUpdate = true;
    }
  }

  // chimney smoke once the siege starts (somebody is living here)
  dust.burst({ t: T.orda, pos: [H.chimneyTop.x, H.chimneyTop.y, H.chimneyTop.z], n: 26, dir: [0.25, 1, 0.1], speed: 1.1, spread: 0.25, size: 1.5, life: 4.2, color: [0.55, 0.57, 0.62], jitter: 0.15, loop: true });

  S.update = (t, nightK, realT) => { updateSiren(t, nightK, realT); updateSolar(t); updateTank(t); updateGarden(t); };
  S.times = { tS, tOn, tTank, tBeds };
  return S;
}
