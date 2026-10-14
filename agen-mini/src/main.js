'use strict';
const {
  app, BrowserWindow, screen, ipcMain, globalShortcut, Tray, Menu, nativeImage, dialog, net,
} = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { buatPembaruan } = require('./pembaruan');
const paket = require('../package.json');

// Hook keyboard & mouse global. Hanya MENGHITUNG aksi: tombol mana yang ditekan
// tidak pernah disimpan, dicatat, atau dikirim ke mana pun.
let uIOhook = null;
try {
  ({ uIOhook } = require('uiohook-napi'));
} catch (err) {
  console.error('Hook keyboard gagal dimuat:', err);
}

const kunciTunggal = app.requestSingleInstanceLock();
if (!kunciTunggal) {
  app.quit();
}

app.setAppUserModelId('id.agenmini.app');

const ASET = path.join(__dirname, '..', 'assets');

// Versi portable (.exe tunggal) berjalan dari folder sementara; untuk "jalan saat Windows
// menyala" yang didaftarkan harus file .exe aslinya.
const exeAsli = () => process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;

const fileSimpanan = () => path.join(app.getPath('userData'), 'simpanan.json');
const filePengaturan = () => path.join(app.getPath('userData'), 'pengaturan.json');

let win = null;
let tray = null;
let siapKeluar = false;
let pembaruan = null;
let infoPembaruan = null; // { jenis: 'siap', versi } saat versi baru sudah diunduh
let versiSebelum = null;
let settings = { posisi: 'kanan', hitungKlik: true, antiShare: true, pomodoro: false };

let aksiTertunda = 0;
let terakhirKetik = 0;
const sedangDitekan = new Set(); // hanya untuk mengabaikan tombol yang ditahan (auto-repeat)

function bacaJSON(file, cadangan) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return cadangan;
  }
}

function tulisJSON(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const sementara = `${file}.tmp`;
    fs.writeFileSync(sementara, JSON.stringify(data));
    fs.renameSync(sementara, file);
  } catch (err) {
    console.error('Gagal menyimpan', file, err);
  }
}

function kirim(saluran, data) {
  if (win && !win.isDestroyed()) win.webContents.send(saluran, data);
}

function simpanPengaturan() {
  tulisJSON(filePengaturan(), settings);
  kirim('pengaturan', settings);
  perbaruiMenu();
}

// Jendela transparan seluas layar (tanpa taskbar). Kantor agen digambar di bagian bawahnya;
// semua area kosong meneruskan klik ke aplikasi di belakangnya.
function aturUkuran() {
  if (!win || win.isDestroyed()) return;
  const { workArea } = screen.getPrimaryDisplay();
  win.setBounds(workArea);
}

