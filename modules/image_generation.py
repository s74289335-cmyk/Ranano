"""
Image Generation Module (from-scratch, class-conditional DDPM inference
+ optional Pollinations.ai-generated background composite)
--------------------------------------------------------------------------
Loads YOUR trained U-Net checkpoint (from train_diffusion.py) and runs
the reverse diffusion sampling loop to generate a new image. The fruit
itself is always your own trained model - no pretrained weights, no API
calls for that part.

Text-to-image note: this is NOT open-vocabulary text-to-image like
Stable Diffusion on its own. There is no language model in the DDPM
itself. What happens: your DDPM is conditioned on a *class label* (one
of the 8 fruits it was trained on), and `match_prompt_to_class` does
simple keyword matching to turn a typed phrase like "a cool apple on the
beach" into the "Apple" class.

DISCLOSED EXTERNAL API USE: if use_background is requested, the leftover
descriptive words in the prompt (e.g. "on the beach", "cool") are sent
to Pollinations.ai (a free, keyless image generation API - see
generate_background_image below) to generate a background scene, and
your DDPM-generated fruit is composited on top of it via simple
background removal. This part is explicitly NOT your own trained model -
be upfront about that in any writeup/demo.
"""

import io
import os
import re
import torch
torch.set_num_threads(1)  # avoid OpenMP/MKL threading deadlocks when called from a worker thread (see backend/main.py)
from PIL import Image
import numpy as np

# Image generation itself remains entirely inside the trained RANANO DDPM.
# Super-resolution is deliberately a separate post-processing stage.

from models.unet import UNet
from models.diffusion import DDPM
from data.fruits360_loader import DEFAULT_CLASSES

_ddpm = None
CHECKPOINT_PATH = "checkpoints/diffusion_epoch_200.pt"  # trained with --image_size 96, all 8 classes learning correctly
IMAGE_SIZE = 96  # must match --image_size used when training this checkpoint

# Maps typed words to a known class. Add synonyms here as needed - this is
# plain keyword matching, not a trained model, so it's easy to extend.
_KEYWORD_TO_CLASS = {
    "banana": "Banana 1",
    "apple": "Apple Red 1",
    "orange": "Orange 1",
    "strawberry": "Strawberry 1",
    "pineapple": "Pineapple 1",
    "lemon": "Lemon 1",
    "mango": "Mango 1",
    "kiwi": "Kiwi 1",
}

# Environment words that can trigger automatic background generation.
_BACKGROUND_CUES = {
    "beach", "sea", "ocean", "coast", "shore", "sand",
    "space", "galaxy", "planet", "moon", "stars", "sky",
    "garden", "forest", "jungle", "park", "mountain",
    "desert", "sunset", "sunrise", "city", "street",
    "kitchen", "table", "room", "bedroom", "office",
    "studio", "cafe", "restaurant", "farm", "field",
    "river", "lake", "waterfall", "snow", "winter",
    "classroom", "laboratory", "lab", "castle",
}


def prompt_requests_background(prompt: str) -> bool:
    """Detect whether the prompt contains a recognizable scene."""
    words = set(re.findall(r"[a-z]+", prompt.lower()))
    return bool(words & _BACKGROUND_CUES)


def match_prompt_to_class(prompt: str):
    """
    Very simple text -> class matcher: lowercases the prompt and looks for
    any known fruit keyword inside it. Returns (class_name, class_index,
    matched_word) or (None, None, None) if nothing matched.
    """
    text = prompt.lower()
    words = re.findall(r"[a-z]+", text)
    for word in words:
        if word in _KEYWORD_TO_CLASS:
            class_name = _KEYWORD_TO_CLASS[word]
            class_idx = DEFAULT_CLASSES.index(class_name)
            return class_name, class_idx, word
    return None, None, None


def match_prompt_to_classes(prompt: str):
    """
    Like match_prompt_to_class, but finds ALL known fruit keywords in the
    prompt (in the order they appear, no duplicates). Used to support
    multi-fruit prompts like "mango with apple". Returns a list of
    (class_name, class_index, matched_word) tuples - empty list if none
    matched.
    """
    text = prompt.lower()
    words = re.findall(r"[a-z]+", text)
    seen = set()
    matches = []
    for word in words:
        if word in _KEYWORD_TO_CLASS and word not in seen:
            seen.add(word)
            class_name = _KEYWORD_TO_CLASS[word]
            class_idx = DEFAULT_CLASSES.index(class_name)
            matches.append((class_name, class_idx, word))
    return matches


