// Logika Agen Mini: tim agen AI di strip atas taskbar. Kartu tugas berpindah dari meja ke meja
// (Riset -> Desain -> Kode -> Uji), lalu dirilis menjadi token. Tanpa DOM, supaya bisa dites di Node.
// Koordinat dalam piksel CSS di dalam arena (0 = tepi kiri arena).
(function (root) {
  'use strict';

  const PERAN = {
    riset: { nama: 'Agen Riset', tugas: 'Mencari referensi', rekrut: 50, warna: '#5aa9e6' },
    desain: { nama: 'Agen Desain', tugas: 'Merancang tampilan', rekrut: 300, warna: '#ef7fa5' },
    kode: { nama: 'Agen Kode', tugas: 'Menulis kode', rekrut: 0, warna: '#6cc070' },
    uji: { nama: 'Agen Uji', tugas: 'Menguji hasil', rekrut: 1200, warna: '#f2a541' },
  };
  const URUTAN = ['riset', 'desain', 'kode', 'uji'];

  const KANTOR = [
    { nama: 'Garasi', lantai: 'garasi' },
    { nama: 'Kafe Coworking', lantai: 'kafe' },
    { nama: 'Kantor Startup', lantai: 'startup' },
    { nama: 'Gedung Tinggi', lantai: 'gedung' },
    { nama: 'Pusat Data', lantai: 'pusatData' },
    { nama: 'Stasiun Luar Angkasa', lantai: 'luarAngkasa' },
  ];

  const TUGAS_PER_MISI = 10;
  const BATAS_OFFLINE = 8 * 3600;

  const TEMUAN = [
    'Ide brilian!',
    'Bug kecil ketemu dan sudah dibereskan',
    'Klien senang, dapat tip',
    'Menemukan pustaka yang pas',
  ];

  function acak(a, b) {
    return a + Math.random() * (b - a);
  }

  function tanggalLokal(ms) {
    const d = new Date(ms);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  // ---------- Keadaan tersimpan ----------

  function baru(sekarang = Date.now()) {
    const agen = {};
    for (const id of URUTAN) agen[id] = { rekrut: id === 'kode', lv: 1 };
    return {
      versi: 1,
      token: 0,
      kantor: 0,
      kantorTerbuka: 0,
      misi: 0,
      tugasSelesai: 0,
      agen,
      gpu: 0,
      memori: 0,
      statistik: { tugasTotal: 0, misiTotal: 0, aksiTotal: 0, hariIni: { tanggal: tanggalLokal(sekarang), aksi: 0 } },
      rataToken: 0,
      terakhir: sekarang,
    };
  }

  function angka(v, cadangan) {
    return typeof v === 'number' && isFinite(v) && v >= 0 ? v : cadangan;
  }

  function pulihkan(data, sekarang = Date.now()) {
    const s = baru(sekarang);
    if (!data || typeof data !== 'object') return s;
    s.token = angka(data.token, 0);
    s.kantor = Math.floor(angka(data.kantor, 0));
    s.kantorTerbuka = Math.max(s.kantor, Math.floor(angka(data.kantorTerbuka, 0)));
    s.misi = Math.floor(angka(data.misi, 0));
    s.tugasSelesai = Math.min(TUGAS_PER_MISI - 1, Math.floor(angka(data.tugasSelesai, 0)));
    if (data.agen) {
      for (const id of URUTAN) {
        const a = data.agen[id];
        if (a) s.agen[id] = { rekrut: id === 'kode' || !!a.rekrut, lv: Math.max(1, Math.floor(angka(a.lv, 1))) };
      }
    }
    s.gpu = Math.floor(angka(data.gpu, 0));
    s.memori = Math.floor(angka(data.memori, 0));
    if (data.statistik) {
      const st = data.statistik;
      s.statistik.tugasTotal = angka(st.tugasTotal, 0);
      s.statistik.misiTotal = angka(st.misiTotal, 0);
      s.statistik.aksiTotal = angka(st.aksiTotal, 0);
      if (st.hariIni && typeof st.hariIni.tanggal === 'string') {
        s.statistik.hariIni = { tanggal: st.hariIni.tanggal, aksi: angka(st.hariIni.aksi, 0) };
      }
    }
    s.rataToken = angka(data.rataToken, 0);
    s.terakhir = angka(data.terakhir, sekarang);
    return s;
  }

  // ---------- Angka permainan ----------

  function infoKantor(idx) {
    const k = KANTOR[idx % KANTOR.length];
    const tingkat = Math.floor(idx / KANTOR.length) + 1;
    return { ...k, tingkat, label: tingkat > 1 ? `${k.nama} ${tingkat}` : k.nama };
  }

  function peranAktif(s) {
    return URUTAN.filter((id) => s.agen[id].rekrut);
  }

  function kerjaPerTahap(s) {
    return 50 * Math.pow(1.5, s.kantor);
  }

  function nilaiTugas(s, jumlahTahap) {
    const tahap = jumlahTahap || peranAktif(s).length;
    return 2 * (1 + 0.6 * (tahap - 1)) * Math.pow(2.5, s.kantor) * (1 + 0.12 * s.memori);
  }

  function kecepatanKerja(s, id) {
    return 10 * (1 + 0.2 * (s.agen[id].lv - 1)) * (1 + 0.1 * s.gpu);
  }

  // Harga sewa kantor ke-idx (idx >= 1). Tiap kantor jauh lebih mahal dari sebelumnya.
  function hargaSewa(idx) {
    return Math.round(2000 * Math.pow(11, idx - 1));
  }

  // jenis: 'rekrut' | 'level' | 'gpu' | 'memori' | 'sewa'
  function harga(s, jenis, id) {
    if (jenis === 'rekrut') return PERAN[id].rekrut;
    if (jenis === 'level') return Math.ceil(20 * Math.pow(1.55, s.agen[id].lv - 1));
    if (jenis === 'gpu') return Math.ceil(150 * Math.pow(2.2, s.gpu));
    if (jenis === 'memori') return Math.ceil(200 * Math.pow(2.2, s.memori));
    return hargaSewa(s.kantorTerbuka + 1);
  }

  function bisaBeli(s, jenis, id) {
    if (jenis === 'rekrut' && s.agen[id].rekrut) return false;
    if (jenis === 'level' && !s.agen[id].rekrut) return false;
    return s.token >= harga(s, jenis, id);
  }

  // ---------- Dunia (runtime, tidak disimpan) ----------

  function buatDunia(s, lebar) {
    const d = {
      lebar,
      waktu: 0,
      daya: 0,
      agen: {},
      kartu: [],
      antrian: {},
      meja: {},
      peran: [],
      spawn: 0.5,
      idKartu: 1,
      jendelaToken: 0,
      jendelaWaktu: 0,
      istirahat: false,
    };
    tataUlang(s, d);
    return d;
  }

  // Hitung posisi kotak masuk, meja, dan portal rilis untuk peran yang sudah direkrut.
  function tataUlang(s, d) {
    d.peran = peranAktif(s);
    d.masukX = 30;
    d.rilisX = d.lebar - 30;
    const awal = d.masukX + 70;
    const akhir = d.rilisX - 70;
    const n = d.peran.length;
    d.peran.forEach((id, i) => {
      d.meja[id] = { x: awal + ((akhir - awal) * (i + 0.5)) / n };
      if (!d.antrian[id]) d.antrian[id] = [];
      if (!d.agen[id]) {
        d.agen[id] = {
          id, x: d.meja[id].x, keadaan: 'diam', kartu: null, tujuan: d.meja[id].x,
          fase: 0, arah: 1, semangat: 0, jedaSemangat: 0, santai: acak(4, 9), senang: 0,
        };
      }
      const a = d.agen[id];
      if (a.keadaan === 'diam' || a.keadaan === 'kembali' || a.keadaan === 'jalan') {
        a.keadaan = 'kembali';
        a.tujuan = d.meja[id].x;
      }
    });
  }

  function ubahLebar(s, d, lebar) {
    d.lebar = lebar;
    tataUlang(s, d);
    for (const id of d.peran) {
      const a = d.agen[id];
      a.x = Math.min(Math.max(a.x, 0), lebar);
    }
    for (const k of d.kartu) if (k.x !== undefined) k.x = Math.min(Math.max(k.x, 0), lebar);
  }

  function kartuDiSistem(d) {
    return d.kartu.length;
  }

  function pengaliDaya(d) {
    return 1 + d.daya / 100;
  }

  function tambahAksi(s, d, n, sekarang = Date.now()) {
    if (!(n > 0)) return;
    const t = tanggalLokal(sekarang);
    if (s.statistik.hariIni.tanggal !== t) s.statistik.hariIni = { tanggal: t, aksi: 0 };
    s.statistik.hariIni.aksi += n;
    s.statistik.aksiTotal += n;
    d.daya = Math.min(100, d.daya + n * 2.5);
  }

  // Klik agen: semangatnya naik 15 detik (sekali per 20 detik).
  function semangati(d, id) {
    const a = d.agen[id];
    if (!a || a.jedaSemangat > 0) return false;
    a.semangat = 15;
    a.jedaSemangat = 20;
    a.senang = 1.2;
    return true;
  }

  function beli(s, d, jenis, id) {
    if (!bisaBeli(s, jenis, id)) return false;
    s.token -= harga(s, jenis, id);
    if (jenis === 'rekrut') {
      s.agen[id].rekrut = true;
      tataUlang(s, d);
    } else if (jenis === 'level') s.agen[id].lv += 1;
    else if (jenis === 'gpu') s.gpu += 1;
    else if (jenis === 'memori') s.memori += 1;
    else {
      // Sewa kantor baru lalu langsung pindah ke sana
      s.kantorTerbuka += 1;
      s.kantor = s.kantorTerbuka;
      s.tugasSelesai = 0;
      kosongkan(d);
    }
    return true;
  }

  function pilihKantor(s, d, idx) {
    if (idx < 0 || idx > s.kantorTerbuka || idx === s.kantor) return false;
    s.kantor = idx;
    s.tugasSelesai = 0;
    kosongkan(d);
    return true;
  }

  // Semua kartu dibuang (dipakai saat pindah kantor).
  function kosongkan(d) {
    d.kartu = [];
    for (const id of Object.keys(d.antrian)) d.antrian[id] = [];
    for (const id of d.peran) {
      const a = d.agen[id];
      a.kartu = null;
      a.keadaan = 'kembali';
      a.tujuan = d.meja[id].x;
    }
  }

  function peranBerikut(d, peran) {
    const i = d.peran.indexOf(peran);
    return i >= 0 && i < d.peran.length - 1 ? d.peran[i + 1] : null;
  }

  function lajuJalan(d, a) {
    return (55 + 45 * (d.daya / 100)) * (a.semangat > 0 ? 1.4 : 1);
  }

  function gerakKe(d, a, dt) {
    const v = lajuJalan(d, a);
    const selisih = a.tujuan - a.x;
    if (Math.abs(selisih) <= v * dt) {
      a.x = a.tujuan;
      return true;
    }
    a.arah = Math.sign(selisih);
    a.x += a.arah * v * dt;
    a.fase += v * dt * 0.2;
    return false;
  }

  function rilis(s, d, k, kejadian) {
    const nilai = nilaiTugas(s, k.tahapSelesai);
    s.token += nilai;
    d.jendelaToken += nilai;
    s.statistik.tugasTotal += 1;
    s.tugasSelesai += 1;
    kejadian.push({ jenis: 'rilis', x: d.rilisX, nilai });
    if (s.tugasSelesai >= TUGAS_PER_MISI) {
      const bonus = nilai * 3;
      s.token += bonus;
      d.jendelaToken += bonus;
      s.tugasSelesai = 0;
      s.misi += 1;
      s.statistik.misiTotal += 1;
      kejadian.push({ jenis: 'misi', bonus, misi: s.misi });
    }
  }

  function perbaruiAgen(s, d, a, dt, kejadian) {
    a.senang = Math.max(0, a.senang - dt);
    a.jedaSemangat = Math.max(0, a.jedaSemangat - dt);
    a.semangat = Math.max(0, a.semangat - dt);
    const meja = d.meja[a.id];
    const antri = d.antrian[a.id];

    if (d.istirahat) {
      if (a.keadaan !== 'istirahat') a.sebelumIstirahat = a.keadaan;
      a.keadaan = 'istirahat';
      return;
    }
    if (a.keadaan === 'istirahat') a.keadaan = a.sebelumIstirahat || 'diam';

    if (a.keadaan === 'diam') {
      if (antri.length) {
        a.kartu = antri.shift();
        a.kartu.di = 'dikerjakan';
        a.kartu.progres = 0;
        a.keadaan = 'kerja';
        return;
      }
      // Jalan-jalan kecil kalau lama menganggur
      a.santai -= dt;
      if (a.santai <= 0) {
        a.santai = acak(6, 12);
        a.keadaan = 'jalan';
        a.tujuan = Math.min(Math.max(meja.x + acak(-45, 45), 20), d.lebar - 20);
      }
      return;
    }

    if (a.keadaan === 'jalan') {
      if (antri.length || gerakKe(d, a, dt)) {
        a.keadaan = 'kembali';
        a.tujuan = meja.x;
      }
      return;
    }

    if (a.keadaan === 'kembali') {
      if (gerakKe(d, a, dt)) {
        a.keadaan = 'diam';
        a.arah = 1;
      }
      return;
    }

    if (a.keadaan === 'kerja') {
      const laju = kecepatanKerja(s, a.id) * pengaliDaya(d) * (a.semangat > 0 ? 1.6 : 1);
      a.kartu.progres += laju * dt;
      a.fase += dt * 10;
      if (a.kartu.progres >= a.kartu.kerja) {
        a.kartu.tahapSelesai += 1;
        if (Math.random() < 0.04) {
          const bonus = Math.round(nilaiTugas(s) * 0.5);
          s.token += bonus;
          d.jendelaToken += bonus;
          a.senang = 1.5;
          kejadian.push({ jenis: 'temuan', id: a.id, teks: TEMUAN[Math.floor(Math.random() * TEMUAN.length)], bonus });
        }
        const lanjut = peranBerikut(d, a.kartu.peran);
        a.kartu.di = 'dibawa';
        a.tujuan = lanjut ? d.meja[lanjut].x : d.rilisX;
        a.keadaan = 'antar';
      }
      return;
    }

    if (a.keadaan === 'antar') {
      if (gerakKe(d, a, dt)) {
        const k = a.kartu;
        a.kartu = null;
        const lanjut = peranBerikut(d, k.peran);
        if (lanjut) {
          k.peran = lanjut;
          k.di = 'antri';
          k.progres = 0;
          d.antrian[lanjut].push(k);
        } else {
          d.kartu = d.kartu.filter((x) => x !== k);
          rilis(s, d, k, kejadian);
          a.senang = 1;
        }
        a.keadaan = 'kembali';
        a.tujuan = meja.x;
      }
    }
  }

  function perbaruiKartuMeluncur(d, dt) {
    for (const k of d.kartu) {
      if (k.di !== 'meluncur') continue;
      const tujuan = d.meja[k.peran].x;
      k.x += 110 * dt;
      if (k.x >= tujuan) {
        k.di = 'antri';
        d.antrian[k.peran].push(k);
      }
    }
  }

  function bersihkanKartuYatim(d) {
    // Kartu menunggu di meja yang sudah tidak ada (tidak terjadi dalam permainan normal)
    for (const k of d.kartu) {
      if (!d.meja[k.peran]) k.peran = d.peran[0];
    }
  }

  // inp: { istirahat }
  function langkah(s, d, dt, inp = {}) {
    const kejadian = [];
    dt = Math.min(dt, 0.25);
    d.waktu += dt;
    d.istirahat = !!inp.istirahat;
    d.daya = Math.max(0, d.daya - 5 * dt);

    // Rata-rata token per detik untuk progres offline
    d.jendelaWaktu += dt;
    if (d.jendelaWaktu >= 20) {
      const laju = d.jendelaToken / d.jendelaWaktu;
      s.rataToken = s.rataToken > 0 ? s.rataToken * 0.8 + laju * 0.2 : laju;
      d.jendelaToken = 0;
      d.jendelaWaktu = 0;
    }

    bersihkanKartuYatim(d);

    // Tugas baru masuk lewat kotak masuk
    if (!d.istirahat) {
      d.spawn -= dt;
      const sisaMisi = TUGAS_PER_MISI - s.tugasSelesai - kartuDiSistem(d);
      if (d.spawn <= 0 && sisaMisi > 0 && kartuDiSistem(d) < d.peran.length + 1) {
        d.spawn = 1.6;
        d.kartu.push({
          id: d.idKartu++, peran: d.peran[0], di: 'meluncur', x: d.masukX,
          kerja: kerjaPerTahap(s), progres: 0, tahapSelesai: 0,
        });
      }
      perbaruiKartuMeluncur(d, dt);
    }

    for (const id of d.peran) perbaruiAgen(s, d, d.agen[id], dt, kejadian);
    return kejadian;
  }

  // Progres saat aplikasi tertutup: setengah dari rata-rata token per detik, maksimal 8 jam.
  function offline(s, sekarang = Date.now()) {
    const detik = Math.min(Math.max(0, (sekarang - s.terakhir) / 1000), BATAS_OFFLINE);
    s.terakhir = sekarang;
    if (detik < 60 || !(s.rataToken > 0)) return { detik, token: 0 };
    const token = s.rataToken * 0.5 * detik;
    s.token += token;
    return { detik, token };
  }

  function format(n) {
    n = Math.floor(n);
    const satuan = [[1e12, ' T'], [1e9, ' M'], [1e6, ' jt'], [1e4, ' rb']];
    for (const [batas, akhiran] of satuan) {
      if (n >= batas) {
        const nilai = batas === 1e4 ? n / 1e3 : n / batas;
        return nilai.toLocaleString('id-ID', { maximumFractionDigits: nilai < 100 ? 1 : 0 }) + akhiran;
      }
    }
    return n.toLocaleString('id-ID');
  }

  const Kantor = {
    PERAN, URUTAN, KANTOR, TUGAS_PER_MISI,
    baru, pulihkan, infoKantor, peranAktif, kerjaPerTahap, nilaiTugas, kecepatanKerja, hargaSewa,
    harga, bisaBeli, beli, pilihKantor, buatDunia, tataUlang, ubahLebar, tambahAksi, semangati,
    langkah, offline, format, pengaliDaya, tanggalLokal,
  };
  root.Kantor = Kantor;
  if (typeof module !== 'undefined' && module.exports) module.exports = Kantor;
})(typeof window !== 'undefined' ? window : globalThis);
