# Fonts and Resources Analysis — Haoqing

## Шрифты (проверено: `decoded/apktool/res`, `decoded/apktool/assets`, listing APK)

**Читательских шрифтов в APK НЕТ.** Единственный шрифт:
- `assets/com/tom_roush/pdfbox/resources/ttf/LiberationSans-Regular.ttf`
  (350 КБ, дублируется в корне `com/tom_roush/...`) — ресурс **PDFBox** для
  рендера PDF, лицензия SIL OFL (Liberation Sans) — свободный.

- `res/font` отсутствует; системных `typeface`-ассетов нет.
- Вывод: Haoqing читает книги **системными шрифтами Android** (+ рукописные
  аннотации через MyScript, шрифты Google Fonts подгружаются по сети в читалке
  — ключ `reader.fontGoogle` есть и в INPX).

**Последствия для задачи 9.5:**
- Копировать из Haoqing нечего — защищённых/проприетарных читательских шрифтов нет,
  лицензионных препятствий нет.
- INPX уже имеет шрифтовую инфраструктуру (`@fontsource-variable/inter`,
  `literata`, «Шрифт из книги» publisher-font, Google Fonts) — перенос «шрифтов Haoqing»
  сводится к проверке, что системный шрифт M7 корректно рендерится в WebView (e-ink:
  чёткость при 320 dpi, антиалиасинг) — вопрос качества, не лицензий.

## Прочие ресурсы (обзор `assets/`)

| Контент | Назначение | Переносимо/нужно |
|---|---|---|
| `bd_etts_*.dat` (~10 файлов) | модели Baidu TTS (голоса) | нет (свой TTS у INPX — системный) |
| `dictionaries/`, `encodings/` | словари | нет (INPX — свои словари сервера) |
| `hyphenationPatterns/`, `languagePatterns/` | переносы/гидрофразы | нет (INPX: `app.hyphenate` из CSS) |
| `tapzones/` | конфигурации зон тапов | **интересно для 9.3** (переназначение зон) — но формат закрытый, INPX уже имеет tap-zones |
| `formats/`, `buildin/`, `default/` (styles.xml, plugins.xml) | движок ридера (наследие Calibre-подобный) | нет (у INPX Foliate) |
| `libre/` | LibreOffice-ассеты (конвертация) | нет |
| `note/`, `quotations_builtin` | заметки/цитаты | нет |
| `credentials.json`, `cpa.properties`, `Google.js`, `bing/` | API-ключи/сервисы JD+Bing+Google | **не копировать** (чужие ключи, мёртвые для INPX) |
| `res/` | 60+ локализаций (values-*) | нет (у INPX свои i18n ru/en) |

## Вывод
Этап «ресурсы Haoqing» для INPX **пуст**: ничего лицензируемого не берётся.
Самостоятельная реализация (шрифты, переносы, зоны) — в собственной инфраструктуре INPX.
