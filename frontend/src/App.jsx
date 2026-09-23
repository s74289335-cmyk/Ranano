import { useState } from "react";

import LandingPage from "./components/LandingPage.jsx";
import MascotIntro from "./components/MascotIntro.jsx";
import ToolChooser from "./components/ToolChooser.jsx";
import AIAgent from "./components/AIAgent.jsx";

import ImageGeneration from "./components/ImageGeneration.jsx";
import ImageEnhancement from "./components/ImageEnhancement.jsx";
import VideoGeneration from "./components/VideoGeneration.jsx";
import AnimatedText from "./components/AnimatedText.jsx";

export default function App() {
  const [stage, setStage] = useState("landing");
  const [feature, setFeature] = useState(null);

  const [gallery, setGallery] = useState([]);

  /*
   * ============================================================
   * LANDING -> MASCOT INTRO
   * ============================================================
   */

  function handleLogin() {
    setFeature(null);
    setStage("mascot");
  }

  /*
   * ============================================================
   * MASCOT INTRO -> TOOL CHOOSER
   * ============================================================
   */

  function handleEnterStudio() {
    setFeature(null);
    setStage("choosing");
  }

  /*
   * ============================================================
   * TOOL CHOOSER -> TOOL
   * ============================================================
   */

  function handleChooseTool(tool) {
    const validTools = [
      "generate",
      "enhance",
      "video",
      "text",
    ];

    if (!validTools.includes(tool)) {
      return;
    }

    setFeature(tool);
    setStage("feature");
  }

  /*
   * ============================================================
   * TOOL -> TOOL CHOOSER
   * ============================================================
   */

  function handleBackToTools() {
    setFeature(null);
    setStage("choosing");
  }

  /*
   * ============================================================
   * AI AGENT -> TOOL
   * ============================================================
   */

  function handleAgentNavigation(tool) {
    const validTools = [
      "generate",
      "enhance",
      "video",
      "text",
    ];

    if (!validTools.includes(tool)) {
      return;
    }

    setFeature(tool);
    setStage("feature");
  }

  /*
   * ============================================================
   * SHARED IMAGE GALLERY
   * ============================================================
   */

  function addToGallery(image) {
    if (!image) {
      return;
    }

    setGallery((previous) => {
      if (previous.includes(image)) {
        return previous;
      }

      return [
        image,
        ...previous,
      ];
    });
  }

  /*
   * ============================================================
   * PAGE CONTENT
   * ============================================================
   */

  let page = null;

  /*
   * LANDING
   */

  if (stage === "landing") {
    page = (
      <LandingPage
        onLogin={handleLogin}
      />
    );
  }

  /*
   * MASCOT INTRO
   */

  else if (stage === "mascot") {
    page = (
      <MascotIntro
        onDismiss={handleEnterStudio}
      />
    );
  }

  /*
   * TOOL CHOOSER
   */

  else if (stage === "choosing") {
    page = (
      <ToolChooser
        onChoose={handleChooseTool}
      />
    );
  }

  /*
   * IMAGE GENERATION
   */

  else if (
    stage === "feature" &&
    feature === "generate"
  ) {
    page = (
      <ImageGeneration
        gallery={gallery}
        addToGallery={addToGallery}
        onBack={handleBackToTools}
      />
    );
  }

  /*
   * IMAGE ENHANCEMENT
   */

  else if (
    stage === "feature" &&
    feature === "enhance"
  ) {
    page = (
      <ImageEnhancement
        onBack={handleBackToTools}
      />
    );
  }

  /*
   * VIDEO GENERATION
   */

  else if (
    stage === "feature" &&
    feature === "video"
  ) {
    page = (
      <VideoGeneration
        gallery={gallery}
        onBack={handleBackToTools}
      />
    );
  }

  /*
   * ANIMATED TEXT
   */

  else if (
    stage === "feature" &&
    feature === "text"
  ) {
    page = (
      <AnimatedText
        onBack={handleBackToTools}
      />
    );
  }

  /*
   * FALLBACK
   */

  else {
    page = (
      <LandingPage
        onLogin={handleLogin}
      />
    );
  }

  /*
   * ============================================================
   * RENDER
   *
   * The agent is rendered OUTSIDE the individual pages so it
   * remains available across the entire studio.
   * ============================================================
   */

  return (
    <>
      {page}

      <AIAgent
        stage={stage}
        feature={feature}
        onNavigate={handleAgentNavigation}
      />
    </>
  );
}