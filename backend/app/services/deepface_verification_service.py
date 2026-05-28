"""
face_verification_service.py
Compares a live webcam snapshot against the stored profile photo
using DeepFace (no dlib / no pkg_resources required).
"""
from __future__ import annotations

import base64
import os
import tempfile
from io import BytesIO

from PIL import Image

# ------------------------------------------------------------------ #
# DeepFace settings                                                   #
# Model choices (accuracy vs speed):                                  #
#   "Facenet"      – good balance, recommended                        #
#   "Facenet512"   – more accurate, slightly slower                   #
#   "ArcFace"      – very accurate, larger download on first run      #
# Detector backend: "opencv" is fastest and has no extra deps.        #
# ------------------------------------------------------------------ #
MODEL_NAME   = os.getenv("FACE_MODEL",    "Facenet")
DETECTOR     = os.getenv("FACE_DETECTOR", "opencv")
THRESHOLD    = float(os.getenv("FACE_VERIFY_THRESHOLD", "0.40"))  # cosine distance

MAX_RETRIES  = 3   # relayed to the client via the router


# ------------------------------------------------------------------ #
# Internal helpers                                                    #
# ------------------------------------------------------------------ #

def _b64_to_temp_file(b64_string: str, suffix: str = ".jpg") -> str:
    """
    Decode a base64 JPEG/PNG (with or without data-URI prefix) and
    write it to a temp file.  Returns the temp file path.
    DeepFace.verify() accepts file paths, so this avoids numpy wrangling.
    """
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]

    img_bytes = base64.b64decode(b64_string)
    img = Image.open(BytesIO(img_bytes)).convert("RGB")

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    img.save(tmp.name, format="JPEG")
    tmp.close()
    return tmp.name


# ------------------------------------------------------------------ #
# Public API                                                          #
# ------------------------------------------------------------------ #

def verify_face(profile_photo_path: str, live_b64: str) -> dict:
    """
    Compare the stored profile photo against a live webcam capture.

    Parameters
    ----------
    profile_photo_path : str
        Filesystem path to the user's registered profile photo.

    live_b64 : str
        Base64-encoded JPEG/PNG of the webcam snapshot taken during voting.
        The data-URI prefix is stripped automatically.

    Returns
    -------
    dict with keys:
        verified   (bool)  – True if same person
        distance   (float) – cosine distance; lower = more similar
        reason     (str)   – "ok" | "face_mismatch" | "no_face_detected"
    """
    from deepface import DeepFace  # lazy import — heavy module, load once per request

    if not os.path.isfile(profile_photo_path):
        raise FileNotFoundError(
            f"Profile photo not found on disk: {profile_photo_path}"
        )

    live_path = None
    try:
        # Write live snapshot to a temp file
        live_path = _b64_to_temp_file(live_b64)

        result = DeepFace.verify(
            img1_path   = profile_photo_path,
            img2_path   = live_path,
            model_name  = MODEL_NAME,
            detector_backend = DETECTOR,
            distance_metric  = "cosine",
            enforce_detection = True,   # raises if no face found
        )

        distance = round(float(result["distance"]), 4)
        verified = distance <= THRESHOLD

        return {
            "verified": verified,
            "distance": distance,
            "reason": "ok" if verified else "face_mismatch",
        }

    except ValueError as e:
        # DeepFace raises ValueError when no face is detected in either image
        return {
            "verified": False,
            "distance": None,
            "reason": "no_face_detected",
        }

    finally:
        # Always clean up the temp file
        if live_path and os.path.exists(live_path):
            os.unlink(live_path)
