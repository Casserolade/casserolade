"""La boîte à outils des plateaux télé (studios_3d.py) : formes, matières, écrans, public, lumières.

Unités Blender : la caméra est en (0, -15, 4.4) et regarde vers +y ; le mur du fond est vers y = 15.
La table de jeu couvre le centre de l'image : ce qui compte est sur les bords et dans les coins.
"""
import math
import os
import random

import bpy
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOGO_FONT = os.path.join(ROOT, "assets/game/fontes/bangers-latin-400-normal.woff2")
TEXT_FONT = os.path.join(ROOT, "assets/game/fontes/alegreya-sans-sc-latin-800-normal.woff2")


def rgb(value):
    """Une couleur hexadécimale en RGB linéaire."""
    def channel(text):
        c = int(text, 16) / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    value = value.lstrip("#")
    return (channel(value[0:2]), channel(value[2:4]), channel(value[4:6]))


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def surface(name, color, roughness=0.5, metallic=0.0, coat=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*rgb(color), 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Coat Weight"].default_value = coat
    return mat


def glow(name, color, strength):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = (*rgb(color), 1)
    emission.inputs["Strength"].default_value = strength
    mat.node_tree.links.new(emission.outputs[0], nodes["Material Output"].inputs["Surface"])
    return mat


def picture(name, path, strength):
    """Un écran qui montre une image, éclairé de l'intérieur."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = bpy.data.images.load(path)
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Strength"].default_value = strength
    mat.node_tree.links.new(texture.outputs["Color"], emission.inputs["Color"])
    mat.node_tree.links.new(emission.outputs[0], nodes["Material Output"].inputs["Surface"])
    return mat


def beam(name, color, strength=0.5, opacity=0.1):
    """Un faisceau visible, sans le prix d'un vrai volume."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = (*rgb(color), 1)
    emission.inputs["Strength"].default_value = strength
    transparent = nodes.new("ShaderNodeBsdfTransparent")
    mix = nodes.new("ShaderNodeMixShader")
    mix.inputs[0].default_value = opacity
    links.new(transparent.outputs[0], mix.inputs[1])
    links.new(emission.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], nodes["Material Output"].inputs["Surface"])
    mat.blend_method = "BLEND" if hasattr(mat, "blend_method") else None
    return mat


def box(name, center, size, mat, rotation=(0.0, 0.0, 0.0), bevel=0.0):
    half = [v / 2 for v in size]
    verts = [(x * half[0], y * half[1], z * half[2]) for z in (-1, 1) for y in (-1, 1) for x in (-1, 1)]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new(name, mesh)
    obj.location = center
    obj.rotation_euler = rotation
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
    return link(obj)


def panel(name, center, width, height, mat, rotation=(0.0, 0.0, 0.0)):
    """Un panneau droit face à la caméra, avec ses UV pour une image."""
    hw, hh = width / 2, height / 2
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([(-hw, 0, -hh), (hw, 0, -hh), (hw, 0, hh), (-hw, 0, hh)], [], [(0, 1, 2, 3)])
    layer = mesh.uv_layers.new()
    for i, uv in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]):
        layer.data[i].uv = uv
    obj = bpy.data.objects.new(name, mesh)
    obj.location = center
    obj.rotation_euler = rotation
    obj.data.materials.append(mat)
    return link(obj)


def cylinder(name, location, radius, height, mat, vertices=32, radius_top=None, rotation=(0.0, 0.0, 0.0)):
    """Un cylindre (ou un cône) posé sur location[2]."""
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=radius if radius_top is None else radius_top,
                                    depth=height, location=(location[0], location[1], location[2] + height / 2))
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = rotation
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    obj.data.materials.append(mat)
    return obj


