// Perimeter upgrades: the picket fence that gets replaced, the precast concrete wall with razor wire and
// floodlights, the moat with stakes, and the drawbridge. Everything is a pure function of story time.
import * as THREE from 'three';
import { clamp, lerp, prog, smooth, easeOut, easeIn, easeIn2, easeInOut, backOut, bounceOut, mulberry32, fbm, mesh, worldUV, setVisible } from './util.js';
import { L, rectPoint } from './world.js';
import { Batch } from './house.js';

export const IMPACTS = []; // { t, a } camera-shake impulses collected from all upgrades

const zeroM = new THREE.Matrix4().makeScale(0, 0, 0);

/** Distance along the moat ring from the gate, normalised to 0 (gate) .. 1 (middle of the back side). */
export function ringDist(x, z) {
  const { cz, hx, hz } = L.yard, mx = hx + 3.25, mz = hz + 3.25, dz = z - cz;
  let d;
  if (dz > hz + 1.2) d = Math.abs(x);
  else if (dz < -hz - 1.2) d = mx + 2 * mz + (mx - Math.abs(x));
  else d = mx + (mz - dz);
  return clamp(d / (2 * mx + 2 * mz));
}

export function buildFortify(scene, TX, M, T, W, dust) {
  const F = {};
  const { cx, cz, hx, hz } = L.yard;
  const P = 4 * (hx + hz);
  const R = mulberry32(404);
  const dummy = new THREE.Object3D(), m4 = new THREE.Matrix4(), v3 = new THREE.Vector3(), q4 = new THREE.Quaternion(), s3 = new THREE.Vector3();
  const waveD = d => Math.min(d, P - d) / (P / 2);

  // ================================================================ picket fence (the "before")
  const tFence = T.E + 0.2;
  const fence = {};
  {
    const sh = new THREE.Shape(); sh.moveTo(-0.045, 0); sh.lineTo(0.045, 0); sh.lineTo(0.045, 0.98); sh.lineTo(0, 1.08); sh.lineTo(-0.045, 0.98); sh.closePath();
    const pg = new THREE.ExtrudeGeometry(sh, { depth: 0.022, bevelEnabled: false }); pg.translate(0, 0.06, 0.02);
    const list = [];
    for (let d = 0.08; d < P; d += 0.165) { if (d < 0.9 || d > P - 0.9) continue; const [x, z, nx, nz] = rectPoint(d / P, hx, hz); list.push({ x, z, ry: Math.atan2(nx, nz), w: waveD(d), h: 0.94 + R() * 0.1 }); }
    const im = new THREE.InstancedMesh(pg, M.fence, list.length); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; scene.add(im);
    // rails + posts
    const rg = new THREE.BoxGeometry(2.0, 0.07, 0.035), rl = [];
    for (let d = 1; d < P; d += 2) { const [x, z, nx, nz] = rectPoint(d / P, hx, hz); for (const y of [0.34, 0.86]) rl.push({ x, y, z, ry: Math.atan2(nx, nz), w: waveD(d), s: d < 1.5 || d > P - 1.5 ? 0.1 : 1 }); }
    const rim = new THREE.InstancedMesh(rg, M.fence, rl.length); rim.castShadow = true; rim.frustumCulled = false; scene.add(rim);
    const pog = new THREE.BoxGeometry(0.1, 1.2, 0.1).translate(0, 0.6, 0), pl = [];
    for (let d = 2; d < P; d += 2) { const [x, z] = rectPoint(d / P, hx, hz); pl.push({ x, z, w: waveD(d) }); }
    for (const sx of [-0.95, 0.95]) pl.push({ x: sx, z: cz + hz, w: 0 });
    const pim = new THREE.InstancedMesh(pog, M.fence, pl.length); pim.castShadow = true; pim.frustumCulled = false; scene.add(pim);
    Object.assign(fence, { im, list, rim, rl, pim, pl, state: -1 });
    for (let i = 0; i < 26; i++) { const d = (i / 26) * P, [x, z] = rectPoint(d / P, hx, hz); dust.burst({ t: tFence + waveD(d) * 1.05, pos: [x, 0.5, z], n: 3, speed: 1.2, spread: 0.8, size: 0.5, life: 0.6, color: [0.95, 0.94, 0.9] }); }
  }
  function updateFence(t) {
    const k = prog(t, tFence - 0.05, tFence + 1.45);
    if (k === fence.state) return; fence.state = k;
    const tt = t - tFence;
    const all = k <= 0 ? 0 : k >= 1 ? 2 : 1;
    setVisible(fence.im, all < 2); setVisible(fence.rim, all < 2); setVisible(fence.pim, all < 2);
    if (all === 2) return;
    fence.list.forEach((p, i) => {
      const a = clamp((tt - p.w * 1.05) / 0.28), e = easeOut(a);
      dummy.position.set(p.x, a > 0 ? e * 1.6 : 0, p.z); dummy.rotation.set(a * 2.2 * ((i % 2) * 2 - 1), p.ry, a * 1.4); dummy.scale.set(1 - a, p.h * (1 - a), 1 - a); dummy.updateMatrix();
      fence.im.setMatrixAt(i, a >= 1 ? zeroM : dummy.matrix);
    });
    fence.rl.forEach((p, i) => { const a = clamp((tt - p.w * 1.05) / 0.25); dummy.position.set(p.x, p.y + easeOut(a) * 0.9, p.z); dummy.rotation.set(0, p.ry, 0); dummy.scale.set(p.s * (1 - a), 1 - a, 1 - a); dummy.updateMatrix(); fence.rim.setMatrixAt(i, a >= 1 ? zeroM : dummy.matrix); });
    fence.pl.forEach((p, i) => { const a = clamp((tt - p.w * 1.05) / 0.25); dummy.position.set(p.x, 0, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1 - a, 1 - a, 1 - a); dummy.updateMatrix(); fence.pim.setMatrixAt(i, a >= 1 ? zeroM : dummy.matrix); });
    fence.im.instanceMatrix.needsUpdate = fence.rim.instanceMatrix.needsUpdate = fence.pim.instanceMatrix.needsUpdate = true;
  }

  // ================================================================ concrete wall
  const tWall = T.tri + 0.12, WAVE = 1.75, FALL = 0.34;
  const wall = { state: -1 };
  {
    const pb = new Batch();
    pb.box(M.wallConc, 1.66, 3.0, 0.2, 0, 1.5, 0).box(M.wallConc, 1.66, 0.18, 0.27, 0, 0.09, 0).box(M.wallConc, 1.66, 0.16, 0.27, 0, 2.92, 0);
    for (const y of [0.85, 1.5, 2.15]) pb.box(M.wallConc, 1.5, 0.05, 0.03, 0, y, 0.11);
    const panelGeo = worldUV(pb.toGeometry(), 0.5);
    const qb = new Batch();
    qb.box(M.wallConc, 0.4, 3.3, 0.4, 0, 1.65, 0).box(M.wallConc, 0.52, 0.1, 0.52, 0, 3.35, 0);
    qb.add(new THREE.ConeGeometry(0.34, 0.2, 4, 1).rotateY(Math.PI / 4), M.wallConc, new THREE.Matrix4().makeTranslation(0, 3.5, 0));
    const postGeo = worldUV(qb.toGeometry(), 0.5);
    const panels = [], posts = [];
    for (let d = 1; d < P; d += 2) { if (d < 2 || d > P - 2) continue; const [x, z, nx, nz] = rectPoint(d / P, hx, hz); panels.push({ x, z, ry: Math.atan2(nx, nz), t: tWall + waveD(d) * WAVE, nx, nz }); }
    for (let d = 2; d < P; d += 2) { const [x, z, nx, nz] = rectPoint(d / P, hx, hz); posts.push({ x, z, ry: 0, t: tWall + waveD(d) * WAVE - 0.07, nx, nz, d }); }
    const pim = new THREE.InstancedMesh(panelGeo, M.wallConc, panels.length), qim = new THREE.InstancedMesh(postGeo, M.wallConc, posts.length);
    for (const im of [pim, qim]) { im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); }
    panels.forEach((p, i) => {
      dust.burst({ t: p.t + FALL, pos: [p.x + p.nx * 0.4, 0.15, p.z + p.nz * 0.4], n: 5, dir: [p.nx, 0.5, p.nz], speed: 2.2, spread: 1.3, size: 1.0, life: 0.95, color: [0.82, 0.8, 0.75], jitter: 0.7 });
      dust.burst({ t: p.t + FALL, pos: [p.x - p.nx * 0.4, 0.15, p.z - p.nz * 0.4], n: 4, dir: [-p.nx, 0.5, -p.nz], speed: 2.0, spread: 1.3, size: 0.9, life: 0.9, color: [0.82, 0.8, 0.75], jitter: 0.7 });
      if (i % 3 === 0) IMPACTS.push({ t: p.t + FALL, a: 0.05 });
    });
    // gate: lintel + two steel leaves
    const gate = new THREE.Group(); gate.position.set(0, 0, cz + hz); scene.add(gate);
    const gb = new Batch();
    gb.add(worldUV(new THREE.BoxGeometry(4.4, 0.46, 0.46).translate(0, 3.07, 0), 0.5), M.wallConc);
    const leaf = M.darkSteel.clone(); leaf.color.set(0x505963);
    for (const s of [-1, 1]) {
      gb.box(leaf, 1.78, 2.8, 0.07, s * 0.9, 1.42, 0);
      gb.box(M.darkSteel, 1.78, 0.14, 0.11, s * 0.9, 0.12, 0).box(M.darkSteel, 1.78, 0.14, 0.11, s * 0.9, 2.74, 0).box(M.darkSteel, 1.78, 0.12, 0.11, s * 0.9, 1.42, 0);
      gb.box(M.darkSteel, 0.14, 2.8, 0.11, s * 0.08, 1.42, 0).box(M.darkSteel, 0.14, 2.8, 0.11, s * 1.72, 1.42, 0);
      gb.box(M.darkSteel, 0.1, 2.1, 0.09, s * 0.9, 0.77, 0.005, null, [0, 0, s * 0.9]).box(M.darkSteel, 0.1, 2.1, 0.09, s * 0.9, 2.08, 0.005, null, [0, 0, -s * 0.9]);
      for (let k = 0; k < 7; k++) for (const yy of [0.12, 1.42, 2.74]) gb.add(new THREE.SphereGeometry(0.022, 8, 6), M.steelPlain, new THREE.Matrix4().makeTranslation(s * (0.2 + k * 0.235), yy, 0.058));
    }
    gb.box(M.steelPlain, 0.9, 0.11, 0.05, 0, 1.25, 0.09);
    gb.build(gate);
    IMPACTS.push({ t: tWall + 0.3, a: 0.16 });
    dust.burst({ t: tWall + 0.3, pos: [0, 0.2, cz + hz + 0.5], n: 14, dir: [0, 0.6, 1], speed: 2.6, spread: 2.2, size: 1.2, life: 1.0, color: [0.82, 0.8, 0.75], jitter: 1.6 });
    Object.assign(wall, { panels, posts, pim, qim, gate });
  }
  const dropY = a => (a <= 0 ? null : a < 1 ? 11 * (1 - easeIn2(a)) : 0);
  function updateWall(t) {
    const k = prog(t, tWall - 0.1, tWall + WAVE + FALL + 0.5);
    if (k === wall.state) return; wall.state = k;
    const put = (im, list) => {
      list.forEach((p, i) => {
        const a = (t - p.t) / FALL;
        if (a <= 0) { im.setMatrixAt(i, zeroM); return; }
        const sq = a >= 1 ? 1 - 0.07 * Math.exp(-(a - 1) * 6) * Math.cos((a - 1) * 9) : 1; // squash on landing
        dummy.position.set(p.x, dropY(a), p.z); dummy.rotation.set(0, p.ry, 0); dummy.scale.set(1 + (1 - sq) * 0.5, sq, 1 + (1 - sq) * 0.5); dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
    };
    put(wall.pim, wall.panels); put(wall.qim, wall.posts);
    const ga = (t - tWall + 0.04) / FALL;
    setVisible(wall.gate, ga > 0);
    if (ga > 0) wall.gate.position.y = dropY(ga);
  }

  // ================================================================ razor wire coil + brackets
  const tWire = T.spiral - 0.05, WIRE = 1.7;
  const wire = { state: -1 };
  {
    const y = 3.74, r = 0.3, pitch = 0.42;
    const sides = [
      [new THREE.Vector3(cx + hx, y, cz + hz), new THREE.Vector3(cx - hx, y, cz + hz)],
      [new THREE.Vector3(cx + hx, y, cz + hz), new THREE.Vector3(cx + hx, y, cz - hz)],
      [new THREE.Vector3(cx - hx, y, cz + hz), new THREE.Vector3(cx - hx, y, cz - hz)],
      [new THREE.Vector3(cx + hx, y, cz - hz), new THREE.Vector3(cx - hx, y, cz - hz)],
    ];
    class Helix extends THREE.Curve {
      constructor(a, b) { super(); this.a = a; this.b = b; this.len = a.distanceTo(b); this.turns = Math.round(this.len / pitch); this.side = new THREE.Vector3().subVectors(b, a).normalize().cross(new THREE.Vector3(0, 1, 0)); }
      getPoint(t, target = new THREE.Vector3()) { const ang = t * this.turns * Math.PI * 2; return target.lerpVectors(this.a, this.b, t).addScaledVector(this.side, Math.sin(ang) * r).setY(y + Math.cos(ang) * r); }
    }
    const wireMat = new THREE.MeshStandardMaterial({ color: 0xcfd6dd, metalness: 1, roughness: 0.28, envMapIntensity: 1.6 });
    wire.tubes = []; const barbs = [];
    for (const [a, b] of sides) {
      const c = new Helix(a, b); c.arcLengthDivisions = c.turns * 16; const g = new THREE.TubeGeometry(c, c.turns * 14, 0.017, 5, false);
      const m = mesh(g, wireMat, { receive: false }); m.frustumCulled = false; scene.add(m);
      wire.tubes.push({ m, total: g.index.count });
      for (let i = 0; i < c.turns * 3; i++) { const tt = (i + 0.5) / (c.turns * 3); barbs.push({ t: tt, p: c.getPoint(tt), r: [R() * 6, R() * 6, R() * 6] }); }
    }
    barbs.sort((p, q) => p.t - q.t);
    const bim = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.035, 0).scale(1.9, 0.35, 0.35), wireMat, barbs.length);
    barbs.forEach((b, i) => { dummy.position.copy(b.p); dummy.rotation.set(b.r[0], b.r[1], b.r[2]); dummy.scale.setScalar(1); dummy.updateMatrix(); bim.setMatrixAt(i, dummy.matrix); });
    bim.frustumCulled = false; bim.count = 0; scene.add(bim); wire.bim = bim; wire.nb = barbs.length;
    // V-brackets on every post
    const bg = new THREE.BoxGeometry(0.035, 0.5, 0.035).translate(0, 0.25, 0), bl = [];
    for (const p of wall.posts) for (const s of [-1, 1]) {
      bl.push({ x: p.x, z: p.z, ax: p.nx * s, az: p.nz * s, w: waveD(p.d) });
    }
    const brim = new THREE.InstancedMesh(bg, M.darkSteel, bl.length); brim.frustumCulled = false; brim.castShadow = true; scene.add(brim);
    wire.brim = brim; wire.bl = bl;
  }
  function updateWire(t) {
    const k = prog(t, tWire - 0.5, tWire + WIRE + 0.05);
    if (k === wire.state) return; wire.state = k;
    const w = easeInOut(prog(t, tWire, tWire + WIRE));
    for (const tb of wire.tubes) { tb.m.geometry.setDrawRange(0, Math.floor((w * tb.total) / 30) * 30); setVisible(tb.m, w > 0); }
    wire.bim.count = Math.floor(w * wire.nb);
    wire.bl.forEach((b, i) => {
      const a = backOut(prog(t, tWire - 0.45 + b.w * 0.25, tWire - 0.25 + b.w * 0.25));
      if (a <= 0) { wire.brim.setMatrixAt(i, zeroM); return; }
      v3.set(b.ax * 0.62, 1, b.az * 0.62).normalize(); q4.setFromUnitVectors(dummy.up, v3);
      m4.compose(dummy.position.set(b.x, 3.36, b.z), q4, s3.set(1, a, 1)); wire.brim.setMatrixAt(i, m4);
    });
    wire.brim.instanceMatrix.needsUpdate = true;
  }

  // ================================================================ floodlights
  const tMast = tWall + WAVE + 0.15;
  const lights = [];
  {
    const beamMat = new THREE.ShaderMaterial({
      uniforms: { uI: { value: 0 }, uColor: { value: new THREE.Color(0xdfeaff) } },
      vertexShader: /* glsl */`varying vec2 vUv; varying vec3 vN, vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */`uniform float uI; uniform vec3 uColor; varying vec2 vUv; varying vec3 vN, vV; void main(){ float e = pow(abs(dot(normalize(vN), normalize(vV))), 1.6); float a = pow(vUv.y, 2.6) * e * uI; gl_FragColor = vec4(uColor * a, a); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
    });
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x222428, toneMapped: false });
    const spots = [
      { x: cx + hx - 0.75, z: cz + hz - 0.75, h: 6.4, dir: [0.62, 0.78], sw: 0.0 }, { x: cx - hx + 0.75, z: cz + hz - 0.75, h: 6.4, dir: [-0.62, 0.78], sw: 1.7 },
      { x: cx + hx - 0.75, z: cz - hz + 0.75, h: 6.4, dir: [0.7, -0.7], sw: 3.1 }, { x: cx - hx + 0.75, z: cz - hz + 0.75, h: 6.4, dir: [-0.7, -0.7], sw: 4.4 },
      { x: 2.0, z: cz + hz, h: 4.75, dir: [0.3, 0.95], sw: 2.2, gate: true }, { x: -2.0, z: cz + hz, h: 4.75, dir: [-0.3, 0.95], sw: 5.3, gate: true },
    ];
    for (const s of spots) {
      const g = new THREE.Group(); g.position.set(s.x, 0, s.z); scene.add(g);
      const b = new Batch();
      const y0 = s.gate ? 3.5 : 0;
      b.add(new THREE.CylinderGeometry(0.055, s.gate ? 0.055 : 0.085, s.h - y0, 10).translate(0, (s.h + y0) / 2, 0), M.darkSteel);
      if (!s.gate) b.box(M.concrete, 0.5, 0.25, 0.5, 0, 0.125, 0);
      b.build(g);
      const head = new THREE.Group(); head.position.set(0, s.h, 0); g.add(head);
      const hb = new Batch();
      hb.box(M.darkSteel, 0.95, 0.06, 0.06, 0, 0, 0);
      for (const sx of [-0.28, 0.28]) { hb.box(M.black, 0.44, 0.3, 0.2, sx, -0.02, 0.1); hb.box(M.darkSteel, 0.5, 0.04, 0.26, sx, 0.15, 0.12); }
      hb.build(head);
      for (const sx of [-0.28, 0.28]) head.add(mesh(new THREE.PlaneGeometry(0.38, 0.24), lensMat, { cast: false, receive: false, pos: [sx, -0.02, 0.205] }));
      const cone = new THREE.Mesh(new THREE.ConeGeometry(8.5, 40, 36, 1, true).translate(0, -20, 0), beamMat);
      cone.frustumCulled = false; cone.renderOrder = 9; cone.visible = false; scene.add(cone);
      const sl = new THREE.SpotLight(0xe6eeff, 0, 75, 0.5, 0.7, 1.25); sl.position.set(s.x, s.h, s.z); scene.add(sl, sl.target);
      lights.push({ ...s, g, head, cone, sl });
    }
    F.beamMat = beamMat; F.lensMat = lensMat;
  }
  const aim = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0);
  function updateLights(t, nightK, realT) {
    const on = nightK * smooth(prog(t, T.I + 0.95, T.I + 1.25)); // flick on just after "time's up"
    F.beamMat.uniforms.uI.value = on * 0.17;
    F.lensMat.color.setScalar(0.1 + on * 3.2);
    lights.forEach((l, i) => {
      const a = backOut(prog(t, tMast + i * 0.06, tMast + 0.3 + i * 0.06), 1.4);
      setVisible(l.g, a > 0); if (a > 0) l.g.scale.set(1, Math.max(a, 0.001), 1);
      const yaw = Math.atan2(l.dir[0], l.dir[1]) + Math.sin(realT * 0.5 + l.sw) * (l.gate ? 0.3 : 0.42);
      const pitch = (l.gate ? 0.30 : 0.24) + Math.sin(realT * 0.37 + l.sw * 2) * 0.03;
      aim.set(Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      l.head.rotation.set(pitch, yaw, 0, 'YXZ');
      setVisible(l.cone, on > 0.01 && a >= 1);
      if (l.cone.visible) { l.cone.position.set(l.x + aim.x * 0.3, l.h, l.z + aim.z * 0.3); l.cone.quaternion.setFromUnitVectors(down, aim); }
      l.sl.intensity = a >= 1 ? on * 80 : 0;
      l.sl.target.position.set(l.x + aim.x * 30, l.h + aim.y * 30, l.z + aim.z * 30);
    });
  }

  // ================================================================ moat: soil plugs that get dug out, berm, stakes
  const tDig = T.rov - 0.3, DIG_WAVE = 1.35, DIG = 0.42;
  const moat = { state: -1 };
  {
    const D = L.moat.depth, IN = { x: hx + L.moat.inner, z: hz + L.moat.inner }, OUT = { x: hx + L.moat.outer, z: hz + L.moat.outer };
    const grassPlain = W.grassMat.clone(); grassPlain.vertexColors = false;
    const dirtTop = W.dirtMat;
    const plugs = [];
    const add = (x0, x1, z0, z1) => {
      const g = new THREE.BoxGeometry(x1 - x0, D, z1 - z0); g.translate((x0 + x1) / 2, D / 2, (z0 + z1) / 2); worldUV(g);
      const m = new THREE.Mesh(g, [dirtTop, dirtTop, grassPlain, dirtTop, dirtTop, dirtTop]); m.position.y = -D; m.receiveShadow = true; m.castShadow = false; scene.add(m);
      const xc = (x0 + x1) / 2, zc = (z0 + z1) / 2, t = tDig + ringDist(xc, zc) * DIG_WAVE;
      plugs.push({ m, t, xc, zc });
      dust.burst({ t: t + 0.03, pos: [xc, 0.2, zc], n: 16, dir: [0, 1, 0], speed: 4.6, spread: 2.2, size: 0.55, life: 0.85, color: [0.42, 0.3, 0.2], grav: 9, jitter: 1.4, stagger: 0.22 });
      dust.burst({ t: t + 0.05, pos: [xc, 0.1, zc], n: 3, dir: [0, 1, 0], speed: 1.2, spread: 1.2, size: 1.6, life: 1.1, color: [0.62, 0.5, 0.38], jitter: 1.2 });
    };
    const nx = 15, nz = 13;
    for (const s of [1, -1]) {
      const za = cz + s * IN.z, zb = cz + s * OUT.z;
      for (let i = 0; i < nx; i++) add(cx - IN.x + (i * 2 * IN.x) / nx, cx - IN.x + ((i + 1) * 2 * IN.x) / nx, Math.min(za, zb), Math.max(za, zb));
      const xa = cx + s * IN.x, xb = cx + s * OUT.x;
      for (let i = 0; i < nz; i++) add(Math.min(xa, xb), Math.max(xa, xb), cz - IN.z + (i * 2 * IN.z) / nz, cz - IN.z + ((i + 1) * 2 * IN.z) / nz);
      for (const s2 of [1, -1]) { const zc0 = cz + s2 * IN.z, zc1 = cz + s2 * OUT.z; add(Math.min(xa, xb), Math.max(xa, xb), Math.min(zc0, zc1), Math.max(zc0, zc1)); }
    }
    moat.plugs = plugs; moat.dirtTop = dirtTop; moat.grassPlain = grassPlain;
    // berm mounds between wall and moat
    const mg = new THREE.IcosahedronGeometry(1, 2), mp = mg.attributes.position;
    for (let k = 0; k < mp.count; k++) { const s = 1 + (fbm(mp.getX(k) * 2 + 3, mp.getY(k) * 2 + mp.getZ(k) * 2, 2) - 0.5) * 0.5; mp.setXYZ(k, mp.getX(k) * s, Math.max(mp.getY(k) * s, -0.2), mp.getZ(k) * s); }
    mg.computeVertexNormals();
    const ml = [];
    const PB = 4 * (hx + hz + 1.5);
    for (let d = 0.9; d < PB; d += 1.9) {
      const [x, z, nxx, nzz] = rectPoint(d / PB, hx + 0.78, hz + 0.78);
      if (z > cz + hz && Math.abs(x) < 3.2) continue;
      ml.push({ x, z, ry: Math.atan2(nxx, nzz), t: tDig + ringDist(x, z) * DIG_WAVE + 0.12, s: [1.15 + R() * 0.35, 0.34 + R() * 0.16, 0.5 + R() * 0.12] });
    }
    const mim = new THREE.InstancedMesh(mg, new THREE.MeshStandardMaterial({ map: TX.dirt.map, color: 0xa58a70, roughness: 1 }), ml.length);
    mim.castShadow = true; mim.receiveShadow = true; mim.frustumCulled = false; scene.add(mim);
    moat.mim = mim; moat.ml = ml;
    IMPACTS.push({ t: tDig + 0.1, a: 0.07 }, { t: tDig + 0.5, a: 0.07 }, { t: tDig + 0.9, a: 0.06 });

    // stakes
    const sb = new Batch(), wood = new THREE.MeshStandardMaterial({ map: TX.wood.map, color: 0xb08a5e, roughness: 0.85 });
    sb.add(new THREE.CylinderGeometry(0.075, 0.095, 2.0, 8).translate(0, 1.0, 0), wood).add(new THREE.ConeGeometry(0.075, 0.45, 8).translate(0, 2.225, 0), wood);
    const stakeGeo = sb.toGeometry();
    const sl = [];
    for (const [off, tilt] of [[2.6, 0.2], [3.95, 0.5]]) {
      const Ps = 4 * (hx + hz + 2 * off);
      for (let d = 0.3; d < Ps; d += 0.74) {
        const [x, z, nxx, nzz] = rectPoint(d / Ps, hx + off, hz + off);
        const a = tilt + (R() - 0.5) * 0.22, yaw = (R() - 0.5) * 0.5;
        const dir = new THREE.Vector3(nxx * Math.sin(a) + nzz * yaw * 0.3, Math.cos(a), nzz * Math.sin(a) - nxx * yaw * 0.3).normalize();
        sl.push({ x: x + (R() - 0.5) * 0.15, z: z + (R() - 0.5) * 0.15, dir, q: new THREE.Quaternion().setFromUnitVectors(dummy.up, dir), t: T.kolya - 0.12 + ringDist(x, z) * 0.95 + R() * 0.05, s: 0.82 + R() * 0.3 });
      }
    }
    const sim = new THREE.InstancedMesh(stakeGeo, wood, sl.length); sim.castShadow = true; sim.receiveShadow = true; sim.frustumCulled = false; scene.add(sim);
    moat.sim = sim; moat.sl = sl; moat.stakeState = -1;
  }
  function updateMoat(t) {
    const D = L.moat.depth;
    const k = prog(t, tDig - 0.05, tDig + DIG_WAVE + DIG + 0.45);
    if (k !== moat.state) {
      moat.state = k;
      for (const p of moat.plugs) {
        const a = prog(t, p.t, p.t + DIG);
        setVisible(p.m, a < 1);
        if (a < 1) { p.m.scale.y = 1 - easeOut(a) * 0.985; const top = a > 0.04 ? moat.dirtTop : moat.grassPlain; if (p.m.material[2] !== top) p.m.material[2] = top; }
      }
      moat.ml.forEach((p, i) => {
        const a = backOut(prog(t, p.t, p.t + 0.35), 1.2);
        if (a <= 0) { moat.mim.setMatrixAt(i, zeroM); return; }
        dummy.position.set(p.x, 0, p.z); dummy.rotation.set(0, p.ry, 0); dummy.scale.set(p.s[0], p.s[1] * a, p.s[2] * (0.6 + 0.4 * a)); dummy.updateMatrix(); moat.mim.setMatrixAt(i, dummy.matrix);
      });
      moat.mim.instanceMatrix.needsUpdate = true;
    }
    const ks = prog(t, T.kolya - 0.2, T.kolya + 1.35);
    if (ks !== moat.stakeState) {
      moat.stakeState = ks;
      moat.sl.forEach((p, i) => {
        const a = prog(t, p.t, p.t + 0.2);
        if (a <= 0) { moat.sim.setMatrixAt(i, zeroM); return; }
        const up = (backOut(a, 2.2) - 1) * 2.5;
        m4.compose(v3.set(p.x + p.dir.x * up, -D - 0.25 + p.dir.y * up, p.z + p.dir.z * up), p.q, s3.set(p.s, p.s, p.s)); moat.sim.setMatrixAt(i, m4);
      });
      moat.sim.instanceMatrix.needsUpdate = true;
    }
  }

  // ================================================================ drawbridge
  const tBridge = T.kolya + 0.22, RAISE = 0.95, BRIDGE_MAX = 1.46;
  const bridge = {};
  {
    const zH = cz + hz + 0.36, LEN = 5.15;
    const g = new THREE.Group(); g.position.set(0, 0.1, zH); scene.add(g);
    const b = new Batch();
    b.add(worldUV(new THREE.BoxGeometry(3.6, 0.14, LEN).translate(0, 0, LEN / 2), 0.7), M.deck);
    for (const s of [-1, 1]) b.box(M.darkSteel, 0.1, 0.24, LEN, s * 1.82, 0, LEN / 2);
    for (const zz of [0.5, LEN / 2, LEN - 0.4]) { b.box(M.darkSteel, 3.7, 0.035, 0.18, 0, 0.085, zz); for (let k = 0; k < 9; k++) b.add(new THREE.SphereGeometry(0.025, 8, 6), M.steelPlain, new THREE.Matrix4().makeTranslation(-1.6 + k * 0.4, 0.105, zz)); }
    for (const xx of [-1.1, 0, 1.1]) b.box(M.woodDark, 0.16, 0.16, LEN - 0.2, xx, -0.15, LEN / 2);
    for (const s of [-1, 1]) b.add(new THREE.TorusGeometry(0.07, 0.02, 6, 12), M.steelPlain, new THREE.Matrix4().makeTranslation(s * 1.62, 0.12, LEN - 0.4));
    b.build(g);
    const chainMat = new THREE.MeshStandardMaterial({ color: 0x2c3036, metalness: 0.9, roughness: 0.5 });
    const chains = [-1, 1].map(s => { const c = mesh(new THREE.CylinderGeometry(0.032, 0.032, 1, 6).translate(0, 0.5, 0), chainMat); scene.add(c); return { c, s, top: new THREE.Vector3(s * 1.95, 3.34, cz + hz + 0.26), loc: new THREE.Vector3(s * 1.62, 0.12, LEN - 0.4) }; });
    // pulleys on the lintel
    const pb = new Batch(); for (const s of [-1, 1]) pb.add(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 14).rotateZ(Math.PI / 2), M.darkSteel, new THREE.Matrix4().makeTranslation(s * 1.95, 3.34, cz + hz + 0.28));
    const pulleys = new THREE.Group(); scene.add(pulleys); pb.build(pulleys);
    Object.assign(bridge, { g, chains, pulleys });
    IMPACTS.push({ t: tBridge + 0.3, a: 0.12 }, { t: T.most + RAISE, a: 0.14 });
    dust.burst({ t: tBridge + 0.3, pos: [0, 0.2, zH + LEN], n: 10, dir: [0, 0.5, 1], speed: 1.6, spread: 2.2, size: 0.9, life: 0.8, color: [0.7, 0.62, 0.5], jitter: 1.5 });
    dust.burst({ t: T.most + RAISE, pos: [0, 3.2, zH + 0.3], n: 12, dir: [0, 0.2, 1], speed: 1.4, spread: 2.0, size: 0.8, life: 0.8, color: [0.82, 0.8, 0.75], jitter: 1.6 });
  }
  const up3 = new THREE.Vector3(0, 1, 0), end3 = new THREE.Vector3();
  function updateBridge(t) {
    const a = (t - tBridge) / 0.3;
    setVisible(bridge.g, a > 0); setVisible(bridge.pulleys, a > 0);
    for (const c of bridge.chains) setVisible(c.c, a > 0);
    if (a <= 0) return;
    const y = a < 1 ? 8 * (1 - easeIn2(a)) : 0;
    const r = easeInOut(prog(t, T.most, T.most + RAISE)), ang = r * BRIDGE_MAX + (r >= 1 ? Math.exp(-(t - T.most - RAISE) * 7) * Math.sin((t - T.most - RAISE) * 26) * 0.012 : 0);
    bridge.g.position.y = 0.1 + y; bridge.g.rotation.x = -ang;
    bridge.g.updateMatrixWorld(true);
    for (const c of bridge.chains) {
      end3.copy(c.loc).applyMatrix4(bridge.g.matrixWorld);
      const len = end3.distanceTo(c.top);
      c.c.position.copy(end3); v3.subVectors(c.top, end3).normalize(); c.c.quaternion.setFromUnitVectors(up3, v3); c.c.scale.set(1, len, 1);
    }
  }

  F.update = (t, nightK, realT) => { updateFence(t); updateWall(t); updateWire(t); updateLights(t, nightK, realT); updateMoat(t); updateBridge(t); };
  F.times = { tFence, tWall, WAVE, FALL, tWire, WIRE, tDig, DIG_WAVE, tBridge, RAISE, tMast };
  return F;
}
