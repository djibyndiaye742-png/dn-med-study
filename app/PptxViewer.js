"use client";

import { useEffect } from "react";
import { ReactPptxViewer } from "@extend-ai/react-pptx";
import "@extend-ai/react-pptx/styles.css";

export default function PptxViewer({ url, onClose }) {

  // Bloquer le défilement de la page des cours
  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    const oldTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = oldOverflow;
      document.body.style.touchAction = oldTouchAction;
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
          height: "56px",
          minHeight: "56px",
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
            borderRadius: "8px",
            padding: "10px 16px",
            fontWeight: "bold",
          }}
        >
          ← Retour
        </button>

        <strong>DN MED STUDY</strong>

        <div style={{ width: "75px" }} />
      </header>

      {/* Lecteur PowerPoint */}
      <div
        className="dn-pptx-stage"
        style={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          touchAction: "pan-y",
          background: "#1f1f1f",
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

      <style jsx global>{`
        .dn-pptx-stage {
          scrollbar-width: thin;
        }

        .dn-pptx-stage * {
          overscroll-behavior: contain;
        }
      `}</style>
    </div>
  );
          }
