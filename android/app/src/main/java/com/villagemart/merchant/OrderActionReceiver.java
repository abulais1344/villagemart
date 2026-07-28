package com.villagemart.merchant;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.app.NotificationManagerCompat;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Handles the inline Accept / Reject action buttons shown in the heads-up
 * notification (when the screen is on and the full-screen activity isn't used).
 *
 * Dismisses the notification immediately, then POSTs the action token to the
 * order-action endpoint in a background thread.  Uses goAsync() so Android
 * keeps the process alive while the HTTP call completes.
 */
public class OrderActionReceiver extends BroadcastReceiver {

    private static final String ACTION_URL = "https://www.zupr.in/api/merchant/order-action";

    @Override
    public void onReceive(Context context, Intent intent) {
        String token          = intent.getStringExtra("token");
        int    notificationId = intent.getIntExtra("notificationId", MerchantMessagingService.NOTIF_ID_ORDER);

        // Dismiss the notification immediately for instant UX feedback
        NotificationManagerCompat.from(context).cancel(notificationId);

        if (token == null || token.isEmpty()) return;

        // goAsync() tells Android to keep the process alive past onReceive()
        final PendingResult pending = goAsync();
        final String finalToken = token;

        new Thread(() -> {
            try {
                URL url = new URL(ACTION_URL);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(10_000);
                conn.setReadTimeout(10_000);

                String json = "{\"token\":\"" + finalToken + "\"}";
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(json.getBytes(StandardCharsets.UTF_8));
                }
                conn.getResponseCode(); // consume response
                conn.disconnect();
            } catch (Exception e) {
                // Silent: merchant's tap was registered; network failure is secondary.
                // The pending order will trigger a reminder notification after 1 min.
            } finally {
                pending.finish();
            }
        }).start();
    }
}
