"""Rend les icônes des mots-clés et les casseroles, en 3D avec Blender Cycles.

Lancer avec uv :
  uv run --no-project --python 3.11 --with bpy --with pillow python tools/graphisme/icones_3d.py

Icônes : même pièce d'or que la médaille d'attaque, avec un symbole en relief. La forme porte le sens, pas la couleur.
Casseroles : une seule forme, en cuivre pour une affaire et en acier pour un ridicule. Le texte de la carte fait la blague.
"""
import math
import os
import sys

import bpy
import bmesh  # must come after bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cadres_3d import ROOT, add_shape, circle, make_material, render_to_webp, reset_scene, rounded_rect  # noqa: E402

ICON_SIZE = 128
POT_WORLD_STRENGTH = 3.5
GLYPH = "#fff8e6"


def bell_glyph():
    return [[(64, 26), (72, 30), (76, 38), (82, 66), (92, 82), (92, 88), (36, 88), (36, 82), (46, 66), (52, 38), (56, 30)],
            circle(64, 96, 7, 24)]


def microphone_glyph():
    return [rounded_rect(50, 22, 78, 70, 13), [(38, 56), (45, 56), (47, 68), (56, 78), (72, 78), (81, 68), (83, 56), (90, 56),
            (87, 73), (76, 84), (68, 86), (68, 96), (82, 96), (82, 104), (46, 104), (46, 96), (60, 96), (60, 86), (52, 84), (41, 73)]]


def double_glyph():
    """Two chevrons: it strikes twice."""
    def chevron(x):
        return [(x, 28), (x + 16, 28), (x + 42, 64), (x + 16, 100), (x, 100), (x + 26, 64)]
    return [chevron(26), chevron(60)]


def poo_glyph():
    return [rounded_rect(28, 80, 100, 104, 12), rounded_rect(38, 60, 90, 84, 12), rounded_rect(48, 40, 80, 64, 11),
            [(58, 44), (60, 30), (68, 22), (72, 34), (74, 44)]]


def comeback_glyph():
    return [[(64, 22), (94, 58), (76, 58), (76, 104), (52, 104), (52, 58), (34, 58)]]


def both_sides_glyph():
    return [[(20, 64), (46, 40), (46, 55), (82, 55), (82, 40), (108, 64), (82, 88), (82, 73), (46, 73), (46, 88)]]


KEYWORD_ICONS = {
    "immunite": (bell_glyph, "#3b7fc4"),
    "porte_parole": (microphone_glyph, "#7b3fb0"),
    "cumul": (double_glyph, "#b5560f"),
    "polemique": (poo_glyph, "#d83a8c"),
    "retour": (comeback_glyph, "#2e8b57"),
    "ni_droite_ni_gauche": (both_sides_glyph, "#a68a12"),
}


def render_icon(icon_id, glyph, color, samples):
    reset_scene(ICON_SIZE, ICON_SIZE, samples)
    gold = make_material("gold", "#f2b632", 1.0, 0.2)
    enamel = make_material("enamel", color, roughness=0.28, coat=0.8)
    relief = make_material("relief", GLYPH, roughness=0.35)
    add_shape("cabochon", [circle(64, 64, 52, 96)], 0, 12, 4, enamel, 6)
    add_shape("ring", [circle(64, 64, 62, 96), circle(64, 64, 50, 96)], 0, 15, 5.8, gold, 8)
    for index, outline in enumerate(glyph()):
        add_shape(f"glyph_{index}", [outline], 10, 8, 1.3, relief, 3)
    render_to_webp(f"mot_cle_{icon_id}.webp", ICON_SIZE, ICON_SIZE)


def dented(radius, angle, z):
    """Pushes the wall in and out a little: this pot has had a career."""
    return radius * (1 + 0.022 * math.sin(3 * angle + z / 40) + 0.012 * math.sin(7 * angle - z / 25))


def lathe(name, profile, material, steps=96):
    mesh = bpy.data.meshes.new(name)
    shape = bmesh.new()
    angles = [i * math.tau / steps for i in range(steps)]
    rings = [[shape.verts.new((dented(radius, angle, z) * math.cos(angle), dented(radius, angle, z) * math.sin(angle), z))
              for angle in angles] for radius, z in profile]
    for lower, upper in zip(rings, rings[1:]):
        for i in range(steps):
            shape.faces.new((lower[i], lower[(i + 1) % steps], upper[(i + 1) % steps], upper[i]))
    shape.to_mesh(mesh)
    shape.free()
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(material)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def render_pot(file_name, metal_color, samples):
    """A saucepan seen from above at an angle, handle towards the lower right. Dented, it has had a career."""
    size = 512
    reset_scene(size, size, samples)
    # Seen at an angle, metal reflects the whole room: it needs a brighter one than the flat frames do.
    bpy.context.scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = POT_WORLD_STRENGTH
    metal = make_material("metal", metal_color, 0.45, 0.3)  # part diffuse, or the outside mirrors a dark floor
    inside = make_material("inside", "#8d9098", 1.0, 0.4)
    handle = make_material("handle", "#17181c", roughness=0.4)
    center = (256, -256)
    profile = [(0, 0), (120, 0), (146, 8), (156, 26), (160, 110), (168, 122), (172, 128)]
    inner = [(166, 128), (156, 116), (150, 26), (138, 14), (0, 12)]
    body = lathe("pot", profile, metal)
    lining = lathe("lining", inner, inside)
    for part in (body, lining):
        part.location = (*center, 0)
    grip = bpy.data.curves.new("grip", "CURVE")
    grip.dimensions = "3D"
    grip.bevel_depth = 21
    grip.bevel_resolution = 6
    spline = grip.splines.new("POLY")
    spline.points.add(2)
    x, y = center
    for point, (dx, dy, dz) in zip(spline.points, [(150, -72, 112), (205, -100, 124), (245, -122, 140)]):
        point.co = (x + dx, y + dy, dz, 1)
    grip_object = bpy.data.objects.new("grip", grip)
    grip_object.data.materials.append(handle)
    bpy.context.scene.collection.objects.link(grip_object)
    camera = bpy.context.scene.camera
    camera.data.ortho_scale = 500
    tilt = math.radians(48)
    camera.location = (center[0] + 30, center[1] - 1000 * math.sin(tilt), 60 + 1000 * math.cos(tilt))
    camera.rotation_euler = (tilt, 0, 0)
    render_to_webp(file_name, size, size)


def main():
    for icon_id, (glyph, color) in KEYWORD_ICONS.items():
        render_icon(icon_id, glyph, color, 96)
    render_pot("casserole_affaire.webp", "#c8753f", 160)
    render_pot("casserole_ridicule.webp", "#c9cdd4", 160)


if __name__ == "__main__":
    main()