def load_model(checkpoint_path: str = CHECKPOINT_PATH):
    global _ddpm
    if _ddpm is None:
        if not os.path.exists(checkpoint_path):
            raise FileNotFoundError(
                f"No trained diffusion checkpoint found at '{checkpoint_path}'. "
                f"Run `python train_diffusion.py` first to train your model."
            )
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model = UNet(
            in_channels=3, base_channels=64, channel_mults=(1, 2, 4),
            num_classes=len(DEFAULT_CLASSES),
        )
        model.load_state_dict(torch.load(checkpoint_path, map_location=device))
        model.to(device)
        model.eval()
        _ddpm = DDPM(model, timesteps=1000, device=device)
    return _ddpm


def _sample_to_image(sample: torch.Tensor) -> Image.Image:
    arr = (sample.permute(1, 2, 0).cpu().numpy() * 255).astype(np.uint8)
    return Image.fromarray(arr)


def generate_image(checkpoint_path: str = CHECKPOINT_PATH, progress_callback=None) -> Image.Image:
    """Random generation (no class requested) - same behavior as before."""
    ddpm = load_model(checkpoint_path)
    with torch.no_grad():
        samples = ddpm.ddim_sample(image_size=IMAGE_SIZE, batch_size=1, num_steps=20, progress_callback=progress_callback)
    return _sample_to_image(samples[0])


def generate_image_for_class(class_name: str, checkpoint_path: str = CHECKPOINT_PATH, progress_callback=None) -> Image.Image:
    """Generate an image of a specific known class, e.g. 'Banana'."""
    if class_name not in DEFAULT_CLASSES:
        raise ValueError(f"Unknown class '{class_name}'. Known classes: {DEFAULT_CLASSES}")
    ddpm = load_model(checkpoint_path)
    class_idx = DEFAULT_CLASSES.index(class_name)
    y = torch.tensor([class_idx], device=ddpm.device)
    with torch.no_grad():
        samples = ddpm.ddim_sample(image_size=IMAGE_SIZE, batch_size=1, y=y, num_steps=20, progress_callback=progress_callback)
    return _sample_to_image(samples[0])


from PIL import ImageFilter


def _remove_near_white_background(img: Image.Image, threshold: int = 235, feather: float = 1.5) -> Image.Image:
    """
    Fruits-360 photos are shot on plain near-white backgrounds, so a
    simple brightness threshold is enough to cut the fruit out - no
    trained segmentation model needed for this step. The cutout edge is
    then softened (feathered) with a slight blur on the alpha channel so
    the fruit doesn't look like a hard-edged sticker pasted on top.
    """
    img = img.convert("RGBA")
    data = np.array(img)
    r, g, b = data[..., 0].astype(int), data[..., 1].astype(int), data[..., 2].astype(int)
    is_bg = (r > threshold) & (g > threshold) & (b > threshold)
    data[..., 3] = np.where(is_bg, 0, 255)
    result = Image.fromarray(data, mode="RGBA")

    feathered_alpha = result.split()[3].filter(ImageFilter.GaussianBlur(feather))
    result.putalpha(feathered_alpha)
    return result


def _make_drop_shadow(fruit_rgba: Image.Image, blur: int = 10, opacity: float = 0.35) -> Image.Image:
    """
    A soft, blurred dark silhouette matching the fruit's shape, meant to
    be composited slightly offset underneath it. This single change does
    more than almost anything else to make a composited object look
    "placed in a scene" rather than "pasted on top of an image."
    """
    alpha = fruit_rgba.split()[3]
    shadow_alpha = alpha.point(lambda a: int(a * opacity))
    shadow = Image.new("RGBA", fruit_rgba.size, (0, 0, 0, 0))
    shadow.putalpha(shadow_alpha)
    return shadow.filter(ImageFilter.GaussianBlur(blur))


