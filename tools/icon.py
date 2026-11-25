#!/usr/bin/env python3
"""Draws the pack icon: an original 32x32 pixel picture (a pickaxe over a glowing ore vein, and an ingot
fresh from the smelter), scaled to 256x256 without smoothing. Deterministic: same file every run."""
from __future__ import annotations

import random
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
N = 32

STONE = [(52, 55, 63), (58, 62, 71), (64, 68, 78), (47, 50, 58), (70, 74, 85)]
ORE = [(232, 150, 64), (247, 190, 96), (196, 110, 44), (255, 222, 140)]
LINK = (128, 92, 62)
HANDLE = [(120, 78, 44), (148, 98, 56), (92, 58, 33)]
HEAD = [(196, 205, 214), (234, 240, 246), (142, 152, 163), (104, 112, 122)]
GLINT = (196, 140, 255)
INGOT = [(255, 214, 102), (255, 238, 170), (214, 160, 48), (170, 118, 30)]
FLAME = [(255, 120, 40), (255, 180, 60), (255, 236, 150)]
OUTLINE = (24, 22, 28)


def draw() -> Image.Image:
    rng = random.Random(20261125)
    img = Image.new("RGB", (N, N))
    px = img.load()
    # stone: 4x4 blocks of a slightly different shade, with fine noise
    for by in range(0, N, 4):
        for bx in range(0, N, 4):
            base = rng.choice(STONE)
            for y in range(by, by + 4):
                for x in range(bx, bx + 4):
                    d = rng.randint(-4, 4)
                    px[x, y] = tuple(max(0, min(255, c + d)) for c in base)
    # the vein: ore cells along a branching path, linked by a warm line
    cells = [(3, 25), (7, 22), (11, 20), (15, 17), (19, 15), (23, 12), (27, 10), (15, 22), (19, 24)]
    links = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (3, 7), (7, 8)]
    for a, b in links:
        (x0, y0), (x1, y1) = cells[a], cells[b]
        steps = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(steps + 1):
            x = round(x0 + (x1 - x0) * i / steps)
            y = round(y0 + (y1 - y0) * i / steps)
            px[x, y] = LINK
    for cx, cy in cells:
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                x, y = cx + dx, cy + dy
                if not (0 <= x < N and 0 <= y < N) or (abs(dx) + abs(dy) == 2 and (dx, dy) != (-1, -1)):
                    continue
                c = 3 if (dx, dy) == (-1, -1) else 1 if dx + dy < 0 else 2 if dx + dy > 0 else 0
                px[x, y] = ORE[c]
    # pickaxe: handle from bottom left up to the head at the top right
    handle = [(4 + i, 27 - i) for i in range(17)]
    for x, y in handle:
        for dx, dy, c in [(0, 0, 0), (1, 0, 1), (0, 1, 2)]:
            px[x + dx, y + dy] = HANDLE[c]
    for x, y in handle:
        for ox, oy in [(-1, 0), (0, -1), (2, 0), (0, 2), (1, 1)]:
            if px[x + ox, y + oy] not in HANDLE:
                px[x + ox, y + oy] = OUTLINE
    head = [(13, 5), (14, 5), (15, 5), (16, 5), (17, 5), (18, 6), (19, 6), (20, 7), (21, 7), (22, 8),
            (23, 9), (24, 10), (25, 11), (25, 12), (26, 13), (26, 14), (26, 15), (26, 16),
            (14, 4), (15, 4), (16, 4), (17, 4), (18, 5), (19, 5), (20, 6), (21, 6), (22, 7), (23, 8),
            (24, 9), (25, 10), (26, 11), (26, 12), (27, 13), (27, 14), (27, 15)]
    for x, y in head:
        px[x, y] = HEAD[0]
    for x, y in [(14, 4), (16, 4), (19, 5), (22, 7), (25, 10), (27, 13)]:
        px[x, y] = HEAD[1]
    for x, y in [(13, 5), (18, 6), (21, 7), (24, 10), (26, 16), (25, 12)]:
        px[x, y] = HEAD[2]
    for x, y in [(15, 4), (20, 6), (23, 8), (26, 11), (27, 14)]:
        px[x, y] = GLINT
    head_set = set(head)
    for x, y in head:
        for ox, oy in [(0, -1), (0, 1), (-1, 0), (1, 0)]:
            p = (x + ox, y + oy)
            if 0 <= p[0] < N and 0 <= p[1] < N and p not in head_set and px[p] not in HANDLE:
                px[p] = OUTLINE
    # ingot with a small flame, bottom right: lighter top face, front face, dark outline
    for x in range(21, 30):
        px[x, 24] = OUTLINE
    for y in (25, 26):
        for x in range(21 - (y - 25), 30 + (y - 25)):
            px[x, y] = INGOT[1] if y == 25 else INGOT[0]
        px[20 - (y - 25), y] = OUTLINE
        if 30 + (y - 25) < N:
            px[30 + (y - 25), y] = OUTLINE
    for y in range(27, 30):
        for x in range(19, 31):
            px[x, y] = INGOT[2] if y < 29 else INGOT[3]
        px[18, y] = OUTLINE
        px[31, y] = OUTLINE
    for x in range(18, N):
        px[x, 30] = OUTLINE
    for x, y, c in [(25, 20, 2), (24, 21, 1), (25, 21, 2), (26, 21, 0), (24, 22, 0), (25, 22, 1), (26, 22, 1), (25, 23, 0)]:
        px[x, y] = FLAME[c]
    return img


def main() -> None:
    icon = draw().resize((256, 256), Image.NEAREST)
    for pack in ("VeinMinerOreSmelter_BP", "VeinMinerOreSmelter_RP"):
        icon.save(ROOT / pack / "pack_icon.png", optimize=True)
    print("pack icons written")


if __name__ == "__main__":
    main()
