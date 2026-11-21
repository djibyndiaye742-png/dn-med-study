"use client";

import { ReactPptxViewer } from "@extend-ai/react-pptx";
import "@extend-ai/react-pptx/styles.css";

export default function PptxViewer({ url }) {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "70vh",
      }}
    >
      <ReactPptxViewer
        source={url}
        mode="continuous"
        defaultZoom="fit-width"
        showThumbnails
        showToolbar
      />
    </div>
  );
}
