# Buttons Analysis — физические кнопки MEEBOOK M7

## Механизм Haoqing (статика) + устройство (динамика, 2026-11-08)

### Что реально на M7 (подтверждено getevent + keylayout)

- Две физические кнопки листания — устройство **`gpio-keys`** (`/dev/input/event5`),
  сырые коды **603 (0x25b)** и **604 (0x25c)**.
- Keylayout (`/system/usr/keylayout/Generic.kl:417-418`, `qwerty.kl:136-137`):
  ```
  key 603 HAOQING_PAGE_UP
  key 604 HAOQING_PAGE_DOWN
  ```
- `HAOQING_PAGE_UP/DOWN` — **OEM-константы** (не в AOSP `Keycodes`).
- Кнопки **громкости** — отдельное устройство `adc-keys` (`event4`,
  `KEY_VOLUMEUP/DOWN`). На M7 громкость НЕ является листанием по умолчанию.

### Как Haoqing обрабатывает (подтверждено кодом)

`com/haoqing/app/hqreader/common/base/BaseActivity.java:85-114` `onKeyUp`/`onKeyDown`:
```java
if (i == 92) { isBehind(false); ... }  // KEYCODE_PAGE_UP   → пред. страница
if (i == 93) { isBehind(true);  ... }  // KEYCODE_PAGE_DOWN → след. страница
```
Haoqing ловит **92/93** — т.е. OEM-платформа (framework Haoqing) мапит
`HAOQING_PAGE_UP/DOWN` (603/604) в `KEYCODE_PAGE_UP/DOWN` (92/93) **до** доставки
в приложение. Это поведение OEM-фреймворка, не стандарт Android.

Опции:
- `IReadSetting.getPageKeyOptions()` — выбор поведения кнопок.
- `AppSetting.APP_HAOQING_PAGE_KEYS_AS_VOLUME_KEYS` + `LoadingProgress.PAGE_KEYS_AS_VOLUME_KEYS=32`
  — режим «кнопки = громкость» (remap на `KEYCODE_VOLUME_*`) для устройств,
  где кнопки физически громкость.
- Home-кнопка: `MainActivity.HomeKeyEventBroadcastReceiver` (`CLOSE_SYSTEM_DIALOGS`/
  `reason=homekey`) — только системный лаунчер, в INPX не переносится/не нужен.
- Ускорение долгим нажатием — в движке ридера (`engine/PageView.java`:
  `mLongPressConsumer`/`mTurnPageTimer`), не на hardware.

## Карта на INPX (как воспроизвести — задача 9.3)

1. **Где ловить**: нативный `MainActivity`/`ReaderNativePlugin` (Capacitor) —
   перехватить в `dispatchKeyEvent` и пробросить в WebView (`evaluateJavascript` →
   событие), ридер в iframe делает page turn.
2. **Какие keyCode обрабатывать**: по коду Haoqing — **92/93** (PAGE_UP/DOWN).
   Но `HAOQING_PAGE_UP/DOWN` — OEM-маппинг, и **единственный открытый вопрос**:
   какое именно keyCode получит *обычное* приложение INPX (возможно 92/93,
   возможно OEM-значения). **Решение на этапе реализации:** INPX логирует
   `event.getKeyCode()` в `dispatchKeyEvent`; обрабатываем 92/93 первично +
   при необходимости добавляем фактические коды из лога (одна строка конфига).
3. **Настройки**: «переназначение действий» и «отключение обработки» — ключи в
   `appSettings` (localStorage) + натив читает.
4. **Конфликт с громкостью**: на M7 кнопки листания — отдельные от громкости
   (gpio-keys vs adc-keys), конфликтов нет; режим remap оставить опцией как у Haoqing.

**Проверить динамически (1 минута, при реализации INPX):** нажать обе кнопки,
взять `keyCode` из logcat INPX — фиксирует маппинг раз и навсегда.
