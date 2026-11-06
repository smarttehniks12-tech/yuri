/* main.js — boot, lifecycle (app switching / Safari close), PWA service worker registration */
(function () {
  'use strict';
  const CA = window.CA;

  function boot() {
    CA.Store.load();
    CA.Artifacts.ensureDefaults();
    CA.Prog.ensureDaily();
    CA.Chars.checkUnlocks();
    CA.UI.init();
    CA.Game.init(document.getElementById('game'));
    CA.UI.menu();

    // unlock audio on first interaction (iOS requirement), then start generative music
    // every gesture re-checks the audio session (iOS home-screen apps can lose it after switching apps)
    const gesture = () => { CA.Audio.unlock(); CA.Audio.startMusic(); };
    for (const ev of ['touchstart', 'touchend', 'pointerdown', 'click', 'keydown']) window.addEventListener(ev, gesture, { passive: true, capture: true });

    // app switching: pause + persist; resume audio on return
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (CA.Game.state === 'play') CA.Game.pause();
        else CA.Game.saveSnapshot();
        CA.Store.save();
        CA.Audio.suspend();
      } else {
        CA.Audio.resume();
        CA.Game.last = performance.now();
      }
    });
    window.addEventListener('pagehide', () => { if (CA.Game.run && CA.Game.state !== 'over' && CA.Game.state !== 'menu') CA.Game.saveSnapshot(); CA.Store.save(); });
    window.addEventListener('blur', () => { if (CA.Game.state === 'play') CA.Game.pause(); });

    // block iOS pinch / double-tap zoom & rubber-banding inside the game
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
    document.addEventListener('touchmove', (e) => { if (!e.target.closest || !e.target.closest('.screen, .overlay')) e.preventDefault(); }, { passive: false });

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    }
    window.CA_READY = true;
  }

  window.addEventListener('error', (e) => { console.error('[CA]', e.message, e.filename, e.lineno); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
