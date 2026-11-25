#!/usr/bin/env python3
"""Builds and checks the add-on's structure loot tables.

Bedrock cannot add entries to a vanilla loot table, only replace the whole file, so each covered chest
table is shipped as an exact copy of the vanilla table with one change: its random enchanted book entry
becomes a reference to a small table of its own. That small table holds the untouched vanilla entry
plus one Vein Miner and one Ore Smelter book. The reference keeps the vanilla entry's weight, so:

  * every other item in the chest keeps exactly its vanilla chance,
  * the chest gives enchanted books exactly as often as before (no extra rolls),
  * one book in RATIO+2 from that entry is one of the new books.

Usage:
  tools/loot.py --from <bedrock-samples>/behavior_pack   regenerate from Mojang's vanilla files
  tools/loot.py --check                                  verify the shipped files (no vanilla files needed)

--check rebuilds each vanilla table from the shipped files and compares it with the fingerprint taken
from Mojang's file, proving nothing but the one entry changed.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BP = ROOT / "VeinMinerOreSmelter_BP"
LOCK = ROOT / "tools" / "loot-lock.json"
DOC = ROOT / "docs" / "loot-coverage.md"
SUB_DIR = "loot_tables/vmos/books"

BOOKS = [
    {"name": "vmos:vein_miner_book", "lore": "§r§7Vein Miner", "label": "Vein Miner"},
    {"name": "vmos:ore_smelter_book", "lore": "§r§7Ore Smelter", "label": "Ore Smelter"},
]

# table, structure, what the replaced entry is, ratio (vanilla weight inside the sub-table; each new book has 1)
# The entry is found by content: a minecraft:book entry whose first function is `function` (and `match`).
PLAN = [
    ("chests/abandoned_mineshaft.json", "Mineshaft (chest minecarts)", "enchant_randomly", None, 10),
    ("chests/ancient_city.json", "Ancient city", "enchant_randomly", None, 10),
    ("chests/bastion_other.json", "Bastion remnant (generic chests)", "specific_enchants", "soul_speed", 18),
    ("chests/desert_pyramid.json", "Desert pyramid", "enchant_randomly", None, 10),
    ("chests/jungle_temple.json", "Jungle pyramid", "enchant_with_levels", None, 10),
    ("chests/monster_room.json", "Monster room", "enchant_randomly", None, 10),
    ("chests/pillager_outpost.json", "Pillager outpost", "enchant_randomly", None, 10),
    ("chests/simple_dungeon.json", "Dungeon", "enchant_randomly", None, 10),
    ("chests/stronghold_corridor.json", "Stronghold (corridor)", "enchant_with_levels", None, 10),
    ("chests/stronghold_crossing.json", "Stronghold (crossing)", "enchant_with_levels", None, 10),
    ("chests/stronghold_library.json", "Stronghold (library)", "enchant_with_levels", None, 10),
    ("chests/trial_chambers/reward_rare.json", "Trial chambers (vault, rare pool)", "enchant_book_for_trading", "efficiency", 10),
    ("chests/trial_chambers/reward_ominous_rare.json", "Trial chambers (ominous vault, rare pool)", "enchant_book_for_trading", "multishot", 10),
    ("chests/underwater_ruin_big.json", "Ocean ruins (big)", "enchant_randomly", None, 10),
    ("chests/woodland_mansion.json", "Woodland mansion", "enchant_randomly", None, 10),
]

# Book entries deliberately left alone, and why (checked to still exist and be unchanged).
LEFT_ALONE = [
    ("chests/ancient_city.json", "swift_sneak", "Swift Sneak is only found in ancient cities; its rate stays as is."),
    ("chests/trial_chambers/reward_rare.json", "mending", "The second vault book set (Mending and trident enchantments) stays as is."),
    ("chests/trial_chambers/reward_ominous_rare.json", "breach", "Mace books (Breach and Density) stay as is."),
    ("chests/trial_chambers/reward_ominous_rare.json", "wind_burst", "Wind Burst is only found in ominous vaults; its rate stays as is."),
]

NOT_STRUCTURES = [
    ("entities/piglin_barter.json", "Piglin bartering (Soul Speed book)"),
    ("entities/raider_drops.json", "Raid captain drops"),
    ("gameplay/fishing/treasure.json", "Fishing treasure"),
]


def lenient_load(text: str):
    """Mojang's JSON allows comments and trailing commas; strip them outside strings."""
    out, i, n, in_str = [], 0, len(text), False
    while i < n:
        c = text[i]
        if in_str:
            out.append(c)
            if c == "\\":
                out.append(text[i + 1])
                i += 2
                continue
            if c == '"':
                in_str = False
            i += 1
            continue
        if c == '"':
            in_str = True
            out.append(c)
            i += 1
            continue
        if text.startswith("//", i):
            while i < n and text[i] != "\n":
                i += 1
            continue
        if text.startswith("/*", i):
            i = text.index("*/", i) + 2
            continue
        out.append(c)
        i += 1
    return json.loads(re.sub(r",(\s*[}\]])", r"\1", "".join(out)))


