import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "id.yaghoni.outlet",
  appName: "Ya Ghoni Outlet",
  // TanStack Start membutuhkan server Nitro untuk fungsi Digiflazz.
  // APK diarahkan ke deployment HTTPS agar server functions tetap berjalan.
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: false,
          androidScheme: "https",
        },
      }
    : {}),
  android: {
    allowMixedContent: false,
    backgroundColor: "#0c0e0d",
  },
};

export default config;
