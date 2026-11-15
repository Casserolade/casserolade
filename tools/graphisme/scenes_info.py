"""Les plateaux des chaînes d'information et du journal : LCI, BFMTV, le 20 heures de TF1. Chacun d'après le vrai
plateau de l'émission, vu de face, la table du jeu au milieu : ce qui signe l'émission se tient en haut à gauche, sur
les côtés et au premier plan.
"""
import math
import os

from PIL import Image, ImageDraw, ImageFont

from plateau_3d_kit import curved_wall
from studio_images import BOLD_FONT, carpet, font_or, gradient, letters_wall, skyline, title_card
from studio_kit import TEXT_FONT, area, box, chair, cylinder, glow, panel, picture, sphere, spot, surface, torus
from studio_parts import desk_arc, flag, floor_decal, floor_disc, led_wall, logo_panel, logo_sign, on_circle, room

# Les murs d'écrans courbes de ces plateaux tournent autour du même centre, devant le mur du fond.
CENTER = (0.0, -2.0)
WALL_RADIUS = 17.6


def mosaic_wall(directory, rng):
    """Le mur d'écrans de « L'Heure des pros » : Paris en plein jour, découpé en carreaux, les uns en couleur, d'autres
    en noir et blanc, quelques-uns noirs ou rouges."""
    path = skyline(os.path.join(directory, "paris.png"), (4096, 768), rng, (120, 170, 232), (228, 236, 246), (74, 84, 100), (255, 244, 214))
    image = Image.open(path)
    draw = ImageDraw.Draw(image)
    columns, rows = 24, 5
    tile_w, tile_h = image.width / columns, image.height / rows
    for column in range(columns):
        for row in range(rows):
            box_ = (int(column * tile_w), int(row * tile_h), int((column + 1) * tile_w), int((row + 1) * tile_h))
            roll = rng.random()
            if roll < 0.4:
                image.paste(image.crop(box_).convert("L").point(lambda v: min(255, int((v - 60) * 1.5))).convert("RGB"), box_)
            elif roll < 0.5:
                draw.rectangle(box_, fill=(12, 12, 16))
            elif roll < 0.57:
                draw.rectangle(box_, fill=(211, 18, 31))
            draw.rectangle(box_, outline=(8, 8, 10), width=5)
    image.save(path)
    return path


def cnews(d, rng):
    """CNews, « L'Heure des pros » : Paris en mosaïque sur le mur d'écrans, le titre de l'émission en bandeau, des filets
    rouges, et la grande table ovale des chroniqueurs, leurs fauteuils tirés autour."""
    room("#07080c", "#0a0b10", 0.07, 0.5)
    font = font_or(BOLD_FONT, TEXT_FONT)
    led_wall("mur", CENTER, WALL_RADIUS, -84, 84, 1.2, 10.7, mosaic_wall(d, rng), 1.0)
    band = letters_wall(os.path.join(d, "bandeau.png"), (4096, 190), ["L'HEURE DES PROS   ·"], (255, 255, 255), (10, 10, 13), font)
    led_wall("bandeau", CENTER, WALL_RADIUS - 0.3, -84, 84, 11.0, 12.5, band, 1.25)
    red = glow("filet", "#e2121f", 8)
    dark = surface("coque", "#101116", 0.3, coat=0.6)
    curved_wall("soubassement", CENTER, WALL_RADIUS - 0.1, -84, 84, 0.0, 1.2, dark)
    for name, bottom, top in (("filet_bas", 1.1, 1.24), ("filet_milieu", 10.74, 10.94), ("filet_haut", 12.5, 12.64)):
        curved_wall(name, CENTER, WALL_RADIUS - 0.35, -84, 84, bottom, top, red)
    lx, ly = on_circle(CENTER, WALL_RADIUS - 2.4, -52)
    logo_sign(d, "logo", "cnews", (lx, ly, 11.7), 4.8, "#ffffff", 0.08, 1.3, (0, 0, math.radians(32)))
    # La grande table ovale : un plateau blanc, un pied sombre au filet rouge, le logo sur son devant.
    table = (0.0, -1.6)
    top = cylinder("table", (table[0], table[1], 1.0), 5.2, 0.14, surface("table", "#eef0f4", 0.12, coat=1.0), vertices=96)
    top.scale = (1.0, 0.5, 1.0)
    base = cylinder("table_pied", (table[0], table[1], 0.0), 4.0, 1.0, dark, vertices=96)
    base.scale = (1.0, 0.5, 1.0)
    line = torus("table_filet", (table[0], table[1], 0.06), 4.02, 0.04, red)
    line.scale = (1.0, 0.5, 1.0)
    logo_sign(d, "logo_table", "cnews", (table[0], table[1] - 2.03, 0.52), 2.6, "#ffffff", 0.08, 1.2)
    seat = surface("fauteuil", "#16181e", 0.5)
    for index, x in enumerate((-3.6, -1.3, 1.3, 3.6)):
        chair(f"fauteuil_devant{index}", (x, table[1] - 3.0 + abs(x) * 0.18, 0), seat, math.pi, 1.15)
    for index, x in enumerate((-2.6, 0.0, 2.6)):
        chair(f"fauteuil_fond{index}", (x, table[1] + 2.9 - abs(x) * 0.2, 0), seat, 0.0, 1.15)
    area("cle", (0, -5, 12.5), 26, 1.4e4, "#f2f4ff")
    spot("rouge_g", (-22, -6, 10), (-13, 8, 3), 1.4e4, "#ff2a3a", 50, 0.8)
    spot("rouge_d", (22, -6, 10), (13, 8, 3), 1.4e4, "#ff2a3a", 50, 0.8)


