"""Download the labelled Wikimedia Commons clips listed in labels.csv into clips/ (videos aren't committed)."""

from __future__ import annotations

import csv
import subprocess
import urllib.request
from pathlib import Path

UA = {"User-Agent": "rally-repcount/0.1 (hackathon research)"}


def main() -> None:
    out = Path("clips")
    out.mkdir(exist_ok=True)
    for r in csv.DictReader(Path("labels.csv").open()):
        dest = out / r["file"]
        if dest.exists():
            continue
        raw = dest.with_suffix(Path(r["source"]).suffix)
        raw.write_bytes(urllib.request.urlopen(urllib.request.Request(r["source"], headers=UA)).read())
        if raw != dest:  # OpenCV can't decode Ogg Theora; transcode with ffmpeg
            subprocess.run(
                ["ffmpeg", "-loglevel", "error", "-y", "-i", str(raw), "-c:v", "libx264", "-an", str(dest)], check=True
            )
            raw.unlink()
        print("fetched", dest)


if __name__ == "__main__":
    main()
