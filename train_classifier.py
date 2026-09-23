"""
Train the from-scratch fruit classifier on Fruits-360.

Usage:
    python train_classifier.py --data_root data/fruits360 --epochs 20

Much faster than diffusion training - classification typically converges
in well under an hour on an RTX 4050 for this dataset size.
"""

import argparse
import os
import json
import torch
import torch.nn as nn

from models.fruit_classifier import FruitClassifier
from data.fruits360_loader import get_dataloader, DEFAULT_CLASSES


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_root", type=str, default="data/fruits360")
    parser.add_argument("--image_size", type=int, default=64)
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--checkpoint_dir", type=str, default="checkpoints")
    args = parser.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Training on: {device}")
    os.makedirs(args.checkpoint_dir, exist_ok=True)

    train_loader = get_dataloader(
        args.data_root, split="Training", image_size=args.image_size, batch_size=args.batch_size
    )
    test_loader = get_dataloader(
        args.data_root, split="Test", image_size=args.image_size, batch_size=args.batch_size, shuffle=False
    )

    num_classes = len(DEFAULT_CLASSES)
    model = FruitClassifier(num_classes=num_classes, image_size=args.image_size).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)
    criterion = nn.CrossEntropyLoss()

    best_acc = 0.0
    for epoch in range(1, args.epochs + 1):
        model.train()
        total_loss = 0.0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        # Evaluate
        model.eval()
        correct, total = 0, 0
        with torch.no_grad():
            for images, labels in test_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                preds = outputs.argmax(dim=1)
                correct += (preds == labels).sum().item()
                total += labels.size(0)
        acc = correct / total if total else 0.0

        print(f"Epoch {epoch}/{args.epochs} - loss: {total_loss/len(train_loader):.4f} - test acc: {acc:.3f}")

        if acc > best_acc:
            best_acc = acc
            torch.save(model.state_dict(), os.path.join(args.checkpoint_dir, "classifier_best.pt"))

    # Save class name list so inference code knows the label order
    with open(os.path.join(args.checkpoint_dir, "classifier_classes.json"), "w") as f:
        json.dump(DEFAULT_CLASSES, f)

    print(f"Best test accuracy: {best_acc:.3f}")
    print("Saved checkpoints/classifier_best.pt and checkpoints/classifier_classes.json")


if __name__ == "__main__":
    main()
