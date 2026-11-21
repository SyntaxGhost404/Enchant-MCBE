"""Biome colormaps.

Grass and leaves everywhere are tinted from these maps. Vanilla's greens run from neon lime (hot and
wet) to a sickly yellow (dry); Gloamlight grades every map with the same rule, so the whole world
reads as one palette: the strongest chroma is compressed, lime leans toward emerald, sallow greens
lean toward golden olive, and lightness barely moves so nothing gets darker overall.
"""
from __future__ import annotations

import numpy as np
from PIL import Image

from .common import PACK, oklab_to_srgb, save_png, smoothstep, srgb_to_oklab, vanilla

MAPS = ["grass", "foliage", "birch", "evergreen", "swamp_grass", "swamp_foliage", "mangrove_swamp_foliage"]


def grade(rgb, chroma_cut=0.24, hue_lime=5.0, hue_sallow=-7.0):
    lab = srgb_to_oklab(rgb)
    L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    C = np.hypot(a, b)
    h = np.degrees(np.arctan2(b, a)) % 360
    # hue: lime (125-150 degrees) toward emerald, sallow yellow-green (95-118) toward golden olive
    dh = hue_lime * smoothstep(118, 128, h) * (1 - smoothstep(148, 158, h))
    dh += hue_sallow * smoothstep(92, 100, h) * (1 - smoothstep(114, 122, h))
    h2 = np.radians(h + dh)
    C2 = C * (1 - chroma_cut * smoothstep(0.09, 0.19, C))
    L2 = L * (1 - 0.035 * smoothstep(0.11, 0.21, C))
    out = np.stack([L2, C2 * np.cos(h2), C2 * np.sin(h2)], axis=-1)
    return np.clip(oklab_to_srgb(out), 0, 1)


def build():
    report = {}
    for name in MAPS:
        src = np.asarray(Image.open(vanilla("textures", "colormap", f"{name}.png")).convert("RGBA")).astype(float) / 255
        rgb = src[..., :3]
        graded = grade(rgb)
        out = np.concatenate([graded, src[..., 3:]], axis=-1)
        save_png(PACK / "textures" / "colormap" / f"{name}.png", out, dither=False)
        report[name] = f"{np.round(rgb.reshape(-1, 3).mean(0) * 255).astype(int).tolist()} -> {np.round(graded.reshape(-1, 3).mean(0) * 255).astype(int).tolist()}"
    return report
