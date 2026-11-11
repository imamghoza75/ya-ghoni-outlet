# Ya Ghoni Outlet — Android APK

Proyek ini memakai TanStack Start. Fungsi Digiflazz berjalan di backend Nitro, sehingga APK harus diarahkan ke deployment HTTPS aplikasi (bukan membuka `localhost` di HP).

## Persiapan

1. Deploy aplikasi web/backend ke hosting yang menjalankan output Nitro (misalnya Vercel).
2. Pastikan URL deployment HTTPS aktif dan endpoint server TanStack Start berfungsi.
3. Pasang Node.js LTS, Android Studio, Android SDK, dan JDK yang didukung versi Android Gradle Plugin dari Capacitor.
4. Isi `CAPACITOR_SERVER_URL` dengan URL deployment, misalnya `https://alamat-aplikasi-kamu.vercel.app`.

## Membuat proyek Android

```bash
npm install
npm install @capacitor/core
npm install -D @capacitor/cli
npm install @capacitor/android
npx cap add android
npx cap sync android
npx cap open android
```

Di Android Studio pilih **Build > Build Bundle(s) / APK(s) > Build APK(s)**. APK debug biasanya berada di `android/app/build/outputs/apk/debug/app-debug.apk`.

## Catatan penting

- Jangan memasukkan username/API Key Digiflazz ke `capacitor.config.ts`, file `.env` yang dipaketkan, atau source APK.
- Username dan API Key dimasukkan melalui layar Pengaturan aplikasi. Kode server menghitung signature dan mengirim request ke Digiflazz.
- Gunakan HTTPS. Jangan aktifkan mode live sebelum whitelist IP server dan SKU buyer benar-benar siap.
- APK remote-server memerlukan koneksi internet. Pastikan domain deployment tetap sama dan tersedia.
- Saat ini belum ada APK siap pasang: Android project harus diinisialisasi dengan Capacitor, lalu dibangun di lingkungan yang memiliki Android SDK.
