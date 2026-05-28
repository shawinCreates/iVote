"""
Face verification and liveness detection using facenet-pytorch.
Stack:
  • facenet-pytorch  – InceptionResnetV1 + MTCNN face detector
                       Downloads ~100 MB of weights automatically on first use
                       into torch's default cache (~/.cache/torch/checkpoints/)
  • torch / torchvision
  • Pillow, numpy

Install (all standard, no cmake):
  pip install facenet-pytorch torch torchvision pillow numpy

First-run: weights download automatically (~100 MB, one time).
Every subsequent call uses the cache — no internet needed.
"""
from __future__ import annotations

import base64
import logging
import os
from io import BytesIO

import numpy as np
from PIL import Image

log = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

# Cosine similarity threshold (0–1, higher = stricter match required).
# 0.70 is a good starting point for webcam-quality photos.
# Raise to 0.75 if impostors are getting through.
# Lower to 0.65 if genuine users are being rejected too often.
THRESHOLD = float(os.getenv("FACE_VERIFY_THRESHOLD", "0.70"))

MAX_RETRIES = 3


# ─────────────────────────────────────────────────────────────────────────────
# Lazy singletons  (loaded once per process, reused across requests)
# ─────────────────────────────────────────────────────────────────────────────

_mtcnn  = None   # face detector
_resnet = None   # embedding model
_device = None


def _get_models():
    global _mtcnn, _resnet, _device

    if _mtcnn is None or _resnet is None:
        import torch
        from facenet_pytorch import MTCNN, InceptionResnetV1

        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        log.info("Loading face models on %s (first call downloads weights ~100 MB)...", _device)

        # MTCNN: detects + crops + aligns faces to 160x160 RGB tensor
        _mtcnn = MTCNN(
            image_size      = 160,
            margin          = 20,
            min_face_size   = 40,
            keep_all        = False,
            post_process    = True,
            device          = _device,
        )

        # InceptionResnetV1 pre-trained on VGGFace2 -> 512-d embeddings
        _resnet = InceptionResnetV1(pretrained="vggface2").eval().to(_device)

        log.info("Face models ready.")

    return _mtcnn, _resnet, _device


# ─────────────────────────────────────────────────────────────────────────────
# Image loading
# ─────────────────────────────────────────────────────────────────────────────

def _load_pic(source: str) -> Image.Image:
    if os.path.isfile(source):
        return Image.open(source).convert("RGB")
    b64 = source
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    return Image.open(BytesIO(base64.b64decode(b64))).convert("RGB")


# ─────────────────────────────────────────────────────────────────────────────
# Core pipeline
# ─────────────────────────────────────────────────────────────────────────────

def _get_embedding(pil_image: Image.Image, label: str) -> np.ndarray:
    mtcnn, resnet, device = _get_models()
    face_tensor = mtcnn(pil_image)
    if face_tensor is None:
        raise ValueError(f"no_face_detected:{label}")
    face_tensor = face_tensor.unsqueeze(0).to(device)
    import torch
    with torch.no_grad():
        embedding = resnet(face_tensor)
    return embedding.squeeze().cpu().numpy()


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def verify_face(profile_photo_path: str, live_b64: str) -> dict:
    if not os.path.isfile(profile_photo_path):
        raise FileNotFoundError(f"Profile photo not found on disk: {profile_photo_path}")

    try:
        profile_img = _load_pic(profile_photo_path)
        live_img    = _load_pic(live_b64)
        profile_emb = _get_embedding(profile_img, "profile")
        live_emb    = _get_embedding(live_img,    "live")
        similarity  = round(_cosine_similarity(profile_emb, live_emb), 4)
        verified    = similarity >= THRESHOLD
        return {
            "verified":   bool(verified),
            "similarity": similarity,
            "reason":     "ok" if verified else "face_mismatch",
        }
    except ValueError:
        return {
            "verified":   False,
            "similarity": None,
            "reason":     "no_face_detected",
        }


# ─────────────────────────────────────────────────────────────────────────────
# Liveness detection — blink via Eye Aspect Ratio (EAR)
# ─────────────────────────────────────────────────────────────────────────────
#
# MTCNN returns 5 facial landmarks per face:
#   [0] left_eye, [1] right_eye, [2] nose, [3] mouth_left, [4] mouth_right
#
# We approximate EAR using the vertical spread of both eye landmarks across
# frames. A real blink causes a sharp drop in EAR (eyes close) followed by
# a recovery. A printed photo or screen shows near-zero variance.
#
# EAR_DROP_THRESHOLD : minimum drop considered a blink event
# EAR_VAR_THRESHOLD  : minimum variance across frames to pass (catches static images)

EAR_DROP_THRESHOLD = float(os.getenv("LIVENESS_EAR_DROP", "0.018"))
EAR_VAR_THRESHOLD  = float(os.getenv("LIVENESS_EAR_VAR",  "0.00008"))


def _eye_openness(landmarks: np.ndarray) -> float:
    """
    Rough eye-openness score from MTCNN landmarks.
    landmarks shape: (5, 2) — [left_eye, right_eye, nose, mouth_l, mouth_r]
    We use the vertical distance between each eye and the nose tip,
    normalised by the eye-to-eye horizontal distance.
    """
    left_eye  = landmarks[0]   # (x, y)
    right_eye = landmarks[1]
    nose      = landmarks[2]

    eye_width  = np.linalg.norm(right_eye - left_eye) + 1e-6
    left_dist  = abs(left_eye[1]  - nose[1])
    right_dist = abs(right_eye[1] - nose[1])
    return float((left_dist + right_dist) / (2 * eye_width))


def check_liveness(frames_b64: list[str]) -> dict:
    """
    Analyse a sequence of base64 frames for blink-based liveness.

    Returns
    -------
    dict:
        live       (bool)  – True if a blink was detected
        reason     (str)   – "ok" | "no_blink" | "no_face_in_frames"
        ear_values (list)  – per-frame EAR scores (for debugging)
    """
    if not frames_b64:
        return {"live": False, "reason": "no_frames", "ear_values": []}

    mtcnn, _, _ = _get_models()

    ear_values = []
    face_found = False

    for b64 in frames_b64:
        try:
            img = _load_pic(b64)
        except Exception:
            continue

        # detect_landmarks=True returns (boxes, probs, landmarks)
        _, probs, landmarks = mtcnn.detect(img, landmarks=True)

        if landmarks is None or len(landmarks) == 0:
            continue

        # Pick the highest-confidence face
        best = int(np.argmax(probs))
        lm   = landmarks[best]   # shape (5, 2)
        face_found = True
        ear_values.append(_eye_openness(np.array(lm)))

    if not face_found or len(ear_values) < 3:
        return {"live": False, "reason": "no_face_in_frames", "ear_values": ear_values}

    ear_arr = np.array(ear_values)
    variance = float(np.var(ear_arr))
    min_ear  = float(np.min(ear_arr))
    max_ear  = float(np.max(ear_arr))
    drop     = max_ear - min_ear

    # Pass if variance is high enough OR there's a clear drop-and-recover
    live = (variance >= EAR_VAR_THRESHOLD) or (drop >= EAR_DROP_THRESHOLD)

    return {
        "live":       live,
        "reason":     "ok" if live else "no_blink",
        "ear_values": [round(v, 5) for v in ear_values],
        "variance":   round(variance, 6),
        "drop":       round(drop, 5),
    }
