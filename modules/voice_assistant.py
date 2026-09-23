"""
Voice Assistant Module (from-scratch intent classifier)
--------------------------------------------------------------
Pure inference logic - no Streamlit, no browser code. The React frontend
handles speech-to-text and text-to-speech directly via the Web Speech
API in JavaScript; this module only classifies the resulting text
command using YOUR trained LSTM intent classifier (train_intent.py).

No pretrained NLI model, no LLM, no API keys - the embedding table and
LSTM are trained entirely on the synthetic command dataset in
data/intent_dataset.py.
"""

import os
import json
import pickle
import torch

from models.intent_classifier import IntentClassifier, Vocabulary  # noqa: F401 (Vocabulary needed for unpickling)

_model = None
_vocab = None
_labels = None

CHECKPOINT_PATH = "checkpoints/intent_best.pt"
VOCAB_PATH = "checkpoints/intent_vocab.pkl"
LABELS_PATH = "checkpoints/intent_labels.json"


def load_model():
    global _model, _vocab, _labels
    if _model is None:
        for path in (CHECKPOINT_PATH, VOCAB_PATH, LABELS_PATH):
            if not os.path.exists(path):
                raise FileNotFoundError(
                    f"Missing '{path}'. Run `python train_intent.py` first to "
                    f"train your own intent classifier."
                )
        with open(VOCAB_PATH, "rb") as f:
            _vocab = pickle.load(f)
        with open(LABELS_PATH) as f:
            _labels = json.load(f)

        device = "cuda" if torch.cuda.is_available() else "cpu"
        _model = IntentClassifier(vocab_size=len(_vocab), num_classes=len(_labels))
        _model.load_state_dict(torch.load(CHECKPOINT_PATH, map_location=device))
        _model.to(device)
        _model.eval()
    return _model, _vocab, _labels


def classify_intent(command_text: str) -> dict:
    """
    Return {"intent": <key>, "confidence": float}.

    Explicit navigation commands are handled deterministically first.
    The trained LSTM remains the fallback for ordinary intent classification.
    """
    text = " ".join(str(command_text).lower().strip().split())

    navigation_targets = {
        "generate": (
            "image generation",
            "image generator",
            "generate image",
            "create image",
            "text to image",
            "text-to-image",
        ),
        "enhance": (
            "image enhancement",
            "image enhancer",
            "enhance image",
            "enhance this image",
            "improve image quality",
            "improve this image",
            "sharpen image",
        ),
        "video": (
            "video generation",
            "video generator",
            "create video",
            "make video",
            "generate video",
        ),
        "text": (
            "animated text",
            "text animation",
            "animate text",
            "text animator",
        ),
    }

    navigation_phrases = (
        "open",
        "go to",
        "take me to",
        "show me",
        "bring me to",
        "bring up",
        "navigate to",
        "switch to",
        "move to",
        "load",
        "let's go to",
        "lets go to",
    )

    if any(phrase in text for phrase in navigation_phrases):
        for intent, targets in navigation_targets.items():
            if any(target in text for target in targets):
                return {"intent": intent, "confidence": 0.99}

    # Preserve the trained classifier for normal/non-navigation messages.
    model, vocab, labels = load_model()
    device = next(model.parameters()).device

    ids = vocab.encode(command_text, max_len=12)
    x = torch.tensor([ids], dtype=torch.long).to(device)

    with torch.no_grad():
        logits = model(x)
        probs = torch.softmax(logits, dim=1)
        conf, idx = probs.max(dim=1)

    return {"intent": labels[idx.item()], "confidence": round(conf.item(), 3)}



def guidance_response(intent_key: str) -> str:
    """Friendly spoken guidance mapped to each intent, read aloud via TTS.
    Used as a fallback when GROQ_API_KEY isn't set, or if the Groq call
    fails for any reason - the assistant should never go silent."""
    responses = {
        "generate_image": "Head to the Image Generation tab and click Generate - your trained diffusion model will create a new image.",
        "caption_photo": "Upload your photo in the Image Generation tab, then click 'Label and Animate' to see what your classifier recognizes.",
        "make_video": "Go to the Video Generation tab, pick your images, and enter a storyline to compile them into a video.",
        "change_voice": "Open the Audio Manipulation tab to convert an uploaded recording or type text to speak in a chosen voice.",
        "help": "I can help you generate images, label and animate photos, make videos, or change voices. Just tell me what you'd like to do.",
    }
    return responses.get(intent_key, responses["help"])


def handle_command(command_text: str) -> dict:
    """Full pipeline: classify with YOUR model, generate spoken guidance.
    Kept for backward compatibility / non-conversational callers - the
    live voice assistant now uses chat_with_groq below for actual
    back-and-forth conversation instead of this fixed canned response."""
    result = classify_intent(command_text)
    response_text = guidance_response(result["intent"])
    return {**result, "response": response_text}


GROQ_MODEL = "openai/gpt-oss-20b" # fast + generous free tier as of 2026

