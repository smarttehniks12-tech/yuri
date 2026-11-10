// The horde: ~2300 instanced zombies whose limbs are animated in the vertex shader, plus a few orange
// "hologram" zombies used as explanatory overlays (climbing the wall, piling up, walking to the siren).
import * as THREE from 'three';
import { clamp, lerp, prog, smooth, easeOut, backOut, mulberry32 } from './util.js';
import { L, rectPoint, groundH } from './world.js';

const LIMB_GLSL = /* glsl */`
attribute float aPart; attribute vec3 aPivot; attribute vec4 aAnim; // aAnim: phase, walk, reach, step frequency
uniform float uTime;
float limbAngle() {
  if (aPart < 0.5) return 0.0;
  float ph = uTime * aAnim.w + aAnim.x;
  if (aPart < 1.5) return sin(ph) * 0.6 * aAnim.y;
  if (aPart < 2.5) return -sin(ph) * 0.6 * aAnim.y;
  float base = -1.3 - aAnim.z * 1.0;
  if (aPart < 3.5) return base + sin(ph * 0.5) * 0.2 + sin(ph) * 0.12 * aAnim.y;
  return base + 0.28 + sin(ph * 0.5 + 2.0) * 0.2 - sin(ph) * 0.12 * aAnim.y;
}
vec3 limbRot(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c); }
`;
function patchLimbs(mat, uTime) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + LIMB_GLSL)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n objectNormal = limbRot(objectNormal, limbAngle());')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed = aPivot + limbRot(transformed - aPivot, limbAngle());');
  };
  mat.customProgramCacheKey = () => 'limbs';
  return mat;
}

