# Game Desktop

Kumpulan game kecil untuk menemani kerja di laptop Windows. Setiap game berjalan di atas taskbar, tembus klik, tersembunyi saat share screen, dan bergerak dari ketikanmu di aplikasi apa pun.

## Daftar game

| Game | Folder | Isi |
| --- | --- | --- |
| Agen Mini | [`agen-mini/`](agen-mini) | Tim agen AI di kantor mini: Riset, Desain, Kode, dan Uji mengerjakan kartu tugas sampai dirilis lewat roket. |
| Cicak Ngoding | [`cicak-ngoding/`](cicak-ngoding) | Cicak peliharaan yang jalan-jalan di tepi layar, memanjat dinding, dan menangkap nyamuk. |

## Pasang di laptop (sekali saja)

1. Buka halaman [Releases](../../releases) dan unduh `Agen-Mini.exe` atau `Cicak-Ngoding.exe` dari rilis terbaru game itu.
2. Pindahkan file ke folder tetap, misalnya **Documents** atau **Desktop** (jangan di dalam Program Files).
3. Klik dua kali. Kalau muncul "Windows protected your PC", klik **More info** lalu **Run anyway**.
4. Supaya selalu menyala, klik kanan ikon game di tray lalu centang **Jalan saat Windows menyala**.

## Update otomatis

Setelah dipasang, game mengambil versi terbaru dari GitHub dengan sendirinya:

- Game mengecek Releases saat dibuka dan setiap 3 jam. Bisa juga lewat tray → **Cek update sekarang**, atau tautan **Cek update** di bawah panel.
- Versi baru diunduh diam-diam, lalu diperiksa ukuran dan sidik SHA-256-nya.
- Setelah siap, muncul notifikasi dan tombol **Pasang dan buka ulang** di panel. Kalau dibiarkan, versi baru terpasang otomatis saat game ditutup.
- File `.exe` lama di laptop ditimpa di tempat yang sama, jadi shortcut dan pengaturan "Jalan saat Windows menyala" tetap berfungsi. Progres tidak hilang.

Update otomatis butuh repo ini tetap **publik**, karena game mengunduh tanpa login.

## Cara memperbarui game

1. Ubah kode di folder game-nya.
2. Naikkan `version` di `package.json` game itu (misalnya `1.1.0` menjadi `1.1.1`). Tanpa ini, laptop tidak menganggapnya versi baru.
3. Commit dan push ke `main`. GitHub Actions menjalankan tes, membangun `.exe` di Windows, lalu menerbitkannya di Releases dengan tag `<folder>-v<versi>`. Prosesnya sekitar 4 menit dan bisa dipantau di tab [Actions](../../actions).
4. Laptop mengambilnya paling lambat 3 jam kemudian, atau langsung lewat **Cek update sekarang**.

## Cara menambah game baru

1. Buat folder baru di root repo, misalnya `kucing-oyen/`.
2. Isi dengan proyek Electron yang punya `package.json`, `package-lock.json`, dan konfigurasi `build` untuk electron-builder. Paling mudah, salin `agen-mini/` lalu ubah. Supaya update otomatis jalan, salin juga `src/pembaruan.js` dan isi `"pembaruan": { "repo": "Rizkymema/Game-dekstop", "awalan": "<nama-folder>" }` di `package.json`.
3. Tambahkan skrip `test` kalau ada tes. Skrip ini dijalankan sebelum build.
4. Push. Workflow otomatis mendeteksi setiap folder yang berisi `package.json` dan membangunnya.

## Menjalankan dari kode

Butuh Node.js 20 atau lebih baru.

```bash
cd agen-mini        # atau folder game lain
npm install
npm start
```
