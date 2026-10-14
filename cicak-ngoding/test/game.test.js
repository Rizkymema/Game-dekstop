'use strict';
const assert = require('assert');
const G = require('../src/game.js');

let lulus = 0;
function tes(nama, fn) {
  fn();
  lulus++;
  console.log('ok -', nama);
}

const T0 = Date.UTC(2026, 9, 14, 3, 0, 0);

tes('game baru mulai dari Landing page', () => {
  const s = G.baru(T0);
  assert.strictEqual(s.slot.length, 1);
  assert.strictEqual(s.slot[0].nama, 'Landing page');
  assert.strictEqual(s.slot[0].target, 500);
  assert.strictEqual(G.bkPerAksi(s), 1);
  assert.strictEqual(G.bkPerDetik(s), 0);
});

tes('500 aksi menyelesaikan Landing page dan memberi 10 koin', () => {
  const s = G.baru(T0);
  const selesai = G.aksi(s, 500, T0);
  assert.strictEqual(selesai.length, 1);
  assert.strictEqual(s.koin, 10);
  assert.strictEqual(s.slot[0].nama, 'Bot chat');
  assert.strictEqual(s.slot[0].progres, 0);
  assert.strictEqual(s.hariIni.aksi, 500);
});

tes('kelebihan BK terbawa ke proyek berikutnya', () => {
  const s = G.baru(T0);
  G.aksi(s, 3600, T0); // 500 + 3000 + 100
  assert.strictEqual(s.koin, 80);
  assert.strictEqual(s.slot[0].nama, 'Aplikasi kasir');
  assert.strictEqual(s.slot[0].progres, 100);
});

tes('harga upgrade naik 15% tiap beli dan koin berkurang', () => {
  const s = G.baru(T0);
  s.koin = 1000;
  assert.strictEqual(G.harga(s, 'kopi'), 25);
  assert.ok(G.beli(s, 'kopi'));
  assert.strictEqual(s.koin, 975);
  assert.strictEqual(G.harga(s, 'kopi'), Math.ceil(25 * 1.15));
  assert.ok(Math.abs(G.bkPerAksi(s) - 1.1) < 1e-9);
});

tes('tidak bisa beli kalau koin kurang', () => {
  const s = G.baru(T0);
  s.koin = 10;
  assert.strictEqual(G.beli(s, 'keyboard'), false);
  assert.strictEqual(s.level.keyboard, 0);
  assert.strictEqual(s.koin, 10);
});

tes('monitor kedua membuka slot proyek kedua dan maksimal sekali', () => {
  const s = G.baru(T0);
  s.koin = 5000;
  assert.ok(G.beli(s, 'monitor'));
  assert.strictEqual(s.slot.length, 2);
  assert.strictEqual(G.beli(s, 'monitor'), false);
  assert.strictEqual(s.slot[1].nama, 'Bot chat');
});

tes('Anak Cicak menulis BK per detik', () => {
  const s = G.baru(T0);
  s.koin = 1000;
  G.beli(s, 'anak');
  G.detik(s, 10);
  assert.strictEqual(s.slot[0].progres, 10);
});

tes('progres offline dibatasi 8 jam dan hanya dari Anak Cicak', () => {
  const s = G.baru(T0);
  const tanpaAnak = G.offline(s, T0 + 3600 * 1000);
  assert.strictEqual(tanpaAnak.bk, 0);
  s.level.anak = 2;
  s.terakhir = T0;
  const hasil = G.offline(s, T0 + 24 * 3600 * 1000);
  assert.strictEqual(hasil.detik, 8 * 3600);
  assert.strictEqual(hasil.bk, 2 * 8 * 3600);
});

tes('nyamuk muncul sesuai jadwal dan bonus masuk ke koin', () => {
  const s = G.baru(T0);
  assert.strictEqual(G.cekNyamuk(s, T0), false);
  assert.strictEqual(G.cekNyamuk(s, T0 + 4 * 60 * 1000), true);
  const bonus = G.tangkapNyamuk(s, T0 + 4 * 60 * 1000);
  assert.ok(bonus >= 3);
  assert.strictEqual(s.koin, bonus);
  assert.strictEqual(s.nyamuk.aktif, false);
  const jeda = s.nyamuk.munculPada - (T0 + 4 * 60 * 1000);
  assert.ok(jeda >= 12 * 60 * 1000 && jeda <= 18 * 60 * 1000);
});

tes('bonus nyamuk setara 5 menit ketikan (750 aksi)', () => {
  const s = G.baru(T0);
  // Landing page: 10 koin / 500 BK -> 750 BK = 15 koin
  assert.strictEqual(G.bonusNyamuk(s), 15);
});

tes('penghitung harian berganti saat tanggal berganti', () => {
  const s = G.baru(T0);
  G.aksi(s, 50, T0);
  G.aksi(s, 20, T0 + 30 * 3600 * 1000);
  assert.strictEqual(s.hariIni.aksi, 20);
  assert.strictEqual(s.aksiTotal, 70);
});

tes('pulihkan data simpanan dan tahan data rusak', () => {
  const s = G.baru(T0);
  s.koin = 1234;
  s.level.keyboard = 3;
  G.aksi(s, 100, T0);
  const salinan = G.pulihkan(JSON.parse(JSON.stringify(s)), T0);
  assert.deepStrictEqual(salinan.level, s.level);
  assert.strictEqual(salinan.koin, s.koin);
  assert.strictEqual(salinan.slot[0].progres, s.slot[0].progres);
  const rusak = G.pulihkan({ koin: -5, level: { kopi: 'x' }, slot: 'bukan' }, T0);
  assert.strictEqual(rusak.koin, 0);
  assert.strictEqual(rusak.level.kopi, 0);
  assert.strictEqual(rusak.slot[0].nama, 'Landing page');
  assert.strictEqual(G.pulihkan(null, T0).koin, 0);
});

tes('proyek setelah Toko online terus bertambah besar', () => {
  const a = G.proyekKe(4);
  const b = G.proyekKe(5);
  assert.ok(a.target > 80000 && b.target > a.target);
  assert.ok(b.bayaran > a.bayaran);
  assert.ok(G.proyekKe(4 + 8).nama.endsWith('v2'));
});

tes('format angka gaya Indonesia', () => {
  assert.strictEqual(G.format(999), '999');
  assert.strictEqual(G.format(1234), '1.234');
  assert.strictEqual(G.format(12345), '12,3 rb');
  assert.strictEqual(G.format(2500000), '2,5 jt');
});

tes('simulasi sehari kerja: 15.000 aksi dengan belanja otomatis', () => {
  const s = G.baru(T0);
  for (let i = 0; i < 150; i++) {
    G.aksi(s, 100, T0 + i * 60000);
    for (const id of ['keyboard', 'kopi', 'anak', 'monitor']) while (G.beli(s, id));
  }
  console.log('   ringkasan:', JSON.stringify({ koin: Math.floor(s.koin), level: s.level, proyekSelesai: s.selesai, proyek: s.slot.map((p) => p.nama) }));
  assert.ok(s.selesai >= 3);
});

console.log(`\n${lulus} tes lulus`);
