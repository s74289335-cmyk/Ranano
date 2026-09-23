# RANANO: Recreating Nano Banana Using Diffusion Model

A deployable platform: **React frontend + FastAPI backend**, both talking to
your own from-scratch trained models. No Streamlit, no pretrained weights,
no API keys anywhere.

## Architecture

```
frontend/  (React, deploy to Vercel)
    |
    | HTTP/JSON + file uploads
    v
backend/main.py  (FastAPI, deploy to Render/Railway)
    |
    | imports
    v
modules/*.py  (inference logic - unchanged from before)
    |
    | loads checkpoints trained by...
    v
train_diffusion.py, train_classifier.py, train_intent.py
```

Your `modules/*.py` files didn't need to change at all - the backend just
calls the same functions that used to power the Streamlit tabs. Only
`voice_assistant.py` was trimmed (removed Streamlit-specific browser
widget code; the React frontend now handles speech directly via the
Web Speech API in JavaScript).

## What's inside

| Component | Location | Notes |
|---|---|---|
| Diffusion model (DDPM) | `models/`, `train_diffusion.py` | Same from-scratch U-Net as before |
| Photo classifier | `models/fruit_classifier.py`, `train_classifier.py` | Same CNN as before |
| Intent classifier | `models/intent_classifier.py`, `train_intent.py` | Same LSTM as before |
| **NEW: Backend API** | `backend/main.py` | FastAPI, wraps `modules/*.py` as REST endpoints |
| **NEW: Frontend** | `frontend/` | React app, calls the backend |
| Old Streamlit app | `legacy_streamlit/app.py` | Kept for reference, not used anymore |

---

## STEP 1: Train your models (same as before, do this first)

```bash
python -m venv venv
source venv/bin/activate   # or venv\Scripts\Activate.ps1 on Windows
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
pip install -r backend/requirements.txt

python train_intent.py --epochs 30
python train_classifier.py --epochs 20
python train_diffusion.py --epochs 100
```
See the dataset download instructions further below if you haven't set up
Fruits-360 yet. Checkpoints land in `checkpoints/` - the backend reads
them from there automatically.

---

## STEP 2: Run locally (backend + frontend)

**Terminal 1 - backend:**
```bash
uvicorn backend.main:app --reload --port 8000
```
Visit `http://localhost:8000/docs` to see the interactive API docs and
test endpoints directly.

**Terminal 2 - frontend:**
```bash
cd frontend
npm install
npm run dev
```
Visit `http://localhost:5173` - the React app is already configured to
call `http://localhost:8000` by default.

---

## STEP 3: Deploy for real

### Backend -> Render
1. Push this project to a GitHub repo.
2. On Render: New -> Web Service -> connect your repo.
3. Render should auto-detect `render.yaml` in the project root. If not,
   set manually:
   - Build command: `pip install -r backend/requirements.txt`
   - Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. **Important:** the free tier has 512MB RAM, which is tight for PyTorch +
   your models. Use at least the **Starter** plan ($7/mo) to avoid
   out-of-memory crashes. Your models are small (from-scratch, not SD/BLIP),
   so Starter should be comfortably enough - just don't expect the free
   tier to work reliably.
5. **Your trained checkpoints need to be in the repo** (or fetched at
   startup from cloud storage) since Render's filesystem doesn't persist
   your local training. Commit the `checkpoints/*.pt` files to the repo,
   or add a startup script that downloads them from Google Drive/S3 -
   the former is simpler for a class project.

### Frontend -> Vercel
1. On Vercel: New Project -> import the same GitHub repo.
2. Set **Root Directory** to `frontend`.
3. Add environment variable `VITE_API_BASE_URL` = your Render backend's
   URL (e.g. `https://ranano-backend.onrender.com`).
4. Deploy. Vercel auto-detects Vite and uses `frontend/vercel.json`.

### After both are deployed
Update `allow_origins` in `backend/main.py` from `["*"]` to your actual
Vercel domain (e.g. `["https://ranano.vercel.app"]`) - `"*"` is fine for
testing but you want it locked down before treating this as a real
deployed product.

---

## Dataset setup (Fruits-360) - needed before training

1. Download from https://www.kaggle.com/datasets/moltean/fruits (free
   Kaggle account).
2. Extract so you have:
   ```
   data/fruits360/Training/<ClassName>/*.jpg
   data/fruits360/Test/<ClassName>/*.jpg
   ```
3. Check `DEFAULT_CLASSES` in `data/fruits360_loader.py` matches your
   actual downloaded folder names (case-sensitive, varies slightly by
   dataset version).

## Honest limitations to know before your demo

- **No text prompts.** Your DDPM samples from the learned class
  distribution (fruits in general) - it does not take "generate a
  banana" as input. True text-to-image needs a paired image-caption
  dataset, out of scope here.
- **Free hosting tiers are tight for ML inference.** No GPU, limited RAM.
  Expect slower responses than local, and consider Render Starter over
  Free if you hit memory crashes.
- **Cold starts.** Free/cheap tiers on Render spin down when idle -
  the first request after inactivity can take 30-60 seconds while the
  server wakes up. Normal, not a bug.

## Troubleshooting

- **CORS errors in browser console**: check `VITE_API_BASE_URL` in the
  frontend actually matches your backend's real deployed URL exactly
  (including `https://`, no trailing slash).
- **`FileNotFoundError` for a checkpoint**: that model hasn't been trained
  yet, or its `.pt` file wasn't committed/deployed - see Step 3's note on
  checkpoints.
- **Backend crashes on Render (OOM)**: upgrade past the free tier, or
  reduce model size further in `models/unet.py` (fewer channels).