def generate_background_image(scene_description: str, size=(768, 768)) -> Image.Image:
    """
    DISCLOSED EXTERNAL API CALL: fetches a background image from
    Pollinations.ai (https://pollinations.ai), a free, keyless image
    generation API (Flux model). No API key, no signup, no billing
    required - genuinely free, unlike Gemini's image models which no
    longer offer a usable free tier as of 2026. Rate-capped to roughly
    one request per 15 seconds on anonymous use, which is fine for this
    project's scale.
    """
    import requests
    import urllib.parse

    scene_prompt = (
        f"a wide, empty background scene: {scene_description}, "
        "no fruit, no people, no text, no watermark, open space in the "
        "center for compositing an object on top later"
    )
    width, height = size
    url = (
        f"https://image.pollinations.ai/prompt/{urllib.parse.quote(scene_prompt)}"
        f"?width={width}&height={height}&nologo=true&model=flux"
    )
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    img = Image.open(io.BytesIO(response.content))
    return img.convert("RGB").resize(size)


def composite_fruit_on_background(fruit_img: Image.Image, background_img: Image.Image) -> Image.Image:
    """Cuts the fruit out (plain background assumed), adds a soft grounding
    shadow, and pastes it, scaled up, centered on the generated background."""
    fruit_rgba = _remove_near_white_background(fruit_img)
    bg = background_img.convert("RGBA")

    target_w = int(bg.width * 0.4)
    scale = target_w / fruit_rgba.width
    target_h = int(fruit_rgba.height * scale)
    fruit_resized = fruit_rgba.resize((target_w, target_h), Image.LANCZOS)

    x = (bg.width - target_w) // 2
    y = (bg.height - target_h) // 2

    composite = bg.copy()
    shadow = _make_drop_shadow(fruit_resized)
    shadow_offset = (x + int(target_w * 0.05), y + int(target_h * 0.08))
    composite.alpha_composite(shadow, shadow_offset)
    composite.alpha_composite(fruit_resized, (x, y))
    return composite.convert("RGB")


def composite_multiple_fruits(fruit_imgs: list, canvas_size: int = None, padding_ratio: float = 0.08) -> Image.Image:
    """
    Arranges multiple generated fruit images side-by-side on a single
    plain canvas (for prompts like "mango with apple" that name more than
    one known fruit). Each fruit keeps its own clean DDPM output - this
    is compositing, not a blended single object.
    """
    n = len(fruit_imgs)
    tile = fruit_imgs[0].width  # assume all same size (they are - same IMAGE_SIZE)
    canvas_size = canvas_size or max(tile * n + tile, 256)
    padding = int(canvas_size * padding_ratio)

    canvas = Image.new("RGB", (canvas_size, canvas_size), (255, 255, 255))
    available_w = canvas_size - 2 * padding
    slot_w = available_w // n
    scale = min(slot_w, canvas_size - 2 * padding) / tile
    scaled_size = int(tile * scale)

    y = (canvas_size - scaled_size) // 2
    for i, img in enumerate(fruit_imgs):
        resized = img.resize((scaled_size, scaled_size), Image.LANCZOS)
        x = padding + i * slot_w + (slot_w - scaled_size) // 2
        canvas.paste(resized, (x, y))
    return canvas


def composite_multiple_fruits_on_background(fruit_imgs: list, background_img: Image.Image) -> Image.Image:
    """Same idea as composite_fruit_on_background, but spaces multiple
    cut-out fruits (each with its own soft shadow) evenly across the
    generated background."""
    bg = background_img.convert("RGBA")
    n = len(fruit_imgs)
    target_w = int(bg.width * (0.6 / n if n > 1 else 0.4))
    slot_w = bg.width // n

    composite = bg.copy()
    for i, img in enumerate(fruit_imgs):
        fruit_rgba = _remove_near_white_background(img)
        scale = target_w / fruit_rgba.width
        target_h = int(fruit_rgba.height * scale)
        fruit_resized = fruit_rgba.resize((target_w, target_h), Image.LANCZOS)
        x = i * slot_w + (slot_w - target_w) // 2
        y = (bg.height - target_h) // 2

        shadow = _make_drop_shadow(fruit_resized)
        shadow_offset = (x + int(target_w * 0.05), y + int(target_h * 0.08))
        composite.alpha_composite(shadow, shadow_offset)
        composite.alpha_composite(fruit_resized, (x, y))
    return composite.convert("RGB")


