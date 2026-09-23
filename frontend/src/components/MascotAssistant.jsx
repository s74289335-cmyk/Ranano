import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import mascot from "../assets/mascot.png";
import { speakCute } from "../voice.js";

// Phonetic variants people/browsers commonly produce for "RANANO" - speech
// recognizers often mis-hear invented brand names, so we match a wide net
// of close variants rather than only the exact spelling. "ryan no" was
// confirmed as a real, repeated mishearing from actual usage logs.
const WAKE_PATTERNS = [
  "ranano", "ra nano", "rah nano", "run ano", "renano", "ra nono", "banano",
  "ryan no", "ryan know", "ryano", "ryan oh", "rey ano", "rey no", "rana", "ri ano",
];

const INTENT_TAB = {
  generate_image: "generate",
  caption_photo: "generate",
  make_video: "video",
};

function containsWakeWord(text) {
  // Strip punctuation before matching - final speech results often add
  // periods/commas mid-phrase (e.g. "Ryan. No.") that would otherwise
  // break a plain substring match against "ryan no".
  const cleaned = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "");
  return WAKE_PATTERNS.some((p) => cleaned.includes(p));
}

function playWakeChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.15, now + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.2);
    });
  } catch {
    /* Web Audio unsupported - skip chime, not critical */
  }
}

const STATUS_TEXT = {
  disabled: "🎤 Click me to enable voice control!",
  "listening-for-wake": 'Say "RANANO" to talk to me 👂',
  awake: "Yes? I'm listening! 🎉",
  "listening-command": "🔴 Go on, I'm listening...",
  thinking: "Hmm, let me think... 🤔",
  speaking: "💬 talking...",
  unsupported: "Voice needs Chrome or Edge 😔",
};

// Playful, contextual one-liners the mascot pops up when you switch pages -
// pure visual/text reaction, no voice needed, so it works instantly without
// requiring mic permission. Only shown when the mascot isn't already mid
// wake-word conversation, so it never interrupts an active voice exchange.
const TAB_COMMENTS = {
  generate: "Ooh, let's paint something! 🎨",
  enhance: "Time to make things sparkle ✨",
  video: "Lights, camera, fruit! 🎬",
  text: "Let's make some words dance 🔤",
  history: "Let's see what we've made so far 🖼️",
  insights: "Ooh, nerd stuff - I love this part 📊",
};