function tag(g, part, pivot) {
  const gi = g.index ? g.toNonIndexed() : g, n = gi.attributes.position.count;
  const a = new Float32Array(n).fill(part), p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { p[i * 3] = pivot[0]; p[i * 3 + 1] = pivot[1]; p[i * 3 + 2] = pivot[2]; }
  gi.setAttribute('aPart', new THREE.BufferAttribute(a, 1)); gi.setAttribute('aPivot', new THREE.BufferAttribute(p, 3));
  gi.deleteAttribute('uv');
  return gi;
}
function join(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const out = new THREE.BufferGeometry();
  for (const [name, size] of [['position', 3], ['normal', 3], ['aPart', 1], ['aPivot', 3]]) {
    const arr = new Float32Array(n * size); let o = 0;
    for (const g of list) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  return out;
}

function zombieGeometry() {
  const lean = new THREE.Matrix4().makeTranslation(0, 0.9, 0).multiply(new THREE.Matrix4().makeRotationX(0.22)).multiply(new THREE.Matrix4().makeTranslation(0, -0.9, 0));
  const cap = (r, len, x, y, z, sx = 1, sz = 1) => new THREE.CapsuleGeometry(r, len, 2, 7).scale(sx, 1, sz).translate(x, y, z);
  const clothes = [], skin = [];
  for (const [s, part] of [[-1, 1], [1, 2]]) {
    clothes.push(tag(cap(0.082, 0.64, s * 0.105, 0.49, 0), part, [s * 0.105, 0.9, 0]));
    clothes.push(tag(new THREE.BoxGeometry(0.12, 0.08, 0.25).translate(s * 0.105, 0.04, 0.05), part, [s * 0.105, 0.9, 0]));
  }
  clothes.push(tag(cap(0.175, 0.4, 0, 1.2, 0, 1, 0.7).applyMatrix4(lean), 0, [0, 0, 0]));
  const headC = new THREE.Vector3(0, 1.74, 0.02).applyMatrix4(lean);
  skin.push(tag(new THREE.SphereGeometry(0.128, 9, 7).scale(0.92, 1.08, 1).applyMatrix4(new THREE.Matrix4().makeRotationX(0.25)).translate(headC.x, headC.y, headC.z), 0, [0, 0, 0]));
  const sh = new THREE.Vector3(0, 1.5, 0).applyMatrix4(lean);
  for (const [s, part] of [[-1, 3], [1, 4]]) {
    const piv = [s * 0.245, sh.y, sh.z];
    skin.push(tag(cap(0.052, 0.5, piv[0], piv[1] - 0.29, piv[2]), part, piv));
    skin.push(tag(new THREE.SphereGeometry(0.062, 6, 5).translate(piv[0], piv[1] - 0.62, piv[2]), part, piv));
  }
  const eyeBase = new THREE.Vector3(0, 0.03, 0.118).applyMatrix4(new THREE.Matrix4().makeRotationX(0.25)).add(headC);
  const eyes = join([-1, 1].map(s => tag(new THREE.SphereGeometry(0.021, 6, 4).translate(s * 0.047, eyeBase.y, eyeBase.z), 0, [0, 0, 0])));
  return { clothes: join(clothes), skin: join(skin), eyes, all: join([...clothes, ...skin]) };
}

export function buildHorde(scene, T, sirenPos) {
  const Hd = {};
  const R = mulberry32(2024);
  const G = zombieGeometry();
  const uTime = { value: 0 };
  const { cx, cz, hx, hz } = L.yard, OX = hx + L.moat.outer, OZ = hz + L.moat.outer;

  // ---------------------------------------------------------------- crowd layout
  const Z = [];
  const tGo = T.I + 0.25;
  const NA = 1900, NB = 170, NC = 230;
  for (let i = 0; i < NA; i++) {
    const s = R(), [px, pz] = rectPoint(s, OX, OZ);
    const dx = px - cx, dz = pz - cz, dl = Math.hypot(dx, dz), ux = dx / dl, uz = dz / dl;
    const dense = i < 1250, depth = dense ? 0.5 + Math.pow(R(), 1.15) * 4.2 : 4.5 + Math.pow(R(), 1.4) * 11;
    const ex = px + ux * depth, ez = pz + uz * depth;
    const ang = Math.atan2(uz, ux) + (R() - 0.5) * 0.5, rs = dl + 34 + R() * 26;
    const arr = T.orda + 0.75 + (depth / 15) * 2.4 + R() * 0.7, dur = 3.0 + R() * 1.0;
    const z = { sx: cx + Math.cos(ang) * rs, sz: cz + Math.sin(ang) * rs, ex, ez, arr, dur, depth, kind: 0 };
    if (depth < 1.0 && R() < 0.42) { // falls into the moat
      z.kind = 1; z.fallT = arr + R() * 9.0; z.fx = px - ux * (0.9 + R() * 1.6); z.fz = pz - uz * (0.9 + R() * 1.6);
    }
    Z.push(z);
  }
  for (let i = 0; i < NB; i++) {
    const a = R() * 6.283, r = 2.2 + Math.pow(R(), 0.7) * 8, a0 = a + (R() - 0.5) * 1.2;
    Z.push({ kind: 2, a, r, sx: sirenPos.x + Math.cos(a0) * (30 + R() * 20), sz: sirenPos.z + Math.sin(a0) * (30 + R() * 20), arr: T.orda + 0.5 + R() * 2.5, dur: 3.2, w: (R() < 0.5 ? -1 : 1) * (0.05 + R() * 0.08) });
  }
  for (let i = 0; i < NC; i++) {
    const a = R() * 6.283, r0 = 62 + R() * 30, r1 = 34 + R() * 22;
    if (Math.sin(a) > 0.2 && Math.abs(Math.cos(a)) < 0.9 && R() < 0.3) { i--; continue; }
    Z.push({ kind: 3, sx: cx + Math.cos(a) * r0, sz: cz + Math.sin(a) * r0, ex: cx + Math.cos(a + 0.2) * r1, ez: cz + Math.sin(a + 0.2) * r1, arr: T.orda + 3 + R() * 9, dur: 6 + R() * 4, depth: 20 });
  }
  const N = Z.length;
  Z.forEach((z, i) => { z.ph = R() * 6.283; z.sc = 0.9 + R() * 0.22; z.i = i; });

  const anim = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4); anim.setUsage(THREE.DynamicDrawUsage);
  const mk = (geo, mat) => { geo.setAttribute('aAnim', anim); const im = new THREE.InstancedMesh(geo, mat, N); im.frustumCulled = false; im.visible = false; scene.add(im); return im; };
  const clothes = mk(G.clothes, patchLimbs(new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 }), uTime));
  const skin = mk(G.skin, patchLimbs(new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0 }), uTime));
  const eyes = mk(G.eyes, patchLimbs(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.4, 0.5), toneMapped: false }), uTime));
  skin.instanceMatrix = clothes.instanceMatrix; eyes.instanceMatrix = clothes.instanceMatrix;
  clothes.castShadow = true; skin.castShadow = true; clothes.receiveShadow = true; skin.receiveShadow = true;
  const col = new THREE.Color();
  const cloth = [0x4a5568, 0x5a4a3c, 0x3f5a52, 0x6b3a35, 0x3a4252, 0x575757, 0x4f5a3a, 0x2f3540, 0x6a5a48];
  Z.forEach((z, i) => {
    clothes.setColorAt(i, col.setHex(cloth[(R() * cloth.length) | 0]).multiplyScalar(0.8 + R() * 0.5));
    skin.setColorAt(i, col.setRGB(0.5 + R() * 0.12, 0.62 + R() * 0.1, 0.46 + R() * 0.1));
  });
  Hd.count = N;

  const M = clothes.instanceMatrix.array, A = anim.array;
  const D = L.moat.depth;
  function put(i, x, y, z, yaw, lean, roll, s) {
    // rotation = Ry(yaw) * Rx(lean) * Rz(roll), uniform scale s
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cxr = Math.cos(lean), sxr = Math.sin(lean), cr = Math.cos(roll), sr = Math.sin(roll), o = i * 16;
    M[o] = (cy * cr + sy * sxr * sr) * s; M[o + 1] = cxr * sr * s; M[o + 2] = (-sy * cr + cy * sxr * sr) * s; M[o + 3] = 0;
    M[o + 4] = (-cy * sr + sy * sxr * cr) * s; M[o + 5] = cxr * cr * s; M[o + 6] = (sy * sr + cy * sxr * cr) * s; M[o + 7] = 0;
    M[o + 8] = sy * cxr * s; M[o + 9] = -sxr * s; M[o + 10] = cy * cxr * s; M[o + 11] = 0;
    M[o + 12] = x; M[o + 13] = y; M[o + 14] = z; M[o + 15] = 1;
  }

  Hd.update = (t, realT) => {
    const active = t > tGo;
    clothes.visible = skin.visible = eyes.visible = active;
    if (!active) return;
    uTime.value = realT;
    for (let i = 0; i < N; i++) {
      const z = Z[i], o = i * 4;
      const t0 = z.arr - z.dur, u = clamp((t - t0) / z.dur);
      const grow = clamp((t - Math.max(t0, tGo)) / 0.5);
      if (grow <= 0) { M.fill(0, i * 16, i * 16 + 12); continue; }
      const f = 1 - Math.pow(1 - u, 1.7), moving = u < 1 ? 1 : 0;
      let x, y, zz, yaw, lean = moving * 0.2, roll = Math.sin(realT * 2.2 + z.ph) * 0.07, walk = 0.25 + moving * 0.75, reach = 0, freq = 3.5 + moving * 9 * (1 - u * 0.5);
      if (z.kind === 2) { // circling the siren
        const a = z.a + (t - z.arr) * z.w * (1 - moving), ex = sirenPos.x + Math.cos(a) * z.r, ez = sirenPos.z + Math.sin(a) * z.r;
        x = lerp(z.sx, ex, f); zz = lerp(z.sz, ez, f); y = groundH(x, zz);
        yaw = moving ? Math.atan2(ex - z.sx, ez - z.sz) : Math.atan2(sirenPos.x - x, sirenPos.z - zz) + Math.sin(realT * 0.7 + z.ph) * 0.5;
        walk = 0.55 + moving * 0.45; reach = (1 - moving) * (z.r < 4.5 ? 0.9 : 0.3); freq = 5 + moving * 6;
      } else {
        x = lerp(z.sx, z.ex, f); zz = lerp(z.sz, z.ez, f); y = (x * x + (zz - cz) * (zz - cz) > 2700) ? groundH(x, zz) : 0;
        yaw = Math.atan2(z.ex - z.sx, z.ez - z.sz) + (1 - moving) * Math.sin(realT * 0.9 + z.ph) * 0.25;
        if (z.kind !== 3) reach = (1 - moving) * clamp(1.3 - z.depth * 0.22) * (0.75 + 0.25 * Math.sin(realT * 1.7 + z.ph));
        if (!moving) { const j = Math.sin(realT * 1.3 + z.ph * 3) * 0.06; x += Math.cos(yaw) * j; zz += Math.sin(z.ph + realT) * 0.03; }
        if (z.kind === 1 && t > z.fallT) { // tips over the edge and drops onto the stakes
          const k = clamp((t - z.fallT) / 0.75), e = k * k;
          x = lerp(z.ex, z.fx, Math.min(1, k * 1.4)); zz = lerp(z.ez, z.fz, Math.min(1, k * 1.4));
          y = -e * (D - 0.75); lean = lerp(0.2, 1.45, Math.min(1, k * 1.6)); walk = 1 - k * 0.8; reach = 0.6; freq = 9 * (1 - k) + 1.2;
        }
      }
      put(i, x, y, zz, yaw, lean, roll, z.sc * easeOut(grow));
      A[o] = z.ph; A[o + 1] = walk; A[o + 2] = reach; A[o + 3] = freq;
    }
    clothes.instanceMatrix.needsUpdate = true; anim.needsUpdate = true;
  };

  // ---------------------------------------------------------------- hologram zombies (explanatory overlays)
  const holo = [];
  const front = cz + hz;
  for (const [x, zOff, ph] of [[3.4, 0.62, 0], [4.5, 0.7, 2], [5.7, 0.6, 4], [7.0, 0.72, 1]]) holo.push({ g: 0, x, y: 0, z: front + zOff, yaw: Math.PI, lean: 0.12, roll: 0, walk: 0.25, reach: 1, t: T.lazat - 0.15 + ph * 0.05, end: T.poetomu + 0.05, ph });
  { // pile: layers of bodies forming a ramp up the wall, with two climbers at the top
    const Rp = mulberry32(31); let k = 0;
    for (let layer = 0; layer < 6; layer++) {
      const rows = 6 - layer, cols = 7 - Math.min(layer, 4);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (Rp() < 0.18) continue;
        holo.push({ g: 1, x: 5.2 + (c - (cols - 1) / 2) * 0.62 + (Rp() - 0.5) * 0.3, y: layer * 0.4 + 0.16, z: front + 0.5 + r * 0.72 + (Rp() - 0.5) * 0.2, yaw: Rp() * 6.283, lean: 1.5, roll: (Rp() - 0.5) * 0.6, walk: 0.1, reach: 0.4, t: T.F + 0.25 + layer * 0.26 + Rp() * 0.22, end: T.poetomu + 0.05, ph: Rp() * 6 });
        k++;
      }
    }
    for (const [x, y, zo, t] of [[4.7, 2.35, 0.55, 1.75], [5.6, 2.4, 0.5, 1.9], [5.2, 1.95, 1.2, 1.6]]) holo.push({ g: 1, x, y, z: front + zo, yaw: Math.PI, lean: 0.35, roll: 0, walk: 0.8, reach: 1, t: T.F + t, end: T.poetomu + 0.05, ph: x });
  }
  { // walkers drawn to the siren
    const dir = new THREE.Vector3(cx - sirenPos.x, 0, cz - sirenPos.z).normalize(), side = new THREE.Vector3(-dir.z, 0, dir.x);
    for (let i = 0; i < 18; i++) {
      const lat = (R() - 0.5) * 16, d0 = 16 + R() * 16, d1 = 3 + R() * 3.5;
      holo.push({ g: 2, sx: sirenPos.x + dir.x * d0 + side.x * lat, sz: sirenPos.z + dir.z * d0 + side.z * lat, ex: sirenPos.x + dir.x * d1 + side.x * lat * 0.35, ez: sirenPos.z + dir.z * d1 + side.z * lat * 0.35, t: T.ujdet - 0.35 + R() * 0.5, end: T.H + 0.15, ph: R() * 6, walk: 1, reach: 0.3 });
    }
  }
  const hAnim = new THREE.InstancedBufferAttribute(new Float32Array(holo.length * 4), 4); hAnim.setUsage(THREE.DynamicDrawUsage);
  const hGeo = G.all.clone(); hGeo.setAttribute('aAnim', hAnim);
  const hMat = patchLimbs(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }), uTime);
  const hm = new THREE.InstancedMesh(hGeo, hMat, holo.length); hm.frustumCulled = false; hm.renderOrder = 12; hm.visible = false; scene.add(hm);
  const dummy = new THREE.Object3D(), hc = new THREE.Color();
  holo.forEach((h, i) => hm.setColorAt(i, hc.setRGB(0, 0, 0)));
  Hd.updateHolo = (t, realT) => {
    const any = (t > T.lazat - 0.3 && t < T.poetomu + 0.3) || (t > T.ujdet - 0.5 && t < T.H + 0.4);
    hm.visible = any; if (!any) return;
    uTime.value = realT;
    holo.forEach((h, i) => {
      const a = clamp((t - h.t) / 0.22) * (1 - clamp((t - h.end + 0.25) / 0.25)), o = i * 4;
      hm.setColorAt(i, hc.setRGB(1.0 * a * 0.62, 0.36 * a * 0.62, 0.12 * a * 0.62));
      let x = h.x, y = h.y, z = h.z, yaw = h.yaw, walk = h.walk;
      if (h.g === 2) { const u = clamp((t - h.t) / (h.end - h.t - 0.2)); x = lerp(h.sx, h.ex, u); z = lerp(h.sz, h.ez, u); y = groundH(x, z); yaw = Math.atan2(h.ex - h.sx, h.ez - h.sz); }
      dummy.position.set(x, y, z); dummy.rotation.set(h.lean || 0.15, yaw, h.roll || 0, 'YXZ'); dummy.scale.setScalar(a > 0 ? backOut(clamp((t - h.t) / 0.22), 1.5) : 0.0001); dummy.updateMatrix();
      hm.setMatrixAt(i, dummy.matrix);
      hAnim.array[o] = h.ph; hAnim.array[o + 1] = walk; hAnim.array[o + 2] = h.reach; hAnim.array[o + 3] = h.g === 1 ? 2.5 : 6;
    });
    hm.instanceMatrix.needsUpdate = true; hm.instanceColor.needsUpdate = true; hAnim.needsUpdate = true;
  };
  return Hd;
}
