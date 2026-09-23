"""
Synthetic Intent Dataset (for training the voice assistant's brain)
------------------------------------------------------------------------
Generates a labeled dataset of (command_text, intent_label) pairs using
templates + word substitution, so the from-scratch intent classifier has
something to train on without needing to hand-collect thousands of
real user commands.

Feel free to add more templates/subjects - more variety = better
generalization once the classifier is trained.
"""

import random

INTENTS = ["generate_image", "caption_photo", "make_video", "change_voice", "help"]

TEMPLATES = {
    "generate_image": [
        "generate an image of {subject}",
        "create a picture of {subject}",
        "I want to see a {subject}",
        "make an image showing {subject}",
        "draw {subject} for me",
        "can you generate {subject}",
        "show me a picture of {subject}",
        "produce an image of {subject}",
    ],
    "caption_photo": [
        "describe this photo",
        "what is in this picture",
        "animate the text for my photo",
        "tell me what this image shows",
        "generate a caption for this picture",
        "label this photo",
        "identify what's in this image",
        "add animated text to my photo",
    ],
    "make_video": [
        "make a video from my images",
        "create a video with a storyline",
        "turn these pictures into a video",
        "I want a slideshow video",
        "compile my images into a video",
        "build a video sequence",
        "make an animation from these photos",
        "generate a video story",
    ],
    "change_voice": [
        "change the voice in this audio",
        "convert this recording to a different voice",
        "make this audio sound like someone else",
        "I want text spoken in a chosen voice",
        "convert text to speech",
        "change my voice recording",
        "read this text aloud in a different voice",
        "modify the voice of this clip",
    ],
    "help": [
        "help",
        "what can you do",
        "how does this platform work",
        "guide me through the app",
        "I don't know what to do",
        "explain the features",
        "what are my options",
        "how do I use this",
    ],
}

SUBJECTS = [
    "a banana", "a mountain landscape", "a futuristic city", "a cat",
    "a sunset over the ocean", "a nano-scale circuit", "a forest",
    "an astronaut", "a fruit basket", "a robot",
]


def generate_dataset(n_per_intent: int = 200, seed: int = 42):
    """Returns a list of (text, intent_label) tuples."""
    random.seed(seed)
    data = []
    for intent, templates in TEMPLATES.items():
        for _ in range(n_per_intent):
            template = random.choice(templates)
            if "{subject}" in template:
                text = template.format(subject=random.choice(SUBJECTS))
            else:
                text = template
            data.append((text, intent))
    random.shuffle(data)
    return data


if __name__ == "__main__":
    ds = generate_dataset(n_per_intent=5)
    for text, label in ds[:10]:
        print(f"[{label}] {text}")
