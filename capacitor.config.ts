import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.yibubu.houchang",
  appName: "一步步",
  webDir: "web-dist",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https"
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#27AE60",
      overlaysWebView: false
    }
  }
};

export default config;
