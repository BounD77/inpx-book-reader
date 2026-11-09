# E-Ink Analysis — MEEBOOK M7

> **Исправление (2026-11-08, динамическое исследование):** M7 = **rk356x**
> (`getprop ro.board.platform`), поэтому активна реализация **`RK356xImpl`**, а не
> `RockChipImpl`. M7 использует скрытый API **`View.setHqEinkUpdateMode(int)`**.
> Ниже приведена и rk356x-ветка (актуальная), и общая rk*-ветка `requestEpdFullMode`
> (для справки/других Rockchip-устройств Haoqing).

## Механизм Haoqing

**Цепочка вызова:**
```
UI/читалка
  → com.haoqing.utils.EinkRefreshUtils.setEinkUpdateMode(int)
    → com.haoqing.api.HaoqingApi.getHaoqingApiImpl()   // по ro.board.platform
      → com.haoqing.api.impl.RK356xImpl.{full,part,a2,...}Refresh()   // M7 (rk356x)
        → RK356xImpl.setHqEinkUpdateMode(mode)
          → View.setHqEinkUpdateMode(int)   // СКРЫТЫЙ API (reflection)
```

### Актуально для M7 — `RK356xImpl` (`View.setHqEinkUpdateMode(int)`)
`com/haoqing/api/impl/RK356xImpl.java:47`:
```java
Class.forName("android.view.View")
  .getMethod("setHqEinkUpdateMode", int.class)
  .invoke(null, mode);
```
| метод Haoqing | `setHqEinkUpdateMode(x)` |
|---|---|
| fullRefresh | **2** |
| partRefresh | **7** |
| fastRefresh / autoRefresh | **0** |
| a2Refresh / ditherRefresh / fullDither | **12** |
| blackWhiteRefresh | **13** |
| regalRefresh | **10** (или 5, если не `sys.hq.support.regal=1`) |

### Справочно — общая rk*-ветка `RockChipImpl` (`View.requestEpdFullMode(int,int)`)
`RockChipImpl.java:115` — `requestEpdFullMode(auto=0, full=1, a2=2, part=3, regal=15, 1)`.
Используется на rk3368/rk3326/rk3576, не на M7.

- Режим хранится в `Settings.System.getInt("refresh_mode")` (`IReadSetting.REFRESH_MODE`).
- `NxpImpl` — пустые stub (не M7).
- `defaultRefresh()` читает `ro.default.epdmode` через `FwProxy.getProp` (reflection `SystemProperties.get`).
- Полная перерисовка при входе в полноэкранный — `Settings.System "fullscreen_flush"` (задача 9.1).

## Вывод
Полный refresh на M7 = **`View.setHqEinkUpdateMode(2)`**, частичный = `7`, быстрый/авто = `0`.
Скрытый API, вызывается через reflection + HiddenApiBypass (INPX уже ведёт `org.lsposed.hiddenapibypass`).

## Карта на INPX (как воспроизвести)
INPX уже имеет абстракцию e-ink: `android/app/src/main/java/ru/inpx/bookreader/OnyxEpdRefresh.java`
(`hiddenapibypass`, сигнатуры BOOX/Onyx: `repaintEverything`, `invalidateInt`, `EpdGc`). Для M7:
1. Добавить ветку-провайдер по `ro.board.platform == "rk356x"` (brand=Haoqing) с вызовом
   **`View.setHqEinkUpdateMode(int)`** (статический hidden API) через тот же HiddenApiBypass.
   Режимы: full=2, part=7, fast=0.
2. Подключить к существующему `ReaderNativePlugin` full-refresh (уже дёргает
   `OnyxEpdRefresh.fullRefresh(webView)` — `ReaderNativePlugin.java:317`).
3. Полный refresh — после смены insets/полного экрана (9.1) и на 100% (9.2); частичный — при листании.

**Ограничение / проверить динамически:** резолвится ли `setHqEinkUpdateMode` через
HiddenApiBypass из **обычного** приложения на M7 (Haoqing — системное). Тест: INPX
вызывает метод, смотрит logcat на absence of `NoSuchMethodException` + видимый полный
refresh (чистый экран без шлейфа).
