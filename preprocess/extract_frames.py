#!/usr/bin/env python3
"""
Preprocessor for bad-apple-ascii.

Usage:
  python extract_frames.py <video.mp4> <output.bin> [--levels N]

  --levels N   Number of brightness levels (default 2 = binary black/white).
               Use 6-8 for color/tonal videos. Bad Apple works best at 2.

Also extract audio:
  ffmpeg -i video.mp4 -q:a 0 -map a audio.mp3

Requirements: ffmpeg on PATH, pip install pillow numpy
"""

import sys
import argparse
import subprocess
import tempfile
import struct
import os
from pathlib import Path

try:
    from PIL import Image
    import numpy as np
except ImportError:
    print("Missing dependencies. Run: pip install pillow numpy")
    sys.exit(1)

TEXT_ROWS     = 40
LOGICAL_WIDTH = 1000
FPS           = 30


def extract_frames(video_path: str, out_dir: str) -> None:
    os.makedirs(out_dir, exist_ok=True)
    cmd = [
        'ffmpeg', '-y', '-i', video_path,
        '-vf', f'fps={FPS}', '-q:v', '2',
        os.path.join(out_dir, 'frame_%05d.png')
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def pixel_to_level(brightness: np.ndarray, levels: int) -> np.ndarray:
    """
    Map 0-255 grayscale to 0..levels-1.
    Uses a slight gamma lift so midtones don't all collapse to the same level.
    """
    normalized = (brightness / 255.0) ** 0.75   # gamma correction
    return np.clip((normalized * levels).astype(np.int32), 0, levels - 1)


def frame_to_segments(png_path: str, levels: int) -> list[tuple[int, int, int, int]]:
    """
    Returns (logicalY, levelIndex, startX, endX) tuples.
    levelIndex 0 = darkest/skip, levels-1 = brightest.
    """
    img = Image.open(png_path).convert('L')
    img = img.resize((LOGICAL_WIDTH, TEXT_ROWS), Image.LANCZOS)
    pixels = np.array(img, dtype=np.uint8)

    quantized = pixel_to_level(pixels, levels)

    segments = []
    for row in range(TEXT_ROWS):
        row_q = quantized[row]
        changes = np.where(np.diff(row_q))[0] + 1
        starts  = np.concatenate(([0], changes))
        ends    = np.concatenate((changes, [LOGICAL_WIDTH]))
        for s, e in zip(starts, ends):
            segments.append((row, int(row_q[s]), int(s), int(e)))

    return segments


def write_frames_bin(all_segments: list, output_path: str) -> None:
    """
    Little-endian uint16 stream.
    Per frame: [numSegments, (logicalY, levelIndex, startX, endX)×N]
    levelIndex is 0..levels-1 — renderer uses this for char density + color.
    """
    values = []
    for segments in all_segments:
        values.append(len(segments))
        for (y, level, sx, ex) in segments:
            values.extend([y, level, sx, ex])

    data = struct.pack(f'<{len(values)}H', *values)
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(data)
    print(f"Wrote {output_path}  ({len(data)/1024/1024:.1f} MB, {len(all_segments)} frames, {levels} levels)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('video',  help='Input video file')
    parser.add_argument('output', help='Output .bin path')
    parser.add_argument('--levels', type=int, default=2,
                        help='Brightness levels (2=binary, 6=grayscale tonal)')
    args = parser.parse_args()

    global levels
    levels = args.levels

    if not os.path.exists(args.video):
        print(f"Error: {args.video} not found"); sys.exit(1)

    with tempfile.TemporaryDirectory() as tmpdir:
        print(f"Extracting frames from {args.video} at {FPS}fps...")
        extract_frames(args.video, tmpdir)

        frame_files = sorted(Path(tmpdir).glob('frame_*.png'))
        total = len(frame_files)
        print(f"Processing {total} frames at {levels} levels...")

        all_segs = []
        for i, fpath in enumerate(frame_files):
            if i % 200 == 0:
                print(f"  [{i/total*100:5.1f}%] {i}/{total}")
            all_segs.append(frame_to_segments(str(fpath), levels))

        write_frames_bin(all_segs, args.output)


if __name__ == '__main__':
    main()
