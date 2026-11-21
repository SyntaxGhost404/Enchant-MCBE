"""Gloamlight art direction as data.

Thesis: warm light, cool air. Light sources (sun, fire, torches) are amber and bloom; the air between
the player and the horizon is cool, biome-tinted and deep. Every biome belongs to a mood, and a mood
fixes five things the Fancy renderer really draws:

  sky      zenith colour (the engine fades it to black at night and to grey in rain)
  haze     horizon and distance fog colour, plus where the haze starts and ends (fraction of
           render distance), which gives aerial perspective and a seamless horizon
  rain     fog colour and distances while it rains or snows
  water    surface tint and opacity
  under    underwater fog colour and visibility in blocks

Colours are sRGB hex. Haze starts are for the Balanced preset; the Clear Air and Deep Mist presets
are derived from them in biomes.py.
"""
from __future__ import annotations

from dataclasses import dataclass, field, replace


@dataclass(frozen=True)
class Mood:
    name: str
    sky: str | None                 # None: keep the engine's climate-based sky colour
    haze: str
    haze_start: float
    haze_end: float
    rain: str
    rain_start: float
    rain_end: float
    water: str
    water_opacity: float
    under: str
    under_end: float
    fixed_haze: bool = False        # Nether: distances in blocks instead of render-distance fractions
    note: str = ""


RAIN_TEMPERATE = ("#6E7883", 0.08, 0.58)
RAIN_HUMID = ("#6C7A6E", 0.05, 0.52)
RAIN_BOREAL = ("#707C88", 0.07, 0.56)
RAIN_SNOW = ("#B5C0CC", 0.06, 0.50)
RAIN_DUST = ("#A99C86", 0.10, 0.60)


def mood(name, sky, haze, start, end, rain, water, opacity, under, under_end, **kw):
    return Mood(name, sky, haze, start, end, rain[0], rain[1], rain[2], water, opacity, under, under_end, **kw)


