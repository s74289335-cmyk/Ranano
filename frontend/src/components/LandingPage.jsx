import mascot from "../assets/mascot.png";

const FEATURES = [
  {
    icon: "⌁",
    label: "IMAGE",
    sublabel: "GENERATION",
    description: "Create images from text",
  },
  {
    icon: "✦",
    label: "IMAGE",
    sublabel: "ENHANCEMENT",
    description: "Improve existing images",
  },
  {
    icon: "▣",
    label: "VIDEO",
    sublabel: "SYNTHESIS",
    description: "Turn images into motion",
  },
  {
    icon: "T",
    label: "TEXT",
    sublabel: "ANIMATION",
    description: "Bring ideas to life",
  },
];

const METRICS = [
  {
    icon: "◇",
    value: "100%",
    label: "Custom Models",
  },
  {
    icon: "</>",
    value: "0",
    label: "Pretrained Weights",
  },
  {
    icon: "✓",
    value: "100%",
    label: "From Scratch",
  },
  {
    icon: "∞",
    value: "∞",
    label: "Creative Potential",
  },
];

export default function LandingPage({ onLogin }) {
  return (
    <main className="landing-page">
      {/* ============================================================
          BACKGROUND
          ============================================================ */}

      <div className="landing-page-grid" aria-hidden="true" />
      <div className="landing-page-noise" aria-hidden="true" />

      <div className="landing-page-glow landing-page-glow-one" />
      <div className="landing-page-glow landing-page-glow-two" />

      {/* ============================================================
          NAVIGATION
          ============================================================ */}

      <div className="landing-container">
        <header className="landing-navigation">
          <div className="landing-brand">
            <div className="landing-brand-icon">
              ✦
            </div>

            <div className="landing-brand-copy">
              <div className="landing-brand-name">
                RANANO
              </div>

              <div className="landing-brand-subtitle">
                AI CREATIVE STUDIO
              </div>
            </div>
          </div>

          <nav className="landing-nav-links" aria-label="Main navigation">
            <a href="#home" className="landing-nav-link active">
              Home
            </a>

            <a href="#features" className="landing-nav-link">
              Features
            </a>

            <a href="#technology" className="landing-nav-link">
              Technology
            </a>

            <a href="#about" className="landing-nav-link">
              About
            </a>

            <a href="#docs" className="landing-nav-link">
              Docs
            </a>
          </nav>

          <button
            className="landing-nav-button"
            onClick={onLogin}
          >
            <span>Login / Enter</span>
            <span className="landing-nav-arrow">→</span>
          </button>
        </header>

        {/* ==========================================================
            HERO
            ========================================================== */}

        <section
          id="home"
          className="landing-hero-new"
        >
          {/* --------------------------------------------------------
              LEFT
              -------------------------------------------------------- */}

          <div className="landing-hero-copy">

            <div className="landing-system-status">
              <span className="landing-system-dot" />
              <span>AI SYSTEM READY</span>
            </div>

            <div className="landing-hero-label">
              RECREATING NANO BANANA
              <span />
              DIFFUSION MODEL
            </div>

            <h1 className="landing-main-title">
              FROM PIXELS
              <br />
              TO <span>POSSIBILITIES.</span>
            </h1>

            <p className="landing-main-description">
              <strong>RANANO</strong> is your intelligent
              creative studio.
            </p>

            <p className="landing-main-description-secondary">
              Every image, every model, every line of code —
              built from scratch. No shortcuts. Just
              engineering and creativity.
            </p>

            {/* CTA */}

            <div className="landing-hero-actions">
              <button
                className="landing-primary-cta"
                onClick={onLogin}
              >
                <span>Enter RANANO Studio</span>
                <span className="landing-cta-arrow">
                  →
                </span>
              </button>

              <div className="landing-cta-note">
                <span className="landing-cta-note-dot" />
                No account needed
              </div>
            </div>

            {/* Feature strip */}

            <div
              id="features"
              className="landing-feature-strip"
            >
              {FEATURES.map((feature) => (
                <div
                  key={feature.label + feature.sublabel}
                  className="landing-feature-item"
                >
                  <div className="landing-feature-icon">
                    {feature.icon}
                  </div>

                  <div className="landing-feature-copy">
                    <div className="landing-feature-label">
                      {feature.label}
                    </div>

                    <div className="landing-feature-sublabel">
                      {feature.sublabel}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* --------------------------------------------------------
              RIGHT / MASCOT
              -------------------------------------------------------- */}

          <div className="landing-hero-visual">

            <div
              className="landing-planet"
              aria-hidden="true"
            />

            <div
              className="landing-star-field"
              aria-hidden="true"
            >
              <span className="landing-star star-1">✦</span>
              <span className="landing-star star-2">✦</span>
              <span className="landing-star star-3">·</span>
              <span className="landing-star star-4">·</span>
              <span className="landing-star star-5">✦</span>
            </div>

            {/* Technical rings */}

            <div
              className="landing-mascot-ring landing-mascot-ring-outer"
              aria-hidden="true"
            />

            <div
              className="landing-mascot-ring landing-mascot-ring-middle"
              aria-hidden="true"
            />

            <div
              className="landing-mascot-ring landing-mascot-ring-inner"
              aria-hidden="true"
            />

            {/* Mascot platform */}

            <div
              className="landing-mascot-platform"
              aria-hidden="true"
            >
              <div className="landing-platform-ring platform-one" />
              <div className="landing-platform-ring platform-two" />
              <div className="landing-platform-ring platform-three" />
            </div>

            {/* Mascot */}

            <div className="landing-mascot-wrapper">
              <img
                src={mascot}
                alt="RANANO AI mascot"
                className="landing-mascot-image"
              />
            </div>

            {/* Speech bubble */}

            <div className="landing-mascot-message">
              <div className="landing-message-header">
                <span className="landing-message-dot" />
                <strong>RANANO</strong>
              </div>

              <p>
                Your AI guide and
                <br />
                creative companion.
              </p>

              <div className="landing-message-prompt">
                Tell me what you
                <br />
                want to create!
              </div>

              <div
                className="landing-waveform"
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================================
            ENGINEERING / METRICS
            ========================================================== */}

        <section
          id="technology"
          className="landing-engineering-panel"
        >
          <div className="landing-engineering-intro">
            <div className="landing-engineering-corner corner-top-left" />
            <div className="landing-engineering-corner corner-bottom-right" />

            <div className="landing-engineering-icon">
              ◇
            </div>

            <div>
              <div className="landing-engineering-title">
                BUILT COMPLETELY FROM SCRATCH
              </div>

              <p>
                No pretrained weights. No external
                image-generation APIs.
                <br />
                Pure engineering. Pure creativity.
              </p>
            </div>
          </div>

          <div className="landing-metrics">
            {METRICS.map((metric) => (
              <div
                key={metric.label}
                className="landing-metric"
              >
                <div className="landing-metric-icon">
                  {metric.icon}
                </div>

                <div className="landing-metric-value">
                  {metric.value}
                </div>

                <div className="landing-metric-label">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ==========================================================
            FOOTER
            ========================================================== */}

        <footer className="landing-footer-new">
          <div>
            RANANO
            <span> / </span>
            AI CREATIVE STUDIO
          </div>

          <div className="landing-footer-status">
            <span />
            SYSTEM ONLINE
          </div>

          <div>
            Built from scratch ·
            Class-conditional diffusion ·
            End-to-end trained models
          </div>
        </footer>
      </div>
    </main>
  );
}