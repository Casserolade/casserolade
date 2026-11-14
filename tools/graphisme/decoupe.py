"""Découpe un portrait en pièces de rig : tête, mâchoire et repères pour les yeux dessinés.

Lancer avec uv :
  uv run --python 3.11 --with mediapipe --with opencv-python-headless --with pillow --with numpy --with rembg \
    --with "onnxruntime-gpu[cuda,cudnn]" python tools/graphisme/decoupe.py macron sarkozy lepen     # ou --all
Sans carte graphique : `--with onnxruntime` à la place, quelques secondes de plus par tête.

La silhouette vient du détourage BiRefNet (licence MIT, par rembg) : le crâne, les cheveux et les oreilles, tels
qu'ils sont. La segmentation mediapipe n'écarte plus que ce qui n'est pas la tête : les vêtements au-dessus de la
bouche (la veste de quelqu'un debout derrière), et sous la bouche tout ce qui n'est ni visage ni cheveux. La coupe
de la mâchoire suit les repères du visage. Le contour est simplifié en polygone pour donner l'effet « découpé aux
ciseaux ». Avant le 14 novembre 2026, la tête n'était que ce que mediapipe lisait comme cheveux ou peau, à 256
pixels : des cornes sur les crânes dégarnis, des oreilles entaillées, des cheveux longs coupés au carré.

Écrit assets/game/personnages/<id>.webp et assets/game/personnages/<id>.json (fusionné par manifest.py),
et résume le passage dans data/collecte/decoupe.json : échecs, visages détectés, définition de la source.
"""
import json
import os
import sys
import threading

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions, vision
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS = os.path.join(ROOT, "tools/graphisme/modeles")
OUTPUT_DIR = os.path.join(ROOT, "assets/game/personnages")

FACE_HEIGHT = 240       # forehead to chin, in output pixels
SCISSOR_EPSILON = 2.6   # polygon simplification, in output pixels
PAPER_BORDER = 5        # white paper margin, in output pixels
CAVITY_COLOR = (20, 10, 58)   # BGR, dark maroon
TONGUE_COLOR = (64, 48, 196)  # BGR
ATLAS_GAP = 4

# Face mesh landmarks.
FOREHEAD, CHIN = 10, 152
MAX_FACES = 5
HEAD_ZONE_WIDTH = 1.85   # times half the face width
HEAD_ZONE_HEIGHT = 1.0   # times the face height, above the middle of the face
LOW_DEFINITION_FACE = 150  # below this source face height, in pixels, the cut-out looks blurry
EYE_LEFT_IRIS, EYE_RIGHT_IRIS = 468, 473
EYE_LEFT_CORNERS, EYE_RIGHT_CORNERS = (33, 133), (362, 263)
FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152,
             148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
MOUTH_CUT = [61, 78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 291]  # upper inner lip, image left to right
# Segmentation classes: 0 background, 1 hair, 2 body skin, 3 face skin, 4 clothes, 5 accessories.
HAIR, BODY_SKIN, FACE_SKIN, CLOTHES, ACCESSORY = 1, 2, 3, 4, 5
HAIR_BELOW_CHIN = 0.35   # times the face height: where long hair is cut
TEMPLES_ABOVE_EYES = 0.15  # times the face height: above that line, the head is the matte's outline
EARS_WIDTH = 1.4           # times half the face width: the ears fit in that band
MATTE_MODEL = "birefnet-portrait"
# The matte runs on the graphics card when there is one, one photo at a time, and within 11 GB: left alone, it takes
# all of a 16 GB card.
GPU = [("CUDAExecutionProvider", {"arena_extend_strategy": "kSameAsRequested", "gpu_mem_limit": str(11 * 1024 ** 3),
                                  "cudnn_conv_algo_search": "HEURISTIC", "cudnn_conv_use_max_workspace": "0"}), "CPUExecutionProvider"]
GPU_LOCK = threading.Lock()
matte_session = None


