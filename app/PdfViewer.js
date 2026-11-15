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
    console.error("ERREUR LECTEUR PDF :", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-[9999] bg-white p-5 overflow-auto">
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
  const [error, setError] = useState("");

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-100 overflow-auto">
      <div className="sticky top-0 z-50 flex justify-between items-center bg-slate-900 text-white p-4">
        <button onClick={onClose}>✕ Fermer</button>
        <strong>DN MED STUDY</strong>
        <span>{numPages ? `${numPages} pages` : ""}</span>
      </div>

      <div className="flex flex-col items-center p-2">
        {error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <Document
            file={url}
            suspense={false}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={(err) => setError(String(err))}
            loading={<p>Chargement de la leçon...</p>}
          >
            {Array.from({ length: numPages }, (_, index) => (
              <Page
                key={index + 1}
                pageNumber={index + 1}
                width={Math.min(window.innerWidth - 20, 850)}
              />
            ))}
          </Document>
        )}
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
