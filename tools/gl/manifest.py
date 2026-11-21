"""Pack manifest, subpack slider, pack settings and pack icon."""
from __future__ import annotations

import numpy as np

from .common import NAMESPACE, PACK, hex_rgb, save_png, smoothstep, write_json

VERSION = "1.0.0"
MIN_ENGINE = "1.26.60"
HEADER_UUID = "d40ea3f5-8088-4cc3-b1c5-4a8c3064aa96"   # fixed forever: the pack's identity
MODULE_UUID = "08719ba7-8455-4f7c-a646-374e1ebe0dbd"

DESCRIPTION = "Warm light, cool air. Shader-era skies, haze, water and glow for Fancy graphics."

# Format 3 manifests take memory_performance_tier (0 to 5) and refuse the older memory_tier. The game picks
# the highest tier the device supports as the default, so Balanced gets 1 (every device) and the others 0,
# which also keeps every preset selectable on every device.
SUBPACKS = [
    {"folder_name": "clear", "name": "Clear air", "memory_performance_tier": 0},
    {"folder_name": "balanced", "name": "Balanced haze", "memory_performance_tier": 1},
    {"folder_name": "mist", "name": "Deep mist", "memory_performance_tier": 0},
    {"folder_name": "golden", "name": "Golden hour skybox (fixed sky)", "memory_performance_tier": 0},
    {"folder_name": "starlit", "name": "Starlit night skybox (fixed sky)", "memory_performance_tier": 0},
]

SETTINGS = [
    {"type": "label",
     "text": "§6Gloamlight§r: haze and sky presets live on the subpack slider. These two settings control the glow effects."},
    {"type": "slider", "name": f"{NAMESPACE}:glow", "text": "Glow around torch and candle flames",
     "min": 0, "max": 2, "step": 0.25, "default": 1},
    {"type": "toggle", "name": f"{NAMESPACE}:fireflies", "text": "Glowing fireflies", "default": True},
]


def manifest():
    return {
        "format_version": 3,
        "header": {
            "name": "Gloamlight",
            "description": DESCRIPTION,
            "uuid": HEADER_UUID,
            "version": VERSION,
            "min_engine_version": MIN_ENGINE,
        },
        "modules": [{"type": "resources", "uuid": MODULE_UUID, "version": VERSION}],
        "metadata": {
            "authors": ["SyntaxGhost404"],
            "url": "https://github.com/SyntaxGhost404/Enchant-MCBE/tree/gloamlight",
        },
        "subpacks": SUBPACKS,
        "settings": SETTINGS,
    }


def pack_icon(size=256):
    """A dusk over water: the moment the pack is named after."""
    y, x = np.mgrid[0:size, 0:size] / (size - 1)
    horizon = 0.60
    sun_x, sun_y, sun_r = 0.62, horizon - 0.035, 0.085
    zen, mid, low = hex_rgb("#132038"), hex_rgb("#3E5878"), hex_rgb("#EC9A50")
    t = np.clip(y / horizon, 0, 1)
    sky = zen + (mid - zen) * smoothstep(0.0, 0.7, t)[..., None]
    sky = sky + (low - sky) * smoothstep(0.55, 1.0, t)[..., None]
    d = np.hypot((x - sun_x) * 1.0, (y - sun_y) * 1.0)
    glow = 0.55 * np.exp(-d / 0.10) + 0.25 * np.exp(-d / 0.28)
    sky = sky + glow[..., None] * hex_rgb("#FFC27A")
    disc = 1 - smoothstep(sun_r - 0.004, sun_r + 0.004, d)
    sky = sky * (1 - disc[..., None]) + disc[..., None] * hex_rgb("#FFF1D2")
    img = sky
    # blocky hills: a stepped silhouette on 16 columns, the only nod to the game's geometry
    cols = 16
    heights = np.array([0.50, 0.50, 0.47, 0.47, 0.44, 0.44, 0.47, 0.52, 0.55, 0.55, 0.53, 0.50, 0.46, 0.46, 0.49, 0.53])
    col = np.minimum((x * cols).astype(int), cols - 1)
    land = (y > heights[col]) & (y < horizon)
    img[land] = hex_rgb("#141A24") + (hex_rgb("#232C38") - hex_rgb("#141A24")) * ((y[land] - 0.44) / 0.16)[..., None]
    # water: darker mirror of the sky with a broken sun path
    water = y >= horizon
    my = 2 * horizon - y
    mirror = np.clip(img[np.clip((my * (size - 1)).astype(int), 0, size - 1), (x * (size - 1)).astype(int)], 0, 1)
    rows = (y * size).astype(int)
    ripple = (np.sin(rows * 1.7) * 0.5 + 0.5) ** 3
    path = np.exp(-((x - sun_x) / (0.05 + (y - horizon) * 0.35)) ** 2) * ripple
    water_rgb = mirror * 0.55 + hex_rgb("#101833") * 0.30 + path[..., None] * hex_rgb("#FFD08A") * 0.75
    img = np.where(water[..., None], water_rgb, img)
    # rounded-square mask, so the icon sits well in the pack list
    r = 0.12
    qx = np.maximum(np.abs(x - 0.5) - (0.5 - r), 0)
    qy = np.maximum(np.abs(y - 0.5) - (0.5 - r), 0)
    alpha = 1 - smoothstep(r - 0.006, r, np.hypot(qx, qy))
    return np.concatenate([np.clip(img, 0, 1), alpha[..., None]], axis=-1)


def build():
    write_json(PACK / "manifest.json", manifest())
    save_png(PACK / "pack_icon.png", pack_icon(), dither=True)
    return {"version": VERSION, "subpacks": [s["folder_name"] for s in SUBPACKS]}
