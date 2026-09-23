const HISTORY_KEY = "ranano_generation_history";
const MAX_ENTRIES = 60;

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistoryEntry(entry) {
  const current = loadHistory();
  const withNew = [{ ...entry, id: crypto.randomUUID(), timestamp: Date.now() }, ...current].slice(
    0,
    MAX_ENTRIES
  );
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(withNew));
  } catch {
    // Storage full/unavailable (e.g. private browsing) - fail silently,
    // history is a nice-to-have, not critical path.
  }
  return withNew;
}

export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* ignore */
  }
}

export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}