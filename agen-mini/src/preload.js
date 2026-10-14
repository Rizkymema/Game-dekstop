'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// Jembatan aman: tampilan hanya menerima jumlah aksi, tidak pernah tombolnya.
contextBridge.exposeInMainWorld('desk', {
  onAksi: (cb) => ipcRenderer.on('aksi', (_e, n) => cb(n)),
  onPengaturan: (cb) => ipcRenderer.on('pengaturan', (_e, s) => cb(s)),
  onSimpanSekarang: (cb) => ipcRenderer.on('simpan-sekarang', () => cb()),
  onReset: (cb) => ipcRenderer.on('reset', () => cb()),
  onBukaPanel: (cb) => ipcRenderer.on('buka-panel', () => cb()),
  muat: () => ipcRenderer.invoke('muat'),
  pengaturan: () => ipcRenderer.invoke('pengaturan'),
  simpan: (data) => ipcRenderer.send('simpan', data),
  siapKeluar: () => ipcRenderer.send('siap-keluar'),
  setTembusKlik: (aktif) => ipcRenderer.send('tembus-klik', aktif),
  sembunyikan: () => ipcRenderer.send('sembunyikan'),
});
