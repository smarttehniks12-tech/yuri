'use strict';
/* Плеер: воспроизведение, пауза, перезапуск, перемотка. Часы — звуковая дорожка
   (audio.currentTime), поэтому картинка всегда синхронна с озвучкой. */
(function () {
  const canvas = document.getElementById('c');
  Director.init(canvas);
  const q = new URLSearchParams(location.search);
  const RENDER_MODE = q.has('render');

  // режим покадрового рендера (для сборки MP4)
  window.TOJI = {
    ready: document.fonts.ready,
    duration: DURATION,
    renderFrame(t, opt = {}) { Director.frame(t, Object.assign({ captions: true }, opt)); },
  };
  if (RENDER_MODE) { document.body.classList.add('render'); return; }

  const snd = document.getElementById('snd');
  const $ = id => document.getElementById(id);
  const seek = $('seek'), time = $('time');
  const st = { playing: false, t: 0, base: 0, clock: 0, cc: true, hq: false, audioOk: true, seeking: false };
  snd.addEventListener('error', () => { st.audioOk = false; });
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  function now() {
    if (st.playing && st.audioOk && !snd.paused) return snd.currentTime;
    if (st.playing) return st.base + (performance.now() - st.clock) / 1000;
    return st.t;
  }
  function play() {
    if (st.t >= DURATION - 0.05) st.t = 0;
    st.playing = true; st.base = st.t; st.clock = performance.now();
    if (st.audioOk) { snd.currentTime = st.t; snd.play().catch(() => { st.audioOk = false; }); }
    $('play').textContent = '❚❚';
  }
  function pause() {
    st.t = now(); st.playing = false; snd.pause();
    $('play').textContent = '▶';
  }
  function jump(t) {
    st.t = clamp(t, 0, DURATION); st.base = st.t; st.clock = performance.now();
    if (st.audioOk) snd.currentTime = st.t;
  }
  $('go').onclick = () => { $('start').remove(); play(); flashUI(); };
  $('play').onclick = () => (st.playing ? pause() : play());
  $('restart').onclick = () => { jump(0); play(); };
  $('cc').onclick = () => { st.cc = !st.cc; $('cc').classList.toggle('on', st.cc); };
  $('hq').onclick = () => { st.hq = !st.hq; $('hq').classList.toggle('on', st.hq); };
  $('fs').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}));
  seek.addEventListener('input', () => { st.seeking = true; jump(+seek.value); });
  seek.addEventListener('change', () => { st.seeking = false; });
  canvas.addEventListener('click', () => { if (!$('start')) st.playing ? pause() : play(); });
  window.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); st.playing ? pause() : play(); }
    else if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') { jump(0); play(); }
    else if (e.key === 'ArrowRight') jump(now() + 5);
    else if (e.key === 'ArrowLeft') jump(now() - 5);
    else if (e.key === 'c' || e.key === 'с') $('cc').click();
    else if (e.key === 'f' || e.key === 'а') $('fs').click();
    flashUI();
  });
  let uiTimer = 0;
  function flashUI() { document.body.classList.add('ui'); clearTimeout(uiTimer); uiTimer = setTimeout(() => document.body.classList.remove('ui'), 2200); }
  window.addEventListener('mousemove', flashUI);
  window.addEventListener('touchstart', flashUI, { passive: true });
  snd.addEventListener('ended', () => { st.t = DURATION; pause(); });

  let last = -1;
  function loop() {
    let t = now();
    if (st.playing && t >= DURATION) { t = DURATION; pause(); st.t = DURATION - 0.001; }
    if (t !== last || st.playing) {
      Director.frame(Math.min(t, DURATION - 0.001), { captions: st.cc, maxSamples: st.hq ? 4 : 1, quality: 1 });
      last = t;
    }
    if (!st.seeking) seek.value = t;
    time.textContent = `${fmt(t)} / ${fmt(DURATION)}`;
    requestAnimationFrame(loop);
  }
  document.fonts.ready.then(() => { Director.frame(0.0, { captions: false }); requestAnimationFrame(loop); });
})();
