// World: layout constants, sky dome, sun/moon lighting with a day -> night curve, terrain with the moat cut-out,
// road, paths and the surrounding forest.
import * as THREE from 'three';
import { clamp, lerp, prog, smooth, fbm, mulberry32, mesh, worldUV } from './util.js';

/** Site layout in metres. The house faces +Z, the yard wall is centred on (0, YARD.cz). */
export const L = {
  house: { hx: 5, hz: 4, base: 0.7, wallH: 5.6, rise: 2.7, thick: 0.25 },
  yard: { cx: 0, cz: 1, hx: 14, hz: 12 },
  wallH: 3.0,
  moat: { inner: 1.5, outer: 5.0, depth: 2.6, slope: 0.45 },
  gateW: 4,
  hill: { x: -44, z: -78, h: 9, sigma: 15 },
  roadZ: 30,
};

export function groundH(x, z) {
  const d = Math.hypot(x, z - L.yard.cz);
  const s = smooth(prog(d, 52, 150));
  let h = s * (fbm(x * 0.011 + 3.1, z * 0.011 + 7.7, 3) * 30 - 9);
  if (h < 0) h *= 0.25;
  const dh2 = (x - L.hill.x) ** 2 + (z - L.hill.z) ** 2;
  h += L.hill.h * Math.exp(-dh2 / (2 * L.hill.sigma * L.hill.sigma));
  return h;
}

/** Point on a rectangle perimeter (half extents ex, ez, centred on the yard) for s in 0..1, starting at the
 *  middle of the front (+Z) side and running clockwise seen from above (towards +X first). Returns [x, z, nx, nz]. */
export function rectPoint(s, ex, ez) {
  const P = 4 * (ex + ez); let d = (((s % 1) + 1) % 1) * P;
  const cx = L.yard.cx, cz = L.yard.cz;
  if (d < ex) return [cx + d, cz + ez, 0, 1]; d -= ex;
  if (d < 2 * ez) return [cx + ex, cz + ez - d, 1, 0]; d -= 2 * ez;
  if (d < 2 * ex) return [cx + ex - d, cz - ez, 0, -1]; d -= 2 * ex;
  if (d < 2 * ez) return [cx - ex, cz - ez + d, -1, 0]; d -= 2 * ez;
  return [cx - ex + d, cz + ez, 0, 1];
}

