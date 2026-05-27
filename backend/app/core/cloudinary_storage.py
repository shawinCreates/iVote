from io import BytesIO
from typing import Any

import cloudinary
import cloudinary.uploader

from app.core.config import CLOUDINARY_ENABLED, CLOUDINARY_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

if CLOUDINARY_ENABLED:
    if CLOUDINARY_URL:
        cloudinary.config(cloudinary_url=CLOUDINARY_URL)
    else:
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
        )


def upload_to_cloudinary(content: bytes, public_id: str, folder: str, resource_type: str = "auto") -> str:
    if not CLOUDINARY_ENABLED:
        raise RuntimeError("Cloudinary is not configured")

    result: Any = cloudinary.uploader.upload(
        BytesIO(content),
        public_id=public_id,
        folder=folder,
        resource_type=resource_type,
        overwrite=True,
        use_filename=True,
        unique_filename=False,
    )
    secure_url = result.get("secure_url")
    if not secure_url:
        raise RuntimeError("Cloudinary upload failed: secure_url was not returned")
    return secure_url
