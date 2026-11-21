"use client";

import "./polyfills";
import React, { useState } from "react";
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
        <div className="fixed inset-0 z-[99999] bg-white p-5 text-slate-900">
          <button onClick={this.props.onClose} className="mb-4 text-2xl">
            ← Retour
          </button>
          <h2 className="font-bold text-red-600">Erreur du lecteur PDF</h2>
          <pre className="mt-3 whitespace-pre-wrap text-sm">
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

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700"
        >
          ← Fermer
        </button>

        <strong className="text-sm">DN MED STUDY</strong>

        <span className="text-xs text-slate-500">
          {numPages > 0 ? `${numPages} pages` : "PDF"}
        </span>
      </header>

      <div className="flex flex-col items-center gap-4 p-2 sm:p-4">
        <Document
          file={url}
          suspense={false}
          onLoadSuccess={({ numPages: total }) => setNumPages(total)}
          onLoadError={(error) => console.error("Erreur PDF :", error)}
          loading={<p className="p-6 text-sm">Chargement du cours...</p>}
          error={<p className="p-6 text-sm text-red-600">Impossible d'ouvrir ce PDF.</p>}
        >
          {Array.from(new Array(numPages), (_, index) => (
            <div
              key={`page_${index + 1}`}
              className="mb-4 bg-white shadow-md"
            >
              <Page
                pageNumber={index + 1}
                width={Math.min(window.innerWidth - 20, 850)}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </div>
          ))}
        </Document>
      </div>
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
