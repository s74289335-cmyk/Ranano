"""
Fruit Classifier (built from scratch)
------------------------------------------
A compact CNN that predicts a fruit label from a photo. This is the
"own intelligence" behind the Animated Text module - no pretrained
weights, trained entirely on your Fruits-360 subset.
"""

import torch.nn as nn


class FruitClassifier(nn.Module):
    def __init__(self, num_classes: int, image_size: int = 64):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(), nn.MaxPool2d(2),   # 64 -> 32
            nn.Conv2d(32, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(), nn.MaxPool2d(2),  # 32 -> 16
            nn.Conv2d(64, 128, 3, padding=1), nn.BatchNorm2d(128), nn.ReLU(), nn.MaxPool2d(2), # 16 -> 8
            nn.Conv2d(128, 256, 3, padding=1), nn.BatchNorm2d(256), nn.ReLU(), nn.MaxPool2d(2), # 8 -> 4
        )
        flat_size = 256 * (image_size // 16) ** 2
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(flat_size, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes),
        )

    def forward(self, x):
        x = self.features(x)
        return self.classifier(x)
