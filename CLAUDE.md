# CLAUDE.md — INPX Book Reader для MEEBOOK M7

## Проект

Модифицированная версия **INPX Book Reader** под электронную книгу **MEEBOOK M7**.

**Главное правило:** сначала получаем и проверяем базовую сборку из GitHub-исходников.
Затем исследуем Haoqing Launcher. После этого переносим функции **по одной**, каждая —
отдельной согласованной задачей.

## Роль каждого приложения

| Приложение | Роль |
|---|---|
| **INPX Book Reader** (этот репозиторий) | **Единственная основа** целевого приложения. Весь исходный код берётся только отсюда |
| **Haoqing Launcher** (`reference/haoqing/original/Haoqing-Launcher.apk`) | **Только эталон для исследования**: особенности MEEBOOK M7, поведение оригинальной читалки, доступные аппаратные возможности (кнопки, подсветка, E-Ink) |

**Запрещено:** объединять приложения, заменять INPX на Haoqing, использовать
декомпилированный код INPX Book Reader APK, копировать закрытый код/ресурсы Haoqing
без проверки лицензии (предпочтительна самостоятельная реализация по изученным принципам).

## Архитектура проекта (фактическая)

- **Capacitor 7 + React 19/TypeScript/Vite/Tailwind** веб-часть (`src/`, `public/inpx-reader/` — Foliate-ридер в WebView)
- **Нативная Android-часть** — `android/` (Java, не Kotlin): плагины `BookStorage`,
  `FolderPicker`, `ReaderNative`, `TtsPlaybackManager`, виджеты, foreground-сервисы
- Сборка: `npm run build:android` = `build:app` (Vite) → `npx cap sync android` → `gradlew assembleDebug`
- `server.ts` — dev-прокси только для браузера; в APK не используется, не улучшать
- applicationId `ru.inpx.bookreader`, versionName 1.13.0 (versionCode 23), minSdk 23, compile/target 35
- Подробности — в `AGENTS.md` (контракт с INPX Library Server, API, sync, TTS, i18n)

## Каталог проекта (добавленные части)

```
reference/haoqing/       # исходник + метаданные + декодирование + анализ Haoqing
  original/              # неизменяемый Haoqing-Launcher.apk
  metadata/              # apk-info, manifest, signing
  decoded/               # jadx/ apktool/ resources/ (результаты декомпиляции)
  analysis/              # architecture, hardware-api, eink, buttons, backlight, fullscreen, fonts
  evidence/              # screenshots, logs, test-results
docs/                    # + requirements, architecture, compatibility-matrix, implementation-plan, change-log, testing-report
development/             # scripts/, tools/ (JADX/apktool), patches/
builds/                  # debug/, release/, reports/ (копии APK, исходные артефакты в android/app/build/ не трогаются)
.claude/skills/          # /apk-inspect /device-research /android-analyze /android-implement
                         # /android-build-apk /android-verify-apk /android-review
```

Существующие каталоги (`android/`, `src/`, `public/`, `scripts/`, `docs/`, `assets/`) не перемещать.

## Окружение сборки (зафиксировано 2026-11-08)

Требования: **JDK 17** (AGP 8.7.2, Gradle 8.11.1), **Node.js ≥ 20** (Vite 6, React 19),
**Android SDK platform 35 + build-tools 35.0.1** (`compileSdk 35`), Gradle Wrapper есть в `android/`.
Сборка идёт из `android/` через `gradlew.bat assembleDebug` (вариант `debug`; `release` не подписан).

## Правила исследования Haoqing

- Не изменять оригинальный APK (`reference/haoqing/original/`, SHA-256 в `metadata/README.md`).
- Не декомпилировать APK INPX Book Reader.
- Инструменты: JADX, apktool, apkanalyzer/aapt, ADB — проверять наличие до работы;
  предположения не выдавать за подтверждённые факты (разделять: стандартные API / фирменные
  MEEBOOK API / API только для системных приложений / API с особыми разрешениями).
- Результаты анализа — только в `reference/haoqing/analysis/` и `evidence/`.

## Правила разработки Android и переноса функций

- Каждый перенос — отдельный отчёт (9 пунктов: как работает в Haoqing, классы, API,
  ограничения для стороннего приложения, участок INPX, способ воспроизведения, файлы,
  риски, проверка) → **согласование → реализация**.
- Не менять исходный код без согласования; изменения фиксировать в `docs/change-log.md`.
- `applicationId` на этапе базовой сборки не менять; отдельный id — только после согласования.
- Не удалять штатную читалку с устройства; не ставить APK с конфликтующим id поверх
  существующего без согласования.
- Языковые строки — `src/i18n/ru.ts` + `en.ts` (иначе `npm run lint` упадёт).

## Правила сборки и Git

- `npm run build:android` — штатная последовательность; зависимости не обновлять без необходимости.
- Готовый APK копировать в `builds/debug/` (не удаляя `android/app/build/...`), SHA-256 — в отчёт.
- **Без прямого разрешения не выполнять:** commit, push, reset, clean, смену ветки,
  удаление пользовательских изменений.
- Не заявлять об успешной сборке без фактического APK и его проверки.
- Не хранить секреты/ключи в документации и репозитории.