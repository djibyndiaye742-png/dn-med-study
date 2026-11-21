"use client";


import { useEffect, useRef, useState } from "react";
import { ReactPptxViewer } from "@extend-ai/react-pptx";
import "@extend-ai/react-pptx/styles.css";


export default function PptxViewer({ url }) {
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
if (viewerRef.current && !document.fullscreenElement) {
await viewerRef.current.requestFullscreen();
}


  if (screen.orientation?.lock) {
    try {
      await screen.orientation.lock("landscape");
    } catch (error) {
      console.warn("Rotation non autorisée par le navigateur.", error);
    }
  }
} catch (error) {
  console.error("Impossible d'activer le plein écran :", error);
}



}


async function exitPresentation() {
try {
if (document.fullscreenElement) {
await document.exitFullscreen();
}


  screen.orientation?.unlock?.();
} catch (error) {
  console.error(error);
}



}


return (
<div
ref={viewerRef}
className="bg-slate-950 text-white flex flex-col"
style={{
width: "100%",
height: isFullscreen ? "100dvh" : "80vh",
minHeight: isFullscreen ? "100dvh" : "500px",
overflow: "hidden"
}}
>


DN MED STUDY



    {isFullscreen ? (
      <button
        onClick={exitPresentation}
        className="bg-red-600 px-4 py-2 rounded-lg text-sm font-semibold"
      >
        ✕ Quitter
      </button>
    ) : (
      <button
        onClick={enterPresentation}
        className="bg-blue-600 px-4 py-2 rounded-lg text-sm font-semibold"
      >
        ⛶ Présentation plein écran
      </button>
    )}
  </div>

  <div
    className="flex-1 min-h-0"
    style={{
      width: "100%",
      height: "100%",
      overflow: "hidden"
    }}
  >
    <ReactPptxViewer
      source={url}
      mode="continuous"
      defaultZoom="fit-width"
      showThumbnails={!isFullscreen}
      showToolbar
    />
  </div>
</div>



);
}
