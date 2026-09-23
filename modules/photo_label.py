"""
Photo Label Module (from-scratch classifier inference)
------------------------------------------------------------
Replaces the earlier BLIP-based captioning with YOUR trained CNN
classifier (from train_classifier.py). Predicts a fruit label for an
uploaded/generated photo, which is then animated as text - this is the
"own intelligence" behind the Animated Text module, fully self-trained.
"""

import os
import json
import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms

from models.fruit_classifier import FruitClassifier
from modules import animated_text

_model = None
_classes = None
CHECKPOINT_PATH = "checkpoints/classifier_best.pt"
CLASSES_PATH = "checkpoints/classifier_classes.json"
IMAGE_SIZE = 64


def load_model():
    global _model, _classes
    if _model is None:
        if not os.path.exists(CHECKPOINT_PATH) or not os.path.exists(CLASSES_PATH):
            raise FileNotFoundError(
                "No trained classifier checkpoint found. Run "
                "`python train_classifier.py` first to train your model."
            )
        with open(CLASSES_PATH) as f:
            _classes = json.load(f)

        device = "cuda" if torch.cuda.is_available() else "cpu"
        _model = FruitClassifier(num_classes=len(_classes), image_size=IMAGE_SIZE)
        _model.load_state_dict(torch.load(CHECKPOINT_PATH, map_location=device))
        _model.to(device)
        _model.eval()
    return _model, _classes


def predict_label(image: Image.Image) -> tuple:
    """Returns (predicted_label, confidence)."""
    model, classes = load_model()
    device = next(model.parameters()).device

    transform = transforms.Compose([
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
    ])
    x = transform(image.convert("RGB")).unsqueeze(0).to(device)

    with torch.no_grad():
        logits = model(x)
        probs = F.softmax(logits, dim=1)
        conf, idx = probs.max(dim=1)

    return classes[idx.item()], conf.item()


def label_and_animate(
    image: Image.Image,
    output_path: str = "outputs/photo_animated_text.gif",
    effect: str = "fade",
) -> tuple:
    """Full pipeline: photo -> label (your CNN) -> animated text (GIF)."""
    label, confidence = predict_label(image)
    display_text = f"{label} ({confidence*100:.0f}%)"
    path = animated_text.generate_animated_text(display_text, output_path=output_path, effect=effect)
    return label, confidence, path
