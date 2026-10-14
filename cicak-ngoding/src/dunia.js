// Perilaku cicak di layar: jalan di atas taskbar, memanjat dinding dan langit-langit,
// diam, tidur, mengejar nyamuk, diseret lalu jatuh. Murni (tanpa DOM) supaya bisa dites.
// Semua koordinat dalam piksel CSS; skala = ukuran satu piksel sprite.
(function (root) {
  'use strict';

  const B = { depan: 18, belakang: 21, samping: 8 }; // batas sprite dalam piksel sprite
  const KODE = ['{}', '</>', ';', '()', '=>', '01', 'if', '[]', '++', '#', 'fn', '&&'];
  const WARNA_KODE = ['#9ccf6e', '#6cb6ff', '#ff9fbc', '#f2c14e', '#c9b3ff', '#7fe0d0'];
  const ARAH_SUDUT = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] };
  const DALAM = { lantai: [0, -1], atap: [0, 1], kiri: [1, 0], kanan: [-1, 0] };

  function acak(a, b) {
    return a + Math.random() * (b - a);
  }

  function pilih(daftar) {
    return daftar[Math.floor(Math.random() * daftar.length)];
  }

  function jarakTepi(s) {
    return B.samping * s + 2;
  }

  // Rentang posisi yang aman di sepanjang satu permukaan.
  function rentang(d, permukaan, s) {
    const panjang = permukaan === 'lantai' || permukaan === 'atap' ? d.lebar : d.tinggi;
    const min = B.belakang * s + 2;
    return { min, max: Math.max(min, panjang - B.belakang * s - 2) };
  }

  function sudutDari(permukaan, arah) {
    if (permukaan === 'lantai' || permukaan === 'atap') return arah > 0 ? 0 : 180;
    return arah > 0 ? 90 : 270;
  }

  function buatCicak(s, d, permukaan, pos) {
    return {
      skala: s,
      permukaan,
      pos,
      arah: Math.random() < 0.5 ? -1 : 1,
      keadaan: 'jalan',
      timer: acak(2, 5),
      fase: 0,
      ekor: Math.random() * 6,
      lompat: 0,
      bebasX: 0,
      bebasY: 0,
      vy: 0,
    };
  }

  function buat(lebar, tinggi) {
    const d = { lebar, tinggi, waktu: 0, anak: [], nyamuk: null, partikel: [], zzz: 0 };
    d.cicak = buatCicak(3, d, 'lantai', lebar * 0.72);
    return d;
  }

  // Posisi tengah sprite di layar + sudutnya.
  function posisi(d, c) {
    if (c.keadaan === 'diangkat' || c.keadaan === 'jatuh') {
      return { x: c.bebasX, y: c.bebasY, sudut: 270 };
    }
    const m = jarakTepi(c.skala);
    let x;
    let y;
    if (c.permukaan === 'lantai') { x = c.pos; y = d.tinggi - m; }
    else if (c.permukaan === 'atap') { x = c.pos; y = m; }
    else if (c.permukaan === 'kiri') { x = m; y = c.pos; }
    else { x = d.lebar - m; y = c.pos; }
    if (c.lompat > 0) {
      const [ix, iy] = DALAM[c.permukaan];
      const naik = Math.sin((c.lompat / 0.45) * Math.PI) * 12;
      x += ix * naik;
      y += iy * naik;
    }
    return { x, y, sudut: sudutDari(c.permukaan, c.arah) };
  }

  function mulut(d, c) {
    const p = posisi(d, c);
    const [ax, ay] = ARAH_SUDUT[p.sudut];
    return { x: p.x + ax * 16.5 * c.skala, y: p.y + ay * 16.5 * c.skala };
  }

  function kotak(d, c) {
    const p = posisi(d, c);
    const [ax, ay] = ARAH_SUDUT[p.sudut];
    const s = c.skala;
    const titik = [];
    for (const panjang of [B.depan, -B.belakang]) {
      for (const lebar of [-B.samping, B.samping]) {
        titik.push([p.x + (ax * panjang - ay * lebar) * s, p.y + (ay * panjang + ax * lebar) * s]);
      }
    }
    const xs = titik.map((t) => t[0]);
    const ys = titik.map((t) => t[1]);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  }

  function kena(d, x, y) {
    const k = kotak(d, d.cicak);
    return x >= k.x0 - 4 && x <= k.x1 + 4 && y >= k.y0 - 4 && y <= k.y1 + 4;
  }

  function nyamukKena(d, x, y) {
    return !!d.nyamuk && Math.hypot(x - d.nyamuk.x, y - d.nyamuk.y) <= 22;
  }

  function arahDalam(c) {
    return DALAM[c.permukaan] || [0, -1];
  }

  function jeda(c, detik) {
    c.keadaan = 'diam';
    c.timer = detik;
  }

  // Sampai di ujung permukaan: belok ke permukaan lain atau putar balik.
  function tikungan(d, c, opsi) {
    const s = c.skala;
    const p = c.permukaan;
    const a = c.arah;
    const datar = rentang(d, 'lantai', s);
    const tegak = rentang(d, 'kanan', s);
    const bolehPanjat = opsi.panjat && c === d.cicak;
    if (p === 'lantai') {
      if (bolehPanjat && Math.random() < 0.4) {
        c.permukaan = a > 0 ? 'kanan' : 'kiri';
        c.arah = -1;
        c.pos = tegak.max;
      } else {
        c.arah = -a;
      }
      jeda(c, acak(0.3, 0.9));
    } else if (p === 'kanan' || p === 'kiri') {
      if (a < 0) {
        if (bolehPanjat && Math.random() < 0.18) {
          c.permukaan = 'atap';
          c.arah = p === 'kanan' ? -1 : 1;
          c.pos = p === 'kanan' ? datar.max : datar.min;
        } else {
          c.arah = 1;
        }
      } else {
        c.permukaan = 'lantai';
        c.arah = p === 'kanan' ? -1 : 1;
        c.pos = p === 'kanan' ? datar.max : datar.min;
      }
      jeda(c, acak(0.3, 0.8));
    } else {
      c.permukaan = a > 0 ? 'kanan' : 'kiri';
      c.arah = 1;
      c.pos = tegak.min;
      jeda(c, acak(0.3, 0.8));
    }
  }

  function pilihKegiatan(c, inp, utama) {
    if (c.keadaan === 'diam') {
      c.keadaan = 'jalan';
      if (Math.random() < 0.3) c.arah = -c.arah;
      c.timer = acak(2, 6);
      return;
    }
    const r = Math.random();
    const peluangDiam = inp.aktif ? 0.12 : 0.3;
    if (r < peluangDiam) jeda(c, acak(1, inp.aktif ? 2 : 4));
    else if (r < peluangDiam + 0.12 && (!utama || c.permukaan === 'lantai')) {
      c.arah = -c.arah;
      c.timer = acak(2, 5);
    } else c.timer = acak(2, 6);
    // Tidak boleh memanjat: turun dulu
    if (utama && !inp.panjat && (c.permukaan === 'kanan' || c.permukaan === 'kiri')) c.arah = 1;
  }

  function gerak(d, c, v, dt, opsi) {
    const r = rentang(d, c.permukaan, c.skala);
    c.pos += c.arah * v * dt;
    c.fase += v * dt * 0.22;
    if (c.pos > r.max) {
      c.pos = r.max;
      if (c.arah > 0) tikungan(d, c, opsi);
    } else if (c.pos < r.min) {
      c.pos = r.min;
      if (c.arah < 0) tikungan(d, c, opsi);
    }
  }

  function tambahPartikel(d, item) {
    d.partikel.push(item);
    if (d.partikel.length > 40) d.partikel.shift();
  }

  // Dipanggil saat ada ketukan/klik: kode beterbangan dari kepala cicak.
  function tambahKode(d, n) {
    const c = d.cicak;
    if (!(n > 0) || c.keadaan === 'tidur') return;
    // Paling banyak satu simbol tiap 0,3 detik supaya tidak menumpuk
    if (d.waktu - (d.kodeTerakhir || -1) < 0.3) return;
    d.kodeTerakhir = d.waktu;
    const m = mulut(d, c);
    const [ix, iy] = arahDalam(c);
    const sisi = acak(-26, 26);
    tambahPartikel(d, {
      x: m.x + ix * 16 - iy * sisi,
      y: m.y + iy * 16 + ix * sisi,
      vx: ix * acak(50, 75) - iy * acak(-10, 10),
      vy: iy * acak(50, 75) + ix * acak(-10, 10),
      teks: pilih(KODE),
      warna: pilih(WARNA_KODE),
      ukuran: 13,
      umur: 0,
      maks: acak(0.8, 1.1),
    });
  }

  function senang(d) {
    if (d.cicak.keadaan !== 'diangkat' && d.cicak.keadaan !== 'jatuh') d.cicak.lompat = 0.45;
  }

  function angkat(d, x, y) {
    const c = d.cicak;
    c.keadaan = 'diangkat';
    c.bebasX = x;
    c.bebasY = y;
    c.lompat = 0;
  }

  function geser(d, x, y) {
    const c = d.cicak;
    if (c.keadaan !== 'diangkat') return;
    c.bebasX = Math.min(Math.max(x, 10), d.lebar - 10);
    c.bebasY = Math.min(Math.max(y, 10), d.tinggi - 10);
  }

  // Dilepas: menempel ke tepi terdekat bila dekat, kalau tidak jatuh ke lantai.
  function lepas(d, opsi) {
    const c = d.cicak;
    if (c.keadaan !== 'diangkat') return;
    const s = c.skala;
    const dekat = 90;
    const datar = rentang(d, 'lantai', s);
    const tegak = rentang(d, 'kanan', s);
    const jepit = (v, r) => Math.min(Math.max(v, r.min), r.max);
    const x = c.bebasX;
    const y = c.bebasY;
    if (y > d.tinggi - dekat) {
      c.permukaan = 'lantai';
      c.pos = jepit(x, datar);
    } else if (opsi.panjat && x < dekat) {
      c.permukaan = 'kiri';
      c.pos = jepit(y, tegak);
      c.arah = 1;
    } else if (opsi.panjat && x > d.lebar - dekat) {
      c.permukaan = 'kanan';
      c.pos = jepit(y, tegak);
      c.arah = 1;
    } else if (opsi.panjat && y < dekat) {
      c.permukaan = 'atap';
      c.pos = jepit(x, datar);
    } else {
      c.keadaan = 'jatuh';
      c.vy = 0;
      return;
    }
    jeda(c, 0.8);
  }

  function perbaruiNyamuk(d, dt, inp) {
    if (!inp.nyamukAktif) {
      d.nyamuk = null;
      return;
    }
    const c = d.cicak;
    const p = posisi(d, c);
    const [ix, iy] = arahDalam(c);
    if (!d.nyamuk) {
      d.nyamuk = { x: p.x + ix * 220, y: p.y + iy * 220, tx: p.x, ty: p.y, timer: 0, t: 0 };
    }
    const n = d.nyamuk;
    n.t += dt;
    n.timer -= dt;
    if (n.timer <= 0) {
      const sisi = acak(-220, 220);
      const masuk = Math.random() < 0.18 ? acak(8, 22) : acak(55, 170);
      n.tx = p.x + ix * masuk + -iy * sisi;
      n.ty = p.y + iy * masuk + ix * sisi;
      n.timer = acak(1.2, 2.6);
    }
    const lajuKejar = Math.min(1, dt * 1.4);
    n.x += (n.tx - n.x) * lajuKejar + Math.sin(n.t * 7.3) * 0.8;
    n.y += (n.ty - n.y) * lajuKejar + Math.cos(n.t * 9.1) * 0.8;
    n.x = Math.min(Math.max(n.x, 12), d.lebar - 12);
    n.y = Math.min(Math.max(n.y, 12), d.tinggi - 12);
  }

  function perbaruiAnak(d, dt, inp) {
    const target = Math.min(inp.jumlahAnak || 0, 3);
    while (d.anak.length < target) {
      const r = rentang(d, 'lantai', 2);
      const pos = Math.min(Math.max(d.cicak.pos + acak(-160, 160), r.min), r.max);
      d.anak.push(buatCicak(2, d, 'lantai', pos));
    }
    d.anak.length = target;
    const induk = d.cicak;
    for (const a of d.anak) {
      a.ekor += dt * 2.6;
      if (induk.keadaan === 'tidur') {
        a.keadaan = 'tidur';
        continue;
      }
      if (a.keadaan === 'tidur') a.keadaan = 'jalan';
      a.timer -= dt;
      if (a.timer <= 0) pilihKegiatan(a, inp, false);
      // Jangan terlalu jauh dari induk saat induk di lantai
      if (induk.permukaan === 'lantai' && induk.keadaan !== 'diangkat' && induk.keadaan !== 'jatuh') {
        const selisih = induk.pos - a.pos;
        if (Math.abs(selisih) > 230) {
          a.keadaan = 'jalan';
          a.arah = Math.sign(selisih);
          a.timer = Math.max(a.timer, 1);
        }
      }
      if (a.keadaan === 'jalan') gerak(d, a, (inp.aktif ? 48 : 30), dt, { panjat: false });
    }
  }

  function perbaruiPartikel(d, dt) {
    for (const q of d.partikel) {
      q.umur += dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
    }
    d.partikel = d.partikel.filter((q) => q.umur < q.maks);
  }

  // inp: { aktif, diamDetik, kopi, jumlahAnak, nyamukAktif, hover, panjat, istirahat }
  function perbarui(d, dt, inp) {
    const kejadian = [];
    dt = Math.min(dt, 0.1);
    d.waktu += dt;
    const c = d.cicak;
    const opsi = { panjat: !!inp.panjat };

    perbaruiPartikel(d, dt);
    perbaruiNyamuk(d, dt, inp);
    perbaruiAnak(d, dt, inp);
    if (c.lompat > 0) c.lompat = Math.max(0, c.lompat - dt);

    if (c.keadaan === 'diangkat') {
      c.fase += dt * 16;
      c.ekor += dt * 6;
      return kejadian;
    }

    if (c.keadaan === 'jatuh') {
      c.vy += 1800 * dt;
      c.bebasY += c.vy * dt;
      c.fase += dt * 16;
      c.ekor += dt * 6;
      const lantaiY = d.tinggi - jarakTepi(c.skala);
      if (c.bebasY >= lantaiY) {
        const r = rentang(d, 'lantai', c.skala);
        c.permukaan = 'lantai';
        c.pos = Math.min(Math.max(c.bebasX, r.min), r.max);
        jeda(c, 0.9);
        kejadian.push({ jenis: 'mendarat' });
      }
      return kejadian;
    }

    c.ekor += dt * (c.keadaan === 'tidur' ? 0.7 : 2.2);

    // Tidur saat istirahat pomodoro atau kalau lama tidak ada aktivitas
    const ngantuk = inp.istirahat || (inp.diamDetik > 180 && !inp.nyamukAktif);
    if (ngantuk && c.keadaan !== 'tidur') c.keadaan = 'tidur';
    if (!ngantuk && c.keadaan === 'tidur') {
      c.keadaan = 'jalan';
      c.timer = acak(2, 5);
    }
    if (c.keadaan === 'tidur') {
      d.zzz -= dt;
      if (d.zzz <= 0) {
        d.zzz = 1.1;
        const p = posisi(d, c);
        const [ix, iy] = arahDalam(c);
        tambahPartikel(d, {
          x: p.x + ix * 30, y: p.y + iy * 30,
          vx: ix * 14 + -iy * 6, vy: iy * 14 + ix * 6,
          teks: 'z', warna: '#e8dcc0', ukuran: 15, umur: 0, maks: 2.2,
        });
      }
      return kejadian;
    }

    // Disentuh kursor: berhenti supaya gampang diklik
    if (inp.hover) {
      c.fase += 0;
      return kejadian;
    }

    const lajuKopi = 1 + 0.05 * Math.min(inp.kopi || 0, 20);

    // Mengejar nyamuk
    if (d.nyamuk) {
      const n = d.nyamuk;
      const m = mulut(d, c);
      if (Math.hypot(m.x - n.x, m.y - n.y) < 26) {
        kejadian.push({ jenis: 'tangkap', dari: m, ke: { x: n.x, y: n.y } });
        return kejadian;
      }
      const r = rentang(d, c.permukaan, c.skala);
      const target = c.permukaan === 'lantai' || c.permukaan === 'atap' ? n.x : n.y;
      const tujuan = Math.min(Math.max(target, r.min), r.max);
      const selisih = tujuan - c.pos;
      if (Math.abs(selisih) > 10) {
        c.arah = Math.sign(selisih);
        c.keadaan = 'jalan';
        const v = 120 * lajuKopi;
        const langkah = Math.min(Math.abs(selisih), v * dt);
        c.pos += c.arah * langkah;
        c.fase += langkah * 0.22;
      } else {
        c.keadaan = 'diam';
      }
      return kejadian;
    }

    c.timer -= dt;
    if (c.timer <= 0) pilihKegiatan(c, inp, true);
    if (c.keadaan === 'jalan') {
      const v = (inp.aktif ? 70 : 34) * lajuKopi;
      gerak(d, c, v, dt, opsi);
    }
    return kejadian;
  }

  // Ukuran layar berubah: jaga semua tetap di dalam layar.
  function ubahUkuran(d, lebar, tinggi) {
    d.lebar = lebar;
    d.tinggi = tinggi;
    for (const c of [d.cicak, ...d.anak]) {
      const r = rentang(d, c.permukaan, c.skala);
      c.pos = Math.min(Math.max(c.pos, r.min), r.max);
    }
  }

  function terlihatGerak(c) {
    return c.keadaan === 'jalan' || c.keadaan === 'diangkat' || c.keadaan === 'jatuh';
  }

  const Dunia = {
    B, buat, perbarui, posisi, mulut, kotak, kena, nyamukKena, arahDalam, tambahKode, senang,
    angkat, geser, lepas, ubahUkuran, rentang, terlihatGerak,
  };
  root.Dunia = Dunia;
  if (typeof module !== 'undefined' && module.exports) module.exports = Dunia;
})(typeof window !== 'undefined' ? window : globalThis);