def sphere(name, location, radius, mat, scale=(1, 1, 1), segments=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=segments // 2, radius=radius, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    obj.data.materials.append(mat)
    return obj


def torus(name, location, major, minor, mat, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=location, rotation=rotation, major_segments=64, minor_segments=12)
    obj = bpy.context.active_object
    obj.name = name
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    obj.data.materials.append(mat)
    return obj


def area(name, location, size, energy, color="#ffffff", rotation=(0.0, 0.0, 0.0), shape="SQUARE", size_y=None):
    """Une lampe large. Invisible dans les reflets : sinon un sol laqué en montre le rectangle blanc."""
    data = bpy.data.lights.new(name, "AREA")
    data.size = size
    if shape != "SQUARE":
        data.shape = shape
        data.size_y = size_y or size
    data.energy = energy
    data.color = rgb(color)
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    obj.rotation_euler = rotation
    obj.visible_glossy = False
    return link(obj)


def spot(name, location, target, energy, color="#ffffff", angle=40, blend=0.5, radius=0.2):
    data = bpy.data.lights.new(name, "SPOT")
    data.energy = energy
    data.color = rgb(color)
    data.spot_size = math.radians(angle)
    data.spot_blend = blend
    data.shadow_soft_size = radius
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    dx, dy, dz = (target[i] - location[i] for i in range(3))
    length = math.sqrt(dx * dx + dy * dy + dz * dz)
    dx, dy, dz = dx / length, dy / length, dz / length
    # Le projecteur éclaire vers son -Z : bascule autour de X, puis rotation autour de Z vers la cible.
    obj.rotation_euler = (math.acos(-dz), 0, math.atan2(-dx, dy))
    return link(obj)


def point(name, location, energy, color="#ffffff", radius=0.3):
    data = bpy.data.lights.new(name, "POINT")
    data.energy = energy
    data.color = rgb(color)
    data.shadow_soft_size = radius
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    return link(obj)


def fitted_font(path, text, start, max_width):
    size = start
    font = ImageFont.truetype(path, size)
    while font.getlength(text) > max_width and size > 12:
        size -= 4
        font = ImageFont.truetype(path, size)
    return font


def text_image(path, size, text, color, background, font_path=LOGO_FONT, stroke=None, scale=0.6):
    """Une image d'un mot : un logo parodique, un chrono, un bandeau."""
    image = Image.new("RGB", size, background)
    draw = ImageDraw.Draw(image)
    w, h = size
    font = fitted_font(font_path, text, int(h * scale), w * 0.9)
    draw.text((w / 2, h / 2), text, font=font, fill=color, anchor="mm", stroke_width=int(h * 0.02) if stroke else 0, stroke_fill=stroke or color)
    image.save(path)
    return path


def audience(name, rows, seats, origin, step, spacing, rng, palette, facing=0.0, scale=1.0, lit=None):
    """Un gradin de spectateurs assis, inventés (plateau_3d_kit.seated), habillés de la palette, une graine fixe."""
    from plateau_3d_kit import HAIRS, SKINS, seated
    mats = {}
    step_mat = surface(f"{name}_step", "#15171f", 0.5)
    ox, oy, oz = origin
    cos_f, sin_f = math.cos(facing), math.sin(facing)
    for row in range(rows):
        z = oz + row * step[1]
        depth = row * step[0]
        # La marche du gradin.
        cx = ox + depth * sin_f * -1
        cy = oy + depth * cos_f
        box(f"{name}_step", (cx, cy, z / 2 if z > 0 else 0.01), (seats * spacing + 0.6, step[0], max(z, 0.02)), step_mat, (0, 0, facing))
        if lit:
            box(f"{name}_trim", (cx - sin_f * -step[0] / 2, cy - cos_f * step[0] / 2, z + 0.02), (seats * spacing + 0.6, 0.05, 0.04), lit, (0, 0, facing))
        for seat in range(seats):
            offset = (seat - (seats - 1) / 2) * spacing + rng.uniform(-0.05, 0.05)
            x = cx + offset * cos_f
            y = cy + offset * sin_f
            seated(f"{name}_{row}_{seat}", (x, y, z), rng, palette, SKINS, HAIRS, mats, facing, scale)


def chair(name, location, mat, facing=0.0, height=1.0):
    x, y, z = location
    box(f"{name}_seat", (x, y, z + 0.5 * height), (0.6, 0.6, 0.1), mat, (0, 0, facing))
    back = (x - math.sin(facing) * 0.28, y + math.cos(facing) * 0.28, z + 0.95 * height)
    box(f"{name}_back", back, (0.6, 0.08, 0.9 * height), mat, (0, 0, facing))
    cylinder(f"{name}_leg", (x, y, z), 0.05, 0.5 * height, mat)


def leaf_cluster(name, center, radius, count, rng, greens):
    """Un buisson de feuilles : des ellipsoïdes aplaties, dans tous les sens."""
    mats = [surface(f"{name}_green{i}", g, 0.6) for i, g in enumerate(greens)]
    cx, cy, cz = center
    for _ in range(count):
        a, b = rng.uniform(0, math.tau), rng.uniform(-0.6, 1.2)
        r = radius * rng.uniform(0.2, 1.0)
        leaf = sphere(f"{name}_leaf", (cx + r * math.cos(a), cy + r * 0.5 * math.sin(a), cz + b * radius * 0.6), 1, rng.choice(mats),
                      (rng.uniform(0.25, 0.5), 0.06, rng.uniform(0.5, 0.9)), segments=10)
        leaf.rotation_euler = (rng.uniform(-0.8, 0.8), rng.uniform(-0.6, 0.6), rng.uniform(0, math.tau))


def curtain(name, center, width, height, mat, folds=14, depth=0.35):
    """Un rideau : une surface ondulée, plis verticaux."""
    cx, cy, cz = center
    cols, rows = folds * 6, 2
    verts, faces = [], []
    for j in range(rows):
        z = cz - height / 2 + height * j / (rows - 1)
        for i in range(cols + 1):
            x = cx - width / 2 + width * i / cols
            y = cy + depth * math.sin(i / cols * folds * math.tau)
            verts.append((x, y, z))
    for i in range(cols):
        faces.append((i, i + 1, cols + 2 + i, cols + 1 + i))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return link(obj)


def studio_camera(name, location, facing, accent):
    """Une caméra de plateau sur son pied, dans un coin."""
    black = surface(f"{name}_black", "#101114", 0.35, 0.4)
    glass = surface(f"{name}_glass", "#0a1020", 0.05, 1.0)
    x, y, z = location
    cylinder(f"{name}_foot", (x, y, z), 0.55, 0.08, black)
    cylinder(f"{name}_mast", (x, y, z), 0.1, 1.5, black)
    box(f"{name}_body", (x, y, z + 1.75), (0.45, 1.0, 0.55), black, (0, 0, facing), bevel=0.04)
    box(f"{name}_lens", (x - math.sin(facing) * 0.0, y + math.cos(facing) * 0.65, z + 1.75), (0.3, 0.4, 0.3), glass, (0, 0, facing), bevel=0.02)
    box(f"{name}_tally", (x, y + 0.1, z + 2.07), (0.14, 0.14, 0.05), glow(f"{name}_tally", accent, 6), (0, 0, facing))
