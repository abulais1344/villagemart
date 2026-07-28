import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.villagemart.merchant',
  appName: 'VillageMart Partner',
  // webDir is required by the CLI but unused in remote-URL mode; 'public' always exists
  webDir: 'public',
  server: {
    // Point directly to the canonical www domain — zupr.in (no-www) does a 301
    // to www.zupr.in at the Vercel level, which Capacitor would open in Chrome
    // rather than staying in the WebView. Pointing here avoids that redirect.
    url: 'https://www.zupr.in/merchant-login',
    cleartext: false,
    // Allow both domains in the WebView so post-login navigations (e.g. any
    // remaining zupr.in links) also stay in-app and don't fire ACTION_VIEW.
    allowNavigation: ['zupr.in', 'www.zupr.in'],
  },
  android: {
    backgroundColor: '#7C3AED',
  },
  plugins: {
    PushNotifications: {
      // Show alert/badge/sound even when app is in foreground
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