def general_map(directory):
    """La carte d'état-major du général : un quadrillage, un pays, une ligne de front, des flèches bleues et rouges."""
    path = os.path.join(directory, "carte.png")
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
    return path


def lci(d, rng):
    """LCI, « 24 h Pujadas » : un plateau blanc et rond, Paris au crépuscule sur le mur d'écrans, des anneaux de lumière
    au plafond, le bureau blanc au titre de l'émission, et la carte d'état-major du général, avec ses flèches."""
    room("#dfe5ee", "#b9c2d2", 0.12, 0.4)
    font = font_or(BOLD_FONT, TEXT_FONT)
    sky = skyline(os.path.join(d, "paris.png"), (4096, 768), rng, (70, 40, 130), (250, 150, 170), (40, 26, 80), (255, 230, 170), "24H PUJADAS", font)
    led_wall("mur", CENTER, WALL_RADIUS, -84, 84, 2.2, 11.4, sky, 1.0)
    white = surface("blanc", "#f4f6fa", 0.25, coat=0.6)
    line = glow("filet", "#35a4ff", 7)
    curved_wall("soubassement", CENTER, WALL_RADIUS - 0.1, -84, 84, 0.0, 2.2, white)
    curved_wall("fronton", CENTER, WALL_RADIUS - 0.3, -86, 86, 11.4, 13.9, white)
    curved_wall("filet_bas", CENTER, WALL_RADIUS - 0.2, -84, 84, 2.1, 2.22, line)
    curved_wall("filet_haut", CENTER, WALL_RADIUS - 0.4, -84, 84, 11.38, 11.5, line)
    # Les anneaux du plafond : une coque blanche, un trait de lumière dessous.
    for index, (radius, z) in enumerate(((7.5, 11.0), (4.6, 11.7))):
        torus(f"anneau_coque{index}", (0, 2.0, z + 0.28), radius, 0.32, white)
        torus(f"anneau{index}", (0, 2.0, z), radius, 0.12, glow(f"anneau{index}", "#ffffff", 8))
    lx, ly = on_circle(CENTER, WALL_RADIUS - 0.7, -50)
    logo_panel(d, "logo", "LCI", (lx, ly, 12.6), 3.8, 1.8, "#ffffff", "#1a4fd0", 1.3, rotation=(0, 0, math.radians(32)))
    # Le bureau blanc, en arc, et le titre de l'émission sur son devant.
    desk = (0.0, 1.4)
    desk_arc("bureau", desk, 5.6, 222, 138, 1.2, 1.3, white, white, "#35a4ff")
    title = title_card(os.path.join(d, "titre.png"), (1408, 256), "24H PUJADAS", "#ffffff", "#3a2a8a", font, 0.72)
    curved_wall("titre", desk, 5.63, 200, 160, 0.22, 0.98, picture("titre", title, 1.15), columns=24)
    # La carte du général, sur son écran à pied, tournée vers la table ; sa baguette posée contre.
    yaw = math.radians(-32)
    front = (math.sin(yaw), -math.cos(yaw))
    box("carte_cadre", (12.6, 7.0, 4.7), (7.5, 0.25, 5.0), white, (0, 0, yaw), bevel=0.06)
    panel("carte", (12.6 + 0.14 * front[0], 7.0 + 0.14 * front[1], 4.7), 7.0, 4.5, picture("carte", general_map(d), 1.4), (0, 0, yaw))
    box("carte_pied", (12.6, 7.0, 1.1), (0.5, 0.4, 2.2), white, (0, 0, yaw))
    box("carte_socle", (12.6, 7.0, 0.06), (3.0, 1.6, 0.12), white, (0, 0, yaw), bevel=0.04)
    cylinder("baguette", (9.4, 5.6, 0.0), 0.04, 3.4, surface("baguette", "#d9a441", 0.3, 0.8), rotation=(0.0, 0.5, 0.0))
    area("studio", (0, -4, 14), 36, 1.5e4, "#f4f8ff")
    spot("bleu_g", (-22, -4, 10), (-14, 9, 4), 1.2e4, "#35a4ff", 45, 0.8)
    spot("bleu_d", (22, -4, 10), (14, 9, 4), 1.2e4, "#35a4ff", 45, 0.8)


