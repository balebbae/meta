"""Image helpers for Photo Proof synthesis: seven-segment digits, device bezels, procedural backgrounds and
camera effects (perspective, glare, moire, motion blur, JPEG). PIL + numpy only.

Every function takes its randomness from the caller (`random.Random` and/or `numpy.random.Generator`), so a
dataset built from one seed is byte-for-byte reproducible on the same machine (same fonts installed).
"""

from __future__ import annotations

import io
import math
import random
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT_DIRS = ["/usr/share/fonts/truetype/dejavu", "/usr/share/fonts/truetype/liberation", "/usr/share/fonts/truetype/ubuntu"]


@lru_cache(maxsize=1)
def fonts() -> tuple[list[str], list[str]]:
    """(bold, regular) TrueType font paths, sorted so the choice is deterministic for a seed."""
    bold, regular = [], []
    for d in FONT_DIRS:
        p = Path(d)
        if not p.exists():
            continue
        for f in sorted(p.glob("*.ttf")):
            if "[" in f.name or "Serif" in f.name or f.name.startswith("Ubuntu-Th") or "-L" in f.name or "-C" in f.name:
                continue
            (bold if ("Bold" in f.name or "-B" in f.name or "-M." in f.name) else regular).append(str(f))
    return bold, regular


@lru_cache(maxsize=256)
def _load_font(path: str, size: int):
    return ImageFont.truetype(path, size)


def font(rng: random.Random, size: int, bold: bool = True):
    b, r = fonts()
    pool = (b if bold else r) or b or r
    return _load_font(rng.choice(pool), max(8, int(size))) if pool else ImageFont.load_default()


def text_w(f, s: str) -> float:
    return f.getlength(s) if hasattr(f, "getlength") else len(s) * 8


# ---------------------------------------------------------------- seven-segment LCD digits

_SEGS = {
    "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd",
    "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg", "-": "g", " ": "",
}  # fmt: skip


def seg7_width(text: str, h: float) -> float:
    w = 0.0
    for ch in text:
        w += h * (0.62 if ch in _SEGS else 0.26)
    return w


def _hseg(cx, cy, L, t):
    return [(cx - L / 2, cy), (cx - L / 2 + t / 2, cy - t / 2), (cx + L / 2 - t / 2, cy - t / 2),
            (cx + L / 2, cy), (cx + L / 2 - t / 2, cy + t / 2), (cx - L / 2 + t / 2, cy + t / 2)]  # fmt: skip


def _vseg(cx, cy, L, t):
    return [(cx, cy - L / 2), (cx + t / 2, cy - L / 2 + t / 2), (cx + t / 2, cy + L / 2 - t / 2),
            (cx, cy + L / 2), (cx - t / 2, cy + L / 2 - t / 2), (cx - t / 2, cy - L / 2 + t / 2)]  # fmt: skip


def draw_seg7(d: ImageDraw.ImageDraw, xy, text: str, h: float, fill, ghost=None, skew: float = 0.08) -> float:
    """Draw `text` (digits, ':', '.', ',', '-', ' ') as seven-segment LCD glyphs. Returns the advance width.

    `ghost` draws the unlit segments faintly, like a real reflective LCD; `skew` italicises the glyphs.
    """
    x0, y0 = xy
    W, t, gap = h * 0.5, h * 0.12, h * 0.025
    base = y0 + h

    def poly(pts, color):
        d.polygon([(x + (base - y) * skew, y) for x, y in pts], fill=color)

    x = x0
    for ch in text:
        if ch in _SEGS:
            segs = {
                "a": _hseg(x + W / 2, y0 + t / 2, W - 2 * gap, t),
                "g": _hseg(x + W / 2, y0 + h / 2, W - 2 * gap, t),
                "d": _hseg(x + W / 2, y0 + h - t / 2, W - 2 * gap, t),
                "f": _vseg(x + t / 2, y0 + h / 4 + t / 4, h / 2 - t / 2 - 2 * gap, t),
                "b": _vseg(x + W - t / 2, y0 + h / 4 + t / 4, h / 2 - t / 2 - 2 * gap, t),
                "e": _vseg(x + t / 2, y0 + 3 * h / 4 - t / 4, h / 2 - t / 2 - 2 * gap, t),
                "c": _vseg(x + W - t / 2, y0 + 3 * h / 4 - t / 4, h / 2 - t / 2 - 2 * gap, t),
            }
            for name, pts in segs.items():
                if name in _SEGS[ch]:
                    poly(pts, fill)
                elif ghost is not None:
                    poly(pts, ghost)
            x += h * 0.62
        else:
            r = t * 0.6
            cx = x + h * 0.1
            if ch == ":":
                for cy in (y0 + h * 0.3, y0 + h * 0.7):
                    poly([(cx - r, cy - r), (cx + r, cy - r), (cx + r, cy + r), (cx - r, cy + r)], fill)
            elif ch in ".,":
                cy = y0 + h - r
                poly([(cx - r, cy - r), (cx + r, cy - r), (cx + r, cy + r), (cx - r, cy + r)], fill)
                if ch == ",":
                    poly([(cx, cy + r), (cx + r, cy + r), (cx - r * 0.5, cy + 2.5 * r)], fill)
            x += h * 0.26
    return x - x0


