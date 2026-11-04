"""Le test de style des plateaux (docs/09-rendu-et-blender.md, livrable 1) : CNews, en deux pistes.

  uv run --no-project --python 3.11 --with bpy --with pillow python tools/graphisme/test_style_cnews.py papier|soignee [--samples 96]

Les deux pistes gardent la même mise en page que le jeu : la table couvre le centre (x 300 à 1620, y 156 à 796),
le pupitre de l'animateur le haut du milieu (x 560 à 1360). Le décor vit sur les bords et dans les coins.
Retour de l'utilisateur, 3 novembre 2026 : les plateaux en 3D simple sont « moches ». L'utilisateur choisit la piste.
"""
import argparse
import math
import os
import random
import sys
import tempfile

import bpy
from PIL import Image, ImageChops, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from papier_kit import (HEIGHT, MARGIN_X, MARGIN_Y, RENDER_HEIGHT, RENDER_WIDTH, WIDTH, circle, extra, front_camera, key_light, paper,  # noqa: E402
                        rect, rounded, sheet, strip)
from plateau_3d_kit import bloom, curved_wall, fixture, haze, lacquer, seated, truss, tube, tv_camera  # noqa: E402
from studio_kit import LOGO_FONT, ROOT, TEXT_FONT, area, box, fitted_font, glow, panel, picture, rgb, surface  # noqa: E402

LOGOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logos")
OUT = os.path.join(ROOT, "assets/maquette/style")
RED = "#e3001b"
CLOTHES = ["#3b6ea8", "#c23b2e", "#2f8f57", "#7d4aa0", "#e08a2a", "#e8c547", "#6f7680", "#24384f", "#b04a7a", "#1f8a8a"]


def logo_plate(directory, name, logo, background, padding=0.1):
    """Le vrai logo de la chaîne, imprimé sur une plaque de sa couleur."""
    art = Image.open(os.path.join(LOGOS, f"{logo}.png")).convert("RGBA")
    pad = int(art.height * padding * 2)
    plate = Image.new("RGBA", (art.width + 2 * pad, art.height + 2 * pad), background)
    plate.alpha_composite(art, (pad, pad))
    path = os.path.join(directory, f"{name}.png")
    plate.convert("RGB").save(path)
    return path, plate.width / plate.height


def chyron_image(directory):
    """L'écran du coin : le titre de l'émission, en direct."""
    w, h = 960, 306
    image = Image.new("RGB", (w, h), "#14040a")
    draw = ImageDraw.Draw(image)
    for y in range(h):
        t = y / h
        draw.line([(0, y), (w, y)], fill=(int(120 - 90 * t), int(4 + 2 * t), int(22 - 10 * t)))
    font = fitted_font(LOGO_FONT, "L'HEURE DES PROS", 150, w - 80)
    draw.text((w / 2, 120), "L'HEURE DES PROS", font=font, fill="#ffffff", anchor="mm", stroke_width=6, stroke_fill="#14040a")
    draw.rectangle([40, 208, 330, 272], fill=RED)
    draw.ellipse([58, 226, 86, 254], fill="#ffffff")
    small = fitted_font(TEXT_FONT, "EN DIRECT", 52, 220)
    draw.text((206, 240), "EN DIRECT", font=small, fill="#ffffff", anchor="mm")
    path = os.path.join(directory, "chyron.png")
    image.save(path)
    return path


