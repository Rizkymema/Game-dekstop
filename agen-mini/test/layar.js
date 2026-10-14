// Alat uji: buka Agen Mini di jendela biasa dengan data contoh lalu simpan tangkapan layar.
// Jalankan: xvfb-run npx electron test/layar.js <awal|penuh|panel|istirahat> <file.png> [warnaLatar] --no-sandbox
'use strict';
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('force-device-scale-factor', '1');

const skenario = process.argv[2] || 'awal';
const keluaran = process.argv[3] || 'layar.png';
const latar = process.argv[4] || '#e9ecf1';
const sekarang = Date.now();

const contoh = skenario === 'awal' ? null : {
  versi: 1,
  token: 18450,
  kantor: 2,
  kantorTerbuka: 2,
  misi: 41,
  tugasSelesai: 6,
  agen: { riset: { rekrut: true, lv: 9 }, desain: { rekrut: true, lv: 8 }, kode: { rekrut: true, lv: 11 }, uji: { rekrut: skenario !== 'panel', lv: 4 } },
  gpu: 3,
  memori: 2,
  statistik: { tugasTotal: 420, misiTotal: 41, aksiTotal: 30000, hariIni: { tanggal: new Date().toISOString().slice(0, 10), aksi: 4210 } },
  rataToken: 0,
  terakhir: sekarang,
};

ipcMain.handle('muat', () => contoh);
ipcMain.handle('pengaturan', () => ({ posisi: 'kanan', hitungKlik: true, antiShare: true, pomodoro: skenario !== 'awal' }));
ipcMain.handle('info-awal', () => ({
  versi: require('../package.json').version,
  diperbarui: null,
  pembaruan: skenario === 'panel' ? { jenis: 'siap', versi: '9.9.9' } : null,
}));
for (const k of ['simpan', 'tembus-klik', 'sembunyikan', 'siap-keluar', 'pasang-update', 'cek-update']) ipcMain.on(k, () => {});

const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1100,
    height: skenario === 'panel' ? 720 : 300,
    backgroundColor: latar,
    frame: false,
    webPreferences: { preload: path.join(__dirname, '..', 'src', 'preload.js'), contextIsolation: true, sandbox: true },
  });
  win.webContents.on('console-message', (e) => console.log('[renderer]', e.message || ''));
  await win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  const js = (kode) => win.webContents.executeJavaScript(kode);
  await tunggu(200);
  if (skenario === 'istirahat') {
    await js("(() => { const d = __agen.d; d.istirahat = true; })()");
  }
  // simulasikan ketikan selama beberapa detik supaya kartu mengalir
  const lama = skenario === 'awal' ? 7000 : 9000;
  for (let t = 0; t < lama; t += 250) {
    win.webContents.send('aksi', 1);
    await tunggu(250);
  }
  if (skenario === 'panel') {
    await js('__agen.bukaPanel()');
    await tunggu(400);
  }
  const gambar = await win.webContents.capturePage();
  fs.writeFileSync(keluaran, gambar.toPNG());
  console.log('tersimpan', keluaran, gambar.getSize());
  app.quit();
});