def seg7_ok(text: str) -> bool:
    return all(ch in _SEGS or ch in ":.," for ch in text)


# ---------------------------------------------------------------- screen layout

STYLES = {
    # name: (background, foreground, accent, ghost-segment colour or None)
    "lcd_blue": ((10, 22, 48), (120, 220, 255), (255, 190, 60), (22, 40, 70)),
    "lcd_red": ((14, 6, 6), (255, 60, 40), (255, 160, 60), (40, 14, 12)),
    "lcd_green": ((6, 18, 8), (90, 255, 120), (220, 255, 120), (16, 40, 20)),
    "lcd_grey": ((168, 178, 160), (25, 30, 25), (40, 40, 40), (150, 160, 142)),
    "oled": ((0, 0, 0), (245, 245, 245), (190, 255, 60), None),
    "app_dark": ((22, 22, 26), (240, 240, 240), (255, 120, 60), None),
    "app_light": ((246, 246, 248), (20, 20, 24), (230, 60, 90), None),
}


def _fit(rng: random.Random, size: float, text: str, room: float, bold: bool = True):
    """A font of at most `size` px whose rendering of `text` fits in `room` px."""
    size = int(size)
    f = font(rng, size, bold)
    while text_w(f, text) > room and size > 9:
        size = int(size * 0.9)
        f = _load_font(f.path, size) if hasattr(f, "path") else font(rng, size, bold)
    return f


