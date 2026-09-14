#!/usr/bin/env python3
"""Turn the imported controlled OUR TEAM photographs into web assets.

scripts/fetch-team-assets.mjs downloads the originals from the controlled
SharePoint folder as PNGs of 350KB-1.7MB each. This crops them to the 3:4
portrait the page renders, caps them at 720px wide and writes JPEGs, so the
page ships well under a megabyte of photography instead of 7.6MB.

Run from the repository root, after the import:  python3 scripts/optimise-team-photos.py
The source PNGs are not kept in the repository; SharePoint remains the
record copy and the importer can always fetch them again.
"""
from PIL import Image
from pathlib import Path

TEAM = Path("client/public/team")
TARGET_RATIO = 3 / 4  # width / height
MAX_WIDTH = 720

for source in sorted(TEAM.glob("*.png")):
    image = Image.open(source).convert("RGB")
    width, height = image.size
    # Crop to 3:4, centred horizontally and anchored to the top, matching the
    # card's `object-cover object-top` so heads are never cut off.
    if width / height > TARGET_RATIO:
        new_width = round(height * TARGET_RATIO)
        left = (width - new_width) // 2
        image = image.crop((left, 0, left + new_width, height))
    else:
        new_height = round(width / TARGET_RATIO)
        image = image.crop((0, 0, width, min(new_height, height)))
    if image.width > MAX_WIDTH:
        image = image.resize((MAX_WIDTH, round(MAX_WIDTH / TARGET_RATIO)), Image.LANCZOS)
    destination = source.with_suffix(".jpg")
    image.save(destination, "JPEG", quality=84, optimize=True, progressive=True)
    print(f"{destination.name}: {image.width}x{image.height}, {destination.stat().st_size // 1024}KB")
