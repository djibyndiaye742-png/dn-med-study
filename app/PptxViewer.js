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
        top: 0,
        left: 0,
        width: "100%",
        height: "100vh",
        height: "100dvh",
        zIndex: 99999,
        background: "#111827",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          height: "56px",
          minHeight: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
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
            borderRadius: "8px",
            padding: "9px 16px",
            fontWeight: "bold",
          }}
        >
          ← Retour
        </button>

        <strong>DN MED STUDY</strong>

        <div style={{ width: "75px" }} />
      </header>

      <div
        className="dn-pptx-stage"
        style={{
          flex: 1,
          width: "100%",
          height: "calc(100dvh - 56px)",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <ReactPptxViewer
          source={url}
          mode="slide"
          defaultZoom="fit-page"
          showThumbnails={false}
          showToolbar
        />
      </div>

      <style jsx global>{`
        .dn-pptx-stage > div {
          height: 100% !important;
          min-height: 0 !important;
          width: 100% !important;
        }
      `}</style>
    </div>
  );
}
