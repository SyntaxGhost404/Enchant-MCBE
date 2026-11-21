"""Optional fixed skyboxes (subpacks "golden" and "starlit").

In Fancy mode the Overworld cubemap (textures/environment/overworld_cubemap/cubemap_0..5) is drawn
untinted, never changes with the time of day and hides the moving sun and moon. That makes a painted
sky a poor default, so the default pack keeps the live sky. These two presets are for builds and
screenshots with the daylight cycle locked (`/gamerule doDaylightCycle false` and a matching /time).

Faces follow the layout of the game's own menu panorama, which uses the same cubemap material:
0 front, 1 right, 2 back, 3 left (left to right around the horizon), 4 up with its bottom edge
against face 0, 5 down with its top edge against face 0. Every pixel is rendered from its exact view
direction, so the six faces meet without seams.
"""
from __future__ import annotations

import numpy as np

from .common import PACK, hex_rgb, linear_to_srgb, save_png, smoothstep, srgb_to_linear
from .sky import _moon_albedo

UP = np.array([0.0, 1.0, 0.0])
FWD = np.array([0.0, 0.0, 1.0])
RIGHT = np.array([-1.0, 0.0, 0.0])


def face_dirs(face, n, rows=None):
    j0, j1 = rows if rows else (0, n)
    v, u = np.mgrid[j0:j1, 0:n]
    u = (u + 0.5) / n * 2 - 1
    v = (v + 0.5) / n * 2 - 1      # +1 at the bottom of the image
    f, r, up = FWD, RIGHT, UP
    if face == 0:
        d = f[None, None] + u[..., None] * r - v[..., None] * up
    elif face == 1:
        d = r[None, None] - u[..., None] * f - v[..., None] * up
    elif face == 2:
        d = -f[None, None] - u[..., None] * r - v[..., None] * up
    elif face == 3:
        d = -r[None, None] + u[..., None] * f - v[..., None] * up
    elif face == 4:
        d = up[None, None] + u[..., None] * r + v[..., None] * f
    else:
        d = -up[None, None] + u[..., None] * r - v[..., None] * f
    return d / np.linalg.norm(d, axis=-1, keepdims=True)


_LATTICES = {}


def noise2(x, y, seed, period=1024):
    lat = _LATTICES.get((seed, period))
    if lat is None:
        lat = np.random.default_rng(seed).random((period, period))
        _LATTICES[(seed, period)] = lat
    ix, iy = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
    fx, fy = x - ix, y - iy
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
    x0, x1 = ix % period, (ix + 1) % period
    y0, y1 = iy % period, (iy + 1) % period
    a = lat[y0, x0] * (1 - fx) + lat[y0, x1] * fx
    b = lat[y1, x0] * (1 - fx) + lat[y1, x1] * fx
    return a * (1 - fy) + b * fy


def fbm2(x, y, seed, octaves, footprint=None, gain=0.5):
    """fBm whose fine octaves fade out where one pixel covers more than one noise cell (no shimmer
    near the horizon). footprint: noise-space size of one pixel."""
    total, amp, norm, freq = 0.0, 1.0, 0.0, 1.0
    for o in range(octaves):
        w = 1.0 if footprint is None else 1 - smoothstep(0.35, 0.9, footprint * freq)
        total = total + amp * w * noise2(x * freq + o * 17.3, y * freq - o * 9.1, seed + o)
        total = total + amp * (1 - w) * 0.5 if footprint is not None else total
        norm += amp
        amp *= gain; freq *= 2.0
    return total / norm


def lin(h):
    return srgb_to_linear(hex_rgb(h))


def tonemap(rgb):
    return linear_to_srgb(1 - np.exp(-rgb * 1.15))


# ---------------------------------------------------------------- golden hour

SUN = np.array([np.sin(np.radians(20)) * -1, np.sin(np.radians(4)), np.cos(np.radians(20))])
SUN = SUN / np.linalg.norm(SUN)


