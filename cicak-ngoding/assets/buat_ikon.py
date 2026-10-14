"""Membuat ikon pixel-art cicak (PNG + ICO) untuk aplikasi dan system tray."""
from PIL import Image, ImageDraw
import math
import os

DIR = os.path.dirname(os.path.abspath(__file__))

BADAN = (210, 193, 148, 255)
GELAP = (169, 149, 104, 255)
MATA = (22, 22, 22, 255)
KILAU = (255, 255, 255, 255)
LATAR = (44, 38, 33, 255)
HIJAU = (156, 207, 110, 255)


def elips(px, cx, cy, rx, ry, warna, n):
    for y in range(n):
        for x in range(n):
            dx = (x + 0.5 - cx) / rx
            dy = (y + 0.5 - cy) / ry
            if dx * dx + dy * dy <= 1:
                px[x, y] = warna


POLA = [
    "................",
    "......bbbb......",
    ".....bbbbbb.....",
    ".....kbbbbk.....",
    "......bbbb......",
    "..b.b.bbbb.b.b..",
    "..bbbbbbbbbbbb..",
    "......bbbb......",
    "......bdbb......",
    "......bbdb......",
    "..bbbbbbbbbbbb..",
    "..b.b.bbbb.b.b..",
    ".......bb.......",
    "........bb......",
    ".........bbb....",
    "...........bb...",
]


def cicak_16():
    """Cicak dilihat dari atas, 16x16 piksel, kepala ke atas."""
    warna = {'b': BADAN, 'd': GELAP, 'k': MATA}
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for y, baris in enumerate(POLA):
        for x, ch in enumerate(baris):
            if ch in warna:
                px[x, y] = warna[ch]
    return img


def main():
    sprite = cicak_16()
    besar = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    ImageDraw.Draw(besar).rounded_rectangle((0, 0, 255, 255), radius=52, fill=LATAR)
    besar.alpha_composite(sprite.resize((224, 224), Image.NEAREST), (16, 16))
    besar.save(os.path.join(DIR, 'icon.png'))
    ukuran = [16, 24, 32, 48, 64, 128, 256]
    besar.save(os.path.join(DIR, 'icon.ico'), sizes=[(u, u) for u in ukuran])
    tray = cicak_16()
    tray.resize((32, 32), Image.NEAREST).save(os.path.join(DIR, 'tray.png'))
    tray.resize((64, 64), Image.NEAREST).save(os.path.join(DIR, 'tray@2x.png'))
    print('ikon dibuat')


if __name__ == '__main__':
    main()
