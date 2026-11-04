"""Rend la surface de jeu en 3D avec Blender Cycles : une scène de plateau télé laquée, vue de dessus.

Lancer avec uv :
  uv run --no-project --python 3.11 --with bpy --with pillow python tools/graphisme/table_3d.py [--samples 128] [--out dossier] [plateaux…]

Une image 1920 x 1080 à fond transparent, calée sur la table du client (GameTable.vue) : la scène prend la place
du tapis, l'estrade celle de la boutique, la flaque de lumière celle du plateau du joueur. Le décor du studio reste
derrière, flou. Unité : 1 = 1 pixel de la table de référence, y vers le bas.
"""
import argparse
import math
import os
import tempfile

import bpy
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WIDTH, HEIGHT = 1920, 1080
# Les zones de la table (GameTable.vue, ShopRow.vue, BoardRow.vue).
STAGE = (300, 156, 1320, 640, 48)        # x, y, largeur, hauteur, rayon
SHOP = (326, 174, 1268, 252, 30)
BOARD_CENTER = (960, 600)
# La couleur des lumières de chaque plateau télé : la bande du bord, les projecteurs de côté.
LOOKS = {
    "france3": {"rim": "#6fa8d8", "side": "#d9a441"},
    "cnews": {"rim": "#e8202a", "side": "#2b5be0"},
    "tf1_second_tour": {"rim": "#2f7dff", "side": "#ff1f32"},
    "hanouna": {"rim": "#ff2fa8", "side": "#ffd400"},
}


def hex_to_linear(value):
    def channel(text):
        c = int(text, 16) / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    value = value.lstrip("#")
    return (channel(value[0:2]), channel(value[2:4]), channel(value[4:6]), 1.0)


