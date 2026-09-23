export default function ToolPageHeader({
  title,
  subtitle,
  section = "CREATIVE TOOL",
  onBack,
}) {
  function handleBack() {
    if (
      typeof onBack === "function"
    ) {
      onBack();
    }
  }

  return (
    <header className="tool-page-header">

      {/* Top navigation */}
      <div className="tool-header-top">

        <button
          type="button"
          className="tool-back-button"
          onClick={handleBack}
        >
          <span>
            ←
          </span>

          TOOLS
        </button>

        <div className="tool-header-brand">

          <div className="tool-header-brand-mark">
            ✦
          </div>

          <div>
            <strong>
              RANANO
            </strong>

            <small>
              AI CREATIVE STUDIO
            </small>
          </div>

        </div>

        <div className="tool-header-right">

          <div className="tool-online">
            <span />
            SYSTEM ONLINE
          </div>

          <button
            type="button"
            className="tool-header-icon"
            aria-label="Information"
          >
            ⓘ
          </button>

          <button
            type="button"
            className="tool-header-icon"
            aria-label="Settings"
          >
            ⚙
          </button>

        </div>

      </div>

      {/* Page heading */}
      <div className="tool-header-intro">

        <div className="tool-header-section">
          <span>/</span>
          {section}
        </div>

        <h1>
          {title}
        </h1>

        <p>
          {subtitle}
        </p>

      </div>

    </header>
  );
}