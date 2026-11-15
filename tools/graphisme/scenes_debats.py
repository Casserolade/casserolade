"""Les plateaux des grands rendez-vous politiques : le dimanche de France 2, le Grand Oral, la soirée électorale, le
débat d'entre-deux-tours. Chacun d'après le vrai plateau de l'émission, vu de face, la table du jeu au milieu : ce qui
signe l'émission se tient en haut à gauche, sur les côtés et au premier plan.
"""
import math
import os

from PIL import Image, ImageDraw, ImageFont

from plateau_3d_kit import HAIRS, SKINS, curved_wall, seated
from studio_images import BOLD_FONT, SERIF_ITALIC_FONT, carpet, font_or, gradient, letters_wall, palace, slats
from studio_kit import LOGO_FONT, TEXT_FONT, area, box, chair, cylinder, glow, painted, panel, picture, ring_sector, sphere, spot, surface, torus
from studio_parts import LOGOS, floor_disc, led_wall, logo_panel, logo_sign, on_circle, room

# Les murs d'écrans courbes de ces plateaux tournent autour du même centre, devant le mur du fond.
CENTER = (0.0, -2.0)
WALL_RADIUS = 17.6
CAMP_COLORS = ["#e8202a", "#2f6bff", "#ffd400", "#5da832", "#e0457b", "#6b4bb8"]


def france2_dimanche(d, rng):
    """France 2, « Le dimanche politique » : un plateau noir, le titre en lettres immenses sur le mur d'écrans, de fins
    traits de lumière, un cercle au sol, une table de verre et deux fauteuils face à face. Costume sombre, ton grave."""
    room("#030407", "#07080c", 0.05, 0.6)
    font = font_or(BOLD_FONT, TEXT_FONT)
    wall = letters_wall(os.path.join(d, "mur.png"), (4096, 1024), ["LE DIMANCHE", "POLITIQUE"], (70, 74, 88), (6, 7, 10), font)
    led_wall("mur", CENTER, WALL_RADIUS, -84, 84, 0.4, 13.8, wall, 0.9)
    line = glow("trait", "#ffffff", 6)
    for angle in (-74, -61, -48, 48, 61, 74):
        x, y = on_circle(CENTER, WALL_RADIUS - 0.4, angle)
        box(f"trait{angle}", (x, y, 7.1), (0.07, 0.07, 13.4), line)
    lx, ly = on_circle(CENTER, WALL_RADIUS - 0.8, -50)
    logo_sign(d, "logo", "france2", (lx, ly, 12.5), 4.6, "#ffffff", 0.12, 1.2, (0, 0, math.radians(32)))
    box("direct", (lx + 3.0, ly + 1.4, 12.5), (1.9, 0.1, 0.7), glow("direct", "#e8202a", 3.5), (0, 0, math.radians(26)))
    # Le cercle de lumière au sol, la table de verre et son piètement d'acier, les deux fauteuils, l'eau, les notes.
    stage = (0.0, -1.2)
    torus("cercle", (stage[0], stage[1], 0.04), 6.2, 0.05, line)
    torus("cercle_fin", (stage[0], stage[1], 0.04), 6.9, 0.02, line)
    glass = surface("verre", "#bcd0e6", 0.03, 0.0, 1.0)
    steel = surface("acier", "#c4c8d0", 0.2, 1.0)
    table = (0.0, -4.0)
    box("table", (table[0], table[1], 1.02), (4.4, 1.6, 0.07), glass, bevel=0.02)
    for side in (-1, 1):
        box(f"pied{side}", (table[0] + side * 1.3, table[1], 0.5), (0.08, 1.3, 1.0), steel, (0, side * 0.5, 0))
        chair(f"fauteuil{side}", (table[0] + side * 3.3, table[1], 0), surface(f"fauteuil{side}", "#15171d", 0.5), -side * math.pi / 2, 1.15)
        cylinder(f"verre{side}", (table[0] + side * 1.5, table[1] + 0.3, 1.06), 0.07, 0.22, surface(f"verre_eau{side}", "#ffffff", 0.02))
        box(f"notes{side}", (table[0] + side * 1.3, table[1] - 0.25, 1.065), (0.5, 0.36, 0.01), surface(f"notes{side}", "#f2efe6", 0.6), (0, 0, side * 0.2))
    area("grave", (0, -2, 13), 22, 5.0e3, "#c8d4ff")
    spot("table", (0, -9, 12), (table[0], table[1], 1.0), 1.6e4, "#eef2ff", 26, 0.5)