def render_screen(
    rng: random.Random, size, style: str, title: str, rows, hero=None, seg7: bool = False, pad_frac: float = 0.07
) -> Image.Image:
    """Lay out a device screen. rows: [(label, value, unit)]. hero: (value, unit) drawn large under the title.

    `pad_frac` is the inset on each side (round watch faces need more so nothing is clipped).
    """
    w, h = size
    bg, fg, accent, ghost = STYLES[style]
    img = Image.new("RGB", (w, h), bg)
    d = ImageDraw.Draw(img)
    pad = int(min(w, h) * pad_frac)
    y = pad
    if title:
        tf = _fit(rng, h * rng.uniform(0.06, 0.08), title, w - 2 * pad)
        d.text((pad, y), title, font=tf, fill=accent)
        y += int(h * 0.11)
    if hero:
        val, unit = hero
        uf = font(rng, int(h * 0.06), bold=False)
        hf = _fit(rng, h * 0.17, val, w - 2 * pad - text_w(uf, unit) - 12)
        d.text((pad, y), val, font=hf, fill=fg)
        d.text((pad + text_w(hf, val) + 10, y + h * 0.09), unit, font=uf, fill=accent)
        y += int(h * 0.24)
    if not rows:
        return img
    cols = 2 if (w > h * 1.2 and len(rows) > 2) else 1
    nrows = math.ceil(len(rows) / cols)
    cell_w, cell_h = (w - 2 * pad) / cols, (h - y - pad) / nrows
    lf = font(rng, max(10, int(cell_h * 0.2)), bold=rng.random() < 0.5)
    for i, (label, value, unit) in enumerate(rows):
        cx, cy = pad + (i % cols) * cell_w, y + (i // cols) * cell_h
        if label:
            d.text((cx, cy), label, font=lf, fill=accent)
        vy, vh = cy + cell_h * 0.26, cell_h * 0.58
        uf = font(rng, max(9, int(vh * 0.35)), bold=False)
        room = cell_w - (text_w(uf, unit) + 8 if unit else 0) - 6
        if seg7 and seg7_ok(value):
            hh = min(vh, room / max(seg7_width(value, 1), 0.1))
            g = None
            if ghost is not None and rng.random() < 0.5:  # faint unlit segments, kept well below the lit contrast
                k = rng.uniform(0.25, 0.5)
                g = tuple(int(bc + k * (gc - bc)) for bc, gc in zip(bg, ghost, strict=True))
            adv = draw_seg7(d, (cx, vy + (vh - hh)), value, hh, fg, g)
        else:
            vf = _fit(rng, vh, value, room)
            d.text((cx, vy), value, font=vf, fill=fg)
            adv = text_w(vf, value)
        if unit:
            d.text((cx + adv + 8, vy + vh * 0.5), unit, font=uf, fill=fg)
    return img


# ---------------------------------------------------------------- bezels / devices


def add_bezel(rng: random.Random, screen: Image.Image, device: str) -> Image.Image:
    """Wrap a screen in a device frame (console, watch, watch_round, phone, paper). Returns RGBA, transparent outside."""
    w, h = screen.size
    shade = rng.randint(15, 70)
    frame = (shade, shade, shade + rng.randint(0, 10), 255)
    if device in ("watch", "watch_round"):
        m = int(w * 0.14)
        W, H = w + 2 * m, h + 2 * m + int(h * 0.7)
        out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(out)
        strap = tuple(rng.randint(10, 200) for _ in range(3)) + (255,)
        d.rectangle([W * 0.22, 0, W * 0.78, H], fill=strap)
        top = int(h * 0.35)
        round_face = device == "watch_round"
        box = [0, top, W - 1, top + h + 2 * m]
        (d.ellipse if round_face else d.rounded_rectangle)(box, fill=frame, **({} if round_face else {"radius": m * 2}))
        mask = Image.new("L", (w, h), 0)
        md = ImageDraw.Draw(mask)
        if round_face:
            md.ellipse([0, 0, w - 1, h - 1], fill=255)
        else:
            md.rounded_rectangle([0, 0, w - 1, h - 1], radius=int(w * 0.12), fill=255)
        out.paste(screen, (m, top + m), mask)
        d.rounded_rectangle([W - m * 0.4, top + h * 0.35, W, top + h * 0.6], radius=4, fill=(120, 120, 120, 255))
        return out
    if device == "phone":
        m = int(w * 0.035)
        out = Image.new("RGBA", (w + 2 * m, h + 2 * m), (0, 0, 0, 0))
        d = ImageDraw.Draw(out)
        d.rounded_rectangle([0, 0, w + 2 * m - 1, h + 2 * m - 1], radius=int(w * 0.12), fill=(12, 12, 14, 255))
        mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=int(w * 0.1), fill=255)
        out.paste(screen, (m, m), mask)
        d.rounded_rectangle([w * 0.38, m + 8, w * 0.62 + 2 * m, m + 30], radius=12, fill=(0, 0, 0, 255))
        return out
    if device == "paper":
        out = screen.convert("RGBA")
        d = ImageDraw.Draw(out)
        r = max(4, w // 45)
        for cx, cy in ((r * 2, r * 2), (w - r * 2, r * 2), (r * 2, h - r * 2), (w - r * 2, h - r * 2)):
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(185, 185, 190, 255), outline=(90, 90, 95, 255))
        return out
    # console-style: treadmill, bike computer, rower monitor, appliance
    mx = int(w * rng.uniform(0.08, 0.22))
    my = int(h * rng.uniform(0.1, 0.3))
    W, H = w + 2 * mx, h + 2 * my
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(out)
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=int(min(W, H) * 0.08), fill=frame)
    d.rectangle([mx - 4, my - 4, mx + w + 3, my + h + 3], fill=(5, 5, 5, 255))
    out.paste(screen, (mx, my))
    btn = tuple(rng.randint(40, 230) for _ in range(3)) + (255,)
    n = rng.randint(2, 6)
    for i in range(n):
        bx = mx + (i + 0.5) * w / n
        by = my + h + my * 0.5
        r = min(my * 0.3, w / n * 0.3)
        d.ellipse([bx - r, by - r, bx + r, by + r], fill=btn if i % 2 else (200, 200, 200, 255))
    if rng.random() < 0.6:
        bf = font(rng, max(10, int(my * 0.35)))
        d.text((mx, my * 0.25), rng.choice(["PROFORM", "LIFE", "TRAX", "NORDIC", "CONCEPT", "ECHO", "VELO", "STRIDE"]),
               font=bf, fill=(200, 200, 200, 255))  # fmt: skip
    return out


# ---------------------------------------------------------------- backgrounds