def canonical(obj) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def fingerprint(obj) -> str:
    return hashlib.sha256(canonical(obj).encode("utf-8")).hexdigest()


def bare(name: str) -> str:
    return name[10:] if isinstance(name, str) and name.startswith("minecraft:") else name


def entry_mentions(entry, word: str) -> bool:
    return word in canonical(entry.get("functions", []))


def find_entry(table, function: str, match: str | None):
    hits = []
    for pi, pool in enumerate(table.get("pools", [])):
        for ei, e in enumerate(pool.get("entries", [])):
            if bare(e.get("type")) != "item" or bare(e.get("name")) != "book":
                continue
            funcs = e.get("functions", [])
            if not funcs or bare(funcs[0].get("function")) != function:
                continue
            if match is not None and not entry_mentions(e, match):
                continue
            hits.append((pi, ei))
    return hits


def slug(table_path: str) -> str:
    return table_path.removeprefix("chests/").removesuffix(".json").replace("/", "_")


def book_entry(book) -> dict:
    return {"type": "item", "name": book["name"], "weight": 1,
            "functions": [{"function": "set_lore", "lore": [book["lore"]]}]}


def build_pair(vanilla, pool_i: int, entry_i: int, ratio: int, sub_name: str):
    original = vanilla["pools"][pool_i]["entries"][entry_i]
    weight = original.get("weight", 1)
    inner = dict(original)
    inner["weight"] = ratio
    sub = {"pools": [{"rolls": 1, "entries": [inner] + [book_entry(b) for b in BOOKS]}]}
    override = json.loads(json.dumps(vanilla))
    override["pools"][pool_i]["entries"][entry_i] = {"type": "loot_table", "name": sub_name, "weight": weight}
    return override, sub


def rebuild_vanilla(override, sub, pool_i: int, entry_i: int, had_weight: bool):
    """Inverse of build_pair: put the sub-table's vanilla entry back with the reference's weight."""
    ref = override["pools"][pool_i]["entries"][entry_i]
    inner = dict(sub["pools"][0]["entries"][0])
    inner["weight"] = ref["weight"]
    if not had_weight:
        inner.pop("weight")
    vanilla = json.loads(json.dumps(override))
    vanilla["pools"][pool_i]["entries"][entry_i] = inner
    return vanilla


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


# ---------------------------------------------------------------- expected counts (exact fractions)

def rolls_mean(rolls) -> Fraction:
    if isinstance(rolls, dict):
        lo, hi = Fraction(rolls.get("min", 0)).limit_denominator(), Fraction(rolls.get("max", 0)).limit_denominator()
        return (Fraction(int(lo)) + Fraction(int(hi))) / 2
    return Fraction(rolls).limit_denominator()


def chance_of(conditions) -> Fraction:
    p = Fraction(1)
    for c in conditions or []:
        if bare(c.get("condition")) == "random_chance":
            p *= Fraction(str(c.get("chance", 1)))
    return p


def entry_key(e) -> str:
    return canonical({"name": e.get("name"), "functions": e.get("functions", [])})


def expected_entries(table, resolve) -> dict[str, Fraction]:
    """Expected number of times each item entry is chosen per chest. Item counts inside entries are ignored."""
    out: dict[str, Fraction] = {}
    for pool in table.get("pools", []):
        entries = pool.get("entries", [])
        total = sum(e.get("weight", 1) for e in entries)
        if total == 0:
            continue
        per_pool = rolls_mean(pool.get("rolls", 1)) * chance_of(pool.get("conditions"))
        for e in entries:
            share = per_pool * Fraction(e.get("weight", 1), total) * chance_of(e.get("conditions"))
            kind = bare(e.get("type"))
            if kind == "loot_table":
                for k, v in expected_entries(resolve(e["name"]), resolve).items():
                    out[k] = out.get(k, Fraction(0)) + share * v
            elif kind == "item":
                k = entry_key(e)
                out[k] = out.get(k, Fraction(0)) + share
    return out


# ---------------------------------------------------------------- generate

