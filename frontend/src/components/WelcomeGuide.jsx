import { useEffect, useMemo, useState } from "react";
import mascot from "../assets/mascot.png";

// One entry per feature. `tab` must match the tab id used in App.jsx's
// TABS array, so clicking "Try it" here can jump straight there.
const FEATURES = [
  {
    id: "generate",
    tab: "generate",
    emoji: "🎨",
    title: "Image Generation",
    tagline: "Type a fruit, I'll paint it - for real, with my own trained brain.",
    talk: "This one's my favorite! Type a fruit name - banana, apple, orange, whatever - and I'll generate it using a diffusion model trained completely from scratch. No pretrained weights, no shortcuts. Combine two fruits like \"mango with apple\" and I'll place them side-by-side. Want a scene instead of a plain background? Flip on the AI-background switch and I'll drop your fruit into a whole new setting.",
  },
  {
    id: "enhance",
    tab: "enhance",
    emoji: "✨",
    title: "Image Enhancement",
    tagline: "Upload a photo, I'll sharpen it up.",
    talk: "Got a photo that needs a little love? Upload it here and I'll clean it up - better clarity, nicer color, the works. Handy for polishing up whatever you (or I) have generated.",
  },
  {
    id: "video",
    tab: "video",
    emoji: "🎬",
    title: "Video Generation",
    tagline: "Turn a batch of images into a moving slideshow.",
    talk: "Generated a few images already? Bring them here and I'll stitch them into a slideshow-style video. Great for showing off a whole set of fruit at once instead of one at a time.",
  },
  {
    id: "text",
    tab: "text",
    emoji: "🔤",
    title: "Animated Text",
    tagline: "Words that move - fade, slide, bounce, you name it.",
    talk: "Sometimes a picture needs a caption with a bit of flair. Type some text here and I'll animate it - fading in, sliding, bouncing - your call on the style.",
  },
  {
    id: "voice",
    tab: "voice",
    emoji: "🎙️",
    title: "Voice Assistant",
    tagline: "Talk to me - I'll figure out what you're asking for.",
    talk: "You can also just talk to me! I run my own intent classifier (also trained from scratch) to figure out what you want and route you to the right feature. Try saying something like \"make me a banana.\"",
  },
];

const INTRO_LINES = [
  "Hey there! I'm your guide around RANANO 👋",
  "Everything you see here - every image, every model - was trained from scratch. No pretrained weights, no shortcuts.",
  "Want me to walk you through what this place can do? Pick a card below, or just skip ahead if you already know your way around.",
];

function useTypewriter(text, speed = 18) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    setShown("");
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text]);

  return shown;
}

export default function WelcomeGuide({ onNavigate }) {
  const [selected, setSelected] = useState(null); // null = intro mode
  const [introIndex, setIntroIndex] = useState(0);

  const currentText = useMemo(() => {
    if (selected) return selected.talk;
    return INTRO_LINES[introIndex];
  }, [selected, introIndex]);

  const typed = useTypewriter(currentText);

  function handleCardClick(feature) {
    setSelected(feature);
  }

  function handleTryIt() {
    if (selected) onNavigate(selected.tab);
  }

  function handleBackToIntro() {
    setSelected(null);
    setIntroIndex(0);
  }

  return (
    <div className="guide">
      <div className="guide-speech-row">
        <img src={mascot} alt="RANANO mascot" className="guide-mascot" />
        <div className="guide-bubble">
          <p>{typed}</p>
          {!selected && introIndex < INTRO_LINES.length - 1 && (
            <button className="guide-next" onClick={() => setIntroIndex((i) => i + 1)}>
              Go on... →
            </button>
          )}
          {selected && (
            <div className="guide-bubble-actions">
              <button className="primary" onClick={handleTryIt}>
                Take me there →
              </button>
              <button className="guide-link" onClick={handleBackToIntro}>
                ← back
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="guide-cards">
        {FEATURES.map((f) => (
          <button
            key={f.id}
            className={
              "guide-card" + (selected?.id === f.id ? " guide-card-active" : "")
            }
            onClick={() => handleCardClick(f)}
          >
            <span className="guide-card-emoji">{f.emoji}</span>
            <span className="guide-card-title">{f.title}</span>
            <span className="guide-card-tagline">{f.tagline}</span>
          </button>
        ))}
      </div>

      <button className="guide-skip" onClick={() => onNavigate("generate")}>
        Skip the tour, take me straight in →
      </button>
    </div>
  );
}
