"""La 3D soignée des plateaux (docs/09-rendu-et-blender.md, section 2.2, piste A) : ce qui fait un vrai plateau.

Treillis et lyres dans la brume, mur LED courbe, sol laqué qui reflète, caméras de plateau détaillées,
public assis en contre-jour, et au rendu : profondeur de champ et bloom. Même repère que studio_kit.py :
la caméra est en (0, -15, 4.4) et regarde vers +y.
"""
import math

import bpy
from mathutils import Vector

from studio_kit import box, cylinder, glow, link, rgb, sphere, spot, surface


def lacquer(name, color, roughness=0.12):
    """Un laqué : la couleur, un vernis net par-dessus, les reflets du plateau dedans."""
    mat = surface(name, color, roughness, 0.0, 1.0)
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Coat Roughness"].default_value = 0.03
    return mat


def tube(name, start, end, radius, mat, vertices=12):
    """Un tube d'un point à un autre : une barre de treillis, un câble tendu, une poignée."""
    a, b = Vector(start), Vector(end)
    direction = b - a
    obj = cylinder(name, (0, 0, 0), radius, direction.length, mat, vertices)
    # The cylinder is built around its middle.
    obj.location = (a + b) / 2
    obj.rotation_euler = direction.normalized().to_track_quat("Z", "Y").to_euler()
    return obj


def truss(name, start_x, end_x, y, z, mat, size=0.42, step=0.6):
    """Un treillis carré de concert : quatre membrures et leurs diagonales en zigzag."""
    h = size / 2
    corners = [(-h, -h), (h, -h), (h, h), (-h, h)]
    for k, (dy, dz) in enumerate(corners):
        tube(f"{name}_membrure{k}", (start_x, y + dy, z + dz), (end_x, y + dy, z + dz), 0.035, mat)
    x, flip = start_x, 1
    while x < end_x - step:
        for k in range(4):
            (dy0, dz0), (dy1, dz1) = corners[k], corners[(k + 1) % 4]
            if flip > 0:
                tube(f"{name}_diag", (x, y + dy0, z + dz0), (x + step, y + dy1, z + dz1), 0.018, mat, 6)
            else:
                tube(f"{name}_diag", (x, y + dy1, z + dz1), (x + step, y + dy0, z + dz0), 0.018, mat, 6)
        x += step
        flip = -flip


def fixture(name, location, target, color, energy, angle=18):
    """Une lyre accrochée au treillis : son étrier, sa tête noire, sa lentille allumée et son faisceau."""
    x, y, z = location
    black = surface(f"{name}_noir", "#141518", 0.35, 0.6)
    box(f"{name}_etrier", (x, y, z - 0.12), (0.5, 0.12, 0.08), black)
    for side in (-1, 1):
        box(f"{name}_bras", (x + side * 0.24, y, z - 0.35), (0.06, 0.12, 0.46), black)
    direction = (Vector(target) - Vector((x, y, z - 0.55))).normalized()
    head = cylinder(f"{name}_tete", (0, 0, 0), 0.2, 0.46, black, 24)
    head.location = Vector((x, y, z - 0.55)) - direction * 0.23
    head.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    lens = cylinder(f"{name}_lentille", (0, 0, 0), 0.16, 0.02, glow(f"{name}_lumiere", color, 40), 24)
    lens.location = Vector((x, y, z - 0.55)) + direction * 0.24
    lens.rotation_euler = head.rotation_euler
    source = Vector((x, y, z - 0.55)) + direction * 0.3
    return spot(f"{name}_faisceau", tuple(source), target, energy, color, angle, 0.25, 0.05)


