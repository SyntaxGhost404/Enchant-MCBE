"""Light bloom without shaders.

Fancy graphics has no bloom, but particles can use additive blending. Each vanilla flame particle
(torches, candles, soul and copper torches) is extended with an event that drops one soft, additive
glow sprite where the flame appears, so lights get a warm halo that flickers with them. Fireflies
become small glowing motes. Both read the pack settings (Molang `query.get_pack_setting` and
`query.is_pack_setting_enabled`), so every player can tune or switch them off.

Vanilla particles are overridden by identifier; everything Mojang defined is kept and only the
event is added, so the flames themselves look and move exactly as before.
"""
from __future__ import annotations

import copy

import numpy as np

from .common import NAMESPACE, PACK, load_json_lenient, save_png, smoothstep, vanilla, write_json

GLOW_SETTING = f"{NAMESPACE}:glow"
FIREFLY_SETTING = f"{NAMESPACE}:fireflies"

# vanilla file, glow colour (rgb), glow size, peak alpha, glow lifetime
FLAMES = {
    "basic_flame.json": ("warm", (1.0, 0.70, 0.36), 0.42, 0.36, "math.random(0.9, 1.6)"),
    "candle_flame.json": ("candle", (1.0, 0.76, 0.42), 0.26, 0.30, "math.random(9.0, 11.5)"),
    "blue_flame.json": ("soul", (0.42, 0.95, 1.0), 0.40, 0.32, "math.random(0.9, 1.6)"),
    "green_flame.json": ("copper", (0.55, 1.0, 0.62), 0.40, 0.32, "math.random(0.9, 1.6)"),
}


def _glow_texture(size, core, halo):
    c = (size - 1) / 2
    y, x = np.mgrid[0:size, 0:size]
    r = np.hypot(x - c, y - c) / (size / 2)
    a = core[0] * np.exp(-(r / core[1]) ** 2) + halo[0] * np.exp(-(r / halo[1]) ** 2)
    a = np.clip(a, 0, 1) * (1 - smoothstep(0.82, 1.0, r))
    img = np.ones((size, size, 4))
    img[..., 3] = a
    return img


def _alpha_expr(peak, fade_in, fade_out):
    envelope = (f"math.clamp(math.min(variable.particle_age / {fade_in}, "
                f"(variable.particle_lifetime - variable.particle_age) / {fade_out}), 0, 1)")
    flicker = "(0.86 + 0.14 * math.sin(variable.particle_age * 720 + variable.particle_random_1 * 360))"
    return f"query.get_pack_setting('{GLOW_SETTING}') * {peak} * {envelope} * {flicker}"


def glow_effect(kind, rgb, size, peak, lifetime):
    fade_out = 1.0 if kind == "candle" else 0.45
    return {
        "format_version": "1.26.10",   # same as vanilla particles: current Molang rules
        "particle_effect": {
            "description": {
                "identifier": f"{NAMESPACE}:glow_{kind}",
                "basic_render_parameters": {"material": "particles_add", "texture": "textures/particle/gloamlight_glow"},
            },
            "components": {
                "minecraft:emitter_rate_manual": {"max_particles": 160},
                "minecraft:emitter_lifetime_expression": {},
                "minecraft:emitter_shape_point": {},
                "minecraft:particle_lifetime_expression": {"max_lifetime": lifetime},
                "minecraft:particle_initial_speed": 0,
                "minecraft:particle_appearance_billboard": {
                    "size": [f"{size / 2:.3f} * (0.92 + variable.particle_random_2 * 0.16)",
                             f"{size / 2:.3f} * (0.92 + variable.particle_random_2 * 0.16)"],
                    "facing_camera_mode": "lookat_xyz",
                    "uv": {"texture_width": 1, "texture_height": 1, "uv": [0, 0], "uv_size": [1, 1]},
                },
                "minecraft:particle_appearance_tinting": {
                    "color": [rgb[0], rgb[1], rgb[2], _alpha_expr(peak, 0.18, fade_out)],
                },
            },
        },
    }


def with_glow_event(doc, kind):
    doc = copy.deepcopy(doc)
    pe = doc["particle_effect"]
    events = dict(pe.get("events", {}))
    events[f"{NAMESPACE}_glow"] = {"particle_effect": {"effect": f"{NAMESPACE}:glow_{kind}", "type": "particle"}}
    comps = dict(pe["components"])
    life = dict(comps.get("minecraft:particle_lifetime_events", {}))
    created = life.get("creation_event")
    created = [created] if isinstance(created, str) else list(created or [])
    created.append(f"{NAMESPACE}_glow")
    life["creation_event"] = created
    comps["minecraft:particle_lifetime_events"] = life
    out = {"description": pe["description"], "events": events, "components": comps}
    return {"format_version": doc["format_version"], "particle_effect": out}


def glowing_firefly(doc):
    doc = copy.deepcopy(doc)
    pe = doc["particle_effect"]
    pe["description"]["basic_render_parameters"] = {"material": "particles_add", "texture": "textures/particle/gloamlight_mote"}
    comps = pe["components"]
    on = f"query.is_pack_setting_enabled('{FIREFLY_SETTING}')"
    size = f"{on} ? 0.085 : 0.03"
    comps["minecraft:particle_appearance_billboard"]["size"] = [size, size]
    comps["minecraft:particle_appearance_billboard"]["uv"] = {"texture_width": 1, "texture_height": 1, "uv": [0, 0], "uv_size": [1, 1]}
    envelope = ("math.clamp(math.min(v.particle_age / (v.particle_lifetime * 0.3), "
                "(v.particle_lifetime - v.particle_age) / (v.particle_lifetime * 0.5)), 0, 1)")
    pulse = "(0.62 + 0.38 * math.sin(v.particle_age * 140 + v.particle_random_1 * 360))"
    comps["minecraft:particle_appearance_tinting"] = {"color": [1.0, 0.96, 0.62, f"{envelope} * ({on} ? {pulse} : 1)"]}
    return doc


def build():
    save_png(PACK / "textures/particle/gloamlight_glow.png", _glow_texture(64, (0.35, 0.16), (0.65, 0.42)), dither=False)
    save_png(PACK / "textures/particle/gloamlight_mote.png", _glow_texture(32, (1.0, 0.14), (0.40, 0.45)), dither=False)
    made = []
    for fname, (kind, rgb, size, peak, life) in FLAMES.items():
        doc = load_json_lenient(vanilla("particles", fname))
        write_json(PACK / "particles" / fname, with_glow_event(doc, kind))
        write_json(PACK / "particles" / f"{NAMESPACE}_glow_{kind}.json", glow_effect(kind, rgb, size, peak, life))
        made.append(doc["particle_effect"]["description"]["identifier"])
    ff = load_json_lenient(vanilla("particles", "firefly_particle.json"))
    write_json(PACK / "particles" / "firefly_particle.json", glowing_firefly(ff))
    made.append(ff["particle_effect"]["description"]["identifier"])
    return {"overridden": made}
