"use client";

import { useEffect } from "react";

export default function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((error) => {
          console.error("Erreur Service Worker :", error);
        });
    }
  }, []);

  return null;
}
