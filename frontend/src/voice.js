/** Shared cute-voice settings used EVERYWHERE the mascot speaks - the
 * intro greeting, the floating assistant widget, anywhere else in the
 * future. Keeping this in one place is what guarantees the voice
 * actually sounds identical across the whole platform, rather than two
 * separate components each picking slightly different pitch/rate. */

const PITCH = 1.45;
const RATE = 1.03;

export function pickCuteVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  return (
    voices.find((v) => /female|child|samantha|zira|google uk english female/i.test(v.name)) ||
    voices[0] ||
    null
  );
}

/** Speaks `text` aloud using the shared RANANO voice. Calls onDone()
 * when finished (or immediately if speech synthesis isn't supported). */
export function speakCute(text, onDone) {
  if (!window.speechSynthesis) {
    onDone?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voice = pickCuteVoice();
  if (voice) utter.voice = voice;
  utter.pitch = PITCH;
  utter.rate = RATE;
  utter.onend = () => onDone?.();
  utter.onerror = () => onDone?.();
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
}