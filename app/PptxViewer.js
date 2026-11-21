"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ReactPptxViewer } from "@extend-ai/react-pptx";
import "@extend-ai/react-pptx/styles.css";

export default function PptxViewer({ url, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [scrollElement, setScrollElement] = useState(null);

  useEffect(() => {
    setMounted(true);

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, []);

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      window.history.back();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100dvh",
        zIndex: 2147483647,
        background: "#111827",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          height: 56,
          minHeight: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 15px",
          background: "#020817",
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
            defaultZoom="automatic"
            showThumbnails={false}
            showToolbar={false}
            virtualization={{
              enabled: true,
              overscanViewport: 2,
              scrollElement,
            }}
          />
        )}
      </div>
    </div>,
    document.body
  );
}