MOODS: dict[str, Mood] = {m.name: m for m in [
    # temperate land: pale neutral haze, cornflower zenith, the reference look
    mood("pastoral", "#5A8EEA", "#D8E2EB", 0.40, 1.0, RAIN_TEMPERATE, "#44A0EC", 0.60, "#2A73B4", 64,
         note="Open grassland. The reference look: clean zenith, pale warm-neutral horizon."),
    mood("woodland", "#5C8FE6", "#CFDBDD", 0.34, 1.0, RAIN_TEMPERATE, "#3E96E2", 0.62, "#2869A8", 60,
         note="Forests. Haze leans green-grey, as if breathed out by the canopy."),
    mood("gloomwood", "#6A8CC6", "#A4B3A7", 0.20, 1.0, ("#5F6A64", 0.05, 0.50), "#3C78A8", 0.68, "#24506E", 48,
         note="Dark forest. Close, green gloom that turns the trunks into silhouettes."),
    mood("emberwood", "#6A93E4", "#E2D3C0", 0.30, 1.0, RAIN_TEMPERATE, "#427884", 0.66, "#284E54", 46,
         note="Dappled autumn forest. Warm amber haze, tea-coloured tarns."),
    mood("blossom", "#77A0EC", "#EEDDD7", 0.28, 1.0, RAIN_TEMPERATE, "#5FB2E8", 0.55, "#3E86BE", 64,
         note="Cherry grove. Ivory-peach haze that softens the petals into the distance."),
    mood("boreal", "#5687DD", "#C5D3DC", 0.30, 1.0, RAIN_BOREAL, "#3A84B2", 0.64, "#22546F", 52,
         note="Taiga. Cool blue-grey mist between dark spruces."),
    mood("frostwood", "#5084E2", "#CEDCE8", 0.36, 1.0, RAIN_SNOW, "#4A88BE", 0.66, "#2B5A80", 50,
         note="Snowy taiga and groves. Silvered mist, bright snowfall."),
    mood("crystalline", "#4A82E8", "#D5E3F1", 0.50, 1.0, RAIN_SNOW, "#5A94D0", 0.68, "#36668F", 48,
         note="Snow and ice. The clearest air in the game: deep azure zenith, silver horizon."),
    mood("highland", "#5288E4", "#CCD8E4", 0.46, 1.0, RAIN_TEMPERATE, "#3F98E6", 0.56, "#2A6DAE", 64,
         note="Windswept hills and stony peaks. Thin, cool air; distant ridges fade to blue."),
    mood("tropic", "#6C9BE2", "#C3D5C6", 0.20, 1.0, RAIN_HUMID, "#2AB4C6", 0.52, "#1A8496", 64,
         note="Jungles. Humid jade haze close to the player, turquoise water."),
    mood("wetland", "#7591BE", "#AEB9A4", 0.14, 1.0, RAIN_HUMID, "#5E7350", 0.80, "#2B3420", 20,
         note="Swamps. Olive mist and murky, peat-brown water you cannot see far into."),
    mood("mangrove", "#7496C0", "#B2BEA9", 0.14, 1.0, RAIN_HUMID, "#537560", 0.80, "#2E4434", 22,
         note="Mangroves. Brackish green mist over root-tangled water."),
    mood("dune", "#82A5E2", "#EADCC3", 0.38, 1.0, RAIN_DUST, "#34BCB4", 0.50, "#20908C", 72,
         note="Deserts. Bleached zenith, sand-dust horizon, oasis-clear water."),
    mood("savanna", "#7BA1E0", "#E3D7B9", 0.36, 1.0, RAIN_DUST, "#3FB0C6", 0.54, "#287E90", 64,
         note="Savannas. Dry-grass haze, warm and wide."),
    mood("ochre", "#84A2D6", "#EBC9A3", 0.36, 1.0, RAIN_DUST, "#529EB6", 0.58, "#346E84", 56,
         note="Badlands. Ochre haze that makes the terracotta glow."),
    mood("dreamcap", "#8996D8", "#D4CBDD", 0.26, 1.0, RAIN_TEMPERATE, "#7A90D4", 0.60, "#4C5C92", 52,
         note="Mushroom fields. Lilac-grey haze, a little unreal."),
    mood("ashen", "#A2A8B1", "#C2C1BB", 0.08, 0.82, ("#474450", 0.04, 0.45), "#78898F", 0.70, "#4A5860", 40,
         note="Pale garden. Bone-grey fog that closes in; the only biome meant to feel uneasy."),
    mood("river", "#5B8FE9", "#D5E0E9", 0.36, 1.0, RAIN_TEMPERATE, "#3C9AE2", 0.58, "#2870AE", 56,
         note="Rivers. Clear, slightly cooler than the land around them."),
    mood("frozen_river", "#4E85E6", "#D3E1EE", 0.42, 1.0, RAIN_SNOW, "#6098CC", 0.70, "#3E6A94", 44),
    mood("beach", "#5F96EA", "#E2E4DD", 0.42, 1.0, RAIN_TEMPERATE, "#42A4E6", 0.56, "#2B78B6", 64,
         note="Beaches. Bright sandy haze over shallow water."),
    mood("cold_beach", "#5087E6", "#D6E2EE", 0.46, 1.0, RAIN_SNOW, "#5090CC", 0.66, "#335F8E", 50),
    mood("ocean", "#5990EA", "#D2E0EC", 0.42, 1.0, RAIN_TEMPERATE, "#3290E0", 0.64, "#1E62A6", 64,
         note="Open ocean. Sea haze, cobalt water."),
    mood("deep_ocean", "#5990EA", "#CEDDEA", 0.40, 1.0, RAIN_TEMPERATE, "#2C80D2", 0.70, "#194F8C", 52),
    mood("warm_ocean", "#63A0EC", "#D5E8EA", 0.44, 1.0, RAIN_HUMID, "#30D2DC", 0.42, "#18A6B4", 96,
         note="Warm ocean. The clearest water: turquoise, almost glass."),
    mood("deep_warm_ocean", "#63A0EC", "#D3E6EA", 0.42, 1.0, RAIN_HUMID, "#2BC0D6", 0.52, "#1690A8", 84),
    mood("lukewarm_ocean", "#5F99EB", "#D3E4EC", 0.43, 1.0, RAIN_TEMPERATE, "#2EB6E6", 0.50, "#1A86B6", 80),
    mood("deep_lukewarm_ocean", "#5F99EB", "#D1E2EB", 0.41, 1.0, RAIN_TEMPERATE, "#29A4DA", 0.58, "#1772A6", 68),
    mood("cold_ocean", "#5288E4", "#C9D7E5", 0.42, 1.0, RAIN_BOREAL, "#3A80C6", 0.68, "#255A92", 56),
    mood("deep_cold_ocean", "#5288E4", "#C7D5E3", 0.40, 1.0, RAIN_BOREAL, "#3272B8", 0.74, "#1E4C80", 48),
    mood("frozen_ocean", "#4E86E8", "#D5E2EF", 0.46, 1.0, RAIN_SNOW, "#629CCC", 0.72, "#3F6E9A", 44),
    mood("deep_frozen_ocean", "#4E86E8", "#D3E0EE", 0.44, 1.0, RAIN_SNOW, "#568EC2", 0.76, "#335F8C", 40),
    mood("lush_caves", "#6C9BE2", "#BCD0B6", 0.26, 1.0, RAIN_HUMID, "#34B8B0", 0.52, "#1E8482", 60,
         note="Lush caves. A faint spore-green glow in the air."),
    mood("dripstone", "#6F90C8", "#BCA893", 0.28, 1.0, RAIN_TEMPERATE, "#448EB6", 0.62, "#2A5E7E", 50,
         note="Dripstone caves. Warm umber dust."),
    mood("deep_dark", "#2E3F60", "#0F131B", 0.0, 0.55, ("#0F131B", 0.0, 0.50), "#2F5676", 0.72, "#142434", 32,
         note="Deep dark. Heavy black-blue fog; sight is short and that is the point."),
    mood("sulfur", "#8BA2C6", "#C8C38C", 0.16, 0.90, ("#9E9A6E", 0.08, 0.55), "#44C496", 0.62, "#1F5E44", 40,
         note="Sulfur caves. Acrid yellow-green haze."),
    # Nether: no sky, so distances are fixed blocks. Each biome is a different furnace.
    mood("nether_wastes", None, "#3C1408", 8, 88, ("#3C1408", 8, 88), "#905957", 0.65, "#905957", 15, fixed_haze=True,
         note="Nether wastes. Ember-brown smoke."),
    mood("crimson", None, "#3B0A09", 8, 84, ("#3B0A09", 8, 84), "#905957", 0.65, "#905957", 15, fixed_haze=True,
         note="Crimson forest. Blood-ember haze."),
    mood("warped", None, "#12242B", 8, 84, ("#12242B", 8, 84), "#905957", 0.65, "#905957", 15, fixed_haze=True,
         note="Warped forest. Cold turquoise smoke that matches the nylium."),
    mood("soulsand", None, "#17343B", 6, 80, ("#17343B", 6, 80), "#905957", 0.65, "#905957", 15, fixed_haze=True,
         note="Soul sand valley. Glacial cyan-grey, thicker than the wastes."),
    mood("basalt", None, "#5B5551", 4, 72, ("#5B5551", 4, 72), "#423e42", 0.65, "#423e42", 15, fixed_haze=True,
         note="Basalt deltas. Ash-grey, the densest Nether air."),
    mood("the_end", "#000000", "#150F1F", 0.55, 1.0, ("#150F1F", 0.55, 1.0), "#62529e", 0.65, "#62529e", 15,
         note="The End. Violet-black void haze under a slow nebula."),
]}


