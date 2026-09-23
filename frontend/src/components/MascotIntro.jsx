import { useEffect, useState } from "react";
import mascot from "../assets/mascot.png";
import { speakCute, stopSpeaking } from "../voice.js";

const GREETING =
  "Hey there! I'm your RANANO guide. I'm here to help you explore the platform, discover creative tools, and turn your ideas into something amazing. Let's get started!";

export default function MascotIntro({ onDismiss }) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        speakCute(GREETING);
      } catch {
        // Voice is optional.
      }
    }, 900);

    function handleKeyDown(event) {
      if (event.key === "Escape" || event.key === "Enter") {
        handleDismiss();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);

      window.removeEventListener("keydown", handleKeyDown);

      try {
        stopSpeaking();
      } catch {
        // Ignore voice cleanup errors.
      }
    };
  }, []);

  function handleDismiss() {
    if (closing) {
      return;
    }

    setClosing(true);

    try {
      stopSpeaking();
    } catch {
      // Ignore.
    }

    setTimeout(() => {
      if (typeof onDismiss === "function") {
        onDismiss();
      }
    }, 350);
  }

  return (
    <main
      className={`mascot-intro ${
        closing ? "mascot-intro-closing" : ""
      }`}
    >
      {/* Background */}
      <div
        className="mascot-intro-grid"
        aria-hidden="true"
      />

      <div
        className="mascot-intro-glow mascot-intro-glow-one"
        aria-hidden="true"
      />

      <div
        className="mascot-intro-glow mascot-intro-glow-two"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="mascot-intro-header">
        <div className="mascot-intro-brand">
          <div className="mascot-intro-brand-mark">
            ✦
          </div>

          <div>
            <div className="mascot-intro-brand-name">
              RANANO
            </div>

            <div className="mascot-intro-brand-subtitle">
              AI CREATIVE STUDIO
            </div>
          </div>
        </div>

        <div className="mascot-intro-system">
          <span />
          SYSTEM ONLINE
        </div>
      </header>

      {/* Main */}
      <section className="mascot-intro-main">

        {/* Mascot Visual */}
        <div className="mascot-intro-visual">

          <div className="mascot-orbit orbit-one" />
          <div className="mascot-orbit orbit-two" />
          <div className="mascot-orbit orbit-three" />

          <div className="mascot-intro-core-glow" />

          <div className="mascot-intro-character">
            <img
              src={mascot}
              alt="RANANO AI guide mascot"
            />
          </div>

          <span className="mascot-spark spark-one">
            ✦
          </span>

          <span className="mascot-spark spark-two">
            ✦
          </span>

          <span className="mascot-spark spark-three">
            ·
          </span>
        </div>

        {/* Content */}
        <div className="mascot-intro-content">

          <div className="mascot-intro-eyebrow">
            YOUR RANANO AI GUIDE
          </div>

          <h1>
            Hey there!{" "}
            <span>I'm your guide.</span>
          </h1>

          <p>
            I'm your little AI companion here to help
            you explore RANANO, discover creative tools,
            and turn your ideas into something amazing.
          </p>

          <p>
            Whether you want to create an image,
            enhance a photo, generate a video, or bring
            text to life — I'll show you where to start.
          </p>

          <div className="mascot-intro-capabilities">
            <span>CREATE</span>
            <i>•</i>
            <span>ENHANCE</span>
            <i>•</i>
            <span>ANIMATE</span>
            <i>•</i>
            <span>EXPLORE</span>
          </div>

          <button
            type="button"
            className="mascot-intro-button"
            onClick={handleDismiss}
            autoFocus
          >
            <span>
              LET'S GET STARTED
            </span>

            <strong>
              →
            </strong>
          </button>

          <div className="mascot-intro-hint">
            <span>ENTER</span>
            <span>to continue</span>
          </div>

        </div>

      </section>

      {/* Bottom */}
      <footer className="mascot-intro-footer">
        <span />
        RANANO CREATIVE CORE
        <span />
      </footer>

    </main>
  );
}