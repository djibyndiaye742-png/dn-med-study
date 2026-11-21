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
    console.error("ERREUR LECTEUR PDF :", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-[99999] bg-white p-5 overflow-auto">
          <h2 className="text-red-600 text-xl font-bold">
            Erreur du lecteur PDF
          </h2>

          <pre className="mt-4 whitespace-pre-wrap text-sm">
            {String(this.state.error)}
          </pre>

          <button
            onClick={this.props.onClose}
            className="mt-5 bg-blue-600 text-white p-3 rounded"
          >
            Fermer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function PdfViewerContent({ url, onClose }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState("");
  const [pageDimensions, setPageDimensions] = useState(null);
  const [containerSize, setContainerSize] = useState({
    width: 0,
    height: 0
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef(null);
  const stageRef = useRef(null);

  // Mesure de l'espace disponible
  useEffect(() => {
    if (!containerRef.current) return;

    const element = containerRef.current;

    const updateSize = () => {
      setContainerSize({
        width: element.clientWidth,
        height: element.clientHeight
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  // Détecter le plein écran
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  // Récupérer les dimensions de la première page
  async function handleDocumentLoad(pdf) {
    setNumPages(pdf.numPages);
    setPageNumber(1);

    try {
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });

      setPageDimensions({
        width: viewport.width,
        height: viewport.height
      });
    } catch (err) {
      console.error(err);
      setError("Impossible de lire les dimensions du document.");
    }
  }

  // Adapter la diapositive à l'écran
  const pageWidth = (() => {
    if (!pageDimensions || !containerSize.width || !containerSize.height) {
      return 0;
    }

    const availableWidth = Math.max(100, containerSize.width - 24);
    const availableHeight = Math.max(100, containerSize.height - 24);

    const widthRatio = availableWidth / pageDimensions.width;
    const heightRatio = availableHeight / pageDimensions.height;

    return Math.floor(
      Math.min(widthRatio, heightRatio) * pageDimensions.width
    );
  })();

  // Navigation
  const previousPage = useCallback(() => {
    setPageNumber(current => Math.max(1, current - 1));
  }, []);

  const nextPage = useCallback(() => {
    setPageNumber(current => Math.min(numPages, current + 1));
  }, [numPages]);

  // Plein écran et rotation paysage
  async function enterPresentationMode() {
    try {
      if (stageRef.current && !document.fullscreenElement) {
        await stageRef.current.requestFullscreen();
      }

      if (screen.orientation?.lock) {
        try {
          await screen.orientation.lock("landscape");
        } catch (orientationError) {
          console.warn(
            "Rotation automatique non autorisée par le navigateur.",
            orientationError
          );
        }
      }
    } catch (err) {
      console.error("Mode présentation :", err);
    }
  }

  async function exitPresentationMode() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error(err);
    }

    try {
      screen.orientation?.unlock?.();
    } catch (err) {
      console.warn(err);
    }
  }

  // Clavier : flèches et Échap
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "ArrowRight") {
        nextPage();
      }

      if (event.key === "ArrowLeft") {
        previousPage();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [nextPage, previousPage]);

  // Nettoyage à la fermeture
  useEffect(() => {
    return () => {
      try {
        screen.orientation?.unlock?.();
      } catch (err) {
        console.warn(err);
      }
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className="fixed inset-0 z-[99999] bg-[#101827] text-white flex flex-col"
      style={{
        width: "100%",
        height: "100dvh",
        overflow: "hidden"
      }}
    >
      {/* BARRE DE COMMANDE */}
      <header className="flex items-center justify-between gap-3 px-3 py-3 bg-slate-950 shrink-0">
        <button
          onClick={onClose}
          className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm font-semibold"
        >
          ✕ Fermer
        </button>

        <strong className="text-sm tracking-wide">
          DN MED STUDY
        </strong>

        <button
          onClick={enterPresentationMode}
          className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm font-semibold"
        >
          ⛶ Présentation
        </button>
      </header>

      {/* ZONE DE DIAPOSITIVE */}
      <main
        ref={containerRef}
        className="flex-1 min-h-0 flex items-center justify-center p-2 overflow-hidden"
      >
        {error ? (
          <p className="text-red-400 text-center">{error}</p>
        ) : (
          <Document
            file={url}
            onLoadSuccess={handleDocumentLoad}
            onLoadError={(err) => setError(String(err))}
            loading={
              <p className="text-center text-white">
                Chargement du cours...
              </p>
            }
          >
            {pageWidth > 0 && (
              <Page
                pageNumber={pageNumber}
                width={pageWidth}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={
                  <p className="text-white">
                    Chargement de la diapositive...
                  </p>
                }
              />
            )}
          </Document>
        )}
      </main>

      {/* COMMANDES DE NAVIGATION */}
      <footer className="flex items-center justify-center gap-5 px-3 py-3 bg-slate-950 shrink-0">
        <button
          onClick={previousPage}
          disabled={pageNumber <= 1}
          className="bg-slate-700 disabled:opacity-30 px-5 py-3 rounded-lg font-semibold"
        >
          ← Précédent
        </button>

        <span className="text-sm font-semibold whitespace-nowrap">
          {numPages ? `${pageNumber} / ${numPages}` : "Chargement"}
        </span>

        <button
          onClick={nextPage}
          disabled={pageNumber >= numPages}
          className="bg-blue-600 disabled:opacity-30 px-5 py-3 rounded-lg font-semibold"
        >
          Suivant →
        </button>
      </footer>
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
