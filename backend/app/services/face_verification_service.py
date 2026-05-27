"""
Face verification and liveness detection using facenet-pytorch.

Stack:
  • facenet-pytorch  – InceptionResnetV1 + MTCNN face detector
  • torch / torchvision
  • Pillow, numpy

Model weights (~100 MB) are downloaded once to torch's cache on first use.
"""
from __future__ import annotations

import base64
import logging
import os
import tempfile
import urllib.request
from io import BytesIO

import numpy as np
from PIL import Image

log = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

THRESHOLD   = float(os.getenv("FACE_VERIFY_THRESHOLD", "0.70"))
MAX_RETRIES = 3

EAR_DROP_THRESHOLD = float(os.getenv("LIVENESS_EAR_DROP", "0.018"))
EAR_VAR_THRESHOLD  = float(os.getenv("LIVENESS_EAR_VAR",  "0.00008"))

# ─────────────────────────────────────────────────────────────────────────────
# Lazy singletons  (loaded once per process, reused across requests)
# ─────────────────────────────────────────────────────────────────────────────

_mtcnn  = None
_resnet = None
_device = None


def _get_models():
    global _mtcnn, _resnet, _device

    if _mtcnn is None or _resnet is None:
        import torch
        from facenet_pytorch import MTCNN, InceptionResnetV1

        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        log.info("Loading face models on %s (first call downloads weights ~100 MB)...", _device)

        _mtcnn = MTCNN(
            image_size    = 160,
            margin        = 20,
            min_face_size = 40,
            keep_all      = False,
            post_process  = True,
            device        = _device,
        )
        _resnet = InceptionResnetV1(pretrained="vggface2").eval().to(_device)
        log.info("Face models ready.")

    return _mtcnn, _resnet, _device


# ─────────────────────────────────────────────────────────────────────────────
# Image loading — handles Cloudinary URLs, local paths, and base64 data-URIs
# ─────────────────────────────────────────────────────────────────────────────

def _load_pic(source: str) -> Image.Image:
    # Local file
    if os.path.isfile(source):
        return Image.open(source).convert("RGB")

    # Remote URL (Cloudinary or any HTTPS)
    if source.startswith("http://") or source.startswith("https://"):
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp_path = tmp.name
        try:
            urllib.request.urlretrieve(source, tmp_path)
            return Image.open(tmp_path).convert("RGB")
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    # Base64 data-URI or raw base64
    b64 = source
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    return Image.open(BytesIO(base64.b64decode(b64))).convert("RGB")


# ─────────────────────────────────────────────────────────────────────────────
# Embedding helpers
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

def verify_face(profile_source: str, live_b64: str) -> dict:
    """
    Compare a stored profile photo (Cloudinary URL or local path) against
    a live base64 frame captured during voting.
    """
    try:
        profile_img = _load_pic(profile_source)
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
# MTCNN landmark order: [left_eye, right_eye, nose, mouth_left, mouth_right]
# A genuine blink causes a measurable drop in eye-openness score across frames.

def _eye_openness(landmarks: np.ndarray) -> float:
    """Rough eye-openness from MTCNN landmarks, normalised by eye-width."""
    left_eye  = landmarks[0]
    right_eye = landmarks[1]
    nose      = landmarks[2]

    eye_width  = np.linalg.norm(right_eye - left_eye) + 1e-6
    left_dist  = abs(left_eye[1]  - nose[1])
    right_dist = abs(right_eye[1] - nose[1])
    return float((left_dist + right_dist) / (2 * eye_width))


def check_liveness(frames_b64: list[str]) -> dict:
    """
    Analyse a sequence of base64 frames for blink-based liveness.

    Returns:
        dict with keys: live (bool), reason (str), ear_values (list)
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

        _, probs, landmarks = mtcnn.detect(img, landmarks=True)
        if landmarks is None or len(landmarks) == 0:
            continue

        best = int(np.argmax(probs))
        lm   = landmarks[best]
        face_found = True
        ear_values.append(_eye_openness(np.array(lm)))

    if not face_found or len(ear_values) < 3:
        return {"live": False, "reason": "no_face_in_frames", "ear_values": ear_values}

    ear_arr  = np.array(ear_values)
    variance = float(np.var(ear_arr))
    min_ear  = float(np.min(ear_arr))
    max_ear  = float(np.max(ear_arr))
    drop     = max_ear - min_ear

    live = (variance >= EAR_VAR_THRESHOLD) or (drop >= EAR_DROP_THRESHOLD)

    return {
        "live":       live,
        "reason":     "ok" if live else "no_blink",
        "ear_values": [round(v, 5) for v in ear_values],
        "variance":   round(variance, 6),
        "drop":       round(drop, 5),
    }
