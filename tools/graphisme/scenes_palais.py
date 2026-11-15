"""Les deux hémicycles : l'Assemblée nationale pour LCP, le Sénat pour Public Sénat. Chacun d'après la vraie salle,
vue du fond, face au perchoir : les travées montent de chaque côté, ce qui signe la salle se tient au fond, en haut et
sur les côtés.
"""
import math
import os

from PIL import ImageDraw

from plateau_3d_kit import HAIRS, SKINS, curved_wall, seated
from studio_images import BOLD_FONT, carpet, font_or, gradient
from studio_kit import TEXT_FONT, area, box, cylinder, fluted_column, glow, painted, panel, point, ring_sector, sphere, spot, surface, torus
from studio_parts import arc_seats, carpeted_room, flag, floor_disc, logo_panel, on_circle, statue

# Les travées tournent autour du milieu de la salle et montent vers les murs, de chaque côté ; la galerie du public
# court au-dessus d'elles, derrière sa colonnade.
HALL = (0.0, 0.0)
ROWS = 7
GALLERY_RADIUS = 18.6


def sides(spread):
    """Les deux côtés de la salle : le côté droit va de `spread[0]` à `spread[1]` degrés, le gauche est son miroir."""
    return ((1, spread[0], spread[1]), (-1, -spread[0], -spread[1]))


def side_tiers(name, spread, rng, seat, desk, step, people, clothes):
    """Les travées des deux côtés : des rangs en arc qui montent vers le mur, pupitres de bois et sièges de velours,
    et quelques élus clairsemés (`people` par côté)."""
    mats = {}
    for side, start, end in sides(spread):
        for row in range(ROWS):
            radius = 9.5 + row * 1.3
            z = row * 0.55
            if z:
                ring_sector(f"{name}_marche{side}{row}", HALL, radius - 0.5, radius + 1.4, min(start, end), max(start, end), z, step)
                curved_wall(f"{name}_contremarche{side}{row}", HALL, radius - 0.5, start, end, z - 0.55, z, step, columns=40)
            arc_seats(f"{name}_rang{side}{row}", HALL, radius, start, end, 5 + row, z, seat, desk)
        for index in range(people):
            row = rng.randrange(0, ROWS)
            seats = 5 + row
            angle = start + (end - start) * (rng.randrange(0, seats) + 0.5) / seats
            x, y = on_circle(HALL, 9.5 + row * 1.3 + 0.62, angle)
            seated(f"{name}_elu{side}{index}", (x, y, row * 0.55 + 0.6), rng, clothes, SKINS, HAIRS, mats, -math.radians(angle))


def gallery(name, spread, wall, stone, drape):
    """Le tour de la salle, de chaque côté : le mur des travées, la galerie du public et sa colonnade, la corniche."""
    for side, start, end in sides(spread):
        curved_wall(f"{name}_mur{side}", HALL, GALLERY_RADIUS, start, end, 0.0, 6.2, wall, columns=60)
        curved_wall(f"{name}_fond{side}", HALL, GALLERY_RADIUS + 0.9, start, end, 6.2, 12.6, drape, columns=60)
        ring_sector(f"{name}_balcon{side}", HALL, GALLERY_RADIUS - 0.7, GALLERY_RADIUS + 0.9, min(start, end), max(start, end), 6.2, stone)
        curved_wall(f"{name}_garde_corps{side}", HALL, GALLERY_RADIUS - 0.7, start, end, 5.7, 6.7, stone, columns=60)
        curved_wall(f"{name}_corniche{side}", HALL, GALLERY_RADIUS - 0.8, start, end, 12.3, 13.8, stone, columns=60)
        count = max(2, round(abs(end - start) / 8))
        for index in range(count + 1):
            angle = start + (end - start) * index / count
            x, y = on_circle(HALL, GALLERY_RADIUS - 0.35, angle)
            fluted_column(f"{name}_colonne{side}{index}", (x, y, 6.2), 0.42, 6.1, stone, flutes=14)


