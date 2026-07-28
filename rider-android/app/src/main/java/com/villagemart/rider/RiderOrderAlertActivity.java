package com.villagemart.rider;

import android.app.Activity;
import android.content.Intent;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.TextView;

import androidx.core.app.NotificationManagerCompat;

/**
 * Full-screen "incoming call" style activity shown when a new delivery order is
 * assigned to the rider via FCM (type=new_order_assigned).
 *
 * Design: minimal. No accept/reject decisions here — the rider just needs to
 * see what's coming and tap to open the order detail page.
 *
 * Tap anywhere (except the ✕ button) → stop ringtone, open MainActivity at
 *     https://www.zupr.in/rider/delivery/{orderId}
 * Tap ✕ → stop ringtone, dismiss without opening the app
 */
public class RiderOrderAlertActivity extends Activity {

    private MediaPlayer mediaPlayer;
    private String orderId;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Show on lock screen and wake the display
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        requestWindowFeature(Window.FEATURE_NO_TITLE);

        super.onCreate(savedInstanceState);

        RiderMessagingService.ensureChannel(this);
        setContentView(R.layout.activity_rider_order_alert);

        startRingtone();

        Intent intent = getIntent();
        orderId               = safeStr(intent.getStringExtra("orderId"));
        String shortId        = safeStr(intent.getStringExtra("shortId"), "???");
        String storeName      = safeStr(intent.getStringExtra("storeName"), "Restaurant");
        String itemCountRaw   = safeStr(intent.getStringExtra("itemCount"), "1");
        int    count          = parseIntSafe(itemCountRaw, 1);
        String itemLabel      = count == 1 ? "1 item" : count + " items";

        ((TextView) findViewById(R.id.tvStoreName)).setText(storeName);
        ((TextView) findViewById(R.id.tvItemCount)).setText(itemLabel);
        ((TextView) findViewById(R.id.tvOrderId)).setText("Order #" + shortId);

        // Tap anywhere on the main area → open order detail
        findViewById(R.id.layoutTapArea).setOnClickListener(v -> openOrder());

        // ✕ button — dismiss only, no app open
        findViewById(R.id.btnDismiss).setOnClickListener(v -> dismissOnly());
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    private void openOrder() {
        stopRingtone();
        NotificationManagerCompat.from(this).cancel(RiderMessagingService.NOTIF_ID_ORDER);

        String url = "https://www.zupr.in/rider/orders";
        if (!orderId.isEmpty()) {
            url = "https://www.zupr.in/rider/delivery/" + orderId;
        }

        Intent main = new Intent(this, MainActivity.class)
                .putExtra("navigateTo", url)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(main);
        finish();
    }

    private void dismissOnly() {
        stopRingtone();
        NotificationManagerCompat.from(this).cancel(RiderMessagingService.NOTIF_ID_ORDER);
        finish();
    }

    // ── Ringtone ──────────────────────────────────────────────────────────────

    private void startRingtone() {
        try {
            mediaPlayer = MediaPlayer.create(this, R.raw.new_order_sound);
            if (mediaPlayer != null) {
                mediaPlayer.setLooping(true);
                mediaPlayer.start();
            }
        } catch (Exception e) {
            // Non-fatal — visual alert still works without audio
        }
    }

    private void stopRingtone() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) mediaPlayer.stop();
                mediaPlayer.release();
            } catch (Exception ignored) {}
            mediaPlayer = null;
        }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @Override
    protected void onDestroy() {
        stopRingtone();
        super.onDestroy();
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    private static String safeStr(String v) { return v != null ? v : ""; }
    private static String safeStr(String v, String def) {
        return (v != null && !v.isEmpty()) ? v : def;
    }
    private static int parseIntSafe(String v, int def) {
        try { return Integer.parseInt(v); } catch (Exception e) { return def; }
    }
}
