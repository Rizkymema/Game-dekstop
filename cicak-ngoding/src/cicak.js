// Gambar pixel-art: cicak dilihat dari punggung (seperti cicak di dinding), nyamuk, dan teks melayang.
// Koordinat lokal sprite: kepala menghadap +x, sumbu badan di antara baris -1 dan 0.
(function (root) {
  'use strict';

  const WARNA = {
    badan: '#d6c597',
    gelap: '#a48f62',
    tepi: '#5b4c31',
    mata: '#111111',
    kilau: '#ffffff',
    lidah: '#ff7d9c',
  };
  const TEPI = { badan: WARNA.tepi, gelap: WARNA.tepi, mata: WARNA.tepi, kilau: WARNA.tepi };

  // Matriks rotasi tepat untuk 0/90/180/270 derajat, supaya piksel tetap tajam.
  const ROT = {
    0: [1, 0, 0, 1],
    90: [0, 1, -1, 0],
    180: [-1, 0, 0, -1],
    270: [0, -1, 1, 0],
  };

  // Batas sprite dalam piksel lokal (untuk hit test dan jarak ke tepi layar).
  const BATAS = { belakang: -21, depan: 18, samping: 8 };

  let ctx = null;

  function p(x, y, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  }

  function blok(x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  }

  function elips(cx, cy, rx, ry, c) {
    ctx.fillStyle = c;
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  function garis(x0, y0, x1, y1, c) {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    ctx.fillStyle = c;
    for (let i = 0; i < 64; i++) {
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  function kaki(sx, sy, fx, fy, arah, w) {
    garis(sx, sy, fx, fy, w.badan);
    // jari-jari melebar
    p(fx - 1, fy + arah, w.gelap);
    p(fx, fy + arah, w.gelap);
    p(fx + 1, fy + arah, w.gelap);
  }

  // Menggambar bentuk cicak. w = peta warna (normal, atau semuanya warna tepi untuk garis luar).
  function bentuk(o, w, lengkap) {
    const g1 = o.gerak ? Math.round(Math.sin(o.fase)) : 0;
    const g2 = -g1;
    const panik = o.panik ? Math.round(Math.sin(o.fase * 2)) : 0;

    // Kaki: pasangan diagonal bergerak bersamaan
    kaki(6, -3, 8 + g1 + panik, -6, -1, w); // depan atas
    kaki(-3, -3, -5 + g2 - panik, -6, -1, w); // belakang atas
    kaki(6, 2, 8 + g2 - panik, 5, 1, w); // depan bawah
    kaki(-3, 2, -5 + g1 + panik, 5, 1, w); // belakang bawah

    // Ekor meruncing dan bergoyang
    for (let x = -5; x >= -20; x--) {
      const t = (-5 - x) / 15;
      const tebal = t < 0.2 ? 4 : t < 0.55 ? 2 : 1;
      const geser = Math.round(Math.sin(o.ekor + x * 0.45) * 2.4 * t);
      const atas = -Math.ceil(tebal / 2);
      const belang = lengkap && (x === -9 || x === -13 || x === -17);
      blok(x, atas + geser, 1, tebal, belang ? w.gelap : w.badan);
    }

    // Badan, leher, kepala, moncong
    elips(2, 0, 7.5, 2.7, w.badan);
    elips(8.5, 0, 2.5, 2.2, w.badan);
    elips(11.5, 0, 3.4, 3.0, w.badan);
    elips(14.5, 0, 2.0, 1.9, w.badan);

    if (!lengkap) {
      // garis luar juga mencakup mata yang menonjol
      blok(11, -4, 2, 2, w.mata);
      blok(11, 2, 2, 2, w.mata);
      return;
    }

    // Bintik punggung
    for (const [x, y] of [[-3, -1], [0, 0], [3, -1], [6, 0], [-1, -2], [2, 1]]) p(x, y, w.gelap);

    // Mata menonjol di sisi kepala
    if (o.tidur) {
      blok(11, -3, 2, 1, w.gelap);
      blok(11, 2, 2, 1, w.gelap);
    } else {
      blok(11, -4, 2, 2, w.mata);
      blok(11, 2, 2, 2, w.mata);
      p(12, -4, w.kilau);
      p(12, 2, w.kilau);
    }
  }

  function pasang(o, dx, dy) {
    const [a, b, c, d] = ROT[o.sudut];
    const s = o.skala;
    const ox = Math.round(o.x) + (a * dx + c * dy) * s;
    const oy = Math.round(o.y) + (b * dx + d * dy) * s;
    ctx.setTransform(a * s, b * s, c * s, d * s, ox, oy);
  }

  // o: { x, y (piksel perangkat), sudut, skala (piksel perangkat per piksel sprite), fase, ekor, gerak, tidur, panik }
  function gambarCicak(context, o) {
    ctx = context;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      pasang(o, dx, dy);
      bentuk(o, TEPI, false);
    }
    pasang(o, 0, 0);
    bentuk(o, WARNA, true);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // Titik lokal -> layar
  function keLayar(o, lx, ly) {
    const [a, b, c, d] = ROT[o.sudut];
    return { x: o.x + o.skala * (a * lx + c * ly), y: o.y + o.skala * (b * lx + d * ly) };
  }

  function mulut(o) {
    return keLayar(o, 16.5, 0);
  }

  function kotak(o) {
    const sudut = [
      keLayar(o, BATAS.belakang, -BATAS.samping),
      keLayar(o, BATAS.depan, -BATAS.samping),
      keLayar(o, BATAS.belakang, BATAS.samping),
      keLayar(o, BATAS.depan, BATAS.samping),
    ];
    const xs = sudut.map((t) => t.x);
    const ys = sudut.map((t) => t.y);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  }

  function gambarLidah(context, dari, ke, skala) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.strokeStyle = WARNA.lidah;
    context.lineWidth = Math.max(2, skala);
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(dari.x, dari.y);
    context.lineTo(ke.x, ke.y);
    context.stroke();
  }

  // Nyamuk Aedes: badan belang hitam-putih, sayap berkepak, garis luar terang
  // supaya tetap terlihat di latar gelap maupun terang.
  function bentukNyamuk(kepak, w) {
    if (kepak) {
      blok(-1, -4, 3, 3, w.sayap);
    } else {
      blok(-5, -2, 4, 2, w.sayap);
      blok(2, -2, 4, 2, w.sayap);
    }
    blok(-2, 0, 5, 2, w.hitam);
    p(-1, 0, w.putih);
    p(1, 0, w.putih);
    p(-1, 1, w.putih);
    p(1, 1, w.putih);
    p(3, 0, w.hitam);
    p(4, 1, w.hitam);
    for (const dx of [-2, 0, 2]) p(dx, 2, w.hitam);
    p(-3, 3, w.hitam);
    p(3, 3, w.hitam);
  }

  function gambarNyamuk(context, x, y, skala, t) {
    ctx = context;
    const kepak = Math.floor(t * 22) % 2;
    const terang = 'rgba(255, 255, 255, 0.85)';
    const garisLuar = { hitam: terang, putih: terang, sayap: terang };
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.setTransform(skala, 0, 0, skala, Math.round(x) + dx * skala, Math.round(y) + dy * skala);
      bentukNyamuk(kepak, garisLuar);
    }
    ctx.setTransform(skala, 0, 0, skala, Math.round(x), Math.round(y));
    bentukNyamuk(kepak, { hitam: '#111111', putih: '#f4f4f4', sayap: 'rgba(196, 220, 250, 0.95)' });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function gambarTeks(context, teks, x, y, warna, ukuran, alfa) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = alfa;
    context.font = `bold ${ukuran}px Consolas, "Cascadia Mono", "Courier New", monospace`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineWidth = Math.max(2, ukuran / 5);
    context.strokeStyle = 'rgba(20, 16, 12, 0.85)';
    context.strokeText(teks, x, y);
    context.fillStyle = warna;
    context.fillText(teks, x, y);
    context.globalAlpha = 1;
  }

  root.Cicak = { BATAS, gambarCicak, gambarNyamuk, gambarLidah, gambarTeks, mulut, kotak, keLayar };
})(typeof window !== 'undefined' ? window : globalThis);
