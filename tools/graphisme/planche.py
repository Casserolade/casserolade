"""Assemble une séquence PNG rendue par Hyperframes en planche WebP, et note sa description.

Usage : uv run --with pillow python tools/graphisme/planche.py <dossier_png> <id> <fps> <échelle> <colonnes> [impact=3] [ancre=0,0] [tient=1] [boucle=1]
Écrit assets/game/effets/<id>.webp et assets/game/effets/<id>.json (fusionné par manifest.py).
"""
import glob
import json
import math
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTPUT_DIR = os.path.join(ROOT, "assets/game/effets")
MAX_TEXTURE = 4096  # safe limit on phones


def main():
    source, effect_id, fps, scale, columns = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5])
    options = dict(argument.split("=") for argument in sys.argv[6:])
    paths = sorted(glob.glob(os.path.join(source, "*.png")))
    first = Image.open(paths[0])
    cell_w, cell_h = round(first.width * scale), round(first.height * scale)
    rows = math.ceil(len(paths) / columns)
    width, height = cell_w * columns, cell_h * rows
    if max(width, height) > MAX_TEXTURE:
        sys.exit(f"Planche trop grande : {width}x{height}")
    sheet = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    for index, path in enumerate(paths):
        frame = Image.open(path).convert("RGBA").resize((cell_w, cell_h), Image.LANCZOS)
        sheet.paste(frame, ((index % columns) * cell_w, (index // columns) * cell_h))
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    target = os.path.join(OUTPUT_DIR, f"{effect_id}.webp")
    sheet.save(target, "WEBP", quality=80, method=6)
    description = {"atlas": f"effets/{effect_id}.webp", "cols": columns, "rows": rows, "images": len(paths),
                   "cell": [cell_w, cell_h], "fps": fps, "ancre": [float(value) for value in options.get("ancre", "0.5,1").split(",")]}
    if "impact" in options:
        description["impact"] = int(options["impact"])
    if "tient" in options:
        description["tient"] = True    # the last frame stays on screen
    if "boucle" in options:
        description["boucle"] = True
    with open(os.path.join(OUTPUT_DIR, f"{effect_id}.json"), "w", encoding="utf8") as handle:
        json.dump(description, handle, ensure_ascii=False, indent=1)
    print(effect_id, f"{width}x{height}", f"{os.path.getsize(target) / 1024:.0f} Ko")


if __name__ == "__main__":
    main()
