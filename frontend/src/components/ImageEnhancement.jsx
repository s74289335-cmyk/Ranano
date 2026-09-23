import { useRef, useState } from "react";
import { api, fileUrl } from "../api.js";

export default function ImageEnhancement({ onBack }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [enhancedUrl, setEnhancedUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);

  function acceptFile(selectedFile) {
    if (
      selectedFile &&
      selectedFile.type &&
      selectedFile.type.startsWith("image/")
    ) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setEnhancedUrl(null);
      setError(null);
    }
  }

  function handleFileSelect(event) {
    acceptFile(event.target.files?.[0]);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragOver(false);
    acceptFile(event.dataTransfer.files?.[0]);
  }

  function openFilePicker() {
    if (!loading) {
      fileInputRef.current?.click();
    }
  }

  async function handleEnhance() {
    if (!file || loading) return;

    setLoading(true);
    setError(null);
    setEnhancedUrl(null);

    try {
      const result = await api.enhanceImage(file, "ranano");

      setEnhancedUrl(fileUrl(result.image_url));
    } catch (e) {
      setError(
        e?.message || "Image enhancement failed."
      );
    } finally {
      setLoading(false);
    }
  }

  function clearImage() {
    setFile(null);
    setPreview(null);
    setEnhancedUrl(null);
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
          <span className="ig-tools-arrow">←</span>
          <span>TOOLS</span>
        </button>

        <div className="ig-brand">
          <div className="ig-brand-mark">✦</div>

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

      {/* HERO */}

      <section className="ig-hero">
        <div className="ig-hero-copy">
          <div className="ig-section-label">
            <span>/</span>
            IMAGE ENHANCEMENT
          </div>

          <h1>
            ENHANCE
            <br />
            <span>YOUR IMAGE.</span>
          </h1>

          <p>
            Upscale, clean, and improve clarity with
            RANANO super-resolution.
          </p>

          <div className="ig-hero-status">
            <span className="ig-status-line" />
            IMAGE → ENHANCED
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
          <span className="ig-error-symbol">⚠</span>
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
                SOURCE IMAGE
              </div>
            </div>

            <span className="ig-panel-code">
              INPUT
            </span>
          </div>

          <h2>
            Give your image
            <br />
            <span>another life.</span>
          </h2>

          <p className="ig-panel-description">
            Upload an image and let RANANO
            upscale it with EDSR x4 and
            apply gentle cleanup.
          </p>

          {/* UPLOAD */}

          <div
            className="ig-prompt-box"
            style={{
              minHeight: "250px",
              padding: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              cursor: loading
                ? "default"
                : "pointer",
              border:
                dragOver
                  ? "1px solid #ffd400"
                  : undefined,
            }}
            onClick={openFilePicker}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() =>
              setDragOver(false)
            }
            onDrop={handleDrop}
          >
            {preview ? (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "250px",
                }}
              >
                <img
                  src={preview}
                  alt="Selected"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      "rgba(0,0,0,.48)",
                    opacity: 0,
                    transition:
                      "opacity .2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity =
                      "1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity =
                      "0";
                  }}
                >
                  <strong>
                    IMAGE SELECTED
                  </strong>
                  <small>
                    Click to replace
                  </small>
                </div>
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px",
                }}
              >
                <div
                  style={{
                    fontSize: "42px",
                    color: "#ffd400",
                    marginBottom: "18px",
                  }}
                >
                  ↑
                </div>

                <strong
                  style={{
                    display: "block",
                    letterSpacing:
                      "1px",
                  }}
                >
                  DROP YOUR IMAGE HERE
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: "8px",
                    opacity: 0.65,
                  }}
                >
                  or click to browse
                </span>

                <small
                  style={{
                    display: "block",
                    marginTop: "18px",
                    opacity: 0.5,
                  }}
                >
                  PNG · JPG · JPEG · UP TO
                  20MB
                </small>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              hidden
            />
          </div>

          {/* ACTION */}

          <div className="ig-actions">
            <button
              type="button"
              className="ig-generate-button"
              onClick={handleEnhance}
              disabled={!file || loading}
            >
              <span>
                {loading
                  ? "ENHANCING..."
                  : "ENHANCE IMAGE"}
              </span>

              {!loading && (
                <span className="ig-button-arrow">
                  →
                </span>
              )}
            </button>

            {file && !loading && (
              <button
                type="button"
                className="ig-random-button"
                onClick={clearImage}
                title="Clear image"
                aria-label="Clear image"
              >
                ×
              </button>
            )}
          </div>

          {loading && (
            <div
              className="ig-progress"
              style={{ marginTop: "18px" }}
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
                RANANO IS ENHANCING YOUR IMAGE...
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
                ENHANCED RESULT
              </div>
            </div>

            <span className="ig-panel-code">
              OUTPUT
            </span>
          </div>

          <div
            className={`ig-output-stage ${
              enhancedUrl ? "has-image" : ""
            }`}
          >
            {enhancedUrl ? (
              <div className="ig-generated-result">

                <img
                  src={enhancedUrl}
                  alt="Enhanced result"
                  className="ig-generated-image"
                />

                <div className="ig-image-overlay">
                  <span>
                    ✦ ENHANCEMENT COMPLETE
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setEnhancedUrl(null)
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
                  WAITING FOR INPUT
                </div>

                <h3>
                  Your enhanced image
                  <br />
                  will appear here.
                </h3>

                <p>
                  Upload an image and start
                  the enhancement process.
                </p>
              </div>
            )}
          </div>

          {enhancedUrl && (
            <div
              className="ig-result-note"
              style={{ marginTop: "16px" }}
            >
              <span>✦</span>
              Your image has been enhanced
              successfully.
            </div>
          )}
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