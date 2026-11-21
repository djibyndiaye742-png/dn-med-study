"use client";

import { useEffect, useState } from "react";
import { ReactPptxViewer } from "@extend-ai/react-pptx";
import "@extend-ai/react-pptx/styles.css";

export default function PptxViewer({ url, onClose }) {
  const [scrollElement, setScrollElement] = useState(null);

  // Bloquer le défilement de la page située derrière
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      window.history.back();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100vh",
        height: "100dvh",
        zIndex: 999999,
        background: "#111827",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Barre supérieure */}
      <header
        style={{
          height: 56,
          minHeight: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 15px",
          background: "#10243A",
          color: "white",
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          style={{
            background: "#2563EB",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            fontWeight: "bold",
          }}
        >
          ← Retour
        </button>

        <strong>DN MED STUDY</strong>

        <div style={{ width: 75 }} />
      </header>

      {/* Zone de défilement des diapositives */}
      <div
        ref={setScrollElement}
        style={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          touchAction: "pan-y",
          background: "#111827",
        }}
      >
        {scrollElement && (
          <ReactPptxViewer
            source={url}
            mode="continuous"
            defaultZoom="fit-width"
            showThumbnails={false}
            showToolbar
            virtualization={{
              enabled: true,
              overscanViewport: 2,
              scrollElement,
            }}
          />
        )}
      </div>
    </div>
  );
}
