# Статус (работа прервана, продолжить отсюда)

Готово:
- Сценарий и озвучка ElevenLabs (голос Evgeniy Rybakov, `ws3YyKFd5whKb21yaXES`, eleven_multilingual_v2, speed 1.12): `tools/raw/voice_full.mp3`, посимвольные таймкоды в `tools/align.json`.
- 28 звуковых эффектов + музыка 70 с: `tools/raw/sfx/*.mp3`, `tools/raw/music.mp3`.
- Раскладка озвучки на 70 с и субтитры: `tools/layout.mjs` -> `js/timeline.js` (T — времена слов-триггеров, CAPS — субтитры).
- Весь код 3D-сцены написан: `js/{util,world,house,fortify,supplies,horde,camera,fx,main}.js`, `index.html`, `style.css`, three.js в `vendor/`.

НЕ сделано:
1. Код ещё ни разу не запускался — нужен первый прогон в браузере (Playwright, `index.html?render&w=540`, `window.__frame(t)`), правка ошибок и визуальная проверка кадров по всем сценам.
2. Сведение звука: нарезать `voice_full.mp3` по `tools/cuts.json` (a/b — границы в исходнике, at — позиция на таймлайне), наложить SFX по временам из `T` и музыку -> `audio/mix.mp3`. Найти моменты трёх стуков в `knock.mp3` и добавить `T.knocks` в timeline.js.
3. Покадровый рендер 1080x1920, 30 fps, 2100 кадров -> ffmpeg -> mp4 со звуком.
4. Добавить папку `zombie-fortress` в `.github/workflows/pages.yml` (строка cp), README.

Примечания: layout.mjs пишет в /home/user/yuri/zombie-fortress/js/timeline.js и читает файлы из своей папки (запускать из `tools/`). Ключ ElevenLabs сохранён в окружении (подставляется прокси для api.elevenlabs.io).