def detect_landmarks(photo_rgb):
    """Returns the largest face and how many faces the photo holds: the target fills the frame, not the passers-by."""
    options = vision.FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=os.path.join(MODELS, "face_landmarker.task")), num_faces=MAX_FACES)
    with vision.FaceLandmarker.create_from_options(options) as landmarker:
        result = landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=photo_rgb))
    height, width, _ = photo_rgb.shape
    faces = [np.array([[point.x * width, point.y * height] for point in face], dtype=np.float32)
             for face in result.face_landmarks]
    if not faces:
        raise ValueError("aucun visage détecté")
    largest = max(faces, key=lambda face: float(np.linalg.norm(face[FOREHEAD] - face[CHIN])))
    return largest, len(faces)


def segment_classes(photo_rgb):
    options = vision.ImageSegmenterOptions(
        base_options=BaseOptions(model_asset_path=os.path.join(MODELS, "selfie_multiclass_256x256.tflite")),
        output_confidence_masks=True)
    with vision.ImageSegmenter.create_from_options(options) as segmenter:
        result = segmenter.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=photo_rgb))
    height, width, _ = photo_rgb.shape
    return [cv2.resize(mask.numpy_view().squeeze(), (width, height), interpolation=cv2.INTER_LINEAR)
            for mask in result.confidence_masks]


def remove_background(photo_rgb):
    """The matte of the people on the photo, by BiRefNet: on the graphics card when there is one. One session for all
    the cuts of a run, and one photo at a time: two at once do not fit in the card's memory."""
    global matte_session
    import onnxruntime
    from rembg import new_session, remove
    with GPU_LOCK:
        if matte_session is None:
            if hasattr(onnxruntime, "preload_dlls"):
                onnxruntime.preload_dlls()
            matte_session = new_session(MATTE_MODEL, providers=GPU)
        return np.array(remove(Image.fromarray(photo_rgb), session=matte_session, only_mask=True))


def face_alignment(landmarks):
    """Affine transform that levels the eyes and gives the face its fixed height."""
    left, right = landmarks[EYE_LEFT_IRIS], landmarks[EYE_RIGHT_IRIS]
    roll = np.degrees(np.arctan2(right[1] - left[1], right[0] - left[0]))
    scale = FACE_HEIGHT / np.linalg.norm(landmarks[FOREHEAD] - landmarks[CHIN])
    center = (landmarks[FOREHEAD] + landmarks[CHIN]) / 2
    matrix = cv2.getRotationMatrix2D((float(center[0]), float(center[1])), float(roll), float(scale))
    matrix[:, 2] += np.array([700, 700]) - center
    return matrix, (1400, 1400)


def face_component(mask, landmarks):
    """The piece of the mask that holds the face: a neighbour's head, however large, is not this head."""
    _, labels = cv2.connectedComponents(mask, connectivity=8)
    center = ((landmarks[FOREHEAD] + landmarks[CHIN]) / 2).astype(int)
    return np.where(labels == labels[center[1], center[0]], 255, 0).astype(np.uint8)


