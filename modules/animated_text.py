"""
Animated Text Module
----------------------
Implements the "Create Animated Text" block (the RANANO logo-reveal-style
animation shown in the architecture diagram). Renders styled text frames
and compiles them into an animated GIF/MP4 with simple entrance effects:
fade-in, slide-in, or typewriter.
"""

from typing import Literal
from PIL import Image, ImageDraw, ImageFont
import numpy as np


def _load_font(size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype("DejaVuSans-Bold.ttf", size)
    except OSError:
        return ImageFont.load_default()


def generate_animated_text(
    text: str,
    output_path: str = "outputs/animated_text.gif",
    effect: Literal["fade", "slide", "typewriter"] = "fade",
    width: int = 800,
    height: int = 300,
    font_size: int = 64,
    bg_color: tuple = (15, 15, 25),
    text_color: tuple = (255, 200, 60),
    n_frames: int = 30,
    fps: int = 20,
) -> str:
    font = _load_font(font_size)
    frames = []

    for i in range(n_frames):
        t = i / max(n_frames - 1, 1)  # progress 0 -> 1
        frame = Image.new("RGB", (width, height), bg_color)
        draw = ImageDraw.Draw(frame)

        bbox = draw.textbbox((0, 0), text, font=font)
        text_w, text_h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        cx, cy = (width - text_w) // 2, (height - text_h) // 2

        if effect == "fade":
            alpha = int(255 * t)
            layer = Image.new("RGBA", frame.size, (0, 0, 0, 0))
            ImageDraw.Draw(layer).text(
                (cx, cy), text, font=font, fill=text_color + (alpha,)
            )
            frame = Image.alpha_composite(frame.convert("RGBA"), layer).convert("RGB")

        elif effect == "slide":
            offset_x = int((1 - t) * width)
            draw.text((cx + offset_x, cy), text, font=font, fill=text_color)

        elif effect == "typewriter":
            n_chars = max(1, int(len(text) * t))
            draw.text((cx, cy), text[:n_chars], font=font, fill=text_color)

        frames.append(frame)

    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=int(1000 / fps),
        loop=0,
    )
    return output_path
