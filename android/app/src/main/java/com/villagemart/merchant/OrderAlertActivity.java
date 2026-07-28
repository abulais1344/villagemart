package com.villagemart.merchant;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.app.NotificationManagerCompat;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Full-screen "incoming call" style activity shown when a new order FCM arrives
 * and the screen is locked / the app is in the background.
 *
 * Shows order details and two large buttons (Accept / Reject) that POST to
 * https://www.zupr.in/api/merchant/order-action using the HMAC-signed token
 * embedded in the FCM data payload.
 */
public class OrderAlertActivity extends Activity {

    private String acceptToken;
    private String rejectToken;
    private static final String ACTION_URL = "https://www.zupr.in/api/merchant/order-action";

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

        // Remove title bar before super + setContentView
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        super.onCreate(savedInstanceState);

        // Ensure the notification channel exists (in case service hasn't run yet)
        MerchantMessagingService.ensureChannel(this);

        setContentView(R.layout.activity_order_alert);

        Intent intent = getIntent();
        String shortId      = intent.getStringExtra("shortId");
        String customerName = intent.getStringExtra("customerName");
        String area         = intent.getStringExtra("area");
        String itemsSummary = intent.getStringExtra("itemsSummary");
        String payout       = intent.getStringExtra("payout");
        acceptToken         = intent.getStringExtra("acceptToken");
        rejectToken         = intent.getStringExtra("rejectToken");

        ((TextView) findViewById(R.id.tvOrderId))
                .setText("Order #" + (shortId != null ? shortId : "???"));
        ((TextView) findViewById(R.id.tvCustomer))
                .setText(safeStr(customerName) +
                        (area != null && !area.isEmpty() ? "  •  " + area : ""));
        ((TextView) findViewById(R.id.tvItems))
                .setText(safeStr(itemsSummary));
        ((TextView) findViewById(R.id.tvPayout))
                .setText("₹" + safeStr(payout, "0"));

        Button btnAccept = findViewById(R.id.btnAccept);
        Button btnReject = findViewById(R.id.btnReject);

        btnAccept.setOnClickListener(v -> {
            btnAccept.setEnabled(false);
            btnReject.setEnabled(false);
            sendAction("accept", acceptToken);
        });
        btnReject.setOnClickListener(v -> {
            btnAccept.setEnabled(false);
            btnReject.setEnabled(false);
            sendAction("reject", rejectToken);
        });
    }

    private void sendAction(String action, String token) {
        new Thread(() -> {
            boolean success = false;
            String errorMsg = null;
            try {
                URL url = new URL(ACTION_URL);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(10_000);
                conn.setReadTimeout(10_000);

                String json = "{\"token\":\"" + token + "\"}";
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(json.getBytes(StandardCharsets.UTF_8));
                }
                int code = conn.getResponseCode();
                conn.disconnect();
                success = (code == 200);
                if (!success) errorMsg = "Server error " + code;
            } catch (Exception e) {
                errorMsg = e.getMessage();
            }

            final boolean didSucceed = success;
            final String  finalErr   = errorMsg;
            runOnUiThread(() -> {
                if (didSucceed) {
                    Toast.makeText(this,
                            "accept".equals(action) ? "Order Accepted!" : "Order Rejected",
                            Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(this,
                            "Action failed — " + finalErr + ". Open the app to retry.",
                            Toast.LENGTH_LONG).show();
                }
                dismissAndFinish();
            });
        }).start();
    }

    private void dismissAndFinish() {
        NotificationManagerCompat.from(this).cancel(MerchantMessagingService.NOTIF_ID_ORDER);
        finish();
    }

    private static String safeStr(String v) { return v != null ? v : ""; }
    private static String safeStr(String v, String def) {
        return (v != null && !v.isEmpty()) ? v : def;
    }
}