def papier(directory, rng):
    """Piste B : CNews en papier découpé. Mur ardoise en lés, treillis et projecteurs, public de figurants."""
    mats = {}

    def flat(color, emission=0.0, alpha=1.0, grain=1.0):
        key = (color, emission, alpha, grain)
        if key not in mats:
            mats[key] = paper(f"papier_{len(mats)}", color, grain, emission, alpha)
        return mats[key]

    # Le mur : un fond ardoise, puis des lés verticaux séparés d'un jour, qui font chacun leur ombre.
    left, top, right, bottom = -MARGIN_X - 40, -MARGIN_Y - 40, WIDTH + MARGIN_X + 40, HEIGHT + MARGIN_Y + 40
    sheet("mur", rect(left, top, right, bottom), 9.0, flat("#151924"), None, 0, False)
    for i, x in enumerate(range(left - 20, right, 150)):
        sheet(f"le{i}", rect(x + 5, top + 10, x + 145, bottom - 10), 8.8, flat("#232a3a" if i % 2 else "#1d2331"), rng)
    # Le liseré rouge de CNews, qui court le long du mur sous le pupitre.
    sheet("liseré", rect(left, 172, right, 184), 8.5, flat(RED, 0.8), rng, jitter=0.4)
    sheet("liseré_bas", rect(left, 760, right, 768), 8.5, flat(RED, 0.8), rng, jitter=0.4)

    # Le vrai logo, collé sur le mur, avec sa marge blanche de papier découpé.
    path, ratio = logo_plate(directory, "logo", "cnews", "#000000")
    logo_top, height = 48, 98
    width = height * ratio
    x0 = 112
    sheet("logo_marge", rounded(x0 - 8, logo_top - 8, x0 + width + 8, logo_top + height + 8, 10), 8.0, flat("#f6f3ec"), rng)
    sheet("logo", rect(x0, logo_top, x0 + width, logo_top + height), 7.9, paper("logo", "#ffffff", 0.6, image=path), None, 1.0, False)
    # L'écran du titre, en haut à droite, entre le pupitre et les boutons du son.
    for name, box, image in (("titre", (1424, 36, 1718, 136), chyron_image(directory)),):
        x0, y0, x1, y1 = box
        sheet(f"{name}_cadre", rounded(x0, y0, x1, y1, 10), 7.6, flat("#0c0c0f"), rng)
        sheet(name, rect(x0 + 9, y0 + 9, x1 - 9, y1 - 9), 7.5, paper(name, "#ffffff", 0.4, 0.35, image=image), None, 1.0, False)

    # Le treillis du plafond, et ses projecteurs qui pendent.
    alu, alu_dark = flat("#6a707c"), flat("#474c57")
    sheet("treillis_haut", rect(left, -10, right, 8), 6.0, alu, rng)
    sheet("treillis_bas", rect(left, 26, right, 36), 6.0, alu, rng)
    for i, x in enumerate(range(left, right, 34)):
        strip(f"diag{i}", (x, 8), (x + 34, 26) if i % 2 else (x, 26), 4, 6.05, alu_dark)
    # Deux calques de papier calque : le faisceau large, très pâle, et son cœur plus clair.
    beam, core = flat("#fff7d8", 1.4, 0.07, 0.0), flat("#fffbe8", 1.8, 0.08, 0.0)
    for i, (x, lean) in enumerate(((-250, 1), (40, 1), (486, 1), (1392, -1), (1878, -1), (2170, -1))):
        cx, cy = x + lean * 8, 92
        a = math.radians(-22 * lean)
        body = [(cx + px * math.cos(a) - py * math.sin(a), cy + px * math.sin(a) + py * math.cos(a)) for px, py in rounded(-24, -40, 24, 34, 9)]
        strip(f"lyre_g{i}", (x - 20, 36), (cx - 22, cy - 6), 6, 5.7, alu_dark)
        strip(f"lyre_d{i}", (x + 20, 36), (cx + 22, cy - 6), 6, 5.7, alu_dark)
        sheet(f"projecteur{i}", body, 5.6, flat("#25272e"), rng)
        lx, ly = cx - 36 * math.sin(a), cy + 36 * math.cos(a)
        sheet(f"lentille{i}", circle(lx, ly, 21, 9, 24), 5.5, flat("#fff6cf", 3.0), rng)
        # Le faisceau : un calque de papier translucide, qui s'élargit vers le sol.
        far_x = lx + lean * 380
        sheet(f"faisceau{i}", [(lx - 18, ly), (lx + 18, ly), (far_x + 210, 1000), (far_x - 210, 1000)], 5.2, beam, rng)
        sheet(f"coeur{i}", [(lx - 9, ly), (lx + 9, ly), (far_x + 90, 1000), (far_x - 90, 1000)], 5.15, core, rng)

    # Le public, de chaque côté : quatre gradins, des figurants inventés qui regardent la table.
    for side, xs in ((-1, range(-298, 280, 56)), (1, range(1676, 2250, 56))):
        for row, (head_y, size, depth) in enumerate(((262, 0.82, 4.4), (368, 0.9, 3.9), (478, 0.98, 3.4), (592, 1.06, 2.9))):
            # Assis derrière le rebord de leur gradin : le rebord passe devant tout le rang.
            ledge = head_y + 50 * size
            sheet(f"gradin{side}{row}", rect(left if side < 0 else 1640, ledge, 330 if side < 0 else right, ledge + 44), depth - 0.1,
                  flat("#2c3242" if row % 2 else "#262b39"), rng)
            for k, x in enumerate(xs):
                extra(f"public{side}{row}{k}", x + rng.uniform(-6, 6), head_y + rng.uniform(-4, 4), size, depth + 0.02 * k, rng, CLOTHES,
                      look=-side * 0.9, mats=mats)

    # Le sol de la scène : des lattes qui fuient vers le centre, le bord rouge sous la table.
    sheet("sol", rect(left, 790, right, bottom), 2.4, flat("#2a1a21"), rng)
    for i, x in enumerate(range(-1500, WIDTH + 1500, 150)):
        strip(f"latte{i}", (960 + (x - 960) * 0.42, 800), (x, bottom), 4, 2.35, flat("#3a2530"))
    sheet("bord", rect(280, 796, 1640, 814), 2.0, flat(RED, 0.9), rng, jitter=0.5)
    # Le bureau blanc de l'émission, son liseré rouge et le logo sur sa façade.
    sheet("bureau", [(520, 818), (1400, 818), (1370, 932), (550, 932)], 1.6, flat("#efece4"), rng)
    sheet("bureau_liseré", rect(520, 818, 1400, 832), 1.55, flat(RED, 0.6), rng, jitter=0.5)
    plate, ratio = logo_plate(directory, "logo_bureau", "cnews", "#000000")
    lw = 62 * ratio
    sheet("bureau_logo", rect(960 - lw / 2, 852, 960 + lw / 2, 914), 1.5, paper("bureau_logo", "#ffffff", 0.5, image=plate), None, 1.0, False)

    # Les deux caméras du plateau, au premier plan, et leurs câbles.
    for side, cx in ((-1, 396), (1, 1376)):
        grey, dark = flat("#3a3d45"), flat("#1c1d22")
        for k, foot in enumerate((-70, 0, 70)):
            strip(f"pied{side}{k}", (cx, 900), (cx + foot * 1.25, HEIGHT + 60), 9, 1.2, dark, rng)
        sheet(f"colonne{side}", rect(cx - 9, 862, cx + 9, 905), 1.1, dark, rng)
        sheet(f"corps{side}", rounded(cx - 78, 806, cx + 66, 872, 12), 1.0, grey, rng)
        lens_x = cx - side * 96
        sheet(f"objectif{side}", rect(min(cx - side * 66, lens_x), 818, max(cx - side * 66, lens_x), 862), 0.98, dark, rng)
        sheet(f"lentille_cam{side}", circle(lens_x, 840, 13, 24, 20), 0.95, flat("#0d1018"), rng)
        sheet(f"reflet{side}", circle(lens_x + side * 2, 832, 4, 7, 10), 0.93, flat("#9fb6d8", 0.8), None, 0.8, False)
        sheet(f"viseur{side}", rect(cx - 50 + side * 20, 786, cx + 4 + side * 20, 808), 0.99, dark, rng)
        sheet(f"tally{side}", circle(cx + side * 40, 822, 6, 6, 14), 0.97, flat(RED, 4.0), rng)
        strip(f"cable{side}", (cx, 905), (cx + side * 420, bottom), 7, 1.9, flat("#101012"), rng)

    key_light()
    front_camera()


