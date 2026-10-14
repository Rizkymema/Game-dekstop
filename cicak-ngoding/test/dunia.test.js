'use strict';
const assert = require('assert');
const D = require('../src/dunia.js');

let lulus = 0;
function tes(nama, fn) {
  fn();
  lulus++;
  console.log('ok -', nama);
}

const LEBAR = 1366;
const TINGGI = 728;
const dasar = { aktif: false, diamDetik: 5, kopi: 0, jumlahAnak: 0, nyamukAktif: false, hover: false, panjat: true, istirahat: false };

function dalamLayar(d, c) {
  const k = D.kotak(d, c);
  return k.x0 >= -1 && k.y0 >= -1 && k.x1 <= d.lebar + 1 && k.y1 <= d.tinggi + 1;
}

tes('cicak selalu di dalam layar selama 30 menit simulasi dan sempat memanjat', () => {
  const d = D.buat(LEBAR, TINGGI);
  const dikunjungi = new Set();
  for (let i = 0; i < 30 * 60 * 30; i++) {
    D.perbarui(d, 1 / 30, { ...dasar, aktif: i % 600 < 300, jumlahAnak: 3 });
    dikunjungi.add(d.cicak.permukaan);
    assert.ok(dalamLayar(d, d.cicak), `keluar layar di ${d.cicak.permukaan} pos ${d.cicak.pos}`);
    for (const a of d.anak) {
      assert.strictEqual(a.permukaan, 'lantai');
      assert.ok(dalamLayar(d, a));
    }
  }
  console.log('   permukaan yang dikunjungi:', [...dikunjungi].join(', '));
  assert.ok(dikunjungi.has('lantai'));
  assert.ok(dikunjungi.has('kanan') || dikunjungi.has('kiri'));
  assert.strictEqual(d.anak.length, 3);
});

tes('kalau memanjat dimatikan, cicak tetap di lantai', () => {
  const d = D.buat(LEBAR, TINGGI);
  for (let i = 0; i < 20 * 60 * 30; i++) {
    D.perbarui(d, 1 / 30, { ...dasar, panjat: false });
    assert.strictEqual(d.cicak.permukaan, 'lantai');
  }
});

tes('tidur setelah 3 menit tanpa aktivitas, bangun saat mengetik', () => {
  const d = D.buat(LEBAR, TINGGI);
  D.perbarui(d, 1 / 30, { ...dasar, diamDetik: 200 });
  assert.strictEqual(d.cicak.keadaan, 'tidur');
  const pos = d.cicak.pos;
  for (let i = 0; i < 90; i++) D.perbarui(d, 1 / 30, { ...dasar, diamDetik: 200 });
  assert.strictEqual(d.cicak.pos, pos, 'tidak bergerak saat tidur');
  assert.ok(d.partikel.some((q) => q.teks === 'z'));
  D.perbarui(d, 1 / 30, { ...dasar, aktif: true, diamDetik: 0 });
  assert.notStrictEqual(d.cicak.keadaan, 'tidur');
});

tes('diseret lalu dilepas di tengah layar: jatuh ke lantai', () => {
  const d = D.buat(LEBAR, TINGGI);
  D.angkat(d, 600, 300);
  D.geser(d, 640, 280);
  D.lepas(d, { panjat: true });
  assert.strictEqual(d.cicak.keadaan, 'jatuh');
  let mendarat = false;
  for (let i = 0; i < 120 && !mendarat; i++) {
    mendarat = D.perbarui(d, 1 / 30, dasar).some((k) => k.jenis === 'mendarat');
  }
  assert.ok(mendarat);
  assert.strictEqual(d.cicak.permukaan, 'lantai');
  assert.ok(Math.abs(d.cicak.pos - 640) < 1);
});

tes('dilepas dekat tepi kiri: menempel di dinding kiri', () => {
  const d = D.buat(LEBAR, TINGGI);
  D.angkat(d, 40, 300);
  D.lepas(d, { panjat: true });
  assert.strictEqual(d.cicak.permukaan, 'kiri');
  assert.ok(dalamLayar(d, d.cicak));
});

tes('kursor di atas cicak membuatnya berhenti', () => {
  const d = D.buat(LEBAR, TINGGI);
  d.cicak.keadaan = 'jalan';
  d.cicak.timer = 50;
  const pos = d.cicak.pos;
  for (let i = 0; i < 30; i++) D.perbarui(d, 1 / 30, { ...dasar, hover: true });
  assert.strictEqual(d.cicak.pos, pos);
});

tes('hit test mengenai badan cicak dan tidak mengenai area jauh', () => {
  const d = D.buat(LEBAR, TINGGI);
  const p = D.posisi(d, d.cicak);
  assert.ok(D.kena(d, p.x, p.y));
  assert.ok(!D.kena(d, p.x, p.y - 200));
});

tes('cicak mengejar dan akhirnya menangkap nyamuk sendiri', () => {
  let tertangkap = false;
  for (let percobaan = 0; percobaan < 5 && !tertangkap; percobaan++) {
    const d = D.buat(LEBAR, TINGGI);
    for (let i = 0; i < 10 * 60 * 30 && !tertangkap; i++) {
      tertangkap = D.perbarui(d, 1 / 30, { ...dasar, nyamukAktif: true }).some((k) => k.jenis === 'tangkap');
    }
  }
  assert.ok(tertangkap);
});

tes('ukuran layar mengecil: cicak tetap di dalam', () => {
  const d = D.buat(1920, 1040);
  d.cicak.pos = 1800;
  D.ubahUkuran(d, 1280, 680);
  assert.ok(dalamLayar(d, d.cicak));
});

console.log(`\n${lulus} tes perilaku lulus`);