def bfm_totems(directory, count):
    """Les totems d'écrans de « Face à BFM » : le titre en lettres géantes sur un bleu nuit, découpé en hautes tranches."""
    size = (4096, 1100)
    image = gradient(size, (6, 14, 60), (22, 76, 210))
    draw = ImageDraw.Draw(image)
    for offset in range(-size[1], size[0], 180):
        draw.line((offset, size[1], offset + size[1], 0), fill=(40, 100, 230), width=3)
    font = ImageFont.truetype(font_or(BOLD_FONT, TEXT_FONT), 560)
    text = "FACE À BFM"
    draw.text((size[0] / 2, size[1] * 0.52), text, font=font, fill="#ffffff", anchor="mm")
    paths = []
    width = size[0] // count
    for index in range(count):
        path = os.path.join(directory, f"totem{index}.png")
        image.crop((index * width + 40, 0, (index + 1) * width - 40, size[1])).save(path)
        paths.append(path)
    return paths


def bfm(d, rng):
    """BFMTV, « Face à BFM » : un plateau noir et bleu nuit, de hauts totems d'écrans aux lettres géantes, deux pupitres
    blancs face à face sur un disque de lumière, le grand anneau du plafond, et l'alerte info qui court en haut du
    décor : c'est vous."""
    room("#04060e", "#05070f", 0.06, 0.5)
    font = font_or(BOLD_FONT, TEXT_FONT)
    steel = surface("acier", "#14161c", 0.3, 0.8)
    for index, path in enumerate(bfm_totems(d, 8)):
        x = -21 + index * 6
        box(f"totem_cadre{index}", (x, 15.45, 6.6), (4.7, 0.3, 11.6), steel)
        panel(f"totem{index}", (x, 15.25, 6.6), 4.4, 11.2, picture(f"totem{index}", path, 1.0))
    # L'alerte info court en haut du décor, à droite du logo.
    alert = letters_wall(os.path.join(d, "alerte.png"), (4096, 160), ["ALERTE INFO : C'EST VOUS   ·"], (255, 255, 255), (226, 0, 26), font)
    panel("alerte", (6.0, 15.0, 13.3), 40, 1.56, picture("alerte", alert, 1.5))
    logo_sign(d, "logo", "bfmtv", (-17.2, 14.9, 13.0), 4.6, "#0b3a9b", 0.02, 1.3)
    flag("drapeau_g", (-12.2, 13.6, 0.0))
    flag("drapeau_d", (11.2, 13.6, 0.0), ("#0b3a9b", "#0b3a9b", "#0b3a9b"))
    # Le grand anneau du plafond, et le disque de lumière où se tiennent les deux pupitres.
    stage = (0.0, -2.8)
    torus("anneau_coque", (0, 1.0, 11.5), 6.2, 0.4, steel)
    torus("anneau", (0, 1.0, 11.15), 6.2, 0.14, glow("anneau", "#ffffff", 9))
    cylinder("disque", (stage[0], stage[1], 0.0), 4.4, 0.1, surface("disque", "#0a0c14", 0.08, coat=1.0), vertices=96)
    torus("disque_lumiere", (stage[0], stage[1], 0.1), 4.4, 0.06, glow("disque_lumiere", "#ffffff", 9))
    torus("disque_bleu", (stage[0], stage[1], 0.1), 3.6, 0.03, glow("disque_bleu", "#2f6bff", 8))
    white = surface("pupitre", "#f2f4f8", 0.2, coat=1.0)
    blue = glow("pupitre_filet", "#2f6bff", 7)
    for side in (-1, 1):
        yaw = -side * 0.55
        x, y = side * 2.5, stage[1] - 0.6
        box(f"pupitre{side}", (x, y, 0.72), (1.5, 0.9, 1.24), white, (0, 0, yaw), bevel=0.06)
        box(f"pupitre_dessus{side}", (x, y, 1.37), (1.75, 1.1, 0.07), white, (0, 0, yaw), bevel=0.03)
        box(f"pupitre_filet{side}", (x + 0.46 * math.sin(yaw), y - 0.46 * math.cos(yaw), 0.2), (1.4, 0.03, 0.06), blue, (0, 0, yaw))
    logo = os.path.join(d, "logo_sol.png")
    Image.open(os.path.join(d, "logo.png")).save(logo)
    floor_decal("logo_sol", (stage[0], stage[1] - 2.6), 1.9, 1.9, logo, 0.9)
    area("cle", (0, -6, 12), 20, 9.0e3, "#eef2ff")
    spot("bleu_g", (-20, -8, 9), (-8, 6, 2), 1.6e4, "#2f6bff", 50, 0.8)
    spot("bleu_d", (20, -8, 9), (8, 6, 2), 1.6e4, "#2f6bff", 50, 0.8)
    spot("pupitres", (0, -10, 11), (0, stage[1], 1.0), 1.0e4, "#ffffff", 34, 0.6)


