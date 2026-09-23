import { useState } from "react";
import { api, fileUrl } from "../api.js";

export default function VideoGeneration({
  gallery = [],
  onBack,
}) {
  const [selected, setSelected] = useState([]);
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function toggleSelect(url) {
    setSelected((previous) =>
      previous.includes(url)
        ? previous.filter(
            (item) => item !== url
          )
        : [...previous, url]
    );

    setVideoUrl(null);
    setError(null);
  }

  async function handleGenerateVideo() {
    if (
      selected.length === 0 ||
      loading
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setVideoUrl(null);

    try {
      const relativePaths =
        selected.map((url) =>
          url.replace(
            /^.*(\/files\/)/,
            "/files/"
          )
        );

      const result =
        await api.generateVideo(
          relativePaths
        );

      setVideoUrl(
        fileUrl(result.video_url)
      );
    } catch (e) {
      setError(
        e?.message ||
          "Video generation failed."
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
            VIDEO GENERATION
          </div>

          <h1>
            CREATE
            <br />
            <span>A VIDEO.</span>
          </h1>

          <p>
            Turn your generated images into
            a smooth visual sequence.
          </p>

          <div className="ig-hero-status">
            <span className="ig-status-line" />
            IMAGE → VIDEO
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
            <span>▶</span>
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
                IMAGE SEQUENCE
              </div>
            </div>

            <span className="ig-panel-code">
              INPUT
            </span>

          </div>

          <h2>
            Choose your
            <br />
            <span>story frames.</span>
          </h2>

          <p className="ig-panel-description">
            Select the images you want to
            combine into a video. Build your
            visual story frame by frame.
          </p>

          {/* IMAGE GALLERY */}

          {gallery.length === 0 ? (
            <div
              className="ig-output-stage"
              style={{
                minHeight: "300px",
              }}
            >
              <div className="ig-empty-output">

                <div className="ig-empty-orbit">
                  <span>✦</span>
                </div>

                <div className="ig-empty-label">
                  NO IMAGES AVAILABLE
                </div>

                <h3>
                  Your story frames
                  <br />
                  will appear here.
                </h3>

                <p>
                  Generate images first in
                  Image Generation.
                </p>

              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: "12px",
                marginTop: "18px",
                maxHeight: "320px",
                overflowY: "auto",
                paddingRight: "4px",
              }}
            >
              {gallery.map(
                (url, index) => {
                  const isSelected =
                    selected.includes(url);

                  return (
                    <button
                      type="button"
                      key={`${url}-${index}`}
                      onClick={() =>
                        toggleSelect(url)
                      }
                      style={{
                        position:
                          "relative",
                        padding: 0,
                        border:
                          isSelected
                            ? "2px solid #ffd400"
                            : "1px solid rgba(255,212,0,.2)",
                        background:
                          "rgba(0,0,0,.35)",
                        borderRadius:
                          "10px",
                        overflow:
                          "hidden",
                        cursor:
                          "pointer",
                        aspectRatio:
                          "1 / 1",
                      }}
                    >
                      <img
                        src={url}
                        alt={`Frame ${
                          index + 1
                        }`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit:
                            "cover",
                          display:
                            "block",
                          opacity:
                            isSelected
                              ? 0.75
                              : 1,
                        }}
                      />

                      <span
                        style={{
                          position:
                            "absolute",
                          top: "8px",
                          left: "8px",
                          fontSize:
                            "11px",
                          padding:
                            "4px 7px",
                          borderRadius:
                            "5px",
                          background:
                            "rgba(0,0,0,.75)",
                          color:
                            "#ffd400",
                        }}
                      >
                        {String(
                          index + 1
                        ).padStart(2, "0")}
                      </span>

                      {isSelected && (
                        <span
                          style={{
                            position:
                              "absolute",
                            right: "8px",
                            top: "8px",
                            width: "25px",
                            height: "25px",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            borderRadius:
                              "50%",
                            background:
                              "#ffd400",
                            color:
                              "#080808",
                            fontWeight:
                              "900",
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                }
              )}
            </div>
          )}

          {/* SELECTION */}

          {gallery.length > 0 && (
            <>
              <div
                className="ig-result-note"
                style={{
                  marginTop: "16px",
                }}
              >
                <span>✦</span>
                {selected.length} FRAME
                {selected.length === 1
                  ? ""
                  : "S"} SELECTED
              </div>

              <div
                className="ig-actions"
                style={{
                  marginTop: "12px",
                }}
              >
                <button
                  type="button"
                  className="ig-generate-button"
                  onClick={
                    handleGenerateVideo
                  }
                  disabled={
                    selected.length === 0 ||
                    loading
                  }
                >
                  <span>
                    {loading
                      ? "RENDERING VIDEO..."
                      : `CREATE VIDEO (${selected.length})`}
                  </span>

                  {!loading && (
                    <span className="ig-button-arrow">
                      →
                    </span>
                  )}
                </button>
              </div>
            </>
          )}

          {loading && (
            <div
              className="ig-progress"
              style={{ marginTop: "16px" }}
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
                RANANO IS RENDERING YOUR VIDEO...
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
                VIDEO OUTPUT
              </div>
            </div>

            <span className="ig-panel-code">
              OUTPUT
            </span>

          </div>

          <div
            className={`ig-output-stage ${
              videoUrl ? "has-image" : ""
            }`}
          >

            {videoUrl ? (
              <div
                className="ig-generated-result"
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  height: "100%",
                }}
              >
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  loop
                  className="ig-generated-image"
                  style={{
                    objectFit:
                      "contain",
                    background:
                      "#000",
                  }}
                />

                <div className="ig-image-overlay">
                  <span>
                    ✦ VIDEO READY
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setVideoUrl(null)
                    }
                  >
                    CLEAR
                  </button>
                </div>
              </div>
            ) : (
              <div className="ig-empty-output">

                <div className="ig-empty-orbit">
                  <span>▶</span>
                </div>

                <div className="ig-empty-label">
                  WAITING FOR FRAMES
                </div>

                <h3>
                  Your video
                  <br />
                  will appear here.
                </h3>

                <p>
                  Select at least one image
                  to begin rendering.
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