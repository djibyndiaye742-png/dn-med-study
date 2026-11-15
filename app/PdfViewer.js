"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function PdfViewer({ url, onClose }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState(false);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 overflow-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-slate-900 p-3 text-white">
        <button onClick={onClose}>✕ Fermer</button>

        <span>
          {numPages > 0
            ? `Page ${pageNumber} / ${numPages}`
            : "Chargement du PDF..."}
        </span>

        <div className="flex gap-3">
          <button
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber(p => p - 1)}
          >
            ◀
          </button>

          <button
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber(p => p + 1)}
          >
            ▶
          </button>
        </div>
      </div>

      <div className="flex justify-center p-3">
        {error ? (
          <p className="text-white">
            Impossible d'afficher ce PDF.
          </p>
        ) : (
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => {
              setNumPages(numPages);
              setPageNumber(1);
            }}
            onLoadError={() => setError(true)}
            loading={<p className="text-white">Chargement...</p>}
          >
            <Page
              pageNumber={pageNumber}
              width={Math.min(
                typeof window !== "undefined"
                  ? window.innerWidth - 24
                  : 700,
                850
              )}
            />
          </Document>
        )}
      </div>
    </div>
  );
              }
