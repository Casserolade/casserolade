"""Les plateaux de divertissement : le jeu de France 3 Région, « Tout beau, tout neuf » sur W9, C à vous, Quotidien.
Chacun d'après le vrai plateau de l'émission, vu de face, la table du jeu au milieu : ce qui signe l'émission se tient
en haut à gauche, sur les côtés et au premier plan.
"""
import math
import os

import bpy
from PIL import Image, ImageDraw, ImageFont

from plateau_3d_kit import HAIRS, SKINS, curved_wall, lacquer, seated
from studio_images import BOLD_FONT, SERIF_ITALIC_FONT, font_or, gradient, letters_wall, slats, title_card
from studio_kit import (LOGO_FONT, TEXT_FONT, area, audience, box, chair, cylinder, disc, fitted_font, fluted_column, glow, leaf_cluster,
                        painted, panel, picture, point, ring_sector, sphere, spot, surface, text_image, torus)
from studio_parts import desk_arc, led_wall, logo_sign, on_circle, room, stars


def france3(d, rng):
    """France 3 Région, « Questions pour un champion du canton » : le plateau bleu du jeu, ses néons, ses pupitres à
    champignon rouge, monté dans le studio de l'édition locale, entre la carte du canton, la banderole de la foire et
    des bottes de paille."""
    room("#0d2f88", "#0a1438", 0.14, 0.5)
    bar = glow("barre", "#8fbcff", 5)
    for x in (-24.5, -23.2, -21.9, -9.4, -8.1, 8.1, 9.4, 21.9, 23.2, 24.5):
        box("barre", (x, 15.6, 7.6), (0.32, 0.1, 13.0), bar)
    # Les grandes croix de lumière du jeu, orange et roses.
    orange, pink = glow("croix_orange", "#ff8a3a", 3.5), glow("croix_rose", "#ff4fa0", 3.5)
    for side in (-1, 1):
        box("croix", (side * 15.4, 15.55, 6.8), (0.45, 0.1, 15.0), orange, (0, side * 0.5, 0))
        box("croix", (side * 15.4, 15.5, 6.8), (0.45, 0.1, 15.0), pink, (0, -side * 0.5, 0))
    logo_sign(d, "logo", "france3_centre", (-17.0, 15.4, 12.7), 9.5, "#ffffff", 0.08, 1.1)
    # La carte du canton, sur le mur de droite : une tache verte, des villes, une rivière.
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
    path = text_image(os.path.join(d, "banderole.png"), (1400, 220), "FOIRE AUX BESTIAUX : LE BILAN", "#7a2a10", "#f4e3b0", TEXT_FONT)
    panel("banderole", (14.0, 14.8, 12.4), 18, 2.6, picture("banderole", path, 0.7), (0, math.radians(4), 0))
    # Les quatre pupitres des candidats : un score à zéro, un champignon rouge.
    blue = lacquer("pupitre", "#1a4fd0", 0.2)
    pale = surface("pupitre_dessus", "#e9edf6", 0.25)
    score = picture("score", text_image(os.path.join(d, "score.png"), (256, 160), "0", "#ffd21e", "#06102a", LOGO_FONT, scale=0.8), 1.4)
    red = glow("champignon", "#ff2a2a", 2.4)
    for index, x in enumerate((-12.6, -9.4, 9.4, 12.6)):
        y = 5.0 - abs(x) * 0.18
        yaw = -math.copysign(0.32, x)
        box(f"pupitre{index}", (x, y, 1.0), (2.0, 1.1, 2.0), blue, (0, 0, yaw), bevel=0.08)
        box(f"pupitre_dessus{index}", (x, y, 2.04), (2.2, 1.3, 0.1), pale, (0, 0, yaw), bevel=0.03)
        panel(f"score{index}", (x + 0.57 * math.sin(yaw), y - 0.57 * math.cos(yaw), 1.25), 1.2, 0.75, score, (0, 0, yaw))
        cylinder(f"buzzer{index}", (x, y, 2.09), 0.36, 0.08, surface(f"buzzer{index}", "#2a2c31", 0.4, 0.6))
        sphere(f"champignon{index}", (x, y, 2.2), 0.3, red, (1, 1, 0.7))
    # Le bureau de l'animateur, au premier plan : le titre du jeu, et « du canton » ajouté au ruban adhésif.
    box("bureau", (0, -4.2, 0.62), (5.0, 1.4, 1.24), blue, bevel=0.08)
    box("bureau_dessus", (0, -4.2, 1.28), (5.4, 1.7, 0.1), pale, bevel=0.03)
    title = title_card(os.path.join(d, "titre.png"), (1400, 260), "Questions pour un champion", "#ffd21e", "#0a2a80", font_or(SERIF_ITALIC_FONT, TEXT_FONT), 0.62)
    panel("titre", (0, -4.92, 0.78), 4.7, 0.86, picture("titre", title, 1.2))
    sticker = title_card(os.path.join(d, "canton.png"), (700, 200), "DU CANTON", "#1a1a1a", "#f4ecd2", LOGO_FONT, 0.7)
    panel("canton", (1.35, -4.94, 0.3), 2.1, 0.58, picture("canton", sticker, 0.85), (0, math.radians(-5), 0))
    # La région : des bottes de paille, un bidon de lait, la plante en pot.
    straw = surface("paille", "#d9b54a", 0.9)
    for index, (x, y, z) in enumerate(((-15.7, 8.8, 1.1), (-13.3, 8.8, 1.1), (-14.5, 8.8, 3.0))):
        cylinder(f"paille{index}", (x, y, z - 0.8), 1.1, 1.6, straw, vertices=48, rotation=(math.pi / 2, 0, 0))
        torus(f"ficelle{index}", (x, y - 0.3, z), 1.11, 0.03, surface(f"ficelle{index}", "#7a5a20", 0.8), (math.pi / 2, 0, 0))
    tin = surface("bidon", "#b9bec8", 0.3, 0.9)
    cylinder("bidon", (-11.4, 7.4, 0), 0.42, 1.1, tin)
    cylinder("bidon_col", (-11.4, 7.4, 1.1), 0.42, 0.3, tin, radius_top=0.24)
    cylinder("bidon_goulot", (-11.4, 7.4, 1.4), 0.26, 0.2, tin)
    cylinder("pot", (13.6, 4.2, 0), 0.7, 1.3, surface("pot", "#a0522d", 0.6), radius_top=0.9)
    leaf_cluster("plante", (13.6, 4.2, 2.6), 1.6, 40, rng, ["#3f7f3a", "#5a9a45", "#2f6a30"])
    area("neon", (0, -2, 13), 30, 2.4e4, "#eaf2ff")
    spot("bureau", (0, -11, 11), (0, -4.2, 1.0), 9.0e3, "#fff3d0", 30, 0.6)
    spot("paille", (-10, 0, 12), (-14.4, 8.9, 1.5), 9.0e3, "#fff0c8", 34, 0.7)


