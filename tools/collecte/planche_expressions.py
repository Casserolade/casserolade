"""Une planche par groupe : une ligne par personne, une colonne par expression et par source. Usage : python3 -I planche_expressions.py dossier_sortie tri1 tri2 ..."""
import os, sys
from PIL import Image, ImageDraw, ImageOps

TAGS = ["neutre", "sourire", "rire", "parle", "cri", "colere", "surpris", "yeux_fermes"]
CELL, LABEL, PER = 120, 110, 16
out, sources = sys.argv[1], sys.argv[2:]
os.makedirs(out, exist_ok=True)
people = sorted({p for s in sources if os.path.isdir(s) for p in os.listdir(s)})
rows = [(p, s) for p in people for s in sources if os.path.isdir(os.path.join(s, p)) and os.listdir(os.path.join(s, p))]
for n in range(0, len(rows), PER):
    chunk = rows[n:n + PER]
    sheet = Image.new("RGB", (LABEL + CELL * len(TAGS), 20 + CELL * len(chunk)), "white")
    d = ImageDraw.Draw(sheet)
    for j, t in enumerate(TAGS):
        d.text((LABEL + j * CELL + 4, 4), t, fill="black")
    for i, (p, s) in enumerate(chunk):
        y = 20 + i * CELL
        d.text((4, y + 40), p, fill="black")
        d.text((4, y + 56), os.path.basename(s), fill="gray")
        for j, t in enumerate(TAGS):
            f = os.path.join(s, p, t + ".jpg")
            if os.path.exists(f):
                im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
                im.thumbnail((CELL - 4, CELL - 4))
                sheet.paste(im, (LABEL + j * CELL + 2, y + 2))
    sheet.save(os.path.join(out, f"expressions_{n // PER + 1}.jpg"), quality=82)
print(len(rows), "lignes")
