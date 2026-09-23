"""
Train the from-scratch intent classifier.

Usage:
    python train_intent.py --epochs 30

This trains in well under a minute even on CPU - the dataset is small
and the model is tiny by design (this is meant to be a lightweight
'brain' for command routing, not a general-purpose language model).
"""

import argparse
import os
import json
import pickle
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

from models.intent_classifier import IntentClassifier, Vocabulary
from data.intent_dataset import generate_dataset, INTENTS


class IntentDataset(Dataset):
    def __init__(self, samples, vocab: Vocabulary, label2idx: dict, max_len: int = 12):
        self.samples = samples
        self.vocab = vocab
        self.label2idx = label2idx
        self.max_len = max_len

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        text, label = self.samples[idx]
        ids = self.vocab.encode(text, max_len=self.max_len)
        return torch.tensor(ids, dtype=torch.long), self.label2idx[label]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--n_per_intent", type=int, default=200)
    parser.add_argument("--checkpoint_dir", type=str, default="checkpoints")
    args = parser.parse_args()

    os.makedirs(args.checkpoint_dir, exist_ok=True)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    data = generate_dataset(n_per_intent=args.n_per_intent)
    texts = [t for t, _ in data]

    vocab = Vocabulary()
    vocab.build(texts)
    label2idx = {label: i for i, label in enumerate(INTENTS)}

    split = int(len(data) * 0.85)
    train_data, val_data = data[:split], data[split:]
    train_ds = IntentDataset(train_data, vocab, label2idx)
    val_ds = IntentDataset(val_data, vocab, label2idx)
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size)

    model = IntentClassifier(vocab_size=len(vocab), num_classes=len(INTENTS)).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)
    criterion = nn.CrossEntropyLoss()

    best_acc = 0.0
    for epoch in range(1, args.epochs + 1):
        model.train()
        total_loss = 0.0
        for x, y in train_loader:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            out = model(x)
            loss = criterion(out, y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        model.eval()
        correct, total = 0, 0
        with torch.no_grad():
            for x, y in val_loader:
                x, y = x.to(device), y.to(device)
                preds = model(x).argmax(dim=1)
                correct += (preds == y).sum().item()
                total += y.size(0)
        acc = correct / total if total else 0.0
        print(f"Epoch {epoch}/{args.epochs} - loss: {total_loss/len(train_loader):.4f} - val acc: {acc:.3f}")

        if acc >= best_acc:
            best_acc = acc
            torch.save(model.state_dict(), os.path.join(args.checkpoint_dir, "intent_best.pt"))

    with open(os.path.join(args.checkpoint_dir, "intent_vocab.pkl"), "wb") as f:
        pickle.dump(vocab, f)
    with open(os.path.join(args.checkpoint_dir, "intent_labels.json"), "w") as f:
        json.dump(INTENTS, f)

    print(f"Best val accuracy: {best_acc:.3f}")
    print("Saved checkpoints/intent_best.pt, intent_vocab.pkl, intent_labels.json")


if __name__ == "__main__":
    main()
