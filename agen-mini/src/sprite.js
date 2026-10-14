// Pixel art Agen Mini: robot agen (tampak depan), meja + laptop, kartu tugas, kotak masuk,
// roket rilis, dan lantai tiap kantor. Semua digambar dengan garis luar gelap supaya
// tetap terlihat di atas latar apa pun. Satuan lokal = piksel sprite; S = piksel perangkat per piksel sprite.
(function (root) {
  'use strict';

  const TEPI = '#232833';
  const OFS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  const WARNA_PERAN = {
    riset: '#5aa9e6',
    desain: '#ef7fa5',
    kode: '#6cc070',
    uji: '#f2a541',
  };

  // Menggambar bentuk dengan garis luar. bentuk(r) memanggil r(x, y, w, h, warna) dalam piksel lokal.
  function lukis(ctx, x, y, S, bentuk, garisLuar = true) {
    x = Math.round(x);
    y = Math.round(y);
    if (garisLuar) {
      ctx.fillStyle = TEPI;
      for (const [dx, dy] of OFS) {
        ctx.setTransform(S, 0, 0, S, x + dx * S, y + dy * S);
        bentuk((a, b, w, h) => ctx.fillRect(a, b, w, h));
      }
    }
    ctx.setTransform(S, 0, 0, S, x, y);
    bentuk((a, b, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(a, b, w, h);
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ---------- Robot agen ----------
  // Titik jangkar: tengah kaki. o = { peran, wajah: 'biasa'|'kerja'|'senang'|'tidur', jalan, fase, angkat, lirik, kedip, lampu }
  function bentukRobot(o) {
    const warna = WARNA_PERAN[o.peran];
    const langkah = o.jalan ? Math.floor(o.fase) % 2 : 0;
    const naik = o.jalan && langkah ? -1 : 0; // badan sedikit memantul saat berjalan
    const ketik = o.wajah === 'kerja' ? Math.floor(o.fase) % 2 : 0;
    return (r) => {
      const y = naik;
      // kaki
      r(-3, langkah === 1 ? -3 : -2, 2, langkah === 1 ? 2 : 2, '#7d8796');
      r(1, langkah === 0 && o.jalan ? -3 : -2, 2, 2, '#7d8796');
      // badan
      r(-4, -6 + y, 8, 4, '#d3dae3');
      r(-4, -3 + y, 8, 1, '#b7c0cc');
      r(-1, -5 + y, 2, 1, warna); // lampu dada
      // lengan
      if (o.angkat) {
        r(-5, -10 + y, 1, 4, '#b7c0cc');
        r(4, -10 + y, 1, 4, '#b7c0cc');
      } else {
        r(-5, (ketik ? -7 : -6) + y, 1, 3, '#b7c0cc');
        r(4, (ketik ? -6 : -7) + y, 1, 3, '#b7c0cc');
      }
      // kepala bulat
      r(-5, -14 + y, 10, 8, '#eef1f5');
      r(-6, -13 + y, 12, 6, '#eef1f5');
      r(-6, -8 + y, 12, 1, '#cdd4dd');
      // layar wajah
      r(-4, -12 + y, 8, 4, '#1b2331');
      const lx = Math.max(-1, Math.min(1, o.lirik || 0));
      if (o.wajah === 'tidur' || o.kedip) {
        r(-3 + lx, -10 + y, 2, 1, warna);
        r(1 + lx, -10 + y, 2, 1, warna);
      } else if (o.wajah === 'senang') {
        r(-4, -10 + y, 1, 1, warna); r(-3, -11 + y, 1, 1, warna); r(-2, -10 + y, 1, 1, warna);
        r(1, -10 + y, 1, 1, warna); r(2, -11 + y, 1, 1, warna); r(3, -10 + y, 1, 1, warna);
      } else if (o.wajah === 'kerja') {
        r(-3, -10 + y, 2, 1, warna);
        r(1, -10 + y, 2, 1, warna);
        r(-3, -9 + y, 2, 1, '#2c3a4f');
        r(1, -9 + y, 2, 1, '#2c3a4f');
      } else {
        r(-3 + lx, -11 + y, 2, 2, warna);
        r(1 + lx, -11 + y, 2, 2, warna);
      }
      // antena
      r(0, -16 + y, 1, 2, '#7d8796');
      r(-1 + (o.peran === 'desain' ? 2 : 0), -18 + y, 2, 2, o.lampu ? '#ffffff' : warna);

      // aksesori peran
      if (o.peran === 'kode') {
        // headset
        r(-6, -15 + y, 12, 1, '#3a4252');
        r(-7, -12 + y, 1, 3, warna);
        r(6, -12 + y, 1, 3, warna);
        r(-7, -9 + y, 2, 1, '#3a4252');
      } else if (o.peran === 'desain') {
        // baret miring
        r(-5, -15 + y, 9, 1, warna);
        r(-6, -16 + y, 8, 1, warna);
        r(-4, -17 + y, 5, 1, '#d9638b');
      } else if (o.peran === 'uji') {
        // helm proyek
        r(-5, -16 + y, 10, 2, warna);
        r(-7, -14 + y, 14, 1, '#d98a2b');
        r(-1, -17 + y, 2, 1, warna);
      } else if (o.peran === 'riset') {
        // kaca pembesar di tangan kanan
        r(5, -12 + y, 3, 1, '#3c4a5c');
        r(5, -10 + y, 3, 1, '#3c4a5c');
        r(5, -11 + y, 1, 1, '#3c4a5c');
        r(7, -11 + y, 1, 1, '#3c4a5c');
        r(6, -11 + y, 1, 1, '#bfe3ff');
        r(5, -9 + y, 1, 2, '#3c4a5c');
      }
    };
  }

  function gambarRobot(ctx, x, y, S, o) {
    lukis(ctx, x, y, S, bentukRobot(o));
  }

  // Kopi saat istirahat
  function gambarKopi(ctx, x, y, S, t) {
    lukis(ctx, x, y, S, (r) => {
      r(0, -4, 3, 4, '#b5583c');
      r(3, -3, 1, 2, '#b5583c');
      r(0, -4, 3, 1, '#d9805f');
    });
    ctx.globalAlpha = 0.6;
    const naik = Math.floor((t * 3) % 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(x + S), Math.round(y - (6 + naik) * S), S, S);
    ctx.globalAlpha = 1;
  }

  // ---------- Meja ----------
  // Titik jangkar: tengah bawah meja. antri = jumlah kartu menunggu di meja.
  function gambarMeja(ctx, x, y, S, peran, antri, t, kerja) {
    const warna = WARNA_PERAN[peran];
    const kedip = kerja && Math.floor(t * 3) % 2;
    lukis(ctx, x, y, S, (r) => {
      // laptop (punggung layar menghadap kita)
      r(3, -16, 9, 7, '#a9b2bd');
      r(3, -10, 9, 1, '#8c96a3');
      r(6, -14, 3, 3, kedip ? '#ffffff' : warna);
      // tumpukan kartu menunggu
      const tinggi = Math.min(antri, 4);
      for (let i = 0; i < tinggi; i++) r(-11, -10 - i, 6, 1, i % 2 ? '#fbf7ee' : '#e9e2d0');
      // permukaan meja
      r(-13, -9, 26, 2, '#c08a5b');
      r(-12, -7, 24, 3, '#8b5e3c');
      r(-12, -5, 24, 1, '#6e4a2e');
      // kaki meja
      r(-12, -4, 2, 4, '#6e4a2e');
      r(10, -4, 2, 4, '#6e4a2e');
    });
  }

  // ---------- Kartu tugas ----------
  function gambarKartu(ctx, x, y, S, peran) {
    const warna = WARNA_PERAN[peran] || '#9aa4b1';
    lukis(ctx, x, y, S, (r) => {
      r(-3, -6, 6, 6, '#fbf7ee');
      r(-3, -6, 6, 1, warna);
      r(-2, -4, 4, 1, '#c9c2b2');
      r(-2, -2, 3, 1, '#c9c2b2');
    });
  }

  // ---------- Kotak masuk ----------
  function gambarKotakMasuk(ctx, x, y, S, t) {
    const goyang = Math.floor(t * 1.5) % 2;
    lukis(ctx, x, y, S, (r) => {
      r(-5, -9 - goyang, 6, 1, '#fbf7ee');
      r(-4, -8, 7, 1, '#e9e2d0');
      r(-7, -7, 14, 1, '#5d6b7c');
      r(-7, -6, 1, 4, '#5d6b7c');
      r(6, -6, 1, 4, '#5d6b7c');
      r(-6, -6, 12, 4, '#7a8899');
      r(-6, -3, 12, 1, '#66748a');
      r(-2, -5, 4, 1, '#a9e0ff'); // panah masuk
      r(-1, -4, 2, 1, '#a9e0ff');
      r(-7, -2, 14, 2, '#5d6b7c');
    });
  }

  // ---------- Roket rilis ----------
  // nyala: 0..1 (sesaat setelah rilis)
  function gambarRoket(ctx, x, y, S, nyala, t) {
    const getar = nyala > 0 ? (Math.floor(t * 30) % 2 ? 1 : 0) : 0;
    lukis(ctx, x + getar * S, y, S, (r) => {
      // landasan
      r(-7, -2, 14, 2, '#6b7686');
      // api
      if (nyala > 0) {
        const p = Math.floor(t * 20) % 2;
        r(-2, -5, 4, 2 + p, '#ffcf4a');
        r(-1, -4, 2, 2 + p, '#ff7a3d');
      }
      // sirip
      r(-4, -8, 2, 4, '#e05a4f');
      r(2, -8, 2, 4, '#e05a4f');
      // badan
      r(-2, -17, 4, 13, '#eef1f5');
      r(-1, -19, 2, 2, '#eef1f5');
      r(-2, -17, 4, 2, '#e05a4f');
      r(-1, -19, 2, 1, '#e05a4f');
      // jendela
      r(-1, -13, 2, 2, '#5aa9e6');
      r(-2, -5, 4, 1, '#c3cad4');
    });
  }

  // ---------- Lantai tiap kantor ----------
  // Pita setinggi 4 piksel sprite di bawah arena. lebar dalam piksel sprite.
  const LANTAI = {
    garasi(r, lebar) {
      r(0, 0, lebar, 1, '#b9bec4');
      r(0, 1, lebar, 3, '#9aa0a6');
      for (let x = 3; x < lebar; x += 7) r(x, 2 + (x % 2), 1, 1, '#868c93');
      for (let x = 40; x < lebar; x += 97) r(x, 2, 4, 1, '#6d7278');
    },
    kafe(r, lebar) {
      r(0, 0, lebar, 1, '#c48a5a');
      r(0, 1, lebar, 3, '#a36f45');
      for (let x = 0; x < lebar; x += 12) {
        r(x, 1, 1, 3, '#7e5131');
        r(x + 6, 2, 5, 1, '#8f5f3b');
      }
    },
    startup(r, lebar) {
      r(0, 0, lebar, 1, '#5cb3ac');
      r(0, 1, lebar, 3, '#3f8f8a');
      for (let x = 2; x < lebar; x += 4) r(x, 2 + ((x / 4) % 2), 1, 1, '#4fa6a0');
    },
    gedung(r, lebar) {
      r(0, 0, lebar, 1, '#f4f1ec');
      r(0, 1, lebar, 3, '#e3ded5');
      for (let x = 0; x < lebar; x += 16) r(x, 1, 1, 3, '#cfc8bb');
      for (let x = 5; x < lebar; x += 23) r(x, 2, 6, 1, '#d6cfc2');
    },
    pusatData(r, lebar, t) {
      r(0, 0, lebar, 1, '#46505d');
      r(0, 1, lebar, 3, '#2f3640');
      for (let x = 0; x < lebar; x += 10) {
        r(x, 1, 1, 3, '#252b33');
        const nyala = (Math.floor(t * 2) + x / 10) % 3 === 0;
        r(x + 5, 2, 1, 1, nyala ? '#3fd1e0' : '#2a6f78');
      }
    },
    luarAngkasa(r, lebar) {
      r(0, 0, lebar, 1, '#a7b0bc');
      r(0, 1, lebar, 3, '#7d8794');
      for (let x = 0; x < lebar; x += 14) {
        r(x, 1, 1, 3, '#5d6672');
        r(x + 3, 2, 1, 1, '#5d6672');
        r(x + 10, 2, 1, 1, '#5d6672');
      }
    },
  };

  function gambarLantai(ctx, x, y, S, lebarCss, jenis, t) {
    const lebar = Math.ceil(lebarCss / (S / (window.devicePixelRatio || 1)));
    const pola = LANTAI[jenis] || LANTAI.garasi;
    ctx.setTransform(S, 0, 0, S, Math.round(x), Math.round(y));
    pola((a, b, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(a, b, w, h);
    }, lebar, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ---------- Bilah progres kecil di atas robot ----------
  function gambarProgres(ctx, x, y, S, porsi, warna) {
    const w = 12 * S;
    const h = Math.max(2, Math.round(S * 0.8));
    const kiri = Math.round(x - w / 2);
    ctx.fillStyle = TEPI;
    ctx.fillRect(kiri - 1, Math.round(y) - 1, w + 2, h + 2);
    ctx.fillStyle = '#3a4252';
    ctx.fillRect(kiri, Math.round(y), w, h);
    ctx.fillStyle = warna;
    ctx.fillRect(kiri, Math.round(y), Math.round(w * Math.min(1, porsi)), h);
  }

  // Bintang kecil untuk efek semangat dan rilis
  function gambarBintang(ctx, x, y, S, warna, alfa) {
    ctx.globalAlpha = alfa;
    ctx.fillStyle = warna;
    const s = Math.max(1, Math.round(S * 0.7));
    ctx.fillRect(Math.round(x - s / 2), Math.round(y - s * 1.5), s, s * 3);
    ctx.fillRect(Math.round(x - s * 1.5), Math.round(y - s / 2), s * 3, s);
    ctx.globalAlpha = 1;
  }

  root.Sprite = {
    WARNA_PERAN, gambarRobot, gambarKopi, gambarMeja, gambarKartu, gambarKotakMasuk, gambarRoket,
    gambarLantai, gambarProgres, gambarBintang,
  };
})(typeof window !== 'undefined' ? window : globalThis);
