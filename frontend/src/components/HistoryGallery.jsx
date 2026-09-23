import { useEffect, useMemo, useState } from "react";
import { loadHistory, clearHistory, timeAgo } from "../history.js";
import ToolPageHeader from "./ToolPageHeader.jsx";

const PAGE_SIZE = 12;

export default function HistoryGallery() {
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setEntries(loadHistory());
  }, []);

  const types = useMemo(() => {
    const set = new Set();
    entries.forEach((e) => (e.matchedClasses || []).forEach((c) => set.add(c)));
    return ["All Types", ...Array.from(set).sort()];
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchesType =
        typeFilter === "All Types" || (e.matchedClasses || []).includes(typeFilter);
      const haystack = `${e.prompt || ""} ${(e.matchedClasses || []).join(" ")}`.toLowerCase();
      const matchesSearch = !search.trim() || haystack.includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [entries, typeFilter, search]);

  const visible = filtered.slice(0, visibleCount);

  function handleClear() {
    clearHistory();
    setEntries([]);
    setSelected(null);
  }

  function handleDownload(entry) {
    const a = document.createElement("a");
    a.href = entry.url;
    a.download = `ranano-${entry.id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (entries.length === 0) {
    return (
      <div className="panel tool-page">
        <ToolPageHeader title="Your History" subtitle="All your creations, saved locally." />
        <p className="hint">
          Nothing generated yet - head to Image Generation and make something. Everything you
          create will show up here, saved locally in your browser.
        </p>
      </div>
    );
  }

  return (
    <div className="panel tool-page">
      <ToolPageHeader title="Your History" subtitle="All your creations, saved locally." />

      <div className="tool-history-controls">
        <input
          type="text"
          placeholder="Search your creations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="tool-history-search"
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button className="guide-link" onClick={handleClear}>
          Clear history
        </button>
      </div>

      <p className="hint">
        {filtered.length} of {entries.length} generation{entries.length === 1 ? "" : "s"} shown.
      </p>

      <div className="history-grid">
        {visible.map((entry) => (
          <div key={entry.id} className="history-card">
            <img
              src={entry.url}
              alt={entry.prompt || "generated fruit"}
              onClick={() => setSelected(entry)}
            />
            <div className="history-card-info">
              <span className="history-card-caption">
                {entry.matchedClasses && entry.matchedClasses.length > 0
                  ? entry.matchedClasses.join(" + ")
                  : entry.prompt || "Random"}
              </span>
              <span className="history-card-time">{timeAgo(entry.timestamp)}</span>
            </div>
            <button className="history-download" onClick={() => handleDownload(entry)}>
              ⬇ Download
            </button>
          </div>
        ))}
      </div>

      {visibleCount < filtered.length && (
        <button className="tool-load-more" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
          Load more
        </button>
      )}

      {selected && (
        <div className="history-lightbox" onClick={() => setSelected(null)}>
          <img src={selected.url} alt={selected.prompt || "generated fruit"} />
          <div className="history-lightbox-caption">
            {selected.prompt && <p>"{selected.prompt}"</p>}
            {selected.matchedClasses?.length > 0 && (
              <p className="hint">Matched: {selected.matchedClasses.join(" + ")}</p>
            )}
            {selected.note && <p className="hint">{selected.note}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
