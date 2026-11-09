# Fullscreen Analysis — полноэкранный режим на MEEBOOK M7

## Механизм Haoqing (подтверждено кодом)

- `com/haoqing/app/hqreader/view/activity/MainActivity.java:703`:
  `getWindow().getDecorView().setSystemUiVisibility(1024)` —
  **1024 = `SYSTEM_UI_FLAG_LAYOUT_STABLE`** (контент под status bar, но бар видим).
- `com/haoqing/view/NavigationPopupSearch.java:241`:
  `setSystemUiVisibility(8)` — **8 = `SYSTEM_UI_FLAG_HIDE_NAVIGATION`**.
  (Полный иммерсив = комбинация флагов `HIDE_NAVIGATION|FULLSCREEN|LAYOUT_*|IMMERSIVE_STICKY`
  в других ветках кода — общий приём стандартного Android.)
- Настройка пользователя: `Settings.System "app_full_screen"` (`AppSetting.APP_FULL_SCREEN`)
  — включение полноэкранного режима чтения; и `"fullscreen_flush"`
  (`IReadSetting.FULLSCREEN_MODE`, `ReadSettingView:102`) — **полная перерисовка E-Ink
  при входе в полноэкранный режим** (иначе после смены insets остаётся «пустая полоса»
  от status bar — ровно та боль, которую описывает задача 9.1).
- `DISABLE_STATUS_BAR` permission (legacy ≤22) заявлен в манифесте.

## Ключевой инсайт для задачи 9.1

Пустая область после скрытия status bar на e-ink возникает, потому что **E-Ink-панель
не перерисовывает изменённую область автоматически** — нужен явный полный refresh.
Haoqing решает это связкой: hide/expand UI → `fullscreen_flush` → full E-Ink refresh.
В обычном Android-WebView (INPX) та же проблема: WebView знает об insets, но
e-ink-контроллеру нужно попросить полный refresh — через `View.requestEpdFullMode(1,1)`
(см. `eink-analysis.md`).

## Карта на INPX (как воспроизвести — задача 9.1)

1. `ReaderCapacitorWebView`/`MainActivity`: иммерсивный режим через
   `WindowInsetsControllerCompat` (современный API, target 35):
   `hide(systemBars())` + `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE` — вместо legacy
   `setSystemUiVisibility` (в INPX уже есть `immersive` плитка в ридере).
2. После смены insets — **полный e-ink refresh** (M7-ветка из eink-analysis), иначе
   «пустая полоса» сверху — требование задачи: «устранение пустой области».
3. CSS/JS: ридеру (iframe) передать фактическую высоту вьюпорта — INPX уже считает
   `--app-header-offset`/строку состояния; при fullscreen обнулить отступы и
   пересчитать `--r-status-h` (область чтения занимает весь экран, текст не перекрывается).
4. Настройка «Полный экран» — уже есть в ридере (плитка «Весь экран»);
   добавляется флаг полного refresh при входе/выходе.

**Ограничение:** на e-ink анимации скрытия/показа баров не работают (нет частоты
обновления) — только мгновенная смена + full refresh (у INPX уже учтено:
`MotionConfig reducedMotion="user"` и e-ink-режим).
