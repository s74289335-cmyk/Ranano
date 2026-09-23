const tools = [
  {
    id: "generate",
    number: "01",
    icon: "✦",
    title: "IMAGE GENERATION",
    description:
      "Create original images from simple text prompts.",
    meta: "TEXT → IMAGE",
  },
  {
    id: "enhance",
    number: "02",
    icon: "✧",
    title: "IMAGE ENHANCEMENT",
    description:
      "Restore clarity, sharpness and visual quality.",
    meta: "IMAGE → IMAGE",
  },
  {
    id: "video",
    number: "03",
    icon: "▶",
    title: "VIDEO GENERATION",
    description:
      "Turn your images into smooth visual stories.",
    meta: "IMAGE → VIDEO",
  },
  {
    id: "text",
    number: "04",
    icon: "T",
    title: "ANIMATED TEXT",
    description:
      "Bring words to life with expressive motion.",
    meta: "TEXT → MOTION",
  },
];

export default function ToolChooser({
  onChoose,
}) {
  return (
    <main className="tool-chooser-page">

      <div
        className="tool-chooser-background"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="tool-chooser-header">

        <div className="chooser-brand">
          <div className="chooser-brand-mark">
            ✦
          </div>

          <div>
            <div className="chooser-brand-name">
              RANANO
            </div>

            <div className="chooser-brand-subtitle">
              AI CREATIVE STUDIO
            </div>
          </div>
        </div>

        <div className="chooser-status">
          <span />
          SYSTEM ONLINE
        </div>

      </header>

      {/* Content */}
      <section className="tool-chooser-content">

        <div className="chooser-section-label">
          <span>/</span>
          CREATIVE WORKSPACE
        </div>

        <h1>
          WHAT WOULD YOU
          <br />
          <span>LIKE TO CREATE?</span>
        </h1>

        <p className="chooser-description">
          Choose a tool and start creating.
          You can return here anytime.
        </p>

        <div className="chooser-tool-grid">

          {tools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className={`chooser-tool-card ${
                tool.id === "generate"
                  ? "chooser-tool-featured"
                  : ""
              }`}
              onClick={() =>
                onChoose?.(tool.id)
              }
            >

              <div className="chooser-card-top">
                <span>
                  {tool.number}
                </span>

                <b>
                  ↗
                </b>
              </div>

              <div className="chooser-tool-icon">
                {tool.icon}
              </div>

              <h2>
                {tool.title}
              </h2>

              <p>
                {tool.description}
              </p>

              <div className="chooser-tool-meta">
                {tool.meta}
              </div>

            </button>
          ))}

        </div>

      </section>

      <footer className="chooser-footer">
        <span />
        <div>
          <i />
          SYSTEM ONLINE
        </div>
        <span />
      </footer>

    </main>
  );
}