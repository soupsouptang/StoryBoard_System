"""Explicit crop/reframe rendering; never stretches or overwrites originals."""
from io import BytesIO
from PIL import Image, ImageOps
from app.core.exceptions import DomainError
from app.services.image_storage import prepare_image


def render_crop(data, req):
    if req.crop.x + req.crop.width > 1.000000001 or req.crop.y + req.crop.height > 1.000000001:
        raise DomainError("裁剪区域必须在图片内", code="INVALID_CROP")
    prepare_image(data)
    ratio_width, ratio_height = (int(value) for value in req.aspect_ratio.split(":"))
    width = req.output_width
    height = (2 * width * ratio_height + ratio_width) // (2 * ratio_width)
    if height < 1 or height > 3840 or width * height > 14_745_600:
        raise DomainError("输出比例或分辨率超出范围，请调小宽度", code="INVALID_FRAME_SIZE")
    with Image.open(BytesIO(data)) as source:
        oriented = ImageOps.exif_transpose(source).convert("RGBA")
        # Clockwise rotation, identical to the client's transform.
        if req.rotation:
            oriented = oriented.rotate(-req.rotation, expand=True)
        rectangle = req.crop
        x0, y0 = round(rectangle.x * oriented.width), round(rectangle.y * oriented.height)
        x1 = min(oriented.width, round((rectangle.x + rectangle.width) * oriented.width))
        y1 = min(oriented.height, round((rectangle.y + rectangle.height) * oriented.height))
        if x1 <= x0 or y1 <= y0:
            raise DomainError("裁剪区域太小，请扩大选区", code="INVALID_CROP")
        cropped = oriented.crop((x0, y0, x1, y1))
        cropped = ImageOps.contain(cropped, (width, height), Image.Resampling.LANCZOS)
        framed = Image.new("RGB", (width, height), "black")
        framed.paste(cropped, ((width - cropped.width) // 2, (height - cropped.height) // 2), cropped)
        output = BytesIO()
        framed.save(output, format="WEBP", quality=92)
        return output.getvalue()
