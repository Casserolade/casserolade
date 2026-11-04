"""Planche de contrôle des découpes : chaque tête, mâchoire fermée et ouverte, avec son nom et ses alertes.

Usage : uv run --with pillow python tools/graphisme/planche_decoupes.py <dossier_de_sortie> [par_page] [ids…]
"""
import glob
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GAME = os.path.join(ROOT, "assets/game/personnages")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
CELL_W, CELL_H = 200, 262
COLUMNS = 8
HEAD_HEIGHT = 196
JAW_DROP = 40


def draw_head(sheet, atlas, description, x, y, scale):
    head_box, jaw_box = description["pieces"]["tete"], description["pieces"]["machoire"]
    crop = lambda box: atlas.crop((box["x"], box["y"], box["x"] + box["w"], box["y"] + box["h"]))
    head, jaw = crop(head_box), crop(jaw_box)
    head = head.resize((int(head.width * scale), int(head.height * scale)), Image.LANCZOS)
    jaw = jaw.resize((int(jaw.width * scale), int(jaw.height * scale)), Image.LANCZOS)
    sheet.paste(head, (x, y), head)
    sheet.paste(jaw, (int(x + jaw_box["pose"][0] * scale), int(y + jaw_box["pose"][1] * scale) + JAW_DROP // 2), jaw)


def label_for(character_id, portraits, report):
    entry = report.get(character_id, {})
    alerts = []
    if entry.get("basse_definition"):
        alerts.append("FLOU")
    if entry.get("visages", 1) > 1:
        alerts.append(f"{entry['visages']} VISAGES")
    return portraits.get(character_id, {}).get("name", character_id), " ".join(alerts)


def main():
    target = sys.argv[1]
    per_page = int(sys.argv[2]) if len(sys.argv) > 2 else 32
    os.makedirs(target, exist_ok=True)
    with open(os.path.join(ROOT, "data/collecte/portraits.json"), encoding="utf8") as handle:
        portraits = json.load(handle)
    with open(os.path.join(ROOT, "data/collecte/decoupe.json"), encoding="utf8") as handle:
        report = json.load(handle)
    ids = sys.argv[3:] or sorted(os.path.splitext(os.path.basename(path))[0]
                                 for path in glob.glob(os.path.join(GAME, "*.json")))
    name_font, alert_font = ImageFont.truetype(FONT, 14), ImageFont.truetype(FONT, 13)
    for page in range(0, len(ids), per_page):
        chunk = ids[page:page + per_page]
        rows = (len(chunk) + COLUMNS - 1) // COLUMNS
        sheet = Image.new("RGB", (CELL_W * COLUMNS, CELL_H * rows), (52, 92, 150))
        draw = ImageDraw.Draw(sheet)
        for index, character_id in enumerate(chunk):
            x, y = (index % COLUMNS) * CELL_W, (index // COLUMNS) * CELL_H
            with open(os.path.join(GAME, f"{character_id}.json"), encoding="utf8") as handle:
                description = json.load(handle)
            atlas = Image.open(os.path.join(GAME, f"{character_id}.webp")).convert("RGBA")
            scale = HEAD_HEIGHT / description["pieces"]["tete"]["h"]
            offset = (CELL_W - int(description["pieces"]["tete"]["w"] * scale)) // 2
            draw_head(sheet, atlas, description, x + offset, y + 4, scale)
            name, alerts = label_for(character_id, portraits, report)
            draw.text((x + CELL_W / 2, y + CELL_H - 30), name, font=name_font, fill="white", anchor="mm",
                      stroke_width=2, stroke_fill="black")
            if alerts:
                draw.text((x + CELL_W / 2, y + CELL_H - 12), alerts, font=alert_font, fill="#ffd21f", anchor="mm",
                          stroke_width=2, stroke_fill="black")
        path = os.path.join(target, f"decoupes_{page // per_page + 1}.jpg")
        sheet.save(path, quality=88)
        print(path)


if __name__ == "__main__":
    main()