def led_wall_image(directory):
    """Le mur LED de CNews : un fond noir, de grandes bandes rouges en biais, des filets de lumière, la grille des dalles."""
    w, h = 4096, 1536
    bands = Image.new("RGB", (w, h), (0, 0, 0))
    draw = ImageDraw.Draw(bands)
    for k in range(-3, 12):
        x = k * 420
        color = ((150, 0, 16), (64, 0, 10), (26, 2, 8))[k % 3]
        draw.polygon([(x, h), (x + 190, h), (x + 190 + 760, 0), (x + 760, 0)], fill=color)
    bands = bands.filter(ImageFilter.GaussianBlur(30))
    lines = Image.new("RGB", (w, h), (0, 0, 0))
    draw = ImageDraw.Draw(lines)
    for k in range(-3, 12, 3):
        x = k * 420
        draw.line([(x + 190, h), (x + 190 + 760, 0)], fill=(255, 140, 150), width=7)
    lines = lines.filter(ImageFilter.GaussianBlur(2.5))
    image = ImageChops.add(ImageChops.add(Image.new("RGB", (w, h), (6, 6, 9)), bands), lines)
    draw = ImageDraw.Draw(image)
    for x in range(0, w, 128):
        draw.line([(x, 0), (x, h)], fill=(0, 0, 0), width=4)
    for y in range(0, h, 128):
        draw.line([(0, y), (w, y)], fill=(0, 0, 0), width=4)
    path = os.path.join(directory, "mur_led.png")
    image.save(path)
    return path


