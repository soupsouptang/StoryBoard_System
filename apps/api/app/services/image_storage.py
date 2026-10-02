"""Bounded image decoding and immutable original/thumbnail storage."""
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
import hashlib
import warnings
from PIL import Image, ImageOps, UnidentifiedImageError
from app.core.exceptions import DomainError

MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 20_000_000
FORMATS = {"PNG": ("image/png", "png"), "JPEG": ("image/jpeg", "jpg"),
    "GIF": ("image/gif", "gif"), "WEBP": ("image/webp", "webp")}


@dataclass(frozen=True)
class PreparedImage:
    mime_type: str
    extension: str
    width: int
    height: int
    digest: str
    thumbnail: bytes


def prepare_image(data: bytes) -> PreparedImage:
    if not data or len(data) > MAX_BYTES:
        raise DomainError("图片不能为空且不得超过10 MB", code="IMAGE_TOO_LARGE")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as source:
                image_format = source.format
                if image_format not in FORMATS:
                    raise DomainError("仅支持PNG、JPEG、GIF或WebP图片", code="INVALID_IMAGE")
                if source.width * source.height > MAX_PIXELS:
                    raise DomainError("图片不得超过2000万像素", code="IMAGE_TOO_LARGE")
                source.verify()
            with Image.open(BytesIO(data)) as source:
                oriented = ImageOps.exif_transpose(source)
                width, height = oriented.size
                rgba = ImageOps.contain(oriented.convert("RGBA"), (384, 384), Image.Resampling.LANCZOS)
                background = Image.new("RGB", rgba.size, "black")
                background.paste(rgba, (0, 0), rgba)
                output = BytesIO()
                background.save(output, format="WEBP", quality=82)
        mime, extension = FORMATS[image_format]
        return PreparedImage(mime, extension, width, height, hashlib.sha256(data).hexdigest(), output.getvalue())
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError, Image.DecompressionBombError, Image.DecompressionBombWarning) as error:
        raise DomainError("图片无法读取，请重新导出图片后上传", code="INVALID_IMAGE") from error


def store_image(root: Path, identity: str, data: bytes, image: PreparedImage):
    root.mkdir(parents=True, exist_ok=True)
    storage_key, proxy_key = f"{identity}.{image.extension}", f"{identity}.thumb.webp"
    created = []
    temporary = []
    try:
        for key, content in ((storage_key, data), (proxy_key, image.thumbnail)):
            target = root / key
            scratch = root / f".{key}.tmp"
            # UUID identities are new. Never overwrite an existing original.
            if target.exists():
                raise DomainError("图片存储标识重复，请重试", code="MEDIA_ID_CONFLICT")
            temporary.append(scratch)
            scratch.write_bytes(content)
            scratch.replace(target)
            created.append(target)
    except BaseException:
        for path in temporary + created:
            path.unlink(missing_ok=True)
        raise
    return storage_key, proxy_key, created
