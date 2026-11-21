"""Zip pack/ into dist/Gloamlight_<version>.mcpack. Entries are sorted and time-stamped from the last
commit that touched pack/, so the same sources always give a byte-identical file."""
from __future__ import annotations

import hashlib
import subprocess
import time
import zipfile

from .common import PACK, ROOT
from .manifest import VERSION


def _stamp():
    try:
        out = subprocess.run(["git", "log", "-1", "--format=%ct", "--", "pack"], cwd=ROOT,
                             capture_output=True, text=True, check=True).stdout.strip()
        if out:
            return time.gmtime(int(out))[:6]
    except Exception:
        pass
    return (2026, 1, 1, 0, 0, 0)


def build():
    dist = ROOT / "dist"
    dist.mkdir(exist_ok=True)
    target = dist / f"Gloamlight_{VERSION}.mcpack"
    stamp = _stamp()
    files = sorted(p for p in PACK.rglob("*") if p.is_file())
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in files:
            info = zipfile.ZipInfo(p.relative_to(PACK).as_posix(), date_time=stamp)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, p.read_bytes())
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    return {"file": target.name, "files": len(files), "mb": round(target.stat().st_size / 1e6, 2), "sha256": digest[:16]}
