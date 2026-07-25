import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.villagemart.merchant',
  appName: 'VillageMart Partner',
  // webDir is required by the CLI but unused in remote-URL mode; 'public' always exists
  webDir: 'public',
  server: {
    // The WebView loads the live Vercel deployment — no local bundling needed
    url: 'https://zupr.in/merchant-login',
    cleartext: false,
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
