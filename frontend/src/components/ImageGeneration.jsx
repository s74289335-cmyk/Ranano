import { useEffect, useState } from "react";
import { api, fileUrl } from "../api.js";
import { saveHistoryEntry, loadHistory } from "../history.js";

const QUICK_IDEAS = [
  "Banana on the beach",
  "A cute mango robot",
  "Strawberry in space",
];

function ProgressBar({ step, total }) {
  if (!total) return null;

  const pct = Math.min(100, Math.round((step / total) * 100));

  return (
    <div className="ig-progress">
      <div className="ig-progress-track">
        <div
          className="ig-progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>

      <span className="ig-progress-text">
        GENERATING · {pct}%
      </span>
    </div>
  );
}

export default function ImageGeneration({
  gallery,
  addToGallery,
  onViewHistory,
  onBack,
}) {
  const [prompt, setPrompt] = useState("");
  const [useBackground, setUseBackground] = useState(false);

  const [promptGenerating, setPromptGenerating] = useState(false);
  const [promptProgress, setPromptProgress] = useState({
    step: 0,
    total: 0,
  });

  const [randomGenerating, setRandomGenerating] = useState(false);
  const [randomProgress, setRandomProgress] = useState({
    step: 0,
    total: 0,
  });

  const [generatedImage, setGeneratedImage] = useState(null);

  const [error, setError] = useState(null);
  const [promptNote, setPromptNote] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    setRecent(loadHistory().slice(0, 4));
  }, [gallery]);

  function handleBack() {
    if (typeof onBack === "function") {
      onBack();
      return;
    }

    window.history.back();
  }

  async function handleGenerateFromText() {
    const cleanPrompt = prompt.trim();

    if (!cleanPrompt || promptGenerating || randomGenerating) {
      return;
    }

    setPromptGenerating(true);
    setError(null);
    setPromptNote(null);
    setGeneratedImage(null);

    setPromptProgress({
      step: 0,
      total: 0,
    });

    try {
      const result = await api.runGenerationJob(
        () =>
          api.startGenerateImageFromText(
            cleanPrompt,
            useBackground
          ),
        (step, total) => {
          setPromptProgress({
            step,
            total,
          });
        }
      );

      const image = fileUrl(result.image_url);

      setGeneratedImage(image);

      if (typeof addToGallery === "function") {
        addToGallery(image);
      }

      saveHistoryEntry({
        url: image,
        prompt: cleanPrompt,
        matchedClasses: result.matched_classes || [],
        note: result.note || null,
      });

      const parts = [];

      if (
        result.matched_classes &&
        result.matched_classes.length > 0
      ) {
        parts.push(
          `Matched: ${result.matched_classes.join(" + ")}`
        );
      } else {
        parts.push(
          "No known fruit found. Try banana, apple, orange, strawberry, pineapple, lemon, mango or kiwi."
        );
      }

      if (result.note) {
        parts.push(result.note);
      }

      setPromptNote(parts.join(" · "));
      setRecent(loadHistory().slice(0, 4));
    } catch (e) {
      setError(e?.message || "Image generation failed.");
    } finally {
      setPromptGenerating(false);

      setPromptProgress({
        step: 0,
        total: 0,
      });
    }
  }

  async function handleGenerateRandom() {
    if (promptGenerating || randomGenerating) {
      return;
    }

    setRandomGenerating(true);
    setError(null);
    setPromptNote(null);
    setGeneratedImage(null);

    setRandomProgress({
      step: 0,
      total: 0,
    });

    try {
      const result = await api.runGenerationJob(
        () => api.startGenerateImage(),
        (step, total) => {
          setRandomProgress({
            step,
            total,
          });
        }
      );

      const image = fileUrl(result.image_url);

      setGeneratedImage(image);

      if (typeof addToGallery === "function") {
        addToGallery(image);
      }

      saveHistoryEntry({
        url: image,
        prompt: "Random generation",
        matchedClasses: [],
        note: null,
      });

      setRecent(loadHistory().slice(0, 4));
    } catch (e) {
      setError(e?.message || "Random generation failed.");
    } finally {
      setRandomGenerating(false);

      setRandomProgress({
        step: 0,
        total: 0,
      });
    }
  }

  function handleQuickIdea(idea) {
    setPrompt(idea);
    setError(null);
    setPromptNote(null);
  }

  function handlePromptKeyDown(event) {
    if (
      event.key === "Enter" &&
      event.ctrlKey &&
      !promptGenerating &&
      !randomGenerating
    ) {
      event.preventDefault();
      handleGenerateFromText();
    }
  }

  const busy = promptGenerating || randomGenerating;

  return (
    <main className="image-generation-page">

      {/* =========================================================
          BACKGROUND
          ========================================================= */}

      <div
        className="ig-background-grid"
        aria-hidden="true"
      />

      <div
        className="ig-background-glow ig-glow-one"
        aria-hidden="true"
      />

      <div
        className="ig-background-glow ig-glow-two"
        aria-hidden="true"
      />

      {/* =========================================================
          HEADER
          ========================================================= */}

      <header className="ig-workspace-header">

        <button
          type="button"
          className="ig-tools-button"
          onClick={handleBack}
        >
          <span className="ig-tools-arrow">
            ←
          </span>

          <span>TOOLS</span>
        </button>

        <div className="ig-brand">

          <div className="ig-brand-mark">
            ✦
          </div>

          <div>
            <div className="ig-brand-name">
              RANANO
            </div>

            <div className="ig-brand-subtitle">
              AI CREATIVE STUDIO
            </div>
          </div>

        </div>

        <div className="ig-header-right">

          <div className="ig-system-state">
            <span className="ig-system-dot" />
            SYSTEM ONLINE
          </div>

          {onViewHistory && (
            <button
              type="button"
              className="ig-history-button"
              onClick={onViewHistory}
            >
              HISTORY →
            </button>
          )}

          <button
            type="button"
            className="ig-header-icon"
            aria-label="Information"
          >
            ⓘ
          </button>

          <button
            type="button"
            className="ig-header-icon"
            aria-label="Settings"
          >
            ⚙
          </button>

        </div>

      </header>

      {/* =========================================================
          HERO
          ========================================================= */}

      <section className="ig-hero">

        <div className="ig-hero-copy">

          <div className="ig-section-label">
            <span>/</span>
            IMAGE GENERATION
          </div>

          <h1>
            CREATE
            <br />
            <span>SOMETHING FROM NOTHING.</span>
          </h1>

          <p>
            Describe an idea and let RANANO turn
            your imagination into an image.
          </p>

          <div className="ig-hero-status">
            <span className="ig-status-line" />
            TEXT → IMAGE
            <span className="ig-status-line" />
          </div>

        </div>

        {/* CREATIVE CORE */}

        <div
          className="ig-hero-mascot"
          aria-hidden="true"
        >

          <div className="ig-mascot-orbit ig-orbit-one" />
          <div className="ig-mascot-orbit ig-orbit-two" />
          <div className="ig-mascot-orbit ig-orbit-three" />

          <div className="ig-mascot-core">
            <span>✦</span>
          </div>

          <div className="ig-mascot-caption">
            CREATIVE CORE
          </div>

        </div>

      </section>

      {/* =========================================================
          ERROR
          ========================================================= */}

      {error && (
        <div className="ig-error">

          <span className="ig-error-symbol">
            ⚠
          </span>

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            ×
          </button>

        </div>
      )}

      {/* =========================================================
          MAIN WORKSPACE
          ========================================================= */}

      <section className="ig-workspace">

        {/* =======================================================
            PROMPT PANEL
            ======================================================= */}

        <section className="ig-panel ig-prompt-panel">

          <div className="ig-panel-top">

            <div>
              <div className="ig-card-number">
                01
              </div>

              <div className="ig-panel-label">
                YOUR PROMPT
              </div>
            </div>

            <span className="ig-panel-code">
              INPUT
            </span>

          </div>

          <h2>
            What should
            <br />
            we create?
          </h2>

          <p className="ig-panel-description">
            Start with a simple idea. RANANO can
            understand fruit concepts and combine
            multiple ideas into one image.
          </p>

          {/* PROMPT */}

          <div className="ig-prompt-box">

            <textarea
              value={prompt}
              maxLength={500}
              rows={5}
              placeholder="A cinematic mango floating in space..."
              onChange={(event) =>
                setPrompt(event.target.value)
              }
              onKeyDown={handlePromptKeyDown}
              disabled={busy}
            />

            <span className="ig-character-count">
              {prompt.length}/500
            </span>

          </div>

          {/* QUICK IDEAS */}

          <div className="ig-try-label">
            TRY AN IDEA
          </div>

          <div className="ig-quick-ideas">

            {QUICK_IDEAS.map((idea) => (
              <button
                type="button"
                key={idea}
                className="ig-chip"
                onClick={() =>
                  handleQuickIdea(idea)
                }
                disabled={busy}
              >
                {idea}
              </button>
            ))}

          </div>

          {/* BACKGROUND OPTION */}

          <label className="ig-background-option">

            <div className="ig-background-copy">

              <div className="ig-option-title">
                AI BACKGROUND SCENE
              </div>

              <div className="ig-option-description">
                Use the remaining prompt to build
                the surrounding environment.
              </div>

            </div>

            <input
              type="checkbox"
              checked={useBackground}
              onChange={(event) =>
                setUseBackground(
                  event.target.checked
                )
              }
              disabled={busy}
            />

            <span className="ig-toggle">
              <span />
            </span>

          </label>

          {/* ACTIONS */}

          <div className="ig-actions">

            <button
              type="button"
              className="ig-generate-button"
              onClick={handleGenerateFromText}
              disabled={
                busy || !prompt.trim()
              }
            >
              <span>
                {promptGenerating
                  ? "GENERATING..."
                  : "GENERATE IMAGE"}
              </span>

              {!promptGenerating && (
                <span className="ig-button-arrow">
                  →
                </span>
              )}
            </button>

            <button
              type="button"
              className="ig-random-button"
              onClick={handleGenerateRandom}
              disabled={busy}
              title="Generate a random image"
              aria-label="Generate random image"
            >
              {randomGenerating
                ? "..."
                : "✦"}
            </button>

          </div>

          {/* SHORTCUT */}

          <div className="ig-shortcut">
            PRESS <kbd>CTRL</kbd> +{" "}
            <kbd>ENTER</kbd> TO GENERATE
          </div>

          {/* PROGRESS */}

          {promptGenerating && (
            <ProgressBar
              step={promptProgress.step}
              total={promptProgress.total}
            />
          )}

          {randomGenerating && (
            <ProgressBar
              step={randomProgress.step}
              total={randomProgress.total}
            />
          )}

          {/* NOTE */}

          {promptNote && (
            <div className="ig-result-note">
              <span>✦</span>
              {promptNote}
            </div>
          )}

        </section>

        {/* =======================================================
            OUTPUT PANEL
            ======================================================= */}

        <section className="ig-panel ig-output-panel">

          <div className="ig-panel-top">

            <div>
              <div className="ig-card-number">
                02
              </div>

              <div className="ig-panel-label">
                YOUR CREATION
              </div>
            </div>

            <span className="ig-panel-code">
              OUTPUT
            </span>

          </div>

          {/* OUTPUT */}

          <div
            className={`ig-output-stage ${
              generatedImage
                ? "has-image"
                : ""
            }`}
          >

            {generatedImage ? (

              <div className="ig-generated-result">

                <img
                  src={generatedImage}
                  alt={
                    prompt ||
                    "Generated RANANO artwork"
                  }
                  className="ig-generated-image"
                />

                <div className="ig-image-overlay">

                  <span>
                    ✦ GENERATED SUCCESSFULLY
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setGeneratedImage(null)
                    }
                  >
                    CLEAR
                  </button>

                </div>

              </div>

            ) : (

              <div className="ig-empty-output">

                <div className="ig-empty-orbit">
                  <span>✦</span>
                </div>

                <div className="ig-empty-label">
                  WAITING FOR CREATION
                </div>

                <h3>
                  Your image will
                  <br />
                  appear here.
                </h3>

                <p>
                  Write a prompt on the left
                  and start creating.
                </p>

              </div>

            )}

          </div>

          {/* =====================================================
              RECENT CREATIONS
              ===================================================== */}

          {recent.length > 0 && (

            <div className="ig-recent">

              <div className="ig-recent-header">

                <div>

                  <span className="ig-recent-label">
                    RECENT CREATIONS
                  </span>

                  <span className="ig-recent-count">
                    {recent.length}
                  </span>

                </div>

                {onViewHistory && (
                  <button
                    type="button"
                    onClick={onViewHistory}
                  >
                    OPEN GALLERY →
                  </button>
                )}

              </div>

              <div className="ig-recent-grid">

                {recent.map((entry) => (

                  <button
                    type="button"
                    className="ig-recent-item"
                    key={
                      entry.id ||
                      entry.url
                    }
                    onClick={() =>
                      setGeneratedImage(
                        entry.url
                      )
                    }
                  >

                    <img
                      src={entry.url}
                      alt={
                        entry.prompt ||
                        "Recent generation"
                      }
                    />

                    <span>
                      ↗
                    </span>

                  </button>

                ))}

              </div>

            </div>

          )}

        </section>

      </section>

      {/* =========================================================
          FOOTER
          ========================================================= */}

      <footer className="ig-footer">

        <div className="ig-footer-line" />

        <div className="ig-footer-status">

          <span />

          RANANO CREATIVE CORE

        </div>

        <div className="ig-footer-line" />

      </footer>

    </main>
  );
}