'use strict';
// Pembaruan otomatis dari GitHub Releases.
//
// Semua game ada di satu repo, jadi rilis disaring per awalan tag: "<folder>-v<versi>",
// misalnya "agen-mini-v1.1.0". Game mengecek saat dibuka dan tiap 3 jam. Versi baru diunduh
// diam-diam ke folder sementara, diperiksa ukuran dan sidik SHA-256-nya, lalu dipasang saat
// game ditutup (atau langsung, kalau pemain memilih "Pasang sekarang").
//
// Hanya aktif di versi portable (.exe tunggal) hasil build, bukan saat `npm start`.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const JEDA_AWAL = 20 * 1000;
const JEDA_CEK = 3 * 60 * 60 * 1000;

function bandingVersi(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const selisih = (pa[i] || 0) - (pb[i] || 0);
    if (selisih) return Math.sign(selisih);
  }
  return 0;
}

// Pilih rilis terbaru milik game ini yang lebih baru dari versi sekarang. Murni, bisa dites.
function pilihRilis(daftar, awalan, versiSekarang) {
  let terbaik = null;
  for (const r of Array.isArray(daftar) ? daftar : []) {
    if (!r || r.draft || r.prerelease || typeof r.tag_name !== 'string') continue;
    if (!r.tag_name.startsWith(`${awalan}-v`)) continue;
    const versi = r.tag_name.slice(awalan.length + 2);
    if (!/^\d+(\.\d+){0,3}$/.test(versi)) continue;
    if (bandingVersi(versi, versiSekarang) <= 0) continue;
    const aset = (r.assets || []).find(
      (a) => a && /\.exe$/i.test(a.name) && (a.state === undefined || a.state === 'uploaded') && a.size > 0,
    );
    if (!aset) continue;
    if (terbaik && bandingVersi(versi, terbaik.versi) <= 0) continue;
    terbaik = {
      versi,
      nama: aset.name,
      ukuran: aset.size,
      url: aset.browser_download_url,
      sha256: typeof aset.digest === 'string' && aset.digest.startsWith('sha256:') ? aset.digest.slice(7).toLowerCase() : null,
    };
  }
  return terbaik;
}

function sidikFile(file) {
  return new Promise((selesai, gagal) => {
    const h = crypto.createHash('sha256');
    fs.createReadStream(file)
      .on('data', (b) => h.update(b))
      .on('error', gagal)
      .on('end', () => selesai(h.digest('hex')));
  });
}

async function fileCocok(file, rilis) {
  try {
    const st = fs.statSync(file);
    if (st.size !== rilis.ukuran) return false;
    if (rilis.sha256) return (await sidikFile(file)) === rilis.sha256;
    return true;
  } catch {
    return false;
  }
}