def grand_oral(d, rng):
    """Le Grand Oral : une salle d'examen aux boiseries sombres. Le jury derrière sa longue table et ses lampes vertes,
    les bancs de l'amphithéâtre, et le pupitre du candidat, seul dans un cône de lumière."""
    room("#04050a", "#0c0906", 0.16, 0.6)
    walnut = painted("boiseries", slats(os.path.join(d, "boiseries.png"), (2048, 512), rng, ["#3a2414", "#44291a", "#321e10", "#3e2616"], "#140a05", 64), 0.5)
    panel("mur", (0, 15.7, 8.0), 64, 16, walnut)
    gold = surface("or", "#d9a441", 0.25, 1.0)
    box("cimaise", (0, 15.6, 5.2), (64, 0.12, 0.18), gold)
    logo_panel(d, "logo", "LE GRAND ORAL", (-13.8, 15.2, 12.7), 8.5, 1.9, "#d9a441", "#1a0f08", 1.0)
    logo_sign(d, "bfmtv", "bfmtv", (-20.2, 15.2, 12.7), 2.4, "#0b3a9b", 0.02, 1.1)
    dark = surface("chene_sombre", "#2a1a0e", 0.4, coat=0.3)
    green = glow("abat_jour", "#2fb46a", 3.0)
    brass = surface("laiton", "#c9973a", 0.3, 1.0)
    # Le jury, à gauche : une longue table de biais, trois jurés, une lampe verte devant chacun.
    yaw = math.radians(38)
    along, front = (math.cos(yaw), math.sin(yaw)), (math.sin(yaw), -math.cos(yaw))
    jury = (-11.6, 6.6)
    box("table_jury", (jury[0], jury[1], 0.62), (7.4, 1.5, 1.24), dark, (0, 0, yaw), bevel=0.05)
    box("table_jury_dessus", (jury[0], jury[1], 1.28), (7.8, 1.8, 0.08), surface("cuir", "#1f3a2a", 0.6), (0, 0, yaw), bevel=0.02)
    mats = {}
    for index, offset in enumerate((-2.4, 0.0, 2.4)):
        x, y = jury[0] + along[0] * offset, jury[1] + along[1] * offset
        seated(f"jure{index}", (x - front[0] * 1.2, y - front[1] * 1.2, 0.55), rng, ["#15161c", "#22262e", "#1a2238"], SKINS, HAIRS, mats, yaw, 1.25)
        lx, ly = x + front[0] * 0.3 + along[0] * 0.7, y + front[1] * 0.3 + along[1] * 0.7
        cylinder(f"lampe_pied{index}", (lx, ly, 1.32), 0.04, 0.42, brass)
        box(f"lampe{index}", (lx, ly, 1.82), (0.62, 0.26, 0.16), green, (0, 0, yaw), bevel=0.07)
    spot("jury", (-6, -2, 11), (jury[0], jury[1], 1.4), 2.2e4, "#ffe9c8", 40, 0.8)
    # L'amphithéâtre, à droite : quatre rangs de bancs de bois qui montent, deux curieux.
    hall = (0.0, 2.0)
    for row in range(4):
        radius, z = 11.0 + row * 1.5, row * 0.7
        if z:
            ring_sector(f"marche{row}", hall, radius - 0.6, radius + 0.9, 36, 86, z, dark)
            curved_wall(f"contremarche{row}", hall, radius - 0.6, 36, 86, z - 0.7, z, dark, columns=40)
        curved_wall(f"banc{row}", hall, radius, 38, 84, z, z + 0.85, dark, columns=40)
        ring_sector(f"tablette{row}", hall, radius - 0.1, radius + 0.35, 38, 84, z + 0.85, surface(f"tablette{row}", "#4a2e18", 0.4))
    for index, (row, angle) in enumerate(((1, 52), (3, 70))):
        x, y = on_circle(hall, 11.0 + row * 1.5 + 0.7, angle)
        seated(f"curieux{index}", (x, y, row * 0.7 + 0.3), rng, ["#22262e"], SKINS, HAIRS, mats, -math.radians(angle))
    # Le pupitre du candidat, au premier plan : son filet d'or, son micro, son verre d'eau, et le cône de lumière.
    lectern = (2.2, -4.2)
    box("pupitre", (lectern[0], lectern[1], 0.7), (1.7, 1.1, 1.4), surface("pupitre", "#1a120a", 0.3, 0.2, 0.6), (0, 0, -0.2), bevel=0.06)
    box("pupitre_or", (lectern[0] - 0.11, lectern[1] - 0.55, 1.15), (1.55, 0.02, 0.1), gold, (0, 0, -0.2))
    cylinder("micro", (lectern[0], lectern[1], 1.4), 0.02, 0.6, surface("micro", "#222222", 0.4), rotation=(0.4, 0, 0))
    cylinder("verre", (lectern[0] + 0.5, lectern[1] + 0.1, 1.4), 0.06, 0.2, surface("verre", "#ffffff", 0.02))
    spot("seul", (lectern[0], lectern[1], 13), (lectern[0], lectern[1], 0), 9.0e4, "#fff2d0", 20, 0.3)
    spot("bancs", (6, -4, 12), (12.5, 9, 1.5), 2.0e4, "#ffe2b8", 44, 0.8)
    spot("contre", (16, 12, 12), (12, 8, 0), 9.0e3, "#5a6aff", 34, 0.6)
    # Des appliques de laiton sur les boiseries : la salle se devine autour du candidat.
    sconce = glow("applique", "#ffd9a0", 9)
    for x in (-21, -14, -7, 0, 7, 14, 21):
        sphere(f"applique{x}", (x, 15.4, 7.2), 0.22, sconce, (1.0, 1.0, 1.5))
        spot(f"applique_lueur{x}", (x, 14.6, 7.0), (x, 15.7, 11.5), 1.4e3, "#ffcf90", 110, 1.0)
    area("salle", (0, -6, 12), 24, 5.0e3, "#a89078")


