"""Génère les éléments dessinés du jeu (corps, yeux, cadres de cartes, décor) en SVG, puis en WebP transparents.

Lancer avec uv :
  uv run --with pillow python tools/graphisme/dessins.py

Tout est découpé à la main en polygones, façon papier : pas de courbes propres dans ce qui est « moche exprès ».
Les cadres, eux, sont soignés : le contraste est le gag.
"""
import glob
import io
import math
import os
import subprocess
import tempfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTPUT = os.path.join(ROOT, "assets/game")
CHROME = subprocess.run(["npx", "hyperframes", "browser", "path"], cwd=ROOT, capture_output=True,
                        text=True).stdout.strip().splitlines()[-1]

RAY_COUNT = 14
RAY_WIDTH = math.tau / RAY_COUNT / 2

CAMP_BODIES = {
    "insoumis": {"jacket": "#7a1f1f", "shirt": "#f4efe6", "tie": "#c8102e"},
    "socialistes": {"jacket": "#3a2a45", "shirt": "#f7dfe6", "tie": "#e0457b"},
    "ecologistes": {"jacket": "#35573a", "shirt": "#eef3d8", "tie": "#7fc241"},
    "macronie": {"jacket": "#1f2a55", "shirt": "#ffffff", "tie": "#f2c230"},
    "republicains": {"jacket": "#191c26", "shirt": "#a9cdf0", "tie": "#1e4fa3"},
    "rn": {"jacket": "#12204a", "shirt": "#e9edf5", "tie": "#d32a2a"},
    "reconquete": {"jacket": "#26262b", "shirt": "#e7e2d2", "tie": "#6b4bb8"},
    "societe_civile": {"jacket": "#6d6a60", "shirt": "#f2eee2", "tie": "#b8862d"},
}

def body_svg(jacket, shirt, tie):
    """Tiny paper body: jacket, shirt, tie, stub arms and legs. Neck at the top center."""
    pieces = f"""
    <polygon points="118,214 98,262 146,262 150,214" fill="#22222a"/>
    <polygon points="170,214 172,262 222,262 202,214" fill="#22222a"/>
    <polygon points="84,262 148,258 150,280 80,282" fill="#0d0d10"/>
    <polygon points="170,258 236,262 240,282 168,280" fill="#0d0d10"/>
    <polygon points="92,58 40,122 58,166 88,116" fill="{jacket}"/>
    <polygon points="228,58 280,122 262,166 232,116" fill="{jacket}"/>
    <polygon points="40,122 28,152 56,170 62,160" fill="#e9c7a8"/>
    <polygon points="280,122 292,152 264,170 258,160" fill="#e9c7a8"/>
    <polygon points="112,28 208,28 244,70 234,222 86,222 76,70" fill="{jacket}"/>
    <polygon points="130,28 190,28 176,126 160,150 144,126" fill="{shirt}"/>
    <polygon points="150,44 170,44 176,114 160,142 144,114" fill="{tie}"/>
    <polygon points="150,44 170,44 166,62 154,62" fill="{tie}" stroke="#00000033" stroke-width="1"/>
    <polygon points="130,28 112,28 104,84 144,128" fill="#ffffff22"/>
    <polygon points="190,28 208,28 216,84 176,128" fill="#00000022"/>
    """
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="320" height="300" viewBox="0 0 320 300">
    <g fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="miter">{pieces}</g>{pieces}</svg>"""


def prison_body_svg():
    """Same paper body in a striped uniform."""
    stripes = "".join(f'<polygon points="70,{y} 250,{y} 250,{y + 16} 70,{y + 16}" fill="#15151a"/>' for y in range(44, 222, 32))
    shape = "112,28 208,28 244,70 234,222 86,222 76,70"
    arms = '<polygon points="92,58 40,122 58,166 88,116" fill="#f2efe4"/><polygon points="228,58 280,122 262,166 232,116" fill="#f2efe4"/>'
    hands = '<polygon points="40,122 28,152 56,170 62,160" fill="#e9c7a8"/><polygon points="280,122 292,152 264,170 258,160" fill="#e9c7a8"/>'
    legs = '<polygon points="118,214 98,262 146,262 150,214" fill="#f2efe4"/><polygon points="170,214 172,262 222,262 202,214" fill="#f2efe4"/>' \
        '<polygon points="84,262 148,258 150,280 80,282" fill="#0d0d10"/><polygon points="170,258 236,262 240,282 168,280" fill="#0d0d10"/>'
    silhouette = f'{legs}{arms}{hands}<polygon points="{shape}" fill="#f2efe4"/>'
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="320" height="300" viewBox="0 0 320 300">
    <defs><clipPath id="torso"><polygon points="{shape}"/></clipPath></defs>
    <g fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="miter">{silhouette}</g>{silhouette}
    <g clip-path="url(#torso)">{stripes}</g></svg>"""


