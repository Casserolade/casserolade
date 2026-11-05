"""Les plateaux télé, chacun avec sa propre composition : on doit reconnaître l'émission au premier coup d'œil.

Lancer avec uv :
  uv run --no-project --python 3.11 --with bpy --with pillow python tools/graphisme/studios_3d.py [--samples 96] [--out dossier] [ids…]

Retour de partie (3 novembre 2026) : « les plateaux de télé se ressemblent trop ». Les quatorze sortaient
du même squelette (trois écrans rayés, deux gradins, une scène ronde, deux bureaux). Ici, chaque émission a sa
signature, inspirée des vrais plateaux : les formes qui flottent de TPMP, les triangles de Face à face, le mur
de plantes de C à vous, l'hémicycle de LCP, les rideaux du Sénat, la carte de LCI, les chronos du débat.
La table du jeu couvre le centre de l'image : les signatures sont sur les bords et dans les coins.
Les vraies chaînes, sous leur vrai nom (consigne du 3 novembre 2026). Mêmes ids que src/data/plateaux.ts.
"""
import argparse
import math
import os
import random
import sys
import tempfile

import bpy
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plateau_3d_kit import bloom, fixture, haze, lacquer, truss, tv_camera  # noqa: E402
from test_style_cnews import soignee as cnews_soignee  # noqa: E402
from studio_kit import (LOGO_FONT, ROOT, TEXT_FONT, area, audience, beam, box, chair, curtain, cylinder, fitted_font, glow,  # noqa: E402
                        leaf_cluster, panel, picture, point, rgb, sphere, spot, surface, text_image, torus)

# Plus grand que la table (1920×1080) : des marges pour les écrans qui ne sont pas en 16:9.
# Le cadre de la table reste celui d'un 22 mm, au centre de l'image.
TABLE_WIDTH = 1920
WIDTH, HEIGHT = 2560, 1440


def room(wall, floor, floor_rough=0.16, wall_rough=0.6):
    """Le mur du fond et le sol laqué d'un plateau, qui reflète les néons et les écrans."""
    box("floor", (0, 0, -0.05), (140, 90, 0.1), lacquer("floor", floor, floor_rough))
    box("wall", (0, 16, 10), (110, 0.4, 30), surface("wall", wall, wall_rough))


LOGOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logos")


def logo_sign(directory, name, logo, center, width, background="#ffffff", padding=0.12, strength=1.3, rotation=(0.0, 0.0, 0.0)):
    """Le vrai logo de la chaîne (tools/graphisme/logos, sources.json), posé sur une enseigne de la couleur voulue."""
    art = Image.open(os.path.join(LOGOS, f"{logo}.png")).convert("RGBA")
    pad = int(max(art.size) * padding)
    plate = Image.new("RGBA", (art.width + 2 * pad, art.height + 2 * pad), background)
    plate.alpha_composite(art, (pad, pad))
    path = os.path.join(directory, f"{name}.png")
    plate.convert("RGB").save(path)
    height = width * plate.height / plate.width
    return panel(name, center, width, height, picture(name, path, strength), rotation)


def logo_panel(directory, name, text, center, width, height, color="#ffffff", background="#000000", strength=1.4, stroke=None):
    path = text_image(os.path.join(directory, f"{name}.png"), (1024, int(1024 * height / width)), text, color, background, stroke=stroke)
    return panel(name, center, width, height, picture(name, path, strength))


# ---------------------------------------------------------------------------- les plateaux

def france3(d, rng):
    """L'édition locale : un fond bleu, une carte de la région, une plante, et la banderole de la foire."""
    room("#2f62a8", "#3a3d44", 0.5)
    # La carte de la région, sur le mur de droite : une tache verte, des villes, une rivière.
    path = os.path.join(d, "carte.png")
    image = Image.new("RGB", (900, 700), "#6d9fd6")
    draw = ImageDraw.Draw(image)
    blob = [(180, 120), (420, 60), (700, 140), (800, 360), (690, 600), (420, 650), (200, 560), (90, 330)]
    draw.polygon(blob, fill="#a8cf7a", outline="#ffffff", width=8)
    draw.line([(150, 420), (360, 380), (520, 450), (760, 400)], fill="#4a86d0", width=14)
    font = fitted_font(TEXT_FONT, "PITHIVIERS", 44, 300)
    for x, y, name in [(300, 250, "PITHIVIERS"), (560, 300, "MONTARGIS"), (420, 520, "GIEN")]:
        draw.ellipse([x - 12, y - 12, x + 12, y + 12], fill="#d8202e", outline="white", width=4)
        draw.text((x + 22, y), name, font=font, fill="#1a2a50", anchor="lm")
    image.save(path)
    panel("carte", (17.5, 12.0, 7.4), 11, 8.6, picture("carte", path, 1.0), (0, 0, math.radians(-28)))
    box("carte_cadre", (17.6, 12.1, 7.4), (11.4, 0.2, 9.0), surface("cadre", "#d9dde4", 0.4), (0, 0, math.radians(-28)))
    # Le logo, sobre, en haut à gauche.
    logo_sign(d, "logo", "france3_centre", (-17.0, 15.6, 12.7), 9.5, "#ffffff", 0.08, 1.1)
    # La banderole de la foire, accrochée de travers.
    path = text_image(os.path.join(d, "banderole.png"), (1400, 220), "FOIRE AUX BESTIAUX : LE BILAN", "#7a2a10", "#f4e3b0", TEXT_FONT)
    panel("banderole", (14.0, 14.8, 12.4), 18, 2.6, picture("banderole", path, 0.7), (0, math.radians(4), 0))
    # Une plante en pot, un bureau de récupération, une seule caméra.
    pot = surface("pot", "#a0522d", 0.6)
    cylinder("pot", (-9.5, 2.0, 0), 0.7, 1.3, pot, radius_top=0.9)
    leaf_cluster("plante", (-9.5, 2.0, 2.6), 1.6, 40, rng, ["#3f7f3a", "#5a9a45", "#2f6a30"])
    wood = surface("bureau", "#8a6a4a", 0.5)
    box("bureau", (-6.8, -5.2, 0.6), (4.2, 1.4, 1.2), wood, bevel=0.03)
    box("bureau_dessus", (-6.8, -5.2, 1.25), (4.6, 1.7, 0.08), surface("dessus", "#cfc8bc", 0.3))
    cylinder("mug", (-5.5, -5.3, 1.29), 0.12, 0.25, surface("mug", "#ffffff", 0.3))
    # Un seul néon, un peu vert : c'est la région.
    area("neon", (0, -2, 13), 30, 3.5e4, "#e8fff0")
    spot("douche", (-12, 0, 12), (-9.5, 2.0, 1.5), 1.2e4, "#fff3d0", 30, 0.6)