RANANO_SYSTEM_PROMPT = """
You are RANANO, the AI creative assistant inside RANANO AI Creative Studio.

Your job is to understand the user's message and return the helpful natural-language
answer that should be shown directly in the chat.

RANANO features:
1. Image Generation
   - Help users create image prompts and explain image generation.
2. Image Enhancement
   - Help users understand enhancement, sharpness, noise, blur, resolution, and quality.
3. Video Generation
   - Help users plan videos from images, including scenes, timing, transitions, audio, and animation.
4. Animated Text
   - Help users choose text animation styles and create animation concepts.
5. General conversation
   - Answer normal questions naturally.
   - Do not force unrelated questions into RANANO features.

Navigation is handled separately by the application intent classifier and React frontend.
Do not perform navigation yourself.

Important:
- Return ONLY the natural-language answer for the user.
- Never output JSON.
- Never output XML.
- Never output a tool call.
- Never simulate a tool call.
- Never invent a tool invocation.
- Never output function-call syntax.
- Never describe your hidden reasoning or planning.
- Never claim an action was completed unless the application actually completed it.
- If the user explicitly asks to open or navigate to a RANANO feature, acknowledge the request naturally.
- If the user wants to create something but has not provided enough information, ask one short useful question.
- Use previous conversation context when it is provided.
- Do not say "go to the Image Generation tab" unless that is actually useful and the user asks how to use the feature.
- Be friendly, clear, concise, and natural.
- Do not use markdown.
- Do not use emojis.
"""


def chat_with_groq(
    message: str,
    history: list,
    detected_intent: str = None,
    tool_context: str = "RANANO Studio",
) -> str:
    """
    Generate a natural conversational response with Groq GPT-OSS 20B.

    Navigation is intentionally NOT delegated to Groq. The local intent
    classifier + React frontend handle navigation deterministically.

    The Groq request is plain text only. No tools, JSON mode, or structured
    output are requested. GPT-OSS reasoning is excluded from the returned
    response so only user-facing text is used.

    Falls back to guidance_response() if the API key is missing or Groq fails.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return guidance_response(detected_intent)

    import requests

    context_block = f"""
The user is currently using: {tool_context}
The local application intent classifier detected: {detected_intent or "unknown"}

The classifier result is only a hint. The user's actual message is the source
of truth. Navigation and application actions are handled outside this model.
"""

    system_prompt = f"""
{RANANO_SYSTEM_PROMPT}

{context_block}
"""

    messages = [
        {
            "role": "system",
            "content": system_prompt.strip(),
        }
    ]

    for turn in (history or [])[-6:]:
        if not isinstance(turn, dict):
            continue

        role = turn.get("role")
        content = turn.get("content")

        if role in ("user", "assistant") and isinstance(content, str) and content.strip():
            messages.append(
                {
                    "role": role,
                    "content": content.strip(),
                }
            )

    if not isinstance(message, str):
        message = str(message)

    messages.append(
        {
            "role": "user",
            "content": message.strip(),
        }
    )

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "max_completion_tokens": 500,
        "temperature": 0.6,
        "include_reasoning": False,
    }

    try:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=30,
        )

        if not response.ok:
            print(
                f"[Groq] HTTP {response.status_code}: {response.text}",
                flush=True,
            )

            # GPT-OSS can occasionally produce an invalid internal tool/action
            # parse when a prompt contains feature/tool language. Retry once
            # with a minimal plain-text instruction set. This retry deliberately
            # contains no navigation/tool wording.
            if response.status_code == 400:
                retry_messages = [
                    {
                        "role": "system",
                        "content": (
                            "You are RANANO, a helpful AI creative assistant. "
                            "Answer the user's message naturally and concisely. "
                            "Return plain text only. Do not output JSON, tool calls, "
                            "function calls, XML, or hidden reasoning. "
                            "Do not claim an action was performed unless it was "
                            "actually performed by the application."
                        ),
                    }
                ]

                for turn in (history or [])[-6:]:
                    if not isinstance(turn, dict):
                        continue

                    role = turn.get("role")
                    content = turn.get("content")

                    if (
                        role in ("user", "assistant")
                        and isinstance(content, str)
                        and content.strip()
                    ):
                        retry_messages.append(
                            {
                                "role": role,
                                "content": content.strip(),
                            }
                        )

                retry_messages.append(
                    {
                        "role": "user",
                        "content": message.strip(),
                    }
                )

                retry_payload = {
                    "model": GROQ_MODEL,
                    "messages": retry_messages,
                    "max_completion_tokens": 500,
                    "temperature": 0.6,
                    "include_reasoning": False,
                }

                retry_response = requests.post(
                    url,
                    headers=headers,
                    json=retry_payload,
                    timeout=30,
                )

                if not retry_response.ok:
                    print(
                        f"[Groq] Retry HTTP {retry_response.status_code}: "
                        f"{retry_response.text}",
                        flush=True,
                    )
                    return guidance_response(detected_intent)

                response = retry_response

        data = response.json()

        choices = data.get("choices") or []
        if not choices:
            print("[Groq] No choices returned.", flush=True)
            return guidance_response(detected_intent)

        message_data = choices[0].get("message") or {}
        reply = (message_data.get("content") or "").strip()

        if not reply:
            print(
                "[Groq] Empty content. "
                f"finish_reason={choices[0].get('finish_reason')}",
                flush=True,
            )
            return guidance_response(detected_intent)

        return reply

    except requests.RequestException as e:
        print(
            f"[Groq] Request error: {type(e).__name__}: {e}",
            flush=True,
        )
        return guidance_response(detected_intent)

    except (ValueError, KeyError, TypeError) as e:
        print(
            f"[Groq] Invalid response: {type(e).__name__}: {e}",
            flush=True,
        )
        return guidance_response(detected_intent)

    except Exception as e:
        print(
            f"[Groq] Unexpected error: {type(e).__name__}: {e}",
            flush=True,
        )
        return guidance_response(detected_intent)