async function ambilDaftar(net, repo) {
  const res = await net.fetch(`https://api.github.com/repos/${repo}/releases?per_page=50`, {
    headers: { Accept: 'application/vnd.github+json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`GitHub menjawab ${res.status}`);
  return res.json();
}

// Unduh .exe rilis ke folder sementara. Kalau file yang sama sudah ada dan cocok, pakai itu.
async function unduhRilis(net, rilis, folder, awalan) {
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, `${awalan}-${rilis.versi}.exe`);
  if (await fileCocok(file, rilis)) return file;

  const sementara = `${file}.part`;
  const res = await net.fetch(rilis.url, { cache: 'no-store' });
  if (!res.ok || !res.body) throw new Error(`Unduhan gagal (${res.status})`);
  const tulis = fs.createWriteStream(sementara);
  const h = crypto.createHash('sha256');
  let ukuran = 0;
  const pembaca = res.body.getReader();
  try {
    for (;;) {
      const { done, value } = await pembaca.read();
      if (done) break;
      ukuran += value.length;
      h.update(value);
      if (!tulis.write(value)) await new Promise((r) => tulis.once('drain', r));
    }
  } finally {
    await new Promise((r) => tulis.end(r));
  }
  if (ukuran !== rilis.ukuran) {
    fs.rmSync(sementara, { force: true });
    throw new Error(`Ukuran unduhan tidak cocok (${ukuran} dari ${rilis.ukuran})`);
  }
  if (rilis.sha256 && h.digest('hex') !== rilis.sha256) {
    fs.rmSync(sementara, { force: true });
    throw new Error('Sidik SHA-256 unduhan tidak cocok');
  }
  fs.renameSync(sementara, file);

  // Bersihkan unduhan versi lama
  for (const nama of fs.readdirSync(folder)) {
    const p = path.join(folder, nama);
    if (p !== file && nama !== 'pasang.bat') fs.rmSync(p, { force: true });
  }
  return file;
}

// Isi skrip pemasang (.bat). Menunggu game lama benar-benar tertutup (file .exe-nya tidak lagi
// dikunci), menimpa file lama dengan yang baru, lalu menjalankannya lagi bila diminta.
function skripPemasang(baru, tujuan, jalankanLagi) {
  const aman = (p) => p.replace(/%/g, '%%');
  return [
    '@echo off',
    'chcp 65001 >nul',
    'setlocal',
    `set "BARU=${aman(baru)}"`,
    `set "TUJUAN=${aman(tujuan)}"`,
    'for /l %%i in (1,1,120) do (',
    '  move /y "%BARU%" "%TUJUAN%" >nul 2>&1 && goto selesai',
    '  ping -n 2 127.0.0.1 >nul',
    ')',
    ':selesai',
    jalankanLagi ? 'start "" "%TUJUAN%"' : 'rem tidak dijalankan ulang',
    '(goto) 2>nul & del "%~f0"',
    '',
  ].join('\r\n');
}

function buatPembaruan({ app, net, spawn, repo, awalan, kabari }) {
  const target = process.env.PORTABLE_EXECUTABLE_FILE;
  const aktif = !!(app.isPackaged && target && process.platform === 'win32');
  const folder = path.join(app.getPath('temp'), `${awalan}-pembaruan`);
  const keadaan = { aktif, siap: null, sedangCek: false, galat: null, terakhirCek: 0 };
  let pemasangDijalankan = false;
  let jalankanLagi = false;

  function log(...isi) {
    console.log('[pembaruan]', ...isi);
  }

  async function cek(manual = false) {
    if (!aktif) {
      if (manual) kabari({ jenis: 'tidak-aktif' });
      return;
    }
    if (keadaan.sedangCek) return;
    keadaan.sedangCek = true;
    keadaan.terakhirCek = Date.now();
    try {
      const rilis = pilihRilis(await ambilDaftar(net, repo), awalan, app.getVersion());
      if (!rilis) {
        keadaan.galat = null;
        if (manual) kabari({ jenis: 'terbaru', versi: app.getVersion() });
        return;
      }
      if (keadaan.siap && keadaan.siap.versi === rilis.versi) {
        if (manual) kabari({ jenis: 'siap', versi: rilis.versi });
        return;
      }
      if (manual) kabari({ jenis: 'mengunduh', versi: rilis.versi });
      log('mengunduh versi', rilis.versi);
      const file = await unduhRilis(net, rilis, folder, awalan);
      keadaan.siap = { versi: rilis.versi, file };
      keadaan.galat = null;
      log('siap dipasang', rilis.versi);
      kabari({ jenis: 'siap', versi: rilis.versi });
    } catch (err) {
      keadaan.galat = err.message;
      log('gagal:', err.message);
      if (manual) kabari({ jenis: 'gagal', pesan: err.message });
    } finally {
      keadaan.sedangCek = false;
    }
  }

  // Folder tempat .exe berada harus bisa ditulisi supaya file lama bisa diganti.
  function folderBisaDitulis() {
    try {
      const uji = path.join(path.dirname(target), `.${awalan}-uji-tulis-${process.pid}`);
      fs.writeFileSync(uji, '');
      fs.rmSync(uji, { force: true });
      return true;
    } catch {
      return false;
    }
  }

  // Dipanggil saat game akan keluar. Mengembalikan true kalau pemasang dijalankan.
  function jalankanPemasang() {
    if (!aktif || !keadaan.siap || pemasangDijalankan) return false;
    if (!fs.existsSync(keadaan.siap.file) || !folderBisaDitulis()) return false;
    try {
      const bat = path.join(folder, 'pasang.bat');
      fs.writeFileSync(bat, skripPemasang(keadaan.siap.file, target, jalankanLagi), 'utf8');
      const anak = spawn('cmd.exe', ['/d', '/s', '/c', `""${bat}""`], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        windowsVerbatimArguments: true,
      });
      anak.unref();
      pemasangDijalankan = true;
      log('pemasang dijalankan, mulai ulang:', jalankanLagi);
      return true;
    } catch (err) {
      log('pemasang gagal dijalankan:', err.message);
      return false;
    }
  }

  // Pemain memilih "Pasang sekarang": tandai supaya game dibuka lagi setelah diganti.
  function pasangSekarang() {
    if (!keadaan.siap) return { ok: false, alasan: 'Belum ada versi baru yang siap.' };
    if (!folderBisaDitulis()) {
      return { ok: false, alasan: 'Folder game tidak bisa ditulisi. Pindahkan file .exe ke folder Documents atau Desktop.' };
    }
    jalankanLagi = true;
    return { ok: true };
  }

  function mulai() {
    if (!aktif) return;
    setTimeout(() => cek(false), JEDA_AWAL);
    setInterval(() => cek(false), JEDA_CEK);
  }

  return { keadaan, cek, mulai, pasangSekarang, jalankanPemasang };
}

module.exports = { buatPembaruan, pilihRilis, bandingVersi, skripPemasang, ambilDaftar, unduhRilis };
