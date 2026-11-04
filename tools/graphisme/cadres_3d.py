"""Rend les cadres de cartes, les médailles et le bandeau en vraie 3D, avec Blender Cycles.

Lancer avec uv (Blender s'installe comme un module Python, sans interface) :
  uv run --no-project --python 3.11 --with bpy --with pillow python tools/graphisme/cadres_3d.py [--samples 128] [noms…]

Unité : 1 = 1 pixel du cadre de référence 512 x 732, y vers le bas, comme dans demo/const/card_layout.js.
Les fenêtres sont transparentes, avec l'ombre portée du cadre conservée dans le canal alpha.
Pour changer l'allure d'un échelon, il suffit de modifier TIERS : la géométrie est commune.
"""
import argparse
import math
import os
import sys
import tempfile

import bpy
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTPUT = os.path.join(ROOT, "assets/game/carte")

CARD_W, CARD_H = 512, 732
RENDER_SCALE = 2
OUTPUT_SCALE = 1.5
WINDOW = (34, 34, 478, 452)
TEXT_PLATE = (54, 498, 458, 672)
STUD_Y = 702
TOKEN_H = 515
ARCH_SIZE = (300, 340)
CONSOLE_W, CONSOLE_H = 1920, 1080
CONSOLE_NICHES = {"top": {"y": 16, "w": 176, "h": 160}, "bottom": {"y": 904, "w": 176, "h": 160}}

# Colours are linear-ish sRGB hex. "metal" drives the rims, "enamel" the plate behind them.
TIERS = {
    "1": {"metal": "#a97c4c", "metallic": 0.0, "rough": 0.62, "enamel": "#5a4230", "studs": 1},
    "2": {"metal": "#c0763f", "metallic": 1.0, "rough": 0.34, "enamel": "#3a2118", "studs": 2},
    "3": {"metal": "#d4d8de", "metallic": 1.0, "rough": 0.26, "enamel": "#26344a", "studs": 3},
    "4": {"metal": "#e5b04a", "metallic": 1.0, "rough": 0.24, "enamel": "#4c1020", "studs": 4},
    "5": {"metal": "#efc15c", "metallic": 1.0, "rough": 0.18, "enamel": "#0f1f4d", "studs": 5},
    # Le Panthéon : platine et émail pourpre, six clous.
    "6": {"metal": "#e9e6f2", "metallic": 1.0, "rough": 0.14, "enamel": "#3b1060", "studs": 6},
    "dore": {"metal": "#ffcf4d", "metallic": 1.0, "rough": 0.12, "enamel": "#c98f1e", "studs": 0},
}


def hex_to_linear(value):
    def channel(text):
        component = int(text, 16) / 255
        return component / 12.92 if component <= 0.04045 else ((component + 0.055) / 1.055) ** 2.4
    return (channel(value[1:3]), channel(value[3:5]), channel(value[5:7]), 1)


def rounded_rect(x0, y0, x1, y1, radius, steps=14):
    centers = [(x1 - radius, y0 + radius, -90), (x1 - radius, y1 - radius, 0),
               (x0 + radius, y1 - radius, 90), (x0 + radius, y0 + radius, 180)]
    points = []
    for cx, cy, start in centers:
        for step in range(steps + 1):
            angle = math.radians(start + 90 * step / steps)
            points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    return points


def circle(cx, cy, radius, steps=72):
    return [(cx + radius * math.cos(i * math.tau / steps), cy + radius * math.sin(i * math.tau / steps))
            for i in range(steps)]


def shield(cx, cy, width, height):
    """Heater shield: flat top, full sides, point at the bottom. Leaves room for two digits."""
    half = width / 2
    top = cy - height / 2
    right = []
    for i in range(41):
        t = i / 40
        right.append((cx + half * (1 - t ** 2.6) ** 0.9, top + 10 + (height - 10) * t))
    left = [(2 * cx - x, y) for x, y in reversed(right)]
    return [(cx - half + 8, top), (cx + half - 8, top)] + right + left


