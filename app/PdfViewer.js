"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfViewer({ url, onClose }) {
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState(false);

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-100 overflow-auto">

      <div className="sticky top-0 z-50 flex justify-between items-center bg-slate-900 text-white p-4">
        <button onClick={onClose}>✕ Fermer</button>
        <strong>DN MED STUDY</strong>
        <span>{numPages ? `${numPages} pages` : ""}</span>
      </div>

      <div className="flex flex-col items-center p-2">
        {error ? (
          <p>Impossible d'afficher ce PDF.</p>
        ) : (
          <Document
  file={url}
  suspense={false}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={() => setError(true)}
            loading={<p>Chargement de la leçon...</p>}
          >
            {Array.from(new Array(numPages), (_, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                width={Math.min(
                  typeof window !== "undefined"
                    ? window.innerWidth - 20
                    : 700,
                  850
                )}
              />
            ))}
          </Document>
        )}
      </div>
    </div>
  );
}
