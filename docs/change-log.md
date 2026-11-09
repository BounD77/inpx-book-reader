# Change Log — INPX Book Reader MEEBOOK M7

## 2026-11-09 — R1.13.0-m7.3 (задача 1: меню выбора шрифта + офлайн-шрифты)

**Проблема.** На M7 «Шрифт»/«Начертание» в настройках — системные `<select>`:
на Chromium 116 e-ink WebView нативный popup не рендерится (моргает при нажатии,
не открывается). Кроме того, «Google-шрифты» требовали сети
(fonts.googleapis.com), офлайн все шрифты сливались в системный дефолт.

**Реализация.**
- `public/inpx-reader/reader.js`: DOM-пикер `enhanceSelectBox`/`closeRsSelectx`
  (строки ~762-856) — раскрываемый список вместо нативного popup: список inline
  в потоке (не `position:absolute`), заголовки групп из `o.parentNode`
  (`Array.from(select.options)` — `for...of` по HTMLCollection не работает на
  Chromium 116), выбор = `select.value + change`, закрытие по клику вне/Escape.
  Вызывается в `refreshSettingsUI` для `rs-font-family`/`rs-font-weight`;
  закрывается в `finishClosePanel`.
- `public/inpx-reader/reader.css`: стили `.rs-selectx*` + e-ink-варианты
  (`html[data-eink="1"]`).
- Офлайн-шрифты: `public/inpx-reader/fonts/` — **96 woff2** (12 семейств:
  PT Serif, PT Sans, Literata, Merriweather, Noto Serif, EB Garamond, Spectral,
  IBM Plex Serif, Roboto, Fira Sans, IBM Plex Sans, Commissioner;
  cyrillic/cyrillic-ext/latin/latin-ext × 400/700) + сгенерированный
  `reader-fonts.css` (`@font-face`, `unicode-range`, `font-display:swap`).
  `scripts/bundle-reader-fonts.mjs` — воспроизводимый бандлер (запуск один раз,
  сеть; результат коммитится). `googleFontCssUrl()` (reader.js:688) теперь
  отдаёт локальный `/inpx-reader/fonts/reader-fonts.css` — все 3 точки
  подключения (head, iframe Foliate, @import) работают офлайн; реестры
  семейств и механизм не трогались. Пересобраны `index.html`/`index.en.html`
  (`npm run sync:reader`).

**Проверка.** `node --check reader.js` — чисто; сборка `npm run build:android`
— успешно, APK установлен на M7 (WebView 116, Wi-Fi выкл). Live-проверка
меню и смены шрифта — выполнена пользователем вручную, работает.

## 2026-11-08 — R1.13.0-m7.2 (задача 9.3: физические кнопки M7)

**Задача.** Верхняя кнопка = предыдущая страница, нижняя = следующая; долгое
нажатие = ускоренная прокрутка; переназначение действий; отключение обработки.

**Исходная находка (этап 3).** Кнопки листания M7 — отдельное input-устройство
`gpio-keys` (raw 603/604 → OEM keylayout `HAOQING_PAGE_UP/DOWN`). Проверено на
устройстве: обычное приложение INPX получает их как стандартные **keyCode 92
(PAGE_UP)** и **93 (PAGE_DOWN)** — не громкость.

**Реализация.** INPX уже имел весь мост (и он включён при открытии ридера):
`FoliateReader.tsx:301` capture → `MainActivity.dispatchKeyEvent` → событие
`reader-volume-key` → `handleVolumePageTurn` (next/prev + инверсия + chrome-hide +
e-ink-перерисовка). Добавлена только обработка PAGE-кнопок:
- `android/app/src/main/java/ru/inpx/bookreader/MainActivity.java` `dispatchKeyEvent`:
  `KEYCODE_PAGE_UP`→"prev", `KEYCODE_PAGE_DOWN`→"next" (VOLUME-ветки сохранены для
  BOOX/Onyx).
- `public/inpx-reader/reader.js`: настройка «Кнопки листания» расширена значением
  `off` (валидация строка 893, кнопка UI, guard `if (S.volumeKeys === 'off') return`
  в `handleVolumePageTurn`).
- `public/inpx-reader/reader-i18n-ru.json` / `-en.json`: `app.volumeKeys`
  («Кнопки листания»/«Page keys»), обновлён `app.volumeKeysHint`, добавлен
  `app.volumeKeysOff` («Выкл»/«Off»). Пересобран `index.html`/`index.en.html`
  (`npm run sync:reader`, v=3df6688e49a4).

**Проверка:** `npm run lint` — чисто; `npm test` — 480/480; live-тест на M7: нижняя
кнопка → keyCode 93 → переход 31→42 (logcat + скриншоты `builds/reports/m7-btn-verified.png`,
`m7-93-final-before/after.png`); долгое нажатие даёт автоповтор (ускорение); «Выкл»
отключает листание кнопками при рабочем тапе. Конфликта с сенсором нет.

**APK:** `builds/debug/app-debug.apk`, SHA-256 `09befb10b5e1971cfcd3322a075259535d7fb208c1ee2dfd1545cfa4915bb741`

## 2026-11-08 — R1.13.0-m7.1 (по согласованию пользователя: «Полифил + пересборка»)

**Проблема.** На MEEBOOK M7 (WebView 116.0.5845) любое открытие книги падало:
`TypeError: Object.groupBy is not a function` (потом `Map.groupBy`) в
`public/foliate/epub.js` — функции из ES2024, появились только в Chromium 122+.
Симптом: «Загрузка книги…» → молчаливый возврат на Главную (без диалога ошибки).

**Причина.** `foliate/epub.js` — синхронизируется с сервера (`scripts/sync-foliate-assets.mjs`),
править нельзя (перезапишется). WebView M7 (116) не обновляется.

**Исправление.** Полифилы `Object.groupBy` и `Map.groupBy` в начале
`public/inpx-reader/bootstrap.js` (файл приложения, генератор не перетирает;
его hash входит в версию ассетов ридера, кэш WebView сбрасывается сам).

**Изменённые файлы:** `public/inpx-reader/bootstrap.js` (+26 строк, только полифилы).
Ничего больше в исходниках не менялось.

**Проверка на M7 (по ADB):**
- открытие «Продолжить чтение» — книга открылась, позиция восстановлена (стр. 26/457, 5%)
- перелистывание тапами: 26 → 27 → 28, ошибок в logcat нет
- тулбар (название, глава, %, закладка), меню-плитки (Оглавление/Закладки/Заметки/Поиск/
  Озвучка/День-ночь/Весь экран/Настройки), A−/A+, темы, лист настроек (Текст / Цвета и тема /
  Страница / Строка состояния / Управление / Озвучка / Прочее / Сбросить) — работают
- скриншоты: `builds/reports/m7-reader-fix2.png`, `p1.png`, `p2.png`,
  `m7-reader-menu.png`, `m7-reader-settings.png`

**Остались (осознанно, вне этой правки):** в `pdfjs/pdf.mjs` есть `Promise.withResolvers`
(только в редакторе аннотаций PDF) и `Float16Array` (есть гвард `isFloat16ArraySupported`) —
на чтение EPUB/FB2 не влияют; полифил для PDF-редактора добавить, если потребуется.

**APK:** `builds/debug/app-debug.apk`, SHA-256 `58557d5c57274f058db300f62242a484efdce4664cfc2188895a530d8d32edf9`