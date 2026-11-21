"""Client biome files and fog definitions.

Vanilla fog identifiers live in the reserved `minecraft` namespace and cannot be replaced by a
resource pack, so every biome gets its own `gloamlight:fog_<biome>` definition and the vanilla client
biome file for that biome is overridden to point at it. Everything else in the vanilla client biome
(ambient sounds, music, Vibrant Visuals identifiers, precipitation) is carried over untouched.
"""
from __future__ import annotations

import glob
from pathlib import Path

from .common import NAMESPACE, PACK, load_json_lenient, vanilla, write_json
from .palette import BIOME_MOOD, FOLIAGE_OVERRIDES, GRASS_OVERRIDES, Mood, moods_for_preset

FOG_FORMAT = "1.21.90"
NETHER = {"hell", "crimson_forest", "warped_forest", "soulsand_valley", "basalt_deltas"}


def _water_fog(m: Mood) -> dict:
    return {
        "fog_start": 2.0,
        "fog_end": float(m.under_end),
        "fog_color": m.under,
        "render_distance_type": "fixed",
        # Coming up from the surface the eyes adjust: start murky, clear within a few seconds.
        "transition_fog": {
            "init_fog": {"fog_start": 0.0, "fog_end": 6.0, "fog_color": m.under, "render_distance_type": "fixed"},
            "min_percent": 0.35,
            "mid_seconds": 3,
            "mid_percent": 0.75,
            "max_seconds": 10,
        },
    }


def fog_definition(biome: str, m: Mood) -> dict:
    kind = "fixed" if m.fixed_haze else "render"
    distance = {
        "air": {"fog_start": float(m.haze_start), "fog_end": float(m.haze_end), "fog_color": m.haze,
                "render_distance_type": kind},
        "weather": {"fog_start": float(m.rain_start), "fog_end": float(m.rain_end), "fog_color": m.rain,
                    "render_distance_type": kind},
        "water": _water_fog(m),
    }
    if biome == "the_end":
        del distance["weather"]
    return {
        "format_version": FOG_FORMAT,
        "minecraft:fog_settings": {
            "description": {"identifier": f"{NAMESPACE}:fog_{biome}"},
            "distance": distance,
        },
    }


def client_biome(vanilla_doc: dict, biome: str, m: Mood) -> dict:
    doc = {"format_version": vanilla_doc["format_version"], "minecraft:client_biome": {
        "description": dict(vanilla_doc["minecraft:client_biome"]["description"]),
        "components": dict(vanilla_doc["minecraft:client_biome"]["components"]),
    }}
    comps = doc["minecraft:client_biome"]["components"]
    comps["minecraft:fog_appearance"] = {"fog_identifier": f"{NAMESPACE}:fog_{biome}"}
    if biome not in NETHER and biome != "the_end":
        comps["minecraft:water_appearance"] = {"surface_color": m.water, "surface_opacity": m.water_opacity}
    if m.sky is not None and biome not in NETHER:
        comps["minecraft:sky_color"] = {"sky_color": m.sky}
    if biome in GRASS_OVERRIDES:
        prev = comps.get("minecraft:grass_appearance", {})
        comps["minecraft:grass_appearance"] = {**prev, "color": GRASS_OVERRIDES[biome]}
    if biome in FOLIAGE_OVERRIDES:
        comps["minecraft:foliage_appearance"] = {"color": FOLIAGE_OVERRIDES[biome]}
    # keep a stable, readable component order: ours first, then vanilla's
    order = ["minecraft:sky_color", "minecraft:fog_appearance", "minecraft:water_appearance",
             "minecraft:grass_appearance", "minecraft:foliage_appearance", "minecraft:dry_foliage_color"]
    doc["minecraft:client_biome"]["components"] = {
        **{k: comps[k] for k in order if k in comps},
        **{k: v for k, v in comps.items() if k not in order},
    }
    return doc


def vanilla_biomes() -> dict[str, dict]:
    out = {}
    for p in sorted(glob.glob(str(vanilla("biomes") / "*.client_biome.json"))):
        doc = load_json_lenient(Path(p))
        ident = doc["minecraft:client_biome"]["description"]["identifier"]
        out[ident.split(":", 1)[1]] = doc
    return out


def build(presets=("balanced", "clear", "mist")) -> dict:
    biomes = vanilla_biomes()
    missing = sorted(set(biomes) - set(BIOME_MOOD))
    extra = sorted(set(BIOME_MOOD) - set(biomes))
    if missing or extra:
        raise SystemExit(f"Biome table out of date. Not mapped: {missing}. Not in vanilla: {extra}")

    balanced = moods_for_preset("balanced")
    for biome, doc in biomes.items():
        m = balanced[BIOME_MOOD[biome]]
        write_json(PACK / "biomes" / f"{biome}.client_biome.json", client_biome(doc, biome, m))
        write_json(PACK / "fogs" / f"{biome}.json", fog_definition(biome, m))

    for preset in presets:
        moods = moods_for_preset(preset)
        for biome in biomes:
            write_json(PACK / "subpacks" / preset / "fogs" / f"{biome}.json",
                       fog_definition(biome, moods[BIOME_MOOD[biome]]))
    return {"biomes": len(biomes), "presets": list(presets)}
