"""A cartoon explosion in real 3D: hot puffs burst out, cool down into smoke and rise, behind a shock ring and a spray
of embers. Played over a politician blown off the board by a huge blow (combat deaths, 7 November 2026: the deaths
come back, spectacular, but nothing falls on a politician). Cel-shaded like the manga effects: three flat bands per
puff, from white-hot at the heart to dark red at the rim, then grey smoke.

  uv run --no-project --python 3.11 --with bpy --with pillow python tools/graphisme/explosion_3d.py [--samples 48] [--out dir]
  then: uv run --with pillow python tools/graphisme/planche.py <dir> explosion 24 1 4 ancre=0.5,0.55
  and:  uv run --with pillow python tools/graphisme/manifest.py

Frames of 320×320 on a transparent background, orthographic camera from the front. The blast's heart is at the middle
of the frame, a little under it: the smoke rises.
"""
import argparse
import math
import os
import random
import sys
import tempfile

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio_kit import link, rgb  # noqa: E402

SIZE = 320
FRAMES = 16
PUFFS = 22
EMBERS = 14
SEED = 7
# Heat from 1 (white-hot) to 0 (cold smoke): the heart, middle and rim bands of a puff at that heat.
HEAT_BANDS = [
    (1.0, ("#ffffff", "#fff3a0", "#ffb020")),
    (0.75, ("#fff6b0", "#ffc030", "#ff6a10")),
    (0.5, ("#ffb43a", "#ff6a14", "#c8241a")),
    (0.3, ("#e8602a", "#a8281c", "#4a1c1c")),
    (0.12, ("#6a5a58", "#4a4248", "#2a262e")),
    (0.0, ("#5a5660", "#3e3a44", "#26242c")),
]


def ease_out(t):
    return 1 - (1 - t) ** 3


