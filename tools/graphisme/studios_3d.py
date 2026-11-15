"""Les plateaux télé, chacun avec sa propre composition : on doit reconnaître l'émission au premier coup d'œil.

Lancer avec uv :
  uv run --no-project --python 3.11 --with bpy --with pillow python tools/graphisme/studios_3d.py [--samples 96] [--scale 50] [--out dossier] [ids…]

Chaque plateau est construit d'après le vrai plateau de l'émission (15 novembre 2026) : l'arène de Quotidien, les murs
d'écrans roses de W9, la « fenêtre sur le monde » du 20 heures, les hémicycles de l'Assemblée et du Sénat, la cour de
l'Élysée du débat. Les scènes sont rangées par famille (scenes_divertissement, scenes_info, scenes_palais,
scenes_debats), les pièces communes dans studio_parts et studio_kit, les images des murs d'écrans dans studio_images.
La table du jeu couvre le centre de l'image : ce qui signe l'émission est en haut à gauche, sur les côtés et au premier
plan ; le coin haut droit reste libre pour l'écran des candidats.
Les vraies chaînes, sous leur vrai nom (consigne du 3 novembre 2026). Mêmes ids que src/data/plateaux.ts.
"""
import argparse
import math
import os
import random
import sys
import tempfile

import bpy
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plateau_3d_kit import bloom, fixture, haze, truss, tv_camera  # noqa: E402
from scenes_debats import france2_dimanche, france2_prime, grand_oral, tf1_second_tour  # noqa: E402
from scenes_divertissement import c_a_vous, france3, hanouna, quotidien  # noqa: E402
from scenes_info import bfm, cnews, lci, tf1_20h  # noqa: E402
from scenes_palais import lcp, public_senat  # noqa: E402
from studio_kit import ROOT, surface  # noqa: E402

# Plus grand que la table (1920×1080) : des marges pour les écrans qui ne sont pas en 16:9.
# Le cadre de la table reste celui d'un 22 mm, au centre de l'image.
TABLE_WIDTH = 1920
WIDTH, HEIGHT = 2560, 1440


# La brume du plateau, où se dessinent les faisceaux des lyres : légère partout, plus dense au Grand Oral.
HAZE = {"grand_oral": 0.006, "tf1_second_tour": 0.0015, "france2_dimanche": 0.0015}
DEFAULT_HAZE = 0.0009
# La couleur des lyres du treillis, par plateau.
RIG_COLORS = {
    "france3": "#e8f0ff", "hanouna": "#ff6ec8", "cnews": "#ffffff", "lcp": "#fff2e0", "public_senat": "#ffd9a0", "lci": "#e6f2ff", "bfm": "#ffffff",
    "c_a_vous": "#ffe2b0", "quotidien": "#fff1dc", "france2_dimanche": "#cfe0ff", "grand_oral": "#fff2d0", "france2_prime": "#ffffff",
    "tf1_20h": "#e6eeff", "tf1_second_tour": "#ffffff",
}


def production_rig(studio_id):
    """Ce qui fait un vrai plateau, partout : un treillis et ses lyres en haut, deux caméras de plateau au premier plan."""
    alu = surface("alu_treillis", "#a4a8b0", 0.3, 1.0)
    truss("treillis", -34, 34, 8, 13.0, alu)
    color = RIG_COLORS.get(studio_id, "#fff1d6")
    for x, target, energy in ((-18.5, (-15, 7, 1.5), 9.0e3), (-9.0, (-3, 5, 0.3), 1.4e4), (8.6, (3, 5, 0.3), 1.4e4), (18.5, (15, 7, 1.5), 9.0e3)):
        fixture(f"lyre{x}", (x, 8, 12.75), target, color, energy, 14)
    tv_camera("camera_g", (-4.2, -6.0, 1.2), -0.35)
    tv_camera("camera_d", (3.3, -6.2, 1.2), 0.3)


STUDIOS = {
    "france3": france3, "hanouna": hanouna, "cnews": cnews, "lcp": lcp, "public_senat": public_senat, "lci": lci,
    "bfm": bfm, "c_a_vous": c_a_vous, "quotidien": quotidien, "france2_dimanche": france2_dimanche, "grand_oral": grand_oral,
    "france2_prime": france2_prime, "tf1_20h": tf1_20h, "tf1_second_tour": tf1_second_tour,
}


def render(studio_id, samples, out_dir, scale=100):
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
    scene.render.resolution_x, scene.render.resolution_y = WIDTH, HEIGHT
    scene.render.resolution_percentage = scale
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world = bpy.data.worlds.new("noir")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.002, 0.002, 0.004, 1)
    haze(scene, HAZE.get(studio_id, DEFAULT_HAZE))
    # Les lumières et les écrans bavent un peu, comme à la télé.
    bloom(scene, threshold=1.6, strength=0.45)
    rng = random.Random(f"{studio_id}-1789")
    with tempfile.TemporaryDirectory() as directory:
        STUDIOS[studio_id](directory, rng)
        production_rig(studio_id)
        camera_data = bpy.data.cameras.new("camera")
        camera_data.lens = 22 * TABLE_WIDTH / WIDTH
        # Une profondeur de champ de télé : la scène est nette, les caméras du premier plan et le fond fondent un peu.
        camera_data.dof.use_dof = True
        camera_data.dof.focus_distance = 19
        camera_data.dof.aperture_fstop = 3.2
        camera = bpy.data.objects.new("camera", camera_data)
        camera.location = (0, -15, 4.4)
        camera.rotation_euler = (math.radians(86), 0, 0)
        scene.collection.objects.link(camera)
        scene.camera = camera
        path = os.path.join(directory, "render.png")
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        os.makedirs(out_dir, exist_ok=True)
        target = os.path.join(out_dir, f"{studio_id}.webp")
        Image.open(path).convert("RGB").save(target, "WEBP", quality=82, method=6)
    print(studio_id, f"{os.path.getsize(target) / 1024:.0f} Ko", flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=96)
    parser.add_argument("--out", default=os.path.join(ROOT, "assets/maquette/plateaux"))
    parser.add_argument("--scale", type=int, default=100, help="pour un essai : la taille du rendu, en pourcentage")
    parser.add_argument("studios", nargs="*", default=list(STUDIOS))
    args = parser.parse_args()
    for studio_id in args.studios:
        render(studio_id, args.samples, args.out, args.scale)


if __name__ == "__main__":
    main()
