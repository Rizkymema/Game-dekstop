(async function () {
  'use strict';
  const K = window.Kantor;
  const SP = window.Sprite;
  const desk = window.desk;

  const $ = (id) => document.getElementById(id);
  const el = {
    kanvas: $('layar'), pesan: $('pesan'), hud: $('hud'), hudKantor: $('hudKantor'), hudMisi: $('hudMisi'),
    hudDaya: $('hudDaya'), hudToken: $('hudToken'), panel: $('panel'), token: $('token'), pomo: $('pomo'),
    tutup: $('tutup'), daya: $('daya'), hari: $('hari'), namaKantor: $('namaKantor'), misi: $('misi'),
    kotakTugas: $('kotakTugas'), daftarKantor: $('daftarKantor'), sewa: $('sewa'), tim: $('tim'),
    gpu: $('gpu'), memori: $('memori'),
  };
  const ctx = el.kanvas.getContext('2d');

  const SKALA = 3; // piksel CSS per piksel sprite
  const TINGGI_LANTAI = 12;
  const TINGGI_STRIP = 175; // area bawah layar yang digambar ulang tiap bingkai

  let s = K.pulihkan(await desk.muat(), Date.now());
  let pengaturan = await desk.pengaturan();
  let dpr = window.devicePixelRatio || 1;
  let arena = { x: 0, lebar: 860 };
  const d = K.buatDunia(s, 860);
  const efek = []; // bintang & angka melayang di kanvas
  let nyalaRoket = 0;
  let terakhirSimpan = Date.now();

  // ---------- Ukuran & posisi arena ----------
  function hitungArena() {
    const W = window.innerWidth;
    const lebar = Math.max(420, Math.min(900, W - 32));
    let x = W - lebar - 16;
    if (pengaturan.posisi === 'kiri') x = 16;
    else if (pengaturan.posisi === 'tengah') x = Math.round((W - lebar) / 2);
    arena = { x, lebar };
    K.ubahLebar(s, d, lebar);
    letakkanHud();
  }

  function ukurKanvas() {
    dpr = window.devicePixelRatio || 1;
    el.kanvas.width = Math.round(window.innerWidth * dpr);
    el.kanvas.height = Math.round(window.innerHeight * dpr);
    ctx.imageSmoothingEnabled = false;
    hitungArena();
  }

  const lantaiY = () => window.innerHeight - TINGGI_LANTAI;

  function letakkanHud() {
    el.hud.style.left = `${arena.x}px`;
    el.hud.style.top = `${lantaiY() - 104}px`;
  }

  window.addEventListener('resize', ukurKanvas);
  ukurKanvas();

  // ---------- Simpan ----------
  function simpan() {
    s.terakhir = Date.now();
    terakhirSimpan = s.terakhir;
    desk.simpan(s);
  }

  // ---------- Ikon token & robot kecil ----------
  function tokenSvg(ukuran) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 8 8');
    svg.setAttribute('width', ukuran);
    svg.setAttribute('height', ukuran);
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', '#ikon-token');
    svg.appendChild(use);
    return svg;
  }

  function robotKecil(peran) {
    const c = document.createElement('canvas');
    c.width = 30;
    c.height = 36;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    SP.gambarRobot(g, 15, 34, 2, { peran, wajah: 'senang' });
    return c;
  }

  // ---------- Gelembung pesan ----------
  const antrean = [];
  let pesanAktif = false;
  // x dalam koordinat arena (null = di atas HUD)
  function pesan(teks, opsi = {}) {
    antrean.push({ teks, token: opsi.token, x: opsi.x, durasi: opsi.durasi || 2800 });
    if (!pesanAktif) pesanBerikut();
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
    if (item.token) {
      const b = document.createElement('b');
      b.textContent = `+${K.format(item.token)}`;
      g.appendChild(b);
    }
    g.appendChild(document.createTextNode(item.teks));
    el.pesan.appendChild(g);
    g.style.left = '50%';
    g.style.top = '50%';
    const w = g.offsetWidth;
    let x = item.x !== undefined ? arena.x + item.x : arena.x + arena.lebar / 2;
    let y = lantaiY() - 130;
    if (!el.panel.hidden) {
      const r = el.panel.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top - 8;
    }
    g.style.left = `${Math.min(Math.max(x, w / 2 + 8), window.innerWidth - w / 2 - 8)}px`;
    g.style.top = `${Math.max(y, 60)}px`;
    setTimeout(() => {
      g.remove();
      pesanBerikut();
    }, item.durasi);
  }

  // ---------- HUD ----------
  function perbaruiHud() {
    el.hudKantor.textContent = K.infoKantor(s.kantor).label;
    el.hudMisi.textContent = `Misi ${s.misi + 1} · ${s.tugasSelesai}/${K.TUGAS_PER_MISI}`;
    el.hudToken.textContent = K.format(s.token);
    el.hudDaya.style.width = `calc(${Math.round(d.daya)}% - 2px)`;
  }

  // ---------- Panel ----------
  const kotak = [];
  for (let i = 0; i < K.TUGAS_PER_MISI; i++) {
    const k = document.createElement('span');
    el.kotakTugas.appendChild(k);
    kotak.push(k);
  }

  const catatan = {};
  function bangunTim() {
    el.tim.textContent = '';
    for (const id of K.URUTAN) {
      const p = K.PERAN[id];
      const kartu = document.createElement('div');
      kartu.className = `catatan ${id}`;
      const atas = document.createElement('div');
      atas.className = 'atas';
      atas.appendChild(robotKecil(id));
      const teks = document.createElement('div');
      const nama = document.createElement('div');
      nama.className = 'nama';
      const lv = document.createElement('span');
      lv.className = 'lv';
      const ket = document.createElement('div');
      ket.className = 'ket';
      teks.append(nama, ket);
      atas.append(teks);
      const tombol = document.createElement('button');
      tombol.type = 'button';
      tombol.className = 'tombol';
      const label = document.createElement('span');
      const hargaB = document.createElement('b');
      tombol.append(label, tokenSvg(12), hargaB);
      tombol.addEventListener('click', () => {
        const jenis = s.agen[id].rekrut ? 'level' : 'rekrut';
        if (K.beli(s, d, jenis, id)) {
          if (jenis === 'rekrut') pesan(`${p.nama} bergabung! ${p.tugas}.`, { x: d.meja[id].x });
          else pesan(`${p.nama} naik ke level ${s.agen[id].lv}`, { x: d.meja[id].x });
          d.agen[id].senang = 1.5;
          simpan();
          perbaruiPanel();
        }
      });
      kartu.append(atas, tombol);
      el.tim.appendChild(kartu);
      catatan[id] = { kartu, nama, lv, ket, tombol, label, hargaB };
    }
  }

  function isiTombolBaris(tombol, nama, lv, ket, hargaTeks, bisa) {
    tombol.textContent = '';
    const kiri = document.createElement('span');
    const n = document.createElement('span');
    n.className = 'nama';
    n.textContent = nama;
    const l = document.createElement('span');
    l.className = 'lv';
    l.textContent = `Lv ${lv}`;
    n.appendChild(l);
    const k = document.createElement('span');
    k.className = 'ket';
    k.textContent = ket;
    kiri.append(n, k);
    const h = document.createElement('span');
    h.className = 'harga';
    h.append(tokenSvg(12), document.createTextNode(hargaTeks));
    tombol.append(kiri, h);
    tombol.disabled = !bisa;
  }

  el.gpu.addEventListener('click', () => {
    if (K.beli(s, d, 'gpu')) {
      pesan(`GPU naik ke level ${s.gpu}. Semua agen lebih cepat.`);
      simpan();
      perbaruiPanel();
    }
  });
  el.memori.addEventListener('click', () => {
    if (K.beli(s, d, 'memori')) {
      pesan(`Memori naik ke level ${s.memori}. Tiap tugas bernilai lebih.`);
      simpan();
      perbaruiPanel();
    }
  });
  el.sewa.addEventListener('click', () => {
    const tujuan = K.infoKantor(s.kantorTerbuka + 1);
    if (K.beli(s, d, 'sewa')) {
      pesan(`Pindah ke ${tujuan.label}! Tugasnya lebih besar, bayarannya juga.`, { durasi: 4000 });
      simpan();
      perbaruiPanel();
    }
  });

  let jejakKantor = -1;
  function bangunDaftarKantor() {
    el.daftarKantor.textContent = '';
    if (s.kantorTerbuka === 0) return;
    for (let i = 0; i <= s.kantorTerbuka; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `chip${i === s.kantor ? ' aktif' : ''}`;
      b.textContent = K.infoKantor(i).label;
      b.title = i === s.kantor ? 'Kantor saat ini' : 'Pindah ke kantor ini';
      b.addEventListener('click', () => {
        if (K.pilihKantor(s, d, i)) {
          pesan(`Tim pindah ke ${K.infoKantor(i).label}`);
          simpan();
          perbaruiPanel();
        }
      });
      el.daftarKantor.appendChild(b);
    }
    jejakKantor = s.kantor * 1000 + s.kantorTerbuka;
  }

  function perbaruiPanel() {
    perbaruiHud();
    if (el.panel.hidden) return;
    el.token.textContent = K.format(s.token);
    el.daya.style.width = `calc(${Math.round(d.daya)}% - 2px)`;
    el.hari.textContent = `${K.format(s.statistik.hariIni.aksi)} ketukan hari ini`;
    el.namaKantor.textContent = K.infoKantor(s.kantor).label;
    el.misi.textContent = `Misi ke-${s.misi + 1}`;
    kotak.forEach((k, i) => k.classList.toggle('isi', i < s.tugasSelesai));
    if (jejakKantor !== s.kantor * 1000 + s.kantorTerbuka) bangunDaftarKantor();

    const tujuan = K.infoKantor(s.kantorTerbuka + 1);
    const hargaSewa = K.harga(s, 'sewa');
    el.sewa.textContent = '';
    const label = document.createElement('span');
    label.textContent = `Sewa ${tujuan.label}`;
    const hb = document.createElement('b');
    hb.textContent = K.format(hargaSewa);
    el.sewa.append(label, tokenSvg(12), hb);
    el.sewa.disabled = !K.bisaBeli(s, 'sewa');
    el.sewa.title = el.sewa.disabled ? `Kurang ${K.format(hargaSewa - s.token)} token` : `Sewa ${tujuan.label} dan pindah ke sana`;

    for (const id of K.URUTAN) {
      const c = catatan[id];
      const p = K.PERAN[id];
      const a = s.agen[id];
      c.kartu.classList.toggle('terkunci', !a.rekrut);
      c.nama.textContent = p.nama.replace('Agen ', '');
      if (a.rekrut) {
        c.lv.textContent = ` Lv ${a.lv}`;
        c.nama.appendChild(c.lv);
        c.ket.textContent = `${p.tugas}, kecepatan ${Math.round(K.kecepatanKerja(s, id))}`;
        c.label.textContent = 'Naik level';
        c.hargaB.textContent = K.format(K.harga(s, 'level', id));
        c.tombol.disabled = !K.bisaBeli(s, 'level', id);
      } else {
        c.ket.textContent = `${p.tugas}. Tiap tugas jadi lebih berharga.`;
        c.label.textContent = 'Rekrut';
        c.hargaB.textContent = K.format(K.harga(s, 'rekrut', id));
        c.tombol.disabled = !K.bisaBeli(s, 'rekrut', id);
      }
    }

    isiTombolBaris(el.gpu, 'GPU', s.gpu, '+10% kecepatan semua agen', K.format(K.harga(s, 'gpu')), K.bisaBeli(s, 'gpu'));
    isiTombolBaris(el.memori, 'Memori', s.memori, '+12% token tiap tugas', K.format(K.harga(s, 'memori')), K.bisaBeli(s, 'memori'));
  }

  function posisikanPanel() {
    const w = el.panel.offsetWidth;
    const h = el.panel.offsetHeight;
    const hud = el.hud.getBoundingClientRect();
    const x = Math.min(Math.max(hud.left, 8), window.innerWidth - w - 8);
    const y = Math.max(8, hud.top - h - 10);
    el.panel.style.left = `${Math.round(x)}px`;
    el.panel.style.top = `${Math.round(y)}px`;
  }

  let timerTutup = null;
  function bukaPanel() {
    el.panel.hidden = false;
    el.panel.classList.remove('buka');
    void el.panel.offsetWidth;
    el.panel.classList.add('buka');
    perbaruiPanel();
    posisikanPanel();
    jadwalTutup();
  }
  function tutupPanel() {
    el.panel.hidden = true;
    clearTimeout(timerTutup);
    diPanel = false;
    perbaruiTembus();
  }
  function jadwalTutup() {
    clearTimeout(timerTutup);
    timerTutup = setTimeout(() => {
      if (!diPanel) tutupPanel();
    }, 15000);
  }
  el.tutup.addEventListener('click', tutupPanel);
  el.panel.addEventListener('mouseleave', jadwalTutup);
  el.hud.addEventListener('click', () => (el.panel.hidden ? bukaPanel() : tutupPanel()));

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
        pesan('Waktunya istirahat 5 menit. Tim agen juga ngopi dulu.', { durasi: 4500 });
      } else {
        pomo = { fase: 'fokus', akhir: sekarang + FOKUS };
        pesan('Istirahat selesai. Ayo fokus 25 menit lagi!', { durasi: 4500 });
      }
    }
    const sisa = Math.max(0, pomo.akhir - sekarang);
    el.pomo.hidden = false;
    el.pomo.classList.toggle('istirahat', pomo.fase === 'istirahat');
    el.pomo.textContent = `${pomo.fase === 'fokus' ? 'Fokus' : 'Istirahat'} ${Math.floor(sisa / 60000)}:${String(Math.floor((sisa % 60000) / 1000)).padStart(2, '0')}`;
  }

  // ---------- Kursor & klik ----------
  let tembus = true;
  let diPanel = false;
  let diHud = false;
  let agenDiKursor = null;

  function setTembus(v) {
    if (v === tembus) return;
    tembus = v;
    desk.setTembusKlik(v);
  }
  function perbaruiTembus() {
    setTembus(!(diPanel || diHud || agenDiKursor));
    document.body.style.cursor = agenDiKursor ? 'pointer' : '';
  }

  function agenDi(x, y) {
    const lantai = lantaiY();
    if (y > lantai + 2 || y < lantai - 24 * SKALA) return null;
    for (const id of d.peran) {
      const ax = arena.x + d.agen[id].x;
      if (Math.abs(x - ax) <= 7 * SKALA) return id;
    }
    return null;
  }

  document.addEventListener('mousemove', (e) => {
    diPanel = !el.panel.hidden && !!e.target.closest && !!e.target.closest('#panel');
    diHud = !!e.target.closest && !!e.target.closest('#hud');
    agenDiKursor = diPanel || diHud ? null : agenDi(e.clientX, e.clientY);
    perbaruiTembus();
  });
  document.addEventListener('mouseleave', () => {
    diPanel = false;
    diHud = false;
    agenDiKursor = null;
    perbaruiTembus();
  });

  document.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !agenDiKursor) return;
    const id = agenDiKursor;
    const nama = K.PERAN[id].nama;
    if (K.semangati(d, id)) {
      pesan(`${nama} makin semangat! Kerja 60% lebih cepat selama 15 detik.`, { x: d.agen[id].x });
      for (let i = 0; i < 6; i++) tambahBintang(d.agen[id].x, 0);
    } else {
      pesan(`${nama} masih semangat, coba lagi sebentar lagi.`, { x: d.agen[id].x, durasi: 1800 });
    }
  });

  // ---------- Efek kanvas ----------
  function tambahBintang(xArena, tinggiSprite, warna) {
    efek.push({
      jenis: 'bintang', x: xArena + (Math.random() - 0.5) * 40, y: -(tinggiSprite || 10 + Math.random() * 12) * SKALA,
      vy: -20 - Math.random() * 20, umur: 0, maks: 0.9, warna: warna || '#ffe27a',
    });
  }

  function tambahAngka(xArena, teks) {
    efek.push({ jenis: 'angka', x: xArena, y: -24 * SKALA, vy: -26, umur: 0, maks: 1.4, teks });
  }

  // ---------- Masukan dari proses utama ----------
  desk.onAksi((n) => {
    K.tambahAksi(s, d, n, Date.now());
  });
  desk.onPengaturan((baru) => {
    const posisiLama = pengaturan.posisi;
    pengaturan = baru;
    if (baru.posisi !== posisiLama) {
      hitungArena();
      if (!el.panel.hidden) posisikanPanel();
    }
    cekPomodoro(Date.now());
  });
  desk.onSimpanSekarang(() => {
    simpan();
    desk.siapKeluar();
  });
  desk.onReset(() => {
    s = K.baru(Date.now());
    const lebar = d.lebar;
    Object.keys(d.agen).forEach((id) => delete d.agen[id]);
    Object.keys(d.meja).forEach((id) => delete d.meja[id]);
    Object.keys(d.antrian).forEach((id) => delete d.antrian[id]);
    d.kartu = [];
    K.ubahLebar(s, d, lebar);
    simpan();
    jejakKantor = -1;
    perbaruiPanel();
    pesan('Progres dimulai ulang. Kembali ke garasi!');
  });
  desk.onBukaPanel(bukaPanel);

  // ---------- Detak per detik ----------
  function tik() {
    const sekarang = Date.now();
    cekPomodoro(sekarang);
    if (sekarang - terakhirSimpan > 15000) simpan();
    perbaruiPanel();
  }

  function tanganiKejadian(daftar) {
    for (const e of daftar) {
      if (e.jenis === 'rilis') {
        nyalaRoket = 0.7;
        tambahAngka(e.x, `+${K.format(Math.max(1, e.nilai))}`);
        for (let i = 0; i < 4; i++) tambahBintang(e.x, 14, '#ffcf4a');
      } else if (e.jenis === 'misi') {
        pesan(`Misi selesai! Bonus untuk tim.`, { token: e.bonus, x: d.rilisX });
        simpan();
      } else if (e.jenis === 'temuan') {
        pesan(`${K.PERAN[e.id].nama.replace('Agen ', '')}: ${e.teks}`, { token: e.bonus, x: d.agen[e.id].x });
      }
    }
  }

  // ---------- Gambar ----------
  let waktuLalu = performance.now();
  let dtGambar = 0;
  function bingkai() {
    const kini = performance.now();
    const dt = Math.min((kini - waktuLalu) / 1000, 1);
    waktuLalu = kini;
    tanganiKejadian(K.langkah(s, d, dt, { istirahat: !!(pomo && pomo.fase === 'istirahat') }));
    nyalaRoket = Math.max(0, nyalaRoket - dt);
    for (const f of efek) {
      f.umur += dt;
      f.y += f.vy * dt;
    }
    for (let i = efek.length - 1; i >= 0; i--) if (efek[i].umur >= efek[i].maks) efek.splice(i, 1);
    dtGambar += dt;
    if (document.hidden) return;
    gambar(d.waktu);
  }

  function gambar(t) {
    const S = Math.max(1, Math.round(SKALA * dpr));
    const H = window.innerHeight;
    const ax = arena.x;
    const ly = lantaiY();
    const px = (x) => Math.round((ax + x) * dpr);
    const py = (y) => Math.round(y * dpr);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, py(H - TINGGI_STRIP), el.kanvas.width, py(TINGGI_STRIP) + 2);
    ctx.imageSmoothingEnabled = false;

    // lantai kantor
    SP.gambarLantai(ctx, px(0), py(ly), S, arena.lebar, K.infoKantor(s.kantor).lantai, t);

    // kotak masuk
    SP.gambarKotakMasuk(ctx, px(d.masukX), py(ly), S, t);

    const istirahat = !!(pomo && pomo.fase === 'istirahat');
    const diMeja = (a) => (a.keadaan === 'diam' || a.keadaan === 'kerja' || a.keadaan === 'istirahat')
      && Math.abs(a.x - d.meja[a.id].x) < 1;

    const opsiRobot = (a) => {
      const jalan = a.keadaan === 'antar' || a.keadaan === 'kembali' || a.keadaan === 'jalan';
      let wajah = 'biasa';
      if (a.keadaan === 'istirahat' || istirahat) wajah = 'tidur';
      else if (a.senang > 0) wajah = 'senang';
      else if (a.keadaan === 'kerja') wajah = 'kerja';
      const kedipSeed = (t + K.URUTAN.indexOf(a.id) * 1.3) % 4.5;
      return {
        peran: a.id, wajah, jalan, fase: a.fase, angkat: a.keadaan === 'antar',
        lirik: jalan ? a.arah : 0, kedip: wajah === 'biasa' && kedipSeed < 0.15,
        lampu: a.semangat > 0 && Math.floor(t * 6) % 2 === 0,
      };
    };

    // robot di belakang meja, lalu mejanya
    for (const id of d.peran) {
      const a = d.agen[id];
      // duduk di balik meja: badan sedikit naik supaya wajah terlihat
      if (diMeja(a)) SP.gambarRobot(ctx, px(a.x), py(ly - 5 * SKALA), S, opsiRobot(a));
    }
    for (const id of d.peran) {
      const a = d.agen[id];
      SP.gambarMeja(ctx, px(d.meja[id].x + 4 * SKALA), py(ly), S, id, d.antrian[id].length, t, a.keadaan === 'kerja');
      if (diMeja(a) && (a.keadaan === 'istirahat' || istirahat)) {
        SP.gambarKopi(ctx, px(d.meja[id].x - 7 * SKALA), py(ly - 9 * SKALA), S, t);
      }
    }

    // roket rilis
    SP.gambarRoket(ctx, px(d.rilisX), py(ly), S, nyalaRoket, t);

    // kartu yang meluncur dari kotak masuk
    for (const k of d.kartu) {
      if (k.di !== 'meluncur') continue;
      const naik = Math.sin(t * 6 + k.id) * 1.5;
      SP.gambarKartu(ctx, px(k.x), py(ly - 8 * SKALA + naik), S, k.peran);
    }

    // robot yang sedang berjalan (di depan meja) + kartu yang dibawa
    for (const id of d.peran) {
      const a = d.agen[id];
      if (diMeja(a)) continue;
      SP.gambarRobot(ctx, px(a.x), py(ly), S, opsiRobot(a));
      if (a.keadaan === 'antar' && a.kartu) {
        const berikut = d.peran[d.peran.indexOf(a.kartu.peran) + 1];
        SP.gambarKartu(ctx, px(a.x), py(ly - 19 * SKALA), S, berikut || 'rilis');
      }
    }

    // bilah progres kerja
    for (const id of d.peran) {
      const a = d.agen[id];
      if (a.keadaan === 'kerja' && a.kartu) {
        SP.gambarProgres(ctx, px(a.x), py(ly - 26 * SKALA), S, a.kartu.progres / a.kartu.kerja, SP.WARNA_PERAN[id]);
      }
      if (a.semangat > 0 && Math.random() < 0.08) tambahBintang(a.x, 18);
    }

    // efek
    for (const f of efek) {
      const alfa = Math.max(0, 1 - f.umur / f.maks);
      if (f.jenis === 'bintang') {
        SP.gambarBintang(ctx, px(f.x), py(ly + f.y), S, f.warna, alfa);
      } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = alfa;
        ctx.font = `${Math.round(20 * dpr)}px VT323, Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.lineWidth = Math.max(2, 3 * dpr);
        ctx.strokeStyle = '#2a2622';
        ctx.strokeText(f.teks, px(f.x), py(ly + f.y));
        ctx.fillStyle = '#ffd25a';
        ctx.fillText(f.teks, px(f.x), py(ly + f.y));
        ctx.globalAlpha = 1;
      }
    }
  }

  // ---------- Mulai ----------
  bangunTim();
  const off = K.offline(s, Date.now());
  if (off.token > 0) {
    pesan('Selama kamu pergi, tim tetap bekerja.', { token: off.token, durasi: 6000 });
  } else if (s.statistik.tugasTotal === 0) {
    pesan('Halo! Kami tim Agen Mini. Klik papan kecil di kiri untuk melihat tim dan upgrade.', { durasi: 7000, x: 120 });
  }
  perbaruiPanel();
  simpan();
  setInterval(tik, 1000);
  setInterval(bingkai, 33);
  bingkai();

  window.__agen = { s: () => s, d, K, bukaPanel, pesan, gambar };
})();
