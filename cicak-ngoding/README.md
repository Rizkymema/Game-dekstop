# Cicak Ngoding

Cicak peliharaan di layar laptop Windows. Ia jalan-jalan di atas taskbar, sesekali memanjat tepi layar dan langit-langit seperti cicak sungguhan, mengejar nyamuk, dan tidur kalau kamu lama tidak mengetik. Setiap ketukan dan klik di aplikasi mana pun menjadi Baris Kode (BK) untuk proyek si cicak.

## Cara pakai

1. Unduh `Cicak-Ngoding-<versi>.exe` dari halaman Releases repo ini, lalu klik dua kali. Tidak perlu instal; pembukaan pertama butuh beberapa detik.
2. Kalau muncul **"Windows protected your PC"**, klik **More info** lalu **Run anyway**.
3. Cicak muncul di bagian bawah layar. Ikon cicak juga ada di system tray dekat jam.

## Cara main

- **Klik cicak** untuk membuka panel: koin, proyek yang sedang dikerjakan, dan upgrade.
- **Seret cicak** untuk memindahkannya. Lepas di dekat tepi layar dan ia menempel di sana; lepas di tengah dan ia jatuh ke bawah.
- **Nyamuk bug** muncul sekitar tiap 15 menit. Klik nyamuknya untuk bonus koin, atau biarkan cicak menangkapnya sendiri.
- **Upgrade**:
  - Kopi tubruk: +10% BK tiap ketukan, cicak juga jalan lebih cepat
  - Keyboard mekanik: +1 BK tiap ketukan
  - Anak Cicak: +1 BK per detik walau kamu diam, dan anak cicak ikut jalan-jalan (maksimal 3 terlihat)
  - Monitor kedua: kerjakan 2 proyek sekaligus

Area layar selain cicak, nyamuk, dan panel tetap bisa diklik seperti biasa.

## Tombol pintas

| Tombol | Fungsi |
| --- | --- |
| Ctrl+Alt+P | Buka panel |
| Ctrl+Alt+H | Sembunyikan / tampilkan cicak |
| Ctrl+Alt+Q | Keluar |

## Menu tray (klik kanan ikon cicak)

Buka panel, sembunyikan cicak, boleh memanjat dinding (matikan kalau cicak sebaiknya di bawah saja), hitung klik mouse, sembunyi saat share screen, pomodoro 25/5, jalan saat Windows menyala, mulai ulang progres, dan keluar.

## Privasi

Game hanya **menghitung jumlah** ketukan dan klik. Tombol apa yang ditekan tidak pernah disimpan, dicatat, atau dikirim ke mana pun, dan game ini tidak memakai internet. Progres tersimpan di `%APPDATA%\Cicak Ngoding\simpanan.json`.

Ketikan di aplikasi yang dijalankan "Run as administrator" tidak terhitung karena dibatasi Windows.

## Kalau ada masalah

- **Antivirus memblokir**: izinkan file `.exe`-nya di Windows Security.
- **Cicak tidak terlihat**: tekan Ctrl+Alt+H, atau klik ikon cicak di tray.

## Untuk developer

Butuh Node.js 20 atau lebih baru.

```bash
cd cicak-ngoding
npm install
npm start          # jalankan langsung
npm test           # tes logika game dan perilaku cicak
npm run dist       # buat .exe Windows di folder dist/
```

Struktur: `src/main.js` (jendela, hook global, tray), `src/preload.js` (jembatan aman), `src/game.js` (koin, proyek, upgrade), `src/dunia.js` (perilaku cicak), `src/cicak.js` (gambar pixel art), `src/renderer.js` (panel dan interaksi).

Font: VT323 (SIL Open Font License, lihat `src/font/OFL-VT323.txt`).
