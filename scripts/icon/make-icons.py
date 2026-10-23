"""Generates the Workstation icon set from one SVG design.

Outputs (paths relative to the repo root):
  public/favicon.svg, public/icon-*.png, public/apple-touch-icon.png  (web / app window)
  public/logo-mark.svg                                                (menu bar logo)
  desktop/icon.ico                                                    (Workstation.exe)

The design is drawn at three levels of detail so it stays crisp when small:
  small  (<= 24 px): one window, two text lines
  medium (32-48 px): one window, text lines, sparkle
  full   (>= 64 px): two stacked windows, text, sparkle

Requires Playwright with Chromium for rasterizing:  python3 scripts/icon/make-icons.py
"""
import io
import os
import struct
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# Palette taken from the app: window chrome, traffic lights, sand wallpaper, amber sparkle.
ROSE, AMBER, EMERALD = "#F43F5E", "#FBBF24", "#10B981"
SAND = "#DCD2C4"
PAPER = "#FBFAF7"
INK = "#3F3F46"


def sparkle(cx, cy, r, fill, shadow=False):
    """Four-point star (the app's AI / Flow sparkle)."""
    k = r * 0.4
    return (
        f'<path d="M{cx},{cy - r} C{cx + k * 0.35},{cy - k} {cx + k},{cy - k * 0.35} {cx + r},{cy} '
        f'C{cx + k},{cy + k * 0.35} {cx + k * 0.35},{cy + k} {cx},{cy + r} '
        f'C{cx - k * 0.35},{cy + k} {cx - k},{cy + k * 0.35} {cx - r},{cy} '
        f'C{cx - k},{cy - k * 0.35} {cx - k * 0.35},{cy - k} {cx},{cy - r} Z" fill="{fill}"'
        + (' filter="url(#shadow)"' if shadow else "")
        + "/>"
    )


def window(x, y, w, h, r, bar, dot_r, fill, bar_fill, dots=True, shadow=True):
    out = []
    filt = ' filter="url(#shadow)"' if shadow else ""
    out.append(f'<g{filt}>')
    out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"/>')
    out.append(f'<path d="M{x},{y + bar} V{y + r} a{r},{r} 0 0 1 {r},-{r} H{x + w - r} a{r},{r} 0 0 1 {r},{r} V{y + bar} Z" fill="{bar_fill}"/>')
    out.append('</g>')
    if dots:
        cy = y + bar / 2
        gap = dot_r * 3.1
        for i, color in enumerate((ROSE, AMBER, EMERALD)):
            out.append(f'<circle cx="{x + bar * 0.62 + i * gap}" cy="{cy}" r="{dot_r}" fill="{color}"/>')
    return "".join(out)


def lines(x, y, widths, thickness, gap, color):
    return "".join(
        f'<rect x="{x}" y="{y + i * gap}" width="{w}" height="{thickness}" rx="{thickness / 2}" fill="{color}"/>'
        for i, w in enumerate(widths)
    )


def svg(level: str) -> str:
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">',
        "<defs>",
        '<linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#34343A"/><stop offset="1" stop-color="#121214"/></linearGradient>',
        '<linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.14"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>',
        '<filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">'
        '<feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000" flood-opacity="0.45"/></filter>',
        "</defs>",
        # Tile
        '<rect x="56" y="56" width="912" height="912" rx="208" fill="url(#tile)"/>',
        '<rect x="56" y="56" width="912" height="912" rx="208" fill="url(#gloss)"/>',
        '<rect x="58" y="58" width="908" height="908" rx="206" fill="none" stroke="#FFFFFF" stroke-opacity="0.10" stroke-width="4"/>',
    ]

    if level == "small":
        parts.append(window(150, 210, 724, 604, 72, 168, 40, PAPER, "#ECE7DF", shadow=False))
        parts.append(lines(232, 470, [520, 380], 72, 150, INK))
    elif level == "medium":
        parts.append(window(156, 214, 712, 596, 66, 150, 34, PAPER, "#ECE7DF", shadow=False))
        parts.append(lines(232, 448, [500, 400, 300], 54, 104, INK))
        parts.append(sparkle(770, 730, 150, AMBER))
    else:
        # back window (sand), front window (paper), text, sparkle
        parts.append(window(330, 176, 520, 410, 52, 96, 0, SAND, "#CFC3B2", dots=False))
        parts.append(window(174, 316, 610, 500, 58, 118, 24, PAPER, "#ECE7DF"))
        parts.append(lines(250, 500, [440, 380, 250], 38, 82, INK))
        parts.append('<rect x="520" y="658" width="14" height="70" rx="7" fill="#18181B"/>')  # text cursor
        parts.append(sparkle(784, 744, 138, AMBER, shadow=True))

    parts.append("</svg>")
    return "".join(parts)


def level_for(size: int) -> str:
    return "small" if size <= 24 else "medium" if size <= 48 else "full"


def write_ico(path: str, pngs: dict[int, bytes]):
    """ICO with PNG-compressed entries (supported by Windows Vista and later)."""
    sizes = sorted(pngs)
    header = struct.pack("<HHH", 0, 1, len(sizes))
    offset = 6 + 16 * len(sizes)
    entries, blobs = b"", b""
    for s in sizes:
        data = pngs[s]
        dim = 0 if s >= 256 else s
        entries += struct.pack("<BBBBHHII", dim, dim, 0, 0, 1, 32, len(data), offset)
        blobs += data
        offset += len(data)
    with open(path, "wb") as f:
        f.write(header + entries + blobs)


def main():
    public = os.path.join(ROOT, "public")
    os.makedirs(public, exist_ok=True)

    with open(os.path.join(public, "favicon.svg"), "w") as f:
        f.write(svg("medium"))
    with open(os.path.join(public, "logo-mark.svg"), "w") as f:  # menu bar logo
        f.write(svg("small"))

    renders: dict[int, bytes] = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        for size in [16, 20, 24, 32, 40, 48, 64, 96, 128, 180, 192, 256, 512]:
            page.set_viewport_size({"width": size, "height": size})
            sized = svg(level_for(size)).replace("<svg ", '<svg width="%d" height="%d" ' % (size, size), 1)
            page.set_content('<html><body style="margin:0;background:transparent">' + sized + "</body></html>")
            renders[size] = page.screenshot(omit_background=True, clip={"x": 0, "y": 0, "width": size, "height": size})
        browser.close()

    for size, name in [(32, "icon-32.png"), (192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")]:
        with open(os.path.join(public, name), "wb") as f:
            f.write(renders[size])

    write_ico(os.path.join(ROOT, "desktop", "icon.ico"), {s: renders[s] for s in [16, 20, 24, 32, 40, 48, 64, 96, 128, 256]})
    print("Wrote public/favicon.svg, public/logo-mark.svg, public/icon-{32,192,512}.png, public/apple-touch-icon.png, desktop/icon.ico")

    if "--preview" in sys.argv:
        from PIL import Image

        sheet_sizes = [16, 24, 32, 48, 64, 128, 256]
        w = sum(sheet_sizes) + 40 * (len(sheet_sizes) + 1)
        for bg, name in [((243, 243, 243), "light"), ((32, 32, 32), "dark")]:
            sheet = Image.new("RGB", (w, 256 + 80), bg)
            x = 40
            for s in sheet_sizes:
                img = Image.open(io.BytesIO(renders[s])).convert("RGBA")
                sheet.paste(img, (x, 40 + 256 - s), img)
                x += s + 40
            out = sys.argv[sys.argv.index("--preview") + 1]
            sheet.save(f"{out}-{name}.png")


if __name__ == "__main__":
    main()
