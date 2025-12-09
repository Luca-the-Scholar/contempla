import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c0338147c3324b2cb5d7a5ad61c0e9ec',
  appName: 'contempla',
  webDir: 'dist',
  server: {
    url: 'https://c0338147-c332-4b2c-b5d7-a5ad61c0e9ec.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#141d2b',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#141d2b',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#3b82f6',
      sound: 'tibetan-bowl-struck-1.wav',
    },
  },
};

export default config;
