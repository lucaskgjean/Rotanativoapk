import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rotafinanceira.app',
  appName: 'RotaFinanceira',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#4f46e5'
    }
  }
};

export default config;