def mix(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def bands_at(heat):
    """The three band colours of a puff at this heat, blended between the two nearest steps."""
    for (high, upper), (low, lower) in zip(HEAT_BANDS, HEAT_BANDS[1:]):
        if heat >= low:
            t = (heat - low) / (high - low)
            return [mix(rgb(c_low), rgb(c_high), t) for c_low, c_high in zip(lower, upper)]
    return [rgb(c) for c in HEAT_BANDS[-1][1]]


def toon_material(name):
    """Cel shading on an emissive puff: the facing ratio picks one of three flat bands; `alpha` fades it out."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    weight = nodes.new("ShaderNodeLayerWeight")
    weight.inputs["Blend"].default_value = 0.45
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[1].position = 0.38
    ramp.color_ramp.elements.new(0.72)
    emission = nodes.new("ShaderNodeEmission")
    transparent = nodes.new("ShaderNodeBsdfTransparent")
    blend = nodes.new("ShaderNodeMixShader")
    links.new(weight.outputs["Facing"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], emission.inputs["Color"])
    links.new(transparent.outputs["BSDF"], blend.inputs[1])
    links.new(emission.outputs["Emission"], blend.inputs[2])
    links.new(blend.outputs["Shader"], output.inputs["Surface"])
    return mat, ramp, emission, blend


def set_look(parts, heat, alpha, strength):
    _, ramp, emission, blend = parts
    for element, color in zip(ramp.color_ramp.elements, bands_at(heat)):
        element.color = (*color, 1)
    emission.inputs["Strength"].default_value = strength
    blend.inputs["Fac"].default_value = max(0.0, min(1.0, alpha))


def puff_mesh(name, radius, rng):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=20, radius=radius)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.shade_smooth()
    texture = bpy.data.textures.new(f"{name}_nuage", "CLOUDS")
    texture.noise_scale = 0.32
    texture.noise_depth = 2
    displace = obj.modifiers.new("bosses", "DISPLACE")
    displace.texture = texture
    displace.texture_coords = "GLOBAL"
    displace.strength = radius * 0.55
    displace.mid_level = 0.5
    obj.rotation_euler = (rng.uniform(0, 6.3), rng.uniform(0, 6.3), rng.uniform(0, 6.3))
    return obj


def scatter_direction(index, rng):
    """All around, evenly (one slice of the circle each), a little toward or away from the camera, a little more up."""
    angle = (index + rng.uniform(0.1, 0.9)) / PUFFS * 2 * math.pi
    lift = 0.2
    return Vector((math.cos(angle), rng.uniform(-0.35, 0.35), math.sin(angle) * 0.85 + lift)).normalized()


def build(rng):
    puffs = []
    for index in range(PUFFS):
        size = rng.uniform(0.3, 0.5) if index % 2 else rng.uniform(0.42, 0.58)
        obj = puff_mesh(f"bouffee{index}", 1.0, rng)
        parts = toon_material(f"feu{index}")
        obj.data.materials.append(parts[0])
        # Every other puff stays near the heart: the blast is full, not a ring.
        distance = rng.uniform(0.95, 1.4) if index % 2 else rng.uniform(0.35, 0.7)
        puffs.append({"obj": obj, "parts": parts, "size": size, "dir": scatter_direction(index, rng), "dist": distance,
                      "delay": rng.uniform(0.0, 0.12), "rise": rng.uniform(0.35, 0.8)})
    core = puff_mesh("coeur", 1.0, rng)
    core_parts = toon_material("coeur")
    core.data.materials.append(core_parts[0])
    bpy.ops.mesh.primitive_torus_add(major_radius=1.0, minor_radius=0.035, major_segments=96, minor_segments=12)
    ring = bpy.context.active_object
    ring.rotation_euler = (math.radians(90), 0, 0)
    ring_parts = toon_material("onde")
    ring.data.materials.append(ring_parts[0])
    embers = []
    for index in range(EMBERS):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0)
        obj = bpy.context.active_object
        parts = toon_material(f"braise{index}")
        obj.data.materials.append(parts[0])
        angle = rng.uniform(0, 2 * math.pi)
        embers.append({"obj": obj, "parts": parts, "dir": Vector((math.cos(angle), rng.uniform(-0.2, 0.2), math.sin(angle) + 0.35)),
                       "speed": rng.uniform(1.8, 2.6), "size": rng.uniform(0.03, 0.06)})
    return puffs, (core, core_parts), (ring, ring_parts), embers


def pose(frame, puffs, core, ring, embers):
    t = (frame + 0.5) / FRAMES
    for puff in puffs:
        local = max(0.0, (t - puff["delay"]) / (1 - puff["delay"]))
        grow = ease_out(min(1.0, local * 2.4))
        position = puff["dir"] * (0.12 + puff["dist"] * grow)
        position.z += puff["rise"] * local ** 2
        puff["obj"].location = position
        scale = puff["size"] * (0.3 + 0.85 * grow) * (1 + 0.25 * local)
        puff["obj"].scale = (scale, scale, scale)
        heat = max(0.0, 1.0 - local * 1.35 - (puff["dist"] - 0.7) * 0.25)
        alpha = 1.0 if local < 0.62 else max(0.0, 1 - (local - 0.62) / 0.38)
        set_look(puff["parts"], heat, alpha if local > 0 else 0.0, 1.6 + heat * 2.4)
    core_obj, core_parts = core
    core_scale = 0.6 * ease_out(min(1.0, t * 6)) * max(0.0, 1 - t * 3.4)
    core_obj.scale = (max(core_scale, 0.001),) * 3
    set_look(core_parts, 1.0, 1.0 if core_scale > 0.05 else 0.0, 5.0)
    ring_obj, ring_parts = ring
    ring_scale = 0.3 + 1.6 * ease_out(min(1.0, t * 3.4))
    ring_obj.scale = (ring_scale, ring_scale, 1.0)
    set_look(ring_parts, 0.95, max(0.0, 1 - t * 3.6), 4.0)
    for ember in embers:
        travel = ember["speed"] * ease_out(min(1.0, t * 1.6))
        position = ember["dir"] * travel
        position.z -= 1.1 * t ** 2
        ember["obj"].location = position
        ember["obj"].scale = (ember["size"],) * 3
        set_look(ember["parts"], max(0.0, 0.95 - t * 0.9), max(0.0, 1 - t * 1.5), 6.0)


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
    scene.cycles.transparent_max_bounces = 32
    scene.render.resolution_x = scene.render.resolution_y = SIZE
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Standard"
    rng = random.Random(SEED)
    puffs, core, ring, embers = build(rng)
    camera_data = bpy.data.cameras.new("camera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 4.6
    camera = bpy.data.objects.new("camera", camera_data)
    camera.location = (0, -10, 0.3)
    camera.rotation_euler = (math.radians(90), 0, 0)
    link(camera)
    scene.camera = camera
    os.makedirs(out_dir, exist_ok=True)
    for frame in range(FRAMES):
        pose(frame, puffs, core, ring, embers)
        scene.render.filepath = os.path.join(out_dir, f"{frame:03d}.png")
        bpy.ops.render.render(write_still=True)
    print("images", FRAMES, out_dir, flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=48)
    parser.add_argument("--out", default=os.path.join(tempfile.gettempdir(), "explosion"))
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
    render(args.samples, args.out)


if __name__ == "__main__":
    main()