def elliptic_wall(name, mat, bottom, top, stretch=1.5):
    """Le mur du fond, en arc d'ellipse : il ferme le plateau et revient sur les côtés de l'image."""
    obj = curved_wall(name, (0, 0), 20, -70, 70, bottom, top, mat)
    obj.scale = (stretch, 1, 1)
    obj.location = (0, -4, 0)
    return obj


def soignee(directory, rng):
    """Piste A : CNews en 3D soignée. Sol laqué, mur LED courbe, treillis et lyres dans la brume, public en contre-jour."""
    box("sol", (0, 0, -0.05), (120, 90, 0.1), lacquer("sol", "#040405", 0.16))
    elliptic_wall("mur_led", picture("mur_led", led_wall_image(directory), 1.3), 0.0, 18.0)
    red = glow("neon", "#ff1a2a", 14)
    for z in (0.9, 17.2):
        neon = elliptic_wall(f"neon{z}", red, z, z + 0.16)
        neon.scale = (1.5 * 0.995, 0.995, 1)
    # La scène ronde, blanche laquée, et son anneau rouge.
    stage = lacquer("scene", "#e6e7ec", 0.15)
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=7, depth=0.3, location=(0, 6, 0.15))
    bpy.context.active_object.data.materials.append(stage)
    bpy.ops.mesh.primitive_torus_add(major_radius=7.02, minor_radius=0.04, location=(0, 6, 0.22), major_segments=128, minor_segments=8)
    bpy.context.active_object.data.materials.append(red)
    # Le bureau blanc de l'émission, son liseré et le logo sur sa façade.
    white = lacquer("bureau", "#d4d6db", 0.12)
    box("bureau", (0, -3, 0.5), (9.2, 1.3, 1.0), white, bevel=0.06)
    box("bureau_plateau", (0, -2.95, 1.02), (9.6, 1.5, 0.06), white, bevel=0.02)
    box("bureau_liseré", (0, -3.66, 0.14), (9.0, 0.02, 0.06), red)
    plate, ratio = logo_plate(directory, "logo_bureau", "cnews", "#000000")
    panel("bureau_logo", (0, -3.662, 0.56), 0.62 * ratio, 0.62, picture("bureau_logo", plate, 1.1))
    # Le treillis du plafond, les lyres, le logo lumineux et l'écran du titre qui y pendent.
    alu = surface("alu", "#a4a8b0", 0.3, 1.0)
    truss("treillis", -32, 32, 8, 13.0, alu)
    for x, target, energy in ((-18.5, (-16, 7.5, 1.6), 1.1e4), (-9.0, (-3, 5, 0.3), 2.0e4), (8.6, (3, 5, 0.3), 2.0e4), (18.5, (16, 7.5, 1.6), 1.1e4)):
        fixture(f"lyre{x}", (x, 8, 12.75), target, "#fff1d6", energy, 14)
    path, ratio = logo_plate(directory, "logo", "cnews", "#000000")
    box("caisson", (-14.0, 8.62, 11.63), (6.55, 0.3, 6.35 / ratio + 0.2), surface("caisson", "#0c0c0e", 0.3, 0.6), bevel=0.03)
    panel("logo", (-14.0, 8.46, 11.63), 6.35, 6.35 / ratio, picture("logo", path, 1.6))
    box("ecran_titre", (12.3, 8.62, 11.85), (6.1, 0.25, 2.1), surface("bord_ecran", "#0c0c0e", 0.3, 0.6), bevel=0.03)
    panel("titre", (12.3, 8.48, 11.85), 5.9, 5.9 / 3.14, picture("titre", chyron_image(directory), 1.4))
    for x in (-16.6, -11.4, 9.7, 14.9):
        tube(f"filin{x}", (x, 8.6, 12.85), (x, 8.6, 13.0 - 0.21), 0.012, alu)
    # Le public, de chaque côté, sur quatre gradins, en contre-jour.
    step = surface("gradin", "#121318", 0.5)
    mats = {}
    for side in (-1, 1):
        for row in range(4):
            y, z = 6 + row * 0.9, 0.05 + row * 0.5
            box(f"gradin{side}{row}", (side * 18.6, y + 0.2, z / 2), (12.6, 0.95, max(z, 0.05)), step)
            box(f"rebord{side}{row}", (side * 18.6, y - 0.27, z + 0.02), (12.6, 0.04, 0.03), glow(f"rebord{side}{row}", "#ff2a3a", 4))
            for k in range(20):
                x = side * (12.6 + k * 0.62 + rng.uniform(-0.06, 0.06))
                seated(f"public{side}{row}{k}", (x, y + rng.uniform(-0.05, 0.05), z), rng, CLOTHES, ["#e8b896", "#c48a64", "#8a5a3c", "#f0c8a8", "#5c3a26"],
                       ["#1c120c", "#4a2e18", "#b08a40", "#7a7a7a", "#0e0e0e"], mats)
        # Le contre-jour plonge sur le public depuis l'arrière : il découpe les têtes sans se refléter dans le sol.
        # Invisible dans les reflets : sinon le sol laqué en montre le rectangle blanc.
        area(f"contre{side}", (side * 16, 11, 7), 8, 7.0e3, "#7aa6ff", (math.radians(-36), 0, 0)).visible_glossy = False
        box(f"pilier{side}", (side * 14.6, 4.0, 4.5), (0.16, 0.16, 9), red)
    # Les deux caméras du plateau, au premier plan, de dos : leur viseur allumé.
    tv_camera("camera_g", (-4.2, -6.0, 1.2), -0.35)
    tv_camera("camera_d", (3.3, -6.2, 1.2), 0.3)
    area("cle", (0, 3, 12.5), 10, 9.0e3, "#eef2ff").visible_glossy = False
    # Le premier plan, doucement, par le dessus et de face, sans tache au sol.
    area("premier_plan", (0, -9, 6), 6, 900, "#ffe8d8", (math.radians(60), 0, 0)).visible_glossy = False