def hanouna(d, rng):
    """W9 : un bleu électrique, des formes géométriques qui flottent, des gradins de toutes les couleurs."""
    room("#1d66ff", "#120a3a", 0.25)
    colors = ["#ffd400", "#ff2fa8", "#22e1ff", "#8a3bff", "#ff7a00", "#ffffff"]
    mats = [surface(f"forme{i}", c, 0.3, coat=0.8) for i, c in enumerate(colors)]
    for i in range(34):
        side = -1 if i % 2 else 1
        x = side * rng.uniform(9, 24)
        y = rng.uniform(4, 15)
        z = rng.uniform(4, 15.5)
        if abs(x) < 15 and z < 11:
            z = rng.uniform(11, 15.5)
        # Le logo de la chaîne reste visible.
        if abs(x + 15) < 7 and z > 10.5:
            x = -x
        size = rng.uniform(0.8, 2.2)
        kind = rng.random()
        mat = rng.choice(mats)
        rot = (rng.uniform(0, 3), rng.uniform(0, 3), rng.uniform(0, 3))
        if kind < 0.4:
            box("cube", (x, y, z), (size, size, size), mat, rot, bevel=0.08)
        elif kind < 0.65:
            cylinder("cylindre", (x, y, z), size * 0.45, size * 1.2, mat, rotation=rot)
        elif kind < 0.85:
            sphere("boule", (x, y, z), size * 0.55, mat)
        else:
            torus("anneau", (x, y, z), size * 0.6, size * 0.18, mat, rot)
    # Les néons roses du fond.
    pink = glow("neon_rose", "#ff3fb4", 8)
    for x in (-21, -14, 14, 21):
        box("neon", (x, 15.6, 8), (0.18, 0.1, 15), pink)
    logo_sign(d, "logo", "w9", (-15, 15.5, 12.5), 6.5, "#ffffff", 0.1, 1.4)
    lit = glow("gradin_neon", "#ffd400", 4)
    palette = ["#ff2fa8", "#ffd400", "#22e1ff", "#ffffff", "#ff7a00", "#8a3bff", "#1a1a1a"]
    audience("public_g", 4, 9, (-16.5, 4, 0), (1.2, 0.8), 0.9, rng, palette, facing=math.radians(62), lit=lit)
    audience("public_d", 4, 9, (16.5, 4, 0), (1.2, 0.8), 0.9, rng, palette, facing=math.radians(-62), lit=lit)
    # Le grand bureau blanc des chroniqueurs, et leurs chaises de couleur.
    white = surface("bureau", "#d8d8e2", 0.2, coat=1.0)
    for side in (-1, 1):
        box("bureau", (side * 7.2, -6.2, 0.7), (5.4, 1.5, 1.4), white, (0, 0, side * 0.25), bevel=0.1)
    for i, x in enumerate((-8.4, -6.0, 6.0, 8.4)):
        chair("chaise", (x, -4.9, 0), mats[i % len(mats)], math.pi)
    area("cle", (0, -6, 14), 36, 4.0e4, "#ffffff")
    spot("rose", (-18, -6, 12), (-10, 8, 2), 3.0e4, "#ff3fb4", 60, 0.8)
    spot("jaune", (18, -6, 12), (10, 8, 2), 3.0e4, "#ffd400", 60, 0.8)


