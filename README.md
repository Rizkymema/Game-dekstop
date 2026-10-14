# Game Desktop

Kumpulan game kecil untuk menemani kerja di laptop Windows. Setiap game berjalan di atas taskbar, tembus klik, tersembunyi saat share screen, dan bergerak dari ketikanmu di aplikasi apa pun.

## Daftar game

| Game | Folder | Isi |
| --- | --- | --- |
| Agen Mini | [`agen-mini/`](agen-mini) | Tim agen AI di kantor mini: Riset, Desain, Kode, dan Uji mengerjakan kartu tugas sampai dirilis lewat roket. |
| Cicak Ngoding | [`cicak-ngoding/`](cicak-ngoding) | Cicak peliharaan yang jalan-jalan di tepi layar, memanjat dinding, dan menangkap nyamuk. |

## Cara mengunduh

1. Buka halaman [Releases](../../releases).
2. Pilih game dan versi terbaru, lalu unduh file `.exe`-nya.
3. Klik dua kali file tersebut. Kalau muncul "Windows protected your PC", klik **More info** lalu **Run anyway**.

File `.exe` dibuat otomatis oleh GitHub Actions setiap ada perubahan di branch `main`. Prosesnya sekitar 5 menit dan bisa dipantau di tab [Actions](../../actions).

## Cara memperbarui game

1. Ubah kode di folder game-nya.
2. Naikkan `version` di `package.json` game itu (misalnya `1.0.0` menjadi `1.0.1`) supaya muncul sebagai rilis baru.
3. Commit dan push ke `main`. GitHub Actions akan menjalankan tes, membangun `.exe`, dan menaruhnya di Releases dengan nama tag `<folder>-v<versi>`.

Kalau versinya tidak dinaikkan, file `.exe` di rilis versi yang sama akan diganti dengan hasil build terbaru.

## Cara menambah game baru

1. Buat folder baru di root repo, misalnya `kucing-oyen/`.
2. Isi dengan proyek Electron yang punya `package.json`, `package-lock.json`, dan konfigurasi `build` untuk electron-builder (salin dari `agen-mini/package.json` sebagai contoh).
3. Tambahkan skrip `test` kalau ada tes. Skrip ini dijalankan sebelum build.
4. Push. Workflow otomatis mendeteksi setiap folder yang berisi `package.json` dan membangunnya.

## Menjalankan dari kode

Butuh Node.js 20 atau lebih baru.

```bash
cd agen-mini        # atau folder game lain
npm install
npm start
```