export default function MascotAssistant({ onNavigate, activeTab }) {
  const [status, setStatus] = useState("disabled");
  const [subtitle, setSubtitle] = useState(null);
  const [liveHeard, setLiveHeard] = useState("");
  const [reacting, setReacting] = useState(false);
  const wakeRecognitionRef = useRef(null);
  const commandRecognitionRef = useRef(null);
  const statusRef = useRef(status);
  const lastActivityRef = useRef(Date.now());
  const watchdogRef = useRef(null);
  // Real multi-turn conversation memory - lets Groq actually build on
  // what was said earlier in the session, instead of every command being
  // a fresh, context-free classification like before.
  const conversationHistoryRef = useRef([]);
  const missedAttemptsRef = useRef(0);
  const nudgeTimeoutRef = useRef(null);
  statusRef.current = status;

  const SpeechRecognition =
    typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const startWakeListening = useCallback(() => {
    if (!SpeechRecognition) {
      setStatus("unsupported");
      return;
    }
    try {
      wakeRecognitionRef.current?.stop();
    } catch {
      /* ignore */
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      lastActivityRef.current = Date.now();
    };

    recognition.onresult = (event) => {
      lastActivityRef.current = Date.now();
      let transcript = "";
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) isFinal = true;
      }
      setLiveHeard(transcript);
      console.log("[mascot] heard:", transcript);
      if (containsWakeWord(transcript)) {
        try {
          recognition.stop();
        } catch {
          /* ignore */
        }
        handleWake();
      } else if (isFinal && transcript.trim()) {
        // Heard real speech, but no wake word in it - nudge after a few
        // misses, since this is the #1 point of confusion (people expect
        // any speech to work, not just speech containing "RANANO").
        missedAttemptsRef.current += 1;
        if (missedAttemptsRef.current >= 3) {
          setSubtitle('Say my name first: "RANANO" - then I\'ll listen! 👋');
          missedAttemptsRef.current = 0;
          clearTimeout(nudgeTimeoutRef.current);
          nudgeTimeoutRef.current = setTimeout(() => setSubtitle(null), 4000);
        }
      }
    };

    recognition.onend = () => {
      if (statusRef.current === "listening-for-wake") {
        try {
          recognition.start();
          lastActivityRef.current = Date.now();
        } catch {
          /* a start() call may already be pending - ignore */
        }
      }
    };

    recognition.onerror = (event) => {
      console.log("[mascot] recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setStatus("disabled");
        setSubtitle("Mic permission was blocked - click me to try again 🙏");
      } else if (event.error === "network") {
        setSubtitle(
          "Can't reach Google's speech service - if you're on Brave, lower Shields for this site, or try Chrome/Edge instead."
        );
      }
      // "no-speech" and other transient errors are expected during
      // continuous listening - the onend handler above restarts silently.
    };

    wakeRecognitionRef.current = recognition;
    setStatus("listening-for-wake");
    setSubtitle(null);
    setLiveHeard("");
    try {
      recognition.start();
      lastActivityRef.current = Date.now();
    } catch {
      /* already running */
    }
  }, [SpeechRecognition]);

  // Watchdog: Chrome occasionally stops continuous recognition silently
  // without firing onend. If we haven't seen activity in a while while
  // we're supposed to be listening, force a hard restart - this is what
  // makes wake-word detection reliable instead of "usually works."
  useEffect(() => {
    watchdogRef.current = setInterval(() => {
      if (
        statusRef.current === "listening-for-wake" &&
        Date.now() - lastActivityRef.current > 8000
      ) {
        console.log("[mascot] watchdog: recognition looked stale, restarting");
        startWakeListening();
      }
    }, 4000);
    return () => clearInterval(watchdogRef.current);
  }, [startWakeListening]);

  function handleWake() {
    setStatus("awake");
    setLiveHeard("");
    playWakeChime();
    speakCute("Yes? I'm listening!", () => {
      startCommandListening();
    });
  }

  function startCommandListening() {
    if (!SpeechRecognition) return;
    setStatus("listening-command");
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = async (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setLiveHeard(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        setSubtitle(`"${transcript}"`);
        await handleCommand(transcript);
      }
    };

    recognition.onerror = () => {
      setSubtitle("Didn't catch that - say RANANO again whenever you're ready.");
      startWakeListening();
    };

    recognition.onend = () => {
      if (statusRef.current === "listening-command") {
        startWakeListening();
      }
    };

    commandRecognitionRef.current = recognition;
    recognition.start();
  }

  async function handleCommand(text) {
    setStatus("thinking");
    try {
      const res = await api.chat(text, conversationHistoryRef.current);
      // Keep a rolling conversation history so replies can actually build
      // on earlier turns, instead of every command starting from zero.
      conversationHistoryRef.current = [
        ...conversationHistoryRef.current,
        { role: "user", content: text },
        { role: "assistant", content: res.reply },
      ].slice(-12); // cap length so it doesn't grow unbounded over a long session

      setStatus("speaking");
      setSubtitle(res.reply);
      speakCute(res.reply, () => {
        const tab = INTENT_TAB[res.intent];
        if (tab && onNavigate) onNavigate(tab);
        startWakeListening();
      });
    } catch {
      setStatus("speaking");
      const fallback = "Sorry, I couldn't reach my brain just now. Try again in a moment!";
      setSubtitle(fallback);
      speakCute(fallback, () => startWakeListening());
    }
  }

  function handleMascotClick() {
    if (status === "disabled" || status === "unsupported") {
      startWakeListening();
    }
  }

  useEffect(() => {
    return () => {
      wakeRecognitionRef.current?.stop();
      commandRecognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
      clearInterval(watchdogRef.current);
    };
  }, []);

  // React live to page changes with a short, cute comment - purely visual,
  // no voice/mic needed, so it works immediately. Skips the very first
  // render (no comment when the app just loaded) and never interrupts an
  // active wake-word conversation.
  const isFirstRender = useRef(true);
  const commentTimeoutRef = useRef(null);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const comment = TAB_COMMENTS[activeTab];
    const canInterrupt = statusRef.current === "disabled" || statusRef.current === "listening-for-wake";
    if (comment && canInterrupt) {
      setSubtitle(comment);
      setReacting(true);
      clearTimeout(commentTimeoutRef.current);
      commentTimeoutRef.current = setTimeout(() => {
        setSubtitle(null);
        setReacting(false);
      }, 3500);
    }
    return () => clearTimeout(commentTimeoutRef.current);
  }, [activeTab]);

  const isActive =
    status === "awake" || status === "listening-command" || status === "thinking" || status === "speaking";
  const isWakeListening = status === "listening-for-wake";

  return (
    <div className="mascot-widget">
      {liveHeard && (status === "listening-command" || status === "listening-for-wake") && (
        <div className="mascot-live-transcript">"{liveHeard}"</div>
      )}
      {(subtitle || STATUS_TEXT[status]) && (
        <div className={"mascot-subtitle" + (status === "disabled" ? " mascot-subtitle-cta" : "")}>
          {subtitle || STATUS_TEXT[status]}
        </div>
      )}
      {status === "listening-command" && (
        <div className="mascot-waveform">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
      )}
      <button
        className={
          "mascot-button" +
          (isActive ? " mascot-active" : "") +
          (isWakeListening ? " mascot-idle-pulse" : "") +
          (status === "disabled" ? " mascot-cta-pulse" : "") +
          (reacting ? " mascot-react-bounce" : "")
        }
        onClick={handleMascotClick}
        title="RANANO - say my name any time"
      >
        <img src={mascot} alt="RANANO mascot - click or say RANANO to talk" />
      </button>
    </div>
  );
}