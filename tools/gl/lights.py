"""Light sources: torches, lanterns, campfires and fire.

Only flame and glow pixels change; sticks, metal and logs stay exactly as Mojang drew them, and every
texture keeps its size, so models and UV layouts are untouched (torch textures in particular do not
scale above 16 x 16 in Bedrock). Each flame family is remapped along one gradient by brightness: warm
flames run deep ember, amber, gold, hot core; soul flames run deep teal to white-cyan; copper flames
run green to mint. The result is hotter cores and richer falloff, so lights read as glowing.
"""
from __future__ import annotations

import colorsys

import numpy as np
from PIL import Image

from .common import PACK, hex_rgb, save_png, vanilla
from .palette import EMBER_AMBER, EMBER_DEEP, EMBER_GOLD, EMBER_HOT, SOUL_CYAN, SOUL_DEEP, SOUL_HOT

# Stops are placed so vanilla's mid-bright flame pixels land on deep amber (or cyan, or green) and only
# the true highlights reach the white-hot core: richer colour, not paler colour.
WARM = [(0.12, EMBER_DEEP), (0.42, "#E2701F"), (0.62, EMBER_AMBER), (0.80, EMBER_GOLD), (0.97, EMBER_HOT)]
SOUL = [(0.15, "#0E6E86"), (0.45, SOUL_DEEP), (0.66, SOUL_CYAN), (0.97, SOUL_HOT)]
COPPER = [(0.20, "#24733C"), (0.48, "#3FAE62"), (0.72, "#8FE6A8"), (0.97, "#EBFFEB")]

FAMILIES = {
    "warm": (WARM, (8, 64), 0.42),
    "soul": (SOUL, (165, 205), 0.45),
    "copper": (COPPER, (100, 150), 0.25),
}

TEXTURES = {
    "warm": ["torch_on", "lantern", "fire_0", "fire_1", "campfire", "campfire_log_lit"],
    "soul": ["soul_torch", "soul_lantern", "soul_fire_0", "soul_fire_1", "soul_campfire", "soul_campfire_log_lit"],
    "copper": ["copper_torch", "copper_lantern", "exposed_copper_lantern", "weathered_copper_lantern",
               "oxidized_copper_lantern"],
}


def _gradient(stops, t):
    t = np.clip(t, 0, 1)
    pos = np.array([p for p, _ in stops])
    cols = np.array([hex_rgb(c) for _, c in stops])
    out = np.empty(t.shape + (3,))
    for ch in range(3):
        out[..., ch] = np.interp(t, pos, cols[:, ch])
    return out


def regrade(rgba, family, mask_override=None):
    stops, (h0, h1), sat_min = FAMILIES[family]
    rgb = rgba[..., :3]
    flat = rgb.reshape(-1, 3)
    hls = np.array([colorsys.rgb_to_hls(*c) for c in flat]).reshape(rgb.shape)
    hue, light, sat = hls[..., 0] * 360, hls[..., 1], hls[..., 2]
    visible = rgba[..., 3] > 0
    flame = visible & (hue >= h0) & (hue <= h1) & (sat >= sat_min) & (light >= 0.30)
    core = visible & (light >= 0.88)                      # white-hot centres of every family
    mask = flame | core
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    heat = np.clip(lum * 1.03, 0, 1)
    if mask_override is not None:
        mask = mask_override & visible
    new = rgb.copy()
    new[mask] = _gradient(stops, heat[mask])
    out = rgba.copy()
    out[..., :3] = new
    return out, mask


def _load(name):
    return np.asarray(Image.open(vanilla("textures", "blocks", f"{name}.png")).convert("RGBA")).astype(float) / 255


def build():
    report = {}
    # every copper lantern shares the plain one's flame pixels; using that mask keeps patina untouched
    _, copper_mask = regrade(_load("copper_lantern"), "copper")
    for family, names in TEXTURES.items():
        for name in names:
            src = _load(name)
            override = copper_mask if name.endswith("copper_lantern") else None
            out, mask = regrade(src, family, override)
            save_png(PACK / "textures" / "blocks" / f"{name}.png", out, dither=False)
            report[name] = int(mask.sum())
    return report
