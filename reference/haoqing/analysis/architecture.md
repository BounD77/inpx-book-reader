# Architecture — Haoqing Launcher / Reader

## Общая картина

Приложение **двусложное**: это и **системный лаунчер** (рабочий стол, `category.HOME`),
и **полноценная читалка** с рукописными заметками, словарём, магазином и облаком.
Компонент `MainActivity` (61 activity всего) — центральный экран с вкладками
(книжная полка / заметки / облако / магазин), читалка открывается из него.

**Важнейший архитектурный факт**: `sharedUserId="android.uid.system"`.
Приложение собрано и подписано **platform-ключом** производителя (CN=haoqing, ShenZhen)
и работает с **UID системного приложения**. Именно это даёт ему доступ к:
скрытым Android API (E-Ink, подсветка), `Settings.System`/`persist.*`, и системным
broadcast'ам. **Стороннее приложение (INPX) таких прав не имеет** — это главный
ограничитель при переносе.

## Происхождение

Слой `com.haoqing.jdlibrary` (226 класса), permission
`com.jingdong.app.reader.permission.JPUSH_MESSAGE`, нативные `libjd*` (DRM, TTS,
reader) — читалка построена **на основе прошивки/библиотек JD (Jingdong)**.
Haoqing — OEM, который взял базовый JD-reader-стек и переупаковал под свои E-Ink.

## Слои (по пакетам JADX)

| Слой | Пакет | Назначение |
|---|---|---|
| UI/launcher | `com.haoqing.app` | Вкладки, полка, поиск, настройки, cloud |
| Reader engine | `com.haoqing.engine` | `PageView`, `TurnInterface`, `IEInkRefresh`, parse/render |
| **Hardware (E-Ink/ручка)** | `com.haoqing.hw` | `FastDraw*`, `HqHwProxy`, `NativeCanvas`, `FwProxy` |
| **System API хаки** | `com.haoqing.api` | `HaoqingApi` (по платформе), `RockChipImpl`, `FunctionUtil` |
| ODM/утилиты | `com.haoqing.odm`, `utils` | `OdmManager`, `EinkRefreshUtils` |
| Заметки/рукописи | `com.haoqing.note`, `handwrite` | MyScript-based |
| Словарь | `com.haoqing.dict` | tesseract/stardict |
| Магазин | `com.haoqing.jdlibrary` | наследие JD |
| DB | `com.haoqing.db` | Room/SQLite + `LibraryService`/`ConfigService` |

## Нативное ядро

Движок ридера и E-Ink — в нативе:
- `libiink.so` (16.5 МБ) — **драйвер E-Ink-панели + handwriting** (ключевая библиотека).
- `libhqreader_java.so` (8.6 МБ) — ядро ридера (parse/rendition).
- MyScript-стек (`libMyScript*.so`) — рукописный ввод.
- BD-TTS (`libbd_etts.so`, `libBDSpeechDecoder_V1.so`), ijkplayer (видео), tesseract (OCR).

## Распределение по DEX

7 файлов `classes*.dex`; E-Ink/ручка (`com.haoqing.hw`) и `HaoqingApi` лежат в
`classes3.dex`–`classes5.dex` (см. `loaded from` в декомпилированных файлах).

## Вывод для переноса

Механизмы E-Ink/подсветки/кнопок Haoqing — это **тонкий Java-слой-адаптер** поверх
скрытых системных API + нативного драйвера. Сам драйвер (`libiink.so`) привязан к
платформ-подписи и `ro.board.platform`. INPX **не может** перенести этот нативный
драйвер; ему доступны только те же **скрытые Android API через reflection** +
`Settings.System`, что INPX уже частично использует для BOOX/Onyx
(`OnyxEpdRefresh`, `OnyxFrontLight`).

**M7 подтверждено динамически (2026-11-08):** платформа **rk356x** →
`RK356xImpl` → E-Ink через **`View.setHqEinkUpdateMode(int)`** (full=2, part=7,
fast=0); подсветка — `Settings.System` `screen_brightness` (белая, live 61) +
`haoqing_warm_light` (тёплая, live 97); кнопки — `gpio-keys` raw **603/604**
→ OEM `HAOQING_PAGE_UP/DOWN` (Haoqing ловит 92/93). Подробности:
`hardware-api.md`, `eink-analysis.md`, `buttons-analysis.md`,
`evidence/logs/device-research-2026-11-08.md`.