def results_frieze(directory, rng):
    """La frise de la soirée électorale : douze candidats sans visage, une couleur et un score chacun."""
    size = (4096, 640)
    image = Image.new("RGB", size, (8, 14, 40))
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(font_or(BOLD_FONT, TEXT_FONT), 104)
    small = ImageFont.truetype(font_or(BOLD_FONT, TEXT_FONT), 280)
    tile = size[0] // 12
    scores = sorted((rng.uniform(0.6, 27.0) for _ in range(12)), reverse=True)
    order = list(range(12))
    rng.shuffle(order)
    for slot, rank in enumerate(order):
        left = slot * tile
        color = CAMP_COLORS[slot % len(CAMP_COLORS)]
        draw.rectangle((left + 10, 10, left + tile - 10, size[1] - 10), fill=(16, 26, 70), outline=color, width=10)
        draw.ellipse((left + tile / 2 - 70, 70, left + tile / 2 + 70, 210), fill=(60, 72, 120))
        draw.pieslice((left + tile / 2 - 130, 230, left + tile / 2 + 130, 520), 180, 360, fill=(60, 72, 120))
        draw.text((left + tile / 2, 150), "?", font=small, fill=color, anchor="mm")
        draw.text((left + tile / 2, 500), f"{scores[rank]:.1f}".replace(".", ",") + " %", font=font, fill="#ffffff", anchor="mm")
    path = os.path.join(directory, "frise.png")
    image.save(path)
    return path


