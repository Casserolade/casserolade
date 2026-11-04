"""Le coup fatal, en vraie 3D : une casserole géante en cuivre tombe sur la tête du héros que la victoire élimine.

  uv run --no-project --python 3.11 --with bpy --with pillow python tools/graphisme/coup_fatal_3d.py [--samples 64]
  puis : uv run --with pillow python tools/graphisme/planche.py <dossier> coup_fatal 12 1 6 impact=4 ancre=0.5,1 tient=1

Décision de l'utilisateur (3 novembre 2026) : plus rien ne tombe sur un politique ; le seul gros gag, en 3D,
est le coup porté à l'adversaire quand la victoire le tue. La casserole est le thème du jeu : elle tombe à
l'envers, le coiffe, s'écrase, rebondit, vacille, et reste de travers sur sa tête.
Images de 384×480 sur fond transparent, caméra orthographique de face : le bord de la casserole au repos
est au dixième du bas de l'image, là où le client pose le haut de la tête.
"""
import argparse
import math
import os
import sys
import tempfile

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio_kit import area, cylinder, link, rgb, surface, torus  # noqa: E402

WIDTH, HEIGHT = 384, 480
# Hauteur du bord, inclinaison (degrés), écrasement vertical, image par image : la chute, l'impact, le rebond, le vacillement.
FRAMES = [
    (4.6, 0, 1.0), (3.2, 0, 1.0), (1.8, 0, 1.0), (0.6, 0, 1.0),
    (0.0, 0, 0.76), (0.32, 5, 0.95), (0.55, 11, 1.02), (0.5, 15, 1.0), (0.22, 14, 1.0), (0.0, 11, 1.0),
    (0.0, 15, 1.0), (0.0, 7, 1.0), (0.0, 12, 1.0), (0.0, 8, 1.0), (0.0, 10.5, 1.0), (0.0, 9, 1.0), (0.0, 9.5, 1.0), (0.0, 9.5, 1.0),
]


def copper():
    """Du cuivre battu : métallique, un peu rayé, cabossé par des années de casseroles."""
    mat = surface("cuivre", "#c8743a", 0.26, 1.0)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 6.0
    noise.inputs["Detail"].default_value = 6
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.35
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], nodes["Principled BSDF"].inputs["Normal"])
    return mat


def casserole():
    """La casserole, déjà à l'envers : le bord roulé en bas (l'origine, et le pivot du vacillement), la cuve au-dessus,
    le manche noir qui part du bord vers la caméra, et sa bague. Le tout sous un parent qu'on anime."""
    parent = bpy.data.objects.new("casserole", None)
    link(parent)
    metal = copper()
    body = cylinder("cuve", (0, 0, 0), 0.9, 0.82, metal, 64)
    bevel = body.modifiers.new("arrondi", "BEVEL")
    bevel.width = 0.16
    bevel.segments = 6
    rim = torus("bord", (0, 0, 0), 0.9, 0.05, metal)
    direction = Vector((0.66, -0.62, 0.3)).normalized()
    attach = Vector((0.9 * math.cos(math.radians(-44)), 0.9 * math.sin(math.radians(-44)), 0.14))
    length = 1.05
    handle = cylinder("manche", (0, 0, 0), 0.075, length, surface("bakelite", "#151515", 0.38), 24)
    handle.location = attach + direction * (length / 2)
    handle.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    ring = torus("bague", (0, 0, 0), 0.1, 0.028, surface("laiton", "#d9a441", 0.3, 1.0))
    ring.location = attach + direction * length
    ring.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    for obj in (body, rim, handle, ring):
        obj.parent = parent
    return parent


def render(samples, out_dir):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    preferences = bpy.context.preferences.addons["cycles"].preferences
    preferences.compute_device_type = "OPTIX"
    preferences.get_devices()
    for device in preferences.devices:
        device.use = device.type == "OPTIX"
    scene.cycles.device = "GPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = WIDTH, HEIGHT
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world = bpy.data.worlds.new("atelier")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (*rgb("#3a4258"), 1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
    pan = casserole()
    # La lumière du jeu : en haut à gauche, un contre-jour chaud, et deux boîtes à lumière qui se reflètent dans le cuivre.
    area("cle", (-3, -4, 5), 3, 900, "#fff4e6", (math.radians(50), 0, math.radians(-35))).visible_glossy = True
    area("contre", (3, 3, 3), 2.5, 600, "#ffb070", (math.radians(-60), 0, math.radians(140)))
    area("boite_g", (-4, -1, 1.5), 2, 300, "#e8f0ff", (math.radians(90), 0, math.radians(-75))).visible_glossy = True
    area("boite_d", (4, -2, 2), 2, 250, "#ffffff", (math.radians(90), 0, math.radians(65))).visible_glossy = True
    camera_data = bpy.data.cameras.new("camera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 4.0
    camera = bpy.data.objects.new("camera", camera_data)
    # Penchée de 6° vers le bas : on la remonte d'autant, pour que le centre de l'image reste à 1,6 au-dessus du bord.
    camera.location = (0, -10, 1.6 + 10 * math.tan(math.radians(6)))
    camera.rotation_euler = (math.radians(84), 0, 0)
    link(camera)
    scene.camera = camera
    os.makedirs(out_dir, exist_ok=True)
    for index, (height, tilt, squash) in enumerate(FRAMES):
        # Le bord posé à `height`, penché de `tilt`, écrasé vers son bord à l'impact.
        pan.location = (0, 0, height)
        pan.rotation_euler = (0, math.radians(tilt), 0)
        pan.scale = (1 / math.sqrt(squash), 1 / math.sqrt(squash), squash)
        scene.render.filepath = os.path.join(out_dir, f"{index:03d}.png")
        bpy.ops.render.render(write_still=True)
    print("images", len(FRAMES), out_dir, flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=64)
    parser.add_argument("--out", default=os.path.join(tempfile.gettempdir(), "coup_fatal"))
    args = parser.parse_args()
    render(args.samples, args.out)


if __name__ == "__main__":
    main()