BIOME_MOOD: dict[str, str] = {}
for mood_name, biomes in {
    "pastoral": ["plains", "sunflower_plains", "meadow"],
    "woodland": ["forest", "forest_hills", "flower_forest", "birch_forest", "birch_forest_hills",
                 "birch_forest_mutated", "birch_forest_hills_mutated"],
    "gloomwood": ["roofed_forest", "roofed_forest_mutated"],
    "emberwood": ["dappled_forest"],
    "blossom": ["cherry_grove"],
    "boreal": ["taiga", "taiga_hills", "taiga_mutated", "mega_taiga", "mega_taiga_hills",
               "redwood_taiga_mutated", "redwood_taiga_hills_mutated"],
    "frostwood": ["cold_taiga", "cold_taiga_hills", "cold_taiga_mutated", "grove"],
    "crystalline": ["ice_plains", "ice_plains_spikes", "ice_mountains", "snowy_slopes", "frozen_peaks", "jagged_peaks"],
    "highland": ["extreme_hills", "extreme_hills_edge", "extreme_hills_mutated", "extreme_hills_plus_trees",
                 "extreme_hills_plus_trees_mutated", "stony_peaks", "stone_beach"],
    "tropic": ["jungle", "jungle_hills", "jungle_mutated", "jungle_edge", "jungle_edge_mutated",
               "bamboo_jungle", "bamboo_jungle_hills"],
    "wetland": ["swampland", "swampland_mutated"],
    "mangrove": ["mangrove_swamp"],
    "dune": ["desert", "desert_hills", "desert_mutated"],
    "savanna": ["savanna", "savanna_mutated", "savanna_plateau", "savanna_plateau_mutated"],
    "ochre": ["mesa", "mesa_bryce", "mesa_plateau", "mesa_plateau_mutated", "mesa_plateau_stone",
              "mesa_plateau_stone_mutated"],
    "dreamcap": ["mushroom_island", "mushroom_island_shore"],
    "ashen": ["pale_garden"],
    "river": ["river"],
    "frozen_river": ["frozen_river"],
    "beach": ["beach"],
    "cold_beach": ["cold_beach"],
    "ocean": ["ocean"],
    "deep_ocean": ["deep_ocean"],
    "warm_ocean": ["warm_ocean"],
    "deep_warm_ocean": ["deep_warm_ocean"],
    "lukewarm_ocean": ["lukewarm_ocean"],
    "deep_lukewarm_ocean": ["deep_lukewarm_ocean"],
    "cold_ocean": ["cold_ocean"],
    "deep_cold_ocean": ["deep_cold_ocean"],
    "frozen_ocean": ["frozen_ocean", "legacy_frozen_ocean"],
    "deep_frozen_ocean": ["deep_frozen_ocean"],
    "lush_caves": ["lush_caves"],
    "dripstone": ["dripstone_caves"],
    "deep_dark": ["deep_dark"],
    "sulfur": ["sulfur_caves"],
    "nether_wastes": ["hell"],
    "crimson": ["crimson_forest"],
    "warped": ["warped_forest"],
    "soulsand": ["soulsand_valley"],
    "basalt": ["basalt_deltas"],
    "the_end": ["the_end"],
}.items():
    for b in biomes:
        BIOME_MOOD[b] = mood_name