def tbt9_wall(directory):
    """Le mur d'écrans de W9 : un rose qui vire au violet, et le titre en lettres géantes, trois fois."""
    size = (4096, 1024)
    image = gradient(size, (255, 78, 184), (96, 40, 204))
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(font_or(BOLD_FONT, TEXT_FONT), 250)
    for cx in (0.17, 0.5, 0.83):
        x = int(size[0] * cx)
        for row, (first, second) in enumerate((("TOUT ", "BEAU"), ("TOUT ", "N9UF"))):
            y = 330 + row * 270
            start = x - font.getlength(first + second) / 2
            draw.text((start, y), first, font=font, fill="#ffffff", anchor="lm")
            fill = "#ffb8e6" if row == 0 else "#ffffff"
            draw.text((start + font.getlength(first), y), second, font=font, fill=fill, anchor="lm", stroke_width=6, stroke_fill="#ffffff")
    path = os.path.join(directory, "mur.png")
    image.save(path)
    return path


def hanouna(d, rng):
    """W9, « Tout beau, tout neuf » : des murs d'écrans roses et violets aux lettres géantes, l'anneau du titre au-dessus
    de la scène, des bureaux blancs en croissant, le public de chaque côté sous une pluie de petites lampes."""
    room("#1c0a3a", "#cdbfe0", 0.1, 0.6)
    center = (0.0, -2.0)
    led_wall("mur", center, 17.6, -84, 84, 0.6, 13.6, tbt9_wall(d), 1.0)
    ring = letters_wall(os.path.join(d, "anneau.png"), (4096, 200), ["TOUT BEAU TOUT N9UF  ·"], (255, 255, 255), (214, 36, 150), font_or(BOLD_FONT, TEXT_FONT))
    stage = (0.0, 1.0)
    curved_wall("anneau", stage, 6.6, -180, 180, 10.3, 11.5, picture("anneau", ring, 1.3), columns=96)
    torus("anneau_lumiere", (stage[0], stage[1], 10.22), 6.6, 0.07, glow("anneau_lumiere", "#ffffff", 9))
    stars("lampes", rng, 90, (-22, 22), (0, 13), (12.6, 15.2), "#ffe9fb", 12, 0.06)
    logo_sign(d, "logo", "w9", (-15.2, 8.0, 12.1), 3.4, "#ffffff", 0.1, 1.3, (0, 0, math.radians(34)))
    lit = glow("gradin_neon", "#ff5ac8", 4)
    palette = ["#ff2fa8", "#ffd400", "#22e1ff", "#ffffff", "#ff7a00", "#8a3bff", "#1a1a1a"]
    audience("public_g", 4, 9, (-16.5, 4, 0), (1.2, 0.8), 0.9, rng, palette, facing=math.radians(62), lit=lit)
    audience("public_d", 4, 9, (16.5, 4, 0), (1.2, 0.8), 0.9, rng, palette, facing=math.radians(-62), lit=lit)
    # Les bureaux blancs des chroniqueurs, en croissant autour de la scène, et les chroniqueurs, de dos.
    white = surface("bureau", "#f6f3fa", 0.18, coat=1.0)
    desk_arc("bureau_g", stage, 5.6, 236, 190, 1.15, 1.2, white, white, "#ff4fc0")
    desk_arc("bureau_d", stage, 5.6, 170, 124, 1.15, 1.2, white, white, "#ff4fc0")
    mats = {}
    for index, angle in enumerate((226, 213, 200, 160, 147, 134)):
        x, y = on_circle(stage, 6.7, angle)
        seated(f"chroniqueur{index}", (x, y, 0.5), rng, palette, SKINS, HAIRS, mats, -math.radians(angle), 1.15)
        cylinder(f"tabouret{index}", (x, y, 0), 0.26, 0.5, surface(f"tabouret{index}", "#2a2030", 0.4, 0.6))
    cylinder("pupitre", (stage[0], stage[1], 0), 0.9, 1.25, white, vertices=48)
    cylinder("pupitre_lumiere", (stage[0], stage[1], 0.02), 0.94, 0.08, glow("pupitre_lumiere", "#ff4fc0", 7), vertices=48)
    area("rose", (0, -3, 13), 30, 1.5e4, "#ffd6f2")
    spot("magenta_g", (-22, -6, 10), (-12, 8, 3), 2.2e4, "#ff3fb4", 50, 0.8)
    spot("violet_d", (22, -6, 10), (12, 8, 3), 2.2e4, "#8a4bff", 50, 0.8)