def golden(d, px_angle):
    y = d[..., 1]
    elev = np.arcsin(np.clip(y, -1, 1))
    mu = np.clip(d @ SUN, -1, 1)
    az_d = np.arctan2(d[..., 0], d[..., 2]); az_s = np.arctan2(SUN[0], SUN[2])
    toward = (1 + np.cos(az_d - az_s)) / 2                       # 1 facing the sun, 0 facing away

    zenith = lin("#1E3F86")
    upper = lin("#3D7AB4")
    sunward = lin("#FFB062")
    antisun = lin("#C8B2A2")                                     # warm beige belt above the Earth's shadow
    shadow_band = lin("#5B6C8C")                                 # the Earth's shadow on the far horizon
    horizon = antisun + (sunward - antisun) * (toward ** 1.6)[..., None]
    up_t = np.exp(-np.clip(elev, 0, None) / 0.20)
    sky = zenith + (upper - zenith) * np.exp(-np.clip(elev, 0, None) / 0.55)[..., None]
    # real dusk skies pass through a pale yellow-green band between gold and blue, not through lilac
    band = np.exp(-((np.degrees(np.clip(elev, 0, None)) - 9) / 7) ** 2) * (0.35 + 0.65 * toward)
    sky = sky + (horizon - sky) * up_t[..., None]
    sky = sky + (lin("#E6E2A8") - sky) * (0.42 * band)[..., None]
    belt = np.exp(-((np.degrees(elev) - 2.5) / 2.2) ** 2) * (1 - toward) ** 2
    sky = sky + (shadow_band - sky) * (0.55 * belt)[..., None]
    # forward scattering around the sun (Henyey-Greenstein) and a tight aureole
    g = 0.78
    hg = (1 - g * g) / (4 * np.pi * (1 + g * g - 2 * g * mu) ** 1.5)
    sky = sky + (0.50 * hg)[..., None] * lin("#FFD890")
    sky = sky + (2.6 * np.exp((mu - 1) / 0.0016))[..., None] * lin("#FFE0A6")
    # below the horizon: haze darkening into the ground (mostly hidden by terrain)
    below = smoothstep(0.0, -0.35, elev)
    sky = sky * (1 - 0.75 * below)[..., None] + (below * 0.2)[..., None] * horizon * 0.3

    # low cloud deck: cumulus and stratocumulus seen from below
    H = 1.0
    up_mask = y > 0.015
    yy = np.where(up_mask, y, 1.0)
    px_, pz_ = d[..., 0] / yy * H, d[..., 2] / yy * H
    dist = H / yy
    foot = dist * px_angle / yy * 0.7
    sx, sz = px_ * 0.85 + 3.0, pz_ * 0.85 - 1.0
    warp = fbm2(sx * 0.5, sz * 0.5, 401, 3, foot * 0.5)
    raw = fbm2(sx + 1.6 * warp, sz * 1.25 + 1.6 * warp, 402, 6, foot)
    dens = 1 - np.abs(2 * raw - 1) * 0.55 - 0.45 * (1 - raw)       # billowy: rounded tops, crisp gaps
    cover = smoothstep(0.66, 0.72, dens)
    sun_xz = np.array([SUN[0], SUN[2]]) / np.hypot(SUN[0], SUN[2])
    raw_s = fbm2(sx + 1.6 * warp + sun_xz[0] * 0.08, sz * 1.25 + 1.6 * warp + sun_xz[1] * 0.10, 402, 6, foot)
    dens_s = 1 - np.abs(2 * raw_s - 1) * 0.55 - 0.45 * (1 - raw_s)
    lit = smoothstep(-0.06, 0.08, dens - dens_s)                          # edges facing the sun catch light
    thin = 1 - smoothstep(0.66, 0.80, dens)                              # silver lining where the cloud is thin
    near_sun = np.clip((mu + 0.2) / 1.2, 0, 1) ** 3
    base = lin("#4C525E") * (0.60 + 0.40 * toward[..., None])           # shaded undersides: cool slate
    warm = lin("#FFB068") * (0.6 + 1.5 * near_sun[..., None])
    cloud = base + (warm - base) * (0.10 + 0.90 * lit[..., None] ** 1.4) * (0.30 + 0.70 * toward[..., None])
    cloud = cloud * (1 - 0.30 * smoothstep(0.72, 0.90, dens))[..., None]   # thick cores darker underneath
    cloud = cloud + (thin * near_sun * 2.6)[..., None] * lin("#FFD089")
    fade = (1 - smoothstep(5.0, 16.0, dist)) * up_mask
    a = cover * fade * 0.96
    sky = sky * (1 - a[..., None]) + cloud * a[..., None]
    # cirrus far above: thin streaks that catch the last light
    H2 = 3.5
    cx, cz = d[..., 0] / yy * H2, d[..., 2] / yy * H2
    streak = fbm2(cx * 0.5 + 9, cz * 2.4, 403, 6, (H2 / yy) * px_angle / yy * 2.4)
    cir = smoothstep(0.60, 0.78, streak) * (1 - smoothstep(5, 18, H2 / yy)) * up_mask * (1 - cover)
    sky = sky + (0.16 * cir)[..., None] * (lin("#FFC690") * toward[..., None] + lin("#B9C2D6") * (1 - toward[..., None]))
    # the sun itself, sitting just above the cloud line
    ang = np.arccos(mu)
    r_sun = np.radians(1.1)
    disc = 1 - smoothstep(r_sun * 0.96, r_sun * 1.04, ang)
    limb = np.sqrt(np.clip(1 - (ang / r_sun) ** 2, 0, 1))
    sky = sky * (1 - disc[..., None]) + disc[..., None] * (lin("#FFE8C0") * (3.2 + 1.8 * limb[..., None]))
    return tonemap(sky)