def reset_scene(samples):
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
    scene.render.film_transparent = True
    scene.render.resolution_x = WIDTH
    scene.render.resolution_y = HEIGHT
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.004, 0.005, 0.01, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    scene.world = world
    camera_data = bpy.data.cameras.new("camera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = WIDTH
    camera_data.clip_end = 6000
    camera = bpy.data.objects.new("camera", camera_data)
    camera.location = (WIDTH / 2, -HEIGHT / 2, 3000)
    scene.collection.objects.link(camera)
    scene.camera = camera
    return scene


def material(name, color, roughness=0.4, metallic=0.0, coat=0.0, emission=None, strength=0.0, rings=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = hex_to_linear(color)
    if rings:
        # Des anneaux très doux autour du plateau du joueur, comme le sol d'un plateau de débat.
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        coords = nodes.new("ShaderNodeTexCoord")
        mapping = nodes.new("ShaderNodeMapping")
        mapping.inputs["Location"].default_value = (-rings["center"][0], rings["center"][1], 0)
        wave = nodes.new("ShaderNodeTexWave")
        wave.wave_type = "RINGS"
        # Des cercles au sol : autour de l'axe vertical, pas de l'axe X (le défaut).
        wave.rings_direction = "Z"
        wave.inputs["Scale"].default_value = rings["scale"]
        wave.inputs["Distortion"].default_value = 0.0
        mix = nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.inputs["Factor"].default_value = rings["strength"]
        mix.inputs["A"].default_value = hex_to_linear(color)
        # Des lignes fines plutôt que des bandes : la couleur de l'anneau n'apparaît qu'au sommet de l'onde.
        ramp = nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].color = hex_to_linear(color)
        ramp.color_ramp.elements[1].position = 1.0
        ramp.color_ramp.elements[1].color = hex_to_linear(rings["color"])
        edge = ramp.color_ramp.elements.new(0.9)
        edge.color = hex_to_linear(color)
        links.new(coords.outputs["Object"], mapping.inputs["Vector"])
        links.new(mapping.outputs["Vector"], wave.inputs["Vector"])
        links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
        links.new(ramp.outputs["Color"], mix.inputs["B"])
        links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Coat Weight"].default_value = coat
    bsdf.inputs["Coat Roughness"].default_value = 0.06
    if emission:
        bsdf.inputs["Emission Color"].default_value = hex_to_linear(emission)
        bsdf.inputs["Emission Strength"].default_value = strength
    return mat


def rounded_rect(x, y, w, h, r, steps=10):
    """Le contour d'un rectangle à coins ronds, dans le sens trigonométrique, en coordonnées Blender (y vers le haut)."""
    points = []
    corners = [(x + w - r, y + r, -90), (x + w - r, y + h - r, 0), (x + r, y + h - r, 90), (x + r, y + r, 180)]
    for cx, cy, start in corners:
        for i in range(steps + 1):
            a = math.radians(start + 90 * i / steps)
            points.append((cx + r * math.cos(a), -(cy + r * math.sin(a))))
    return points


def stage_outline(x, y, w, h, r, bulge, steps=10):
    """Le contour de la scène : quatre coins ronds, et l'avant qui se galbe doucement, comme un pupitre de plateau télé."""
    points = rounded_rect(x, y, w, h, r, steps)
    if bulge <= 0:
        return points
    # Entre les deux coins du bas, un arc qui descend de `bulge` au milieu.
    bottom = []
    for i in range(1, 60):
        t = i / 60
        px = x + w - r - t * (w - 2 * r)
        bottom.append((px, -(y + h + bulge * math.sin(math.pi * t))))
    # rounded_rect part du coin en haut à droite ; le deuxième coin finit en bas à droite, là où commence l'avant.
    corner = 2 * (steps + 1)
    return points[:corner] + bottom + points[corner:]


def ellipse(cx, cy, rx, ry, steps=160):
    return [(cx + rx * math.cos(2 * math.pi * i / steps), -(cy + ry * math.sin(2 * math.pi * i / steps))) for i in range(steps)]


def slab(name, outline, z0, z1, mat, bevel=4.0):
    """Une dalle extrudée de z0 à z1, aux arêtes arrondies."""
    mesh = bpy.data.meshes.new(name)
    n = len(outline)
    verts = [(px, py, z0) for px, py in outline] + [(px, py, z1) for px, py in outline]
    faces = [list(range(n))[::-1], list(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        faces.append([i, j, n + j, n + i])
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    modifier = obj.modifiers.new("bevel", "BEVEL")
    modifier.width = bevel
    modifier.segments = 4
    modifier.limit_method = "ANGLE"
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def strip(name, outline, z, radius, mat):
    """Une bande lumineuse le long d'un contour : une courbe fermée, en tube."""
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new("POLY")
    spline.points.add(len(outline) - 1)
    for point, (px, py) in zip(spline.points, outline):
        point.co = (px, py, z, 1)
    spline.use_cyclic_u = True
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def line_strip(name, a, b, z, radius, mat):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    spline = curve.splines.new("POLY")
    spline.points.add(1)
    spline.points[0].co = (a[0], -a[1], z, 1)
    spline.points[1].co = (b[0], -b[1], z, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def area_light(name, location, size, energy, color="#fff3e0", rotation=(0, 0, 0), visible_glossy=True):
    data = bpy.data.lights.new(name, "AREA")
    data.size = size
    data.energy = energy
    data.color = hex_to_linear(color)[:3]
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    obj.rotation_euler = rotation
    obj.visible_glossy = visible_glossy
    obj.visible_camera = False
    bpy.context.scene.collection.objects.link(obj)


def spot_light(name, location, target, energy, color, angle_deg, blend=0.6):
    data = bpy.data.lights.new(name, "SPOT")
    data.energy = energy
    data.color = hex_to_linear(color)[:3]
    data.spot_size = math.radians(angle_deg)
    data.spot_blend = blend
    data.shadow_soft_size = 40
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    direction = [target[i] - location[i] for i in range(3)]
    length = math.sqrt(sum(d * d for d in direction))
    dx, dy, dz = (d / length for d in direction)
    # Un projecteur éclaire vers son -Z : on le bascule autour de X, puis on le tourne autour de Z vers la cible.
    obj.rotation_euler = (math.acos(-dz), 0, math.atan2(-dx, dy))
    obj.visible_camera = False
    obj.visible_glossy = False
    bpy.context.scene.collection.objects.link(obj)


def build(look, bulge):
    x, y, w, h, r = STAGE
    lacquer = material("lacquer", "#121c38", roughness=0.24, coat=1.0)
    steel = material("steel", "#8e98aa", roughness=0.32, metallic=1.0)
    trim = material("trim", "#c9a24a", roughness=0.25, metallic=1.0)
    counter = material("counter", "#1a2442", roughness=0.35, coat=0.6)
    rim_light = material("rim_light", "#ffffff", emission=look["rim"], strength=9.0)
    warm_light = material("warm_light", "#ffffff", emission="#ffd27a", strength=7.0)
    # La bordure de métal, un peu plus grande que la scène, et sa bande de lumière.
    slab("rim", stage_outline(x - 16, y - 16, w + 32, h + 32, r + 16, bulge), -24, 16, steel, bevel=8)
    slab("stage", stage_outline(x, y, w, h, r, bulge), 0, 24, lacquer, bevel=5)
    strip("rim_strip", stage_outline(x - 7, y - 7, w + 14, h + 14, r + 7, bulge), 20, 3.2, rim_light)
    # L'estrade de la boutique : en relief, bordée d'or, une lumière chaude sur sa face avant.
    sx, sy, sw, sh, sr = SHOP
    slab("shop", rounded_rect(sx, sy, sw, sh, sr), 24, 44, counter, bevel=6)
    strip("shop_trim", rounded_rect(sx + 3, sy + 3, sw - 6, sh - 6, sr - 3), 44.5, 1.6, trim)
    line_strip("shop_front", (sx + sr, sy + sh + 4), (sx + sw - sr, sy + sh + 4), 30, 2.4, warm_light)
    # L'arène du plateau du joueur : une ellipse de lumière encastrée dans le sol, comme un plateau de débat.
    arena = material("arena", look["rim"], emission=look["rim"], strength=1.6)
    bx0, by0 = BOARD_CENTER
    strip("arena", ellipse(bx0, by0 + 12, 610, 138), 24.2, 1.4, arena)
    strip("arena_outer", ellipse(bx0, by0 + 12, 632, 152), 24.2, 0.8, material("arena_faint", look["rim"], emission=look["rim"], strength=0.6))
    # Les lumières : une boîte à lumière douce au-dessus, deux projecteurs colorés de côté, une flaque sur le plateau.
    # Une grande boîte à lumière, qui ne se reflète pas : un éclairage égal, comme le sable d'une taverne.
    area_light("key", (WIDTH / 2, -HEIGHT / 2, 1800), 1800, 4.5e7, visible_glossy=False)
    # Son reflet, très doux et très large : la laque brille sans tache.
    area_light("sheen", (WIDTH / 2, -HEIGHT / 2 + 120, 2400), 2600, 2.0e6, color="#c8d4ff")
    # La lumière chaude de l'estrade, qui coule sur le sol devant elle.
    sx, sy, sw, sh, _ = SHOP
    area_light("shop_spill", (sx + sw / 2, -(sy + sh + 30), 90), 1100, 2.4e6, color="#ffcf7a", visible_glossy=False)
    bx, by = BOARD_CENTER
    spot_light("board_pool", (bx, -by, 1600), (bx, -by, 24), 2.2e7, "#fff1d6", 62, blend=1.0)
    spot_light("side_left", (x - 260, -(y + h * 0.7), 300), (x + w * 0.25, -(y + h * 0.6), 24), 2.6e7, look["side"], 55, blend=1.0)
    spot_light("side_right", (x + w + 260, -(y + h * 0.7), 300), (x + w * 0.75, -(y + h * 0.6), 24), 2.6e7, look["rim"], 55, blend=1.0)


def render(plateau, samples, out_dir, bulge):
    look = LOOKS.get(plateau, LOOKS["france3"])
    scene = reset_scene(samples)
    build(look, bulge)
    os.makedirs(out_dir, exist_ok=True)
    with tempfile.TemporaryDirectory() as directory:
        path = os.path.join(directory, "render.png")
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        target = os.path.join(out_dir, f"table_{plateau}{'_galbe' if bulge else ''}.png")
        Image.open(path).convert("RGBA").save(target)
    print(target, f"{os.path.getsize(target) / 1024:.0f} Ko", flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=128)
    parser.add_argument("--out", default=os.path.join(ROOT, "assets/maquette"))
    parser.add_argument("--galbe", type=float, default=0, help="l'avant de la scène descend d'autant au milieu")
    parser.add_argument("plateaux", nargs="*", default=["france3"])
    args = parser.parse_args()
    for plateau in args.plateaux:
        render(plateau, args.samples, args.out, args.galbe)


if __name__ == "__main__":
    main()
