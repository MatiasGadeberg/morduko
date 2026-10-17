#!/usr/bin/env python3
"""Draw known Sudoku photos and isolated printed digits for the scanner."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures"
DIGITS = Path("/tmp/morduko-digits")
PUZZLE = json.loads((ROOT / "src" / "data" / "classic.json").read_text())["givens"]

FONTS = [
    ("LiberationSerif", "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"),
    ("LiberationSerif-Bold", "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"),
    ("LiberationSans", "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
    ("LiberationSans-Bold", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"),
    ("DejaVuSerif", "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"),
    ("DejaVuSerif-Bold", "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"),
    ("DejaVuSans", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ("DejaVuSans-Bold", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ("NotoSerif", "/usr/share/fonts/truetype/noto/NotoSerif-Regular.ttf"),
    ("NotoSerif-Bold", "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf"),
    ("NotoSans", "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"),
    ("NotoSans-Bold", "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"),
    ("NotoSansDisplay", "/usr/share/fonts/truetype/noto/NotoSansDisplay-Regular.ttf"),
    ("NotoSansDisplay-Bold", "/usr/share/fonts/truetype/noto/NotoSansDisplay-Bold.ttf"),
]


def perspective_coeffs(src: list[tuple[float, float]], dst: list[tuple[float, float]]) -> list[float]:
    matrix = []
    vector = []
    for (x, y), (u, v) in zip(dst, src):
        matrix.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        matrix.append([0, 0, 0, x, y, 1, -v * x, -v * y])
        vector.extend([u, v])
    return np.linalg.solve(np.array(matrix, dtype=float), np.array(vector, dtype=float)).tolist()


def wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for word in text.split():
        trial = word if not current else f"{current} {word}"
        if draw.textlength(trial, font=font) <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_paragraph(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont,
    xy: tuple[int, int],
    width: int,
    fill: str = "#221c16",
    gap: int = 8,
) -> int:
    y = xy[1]
    for line in wrap(draw, text, font, width):
        draw.text((xy[0], y), line, font=font, fill=fill)
        y += font.size + gap
    return y


def draw_grid(
    draw: ImageDraw.ImageDraw,
    origin: tuple[int, int],
    size: int,
    font: ImageFont.FreeTypeFont,
    givens: list[int],
) -> None:
    x0, y0 = origin
    cell = size / 9
    for i in range(10):
        width = 5 if i % 3 == 0 else 2
        pos = round(i * cell)
        draw.line([(x0 + pos, y0), (x0 + pos, y0 + size)], fill="#111111", width=width)
        draw.line([(x0, y0 + pos), (x0 + size, y0 + pos)], fill="#111111", width=width)
    for row in range(9):
        for col in range(9):
            digit = givens[row * 9 + col]
            if not digit:
                continue
            text = str(digit)
            box = draw.textbbox((0, 0), text, font=font)
            tw, th = box[2] - box[0], box[3] - box[1]
            cx = x0 + col * cell + cell / 2 - tw / 2 - box[0]
            cy = y0 + row * cell + cell / 2 - th / 2 - box[1]
            draw.text((cx, cy), text, font=font, fill="#161616")


ARTICLE = (
    "The council met on Tuesday to talk about the harbour wall, the late bus, "
    "and whether the library can stay open on Sundays. A short item on the "
    "weather said the week would stay dry. The puzzle is printed below the fold, "
    "the same way it has been for years."
)


def render_page(width: int, height: int, grid_at: tuple[int, int], grid_size: int, digit_font: str) -> Image.Image:
    image = Image.new("RGB", (width, height), "#f7f4ee")
    draw = ImageDraw.Draw(image)
    headline = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf", 64)
    body = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf", 28)
    small = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf", 24)
    draw.text((70, 48), "The Evening Post", font=headline, fill="#1a1612")
    draw_paragraph(draw, ARTICLE, body, (70, 140), width - 160)
    draw.text((grid_at[0], grid_at[1] - 46), "Today's Sudoku", font=small, fill="#3a332c")
    draw_grid(draw, grid_at, grid_size, ImageFont.truetype(digit_font, int(grid_size / 9 * 0.62)), PUZZLE)
    caption_y = grid_at[1] + grid_size + 28
    draw_paragraph(
        draw,
        "No prize this week, just the pleasure of a full grid. Pencils are fine. Ink is brave. "
        "The letters page continues on the next column, past the crossword and the tide table.",
        body,
        (70, caption_y),
        width - 160,
    )
    return image


def render_digits() -> None:
    DIGITS.mkdir(parents=True, exist_ok=True)
    for name, path in FONTS:
        for size in (120, 168):
            font = ImageFont.truetype(path, size)
            for digit in range(1, 10):
                image = Image.new("RGB", (240, 280), "white")
                draw = ImageDraw.Draw(image)
                text = str(digit)
                box = draw.textbbox((0, 0), text, font=font)
                tw, th = box[2] - box[0], box[3] - box[1]
                draw.text(((240 - tw) / 2 - box[0], (280 - th) / 2 - box[1]), text, font=font, fill="black")
                image.save(DIGITS / f"{name}-{size}__{digit}.png")


def render_no_grid() -> None:
    image = Image.new("RGB", (1100, 1400), "#f6f3ec")
    draw = ImageDraw.Draw(image)
    headline = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf", 68)
    body = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf", 32)
    draw.text((70, 60), "Letters to the editor", font=headline, fill="#1a1612")
    y = 170
    paragraphs = [
        "Sir, the new benches on the promenade are welcome, though the wind still finds you if you sit on the end one.",
        "Madam, I write to say the Tuesday market was as good as ever. The flowers lasted through the week.",
        "The late train on Friday was only six minutes behind, which I mention because nobody else will.",
        "Please keep printing the tide times. I do not own a telephone that tells me the sea.",
    ]
    for paragraph in paragraphs:
        y = draw_paragraph(draw, paragraph, body, (70, y), 960) + 28
        draw.line([(70, y - 16), (980, y - 16)], fill="#333333", width=2)
    draw.rectangle((70, y + 20, 980, y + 360), outline="#222222", width=3)
    draw.text((90, y + 160), "A photograph of the harbour would go here.", font=body, fill="#444444")
    image.save(FIXTURES / "no-grid.png")


def main() -> None:
    FIXTURES.mkdir(parents=True, exist_ok=True)
    clean = render_page(
        1080,
        1380,
        (150, 390),
        780,
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
    )
    clean.save(FIXTURES / "puzzle-clean.png")

    page = render_page(
        1400,
        1700,
        (280, 430),
        860,
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    )
    tilted = page.rotate(7, expand=True, fillcolor="#f7f4ee", resample=Image.Resampling.BICUBIC)
    w, h = tilted.size
    src = [(36, 18), (w - 70, 42), (w - 24, h - 28), (18, h - 20)]
    dst = [(0, 0), (w - 1, 0), (w - 1, h - 1), (0, h - 1)]
    skewed = tilted.transform(
        (w, h),
        Image.PERSPECTIVE,
        perspective_coeffs(src, dst),
        Image.Resampling.BICUBIC,
        fillcolor="#f4f1ea",
    )
    margin = 90
    canvas = Image.new("RGB", (skewed.width + margin * 2, skewed.height + margin * 2), "#efeae0")
    canvas.paste(skewed, (margin, margin))
    draw = ImageDraw.Draw(canvas)
    note = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", 28)
    draw.text((36, 28), "Kitchen table, Thursday", font=note, fill="#5c5348")
    canvas.save(FIXTURES / "puzzle-tilted.png")
    render_no_grid()
    render_digits()
    print(f"wrote fixtures to {FIXTURES}")


if __name__ == "__main__":
    main()
