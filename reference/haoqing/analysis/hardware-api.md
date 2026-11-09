# Hardware API — MEEBOOK M7 (Haoqing)

Все выводы — по декомпилированному коду (`reference/haoqing/decoded/jadx/sources`) +
динамическому исследованию M7 (2026-11-08, `/device-research`, протокол:
`evidence/logs/device-research-2026-11-08.md`).

Метод: Haoqing — **системное** приложение (`android.uid.system`), поэтому часть
механизмов использует скрытые/системные API.

## 1. Платформа (подтверждено динамически)

`getprop` на M7:
```
ro.board.platform = rk356x
ro.product.brand  = Haoqing
ro.product.model  = M7
ro.haoqing.brand  = haoqing-meebook
```

`com/haoqing/api/HaoqingApi.java` `getHaoqingApiImpl()` по `ro.board.platform`:
`rk356x`/`rk3576` → **`RK356xImpl`** (актуально для M7); `rk3368`/`rk3326` → свои
имплы; `rk*` (остальные) → `RockChipImpl`; `lark*` → AllWinner; default → Nxp (stub).

## 2. E-Ink refresh (подтверждено кодом + платформой)

`com/haoqing/api/impl/RK356xImpl.java:47` — **актуальный API для M7**:
```java
Class.forName("android.view.View")
  .getMethod("setHqEinkUpdateMode", int.class)
  .invoke(null, mode);
```
| режим | значение |
|---|---|
| **fullRefresh** | **2** |
| partRefresh | 7 |
| fast/auto | 0 |
| a2/dither | 12 |
| blackWhite | 13 |
| regal | 10 (5 без `sys.hq.support.regal=1`) |

(Справочно: общая `RockChipImpl`-ветка — `View.requestEpdFullMode(int,int)`,
не для M7. Подробности — `eink-analysis.md`.)

## 3. Подсветка — белая + тёплая (подтверждено кодом и live-значениями)

`com/haoqing/api/util/FunctionUtil.java`:
- **белая** → `Settings.System "screen_brightness"` (live: **61**, диапазон 0..254)
- **тёплая** → `Settings.System "haoqing_warm_light"` (live: **97**)
- вкл/выкл → `"isLightOn"` (live: `true`); режим → `"brightness_mode"`;
  `isReverseBrightness()` — ревизии прошивок.
- UI: `widget/BrightnessControlDialog.java` (SeekBar, `ContentObserver`).
- Вторичный путь `PowerManager.setHomeLight(int,int,int)` (`RockChipImpl:133`) —
  только home-подсветка, для main-экрана не нужен.

Оба канала — стандартный `Settings.System`: доступны из обычного приложения
с `WRITE_SETTINGS` (запрос в рантайме), platform-подпись не требуется
(наличие ключей и живые значения подтверждены; запись из обычного приложения —
проверить при реализации).

## 4. Физические кнопки (подтверждено getevent + keylayout)

**Устройства M7:**
| Устройство | Ключи | Назначение |
|---|---|---|
| `gpio-keys` (event5) | **raw 603 (0x25b), 604 (0x25c)** | две кнопки листания |
| `adc-keys` (event4) | `KEY_VOLUMEUP/DOWN` | громкость (отдельно) |

**Keylayout** (`/system/usr/keylayout/Generic.kl:417-418`, `qwerty.kl:136-137`):
```
key 603 HAOQING_PAGE_UP
key 604 HAOQING_PAGE_DOWN
```
`HAOQING_PAGE_UP/DOWN` — **OEM-константы** (не AOSP). Приложение Haoqing
обрабатывает `92/93` (`BaseActivity.onKeyUp`) — значит OEM-фреймворк мапит
603/604 → 92/93 до доставки в app (механика маппинга — во framework Haoqing,
не в APK).

**Для INPX (задача 9.3):** обрабатывать 92/93 первично; фактический keyCode,
получаемый обычным приложением, фиксируется одним прогоном logcat
`event.getKeyCode()` при реализации (единственная оставшаяся неопределённость).

Опции: `getPageKeyOptions()` (настройки), `PAGE_KEYS_AS_VOLUME_KEYS` (remap на
громкость для других устройств), ускорение long-press — в движке ридера
(`engine/PageView.java`), не на hardware.

## 5. Pen / рукописные кнопки
`com/haoqing/hw/*` + `libiink.so` (MyScript) — handwriting-стек, platform+натив.
**Не переносится и не требуется** (задача 9.3 — только верхняя/нижняя кнопки).

## 6. Home-кнопка
Системный broadcast `CLOSE_SYSTEM_DIALOGS`/`reason=homekey` — только системный
лаунчер. Не переносимо, не требуется.

---

## Классификация API (4 группы)

| Механизм | API | Группа | Переносимо в INPX (обычное приложение)? |
|---|---|---|---|
| Кнопки листания | raw 603/604 → OEM-маппинг → (по коду Haoqing) 92/93 в `onKeyUp` | 1. Стандартный Android (+ OEM-маппинг) | **Да** (без прав; keyCode фиксируется логом) |
| E-Ink refresh | **`View.setHqEinkUpdateMode(int)`** (hidden, rk356x): full=2, part=7, fast=0 | 3. Скрытый + HiddenApiBypass | **Да** (hiddenapibypass уже в INPX; резолв проверить рантаймно) |
| Подсветка белая | `Settings.System "screen_brightness"` | 1 + 4 (`WRITE_SETTINGS`) | **Да** (запрос WRITE_SETTINGS) |
| Подсветка тёплая | `Settings.System "haoqing_warm_light"` | 1 + 4 (`WRITE_SETTINGS`) | **Да** (запрос WRITE_SETTINGS) |
| Home-подсветка | `PowerManager.setHomeLight` (hidden) | 3. Скрытый | Частично (home-экран, не нужен) |
| Home-кнопка | системный broadcast | 3. Только системные приложения | **Нет** (не нужен) |
| Ink/ручка | `libiink.so` (натив) | 3. Только системные + натив | **Нет** (не нужен) |

## Разрешённые вопросы (были предположениями)
1. ✅ Платформа M7 = **rk356x** → `RK356xImpl` → `setHqEinkUpdateMode` (не `requestEpdFullMode`)
2. ✅ Кнопки = raw 603/604 (`gpio-keys`) → `HAOQING_PAGE_UP/DOWN`; Haoqing ловит 92/93
3. ✅ Ключи подсветки существуют, live-значения: 61 / 97 / true
4. ⬜ Остается: резолв `setHqEinkUpdateMode` через HiddenApiBypass из обычного
   приложения + точный keyCode, видимый обычному приложению — оба проверяются
   одним прогоном INPX с логированием при реализации (задачи 9.1–9.4)
