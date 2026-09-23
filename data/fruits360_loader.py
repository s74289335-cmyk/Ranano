"""
Fruits-360 Dataset Loader
----------------------------
Loads a subset of the Fruits-360 dataset (Kaggle) for training both the
from-scratch diffusion model and the from-scratch classifier.

Download instructions:
1. Get the dataset from https://www.kaggle.com/datasets/moltean/fruits
   (requires a free Kaggle account).
2. Extract it so you have a folder structure like:
     data/fruits360/Training/<ClassName>/*.jpg
     data/fruits360/Test/<ClassName>/*.jpg
3. Check the exact class folder names on your machine (they vary slightly
   between dataset versions) and update DEFAULT_CLASSES below to match.

Only a small subset of classes is used by default - this keeps both
training time and the diffusion model's task reasonable for a 6GB GPU
and a class project timeline. Feel free to add more classes once the
pipeline is working end-to-end.
"""

import os
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from PIL import Image

DEFAULT_CLASSES = [
    "Banana 1",
    "Apple Red 1",
    "Orange 1",
    "Strawberry 1",
    "Pineapple 1",
    "Lemon 1",
    "Mango 1",
    "Kiwi 1",
]


class Fruits360Subset(Dataset):
    def __init__(self, root: str, split: str = "Training", classes=None, image_size: int = 64):
        self.classes = classes or DEFAULT_CLASSES
        self.image_size = image_size
        self.samples = []  # list of (filepath, class_index)

        split_dir = os.path.join(root, split)
        if not os.path.isdir(split_dir):
            raise FileNotFoundError(
                f"Couldn't find '{split_dir}'. Download Fruits-360 from Kaggle and "
                f"extract it so this path exists (see docstring at top of this file)."
            )

        for class_idx, class_name in enumerate(self.classes):
            class_dir = os.path.join(split_dir, class_name)
            if not os.path.isdir(class_dir):
                print(f"[warning] class folder not found, skipping: {class_dir}")
                continue
            for fname in os.listdir(class_dir):
                if fname.lower().endswith((".jpg", ".jpeg", ".png")):
                    self.samples.append((os.path.join(class_dir, fname), class_idx))

        if not self.samples:
            raise RuntimeError(
                "No images found. Check DEFAULT_CLASSES matches your downloaded "
                "folder names exactly (case-sensitive)."
            )

        # Diffusion model expects [-1, 1]; classifier uses the same loader
        # but normalizes to [0, 1] internally via ToTensor, which is fine
        # for both use cases since we rescale before feeding the diffusion model.
        self.transform = transforms.Compose([
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),  # -> [0, 1]
        ])

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        image = Image.open(path).convert("RGB")
        image = self.transform(image)
        return image, label


def get_dataloader(
    root: str,
    split: str = "Training",
    classes=None,
    image_size: int = 64,
    batch_size: int = 32,
    shuffle: bool = True,
) -> DataLoader:
    dataset = Fruits360Subset(root, split=split, classes=classes, image_size=image_size)
    print(f"Loaded {len(dataset)} images across {len(dataset.classes)} classes from '{split}'.")
    return DataLoader(dataset, batch_size=batch_size, shuffle=shuffle, num_workers=2)
