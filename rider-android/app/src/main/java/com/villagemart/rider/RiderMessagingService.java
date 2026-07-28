package com.villagemart.rider;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Intercepts FCM data messages for the rider app.
 *
 * - type=new_order_assigned → full-screen alert (RiderOrderAlertActivity) on lock/off screen
 * - everything else         → forwarded to the Capacitor plugin's default handler
 *
 * Registered in AndroidManifest with Capacitor's service removed (tools:node="remove"),
 * so this is the sole FirebaseMessagingService in the app. onNewToken is inherited from
 * the Capacitor MessagingService so FCM token refresh still reaches JS.
 */
public class RiderMessagingService extends MessagingService {

    static final String CHANNEL_RIDER_ORDERS = "rider_orders";
    static final int    NOTIF_ID_ORDER       = 2001;

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        String type = data.get("type");

        if ("new_order_assigned".equals(type)) {
            ensureChannel(this);
            showOrderAlert(data);
        } else {
            super.onMessageReceived(remoteMessage);
        }
    }

    // ── Full-screen order alert ────────────────────────────────────────────────

    private void showOrderAlert(Map<String, String> data) {
        String orderId    = orEmpty(data.get("orderId"));
        String shortId    = orEmpty(data.get("shortId"), "???");
        String storeName  = orEmpty(data.get("storeName"), "Restaurant");
        String itemCount  = orEmpty(data.get("itemCount"), "1");

        Intent alertIntent = new Intent(this, RiderOrderAlertActivity.class)
                .putExtra("orderId",   orderId)
                .putExtra("shortId",   shortId)
                .putExtra("storeName", storeName)
                .putExtra("itemCount", itemCount)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent fullScreenPi = PendingIntent.getActivity(
                this, NOTIF_ID_ORDER, alertIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Tap on the collapsed notification also opens the alert activity
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_RIDER_ORDERS)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("New order assigned!")
                .setContentText(storeName + " • " + itemCount + " item(s)")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(false)
                .setOngoing(true)
                .setFullScreenIntent(fullScreenPi, true)
                .setContentIntent(fullScreenPi);

        NotificationManagerCompat.from(this).notify(NOTIF_ID_ORDER, builder.build());
    }

    // ── Channel setup ─────────────────────────────────────────────────────────

    static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm.getNotificationChannel(CHANNEL_RIDER_ORDERS) != null) return;

        Uri soundUri = Uri.parse(
                "android.resource://" + ctx.getPackageName() + "/raw/new_order_sound");
        AudioAttributes audioAttr = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_RIDER_ORDERS, "Rider Orders", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Alerts for newly assigned delivery orders");
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[]{0, 200, 100, 200, 100, 200, 100, 500});
        channel.setSound(soundUri, audioAttr);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(channel);
    }

    private static String orEmpty(String v) { return v != null ? v : ""; }
    private static String orEmpty(String v, String def) { return (v != null && !v.isEmpty()) ? v : def; }
}
