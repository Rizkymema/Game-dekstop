# Agen Mini

Kantor kecil di atas taskbar Windows, berisi tim agen AI yang bekerja bersamamu. Kartu tugas mengalir dari meja ke meja: Riset, Desain, Kode, lalu Uji. Setiap tugas yang dirilis lewat roket menjadi token. Makin rajin kamu mengetik, makin bertenaga timnya.

## Cara pakai

1. Unduh `Agen-Mini.exe` dari halaman [Releases](../../../releases) repo ini, simpan di folder tetap (misalnya Documents), lalu klik dua kali. Tidak perlu instal.
2. Kalau muncul **"Windows protected your PC"**, klik **More info** lalu **Run anyway**.
3. Kantor muncul di bagian bawah layar, tepat di atas taskbar. Ikon robot juga ada di system tray.

## Cara main

- **Papan kecil** di kiri kantor menunjukkan kantor, misi, daya, dan token. Klik untuk membuka panel.
- **Daya tim** naik saat kamu mengetik atau mengklik di aplikasi mana pun. Daya penuh membuat tim bekerja dua kali lebih cepat.
- **Klik agen** untuk menyemangatinya: kerjanya 60% lebih cepat selama 15 detik.
- **Rekrut agen**: mulai dengan Agen Kode, lalu rekrut Riset, Desain, dan Uji. Setiap meja tambahan membuat tiap tugas lebih berharga.
- **Naik level** agen, **GPU** (semua agen lebih cepat), dan **Memori** (token lebih banyak per tugas).
- **Misi**: 10 tugas = 1 misi dengan bonus token.
- **Sewa kantor baru**: Garasi, Kafe Coworking, Kantor Startup, Gedung Tinggi, Pusat Data, lalu Stasiun Luar Angkasa. Kantor baru memberi bayaran lebih besar.
- Saat aplikasi ditutup, tim tetap bekerja dengan setengah kecepatan, maksimal 8 jam.

Area layar di luar kantor, papan, dan panel tetap bisa diklik seperti biasa.

## Tombol pintas

| Tombol | Fungsi |
| --- | --- |
| Ctrl+Alt+P | Buka panel |
| Ctrl+Alt+H | Sembunyikan / tampilkan |
| Ctrl+Alt+Q | Keluar |

## Menu tray (klik kanan ikon robot)

Buka panel, sembunyikan, posisi kantor (kiri/tengah/kanan), hitung klik mouse, sembunyi saat share screen, pomodoro 25/5 (tim ikut istirahat), jalan saat Windows menyala, mulai ulang progres, dan keluar.

## Update otomatis

Game mengecek versi baru di GitHub Releases saat dibuka dan setiap 3 jam, mengunduhnya di latar belakang, lalu memasangnya saat game ditutup. Bisa juga dipasang langsung lewat tombol **Pasang dan buka ulang** di panel atau menu tray. File `.exe` lama ditimpa di tempat yang sama dan progres tetap tersimpan.

## Privasi

Aplikasi hanya **menghitung jumlah** ketukan dan klik. Tombol apa yang ditekan tidak pernah disimpan, dicatat, atau dikirim ke mana pun. Satu-satunya akses internet adalah mengecek dan mengunduh versi baru dari GitHub. Progres tersimpan di `%APPDATA%\Agen Mini\simpanan.json`.

## Untuk developer

Butuh Node.js 20 atau lebih baru.

```bash
cd agen-mini
npm install
npm start          # jalankan langsung
npm test           # tes logika game
npm run dist       # buat .exe Windows di folder dist/
```

| File | Isi |
| --- | --- |
| `src/main.js` | Jendela transparan, hitung ketukan global, tray, tombol pintas |
| `src/preload.js` | Jembatan aman antara proses utama dan tampilan |
| `src/pembaruan.js` | Update otomatis dari GitHub Releases |
| `src/kantor.js` | Logika game: agen, kartu tugas, misi, kantor, harga upgrade |
| `src/sprite.js` | Gambar pixel art: robot, meja, kartu, roket, lantai |
| `src/renderer.js` | HUD, panel, klik, dan animasi |
| `src/style.css` | Tampilan papan tugas |

Angka keseimbangan (harga, kecepatan, nilai tugas) ada di bagian atas `src/kantor.js`.

Font: VT323 (SIL Open Font License, lihat `src/font/OFL-VT323.txt`).