def lcp(d, rng):
    """LCP : l'hémicycle, ses gradins de velours rouge, des boiseries, et onze spectateurs."""
    room("#5a3418", "#2a1a10", 0.35, 0.5)
    velvet = surface("velours", "#b0101e", 0.85)
    wood = surface("bois", "#6a3e20", 0.45)
    for side in (-1, 1):
        for row in range(7):
            radius = 13 + row * 1.6
            z = row * 0.75
            for k in range(9):
                a = math.radians(12 + k * 7.5)
                x = side * radius * math.cos(a)
                y = -3 + radius * math.sin(a)
                rot = (0, 0, side * (math.pi / 2 - a) * -1)
                box("pupitre", (x, y, z + 0.45), (1.3, 0.55, 0.9), wood, rot, bevel=0.03)
                box("siege", (x - side * 0.0, y + 0.55, z + 0.5), (1.1, 0.6, 1.0), velvet, rot, bevel=0.06)
    # Les boiseries du fond, et le drapeau en bandes verticales.
    for i in range(-10, 11):
        box("lambris", (i * 2.4, 15.7, 9), (2.2, 0.15, 18), wood, bevel=0.05)
    for i, c in enumerate(("#1d3a96", "#f4f1e8", "#c8202e")):
        box("drapeau", (14.2 + i * 1.3, 15.5, 12.5), (1.3, 0.1, 6), surface(f"drapeau{i}", c, 0.7))
    logo_panel(d, "logo", "LCP", (-17, 15.4, 12.9), 6, 2.4, "#ffffff", "#d21f3c", 1.3)
    # Onze spectateurs, éparpillés : on les compte.
    palette = ["#2a2a30", "#5a5a60", "#1a2a4a"]
    for i in range(11):
        side = -1 if i % 2 else 1
        audience(f"public{i}", 1, 1, (side * rng.uniform(13, 21), rng.uniform(4, 12), rng.randrange(0, 4) * 0.75), (1, 0.75), 1, rng, palette)
    area("lustre", (0, 4, 14), 30, 2.0e4, "#fff2e4")
    spot("tribune", (0, -8, 12), (0, 2, 1), 1.6e4, "#fff6ea", 50, 0.8)


def public_senat(d, rng):
    """Public Sénat : velours rouge, boiseries dorées, lustres de cristal, et la lumière d'une sieste."""
    room("#3a0c12", "#1e0a08", 0.4, 0.6)
    velvet = surface("velours", "#8e1018", 0.8)
    for side in (-1, 1):
        curtain("rideau", (side * 19, 11, 8), 10, 18, velvet, folds=9, depth=0.45)
        box("embrasse", (side * 15, 10.6, 6), (0.4, 0.4, 0.4), surface("or", "#d9a441", 0.25, 1.0), bevel=0.1)
    gold = surface("dore", "#c9973a", 0.25, 1.0)
    for i in range(-6, 7):
        box("cadre_dore", (i * 3.4, 15.6, 12.5), (3.0, 0.12, 4.2), gold, bevel=0.06)
        box("toile", (i * 3.4, 15.5, 12.5), (2.4, 0.1, 3.4), surface(f"toile{i}", rng.choice(["#3a2418", "#2a1a2a", "#1a2a2a"]), 0.7))
    crystal = glow("cristal", "#fff1c8", 9)
    for side in (-1, 1):
        cx, cy, cz = side * 13, 7, 11.6
        torus("lustre", (cx, cy, cz), 1.2, 0.08, gold)
        for k in range(14):
            a = k / 14 * math.tau
            sphere("pampille", (cx + 1.2 * math.cos(a), cy + 1.2 * math.sin(a), cz - 0.35), 0.14, crystal)
        sphere("coeur", (cx, cy, cz - 0.6), 0.35, crystal)
        point("lustre_lumiere", (cx, cy, cz - 0.8), 1500, "#ffd9a0", 0.6)
    leather = surface("cuir", "#4a1a10", 0.45)
    for side in (-1, 1):
        x = side * 7
        box("fauteuil", (x, -4.8, 0.55), (2.0, 1.8, 1.1), leather, (0, 0, side * 0.35), bevel=0.2)
        box("dossier", (x + side * 0.1, -4.0, 1.4), (2.0, 0.5, 1.6), leather, (0, 0, side * 0.35), bevel=0.2)
    logo_panel(d, "logo", "PUBLIC SÉNAT", (13.2, 15.4, 13.0), 8, 1.5, "#ffffff", "#b01e3c", 1.2)
    area("tamise", (0, 0, 12), 30, 1.4e4, "#ffcf9a")


def lci(d, rng):
    """LCI : un plateau blanc et bleu, et la carte d'état-major géante, avec ses flèches."""
    room("#b8c4d6", "#4a5468", 0.25, 0.4)
    path = os.path.join(d, "carte.png")
    image = Image.new("RGB", (1400, 900), "#0a2a5a")
    draw = ImageDraw.Draw(image)
    for i in range(0, 1400, 70):
        draw.line([(i, 0), (i, 900)], fill="#14407a", width=2)
    for j in range(0, 900, 70):
        draw.line([(0, j), (1400, j)], fill="#14407a", width=2)
    land = [(100, 200), (500, 120), (900, 160), (1300, 300), (1250, 700), (800, 820), (300, 760), (60, 520)]
    draw.polygon(land, fill="#2c5a8a", outline="#9fd0ff", width=6)
    front = [(560, 140), (620, 320), (580, 500), (660, 700), (640, 830)]
    draw.line(front, fill="#ff3040", width=16, joint="curve")
    for (x0, y0, x1, y1, c) in [(300, 400, 520, 360, "#3aa0ff"), (900, 300, 700, 380, "#ff3040"), (950, 600, 720, 560, "#ff3040"), (250, 620, 500, 600, "#3aa0ff")]:
        draw.line([(x0, y0), (x1, y1)], fill=c, width=26)
        a = math.atan2(y1 - y0, x1 - x0)
        draw.polygon([(x1 + 40 * math.cos(a), y1 + 40 * math.sin(a)), (x1 + 30 * math.cos(a + 2.3), y1 + 30 * math.sin(a + 2.3)), (x1 + 30 * math.cos(a - 2.3), y1 + 30 * math.sin(a - 2.3))], fill=c)
    image.save(path)
    carte = picture("carte", path, 1.5)
    frame = surface("cadre", "#f4f6fa", 0.3)
    for side in (-1, 1):
        rot = (0, 0, -side * math.radians(26))
        box("cadre", (side * 18.5, 9.5, 7.5), (12.4, 0.25, 8.4), frame, rot)
        panel("carte", (side * 18.42, 9.35, 7.5), 12, 8, carte, rot)
    logo_panel(d, "logo", "LCI", (-14.8, 8.8, 11.2), 3.6, 1.7, "#ffffff", "#1a4fd0", 1.3)
    # Le pupitre du général, et sa baguette.
    box("pupitre", (-7.2, -4.8, 0.65), (1.8, 1.2, 1.3), surface("pupitre", "#0a3a8a", 0.3), (0, 0, 0.3), bevel=0.05)
    cylinder("baguette", (-6.4, -4.5, 1.3), 0.03, 2.0, surface("baguette", "#d9a441", 0.3, 0.8), rotation=(0.6, 0.4, 0))
    blue = glow("liseré", "#35a4ff", 6)
    box("liseré_sol", (0, 8, 0.02), (40, 0.12, 0.02), blue)
    area("studio", (0, -4, 14), 36, 2.2e4, "#f4f8ff")
    spot("bleu_g", (-22, -4, 10), (-16, 9, 4), 1.6e4, "#35a4ff", 45, 0.8)
    spot("bleu_d", (22, -4, 10), (16, 9, 4), 1.6e4, "#35a4ff", 45, 0.8)