def france2_prime(d, rng):
    """France 2, la grande soirée électorale : la cour de l'Élysée sur le mur d'écrans, la frise des douze candidats et
    de leurs scores au-dessus, le tapis rouge de la présidentielle au sol, et les douze pupitres en arc."""
    room("#050a1c", "#080c1e", 0.08, 0.5)
    led_wall("mur", CENTER, WALL_RADIUS, -84, 84, 0.6, 10.6, palace(os.path.join(d, "elysee.png"), (4096, 1024), rng), 1.0)
    led_wall("frise", CENTER, WALL_RADIUS - 0.3, -84, 84, 10.9, 13.7, results_frieze(d, rng), 1.15)
    curved_wall("filet", CENTER, WALL_RADIUS - 0.2, -84, 84, 10.6, 10.9, surface("filet", "#0a1030", 0.4))
    lx, ly = on_circle(CENTER, WALL_RADIUS - 1.0, -50)
    logo_sign(d, "logo", "france2", (lx, ly, 12.3), 4.4, "#ffffff", 0.12, 1.25, (0, 0, math.radians(32)))
    red = carpet(os.path.join(d, "tapis.png"), 1024, (170, 24, 30), (255, 255, 255), (0.92, 0.64, 0.34), "PRÉSIDENTIELLE 2027", (255, 255, 255), font_or(BOLD_FONT, TEXT_FONT))
    floor_disc("tapis", (0.0, 0.4), 8.3, red, 0.5)
    # Les douze pupitres, six de chaque côté, en arc, chacun au trait de sa couleur.
    white = surface("pupitre", "#eef1f6", 0.25, coat=0.6)
    stage = (0.0, 0.4)
    for index in range(12):
        side = -1 if index < 6 else 1
        angle = side * (62 + (index % 6) * 13)
        x, y = on_circle(stage, 10.6, angle)
        yaw = -math.radians(angle)
        box(f"pupitre{index}", (x, y, 0.75), (1.3, 0.9, 1.5), white, (0, 0, yaw), bevel=0.05)
        fx, fy = on_circle(stage, 10.14, angle)
        box(f"bandeau{index}", (fx, fy, 1.22), (1.2, 0.03, 0.22), glow(f"camp{index}", CAMP_COLORS[index % len(CAMP_COLORS)], 5), (0, 0, yaw))
    area("plateau", (0, -2, 13), 34, 1.6e4, "#dfe6ff")
    spot("rouge", (-22, 0, 10), (-12, 6, 1), 1.4e4, "#e8202a", 50, 0.8)
    spot("bleu", (22, 0, 10), (12, 6, 1), 1.4e4, "#2f6bff", 50, 0.8)


def debate_wall(directory, rng):
    """Le fond du débat : la cour de l'Élysée, et « Le Débat » en lettres blanches, de chaque côté."""
    path = palace(os.path.join(directory, "elysee.png"), (4096, 1024), rng)
    image = Image.open(path)
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(font_or(SERIF_ITALIC_FONT, TEXT_FONT), 230)
    for share in (0.17, 0.5, 0.83):
        draw.text((image.width * share, 150), "Le Débat", font=font, fill="#ffffff", anchor="mm", stroke_width=3, stroke_fill="#0a1030")
    image.save(path)
    return path


