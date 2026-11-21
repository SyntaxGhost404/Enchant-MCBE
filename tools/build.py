"""Build Gloamlight from scratch: every texture and JSON file in pack/ is generated here.

    python tools/build.py              # everything
    python tools/build.py sky water    # only some steps

Needs Python 3.10+, numpy and Pillow, and a checkout of Mojang/bedrock-samples (set BEDROCK_SAMPLES,
default ../mojang/bedrock-samples next to this repository) for the vanilla files the pack extends.
"""
from __future__ import annotations

import sys
import time

from gl import biomes, clouds, colormaps, lights, manifest, package, particles, skybox, sky, validate, water

STEPS = {
    "biomes": biomes.build,
    "sky": sky.build,
    "clouds": clouds.build,
    "water": water.build,
    "colormaps": colormaps.build,
    "lights": lights.build,
    "particles": particles.build,
    "skybox": skybox.build,
    "manifest": manifest.build,
    "validate": validate.run,
    "package": package.build,
}


def main(argv):
    wanted = argv or list(STEPS)
    unknown = [s for s in wanted if s not in STEPS]
    if unknown:
        raise SystemExit(f"Unknown step(s): {unknown}. Steps: {', '.join(STEPS)}")
    results = {}
    for name in wanted:
        t0 = time.time()
        results[name] = STEPS[name]()
        print(f"{name:10s} {time.time() - t0:6.1f}s  {results[name] if results[name] is not None else ''}")
    return results


if __name__ == "__main__":
    main(sys.argv[1:])