def add_shape(name, outlines, z, height, bevel, material, resolution=4):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "2D"
    curve.fill_mode = "BOTH"
    curve.extrude = max(height / 2 - bevel, 0.01)
    curve.bevel_depth = bevel
    curve.bevel_resolution = resolution
    curve.offset = -bevel
    for outline in outlines:
        spline = curve.splines.new("POLY")
        spline.points.add(len(outline) - 1)
        for point, (x, y) in zip(spline.points, outline):
            point.co = (x, -y, 0, 1)
        spline.use_cyclic_u = True
    shape = bpy.data.objects.new(name, curve)
    shape.location.z = z + height / 2
    shape.data.materials.append(material)
    bpy.context.scene.collection.objects.link(shape)
    return shape


def make_material(name, color, metallic=0.0, roughness=0.5, coat=0.0, bump=0.0, sheen=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    shader = nodes["Principled BSDF"]
    shader.inputs["Base Color"].default_value = hex_to_linear(color)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Coat Weight"].default_value = coat
    shader.inputs["Coat Roughness"].default_value = 0.08
    shader.inputs["Sheen Weight"].default_value = sheen
    if bump > 0:
        coordinates = nodes.new("ShaderNodeTexCoord")
        noise = nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 0.05
        noise.inputs["Detail"].default_value = 6
        relief = nodes.new("ShaderNodeBump")
        relief.inputs["Strength"].default_value = bump
        relief.inputs["Distance"].default_value = 1.0
        links.new(coordinates.outputs["Object"], noise.inputs["Vector"])
        links.new(noise.outputs["Fac"], relief.inputs["Height"])
        links.new(relief.outputs["Normal"], shader.inputs["Normal"])
    return material


# Studio strips: (position along the tilted vertical axis, brightness). Bevels sweep across them, which is what
# makes metal read as metal. The zenith stays dim, otherwise flat glossy surfaces wash out to grey.
WORLD_STRIPS = [(0.0, 0.015), (0.42, 0.015), (0.5, 1.7), (0.58, 0.09), (0.76, 0.1), (0.85, 2.6), (0.92, 0.07), (1.0, 0.12)]


def make_world():
    world = bpy.data.worlds.new("studio")
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    coordinates = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Rotation"].default_value = (0.42, -0.34, 0)
    axes = nodes.new("ShaderNodeSeparateXYZ")
    ramp = nodes.new("ShaderNodeValToRGB")
    elements = ramp.color_ramp.elements
    elements[0].position, elements[0].color = WORLD_STRIPS[0][0], (WORLD_STRIPS[0][1],) * 3 + (1,)
    elements[1].position, elements[1].color = WORLD_STRIPS[-1][0], (WORLD_STRIPS[-1][1],) * 3 + (1,)
    for position, brightness in WORLD_STRIPS[1:-1]:
        elements.new(position).color = (brightness, brightness, brightness * 0.97, 1)
    remap = nodes.new("ShaderNodeMath")
    remap.operation = "MULTIPLY_ADD"
    remap.inputs[1].default_value = 0.5
    remap.inputs[2].default_value = 0.5
    background = nodes["Background"]
    links.new(coordinates.outputs["Generated"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], axes.inputs["Vector"])
    links.new(axes.outputs["Z"], remap.inputs[0])
    links.new(remap.outputs[0], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], background.inputs["Color"])
    return world


def add_light(width, height):
    """Diffuse key light only: its reflection would cover every flat surface seen from straight above."""
    data = bpy.data.lights.new("key", "AREA")
    data.shape = "RECTANGLE"
    data.size = width * 1.4
    data.size_y = height * 1.4
    data.energy = 2.4e6 * (width * height) / (CARD_W * CARD_H)
    light = bpy.data.objects.new("key", data)
    light.location = (width * 0.5 - width * 0.35, -height * 0.5 + height * 0.3, 620)
    light.rotation_euler = (math.radians(-16), math.radians(-14), 0)
    light.visible_glossy = False
    bpy.context.scene.collection.objects.link(light)


