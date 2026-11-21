"""Cloud map and weather sprites.

Fancy clouds are 3D slabs that the game builds from clouds.png: every opaque pixel becomes a cloud
cell, transparent pixels are sky. The renderer colours them itself (white by day, orange at sunrise
and sunset, grey in rain), so the texture is a pure shape mask. It keeps vanilla's 256 x 256 size so
the size of each cell in the world stays exactly as Mojang tuned it; what changes is the shape:
clustered cumulus with clear gaps and wind-stretched streets instead of uniform speckle.
"""
from __future__ import annotations

import numpy as np

from .common import PACK, periodic_blur, save_png, smoothstep


def _periodic_noise_at(x, y, lattice):
    """Sample a periodic value-noise lattice at arbitrary coordinates (lattice units, wraps)."""
    py, px = lattice.shape
    ix, iy = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = x - ix, y - iy
    fx = fx * fx * fx * (fx * (fx * 6 - 15) + 10)
    fy = fy * fy * fy * (fy * (fy * 6 - 15) + 10)
    x0, x1 = ix % px, (ix + 1) % px
    y0, y1 = iy % py, (iy + 1) % py
    a = lattice[y0, x0] * (1 - fx) + lattice[y0, x1] * fx
    b = lattice[y1, x0] * (1 - fx) + lattice[y1, x1] * fx
    return a * (1 - fy) + b * fy


def _fbm_at(u, v, base, octaves, rng, stretch=(1, 1)):
    """fBm sampled at (u, v) in [0, 1) tile units; repeats exactly at the tile edge."""
    total, amp, norm = 0.0, 1.0, 0.0
    for o in range(octaves):
        px, py = base[0] * stretch[0] * 2 ** o, base[1] * stretch[1] * 2 ** o
        lat = rng.random((py, px))
        total = total + amp * _periodic_noise_at(u * px, v * py, lat)
        norm += amp; amp *= 0.5
    return total / norm


def clouds(size=256, coverage=0.40):
    rng = np.random.default_rng(1905)
    v, u = np.mgrid[0:size, 0:size] / size
    # domain warp gives billowy, irregular edges
    wu = _fbm_at(u, v, (12, 12), 3, rng)
    wv = _fbm_at(u, v, (12, 12), 3, rng)
    uu, vv = u + 0.035 * (wu - 0.5), v + 0.035 * (wv - 0.5)
    # lattice cells across x and y: fewer along x makes cells wider than tall, so clouds stretch along
    # the westward wind and line up into streets
    detail = _fbm_at(uu, vv, (14, 22), 4, rng)
    clusters = _fbm_at(u, v, (4, 5), 3, rng)            # cloud fields and clear gaps between them
    field = detail * (0.45 + 1.0 * smoothstep(0.32, 0.68, clusters))
    t = np.quantile(field, 1 - coverage)
    mask = (field > t).astype(float)
    # clean-up: drop lonely cells and fill pinholes (majority vote over the 3x3 neighbourhood, wrapping)
    for _ in range(2):
        nb = sum(np.roll(np.roll(mask, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1))
        mask = np.where(nb >= 5, 1.0, np.where(nb <= 3, 0.0, mask))
    img = np.zeros((size, size, 4))
    img[..., :3] = 1.0
    img[..., 3] = mask
    save_png(PACK / "textures/environment/clouds.png", img, dither=False)
    return mask.mean()


# ---------------------------------------------------------------- weather

def weather(scale=4):
    """Same layout as vanilla weather.png (32 x 32), drawn at `scale` times the resolution:
    rows 0-3 hold eight 4 x 4 snowflakes, rows 4-19 hold eight 4 x 16 rain streaks, and the three
    colour swatches in the bottom-left corner are kept as they are."""
    S = 32 * scale
    img = np.zeros((S, S, 4))
    rng = np.random.default_rng(77)

    # rain: thin, soft, slightly cool streaks; lengths and strengths vary so the downpour has depth
    cw, ch = 4 * scale, 16 * scale
    yy, xx = np.mgrid[0:ch, 0:cw]
    for i in range(8):
        length = 0.55 + 0.45 * rng.random()
        top = (1 - length) * rng.random()
        width = 0.55 + 0.35 * rng.random()
        cx = (cw - 1) / 2 + rng.uniform(-0.6, 0.6)
        across = np.exp(-((xx - cx) / width) ** 2)
        t = (yy / (ch - 1) - top) / length
        along = smoothstep(0.0, 0.25, t) * (1 - smoothstep(0.7, 1.0, t))
        strength = 0.38 + 0.32 * rng.random()
        a = across * along * strength
        col = np.array([0.78, 0.85, 0.94])
        sprite = np.zeros((ch, cw, 4))
        sprite[..., :3] = col
        sprite[..., 3] = a
        img[4 * scale:4 * scale + ch, i * cw:(i + 1) * cw] = sprite

    # snow: soft flakes of three kinds, matching vanilla's order (cross, plus, dot) and repeating
    fw = 4 * scale
    yy, xx = np.mgrid[0:fw, 0:fw]
    c = (fw - 1) / 2
    r = np.hypot(xx - c, yy - c)
    ang = np.arctan2(yy - c, xx - c)
    kinds = ["star", "round", "small", "star", "round", "small", "star", "round"]
    for i, kind in enumerate(kinds):
        if kind == "round":
            a = np.exp(-(r / (fw * 0.22)) ** 2.2)
        elif kind == "small":
            a = np.exp(-(r / (fw * 0.13)) ** 2) * 0.9
        else:
            arms = np.abs(np.cos(3 * ang)) ** 8
            a = np.clip(np.exp(-(r / (fw * 0.16)) ** 2) + arms * np.exp(-(r / (fw * 0.34)) ** 2) * 0.7, 0, 1)
        a = a * (1 - smoothstep(fw * 0.42, fw * 0.5, r))
        sprite = np.zeros((fw, fw, 4))
        sprite[..., :3] = np.array([0.97, 0.98, 1.0])
        sprite[..., 3] = np.clip(a * 0.95, 0, 1)
        img[0:fw, i * fw:(i + 1) * fw] = sprite

    # the swatches vanilla keeps in the corner (purpose unknown, so they stay exactly as they were)
    swatches = [((20, 0), (201, 82, 84)), ((24, 0), (7, 40, 58)), ((28, 0), (35, 31, 31)), ((28, 4), (128, 128, 128))]
    for (row, col), rgb in swatches:
        img[row * scale:(row + 3) * scale, col * scale:(col + 3) * scale, :3] = np.array(rgb) / 255
        img[row * scale:(row + 3) * scale, col * scale:(col + 3) * scale, 3] = 1.0
    save_png(PACK / "textures/environment/weather.png", img, dither=False)


def build():
    cov = clouds()
    weather()
    return {"cloud_coverage": round(float(cov), 3)}