def build_head_mask(classes, matte, landmarks, size):
    """Hair, face and ears, without neck or clothes.

    Above the mouth line, the head is the matte itself: a shaved skull, its shine, thin hair and ears are read badly
    by the segmentation, never by the matte. Clothes are taken out of it: someone standing behind is in the matte too,
    and their jacket is not a hat. Beside the face, beyond the ears, the matte also holds what is held up to it or
    stands next to it (a microphone, a collar, a neighbour's shoulder): there, only what the segmentation reads as
    hair or skin stays. Under the mouth line, only the face and the hair stay: no neck, no collar, and no accessory
    either (a microphone held under the chin).
    """
    person = (matte > 128).astype(np.uint8) * 255
    mouth_line = int(landmarks[MOUTH_CUT[0]][1])
    upper = person.copy()
    clothes = (classes[CLOTHES] > 0.5).astype(np.uint8)
    upper[cv2.dilate(clothes, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))) > 0] = 0
    upper[mouth_line:, :] = 0
    temples = int(min(landmarks[EYE_LEFT_IRIS][1], landmarks[EYE_RIGHT_IRIS][1]) - TEMPLES_ABOVE_EYES * FACE_HEIGHT)
    oval = landmarks[FACE_OVAL][:, 0]
    middle, ears = float(oval.min() + oval.max()) / 2, EARS_WIDTH * float(oval.max() - oval.min()) / 2
    beside = np.zeros_like(person, dtype=bool)
    beside[max(temples, 0):mouth_line, :] = True
    beside[:, max(int(middle - ears), 0):int(middle + ears)] = False
    read_as_head = np.maximum.reduce([classes[HAIR], classes[BODY_SKIN], classes[FACE_SKIN], classes[ACCESSORY]]) > 0.5
    upper[beside & ~read_as_head] = 0
    lower = cv2.bitwise_and((np.maximum(classes[HAIR], classes[FACE_SKIN]) > 0.5).astype(np.uint8) * 255, person)
    lower[:mouth_line, :] = 0
    mask = cv2.bitwise_or(upper, lower)
    cv2.fillPoly(mask, [landmarks[FACE_OVAL].astype(np.int32)], 255)
    mask = cv2.bitwise_and(mask, head_zone(landmarks, size))
    # The large opening removes thin hair strands, which would make ugly tails on the cut-out.
    opening = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21))
    closing = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    mask = cv2.morphologyEx(cv2.morphologyEx(mask, cv2.MORPH_OPEN, opening), cv2.MORPH_CLOSE, closing)
    return face_component(mask, landmarks)


def head_zone(landmarks, size):
    """Where a head can be: a dome over the face and a bowl under it. Drops vans, walls and neighbours' hair, and
    long hair ends in a curve a little below the chin, not in a square."""
    center = (landmarks[FOREHEAD] + landmarks[CHIN]) / 2
    half_width = float(landmarks[FACE_OVAL][:, 0].max() - landmarks[FACE_OVAL][:, 0].min()) / 2
    radius_x, radius_up = int(half_width * HEAD_ZONE_WIDTH), int(FACE_HEIGHT * HEAD_ZONE_HEIGHT)
    radius_down = int(landmarks[CHIN][1] + HAIR_BELOW_CHIN * FACE_HEIGHT - center[1])
    zone = np.zeros((size[1], size[0]), dtype=np.uint8)
    cx, cy = int(center[0]), int(center[1])
    cv2.ellipse(zone, (cx, cy), (radius_x, radius_up), 0, 180, 360, 255, -1)
    cv2.ellipse(zone, (cx, cy), (radius_x, radius_down), 0, 0, 180, 255, -1)
    return zone


def scissor_polygon(mask):
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    return cv2.approxPolyDP(max(contours, key=cv2.contourArea), SCISSOR_EPSILON, True)


def fill_antialiased(polygons, size):
    canvas = np.zeros((size[1] * 3, size[0] * 3), dtype=np.uint8)
    cv2.fillPoly(canvas, [np.int32(polygon * 3) for polygon in polygons], 255)
    return cv2.resize(canvas, size, interpolation=cv2.INTER_AREA)


def build_jaw_polygon(landmarks):
    """From the mouth line down to the chin, along the face oval, slightly outside it."""
    center = landmarks[FACE_OVAL].mean(axis=0)
    expanded = center + (landmarks[FACE_OVAL] - center) * 1.04
    mouth_y = landmarks[MOUTH_CUT[0]][1] * 0.5 + landmarks[MOUTH_CUT[-1]][1] * 0.5
    lower_oval = [index for index in range(len(FACE_OVAL)) if expanded[index][1] > mouth_y + 0.03 * FACE_HEIGHT]
    # FACE_OVAL runs from the image right side, through the chin, to the image left side.
    oval_points = expanded[lower_oval]
    cut = landmarks[MOUTH_CUT]
    return np.concatenate([cut, oval_points], axis=0)


