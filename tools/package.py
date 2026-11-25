#!/usr/bin/env python3
"""Packs both folders into dist/VeinMinerOreSmelter-<version>.mcaddon. The archive is reproducible: files
are sorted and stamped with a fixed date, so the same sources always give the same bytes."""
from __future__ import annotations

import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKS = ["VeinMinerOreSmelter_BP", "VeinMinerOreSmelter_RP"]
STAMP = (2026, 11, 25, 0, 0, 0)


def main() -> None:
    version = json.loads((ROOT / "package.json").read_text())["version"]
    out = ROOT / "dist" / f"VeinMinerOreSmelter-{version}.mcaddon"
    out.parent.mkdir(exist_ok=True)
    for old in out.parent.glob("VeinMinerOreSmelter-*.mcaddon"):
        if old != out:
            old.unlink()
    files = sorted(p for pack in PACKS for p in (ROOT / pack).rglob("*") if p.is_file())
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in files:
            info = zipfile.ZipInfo(p.relative_to(ROOT).as_posix(), STAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, p.read_bytes())
    print(f"{out.relative_to(ROOT)}: {len(files)} files, {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
