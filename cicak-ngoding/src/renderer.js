(async function () {
  'use strict';
  const G = window.Game;
  const D = window.Dunia;
  const C = window.Cicak;
  const desk = window.desk;

  const el = {
    kanvas: document.getElementById('layar'),
    pesan: document.getElementById('pesan'),
    panel: document.getElementById('panel'),
    koin: document.getElementById('koin'),
    laju: document.getElementById('laju'),
    hari: document.getElementById('hari'),
    pomo: document.getElementById('pomo'),
    tutup: document.getElementById('tutup'),
    proyek: document.getElementById('proyek'),
    toko: document.getElementById('toko'),
  };
  const ctx = el.kanvas.getContext('2d');

  let s = G.pulihkan(await desk.muat(), Date.now());
  let pengaturan = await desk.pengaturan();
  const d = D.buat(window.innerWidth, window.innerHeight);
  let dpr = window.devicePixelRatio || 1;
  let terakhirAksi = Date.now();
  let terakhirTik = Date.now();
  let terakhirSimpan = Date.now();
  let lidah = null;

  // ---------- Kanvas seukuran layar ----------
  function ukurKanvas() {
    dpr = window.devicePixelRatio || 1;
    el.kanvas.width = Math.round(window.innerWidth * dpr);
    el.kanvas.height = Math.round(window.innerHeight * dpr);
    ctx.imageSmoothingEnabled = false;
    D.ubahUkuran(d, window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', ukurKanvas);
  ukurKanvas();

  // ---------- Simpan ----------
  function simpan() {
    s.terakhir = Date.now();
    terakhirSimpan = s.terakhir;
    desk.simpan(s);
  }

  // ---------- Ikon pixel untuk upgrade ----------
  const IKON = {
    kopi: [
      '....w..w....',
      '.....w..w...',
      '....w..w....',
      '............',
      '..rrrrrrr...',
      '..rcccccrhh.',
      '..rrrrrrr.h.',
      '..rrrrrrr.h.',
      '..rrrrrrrhh.',
      '...rrrrr....',
      '.sssssssss..',
      '............',
    ],
    keyboard: [
      '............',
      '............',
      '............',
      'gggggggggggg',
      'gkgkgygkgkgg',
      'gggggggggggg',
      'gkgbgkgpgkgg',
      'gggggggggggg',
      'ggkkkkkkkkgg',
      'gggggggggggg',
      '............',
      '............',
    ],
    anak: [
      '.....bb.....',
      '....bbbb....',
      '....mbbm....',
      '.b.b.bb.b.b.',
      '.bbbbbbbbbb.',
      '.....bb.....',
      '.....db.....',
      '.bbbbbbbbbb.',
      '.b.b.bb.b.b.',
      '......b.....',
      '.......bb...',
      '.........b..',
    ],
    monitor: [
      '............',
      '.ffffffffff.',
      '.fllllllllf.',
      '.flhhhh.llf.',
      '.fllllllllf.',
      '.fltttll..f.',
      '.fllllllllf.',
      '.ffffffffff.',
      '.....ss.....',
      '.....ss.....',
      '...ssssss...',
      '............',
    ],
  };
  const PALET = {
    w: '#9fb4a5', r: '#b5583c', c: '#4a2b1a', h: '#8e3f28', s: '#8f8577',
    g: '#55616a', k: '#dfe6e9', y: '#e9ad2f', b: '#d6c597', p: '#ff9fbc', m: '#111111', d: '#a48f62',
    f: '#2c3137', l: '#13201a', t: '#6cb6ff', 'e': '#9ccf6e',
  };
  function ikonSvg(pola) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 12 12');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.setAttribute('aria-hidden', 'true');
    pola.forEach((baris, y) => {
      [...baris].forEach((ch, x) => {
        if (ch === '.' || !PALET[ch]) return;
        const r = document.createElementNS(ns, 'rect');
        r.setAttribute('x', x);
        r.setAttribute('y', y);
        r.setAttribute('width', 1);
        r.setAttribute('height', 1);
        r.setAttribute('fill', PALET[ch]);
        svg.appendChild(r);
      });
    });
    return svg;
  }
  // Monitor: baris kode hijau
  IKON.monitor[3] = '.fleeee.llf.';

  function koinSvg(ukuran) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 8 8');
    svg.setAttribute('width', ukuran);
    svg.setAttribute('height', ukuran);
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', '#ikon-koin');
    svg.appendChild(use);
    return svg;
  }

  // ---------- Gelembung pesan di dekat cicak ----------
  const antrean = [];
  let pesanAktif = false;
  function pesan(teks, opsi = {}) {
    antrean.push({ teks, koin: opsi.koin, durasi: opsi.durasi || 2600 });
    if (!pesanAktif) pesanBerikut();
  }
  function titikDekatCicak(jarak) {
    const p = D.posisi(d, d.cicak);
    const [ix, iy] = D.arahDalam(d.cicak);
    return { x: p.x + ix * jarak, y: p.y + iy * jarak };
  }
  let gelembungAktif = null;
  function letakkanGelembung(g) {
    let t = titikDekatCicak(70);
    // Ukur dari posisi netral, supaya lebarnya tidak terhimpit tepi layar
    g.style.left = '50%';
    g.style.top = '50%';
    const w = g.offsetWidth;
    const h = g.offsetHeight;
    if (!el.panel.hidden) {
      // Panel terbuka: tampilkan pesan di luar panel supaya tidak menutupinya
      const r = el.panel.getBoundingClientRect();
      if (r.top > h + 24) t = { x: r.left + r.width / 2, y: r.top - h / 2 - 10 };
      else if (window.innerHeight - r.bottom > h + 24) t = { x: r.left + r.width / 2, y: r.bottom + h / 2 + 10 };
      else if (r.left > w + 24) t = { x: r.left - w / 2 - 10, y: r.top + h / 2 + 20 };
      else t = { x: r.right + w / 2 + 10, y: r.top + h / 2 + 20 };
    }
    g.style.left = `${Math.min(Math.max(t.x, w / 2 + 8), window.innerWidth - w / 2 - 8)}px`;
    g.style.top = `${Math.min(Math.max(t.y, h + 8), window.innerHeight - h - 8)}px`;
  }

  function pesanBerikut() {
    const item = antrean.shift();
    if (!item) {
      pesanAktif = false;
      return;
    }
    pesanAktif = true;
    const g = document.createElement('div');
    g.className = 'gelembung';
    g.style.setProperty('--durasi', `${item.durasi}ms`);
    const isi = document.createElement('span');
    if (item.koin) {
      isi.appendChild(koinSvg(14));
      const b = document.createElement('b');
      b.textContent = `+${G.format(item.koin)}`;
      isi.appendChild(b);
    }
    isi.appendChild(document.createTextNode(item.teks));
    g.appendChild(isi);
    el.pesan.appendChild(g);
    gelembungAktif = g;
    letakkanGelembung(g);
    setTimeout(() => {
      g.remove();
      if (gelembungAktif === g) gelembungAktif = null;
      pesanBerikut();
    }, item.durasi);
  }

  function umumkanSelesai(daftar) {
    if (!daftar.length) return;
    const total = daftar.reduce((a, p) => a + p.bayaran, 0);
    const teks = daftar.length === 1 ? `${daftar[0].nama} selesai!` : `${daftar.length} proyek selesai!`;
    pesan(teks, { koin: total });
    D.senang(d);
    simpan();
  }

  // ---------- Panel ----------
  const slotEl = [];
  let jumlahSlotTerbangun = 0;
  function bangunProyek() {
    el.proyek.textContent = '';
    slotEl.length = 0;
    for (let i = 0; i < s.slot.length; i++) {
      const wadah = document.createElement('div');
      wadah.className = 'proyek';
      wadah.innerHTML = '<div class="atas"><span class="nama"></span><span class="angka"></span></div>'
        + '<div class="bawah"><div class="bar"><div class="penuh"></div></div><span class="upah"></span></div>';
      const upah = wadah.querySelector('.upah');
      upah.appendChild(koinSvg(12));
      const upahTeks = document.createElement('span');
      upah.appendChild(upahTeks);
      el.proyek.appendChild(wadah);
      slotEl.push({
        nama: wadah.querySelector('.nama'),
        angka: wadah.querySelector('.angka'),
        penuh: wadah.querySelector('.penuh'),
        upah: upahTeks,
      });
    }
    jumlahSlotTerbangun = s.slot.length;
  }

  const tombol = {};
  function bangunToko() {
    el.toko.textContent = '';
    for (const id of Object.keys(G.UPGRADE)) {
      const u = G.UPGRADE[id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'barang';
      const ikon = document.createElement('span');
      ikon.className = 'ikon';
      ikon.appendChild(ikonSvg(IKON[id]));
      const teks = document.createElement('span');
      const nama = document.createElement('span');
      nama.className = 'nama';
      nama.textContent = u.nama;
      const lv = document.createElement('span');
      lv.className = 'lv';
      nama.appendChild(lv);
      const efek = document.createElement('span');
      efek.className = 'efek';
      efek.textContent = u.efek;
      teks.append(nama, efek);
      const harga = document.createElement('span');
      harga.className = 'harga';
      const hargaKoin = koinSvg(12);
      const hargaTeks = document.createElement('span');
      harga.append(hargaKoin, hargaTeks);
      b.append(ikon, teks, harga);
      b.addEventListener('click', () => {
        if (G.beli(s, id)) {
          pesan(`${u.nama} naik ke level ${s.level[id]}`);
          D.senang(d);
          if (s.slot.length !== jumlahSlotTerbangun) bangunProyek();
          simpan();
          perbaruiPanel();
          posisikanPanel();
        }
      });
      el.toko.appendChild(b);
      tombol[id] = { b, lv, hargaKoin, hargaTeks };
    }
  }

  function angkaLokal(n) {
    return n.toLocaleString('id-ID', { maximumFractionDigits: 1 });
  }

  function perbaruiPanel() {
    if (el.panel.hidden) return;
    if (s.slot.length !== jumlahSlotTerbangun) bangunProyek();
    el.koin.textContent = G.format(s.koin);
    const pasif = G.bkPerDetik(s);
    el.laju.textContent = pasif > 0
      ? `${angkaLokal(G.bkPerAksi(s))} BK tiap ketukan, +${angkaLokal(pasif)}/detik`
      : `${angkaLokal(G.bkPerAksi(s))} BK tiap ketukan`;
    el.hari.textContent = `${G.format(s.hariIni.aksi)} ketukan dan klik hari ini`;

    s.slot.forEach((p, i) => {
      const e = slotEl[i];
      if (!e) return;
      e.nama.textContent = p.nama;
      e.angka.textContent = `${G.format(p.progres)} / ${G.format(p.target)} BK`;
      e.penuh.style.width = `${Math.min(100, (p.progres / p.target) * 100).toFixed(1)}%`;
      e.upah.textContent = G.format(p.bayaran);
    });

    for (const id of Object.keys(tombol)) {
      const t = tombol[id];
      const u = G.UPGRADE[id];
      const habis = u.maks !== undefined && s.level[id] >= u.maks;
      t.b.classList.toggle('habis', habis);
      t.lv.textContent = !habis && s.level[id] > 0 ? `Lv ${s.level[id]}` : '';
      if (habis) {
        t.hargaKoin.style.display = 'none';
        t.hargaTeks.textContent = 'Terpasang';
        t.b.disabled = true;
        t.b.title = '';
      } else {
        const h = G.harga(s, id);
        t.hargaKoin.style.display = '';
        t.hargaTeks.textContent = G.format(h);
        t.b.disabled = !G.bisaBeli(s, id);
        t.b.title = t.b.disabled ? `Kurang ${G.format(h - s.koin)} koin` : `Beli ${u.nama}`;
      }
    }
  }

  function posisikanPanel() {
    if (el.panel.hidden) return;
    const w = el.panel.offsetWidth;
    const h = el.panel.offsetHeight;
    const k = D.kotak(d, d.cicak);
    const [ix, iy] = D.arahDalam(d.cicak);
    const tengahX = (k.x0 + k.x1) / 2;
    const tengahY = (k.y0 + k.y1) / 2;
    let x;
    let y;
    if (iy !== 0) {
      // di lantai: panel di atas cicak; di langit-langit: di bawahnya
      x = tengahX - w / 2;
      y = iy < 0 ? k.y0 - h - 14 : k.y1 + 14;
    } else {
      // di dinding: panel di samping
      x = ix > 0 ? k.x1 + 14 : k.x0 - w - 14;
      y = tengahY - h / 2;
    }
    el.panel.style.left = `${Math.round(Math.min(Math.max(x, 8), window.innerWidth - w - 8))}px`;
    el.panel.style.top = `${Math.round(Math.min(Math.max(y, 8), window.innerHeight - h - 8))}px`;
  }

  let timerTutup = null;
  function bukaPanel() {
    el.panel.hidden = false;
    el.panel.classList.remove('buka');
    void el.panel.offsetWidth;
    el.panel.classList.add('buka');
    perbaruiPanel();
    posisikanPanel();
    if (gelembungAktif) letakkanGelembung(gelembungAktif);
    jadwalTutup();
  }
  function tutupPanel() {
    el.panel.hidden = true;
    clearTimeout(timerTutup);
    perbaruiTembus();
  }
  // Panel menutup sendiri 12 detik setelah kursor meninggalkannya.
  function jadwalTutup() {
    clearTimeout(timerTutup);
    timerTutup = setTimeout(() => {
      if (!diPanel) tutupPanel();
    }, 12000);
  }
  el.tutup.addEventListener('click', tutupPanel);
  el.panel.addEventListener('mouseleave', jadwalTutup);

  // ---------- Pomodoro ----------
  const FOKUS = 25 * 60 * 1000;
  const ISTIRAHAT = 5 * 60 * 1000;
  let pomo = null;
  function cekPomodoro(sekarang) {
    if (!pengaturan.pomodoro) {
      pomo = null;
      el.pomo.hidden = true;
      return;
    }
    if (!pomo) pomo = { fase: 'fokus', akhir: sekarang + FOKUS };
    if (sekarang >= pomo.akhir) {
      if (pomo.fase === 'fokus') {
        pomo = { fase: 'istirahat', akhir: sekarang + ISTIRAHAT };
        pesan('Waktunya istirahat 5 menit. Cicak juga mau tidur sebentar.', { durasi: 4500 });
      } else {
        pomo = { fase: 'fokus', akhir: sekarang + FOKUS };
        pesan('Istirahat selesai. Ayo fokus 25 menit lagi!', { durasi: 4500 });
      }
    }
    const sisa = Math.max(0, pomo.akhir - sekarang);
    const m = Math.floor(sisa / 60000);
    const dtk = Math.floor((sisa % 60000) / 1000);
    el.pomo.hidden = false;
    el.pomo.classList.toggle('istirahat', pomo.fase === 'istirahat');
    el.pomo.textContent = `${pomo.fase === 'fokus' ? 'Fokus' : 'Istirahat'} ${m}:${String(dtk).padStart(2, '0')}`;
  }

  // ---------- Kursor, klik, seret ----------
  // Area kosong meneruskan klik ke aplikasi di belakang; cicak, nyamuk, dan panel bisa diklik.
  let tembus = true;
  let diPanel = false;
  let diCicak = false;
  let diNyamuk = false;
  let tekan = null;
  let seret = false;

  function setTembus(v) {
    if (v === tembus) return;
    tembus = v;
    desk.setTembusKlik(v);
  }
  function perbaruiTembus() {
    setTembus(!(diPanel || diCicak || diNyamuk || seret || tekan));
    document.body.style.cursor = seret ? 'grabbing' : diNyamuk ? 'pointer' : diCicak ? 'grab' : '';
  }

  document.addEventListener('mousemove', (e) => {
    const x = e.clientX;
    const y = e.clientY;
    diPanel = !el.panel.hidden && !!e.target.closest && !!e.target.closest('#panel');
    diNyamuk = !diPanel && D.nyamukKena(d, x, y);
    diCicak = !diPanel && !diNyamuk && D.kena(d, x, y);
    if (tekan && !seret && Math.hypot(x - tekan.x, y - tekan.y) > 5) {
      seret = true;
      tutupPanel();
      D.angkat(d, x, y + 20);
    }
    if (seret) D.geser(d, x, y + 20);
    perbaruiTembus();
  });
  document.addEventListener('mouseleave', () => {
    if (seret) return;
    diPanel = false;
    diCicak = false;
    diNyamuk = false;
    perbaruiTembus();
  });

  function tangkapNyamuk(dari, ke) {
    lidah = { dari, ke, sampai: performance.now() + 230 };
    const bonus = G.tangkapNyamuk(s, Date.now());
    pesan('Nyamuk bug tertangkap!', { koin: bonus });
    D.senang(d);
    simpan();
    perbaruiPanel();
  }

  document.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (diNyamuk && d.nyamuk) {
      tangkapNyamuk(D.mulut(d, d.cicak), { x: d.nyamuk.x, y: d.nyamuk.y });
      return;
    }
    if (diCicak) tekan = { x: e.clientX, y: e.clientY };
    perbaruiTembus();
  });

  document.addEventListener('mouseup', (e) => {
    if (seret) {
      D.lepas(d, { panjat: pengaturan.panjat !== false });
      seret = false;
    } else if (tekan && diCicak) {
      if (el.panel.hidden) bukaPanel();
      else tutupPanel();
    }
    tekan = null;
    diCicak = D.kena(d, e.clientX, e.clientY);
    perbaruiTembus();
  });

  // ---------- Masukan dari proses utama ----------
  desk.onAksi((n) => {
    terakhirAksi = Date.now();
    D.tambahKode(d, n);
    umumkanSelesai(G.aksi(s, n, Date.now()));
    perbaruiPanel();
  });

  desk.onPengaturan((baru) => {
    pengaturan = baru;
    cekPomodoro(Date.now());
  });

  desk.onSimpanSekarang(() => {
    simpan();
    desk.siapKeluar();
  });

  desk.onReset(() => {
    s = G.baru(Date.now());
    bangunProyek();
    simpan();
    perbaruiPanel();
    pesan('Progres dimulai ulang. Semangat dari nol!');
  });

  desk.onBukaPanel(bukaPanel);

  // ---------- Detak per detik ----------
  // Pakai selisih waktu nyata, karena timer diperlambat saat jendela tersembunyi.
  function tik() {
    const sekarang = Date.now();
    const dt = Math.min((sekarang - terakhirTik) / 1000, 3600);
    terakhirTik = sekarang;
    G.cekHari(s, sekarang);
    if (dt > 0) umumkanSelesai(G.detik(s, dt));
    if (G.cekNyamuk(s, sekarang)) {
      pesan('Ada nyamuk! Klik nyamuknya, atau biarkan cicak menangkapnya.', { durasi: 4000 });
    }
    cekPomodoro(sekarang);
    if (sekarang - terakhirSimpan > 15000) simpan();
    perbaruiPanel();
  }

  // ---------- Gambar ----------
  let waktuLalu = performance.now();
  function bingkai() {
    const kini = performance.now();
    const dt = (kini - waktuLalu) / 1000;
    waktuLalu = kini;
    if (document.hidden) return;

    const kejadian = D.perbarui(d, dt, {
      aktif: Date.now() - terakhirAksi < 1500,
      diamDetik: (Date.now() - terakhirAksi) / 1000,
      kopi: s.level.kopi,
      jumlahAnak: s.level.anak,
      nyamukAktif: s.nyamuk.aktif,
      hover: diCicak && !seret && !tekan,
      panjat: pengaturan.panjat !== false,
      istirahat: !!(pomo && pomo.fase === 'istirahat'),
    });
    for (const k of kejadian) {
      if (k.jenis === 'tangkap' && s.nyamuk.aktif) tangkapNyamuk(k.dari, k.ke);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, el.kanvas.width, el.kanvas.height);
    ctx.imageSmoothingEnabled = false;

    for (const a of d.anak) gambarSatu(a, 2);
    gambarSatu(d.cicak, 3);

    if (d.nyamuk && s.nyamuk.aktif) {
      C.gambarNyamuk(ctx, d.nyamuk.x * dpr, d.nyamuk.y * dpr, Math.max(2, Math.round(3 * dpr)), d.waktu);
    }
    if (lidah) {
      if (kini > lidah.sampai) lidah = null;
      else {
        C.gambarLidah(ctx, { x: lidah.dari.x * dpr, y: lidah.dari.y * dpr },
          { x: lidah.ke.x * dpr, y: lidah.ke.y * dpr }, Math.round(2 * dpr));
      }
    }
    for (const q of d.partikel) {
      const alfa = Math.max(0, 1 - q.umur / q.maks);
      C.gambarTeks(ctx, q.teks, q.x * dpr, q.y * dpr, q.warna, Math.round(q.ukuran * dpr), alfa);
    }
  }

  function gambarSatu(c, skalaCss) {
    const p = D.posisi(d, c);
    C.gambarCicak(ctx, {
      x: p.x * dpr,
      y: p.y * dpr,
      sudut: p.sudut,
      skala: Math.max(1, Math.round(skalaCss * dpr)),
      fase: c.fase,
      ekor: c.ekor,
      gerak: D.terlihatGerak(c),
      tidur: c.keadaan === 'tidur',
      panik: c.keadaan === 'diangkat' || c.keadaan === 'jatuh',
    });
  }

  // ---------- Mulai ----------
  bangunProyek();
  bangunToko();
  const off = G.offline(s, Date.now());
  if (off.bk > 0) {
    pesan(`Selama kamu pergi, Anak Cicak menulis ${G.format(off.bk)} BK`, { koin: off.koin || undefined, durasi: 6000 });
  } else if (s.aksiTotal === 0) {
    pesan('Hai! Klik aku untuk lihat koin dan upgrade. Seret aku untuk pindah tempat.', { durasi: 7000 });
  }
  simpan();
  setInterval(tik, 1000);
  setInterval(bingkai, 33); // sekitar 30 FPS
  bingkai();

  // Untuk alat uji tangkapan layar
  window.__cicak = { d, D, get s() { return s; }, bukaPanel, pesan, bingkai };
})();
