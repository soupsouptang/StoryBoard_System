import re
import subprocess
from pathlib import Path

FFMPEG = Path(r"C:\Users\Hatsune\Documents\Codex\2026-08-28\referenced-chatgpt-conversation-this-is-an\.video_tools\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe")
VIDEO = Path(r"C:\Users\Hatsune\Desktop\486a8ac74fce3bf0d046534692eb53aa.mp4")

command = [
    str(FFMPEG), "-hide_banner", "-ss", "0", "-t", "270", "-i", str(VIDEO),
    "-vf", "select='gt(scene,0.05)',metadata=print", "-an", "-f", "null", "NUL",
]
result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace", check=True)
times = []
current_time = None
for line in result.stdout.splitlines():
    match_time = re.search(r"pts_time:([0-9.]+)", line)
    if match_time:
        current_time = float(match_time.group(1))
    match_score = re.search(r"lavfi\.scene_score=([0-9.]+)", line)
    if match_score and current_time is not None:
        times.append((current_time, float(match_score.group(1))))
        current_time = None

# Scene filter often flags adjacent frames around one cut; merge only detections within
# 0.12 s (about 2-3 frames at 22 fps). Faster changes remain separate candidates.
clusters = []
for item in times:
    if not clusters or item[0] - clusters[-1][-1][0] > 0.12:
        clusters.append([item])
    else:
        clusters[-1].append(item)
representatives = [max(cluster, key=lambda pair: pair[1]) for cluster in clusters]

print(f"raw={len(times)} clusters={len(representatives)}")
for threshold in (0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50):
    raw_selected = [item for item in times if item[1] >= threshold]
    selected = [item for item in representatives if item[1] >= threshold]
    print(f"threshold={threshold:.2f} raw_cuts={len(raw_selected)} merged_cuts={len(selected)} shots={len(selected)+1}")
print("CANDIDATES")
for index, (timestamp, score) in enumerate(representatives, 1):
    if score >= 0.15:
        print(f"{index:03d}|{timestamp:09.3f}|{score:.6f}")
