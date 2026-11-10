// Camera choreography: a list of shots (cuts) keyed to the narration cues, with eased moves inside each shot,
// a little hand-held drift and impact shake.
import * as THREE from 'three';
import { clamp, lerp, prog, smooth, easeInOut, easeOut } from './util.js';
import { IMPACTS } from './fortify.js';

export function buildCamera(camera, T, S, H) {
  const hill = S.sirenPos, hv = (x, y, z) => [hill.x + x, hill.y + y, hill.z + z];
  const hero = H.hero.center, door = H.door.center, bw = H.basementPos;
  const lin = x => x;
  // [start, end, pos0, pos1, target0, target1, fov0, fov1, ease]
  const SHOTS = [
    [0, T.hookEnd, [8.5, 2.5, 32], [21, 19, 41], [0, 5.2, 6], [0, 1.5, 4], 54, 50, smooth],
    [T.hookEnd, T.rewindEnd, [21, 19, 41], [-15.5, 6.6, 27.5], [0, 1.5, 4], [0, 3.6, 1.5], 50, 48, easeInOut],
    [T.rewindEnd, T.C, [-15.5, 6.6, 27.5], [-11.5, 5.4, 24], [0, 3.6, 1.5], [0, 3.9, 2], 48, 48, easeOut],
    // 1 - windows
    [T.C, T.steklo, [-6.6, 3.5, 15.4], [-5.0, 2.8, 10.8], [hero.x, hero.y, hero.z], [hero.x, hero.y, hero.z], 40, 37, easeOut],
    [T.steklo, T.stavim, [-5.0, 2.8, 10.8], [-4.6, 2.65, 10.1], [hero.x, hero.y, hero.z], [hero.x, hero.y, hero.z], 37, 36, lin],
    [T.stavim, T.rolls + 0.78, [-1.3, 2.75, 9.9], [-1.9, 2.6, 9.5], [hero.x, hero.y + 0.05, hero.z], [hero.x, hero.y + 0.08, hero.z], 40, 39, smooth],
    [T.rolls + 0.78, T.D, [0, 6.4, 34], [0, 5.9, 31.5], [0, 3.9, 4], [0, 3.9, 4], 40, 40, easeOut],
    // 2 - door
    [T.D, T.menyaem, [1.2, 2.4, 12.2], [0.85, 2.05, 9.9], [door.x, door.y + 0.05, door.z], [door.x, door.y + 0.02, door.z], 35, 34, easeOut],
    [T.menyaem, T.E, [0.85, 2.05, 9.9], [0.5, 1.95, 9.0], [door.x, door.y + 0.02, door.z], [door.x, door.y - 0.02, door.z], 34, 35, smooth],
    // 3 - wall
    [T.E, T.sverhu - 0.05, [31, 24, 49], [25, 26, 53], [0, 0, 5], [0, 0.6, 4], 58, 58, smooth],
    [T.sverhu - 0.05, T.lazat, [12.7, 4.75, 11.2], [11.4, 4.55, 11.5], [-2, 3.55, 13.0], [-3, 3.6, 13.0], 36, 34, smooth],
    [T.lazat, T.F, [9.8, 1.3, 21.8], [8.8, 1.2, 20.6], [5.0, 2.3, 13.5], [5.1, 2.1, 13.5], 40, 40, easeOut],
    // 4 - moat
    [T.F, T.poetomu, [8.8, 1.2, 20.6], [10.8, 2.7, 21.8], [5.1, 2.1, 13.5], [5.2, 2.0, 13.4], 40, 43, smooth],
    [T.poetomu, T.kolya - 0.05, [-31, 23, 45], [-26, 21, 43], [0, 0, 8], [0, 0, 8], 56, 56, easeOut],
    [T.kolya - 0.05, T.most - 0.02, [-12.8, -0.95, 16.2], [-11.6, -0.7, 16.25], [4, -1.9, 16.3], [4, -1.8, 16.3], 48, 46, lin],
    [T.most - 0.02, T.G, [8.8, 3.0, 27.5], [7.2, 3.5, 25.8], [0, 2.3, 15], [0, 2.7, 14.5], 42, 42, smooth],
    // 5 - siren
    [T.G, T.stavimSiren, hv(-6.5, 5, -12.5), hv(-5.2, 4.2, -10.8), hv(2.5, 1.2, 5), hv(2.5, 1.0, 5), 46, 46, smooth],
    [T.stavimSiren, T.ujdet - 0.1, hv(10, 3.2, 14.5), hv(8, 4.6, 12.5), hv(0, 5.2, 0), hv(0, 6.6, 0), 50, 50, easeOut],
    [T.ujdet - 0.1, T.H, hv(17, 9, 23), hv(20, 11.5, 27), hv(0, 4.5, 0), hv(0, 4.0, 0), 50, 50, smooth],
    // 6 - supplies
    [T.H, T.krysha, [-25, 17, 37], [-19.5, 15, 38], [0, 2.5, 3], [0, 2.8, 3], 52, 52, smooth],
    [T.krysha, T.dvor, [6.8, 13.8, 17.5], [5.2, 13, 16.4], [0, 7.3, 2.4], [0, 7.3, 2.4], 46, 45, easeOut],
    [T.dvor, T.gryadki - 0.5, [11.7, 2.7, 10.8], [10.8, 2.35, 10.1], [6.1, 1.55, 4.9], [6.1, 1.45, 4.9], 38, 38, easeOut],
    [T.gryadki - 0.5, T.I, [-3.0, 3.1, 12.3], [-3.9, 2.7, 11.7], [-9.3, 0.45, 7.4], [-9.3, 0.4, 7.4], 44, 43, easeOut],
    // the horde
    [T.I, T.orda, [0, 13.5, 51], [0, 11.5, 48], [0, 3.5, 4], [0, 3.6, 4], 54, 54, smooth],
    [T.orda, T.uperlas, [1.6, 2.35, 17.7], [1.0, 2.7, 17.0], [7, 1.3, 46], [5, 1.1, 40], 56, 54, lin],
    [T.uperlas, T.day1, [31, 14.5, 35], [28, 13.5, 33], [10, 0, 15], [10, -0.3, 15], 50, 50, easeOut],
    [T.day1, T.derzh, [-35, 28, 47], [-22, 31, 53], [0, 0, 5], [0, 0, 5], 56, 56, smooth],
    [T.derzh, T.J, [17.5, 9.2, 34], [14, 8.6, 32], [0, 4, 3], [0, 4.1, 3], 48, 48, easeOut],
    // the twist
    [T.J, T.avy, [5.7, 1.55, 11.6], [4.3, 0.86, 8.0], [bw.x, bw.y + 0.08, bw.z], [bw.x, bw.y + 0.04, bw.z], 31, 30, smooth],
    [T.avy, T.kto, [4.3, 0.86, 8.0], [3.75, 0.64, 6.3], [bw.x, bw.y + 0.04, bw.z], [bw.x, bw.y + 0.02, bw.z], 30, 28, lin],
    [T.kto, T.end, [3.75, 0.64, 6.3], [3.42, 0.55, 5.5], [bw.x, bw.y + 0.02, bw.z], [bw.x, bw.y, bw.z], 28, 25, easeOut],
  ];
  const p = new THREE.Vector3(), q = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  let last = 0;
  const C = { shots: SHOTS, cutTimes: SHOTS.map(s => s[0]) };
  /** t = video time (shot selection), storyT = story time (impact shake), extra = extra shake impulses in video time. */
  C.update = (t, storyT, extra = []) => {
    let i = last;
    if (!(t >= SHOTS[i][0] && t < SHOTS[i][1])) { i = SHOTS.findIndex(s => t >= s[0] && t < s[1]); if (i < 0) i = t < 0 ? 0 : SHOTS.length - 1; last = i; }
    const s = SHOTS[i], k = s[8](clamp((t - s[0]) / (s[1] - s[0])));
    p.lerpVectors(a.fromArray(s[2]), b.fromArray(s[3]), k);
    q.lerpVectors(a.fromArray(s[4]), b.fromArray(s[5]), k);
    let fov = lerp(s[6], s[7], k);
    if (i === 1) fov += Math.sin(k * Math.PI) * 14; // rewind punch
    // hand-held drift
    const d = 0.012 * p.distanceTo(q) * 0.06;
    p.x += Math.sin(t * 0.9 + i) * d; p.y += Math.sin(t * 1.3 + i * 2) * d * 0.7;
    // impact shake
    let sx = 0, sy = 0;
    const add = (ti, amp, now) => { const dt = now - ti; if (dt > 0 && dt < 0.7) { const e = amp * Math.exp(-dt * 8); sx += e * Math.sin(dt * 61 + ti * 13); sy += e * Math.cos(dt * 53 + ti * 7); } };
    if (t >= T.rewindEnd) for (const im of IMPACTS) add(im.t, im.a, storyT);
    for (const im of extra) add(im.t, im.a, t);
    const dist = p.distanceTo(q), sc = Math.min(1, dist / 30) * 1.2 + 0.25;
    camera.position.set(p.x + sx * sc, p.y + sy * sc, p.z);
    camera.up.set(0, 1, 0);
    camera.lookAt(q.x + sx * sc * 0.6, q.y + sy * sc * 0.6, q.z);
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    C.shot = i;
  };
  return C;
}
