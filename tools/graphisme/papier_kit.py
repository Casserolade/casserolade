"""Le papier découpé façon South Park, dans Blender : des pièces plates, étagées, et leurs ombres courtes.

Recette, piste B : des formes plates de l'épaisseur du papier,
un grain léger, étagées de quelques centimètres, une seule lumière douce en haut à gauche. Les ombres entre
les couches font le style. Les formes se donnent en pixels de la table, 1920×1080 : 1 unité Blender = 100 px.
L'image rendue est plus grande (2560×1440) : 320 px de marge à gauche et à droite, 180 en haut et en bas,
pour les écrans qui ne sont pas en 16:9.
"""
import math

import bpy
from mathutils import Vector

from studio_kit import link, rgb

WIDTH, HEIGHT = 1920, 1080
RENDER_WIDTH, RENDER_HEIGHT = 2560, 1440
# Ce que l'image montre autour de la table : de x = -320 à 2240, de y = -180 à 1260.
MARGIN_X, MARGIN_Y = (RENDER_WIDTH - WIDTH) // 2, (RENDER_HEIGHT - HEIGHT) // 2
# Le papier se coupe à la main : des bords qui tremblent un peu, tous les quelques pixels.
CUT_STEP_PX = 9
CUT_JITTER_PX = 1.4


def to_scene(x, y, depth):
    """Un point de l'image (pixels, y vers le bas) dans la scène : x à droite, z en haut, la profondeur en y."""
    return ((x - WIDTH / 2) / 100, depth, (HEIGHT / 2 - y) / 100)


def hand_cut(points, rng, jitter=CUT_JITTER_PX, step=CUT_STEP_PX):
    """Le contour d'une pièce, redécoupé tous les quelques pixels et un peu de travers."""
    cut = []
    for i, (x0, y0) in enumerate(points):
        x1, y1 = points[(i + 1) % len(points)]
        length = math.hypot(x1 - x0, y1 - y0)
        if length == 0:
            continue
        nx, ny = -(y1 - y0) / length, (x1 - x0) / length
        for j in range(max(1, int(length / step))):
            t = j / max(1, int(length / step))
            d = rng.uniform(-jitter, jitter)
            cut.append((x0 + (x1 - x0) * t + nx * d, y0 + (y1 - y0) * t + ny * d))
    return cut


def rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def rounded(x0, y0, x1, y1, radius, corner_steps=5):
    points = []
    for cx, cy, start in ((x1 - radius, y0 + radius, -90), (x1 - radius, y1 - radius, 0), (x0 + radius, y1 - radius, 90), (x0 + radius, y0 + radius, 180)):
        for k in range(corner_steps + 1):
            a = math.radians(start + 90 * k / corner_steps)
            points.append((cx + radius * math.cos(a), cy + radius * math.sin(a)))
    return points


def circle(cx, cy, rx, ry=None, steps=40, start=0.0, end=360.0):
    ry = rx if ry is None else ry
    full = end - start >= 360
    count = steps if full else steps + 1
    return [(cx + rx * math.cos(math.radians(start + (end - start) * k / steps)), cy + ry * math.sin(math.radians(start + (end - start) * k / steps)))
            for k in range(count)]


def paper(name, color, grain=1.0, emission=0.0, alpha=1.0, image=None):
    """Du papier de couleur : mat, des taches de teinte à peine visibles, des fibres en relief."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.95
    bsdf.inputs["Specular IOR Level"].default_value = 0.15
    position = nodes.new("ShaderNodeNewGeometry").outputs["Position"]
    blotch = nodes.new("ShaderNodeTexNoise")
    blotch.inputs["Scale"].default_value = 2.2
    blotch.inputs["Detail"].default_value = 4
    links.new(position, blotch.inputs["Vector"])
    shade = nodes.new("ShaderNodeMapRange")
    shade.inputs["From Min"].default_value, shade.inputs["From Max"].default_value = 0.3, 0.7
    shade.inputs["To Min"].default_value, shade.inputs["To Max"].default_value = 1 - 0.06 * grain, 1 + 0.05 * grain
    links.new(blotch.outputs["Fac"], shade.inputs["Value"])
    tint = nodes.new("ShaderNodeHueSaturation")
    tint.inputs["Color"].default_value = (*rgb(color), 1)
    links.new(shade.outputs["Result"], tint.inputs["Value"])
    if image:
        texture = nodes.new("ShaderNodeTexImage")
        texture.image = bpy.data.images.load(image)
        texture.interpolation = "Cubic"
        links.new(texture.outputs["Color"], tint.inputs["Color"])
        links.new(texture.outputs["Alpha"], bsdf.inputs["Alpha"])
    links.new(tint.outputs["Color"], bsdf.inputs["Base Color"])
    fibers = nodes.new("ShaderNodeTexNoise")
    fibers.inputs["Scale"].default_value = 55
    fibers.inputs["Detail"].default_value = 3
    links.new(position, fibers.inputs["Vector"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.18 * grain
    bump.inputs["Distance"].default_value = 0.004
    links.new(fibers.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    if emission:
        links.new(tint.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = emission
    if alpha < 1 and not image:
        bsdf.inputs["Alpha"].default_value = alpha
    return mat


def sheet(name, points, depth, mat, rng=None, thickness_px=1.6, cut=True, jitter=CUT_JITTER_PX):
    """Une pièce de papier découpée, à plat face à la caméra, avec l'épaisseur du papier."""
    outline = hand_cut(points, rng, jitter) if cut and rng else points
    xs, ys = [p[0] for p in outline], [p[1] for p in outline]
    left, top, width, height = min(xs), min(ys), max(xs) - min(xs) or 1, max(ys) - min(ys) or 1
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([to_scene(x, y, depth) for x, y in outline], [], [list(range(len(outline)))])
    layer = mesh.uv_layers.new()
    for loop in mesh.loops:
        x, y = outline[loop.vertex_index]
        layer.data[loop.index].uv = ((x - left) / width, 1 - (y - top) / height)
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat)
    if thickness_px:
        solid = obj.modifiers.new("papier", "SOLIDIFY")
        solid.thickness = thickness_px / 100
        solid.offset = 1.0
    return link(obj)