def studio_lens(scene):
    """La caméra du jeu, celle des plateaux : en (0, -15, 4.4), le cadre d'un 22 mm au centre, et une profondeur de champ de télé."""
    data = bpy.data.cameras.new("camera")
    data.lens = 22 * WIDTH / RENDER_WIDTH
    data.dof.use_dof = True
    data.dof.focus_distance = 19
    data.dof.aperture_fstop = 3.2
    camera = bpy.data.objects.new("camera", data)
    camera.location = (0, -15, 4.4)
    camera.rotation_euler = (math.radians(86), 0, 0)
    scene.collection.objects.link(camera)
    scene.camera = camera


def render(piste, samples):
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
    scene.cycles.denoiser = "OPTIX"
    scene.render.resolution_x, scene.render.resolution_y = RENDER_WIDTH, RENDER_HEIGHT
    scene.world = bpy.data.worlds.new("salle")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes["Background"]
    if piste == "papier":
        # Les couleurs franches du papier : la vue Standard (AgX les éteint).
        scene.view_settings.view_transform = "Standard"
        background.inputs["Color"].default_value = (*rgb("#8a90a6"), 1)
        background.inputs["Strength"].default_value = 0.55
    else:
        scene.view_settings.view_transform = "AgX"
        scene.view_settings.look = "AgX - Medium High Contrast"
        background.inputs["Color"].default_value = (0.002, 0.002, 0.004, 1)
        haze(scene, 0.0009)
        bloom(scene, threshold=1.6, strength=0.45)
    rng = random.Random(f"cnews-{piste}-1789")
    with tempfile.TemporaryDirectory() as directory:
        {"papier": papier, "soignee": soignee}[piste](directory, rng)
        if piste == "soignee":
            studio_lens(scene)
        path = os.path.join(directory, "render.png")
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        os.makedirs(OUT, exist_ok=True)
        target = os.path.join(OUT, f"cnews_{piste}.webp")
        Image.open(path).convert("RGB").save(target, "WEBP", quality=86, method=6)
    print(target, f"{os.path.getsize(target) / 1024:.0f} Ko", flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("piste", choices=["papier", "soignee"])
    parser.add_argument("--samples", type=int, default=96)
    args = parser.parse_args()
    render(args.piste, args.samples)


if __name__ == "__main__":
    main()
