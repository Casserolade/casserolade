"""Les images des murs d'écrans des plateaux, dessinées en code : un panorama de Paris, la cour de l'Élysée,
un mur de grandes lettres, des lambris. Chacune rend le chemin du fichier qu'elle écrit.

Tout est dessiné avec Pillow : aucune photo, aucune image venue d'ailleurs.
"""
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Les polices des titres d'émission : une grasse droite et une italique à empattements (licences libres), quand la
# machine les a ; sinon, la police que l'appelant donne en repli.
BOLD_FONT = "/usr/share/fonts/truetype/lato/Lato-Black.ttf"
SERIF_ITALIC_FONT = "/usr/share/fonts/truetype/liberation/LiberationSerif-BoldItalic.ttf"


def font_or(path, fallback):
    """La police demandée si la machine l'a, sinon celle du jeu."""
    return path if os.path.exists(path) else fallback


def gradient(size, top, bottom):
    """Un dégradé vertical, du haut vers le bas."""
    width, height = size
    image = Image.new("RGB", size)
    draw = ImageDraw.Draw(image)
    for y in range(height):
        share = y / max(1, height - 1)
        draw.line((0, y, width, y), fill=tuple(int(top[c] + (bottom[c] - top[c]) * share) for c in range(3)))
    return image


def fitted(path, text, start, max_width):
    size = start
    font = ImageFont.truetype(path, size)
    while font.getlength(text) > max_width and size > 12:
        size -= 4
        font = ImageFont.truetype(path, size)
    return font


