package com.villagemart.merchant;

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
 * Intercepts FCM data messages before the Capacitor plugin handles them.
 *
 * - type=new_order      → full-screen alert (OrderAlertActivity) + inline Accept/Reject
 * - type=order_reminder → high-priority heads-up reminder (no full-screen)
 * - everything else     → forwarded to the Capacitor plugin's default handler
 *
 * Registered in AndroidManifest with Capacitor's service removed (tools:node="remove"),
 * so this is the sole FirebaseMessagingService in the app. onNewToken is inherited from
 * the Capacitor MessagingService so FCM token refresh still reaches JS.
 */
public class MerchantMessagingService extends MessagingService {

    static final String CHANNEL_NEW_ORDERS = "new_orders";
    static final int    NOTIF_ID_ORDER     = 1001;
    static final int    NOTIF_ID_REMINDER  = 1002;

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        String type = data.get("type");

        if ("new_order".equals(type)) {
            ensureChannel(this);
            showOrderAlert(data);
        } else if ("order_reminder".equals(type)) {
            ensureChannel(this);
            showReminder(data);
        } else {
            super.onMessageReceived(remoteMessage);
        }
    }

    // ── Full-screen order alert ────────────────────────────────────────────────

    private void showOrderAlert(Map<String, String> data) {
        String orderId      = orEmpty(data.get("orderId"));
        String shortId      = orEmpty(data.get("shortId"), "???");
        String customerName = orEmpty(data.get("customerName"), "Customer");
        String area         = orEmpty(data.get("area"));
        String itemsSummary = orEmpty(data.get("itemsSummary"));
        String payout       = orEmpty(data.get("payout"), "0");
        String acceptToken  = orEmpty(data.get("acceptToken"));
        String rejectToken  = orEmpty(data.get("rejectToken"));

        // Full-screen Intent — launches OrderAlertActivity on lock/off screen
        Intent alertIntent = new Intent(this, OrderAlertActivity.class)
                .putExtra("orderId",      orderId)
                .putExtra("shortId",      shortId)
                .putExtra("customerName", customerName)
                .putExtra("area",         area)
                .putExtra("itemsSummary", itemsSummary)
                .putExtra("payout",       payout)
                .putExtra("acceptToken",  acceptToken)
                .putExtra("rejectToken",  rejectToken)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent fullScreenPi = PendingIntent.getActivity(
                this, NOTIF_ID_ORDER, alertIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Inline Accept button
        Intent acceptIntent = new Intent(this, OrderActionReceiver.class)
                .putExtra("action", "accept")
                .putExtra("token",  acceptToken)
                .putExtra("notificationId", NOTIF_ID_ORDER);
        PendingIntent acceptPi = PendingIntent.getBroadcast(
                this, 100, acceptIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Inline Reject button
        Intent rejectIntent = new Intent(this, OrderActionReceiver.class)
                .putExtra("action", "reject")
                .putExtra("token",  rejectToken)
                .putExtra("notificationId", NOTIF_ID_ORDER);
        PendingIntent rejectPi = PendingIntent.getBroadcast(
                this, 101, rejectIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String contentText = customerName + (area.isEmpty() ? "" : " • " + area) + " • ₹" + payout;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_NEW_ORDERS)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("New Order #" + shortId)
                .setContentText(contentText)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(
                        contentText + (itemsSummary.isEmpty() ? "" : "\n" + itemsSummary)))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(false)
                .setOngoing(true)
                .setFullScreenIntent(fullScreenPi, true)
                .setContentIntent(fullScreenPi)
                .addAction(android.R.drawable.checkbox_on_background, "✓ Accept", acceptPi)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "✗ Reject", rejectPi);

        NotificationManagerCompat.from(this).notify(NOTIF_ID_ORDER, builder.build());
    }

    // ── Repeat reminder notification (order still pending) ────────────────────

    private void showReminder(Map<String, String> data) {
        String shortId     = orEmpty(data.get("shortId"), "???");
        String payout      = orEmpty(data.get("payout"), "0");
        String ageMinutes  = orEmpty(data.get("ageMinutes"), "?");

        Intent tapIntent = new Intent(this, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent tapPi = PendingIntent.getActivity(
                this, NOTIF_ID_REMINDER, tapIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_NEW_ORDERS)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("⚠️ Order Waiting " + ageMinutes + " min!")
                .setContentText("Order #" + shortId + " • Payout ₹" + payout + " • Please accept!")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setContentIntent(tapPi);

        NotificationManagerCompat.from(this).notify(NOTIF_ID_REMINDER, builder.build());
    }

    // ── Channel setup ─────────────────────────────────────────────────────────

    static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm.getNotificationChannel(CHANNEL_NEW_ORDERS) != null) return;

        Uri soundUri = Uri.parse(
                "android.resource://" + ctx.getPackageName() + "/raw/new_order_sound");
        AudioAttributes audioAttr = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_NEW_ORDERS, "New Orders", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Incoming order alerts");
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[]{0, 200, 100, 200, 100, 200, 100, 500});
        channel.setSound(soundUri, audioAttr);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(channel);
    }

    private static String orEmpty(String v) { return v != null ? v : ""; }
    private static String orEmpty(String v, String def) { return (v != null && !v.isEmpty()) ? v : def; }
}
