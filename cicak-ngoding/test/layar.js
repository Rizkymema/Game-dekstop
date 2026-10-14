// Alat uji: buka game di jendela biasa dengan data contoh, atur keadaan, simpan tangkapan layar.
// Jalankan: xvfb-run npx electron test/layar.js <skenario> <file.png> [warnaLatar] --no-sandbox
'use strict';
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('force-device-scale-factor', '1');

const skenario = process.argv[2] || 'lantai';
const keluaran = process.argv[3] || 'layar.png';
const latar = process.argv[4] || '#f3f4f6';
const sekarang = Date.now();

const contoh = {
  versi: 1,
  koin: 2240,
  bkTotal: 52000,
  aksiTotal: 21000,
  hariIni: { tanggal: new Date().toISOString().slice(0, 10), aksi: 5278 },
  level: { kopi: 3, keyboard: 4, anak: 2, monitor: 1 },
  berikutnya: 5,
  slot: [
    { nama: 'Aplikasi ojek', target: 112000, bayaran: 3528, progres: 15300 },
    { nama: 'Toko online', target: 80000, bayaran: 2500, progres: 42800 },
  ],
  nyamuk: { aktif: skenario !== 'panel', munculPada: sekarang - 1000 },
  selesai: 4,
  terakhir: sekarang,
};

ipcMain.handle('muat', () => contoh);
ipcMain.handle('pengaturan', () => ({ panjat: true, hitungKlik: true, antiShare: true, pomodoro: true }));
ipcMain.handle('info-awal', () => ({
  versi: require('../package.json').version,
  diperbarui: null,
  pembaruan: skenario === 'panel' ? { jenis: 'siap', versi: '9.9.9' } : null,
}));
for (const k of ['simpan', 'tembus-klik', 'sembunyikan', 'siap-keluar', 'pasang-update', 'cek-update']) ipcMain.on(k, () => {});

const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1000,
    height: skenario === 'panel' ? 720 : 560,
    backgroundColor: latar,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'src', 'preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.webContents.on('console-message', (e) => console.log('[renderer]', e.message || ''));
  await win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  await tunggu(300);
  const js = (kode) => win.webContents.executeJavaScript(kode);

  if (skenario === 'dinding') {
    await js("(() => { const c = __cicak.d.cicak; c.permukaan = 'kanan'; c.pos = 300; c.arah = -1; c.keadaan = 'jalan'; c.timer = 99; })()");
  }
  if (skenario === 'atap') {
    await js("(() => { const c = __cicak.d.cicak; c.permukaan = 'atap'; c.pos = 500; c.arah = -1; c.keadaan = 'jalan'; c.timer = 99; })()");
  }
  if (skenario === 'seret') {
    await js("(() => { __cicak.D.angkat(__cicak.d, 520, 260); })()");
  }
  // simulasikan ketikan
  for (let i = 0; i < 8; i++) {
    win.webContents.send('aksi', 4);
    await tunggu(120);
  }
  if (skenario === 'panel') {
    await js('__cicak.bukaPanel()');
    await tunggu(400);
  }
  const gambar = await win.webContents.capturePage();
  fs.writeFileSync(keluaran, gambar.toPNG());
  console.log('tersimpan', keluaran, gambar.getSize());
  app.quit();
});