def build_cavity(jaw_mask, landmarks):
    """Flat painted mouth interior, visible once the jaw drops."""
    height, width = jaw_mask.shape
    cavity = np.zeros((height, width, 3), dtype=np.uint8)
    cavity[:] = CAVITY_COLOR
    mouth = landmarks[MOUTH_CUT]
    center_x = float(mouth[:, 0].mean())
    half_width = float(mouth[:, 0].max() - mouth[:, 0].min()) * 0.42
    tongue_y = float(landmarks[CHIN][1]) - 0.05 * FACE_HEIGHT
    cv2.ellipse(cavity, (int(center_x), int(tongue_y)), (int(half_width), int(0.13 * FACE_HEIGHT)),
                0, 0, 360, TONGUE_COLOR, -1, cv2.LINE_AA)
    return cavity


def crop_box(mask, margin):
    ys, xs = np.nonzero(mask)
    return (max(int(xs.min()) - margin, 0), max(int(ys.min()) - margin, 0),
            int(xs.max()) + margin + 1, int(ys.max()) + margin + 1)


def paper_cut(color, alpha):
    """Adds the white paper margin around a piece."""
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * PAPER_BORDER + 1, 2 * PAPER_BORDER + 1))
    outer = cv2.dilate(alpha, kernel)
    outer = cv2.GaussianBlur(outer, (3, 3), 0)
    weight = (alpha.astype(np.float32) / 255)[:, :, None]
    painted = color.astype(np.float32) * weight + 255 * (1 - weight)
    return np.dstack([painted.astype(np.uint8), outer])


def punch_up(color):
    """Same contrast and saturation for all photographers."""
    lab = cv2.cvtColor(color, cv2.COLOR_BGR2LAB)
    lab[:, :, 0] = cv2.createCLAHE(clipLimit=1.6, tileGridSize=(4, 4)).apply(lab[:, :, 0])
    result = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    hsv = cv2.cvtColor(result, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 1.12, 0, 255)
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)


def eye_anchor(landmarks, iris, corners):
    width = float(np.linalg.norm(landmarks[corners[0]] - landmarks[corners[1]]))
    return float(landmarks[iris][0]), float(landmarks[iris][1]), width


