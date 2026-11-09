# Backlight Analysis — подсветка MEEBOOK M7 (белая + тёплая)

## Механизм Haoqing (подтверждено кодом)

### Основной путь — `Settings.System` (двухканальный)
`com/haoqing/api/util/FunctionUtil.java`:
- **Белая (холодная)** → ключ `Settings.System "screen_brightness"` (`COLDLAMP`)
- **Тёплая (жёлтая)** → ключ `Settings.System "haoqing_warm_light"` (`WARMINGLAMP`)
- Вкл/выкл → `"isLightOn"` (String `"true"`/`"false"`), `setBrightnessOn()`
- Режим → `"brightness_mode"` (int: COLDLAMP=0 / WARMINGLAMP=1), `setBrightnessMode()`
- `isReverseBrightness()` — перестановка каналов для ревизий прошивки
- `MAX_BRIGHTNESS = 254`, `SEEK_BAR_RANGE = 24`
- `setBrightness(ctx, mode, value)` пишет активный канал; при выключении — оба канала в 0
- `isOneBrightness()` — устройства без тёплого канала

### UI
`com/haoqing/widget/BrightnessControlDialog.java`:
- SeekBar + кнопки вкл/выкл/макс; значения из `Settings.System`
  (`screen_brightness`, `brightness_start_bar=6`, `brightness_start_scale=3`,
  `start_brightness=10`), `ContentObserver` на `screen_brightness`.

### Вторичный путь — home-подсветка (скрытый API)
`com/haoqing/api/impl/RockChipImpl.java:133`:
```java
PowerManager.setHomeLight(int, int, int)   // скрытый, reflection
PowerManager.turnOffHomeLight()
```
— это подсветка **home-экрана** (Haoqing = системный лаунчер); для основного экрана
читается `screen_brightness`/`haoqing_warm_light` выше.

## Доступность для обычного приложения (INPX)
- `Settings.System.putString/putInt` требует **`WRITE_SETTINGS`** (special permission,
  запрашивается через `ACTION_MANAGE_WRITE_SETTINGS` при первом использовании) —
  обычное приложение **может** получить; platform-подпись НЕ нужна (предположение:
  на M7 системный сервис слушает эти ключи и шлёт значения в панель — проверить динамически).
- `PowerManager.setHomeLight` — скрытый API, через HiddenApiBypass доступен только
  на уровнях, не в blacklist (Android 11: `P2`-уровень скрытых методов — риск;
  нужен только для home-экрана — **не требуется**).

## Карта на INPX (как воспроизвести — задача 9.4)
1. Новый нативный провайдер в стиле `OnyxFrontLight` (там уже есть паттерн
   «используй только на подходящем устройстве + status/lastError»):
   `MeebookFrontLight` — читает/пишет `Settings.System`:
   `screen_brightness` (белая, 0..254), `haoqing_warm_light` (тёплая),
   `isLightOn` (вкл/выкл), `brightness_mode`.
2. Двухползунковый UI в настройках ридера (разделы «Цвета и тема» / «Подсветка»):
   белая + жёлтая отдельно, как требует задача 9.4.
3. При первом обращении — проверка/запрос `WRITE_SETTINGS` (`Settings.System.canWrite`
   → `ACTION_MANAGE_WRITE_SETTINGS`), статус в настройках «нет разрешения».
4. Селект по устройству: `brand == "Haoqing"` && `model ~ /M7/i` (в `einkMode.ts`
   уже есть `detectEinkDevice` — добавить MEEBOOK).

**Ограничение / проверить динамически**: действуют ли эти ключи из обычного
приложения на M7 (Haoqing — системное, может писать bypass'ом). Тест: INPX пишет
`screen_brightness`, сверить со штатным слайдером настроек устройства. Диапазоны
значений (0..254?) — снять с устройства.
