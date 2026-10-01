import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ir.bustracking.driver',
  appName: 'اتوبوس رانندگان',
  webDir: 'dist',
  server: {
    url: 'http://94.183.30.202:3002',
    cleartext: true,
    allowNavigation: ['94.183.30.202'],
    androidScheme: 'http',
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0ea5e9',
      showSpinner: false,
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#0ea5e9',
    },
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      iosKeychainPrefix: 'bus-tracking',
      iosBiometric: {
        biometricAuth: false,
        biometricTitle: 'Bus Tracking Biometric Auth',
      },
      androidIsEncryption: false,
      androidBiometric: {
        biometricAuth: false,
        biometricTitle: 'Bus Tracking Biometric Auth',
      },
      electronIsEncryption: false,
      electronWindowsLocation: 'CapacitorDatabase',
      electronMacLocation: 'CapacitorDatabase',
    },
  },
};

export default config;
