"""Explicit crop/reframe rendering; never stretches or overwrites originals."""
from io import BytesIO
from fractions import Fraction
from math import radians, tan
from PIL import Image, ImageOps
from app.core.exceptions import DomainError
from app.services.image_storage import prepare_image


def project_frame_ratio(value):
    """Canonical integer ratio for project decimal ratios, e.g. 2.35:1."""
    try:
        width, height = str(value).split(':')
        ratio = Fraction(width) / Fraction(height)
        if ratio <= 0 or max(ratio.numerator, ratio.denominator) > 9999:
            raise ValueError()
        return f'{ratio.numerator}:{ratio.denominator}'
    except (ValueError, ZeroDivisionError):
        raise DomainError('项目画幅比例无效，请检查项目设置', code='INVALID_FRAME_RATIO')


def render_crop(data, req):
    if req.crop.x + req.crop.width > 1.000000001 or req.crop.y + req.crop.height > 1.000000001:
        raise DomainError("裁剪区域必须在图片内", code="INVALID_CROP")
    prepare_image(data)
    with Image.open(BytesIO(data)) as source:
        oriented = ImageOps.exif_transpose(source).convert("RGBA")
        if req.flip_horizontal:
            oriented = ImageOps.mirror(oriented)
        if req.flip_vertical:
            oriented = ImageOps.flip(oriented)
        # Clockwise rotation, identical to the client's transform.
        if req.rotation:
            oriented = oriented.rotate(-req.rotation, expand=True)
        if req.straighten_degrees:
            oriented = oriented.rotate(-req.straighten_degrees, resample=Image.Resampling.BICUBIC)
        if any((req.scale != 1, req.translation_x, req.translation_y, req.perspective_horizontal, req.perspective_vertical)):
            w, h = oriented.size
            ph, pv = tan(radians(req.perspective_horizontal)), tan(radians(req.perspective_vertical))
            denominator = 1 - ph / 2 - pv / 2
            coefficients = (
                (1 / req.scale + ph / 2) / denominator, w * pv / (2 * h * denominator),
                (w * denominator / 2 - w / (2 * req.scale) - req.translation_x * w) / denominator,
                h * ph / (2 * w * denominator), (1 / req.scale + pv / 2) / denominator,
                (h * denominator / 2 - h / (2 * req.scale) - req.translation_y * h) / denominator,
                ph / (w * denominator), pv / (h * denominator),
            )
            oriented = oriented.transform(oriented.size, Image.Transform.PERSPECTIVE, coefficients, Image.Resampling.BICUBIC)
        rectangle = req.crop
        x0, y0 = round(rectangle.x * oriented.width), round(rectangle.y * oriented.height)
        x1 = min(oriented.width, round((rectangle.x + rectangle.width) * oriented.width))
        y1 = min(oriented.height, round((rectangle.y + rectangle.height) * oriented.height))
        if x1 <= x0 or y1 <= y0:
            raise DomainError("裁剪区域太小，请扩大选区", code="INVALID_CROP")
        cropped = oriented.crop((x0, y0, x1, y1))
        ratio_width, ratio_height = (int(value) for value in req.aspect_ratio.split(":")) if req.aspect_ratio else cropped.size
        width = req.output_width
        height = (2 * width * ratio_height + ratio_width) // (2 * ratio_width)
        if height < 1 or height > 3840 or width * height > 14_745_600:
            raise DomainError("输出比例或分辨率超出范围，请调小宽度", code="INVALID_FRAME_SIZE")
        cropped = ImageOps.fit(cropped, (width, height), method=Image.Resampling.LANCZOS)
        framed = Image.new("RGB", (width, height), "black")
        framed.paste(cropped, ((width - cropped.width) // 2, (height - cropped.height) // 2), cropped)
        output = BytesIO()
        framed.save(output, format="WEBP", quality=92)
        return output.getvalue()