def plaster_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <g transform="rotate(-38 64 64)"><rect x="10" y="44" width="108" height="40" rx="10" fill="#f3c9a0" stroke="#fff" stroke-width="5"/>
    <rect x="44" y="48" width="40" height="32" fill="#fbe7d0"/><circle cx="24" cy="58" r="2.4" fill="#a97d55"/><circle cx="24" cy="70" r="2.4" fill="#a97d55"/>
    <circle cx="104" cy="58" r="2.4" fill="#a97d55"/><circle cx="104" cy="70" r="2.4" fill="#a97d55"/></g></svg>"""


def eyes_cross_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <polygon points="64,6 106,18 122,62 108,106 64,122 20,108 6,64 20,20" fill="#fff" stroke="#111" stroke-width="5"/>
    <path d="M32 32 L96 96 M96 32 L32 96" stroke="#111" stroke-width="17" stroke-linecap="square"/></svg>"""


def eyes_popped_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <circle cx="64" cy="64" r="58" fill="#fff" stroke="#111" stroke-width="5"/>
    <path d="M14 48 L34 54 L28 62 M114 44 L96 54 L104 60 M20 92 L38 82 L44 94 M106 94 L88 84 L84 96"
      stroke="#d4242d" stroke-width="3.5" fill="none"/>
    <circle cx="64" cy="66" r="13" fill="#111"/><circle cx="59" cy="61" r="4" fill="#fff"/></svg>"""


def eyes_tears_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" width="128" height="256" viewBox="0 0 128 256">
    <polygon points="64,6 106,18 122,62 108,106 64,122 20,108 6,64 20,20" fill="#fff" stroke="#111" stroke-width="5"/>
    <path d="M26 70 Q64 104 102 70" stroke="#111" stroke-width="11" fill="none" stroke-linecap="round"/>
    <polygon points="34,88 94,88 108,250 20,250" fill="#5bb9f2" stroke="#fff" stroke-width="5"/>
    <path d="M46 120 L42 220 M82 120 L86 220" stroke="#fff" stroke-width="5"/></svg>"""


def star_svg():
    return """<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <polygon points="48,4 60,36 94,38 67,58 76,92 48,73 20,92 29,58 2,38 36,36" fill="#ffe01a" stroke="#111" stroke-width="5"/>
    </svg>"""


def art_background_svg():
    """Grey spotlight tinted by camp at run time. Rays stay faint: the puppet must be what you see first."""
    rays = "".join(
        f'<polygon points="226,190 {226 + 700 * math.cos(angle):.0f},{190 + 700 * math.sin(angle):.0f} '
        f'{226 + 700 * math.cos(angle + RAY_WIDTH):.0f},{190 + 700 * math.sin(angle + RAY_WIDTH):.0f}" fill="#ffffff" opacity=".06"/>'
        for angle in [n * math.tau / RAY_COUNT for n in range(RAY_COUNT)])
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="452" height="426" viewBox="0 0 452 426">
    <defs><radialGradient id="spot" cx=".5" cy=".42" r=".72">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#bdbdbd"/>
      <stop offset="1" stop-color="#5e5e5e"/></radialGradient></defs>
    <rect width="452" height="426" fill="url(#spot)"/>{rays}</svg>"""


def rasterize(svg, width, height):
    with tempfile.TemporaryDirectory() as directory:
        page = os.path.join(directory, "page.html")
        shot = os.path.join(directory, "shot.png")
        with open(page, "w", encoding="utf8") as handle:
            handle.write(f"<!doctype html><html><body style='margin:0;background:transparent'>{svg}</body></html>")
        subprocess.run([CHROME, "--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
                        "--default-background-color=00000000", f"--window-size={width},{height}",
                        f"--screenshot={shot}", f"file://{page}"], check=True, capture_output=True)
        with open(shot, "rb") as handle:
            return Image.open(io.BytesIO(handle.read())).convert("RGBA").copy()


def save(svg, relative_path, width, height, quality=88):
    target = os.path.join(OUTPUT, relative_path)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    rasterize(svg, width, height).save(target, "WEBP", quality=quality, method=6)


def main():
    for camp, colors in CAMP_BODIES.items():
        save(body_svg(colors["jacket"], colors["shirt"], colors["tie"]), f"corps/{camp}.webp", 320, 300)
    save(prison_body_svg(), "corps/prison.webp", 320, 300)
    save(plaster_svg(), "effets/pansement.webp", 128, 128)
    save(eyes_cross_svg(), "yeux/croix.webp", 128, 128)
    save(eyes_popped_svg(), "yeux/exorbites.webp", 128, 128)
    save(eyes_tears_svg(), "yeux/larmes.webp", 128, 256)
    save(star_svg(), "effets/etoile.webp", 96, 96)
    save(art_background_svg(), "carte/fond_art.webp", 452, 426)
    total = sum(os.path.getsize(path) for path in glob.glob(os.path.join(OUTPUT, "*", "*.webp")))
    print(f"assets/game : {total / 1024:.0f} Ko")


if __name__ == "__main__":
    main()
