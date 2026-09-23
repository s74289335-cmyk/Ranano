import { useState } from "react";
import { api, fileUrl } from "../api.js";

const MAX_LEN = 40;

export default function AnimatedText({
  onBack,
}) {
  const [text, setText] =
    useState("RANANO");

  const [effect, setEffect] =
    useState("fade");

  const [gifUrl, setGifUrl] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(null);

  async function handleCreate() {
    if (!text.trim() || loading) {
      return;
    }

    setLoading(true);
    setError(null);
    setGifUrl(null);

    try {
      const result =
        await api.animateText(
          text,
          effect
        );

      setGifUrl(
        fileUrl(result.gif_url)
      );
    } catch (e) {
      setError(
        e?.message ||
          "Text animation failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="image-generation-page"
      style={{
        minHeight: "100vh",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* BACKGROUND */}

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

      {/* HEADER */}

      <header className="ig-workspace-header">

        <button
          type="button"
          className="ig-tools-button"
          onClick={onBack}
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

          <button
            type="button"
            className="ig-header-icon"
          >
            ⓘ
          </button>

          <button
            type="button"
            className="ig-header-icon"
          >
            ⚙
          </button>

        </div>

      </header>

      {/* HERO */}

      <section className="ig-hero">

        <div className="ig-hero-copy">

          <div className="ig-section-label">
            <span>/</span>
            ANIMATED TEXT
          </div>

          <h1>
            ANIMATE
            <br />
            <span>YOUR TEXT.</span>
          </h1>

          <p>
            Bring your words to life with
            motion, rhythm, and personality.
          </p>

          <div className="ig-hero-status">

            <span className="ig-status-line" />

            TEXT → MOTION

            <span className="ig-status-line" />

          </div>

        </div>

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

      {/* ERROR */}

      {error && (
        <div className="ig-error">

          <span className="ig-error-symbol">
            ⚠
          </span>

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError(null)}
          >
            ×
          </button>

        </div>
      )}

      {/* WORKSPACE */}

      <section className="ig-workspace">

        {/* INPUT */}

        <section className="ig-panel ig-prompt-panel">

          <div className="ig-panel-top">

            <div>

              <div className="ig-card-number">
                01
              </div>

              <div className="ig-panel-label">
                TEXT DESIGN
              </div>

            </div>

            <span className="ig-panel-code">
              INPUT
            </span>

          </div>

          <h2>
            Give your words
            <br />
            <span>some motion.</span>
          </h2>

          <p className="ig-panel-description">
            Type your message and choose
            an animation style. RANANO
            will transform it into an
            animated visual.
          </p>

          {/* TEXT */}

          <div
            className="ig-prompt-box"
            style={{
              padding: "0",
              overflow: "hidden",
            }}
          >

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                padding:
                  "12px 16px 0",
                fontSize: "10px",
                letterSpacing:
                  "1.5px",
                opacity: 0.65,
              }}
            >
              <span>YOUR TEXT</span>

              <span>
                {text.length} / {MAX_LEN}
              </span>
            </div>

            <textarea
              value={text}
              maxLength={MAX_LEN}
              rows={3}
              placeholder="Text to animate..."
              disabled={loading}
              onChange={(event) =>
                setText(
                  event.target.value.slice(
                    0,
                    MAX_LEN
                  )
                )
              }
              style={{
                width: "100%",
                minHeight: "105px",
                resize: "none",
                border: "none",
                outline: "none",
                background:
                  "transparent",
                color: "inherit",
                padding:
                  "12px 16px 16px",
                fontSize: "20px",
                fontWeight: 600,
              }}
            />

          </div>

          {/* EFFECT */}

          <div
            style={{
              marginTop: "20px",
            }}
          >

            <div
              style={{
                fontSize: "10px",
                letterSpacing:
                  "1.5px",
                opacity: 0.65,
                marginBottom:
                  "10px",
              }}
            >
              ANIMATION STYLE
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap: "8px",
              }}
            >

              {[
                {
                  value: "fade",
                  label: "FADE",
                  icon: "◌",
                },
                {
                  value: "slide",
                  label: "SLIDE",
                  icon: "→",
                },
                {
                  value: "typewriter",
                  label: "TYPEWRITER",
                  icon: "⌁",
                },
              ].map((item) => {

                const active =
                  effect === item.value;

                return (
                  <button
                    type="button"
                    key={item.value}
                    disabled={loading}
                    onClick={() =>
                      setEffect(
                        item.value
                      )
                    }
                    style={{
                      minHeight: "58px",
                      borderRadius: "9px",
                      border: active
                        ? "1px solid #ffd400"
                        : "1px solid rgba(255,212,0,.18)",
                      background: active
                        ? "rgba(255,212,0,.08)"
                        : "rgba(255,255,255,.015)",
                      color: active
                        ? "#ffd400"
                        : "inherit",
                      cursor:
                        loading
                          ? "default"
                          : "pointer",
                      fontSize: "11px",
                      letterSpacing:
                        "1px",
                    }}
                  >
                    <span
                      style={{
                        marginRight:
                          "6px",
                      }}
                    >
                      {item.icon}
                    </span>

                    {item.label}

                    {active && (
                      <small
                        style={{
                          marginLeft:
                            "5px",
                        }}
                      >
                        ✓
                      </small>
                    )}
                  </button>
                );
              })}

            </div>

          </div>

          {/* ACTION */}

          <div
            className="ig-actions"
            style={{
              marginTop: "20px",
            }}
          >

            <button
              type="button"
              className="ig-generate-button"
              onClick={handleCreate}
              disabled={
                loading ||
                !text.trim()
              }
            >
              <span>
                {loading
                  ? "RENDERING..."
                  : "CREATE ANIMATION"}
              </span>

              {!loading && (
                <span className="ig-button-arrow">
                  →
                </span>
              )}
            </button>

          </div>

          {loading && (
            <div
              className="ig-progress"
              style={{
                marginTop: "16px",
              }}
            >

              <div className="ig-progress-track">
                <div
                  className="ig-progress-fill"
                  style={{
                    width: "70%",
                    animation:
                      "pulse 1.2s infinite",
                  }}
                />
              </div>

              <span className="ig-progress-text">
                RANANO IS ANIMATING YOUR TEXT...
              </span>

            </div>
          )}

        </section>

        {/* OUTPUT */}

        <section className="ig-panel ig-output-panel">

          <div className="ig-panel-top">

            <div>

              <div className="ig-card-number">
                02
              </div>

              <div className="ig-panel-label">
                ANIMATION PREVIEW
              </div>

            </div>

            <span className="ig-panel-code">
              OUTPUT
            </span>

          </div>

          <div
            className={`ig-output-stage ${
              gifUrl ? "has-image" : ""
            }`}
          >

            {gifUrl ? (
              <div className="ig-generated-result">

                <img
                  src={gifUrl}
                  alt={`Animated text: ${text}`}
                  className="ig-generated-image"
                  style={{
                    objectFit:
                      "contain",
                  }}
                />

                <div className="ig-image-overlay">

                  <span>
                    ✦ ANIMATION READY
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setGifUrl(null)
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
                  Your animated text
                  <br />
                  will appear here.
                </h3>

                <p>
                  Enter your text and choose
                  an animation style.
                </p>

              </div>
            )}

          </div>

        </section>

      </section>

      {/* FOOTER */}

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