def cut_character(character_id, photo_path):
    photo = cv2.imread(photo_path)
    photo_rgb = cv2.cvtColor(photo, cv2.COLOR_BGR2RGB)
    landmarks, face_count = detect_landmarks(photo_rgb)
    source_face_height = float(np.linalg.norm(landmarks[FOREHEAD] - landmarks[CHIN]))
    matte = remove_background(photo_rgb)

    matrix, size = face_alignment(landmarks)
    color = punch_up(cv2.warpAffine(photo, matrix, size, flags=cv2.INTER_CUBIC))
    aligned_matte = cv2.warpAffine(matte, matrix, size, flags=cv2.INTER_LINEAR)
    points = cv2.transform(landmarks[None, :, :], matrix)[0]

    aligned_classes = [cv2.warpAffine(mask, matrix, size, flags=cv2.INTER_LINEAR) for mask in segment_classes(photo_rgb)]
    head_mask = build_head_mask(aligned_classes, aligned_matte, points, size)
    head_polygon = scissor_polygon(head_mask)
    head_alpha = fill_antialiased([head_polygon], size)
    jaw_polygon = build_jaw_polygon(points)
    jaw_alpha = cv2.bitwise_and(fill_antialiased([jaw_polygon], size), head_alpha)

    cavity = build_cavity(jaw_alpha, points)
    jaw_weight = (jaw_alpha.astype(np.float32) / 255)[:, :, None]
    upper_color = (color * (1 - jaw_weight) + cavity * jaw_weight).astype(np.uint8)

    head_rgba = paper_cut(upper_color, head_alpha)
    jaw_rgba = paper_cut(color, jaw_alpha)

    hx0, hy0, hx1, hy1 = crop_box(head_rgba[:, :, 3], 2)
    jx0, jy0, jx1, jy1 = crop_box(jaw_rgba[:, :, 3], 2)
    head_piece, jaw_piece = head_rgba[hy0:hy1, hx0:hx1], jaw_rgba[jy0:jy1, jx0:jx1]
    head_h, head_w = head_piece.shape[:2]
    jaw_h, jaw_w = jaw_piece.shape[:2]

    atlas = np.zeros((max(head_h, jaw_h), head_w + ATLAS_GAP + jaw_w, 4), dtype=np.uint8)
    atlas[0:head_h, 0:head_w] = head_piece
    atlas[0:jaw_h, head_w + ATLAS_GAP:head_w + ATLAS_GAP + jaw_w] = jaw_piece

    def in_head(x, y):
        return [round(float(x) - hx0, 1), round(float(y) - hy0, 1)]

    left = eye_anchor(points, EYE_LEFT_IRIS, EYE_LEFT_CORNERS)
    right = eye_anchor(points, EYE_RIGHT_IRIS, EYE_RIGHT_CORNERS)
    mouth = points[MOUTH_CUT]
    description = {
        "atlas": f"personnages/{character_id}.webp",
        "pieces": {
            "tete": {"x": 0, "y": 0, "w": head_w, "h": head_h},
            "machoire": {
                "x": head_w + ATLAS_GAP, "y": 0, "w": jaw_w, "h": jaw_h,
                "pose": in_head(jx0, jy0),
                "pivot": [round(float(mouth[:, 0].mean()) - jx0, 1), round(float(mouth[:, 1].mean()) - jy0, 1)],
            },
        },
        "ancres": {
            "oeil_g": in_head(*left[:2]) + [round(left[2], 1)],
            "oeil_d": in_head(*right[:2]) + [round(right[2], 1)],
            "bouche": in_head(mouth[:, 0].mean(), mouth[:, 1].mean()),
            "menton": in_head(*points[CHIN]),
        },
    }
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    cv2.imwrite(os.path.join(OUTPUT_DIR, f"{character_id}.webp"), atlas, [cv2.IMWRITE_WEBP_QUALITY, 86])
    with open(os.path.join(OUTPUT_DIR, f"{character_id}.json"), "w", encoding="utf8") as handle:
        json.dump(description, handle, ensure_ascii=False, indent=1)
    return description, {"visages": face_count, "hauteur_visage_source": round(source_face_height),
                         "basse_definition": source_face_height < LOW_DEFINITION_FACE}


def main():
    with open(os.path.join(ROOT, "data/collecte/portraits.json"), encoding="utf8") as handle:
        portraits = json.load(handle)
    wanted = sys.argv[1:]
    if wanted == ["--all"]:
        wanted = [key for key, portrait in portraits.items() if portrait.get("portrait")]
    report_path = os.path.join(ROOT, "data/collecte/decoupe.json")
    report = {}
    if os.path.exists(report_path):
        with open(report_path, encoding="utf8") as handle:
            report = json.load(handle)
    for character_id in wanted:
        photo = os.path.join(ROOT, portraits[character_id].get("recadrage") or portraits[character_id]["portrait"])
        try:
            _, report[character_id] = cut_character(character_id, photo)
            size = os.path.getsize(os.path.join(OUTPUT_DIR, f"{character_id}.webp"))
            print(character_id, report[character_id], f"{size / 1024:.0f} Ko", flush=True)
        except Exception as error:  # one bad photo must not stop the batch
            report[character_id] = {"echec": str(error)}
            print(character_id, "ÉCHEC", error, flush=True)
    with open(report_path, "w", encoding="utf8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=1, sort_keys=True)


if __name__ == "__main__":
    main()