def background(np_rng: np.random.Generator, size, kind: str | None = None) -> Image.Image:
    w, h = size
    kind = kind or str(np_rng.choice(["wood", "rubber", "fabric", "wall", "bokeh", "carpet"]))
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    base = np_rng.uniform(40, 220, size=3)
    if kind == "wood":
        f = np_rng.uniform(0.02, 0.06)
        g = np.sin(xx * f + 4 * np.sin(yy * 0.01 + np_rng.uniform(0, 6))) * 0.5 + 0.5
        tone = np.array([150, 100, 60]) * np_rng.uniform(0.6, 1.2)
        arr = tone[None, None, :] * (0.7 + 0.3 * g[..., None])
    elif kind == "rubber":
        arr = np.full((h, w, 3), np_rng.uniform(20, 60)) + np_rng.normal(0, 6, (h, w, 1))
        speck = np_rng.random((h, w)) < 0.02
        arr[speck] = np_rng.uniform(120, 240, 3)
    elif kind == "fabric":
        weave = (np.sin(xx * 1.3) * np.sin(yy * 1.3)) * 12
        arr = base[None, None, :] + weave[..., None] + np_rng.normal(0, 5, (h, w, 1))
    elif kind == "carpet":
        n = np_rng.normal(0, 1, (h // 4 + 1, w // 4 + 1))
        n = np.kron(n, np.ones((4, 4)))[:h, :w]
        arr = base[None, None, :] * (0.85 + 0.08 * n[..., None])
    elif kind == "bokeh":
        arr = np.tile(base * 0.4, (h, w, 1))
        for _ in range(int(np_rng.integers(6, 18))):
            cx, cy, r = np_rng.uniform(0, w), np_rng.uniform(0, h), np_rng.uniform(20, 120)
            col = np_rng.uniform(60, 255, 3)
            m = np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * r * r)))
            arr = arr * (1 - 0.6 * m[..., None]) + col * 0.6 * m[..., None]
    else:  # wall gradient
        t = (yy / max(h, 1))[..., None]
        arr = base * (1 - t) + np_rng.uniform(40, 220, 3) * t
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


# ---------------------------------------------------------------- camera effects


def _perspective_coeffs(dst, src):
    """Coefficients for Image.transform(PERSPECTIVE): maps output points `dst` back to input points `src`."""
    a = []
    for (x, y), (u, v) in zip(dst, src, strict=True):
        a.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        a.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    b = np.array(src, dtype=np.float64).reshape(8)
    return np.linalg.solve(np.array(a, dtype=np.float64), b).tolist()


def composite(np_rng: np.random.Generator, device: Image.Image, bg: Image.Image, warp: float) -> Image.Image:
    """Paste an RGBA device onto bg with a random perspective warp (`warp` = max corner jitter, fraction of size)."""
    W, H = bg.size
    w, h = device.size
    s = min(W / w, H / h) * np_rng.uniform(0.72, 0.92)
    dw, dh = w * s, h * s
    ox, oy = np_rng.uniform(0, W - dw), np_rng.uniform(0, H - dh)
    quad = [(ox, oy), (ox + dw, oy), (ox + dw, oy + dh), (ox, oy + dh)]
    quad = [(x + np_rng.uniform(-warp, warp) * dw, y + np_rng.uniform(-warp, warp) * dh) for x, y in quad]
    quad = [(min(max(x, 0), W - 1), min(max(y, 0), H - 1)) for x, y in quad]
    coeffs = _perspective_coeffs(quad, [(0, 0), (w, 0), (w, h), (0, h)])
    layer = device.transform((W, H), Image.Transform.PERSPECTIVE, coeffs, Image.Resampling.BILINEAR)
    out = bg.convert("RGBA")
    out.alpha_composite(layer)
    return out.convert("RGB")


