# Manifest Analysis — Haoqing Launcher

Source: `reference/haoqing/metadata/manifest.xml` (aapt xmltree), 397 lines.

## Идентичность
- `package`: `com.haoqing.app.hqreader`
- **`android:sharedUserId="android.uid.system"`** — системное приложение
- versionName 2.1.1316, minSdk 21 / targetSdk 27

## Permissions (33) и их категории

### Стандартные (доступны обычному приложению)
`INTERNET`, `ACCESS_NETWORK_STATE`, `CHANGE_NETWORK_STATE`, `ACCESS_WIFI_STATE`,
`CHANGE_WIFI_STATE`, `BLUETOOTH`, `CAMERA`, `RECORD_AUDIO`, `READ_PHONE_STATE`,
`VIBRATE`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`, `READ/WRITE_EXTERNAL_STORAGE`
(legacy ≤28), `REQUEST_INSTALL_PACKAGES`, `MODIFY_AUDIO_SETTINGS`, `GET_TASKS`,
`REORDER_TASKS`, `FLASHLIGHT`, `SYSTEM_ALERT_WINDOW`.

### **Особые / danger-повышенные — для переноса**
- `WRITE_SETTINGS` — запись `Settings.System` (подсветка `screen_brightness`,
  `haoqing_warm_light`, `isLightOn`). **Потребует runtime-запрос на всех Android.**
- `RECEIVE_USER_PRESENT` — событие разблокировки экрана.
- `KILL_BACKGROUND_PROCESSES` — системная, обычному не выдаётся.
- `MOUNT_UNMOUNT_FILESYSTEMS` — legacy системная.
- `ACCESS_LOCATION_EXTRA_COMMANDS` — системная.
- `DISABLE_STATUS_BAR` — legacy, для полного экрана.

### **Только signature / system (НЕдоступны обычному приложению)**
- `INTERACT_ACROSS_USERS`, `INTERACT_ACROSS_USERS_FULL`
- `WRITE_SECURE_SETTINGS`
- `SYSTEM_OVERLAY_WINDOW`
- `com.jingdong.app.reader.permission.JPUSH_MESSAGE` (приватная JD)
- `com.android.launcher.permission.INSTALL_SHORTCUT / UNINSTALL_SHORTCUT`

> Вывод: большая часть «системности» Haoqing держится на `signature`/`system`
> permission. INPX их **не получит** — переносится только подмножество,
> работающее через `WRITE_SETTINGS` + reflection на скрытые API.

## Activities (выделенные, 24 с явным именем)
- **Launcher**: `...view.activity.LauncherActivity` (MAIN + `category.HOME`),
  `...view.activity.MainActivity` (основной).
- Reader: `com.haoqing.ReaderMainActivity`, `com.haoqing.NoteModeActivity`,
  `com.haoqing.Tab4Activity`.
- Store/JD: `jdlibrary.view.activity.*` (BookPlayer, BookStoreList, …).
- Note/handwrite: `note.app.view.activity.NoteDraw2Activity`,
  `note.app.reader.activity.TextReaderNoteActivity`.
- Dict: `com.haoqing.dict.DictActivity`, `LanguageActivity`.
- Прочие: Cloud OAuth, Evernote, Permissions, SearchBookInfo, ReadHistory, CropImage.

## Services (10)
`engine.service.ParseService` (разбор книг), `engine.service.HandwrittenNoteService`,
`service.BookCoverService`, `service.DictionaryService`, `db.book.LibraryService`,
`db.config.ConfigService`, `app.hqreader.service.BooksManageService`,
`UpdateBooksService`, `jdlibrary.view.service.BookPlayerService`,
`filedownloader` (lib), messenger.

## Receivers
`receiver.DeskTopModelReceiver`, `receiver.ShutdownReceiver`
(ACTION_SHUTDOWN — «закрыть до обновления E-Ink при выключении»).

## Broadcast-контракты (`com.haoqing.*`)
В `IReadSetting`: `note.updatedelete`, `note.pageskip`, `note.savepen`,
`notehw.reset`, `input.close`, `chose.note.backup`, `note.bgchange`,
`note.updateall*` — внутренние события рукописного модуля.
**Home-кнопка**: `MainActivity.HomeKeyEventBroadCastReceiver` ловит
`android.intent.action.CLOSE_SYSTEM_DIALOGS` с `reason=homekey` — фирменный
broadcast OEM (работает только у системного лаунчера).
