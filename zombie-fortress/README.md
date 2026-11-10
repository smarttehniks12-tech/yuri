# Дом против орды зомби — 3D-ролик (1:10, вертикальный)

- `zombie-fortress.mp4` — готовое видео 1080x1920, 25 fps, со звуком и субтитрами.
- `index.html` — та же анимация в браузере (three.js): нужен локальный сервер (`python3 -m http.server`), открыть `zombie-fortress/`.
  Пробел — пауза, стрелки — перемотка, `?t=12.5` — стоп-кадр, `?mute` — без звука.
- `js/timeline.js` генерируется `tools/layout.mjs` из таймкодов озвучки ElevenLabs (`tools/align.json`).
- `tools/mix.mjs` сводит голос, эффекты и музыку из `tools/raw/` в `audio/mix.mp3`.
- `tools/render.mjs <папка> <ширина> <fps> <воркер> <воркеров>` — покадровый рендер через Playwright (`?render`), затем ffmpeg.

Голос: Evgeniy Rybakov (ElevenLabs, eleven_multilingual_v2). Эффекты и музыка — ElevenLabs.
Видео отрендерено в 720x1280 и увеличено до 1080x1920.
