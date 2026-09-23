"""
Standalone test - bypasses the browser/network/FastAPI entirely.
Run this directly to see exactly where things are slow or stuck.
"""
import time
import sys

print("[1/4] Starting up...", flush=True)

print("[2/4] Importing modules (this loads torch, may take a moment)...", flush=True)
t0 = time.time()
from modules.image_generation import generate_image_for_class, CHECKPOINT_PATH, IMAGE_SIZE
print(f"      Import done in {time.time() - t0:.1f}s", flush=True)

print(f"[3/4] CHECKPOINT_PATH = {CHECKPOINT_PATH}", flush=True)
print(f"      IMAGE_SIZE = {IMAGE_SIZE}", flush=True)

import os
if not os.path.exists(CHECKPOINT_PATH):
    print(f"      ERROR: checkpoint file does not exist at this path!", flush=True)
    sys.exit(1)
print(f"      Checkpoint file exists, size: {os.path.getsize(CHECKPOINT_PATH) / 1e6:.1f} MB", flush=True)

print("[4/4] Generating 'Banana 1' - watch for step-by-step progress below...", flush=True)
t0 = time.time()
img = generate_image_for_class("Banana 1")
elapsed = time.time() - t0
print(f"\nDONE in {elapsed:.1f}s. Image size: {img.size}", flush=True)

img.save("test_output.png")
print("Saved test_output.png - open it to check the result.", flush=True)