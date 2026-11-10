// Deterministic particle bursts (dust, dirt, smoke, water). Every particle is a closed-form function of story
// time, evaluated in the vertex shader, so the animation can be scrubbed (and rewound) frame-accurately.
import * as THREE from 'three';
import { mulberry32 } from './util.js';

const VERT = /* glsl */`
attribute vec3 aVel;
attribute vec4 aData;   // t0, life, size, gravity
attribute vec4 aCol;    // rgb + loop flag (1 = repeats every 'life' seconds after t0)
uniform float uTime, uScale;
varying float vA; varying vec3 vC;
void main() {
  float age = uTime - aData.x;
  if (aCol.a > 0.5 && age > 0.0) age = mod(age, aData.y);
  float k = age / aData.y;
  if (age < 0.0 || k > 1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; vC = vec3(0.0); return; }
  vec3 p = position + aVel * age * (1.0 - 0.38 * k) + vec3(0.0, -0.5 * aData.w * age * age, 0.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aData.z * (1.0 + 1.6 * k) * uScale / max(0.1, -mv.z);
  vA = (1.0 - k) * smoothstep(0.0, 0.08, k);
  vC = aCol.rgb;
}`;
const FRAG = /* glsl */`
uniform sampler2D uMap; uniform vec3 uLight; uniform float uOpacity;
varying float vA; varying vec3 vC;
void main() {
  float a = texture2D(uMap, gl_PointCoord).a * vA * uOpacity;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vC * uLight, a);
}`;

export class Dust {
  constructor(puffTex) {
    this.P = []; this.V = []; this.D = []; this.C = [];
    this.rnd = mulberry32(1234);
    this.tex = puffTex;
  }
  /** Registers a burst. dir = main direction, spread = random velocity around it. */
  burst({ t, pos, n = 10, dir = [0, 1, 0], speed = 1.5, spread = 1, size = 0.5, life = 0.9, color = [0.8, 0.76, 0.7], grav = 0, jitter = 0.2, stagger = 0, loop = false }) {
    const r = this.rnd;
    for (let i = 0; i < n; i++) {
      this.P.push(pos[0] + (r() - 0.5) * jitter * 2, pos[1] + (r() - 0.5) * jitter, pos[2] + (r() - 0.5) * jitter * 2);
      const s = speed * (0.5 + r() * 0.8);
      this.V.push(dir[0] * s + (r() - 0.5) * spread * 2, dir[1] * s + (r() - 0.5) * spread, dir[2] * s + (r() - 0.5) * spread * 2);
      this.D.push(t + (loop ? (i / n) * life : r() * stagger), life * (loop ? 1 : 0.7 + r() * 0.6), size * (0.6 + r() * 0.8), grav);
      const v = 0.85 + r() * 0.3;
      this.C.push(color[0] * v, color[1] * v, color[2] * v, loop ? 1 : 0);
    }
  }
  build(scene) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('aVel', new THREE.Float32BufferAttribute(this.V, 3));
    g.setAttribute('aData', new THREE.Float32BufferAttribute(this.D, 4));
    g.setAttribute('aCol', new THREE.Float32BufferAttribute(this.C, 4));
    this.uniforms = { uTime: { value: 0 }, uScale: { value: 1000 }, uMap: { value: this.tex }, uLight: { value: new THREE.Color(1, 1, 1) }, uOpacity: { value: 0.6 } };
    const m = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false; this.points.renderOrder = 8;
    scene.add(this.points);
  }
  update(t, camera, viewportH, light) {
    this.uniforms.uTime.value = t;
    this.uniforms.uScale.value = viewportH / (2 * Math.tan((camera.fov * Math.PI) / 360));
    this.uniforms.uLight.value.copy(light);
  }
}