# ---------------------------------------------------------------- starlit night

GAL_N = np.array([0.55, 0.62, -0.56]); GAL_N /= np.linalg.norm(GAL_N)
GAL_C = np.cross(GAL_N, UP); GAL_C /= np.linalg.norm(GAL_C)
MOON = np.array([0.30, np.sin(np.radians(14)), 0.92]); MOON /= np.linalg.norm(MOON)


def starlit_base(d, px_angle):
    y = d[..., 1]
    elev = np.arcsin(np.clip(y, -1, 1))
    zen, hor = lin("#060B18"), lin("#16223A")
    sky = zen + (hor - zen) * np.exp(-np.clip(elev, 0, None) / 0.22)[..., None]
    sky = sky + (np.exp(-((np.degrees(elev) - 6) / 5) ** 2) * 0.020)[..., None] * lin("#7FA88A")   # faint airglow
    # Milky Way
    b = np.arcsin(np.clip(d @ GAL_N, -1, 1))
    l = np.arctan2(d @ np.cross(GAL_N, GAL_C), d @ GAL_C)
    lx, ly = l * 9.0, b * 9.0
    foot = px_angle * 9.0
    clouds_ = fbm2(lx * 1.3 + 40, ly * 2.2 + 40, 501, 7, foot * 2.2)
    body = np.exp(-(b / 0.12) ** 2) * (0.35 + 0.65 * smoothstep(0.35, 0.75, clouds_)) + 0.25 * np.exp(-(b / 0.30) ** 2)
    lane_n = fbm2(lx * 0.8 + 5, ly * 6.0, 502, 7, foot * 6)
    lanes = smoothstep(0.55, 0.72, lane_n) * np.exp(-((b - 0.015) / 0.035) ** 2)
    core = np.exp(-((l - 0.4) / 0.9) ** 2)
    glow = body * (1 - 0.75 * lanes)
    mw_col = lin("#B4C2E0") * (1 - core[..., None]) + lin("#EADBC0") * core[..., None]
    sky = sky + (glow * (0.075 + 0.085 * core))[..., None] * mw_col
    below = smoothstep(0.0, -0.3, elev)
    sky = sky * (1 - 0.85 * below)[..., None]
    # moon: waxing crescent low in the sky, with earthshine and a halo
    mu = np.clip(d @ MOON, -1, 1)
    ang = np.arccos(mu)
    r_m = np.radians(1.5)
    sky = sky + ((0.06 * np.exp(-(ang - r_m).clip(0) / 0.05) + 0.03 * np.exp(-(ang - r_m).clip(0) / 0.25)) * (ang > r_m * 0.98))[..., None] * lin("#8FA9DC")
    inside = ang < r_m
    if inside.any():
        # local disc coordinates
        t1 = np.cross(UP, MOON); t1 /= np.linalg.norm(t1)
        t2 = np.cross(MOON, t1)
        dd = d[inside]
        x = (dd @ t1) / np.sin(r_m); yv = (dd @ t2) / np.sin(r_m)
        z = np.sqrt(np.clip(1 - x * x - yv * yv, 0, 1))
        nrm = np.stack([x, yv, z], -1)
        alb = _moon_albedo(nrm)
        L = np.array([-np.sin(np.radians(118)), 0.25, np.cos(np.radians(118))]); L /= np.linalg.norm(L)
        ndl = nrm @ L
        litv = smoothstep(-0.04, 0.10, ndl) * np.clip(ndl, 0, 1) ** 0.75
        earth = 0.05 * (1 - smoothstep(-0.05, 0.05, ndl))
        moon_rgb = alb[..., None] * (litv[..., None] * lin("#E4ECF8") * 2.2 + earth[..., None] * lin("#7C8FB8"))
        edge = smoothstep(1.0, 0.94, np.hypot(x, yv))
        sky[inside] = sky[inside] * (1 - edge[..., None]) + moon_rgb * edge[..., None]
    return sky