def strip(name, start, end, width, depth, mat, rng=None):
    """Une bande de papier d'un point à un autre : un câble, une barre de treillis, un faisceau étroit."""
    (x0, y0), (x1, y1) = start, end
    length = math.hypot(x1 - x0, y1 - y0) or 1
    nx, ny = -(y1 - y0) / length * width / 2, (x1 - x0) / length * width / 2
    return sheet(name, [(x0 + nx, y0 + ny), (x1 + nx, y1 + ny), (x1 - nx, y1 - ny), (x0 - nx, y0 - ny)], depth, mat, rng)


def key_light(energy=3.2, softness_degrees=5.0, direction=(0.42, 1.0, -0.62)):
    """La seule lumière : un soleil doux en haut à gauche, qui pousse les ombres en bas à droite."""
    data = bpy.data.lights.new("cle", "SUN")
    data.energy = energy
    data.angle = math.radians(softness_degrees)
    obj = bpy.data.objects.new("cle", data)
    obj.rotation_euler = Vector(direction).normalized().to_track_quat("-Z", "Y").to_euler()
    return link(obj)


def front_camera():
    """Une caméra orthographique de face : l'image fait 25,6 unités de large, sans perspective."""
    data = bpy.data.cameras.new("camera")
    data.type = "ORTHO"
    data.ortho_scale = RENDER_WIDTH / 100
    camera = bpy.data.objects.new("camera", data)
    camera.location = (0, -40, 0)
    camera.rotation_euler = (math.radians(90), 0, 0)
    link(camera)
    bpy.context.scene.camera = camera
    return camera


SKINS = ["#f3d2b6", "#e3b08c", "#c98d66", "#94603f", "#5e3b28"]
HAIRS = ["#2a1c14", "#5a3a20", "#c9a04a", "#8a8a8a", "#121212", "#a0522d"]


def extra(name, cx, cy, size, depth, rng, clothes, look=0.0, mats=None):
    """Un figurant en papier, inventé : un buste, une grosse tête ronde, les yeux de South Park."""
    mats = mats if mats is not None else {}

    def flat(color, emission=0.0):
        key = (color, emission)
        if key not in mats:
            mats[key] = paper(f"papier_{color}_{emission}", color, emission=emission)
        return mats[key]

    s = size
    body = rounded(cx - 30 * s, cy + 14 * s, cx + 30 * s, cy + 70 * s, 12 * s)
    sheet(f"{name}_buste", body, depth, flat(rng.choice(clothes)), rng)
    sheet(f"{name}_tete", circle(cx, cy, 24 * s, 23 * s, 28), depth - 0.03, flat(rng.choice(SKINS)), rng)
    hair = rng.choice(["chauve", "frange", "carre", "chignon", "casquette"])
    hair_color = flat(rng.choice(HAIRS))
    if hair == "frange":
        sheet(f"{name}_cheveux", circle(cx, cy - 4 * s, 25 * s, 22 * s, 20, 180, 360), depth - 0.05, hair_color, rng)
    elif hair == "carre":
        sheet(f"{name}_cheveux", rounded(cx - 28 * s, cy - 26 * s, cx + 28 * s, cy + 14 * s, 14 * s), depth - 0.01, hair_color, rng)
    elif hair == "chignon":
        sheet(f"{name}_chignon", circle(cx, cy - 26 * s, 11 * s, 10 * s, 18), depth - 0.01, hair_color, rng)
        sheet(f"{name}_cheveux", circle(cx, cy - 5 * s, 25 * s, 20 * s, 20, 180, 360), depth - 0.05, hair_color, rng)
    elif hair == "casquette":
        cap = flat(rng.choice(clothes))
        sheet(f"{name}_casquette", circle(cx, cy - 8 * s, 25 * s, 18 * s, 20, 180, 360), depth - 0.05, cap, rng)
        sheet(f"{name}_visiere", rounded(cx - 6 * s if look >= 0 else cx - 34 * s, cy - 11 * s, cx + 34 * s if look >= 0 else cx + 6 * s, cy - 5 * s, 3 * s), depth - 0.06, cap, rng)
    # Les yeux : deux ovales blancs qui se touchent, et les pupilles tournées vers la scène.
    white, black = flat("#fbfaf4"), flat("#141414")
    for side in (-1, 1):
        ex = cx + side * 8.5 * s
        sheet(f"{name}_oeil", circle(ex, cy + 2 * s, 8.5 * s, 10 * s, 18), depth - 0.07, white, rng, thickness_px=0.8)
        sheet(f"{name}_pupille", circle(ex + look * 3.5 * s, cy + 3 * s, 2.6 * s, 2.6 * s, 10), depth - 0.08, black, None, thickness_px=0.6, cut=False)
    return mats
