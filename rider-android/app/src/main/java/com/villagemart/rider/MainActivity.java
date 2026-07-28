package com.villagemart.rider;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(true);
        handleNavigateIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleNavigateIntent(intent);
    }

    // Called from RiderOrderAlertActivity when the rider taps the alert.
    // Navigates the Capacitor WebView directly to the assigned order's detail page.
    private void handleNavigateIntent(Intent intent) {
        if (intent == null) return;
        String url = intent.getStringExtra("navigateTo");
        if (url == null || url.isEmpty()) return;

        // Post to the WebView thread — bridge may not be ready yet in onCreate
        getBridge().getWebView().post(() -> getBridge().getWebView().loadUrl(url));
    }
}