def generate(source: Path) -> None:
    lt = source / "loot_tables"
    version = "unknown"
    vj = source.parent / "version.json"
    if vj.exists():
        version = json.loads(vj.read_text())["latest"]["version"]
    lock = {"vanilla_version": version, "ratio_note": "vanilla:vein_miner:ore_smelter inside each sub-table",
            "tables": []}
    cache: dict[str, object] = {}

    def vanilla_table(name: str):
        rel = name.removeprefix("loot_tables/")
        rel = rel if rel.endswith(".json") else rel + ".json"
        if rel not in cache:
            cache[rel] = lenient_load((lt / rel).read_text(encoding="utf-8"))
        return cache[rel]

    shipped: dict[str, object] = {}
    rows = []
    for table, structure, function, match, ratio in PLAN:
        vanilla = vanilla_table(table)
        hits = find_entry(vanilla, function, match)
        if len(hits) != 1:
            raise SystemExit(f"{table}: expected one {function} book entry, found {hits}")
        pi, ei = hits[0]
        sub_name = f"{SUB_DIR}/{slug(table)}.json"
        override, sub = build_pair(vanilla, pi, ei, ratio, sub_name)
        write_json(BP / "loot_tables" / table, override)
        write_json(BP / sub_name, sub)
        shipped[f"loot_tables/{table}"] = override
        shipped[sub_name] = sub
        original = vanilla["pools"][pi]["entries"][ei]
        lock["tables"].append({
            "table": table, "structure": structure, "pool": pi, "entry": ei, "ratio": ratio,
            "vanilla_weight": original.get("weight", 1), "vanilla_has_weight": "weight" in original,
            "vanilla_sha256": fingerprint(vanilla),
        })

    def ours(name: str):
        key = name if name.startswith("loot_tables/") else "loot_tables/" + name
        key = key if key.endswith(".json") else key + ".json"
        return shipped.get(key) or vanilla_table(key)

    def vanilla_resolve(name: str):
        return vanilla_table(name)

    parents = {
        "chests/trial_chambers/reward_rare.json": ("chests/trial_chambers/reward.json", "per vault opening"),
        "chests/trial_chambers/reward_ominous_rare.json": ("chests/trial_chambers/reward_ominous.json", "per ominous vault opening"),
    }
    for entry in lock["tables"]:
        table = entry["table"]
        top, unit = parents.get(table, (table, "per chest"))
        before = expected_entries(vanilla_table(top), vanilla_resolve)
        after = expected_entries(ours(top), ours)
        book_keys = {entry_key(book_entry(b)) for b in BOOKS}
        changed = {k for k in set(before) | set(after) if before.get(k, 0) != after.get(k, 0)} - book_keys
        original = vanilla_table(table)["pools"][entry["pool"]]["entries"][entry["entry"]]
        if changed != {entry_key(original)}:
            raise SystemExit(f"{table}: unexpected change in {changed}")
        k = entry_key(original)
        vm = after[entry_key(book_entry(BOOKS[0]))]
        os_ = after[entry_key(book_entry(BOOKS[1]))]
        if vm != os_:
            raise SystemExit(f"{table}: the two books differ in chance")
        total_books_before = before[k]
        total_books_after = after[k] + vm + os_
        if total_books_before != total_books_after:
            raise SystemExit(f"{table}: book rate changed {total_books_before} -> {total_books_after}")
        rows.append((entry["structure"], table, unit, before[k], after[k], vm, entry["ratio"]))

    write_json(LOCK, lock)
    write_doc(rows, version)
    print(f"generated {len(PLAN)} tables from vanilla {version}")


def num(x: Fraction) -> str:
    v = float(x)
    return f"{v:.3f}" if v >= 0.01 else f"{v:.4f}"


def one_in(x: Fraction) -> str:
    return f"about 1 in {round(1 / float(x))}" if x > 0 else "never"


