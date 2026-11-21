"""Animated water.

The game multiplies these grey flipbooks by each biome's water colour and opacity, so the texture
carries light and motion, not colour: darker troughs, brighter crests, sun glints and a moving caustic
web, all built from waves whose wave numbers and frequencies are whole numbers, so every frame tiles
and the last frame flows back into the first. Mean brightness stays close to vanilla's so the biome
colours keep their intended strength.
"""
from __future__ import annotations

import numpy as np

from .common import PACK, periodic_blur, periodic_value_noise, save_png, smoothstep, write_json


def _wave_set(rng, count, kmin, kmax, wind_deg=-35, spread=70, slope=1.6, speed=1.4):
    comps = []
    while len(comps) < count:
        ang = np.radians(wind_deg + rng.normal(0, spread / 2))
        kmag = rng.uniform(kmin, kmax)
        kx, ky = int(round(kmag * np.cos(ang))), int(round(kmag * np.sin(ang)))
        if kx == 0 and ky == 0:
            continue
        k = np.hypot(kx, ky)
        n = max(1, int(round(speed * np.sqrt(k))))       # deep-water dispersion: omega ~ sqrt(k)
        amp = k ** (-slope) * rng.uniform(0.6, 1.0)
        comps.append((kx, ky, n * (1 if rng.random() > 0.15 else -1), amp, rng.uniform(0, 2 * np.pi)))
    return comps


def _height(comps, X, Y, t):
    h = np.zeros_like(X); hx = np.zeros_like(X); hy = np.zeros_like(X)
    for kx, ky, n, a, ph in comps:
        arg = 2 * np.pi * (kx * X + ky * Y - n * t) + ph
        h += a * np.cos(arg)
        s = -a * np.sin(arg) * 2 * np.pi
        hx += s * kx; hy += s * ky
    return h, hx, hy


def _caustics(hx, hy, size, strength, supersample=2):
    """Refraction caustics: push a fine grid of light rays sideways by the surface slope and count
    where they land. Where rays converge the floor would be bright: that web, wrapped at the edges."""
    n = size * supersample
    g = (np.arange(n) + 0.5) / n
    GX, GY = np.meshgrid(g, g)
    sx = np.repeat(np.repeat(hx, supersample, 0), supersample, 1)
    sy = np.repeat(np.repeat(hy, supersample, 0), supersample, 1)
    px = (GX + strength * sx) % 1.0 * size
    py = (GY + strength * sy) % 1.0 * size
    x0, y0 = np.floor(px).astype(int), np.floor(py).astype(int)
    fx, fy = px - x0, py - y0
    dens = np.zeros((size, size))
    for dx, dy, w in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
        np.add.at(dens, ((y0 + dy) % size, (x0 + dx) % size), w)
    dens = periodic_blur(dens, 0.55)
    return dens / dens.mean() - 1.0


def still(size=64, frames=64, seed=3):
    rng = np.random.default_rng(seed)
    # Waves come from every direction (spread 180 degrees) and none spans the whole tile, so the
    # one-block repeat dissolves into an even, living surface instead of a visible grid.
    big = _wave_set(rng, 20, 3.0, 7.0, spread=180, slope=1.0, speed=1.2)    # swell
    small = _wave_set(rng, 12, 7.0, 14.0, spread=180, slope=1.9, speed=1.6)  # chop: catches the glints
    comps = big + small
    g = np.arange(size) / size
    X, Y = np.meshgrid(g, g)
    ripple = periodic_value_noise((frames, size, size), (8, 16, 16), rng)
    sparkle_zone = periodic_value_noise((frames, size, size), (4, 3, 3), rng)
    L = np.array([-0.38, -0.46, 0.80]); L /= np.linalg.norm(L)
    H = L + np.array([0, 0, 1.0]); H /= np.linalg.norm(H)
    out = np.zeros((frames * size, size, 4))
    norm_amp = sum(c[3] for c in comps)
    for f in range(frames):
        t = f / frames
        h, hx, hy = _height(comps, X, Y, t)
        h /= norm_amp; hx /= norm_amp; hy /= norm_amp
        rip = ripple[f] - 0.5
        hx = hx + 0.35 * (np.roll(rip, -1, 1) - np.roll(rip, 1, 1)) * size * 0.01
        hy = hy + 0.35 * (np.roll(rip, -1, 0) - np.roll(rip, 1, 0)) * size * 0.01
        nrm = np.stack([-hx * 0.085, -hy * 0.085, np.ones_like(hx)], -1)
        nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
        diffuse = nrm @ L
        spec = np.clip(nrm @ H, 0, 1) ** 60 * smoothstep(0.45, 0.75, sparkle_zone[f])
        caus = np.clip(_caustics(hx, hy, size, 0.0045), 0, 2.5)
        bright = 0.58 + 0.60 * (diffuse - diffuse.mean()) + 0.05 * h
        bright += 0.20 * caus
        bright += 0.40 * spec
        bright = np.clip(bright, 0.42, 1.0)
        alpha = np.clip(0.80 + 0.50 * (bright - 0.66), 0.72, 0.97)
        frame = np.zeros((size, size, 4))
        frame[..., :3] = bright[..., None]
        frame[..., 3] = alpha
        out[f * size:(f + 1) * size] = frame
    # keep the average brightness at vanilla's level so biome colours keep their strength
    out[..., :3] = np.clip(out[..., :3] * (0.66 / out[..., 0].mean()), 0, 1)
    return out


