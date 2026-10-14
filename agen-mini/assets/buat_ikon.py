"""Membuat ikon pixel-art robot Agen Mini (PNG + ICO) untuk aplikasi dan system tray."""
from PIL import Image, ImageDraw
import os

DIR = os.path.dirname(os.path.abspath(__file__))
LATAR = (198, 156, 105, 255)  # gabus

POLA = [
    "................",
    ".......aa.......",
    ".......ss.......",
    ".......s........",
    "..tttttttttttt..",
    ".twwwwwwwwwwwwt.",
    ".twllllllllllwt.",
    ".twlggllllgglwt.",
    ".twlggllllgglwt.",
    ".twllllllllllwt.",
    ".twwwwwwwwwwwwt.",
    "..tddddddddddt..",
    "...tbbbbbbbbt...",
    "...tbbbggbbbt...",
    "...tbbbbbbbbt...",
    "....tt....tt....",
]
WARNA = {
    'a': (108, 192, 112, 255), 's': (125, 135, 150, 255), 't': (35, 40, 51, 255),
    'w': (238, 241, 245, 255), 'l': (27, 35, 49, 255), 'g': (108, 192, 112, 255),
    'd': (205, 212, 221, 255), 'b': (211, 218, 227, 255),
}


def robot():
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for y, baris in enumerate(POLA):
        for x, ch in enumerate(baris):
            if ch in WARNA:
                px[x, y] = WARNA[ch]
    return img


def main():
    sprite = robot()
    besar = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    ImageDraw.Draw(besar).rounded_rectangle((0, 0, 255, 255), radius=52, fill=LATAR)
    besar.alpha_composite(sprite.resize((224, 224), Image.NEAREST), (16, 16))
    besar.save(os.path.join(DIR, 'icon.png'))
    besar.save(os.path.join(DIR, 'icon.ico'), sizes=[(u, u) for u in [16, 24, 32, 48, 64, 128, 256]])
    sprite.resize((32, 32), Image.NEAREST).save(os.path.join(DIR, 'tray.png'))
    sprite.resize((64, 64), Image.NEAREST).save(os.path.join(DIR, 'tray@2x.png'))
    print('ikon dibuat')


if __name__ == '__main__':
    main()
