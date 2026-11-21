"""Sun, moon phases and End sky.

The Fancy renderer draws the sun and moon as single quads whose texture is multiplied by a
time-of-day colour and added to the sky (black is invisible). So the quad can carry far more than a
disc: a bloom that the engine itself brightens at sunrise and sunset. Everything must fade to pure
black before the quad's edge, or the square would show.
"""
from __future__ import annotations

import numpy as np

from .common import PACK, hex_rgb, periodic_blur, periodic_fbm, save_png, smoothstep
from .palette import MOON_HALO, MOON_LIGHT, SUN_CORE, SUN_GLOW_INNER, SUN_GLOW_OUTER, SUN_LIMB


def _radial(size):
    c = (size - 1) / 2.0
    y, x = np.mgrid[0:size, 0:size]
    dx, dy = (x - c) / (size / 2.0), (y - c) / (size / 2.0)
    return np.sqrt(dx * dx + dy * dy), np.arctan2(dy, dx)


def sun(size=1024, disc=0.155):
    r, ang = _radial(size)
    px = 2.0 / size
    core, limb = hex_rgb(SUN_CORE), hex_rgb(SUN_LIMB)
    inner, outer = hex_rgb(SUN_GLOW_INNER), hex_rgb(SUN_GLOW_OUTER)

    # disc with limb darkening, anti-aliased edge
    t = np.clip(r / disc, 0, 1)
    mu = np.sqrt(np.clip(1 - t * t, 0, 1))
    limb_dark = 1 - 0.55 * (1 - mu)
    disc_mask = 1 - smoothstep(disc - 1.5 * px, disc + 0.5 * px, r)
    disc_rgb = (limb + (core - limb) * limb_dark[..., None]) * (0.78 + 0.22 * limb_dark[..., None])

    # bloom: a tight hot ring, a medium amber glow and a wide faint aura, all windowed to zero by r = 0.97
    d = np.clip(r - disc, 0, None)
    rng = np.random.default_rng(11)
    streak = periodic_fbm((size,), (24,), 3, rng)  # angular variation, wraps around the circle
    ai = ((ang + np.pi) / (2 * np.pi) * size).astype(int) % size
    streak = 0.88 + 0.24 * streak[ai]
    tight = 0.46 * np.exp(-d / 0.028)
    medium = 0.30 * np.exp(-d / 0.10) * streak
    wide = 0.13 * np.exp(-(r / 0.46) ** 2)
    window = 1 - smoothstep(0.58, 0.97, r)
    glow_rgb = (tight[..., None] * inner + medium[..., None] * (inner * 0.55 + outer * 0.45) + wide[..., None] * outer)
    glow_rgb = glow_rgb * window[..., None]

    img = disc_rgb * disc_mask[..., None] + glow_rgb * (1 - disc_mask[..., None] * 0.85)
    img[r >= 0.995] = 0
    save_png(PACK / "textures/environment/sun.png", img, dither=True)
    return img


# ---------------------------------------------------------------- moon

def _hash3(ix, iy, iz, seed):
    h = (ix * 374761393 + iy * 668265263 + iz * 2147483647 + seed * 1274126177) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFFFF) / float(0xFFFFFF)


def _noise3(p, seed):
    """Smooth value noise in 3D (for the moon's surface, which is a sphere, so no tiling needed)."""
    x, y, z = p[..., 0], p[..., 1], p[..., 2]
    ix, iy, iz = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64), np.floor(z).astype(np.int64)
    fx, fy, fz = x - ix, y - iy, z - iz
    u = fx * fx * (3 - 2 * fx); v = fy * fy * (3 - 2 * fy); w = fz * fz * (3 - 2 * fz)
    out = 0
    for dz in (0, 1):
        for dy in (0, 1):
            for dx in (0, 1):
                h = _hash3(ix + dx, iy + dy, iz + dz, seed)
                out = out + h * (u if dx else 1 - u) * (v if dy else 1 - v) * (w if dz else 1 - w)
    return out


def _fbm3(p, octaves, seed, freq=1.0):
    total, amp, norm = 0, 1.0, 0
    for o in range(octaves):
        total = total + amp * _noise3(p * freq * (2 ** o), seed + o * 31)
        norm += amp; amp *= 0.5
    return total / norm


def _moon_albedo(n):
    """Albedo on the unit sphere: bright highlands, dark smooth maria, craters with bright rims."""
    maria_field = _fbm3(n * 1.7 + 3.1, 4, 5)
    maria = smoothstep(0.52, 0.60, maria_field)
    highland = 0.80 + 0.10 * (_fbm3(n * 6.0, 4, 9) - 0.5) * 2
    albedo = highland * (1 - 0.38 * maria)
    albedo += 0.05 * (_fbm3(n * 22.0, 3, 21) - 0.5) * 2
    rng = np.random.default_rng(42)
    for _ in range(140):
        c = rng.normal(size=3); c /= np.linalg.norm(c)
        rad = 0.025 + 0.11 * rng.random() ** 3
        cosd = np.clip(n @ c, -1, 1)
        dist = np.arccos(cosd) / rad
        floor = (dist < 0.85) * (0.10 + 0.08 * rng.random())
        rim = np.exp(-((dist - 1.0) / 0.12) ** 2) * (0.10 + 0.10 * rng.random())
        albedo = albedo - floor * (1 - smoothstep(0.6, 0.9, dist)) + rim
        if rad > 0.08:  # rays from the youngest big craters
            ray_noise = _fbm3(n * 30.0 + c * 7, 2, 77)
            rays = np.clip((ray_noise - 0.62) * 3, 0, 1) * np.exp(-np.clip(dist - 1, 0, None) / 2.5) * (dist > 1)
            albedo = albedo + 0.06 * rays
    return np.clip(albedo, 0.25, 1.0)