def tapestry(directory):
    """La tapisserie du fond : des arcades dans une lumière dorée, et une foule de figures drapées, à grands traits."""
    size = (1200, 940)
    image = gradient(size, (196, 170, 120), (150, 118, 80))
    draw = ImageDraw.Draw(image)
    for index in range(3):
        inset = 150 + index * 150
        draw.pieslice((inset, 80 + index * 70, size[0] - inset, 760), 180, 360, outline=(120, 92, 60), width=14)
    draw.rectangle((0, 640, size[0], size[1]), fill=(136, 104, 70))
    robes = [(150, 40, 36), (40, 70, 130), (196, 150, 60), (230, 220, 200), (70, 110, 80), (120, 60, 110)]
    for index in range(26):
        x = 60 + index * 43 + (index % 3) * 9
        y = 600 + (index % 4) * 34
        color = robes[index % len(robes)]
        draw.polygon([(x - 30, y + 260), (x - 16, y + 40), (x + 16, y + 40), (x + 30, y + 260)], fill=color)
        draw.ellipse((x - 15, y, x + 15, y + 34), fill=(226, 190, 150))
    path = os.path.join(directory, "tapisserie.png")
    image.save(path)
    return path


def medallion(directory, name, text, base):
    """Le médaillon du tapis, au pied de la caméra : un fond de couleur, des anneaux d'or, le nom de la maison."""
    path = os.path.join(directory, f"{name}.png")
    return carpet(path, 1024, base, (212, 164, 74), (0.92, 0.84, 0.3), text, (232, 190, 96), font_or(BOLD_FONT, TEXT_FONT))


