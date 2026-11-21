"""README images, rendered from the pack's own files (not in-game screenshots).

    python tools/previews.py

Writes docs/*.png and docs/water.gif. The haze strips apply each biome's real fog numbers to layered
ridges over its real sky gradient, the water swatches use the real flipbook, tint and opacity.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).parent))
from gl.common import PACK, ROOT, VANILLA, hex_rgb, smoothstep  # noqa: E402
from gl.palette import BIOME_MOOD, MOODS, moods_for_preset  # noqa: E402

DOCS = ROOT / "docs"
BG = (18, 20, 26)
INK = (236, 232, 222)
DIM = (150, 150, 158)


def font(size, weight="Medium"):
    for p in (f"/usr/share/fonts/opentype/inter/Inter-{weight}.otf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def to_img(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def load(rel, base=PACK):
    return np.asarray(Image.open(base / rel).convert("RGBA")).astype(float) / 255


# ---------------------------------------------------------------- haze strips

GROUND = {"nether_wastes": "#6B2A26", "crimson": "#7A1E22", "warped": "#1F5452", "soulsand": "#4E3E33",
          "basalt": "#4A4A4E", "the_end": "#D9D79A"}


def haze_strip(m, w=360, h=150, render_chunks=24):
    """Sky gradient (sky colour at the top, haze at the horizon) and five ridges at 15 to 95 percent of the
    render distance, each mixed into the haze by the mood's linear fog. The Nether has no sky, so its
    background is the haze itself; ground colours follow the dimension."""
    haze = hex_rgb(m.haze)
    y = np.linspace(0, 1, h)[:, None]
    if m.fixed_haze:
        img = np.broadcast_to(haze * (0.75 + 0.25 * y[..., None]), (h, w, 3)).copy()
    else:
        sky = hex_rgb(m.sky or "#7BA4F0")
        t = smoothstep(0.0, 0.62, y)
        img = np.broadcast_to(sky * (1 - t[..., None]) + haze * t[..., None], (h, w, 3)).copy()
    rng = np.random.default_rng(4)
    x = np.linspace(0, 1, w)
    if m.name in GROUND:
        land = hex_rgb(GROUND[m.name])
    else:
        land = np.array([0.30, 0.42, 0.26]) if "ocean" not in m.name else np.array([0.20, 0.36, 0.50])
    for i, dist in enumerate([0.95, 0.75, 0.55, 0.35, 0.15]):
        base_y = 0.48 + i * 0.09
        ridge = base_y - 0.07 * np.sin(x * (3 + i) * np.pi + rng.random() * 6) - 0.03 * np.sin(x * (11 + 3 * i) * np.pi)
        # the engine's fog is linear between start and end (fractions of render distance, or blocks)
        d_units = dist * render_chunks * 16 if m.fixed_haze else dist
        fog = np.clip((d_units - m.haze_start) / max(1e-3, m.haze_end - m.haze_start), 0, 1)
        col = land * (0.85 + 0.15 * i / 4) * (1 - fog) + haze * fog
        mask = y >= ridge[None, :]
        img[mask] = col
    return img


def mood_board():
    order = ["pastoral", "woodland", "gloomwood", "emberwood", "blossom", "boreal", "frostwood", "crystalline",
             "highland", "tropic", "wetland", "dune", "savanna", "ochre", "dreamcap", "ashen",
             "ocean", "warm_ocean", "frozen_ocean", "lush_caves", "nether_wastes", "warped", "soulsand", "the_end"]
    cols, cw, ch = 4, 380, 250
    sheet = Image.new("RGB", (cols * cw + 40, ((len(order) + cols - 1) // cols) * ch + 90), BG)
    d = ImageDraw.Draw(sheet)
    d.text((20, 18), "Gloamlight biome moods: sky, haze over distance, water, underwater", font=font(26, "SemiBold"), fill=INK)
    d.text((20, 54), "Rendered from the pack's fog and client biome values (Balanced preset). Not an in-game screenshot.",
           font=font(16), fill=DIM)
    sand = np.array([0.80, 0.74, 0.58]) * 0.62
    water = load("textures/blocks/water_still_grey.png")
    n = water.shape[1]
    frame = water[:n]
    for k, name in enumerate(order):
        m = MOODS[name]
        x0, y0 = 20 + (k % cols) * cw, 90 + (k // cols) * ch
        strip = haze_strip(m, w=cw - 20, h=150)
        sheet.paste(to_img(strip), (x0, y0))
        if m.fixed_haze:
            d.text((x0, y0 + 172), "No water in the Nether: only the haze changes.", font=font(14), fill=DIM)
        else:
            tint = hex_rgb(m.water)
            a = frame[..., 3:] * m.water_opacity
            sw = np.tile(sand * (1 - a) + frame[..., :3] * tint * a, (1, 3, 1))
            sheet.paste(to_img(sw).resize((170, 56), Image.LANCZOS), (x0, y0 + 156))
            sheet.paste(to_img(np.broadcast_to(hex_rgb(m.under), (56, 170, 3))), (x0 + 190, y0 + 156))
        biomes = [b for b, mm in BIOME_MOOD.items() if mm == name]
        d.text((x0, y0 + 216), name.replace("_", " "), font=font(17, "SemiBold"), fill=INK)
        d.text((x0 + 150, y0 + 219), f"{len(biomes)} biome{'s' if len(biomes) != 1 else ''}", font=font(13), fill=DIM)
    sheet.save(DOCS / "moods.png", optimize=True)


def presets_board():
    names = ["pastoral", "boreal", "tropic", "dune"]
    labels = {"clear": "Clear air", "balanced": "Balanced haze (default)", "mist": "Deep mist"}
    cw, ch = 300, 150
    sheet = Image.new("RGB", (3 * (cw + 20) + 140, len(names) * (ch + 16) + 80), BG)
    d = ImageDraw.Draw(sheet)
    for j, preset in enumerate(["clear", "balanced", "mist"]):
        d.text((140 + j * (cw + 20), 24), labels[preset], font=font(18, "SemiBold"), fill=INK)
        moods = moods_for_preset(preset)
        for i, name in enumerate(names):
            sheet.paste(to_img(haze_strip(moods[name], w=cw, h=ch)), (140 + j * (cw + 20), 60 + i * (ch + 16)))
            if j == 0:
                d.text((20, 60 + i * (ch + 16) + ch // 2 - 10), name, font=font(17), fill=INK)
    sheet.save(DOCS / "presets.png", optimize=True)


# ---------------------------------------------------------------- celestial

def celestial():
    sheet = Image.new("RGB", (1420, 560), BG)
    d = ImageDraw.Draw(sheet)
    sun = load("textures/environment/sun.png")[..., :3]
    s = np.asarray(to_img(sun).resize((340, 340), Image.LANCZOS)).astype(float) / 255
    for i, (label, zen, hor, gain) in enumerate([("Sun at noon", (0.33, 0.55, 0.92), (0.84, 0.89, 0.93), 1.0),
                                                  ("Sun at dusk", (0.18, 0.24, 0.42), (0.96, 0.63, 0.36), 1.3)]):
        t = np.linspace(0, 1, 340)[:, None, None] ** 1.5
        sky = np.array(zen) * (1 - t) + np.array(hor) * t
        img = np.clip(sky + s * gain * np.array([1.0, 0.9, 0.75] if i else [1, 1, 1]), 0, 1)
        sheet.paste(to_img(np.broadcast_to(img, (340, 340, 3))), (20 + i * 360, 60))
        d.text((20 + i * 360, 24), label, font=font(18, "SemiBold"), fill=INK)
    moon = load("textures/environment/moon_phases.png")[..., :3]
    mm = np.asarray(to_img(moon).resize((660, 330), Image.LANCZOS)).astype(float) / 255
    night = np.ones((330, 660, 3)) * np.array([0.02, 0.03, 0.07])
    sheet.paste(to_img(night + mm), (740, 60))
    d.text((740, 24), "Moon phases, in the game's order", font=font(18, "SemiBold"), fill=INK)
    end = load("textures/environment/end_sky.png")[..., :3]
    e = np.asarray(to_img(np.tile(end, (1, 3, 1))).resize((1380, 120), Image.LANCZOS)).astype(float) / 255
    sheet.paste(to_img(e * np.array([0.85, 0.8, 1.0])), (20, 430))
    d.text((20, 404), "End sky, tiled", font=font(18, "SemiBold"), fill=INK)
    sheet.save(DOCS / "celestial.png", optimize=True)


def water_gif():
    still = load("textures/blocks/water_still_grey.png")
    n = still.shape[1]
    frames = still.shape[0] // n
    sand = np.array([0.80, 0.74, 0.58]) * 0.62
    out = []
    for f in range(0, frames, 2):
        fr = still[f * n:(f + 1) * n]
        tiles = []
        for name in ("pastoral", "warm_ocean", "wetland"):
            m = MOODS[name]
            a = np.clip(fr[..., 3:] * m.water_opacity + 0.15, 0, 1)
            tiles.append(np.tile(sand * (1 - a) + fr[..., :3] * hex_rgb(m.water) * a, (3, 3, 1)))
        row = np.concatenate([np.pad(t, ((0, 0), (0, 8), (0, 0)), constant_values=0.07) for t in tiles], axis=1)
        out.append(to_img(row).convert("P", palette=Image.ADAPTIVE, colors=128))
    out[0].save(DOCS / "water.gif", save_all=True, append_images=out[1:], duration=100, loop=0, optimize=True)


def lights_board():
    names = ["torch_on", "soul_torch", "lantern", "soul_lantern", "campfire", "fire_0", "soul_fire_0", "campfire_log_lit"]
    cell = 120
    sheet = Image.new("RGB", (len(names) * (cell + 14) + 130, 2 * (cell + 14) + 40), BG)
    d = ImageDraw.Draw(sheet)
    for i, name in enumerate(names):
        for r, base in enumerate([VANILLA, PACK]):
            im = Image.open(base / f"textures/blocks/{name}.png").convert("RGBA")
            fr = im.crop((0, 0, im.width, im.width)).resize((cell, cell), Image.NEAREST)
            bg = Image.new("RGBA", (cell, cell), (38, 40, 48, 255)); bg.alpha_composite(fr)
            sheet.paste(bg.convert("RGB"), (120 + i * (cell + 14), 30 + r * (cell + 14)))
    d.text((16, 30 + cell // 2 - 10), "Vanilla", font=font(17), fill=DIM)
    d.text((16, 30 + cell + 14 + cell // 2 - 10), "Gloamlight", font=font(17, "SemiBold"), fill=INK)
    sheet.save(DOCS / "lights.png", optimize=True)


# ---------------------------------------------------------------- skyboxes

UP = np.array([0.0, 1.0, 0.0]); FWD = np.array([0.0, 0.0, 1.0]); RIGHT = np.array([-1.0, 0.0, 0.0])
AXES = {0: (FWD, RIGHT, -UP), 1: (RIGHT, -FWD, -UP), 2: (-FWD, -RIGHT, -UP), 3: (-RIGHT, FWD, -UP),
        4: (UP, RIGHT, FWD), 5: (-UP, RIGHT, -FWD)}


def look(faces, yaw, pitch, fov=78, w=760, h=420):
    n = faces[0].shape[0]
    cy, sy, cp, sp = np.cos(np.radians(yaw)), np.sin(np.radians(yaw)), np.cos(np.radians(pitch)), np.sin(np.radians(pitch))
    fwd = np.array([sy * cp, sp, cy * cp]); sr = np.array([-cy, 0, sy]); up = np.cross(sr, fwd)
    t = np.tan(np.radians(fov) / 2)
    ys, xs = np.mgrid[0:h, 0:w]
    sx = (xs + 0.5) / w * 2 - 1; syy = 1 - (ys + 0.5) / h * 2
    dvec = fwd + sx[..., None] * t * sr + syy[..., None] * t * h / w * up
    dvec /= np.linalg.norm(dvec, axis=-1, keepdims=True)
    best = np.full((h, w), -1.0); fidx = np.zeros((h, w), int)
    for i, (nrm, _, _) in AXES.items():
        dn = dvec @ nrm; sel = dn > best; best = np.where(sel, dn, best); fidx = np.where(sel, i, fidx)
    out = np.zeros((h, w, 3))
    for i, (nrm, au, av) in AXES.items():
        msk = fidx == i
        if not msk.any():
            continue
        dd = dvec[msk]; dn = dd @ nrm
        px = np.clip(((dd @ au) / dn + 1) / 2 * n - 0.5, 0, n - 1.001)
        py = np.clip(((dd @ av) / dn + 1) / 2 * n - 0.5, 0, n - 1.001)
        x0, y0 = px.astype(int), py.astype(int); fx, fy = (px - x0)[:, None], (py - y0)[:, None]
        f = faces[i]
        out[msk] = (f[y0, x0] * (1 - fx) * (1 - fy) + f[y0, x0 + 1] * fx * (1 - fy)
                    + f[y0 + 1, x0] * (1 - fx) * fy + f[y0 + 1, x0 + 1] * fx * fy)
    return out


def skyboxes():
    sheet = Image.new("RGB", (2 * 780 + 30, 2 * 470 + 30), BG)
    d = ImageDraw.Draw(sheet)
    for r, (preset, label, views) in enumerate([("golden", "Golden hour skybox", [(0, 7), (65, 32)]),
                                                ("starlit", "Starlit night skybox", [(20, 18), (-44, 48)])]):
        folder = PACK / "subpacks" / preset / "textures/environment/overworld_cubemap"
        faces = [np.asarray(Image.open(folder / f"cubemap_{i}.png").convert("RGB")).astype(float) / 255 for i in range(6)]
        for c, (yaw, pitch) in enumerate(views):
            sheet.paste(to_img(look(faces, yaw, pitch)), (15 + c * 780, 40 + r * 470))
        d.text((15, 10 + r * 470), f"{label} (subpack, fixed sky)", font=font(19, "SemiBold"), fill=INK)
    sheet.save(DOCS / "skyboxes.png", optimize=True)


def main():
    DOCS.mkdir(exist_ok=True)
    for fn in (mood_board, presets_board, celestial, water_gif, lights_board, skyboxes):
        fn()
        print("wrote", fn.__name__)


if __name__ == "__main__":
    main()
