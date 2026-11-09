# Dependencies — Haoqing Launcher / Reader

## DEX
7 файлов (classes.dex … classes7.dex, всего ~52.9 МБ), **12 452 класса** (JADX).
E-Ink/ручка (`com.haoqing.hw`, `HaoqingApi`) — в classes3–5.dex.

## Нативные библиотеки (только `lib/armeabi-v7a`, 32-бит)

| .so | Размер | Назначение |
|---|---|---|
| **`libiink.so`** | **16.5 МБ** | **Драйвер E-Ink-панели + handwriting** (ядро устройства) |
| **`libhqreader_java.so`** | **8.6 МБ** | Ядро ридера (parse/rendition, JNI) |
| `libMyScript*.so` (10) | ~8.5 МБ | MyScript — рукописный ввод (Ink, Document, Engine, Gesture…) |
| `libbd_etts.so`, `libbdtts.so`, `libBDSpeechDecoder_V1.so` | ~3.6 МБ | Baidu TTS (озвучка) |
| `libijkffmpeg.so`, `libijkplayer.so`, `libijksdl.so` | ~8.8 МБ | ijkplayer (видео в книгах) |
| `libtesseract.so`, `libleptonica.so` | ~4.6 МБ | OCR |
| `libstardict.so` | 0.4 МБ | Словари |
| `libjddrmsdk.so`, `libjdrcedhq.so`, `libjdrcedt.so`, `libjdrdrmhq.so`, `libjdrdrmt.so`, `libjdrebrt.so` | ~1.1 МБ | **JD (Jingdong) DRM + reader** — наследие базового JD-reader стека |
| `libopentransfer.so`, `liblocalTransEngine.so` | 1.4 МБ | Локальный машинный перевод |
| `libopenunrar.so`, `libjpegt.so`, `libpngt.so` | ~0.6 МБ | Декорирование форматов |
| `libsmart_cropper.so`, `libdict-parser.so`, `libLineBreak-v2.so` | ~0.9 МБ | Обработка текста |
| `libynmt.so` | 0.7 МБ | Нейросетевой перевод (YNMT) |
| `libc++_shared.so`, `libgnustl_shared.so`, `librandom.so` | — | STL/рантаймы |

**Вывод:** тяжёлое «железо» (E-Ink-драйвер, рендер, handwriting) — в нативе,
привязано к platform-подписи. Java-слой Haoqing — тонкие адаптеры
(`HaoqingApi`/`RockChipImpl`/`FunctionUtil`/`EinkRefreshUtils`).

## Java-библиотеки (по пакетам JADX)
- Сеть: `lzy/okgo` (OkHttp), `okio`.
- Видео: `google/exoplayer`.
- PDF: `com/tom_roush/pdfbox` (+ LiberationSans).
- Скан QR: `com/google/zxing`.
- DI/навигация: `alibaba/arouter`, `butterknife`.
- Графики/виджеты: `mikephil/charting` (charts).
- Файлы: `liulishuo/filedownloader`.
- Утилиты: `blankj/utilcode`.
- Evernote: `com/evernote` (экспорт заметок).
- `androidx`, `butterknife`, `antlr`.

## Вывод для INPX
Ничего из натива переносить нельзя (platform-привязка + только v7a + чужое
проприетарное). INPX уже имеет свою связку: WebView+Foliate (рендер), Capacitor,
`hiddenapibypass` (скрытые API). Нужен лишь **Java-адаптер под API M7**
(`requestEpdFullMode`, Settings-ключи подсветки, keycode 92/93) — без натива.
