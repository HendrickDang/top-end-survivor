"""Generate Android launcher icons and splash screens from web/icons/icon-512.png.

Usage (from the project root, after `npx cap add android`):
    python3 scripts/make_android_icons.py
Requires: pip install pillow
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = Image.open(ROOT / 'web/icons/icon-512.png').convert('RGBA')
RES = ROOT / 'android/app/src/main/res'
TEAL = (15, 59, 58, 255)
DENSITY = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}


def rounded(img, radius_ratio=0.5):
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *img.size), radius=int(img.size[0] * radius_ratio), fill=255)
    out = img.copy(); out.putalpha(mask); return out


for name, d in DENSITY.items():
    folder = RES / f'mipmap-{name}'
    s = int(48 * d)
    SRC.resize((s, s), Image.LANCZOS).save(folder / 'ic_launcher.png')
    rounded(SRC.resize((s, s), Image.LANCZOS)).save(folder / 'ic_launcher_round.png')
    # adaptive foreground: 108dp canvas, art inside the 72dp safe zone
    fg_size = int(108 * d); art = int(72 * d)
    fg = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
    fg.paste(SRC.resize((art, art), Image.LANCZOS), ((fg_size - art) // 2,) * 2)
    fg.save(folder / 'ic_launcher_foreground.png')

(RES / 'values/ic_launcher_background.xml').write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0F3B3A</color>\n</resources>\n')

# Splash screens: teal background with the icon in the middle.
for folder in RES.glob('drawable*'):
    splash = folder / 'splash.png'
    if not splash.exists():
        continue
    w, h = Image.open(splash).size
    canvas = Image.new('RGBA', (w, h), TEAL)
    art = int(min(w, h) * 0.35)
    icon = rounded(SRC.resize((art, art), Image.LANCZOS), 0.22)
    canvas.paste(icon, ((w - art) // 2, (h - art) // 2), icon)
    canvas.convert('RGB').save(splash)

print('Android icons and splash screens updated.')
