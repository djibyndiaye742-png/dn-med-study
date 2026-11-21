"use client";

import "./polyfills";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

class PdfErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("ERREUR PDF :", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-[99999] bg-black p-5 text-white">
          <button onClick={this.props.onClose} className="text-2xl">
            ←
          </button>
          <h2 className="mt-5 font-bold text-red-400">
            Erreur du lecteur PDF
          </h2>
          <pre className="mt-4 whitespace-pre-wrap text-sm">
            {String(this.state.error)}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

function PdfViewerContent({ url, onClose }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageDimensions, setPageDimensions] = useState(null);
  const [containerSize, setContainerSize] = useState({
    width: 0,
    height: 0,
  });
  const [error, setError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const viewerRef = useRef(null);
  const containerRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    const updateFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", updateFullscreen);
    return () =>
      document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      setContainerSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    window.addEventListener("resize", updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  async function enterPresentation() {
    try {
      if (!document.fullscreenElement && viewerRef.current) {
        await viewerRef.current.requestFullscreen();
      }

      try {
        await screen.orientation?.lock?.("landscape");
      } catch (orientationError) {
        console.warn("Rotation non autorisée par le navigateur.", orientationError);
      }
    } catch (fullscreenError) {
      console.warn("Plein écran indisponible.", fullscreenError);
    }
  }

  async function exitPresentation() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (fullscreenError) {
      console.warn(fullscreenError);
    }

    try {
      screen.orientation?.unlock?.();
    } catch {}
  }

  async function handleDocumentLoad(pdf) {
    setNumPages(pdf.numPages);
    setPageNumber(1);
    setError("");

    try {
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });

      setPageDimensions({
        width: viewport.width,
        height: viewport.height,
      });
    } catch (err) {
      console.error(err);
      setError("Impossible de lire les dimensions du document.");
    }
  }

  const pageWidth = (() => {
    if (!pageDimensions || !containerSize.width || !containerSize.height) {
      return 0;
    }

    const widthRatio = containerSize.width / pageDimensions.width;
    const heightRatio = containerSize.height / pageDimensions.height;

    return Math.floor(
      Math.min(widthRatio, heightRatio) * pageDimensions.width
    );
  })();

  const previousPage = useCallback(() => {
    setPageNumber(current => Math.max(1, current - 1));
  }, []);

  const nextPage = useCallback(() => {
    setPageNumber(current => Math.min(numPages, current + 1));
  }, [numPages]);

  function handleTouchStart(event) {
    touchStartX.current = event.changedTouches[0].clientX;
    touchStartY.current = event.changedTouches[0].clientY;
  }

  function handleTouchEnd(event) {
    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    const deltaY = event.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) nextPage();
      else previousPage();
    }
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "ArrowRight") nextPage();
      if (event.key === "ArrowLeft") previousPage();
      if (event.key === "Escape" && !document.fullscreenElement) {
        onClose?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, previousPage, onClose]);

  useEffect(() => {
    return () => {
      try {
        screen.orientation?.unlock?.();
      } catch {}
    };
  }, []);

  return (
    <div
      ref={viewerRef}
      className="fixed inset-0 z-[99999] overflow-hidden bg-black text-white"
      style={{ width: "100%", height: "100dvh" }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Retour"
        className="absolute left-3 top-3 z-[100000] flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-2xl"
      >
        ←
      </button>

      <button
        type="button"
        onClick={isFullscreen ? exitPresentation : enterPresentation}
        aria-label="Mode présentation"
        title="Mode présentation"
        className="absolute right-3 top-3 z-[100000] flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-xl"
      >
        ⛶
      </button>

      <main
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex h-full w-full items-center justify-center overflow-hidden"
        style={{ touchAction: "pan-y" }}
      >
        {error ? (
          <p className="p-5 text-center text-red-400">{error}</p>
        ) : (
          <Document
            key={url}
            file={url}
            onLoadSuccess={handleDocumentLoad}
            onLoadError={err => setError(String(err))}
            loading={<p>Chargement du cours...</p>}
          >
            {pageWidth > 0 && (
              <Page
                pageNumber={pageNumber}
                width={pageWidth}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={<p>Chargement de la page...</p>}
              />
            )}
          </Document>
        )}
      </main>
    </div>
  );
}

export default function PdfViewer(props) {
  return (
    <PdfErrorBoundary onClose={props.onClose}>
      <PdfViewerContent {...props} />
    </PdfErrorBoundary>
  );
}
