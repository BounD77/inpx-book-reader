# Device Research Protocol — MEEBOOK M7 (2026-11-08)

Read-only dynamic research via ADB (`D:\ADB\adb.exe`, device `MBM7BL24I0267`).
Все команды — только чтение (`getprop`, `dumpsys`, `getevent`, `settings get`).
Ничего на устройстве не менялось.

## 1. Платформа (подтверждено)

```
ro.board.platform   = rk356x
ro.product.board    = rk30sdk
ro.product.brand    = Haoqing
ro.product.model    = M7
ro.haoqing.brand    = haoqing-meebook
```

**Вывод:** активная реализация в Haoqing — **`RK356xImpl`** (не `RockChipImpl`!),
а значит E-Ink refresh идёт через **`View.setHqEinkUpdateMode(int)`**, а не
`requestEpdFullMode` (см. исправление в `analysis/eink-analysis.md`).

## 2. Физические кнопки (подтверждено getevent)

### Устройства ввода
| Устройство | Путь | Ключи | Назначение |
|---|---|---|---|
| gpio-keys | `/dev/input/event5` | **raw 603 (0x25b), 604 (0x25c)** | **две физические кнопки листания M7** |
| adc-keys | `/dev/input/event4` | `KEY_VOLUMEDOWN`, `KEY_VOLUMEUP` | кнопки громкости (отдельные) |
| fts_ts | event3 | touch | сенсор |
| hall wake key | event0 | — | крышка |
| rk805 pwrkey | event1 | — | power |

### Keylayout-маппинг (подтверждено `/system/usr/keylayout/Generic.kl`)
```
key 603 HAOQING_PAGE_UP
key 604 HAOQING_PAGE_DOWN
```
- `HAOQING_PAGE_UP/DOWN` — **не-стандартные** OEM-константы (в AOSP Keycodes их нет).
- Рабочее приложение Haoqing обрабатывает **`92`/`93`** (KEYCODE_PAGE_UP/DOWN) —
  значит OEM-фреймворк (платформа Haoqing) транслирует 603/604 в 92/93, либо
  OEM-константы имеют значения 92/93. **Для INPX (обычное приложение) это
  единственный открытый вопрос по кнопкам**: какие именно keyCode придут в `onKeyUp`.
- **Проверка (1 минута, на этапе реализации):** INPX логирует `keyCode` в
  `dispatchKeyEvent` при нажатии кнопок; обрабатывать нужно 92/93 + fallback на
  сырые значения (если придут другие числа — они будут видны в логе).

### Живые события (захват `getevent -l`, 25 c)
```
/dev/input/event5: EV_KEY  025b  DOWN   (603 — одна кнопка)
/dev/input/event5: EV_KEY  025b  UP
/dev/input/event5: EV_KEY  025c  DOWN   (604 — вторая кнопка)
/dev/input/event5: EV_KEY  025c  UP
```
Короткие нажатия — чистые DOWN/UP пары, без автоповтора на уровне input (ускорение
долгим нажатием реализуется в приложении — аналог в INPX уже есть: автолист).

## 3. Подсветка (подтверждено live-значениями)

Текущие значения `Settings.System` (чтение):
```
screen_brightness    = 61      ← белая (0..254 в коде Haoqing: MAX_BRIGHTNESS=254)
haoqing_warm_light   = 97      ← тёплая/жёлтая
isLightOn            = true    ← общая вкл/выкл
brightness_mode      = null
brightness_start_bar = 6
brightness_start_scale = 3
start_brightness     = 10
```
**Подтверждено:** ключи существуют, живые значения в ожидаемых диапазонах.
Осталось проверить (на этапе реализации, правяще): пишутся ли значения из обычного
приложения с `WRITE_SETTINGS` и видны ли в системном UI.

## 4. E-Ink API (статически подтверждено, динамически — на этапе реализации)

- `View.setHqEinkUpdateMode(int)` — скрытый статический метод (reflection),
  режимы rk356x: **full=2, part=7, fast/auto=0, a2/dither=12, blackWhite=13, regal=10(5)**.
- Риск: метод в hiddenapi blacklist (Android 11, уровень P*) — INPX уже включает
  `org.lsposed.hiddenapibypass`, но резолв проверять рантаймно (logcat).

## 5. Экран

1236×1648, 320 dpi, e-ink (двухцветная подсветка), WebView 116 (уже учтено:
полифилы `Object.groupBy`/`Map.groupBy` в `public/inpx-reader/bootstrap.js`).

## Итог по предположениям из статического анализа

| Вопрос | Статическое предположение | Динамический результат |
|---|---|---|
| Платформа | `rk*` → RockChipImpl | **rk356x → RK356xImpl** (`setHqEinkUpdateMode`) |
| Кнопки | 92/93 из `onKeyUp` | raw **603/604** → `HAOQING_PAGE_UP/DOWN`; приложение получает (по коду Haoqing) 92/93 — финальная проверка логом INPX |
| Подсветка | `Settings.System`-ключи | **подтверждено live** (61 / 97 / true) |
| WRITE_SETTINGS | нужен запрос | осталось подтвердить запись из обычного приложения |
