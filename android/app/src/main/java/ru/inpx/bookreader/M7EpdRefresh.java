package ru.inpx.bookreader;

import android.os.Build;
import android.util.Log;
import android.view.View;

import org.lsposed.hiddenapibypass.HiddenApiBypass;

import java.lang.reflect.Method;
import java.util.Locale;

/**
 * E-Ink refresh на MEEBOOK M7 (rk356x) — скрытый статический API
 * {@code View.setHqEinkUpdateMode(int)} (реализация RK356xImpl Haoqing):
 * full=2, part=7, fast=0. Вызывается через reflection + HiddenApiBypass.
 *
 * <p>Детект: {@code ro.board.platform == "rk356x"} (SystemProperties через
 * reflection) ИЛИ бренд/модель Haoqing/MEEBOOK. API доступен только если
 * hidden-метод реально резолвится из обычного приложения — иначе
 * {@link #isSupported()} = false и вызовы no-op (graceful fallback).
 */
final class M7EpdRefresh {
    private static final String TAG = "M7EpdRefresh";

    /** Режимы setHqEinkUpdateMode (RK356xImpl Haoqing). */
    static final int MODE_FULL = 2;
    static final int MODE_PART = 7;
    static final int MODE_FAST = 0;

    private static boolean probed;
    private static boolean supported;
    private static Method setHqEinkUpdateMode;
    private static String lastError = "";

    private M7EpdRefresh() {}

    static String lastError() {
        return lastError;
    }

    static synchronized boolean isSupported() {
        ensureInit();
        return supported;
    }

    /** Полный refresh E-Ink. Вызывать на UI-потоке. */
    static synchronized boolean fullRefresh() {
        return refresh(MODE_FULL);
    }

    static synchronized boolean partRefresh() {
        return refresh(MODE_PART);
    }

    private static boolean refresh(int mode) {
        ensureInit();
        if (!supported) return false;
        lastError = "";
        try {
            setHqEinkUpdateMode.invoke(null, mode);
            return true;
        } catch (Throwable t) {
            lastError = t.getClass().getSimpleName() + ": " + t.getMessage();
            Log.w(TAG, "refresh(" + mode + ") failed", t);
            return false;
        }
    }

    private static void ensureInit() {
        if (probed) return;
        probed = true;
        if (!isLikelyM7()) {
            lastError = "not m7";
            return;
        }
        try {
            try {
                HiddenApiBypass.setHiddenApiExemptions("");
            } catch (Throwable t1) {
                try {
                    HiddenApiBypass.addHiddenApiExemptions("L");
                } catch (Throwable t2) {
                    Log.w(TAG, "HiddenApiBypass", t2);
                }
            }
        } catch (Throwable ignored) { /* */ }
        try {
            setHqEinkUpdateMode = View.class.getMethod("setHqEinkUpdateMode", int.class);
            setHqEinkUpdateMode.setAccessible(true);
        } catch (Throwable t) {
            lastError = "setHqEinkUpdateMode: " + t.getMessage();
            Log.w(TAG, lastError, t);
        }
        supported = setHqEinkUpdateMode != null;
        if (!supported && lastError.isEmpty()) {
            lastError = "epd api missing";
        }
        Log.i(TAG, "init supported=" + supported + " err=" + lastError);
    }

    private static boolean isLikelyM7() {
        String platform = systemProp("ro.board.platform");
        if ("rk356x".equalsIgnoreCase(platform)) return true;
        String m = String.valueOf(Build.MANUFACTURER).toLowerCase(Locale.US);
        String b = String.valueOf(Build.BRAND).toLowerCase(Locale.US);
        String model = String.valueOf(Build.MODEL).toLowerCase(Locale.US);
        String product = String.valueOf(Build.PRODUCT).toLowerCase(Locale.US);
        return b.contains("haoqing") || b.contains("meebook")
            || m.contains("haoqing") || m.contains("meebook")
            || model.contains("meebook") || product.contains("meebook");
    }

    private static String systemProp(String key) {
        try {
            Class<?> sp = Class.forName("android.os.SystemProperties");
            Method get = sp.getMethod("get", String.class);
            Object v = get.invoke(null, key);
            return v != null ? String.valueOf(v) : "";
        } catch (Throwable ignored) {
            return "";
        }
    }
}