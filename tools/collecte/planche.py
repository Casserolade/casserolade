"""Fabrique des planches-contacts pour vérifier les photos à l'œil. Usage : python3 -I planche.py photos.json dossier_sortie"""
import json, os, sys
from PIL import Image, ImageDraw, ImageOps

COLS, CELL, LABEL, PER_SHEET = 8, 170, 22, 40
data = [r for r in json.load(open(sys.argv[1], encoding="utf8")) if r.get("file")]
os.makedirs(sys.argv[2], exist_ok=True)
for s in range(0, len(data), PER_SHEET):
    chunk = data[s:s + PER_SHEET]
    rows = (len(chunk) + COLS - 1) // COLS
    sheet = Image.new("RGB", (COLS * CELL, rows * (CELL + LABEL)), "white")
    draw = ImageDraw.Draw(sheet)
    for i, r in enumerate(chunk):
        x, y = (i % COLS) * CELL, (i // COLS) * (CELL + LABEL)
        try:
            im = ImageOps.exif_transpose(Image.open(r["file"])).convert("RGB")
            im.thumbnail((CELL - 6, CELL - 6))
            sheet.paste(im, (x + 3, y + LABEL))
        except Exception as e:
            draw.text((x + 4, y + 40), "ILLISIBLE", fill="red")
        draw.text((x + 4, y + 5), r["id"], fill="black")
    sheet.save(os.path.join(sys.argv[2], f"planche_{s // PER_SHEET + 1}.jpg"), quality=85)
print(len(data), "photos sur", (len(data) + PER_SHEET - 1) // PER_SHEET, "planches")
