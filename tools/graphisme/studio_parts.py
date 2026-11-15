"""Les pièces que plusieurs plateaux partagent : la salle, les enseignes, un mur d'écrans courbe, un tapis, un bureau
en arc, une statue, un drapeau, des rangs de sièges en hémicycle, un ciel de petites lampes.

Les angles sont en degrés autour d'un centre : 0 vers le fond du plateau, positif vers la droite, 180 vers la caméra.
"""
import math
import os

from PIL import Image

from plateau_3d_kit import curved_wall, lacquer
from studio_kit import box, cylinder, disc, glow, panel, picture, ring_sector, sphere, surface, text_image

LOGOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logos")


def on_circle(center, radius, angle):
    """Le point du cercle à cet angle."""
    a = math.radians(angle)
    return center[0] + radius * math.sin(a), center[1] + radius * math.cos(a)


def room(wall, floor, floor_rough=0.16, wall_rough=0.6):
    """Le mur du fond et le sol laqué d'un plateau, qui reflète les néons et les écrans."""
    box("floor", (0, 0, -0.05), (140, 90, 0.1), lacquer("floor", floor, floor_rough))
    box("wall", (0, 16, 10), (110, 0.4, 30), surface("wall", wall, wall_rough))


def carpeted_room(wall, carpet_color):
    """Le mur du fond et le sol d'une salle à moquette : un tapis épais, qui ne reflète rien."""
    box("floor", (0, 0, -0.05), (140, 90, 0.1), surface("floor", carpet_color, 0.95))
    box("wall", (0, 16, 10), (110, 0.4, 30), surface("wall", wall, 0.6))


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


def logo_panel(directory, name, text, center, width, height, color="#ffffff", background="#000000", strength=1.4, stroke=None, rotation=(0.0, 0.0, 0.0)):
    """Une enseigne d'un mot, dans la police du jeu."""
    path = text_image(os.path.join(directory, f"{name}.png"), (1024, int(1024 * height / width)), text, color, background, stroke=stroke)
    return panel(name, center, width, height, picture(name, path, strength), rotation)


def led_wall(name, center, radius, start, end, bottom, top, path, strength=1.0, columns=140):
    """Un mur d'écrans courbe qui montre une image d'un seul tenant."""
    return curved_wall(name, center, radius, start, end, bottom, top, picture(name, path, strength), columns)


def floor_decal(name, center, width, depth, path, strength=0.5):
    """Une image posée à plat sur le sol, lisible depuis la caméra : un tapis, un logo, un titre."""
    return panel(name, (center[0], center[1], 0.02), width, depth, picture(name, path, strength), (-math.pi / 2, 0.0, 0.0))


def floor_disc(name, center, radius, path, strength=0.5):
    """Une image ronde posée à plat sur le sol : un tapis rond et ses anneaux, un médaillon."""
    return disc(name, (center[0], center[1], 0.02), radius, picture(name, path, strength), (-math.pi / 2, 0.0, 0.0), 96)


def desk_arc(name, center, radius, start, end, height, depth, body, top, glow_color=None):
    """Un bureau en arc, vu de l'extérieur de sa courbe : sa face, son plateau qui déborde, un filet de lumière au pied."""
    curved_wall(f"{name}_face", center, radius, start, end, 0.0, height, body, columns=48)
    ring_sector(f"{name}_plateau", center, radius - depth, radius + 0.18, min(start, end), max(start, end), height, top)
    curved_wall(f"{name}_chant", center, radius + 0.18, start, end, height - 0.1, height, top, columns=48)
    if glow_color:
        curved_wall(f"{name}_filet", center, radius + 0.02, start, end, 0.04, 0.12, glow(f"{name}_filet", glow_color, 7), columns=48)


def statue(name, location, mat, scale=1.0):
    """Une statue de marbre sur son socle : une figure drapée, à grands traits."""
    x, y, z = location
    box(f"{name}_socle", (x, y, z + 0.35 * scale), (0.95 * scale, 0.95 * scale, 0.7 * scale), mat, bevel=0.04)
    cylinder(f"{name}_drape", (x, y, z + 0.7 * scale), 0.42 * scale, 1.9 * scale, mat, radius_top=0.3 * scale)
    sphere(f"{name}_epaules", (x, y, z + 2.55 * scale), 0.42 * scale, mat, (1.0, 0.7, 0.6))
    cylinder(f"{name}_bras", (x + 0.3 * scale, y - 0.1 * scale, z + 1.7 * scale), 0.1 * scale, 0.9 * scale, mat, rotation=(0.0, 0.5, 0.0))
    sphere(f"{name}_tete", (x, y, z + 3.0 * scale), 0.24 * scale, mat, (1.0, 1.0, 1.15))


def flag(name, location, colors=("#1d3a96", "#f4f1e8", "#c8202e"), height=5.5, width=2.1, yaw=0.0):
    """Un drapeau sur sa hampe : trois bandes verticales qui tombent (le tricolore par défaut)."""
    x, y, z = location
    cylinder(f"{name}_hampe", (x, y, z), 0.06, height, surface(f"{name}_hampe", "#c9a24a", 0.3, 1.0))
    sphere(f"{name}_pomme", (x, y, z + height + 0.08), 0.12, surface(f"{name}_pomme", "#c9a24a", 0.3, 1.0))
    band = width / len(colors)
    for index, color in enumerate(colors):
        offset = (index + 0.5) * band + 0.08
        box(f"{name}_bande{index}", (x + offset * math.cos(yaw), y + offset * math.sin(yaw), z + height - 1.75), (band, 0.05, 3.3),
            surface(f"{name}_bande{index}", color, 0.75), (0.0, 0.0, yaw))


def arc_seats(name, center, radius, start, end, count, z, seat, desk):
    """Un rang d'hémicycle : des pupitres de bois et, derrière eux, des sièges de velours, tournés vers le centre."""
    for index in range(count):
        angle = start + (end - start) * (index + 0.5) / count
        yaw = (0.0, 0.0, -math.radians(angle))
        x, y = on_circle(center, radius, angle)
        box(f"{name}_pupitre{index}", (x, y, z + 0.45), (1.25, 0.5, 0.9), desk, yaw, bevel=0.03)
        x, y = on_circle(center, radius + 0.62, angle)
        box(f"{name}_siege{index}", (x, y, z + 0.38), (1.05, 0.55, 0.76), seat, yaw, bevel=0.06)
        x, y = on_circle(center, radius + 0.9, angle)
        box(f"{name}_dossier{index}", (x, y, z + 0.95), (1.05, 0.16, 0.9), seat, yaw, bevel=0.06)


def stars(name, rng, count, x_range, y_range, z_range, color, strength=10, radius=0.07):
    """Un ciel de petites lampes, comme les projecteurs piqués au plafond d'un grand plateau."""
    mat = glow(name, color, strength)
    for index in range(count):
        sphere(f"{name}{index}", (rng.uniform(*x_range), rng.uniform(*y_range), rng.uniform(*z_range)), radius, mat, segments=8)