def generate_image_from_prompt(prompt: str, checkpoint_path: str = CHECKPOINT_PATH, use_background: bool = False, progress_callback=None):
    """
    Text-prompt entry point used by the backend. Matches the prompt to
    known fruit class(es) and generates them with your own DDPM.

    Multi-fruit prompts (e.g. "mango with apple") generate each fruit
    separately and composite them together in one image - not a single
    blended hybrid object, see module notes.

    If use_background=True, also generates a background scene from the
    leftover prompt words via Pollinations.ai (free, no API key) and
    composites the fruit(s) onto it. Falls back silently to fruit-only
    if the request fails, reported in `note`.

    Returns (image, matched_class_names, note) - matched_class_names is
    a list (possibly length 1, or empty if nothing matched).
    """
    matches = match_prompt_to_classes(prompt)

    # Explicit toggle OR recognizable scene language in the prompt.
    auto_background = prompt_requests_background(prompt)
    background_enabled = bool(use_background or auto_background)

    if not matches:
        random_image = generate_image(
            checkpoint_path,
            progress_callback=progress_callback,
        )

        if not background_enabled:
            return (
                random_image,
                [],
                "No known fruit found in prompt - generated a random trained fruit.",
            )

        # There is no named fruit to remove from the prompt, so use the
        # complete prompt as the scene description and place the random
        # trained fruit into that scene.
        scene_description = (
            prompt.strip()
            or "a simple plain studio background"
        )

        try:
            background_img = generate_background_image(
                scene_description
            )
            composite = composite_fruit_on_background(
                random_image,
                background_img,
            )
            return (
                composite,
                [],
                "Background automatically generated from the scene prompt "
                "via Pollinations.ai - fruit remains from your trained DDPM.",
            )
        except Exception as e:
            return (
                random_image,
                [],
                f"Background generation unavailable ({e}); showing fruit only.",
            )

    class_names = [m[0] for m in matches]
    matched_words = [m[2] for m in matches]

    # For multi-fruit prompts, scale each fruit's steps into its own slice
    # of the overall 0-100% progress range, so the bar moves smoothly
    # across all fruits instead of jumping back to 0 for each one.
    n_fruits = len(class_names)
    fruit_imgs = []
    for idx, name in enumerate(class_names):
        def scoped_callback(step, total, _idx=idx):
            if progress_callback is None:
                return
            overall_step = _idx * total + step
            overall_total = n_fruits * total
            progress_callback(overall_step, overall_total)
        fruit_imgs.append(generate_image_for_class(name, checkpoint_path, progress_callback=scoped_callback))

    if len(fruit_imgs) == 1:
        result_img = fruit_imgs[0]
    else:
        result_img = composite_multiple_fruits(fruit_imgs)

    if not background_enabled:
        return result_img, class_names, None

    # Remove all matched fruit words to get the leftover scene description
    scene_description = prompt
    for word in matched_words:
        scene_description = re.sub(rf"\b{re.escape(word)}\b", "", scene_description, flags=re.IGNORECASE)
    scene_description = re.sub(r"^\s*(a|an|the|on|in|at|with)\s+", "", scene_description.strip(), flags=re.IGNORECASE)
    scene_description = scene_description.strip(" ,.") or "a simple plain studio background"

    try:
        background_img = generate_background_image(scene_description)
        if len(fruit_imgs) == 1:
            composite = composite_fruit_on_background(fruit_imgs[0], background_img)
        else:
            composite = composite_multiple_fruits_on_background(fruit_imgs, background_img)
        if auto_background and not use_background:
            background_note = (
                "Background automatically enabled from the scene in the prompt "
                "via Pollinations.ai - not your trained model."
            )
        else:
            background_note = (
                "Background generated via Pollinations.ai (free, no API key) "
                "- not your trained model."
            )

        return composite, class_names, background_note
    except Exception as e:
        return result_img, class_names, f"Background generation unavailable ({e}); showing fruit(s) only."


if __name__ == "__main__":
    img, matched, note = generate_image_from_prompt("a cool banana on the beach", use_background=True)
    os.makedirs("outputs", exist_ok=True)
    img.save("outputs/sample_generated.png")
    print(f"Matched class: {matched}. Note: {note}. Saved outputs/sample_generated.png")