def lcp(d, rng):
    """LCP, les questions au gouvernement : l'hémicycle de l'Assemblée nationale. Au fond, le perchoir de bois et d'or
    sous sa tapisserie, entre des colonnes de marbre ; de chaque côté, les travées de velours rouge qui montent, la
    galerie et sa colonnade ; et onze députés en séance."""
    carpeted_room("#3a2216", "#6a181c")
    stone = surface("marbre", "#e9dfc8", 0.5)
    wood = surface("acajou", "#5c2e16", 0.4, coat=0.3)
    gold = surface("or", "#d4a24a", 0.3, 1.0)
    velvet = surface("velours", "#a01420", 0.85)
    # Le mur du perchoir : la tapisserie dans son cadre d'or, quatre colonnes, deux statues, l'entablement.
    box("mur_perchoir", (0, 15.6, 7.0), (26, 0.3, 14), surface("mur", "#d9cdb2", 0.6))
    panel("tapisserie", (0, 15.4, 8.6), 9.4, 7.36, painted("tapisserie", tapestry(d), 0.7))
    for x, width, z, height in ((0, 10.2, 12.5, 0.4), (0, 10.2, 4.7, 0.4), (-4.9, 0.4, 8.6, 8.2), (4.9, 0.4, 8.6, 8.2)):
        box("cadre", (x, 15.35, z), (width, 0.2, height), gold)
    for x in (-10.6, -6.2, 6.2, 10.6):
        fluted_column(f"colonne{x}", (x, 14.8, 0.0), 0.62, 12.4, stone, flutes=16)
    box("entablement", (0, 14.8, 13.1), (24, 1.5, 1.4), stone, bevel=0.06)
    box("frise", (0, 14.02, 12.75), (23, 0.06, 0.3), gold)
    for x in (-8.4, 8.4):
        box(f"niche{x}", (x, 15.2, 1.5), (1.7, 1.0, 3.0), stone, bevel=0.05)
        statue(f"statue{x}", (x, 15.1, 3.0), stone, 1.5)
    # Le perchoir : la tribune de l'orateur, le bureau du président au-dessus, son fauteuil, deux lampes.
    box("tribune", (0, 11.4, 0.95), (3.6, 1.5, 1.9), wood, bevel=0.06)
    box("tribune_relief", (0, 10.63, 1.0), (2.8, 0.05, 1.1), gold)
    box("perchoir_bas", (0, 13.2, 1.4), (9.0, 2.4, 2.8), wood, bevel=0.06)
    box("perchoir_relief", (0, 11.98, 1.5), (7.4, 0.05, 1.5), gold)
    box("perchoir_haut", (0, 13.7, 3.5), (5.2, 1.6, 1.4), wood, bevel=0.06)
    box("fauteuil", (0, 14.3, 5.0), (1.3, 0.5, 2.6), velvet, bevel=0.1)
    box("fauteuil_or", (0, 14.28, 6.36), (1.5, 0.56, 0.16), gold)
    for x in (-2.1, 2.1):
        cylinder(f"lampe_pied{x}", (x, 13.2, 4.2), 0.05, 0.5, gold)
        sphere(f"lampe{x}", (x, 13.2, 4.8), 0.2, glow(f"lampe{x}", "#ffe2a8", 9), (1.4, 1.0, 0.6))
        point(f"lampe_lueur{x}", (x, 13.0, 4.9), 160, "#ffd9a0", 0.2)
    flag("drapeau", (-3.4, 14.4, 2.8), height=5.0)
    flag("europe", (2.6, 14.4, 2.8), ("#0b3a9b", "#0b3a9b", "#0b3a9b"), height=5.0)
    seated("orateur", (0, 12.2, 1.35), rng, ["#1a2a4a"], SKINS, HAIRS, {}, 0.0, 1.25)
    lx, ly = on_circle(HALL, GALLERY_RADIUS - 3.4, -58)
    logo_panel(d, "logo", "LCP", (lx, ly, 10.6), 4.6, 1.9, "#ffffff", "#d21f3c", 1.3, rotation=(0, 0, math.radians(34)))
    gallery("salle", (40, 86), wood, stone, surface("tenture", "#4a1016", 0.8))
    side_tiers("travees", (42, 84), rng, velvet, surface("pupitre", "#7a4a26", 0.45), surface("marche", "#3a1c10", 0.6), 5, ["#2a2a30", "#5a5a60", "#1a2a4a", "#3a2a2a"])
    floor_disc("medaillon", (0, -4.4), 3.3, medallion(d, "medaillon", "ASSEMBLÉE NATIONALE", (110, 16, 22)), 0.36)
    # La verrière : une lumière de jour qui tombe du plafond.
    area("verriere", (0, 4, 15), 30, 2.6e4, "#fff4e2")
    spot("perchoir", (0, -6, 13), (0, 13, 3), 1.6e4, "#fff0d8", 40, 0.8)


def coffers(directory):
    """La voûte dorée du Sénat : des caissons d'or, rang sur rang."""
    size = (2048, 512)
    image = gradient(size, (150, 110, 40), (214, 170, 78))
    draw = ImageDraw.Draw(image)
    for row in range(3):
        for column in range(24):
            x, y = column * 85 + 12, row * 160 + 24
            draw.rectangle((x, y, x + 62, y + 118), outline=(96, 66, 20), width=6)
            draw.rectangle((x + 16, y + 16, x + 46, y + 102), fill=(232, 196, 110))
    path = os.path.join(directory, "voute.png")
    image.save(path)
    return path