def garden_window(directory, rng):
    """La verrière de C à vous : un jardin flou derrière les carreaux, plus clair en haut."""
    size = (800, 720)
    image = gradient(size, (214, 236, 226), (96, 150, 96))
    draw = ImageDraw.Draw(image)
    for _ in range(140):
        x, y, r = rng.randrange(0, size[0]), rng.randrange(size[1] // 4, size[1]), rng.randrange(20, 70)
        shade = rng.choice([(60, 120, 64), (84, 150, 80), (40, 96, 52), (120, 176, 104)])
        draw.ellipse((x - r, y - r // 2, x + r, y + r // 2), fill=shade)
    path = os.path.join(directory, "jardin.png")
    image.save(path)
    return path


def c_a_vous(d, rng):
    """C à vous : un loft aux murs de lattes de chêne, la cuisine au fond, les écrans au logo de l'émission, la verrière
    sur le jardin, des suspensions de laiton, et la grande table du dîner, dressée."""
    box("floor", (0, 0, -0.05), (140, 90, 0.1), parquet(d, rng))
    oak = painted("lattes", slats(os.path.join(d, "lattes.png"), (2048, 512), rng, ["#b98a52", "#c4955c", "#ad7e48", "#cfa268"], "#6e4a26"), 0.55)
    panel("mur_fond", (0, 15.8, 8.0), 64, 16, oak)
    panel("mur_g", (-21.5, 9.0, 8.0), 18, 16, oak, (0, 0, math.radians(64)))
    panel("mur_d", (21.5, 9.0, 8.0), 18, 16, oak, (0, 0, math.radians(-64)))
    white = surface("blanc", "#f2efe8", 0.35)
    for y in (3.0, 9.5):
        box("poutre", (0, y, 13.6), (60, 0.5, 0.5), white)
    # La cuisine, au fond à gauche : un plan de travail, des étagères, des bocaux, des herbes.
    box("plan", (-11.5, 14.6, 0.55), (10.0, 1.3, 1.1), white, bevel=0.03)
    box("plan_dessus", (-11.5, 14.55, 1.13), (10.3, 1.5, 0.08), surface("chene", "#b98a52", 0.4), bevel=0.02)
    jars = [surface(f"bocal{i}", c, 0.3) for i, c in enumerate(("#e8b84a", "#c8452e", "#f2efe6", "#5a9a45", "#3a6ea5"))]
    for shelf, z in enumerate((4.0, 5.7, 7.4)):
        box(f"etagere{shelf}", (-11.5, 15.3, z), (9.0, 0.7, 0.1), surface(f"etagere{shelf}", "#a87a44", 0.45))
        for slot in range(9):
            x = -15.5 + slot * 1.0 + rng.uniform(-0.15, 0.15)
            if rng.random() < 0.25:
                leaf_cluster(f"herbe{shelf}{slot}", (x, 15.2, z + 0.5), 0.4, 10, rng, ["#3f7f3a", "#5a9a45"])
            else:
                cylinder(f"bocal{shelf}{slot}", (x, 15.2, z + 0.05), 0.2, rng.uniform(0.4, 0.8), rng.choice(jars))
    # Les écrans au logo de l'émission : en haut à gauche, et au fond à droite.
    black = surface("ecran_cadre", "#111216", 0.3)
    for name, (x, y, z), width, yaw in (("ecran_g", (-17.2, 12.0, 11.6), 5.2, 30), ("ecran_d", (15.0, 15.5, 6.0), 4.2, 0)):
        rot = (0, 0, math.radians(yaw))
        box(f"{name}_cadre", (x, y, z), (width + 0.4, 0.14, width * 0.62 + 0.4), black, rot)
        white_screen = picture(f"{name}_fond", title_card(os.path.join(d, f"{name}_fond.png"), (64, 40), " ", "#ffffff", "#ffffff", TEXT_FONT), 1.1)
        front = (math.sin(math.radians(yaw)), -math.cos(math.radians(yaw)))
        panel(f"{name}_fond", (x + 0.09 * front[0], y + 0.09 * front[1], z), width, width * 0.62, white_screen, rot)
        logo_sign(d, name, "c_a_vous", (x + 0.12 * front[0], y + 0.12 * front[1], z), width * 0.5, "#ffffff", 0.06, 1.25, rot)
    # La verrière sur le jardin, et ses montants d'acier.
    panel("verriere", (7.6, 15.7, 7.6), 9.0, 9.6, picture("verriere", garden_window(d, rng), 1.6))
    steel = surface("acier", "#1a1c20", 0.4, 0.8)
    for x in (3.1, 5.35, 7.6, 9.85, 12.1):
        box("montant", (x, 15.6, 7.6), (0.14, 0.14, 9.8), steel)
    for z in (2.8, 6.0, 9.2, 12.4):
        box("traverse", (7.6, 15.6, z), (9.2, 0.14, 0.14), steel)
    warm = glow("ampoule", "#ffcf8a", 14)
    brass = surface("laiton", "#c9973a", 0.3, 1.0)
    for x in (-15, -9, 9, 15):
        cylinder("fil", (x, 4, 10.5), 0.02, 6, surface("fil", "#111111", 0.5))
        cylinder("abat_jour", (x, 4, 9.6), 0.9, 0.9, brass, radius_top=0.25)
        sphere("ampoule", (x, 4, 9.6), 0.32, warm)
        point("lampe", (x, 4, 9.3), 2200, "#ffb870", 0.4)
    # La table du dîner, en chêne, au premier plan : les assiettes, les verres, le pain, les bougies, les chaises.
    wood = surface("table", "#9a6a36", 0.35, coat=0.4)
    box("table", (0, -4.2, 1.0), (17, 2.6, 0.14), wood, bevel=0.04)
    for x in (-7.6, 7.6):
        box("pied_table", (x, -4.2, 0.47), (0.3, 2.0, 0.94), wood)
    plate = surface("assiette", "#f4f1ea", 0.2)
    glass = surface("verre", "#ffffff", 0.02)
    wine = surface("vin", "#6a0a1a", 0.1)
    for x in (-7, -4.6, -2.2, 2.2, 4.6, 7):
        for y in (-4.9, -3.5):
            cylinder("assiette", (x, y, 1.08), 0.4, 0.03, plate)
        cylinder("verre", (x + 0.55, -4.3, 1.08), 0.09, 0.4, glass, radius_top=0.13)
        cylinder("vin", (x + 0.55, -4.3, 1.09), 0.08, 0.13, wine)
    cylinder("saladier", (0, -4.2, 1.08), 0.7, 0.34, surface("saladier", "#e8dcc4", 0.4), radius_top=0.9)
    leaf_cluster("salade", (0, -4.2, 1.5), 0.6, 14, rng, ["#5a9a45", "#78b45a", "#c8452e"])
    cylinder("bouteille", (-1.3, -4.1, 1.08), 0.11, 0.7, surface("bouteille", "#1f3a24", 0.1))
    cylinder("goulot", (-1.3, -4.1, 1.78), 0.045, 0.3, surface("goulot", "#1f3a24", 0.1))
    box("pain", (1.5, -4.0, 1.16), (1.3, 0.3, 0.2), surface("pain", "#c98a4a", 0.8), (0, 0, 0.5), bevel=0.09)
    for x in (-5.8, 5.8):
        cylinder("bougie", (x, -4.2, 1.08), 0.07, 0.5, surface("cire", "#f4ead0", 0.6))
        point("flamme", (x, -4.2, 1.7), 60, "#ffa040", 0.05)
    mustard = surface("chaise_moutarde", "#d9a21e", 0.6)
    for index, x in enumerate((-6.4, -3.2, 0.0, 3.2, 6.4)):
        chair(f"chaise_devant{index}", (x, -6.3, 0), white if index % 2 else mustard, math.pi, 1.0)
        chair(f"chaise_fond{index}", (x, -2.1, 0), mustard if index % 2 else white, 0.0, 1.0)
    for x in (-19.5, 19.5):
        cylinder("pot", (x, 3.0, 0), 0.8, 1.4, surface("pot", "#e8e2d6", 0.5), radius_top=1.0)
        leaf_cluster("ficus", (x, 3.0, 3.4), 2.2, 46, rng, ["#2f6a30", "#3f8a3a", "#5aa04a"])
    area("chaude", (0, -3, 12.5), 30, 2.6e4, "#ffe2bc")
    spot("cuisine", (-8, 2, 13), (-11.5, 14.6, 4), 1.4e4, "#fff0d0", 46, 0.7)
    spot("table", (0, -10, 11), (0, -4.2, 1.0), 8.0e3, "#fff0d8", 40, 0.7)


# Quotidien : une arène ronde. Son centre, son rayon, et les couleurs de ses pions et de son globe.
# Son titre s'écrit dans une grasse droite (Lato Black, licence OFL) quand la machine l'a ; sinon dans la police du jeu.
TITLE_FONT = "/usr/share/fonts/truetype/lato/Lato-Black.ttf"
ARENA = (0.0, -2.0)
ARENA_RADIUS = 17.0
PAWN_COLORS = ["#ff3fa4", "#32d14b", "#ffd21e", "#2f7bff", "#ff3b30", "#a04bff"]
GLOBE_STRIPES = ["#ff4fa0", "#8a3fd6", "#2f6bff", "#27c24c", "#ffd21e", "#ff7a1a", "#e8222e"]
# Les continents du globe, à grands traits, dans un carré de côté 1.
GLOBE_LANDS = [
    # L'Amérique du Nord, l'Amérique du Sud, l'Europe, l'Afrique, l'Asie.
    [(0.13, 0.27), (0.22, 0.20), (0.36, 0.19), (0.44, 0.24), (0.40, 0.31), (0.42, 0.37), (0.35, 0.40), (0.33, 0.46), (0.37, 0.52), (0.31, 0.50), (0.25, 0.43), (0.20, 0.36), (0.12, 0.34)],
    [(0.36, 0.55), (0.44, 0.56), (0.49, 0.63), (0.46, 0.72), (0.41, 0.84), (0.38, 0.78), (0.37, 0.68), (0.33, 0.61)],
    [(0.51, 0.27), (0.55, 0.21), (0.63, 0.20), (0.68, 0.26), (0.64, 0.33), (0.58, 0.37), (0.52, 0.35)],
    [(0.52, 0.42), (0.60, 0.40), (0.68, 0.43), (0.73, 0.52), (0.69, 0.62), (0.64, 0.76), (0.59, 0.70), (0.58, 0.60), (0.51, 0.52)],
    [(0.70, 0.22), (0.80, 0.20), (0.89, 0.27), (0.90, 0.40), (0.84, 0.50), (0.77, 0.48), (0.73, 0.38)],
]


def on_arena(angle, radius=ARENA_RADIUS):
    """Le point de l'arène à cet angle (en degrés, 0 au fond, positif à droite), à ce rayon de son centre."""
    a = math.radians(angle)
    return ARENA[0] + radius * math.sin(a), ARENA[1] + radius * math.cos(a)


def parquet(directory, rng):
    """Un parquet blond, verni : de longues lames de teintes voisines, leurs joints et leur fil."""
    width, height, rows = 2048, 1024, 12
    image = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(image)
    tones = ["#b9772f", "#c58a44", "#a96a28", "#cf9650", "#bb7c36", "#c38440"]
    row_height = height / rows
    for row in range(rows):
        top = int(row * row_height)
        bottom = int((row + 1) * row_height)
        x = -rng.randrange(0, 900)
        while x < width:
            length = rng.randrange(900, 1500)
            draw.rectangle((x, top, x + length, bottom), fill=rng.choice(tones))
            for _ in range(7):
                grain = rng.randrange(top + 6, bottom - 6)
                draw.line((x + 10, grain, x + length - 10, grain + rng.randrange(-3, 4)), fill="#a66c2c", width=1)
            draw.line((x, top, x, bottom), fill="#6e4520", width=3)
            x += length
        draw.line((0, top, width, top), fill="#6e4520", width=3)
    path = os.path.join(directory, "parquet.png")
    image.save(path)
    mat = lacquer("parquet", "#b9772f", 0.24)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    coords = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    # Une lame fait 14 cm de large : l'image couvre 3,4 m sur 1,7 m de parquet.
    mapping.inputs["Scale"].default_value = (0.3, 0.6, 1.0)
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = bpy.data.images.load(path)
    links.new(coords.outputs["Object"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], texture.inputs["Vector"])
    links.new(texture.outputs["Color"], nodes["Principled BSDF"].inputs["Base Color"])
    return mat


def stained_glass(directory, bays):
    """Les vitraux de l'arène, d'un seul tenant : une baie bleue, une baie violette, leurs losanges de plomb."""
    bay, height = 320, 1024
    image = Image.new("RGB", (bay * bays, height))
    draw = ImageDraw.Draw(image)
    for index in range(bays):
        low, high = ((8, 18, 110), (34, 92, 250)) if index % 2 == 0 else ((40, 12, 120), (124, 64, 245))
        for y in range(height):
            # Plus clair au milieu de la baie, comme un vitrail éclairé par-derrière.
            share = 1 - abs(y / height - 0.45) * 1.5
            color = tuple(int(low[c] + (high[c] - low[c]) * max(0.0, share)) for c in range(3))
            draw.line((index * bay, y, (index + 1) * bay, y), fill=color)
    step = bay // 2
    for offset in range(-height, bay * bays + height, step):
        draw.line((offset, 0, offset + height // 2, height), fill=(140, 176, 255), width=4)
        draw.line((offset, 0, offset - height // 2, height), fill=(140, 176, 255), width=4)
    for index in range(bays + 1):
        draw.rectangle((index * bay - 9, 0, index * bay + 9, height), fill=(8, 12, 40))
    for y in (0, height // 3, 2 * height // 3, height - 14):
        draw.rectangle((0, y, bay * bays, y + 14), fill=(8, 12, 40))
    path = os.path.join(directory, "vitraux.png")
    image.save(path)
    return path


def neon_globe(directory):
    """Le globe de l'émission : des bandes de toutes les couleurs, et les continents tracés au néon blanc."""
    size = 1024
    image = Image.new("RGB", (size, size), "#050608")
    draw = ImageDraw.Draw(image)
    band = size // len(GLOBE_STRIPES)
    for index, color in enumerate(GLOBE_STRIPES):
        draw.rectangle((index * band + 14, 0, (index + 1) * band - 14, size), fill=color)
    for land in GLOBE_LANDS:
        points = [(x * size, y * size) for x, y in land]
        draw.line(points + points[:2], fill="#ffffff", width=20, joint="curve")
    path = os.path.join(directory, "globe.png")
    image.save(path)
    return path


def pawn(name, location, color, scale=1.0):
    """Un pion du public : un pied, un corps en cône, et une tête qui luit de sa couleur."""
    x, y, z = location
    body = lacquer(f"{name}_corps", color, 0.25)
    cylinder(f"{name}_pied", (x, y, z), 0.3 * scale, 0.12 * scale, body)
    cylinder(f"{name}_corps", (x, y, z + 0.12 * scale), 0.25 * scale, 0.8 * scale, body, radius_top=0.09 * scale)
    cylinder(f"{name}_col", (x, y, z + 0.86 * scale), 0.17 * scale, 0.06 * scale, body)
    sphere(f"{name}_tete", (x, y, z + 1.08 * scale), 0.19 * scale, glow(f"{name}_tete", color, 2.2))


def quotidien(d, rng):
    """Quotidien : une arène de colonnes crème et de vitraux bleus, un parquet blond, la grande table blanche et ronde,
    le globe au néon, et des pions de toutes les couleurs assis avec le public."""
    box("floor", (0, 0, -0.05), (140, 90, 0.1), parquet(d, rng))
    box("wall", (0, 19, 10), (110, 0.4, 30), surface("wall", "#060814", 0.7))
    # Les vitraux, d'un seul tenant derrière les colonnes, et leur lumière sur le parquet.
    bays, first, last = 13, -78, 78
    curved_wall("vitraux", ARENA, ARENA_RADIUS, first, last, 0.9, 12.3, picture("vitraux", stained_glass(d, bays), 1.1), columns=156)
    stone = surface("pierre", "#e6d2a6", 0.6)
    curved_wall("soubassement", ARENA, ARENA_RADIUS - 0.05, first, last, 0.0, 0.95, stone)
    # La corniche qui court sur les chapiteaux, son filet de lumière dessous.
    curved_wall("corniche", ARENA, ARENA_RADIUS - 0.9, first - 4, last + 4, 12.35, 13.9, stone)
    curved_wall("corniche_bas", ARENA, ARENA_RADIUS - 1.25, first - 4, last + 4, 12.2, 12.42, stone)
    curved_wall("filet", ARENA, ARENA_RADIUS - 0.3, first, last, 12.0, 12.14, glow("filet", "#ffe9c4", 7))
    span = (last - first) / bays
    for index in range(bays + 1):
        angle = first + index * span
        x, y = on_arena(angle, ARENA_RADIUS - 0.75)
        fluted_column(f"colonne{index}", (x, y, 0.0), 0.8, 12.3, stone)
        # Chaque colonne est éclairée par son pied, comme sur le vrai plateau.
        lx, ly = on_arena(angle, ARENA_RADIUS - 2.3)
        spot(f"pied{index}", (lx, ly, 0.25), (x, y, 9.0), 420, "#ffdca8", 55, 0.8, 0.3)
    # Le globe au néon et le logo de l'émission, pendus en haut à gauche : le coin que la table du jeu laisse voir.
    gx, gy = on_arena(-60, ARENA_RADIUS - 3.6)
    tilt = math.radians(38)
    disc("globe", (gx, gy, 9.3), 1.7, picture("globe", neon_globe(d), 1.0), (0, 0, tilt))
    torus("globe_neon", (gx, gy, 9.3), 1.78, 0.07, glow("globe_neon", "#ffffff", 9), (math.radians(90), 0, tilt))
    cylinder("globe_tige", (gx, gy, 11.0), 0.04, 2.4, surface("tige", "#1a1a1e", 0.4, 0.8))
    lx, ly = on_arena(-43, ARENA_RADIUS - 3.6)
    logo_sign(d, "logo", "quotidien", (lx, ly, 11.3), 2.1, "#f4ead0", 0.06, 1.1, (0, 0, math.radians(24)))
    # Les gradins en arc, de chaque côté : des pions de toutes les couleurs au premier rang, le public derrière.
    step_mat = surface("gradin", "#1c2148", 0.5)
    trim = glow("gradin_filet", "#ffe9c4", 4)
    mats = {}
    clothes = ["#f2efe6", "#1d2a55", "#c8452e", "#e8b84a", "#3a6ea5", "#2c2c34", "#7a4a8a"]
    for side in (-1, 1):
        start, end = (38, 76) if side > 0 else (-76, -38)
        for row, (radius, height) in enumerate(((11.6, 0.0), (12.9, 0.5), (14.2, 1.0))):
            if height:
                ring_sector(f"marche{side}{row}", ARENA, radius - 0.65, radius + 0.65, start, end, height, step_mat)
                curved_wall(f"contremarche{side}{row}", ARENA, radius - 0.65, start, end, height - 0.5, height, step_mat, columns=40)
                curved_wall(f"nez{side}{row}", ARENA, radius - 0.66, start, end, height - 0.05, height, trim, columns=40)
            seats = 8 + row
            for seat in range(seats):
                angle = start + (end - start) * (seat + 0.5) / seats + rng.uniform(-0.4, 0.4)
                x, y = on_arena(angle, radius)
                if row == 0 or rng.random() < 0.3:
                    pawn(f"pion{side}{row}{seat}", (x, y, height), rng.choice(PAWN_COLORS), 1.15 if row == 0 else 1.0)
                else:
                    seated(f"public{side}{row}{seat}", (x, y, height), rng, clothes, SKINS, HAIRS, mats, -math.radians(angle))
    audience("public", 3, 12, (0, 12.4, 0), (1.0, 0.5), 0.9, rng, clothes, lit=trim)
    # La grande table ronde : un plateau blanc qui luit, un pied de terre cuite, et le logo sur son devant.
    tx, ty = 0.0, 1.6
    cylinder("table_pied", (tx, ty, 0.0), 5.1, 1.0, lacquer("terre_cuite", "#b4452c", 0.3), vertices=96)
    cylinder("table_plateau", (tx, ty, 1.0), 5.75, 0.24, glow("table_plateau", "#fff3e2", 2.6), vertices=96)
    torus("table_lumiere", (tx, ty, 0.99), 5.45, 0.05, glow("table_lumiere", "#ffffff", 8))
    # Le titre de l'émission, en blanc sur rouge, court sur le devant du pied.
    title = text_image(os.path.join(d, "titre.png"), (1408, 256), "QUOTIDIEN", "#ffffff", "#cf2a26", TITLE_FONT if os.path.exists(TITLE_FONT) else TEXT_FONT, scale=0.74)
    curved_wall("titre", (tx, ty), 5.13, 204, 156, 0.12, 0.9, picture("titre", title, 1.15), columns=24)
    for index, (dx, color) in enumerate(((-2.6, "#ffd21e"), (-1.2, "#ff3fa4"), (1.5, "#f2efe6"), (2.9, "#32d14b"))):
        box(f"fiche{index}", (tx + dx, ty - 4.9, 1.25), (0.5, 0.36, 0.015), surface(f"fiche{index}", color, 0.6), (0, 0, rng.uniform(-0.5, 0.5)))
    # L'anneau de lumière au-dessus de la table, et la lumière chaude du début de soirée.
    torus("anneau", (tx, ty, 10.6), 5.6, 0.2, surface("anneau", "#17181c", 0.4, 0.8))
    torus("anneau_lumiere", (tx, ty, 10.42), 5.6, 0.09, glow("anneau_lumiere", "#fff1d6", 9))
    area("studio", (0, -4, 13), 32, 1.5e4, "#ffe9cc")
    area("table", (tx, ty, 9.5), 9, 4.0e3, "#fff4e4")