def bfm(d, rng):
    """BFMTV, Face à face : des triangles rouges et roses partout, une table blanche, l'alerte info."""
    room("#c8102e", "#1a0610", 0.25, 0.5)
    reds = [surface(f"tri{i}", c, 0.5) for i, c in enumerate(("#e8202a", "#ff5a7a", "#a00a1e", "#ff8aa0", "#ffffff"))]
    for i in range(46):
        side = -1 if i % 2 else 1
        x = side * rng.uniform(8, 25)
        z = rng.uniform(1, 16)
        if abs(x) < 16 and z < 11.5:
            z = rng.uniform(11.5, 16)
        if -19.5 < x < -12 and 9.5 < z < 15.5 or 9.5 < x < 21.5 and 9.6 < z < 14.6:
            continue
        s = rng.uniform(1.5, 4.5)
        mesh = bpy.data.meshes.new("triangle")
        mesh.from_pydata([(-s / 2, 0, -s / 2), (s / 2, 0, -s / 2), (0, 0, s / 2)], [], [(0, 1, 2)])
        obj = bpy.data.objects.new("triangle", mesh)
        obj.location = (x, rng.uniform(13, 15.5), z)
        obj.rotation_euler = (0, rng.uniform(0, math.tau), 0)
        obj.data.materials.append(rng.choice(reds))
        bpy.context.scene.collection.objects.link(obj)
    # Les lettres du face à face, en grand dans le coin.
    logo_panel(d, "face", "FACE À FACE", (15.5, 15.0, 12.1), 10, 2.3, "#ffffff", "#c8102e", 1.4)
    logo_sign(d, "logo", "bfmtv", (-15.8, 14.8, 12.3), 5.0, "#0b3a9b", 0.02, 1.3)
    # L'alerte info, en bandeau.
    path = text_image(os.path.join(d, "alerte.png"), (2048, 140), "ALERTE INFO : C'EST VOUS", "#ffffff", "#e8202a", TEXT_FONT)
    panel("alerte", (0, 12.0, 0.9), 40, 1.6, picture("alerte", path, 1.6))
    # La table blanche du face à face, et les logos sur sa face avant.
    white = surface("table", "#f6f6f8", 0.2, coat=1.0)
    box("table", (0, -5.6, 0.78), (13, 2.6, 0.12), white, bevel=0.05)
    path = text_image(os.path.join(d, "facade.png"), (2048, 160), "BFMTV  ·  RMC  ·  BFMTV  ·  RMC  ·  BFMTV  ·  RMC", "#ffffff", "#c8102e", TEXT_FONT)
    panel("facade", (0, -6.95, 0.45), 12.6, 0.7, picture("facade", path, 1.2))
    box("pied", (0, -5.6, 0.36), (12.4, 2.2, 0.7), surface("pied", "#e9e9ee", 0.3))
    area("cle", (0, -4, 13), 34, 6.0e4, "#fff4f4")
    spot("bleu", (-20, -8, 9), (-6, 4, 2), 2.0e4, "#2f6bff", 50, 0.8)


