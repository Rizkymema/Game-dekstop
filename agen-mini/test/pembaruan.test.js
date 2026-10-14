'use strict';
const assert = require('assert');
const { pilihRilis, bandingVersi, skripPemasang } = require('../src/pembaruan.js');

let lulus = 0;
function tes(nama, fn) {
  fn();
  lulus++;
  console.log('ok -', nama);
}

function rilis(tag, opsi = {}) {
  return {
    tag_name: tag,
    draft: !!opsi.draft,
    prerelease: !!opsi.prerelease,
    assets: opsi.tanpaExe
      ? [{ name: 'catatan.txt', size: 10, state: 'uploaded' }]
      : [{
        name: opsi.nama || 'Game.exe',
        size: opsi.ukuran || 1000,
        state: opsi.state || 'uploaded',
        digest: 'sha256:ABCDEF',
        browser_download_url: `https://github.com/x/y/releases/download/${tag}/Game.exe`,
      }],
  };
}

tes('bandingVersi mengurutkan versi dengan benar', () => {
  assert.strictEqual(bandingVersi('1.10.0', '1.9.9'), 1);
  assert.strictEqual(bandingVersi('1.2', '1.2.0'), 0);
  assert.strictEqual(bandingVersi('2.0.0', '10.0.0'), -1);
});

tes('memilih rilis terbaru milik game ini saja', () => {
  const daftar = [
    rilis('cicak-ngoding-v9.0.0'),
    rilis('agen-mini-v1.2.0'),
    rilis('agen-mini-v1.10.0'),
    rilis('agen-mini-v1.3.0'),
    rilis('agen-mini-mini-v5.0.0'),
  ];
  const r = pilihRilis(daftar, 'agen-mini', '1.1.0');
  assert.strictEqual(r.versi, '1.10.0');
  assert.strictEqual(r.sha256, 'abcdef');
  assert.ok(r.url.includes('agen-mini-v1.10.0'));
});

tes('tidak ada update kalau versi sama atau lebih lama', () => {
  const daftar = [rilis('agen-mini-v1.1.0'), rilis('agen-mini-v1.0.0')];
  assert.strictEqual(pilihRilis(daftar, 'agen-mini', '1.1.0'), null);
});

tes('mengabaikan draft, prerelease, rilis tanpa .exe, dan unggahan belum selesai', () => {
  const daftar = [
    rilis('agen-mini-v2.0.0', { draft: true }),
    rilis('agen-mini-v1.9.0', { prerelease: true }),
    rilis('agen-mini-v1.8.0', { tanpaExe: true }),
    rilis('agen-mini-v1.7.0', { state: 'starter' }),
    rilis('agen-mini-vlatest'),
    rilis('agen-mini-v1.2.0'),
  ];
  assert.strictEqual(pilihRilis(daftar, 'agen-mini', '1.1.0').versi, '1.2.0');
  assert.strictEqual(pilihRilis(null, 'agen-mini', '1.1.0'), null);
});

tes('skrip pemasang menimpa file lama, mengulang sampai bisa, lalu membuka game', () => {
  const s = skripPemasang('C:\\Temp\\agen 100%\\baru.exe', 'C:\\Users\\Budi & Ani\\Agen-Mini.exe', true);
  assert.ok(s.includes('set "BARU=C:\\Temp\\agen 100%%\\baru.exe"'), 'tanda persen di-escape');
  assert.ok(s.includes('set "TUJUAN=C:\\Users\\Budi & Ani\\Agen-Mini.exe"'));
  assert.ok(s.includes('move /y "%BARU%" "%TUJUAN%"'));
  assert.ok(s.includes('for /l %%i in (1,1,120)'));
  assert.ok(s.includes('start "" "%TUJUAN%"'));
  assert.ok(s.includes('\r\n'), 'baris Windows');
  assert.ok(!skripPemasang('a', 'b', false).includes('start ""'));
});

console.log(`\n${lulus} tes pembaruan lulus`);