const SKY_VERT = /* glsl */`
varying vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FRAG = /* glsl */`
uniform vec3 uTop, uHorizon, uGround, uSunDir, uSunColor, uMoonDir, uCloudColor;
uniform float uStars, uTime, uCloud;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 11.3; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.42));
  col = mix(col, uGround, smoothstep(0.0, -0.18, h));
  float sd = max(dot(d, uSunDir), 0.0);
  col += uSunColor * (smoothstep(0.9993, 0.9997, sd) * 6.0 + pow(sd, 24.0) * 0.35 + pow(sd, 4.0) * 0.10) * step(-0.05, h);
  float md = max(dot(d, uMoonDir), 0.0);
  col += uStars * vec3(0.85, 0.92, 1.0) * (smoothstep(0.9990, 0.9994, md) * 2.2 + pow(md, 90.0) * 0.25);
  vec3 sp = d * 190.0; vec3 cell = floor(sp); float st = hash3(cell);
  float star = step(0.9965, st) * smoothstep(0.42, 0.0, length(fract(sp) - 0.5));
  col += uStars * star * smoothstep(0.03, 0.3, h) * (0.55 + 0.45 * sin(uTime * 2.5 + st * 90.0)) * 1.4;
  if (h > 0.005) {
    vec2 uv = d.xz / (h + 0.14) * 1.15 + vec2(uTime * 0.006, 0.0);
    float c = smoothstep(0.50, 0.82, fbm(uv)) * smoothstep(0.0, 0.2, h);
    col = mix(col, uCloudColor, c * uCloud);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

const C = hex => new THREE.Color(hex);
// tod: 0 = afternoon, 0.42 = golden hour, 0.62 = sunset, 0.8 = dusk, 1 = night
const KEYS = [
  { t: 0.00, top: C('#2a6fd6'), hor: C('#b6d8f4'), sun: C('#fff1dc'), sunI: 3.1, hemiSky: C('#bcd8ff'), hemiGnd: C('#66704a'), hemiI: 0.95, fog: C('#c3dbee'), cloud: C('#ffffff'), el: 52, az: -38, exp: 1.0 },
  { t: 0.42, top: C('#3a6cc2'), hor: C('#f4d2a2'), sun: C('#ffd6a2'), sunI: 3.0, hemiSky: C('#cdd6f0'), hemiGnd: C('#6e6648'), hemiI: 0.85, fog: C('#ecd3b0'), cloud: C('#ffe9cf'), el: 24, az: -58, exp: 1.0 },
  { t: 0.62, top: C('#27407e'), hor: C('#f28f58'), sun: C('#ff9858'), sunI: 1.9, hemiSky: C('#98a0d2'), hemiGnd: C('#4c4640'), hemiI: 0.6, fog: C('#c98a68'), cloud: C('#f6a47c'), el: 6, az: -74, exp: 1.05 },
  { t: 0.72, top: C('#1b2a5c'), hor: C('#9a5f6a'), sun: C('#ff8a5a'), sunI: 0.0, hemiSky: C('#7884c0'), hemiGnd: C('#33313a'), hemiI: 0.5, fog: C('#70506a'), cloud: C('#a06a7c'), el: -3, az: -80, exp: 1.1 },
  { t: 0.82, top: C('#0d1532'), hor: C('#3d3560'), sun: C('#9db4ff'), sunI: 0.5, hemiSky: C('#5468a8'), hemiGnd: C('#1c2233'), hemiI: 0.5, fog: C('#2a2c50'), cloud: C('#3a3a60'), el: 50, az: 28, exp: 1.15 },
  { t: 1.00, top: C('#040814'), hor: C('#182849'), sun: C('#a8c0ff'), sunI: 1.15, hemiSky: C('#4059a0'), hemiGnd: C('#161c2c'), hemiI: 0.62, fog: C('#0f1a33'), cloud: C('#1c2a4c'), el: 50, az: 28, exp: 1.2 },
];

export function buildWorld(scene, renderer, TX) {
  const W = { nightK: 0, tod: -1 };

  // ---------------- sky
  const skyU = {
    uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uGround: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunColor: { value: new THREE.Color() }, uMoonDir: { value: new THREE.Vector3(0.3, 0.75, 0.55).normalize() },
    uCloudColor: { value: new THREE.Color() }, uStars: { value: 0 }, uTime: { value: 0 }, uCloud: { value: 0.75 },
  };
  const skyMat = new THREE.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), skyMat);
  sky.renderOrder = -10; sky.frustumCulled = false;
  scene.add(sky);
  W.sky = sky;

  // ---------------- lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera; sc.left = -36; sc.right = 36; sc.top = 36; sc.bottom = -36; sc.near = 1; sc.far = 220;
  sun.shadow.bias = -0.00035; sun.shadow.normalBias = 0.045; sun.shadow.radius = 2.5;
  sun.target.position.set(0, 0, 3);
  scene.add(sun, sun.target);
  scene.fog = new THREE.FogExp2(0xc3dbee, 0.0042);
  W.sun = sun; W.hemi = hemi;

  // ---------------- environment maps (day / night) for reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat));
  const tmpA = new THREE.Color(), tmpDir = new THREE.Vector3();

  function evalKeys(tod) {
    let i = 0; while (i < KEYS.length - 2 && tod > KEYS[i + 1].t) i++;
    const a = KEYS[i], b = KEYS[i + 1], k = clamp((tod - a.t) / (b.t - a.t));
    return { a, b, k };
  }
  function applySky(tod, time) {
    const { a, b, k } = evalKeys(tod);
    skyU.uTop.value.lerpColors(a.top, b.top, k);
    skyU.uHorizon.value.lerpColors(a.hor, b.hor, k);
    skyU.uGround.value.lerpColors(a.fog, b.fog, k).multiplyScalar(0.55);
    skyU.uCloudColor.value.lerpColors(a.cloud, b.cloud, k);
    // the directional light is the sun until it sets (tod 0.72), then it becomes the moon
    const moon = tod > 0.72;
    const el = moon ? 50 : lerp(a.el, b.el, k), az = moon ? 28 : lerp(a.az, b.az, k);
    const er = (el * Math.PI) / 180, ar = (az * Math.PI) / 180;
    tmpDir.set(Math.sin(ar) * Math.cos(er), Math.sin(er), Math.cos(ar) * Math.cos(er));
    const sunVisEl = (lerp(a.el, b.el, k) * Math.PI) / 180, sunVisAz = (lerp(a.az, b.az, k) * Math.PI) / 180;
    if (tod <= 0.72) skyU.uSunDir.value.set(Math.sin(sunVisAz) * Math.cos(sunVisEl), Math.sin(sunVisEl), Math.cos(sunVisAz) * Math.cos(sunVisEl));
    else skyU.uSunDir.value.set(-0.98, -0.12, 0.12).normalize();
    skyU.uSunColor.value.lerpColors(a.sun, b.sun, k).multiplyScalar(tod <= 0.72 ? 1 : 0);
    skyU.uStars.value = smooth(prog(tod, 0.66, 0.95));
    skyU.uTime.value = time;
    return { a, b, k, dir: tmpDir };
  }
  applySky(0.12, 0); const envDay = pmrem.fromScene(envScene, 0, 1, 100).texture;
  applySky(1.0, 0); const envNight = pmrem.fromScene(envScene, 0, 1, 100).texture;
  scene.environment = envDay;

  W.update = (tod, time) => {
    const { a, b, k, dir } = applySky(tod, time);
    sun.position.copy(dir).multiplyScalar(110).add(sun.target.position);
    sun.color.lerpColors(a.sun, b.sun, k);
    sun.intensity = lerp(a.sunI, b.sunI, k);
    hemi.color.lerpColors(a.hemiSky, b.hemiSky, k);
    hemi.groundColor.lerpColors(a.hemiGnd, b.hemiGnd, k);
    hemi.intensity = lerp(a.hemiI, b.hemiI, k);
    scene.fog.color.lerpColors(a.fog, b.fog, k);
    scene.fog.density = lerp(0.0040, 0.0075, smooth(prog(tod, 0.6, 1)));
    renderer.toneMappingExposure = lerp(a.exp, b.exp, k);
    const night = tod > 0.76;
    scene.environment = night ? envNight : envDay;
    scene.environmentIntensity = night ? lerp(0.5, 1.0, prog(tod, 0.76, 0.9)) : lerp(1.0, 0.3, smooth(prog(tod, 0.45, 0.76)));
    W.nightK = smooth(prog(tod, 0.60, 0.86));
    W.tod = tod;
  };
  W.followCamera = cam => { sky.position.copy(cam.position); };

  // ---------------- terrain
  const grassMat = new THREE.MeshStandardMaterial({ map: TX.grass.map, roughness: 0.95, metalness: 0, vertexColors: true });
  const dirtMat = new THREE.MeshStandardMaterial({ map: TX.dirt.map, normalMap: TX.dirt.normalMap, roughness: 1, metalness: 0 });
  W.grassMat = grassMat; W.dirtMat = dirtMat;
  const { cx, cz, hx, hz } = L.yard;
  const IN = { x: hx + L.moat.inner, z: hz + L.moat.inner }, OUT = { x: hx + L.moat.outer, z: hz + L.moat.outer };

  // inner island (yard + berm between wall and moat)
  {
    const g = new THREE.PlaneGeometry(IN.x * 2, IN.z * 2, 1, 1); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz); worldUV(g);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(4 * 3).fill(1), 3));
    scene.add(mesh(g, grassMat, { cast: false }));
  }
  // outer ground: rings that start exactly on the moat's outer rectangle and blend into rolling hills
  {
    const perSide = 36, NA = perSide * 4, NR = 34;
    const pos = [], col = [], uv = [], idx = [];
    for (let k = 0; k <= NR; k++) {
      const Rk = 22 * Math.pow(1.118, k), b = smooth(Math.min(1, k / 6));
      for (let j = 0; j < NA; j++) {
        const [px, pz] = rectPoint(j / NA, OUT.x, OUT.z);
        const dx = px - cx, dz = pz - cz, r0 = Math.hypot(dx, dz), r = k === 0 ? r0 : lerp(r0 + k * 1.6, Rk, b);
        const x = cx + (dx / r0) * r, z = cz + (dz / r0) * r, y = k === 0 ? 0 : groundH(x, z);
        pos.push(x, y, z); uv.push(x, z);
        // macro colour variation fades in away from the house (rings 0-1 stay neutral so the moat plugs match)
        const f = clamp((k - 1) / 3), m = lerp(1, 0.82 + fbm(x * 0.06, z * 0.06, 3) * 0.36, f), dry = fbm(x * 0.02 + 9, z * 0.02, 2) * f;
        col.push(m * (1 + dry * 0.18), m, m * (1 - dry * 0.25));
      }
    }
    for (let k = 0; k < NR; k++) for (let j = 0; j < NA; j++) {
      const a = k * NA + j, b2 = k * NA + ((j + 1) % NA), c = a + NA, d = b2 + NA;
      idx.push(a, c, b2, b2, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    scene.add(mesh(g, grassMat, { cast: false }));
  }
  // moat cavity (sloped earth sides + floor); it is covered by soil plugs until it is dug (see upgrades.js)
  {
    const D = L.moat.depth, sl = L.moat.slope;
    const loops = [[IN.x, IN.z, 0], [IN.x + sl, IN.z + sl, -D], [OUT.x - sl, OUT.z - sl, -D], [OUT.x, OUT.z, 0]];
    const pos = [], uv = [], idx = [];
    const corner = (ex, ez, i) => [cx + (i === 0 || i === 3 ? -ex : ex), cz + (i < 2 ? ez : -ez)];
    for (let l = 0; l < 3; l++) for (let i = 0; i < 4; i++) {
      const A = loops[l], B = loops[l + 1], j = (i + 1) % 4;
      const a0 = corner(A[0], A[1], i), a1 = corner(A[0], A[1], j), b0 = corner(B[0], B[1], i), b1 = corner(B[0], B[1], j);
      const base = pos.length / 3, len = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]);
      pos.push(a0[0], A[2], a0[1], a1[0], A[2], a1[1], b0[0], B[2], b0[1], b1[0], B[2], b1[1]);
      const v0 = l * 3.2, v1 = v0 + 3.2; uv.push(0, v0, len, v0, 0, v1, len, v1);
      idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = mesh(g, new THREE.MeshStandardMaterial({ map: TX.dirt.map, normalMap: TX.dirt.normalMap, roughness: 1, side: THREE.DoubleSide, color: 0xb9a590 }), { cast: false });
    scene.add(m);
  }

  // ---------------- road + paths
  {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512; const x = c.getContext('2d');
    x.drawImage(TX.asphalt.map.image, 0, 0, 256, 512);
    x.fillStyle = 'rgba(235,235,225,0.9)'; x.fillRect(8, 0, 6, 512); x.fillRect(242, 0, 6, 512); x.fillStyle = 'rgba(240,210,90,0.95)'; x.fillRect(124, 60, 8, 230);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const pos = [], uv = [], idx = [], N = 130, half = 3.2;
    for (let i = 0; i <= N; i++) {
      const x0 = -330 + (660 * i) / N;
      for (const s of [-1, 1]) { const z = L.roadZ + s * half; pos.push(x0, Math.max(groundH(x0, z), groundH(x0, L.roadZ)) + 0.05, z); uv.push(s * 0.5 + 0.5, x0 / 9); }
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    scene.add(mesh(g, new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 }), { cast: false }));
    // gravel track from the road to the gate (outside) and paved walk from the gate to the porch (inside)
    const gravel = new THREE.MeshStandardMaterial({ map: TX.dirt.map, color: 0xd9cdbd, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const g1 = new THREE.PlaneGeometry(3.4, L.roadZ - half - (cz + OUT.z)); g1.rotateX(-Math.PI / 2); g1.translate(0, 0.012, (L.roadZ - half + cz + OUT.z) / 2); worldUV(g1);
    scene.add(mesh(g1, gravel, { cast: false }));
    const pave = new THREE.MeshStandardMaterial({ map: TX.paving.map, normalMap: TX.paving.normalMap, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const g2 = new THREE.PlaneGeometry(2.0, cz + IN.z - 6.9); g2.rotateX(-Math.PI / 2); g2.translate(0, 0.012, (cz + IN.z + 6.9) / 2); worldUV(g2);
    scene.add(mesh(g2, pave, { cast: false }));
  }

  // ---------------- trees
  {
    const R = mulberry32(21);
    const paint = (g, r, gg, b) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = r; a[i * 3 + 1] = gg; a[i * 3 + 2] = b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
    const merge = list => {
      let n = 0, ni = 0; for (const g of list) { n += g.attributes.position.count; ni += g.index.count; }
      const P = new Float32Array(n * 3), N = new Float32Array(n * 3), Cc = new Float32Array(n * 3), I = new Uint32Array(ni); let o = 0, oi = 0;
      for (const g of list) {
        P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); Cc.set(g.attributes.color.array, o * 3);
        for (let i = 0; i < g.index.count; i++) I[oi + i] = g.index.array[i] + o; o += g.attributes.position.count; oi += g.index.count;
      }
      const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.setAttribute('normal', new THREE.BufferAttribute(N, 3)); m.setAttribute('color', new THREE.BufferAttribute(Cc, 3)); m.setIndex(new THREE.BufferAttribute(I, 1));
      return m;
    };
    const ico = (r, d) => { const g = new THREE.IcosahedronGeometry(r, d); const gi = g.index ? g : (() => { const n = g.attributes.position.count, ix = new Uint32Array(n); for (let i = 0; i < n; i++) ix[i] = i; g.setIndex(new THREE.BufferAttribute(ix, 1)); return g; })(); return gi; };
    const conifer = () => {
      const parts = [paint(new THREE.CylinderGeometry(0.16, 0.26, 2.4, 8).translate(0, 1.2, 0), 0.30, 0.2, 0.13)];
      const tiers = [[2.3, 3.2, 1.6], [1.9, 3.0, 3.4], [1.45, 2.8, 5.2], [0.95, 2.6, 6.9]];
      tiers.forEach(([r, h, y], i) => parts.push(paint(new THREE.ConeGeometry(r, h, 9, 1).translate(0, y + h / 2, 0).rotateY(i * 0.7), 0.10 + i * 0.022, 0.27 + i * 0.035, 0.15 + i * 0.012)));
      return merge(parts);
    };
    const leafy = detail => {
      const parts = [paint(new THREE.CylinderGeometry(0.2, 0.34, 3.6, 8).translate(0, 1.8, 0), 0.33, 0.23, 0.15)];
      const blobs = [[0, 5.3, 0, 2.2], [1.5, 4.6, 0.4, 1.6], [-1.4, 4.7, -0.5, 1.7], [0.3, 4.5, -1.5, 1.5], [-0.4, 4.6, 1.5, 1.55], [0.2, 6.6, 0.1, 1.5]];
      blobs.forEach(([x, y, z, r], i) => {
        const g = ico(r, detail), p = g.attributes.position;
        const nrm = g.attributes.normal;
        for (let k = 0; k < p.count; k++) {
          const s = 1 + (fbm(p.getX(k) * 1.3 + i, p.getY(k) * 1.3 + p.getZ(k), 2) - 0.5) * 0.35, l = Math.hypot(p.getX(k), p.getY(k), p.getZ(k));
          nrm.setXYZ(k, p.getX(k) / l, p.getY(k) / l, p.getZ(k) / l); // smooth, sphere-like shading
          p.setXYZ(k, p.getX(k) * s, p.getY(k) * s * 0.85, p.getZ(k) * s);
        }
        g.translate(x, y, z);
        parts.push(paint(g, 0.23 + i * 0.015, 0.42 + i * 0.02, 0.16));
      });
      return merge(parts);
    };
    const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
    const spots = { conifer: [], leafy: [] };
    let guard = 0;
    while (spots.conifer.length + spots.leafy.length < 430 && guard++ < 6000) {
      const a = R() * Math.PI * 2, r = 36 + Math.pow(R(), 1.5) * 220, x = Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (z > 6 && r < 54) continue;                          // keep the camera side open
      if (Math.abs(z - L.roadZ) < 7) continue;                 // road
      if (Math.abs(x) < 5 && z > 15 && z < L.roadZ) continue;  // gate track
      if (Math.hypot(x - L.hill.x, z - L.hill.z) < 13) continue; // siren hill top
      if (fbm(x * 0.03 + 5, z * 0.03, 2) < 0.38 && r < 120) continue; // clearings
      (R() < 0.62 ? spots.conifer : spots.leafy).push([x, groundH(x, z) - 0.15, z, 0.8 + R() * 0.75, R() * 6.28, 0.78 + R() * 0.4]);
    }
    spots.leafy.push([-9.6, 0, -6.4, 1.12, 0.6, 1.0]); // yard tree behind the house
    const dummy = new THREE.Object3D(), tint = new THREE.Color();
    for (const [kind, geo] of [['conifer', conifer()], ['leafy', leafy(1)]]) {
      const im = new THREE.InstancedMesh(geo, treeMat, spots[kind].length);
      spots[kind].forEach(([x, y, z, s, ry, c], i) => {
        dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.set(s, s * (0.9 + (c - 0.78) * 0.5), s); dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, tint.setRGB(c, c * (0.95 + (i % 5) * 0.03), c * 0.9));
      });
      im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
      scene.add(im);
    }
  }
  return W;
}