def c_a_vous(d, rng):
    """C à vous : un mur de plantes, des suspensions chaudes, la table du dîner, les assiettes et les verres."""
    room("#3a4a2c", "#4a2c18", 0.3, 0.8)
    greens = ["#2f6a30", "#3f8a3a", "#5aa04a", "#1f4a24", "#78b45a"]
    for side in (-1, 1):
        for k in range(16):
            leaf_cluster("plantes", (side * rng.uniform(10, 24), rng.uniform(6, 15), rng.uniform(1, 15)), rng.uniform(1.4, 2.6), 26, rng, greens)
    for k in range(10):
        leaf_cluster("plantes_haut", (rng.uniform(-14, 14), rng.uniform(12, 15), rng.uniform(13, 16)), 2.0, 22, rng, greens)
    warm = glow("ampoule", "#ffcf8a", 14)
    brass = surface("laiton", "#c9973a", 0.3, 1.0)
    for x in (-15, -10, 10, 15):
        cylinder("fil", (x, 4, 10.5), 0.02, 6, surface("fil", "#111111", 0.5))
        cylinder("abat_jour", (x, 4, 9.6), 0.9, 0.9, brass, radius_top=0.25)
        sphere("ampoule", (x, 4, 9.6), 0.32, warm)
        point("lampe", (x, 4, 9.3), 2600, "#ffb870", 0.4)
    # La table du dîner, en bois chaud, avec assiettes, verres et bougies.
    wood = surface("table", "#7a4a26", 0.35, coat=0.4)
    box("table", (0, -5.4, 0.78), (18, 2.4, 0.12), wood, bevel=0.04)
    plate = surface("assiette", "#f4f1ea", 0.2)
    glass = surface("verre", "#ffffff", 0.02)
    wine = surface("vin", "#6a0a1a", 0.1)
    for x in (-8, -5.6, -3.2, 3.2, 5.6, 8):
        cylinder("assiette", (x, -5.6, 0.85), 0.42, 0.03, plate)
        cylinder("verre", (x + 0.6, -5.0, 0.85), 0.1, 0.42, glass, radius_top=0.14)
        cylinder("vin", (x + 0.6, -5.0, 0.86), 0.09, 0.14, wine)
    for x in (-6.8, 6.8):
        cylinder("bougie", (x, -5.2, 0.85), 0.08, 0.5, surface("cire", "#f4ead0", 0.6))
        point("flamme", (x, -5.2, 1.45), 60, "#ffa040", 0.05)
    logo_sign(d, "logo", "c_a_vous", (17.0, 15.2, 12.4), 4.0, "#2a3a22", 0.04, 1.4)
    area("chaude", (0, -3, 12), 30, 4.2e4, "#ffd7a8")
    spot("feuillage_g", (-14, -2, 14), (-17, 10, 6), 2.4e4, "#ffe2a8", 40, 0.7)
    spot("feuillage_d", (14, -2, 14), (17, 10, 6), 2.4e4, "#ffe2a8", 40, 0.7)


def quotidien(d, rng):
    """Quotidien : du bois, du jaune, un canapé, et un mur de vieux écrans qui ont tout retrouvé."""
    room("#3a2a1a", "#2a1c12", 0.4, 0.5)
    tints = ["#14d8c4", "#ffc81e", "#ff6a3a", "#8ad0ff", "#e0e0e0"]
    frame = surface("cathodique", "#1a1612", 0.4)
    for side in (-1, 1):
        for i in range(5):
            for j in range(4):
                x = side * (13 + i * 2.6)
                z = 1.2 + j * 2.2
                path = text_image(os.path.join(d, f"ecran_{side}_{i}_{j}.png"), (320, 240), rng.choice(["2014", "2009", "2017", "1997", "2002"]), "#101010", rng.choice(tints), LOGO_FONT, scale=0.55)
                rot = (0, 0, -side * math.radians(22))
                box("tele", (x, 11.5 + i * 0.3, z), (2.4, 1.2, 2.0), frame, rot, bevel=0.1)
                panel("image", (x - side * 0.2, 10.85 + i * 0.3, z), 2.0, 1.55, picture(f"img{side}{i}{j}", path, 1.1), rot)
    logo_sign(d, "logo", "quotidien", (-19.0, 15.4, 13.0), 4.6, "#f4ead0", 0.06, 1.2)
    # Le canapé jaune et la table basse.
    yellow = surface("canape", "#e0a81e", 0.7)
    box("canape", (-7.2, -4.6, 0.45), (4.2, 1.6, 0.9), yellow, (0, 0, 0.35), bevel=0.25)
    box("dossier", (-7.5, -3.9, 1.1), (4.2, 0.5, 1.2), yellow, (0, 0, 0.35), bevel=0.2)
    box("table_basse", (-4.6, -5.6, 0.35), (1.6, 1.0, 0.1), surface("teck", "#8a5a2a", 0.4), bevel=0.04)
    teal = glow("teal", "#14d8c4", 6)
    box("ligne", (0, 15.5, 0.6), (110, 0.1, 0.1), teal)
    box("ligne_haut", (0, 15.5, 13.8), (110, 0.1, 0.1), glow("jaune", "#ffc81e", 6))
    palette = ["#14d8c4", "#ffc81e", "#ffffff", "#2a2a2a"]
    audience("public", 3, 12, (0, 13.6, 0), (1.0, 0.7), 0.9, rng, palette, lit=teal)
    area("studio", (0, -4, 13), 32, 3.2e4, "#fff0d8")


def france2_dimanche(d, rng):
    """Le dimanche politique : bleu nuit, colonnes de lumière, une table ronde, et le ton grave."""
    room("#07102a", "#05091a", 0.1, 0.4)
    light = glow("colonne", "#5a86ff", 5)
    for x in (-23, -19.5, -16, 16, 19.5, 23):
        box("colonne", (x, 12, 7), (0.9, 0.5, 14), light)
        box("socle", (x, 12, 0.3), (1.4, 0.9, 0.6), surface("socle", "#101830", 0.3, 0.6))
    logo_sign(d, "logo", "france2", (-12, 15.6, 12.2), 6.5, "#ffffff", 0.1, 1.0)
    path = text_image(os.path.join(d, "ton.png"), (1600, 120), "LA FRANCE VA MAL", "#e8ecff", "#0a1a4a", TEXT_FONT)
    panel("ton", (14.5, 15.6, 12.6), 12, 1.0, picture("ton", path, 1.0))
    for k, radius in enumerate((15, 16.2)):
        arc = torus(f"arc{k}", (0, 15.2, 2), radius, 0.09 - 0.03 * k, glow(f"arc{k}", "#7a9aff", 5 - 2 * k), (math.pi / 2, 0, 0))
        arc.scale = (1, 1, 0.75)
    glass = surface("verre", "#9ab0d0", 0.05, 0.0, 1.0)
    cylinder("table_ronde", (-6.6, -4.6, 0.8), 1.5, 0.08, glass)
    cylinder("pied", (-6.6, -4.6, 0), 0.12, 0.8, surface("chrome", "#c0c6d0", 0.2, 1.0))
    for a in (0.6, 2.4):
        chair("chaise", (-6.6 + 2.0 * math.cos(a), -4.6 - 1.2 * math.sin(a), 0), surface(f"chaise{a}", "#1a2240", 0.5), a, 1.1)
    area("grave", (0, -2, 13), 24, 1.6e4, "#c8d4ff")
    spot("douche", (-6.6, -4.6, 12), (-6.6, -4.6, 0.8), 1.4e4, "#e8eeff", 24, 0.5)


