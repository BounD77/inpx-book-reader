# Stage 3 Summary — Haoqing Launcher research

Static analysis (JADX + apktool) **and** dynamic device research (2026-11-08) complete.
Findings confirmed from decompiled code + `getprop`/`getevent`/keylayout/`settings` on the M7.

## The one architectural constraint
Haoqing is a **system app** (`android.uid.system`, platform-signed). M7 platform is
**rk356x** (Haoqing OEM). INPX is a **normal app**. Everything in INPX's scope
(page buttons, dual frontlight, E-Ink refresh, fullscreen) is reachable by a normal
app — **no platform signature needed** — through standard Android APIs + hidden APIs
(HiddenApiBypass, already an INPX dependency) + `Settings.System` (needs the
`WRITE_SETTINGS` special permission, requestable at runtime).

## Porting map (Haoqing mechanism → INPX) — M7 (rk356x) confirmed

| Task | Haoqing mechanism (confirmed) | INPX approach | Rights needed |
|---|---|---|---|
| **9.3 buttons** | `gpio-keys` raw **603/604** → OEM `HAOQING_PAGE_UP/DOWN` (keylayout); Haoqing app handles **92/93** (`BaseActivity.onKeyUp`) | `ReaderNativePlugin`/`MainActivity` `dispatchKeyEvent` → bridge to reader iframe; settings for remap/disable. **Fix exact keyCode with one logcat run** | **none** (standard) |
| **9.4 backlight** | `Settings.System`: `screen_brightness` (white, live **61**), `haoqing_warm_light` (warm, live **97**), `isLightOn`, `brightness_mode`; range 0–254 | new `MeebookFrontLight` provider (pattern of `OnyxFrontLight`); two sliders in reader settings | `WRITE_SETTINGS` (runtime request) |
| **9.1/9.2 E-Ink + fullscreen** | **`View.setHqEinkUpdateMode(int)`** (rk356x): full=**2**, part=**7**, fast=**0**; `fullscreen_flush` = full refresh on entering fullscreen | M7 branch in `OnyxEpdRefresh` (rk356x) via HiddenApiBypass; full refresh after insets change; CSS viewport recompute for reader | HiddenApiBypass (already present) |
| **9.5 fonts** | **no bundled reading fonts** (only LiberationSans for PDFBox, SIL OFL) | nothing to port; INPX keeps its own font stack | n/a |

> Note: the generic `RockChipImpl` path (`View.requestEpdFullMode(int,int)`) is **not**
> used on M7 — rk356x routes to `RK356xImpl` → `setHqEinkUpdateMode`. See
> `eink-analysis.md` (both paths documented).

## NOT portable / NOT needed
- Ink/handwriting stack (`libiink.so` 16 MB, MyScript) — platform + native, out of scope.
- Home-key broadcast (`reason=homekey`) — system launcher only.
- `PowerManager.setHomeLight` — hidden, home-screen only, not needed.

## Still to verify (at implementation time — one logcat run covers all)
1. Whether `View.setHqEinkUpdateMode` resolves via HiddenApiBypass from a **normal**
   app on M7 (Haoqing is privileged) — expect no `NoSuchMethodException` + visible full refresh.
2. Exact `keyCode` a normal app receives for the two M7 page buttons (92/93, or the OEM values) —
   log `event.getKeyCode()` in `dispatchKeyEvent`.
3. Whether writing `screen_brightness`/`haoqing_warm_light` from a normal app with
   `WRITE_SETTINGS` drives the panel (Haoqing is privileged).

## Files
- metadata/: `README.md`, `apk-info.txt`, `manifest.xml`, `package-info.txt`, `signing-info.txt`
- analysis/: `SUMMARY.md`, `architecture.md`, `manifest-analysis.md`, `dependencies.md`,
  `hardware-api.md`, `eink-analysis.md`, `buttons-analysis.md`, `backlight-analysis.md`,
  `fullscreen-analysis.md`, `fonts-and-resources.md`
- evidence/logs/: `device-research-2026-11-08.md`
- decoded/: `jadx/sources` (12 452 classes / 18 161 files), `apktool` (manifest, res, smali, assets, lib)
