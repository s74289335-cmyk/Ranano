import { useState, useRef } from "react";
import { api } from "../api.js";

function speak(text) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

export default function VoiceAssistant() {
  const [command, setCommand] = useState("");
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  function handleSpeakCommand() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("SpeechRecognition not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setCommand(text);
    };
    recognition.onerror = (event) => setError(`Speech recognition error: ${event.error}`);

    recognitionRef.current = recognition;
    recognition.start();
  }

  async function handleAsk() {
    if (!command.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.classifyIntent(command);
      setResult(res);
      speak(res.response);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleExplain() {
    const intro =
      "Welcome to Ranano. Use the tabs above to generate images, label and animate your photos, create videos, or change voices. You can also tell me what you'd like to do, right here.";
    speak(intro);
  }

  return (
    <div className="panel">
      <h2>🤖 Voice Assistant — Your Platform Guide</h2>
      <p className="hint">Powered by your own trained LSTM intent classifier - no pretrained NLP model.</p>

      <button className="primary" onClick={handleExplain}>
        🔊 Explain this platform
      </button>

      <hr />

      <p>
        <strong>Step 1:</strong> Speak your command (or just type it below)
      </p>
      <button onClick={handleSpeakCommand} disabled={listening}>
        {listening ? "🎙️ Listening..." : "🎙️ Speak Command"}
      </button>

      <p>
        <strong>Step 2:</strong> Confirm/edit your command and ask the assistant
      </p>
      <div className="row">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="e.g. I want to make a picture of a banana"
        />
        <button className="primary" onClick={handleAsk} disabled={!command.trim() || loading}>
          {loading ? "Understanding..." : "Ask the Assistant"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {result && (
        <div className="result">
          <p>
            <strong>Detected intent:</strong>{" "}
            {result.intent.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} (confidence:{" "}
            {result.confidence})
          </p>
          <p>{result.response}</p>
        </div>
      )}
    </div>
  );
}