def grand_oral(d, rng):
    """Le Grand Oral : le noir, un seul pupitre dans un cône de lumière, et les journalistes dans l'ombre."""
    room("#04050a", "#06070c", 0.12, 0.6)
    path = os.path.join(d, "mur_oral.png")
    w, h = 2400, 900
    image = Image.new("RGB", (w, h), "#04060e")
    draw = ImageDraw.Draw(image)
    for y in range(h):
        t = abs(y - h * 0.45) / h
        draw.line([(0, y), (w, y)], fill=(int(10 + 18 * (1 - t)), int(14 + 20 * (1 - t)), int(34 + 40 * (1 - t))))
    for k in range(0, h, 60):
        draw.line([(0, k), (w, k)], fill=(120, 92, 30), width=2)
    for x in range(0, w, 160):
        draw.line([(x, 0), (x, h)], fill=(20, 24, 44), width=6)
    image.save(path)
    panel("mur_oral", (0, 15.3, 9.0), 70, 26, picture("mur_oral", path, 0.9))
    gold = surface("or", "#d9a441", 0.25, 1.0)
    box("pupitre", (7.2, -4.4, 0.7), (1.6, 1.1, 1.4), surface("pupitre", "#14161e", 0.3, 0.5), (0, 0, -0.3), bevel=0.06)
    box("pupitre_or", (7.2, -4.95, 1.15), (1.5, 0.02, 0.12), gold, (0, 0, -0.3))
    cylinder("micro", (7.0, -4.6, 1.4), 0.02, 0.6, surface("micro", "#222222", 0.4), rotation=(0.4, 0, 0))
    spot("seul", (7.2, -4.4, 13), (7.2, -4.4, 0), 9.0e4, "#fff2d0", 20, 0.3)
    spot("contre", (-16, 12, 12), (-12, 8, 0), 1.2e4, "#5a6aff", 30, 0.6)
    # Les journalistes, dans l'ombre, derrière leurs bureaux.
    desk = surface("bureau", "#0e1016", 0.3)
    for i in range(5):
        x = -20 + i * 2.6
        box("bureau", (x, 6 + i * 0.8, 0.6), (2.2, 1.0, 1.2), desk, (0, 0, 0.5))
        audience(f"journaliste{i}", 1, 1, (x, 6.8 + i * 0.8, 0.0), (1, 0.7), 1, rng, ["#15161c"])
    # Le contre-jour bleu découpe les journalistes dans l'ombre.
    area("contre_journalistes", (-15, 11.5, 6), 9, 6.0e3, "#6a8aff", (math.radians(-38), 0, 0))
    logo_panel(d, "logo", "LE GRAND ORAL", (-13.8, 15.2, 12.4), 8.5, 1.9, "#d9a441", "#04050a", 1.0)
    logo_sign(d, "bfmtv", "bfmtv", (-20.2, 15.2, 12.4), 2.4, "#0b3a9b", 0.02, 1.1)
    area("rien", (0, -6, 12), 20, 1.5e3, "#5a6a9a")


def france2_prime(d, rng):
    """La grande soirée électorale : douze pupitres en arc, un compte à rebours géant, des résultats en barres."""
    room("#061030", "#050a1c", 0.12, 0.4)
    colors = ["#e8202a", "#2f6bff", "#ffd400", "#5da832", "#e0457b", "#6b4bb8"]
    for k in range(12):
        side = -1 if k < 6 else 1
        i = k % 6
        a = math.radians(18 + i * 9)
        r = 12.5 + i * 0.6
        x = side * r * math.cos(a)
        y = -2 + r * math.sin(a) * 0.7
        rot = (0, 0, side * (math.pi / 2 - a) * -0.6)
        box("pupitre", (x, y, 0.75), (1.3, 0.9, 1.5), surface(f"pupitre{k}", "#e9ecf4", 0.3), rot, bevel=0.05)
        box("bandeau", (x, y - 0.46, 1.25), (1.2, 0.02, 0.22), glow(f"camp{k}", colors[k % len(colors)], 5), rot)
    path = text_image(os.path.join(d, "chrono.png"), (1200, 420), "00:04:00", "#ffffff", "#0a1a5a", LOGO_FONT, scale=0.75)
    panel("chrono", (17.0, 14.8, 12.4), 9, 3.15, picture("chrono", path, 1.6))
    path = os.path.join(d, "barres.png")
    image = Image.new("RGB", (1200, 700), "#0a1a5a")
    draw = ImageDraw.Draw(image)
    for i, (h, c) in enumerate(zip([520, 430, 380, 260, 180, 90], colors)):
        draw.rectangle([80 + i * 185, 660 - h, 220 + i * 185, 660], fill=c)
    logo = Image.open(os.path.join(LOGOS, "france2.png")).convert("RGBA")
    logo.thumbnail((420, 110))
    plate = Image.new("RGBA", (logo.width + 40, logo.height + 24), "#ffffff")
    plate.alpha_composite(logo, (20, 12))
    image.paste(plate.convert("RGB"), (40, 30))
    image.save(path)
    panel("barres", (-17.5, 14.8, 11.6), 10, 5.8, picture("barres", path, 1.3))
    area("plateau", (0, -2, 13), 34, 4.0e4, "#dfe6ff")
    spot("rouge", (-22, 0, 10), (-12, 6, 1), 2.0e4, "#e8202a", 50, 0.8)
    spot("bleu", (22, 0, 10), (12, 6, 1), 2.0e4, "#2f6bff", 50, 0.8)


