import { useEffect, useRef, useState } from "react";
import mascot from "../assets/mascot.png";
import { api } from "../api.js";
import "./AIAgent.css";

const TOOL_NAMES = {
  choosing: "Tool Chooser",
  generate: "Image Generation",
  enhance: "Image Enhancement",
  video: "Video Generation",
  text: "Animated Text",
};

const QUICK_MESSAGES = {
  choosing: [
    "Which tool should I use?",
    "What can you do?",
    "Help me get started",
  ],
  generate: [
    "Help me write a prompt",
    "What can I generate?",
    "How do I use this?",
  ],
  enhance: [
    "How do I enhance an image?",
    "What does this tool do?",
  ],
  video: [
    "How do I create a video?",
    "What images should I select?",
  ],
  text: [
    "How do I animate text?",
    "Which effect should I use?",
  ],
};

function getToolName(stage, feature) {
  if (stage === "choosing") {
    return TOOL_NAMES.choosing;
  }

  return TOOL_NAMES[feature] || "RANANO Studio";
}

function normalizeIntent(intent) {
  if (!intent) {
    return null;
  }

  const value = String(intent)
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");

  if (
    value.includes("generate") ||
    value.includes("image_generation") ||
    value === "image"
  ) {
    return "generate";
  }

  if (
    value.includes("enhance") ||
    value.includes("enhancement")
  ) {
    return "enhance";
  }

  if (
    value.includes("video") ||
    value.includes("movie")
  ) {
    return "video";
  }

  if (
    value.includes("animated_text") ||
    value.includes("animate_text") ||
    value === "text"
  ) {
    return "text";
  }

  return null;
}

function shouldNavigate(message) {
  const value = String(message || "")
    .toLowerCase()
    .trim();

  const navigationPhrases = [
    "take me",
    "open",
    "go to",
    "show me",
    "bring me",
    "navigate",
    "let's go",
    "lets go",
    "switch to",
    "move to",
    "bring up",
    "load",
  ];

  return navigationPhrases.some((phrase) =>
    value.includes(phrase)
  );
}