def flowing(size=128, frames=48, seed=5):
    """Streaks along the flow (texture y), translating one full tile per loop."""
    rng = np.random.default_rng(seed)
    g = np.arange(size) / size
    X, Y = np.meshgrid(g, g)
    comps = []
    while len(comps) < 18:
        kx = int(rng.integers(-12, 13)); ky = int(rng.integers(1, 4))
        if kx == 0:
            continue
        comps.append((kx, ky, rng.uniform(0.5, 1.0) / np.hypot(kx, ky) ** 1.2, rng.uniform(0, 2 * np.pi)))
    streak_lat = rng.random((8, 48))
    out = np.zeros((frames * size, size, 4))
    norm_amp = sum(c[2] for c in comps)
    for f in range(frames):
        t = f / frames
        h = np.zeros_like(X); hx = np.zeros_like(X)
        for kx, ky, a, ph in comps:
            arg = 2 * np.pi * (kx * X + ky * (Y - t)) + ph
            h += a * np.cos(arg); hx += -a * np.sin(arg) * 2 * np.pi * kx
        h /= norm_amp; hx /= norm_amp
        # long foam streaks: noise stretched along y, carried downstream
        yy = ((Y - t) % 1.0) * streak_lat.shape[0]
        xx = X * streak_lat.shape[1]
        y0, x0 = np.floor(yy).astype(int), np.floor(xx).astype(int)
        fy, fx = yy - y0, xx - x0
        fy = fy * fy * (3 - 2 * fy); fx = fx * fx * (3 - 2 * fx)
        lat = streak_lat
        y1, x1 = (y0 + 1) % lat.shape[0], (x0 + 1) % lat.shape[1]
        y0, x0 = y0 % lat.shape[0], x0 % lat.shape[1]
        streak = (lat[y0, x0] * (1 - fx) + lat[y0, x1] * fx) * (1 - fy) + (lat[y1, x0] * (1 - fx) + lat[y1, x1] * fx) * fy
        foam = smoothstep(0.68, 0.92, streak)
        bright = 0.60 + 0.16 * h - 0.010 * hx + 0.22 * foam
        bright = np.clip(bright, 0.40, 1.0)
        frame = np.zeros((size, size, 4))
        frame[..., :3] = bright[..., None]
        frame[..., 3] = np.clip(0.90 + 0.10 * foam, 0, 1)
        out[f * size:(f + 1) * size] = frame
    return out


def build():
    s = still()
    save_png(PACK / "textures/blocks/water_still_grey.png", s, dither=True, seed=31)
    save_png(PACK / "textures/blocks/cauldron_water.png", s, dither=True, seed=32)
    fl = flowing()
    save_png(PACK / "textures/blocks/water_flow_grey.png", fl, dither=True, seed=33)
    flipbooks = [
            {"flipbook_texture": "textures/blocks/water_still_grey", "atlas_tile": "still_water_grey",
             "ticks_per_frame": 2, "blend_frames": True},
            {"flipbook_texture": "textures/blocks/water_flow_grey", "atlas_tile": "flowing_water_grey",
             "ticks_per_frame": 1, "replicate": 2, "blend_frames": True},
            {"flipbook_texture": "textures/blocks/cauldron_water", "atlas_tile": "cauldron_water",
             "ticks_per_frame": 2, "blend_frames": True},
    ]
    # merged with vanilla's list by the game, so only the entries that change are listed
    write_json(PACK / "textures/flipbook_textures.json", flipbooks)
    return {"still_mean": round(float(s[..., 0].mean()), 3), "still_alpha": round(float(s[..., 3].mean()), 3),
            "flow_mean": round(float(fl[..., 0].mean()), 3)}
