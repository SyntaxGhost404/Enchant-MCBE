"""Checks that run before every package: official schemas, vanilla paths, image rules and text rules."""
from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np
from PIL import Image

from .common import NAMESPACE, PACK, VANILLA, load_json_lenient

SCHEMAS = VANILLA.parent / "metadata" / "json_schemas"
OWN_TEXTURES = {"textures/particle/gloamlight_glow.png", "textures/particle/gloamlight_mote.png"}
DASHES = re.compile("[\u2012\u2013\u2014\u2015\u2212]")   # figure, en, em, horizontal bar, minus


class Problems(list):
    def add(self, where, msg):
        self.append(f"{where}: {msg}")


_BASE = "https://schemas.invalid"
_REGISTRY = None


def _registry():
    """Every schema in Mojang's set, keyed by its own $id, so both site-rooted ids
    ("/client/biome/...") and relative, URL-encoded refs resolve."""
    global _REGISTRY
    if _REGISTRY is None:
        from referencing import Registry, Resource
        from referencing.jsonschema import DRAFT7
        resources = []
        for path in SCHEMAS.rglob("*.json"):
            try:
                schema = json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                continue
            sid = schema.get("$id")
            if sid:
                schema["$id"] = _BASE + sid
                resources.append((schema["$id"], Resource(contents=schema, specification=DRAFT7)))
        _REGISTRY = Registry().with_resources(resources)
    return _REGISTRY


def _schema_validator(schema_id: str):
    from jsonschema import Draft7Validator
    reg = _registry()
    return Draft7Validator(reg.contents(_BASE + schema_id), registry=reg)


def _validate(problems, validator, doc, where):
    for err in sorted(validator.iter_errors(doc), key=lambda e: list(e.path))[:5]:
        problems.add(where, f"schema: {'/'.join(map(str, err.path))}: {err.message[:160]}")


SETTING_SCHEMAS = {"label": "LabelSetting", "slider": "SliderSetting", "toggle": "ToggleSetting",
                   "dropdown": "DropdownSetting", "multiselect": "MultiSelectSetting"}


def _unknown_manifest_members(doc):
    """The game refuses a format 3 manifest with any member its schema does not declare (seen in game with
    metadata/license_url), although the schema files do not set additionalProperties to false."""
    folder = SCHEMAS / "client_server/packaging/3.0.0"
    load = lambda name: json.loads((folder / f"{name}.json").read_text())
    out = []

    def check(obj, schema_name, path):
        allowed = load(schema_name).get("properties", {})
        for key, value in obj.items():
            if key not in allowed:
                out.append(f"{path}/{key}: not declared in {schema_name}; the game would refuse the pack")
                continue
            ref = allowed[key].get("$ref", "")
            if ref.startswith("./") and ref.endswith(".json") and isinstance(value, dict):
                check(value, ref[2:-5].replace("%20", " "), f"{path}/{key}")

    check(doc, "Manifest", "")
    for i, m in enumerate(doc.get("modules", [])):
        check(m, "Module", f"/modules/{i}")
    for i, sub in enumerate(doc.get("subpacks", [])):
        check(sub, "Subpack", f"/subpacks/{i}")
    for i, st in enumerate(doc.get("settings", [])):
        kind = SETTING_SCHEMAS.get(st.get("type"))
        if kind:
            check(st, kind, f"/settings/{i}")
        else:
            out.append(f"/settings/{i}: unknown setting type {st.get('type')!r}")
    return out


def check_json_files(problems):
    docs = {}
    for p in sorted(PACK.rglob("*.json")):
        rel = p.relative_to(PACK).as_posix()
        text = p.read_text(encoding="utf-8")
        try:
            docs[rel] = json.loads(text)          # strict JSON: no comments in shipped files
        except json.JSONDecodeError as e:
            problems.add(rel, f"invalid JSON: {e}")
    return docs


def check_schemas(problems, docs):
    biome_v = _schema_validator("/client/biome/1.21.130/Client%20Biome%20Document.json")
    for rel, doc in docs.items():
        if rel.startswith("biomes/"):
            _validate(problems, biome_v, doc, rel)
    pv = _schema_validator("/client/particles/1.21.10/Particle%20Effect%20Data.json")
    for rel, doc in docs.items():
        if rel.startswith("particles/"):
            _validate(problems, pv, doc["particle_effect"], rel)
    m = docs.get("manifest.json", {})
    mv = _schema_validator("/client_server/packaging/3.0.0/Manifest.json")
    _validate(problems, mv, {k: v for k, v in m.items() if k != "settings"}, "manifest.json")
    # the schema's oneOf over setting kinds is not keyed on "type", so check each setting against its own kind
    for i, st in enumerate(m.get("settings", [])):
        kind = SETTING_SCHEMAS.get(st.get("type"))
        if kind:
            _validate(problems, _schema_validator(f"/client_server/packaging/3.0.0/{kind}.json"), st, f"manifest.json settings/{i}")
    for msg in _unknown_manifest_members(m):
        problems.add("manifest.json", msg)


