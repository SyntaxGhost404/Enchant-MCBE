"""Shared helpers for the Gloamlight generators: paths, colour maths, periodic noise, image output."""
from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "pack"
NAMESPACE = "gloamlight"

# Mojang's official vanilla resource pack (github.com/Mojang/bedrock-samples). Needed for the
# client biome files we extend and the few vanilla textures we regrade.
VANILLA = Path(os.environ.get("BEDROCK_SAMPLES", ROOT.parent / "mojang" / "bedrock-samples")) / "resource_pack"


def vanilla(*parts: str) -> Path:
    p = VANILLA.joinpath(*parts)
    if not p.exists():
        raise FileNotFoundError(f"{p} not found. Set BEDROCK_SAMPLES to a checkout of Mojang/bedrock-samples.")
    return p


# ---------------------------------------------------------------- colour

def hex_rgb(h: str) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64) / 255.0


def rgb_hex(c) -> str:
    c = np.clip(np.asarray(c, dtype=np.float64), 0, 1)
    return "#" + "".join(f"{int(round(v * 255)):02X}" for v in c[:3])


def srgb_to_linear(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c):
    c = np.clip(np.asarray(c, dtype=np.float64), 0, None)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


_M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                [0.2119034982, 0.6806995451, 0.1073969566],
                [0.0883024619, 0.2817188376, 0.6299787005]])
_M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                [1.9779984951, -2.4285922050, 0.4505937099],
                [0.0259040371, 0.7827717662, -0.8086757660]])


def srgb_to_oklab(c):
    lin = srgb_to_linear(c)
    lms = np.cbrt(lin @ _M1.T)
    return lms @ _M2.T


def oklab_to_srgb(lab):
    lms = lab @ np.linalg.inv(_M2).T
    lin = (lms ** 3) @ np.linalg.inv(_M1).T
    return linear_to_srgb(lin)


def mix(a, b, t):
    return a + (b - a) * t


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- periodic noise
# Every texture that tiles (water, clouds, End sky) is built from noise that wraps exactly at the
# image edge, so there are no seams. Animated noise also wraps in time, so flipbooks loop cleanly.

def _fade(t):
    return t * t * t * (t * (t * 6 - 15) + 10)


def periodic_value_noise(shape, period, rng, octave_dims=2):
    """Smooth value noise on an integer lattice that repeats every `period` cells.

    shape: output size (h, w) or (t, h, w); period: lattice cells per axis (same length as shape)."""
    period = tuple(int(p) for p in period)
    lattice = rng.random(period)
    coords = [np.linspace(0, p, n, endpoint=False) for n, p in zip(shape, period)]
    grids = np.meshgrid(*coords, indexing="ij")
    out = np.zeros(shape)
    i0 = [np.floor(g).astype(int) for g in grids]
    f = [_fade(g - np.floor(g)) for g in grids]
    dims = len(shape)
    for corner in range(1 << dims):
        idx = []
        w = np.ones(shape)
        for d in range(dims):
            bit = (corner >> d) & 1
            idx.append((i0[d] + bit) % period[d])
            w = w * (f[d] if bit else (1 - f[d]))
        out += w * lattice[tuple(idx)]
    return out


def periodic_fbm(shape, base_period, octaves, rng, gain=0.5, lacunarity=2):
    total = np.zeros(shape)
    amp, norm = 1.0, 0.0
    period = list(base_period)
    for _ in range(octaves):
        total += amp * periodic_value_noise(shape, period, rng)
        norm += amp
        amp *= gain
        period = [p * lacunarity for p in period]
    return total / norm


def periodic_blur(img, sigma):
    """Gaussian blur that wraps around the edges (FFT), for seamless textures. img: (h, w) or (h, w, c)."""
    h, w = img.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    kernel = np.exp(-2 * (np.pi * sigma) ** 2 * (fx ** 2 + fy ** 2))
    if img.ndim == 2:
        return np.real(np.fft.ifft2(np.fft.fft2(img) * kernel))
    return np.stack([np.real(np.fft.ifft2(np.fft.fft2(img[..., c]) * kernel)) for c in range(img.shape[2])], axis=-1)


# ---------------------------------------------------------------- output

def to_uint8(img, dither=True, seed=7):
    img = np.clip(np.asarray(img, dtype=np.float64), 0, 1) * 255.0
    if dither:
        # triangular dither of about one step: removes banding in soft gradients without visible noise
        rng = np.random.default_rng(seed)
        img = img + (rng.random(img.shape) - rng.random(img.shape))
    return np.clip(np.round(img), 0, 255).astype(np.uint8)


def save_png(path: Path, img, mode=None, dither=True, seed=7):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    arr = to_uint8(img, dither=dither, seed=seed)
    if mode is None:
        mode = {2: "L", 3: "RGB", 4: "RGBA"}[arr.shape[2] if arr.ndim == 3 else 2]
    if arr.ndim == 3 and arr.shape[2] == 1:
        arr = arr[..., 0]
    Image.fromarray(arr, mode=mode).save(path, optimize=True)
    return path


def write_json(path: Path, data, indent="\t"):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, indent=indent, ensure_ascii=False)
        f.write("\n")
    return path


def load_json_lenient(path: Path):
    """Vanilla files sometimes carry comments; strip // and /* */ outside strings before parsing."""
    text = Path(path).read_text(encoding="utf-8")
    out, i, n, in_str = [], 0, len(text), False
    while i < n:
        c = text[i]
        if in_str:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(text[i + 1]); i += 2; continue
            if c == '"':
                in_str = False
        elif c == '"':
            in_str = True; out.append(c)
        elif text.startswith("//", i):
            while i < n and text[i] != "\n":
                i += 1
            continue
        elif text.startswith("/*", i):
            j = text.find("*/", i + 2); i = (j + 2) if j >= 0 else n; continue
        else:
            out.append(c)
        i += 1
    return json.loads("".join(out))