def tf1_20h(d, rng):
    """Le 20 heures : le bureau blanc qui brille, et Paris la nuit derrière une grande baie, avec sa tour."""
    room("#060a18", "#0a0e1c", 0.08, 0.5)
    path = os.path.join(d, "paris.png")
    w, h = 3200, 900
    image = Image.new("RGB", (w, h), "#0a1a44")
    draw = ImageDraw.Draw(image)
    for y in range(h):
        t = y / h
        draw.line([(0, y), (w, y)], fill=(int(10 + 30 * t), int(26 + 40 * t), int(68 + 60 * t)))
    for x in range(0, w, 70):
        top = h - rng.randint(160, 420)
        draw.rectangle([x, top, x + 66, h], fill="#05081a")
        for wx in range(x + 8, x + 60, 14):
            for wy in range(top + 12, h - 10, 22):
                if rng.random() < 0.35:
                    draw.rectangle([wx, wy, wx + 6, wy + 9], fill="#ffd98a")
    # La tour, en treillis.
    cx = int(w * 0.78)
    tower = [(cx - 150, h), (cx - 20, 120), (cx + 20, 120), (cx + 150, h)]
    draw.polygon(tower, outline="#ffcf6a", width=10)
    for t in range(1, 9):
        y = 120 + (h - 120) * t / 9
        half = 20 + 130 * t / 9
        draw.line([(cx - half, y), (cx + half, y)], fill="#ffcf6a", width=6)
    draw.ellipse([cx - 14, 90, cx + 14, 118], fill="#ffffff")
    image = image.filter(ImageFilter.GaussianBlur(1.2))
    image.save(path)
    panel("baie", (0, 15.6, 9.5), 52, 15, picture("baie", path, 1.3))
    for x in range(-24, 25, 6):
        box("montant", (x, 15.4, 9.5), (0.25, 0.25, 15), surface("montant", "#1a2030", 0.3, 0.8))
    logo_sign(d, "logo", "tf1", (-19, 15.2, 13.0), 6, "#0a1a44", 0.03, 1.3)
    logo_sign(d, "le20h", "tf1_20h", (17.0, 15.2, 13.0), 6, "#0a1a44", 0.06, 1.3)
    # Le bureau blanc, courbe, qui brille.
    white = surface("bureau", "#d6dce6", 0.1, coat=1.0)
    for side in (-1, 1):
        box("bureau", (side * 6.6, -5.0, 0.75), (5.6, 2.0, 1.5), white, (0, 0, side * 0.35), bevel=0.25)
        box("liseré", (side * 6.5, -5.98, 0.4), (5.2, 0.04, 0.05), glow(f"liseré{side}", "#4a8cff", 6), (0, 0, side * 0.35))
    area("cle", (0, -6, 12), 26, 2.6e4, "#eef2ff")


def tf1_second_tour(d, rng):
    """Le débat : deux pupitres face à face, deux chronos du temps de parole, un sol rond, le bleu et le rouge."""
    room("#04103a", "#050a24", 0.06, 0.4)
    blue = glow("bleu", "#2f7dff", 7)
    red = glow("rouge", "#ff1f32", 7)
    torus("cercle", (0, 4, 0.03), 9.5, 0.12, blue, (0, 0, 0))
    torus("cercle2", (0, 4, 0.03), 10.6, 0.06, blue, (0, 0, 0))
    for side, mat, name, time in ((-1, blue, "chrono_g", "14:32"), (1, red, "chrono_d", "14:58")):
        path = os.path.join(d, f"{name}.png")
        image = Image.new("RGB", (900, 520), "#04103a")
        draw = ImageDraw.Draw(image)
        draw.rectangle([0, 0, 900, 120], fill="#2f7dff" if side < 0 else "#ff1f32")
        small = fitted_font(TEXT_FONT, "TEMPS DE PAROLE", 70, 820)
        draw.text((450, 60), "TEMPS DE PAROLE", font=small, fill="white", anchor="mm")
        big = fitted_font(LOGO_FONT, time, 300, 820)
        draw.text((450, 330), time, font=big, fill="white", anchor="mm")
        image.save(path)
        panel(name, (side * 17.5, 14.6, 11.6), 10, 5.8, picture(name, path, 1.5))
        box("cadre", (side * 17.5, 14.75, 11.6), (10.4, 0.2, 6.2), surface(f"cadre{side}", "#0a0f20", 0.3, 0.8))
        # Le pupitre, tourné vers l'autre.
        box("pupitre", (side * 7.4, -4.4, 0.75), (2.2, 1.1, 1.5), surface(f"pupitre{side}", "#0a1a4a", 0.2, 0.3, 1.0), (0, 0, -side * 0.6), bevel=0.06)
        box("liseré", (side * 7.4, -4.9, 1.35), (2.1, 0.04, 0.08), mat, (0, 0, -side * 0.6))
        spot(f"contre{side}", (side * 22, 6, 9), (side * 7, -4, 1), 2.6e4, "#2f7dff" if side < 0 else "#ff1f32", 45, 0.8)
    for side in (-1, 1):
        logo_sign(d, f"logo{side}", "tf1", (side * 7.4 + side * 0.15, -5.02, 0.95), 1.5, "#04103a", 0.03, 1.2, (0, 0, -side * 0.6))
    for x in (-24, -21, 21, 24):
        box("colonne", (x, 13, 7), (0.5, 0.3, 14), blue if x < 0 else red)
    area("cle", (0, -4, 13), 30, 3.0e4, "#e6ecff")


