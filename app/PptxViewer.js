"use client";

import { useEffect, useRef, useState } from "react";
import { ReactPptxViewer } from "@extend-ai/react-pptx";
import "@extend-ai/react-pptx/styles.css";

export default function PptxViewer({ url, onClose }) {
  const viewerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", updateFullscreen);

    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreen);

      try {
        screen.orientation?.unlock?.();
      } catch {}
    };
  }, []);

  async function enterPresentation() {
    try {
      if (!document.fullscreenElement && viewerRef.current) {
        await viewerRef.current.requestFullscreen();
      }

      try {
        await screen.orientation?.lock?.("landscape");
      } catch (error) {
        console.warn("Rotation non autorisée par le navigateur.", error);
      }
    } catch (error) {
      console.warn("Plein écran indisponible.", error);
    }
  }

  async function exitPresentation() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn(error);
    }

    try {
      screen.orientation?.unlock?.();
    } catch {}
  }

  async function goBack() {
    await exitPresentation();
    onClose?.();
  }

  return (
    <div
      ref={viewerRef}
      className="fixed inset-0 z-[99999] overflow-hidden bg-black"
      style={{
        width: "100%",
        height: "100dvh",
      }}
    >
      <button
        type="button"
        onClick={goBack}
        aria-label="Retour"
        className="absolute left-3 top-3 z-[100000] flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-2xl text-white"
      >
        ←
      </button>

      <button
        type="button"
        onClick={isFullscreen ? exitPresentation : enterPresentation}
        aria-label="Mode présentation"
        title="Mode présentation"
        className="absolute right-3 top-3 z-[100000] flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-xl text-white"
      >
        ⛶
      </button>

      <div
        className="h-full w-full overflow-auto"
        style={{
          paddingTop: "52px",
          boxSizing: "border-box",
        }}
      >
        <ReactPptxViewer
          source={url}
          mode="slide"
          defaultZoom="fit-page"
          showThumbnails={false}
          showToolbar={false}
        />
      </div>
    </div>
  );
          }
