"use client";

import { ReactPptxViewer } from "@extend-ai/react-pptx";
import "@extend-ai/react-pptx/styles.css";

export default function PptxViewer({ url, onClose }) {
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
        zIndex: 99999,
        background: "#111827",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          height: "56px",
          minHeight: "56px",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          background: "#10243A",
          color: "white",
        }}
      >
        <button
          onClick={handleBack}
          style={{
            background: "#2563EB",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "9px 16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          ← Retour
        </button>

        <strong style={{ marginLeft: "auto", marginRight: "auto" }}>
          DN MED STUDY
        </strong>

        <div style={{ width: "75px" }} />
      </header>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <ReactPptxViewer
          source={url}
          mode="continuous"
          defaultZoom="fit-width"
          showThumbnails={false}
          showToolbar
        />
      </div>
    </div>
  );
}