def curved_wall(name, center, radius, start_angle, end_angle, bottom, top, mat, columns=120):
    """Un mur d'écrans courbe, vu de l'intérieur, avec ses UV pour une image qui le couvre en entier."""
    cx, cy = center
    verts, faces, uvs = [], [], []
    for i in range(columns + 1):
        t = i / columns
        a = math.radians(start_angle + (end_angle - start_angle) * t)
        x, y = cx + radius * math.sin(a), cy + radius * math.cos(a)
        verts += [(x, y, bottom), (x, y, top)]
        uvs += [(t, 0), (t, 1)]
    for i in range(columns):
        faces.append((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    layer = mesh.uv_layers.new()
    for loop in mesh.loops:
        layer.data[loop.index].uv = uvs[loop.vertex_index]
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mat)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return link(obj)


SKINS = ["#e8b896", "#c48a64", "#8a5a3c", "#f0c8a8", "#5c3a26"]
HAIRS = ["#1c120c", "#4a2e18", "#b08a40", "#7a7a7a", "#0e0e0e"]


def seated(name, location, rng, clothes, skins, hairs, mats, facing=0.0, scale=1.0):
    """Un spectateur assis, inventé : un buste arrondi, des épaules, une tête et ses cheveux, tourné de `facing`."""
    x, y, z = location
    cos_f, sin_f = math.cos(facing), math.sin(facing)

    def at(dx, dy, dz):
        return (x + (dx * cos_f - dy * sin_f) * scale, y + (dx * sin_f + dy * cos_f) * scale, z + dz * scale)

    def mat(color, roughness):
        if color not in mats:
            mats[color] = surface(f"{name}_{color}", color, roughness)
        return mats[color]

    cloth = mat(rng.choice(clothes), 0.85)
    box(f"{name}_buste", at(0, 0, 0.42), (0.5 * scale, 0.3 * scale, 0.62 * scale), cloth, (0, 0, facing), bevel=0.13 * scale)
    for side in (-1, 1):
        box(f"{name}_bras", at(side * 0.27, -0.08, 0.32), (0.13 * scale, 0.36 * scale, 0.42 * scale), cloth, (0.35, 0, facing), bevel=0.05 * scale)
    skin = mat(rng.choice(skins), 0.55)
    sphere(f"{name}_tete", at(0, -0.02, 0.95), 0.15 * scale, skin, (1, 1, 1.12))
    if rng.random() < 0.85:
        sphere(f"{name}_cheveux", at(0, 0.03, 1.02), 0.158 * scale, mat(rng.choice(hairs), 0.7), (1.02, 1.0, 0.78))


def tv_camera(name, location, facing, tally_color="#ff1a2a"):
    """Une caméra de plateau sur pied roulant, vue de dos : on voit son viseur allumé, et elle vise la scène."""
    x, y, z = location
    metal = surface(f"{name}_metal", "#2a2c31", 0.3, 0.8)
    black = surface(f"{name}_noir", "#0d0e10", 0.4, 0.2)
    glass = surface(f"{name}_verre", "#0a0c12", 0.02, 0.0, 1.0)
    for k in range(3):
        a = facing + math.radians(90 + 120 * k)
        foot = (x + 0.75 * math.cos(a), y + 0.75 * math.sin(a), 0.12)
        tube(f"{name}_pied{k}", (x, y, 0.2), foot, 0.05, metal)
        cylinder(f"{name}_roue{k}", (foot[0], foot[1], 0.05), 0.08, 0.06, black, 16, rotation=(math.pi / 2, 0, a))
    cylinder(f"{name}_colonne", (x, y, 0.2), 0.1, 1.1, metal, 20)
    cylinder(f"{name}_bague", (x, y, 0.8), 0.32, 0.05, metal, 32)
    forward = Vector((-math.sin(facing), math.cos(facing), 0))
    side = Vector((math.cos(facing), math.sin(facing), 0))
    center = Vector((x, y, z))
    box(f"{name}_corps", tuple(center), (0.36, 0.7, 0.42), black, (0, 0, facing), bevel=0.05)
    lens = cylinder(f"{name}_objectif", (0, 0, 0), 0.12, 0.5, metal, 24)
    lens.location = center + forward * 0.35
    lens.rotation_euler = forward.to_track_quat("Z", "Y").to_euler()
    # Le prompteur devant l'objectif : un capot noir et sa vitre inclinée.
    box(f"{name}_capot", tuple(center + forward * 0.85 + Vector((0, 0, 0.05))), (0.62, 0.5, 0.5), black, (0, 0, facing), bevel=0.03)
    box(f"{name}_vitre", tuple(center + forward * 1.12 + Vector((0, 0, 0.05))), (0.58, 0.02, 0.56), glass, (math.radians(45), 0, facing))
    # Le viseur, à l'arrière, allumé pour le cadreur.
    viewfinder = center - forward * 0.32 + Vector((0, 0, 0.32))
    box(f"{name}_viseur", tuple(viewfinder), (0.34, 0.14, 0.24), black, (0, 0, facing), bevel=0.02)
    box(f"{name}_ecran", tuple(viewfinder - forward * 0.072), (0.28, 0.01, 0.18), glow(f"{name}_image", "#9fb8e8", 2.5), (0, 0, facing))
    box(f"{name}_tally", tuple(center + Vector((0, 0, 0.25)) + forward * 0.1), (0.08, 0.08, 0.05), glow(f"{name}_rouge", tally_color, 30), (0, 0, facing))
    for k in (-1, 1):
        handle_start = center - forward * 0.25 + side * k * 0.14 - Vector((0, 0, 0.12))
        tube(f"{name}_poignee{k}", tuple(handle_start), tuple(handle_start - forward * 0.75 + side * k * 0.3 - Vector((0, 0, 0.25))), 0.025, metal)


def bloom(scene, threshold=0.9, strength=0.55, size=0.5):
    """Le bloom du compositeur (Blender 5) : les lumières et les écrans bavent un peu, comme à la télé."""
    tree = bpy.data.node_groups.new("compositeur", "CompositorNodeTree")
    scene.compositing_node_group = tree
    layers = tree.nodes.new("CompositorNodeRLayers")
    glare = tree.nodes.new("CompositorNodeGlare")
    glare.inputs["Type"].default_value = "Bloom"
    glare.inputs["Quality"].default_value = "High"
    glare.inputs["Threshold"].default_value = threshold
    glare.inputs["Strength"].default_value = strength
    glare.inputs["Size"].default_value = size
    output = tree.nodes.new("NodeGroupOutput")
    tree.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    tree.links.new(layers.outputs["Image"], glare.inputs["Image"])
    tree.links.new(glare.outputs["Image"], output.inputs["Image"])


def haze(scene, density):
    """La brume du plateau, où les faisceaux se dessinent."""
    nodes, links = scene.world.node_tree.nodes, scene.world.node_tree.links
    scatter = nodes.new("ShaderNodeVolumeScatter")
    scatter.inputs["Density"].default_value = density
    scatter.inputs["Anisotropy"].default_value = 0.4
    links.new(scatter.outputs[0], nodes["World Output"].inputs["Volume"])
    scene.cycles.volume_step_rate = 3.0
    scene.cycles.volume_max_steps = 160


def rgb_alpha(color, alpha=1.0):
    return (*rgb(color), alpha)