def reset_scene(width, height, samples):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    preferences = bpy.context.preferences.addons["cycles"].preferences
    # Une carte Nvidia (OptiX) si la machine en a une, sinon le processeur : même image, plus lente.
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
    scene.render.resolution_x = int(width * RENDER_SCALE)
    scene.render.resolution_y = int(height * RENDER_SCALE)
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"
    scene.world = make_world()

    camera_data = bpy.data.cameras.new("camera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = max(width, height)
    camera_data.clip_end = 5000
    camera = bpy.data.objects.new("camera", camera_data)
    camera.location = (width / 2, -height / 2, 1000)
    scene.collection.objects.link(camera)
    scene.camera = camera
    add_light(width, height)


def render_to_webp(relative_name, width, height, quality=90, output_scale=OUTPUT_SCALE):
    scene = bpy.context.scene
    with tempfile.TemporaryDirectory() as directory:
        path = os.path.join(directory, "render.png")
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        image = Image.open(path).convert("RGBA")
        size = (int(width * output_scale), int(height * output_scale))
        target = os.path.join(OUTPUT, relative_name)
        image.resize(size, Image.LANCZOS).save(target, "WEBP", quality=quality, method=6)
    print(relative_name, f"{os.path.getsize(target) / 1024:.0f} Ko", flush=True)


def add_cockade_stud(cx, cy, radius, gold):
    add_shape("stud_rim", [circle(cx, cy, radius, 40)], 8, 7, 2.2, gold, 3)
    red = make_material("red", "#c8202e", roughness=0.25, coat=0.5)
    white = make_material("white", "#f4f1e8", roughness=0.25, coat=0.5)
    blue = make_material("blue", "#1d3a96", roughness=0.25, coat=0.5)
    add_shape("stud_red", [circle(cx, cy, radius * 0.8, 40)], 14, 2, 0.6, red, 2)
    add_shape("stud_white", [circle(cx, cy, radius * 0.56, 40)], 15.2, 2, 0.5, white, 2)
    add_shape("stud_blue", [circle(cx, cy, radius * 0.3, 32)], 16.2, 2, 0.5, blue, 2)


def render_frame(tier, samples):
    settings = TIERS[tier]
    reset_scene(CARD_W, CARD_H, samples)
    metal = make_material("metal", settings["metal"], settings["metallic"], settings["rough"], bump=0.06)
    enamel = make_material("enamel", settings["enamel"], roughness=0.3, coat=0.35, bump=0.015)
    paper = make_material("paper", "#fbf4e2", roughness=0.9, bump=0.02)

    outer = rounded_rect(6, 6, CARD_W - 6, CARD_H - 6, 30)
    rim_inner = rounded_rect(21, 21, CARD_W - 21, CARD_H - 21, 18)
    window_outer = rounded_rect(WINDOW[0] - 7, WINDOW[1] - 7, WINDOW[2] + 7, WINDOW[3] + 7, 17)
    window = rounded_rect(*WINDOW, 12)
    plate_outer = rounded_rect(TEXT_PLATE[0] - 5, TEXT_PLATE[1] - 5, TEXT_PLATE[2] + 5, TEXT_PLATE[3] + 5, 15)
    plate = rounded_rect(*TEXT_PLATE, 11)

    add_shape("back", [outer, window], 0, 7, 1.2, enamel, 2)
    add_shape("outer_rim", [outer, rim_inner], 0, 16, 7, metal, 8)
    add_shape("window_rim", [window_outer, window], 0, 13, 3.4, metal, 6)
    add_shape("plate_rim", [plate_outer, plate], 4, 8, 2.4, metal, 5)
    add_shape("plate", [plate], 4, 4, 0.5, paper, 1)

    # A shadow catcher behind the window keeps the frame's shadow on top of the art at run time.
    catcher = add_shape("catcher", [rounded_rect(WINDOW[0] - 2, WINDOW[1] - 2, WINDOW[2] + 2, WINDOW[3] + 2, 12)],
                        -2, 1, 0.1, paper, 1)
    catcher.is_shadow_catcher = True

    count = settings["studs"]
    for index in range(count):
        add_cockade_stud(CARD_W / 2 + (index - (count - 1) / 2) * 32, STUD_Y, 12.5, metal)
    render_to_webp(f"cadre_{tier}.webp", CARD_W, CARD_H)


def render_token(tier, samples):
    """Top half of a card, closed at the bottom: window and ribbon area only. Same window as the full frame."""
    settings = TIERS[tier]
    reset_scene(CARD_W, TOKEN_H, samples)
    metal = make_material("metal", settings["metal"], settings["metallic"], settings["rough"], bump=0.06)
    enamel = make_material("enamel", settings["enamel"], roughness=0.3, coat=0.35, bump=0.015)
    outer = rounded_rect(6, 6, CARD_W - 6, TOKEN_H - 6, 30)
    rim_inner = rounded_rect(21, 21, CARD_W - 21, TOKEN_H - 21, 18)
    window_outer = rounded_rect(WINDOW[0] - 7, WINDOW[1] - 7, WINDOW[2] + 7, WINDOW[3] + 7, 17)
    window = rounded_rect(*WINDOW, 12)
    add_shape("back", [outer, window], 0, 7, 1.2, enamel, 2)
    add_shape("outer_rim", [outer, rim_inner], 0, 16, 7, metal, 8)
    add_shape("window_rim", [window_outer, window], 0, 13, 3.4, metal, 6)
    catcher = add_shape("catcher", [rounded_rect(WINDOW[0] - 2, WINDOW[1] - 2, WINDOW[2] + 2, WINDOW[3] + 2, 12)],
                        -2, 1, 0.1, enamel, 1)
    catcher.is_shadow_catcher = True
    render_to_webp(f"jeton_{tier}.webp", CARD_W, TOKEN_H)


def arch(cx, top, width, height, steps=48):
    """Portrait niche: round on top, flat at the bottom."""
    radius = width / 2
    points = [(cx + radius * math.cos(math.pi + i * math.pi / steps), top + radius + radius * math.sin(math.pi + i * math.pi / steps))
              for i in range(steps + 1)]
    return points + [(cx + radius, top + height), (cx - radius, top + height)]


def render_arch(samples):
    width, height = ARCH_SIZE
    reset_scene(width, height, samples)
    gold = make_material("gold", "#efc15c", 1.0, 0.18)
    navy = make_material("navy", "#0f1f4d", roughness=0.3, coat=0.35)
    outer = arch(width / 2, 6, width - 12, height - 12)
    middle = arch(width / 2, 20, width - 40, height - 34)
    hole = arch(width / 2, 30, width - 60, height - 52)
    add_shape("band", [outer, hole], 0, 8, 1.2, navy, 2)
    add_shape("rim", [outer, middle], 0, 14, 6.2, gold, 8)
    add_shape("inner_rim", [middle, hole], 3, 9, 3, gold, 6)
    render_to_webp("arche.webp", width, height)


def desk_outline(inset, flip):
    """Long flat desk against the screen edge, with a raised centre for the niche. flip draws the bottom one."""
    left, right = 330 + inset, 1590 - inset
    bar, bulge = 96 - inset, 194 - inset
    shoulder_left, shoulder_right = 780 + inset, 1140 - inset
    points = [(left, -40), (left, bar - 26)]
    points += [(left + 26 * (1 - math.cos(a * math.pi / 16)), bar - 26 + 26 * math.sin(a * math.pi / 16)) for a in range(1, 9)]
    points += [(shoulder_left - 50 + 74 * t, bar + (bulge - bar) * (3 * t * t - 2 * t ** 3)) for t in [i / 20 for i in range(21)]]
    points += [(1920 - x, y) for x, y in reversed([(shoulder_left - 50 + 74 * t, bar + (bulge - bar) * (3 * t * t - 2 * t ** 3))
                                                   for t in [i / 20 for i in range(21)]])]
    points += [(right - 26 * (1 - math.cos(a * math.pi / 16)), bar - 26 + 26 * math.sin(a * math.pi / 16)) for a in range(8, 0, -1)]
    points += [(right, bar - 26), (right, -40)]
    return [(x, CONSOLE_H - y) for x, y in points] if flip else points


def render_console(samples):
    """Two desks laid over the set, transparent everywhere else. Niche geometry: CONSOLE_NICHES."""
    reset_scene(CONSOLE_W, CONSOLE_H, samples)
    gold = make_material("gold", "#efc15c", 1.0, 0.18)
    navy = make_material("navy", "#0f1f4d", roughness=0.3, coat=0.35, bump=0.015)
    for name, flip in (("top", False), ("bottom", True)):
        niche = CONSOLE_NICHES[name]
        hole = arch(CONSOLE_W / 2, niche["y"], niche["w"], niche["h"])
        hole_rim = arch(CONSOLE_W / 2, niche["y"] - 8, niche["w"] + 16, niche["h"] + 13)
        outer, inner, pin = desk_outline(0, flip), desk_outline(14, flip), desk_outline(23, flip)
        add_shape(f"{name}_base", [outer, hole], 0, 8, 1.2, navy, 2)
        add_shape(f"{name}_rim", [outer, inner], 0, 15, 6.6, gold, 8)
        add_shape(f"{name}_pin", [pin, desk_outline(25, flip)], 4, 6, 0.9, gold, 3)
        add_shape(f"{name}_niche", [hole_rim, hole], 0, 14, 3.8, gold, 6)
    render_to_webp("console.webp", CONSOLE_W, CONSOLE_H, output_scale=1)


def render_attack_medal(samples):
    size = 136
    reset_scene(size, size, samples)
    gold = make_material("gold", "#f2b632", 1.0, 0.2)
    inner = make_material("inner", "#d9720f", roughness=0.28, coat=0.8)
    add_shape("cabochon", [circle(68, 68, 50, 96)], 0, 15, 7, inner, 8)
    add_shape("ring", [circle(68, 68, 62, 96), circle(68, 68, 48, 96)], 0, 16, 6.8, gold, 8)
    render_to_webp("attaque.webp", size, size)


def render_health_medal(samples):
    size = 136
    reset_scene(size, size, samples)
    gold = make_material("gold", "#f2b632", 1.0, 0.2)
    inner = make_material("inner", "#d3142a", roughness=0.28, coat=0.8)
    add_shape("cabochon", [shield(68, 67, 96, 106)], 0, 15, 7, inner, 8)
    add_shape("ring", [shield(68, 68, 118, 128), shield(68, 67, 92, 102)], 0, 16, 6.3, gold, 8)
    render_to_webp("pv.webp", size, size)


def render_ribbon(samples):
    width, height = 512, 92
    reset_scene(width, height, samples)
    satin = make_material("satin", "#f2f2f2", roughness=0.42, sheen=0.5)
    shade = make_material("shade", "#a4a4a4", roughness=0.5)
    add_shape("tail_l", [[(4, 26), (46, 26), (46, 84), (25, 72), (4, 84)]], 0, 6, 1.5, shade, 2)
    add_shape("tail_r", [[(508, 26), (466, 26), (466, 84), (487, 72), (508, 84)]], 0, 6, 1.5, shade, 2)
    add_shape("band", [rounded_rect(24, 8, 488, 70, 5)], 8, 14, 6, satin, 5)
    render_to_webp("bandeau.webp", width, height)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=128)
    parser.add_argument("names", nargs="*", help="5, dore, attaque, pv, bandeau… (tout par défaut)")
    args = parser.parse_args(sys.argv[1:])
    os.makedirs(OUTPUT, exist_ok=True)
    wanted = args.names or list(TIERS) + ["attaque", "pv", "bandeau", "console", "arche"] + [f"jeton_{tier}" for tier in TIERS]
    for name in wanted:
        if name in TIERS:
            render_frame(name, args.samples)
        elif name == "attaque":
            render_attack_medal(args.samples)
        elif name == "pv":
            render_health_medal(args.samples)
        elif name == "bandeau":
            render_ribbon(args.samples)
        elif name == "console":
            render_console(args.samples)
        elif name == "arche":
            render_arch(args.samples)
        elif name.startswith("jeton_"):
            render_token(name.removeprefix("jeton_"), args.samples)


if __name__ == "__main__":
    main()