def moon_phases(cell=512, disc=0.25):
    # Bedrock's layout (from vanilla moon_phases.png): full, then lit on the left from gibbous to
    # crescent, new, then lit on the right from crescent to gibbous.
    phases = [(0, 0), (50, -1), (90, -1), (132, -1), (180, 0), (132, 1), (90, 1), (50, 1)]
    out = np.zeros((cell * 2, cell * 4, 3))
    light, halo_c = hex_rgb(MOON_LIGHT), hex_rgb(MOON_HALO)
    r, ang = _radial(cell)
    inside = r < disc
    yy, xx = np.mgrid[0:cell, 0:cell]
    c = (cell - 1) / 2.0
    sx = (xx - c) / (cell / 2.0) / disc
    sy = -(yy - c) / (cell / 2.0) / disc
    sz = np.sqrt(np.clip(1 - sx * sx - sy * sy, 0, 1))
    normals = np.stack([sx, sy, sz], axis=-1)
    albedo = np.zeros((cell, cell))
    albedo[inside] = _moon_albedo(normals[inside])
    px = 2.0 / cell
    edge = 1 - smoothstep(disc - 1.5 * px, disc + 0.5 * px, r)

    for i, (deg, side) in enumerate(phases):
        a = np.radians(deg)
        L = np.array([side * np.sin(a), 0.0, np.cos(a)])
        ndl = normals @ L
        lit = smoothstep(-0.04, 0.10, ndl) * np.clip(ndl, 0, 1) ** 0.75
        earthshine = 0.035 * (1 - smoothstep(-0.05, 0.05, ndl))
        surface = albedo[..., None] * (lit[..., None] * light + earthshine[..., None] * np.array([0.55, 0.65, 0.85]))
        surface *= edge[..., None]
        illum = (1 + np.cos(a)) / 2  # lit fraction of the disc
        # halo hugs the lit limb
        dirx, diry = np.cos(ang), -np.sin(ang)
        facing = 0.5 + 0.5 * (dirx * L[0] + diry * L[1]) / max(1e-6, np.hypot(L[0], L[1])) if deg not in (0, 180) else 1.0
        d = np.clip(r - disc, 0, None)
        halo = (0.30 * np.exp(-d / 0.05) + 0.10 * np.exp(-d / 0.18)) * illum * (0.35 + 0.65 * facing)
        halo = halo * (1 - smoothstep(0.55, 0.95, r)) * (1 - edge)
        img = surface + halo[..., None] * halo_c
        img[r >= 0.99] = 0
        row, col = divmod(i, 4)
        out[row * cell:(row + 1) * cell, col * cell:(col + 1) * cell] = img
    save_png(PACK / "textures/environment/moon_phases.png", out, dither=True)
    return out


# ---------------------------------------------------------------- End sky

def end_sky(size=1024):
    """Seamless tile: dark void, faint violet and teal nebula filaments, sparse stars.
    The engine multiplies it by the End's sky colour and repeats it across a box around the camera."""
    rng = np.random.default_rng(23)
    base = periodic_fbm((size, size), (8, 8), 5, rng)
    ridge_src = periodic_fbm((size, size), (12, 12), 5, rng)
    ridged = (1 - np.abs(2 * ridge_src - 1)) ** 4
    hue = periodic_fbm((size, size), (6, 6), 3, rng)
    violet = np.array([0.62, 0.48, 0.86])
    teal = np.array([0.36, 0.66, 0.70])
    dust = np.array([0.80, 0.62, 0.72])
    tint = violet + (teal - violet) * smoothstep(0.35, 0.7, hue)[..., None]
    tint = tint + (dust - tint) * (0.35 * smoothstep(0.6, 0.85, base))[..., None]
    val = 0.12 + 0.06 * base + 0.38 * ridged * smoothstep(0.30, 0.80, base)
    img = val[..., None] * tint

    stars = np.zeros((size, size))
    n = int(size * size * 0.0007)
    ys, xs = rng.integers(0, size, n), rng.integers(0, size, n)
    stars[ys, xs] = rng.random(n) ** 3 * 2.5 + 0.2
    stars = periodic_blur(stars, 0.7) * 6
    bright = np.zeros((size, size))
    m = n // 40
    bright[rng.integers(0, size, m), rng.integers(0, size, m)] = 1.0
    bright = periodic_blur(bright, 1.6) * 40
    img = img + (np.clip(stars, 0, 1) + np.clip(bright, 0, 1) * 0.8)[..., None] * np.array([0.92, 0.94, 1.0])
    save_png(PACK / "textures/environment/end_sky.png", img, dither=True)
    return img


def build():
    sun(); moon_phases(); end_sky()
    return {"sun": 1024, "moon_cell": 512, "end_sky": 1024}
