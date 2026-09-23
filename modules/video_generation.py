"""
Video Generation Module
-------------------------
Implements the "Convert Images to Video / Animation" block.

Two tiers:
1. slideshow_video() - simple, fast, CPU-only: stitches multiple images
   into a video sequence with transitions (matches "convert multiple
   images into a structured video sequence" objective).
2. svd_image_to_video() - Stable Video Diffusion: generates real AI motion
   from a single image (needs GPU, ~16-24GB VRAM recommended).
"""

from typing import List
from PIL import Image
import numpy as np
import torch


def slideshow_video(
    images: List[Image.Image],
    output_path: str = "outputs/slideshow.mp4",
    seconds_per_image: float = 2.0,
    fps: int = 24,
    size: tuple = (768, 768),
) -> str:
    """Builds a simple video sequence from multiple images (moviepy)."""
    try:
        from moviepy import ImageSequenceClip  # moviepy 2.x
    except ImportError:
        from moviepy.editor import ImageSequenceClip  # moviepy 1.x fallback

    frames = []
    n_frames_per_image = int(seconds_per_image * fps)
    for img in images:
        resized = img.convert("RGB").resize(size)
        arr = np.array(resized)
        frames.extend([arr] * n_frames_per_image)

    clip = ImageSequenceClip(frames, fps=fps)
    clip.write_videofile(output_path, codec="libx264", audio=False, logger=None)
    return output_path


_svd_pipeline = None


def load_svd_pipeline(model_id: str = "stabilityai/stable-video-diffusion-img2vid-xt"):
    global _svd_pipeline
    if _svd_pipeline is None:
        from diffusers import StableVideoDiffusionPipeline
        device = "cuda" if torch.cuda.is_available() else "cpu"
        _svd_pipeline = StableVideoDiffusionPipeline.from_pretrained(
            model_id, torch_dtype=torch.float16, variant="fp16"
        ).to(device)
    return _svd_pipeline


def svd_image_to_video(
    image: Image.Image,
    output_path: str = "outputs/svd_output.mp4",
    fps: int = 7,
) -> str:
    """Generates an AI-animated video clip from a single still image."""
    from diffusers.utils import export_to_video

    if not torch.cuda.is_available():
        raise RuntimeError("Stable Video Diffusion requires a CUDA GPU.")

    pipe = load_svd_pipeline()
    image = image.convert("RGB").resize((1024, 576))  # SVD's expected aspect
    frames = pipe(image, decode_chunk_size=8).frames[0]
    export_to_video(frames, output_path, fps=fps)
    return output_path


def generate_video(images: List[Image.Image], mode: str = "slideshow", output_path: str = None) -> str:
    """Unified entry point used by the API/app."""
    if mode == "svd" and torch.cuda.is_available():
        return svd_image_to_video(images[0], output_path=output_path or "outputs/svd_output.mp4")
    return slideshow_video(images, output_path=output_path or "outputs/slideshow.mp4")
