"""Génère les variantes de mort à partir de la composition masse_100t : même chorégraphie, autre objet, autre onomatopée.

Usage : python3 tools/graphisme/effets/generer_morts.py
Puis, pour chacune : render --format png-sequence --fps 12, et planche.py <dossier> mort_<nom> 12 0.75 6 impact=3.
Un effet dont le nom commence par mort_ entre tout seul dans la rotation du jeu.
"""
import os
import re
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROPE = '<rect x="186" y="-300" width="8" height="{top}" fill="#d9c9a0" stroke="#111" stroke-width="2"/>'
PAPER = 'stroke="#fff" stroke-width="12" stroke-linejoin="round"'
INK = 'stroke="#111" stroke-width="4" stroke-linejoin="round"'


def twice(shape, fill):
    """Paper margin first, inked shape on top."""
    return f'<path d="{shape}" fill="{fill}" {PAPER}/><path d="{shape}" fill="{fill}" {INK}/>'


ANVIL = "M8 396 H304 L372 424 L304 452 H250 L228 522 L292 604 H88 L152 522 L130 452 H62 Z"
PIANO = "M26 392 H354 V560 H326 V604 H296 V560 H84 V604 H54 V560 H26 Z"
SAFE = "M46 372 H334 V590 H300 V604 H258 V590 H122 V604 H80 V590 H46 Z"
POT = "M40 604 L66 392 Q190 360 314 392 L340 604 Z"

KEYS = "".join(f'<rect x="{46 + i * 24}" y="500" width="22" height="50" fill="#f7f4ea" stroke="#111" stroke-width="2"/>' for i in range(12))
BLACK_KEYS = "".join(f'<rect x="{60 + i * 24}" y="500" width="13" height="30" fill="#111"/>' for i in range(11) if i % 7 not in (2, 6))

OBJECTS = {
    "enclume": ("KLONK !", ROPE.format(top=700) + twice(ANVIL, "#2b2e36")
                + '<polygon points="20,402 300,402 340,420 20,420" fill="#5d6372"/>'
                + '<text x="190" y="442" text-anchor="middle" font-family="Bangers" font-size="38" fill="#fff" letter-spacing="2">49.3</text>'),
    "piano": ("DZOOONG !", ROPE.format(top=694) + twice(PIANO, "#15151b")
              + '<polygon points="34,400 346,400 346,420 34,420" fill="#3b3b46"/>' + KEYS + BLACK_KEYS
              + '<rect x="130" y="436" width="120" height="42" rx="4" fill="#26262e" stroke="#c9a24a" stroke-width="3"/>'),
    "coffre_fort": ("CLONK !", ROPE.format(top=674) + twice(SAFE, "#6b7280")
                    + '<rect x="70" y="396" width="240" height="172" fill="#7d8592" stroke="#111" stroke-width="3"/>'
                    + '<circle cx="190" cy="470" r="46" fill="#3a3f4a" stroke="#111" stroke-width="4"/><circle cx="190" cy="470" r="30" fill="#c9cdd4" stroke="#111" stroke-width="3"/>'
                    + '<rect x="186" y="442" width="8" height="26" fill="#111"/><rect x="264" y="440" width="20" height="60" rx="4" fill="#23262e"/>'
                    + '<text x="190" y="552" text-anchor="middle" font-family="Bangers" font-size="30" fill="#fff" letter-spacing="2">BUDGET</text>'),
    "casserole": ("BONG !", '<rect x="330" y="-300" width="30" height="760" fill="#17181c" stroke="#fff" stroke-width="8"/>' + twice(POT, "#c8753f")
                  + '<path d="M66 392 Q190 360 314 392 L318 420 Q190 390 62 420 Z" fill="#e9a26a"/>'
                  + '<path d="M90 470 Q120 500 96 540 M270 450 Q240 490 286 540" fill="none" stroke="#8a4a22" stroke-width="7"/>'
                  + '<rect x="24" y="584" width="332" height="24" rx="10" fill="#e9a26a" stroke="#111" stroke-width="4"/>'),
}


def main():
    with open(os.path.join(HERE, "masse_100t/index.html"), encoding="utf8") as handle:
        template = handle.read()
    for name, (word, drawing) in OBJECTS.items():
        folder = os.path.join(HERE, f"mort_{name}")
        os.makedirs(folder, exist_ok=True)
        shutil.copy(os.path.join(HERE, "masse_100t/gsap.min.js"), folder)
        shutil.copytree(os.path.join(HERE, "masse_100t/fontes"), os.path.join(folder, "fontes"), dirs_exist_ok=True)
        page = re.sub(r'(<svg width="380" height="640"[^>]*>).*?(</svg>)', lambda m: m.group(1) + drawing + m.group(2), template, count=1, flags=re.S)
        page = page.replace("BADABOUM !", word).replace("<title>Masse de 100 tonnes</title>", f"<title>Mort : {name}</title>")
        page = page.replace('      <div id="katakana">ドカーン</div>\n', "")
        page = re.sub(r'    tl\.fromTo\("#katakana".*?\n.*?\n    tl\.to\("#katakana".*?\n', "", page, flags=re.S)
        with open(os.path.join(folder, "index.html"), "w", encoding="utf8") as handle:
            handle.write(page)


if __name__ == "__main__":
    main()
