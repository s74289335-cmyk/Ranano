"""
RANANO DSR - CPU Deep Super Resolution
---------------------------------------

Purpose
-------
Improve the visual quality of the 96x96 images produced by the
RANANO from-scratch DDPM.

Pipeline:

    DDPM 96x96
        |
        v
    DSR / EDSR x4 (when model is available)
        |
        v
    Edge-preserving cleanup
        |
        v
    Detail recovery
        |
        v
    Color refinement
        |
        v
    384x384

Important
---------
- No external image-generation API.
- No GPU required.
- Does not modify the DDPM.
- Does not modify the DDPM checkpoint.
- Does not retrain the diffusion model.
- EDSR is optional.
- If EDSR is unavailable, a CPU fallback is used.

The EDSR model is used only for super-resolution. Your actual fruit
generation still comes from your own DDPM.
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageEnhance


# ============================================================================
# CONFIGURATION
# ============================================================================

DSR_SCALE = 4
DEFAULT_OUTPUT_SIZE = 384

# Search several reasonable locations so the project does not break
# depending on where the EDSR model is placed.
PROJECT_ROOT = Path(__file__).resolve().parent.parent

DSR_MODEL_CANDIDATES = [
    PROJECT_ROOT / "models" / "EDSR_x4.pb",
    PROJECT_ROOT / "models" / "edsr_x4.pb",
    PROJECT_ROOT / "checkpoints" / "EDSR_x4.pb",
    PROJECT_ROOT / "checkpoints" / "edsr_x4.pb",
    PROJECT_ROOT / "checkpoints" / "EDSR" / "EDSR_x4.pb",
]

ENABLE_EDSR = True


# ============================================================================
# MODEL CACHE
# ============================================================================

_sr_model = None
_sr_checked = False


# ============================================================================
# BASIC UTILITIES
# ============================================================================

def _pil_to_array(image: Image.Image) -> np.ndarray:
    if image is None:
        raise ValueError("No image was provided.")

    return np.asarray(
        image.convert("RGB"),
        dtype=np.uint8,
    )


def _array_to_pil(array: np.ndarray) -> Image.Image:
    array = np.clip(
        array,
        0,
        255,
    ).astype(np.uint8)

    return Image.fromarray(
        array,
        mode="RGB",
    )


# ============================================================================
# FIND EDSR MODEL
# ============================================================================

def _find_edsr_model() -> Path | None:
    """
    Find an optional EDSR x4 model.

    The project continues working normally if the model is absent.
    """

    for path in DSR_MODEL_CANDIDATES:
        if path.exists() and path.is_file():
            return path

    return None


# ============================================================================
# LOAD EDSR
# ============================================================================

def _load_edsr():
    """
    Load OpenCV DNN Super Resolution EDSR model.

    CPU only.

    Returns:
        OpenCV super-resolution object or None.
    """

    global _sr_model
    global _sr_checked

    if _sr_checked:
        return _sr_model

    _sr_checked = True

    if not ENABLE_EDSR:
        print(
            "[DSR] EDSR disabled. Using CPU fallback.",
            flush=True,
        )
        return None

    model_path = _find_edsr_model()

    if model_path is None:
        print(
            "[DSR] EDSR_x4.pb not found.",
            flush=True,
        )
        print(
            "[DSR] Using CPU super-resolution fallback.",
            flush=True,
        )
        return None

    if not hasattr(cv2, "dnn_superres"):
        print(
            "[DSR] OpenCV DNN Super Resolution is unavailable.",
            flush=True,
        )
        print(
            "[DSR] Install opencv-contrib-python to enable EDSR.",
            flush=True,
        )
        return None

    try:
        print(
            f"[DSR] Loading EDSR x4 CPU model: {model_path}",
            flush=True,
        )

        sr = cv2.dnn_superres.DnnSuperResImpl_create()

        sr.readModel(
            str(model_path)
        )

        sr.setModel(
            "edsr",
            4,
        )

        sr.setPreferableBackend(
            cv2.dnn.DNN_BACKEND_OPENCV
        )

        sr.setPreferableTarget(
            cv2.dnn.DNN_TARGET_CPU
        )

        _sr_model = sr

        print(
            "[DSR] EDSR x4 CPU model ready.",
            flush=True,
        )

        return _sr_model

    except Exception as exc:
        print(
            f"[DSR] Failed to load EDSR: {exc}",
            flush=True,
        )

        print(
            "[DSR] Using CPU fallback.",
            flush=True,
        )

        _sr_model = None

        return None


# ============================================================================
# LANCZOS FALLBACK
# ============================================================================

def _lanczos_upscale(
    image: Image.Image,
    scale: int = DSR_SCALE,
) -> Image.Image:
    """
    High-quality classical CPU resize.

    This is a fallback only. It does not invent true missing detail.
    """

    rgb = _pil_to_array(image)

    height, width = rgb.shape[:2]

    new_width = int(width * scale)
    new_height = int(height * scale)

    upscaled = cv2.resize(
        rgb,
        (
            new_width,
            new_height,
        ),
        interpolation=cv2.INTER_LANCZOS4,
    )

    return _array_to_pil(
        upscaled
    )


# ============================================================================
# EDSR SUPER RESOLUTION
# ============================================================================

def super_resolve(
    image: Image.Image,
) -> Image.Image:
    """
    Main DSR super-resolution stage.

    Uses EDSR x4 when available.

    Otherwise uses Lanczos x4.
    """

    image = image.convert("RGB")

    sr = _load_edsr()

    if sr is None:
        return _lanczos_upscale(
            image,
            DSR_SCALE,
        )

    try:
        rgb = _pil_to_array(image)

        # OpenCV DNN Super Resolution expects BGR.
        bgr = cv2.cvtColor(
            rgb,
            cv2.COLOR_RGB2BGR,
        )

        result = sr.upsample(
            bgr
        )

        result = cv2.cvtColor(
            result,
            cv2.COLOR_BGR2RGB,
        )

        return _array_to_pil(
            result
        )

    except Exception as exc:
        print(
            f"[DSR] EDSR inference failed: {exc}",
            flush=True,
        )

        print(
            "[DSR] Falling back to Lanczos.",
            flush=True,
        )

        return _lanczos_upscale(
            image,
            DSR_SCALE,
        )


# ============================================================================
# EDGE PRESERVATION
# ============================================================================

def preserve_edges(
    image: Image.Image,
) -> Image.Image:
    """
    Very mild bilateral filtering.

    This reduces pixel-level diffusion artifacts while preserving
    the major fruit boundary.
    """

    rgb = _pil_to_array(
        image
    )

    filtered = cv2.bilateralFilter(
        rgb,
        d=5,
        sigmaColor=18,
        sigmaSpace=18,
    )

    return _array_to_pil(
        filtered
    )


# ============================================================================
# LIGHT DENOISING
# ============================================================================

def denoise(
    image: Image.Image,
) -> Image.Image:
    """
    Mild denoising.

    The strength is intentionally low because excessive denoising
    can make the already-small DDPM output look plastic.
    """

    rgb = _pil_to_array(
        image
    )

    bgr = cv2.cvtColor(
        rgb,
        cv2.COLOR_RGB2BGR,
    )

    result = cv2.fastNlMeansDenoisingColored(
        bgr,
        None,
        h=2,
        hColor=2,
        templateWindowSize=7,
        searchWindowSize=21,
    )

    result = cv2.cvtColor(
        result,
        cv2.COLOR_BGR2RGB,
    )

    return _array_to_pil(
        result
    )


# ============================================================================
# LOCAL CONTRAST
# ============================================================================

def improve_contrast(
    image: Image.Image,
) -> Image.Image:
    """
    Improve local contrast using LAB + CLAHE.
    """

    rgb = _pil_to_array(
        image
    )

    lab = cv2.cvtColor(
        rgb,
        cv2.COLOR_RGB2LAB,
    )

    l_channel, a_channel, b_channel = cv2.split(
        lab
    )

    clahe = cv2.createCLAHE(
        clipLimit=1.15,
        tileGridSize=(8, 8),
    )

    l_channel = clahe.apply(
        l_channel
    )

    merged = cv2.merge(
        [
            l_channel,
            a_channel,
            b_channel,
        ]
    )

    result = cv2.cvtColor(
        merged,
        cv2.COLOR_LAB2RGB,
    )

    return _array_to_pil(
        result
    )


# ============================================================================
# DETAIL RECOVERY
# ============================================================================

def recover_details(
    image: Image.Image,
) -> Image.Image:
    """
    Controlled unsharp masking.

    This improves perceived edge definition without excessive halos.
    """

    rgb = _pil_to_array(
        image
    ).astype(np.float32)

    smooth = cv2.GaussianBlur(
        rgb,
        (
            0,
            0,
        ),
        sigmaX=1.15,
    )

    high_frequency = (
        rgb - smooth
    )

    result = (
        rgb + high_frequency * 0.28
    )

    return _array_to_pil(
        result
    )


# ============================================================================
# MICRO DETAIL
# ============================================================================

def recover_micro_details(
    image: Image.Image,
) -> Image.Image:
    """
    Additional subtle high-frequency recovery.

    This does not create factual information that was absent from
    the source. It only strengthens existing boundaries.
    """

    rgb = _pil_to_array(
        image
    ).astype(np.float32)

    smooth = cv2.GaussianBlur(
        rgb,
        (
            0,
            0,
        ),
        sigmaX=2.0,
    )

    high_frequency = (
        rgb - smooth
    )

    result = (
        rgb + high_frequency * 0.12
    )

    return _array_to_pil(
        result
    )


# ============================================================================
# COLOR REFINEMENT
# ============================================================================

def improve_color(
    image: Image.Image,
) -> Image.Image:
    """
    Very small color correction.
    """

    result = ImageEnhance.Contrast(
        image
    ).enhance(
        1.035
    )

    result = ImageEnhance.Color(
        result
    ).enhance(
        1.025
    )

    return result


# ============================================================================
# FINAL EDGE PASS
# ============================================================================

def final_edge_pass(
    image: Image.Image,
) -> Image.Image:
    """
    Final controlled edge enhancement.

    No aggressive sharpening.
    """

    rgb = _pil_to_array(
        image
    )

    blurred = cv2.GaussianBlur(
        rgb,
        (
            0,
            0,
        ),
        sigmaX=0.7,
    )

    result = cv2.addWeighted(
        rgb,
        1.12,
        blurred,
        -0.12,
        0,
    )

    return _array_to_pil(
        result
    )


# ============================================================================
# MAIN DSR PIPELINE
# ============================================================================

def enhance_generated_image(
    image: Image.Image,
    output_size: int = DEFAULT_OUTPUT_SIZE,
) -> Image.Image:
    """
    Main RANANO DSR pipeline.

    96x96
       |
       v
    EDSR x4 / Lanczos x4
       |
       v
    384x384
       |
       v
    edge preservation
       |
       v
    denoise
       |
       v
    local contrast
       |
       v
    detail recovery
       |
       v
    color refinement
       |
       v
    final edge pass
       |
       v
    384x384
    """

    if image is None:
        raise ValueError(
            "No image was provided."
        )

    image = image.convert(
        "RGB"
    )

    # 1. Super resolution
    image = super_resolve(
        image
    )

    # 2. Edge preservation
    image = preserve_edges(
        image
    )

    # 3. Mild denoising
    image = denoise(
        image
    )

    # 4. Local contrast
    image = improve_contrast(
        image
    )

    # 5. Detail recovery
    image = recover_details(
        image
    )

    # 6. Micro detail
    image = recover_micro_details(
        image
    )

    # 7. Color
    image = improve_color(
        image
    )

    # 8. Final edge pass
    image = final_edge_pass(
        image
    )

    # 9. Guarantee final dimensions
    if image.size != (
        output_size,
        output_size,
    ):
        image = image.resize(
            (
                output_size,
                output_size,
            ),
            Image.Resampling.LANCZOS,
        )

    return image


# ============================================================================
# COMPATIBILITY FUNCTIONS
# ============================================================================

def enhance(
    image: Image.Image,
    mode: str = "quality",
) -> Image.Image:
    """
    Public compatibility entry point.
    """

    if image is None:
        raise ValueError(
            "No image was provided."
        )

    return enhance_generated_image(
        image
    )


def dsr(
    image: Image.Image,
) -> Image.Image:
    """
    Short alias.
    """

    return enhance_generated_image(
        image
    )


# ============================================================================
# COMMAND-LINE TEST
# ============================================================================

if __name__ == "__main__":

    import sys

    if len(sys.argv) < 2:
        print(
            "Usage:"
        )
        print(
            "python modules/dsr.py input.png"
        )
        sys.exit(0)

    input_path = Path(
        sys.argv[1]
    )

    if not input_path.exists():
        print(
            f"File not found: {input_path}"
        )
        sys.exit(1)

    output_path = (
        input_path.parent
        / f"{input_path.stem}_dsr.png"
    )

    image = Image.open(
        input_path
    )

    print(
        f"[DSR] Input: {image.size}"
    )

    result = enhance_generated_image(
        image
    )

    result.save(
        output_path
    )

    print(
        f"[DSR] Output: {result.size}"
    )

    print(
        f"[DSR] Saved: {output_path}"
    )