def tf1_20h(d, rng):
    """TF1, le 20 heures : la « fenêtre sur le monde », un mur d'écrans courbe où Paris s'allume à l'heure bleue, le sol
    rond couleur pêche et ses anneaux blancs, le grand bureau blanc en aile, les lampes du plafond en arc."""
    room("#060a18", "#0c1226", 0.06, 0.5)
    font = font_or(BOLD_FONT, TEXT_FONT)
    sky = skyline(os.path.join(d, "paris.png"), (4096, 768), rng, (22, 52, 130), (120, 170, 235), (18, 30, 70), (255, 226, 150), "LE 20H", font)
    led_wall("mur", CENTER, WALL_RADIUS, -84, 84, 1.4, 12.2, sky, 1.05)
    shell = surface("coque", "#1a2440", 0.3, coat=0.6)
    curved_wall("soubassement", CENTER, WALL_RADIUS - 0.1, -84, 84, 0.0, 1.4, shell)
    curved_wall("fronton", CENTER, WALL_RADIUS - 0.3, -86, 86, 12.2, 13.9, shell)
    curved_wall("filet", CENTER, WALL_RADIUS - 0.2, -84, 84, 1.3, 1.42, glow("filet", "#4a8cff", 7))
    lamp = glow("lampe", "#fff6e0", 16)
    for angle in range(-80, 81, 8):
        x, y = on_circle(CENTER, WALL_RADIUS - 1.2, angle)
        sphere(f"lampe{angle}", (x, y, 13.0), 0.16, lamp, segments=10)
    lx, ly = on_circle(CENTER, WALL_RADIUS - 2.4, -52)
    logo_sign(d, "logo", "tf1", (lx, ly, 11.5), 4.8, "#1a2440", 0.05, 1.3, (0, 0, math.radians(32)))
    # Le sol rond, couleur pêche, et ses anneaux blancs.
    stage = (0.0, 1.0)
    peach = carpet(os.path.join(d, "sol.png"), 1024, (236, 150, 96), (255, 255, 255), (0.94, 0.7, 0.46, 0.22))
    floor_disc("sol", stage, 8.5, peach, 0.42)
    # Le bureau blanc, en aile, son filet bleu, et le titre du journal sur son devant.
    white = surface("bureau", "#eef1f6", 0.12, coat=1.0)
    desk_arc("bureau", stage, 5.3, 230, 130, 1.15, 1.5, white, white, "#4a8cff")
    title = title_card(os.path.join(d, "titre.png"), (1024, 256), "LE 20H", "#ffffff", "#0a1a5a", font, 0.78)
    curved_wall("titre", stage, 5.33, 194, 166, 0.22, 0.95, picture("titre", title, 1.15), columns=24)
    area("cle", (0, -6, 12), 26, 1.4e4, "#eef2ff")
    spot("bleu_g", (-22, -6, 10), (-13, 8, 3), 1.2e4, "#4a8cff", 50, 0.8)
    spot("bleu_d", (22, -6, 10), (13, 8, 3), 1.2e4, "#4a8cff", 50, 0.8)
