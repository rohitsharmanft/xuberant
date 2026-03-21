import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.xuberantsolutions.com',
  appName: 'Xuberant',
  webDir: 'www',
  cordova: {
    preferences: {
      ScrollEnabled: 'false',
      BackupWebStorage: 'none',
      AndroidWindowSplashScreenAnimatedIcon: 'resources/android/splash.png',
      AndroidWindowSplashScreenBackground: '#ffffff'
    }
  }
};

export default config;
