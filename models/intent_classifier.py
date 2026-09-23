"""
Intent Classifier (built from scratch)
--------------------------------------------
A small word-embedding + LSTM classifier that understands voice/text
commands and routes them to the right platform action. No pretrained
embeddings (e.g. GloVe/Word2Vec) and no pretrained transformer are used -
the embedding table and LSTM weights are learned entirely from the
synthetic dataset in data/intent_dataset.py.
"""

import re
import torch
import torch.nn as nn


def tokenize(text: str) -> list:
    return re.findall(r"[a-z']+", text.lower())


class Vocabulary:
    """Simple word -> index mapping, built from the training data."""

    def __init__(self):
        self.word2idx = {"<pad>": 0, "<unk>": 1}

    def build(self, texts: list):
        for text in texts:
            for tok in tokenize(text):
                if tok not in self.word2idx:
                    self.word2idx[tok] = len(self.word2idx)

    def encode(self, text: str, max_len: int = 12) -> list:
        ids = [self.word2idx.get(tok, 1) for tok in tokenize(text)]
        ids = ids[:max_len]
        ids += [0] * (max_len - len(ids))
        return ids

    def __len__(self):
        return len(self.word2idx)


class IntentClassifier(nn.Module):
    def __init__(self, vocab_size: int, num_classes: int, embed_dim: int = 64, hidden_dim: int = 128):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.lstm = nn.LSTM(embed_dim, hidden_dim, batch_first=True, bidirectional=True)
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim * 2, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, num_classes),
        )

    def forward(self, x):
        embedded = self.embedding(x)          # (B, L, embed_dim)
        _, (h_n, _) = self.lstm(embedded)      # h_n: (2, B, hidden_dim) - forward+backward
        h_cat = torch.cat([h_n[0], h_n[1]], dim=-1)  # (B, hidden_dim*2)
        return self.classifier(h_cat)
