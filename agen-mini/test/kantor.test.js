'use strict';
const assert = require('assert');
const K = require('../src/kantor.js');

let lulus = 0;
function tes(nama, fn) {
  fn();
  lulus++;
  console.log('ok -', nama);
}

const T0 = Date.UTC(2026, 9, 14, 3, 0, 0);

function jalankan(s, d, detik, opsi = {}) {
  const kejadian = [];
  const dt = 1 / 30;
  for (let i = 0; i < detik / dt; i++) {
    if (opsi.ketik) K.tambahAksi(s, d, opsi.ketik * dt, T0);
    kejadian.push(...K.langkah(s, d, dt, opsi));
  }
  return kejadian;
}

tes('mulai hanya dengan Agen Kode di Garasi', () => {
  const s = K.baru(T0);
  assert.deepStrictEqual(K.peranAktif(s), ['kode']);
  assert.strictEqual(K.infoKantor(s.kantor).nama, 'Garasi');
  const d = K.buatDunia(s, 860);
  assert.ok(d.meja.kode.x > d.masukX && d.meja.kode.x < d.rilisX);
});

tes('tugas mengalir dari kotak masuk sampai rilis dan menghasilkan token', () => {
  const s = K.baru(T0);
  const d = K.buatDunia(s, 860);
  const k = jalankan(s, d, 60);
  const rilis = k.filter((e) => e.jenis === 'rilis');
  assert.ok(rilis.length >= 2, `rilis ${rilis.length}`);
  assert.ok(s.token > 0);
  assert.strictEqual(s.statistik.tugasTotal, rilis.length);
});

tes('merekrut agen menambah meja dan tugas melewati semua meja', () => {
  const s = K.baru(T0);
  s.token = 2000;
  const d = K.buatDunia(s, 860);
  assert.ok(K.beli(s, d, 'rekrut', 'riset'));
  assert.ok(K.beli(s, d, 'rekrut', 'uji'));
  assert.deepStrictEqual(d.peran, ['riset', 'kode', 'uji']);
  assert.ok(d.meja.riset.x < d.meja.kode.x && d.meja.kode.x < d.meja.uji.x);
  const k = jalankan(s, d, 90);
  const rilis = k.filter((e) => e.jenis === 'rilis');
  assert.ok(rilis.length >= 1);
  // nilai tugas 3 tahap di Garasi = 2 * (1 + 0.6 * 2) = 4,4
  assert.ok(Math.abs(rilis[0].nilai - 4.4) < 1e-9, `nilai ${rilis[0].nilai}`);
});

tes('harga level naik dan level menambah kecepatan', () => {
  const s = K.baru(T0);
  s.token = 100;
  const d = K.buatDunia(s, 860);
  const h1 = K.harga(s, 'level', 'kode');
  const v1 = K.kecepatanKerja(s, 'kode');
  assert.ok(K.beli(s, d, 'level', 'kode'));
  assert.ok(K.harga(s, 'level', 'kode') > h1);
  assert.ok(K.kecepatanKerja(s, 'kode') > v1);
  assert.strictEqual(K.beli(s, d, 'level', 'riset'), false, 'belum direkrut');
});

tes('10 tugas = 1 misi dengan bonus', () => {
  const s = K.baru(T0);
  s.tugasSelesai = 9;
  const d = K.buatDunia(s, 860);
  const k = jalankan(s, d, 40);
  const misi = k.find((e) => e.jenis === 'misi');
  assert.ok(misi);
  assert.strictEqual(s.misi, 1);
  assert.ok(misi.bonus > 0);
});

tes('menyewa kantor baru: bayar token, pindah, harga sewa berikutnya naik', () => {
  const s = K.baru(T0);
  const d = K.buatDunia(s, 860);
  assert.strictEqual(K.beli(s, d, 'sewa'), false);
  s.token = K.harga(s, 'sewa') + 5;
  const hargaPertama = K.harga(s, 'sewa');
  assert.ok(K.beli(s, d, 'sewa'));
  assert.strictEqual(s.token, 5);
  assert.strictEqual(s.kantor, 1);
  assert.strictEqual(s.kantorTerbuka, 1);
  assert.strictEqual(K.infoKantor(s.kantor).nama, 'Kafe Coworking');
  assert.ok(K.harga(s, 'sewa') > hargaPertama * 5);
  assert.ok(K.nilaiTugas(s) > 2);
});