def channels_frieze(directory):
    """La frise du débat : les logos des deux chaînes qui l'organisent, l'un après l'autre, sur un bleu nuit."""
    size = (4096, 420)
    image = gradient(size, (10, 30, 110), (16, 52, 170)).convert("RGBA")
    slot = size[0] // 10
    for index in range(10):
        logo = Image.open(os.path.join(LOGOS, "tf1.png" if index % 2 == 0 else "france2.png")).convert("RGBA")
        logo.thumbnail((slot - 150, 200))
        plate = Image.new("RGBA", (logo.width + 36, logo.height + 28), "#ffffff")
        plate.alpha_composite(logo, (18, 14))
        image.alpha_composite(plate, (index * slot + (slot - plate.width) // 2, (size[1] - plate.height) // 2))
    path = os.path.join(directory, "chaines.png")
    image.convert("RGB").save(path)
    return path


def tf1_second_tour(d, rng):
    """Le débat d'entre-deux-tours : la cour de l'Élysée à la tombée du jour, « Le Débat » en lettres blanches, la frise
    des deux chaînes, le tapis bleu et ses anneaux, deux pupitres ronds et dorés face à face, les chronos entre eux,
    le bleu d'un côté et le rouge de l'autre."""
    room("#040a24", "#060a1c", 0.06, 0.4)
    led_wall("mur", CENTER, WALL_RADIUS, -84, 84, 0.6, 11.0, debate_wall(d, rng), 1.0)
    led_wall("frise", CENTER, WALL_RADIUS - 0.3, -84, 84, 11.3, 13.5, channels_frieze(d), 1.1)
    curved_wall("filet", CENTER, WALL_RADIUS - 0.2, -84, 84, 11.0, 11.3, surface("filet", "#0a1030", 0.4))
    blue, red = glow("bleu", "#2f7dff", 7), glow("rouge", "#ff1f32", 7)
    for angle, mat in ((-80, blue), (-76, blue), (76, red), (80, red)):
        x, y = on_circle(CENTER, WALL_RADIUS - 0.6, angle)
        box(f"colonne{angle}", (x, y, 6.9), (0.3, 0.3, 13.6), mat)
    stage = (0.0, 0.6)
    rings = carpet(os.path.join(d, "tapis.png"), 1024, (16, 52, 170), (255, 255, 255), (0.93, 0.72, 0.5, 0.26))
    floor_disc("tapis", stage, 8.5, rings, 0.45)
    # Les deux pupitres : des tambours dorés, face à face, un filet de lumière à leur pied ; les chronos entre eux.
    gold = surface("or", "#c9a24a", 0.22, 1.0)
    top = surface("dessus", "#101422", 0.2, coat=1.0)
    desks = (0.0, -3.4)
    for side, mat in ((-1, blue), (1, red)):
        x = desks[0] + side * 2.9
        cylinder(f"pupitre{side}", (x, desks[1], 0.0), 1.2, 1.22, gold, vertices=64)
        cylinder(f"pupitre_dessus{side}", (x, desks[1], 1.22), 1.32, 0.07, top, vertices=64)
        torus(f"pupitre_filet{side}", (x, desks[1], 0.08), 1.22, 0.04, mat)
        chair(f"fauteuil{side}", (x + side * 1.9, desks[1] + 0.2, 0), surface(f"fauteuil{side}", "#101422", 0.5), -side * math.pi / 2, 1.2)
        spot(f"contre{side}", (side * 22, 6, 9), (side * 7, -3, 1), 2.0e4, "#2f7dff" if side < 0 else "#ff1f32", 45, 0.8)
    path = os.path.join(d, "chronos.png")
    image = Image.new("RGB", (1024, 400), "#0a1e6a")
    draw = ImageDraw.Draw(image)
    small = ImageFont.truetype(font_or(BOLD_FONT, TEXT_FONT), 78)
    big = ImageFont.truetype(LOGO_FONT, 190)
    for share, name, time, color in ((0.25, "VOUS", "14:32", "#2f7dff"), (0.75, "L'AUTRE", "14:58", "#ff1f32")):
        draw.rectangle((image.width * (share - 0.23), 22, image.width * (share + 0.23), 122), fill=color)
        draw.text((image.width * share, 72), name, font=small, fill="#ffffff", anchor="mm")
        draw.text((image.width * share, 260), time, font=big, fill="#ffffff", anchor="mm")
    image.save(path)
    box("chronos_cadre", (desks[0], desks[1] + 0.05, 0.62), (3.3, 0.2, 1.24), top)
    panel("chronos", (desks[0], desks[1] - 0.06, 0.62), 3.1, 1.1, picture("chronos", path, 1.3))
    area("cle", (0, -4, 13), 30, 1.4e4, "#e6ecff")
    spot("pupitres", (0, -11, 9), (desks[0], desks[1], 0.8), 1.4e4, "#ffe9c0", 40, 0.7)
