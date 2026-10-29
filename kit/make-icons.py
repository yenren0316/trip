#!/usr/bin/env python3
"""產生行程的主畫面圖示：<資料夾>/icon-512.png 和 <資料夾>/apple-touch-icon.png（180×180）

用法（在 repo 根目錄執行）：
  python3 kit/make-icons.py karuizawa-2026-11 輕 --bg "#0D1B27,#1C334A" --accent "#E2B877"
  python3 kit/make-icons.py sendai-yamagata-2027-01 仙 --bg "#14212C,#243B4C" --fg "#F3E6D0" --serif --lines "#E6B77A"

  --bg      背景漸層色，由左上到右下，可以給 2–4 個
  --fg      字的顏色，預設白色
  --accent  字下方一小段橫線的顏色，不給就不畫
  --lines   淡淡的直線紋路顏色，不給就不畫
  --serif   用明體（預設黑體）

字放在中央 46% 的範圍內，Android 裁成圓形或圓角方形都不會切到。
需要 Pillow（pip install pillow）和一個中文字型（Noto CJK、PingFang、Hiragino 擇一）。
"""
import argparse
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

SIZE = 1024

SANS = [
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc',
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
    '/usr/share/fonts/noto-cjk/NotoSansCJK-Black.ttc',
    '/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc',
    '/System/Library/Fonts/PingFang.ttc',
    '/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc',
]
SERIF = [
    '/usr/share/fonts/opentype/noto/NotoSerifCJK-Black.ttc',
    '/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc',
    '/usr/share/fonts/noto-cjk/NotoSerifCJK-Black.ttc',
    '/System/Library/Fonts/Supplemental/Songti.ttc',
    '/System/Library/Fonts/ヒラギノ明朝 ProN.ttc',
]


def hex_rgb(h):
    h = h.strip().lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def find_font(serif, size):
    paths = [p for p in (SERIF if serif else SANS) if os.path.exists(p)]
    try:
        style = 'serif:weight=black' if serif else 'sans-serif:weight=black'
        out = subprocess.run(['fc-match', '-f', '%{file}', f'{style}:lang=zh-tw'],
                             capture_output=True, text=True, timeout=5).stdout.strip()
        if out:
            paths.append(out)
    except Exception:
        pass
    for p in paths:
        for i in range(8):
            try:
                f = ImageFont.truetype(p, size, index=i)
            except Exception:
                break
            if 'TC' in ' '.join(f.getname()) or not p.endswith('.ttc'):
                return f
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    sys.exit('找不到中文字型，請先安裝 Noto CJK（例如 apt install fonts-noto-cjk）')


def gradient(stops):
    """左上到右下的多段漸層"""
    cols = [hex_rgb(c) for c in stops]
    if len(cols) == 1:
        cols = cols * 2
    small = 256
    img = Image.new('RGB', (small, small))
    px = img.load()
    n = len(cols) - 1
    for y in range(small):
        for x in range(small):
            t = (x * 0.38 + y * 0.92) / (small * 1.30)
            t = min(max(t, 0), 1) * n
            i = min(int(t), n - 1)
            f = t - i
            a, b = cols[i], cols[i + 1]
            px[x, y] = tuple(round(a[k] + (b[k] - a[k]) * f) for k in range(3))
    return img.resize((SIZE, SIZE), Image.BICUBIC)


def glow(img):
    """左上角一點柔光，跟頁面報頭一樣"""
    layer = Image.new('L', (SIZE, SIZE), 0)
    d = ImageDraw.Draw(layer)
    for r in range(SIZE, 0, -8):
        a = int(26 * (1 - r / SIZE) ** 1.6)
        d.ellipse((-r * 0.55, -r * 0.62, r * 0.75, r * 0.58), fill=a)
    white = Image.new('RGB', (SIZE, SIZE), (255, 255, 255))
    return Image.composite(white, img, layer)


def lines(img, color):
    """直線紋路，往下淡出"""
    rgb = hex_rgb(color)
    over = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    step = SIZE // 7
    for x in range(step // 2, SIZE, step):
        for y in range(0, SIZE, 4):
            a = int(46 * max(0, 1 - y / (SIZE * 0.8)))
            d.rectangle((x, y, x + 2, y + 3), fill=rgb + (a,))
    base = img.convert('RGBA')
    base.alpha_composite(over)
    return base.convert('RGB')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('folder')
    ap.add_argument('char')
    ap.add_argument('--bg', required=True)
    ap.add_argument('--fg', default='#FFFFFF')
    ap.add_argument('--accent')
    ap.add_argument('--lines')
    ap.add_argument('--serif', action='store_true')
    a = ap.parse_args()

    img = glow(gradient(a.bg.split(',')))
    if a.lines:
        img = lines(img, a.lines)

    d = ImageDraw.Draw(img)
    font = find_font(a.serif, int(SIZE * 0.46))
    l, t, r, b = d.textbbox((0, 0), a.char, font=font)
    cx, cy = SIZE / 2, SIZE * 0.475
    d.text((cx - (l + r) / 2, cy - (t + b) / 2), a.char, font=font, fill=hex_rgb(a.fg))

    if a.accent:
        w, h = SIZE * 0.13, SIZE * 0.014
        y = cy + (b - t) / 2 + SIZE * 0.075
        d.rounded_rectangle((cx - w / 2, y, cx + w / 2, y + h), radius=h / 2, fill=hex_rgb(a.accent))

    os.makedirs(a.folder, exist_ok=True)
    img.resize((512, 512), Image.LANCZOS).save(os.path.join(a.folder, 'icon-512.png'), optimize=True)
    img.resize((180, 180), Image.LANCZOS).save(os.path.join(a.folder, 'apple-touch-icon.png'), optimize=True)
    print('已產生', os.path.join(a.folder, 'icon-512.png'), '和 apple-touch-icon.png')


if __name__ == '__main__':
    main()