def stars_on_face(face, n, count=14000, seed=77):
    rng = np.random.default_rng(seed)
    v = rng.normal(size=(count * 3, 3)); v /= np.linalg.norm(v, axis=1, keepdims=True)
    b = np.arcsin(np.clip(v @ GAL_N, -1, 1))
    keep = rng.random(len(v)) < (0.25 + 0.75 * np.exp(-(b / 0.25) ** 2))      # denser along the Milky Way
    v = v[keep][:count]
    mag = rng.random(len(v)) ** 7                                          # many faint, few bright
    temp = rng.random(len(v))
    cols = np.stack([0.85 + 0.15 * temp, 0.88 + 0.06 * np.ones_like(temp), 1.0 - 0.25 * temp], -1)
    img = np.zeros((n, n, 3))
    # project onto this face by inverting face_dirs
    axes = {0: (FWD, RIGHT, -UP), 1: (RIGHT, -FWD, -UP), 2: (-FWD, -RIGHT, -UP), 3: (-RIGHT, FWD, -UP),
            4: (UP, RIGHT, FWD), 5: (-UP, RIGHT, -FWD)}
    nrm, au, av = axes[face]
    dn = v @ nrm
    sel = dn > 0.3
    uu = (v[sel] @ au) / dn[sel]; vv = (v[sel] @ av) / dn[sel]
    ok = (np.abs(uu) < 1) & (np.abs(vv) < 1) & (v[sel][:, 1] > -0.05)
    px = (uu[ok] + 1) / 2 * n - 0.5; py = (vv[ok] + 1) / 2 * n - 0.5
    m = mag[sel][ok] * 3.0 + 0.10; c = cols[sel][ok]
    sigma = 0.75
    for dy in (-2, -1, 0, 1, 2):
        for dx in (-2, -1, 0, 1, 2):
            ix = np.round(px).astype(int) + dx; iy = np.round(py).astype(int) + dy
            w = np.exp(-(((ix - px) ** 2 + (iy - py) ** 2) / (2 * sigma ** 2)))
            inb = (ix >= 0) & (ix < n) & (iy >= 0) & (iy < n)
            np.add.at(img, (iy[inb], ix[inb]), (w[inb] * m[inb])[:, None] * c[inb])
    return img


def render(preset, n=2048, chunk=256, out_root=None):
    px_angle = (np.pi / 2) / n
    out_dir = (out_root or PACK / "subpacks" / preset) / "textures/environment/overworld_cubemap"
    for face in range(6):
        img = np.zeros((n, n, 3))
        for j in range(0, n, chunk):
            d = face_dirs(face, n, (j, min(n, j + chunk)))
            img[j:j + chunk] = golden(d, px_angle) if preset == "golden" else starlit_base(d, px_angle)
        if preset == "starlit":
            img = tonemap(img + stars_on_face(face, n))
        save_png(out_dir / f"cubemap_{face}.png", img, dither=True, seed=100 + face)
    return n


def build():
    return {"golden": render("golden"), "starlit": render("starlit")}