# Explicit foliage colours where vanilla uses fixed colours (everything else follows the regraded colormaps).
GRASS_OVERRIDES = {
    "cherry_grove": "#A9CC63",
    "dappled_forest": "#CF6A30",
    "mesa": "#94824E", "mesa_bryce": "#94824E", "mesa_plateau_mutated": "#94824E",
    "mesa_plateau_stone": "#94824E", "mesa_plateau_stone_mutated": "#94824E",
}
FOLIAGE_OVERRIDES = {
    "cherry_grove": "#A9CC63",
    "dappled_forest": "#DE8A36",
    "mesa": "#A99B3C", "mesa_bryce": "#A99B3C", "mesa_plateau_mutated": "#A99B3C",
    "mesa_plateau_stone": "#A99B3C", "mesa_plateau_stone_mutated": "#A99B3C",
}

# Haze presets offered as subpacks. Each maps the Balanced start/end to its own.
PRESETS = {
    "balanced": {"label": "Balanced haze", "start": lambda s: s, "end": lambda e: e},
    "clear": {"label": "Clear air", "start": lambda s: min(0.86, s + 0.28),
              "end": lambda e: 1.0 if e >= 0.8 else round(min(1.0, e + 0.2), 3)},
    "mist": {"label": "Deep mist", "start": lambda s: round(s * 0.4, 3), "end": lambda e: round(min(e, 0.92), 3)},
}

# Palette anchors used by the textures (sun, moon, lights, water glints).
SUN_CORE = "#FFF7E6"
SUN_LIMB = "#FFD9A0"
SUN_GLOW_INNER = "#FFE2B0"
SUN_GLOW_OUTER = "#FFA552"
MOON_LIGHT = "#E4ECF8"
MOON_HALO = "#8FA9DC"
EMBER_HOT = "#FFF4D6"
EMBER_GOLD = "#FFC15A"
EMBER_AMBER = "#F08A2E"
EMBER_DEEP = "#B8441A"
SOUL_HOT = "#E6FFFF"
SOUL_CYAN = "#5FE3E8"
SOUL_DEEP = "#1B8EA6"


def moods_for_preset(preset: str) -> dict[str, Mood]:
    p = PRESETS[preset]
    out = {}
    for k, m in MOODS.items():
        if m.fixed_haze:
            scale = {"balanced": 1.0, "clear": 1.35, "mist": 0.6}[preset]
            out[k] = replace(m, haze_start=round(m.haze_start * scale, 2), haze_end=round(m.haze_end * scale, 2))
        else:
            out[k] = replace(m, haze_start=round(p["start"](m.haze_start), 3), haze_end=round(p["end"](m.haze_end), 3))
    return out
