"""
RANANO Image Enhancement
------------------------

This module handles lightweight image cleanup.

The main RANANO DDPM generation pipeline does NOT use this module
for super-resolution.

The generation pipeline is:

    RANANO DDPM
        |
        v
      96x96
        |
        v
    super_resolution.py
        |
        v
    TensorFlow Hub ESRGAN x4
        |
        v
      384x384

This module is intentionally lightweight and CPU-friendly.

Modes:

    fast
        Fast OpenCV cleanup.
        Preserves the input resolution.

    quality
        Kept for compatibility.
        The FastAPI backend routes quality/esrgan requests to
        modules/super_resolution.py instead.

No EDSR.
No Stable Diffusion upscaler.
No external image-generation API.
"""

from __future__ import annotations

import cv2
import numpy as np

from PIL import Image, ImageEnhance


# ============================================================================
# FAST ENHANCEMENT
# ============================================================================

def fast_enhance(
    image: Image.Image,
) -> Image.Image:
    """
    Fast CPU-only image cleanup.

    Operations:

        RGB
         |
         v
        mild denoise
         |
         v
        gentle sharpening
         |
         v
        slight contrast
         |
         v
        RGB

    The original image dimensions are preserved.
    """

    if image is None:

        raise ValueError(
            "No image was provided."
        )

    image = image.convert(
        "RGB"
    )

    # ------------------------------------------------------------------
    # PIL -> NumPy
    # ------------------------------------------------------------------

    rgb = np.asarray(
        image,
        dtype=np.uint8,
    )

    # ------------------------------------------------------------------
    # RGB -> BGR for OpenCV
    # ------------------------------------------------------------------

    bgr = cv2.cvtColor(
        rgb,
        cv2.COLOR_RGB2BGR,
    )

    # ------------------------------------------------------------------
    # Mild denoising
    #
    # Keep this deliberately low so small DDPM details are not destroyed.
    # ------------------------------------------------------------------

    denoised = (
        cv2.fastNlMeansDenoisingColored(
            bgr,
            None,
            3,
            3,
            7,
            21,
        )
    )

    # ------------------------------------------------------------------
    # Gentle unsharp mask
    # ------------------------------------------------------------------

    blurred = cv2.GaussianBlur(
        denoised,
        (0, 0),
        sigmaX=1.0,
    )

    sharpened = cv2.addWeighted(
        denoised,
        1.18,
        blurred,
        -0.18,
        0,
    )

    # ------------------------------------------------------------------
    # BGR -> RGB
    # ------------------------------------------------------------------

    result_rgb = cv2.cvtColor(
        sharpened,
        cv2.COLOR_BGR2RGB,
    )

    result = Image.fromarray(
        result_rgb,
        mode="RGB",
    )

    # ------------------------------------------------------------------
    # Very mild contrast enhancement
    # ------------------------------------------------------------------

    result = ImageEnhance.Contrast(
        result
    ).enhance(
        1.015
    )

    # ------------------------------------------------------------------
    # Very mild color preservation
    # ------------------------------------------------------------------

    result = ImageEnhance.Color(
        result
    ).enhance(
        1.005
    )

    return result


# ============================================================================
# QUALITY COMPATIBILITY FUNCTION
# ============================================================================

def quality_enhance(
    image: Image.Image,
) -> Image.Image:
    """
    Compatibility wrapper.

    The actual AI super-resolution path is now handled by:

        modules/super_resolution.py

    using TensorFlow Hub ESRGAN x4.

    This function deliberately does not load EDSR or Stable Diffusion.
    """

    return fast_enhance(
        image
    )


# ============================================================================
# UNIFIED API
# ============================================================================

def enhance(
    image: Image.Image,
    mode: str = "fast",
) -> Image.Image:
    """
    Unified enhancement entry point.

    Parameters
    ----------
    image:
        PIL image.

    mode:
        fast
            Lightweight OpenCV enhancement.

        quality
            Compatibility mode. Uses lightweight cleanup.

        esrgan
            The FastAPI backend routes this mode directly through
            super_resolution.py, but this function remains safe if called
            independently.

    Returns
    -------
    PIL.Image.Image
    """

    if image is None:

        raise ValueError(
            "No image was provided."
        )

    mode = (
        str(mode)
        .strip()
        .lower()
    )

    if mode in {
        "fast",
        "preview",
        "basic",
    }:

        return fast_enhance(
            image
        )

    if mode in {
        "quality",
        "high",
        "esrgan",
        "super_resolution",
    }:

        # Do not import TensorFlow here automatically.
        #
        # The backend explicitly calls super_resolution.py for the
        # ESRGAN path. Keeping this module lightweight prevents
        # TensorFlow from being initialized for normal fast enhancement.
        return quality_enhance(
            image
        )

    # Unknown mode:
    #
    # Safest behavior is the fast CPU enhancement rather than crashing.
    return fast_enhance(
        image
    )


# ============================================================================
# SIMPLE TEST
# ============================================================================

if __name__ == "__main__":

    import sys
    from pathlib import Path

    if len(sys.argv) < 2:

        print(
            "Usage:"
        )

        print(
            "python modules/image_enhancement.py input.png"
        )

        raise SystemExit(0)

    input_path = Path(
        sys.argv[1]
    )

    if not input_path.exists():

        print(
            f"File not found: {input_path}"
        )

        raise SystemExit(1)

    image = Image.open(
        input_path
    ).convert(
        "RGB"
    )

    print(
        f"Input: {image.size}"
    )

    enhanced = fast_enhance(
        image
    )

    output_path = (
        input_path.parent
        / f"{input_path.stem}_enhanced.png"
    )

    enhanced.save(
        output_path
    )

    print(
        f"Output: {output_path}"
    )

    print(
        f"Output size: {enhanced.size}"
    )