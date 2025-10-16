import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.e8afea1b58704aa2bdda2bdcadda2c5f',
  appName: 'Y2J Commissary',
  webDir: 'dist',
  server: {
    url: 'https://e8afea1b-5870-4aa2-bdda-2bdcadda2c5f.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    contentInset: 'always'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1f2e',
      showSpinner: false
    }
  }
};

export default config;
