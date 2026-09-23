/** A distinct, colored "scene header" for the top of each page - gives
 * every page its own visual identity instead of every page looking like
 * an identical generic dashboard card. `accent` is any CSS color. */
export default function PageHero({ icon, title, tagline, accent }) {
  return (
    <div className="page-hero" style={{ "--page-accent": accent }}>
      <div className="page-hero-icon">{icon}</div>
      <div>
        <h2 className="page-hero-title">{title}</h2>
        {tagline && <p className="page-hero-tagline">{tagline}</p>}
      </div>
    </div>
  );
}