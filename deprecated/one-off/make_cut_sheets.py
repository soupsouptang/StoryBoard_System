import re
import subprocess
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Hatsune\Documents\Codex\2026-08-28\referenced-chatgpt-conversation-this-is-an")
FFMPEG = ROOT / ".video_tools" / "imageio_ffmpeg" / "binaries" / "ffmpeg-win-x86_64-v7.1.exe"
VIDEO = Path(r"C:\Users\Hatsune\Desktop\486a8ac74fce3bf0d046534692eb53aa.mp4")
OUT = ROOT / "_cut_review"
OUT.mkdir(exist_ok=True)


def candidates():
    command = [str(FFMPEG), "-hide_banner", "-ss", "0", "-t", "270", "-i", str(VIDEO),
               "-vf", "select='gt(scene,0.05)',metadata=print", "-an", "-f", "null", "NUL"]
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            text=True, encoding="utf-8", errors="replace", check=True)
    values, timestamp = [], None
    for line in result.stdout.splitlines():
        mt = re.search(r"pts_time:([0-9.]+)", line)
        if mt:
            timestamp = float(mt.group(1))
        ms = re.search(r"lavfi\.scene_score=([0-9.]+)", line)
        if ms and timestamp is not None:
            values.append((timestamp, float(ms.group(1))))
            timestamp = None
    clusters = []
    for item in values:
        if not clusters or item[0] - clusters[-1][-1][0] > 0.12:
            clusters.append([item])
        else:
            clusters[-1].append(item)
    return [max(cluster, key=lambda x: x[1]) for cluster in clusters if max(v[1] for v in cluster) >= 0.15]


def frame_at(timestamp):
    command = [str(FFMPEG), "-loglevel", "error", "-ss", f"{max(timestamp, 0):.3f}", "-i", str(VIDEO),
               "-frames:v", "1", "-vf", "scale=320:180", "-f", "image2pipe", "-vcodec", "mjpeg", "-"]
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    return Image.open(BytesIO(result.stdout)).convert("RGB")


font = ImageFont.truetype(r"C:\Windows\Fonts\consola.ttf", 16)
items = candidates()
for sheet_index in range((len(items) + 9) // 10):
    canvas = Image.new("RGB", (1320, 1040), "#11151c")
    draw = ImageDraw.Draw(canvas)
    for local_index, (timestamp, score) in enumerate(items[sheet_index * 10:(sheet_index + 1) * 10]):
        row, col = divmod(local_index, 2)
        x, y = 10 + col * 655, 10 + row * 205
        before = frame_at(timestamp - 0.22)
        after = frame_at(timestamp + 0.22)
        canvas.paste(before, (x, y + 24))
        canvas.paste(after, (x + 320, y + 24))
        draw.text((x, y), f"{sheet_index*10+local_index+1:03d}  {timestamp:07.3f}s  score={score:.3f}", font=font, fill="#f1c56a")
        draw.line((x + 320, y + 24, x + 320, y + 204), fill="#d4a64a", width=2)
    path = OUT / f"cuts_{sheet_index + 1:02d}.jpg"
    canvas.save(path, quality=88)
    print(path)
