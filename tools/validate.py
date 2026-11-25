#!/usr/bin/env python3
"""Checks the packs before they are packaged.

- every JSON file is strict JSON (the game accepts comments, but shipped files stay plain);
- manifests, setting blocks and item files validate against Mojang's own JSON schemas
  (bedrock-samples metadata/json_schemas, pass its folder with --schemas or set VMOS_SCHEMAS);
- a format 3 manifest has no member its schema does not declare (the game refuses such a pack);
- texture and translation references resolve; pack icons are square PNGs;
- player-facing text has no dash characters.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BP = ROOT / "VeinMinerOreSmelter_BP"
RP = ROOT / "VeinMinerOreSmelter_RP"
DEFAULT_SAMPLES = Path("/home/user/mojang/bedrock-samples")
DASHES = re.compile("[‒–—―−]")
BASE = "https://schemas.invalid"
SETTING_KINDS = {"label": "LabelSetting", "slider": "SliderSetting", "toggle": "ToggleSetting",
                 "dropdown": "DropdownSetting", "multiselect": "MultiSelectSetting"}


class Problems(list):
    def add(self, where, msg):
        self.append(f"{where}: {msg}")


def registry(schemas: Path):
    from referencing import Registry, Resource
    from referencing.jsonschema import DRAFT7
    resources = []
    for path in schemas.rglob("*.json"):
        try:
            schema = json.loads(path.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            continue
        sid = schema.get("$id")
        if sid:
            schema["$id"] = BASE + sid
            resources.append((schema["$id"], Resource(contents=schema, specification=DRAFT7)))
    return Registry().with_resources(resources)


def validator(reg, schema_id: str):
    from jsonschema import Draft7Validator
    return Draft7Validator(reg.contents(BASE + schema_id), registry=reg)


def check_schema(problems, v, doc, where):
    for err in sorted(v.iter_errors(doc), key=lambda e: list(e.path))[:6]:
        problems.add(where, f"schema: {'/'.join(map(str, err.path))}: {err.message[:180]}")


def undeclared(schemas: Path, doc) -> list[str]:
    folder = schemas / "client_server/packaging/3.0.0"
    load = lambda name: json.loads((folder / f"{name}.json").read_text())  # noqa: E731
    out = []

    def walk(obj, schema_name, path):
        allowed = load(schema_name).get("properties", {})
        for key, value in obj.items():
            if key not in allowed:
                out.append(f"{path}/{key}: not declared in {schema_name}; the game would refuse the pack")
                continue
            ref = allowed[key].get("$ref", "")
            if ref.startswith("./") and ref.endswith(".json") and isinstance(value, dict):
                walk(value, ref[2:-5].replace("%20", " "), f"{path}/{key}")

    walk(doc, "Manifest", "")
    for i, m in enumerate(doc.get("modules", [])):
        walk(m, "Module", f"/modules/{i}")
    for i, st in enumerate(doc.get("settings", [])):
        kind = SETTING_KINDS.get(st.get("type"))
        if kind:
            walk(st, kind, f"/settings/{i}")
        else:
            out.append(f"/settings/{i}: unknown setting type {st.get('type')!r}")
    return out


def load_all(problems, pack: Path) -> dict[str, object]:
    docs = {}
    for p in sorted(pack.rglob("*.json")):
        rel = f"{pack.name}/{p.relative_to(pack).as_posix()}"
        try:
            docs[rel] = json.loads(p.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            problems.add(rel, f"invalid JSON: {e}")
    return docs


def check_manifests(problems, reg, schemas, docs):
    mv = validator(reg, "/client_server/packaging/3.0.0/Manifest.json")
    for pack in (BP, RP):
        rel = f"{pack.name}/manifest.json"
        m = docs[rel]
        check_schema(problems, mv, {k: v for k, v in m.items() if k != "settings"}, rel)
        for i, st in enumerate(m.get("settings", [])):
            kind = SETTING_KINDS.get(st.get("type"))
            if kind:
                check_schema(problems, validator(reg, f"/client_server/packaging/3.0.0/{kind}.json"), st, f"{rel} settings/{i}")
        for msg in undeclared(schemas, m):
            problems.add(rel, msg)
        texts = [m["header"].get("name", ""), m["header"].get("description", "")]
        texts += [s.get("text", "") for s in m.get("settings", [])]
        for t in texts:
            if DASHES.search(t):
                problems.add(rel, f"dash character in player-facing text: {t!r}")


def check_items(problems, reg, docs, vanilla_rp: Path):
    iv = validator(reg, "/server/item/1.26.50/ItemDocument.json")
    textures = docs[f"{RP.name}/textures/item_texture.json"]["texture_data"]
    for rel, doc in docs.items():
        if not rel.startswith(f"{BP.name}/items/"):
            continue
        if doc.get("format_version") != "1.26.50":
            problems.add(rel, "format_version should be 1.26.50 (the newest item schema)")
        item = doc.get("minecraft:item", {})
        check_schema(problems, iv, item, rel)
        icon = item.get("components", {}).get("minecraft:icon")
        if icon not in textures:
            problems.add(rel, f"icon {icon!r} is not in item_texture.json")
    for key, entry in textures.items():
        path = entry["textures"] if isinstance(entry, dict) else entry
        if not ((RP / (path + ".png")).exists() or (vanilla_rp / (path + ".png")).exists()):
            problems.add("item_texture.json", f"{key}: texture {path} not found in this pack or vanilla")


def check_lang(problems, vanilla_rp: Path):
    seen = set()
    for n, line in enumerate((RP / "texts/en_US.lang").read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip() or line.startswith("##"):
            continue
        if "=" not in line:
            problems.add("en_US.lang", f"line {n} is not key=value")
            continue
        key, value = line.split("=", 1)
        if key in seen:
            problems.add("en_US.lang", f"{key} is defined twice")
        seen.add(key)
        if DASHES.search(value):
            problems.add("en_US.lang", f"{key}: dash character in player-facing text")
        if "\t" in value or value != value.rstrip():
            problems.add("en_US.lang", f"{key}: trailing whitespace")
    vanilla = (vanilla_rp / "texts/en_US.lang").read_text(encoding="utf-8")
    for key in ("item.enchanted_book.name", "itemGroup.name.enchantedBook"):
        if f"\n{key}=" not in vanilla:
            problems.add("en_US.lang", f"vanilla key {key} used by the items is missing from vanilla")
    langs = json.loads((RP / "texts/languages.json").read_text())
    for code in langs:
        if not (RP / f"texts/{code}.lang").exists():
            problems.add("languages.json", f"{code}.lang is listed but missing")


def check_icons(problems):
    from PIL import Image
    for pack in (BP, RP):
        p = pack / "pack_icon.png"
        if not p.exists():
            problems.add(pack.name, "pack_icon.png is missing")
            continue
        img = Image.open(p)
        if img.width != img.height or img.width > 512:
            problems.add(pack.name, f"pack_icon.png should be square and at most 512 px, is {img.size}")


def check_layout(problems):
    allowed = {BP.name: {"manifest.json", "pack_icon.png", "items", "loot_tables", "scripts"},
               RP.name: {"manifest.json", "pack_icon.png", "textures", "texts"}}
    for pack in (BP, RP):
        names = {p.name for p in pack.iterdir()}
        extra = names - allowed[pack.name]
        if extra:
            problems.add(pack.name, f"unexpected files in the pack: {sorted(extra)}")
    scripts = sorted(p.name for p in (BP / "scripts").iterdir())
    if scripts != ["main.js"]:
        problems.add("scripts", f"only the built main.js belongs here, found {scripts}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--samples", type=Path, default=Path(os.environ.get("VMOS_SAMPLES", DEFAULT_SAMPLES)),
                    help="a bedrock-samples checkout (for schemas and vanilla resources)")
    a = ap.parse_args()
    schemas = a.samples / "metadata/json_schemas"
    vanilla_rp = a.samples / "resource_pack"
    if not schemas.exists():
        sys.exit(f"bedrock-samples not found at {a.samples}; pass --samples")
    problems = Problems()
    docs = load_all(problems, BP) | load_all(problems, RP)
    reg = registry(schemas)
    check_manifests(problems, reg, schemas, docs)
    check_items(problems, reg, docs, vanilla_rp)
    check_lang(problems, vanilla_rp)
    check_icons(problems)
    check_layout(problems)
    for p in problems:
        print("VALIDATE:", p)
    print(f"validated {len(docs)} JSON files: {len(problems)} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
