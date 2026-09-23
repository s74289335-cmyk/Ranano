// Central API client. In development this defaults to your local FastAPI
// server. When deploying to Vercel, set VITE_API_BASE_URL to your deployed
// Render/Railway backend URL (e.g. via a .env.production file or Vercel's
// environment variable settings).
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function handleResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export function fileUrl(path) {
  // Backend returns paths like "/files/xyz.png" - prefix with the API base.
  return `${API_BASE}${path}`;
}

export const api = {
  health: () => fetch(`${API_BASE}/api/health`).then(handleResponse),

  startGenerateImage: () =>
    fetch(`${API_BASE}/api/generate-image/start`, { method: "POST" }).then(handleResponse),

  startGenerateImageFromText: (prompt, useBackground = false) =>
    fetch(`${API_BASE}/api/generate-image-from-text/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, use_background: useBackground }),
    }).then(handleResponse),

  getGenerationProgress: (jobId) =>
    fetch(`${API_BASE}/api/generation-progress/${jobId}`).then(handleResponse),

  // Starts a generation job, then polls its progress every ~400ms until it
  // finishes, calling onProgress(step, total) along the way so the UI can
  // render a live progress bar instead of a static spinner. Resolves with
  // the job's result object, or throws on failure.
  runGenerationJob: async (startFn, onProgress) => {
    const { job_id } = await startFn();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await new Promise((r) => setTimeout(r, 400));
      const job = await api.getGenerationProgress(job_id);
      if (onProgress) onProgress(job.step, job.total);
      if (job.status === "done") return job.result;
      if (job.status === "error") throw new Error(job.error || "Generation failed");
    }
  },

  labelPhoto: (file, effect = "fade") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("effect", effect);
    return fetch(`${API_BASE}/api/label-photo`, { method: "POST", body: formData }).then(
      handleResponse
    );
  },

  enhanceImage: (file, mode = "fast") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);
    return fetch(`${API_BASE}/api/enhance-image`, { method: "POST", body: formData }).then(
      handleResponse
    );
  },

  generateVideo: (imageUrls) =>
    fetch(`${API_BASE}/api/generate-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_urls: imageUrls }),
    }).then(handleResponse),

  animateText: (text, effect = "fade") =>
    fetch(`${API_BASE}/api/animate-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, effect }),
    }).then(handleResponse),

  classifyIntent: (command) =>
    fetch(`${API_BASE}/api/classify-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    }).then(handleResponse),

  // Real conversational endpoint - combines the trained intent classifier
  // (for navigation) with Groq's LLM (for natural, in-character replies
  // with actual multi-turn memory via `history`).
  chat: (message, history = [], tool = "RANANO Studio") =>
  fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      history,
      tool,
    }),
  }).then(handleResponse),
};