# La brume du plateau, où se dessinent les faisceaux des lyres : légère partout, plus dense au Grand Oral.
HAZE = {"grand_oral": 0.006, "tf1_second_tour": 0.0015, "france2_dimanche": 0.0015}
DEFAULT_HAZE = 0.0009
# La couleur des lyres du treillis, par plateau.
RIG_COLORS = {
    "france3": "#e8f0ff", "hanouna": "#ff6ec8", "lcp": "#fff2e0", "public_senat": "#ffd9a0", "lci": "#e6f2ff", "bfm": "#ffffff",
    "c_a_vous": "#ffe2b0", "quotidien": "#ffd23f", "france2_dimanche": "#cfe0ff", "grand_oral": "#fff2d0", "france2_prime": "#ffffff",
    "tf1_20h": "#e6eeff", "tf1_second_tour": "#ffffff",
}
# CNews, le modèle validé (test de style du 3 novembre 2026), a son propre gréement.
OWN_RIG = {"cnews"}


def production_rig(studio_id):
    """Ce qui fait un vrai plateau, partout : un treillis et ses lyres en haut, deux caméras de plateau au premier plan."""
    alu = surface("alu_treillis", "#a4a8b0", 0.3, 1.0)
    truss("treillis", -34, 34, 8, 13.0, alu)
    color = RIG_COLORS.get(studio_id, "#fff1d6")
    for x, target, energy in ((-18.5, (-15, 7, 1.5), 9.0e3), (-9.0, (-3, 5, 0.3), 1.4e4), (8.6, (3, 5, 0.3), 1.4e4), (18.5, (15, 7, 1.5), 9.0e3)):
        fixture(f"lyre{x}", (x, 8, 12.75), target, color, energy, 14)
    tv_camera("camera_g", (-4.2, -6.0, 1.2), -0.35)
    tv_camera("camera_d", (3.3, -6.2, 1.2), 0.3)


STUDIOS = {
    "france3": france3, "hanouna": hanouna, "cnews": cnews_soignee, "lcp": lcp, "public_senat": public_senat, "lci": lci,
    "bfm": bfm, "c_a_vous": c_a_vous, "quotidien": quotidien, "france2_dimanche": france2_dimanche, "grand_oral": grand_oral,
    "france2_prime": france2_prime, "tf1_20h": tf1_20h, "tf1_second_tour": tf1_second_tour,
}


def render(studio_id, samples, out_dir):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    preferences = bpy.context.preferences.addons["cycles"].preferences
    try:
        preferences.compute_device_type = "OPTIX"
        preferences.get_devices()
        optix = any(device.type == "OPTIX" for device in preferences.devices)
    except TypeError:
        optix = False
    for device in preferences.devices:
        device.use = device.type == "OPTIX"
    scene.cycles.device = "GPU" if optix else "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPTIX" if optix else "OPENIMAGEDENOISE"
    scene.render.resolution_x, scene.render.resolution_y = WIDTH, HEIGHT
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world = bpy.data.worlds.new("noir")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.002, 0.002, 0.004, 1)
    haze(scene, HAZE.get(studio_id, DEFAULT_HAZE))
    # Les lumières et les écrans bavent un peu, comme à la télé.
    bloom(scene, threshold=1.6, strength=0.45)
    rng = random.Random(f"{studio_id}-1789")
    with tempfile.TemporaryDirectory() as directory:
        STUDIOS[studio_id](directory, rng)
        if studio_id not in OWN_RIG:
            production_rig(studio_id)
        camera_data = bpy.data.cameras.new("camera")
        camera_data.lens = 22 * TABLE_WIDTH / WIDTH
        # Une profondeur de champ de télé : la scène est nette, les caméras du premier plan et le fond fondent un peu.
        camera_data.dof.use_dof = True
        camera_data.dof.focus_distance = 19
        camera_data.dof.aperture_fstop = 3.2
        camera = bpy.data.objects.new("camera", camera_data)
        camera.location = (0, -15, 4.4)
        camera.rotation_euler = (math.radians(86), 0, 0)
        scene.collection.objects.link(camera)
        scene.camera = camera
        path = os.path.join(directory, "render.png")
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        os.makedirs(out_dir, exist_ok=True)
        target = os.path.join(out_dir, f"{studio_id}.webp")
        Image.open(path).convert("RGB").save(target, "WEBP", quality=82, method=6)
    print(studio_id, f"{os.path.getsize(target) / 1024:.0f} Ko", flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=96)
    parser.add_argument("--out", default=os.path.join(ROOT, "assets/maquette/plateaux"))
    parser.add_argument("studios", nargs="*", default=list(STUDIOS))
    args = parser.parse_args()
    for studio_id in args.studios:
        render(studio_id, args.samples, args.out)


if __name__ == "__main__":
    main()
