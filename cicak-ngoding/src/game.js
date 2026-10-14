// Logika inti Cicak Ngoding. Murni (tanpa DOM), jadi bisa dites di Node.
(function (root) {
  'use strict';

  const PROYEK_AWAL = [
    { nama: 'Landing page', target: 500, bayaran: 10 },
    { nama: 'Bot chat', target: 3000, bayaran: 70 },
    { nama: 'Aplikasi kasir', target: 15000, bayaran: 400 },
    { nama: 'Toko online', target: 80000, bayaran: 2500 },
  ];

  const PROYEK_LANJUT = [
    'Aplikasi ojek', 'Sistem sekolah', 'Dashboard gudang', 'Game mobile',
    'Marketplace', 'Aplikasi koperasi', 'Sistem klinik', 'Aplikasi wisata',
  ];

  const UPGRADE = {
    kopi: { nama: 'Kopi tubruk', pendek: 'Kopi', dasar: 25, efek: '+10% BK tiap ketukan' },
    keyboard: { nama: 'Keyboard mekanik', pendek: 'Keyboard', dasar: 60, efek: '+1 BK tiap ketukan' },
    anak: { nama: 'Anak Cicak', pendek: 'Anak Cicak', dasar: 150, efek: '+1 BK per detik, juga saat kamu diam' },
    monitor: { nama: 'Monitor kedua', pendek: 'Monitor', dasar: 500, maks: 1, efek: 'Kerjakan 2 proyek sekaligus' },
  };

  const KENAIKAN_HARGA = 1.15;
  const BATAS_OFFLINE_DETIK = 8 * 3600;
  const AKSI_PER_MENIT_ASUMSI = 150; // untuk bonus nyamuk "setara 5 menit ketikan"

  function tanggalLokal(ms) {
    const d = new Date(ms);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function proyekKe(n) {
    if (n < PROYEK_AWAL.length) return { ...PROYEK_AWAL[n], progres: 0 };
    const k = n - PROYEK_AWAL.length + 1;
    const target = Math.round(80000 * Math.pow(1.4, k) / 100) * 100;
    const rasio = Math.min(0.035, 0.031 + 0.0005 * k);
    const nama = PROYEK_LANJUT[(k - 1) % PROYEK_LANJUT.length];
    const versi = Math.floor((k - 1) / PROYEK_LANJUT.length) + 1;
    return {
      nama: versi > 1 ? `${nama} v${versi}` : nama,
      target,
      bayaran: Math.round(target * rasio),
      progres: 0,
    };
  }

  function jedaNyamuk() {
    return (12 + Math.random() * 6) * 60 * 1000; // 12–18 menit, rata-rata 15
  }

  function baru(sekarang = Date.now()) {
    return {
      versi: 1,
      koin: 0,
      bkTotal: 0,
      aksiTotal: 0,
      hariIni: { tanggal: tanggalLokal(sekarang), aksi: 0 },
      level: { kopi: 0, keyboard: 0, anak: 0, monitor: 0 },
      berikutnya: 1,
      slot: [proyekKe(0)],
      nyamuk: { aktif: false, munculPada: sekarang + 3 * 60 * 1000 }, // nyamuk pertama cepat
      selesai: 0,
      terakhir: sekarang,
    };
  }

  function angka(v, cadangan) {
    return typeof v === 'number' && isFinite(v) && v >= 0 ? v : cadangan;
  }

  function pulihkan(data, sekarang = Date.now()) {
    const s = baru(sekarang);
    if (!data || typeof data !== 'object') return s;
    s.koin = angka(data.koin, 0);
    s.bkTotal = angka(data.bkTotal, 0);
    s.aksiTotal = angka(data.aksiTotal, 0);
    if (data.hariIni && typeof data.hariIni.tanggal === 'string') {
      s.hariIni = { tanggal: data.hariIni.tanggal, aksi: angka(data.hariIni.aksi, 0) };
    }
    if (data.level) {
      for (const id of Object.keys(s.level)) s.level[id] = Math.floor(angka(data.level[id], 0));
      s.level.monitor = Math.min(s.level.monitor, UPGRADE.monitor.maks);
    }
    s.berikutnya = Math.floor(angka(data.berikutnya, 1));
    if (Array.isArray(data.slot) && data.slot.length) {
      s.slot = data.slot
        .filter((p) => p && typeof p.nama === 'string' && angka(p.target, 0) > 0)
        .map((p) => ({ nama: p.nama, target: p.target, bayaran: angka(p.bayaran, 0), progres: angka(p.progres, 0) }));
      if (!s.slot.length) s.slot = [proyekKe(0)];
    }
    const slotSeharusnya = s.level.monitor > 0 ? 2 : 1;
    while (s.slot.length < slotSeharusnya) s.slot.push(proyekKe(s.berikutnya++));
    s.slot = s.slot.slice(0, slotSeharusnya);
    if (data.nyamuk) {
      s.nyamuk = { aktif: !!data.nyamuk.aktif, munculPada: angka(data.nyamuk.munculPada, sekarang + jedaNyamuk()) };
    }
    s.selesai = Math.floor(angka(data.selesai, 0));
    s.terakhir = angka(data.terakhir, sekarang);
    return s;
  }

  function pengaliKopi(s) {
    return 1 + 0.1 * s.level.kopi;
  }

  function bkPerAksi(s) {
    return (1 + s.level.keyboard) * pengaliKopi(s);
  }

  function bkPerDetik(s) {
    return s.level.anak * pengaliKopi(s);
  }

  function harga(s, id) {
    const u = UPGRADE[id];
    return Math.ceil(u.dasar * Math.pow(KENAIKAN_HARGA, s.level[id]));
  }

  function bisaBeli(s, id) {
    const u = UPGRADE[id];
    if (u.maks !== undefined && s.level[id] >= u.maks) return false;
    return s.koin >= harga(s, id);
  }

  // Menambahkan BK ke semua proyek aktif. Mengembalikan daftar proyek yang selesai.
  function tambahBK(s, bk) {
    const selesai = [];
    if (!(bk > 0)) return selesai;
    s.bkTotal += bk;
    for (let i = 0; i < s.slot.length; i++) {
      let p = s.slot[i];
      p.progres += bk;
      let pengaman = 0;
      while (p.progres >= p.target && pengaman++ < 10000) {
        const sisa = p.progres - p.target;
        s.koin += p.bayaran;
        s.selesai += 1;
        selesai.push({ nama: p.nama, bayaran: p.bayaran });
        p = proyekKe(s.berikutnya++);
        p.progres = sisa;
        s.slot[i] = p;
      }
    }
    return selesai;
  }

  function cekHari(s, sekarang) {
    const t = tanggalLokal(sekarang);
    if (s.hariIni.tanggal !== t) s.hariIni = { tanggal: t, aksi: 0 };
  }

  function aksi(s, jumlah, sekarang = Date.now()) {
    if (!(jumlah > 0)) return [];
    cekHari(s, sekarang);
    s.aksiTotal += jumlah;
    s.hariIni.aksi += jumlah;
    return tambahBK(s, jumlah * bkPerAksi(s));
  }

  function detik(s, n = 1) {
    return tambahBK(s, bkPerDetik(s) * n);
  }

  function beli(s, id) {
    if (!UPGRADE[id] || !bisaBeli(s, id)) return false;
    s.koin -= harga(s, id);
    s.level[id] += 1;
    if (id === 'monitor' && s.slot.length < 2) s.slot.push(proyekKe(s.berikutnya++));
    return true;
  }

  function cekNyamuk(s, sekarang = Date.now()) {
    if (!s.nyamuk.aktif && sekarang >= s.nyamuk.munculPada) {
      s.nyamuk.aktif = true;
      return true;
    }
    return false;
  }

  function bonusNyamuk(s) {
    const p = s.slot[0];
    const bk = 5 * AKSI_PER_MENIT_ASUMSI * bkPerAksi(s);
    return Math.max(3, Math.ceil(bk * (p.bayaran / p.target)));
  }

  function tangkapNyamuk(s, sekarang = Date.now()) {
    if (!s.nyamuk.aktif) return 0;
    const bonus = bonusNyamuk(s);
    s.koin += bonus;
    s.nyamuk = { aktif: false, munculPada: sekarang + jedaNyamuk() };
    return bonus;
  }

  // Progres saat game tertutup: hanya dari Anak Cicak, maksimal 8 jam.
  function offline(s, sekarang = Date.now()) {
    const detikLewat = Math.min(Math.max(0, (sekarang - s.terakhir) / 1000), BATAS_OFFLINE_DETIK);
    s.terakhir = sekarang;
    if (detikLewat < 60 || bkPerDetik(s) <= 0) return { detik: detikLewat, bk: 0, koin: 0, selesai: [] };
    const koinAwal = s.koin;
    const bk = bkPerDetik(s) * detikLewat;
    const selesai = tambahBK(s, bk);
    return { detik: detikLewat, bk, koin: s.koin - koinAwal, selesai };
  }

  function format(n) {
    n = Math.floor(n);
    const satuan = [
      [1e12, ' T'],
      [1e9, ' M'],
      [1e6, ' jt'],
      [1e4, ' rb'],
    ];
    for (const [batas, akhiran] of satuan) {
      if (n >= batas) {
        const nilai = batas === 1e4 ? n / 1e3 : n / batas;
        return nilai.toLocaleString('id-ID', { maximumFractionDigits: nilai < 100 ? 1 : 0 }) + akhiran;
      }
    }
    return n.toLocaleString('id-ID');
  }

  const Game = {
    UPGRADE, PROYEK_AWAL, BATAS_OFFLINE_DETIK,
    baru, pulihkan, proyekKe, bkPerAksi, bkPerDetik, harga, bisaBeli,
    tambahBK, aksi, detik, beli, cekNyamuk, bonusNyamuk, tangkapNyamuk, offline,
    cekHari, tanggalLokal, format,
  };

  root.Game = Game;
  if (typeof module !== 'undefined' && module.exports) module.exports = Game;
})(typeof window !== 'undefined' ? window : globalThis);
