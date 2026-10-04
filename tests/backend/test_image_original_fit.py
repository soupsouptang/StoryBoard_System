"""Original-fit rendering without database or user media."""
from io import BytesIO
from pathlib import Path
import sys
import pytest
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps/api"))
from app.schemas.image_crop import MediaTransform
from app.services.image_framing import render_crop

@pytest.mark.parametrize("size", [(90,160), (300,30)])
@pytest.mark.parametrize("ratio,width,height", [("16:9",320,180), ("47:20",470,200)])
def test_original_contain_and_default_cover(size,ratio,width,height):
    original=BytesIO(); Image.new("RGB",size,"red").save(original,format="PNG")
    data=original.getvalue()
    values=dict(crop=dict(x=0,y=0,width=1,height=1),aspect_ratio=ratio,output_width=width)
    fit=Image.open(BytesIO(render_crop(data,MediaTransform(**values,frame_fit="contain")))).convert("RGB")
    assert fit.size==(width,height)
    assert max(fit.getpixel((0,0)))<10
    assert fit.getpixel((width//2,height//2))[0]>240
    cover=Image.open(BytesIO(render_crop(data,MediaTransform(**values)))).convert("RGB")
    assert cover.getpixel((0,0))[0]>240
    assert MediaTransform(**values).frame_fit=="cover"
    assert original.getvalue()==data
