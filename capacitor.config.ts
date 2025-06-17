
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.e1cc5e1cc0cb4d538dd49060e6d09d5c',
  appName: 'contract-bank-pro',
  webDir: 'dist',
  server: {
    url: 'https://e1cc5e1c-c0cb-4d53-8dd4-9060e6d09d5c.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      showSpinner: false
    }
  }
};

export default config;