def check_fogs(problems, docs):
    fog_ids = {}
    for rel, doc in docs.items():
        if "/fogs/" not in "/" + rel or not rel.endswith(".json"):
            continue
        fs = doc.get("minecraft:fog_settings", {})
        ident = fs.get("description", {}).get("identifier", "")
        if not ident.startswith(f"{NAMESPACE}:"):
            problems.add(rel, f"fog identifier must use the {NAMESPACE} namespace, got {ident!r}")
        for kind, v in fs.get("distance", {}).items():
            if kind not in {"air", "weather", "water", "lava", "lava_resistance", "powder_snow"}:
                problems.add(rel, f"unknown fog kind {kind}")
            if v.get("render_distance_type") not in {"fixed", "render"}:
                problems.add(rel, f"{kind}: bad render_distance_type")
            if not re.fullmatch(r"#[0-9A-Fa-f]{6}", v.get("fog_color", "")):
                problems.add(rel, f"{kind}: bad fog_color")
            if not (0 <= v["fog_start"] <= v["fog_end"]):
                problems.add(rel, f"{kind}: fog_start must be between 0 and fog_end")
            if v["render_distance_type"] == "render" and v["fog_end"] > 1.0:
                problems.add(rel, f"{kind}: render fog_end above 1")
        if rel.startswith("fogs/"):
            fog_ids[ident] = rel
    for rel, doc in docs.items():
        if rel.startswith("biomes/"):
            ref = doc["minecraft:client_biome"]["components"].get("minecraft:fog_appearance", {}).get("fog_identifier")
            if ref not in fog_ids:
                problems.add(rel, f"fog {ref} is not defined in fogs/")
            vanilla_file = VANILLA / rel
            if not vanilla_file.exists():
                problems.add(rel, "no vanilla client biome with this file name")
            else:
                vi = load_json_lenient(vanilla_file)["minecraft:client_biome"]["description"]["identifier"]
                if vi != doc["minecraft:client_biome"]["description"]["identifier"]:
                    problems.add(rel, "identifier differs from vanilla")
    for sub in (PACK / "subpacks").glob("*/fogs"):
        names = {p.name for p in sub.glob("*.json")}
        root = {p.name for p in (PACK / "fogs").glob("*.json")}
        if names and names != root:
            problems.add(sub.relative_to(PACK).as_posix(), "preset does not cover the same biomes as fogs/")


def check_textures(problems):
    vanilla_terrain = load_json_lenient(VANILLA / "textures/terrain_texture.json")["texture_data"]
    for p in sorted(PACK.rglob("*.png")):
        rel = p.relative_to(PACK).as_posix()
        base = re.sub(r"^subpacks/[^/]+/", "", rel)
        if rel == "pack_icon.png" or base in OWN_TEXTURES or base.startswith("textures/environment/overworld_cubemap/"):
            continue
        if not (VANILLA / base).exists():
            problems.add(rel, "does not replace a vanilla texture (typo in the path?)")
    flip = json.loads((PACK / "textures/flipbook_textures.json").read_text())
    for e in flip:
        tile = vanilla_terrain.get(e["atlas_tile"])
        if tile is None:
            problems.add("flipbook_textures.json", f"unknown atlas tile {e['atlas_tile']}")
        img = Image.open(PACK / (e["flipbook_texture"] + ".png"))
        w, h = img.size
        if h % w:
            problems.add(e["flipbook_texture"], f"height {h} is not a whole number of {w}px frames")
    for name in ("sun.png", "moon_phases.png"):
        a = np.asarray(Image.open(PACK / "textures/environment" / name).convert("RGB")).astype(int)
        if name == "sun.png":
            edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
        else:
            cells = [a[r * a.shape[0] // 2:(r + 1) * a.shape[0] // 2, c * a.shape[1] // 4:(c + 1) * a.shape[1] // 4]
                     for r in range(2) for c in range(4)]
            edge = np.concatenate([np.concatenate([c[0], c[-1], c[:, 0], c[:, -1]]) for c in cells])
        if edge.max() > 2:
            problems.add(name, "quad edge is not black: the square would show in the sky")
    cub = sorted(PACK.glob("subpacks/*/textures/environment/overworld_cubemap"))
    for d in cub:
        faces = sorted(d.glob("cubemap_*.png"))
        if [f.name for f in faces] != [f"cubemap_{i}.png" for i in range(6)]:
            problems.add(d.relative_to(PACK).as_posix(), "needs exactly cubemap_0..5.png")


def check_particles(problems, docs):
    for rel, doc in docs.items():
        if not rel.startswith("particles/"):
            continue
        pe = doc["particle_effect"]
        tex = pe["description"]["basic_render_parameters"]["texture"]
        if not ((PACK / (tex + ".png")).exists() or (VANILLA / (tex + ".png")).exists()):
            problems.add(rel, f"texture {tex} not found")
        for name, ev in pe.get("events", {}).items():
            eff = ev.get("particle_effect", {}).get("effect")
            if eff and eff.startswith(f"{NAMESPACE}:"):
                if not any(d.get("particle_effect", {}).get("description", {}).get("identifier") == eff
                           for r, d in docs.items() if r.startswith("particles/")):
                    problems.add(rel, f"event {name} spawns undefined effect {eff}")


def check_text(problems, docs):
    m = docs.get("manifest.json", {})
    texts = [m.get("header", {}).get("name", ""), m.get("header", {}).get("description", "")]
    texts += [s.get("text", "") for s in m.get("settings", [])] + [s.get("name", "") for s in m.get("subpacks", [])]
    for t in texts:
        if DASHES.search(t):
            problems.add("manifest.json", f"dash character in player-facing text: {t!r}")
    settings = {s["name"] for s in m.get("settings", []) if "name" in s}
    for rel, doc in docs.items():
        if rel.startswith("particles/"):
            for q in re.findall(r"pack_setting(?:_enabled)?\('([^']+)'", json.dumps(doc)):
                if q not in settings:
                    problems.add(rel, f"reads pack setting {q} that the manifest does not define")


def run():
    problems = Problems()
    docs = check_json_files(problems)
    check_schemas(problems, docs)
    check_fogs(problems, docs)
    check_textures(problems)
    check_particles(problems, docs)
    check_text(problems, docs)
    if problems:
        print("\n".join(problems))
        raise SystemExit(f"{len(problems)} problem(s)")
    return {"json_files": len(docs), "problems": 0}