def glare(np_rng: np.random.Generator, img: Image.Image, strength: float = 0.6) -> Image.Image:
    a = np.asarray(img, dtype=np.float32)
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    for _ in range(int(np_rng.integers(1, 4))):
        cx, cy = np_rng.uniform(0, w), np_rng.uniform(0, h)
        sx, sy = np_rng.uniform(0.03, 0.2) * w, np_rng.uniform(0.02, 0.12) * h
        th = np_rng.uniform(0, math.pi)
        dx, dy = xx - cx, yy - cy
        u, v = dx * math.cos(th) + dy * math.sin(th), -dx * math.sin(th) + dy * math.cos(th)
        m = np.exp(-(u**2 / (2 * sx * sx) + v**2 / (2 * sy * sy))) * np_rng.uniform(0.3, 1.0) * strength
        a = a + (255 - a) * m[..., None]  # screen blend toward white
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def moire(np_rng: np.random.Generator, img: Image.Image, amp: float = 0.12) -> Image.Image:
    """Two slightly mismatched gratings (camera sensor vs screen pixel grid) beat into moire bands."""
    a = np.asarray(img, dtype=np.float32)
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    f = np_rng.uniform(0.25, 0.45)
    th1, dth = np_rng.uniform(0, math.pi), np_rng.uniform(0.02, 0.08)
    g1 = np.sin(2 * math.pi * f * (xx * math.cos(th1) + yy * math.sin(th1)))
    g2 = np.sin(2 * math.pi * f * 1.03 * (xx * math.cos(th1 + dth) + yy * math.sin(th1 + dth)))
    m = 1 + amp * g1 * g2
    tint = np_rng.uniform(0.85, 1.15, 3)
    return Image.fromarray(np.clip(a * m[..., None] * tint, 0, 255).astype(np.uint8))


def motion_blur(img: Image.Image, length: int, angle_deg: float) -> Image.Image:
    a = np.asarray(img, dtype=np.float32)
    p = length + 1
    pad = np.pad(a, ((p, p), (p, p), (0, 0)), mode="edge")
    h, w = a.shape[:2]
    acc = np.zeros_like(a)
    dx, dy = math.cos(math.radians(angle_deg)), math.sin(math.radians(angle_deg))
    for i in range(length):
        t = i - (length - 1) / 2
        ox, oy = int(round(t * dx)), int(round(t * dy))
        acc += pad[p + oy : p + oy + h, p + ox : p + ox + w]
    return Image.fromarray(np.clip(acc / length, 0, 255).astype(np.uint8))


def jpeg(img: Image.Image, quality: int) -> Image.Image:
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=int(quality))
    buf.seek(0)
    return Image.open(buf).convert("RGB")


def photometric(np_rng: np.random.Generator, img: Image.Image, noise: float) -> Image.Image:
    a = np.asarray(img, dtype=np.float32)
    a = (a - 128) * np_rng.uniform(0.75, 1.2) + 128 + np_rng.uniform(-30, 30)
    a = a * np_rng.uniform(0.88, 1.12, 3)  # white balance cast
    a = a + np_rng.normal(0, noise, a.shape)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def camera(
    rng: random.Random, np_rng: np.random.Generator, device: Image.Image, heavy: bool = False
) -> tuple[Image.Image, list[str], float]:
    """Photograph a device: background + perspective + glare/blur/noise/JPEG. Returns (image, effects, penalty).

    `penalty` (0..~0.25) is how much the effects should lower the model's confidence.
    """
    fx, pen = [], 0.0
    w, h = device.size
    scale = rng.uniform(1.15, 1.6)
    bg = background(np_rng, (int(w * scale), int(h * scale)))
    warp = rng.uniform(0.0, 0.12)
    img = composite(np_rng, device, bg, warp)
    fx.append(f"warp{warp:.2f}")
    if rng.random() < 0.4 or heavy:
        img = glare(np_rng, img, strength=1.0 if heavy else rng.uniform(0.3, 0.7))
        fx.append("glare")
        pen += 0.05
    if rng.random() < 0.3 or heavy:
        L = rng.randint(14, 30) if heavy else rng.randint(3, 9)
        img = motion_blur(img, L, rng.uniform(0, 180))
        fx.append(f"motion{L}")
        pen += 0.05 if L > 6 else 0.0
    if heavy:  # illegible: blur radius scales with the frame so digits can't be read at any size
        img = img.filter(ImageFilter.GaussianBlur(max(img.size) * rng.uniform(0.012, 0.018)))
        fx.append("defocus")
    elif rng.random() < 0.25:
        img = img.filter(ImageFilter.GaussianBlur(rng.uniform(0.4, 1.4)))
        fx.append("defocus")
    img = photometric(np_rng, img, noise=rng.uniform(1, 8))
    target = rng.choice([640, 768, 896])
    s = target / max(img.size)
    img = img.resize((max(1, int(img.width * s)), max(1, int(img.height * s))), Image.Resampling.LANCZOS)
    if rng.random() < 0.7:
        q = rng.randint(25, 90)
        img = jpeg(img, q)
        fx.append(f"jpeg{q}")
        pen += 0.05 if q < 40 else 0.0
    return img, fx, pen