function buatJendela() {
  const { workArea } = screen.getPrimaryDisplay();
  win = new BrowserWindow({
    ...workArea,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false, // klik di agen tidak mencuri fokus dari aplikasi yang sedang dipakai
    show: false,
    icon: path.join(ASET, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });
  win.setContentProtection(settings.antiShare);
  win.loadFile(path.join(__dirname, 'index.html'));
  win.once('ready-to-show', () => {
    win.showInactive();
    perbaruiMenu();
  });
  win.on('closed', () => {
    win = null;
  });
}

function toggleTampil() {
  if (!win) return;
  if (win.isVisible()) win.hide();
  else {
    aturUkuran();
    win.showInactive();
  }
  perbaruiMenu();
}

function bukaPanel() {
  if (!win) return;
  if (!win.isVisible()) {
    aturUkuran();
    win.showInactive();
    perbaruiMenu();
  }
  kirim('buka-panel');
}

async function konfirmasiReset() {
  const { response } = await dialog.showMessageBox({
    type: 'warning',
    title: 'Agen Mini',
    message: 'Mulai ulang semua progres?',
    detail: 'Token, agen, upgrade, dan kantor akan kembali ke awal. Ini tidak bisa dibatalkan.',
    buttons: ['Batal', 'Mulai ulang'],
    defaultId: 0,
    cancelId: 0,
  });
  if (response === 1) kirim('reset');
}

// ---------- Update otomatis dari GitHub ----------
function kabariPembaruan(info) {
  if (info.jenis === 'siap') {
    const baru = !infoPembaruan || infoPembaruan.versi !== info.versi;
    infoPembaruan = info;
    perbaruiMenu();
    if (baru && tray) {
      tray.displayBalloon({
        title: paket.productName,
        content: `Versi ${info.versi} siap. Klik untuk memasang sekarang, atau biarkan terpasang otomatis saat game ditutup.`,
      });
    }
  }
  kirim('pembaruan', info);
}

function pasangUpdate() {
  if (!pembaruan || !infoPembaruan) return;
  const hasil = pembaruan.pasangSekarang();
  if (!hasil.ok) {
    kirim('pembaruan', { jenis: 'gagal', pesan: hasil.alasan });
    return;
  }
  app.quit(); // pemasang dijalankan di 'will-quit', lalu game dibuka lagi
}

function centang(label, kunci, setelah) {
  return {
    label,
    type: 'checkbox',
    checked: !!settings[kunci],
    click: (m) => {
      settings[kunci] = m.checked;
      if (setelah) setelah(m.checked);
      simpanPengaturan();
    },
  };
}

function perbaruiMenu() {
  if (!tray) return;
  const nyalaSaatLogin = app.getLoginItemSettings({ path: exeAsli() }).openAtLogin;
  const terlihat = win && win.isVisible();
  tray.setContextMenu(
    Menu.buildFromTemplate([
      ...(infoPembaruan
        ? [{ label: `Pasang versi ${infoPembaruan.versi} sekarang`, click: pasangUpdate }, { type: 'separator' }]
        : []),
      { label: 'Buka panel  (Ctrl+Alt+P)', click: bukaPanel },
      { label: terlihat ? 'Sembunyikan  (Ctrl+Alt+H)' : 'Tampilkan  (Ctrl+Alt+H)', click: toggleTampil },
      { type: 'separator' },
      {
        label: 'Posisi kantor',
        submenu: [['kiri', 'Kiri'], ['tengah', 'Tengah'], ['kanan', 'Kanan']].map(([id, label]) => ({
          label,
          type: 'radio',
          checked: settings.posisi === id,
          click: () => {
            settings.posisi = id;
            simpanPengaturan();
          },
        })),
      },
      centang('Hitung klik mouse', 'hitungKlik'),
      centang('Sembunyi saat share screen', 'antiShare', (v) => win && win.setContentProtection(v)),
      centang('Pomodoro 25/5', 'pomodoro'),
      {
        label: 'Jalan saat Windows menyala',
        type: 'checkbox',
        checked: nyalaSaatLogin,
        click: (m) => {
          app.setLoginItemSettings({ openAtLogin: m.checked, path: exeAsli() });
          perbaruiMenu();
        },
      },
      { type: 'separator' },
      { label: `Versi ${app.getVersion()}`, enabled: false },
      { label: 'Cek update sekarang', click: () => pembaruan && pembaruan.cek(true) },
      { type: 'separator' },
      { label: 'Mulai ulang progres…', click: konfirmasiReset },
      { label: 'Keluar  (Ctrl+Alt+Q)', click: () => app.quit() },
    ]),
  );
}

function buatTray() {
  tray = new Tray(nativeImage.createFromPath(path.join(ASET, 'tray.png')));
  tray.setToolTip('Agen Mini');
  tray.on('click', bukaPanel);
  tray.on('balloon-click', pasangUpdate);
  perbaruiMenu();
}

function mulaiHook() {
  if (!uIOhook) return;
  uIOhook.on('keydown', (e) => {
    terakhirKetik = Date.now();
    if (sedangDitekan.has(e.keycode)) return; // tombol ditahan: tidak dihitung berulang
    sedangDitekan.add(e.keycode);
    aksiTertunda++;
  });
  uIOhook.on('keyup', (e) => {
    sedangDitekan.delete(e.keycode);
  });
  uIOhook.on('mousedown', () => {
    if (settings.hitungKlik) aksiTertunda++;
  });
  try {
    uIOhook.start();
  } catch (err) {
    console.error('Hook keyboard gagal dijalankan:', err);
  }
}

// Kirim jumlah aksi ke tampilan dua kali per detik.
setInterval(() => {
  if (Date.now() - terakhirKetik > 3000) sedangDitekan.clear();
  if (aksiTertunda > 0 && win && !win.isDestroyed()) {
    kirim('aksi', aksiTertunda);
    aksiTertunda = 0;
  }
}, 500);

// Windows kadang menurunkan jendela "selalu di atas"; tegaskan lagi berkala.
setInterval(() => {
  if (win && !win.isDestroyed() && win.isVisible()) win.setAlwaysOnTop(true, 'screen-saver');
}, 30000);

ipcMain.handle('muat', () => bacaJSON(fileSimpanan(), null));
ipcMain.handle('pengaturan', () => settings);
ipcMain.handle('info-awal', () => ({
  versi: app.getVersion(),
  diperbarui: versiSebelum && versiSebelum !== app.getVersion() ? app.getVersion() : null,
  pembaruan: infoPembaruan,
}));
ipcMain.on('pasang-update', pasangUpdate);
ipcMain.on('cek-update', () => pembaruan && pembaruan.cek(true));
ipcMain.on('simpan', (_e, data) => tulisJSON(fileSimpanan(), data));
ipcMain.on('tembus-klik', (_e, aktif) => {
  if (win && !win.isDestroyed()) win.setIgnoreMouseEvents(!!aktif, { forward: true });
});
ipcMain.on('sembunyikan', () => {
  if (win && win.isVisible()) toggleTampil();
});
ipcMain.on('siap-keluar', () => {
  siapKeluar = true;
  app.quit();
});

app.on('second-instance', bukaPanel);

app.on('before-quit', (e) => {
  if (siapKeluar || !win || win.isDestroyed()) return;
  // Minta tampilan menyimpan dulu, lalu keluar (maksimal 1,5 detik menunggu).
  e.preventDefault();
  kirim('simpan-sekarang');
  setTimeout(() => {
    siapKeluar = true;
    app.quit();
  }, 1500);
});

app.on('window-all-closed', () => {
  // Tetap jalan di tray.
});

app.whenReady().then(() => {
  if (!kunciTunggal) return;
  const tersimpan = bacaJSON(filePengaturan(), {});
  versiSebelum = tersimpan.versiTerakhir || null;
  settings = { ...settings, ...tersimpan };
  settings.versiTerakhir = app.getVersion();
  tulisJSON(filePengaturan(), settings);
  buatJendela();
  buatTray();
  mulaiHook();
  pembaruan = buatPembaruan({
    app, net, spawn, repo: paket.pembaruan.repo, awalan: paket.pembaruan.awalan, kabari: kabariPembaruan,
  });
  pembaruan.mulai();
  globalShortcut.register('Control+Alt+H', toggleTampil);
  globalShortcut.register('Control+Alt+P', bukaPanel);
  globalShortcut.register('Control+Alt+Q', () => app.quit());
  screen.on('display-metrics-changed', aturUkuran);
  screen.on('display-added', aturUkuran);
  screen.on('display-removed', aturUkuran);
});

app.on('will-quit', () => {
  if (pembaruan) pembaruan.jalankanPemasang();
  globalShortcut.unregisterAll();
  if (uIOhook) {
    try {
      uIOhook.stop();
    } catch {
      /* sudah berhenti */
    }
  }
});
