"""Dessine la tête d'un personnage qui n'a aucun portrait sous licence libre : une silhouette de papier gris, un
point d'interrogation à la place du visage, et la même mâchoire qui s'ouvre que les autres marionnettes.

Lancer avec uv, depuis la racine du projet :
  uv run --python 3.11 --with mediapipe --with opencv-python-headless --with pillow --with numpy --with rembg \
    --with "onnxruntime-gpu[cuda,cudnn]" python tools/graphisme/tete_dessinee.py <id> [<id> ...]

Le portrait du personnage (data/collecte/portraits.json) porte alors `dessin` à la place d'une photo : la découpe ne le
reprend pas. Dès qu'une photo libre existe, elle remplace le dessin par le chemin ordinaire.
"""
import sys

import cv2
import numpy as np

import decoupe as d

SIZE = (360, 460)             # the drawing, in the pixels of an aligned face (240 from forehead to chin)
PAPER = (203, 199, 196)       # BGR, grey card
INK = (92, 84, 80)
CENTRE, RADII = (180, 226), (116, 150)
MOUTH_Y, CHIN_Y = 304, 368
EYES = ((140, 204, 34), (220, 204, 34))


def head_shape():
    """An egg, a little wider at the temples than at the chin."""
    points = cv2.ellipse2Poly(CENTRE, RADII, 0, 0, 360, 4).astype(np.float32)
    below = points[:, 1] > CENTRE[1]
    points[below, 0] = CENTRE[0] + (points[below, 0] - CENTRE[0]) * (1 - 0.22 * (points[below, 1] - CENTRE[1]) / RADII[1])
    return points


def draw(character_id):
    width, height = SIZE
    color = np.zeros((height, width, 3), np.uint8)
    color[:] = PAPER
    cv2.putText(color, "?", (CENTRE[0] - 62, 268), cv2.FONT_HERSHEY_DUPLEX, 6.4, INK, 15, cv2.LINE_AA)
    head_alpha = d.fill_antialiased([head_shape()], SIZE)
    # The jaw: everything under a mouth line that dips a little, as a paper puppet's does.
    mouth = np.array([[x, MOUTH_Y + 9 * np.sin(np.pi * x / width)] for x in range(0, width + 1, 12)], np.float32)
    jaw = np.concatenate([mouth, [[width, height], [0, height]]]).astype(np.float32)
    jaw_alpha = cv2.bitwise_and(d.fill_antialiased([jaw], SIZE), head_alpha)
    cavity = np.zeros_like(color)
    cavity[:] = d.CAVITY_COLOR
    cv2.ellipse(cavity, (CENTRE[0], CHIN_Y - 14), (46, 30), 0, 0, 360, d.TONGUE_COLOR, -1, cv2.LINE_AA)
    return d.save_pieces(character_id, color, cavity, head_alpha, jaw_alpha, EYES, (CENTRE[0], MOUTH_Y + 9), (CENTRE[0], CHIN_Y))


if __name__ == "__main__":
    for wanted in sys.argv[1:]:
        print(wanted, draw(wanted)["pieces"])