def skyline(path, size, rng, sky_top, sky_bottom, city, windows, title=None, title_font=None):
    """Paris vu d'un toit, à l'heure où les fenêtres s'allument : le ciel, la tour Eiffel, des immeubles serrés.
    `title` s'écrit en grandes lettres pâles dans le ciel, comme le nom de l'émission sur un mur d'écrans."""
    width, height = size
    image = gradient(size, sky_top, sky_bottom)
    draw = ImageDraw.Draw(image)
    horizon = int(height * 0.74)
    # Une lueur au ras de l'horizon.
    glow = Image.new("RGB", size, (0, 0, 0))
    ImageDraw.Draw(glow).ellipse((-width * 0.2, horizon - height * 0.22, width * 1.2, horizon + height * 0.3), fill=tuple(min(255, c + 60) for c in sky_bottom))
    image = Image.blend(image, glow.filter(ImageFilter.GaussianBlur(height // 10)), 0.35)
    draw = ImageDraw.Draw(image)
    if title:
        font = fitted(title_font, title, int(height * 0.34), width * 0.5)
        layer = Image.new("RGBA", size, (0, 0, 0, 0))
        for x in (width * 0.25, width * 0.75):
            ImageDraw.Draw(layer).text((x, height * 0.3), title, font=font, fill=(255, 255, 255, 84), anchor="mm")
        image = Image.alpha_composite(image.convert("RGBA"), layer).convert("RGB")
        draw = ImageDraw.Draw(image)
    # Les immeubles lointains, puis les proches, plus sombres.
    for depth, (shade, low, high) in enumerate(((0.55, 0.04, 0.1), (1.0, -0.04, 0.09))):
        tone = tuple(int(city[c] * shade + sky_bottom[c] * (1 - shade)) for c in range(3))
        x = -rng.randrange(0, 40)
        while x < width:
            block = rng.randrange(int(width * 0.012), int(width * 0.04))
            top = horizon - int(height * rng.uniform(low, high))
            draw.rectangle((x, top, x + block, height), fill=tone)
            if rng.random() < 0.25:
                draw.polygon([(x, top), (x + block / 2, top - block * 0.35), (x + block, top)], fill=tone)
            if depth:
                for wy in range(top + 8, height, 14):
                    for wx in range(x + 5, x + block - 5, 9):
                        if rng.random() < 0.2:
                            draw.rectangle((wx, wy, wx + 3, wy + 5), fill=windows)
            x += block + rng.randrange(0, 6)
    # La tour Eiffel, au tiers de l'image : trois étages, de plus en plus fins, et sa pointe.
    for centre in (width * 0.34, width * 0.84):
        base, top = horizon + int(height * 0.02), int(height * 0.2)
        spread = height * 0.13
        tower = tuple(int(c * 0.55) for c in city)
        draw.polygon([(centre - spread, base), (centre - spread * 0.42, base - (base - top) * 0.3), (centre + spread * 0.42, base - (base - top) * 0.3), (centre + spread, base)], fill=tower)
        draw.polygon([(centre - spread * 0.42, base - (base - top) * 0.3), (centre - spread * 0.2, base - (base - top) * 0.58), (centre + spread * 0.2, base - (base - top) * 0.58), (centre + spread * 0.42, base - (base - top) * 0.3)], fill=tower)
        draw.polygon([(centre - spread * 0.2, base - (base - top) * 0.58), (centre - 3, top), (centre + 3, top), (centre + spread * 0.2, base - (base - top) * 0.58)], fill=tower)
        draw.line((centre, top, centre, top - height * 0.05), fill=tower, width=3)
        # L'arche du pied, et les lumières de la tour.
        draw.pieslice((centre - spread * 0.62, base - spread * 0.5, centre + spread * 0.62, base + spread * 0.9), 180, 360, fill=tuple(int(c) for c in sky_bottom))
        for step in range(22):
            share = step / 21
            y = base - (base - top) * share
            half = spread * (1 - share) ** 1.7 * 0.9 + 2
            for sx in (-half, half):
                draw.ellipse((centre + sx - 2, y - 2, centre + sx + 2, y + 2), fill=windows)
    image.save(path)
    return path


def palace(path, size, rng):
    """La cour d'honneur de l'Élysée à la tombée du jour : un ciel bleu nuit, la façade de pierre éclairée, ses hautes
    fenêtres allumées, son perron, ses drapeaux, le gravier."""
    width, height = size
    image = gradient(size, (6, 12, 48), (58, 70, 140))
    draw = ImageDraw.Draw(image)
    ground = int(height * 0.74)
    stone, shadow, lit, slate = (168, 136, 96), (104, 80, 52), (255, 222, 128), (34, 40, 60)
    draw.rectangle((0, ground, width, height), fill=(120, 104, 86))
    for _ in range(int(width * height / 900)):
        x, y = rng.randrange(0, width), rng.randrange(ground, height)
        draw.point((x, y), fill=(150, 132, 108))

    def wing(left, right, top, floors):
        draw.rectangle((left, top, right, ground), fill=stone)
        draw.rectangle((left, top - height * 0.012, right, top), fill=shadow)
        # Le toit d'ardoise et ses lucarnes.
        roof = top - int(height * 0.1)
        draw.polygon([(left, top), (left + width * 0.012, roof), (right - width * 0.012, roof), (right, top)], fill=slate)
        bay = max(1, int((right - left) / (width * 0.034)))
        for index in range(bay):
            cx = left + (right - left) * (index + 0.5) / bay
            half = (right - left) / bay * 0.26
            for floor in range(floors):
                low = ground - (ground - top) * floor / floors - height * 0.02
                high = low - (ground - top) / floors * 0.72
                draw.rectangle((cx - half, high, cx + half, low), fill=lit)
                draw.pieslice((cx - half, high - half, cx + half, high + half), 180, 360, fill=lit)
                draw.line((cx, high - half, cx, low), fill=shadow, width=2)
                draw.line((cx - half, (high + low) / 2, cx + half, (high + low) / 2), fill=shadow, width=2)
            if index % 2 == 0:
                draw.rectangle((cx - half * 0.7, roof + height * 0.03, cx + half * 0.7, top - height * 0.012), fill=stone)
                draw.rectangle((cx - half * 0.4, roof + height * 0.045, cx + half * 0.4, top - height * 0.02), fill=lit)

    wing(0, int(width * 0.3), int(height * 0.4), 2)
    wing(int(width * 0.7), width, int(height * 0.4), 2)
    wing(int(width * 0.3), int(width * 0.7), int(height * 0.3), 2)
    # Le pavillon central : un fronton, quatre colonnes, le perron et son tapis rouge.
    left, right, top = int(width * 0.43), int(width * 0.57), int(height * 0.3)
    draw.polygon([(left - 10, top), (width / 2, top - height * 0.09), (right + 10, top)], fill=stone, outline=shadow)
    for index in range(4):
        cx = left + (right - left) * (index + 0.5) / 4
        draw.rectangle((cx - width * 0.006, top + height * 0.02, cx + width * 0.006, ground), fill=(240, 220, 180))
    draw.polygon([(left - width * 0.02, ground), (right + width * 0.02, ground), (right + width * 0.05, ground + height * 0.06), (left - width * 0.05, ground + height * 0.06)], fill=(200, 180, 150))
    draw.polygon([(width * 0.485, ground - height * 0.02), (width * 0.515, ground - height * 0.02), (width * 0.54, height), (width * 0.46, height)], fill=(170, 24, 30))
    # Les drapeaux, au-dessus du fronton.
    pole = top - height * 0.09
    draw.line((width / 2, pole, width / 2, pole - height * 0.12), fill=(230, 230, 230), width=3)
    flag_w, flag_h = width * 0.012, height * 0.05
    for index, color in enumerate(((0, 60, 160), (245, 245, 245), (220, 30, 40))):
        draw.rectangle((width / 2 + index * flag_w, pole - height * 0.12, width / 2 + (index + 1) * flag_w, pole - height * 0.12 + flag_h), fill=color)
    image = image.filter(ImageFilter.GaussianBlur(1.2))
    image.save(path)
    return path


def letters_wall(path, size, lines, color, background, font_path, tilt=0):
    """Un mur d'écrans couvert de très grandes lettres, qui débordent : on n'en lit jamais qu'un morceau."""
    width, height = size
    image = Image.new("RGB", size, background)
    draw = ImageDraw.Draw(image)
    row = height / len(lines)
    for index, text in enumerate(lines):
        font = ImageFont.truetype(font_path, int(row * 1.02))
        length = font.getlength(text + "   ")
        x = -(index * 0.37 * length) % length - length
        while x < width:
            draw.text((x, row * (index + 0.5)), text, font=font, fill=color, anchor="lm")
            x += length
    if tilt:
        image = image.rotate(tilt, resample=Image.BICUBIC, fillcolor=background)
    image.save(path)
    return path


def title_card(path, size, text, color, background, font_path, scale=0.7, stroke=None, stroke_width=0):
    """Le titre d'une émission sur son fond, pour le devant d'un bureau ou une enseigne."""
    image = Image.new("RGB", size, background)
    width, height = size
    font = fitted(font_path, text, int(height * scale), width * 0.92)
    ImageDraw.Draw(image).text((width / 2, height / 2), text, font=font, fill=color, anchor="mm", stroke_width=stroke_width, stroke_fill=stroke or color)
    image.save(path)
    return path


def slats(path, size, rng, tones, seam, slat=28):
    """Un mur de lattes de bois verticales : des teintes voisines, un joint sombre entre deux lattes."""
    width, height = size
    image = Image.new("RGB", size)
    draw = ImageDraw.Draw(image)
    for x in range(0, width, slat):
        draw.rectangle((x, 0, x + slat, height), fill=rng.choice(tones))
        draw.rectangle((x, 0, x + 4, height), fill=seam)
    image.save(path)
    return path


def carpet(path, size, base, ring, rings, text=None, text_color=None, font_path=None):
    """Un tapis rond vu de dessus : des anneaux clairs sur un fond de couleur, et un titre en arc en travers."""
    side = size
    image = Image.new("RGB", (side, side), (6, 8, 16))
    draw = ImageDraw.Draw(image)
    draw.ellipse((side * 0.02, side * 0.02, side * 0.98, side * 0.98), fill=base)
    for share in rings:
        inset = side * (1 - share) / 2
        draw.ellipse((inset, inset, side - inset, side - inset), outline=ring, width=max(3, side // 110))
    if text:
        font = fitted(font_path, text, side // 7, side * 0.74)
        draw.text((side / 2, side * 0.7), text, font=font, fill=text_color, anchor="mm")
    image.save(path)
    return path
