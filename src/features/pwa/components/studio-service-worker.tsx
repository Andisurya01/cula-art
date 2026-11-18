"use client";

import { useEffect } from "react";
import { SERVICE_WORKER_SCOPE, SERVICE_WORKER_URL } from "../offline-queue";

/** Mendaftarkan service worker Studio (hanya dipasang di layout Studio; Galeri tidak pernah). */
export function StudioServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register(SERVICE_WORKER_URL, { scope: SERVICE_WORKER_SCOPE, updateViaCache: "none" })
      .catch((error: unknown) => console.warn("[pwa] service worker gagal didaftarkan:", error));
  }, []);
  return null;
}
