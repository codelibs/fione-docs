#!/usr/bin/env python3
"""Generate the default Open Graph / social share image (public/og-image.png).

Self-contained: only Pillow and system fonts. 1200x630 is the canonical OG size.
Regenerate:
    uv run --with pillow python scripts/make_og_image.py
"""

from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG = (255, 255, 255)
BRAND = (47, 84, 200)  # #2f54c8, the theme colour
INK = (28, 31, 38)
GRAY = (96, 103, 117)

BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
REG = "/System/Library/Fonts/Supplemental/Arial.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    if os.path.exists(path):
        return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def main() -> int:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 12], fill=BRAND)

    # The logo: a rounded square with an "F" and a dot, as in public/fione-logo.svg.
    x, y, s = 90, 90, 150
    k = s / 32
    d.rounded_rectangle([x, y, x + s, y + s], radius=int(8 * k), fill=BRAND)
    w = int(3.2 * k)
    d.line([(x + 10 * k, y + 23 * k), (x + 10 * k, y + 9 * k), (x + 22 * k, y + 9 * k)], fill="white", width=w, joint="curve")
    d.line([(x + 10 * k, y + 16 * k), (x + 19 * k, y + 16 * k)], fill="white", width=w)
    r = 2.4 * k
    d.ellipse([x + 22.5 * k - r, y + 22 * k - r, x + 22.5 * k + r, y + 22 * k + r], fill="white")

    d.text((90, 290), "Fione", font=font(BOLD, 120), fill=INK)
    d.text((90, 440), "Open-source AutoML server", font=font(REG, 52), fill=GRAY)
    d.text((90, 520), "fione.codelibs.org", font=font(REG, 38), fill=BRAND)

    out = os.path.join(os.path.dirname(__file__), "..", "public", "og-image.png")
    img.save(out, optimize=True)
    print(os.path.normpath(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