function cleanWakeWord(message) {
  return message
    .replace(
      /\b(hey\s+)?r+a+n+a+n+o\b/gi,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function speak(text) {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(text);

  utterance.rate = 0.95;
  utterance.pitch = 1.08;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if (
    typeof window !== "undefined" &&
    "speechSynthesis" in window
  ) {
    window.speechSynthesis.cancel();
  }
}

export default function AIAgent({
  stage,
  feature,
  onNavigate,
}) {
  const [open, setOpen] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hey! I'm RANANO. I'm here whenever you need me. You can ask me about the current tool, call my name, or tell me what you want to create. ✨",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [listening, setListening] = useState(false);
  const [wakeEnabled, setWakeEnabled] = useState(false);

  const recognitionRef = useRef(null);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const historyRef = useRef([]);

  const toolName = getToolName(stage, feature);

  /*
   * ------------------------------------------------------------
   * Scroll chat to latest message
   * ------------------------------------------------------------
   */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  /*
   * ------------------------------------------------------------
   * Stop voice when leaving the studio
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (stage === "landing" || stage === "mascot") {
      stopListening();
      stopSpeaking();
      setOpen(false);
      setWakeEnabled(false);
    }
  }, [stage]);

  /*
   * ------------------------------------------------------------
   * Browser speech recognition
   * ------------------------------------------------------------
   */

  function getSpeechRecognition() {
    if (typeof window === "undefined") {
      return null;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return null;
    }

    return SpeechRecognition;
  }

  function startListening() {
    const SpeechRecognition =
      getSpeechRecognition();

    if (!SpeechRecognition) {
      setMessages((previous) => [
        ...previous,
        {
          id: `system-${Date.now()}`,
          role: "assistant",
          content:
            "Voice input isn't supported by this browser. You can still chat with me by typing. 💬",
        },
      ]);

      setOpen(true);
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore.
      }
    }

    const recognition =
      new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onend = () => {
      setListening(false);

      if (wakeEnabled) {
        setTimeout(() => {
          if (wakeEnabled) {
            try {
              recognition.start();
            } catch {
              // Browser may already be restarting.
            }
          }
        }, 300);
      }
    };

    recognition.onerror = (event) => {
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        setWakeEnabled(false);
        setListening(false);
      }
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i += 1
      ) {
        const result = event.results[i];

        const transcript =
          result[0]?.transcript || "";

        if (result.isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      const combined =
        `${finalText} ${interimText}`
          .replace(/\s+/g, " ")
          .trim();

      if (!combined) {
        return;
      }

      const lower = combined.toLowerCase();

      const wakeDetected =
        /\b(hey\s+)?r+a+n+a+n+o\b/i.test(
          combined
        );

      if (wakeDetected) {
        setOpen(true);

        const cleaned =
          cleanWakeWord(combined);

        if (!cleaned) {
          const response =
            "I'm here! 👋 What can I help you with?";

          setMessages((previous) => [
            ...previous,
            {
              id: `wake-${Date.now()}`,
              role: "assistant",
              content: response,
            },
          ]);

          speak(response);
          return;
        }

        sendMessage(cleaned);
      } else if (
        wakeEnabled &&
        open &&
        finalText.trim()
      ) {
        sendMessage(finalText.trim());
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore.
      }

      recognitionRef.current = null;
    }

    setListening(false);
  }

  function toggleWakeWord() {
    if (wakeEnabled) {
      setWakeEnabled(false);
      stopListening();
      return;
    }

    setWakeEnabled(true);
    setOpen(true);

    setTimeout(() => {
      startListening();
    }, 100);
  }

  /*
   * ------------------------------------------------------------
   * Send message to existing Groq backend
   * ------------------------------------------------------------
   */

  async function sendMessage(rawMessage) {
    const message = rawMessage.trim();

    if (!message || loading) {
      return;
    }

    setOpen(true);
    setInput("");
    setLoading(true);

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    const currentHistory = [
      ...historyRef.current,
      {
        role: "user",
        content: message,
      },
    ];

    historyRef.current = currentHistory;

    try {
      const result = await api.chat(
  message,
  currentHistory.slice(-12),
  toolName
);

      const reply =
        result?.reply ||
        result?.response ||
        "I'm here! Tell me what you'd like to do.";

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: reply,
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);

      historyRef.current = [
        ...currentHistory,
        {
          role: "assistant",
          content: reply,
        },
      ];

      speak(reply);

      /*
       * Only navigate when the user clearly asks
       * RANANO to take them somewhere.
       */
      const intent = normalizeIntent(result?.intent);
      const confidence = Number(result?.confidence || 0);

      if (
        intent &&
        confidence >= 0.70 &&
        shouldNavigate(message) &&
        typeof onNavigate === "function"
      ) {
        setTimeout(() => {
          onNavigate(intent);
        }, 900);
      }
    } catch (error) {
      const errorMessage =
        error?.message ||
        "I couldn't reach my AI core right now. Please try again.";

      setMessages((previous) => [
        ...previous,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: errorMessage,
          error: true,
        },
      ]);

      speak(
        "I couldn't reach my AI core right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    sendMessage(input);
  }

  function handleQuickMessage(message) {
    sendMessage(message);
  }

  function handleClose() {
    setOpen(false);
    stopSpeaking();
  }

  /*
   * ------------------------------------------------------------
   * Don't show agent during onboarding screens
   * ------------------------------------------------------------
   */

  if (
    stage === "landing" ||
    stage === "mascot"
  ) {
    return null;
  }

  const quickMessages =
    QUICK_MESSAGES[feature] ||
    QUICK_MESSAGES.choosing;

  return (
    <>
      {/* --------------------------------------------------------
          Floating Mascot
          -------------------------------------------------------- */}

      {!open && (
        <button
          type="button"
          className={`ranano-agent-fab ${
            listening
              ? "ranano-agent-fab-listening"
              : ""
          }`}
          onClick={() => setOpen(true)}
          aria-label="Open RANANO AI Agent"
        >
          <span className="ranano-agent-ring" />

          <img
            src={mascot}
            alt="RANANO AI Agent"
          />

          <span className="ranano-agent-status">
            {listening ? "LISTENING" : "ASK ME"}
          </span>
        </button>
      )}

      {/* --------------------------------------------------------
          Agent Panel
          -------------------------------------------------------- */}

      {open && (
        <aside
          className={`ranano-agent-panel ${
            listening
              ? "ranano-agent-panel-listening"
              : ""
          }`}
        >
          <header className="ranano-agent-header">
            <div className="ranano-agent-identity">
              <div className="ranano-agent-avatar">
                <img
                  src={mascot}
                  alt=""
                />

                <span />
              </div>

              <div>
                <strong>
                  RANANO
                </strong>

                <small>
                  AI CREATIVE GUIDE
                </small>
              </div>
            </div>

            <div className="ranano-agent-header-actions">
              <button
                type="button"
                className={
                  `ranano-agent-icon ${
                    wakeEnabled
                      ? "active"
                      : ""
                  }`
                }
                onClick={toggleWakeWord}
                aria-label={
                  wakeEnabled
                    ? "Disable voice wake word"
                    : "Enable voice wake word"
                }
                title={
                  wakeEnabled
                    ? "Wake word active"
                    : "Enable wake word"
                }
              >
                {wakeEnabled ? "🎙️" : "🔇"}
              </button>

              <button
                type="button"
                className="ranano-agent-icon"
                onClick={handleClose}
                aria-label="Close RANANO Agent"
              >
                ×
              </button>
            </div>
          </header>

          {/* Current context */}
          <div className="ranano-agent-context">
            <span className="ranano-context-dot" />
            HELPING WITH
            <strong>
              {toolName}
            </strong>
          </div>

          {/* Conversation */}
          <div className="ranano-agent-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`ranano-agent-message ${
                  message.role === "user"
                    ? "user"
                    : "assistant"
                }`}
              >
                {message.role ===
                  "assistant" && (
                  <div className="ranano-message-avatar">
                    <img
                      src={mascot}
                      alt=""
                    />
                  </div>
                )}

                <div className="ranano-message-bubble">
                  {message.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="ranano-agent-message assistant">
                <div className="ranano-message-avatar">
                  <img
                    src={mascot}
                    alt=""
                  />
                </div>

                <div className="ranano-message-bubble ranano-thinking">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div
              ref={messagesEndRef}
            />
          </div>

          {/* Quick actions */}
          {!loading && (
            <div className="ranano-agent-quick">
              {quickMessages
                .slice(0, 3)
                .map((message) => (
                  <button
                    key={message}
                    type="button"
                    onClick={() =>
                      handleQuickMessage(
                        message
                      )
                    }
                  >
                    {message}
                  </button>
                ))}
            </div>
          )}

          {/* Voice status */}
          {wakeEnabled && (
            <div className="ranano-agent-voice-status">
              <span
                className={
                  listening
                    ? "pulse"
                    : ""
                }
              />

              {listening
                ? "Listening for “Hey RANANO”..."
                : "Voice wake-up is enabled"}
            </div>
          )}

          {/* Input */}
          <form
            className="ranano-agent-input"
            onSubmit={handleSubmit}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(event) =>
                setInput(
                  event.target.value
                )
              }
              placeholder={
                listening
                  ? "Say: Hey RANANO..."
                  : "Ask RANANO anything..."
              }
              disabled={loading}
            />

            <button
              type="button"
              className={
                `ranano-agent-mic ${
                  listening
                    ? "active"
                    : ""
                }`
              }
              onClick={toggleWakeWord}
              aria-label={
                listening
                  ? "Stop listening"
                  : "Start voice input"
              }
            >
              🎙
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                !input.trim()
              }
              aria-label="Send message"
            >
              →
            </button>
          </form>
        </aside>
      )}
    </>
  );
}