tes('mengetik menaikkan daya dan mempercepat kerja', () => {
  const santai = K.baru(T0);
  const dSantai = K.buatDunia(santai, 860);
  jalankan(santai, dSantai, 300);
  const rajin = K.baru(T0);
  const dRajin = K.buatDunia(rajin, 860);
  jalankan(rajin, dRajin, 300, { ketik: 4 });
  assert.ok(dRajin.daya > 50);
  assert.ok(rajin.token > santai.token * 1.3, `${rajin.token} vs ${santai.token}`);
  assert.ok(rajin.statistik.hariIni.aksi > 1000);
});

tes('istirahat pomodoro menghentikan kerja', () => {
  const s = K.baru(T0);
  const d = K.buatDunia(s, 860);
  jalankan(s, d, 5);
  const sebelum = s.token;
  jalankan(s, d, 60, { istirahat: true });
  assert.strictEqual(s.token, sebelum);
  assert.ok(Object.values(d.agen).every((a) => a.keadaan === 'istirahat'));
});

tes('klik agen menyemangati sekali per 20 detik', () => {
  const s = K.baru(T0);
  const d = K.buatDunia(s, 860);
  assert.ok(K.semangati(d, 'kode'));
  assert.strictEqual(K.semangati(d, 'kode'), false);
  jalankan(s, d, 21);
  assert.ok(K.semangati(d, 'kode'));
});

tes('pindah ke kantor yang sudah terbuka saja', () => {
  const s = K.baru(T0);
  s.kantorTerbuka = 2;
  s.kantor = 2;
  const d = K.buatDunia(s, 860);
  assert.ok(K.pilihKantor(s, d, 0));
  assert.strictEqual(s.kantor, 0);
  assert.strictEqual(K.pilihKantor(s, d, 3), false);
});

tes('progres offline setengah dari rata-rata, maksimal 8 jam', () => {
  const s = K.baru(T0);
  s.rataToken = 2;
  const h = K.offline(s, T0 + 24 * 3600 * 1000);
  assert.strictEqual(h.detik, 8 * 3600);
  assert.strictEqual(h.token, 2 * 0.5 * 8 * 3600);
});

tes('pulihkan simpanan dan tahan data rusak', () => {
  const s = K.baru(T0);
  s.token = 777;
  s.agen.riset.rekrut = true;
  s.agen.kode.lv = 4;
  s.gpu = 2;
  const p = K.pulihkan(JSON.parse(JSON.stringify(s)), T0);
  assert.strictEqual(p.token, 777);
  assert.ok(p.agen.riset.rekrut);
  assert.strictEqual(p.agen.kode.lv, 4);
  assert.strictEqual(p.gpu, 2);
  const r = K.pulihkan({ token: 'x', agen: { kode: { rekrut: false, lv: -3 } }, tugasSelesai: 99 }, T0);
  assert.strictEqual(r.token, 0);
  assert.ok(r.agen.kode.rekrut, 'Agen Kode selalu ada');
  assert.strictEqual(r.agen.kode.lv, 1);
  assert.ok(r.tugasSelesai < K.TUGAS_PER_MISI);
});

tes('lebar arena berubah: semua tetap di dalam arena', () => {
  const s = K.baru(T0);
  s.token = 1000;
  const d = K.buatDunia(s, 900);
  K.beli(s, d, 'rekrut', 'riset');
  jalankan(s, d, 20);
  K.ubahLebar(s, d, 600);
  for (const id of d.peran) assert.ok(d.agen[id].x >= 0 && d.agen[id].x <= 600);
  assert.ok(d.rilisX <= 600);
});

console.log(`\n${lulus} tes lulus`);