def public_senat(d, rng):
    """Public Sénat, en séance publique : l'hémicycle du Sénat. Au fond, la niche du plateau, ses colonnes de marbre
    rouge, ses statues blanches devant des tentures cramoisies, sous une voûte de caissons d'or ; de chaque côté, les
    fauteuils de velours ; des lustres ; et une poignée de sénateurs."""
    carpeted_room("#2a0c10", "#5a1016")
    niche = (0.0, 4.6)
    marble = surface("marbre_rouge", "#8a3a2c", 0.3, coat=0.5)
    stone = surface("pierre", "#efe6d2", 0.5)
    gold = surface("or", "#d4a24a", 0.28, 1.0)
    wood = surface("chene", "#6a3c1c", 0.4, coat=0.3)
    velvet = surface("velours", "#8e1018", 0.85)
    # La niche : les tentures, les colonnes de marbre rouge, une statue entre deux colonnes, la corniche, la voûte.
    curved_wall("tentures", niche, 10.9, -72, 72, 0.0, 12.0, surface("tenture", "#6a0c14", 0.85), columns=90)
    curved_wall("soubassement", niche, 10.4, -72, 72, 0.0, 2.6, wood, columns=90)
    curved_wall("corniche", niche, 10.0, -76, 76, 11.6, 12.7, gold, columns=90)
    curved_wall("voute", niche, 10.2, -76, 76, 12.7, 15.6, painted("voute", coffers(d), 0.35), columns=90)
    for index in range(9):
        angle = -64 + index * 16
        x, y = on_circle(niche, 10.3, angle)
        fluted_column(f"colonne{index}", (x, y, 2.6), 0.5, 9.0, marble, flutes=14)
        if index < 8:
            sx, sy = on_circle(niche, 10.5, angle + 8)
            statue(f"statue{index}", (sx, sy, 2.6), stone, 1.55)
    # Le plateau du président : deux étages de chêne, son fauteuil, la tribune devant.
    box("plateau_bas", (0, 12.0, 1.2), (8.4, 2.2, 2.4), wood, bevel=0.06)
    box("plateau_relief", (0, 10.88, 1.3), (7.0, 0.05, 1.2), gold)
    box("plateau_haut", (0, 12.6, 3.1), (4.8, 1.5, 1.4), wood, bevel=0.06)
    box("fauteuil", (0, 13.2, 4.6), (1.3, 0.5, 2.4), velvet, bevel=0.1)
    box("fauteuil_or", (0, 13.18, 5.86), (1.5, 0.56, 0.16), gold)
    box("tribune", (0, 9.6, 0.9), (3.2, 1.4, 1.8), wood, bevel=0.06)
    flag("drapeau", (-3.2, 12.8, 2.4), height=5.0)
    flag("europe", (2.4, 12.8, 2.4), ("#0b3a9b", "#0b3a9b", "#0b3a9b"), height=5.0)
    lx, ly = on_circle(HALL, GALLERY_RADIUS - 3.4, -60)
    logo_panel(d, "logo", "PUBLIC SÉNAT", (lx, ly, 10.5), 6.0, 1.6, "#ffffff", "#b3122a", 1.3, rotation=(0, 0, math.radians(34)))
    gallery("salle", (50, 86), wood, stone, surface("fond", "#3a0a10", 0.8))
    side_tiers("travees", (56, 86), rng, velvet, surface("pupitre", "#7a4a26", 0.45), surface("marche", "#3a1c10", 0.6), 3, ["#2a2a30", "#4a4a52", "#3a2a2a"])
    floor_disc("medaillon", (0, -4.4), 3.3, medallion(d, "medaillon", "SÉNAT", (96, 12, 20)), 0.36)
    # Les lustres : un cercle de laiton et ses bougies.
    crystal = glow("cristal", "#ffe9b0", 10)
    for x in (-9.5, 9.5):
        cylinder("chaine", (x, 3, 11.4), 0.03, 3.4, gold)
        torus("lustre", (x, 3, 11.3), 1.3, 0.07, gold)
        for k in range(10):
            a = k * math.tau / 10
            sphere("bougie", (x + 1.3 * math.cos(a), 3 + 1.3 * math.sin(a), 11.45), 0.11, crystal, segments=8)
        point("lueur", (x, 3, 10.9), 2400, "#ffd9a0", 0.6)
    area("sieste", (0, 0, 14), 26, 1.3e4, "#ffe6c2")
    spot("niche", (0, -6, 13), (0, 13, 5), 1.8e4, "#ffe9c8", 46, 0.8)
