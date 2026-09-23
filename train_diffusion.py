"""
Train the from-scratch DDPM on Fruits-360.

Usage:
    python train_diffusion.py --data_root data/fruits360 --epochs 100

Checkpoints are saved to checkpoints/diffusion_epoch_<N>.pt so you can
resume or pick the best one. On an RTX 4050 (6GB), expect roughly
1-3 minutes per epoch at 64x64 resolution with a small subset of classes
- budget a few hours of training for recognizable (not photorealistic)
results, consistent with what a from-scratch DDPM on a laptop GPU can do.
"""

import argparse
import os
import torch
from torchvision.utils import save_image

from models.unet import UNet
from models.diffusion import DDPM
from data.fruits360_loader import get_dataloader, DEFAULT_CLASSES


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_root", type=str, default="data/fruits360")
    parser.add_argument("--image_size", type=int, default=64)
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--timesteps", type=int, default=1000)
    parser.add_argument("--save_every", type=int, default=10)
    parser.add_argument("--checkpoint_dir", type=str, default="checkpoints")
    args = parser.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Training on: {device}")
    os.makedirs(args.checkpoint_dir, exist_ok=True)
    os.makedirs("outputs/training_samples", exist_ok=True)

    dataloader = get_dataloader(
        args.data_root, split="Training", image_size=args.image_size, batch_size=args.batch_size
    )

    num_classes = len(DEFAULT_CLASSES)
    model = UNet(in_channels=3, base_channels=64, channel_mults=(1, 2, 4), num_classes=num_classes)
    ddpm = DDPM(model, timesteps=args.timesteps, device=device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr)

    for epoch in range(1, args.epochs + 1):
        total_loss = 0.0
        for images, labels in dataloader:
            images = images.to(device)
            labels = labels.to(device)
            images = images * 2 - 1  # rescale [0,1] -> [-1,1] for the diffusion process

            loss = ddpm.training_loss(images, labels)
            optimizer.zero_grad()
            loss.backward()
            # Gradient clipping - without this, DDPM training can diverge
            # (predicted noise explodes to extreme values) especially over
            # longer runs, producing solid white/black output once clamped.
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            if not torch.isfinite(loss):
                print(
                    f"[warning] Non-finite loss ({loss.item()}) at epoch {epoch} - "
                    f"training has diverged. Stopping early; use the last good "
                    f"checkpoint saved before this point."
                )
                return

            total_loss += loss.item()

        avg_loss = total_loss / len(dataloader)
        print(f"Epoch {epoch}/{args.epochs} - loss: {avg_loss:.4f}")

        if epoch % args.save_every == 0 or epoch == args.epochs:
            ckpt_path = os.path.join(args.checkpoint_dir, f"diffusion_epoch_{epoch}.pt")
            torch.save(model.state_dict(), ckpt_path)
            print(f"Saved checkpoint: {ckpt_path}")

            # Save a sample grid so you can visually track training progress -
            # one sample per class (up to 4), so you can see each fruit improving.
            preview_labels = torch.arange(min(4, num_classes), device=device)
            samples = ddpm.sample(
                image_size=args.image_size, batch_size=len(preview_labels), y=preview_labels
            )
            save_image(samples, f"outputs/training_samples/epoch_{epoch}.png", nrow=2)


if __name__ == "__main__":
    main()