def write_doc(rows, version: str) -> None:
    lines = [
        "# Where the books are found",
        "",
        f"Generated by `tools/loot.py` from Mojang's vanilla loot tables, version {version}. Do not edit by hand.",
        "",
        "Each table below is the vanilla table with one change: its enchanted book entry also holds a",
        "Vein Miner book and an Ore Smelter book. A chest gives enchanted books exactly as often as in",
        "vanilla, and every other item keeps its vanilla chance; the two new books take a small share",
        "of that one entry. Figures are the average number of books per chest (per vault opening for",
        "trial chambers); for rare finds this is practically the chance of finding one.",
        "",
        "| Structure | Loot table | Enchanted books per chest: vanilla, now | Each new book per chest | Share of that entry |",
        "|---|---|---|---|---|",
    ]
    for structure, table, unit, before, after, vm, ratio in rows:
        where = " per vault opening" if "vault" in unit else ""
        lines.append(
            f"| {structure} | `{table}` | {num(before)}, {num(after)}{where} | {num(vm)} ({one_in(vm)}) | 1 in {ratio + 2} each |"
        )
    lines += [
        "",
        "The bastion's only book is its Soul Speed book, so there the new books take a smaller share (1 in 20",
        "each) to keep Soul Speed close to its vanilla rate.",
        "",
        "## Book entries left as they are",
        "",
    ]
    for table, word, why in LEFT_ALONE:
        lines.append(f"- `{table}`, the {word.replace('_', ' ')} entry: {why}")
    lines += [
        "",
        "## Enchanted book sources that are not structures",
        "",
        "These give enchanted books in vanilla but are not structures, so they are not changed:",
        "",
    ]
    for table, what in NOT_STRUCTURES:
        lines.append(f"- {what} (`{table}`)")
    lines += [
        "",
        "Village librarians trade enchanted books, but trades are not loot tables and can only hold",
        "vanilla enchantments, so the new books are not sold.",
        "",
    ]
    DOC.parent.mkdir(parents=True, exist_ok=True)
    DOC.write_text("\n".join(lines), encoding="utf-8")


# ---------------------------------------------------------------- check

def check() -> int:
    problems = []
    lock = json.loads(LOCK.read_text(encoding="utf-8"))
    planned = {p[0]: p for p in PLAN}
    if {t["table"] for t in lock["tables"]} != set(planned):
        problems.append("loot-lock.json does not list exactly the planned tables")
    expected_files = {f"loot_tables/{t['table']}" for t in lock["tables"]} | {
        f"{SUB_DIR}/{slug(t['table'])}.json" for t in lock["tables"]}
    actual_files = {p.relative_to(BP).as_posix() for p in (BP / "loot_tables").rglob("*.json")}
    if actual_files != expected_files:
        problems.append(f"loot table files differ from the plan: extra {sorted(actual_files - expected_files)}, "
                        f"missing {sorted(expected_files - actual_files)}")
    items = {json.loads(p.read_text())["minecraft:item"]["description"]["identifier"] for p in (BP / "items").glob("*.json")}
    for t in lock["tables"]:
        table = t["table"]
        try:
            override = json.loads((BP / "loot_tables" / table).read_text(encoding="utf-8"))
            sub_name = f"{SUB_DIR}/{slug(table)}.json"
            sub = json.loads((BP / sub_name).read_text(encoding="utf-8"))
        except Exception as e:  # noqa: BLE001
            problems.append(f"{table}: {e}")
            continue
        ref = override["pools"][t["pool"]]["entries"][t["entry"]]
        if ref != {"type": "loot_table", "name": sub_name, "weight": t["vanilla_weight"]}:
            problems.append(f"{table}: the reference entry is not the planned one: {ref}")
        entries = sub["pools"][0]["entries"]
        if sub["pools"][0].get("rolls") != 1 or len(sub["pools"]) != 1:
            problems.append(f"{sub_name}: must be one pool with one roll")
        if [e.get("weight") for e in entries] != [t["ratio"], 1, 1]:
            problems.append(f"{sub_name}: weights must be {t['ratio']}, 1, 1")
        for e, b in zip(entries[1:], BOOKS):
            if e != book_entry(b):
                problems.append(f"{sub_name}: book entry {b['name']} is not as planned")
            if b["name"] not in items:
                problems.append(f"{sub_name}: {b['name']} is not an item of the behavior pack")
        vanilla = rebuild_vanilla(override, sub, t["pool"], t["entry"], t["vanilla_has_weight"])
        if fingerprint(vanilla) != t["vanilla_sha256"]:
            problems.append(f"{table}: the rest of the table differs from vanilla {lock['vanilla_version']}")
        for pool in override["pools"]:
            for e in pool.get("entries", []):
                if e.get("weight", 1) <= 0:
                    problems.append(f"{table}: an entry has weight {e.get('weight')}")
    for table, word, _ in LEFT_ALONE:
        override = json.loads((BP / "loot_tables" / table).read_text(encoding="utf-8"))
        if not any(entry_mentions(e, word) for p in override["pools"] for e in p.get("entries", [])):
            problems.append(f"{table}: the {word} entry that must stay is missing")
    if not DOC.exists():
        problems.append("docs/loot-coverage.md is missing")
    for p in problems:
        print("LOOT:", p)
    print(f"loot check: {len(lock['tables'])} tables, {len(problems)} problem(s)")
    return 1 if problems else 0


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--from", dest="source", type=Path, help="bedrock-samples behavior_pack folder")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    if a.source:
        generate(a.source)
    if a.check or not a.source:
        sys.exit(check())


if __name__ == "__main__":
    main()
