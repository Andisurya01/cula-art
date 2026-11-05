"use client";

import { createContext, useContext, useState } from "react";
import { createContentDraftRegistry, type ContentDraftRegistry } from "../content-draft";

const ContentDraftContext = createContext<ContentDraftRegistry | null>(null);

/**
 * Dipasang di halaman detail konten di sekitar form detail konten dan versi platform, supaya
 * Caption & hashtag memakai isi detail konten saat ini (lihat `content-draft.ts`).
 */
export function ContentDraftProvider({ children }: { children: React.ReactNode }) {
  const [registry] = useState(createContentDraftRegistry);
  return <ContentDraftContext.Provider value={registry}>{children}</ContentDraftContext.Provider>;
}

/** `null` jika tidak ada provider (versi platform lalu memakai nilai konten tersimpan). */
export function useContentDraft(): ContentDraftRegistry | null {
  return useContext(ContentDraftContext);
}
