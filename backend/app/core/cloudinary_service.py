"""
cloudinary_service.py
─────────────────────
Centralised Cloudinary helpers used across the project.

Environment variables required (already in .env / Render dashboard):
    CLOUDINARY_CLOUD_NAME
    CLOUDINARY_API_KEY
    CLOUDINARY_API_SECRET
"""
from __future__ import annotations

import os
import tempfile
from io import BytesIO

import cloudinary
import cloudinary.uploader

# ── Configuration ──────────────────────────────────────────────────────────────

_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
_API_KEY    = os.getenv("CLOUDINARY_API_KEY",    "")
_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

CLOUDINARY_ENABLED = bool(_CLOUD_NAME and _API_KEY and _API_SECRET)

if CLOUDINARY_ENABLED:
    cloudinary.config(
        cloud_name = _CLOUD_NAME,
        api_key    = _API_KEY,
        api_secret = _API_SECRET,
        secure     = True,
    )

# ── Public helpers ──────────────────────────────────────────────────────────────

def is_cloudinary_url(path: str) -> bool:
    """Return True when path is an absolute Cloudinary delivery URL."""
    return path.startswith("https://res.cloudinary.com/")


def upload_bytes(
    data: bytes,
    *,
    folder: str,
    public_id: str,
    resource_type: str = "image",
) -> str:
    """
    Upload raw data to Cloudinary and return the secure delivery URL.

    Parameters
    ----------
    data          : raw file bytes
    folder        : Cloudinary folder, e.g. "ovs/id_cards"
    public_id     : filename without extension, e.g. "id_5-2-20-396-2022"
    resource_type : "image" (default) or "raw" for PDFs

    Returns
    -------
    str – the HTTPS delivery URL stored in the database.
    """
    if not CLOUDINARY_ENABLED:
        raise RuntimeError(
            "Cloudinary is not configured. "
            "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
        )

    result = cloudinary.uploader.upload(
        BytesIO(data),
        folder        = folder,
        public_id     = public_id,
        resource_type = resource_type,
        overwrite     = True,
        invalidate    = True,
    )
    return result["secure_url"]


def download_to_tempfile(url: str, suffix: str = ".jpg") -> str:
    """
    Download a Cloudinary URL to a local temp file and return the path.

    Useful for DeepFace / facenet-pytorch which only accept filesystem paths.
    The caller must delete the file when done:

        path = download_to_tempfile(url)
        try:
            ...use path...
        finally:
            os.unlink(path)
    """
    import urllib.request
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        urllib.request.urlretrieve(url, tmp.name)
    except Exception:
        os.unlink(tmp.name)
        raise
    finally:
        tmp.close()
    return tmp.name