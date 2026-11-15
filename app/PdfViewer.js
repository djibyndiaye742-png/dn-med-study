"use client";

import { useState } from "react";

export default function PdfViewer({ url, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col">

      <div className="flex items-center justify-between bg-slate-900 p-4 text-white">
        <button onClick={onClose}>
          ✕ Fermer
        </button>

        <strong>DN MED STUDY</strong>

        <a
          href={url}
          download
          className="text-sm"
        >
          Télécharger
        </a>
      </div>

      {loading && !error && (
        <p className="p-4 text-center">
          Chargement du PDF...
        </p>
      )}

      {error ? (
        <div className="p-6 text-center">
          Impossible d'afficher ce PDF.
          <br />
          Utilise le bouton Télécharger.
        </div>
      ) : (
        <iframe
          src={url}
          title="Lecteur PDF DN Med Study"
          className="flex-1 w-full border-0"
          onLoad={() => setLoading(false)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}
