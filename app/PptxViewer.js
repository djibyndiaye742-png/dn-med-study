"use client";

import { useEffect, useRef } from "react";
import { ReactPptxViewer } from "@extend-ai/react-pptx";
import "@extend-ai/react-pptx/styles.css";

export default function PptxViewer({ url, onClose }) {
  const viewerRef = useRef(null);

  useEffect(() => {
    return () => {
      try {
        screen.orientation?.unlock?.();
      } catch {}
    };
  }, []);

  async function enterFullscreen() {
    try {
      if (!document.fullscreenElement && viewerRef.current) {
        await viewerRef.current.requestFullscreen();
      }

      try {
        await screen.orientation?.lock?.("landscape");
      } catch (error) {
        console.warn("Rotation non autorisée.", error);
      }
    } catch (error) {
      console.warn("Plein écran indisponible.", error);
    }
  }

  async function goBack() {
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

    if (onClose) {
      onClose();
    } else {
      window.history.back();
    }
  }

  return (
    <div
      ref={viewerRef}
      onClick={enterFullscreen}
      className="fixed inset-0 z-[99999] overflow-hidden bg-black"
      style={{
        width: "100%",
        height: "100dvh",
      }}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          goBack();
        }}
        aria-label="Retour"
        className="absolute left-3 top-3 z-[100000] flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-2xl text-white"
      >
        ←
      </button>

      <div className="h-full w-full overflow-hidden">
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
